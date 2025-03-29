const express = require('express');
const router = express.Router();
const driver = require('../db');

// GET /api/missions - Retrieve all missions
router.get('/', async (req, res) => {
  const session = driver.session({ database: 'neo4j' });
  try {
    // Fetch Mission nodes AND their outgoing DRIVES relationships to Scenarios
    const result = await session.run(
      `MATCH (m:Mission)
       OPTIONAL MATCH (m)-[:DRIVES]->(s:Scenario) // Find driven scenarios
       OPTIONAL MATCH (m)-[:HAS_CHILD]->(child:Mission) // Find direct children
       RETURN m, 
              collect(DISTINCT s.id) AS drivenScenarioIds, 
              collect(DISTINCT child.id) AS childMissionIds // Add child IDs
       ORDER BY m.id`
    );

    // Extract properties and relationship info
    const missions = result.records.map(record => ({
        ...record.get('m').properties, // Spread mission properties
        drivenScenarioIds: record.get('drivenScenarioIds'), // Add the array of scenario IDs
        childMissionIds: record.get('childMissionIds') // Include in response
    }));

    res.status(200).json(missions);

  } catch (error) {
    console.error('Error retrieving missions:', error);
    res.status(500).json({ error: 'Failed to retrieve missions', details: error.message });
  } finally {
    await session.close();
  }
});

// POST /api/mission - Create a new mission
router.post('/', async (req, res) => {
  const { id, title, description } = req.body;
  
  // Validate required fields
  if (!id || !title) {
    return res.status(400).json({ error: 'Mission ID and title are required' });
  }
  
  const session = driver.session({ database: 'neo4j' });
  try {
    // Check if mission with this ID already exists
    const checkExisting = await session.run(
      `MATCH (m:Mission {id: $id}) RETURN m`,
      { id }
    );
    
    if (checkExisting.records.length > 0) {
      return res.status(409).json({ error: `Mission with ID ${id} already exists` });
    }
    
    // Create new mission
    const result = await session.run(
      `CREATE (m:Mission {
        id: $id,
        title: $title,
        description: $description,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      RETURN m`,
      { id, title, description: description || '' }
    );
    
    const createdMission = result.records[0].get('m').properties;
    res.status(201).json(createdMission);
    
  } catch (error) {
    console.error('Error creating mission:', error);
    res.status(500).json({ error: 'Failed to create mission', details: error.message });
  } finally {
    await session.close();
  }
});

// POST /api/mission/bulk - Bulk generate missions
router.post('/bulk', async (req, res) => {
  const { prefix, count, startNumber } = req.body;
  
  // Validate input
  if (!prefix || !count || count <= 0 || count > 50) {
    return res.status(400).json({ 
      error: 'Valid prefix and count (1-50) are required' 
    });
  }
  
  const actualStartNumber = startNumber || 1;
  const session = driver.session({ database: 'neo4j' });
  
  try {
    // Prepare bulk creation query with parameters for each mission
    let query = `
      UNWIND $missions AS mission
      CREATE (m:Mission {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      RETURN m
    `;
    
    // Generate data for each mission
    const missions = [];
    for (let i = 0; i < count; i++) {
      const num = actualStartNumber + i;
      const paddedNum = num.toString().padStart(3, '0');
      const missionId = `${prefix}-${paddedNum}`;
      
      missions.push({
        id: missionId,
        title: `${prefix} Mission ${num}`,
        description: `Auto-generated mission ${missionId}`
      });
    }
    
    // Execute bulk create
    const result = await session.run(query, { missions });
    
    res.status(201).json({
      count: result.records.length,
      message: `Successfully generated ${result.records.length} missions`
    });
    
  } catch (error) {
    console.error('Error bulk generating missions:', error);
    res.status(500).json({ error: 'Failed to generate missions', details: error.message });
  } finally {
    await session.close();
  }
});

module.exports = router;