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
       RETURN r, 
              collect(DISTINCT s.id) AS requiringScenarioIds, 
              collect(DISTINCT p.id) AS definedParameterIds
       ORDER BY r.id` 
    );
    const requirements = result.records.map(record => ({
      ...record.get('r').properties,
      requiringScenarioIds: record.get('requiringScenarioIds'),
      definedParameterIds: record.get('definedParameterIds')
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

// TODO: Add routes for GET /:id, PUT /:id, DELETE /:id
// TODO: Add routes for managing :HAS_CHILD relationships within Requirements

module.exports = router; 