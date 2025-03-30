const express = require('express');
const driver = require('../db');

const router = express.Router();

// --- Helper Function to get the next starting Requirement ID ---
async function getRequirementStartIdNum() {
  const session = driver.session({ database: 'neo4j' });
  try {
    const result = await session.run(
      `MATCH (r:Requirement) // Use :Requirement label
       WHERE r.id STARTS WITH 'REQ-' // Use REQ- prefix
       WITH r.id AS id
       ORDER BY id DESC LIMIT 1
       RETURN toInteger(substring(id, 4)) AS lastNum` // Extract number after 'REQ-'
    );
    if (result.records.length > 0) {
      const lastNum = result.records[0].get('lastNum');
      if (lastNum != null && Number.isInteger(lastNum.low)) { 
          return lastNum.low + 1;
      }
    }
    return 1; // Start from 1 if no requirements exist
  } catch (error) {
    console.error('Error getting requirement start ID number:', error);
    throw new Error('Could not determine starting requirement ID');
  } finally {
    await session.close();
  }
}

// --- Route Handlers ---

// POST /api/requirements - Create a new requirement
router.post('/', async (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Requirement title is required' });
  }

  const session = driver.session({ database: 'neo4j' });
  let requirementId;
  try {
    const nextNum = await getRequirementStartIdNum();
    requirementId = `REQ-${String(nextNum).padStart(3, '0')}`; // Use REQ- prefix

    // Optional: Check for ID collision
    const checkResult = await session.run('MATCH (r:Requirement {id: $id}) RETURN r', { id: requirementId });
    if (checkResult.records.length > 0) {
         return res.status(409).json({ error: `Requirement ID ${requirementId} already exists. Please try again.` });
    }

    const result = await session.run(
      `CREATE (r:Requirement { // Use :Requirement label
         id: $id,
         title: $title,
         description: $description,
         createdAt: datetime(), 
         updatedAt: datetime()
       })
       RETURN r`, 
      {
        id: requirementId,
        title: title,
        description: description || null 
      }
    );

    if (result.records.length === 0) {
      throw new Error('Requirement creation failed in database');
    }

    const createdRequirement = result.records[0].get('r').properties;
    res.status(201).json(createdRequirement);

  } catch (error) {
    console.error(`Error creating requirement (ID: ${requirementId || 'N/A'}):`, error);
    res.status(500).json({ error: 'Failed to create requirement', details: error.message });
  } finally {
    await session.close();
  }
});

// GET /api/requirements - Retrieve all requirements
router.get('/', async (req, res) => {
  const session = driver.session({ database: 'neo4j' });
  try {
    const result = await session.run(
      `MATCH (r:Requirement)
       OPTIONAL MATCH (s:Scenario)-[:REQUIRES]->(r)
       OPTIONAL MATCH (r)-[:DEFINES]->(p:Parameter)
       OPTIONAL MATCH (r)-[:HAS_CHILD]->(child:Requirement) // Find children
       RETURN r, 
              collect(DISTINCT s.id) AS requiringScenarioIds, 
              collect(DISTINCT p.id) AS definedParameterIds,
              collect(DISTINCT child.id) AS childRequirementIds // Add child IDs
       ORDER BY r.id` 
    );
    const requirements = result.records.map(record => ({
      ...record.get('r').properties,
      requiringScenarioIds: record.get('requiringScenarioIds'),
      definedParameterIds: record.get('definedParameterIds'),
      childRequirementIds: record.get('childRequirementIds') // Include in response
    }));
    res.status(200).json(requirements);
  } catch (error) {
    console.error('Error retrieving requirements:', error);
    res.status(500).json({ error: 'Failed to retrieve requirements', details: error.message });
  } finally {
    await session.close();
  }
});

// POST /api/requirements/bulk-generate - Create multiple requirements and sub-requirements
router.post('/bulk-generate', async (req, res) => {
  const { count, minSubs, maxSubs } = req.body;

  // Validate input
  if (!Number.isInteger(count) || count <= 0 ||
      !Number.isInteger(minSubs) || minSubs < 0 ||
      !Number.isInteger(maxSubs) || maxSubs < minSubs) {
    return res.status(400).json({ error: 'Invalid input parameters for bulk generation.' });
  }

  const session = driver.session({ database: 'neo4j' });
  try {
    // Use the existing helper to find the starting ID number
    const startIdNum = await getRequirementStartIdNum(); 
    let currentIdNum = startIdNum;
    const generatedItems = []; 

    for (let i = 0; i < count; i++) {
      const parentId = `REQ-${String(currentIdNum).padStart(3, '0')}`; // Use REQ- prefix
      const parentData = {
        id: parentId,
        title: `Generated Requirement ${parentId}`,
        description: `Bulk generated top-level requirement.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        children: [] 
      };

      const numSubItems = Math.floor(Math.random() * (maxSubs - minSubs + 1)) + minSubs;

      for (let j = 0; j < numSubItems; j++) {
        const childId = `${parentId}-SUB-${String(j + 1).padStart(3, '0')}`; 
        parentData.children.push({
            id: childId,
            title: `Generated Sub-Requirement ${j+1} for ${parentId}`,
            description: `Bulk generated sub-requirement.`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
      }
      generatedItems.push(parentData);
      currentIdNum++;
    }

    // Use UNWIND for bulk creation (adapted for Requirements)
    await session.run(
        `UNWIND $items AS item
         CREATE (parent:Requirement { // Use :Requirement label
             id: item.id,
             title: item.title,
             description: item.description,
             createdAt: datetime(item.createdAt),
             updatedAt: datetime(item.updatedAt)
         })
         WITH parent, item.children AS childrenData
         UNWIND childrenData AS childData
         CREATE (child:Requirement { // Use :Requirement label for children too
             id: childData.id,
             title: childData.title,
             description: childData.description,
             createdAt: datetime(childData.createdAt),
             updatedAt: datetime(childData.updatedAt)
         })
         MERGE (parent)-[:HAS_CHILD]->(child)`, // :HAS_CHILD relationship
      { items: generatedItems } 
    );

    res.status(201).json({
        message: `Successfully generated ${count} top-level requirements with ${minSubs}-${maxSubs} sub-requirements each.`,
        generatedCount: count 
    });

  } catch (error) {
    console.error('Error during bulk requirement generation:', error);
    res.status(500).json({ error: 'Failed to bulk generate requirements', details: error.message });
  } finally {
    await session.close();
  }
});

// GET /api/requirements/:id/hierarchy - Retrieve hierarchy for a specific requirement
router.get('/:id/hierarchy', async (req, res) => {
  const { id } = req.params;
  const session = driver.session({ database: 'neo4j' });
  
  try {
    // Fetch the requirement and its hierarchical data
    const result = await session.run(
      `MATCH (r:Requirement {id: $id})
       OPTIONAL MATCH path = (r)-[:HAS_CHILD*]->(child:Requirement)
       OPTIONAL MATCH (s:Scenario)-[:DRIVES]->(r)
       OPTIONAL MATCH (r)-[:DEFINES]->(p:Parameter)
       OPTIONAL MATCH (childS:Scenario)-[:DRIVES]->(child)
       OPTIONAL MATCH (child)-[:DEFINES]->(childP:Parameter)
       RETURN r as rootRequirement,
              collect(DISTINCT child) as childRequirements,
              collect(DISTINCT s) as drivingScenarios,
              collect(DISTINCT p) as definedParameters,
              collect(DISTINCT childS) as childDrivingScenarios,
              collect(DISTINCT childP) as childDefinedParameters,
              collect(DISTINCT path) as paths`,
      { id }
    );
    
    if (result.records.length === 0) {
      return res.status(404).json({ error: `Requirement with ID ${id} not found` });
    }
    
    const record = result.records[0];
    const rootRequirement = record.get('rootRequirement').properties;
    const childRequirements = record.get('childRequirements').map(req => req.properties);
    const drivingScenarios = record.get('drivingScenarios').map(scenario => scenario.properties);
    const definedParameters = record.get('definedParameters').map(param => param.properties);
    const childDrivingScenarios = record.get('childDrivingScenarios').map(scenario => scenario.properties);
    const childDefinedParameters = record.get('childDefinedParameters').map(param => param.properties);
    const paths = record.get('paths');
    
    // Build hierarchy object
    const hierarchy = {
      ...rootRequirement,
      children: [],
      scenarios: drivingScenarios,
      parameters: definedParameters
    };
    
    // Helper function to find a requirement in the hierarchy by ID
    const findRequirement = (reqId, node) => {
      if (node.id === reqId) return node;
      
      for (const child of node.children) {
        const found = findRequirement(reqId, child);
        if (found) return found;
      }
      
      return null;
    };
    
    // Process paths to build hierarchy
    for (const path of paths) {
      if (path.length === 0) continue;
      
      // Extract requirements from path
      const requirementsInPath = path.segments.map(segment => ({
        parentId: segment.start.properties.id,
        childId: segment.end.properties.id
      }));
      
      // Add each requirement to its parent
      for (const { parentId, childId } of requirementsInPath) {
        const childRequirement = childRequirements.find(r => r.id === childId);
        if (!childRequirement) continue;
        
        // Find scenarios that drive this child
        const childScenarios = childDrivingScenarios
          .filter(s => s.id)
          .filter(s => {
            return result.records.some(rec => 
              rec.get('childRequirements').some(r => 
                r.properties.id === childId && 
                rec.get('childDrivingScenarios').some(cs => cs.properties.id === s.id)
              )
            );
          });
        
        // Find parameters defined by this child
        const childParams = childDefinedParameters
          .filter(p => p.id)
          .filter(p => {
            return result.records.some(rec => 
              rec.get('childRequirements').some(r => 
                r.properties.id === childId && 
                rec.get('childDefinedParameters').some(cp => cp.properties.id === p.id)
              )
            );
          });
        
        const childWithRelations = {
          ...childRequirement,
          children: [],
          scenarios: childScenarios,
          parameters: childParams
        };
        
        const parent = findRequirement(parentId, hierarchy);
        if (parent) {
          // Check if already added
          const existingChild = parent.children.find(c => c.id === childId);
          if (!existingChild) {
            parent.children.push(childWithRelations);
          }
        }
      }
    }
    
    // Handle direct parent-child relationships
    for (const childRequirement of childRequirements) {
      // Find if this requirement is already in hierarchy
      const existingInHierarchy = findRequirement(childRequirement.id, hierarchy);
      
      // If not found in hierarchy, it's a direct child of root
      if (!existingInHierarchy && paths.length === 0) {
        // Find scenarios that drive this child
        const childScenarios = childDrivingScenarios
          .filter(s => s.id)
          .filter(s => {
            return result.records.some(rec => 
              rec.get('childRequirements').some(r => 
                r.properties.id === childRequirement.id && 
                rec.get('childDrivingScenarios').some(cs => cs.properties.id === s.id)
              )
            );
          });
        
        // Find parameters defined by this child
        const childParams = childDefinedParameters
          .filter(p => p.id)
          .filter(p => {
            return result.records.some(rec => 
              rec.get('childRequirements').some(r => 
                r.properties.id === childRequirement.id && 
                rec.get('childDefinedParameters').some(cp => cp.properties.id === p.id)
              )
            );
          });
          
        hierarchy.children.push({
          ...childRequirement,
          children: [],
          scenarios: childScenarios,
          parameters: childParams
        });
      }
    }
    
    res.status(200).json(hierarchy);
    
  } catch (error) {
    console.error(`Error retrieving hierarchy for requirement ${id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve requirement hierarchy', details: error.message });
  } finally {
    await session.close();
  }
});

// POST /api/requirements/bulk - Create multiple requirements at once
router.post('/bulk', async (req, res) => {
  const { prefix, count, descriptionTemplate } = req.body;
  
  if (!prefix || !count || count <= 0 || count > 100) {
    return res.status(400).json({ 
      error: 'Invalid bulk creation parameters. Requires prefix and count (1-100).' 
    });
  }

  const session = driver.session({ database: 'neo4j' });
  try {
    // Generate a batch of requirements
    const requirements = [];
    
    // Get the latest requirement ID to ensure we don't create duplicates
    const idQuery = await session.run(`
      MATCH (r:Requirement)
      RETURN r.id AS id
      ORDER BY r.id DESC
      LIMIT 1
    `);
    
    // Determine the starting ID number
    let lastId = 0;
    if (idQuery.records.length > 0) {
      const lastIdStr = idQuery.records[0].get('id');
      // Extract the numeric part if it's in a format like "REQ-001"
      const match = lastIdStr.match(/\d+$/);
      if (match) {
        lastId = parseInt(match[0]);
      }
    }
    
    // Create transaction to insert all requirements at once
    const txc = session.beginTransaction();
    
    for (let i = 1; i <= count; i++) {
      const reqId = `${prefix}-${String(lastId + i).padStart(3, '0')}`;
      const reqTitle = `${prefix} ${i}`;
      
      // Replace {i} with the current index in the description template
      let description = descriptionTemplate || `Auto-generated requirement ${i}`;
      description = description.replace(/\{i\}/g, i.toString());
      
      await txc.run(`
        CREATE (r:Requirement {
          id: $id,
          title: $title,
          description: $description,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        RETURN r
      `, {
        id: reqId,
        title: reqTitle,
        description: description
      });
      
      requirements.push({
        id: reqId,
        title: reqTitle,
        description: description
      });
    }
    
    // Commit the transaction
    await txc.commit();
    
    res.status(201).json({
      message: `Created ${count} requirements successfully`,
      count: requirements.length,
      requirements: requirements
    });
  } catch (error) {
    console.error('Error creating requirements in bulk:', error);
    res.status(500).json({ error: 'Failed to create requirements in bulk', details: error.message });
  } finally {
    await session.close();
  }
});

// TODO: Add routes for GET /:id, PUT /:id, DELETE /:id
// TODO: Add routes for managing :HAS_CHILD relationships within Requirements

module.exports = router; 