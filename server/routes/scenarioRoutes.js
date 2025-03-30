const express = require('express');
const driver = require('../db');

const router = express.Router();

// --- Helper Function to get the next starting Scenario ID ---
async function getScenarioStartIdNum() {
  const session = driver.session({ database: 'neo4j' });
  try {
    const result = await session.run(
      `MATCH (s:Scenario)
       WHERE s.id STARTS WITH 'SCN-'
       WITH s.id AS id
       ORDER BY id DESC LIMIT 1
       RETURN toInteger(substring(id, 4)) AS lastNum` // Extract number after 'SCN-'
    );
    if (result.records.length > 0) {
      const lastNum = result.records[0].get('lastNum');
      if (lastNum != null && Number.isInteger(lastNum.low)) { 
          return lastNum.low + 1;
      }
    }
    return 1; // Start from 1 if no scenarios exist
  } catch (error) {
    console.error('Error getting scenario start ID number:', error);
    throw new Error('Could not determine starting scenario ID');
  } finally {
    await session.close();
  }
}

// --- Route Handlers ---

// POST /api/scenarios - Create a new scenario
router.post('/', async (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Scenario title is required' });
  }

  const session = driver.session({ database: 'neo4j' });
  let scenarioId;
  try {
    const nextNum = await getScenarioStartIdNum();
    scenarioId = `SCN-${String(nextNum).padStart(3, '0')}`;

    // Optional: Check for ID collision (more robust)
    const checkResult = await session.run('MATCH (s:Scenario {id: $id}) RETURN s', { id: scenarioId });
    if (checkResult.records.length > 0) {
         return res.status(409).json({ error: `Scenario ID ${scenarioId} already exists. Please try again.` });
    }

    const result = await session.run(
      `CREATE (s:Scenario { 
         id: $id,
         title: $title,
         description: $description,
         createdAt: datetime(), 
         updatedAt: datetime()
       })
       RETURN s`, 
      {
        id: scenarioId,
        title: title,
        description: description || null 
      }
    );

    if (result.records.length === 0) {
      throw new Error('Scenario creation failed in database');
    }

    const createdScenario = result.records[0].get('s').properties;
    res.status(201).json(createdScenario);

  } catch (error) {
    console.error(`Error creating scenario (ID: ${scenarioId || 'N/A'}):`, error);
    res.status(500).json({ error: 'Failed to create scenario', details: error.message });
  } finally {
    await session.close();
  }
});

// GET /api/scenarios - Retrieve all scenarios
router.get('/', async (req, res) => {
  const session = driver.session({ database: 'neo4j' });
  try {
    const result = await session.run(
      `MATCH (s:Scenario)
       OPTIONAL MATCH (m:Mission)-[:DRIVES]->(s)
       OPTIONAL MATCH (s)-[:REQUIRES]->(r:Requirement)
       OPTIONAL MATCH (s)-[:HAS_CHILD]->(child:Scenario) // Find direct children
       RETURN s, 
              collect(DISTINCT m.id) AS drivingMissionIds, 
              collect(DISTINCT r.id) AS requiredRequirementIds,
              collect(DISTINCT child.id) AS childScenarioIds // Add child IDs
       ORDER BY s.id`
    );
    const scenarios = result.records.map(record => ({
        ...record.get('s').properties,
        drivingMissionIds: record.get('drivingMissionIds'),
        requiredRequirementIds: record.get('requiredRequirementIds'),
        childScenarioIds: record.get('childScenarioIds') // Include in response
    }));
    res.status(200).json(scenarios);
  } catch (error) {
    console.error('Error retrieving scenarios:', error);
    res.status(500).json({ error: 'Failed to retrieve scenarios', details: error.message });
  } finally {
    await session.close();
  }
});

// POST /api/scenarios/bulk-generate - Create multiple scenarios and sub-scenarios
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
    const startIdNum = await getScenarioStartIdNum(); 
    let currentIdNum = startIdNum;
    const generatedItems = []; 

    for (let i = 0; i < count; i++) {
      const parentId = `SCN-${String(currentIdNum).padStart(3, '0')}`; // Use SCN- prefix
      const parentData = {
        id: parentId,
        title: `Generated Scenario ${parentId}`,
        description: `Bulk generated top-level scenario.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        children: [] 
      };

      const numSubItems = Math.floor(Math.random() * (maxSubs - minSubs + 1)) + minSubs;

      for (let j = 0; j < numSubItems; j++) {
        const childId = `${parentId}-SUB-${String(j + 1).padStart(3, '0')}`; 
        parentData.children.push({
            id: childId,
            title: `Generated Sub-Scenario ${j+1} for ${parentId}`,
            description: `Bulk generated sub-scenario.`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
      }
      generatedItems.push(parentData);
      currentIdNum++;
    }

    // Use UNWIND for bulk creation (adapted for Scenarios)
    await session.run(
        `UNWIND $items AS item
         CREATE (parent:Scenario { // Use :Scenario label
             id: item.id,
             title: item.title,
             description: item.description,
             createdAt: datetime(item.createdAt),
             updatedAt: datetime(item.updatedAt)
         })
         WITH parent, item.children AS childrenData
         UNWIND childrenData AS childData
         CREATE (child:Scenario { // Use :Scenario label for children too
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
        message: `Successfully generated ${count} top-level scenarios with ${minSubs}-${maxSubs} sub-scenarios each.`,
        generatedCount: count 
    });

  } catch (error) {
    console.error('Error during bulk scenario generation:', error);
    res.status(500).json({ error: 'Failed to bulk generate scenarios', details: error.message });
  } finally {
    await session.close();
  }
});

// GET /api/scenarios/:id/hierarchy - Retrieve hierarchy for a specific scenario
router.get('/:id/hierarchy', async (req, res) => {
  const { id } = req.params;
  const session = driver.session({ database: 'neo4j' });
  
  try {
    // Fetch the scenario and its hierarchical data
    const result = await session.run(
      `MATCH (s:Scenario {id: $id})
       OPTIONAL MATCH (m:Mission)-[:DRIVES]->(s)
       OPTIONAL MATCH (s)-[:HAS_CHILD]->(child:Scenario)
       OPTIONAL MATCH (s)-[:DRIVES]->(r:Requirement)
       OPTIONAL MATCH (child)-[:DRIVES]->(childR:Requirement)
       RETURN s as rootScenario,
              collect(DISTINCT m) as drivingMissions,
              collect(DISTINCT child) as childScenarios,
              collect(DISTINCT r) as drivenRequirements,
              collect(DISTINCT childR) as childDrivenRequirements`,
      { id }
    );
    
    if (result.records.length === 0) {
      return res.status(404).json({ error: `Scenario with ID ${id} not found` });
    }
    
    const record = result.records[0];
    const rootScenario = record.get('rootScenario').properties;
    const drivingMissions = record.get('drivingMissions').map(mission => mission.properties);
    const childScenarios = record.get('childScenarios').map(scenario => scenario.properties);
    const drivenRequirements = record.get('drivenRequirements').map(req => req.properties);
    const childDrivenRequirements = record.get('childDrivenRequirements').map(req => req.properties);
    
    // Build hierarchy object
    const hierarchy = {
      ...rootScenario,
      children: childScenarios.map(child => {
        // Find requirements driven by this child
        const childReqs = childDrivenRequirements
          .filter(req => req.id)
          .filter(req => {
            return result.records.some(rec => 
              rec.get('childScenarios').some(s => 
                s.properties.id === child.id && 
                rec.get('childDrivenRequirements').some(cr => cr.properties.id === req.id)
              )
            );
          });
          
        return {
          ...child,
          children: [], // Grandchildren not included in this query
          requirements: childReqs
        };
      }),
      missions: drivingMissions,
      requirements: drivenRequirements
    };
    
    res.status(200).json(hierarchy);
    
  } catch (error) {
    console.error(`Error retrieving hierarchy for scenario ${id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve scenario hierarchy', details: error.message });
  } finally {
    await session.close();
  }
});

// TODO: Add routes for GET /:id, PUT /:id, DELETE /:id
// TODO: Add routes for managing :HAS_CHILD relationships within Scenarios

module.exports = router; 