const express = require('express');
const driver = require('../db');

const router = express.Router();

// --- Helper Function to get the next starting Parameter ID ---
async function getParameterStartIdNum() {
  const session = driver.session({ database: 'neo4j' });
  try {
    const result = await session.run(
      `MATCH (p:Parameter) // Use :Parameter label
       WHERE p.id STARTS WITH 'PAR-' // Use PAR- prefix
       WITH p.id AS id
       ORDER BY id DESC LIMIT 1
       RETURN toInteger(substring(id, 4)) AS lastNum` // Extract number after 'PAR-'
    );
    if (result.records.length > 0) {
      const lastNum = result.records[0].get('lastNum');
      if (lastNum != null && Number.isInteger(lastNum.low)) { 
          return lastNum.low + 1;
      }
    }
    return 1; // Start from 1
  } catch (error) {
    console.error('Error getting parameter start ID number:', error);
    throw new Error('Could not determine starting parameter ID');
  } finally {
    await session.close();
  }
}

// --- Route Handlers ---

// POST /api/parameters - Create a new parameter
router.post('/', async (req, res) => {
  // Include new properties: unit, valueType
  const { title, description, unit, valueType } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Parameter title is required' });
  }

  const session = driver.session({ database: 'neo4j' });
  let parameterId;
  try {
    const nextNum = await getParameterStartIdNum();
    parameterId = `PAR-${String(nextNum).padStart(3, '0')}`; // Use PAR- prefix

    // Optional: Check for ID collision
    const checkResult = await session.run('MATCH (p:Parameter {id: $id}) RETURN p', { id: parameterId });
    if (checkResult.records.length > 0) {
         return res.status(409).json({ error: `Parameter ID ${parameterId} already exists. Please try again.` });
    }

    const result = await session.run(
      `CREATE (p:Parameter { // Use :Parameter label
         id: $id,
         title: $title,
         description: $description,
         unit: $unit, // Add unit
         valueType: $valueType, // Add valueType
         createdAt: datetime(), 
         updatedAt: datetime()
       })
       RETURN p`, 
      {
        id: parameterId,
        title: title,
        description: description || null, 
        unit: unit || null, // Handle optional unit
        valueType: valueType || 'number' // Default valueType if not provided
      }
    );

    if (result.records.length === 0) {
      throw new Error('Parameter creation failed in database');
    }

    const createdParameter = result.records[0].get('p').properties;
    res.status(201).json(createdParameter);

  } catch (error) {
    console.error(`Error creating parameter (ID: ${parameterId || 'N/A'}):`, error);
    res.status(500).json({ error: 'Failed to create parameter', details: error.message });
  } finally {
    await session.close();
  }
});

// GET /api/parameters - Retrieve all parameters
router.get('/', async (req, res) => {
  const session = driver.session({ database: 'neo4j' });
  try {
    const result = await session.run(
      `MATCH (p:Parameter)
       OPTIONAL MATCH (r:Requirement)-[:DEFINES]->(p)
       OPTIONAL MATCH (p)-[:INPUT_TO]->(f:Function)
       OPTIONAL MATCH (p)-[:HAS_CHILD]->(child:Parameter) // Find children
       RETURN p, 
              collect(DISTINCT r.id) AS definingRequirementIds, 
              collect(DISTINCT f.id) AS inputToFunctionIds,
              collect(DISTINCT child.id) AS childParameterIds // Add child IDs
       ORDER BY p.id` 
    );
    const parameters = result.records.map(record => ({
      ...record.get('p').properties,
      definingRequirementIds: record.get('definingRequirementIds'),
      inputToFunctionIds: record.get('inputToFunctionIds'),
      childParameterIds: record.get('childParameterIds') // Include in response
    }));
    res.status(200).json(parameters);
  } catch (error) {
    console.error('Error retrieving parameters:', error);
    res.status(500).json({ error: 'Failed to retrieve parameters', details: error.message });
  } finally {
    await session.close();
  }
});

// POST /api/parameters/bulk-generate - Create multiple parameters and sub-parameters
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
    const startIdNum = await getParameterStartIdNum(); 
    let currentIdNum = startIdNum;
    const generatedItems = []; 
    const defaultUnits = ['m', 'kg', 's', 'A', 'K', 'mol', 'cd', '%'];
    const defaultValueTypes = ['number', 'string', 'boolean', 'range'];

    for (let i = 0; i < count; i++) {
      const parentId = `PAR-${String(currentIdNum).padStart(3, '0')}`; // Use PAR- prefix
      const parentData = {
        id: parentId,
        title: `Generated Parameter ${parentId}`,
        description: `Bulk generated top-level parameter.`,
        unit: defaultUnits[Math.floor(Math.random() * defaultUnits.length)], // Assign random unit
        valueType: defaultValueTypes[Math.floor(Math.random() * defaultValueTypes.length)], // Assign random type
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        children: [] 
      };

      const numSubItems = Math.floor(Math.random() * (maxSubs - minSubs + 1)) + minSubs;

      for (let j = 0; j < numSubItems; j++) {
        const childId = `${parentId}-SUB-${String(j + 1).padStart(3, '0')}`; 
        parentData.children.push({
            id: childId,
            title: `Generated Sub-Parameter ${j+1} for ${parentId}`,
            description: `Bulk generated sub-parameter.`,
            unit: parentData.unit, // Inherit unit for simplicity
            valueType: parentData.valueType, // Inherit type for simplicity
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
      }
      generatedItems.push(parentData);
      currentIdNum++;
    }

    // Use UNWIND for bulk creation (adapted for Parameters)
    await session.run(
        `UNWIND $items AS item
         CREATE (parent:Parameter { // Use :Parameter label
             id: item.id,
             title: item.title,
             description: item.description,
             unit: item.unit, 
             valueType: item.valueType,
             createdAt: datetime(item.createdAt),
             updatedAt: datetime(item.updatedAt)
         })
         WITH parent, item.children AS childrenData
         UNWIND childrenData AS childData
         CREATE (child:Parameter { // Use :Parameter label for children too
             id: childData.id,
             title: childData.title,
             description: childData.description,
             unit: childData.unit,
             valueType: childData.valueType,
             createdAt: datetime(childData.createdAt),
             updatedAt: datetime(childData.updatedAt)
         })
         MERGE (parent)-[:HAS_CHILD]->(child)`, 
      { items: generatedItems } 
    );

    res.status(201).json({
        message: `Successfully generated ${count} top-level parameters with ${minSubs}-${maxSubs} sub-parameters each.`,
        generatedCount: count 
    });

  } catch (error) {
    console.error('Error during bulk parameter generation:', error);
    res.status(500).json({ error: 'Failed to bulk generate parameters', details: error.message });
  } finally {
    await session.close();
  }
});

// POST /api/parameters/bulk - Create multiple parameters at once
router.post('/bulk', async (req, res) => {
  const { prefix, count, descriptionTemplate } = req.body;
  
  if (!prefix || !count || count <= 0 || count > 100) {
    return res.status(400).json({ 
      error: 'Invalid bulk creation parameters. Requires prefix and count (1-100).' 
    });
  }

  const session = driver.session({ database: 'neo4j' });
  try {
    // Generate a batch of parameters
    const parameters = [];
    
    // Get the latest parameter ID to ensure we don't create duplicates
    const idQuery = await session.run(`
      MATCH (p:Parameter)
      RETURN p.id AS id
      ORDER BY p.id DESC
      LIMIT 1
    `);
    
    // Determine the starting ID number
    let lastId = 0;
    if (idQuery.records.length > 0) {
      const lastIdStr = idQuery.records[0].get('id');
      // Extract the numeric part if it's in a format like "PAR-001"
      const match = lastIdStr.match(/\d+$/);
      if (match) {
        lastId = parseInt(match[0]);
      }
    }
    
    // Create transaction to insert all parameters at once
    const txc = session.beginTransaction();
    
    for (let i = 1; i <= count; i++) {
      const paramId = `${prefix}-${String(lastId + i).padStart(3, '0')}`;
      const paramTitle = `${prefix} ${i}`;
      
      // Replace {i} with the current index in the description template
      let description = descriptionTemplate || `Auto-generated parameter ${i}`;
      description = description.replace(/\{i\}/g, i.toString());
      
      await txc.run(`
        CREATE (p:Parameter {
          id: $id,
          title: $title,
          description: $description,
          valueType: 'string',
          unit: '',
          createdAt: datetime(),
          updatedAt: datetime()
        })
        RETURN p
      `, {
        id: paramId,
        title: paramTitle,
        description: description
      });
      
      parameters.push({
        id: paramId,
        title: paramTitle,
        description: description,
        valueType: 'string',
        unit: ''
      });
    }
    
    // Commit the transaction
    await txc.commit();
    
    res.status(201).json({
      message: `Created ${count} parameters successfully`,
      count: parameters.length,
      parameters: parameters
    });
  } catch (error) {
    console.error('Error creating parameters in bulk:', error);
    res.status(500).json({ error: 'Failed to create parameters in bulk', details: error.message });
  } finally {
    await session.close();
  }
});

// GET /api/parameters/:id/hierarchy - Retrieve hierarchy for a specific parameter
router.get('/:id/hierarchy', async (req, res) => {
  const { id } = req.params;
  const session = driver.session({ database: 'neo4j' });
  
  try {
    // Fetch the parameter and its hierarchical data
    const result = await session.run(
      `MATCH (p:Parameter {id: $id})
       OPTIONAL MATCH path = (p)-[:HAS_CHILD*]->(child:Parameter)
       OPTIONAL MATCH (r:Requirement)-[:DEFINES]->(p)
       OPTIONAL MATCH (p)-[:INPUT_TO]->(f:Function)
       OPTIONAL MATCH (childR:Requirement)-[:DEFINES]->(child)
       OPTIONAL MATCH (child)-[:INPUT_TO]->(childF:Function)
       RETURN p as rootParameter,
              collect(DISTINCT child) as childParameters,
              collect(DISTINCT r) as definingRequirements,
              collect(DISTINCT f) as inputToFunctions,
              collect(DISTINCT childR) as childDefiningRequirements,
              collect(DISTINCT childF) as childInputToFunctions,
              collect(DISTINCT path) as paths`,
      { id }
    );
    
    if (result.records.length === 0) {
      return res.status(404).json({ error: `Parameter with ID ${id} not found` });
    }
    
    const record = result.records[0];
    const rootParameter = record.get('rootParameter').properties;
    const childParameters = record.get('childParameters').map(param => param.properties);
    const definingRequirements = record.get('definingRequirements').map(req => req.properties);
    const inputToFunctions = record.get('inputToFunctions').map(func => func.properties);
    const childDefiningRequirements = record.get('childDefiningRequirements').map(req => req.properties);
    const childInputToFunctions = record.get('childInputToFunctions').map(func => func.properties);
    const paths = record.get('paths');
    
    // Build hierarchy object
    const hierarchy = {
      ...rootParameter,
      children: [],
      requirements: definingRequirements,
      functions: inputToFunctions
    };
    
    // Helper function to find a parameter in the hierarchy by ID
    const findParameter = (paramId, node) => {
      if (node.id === paramId) return node;
      
      for (const child of node.children) {
        const found = findParameter(paramId, child);
        if (found) return found;
      }
      
      return null;
    };
    
    // Process paths to build hierarchy
    for (const path of paths) {
      if (path.length === 0) continue;
      
      // Extract parameters from path
      const parametersInPath = path.segments.map(segment => ({
        parentId: segment.start.properties.id,
        childId: segment.end.properties.id
      }));
      
      // Add each parameter to its parent
      for (const { parentId, childId } of parametersInPath) {
        const childParameter = childParameters.find(p => p.id === childId);
        if (!childParameter) continue;
        
        // Find requirements that define this child
        const childRequirements = childDefiningRequirements
          .filter(r => r.id)
          .filter(r => {
            return result.records.some(rec => 
              rec.get('childParameters').some(p => 
                p.properties.id === childId && 
                rec.get('childDefiningRequirements').some(cr => cr.properties.id === r.id)
              )
            );
          });
        
        // Find functions that use this child as input
        const childFunctions = childInputToFunctions
          .filter(f => f.id)
          .filter(f => {
            return result.records.some(rec => 
              rec.get('childParameters').some(p => 
                p.properties.id === childId && 
                rec.get('childInputToFunctions').some(cf => cf.properties.id === f.id)
              )
            );
          });
        
        const childWithRelations = {
          ...childParameter,
          children: [],
          requirements: childRequirements,
          functions: childFunctions
        };
        
        const parent = findParameter(parentId, hierarchy);
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
    for (const childParameter of childParameters) {
      // Find if this parameter is already in hierarchy
      const existingInHierarchy = findParameter(childParameter.id, hierarchy);
      
      // If not found in hierarchy, it's a direct child of root
      if (!existingInHierarchy && paths.length === 0) {
        // Find requirements that define this child
        const childRequirements = childDefiningRequirements
          .filter(r => r.id)
          .filter(r => {
            return result.records.some(rec => 
              rec.get('childParameters').some(p => 
                p.properties.id === childParameter.id && 
                rec.get('childDefiningRequirements').some(cr => cr.properties.id === r.id)
              )
            );
          });
        
        // Find functions that use this child as input
        const childFunctions = childInputToFunctions
          .filter(f => f.id)
          .filter(f => {
            return result.records.some(rec => 
              rec.get('childParameters').some(p => 
                p.properties.id === childParameter.id && 
                rec.get('childInputToFunctions').some(cf => cf.properties.id === f.id)
              )
            );
          });
          
        hierarchy.children.push({
          ...childParameter,
          children: [],
          requirements: childRequirements,
          functions: childFunctions
        });
      }
    }
    
    res.status(200).json(hierarchy);
    
  } catch (error) {
    console.error(`Error retrieving hierarchy for parameter ${id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve parameter hierarchy', details: error.message });
  } finally {
    await session.close();
  }
});

// TODO: Add routes for GET /:id, PUT /:id, DELETE /:id
// TODO: Add routes for managing :HAS_CHILD relationships within Parameters

module.exports = router; 