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

// POST /api/missions/bulk - Create multiple missions at once
router.post('/bulk', async (req, res) => {
  const { prefix, count, descriptionTemplate } = req.body;
  
  if (!prefix || !count || count <= 0 || count > 100) {
    return res.status(400).json({ 
      error: 'Invalid bulk creation parameters. Requires prefix and count (1-100).' 
    });
  }

  const session = driver.session({ database: 'neo4j' });
  try {
    // Generate a batch of missions
    const missions = [];
    
    // Get the latest mission ID to ensure we don't create duplicates
    const idQuery = await session.run(`
      MATCH (m:Mission)
      RETURN m.id AS id
      ORDER BY m.id DESC
      LIMIT 1
    `);
    
    // Determine the starting ID number
    let lastId = 0;
    if (idQuery.records.length > 0) {
      const lastIdStr = idQuery.records[0].get('id');
      // Extract the numeric part if it's in a format like "MIS-001"
      const match = lastIdStr.match(/\d+$/);
      if (match) {
        lastId = parseInt(match[0]);
      }
    }
    
    // Create transaction to insert all missions at once
    const txc = session.beginTransaction();
    
    for (let i = 1; i <= count; i++) {
      const missionId = `${prefix}-${String(lastId + i).padStart(3, '0')}`;
      const missionTitle = `${prefix} ${i}`;
      
      // Replace {i} with the current index in the description template
      let description = descriptionTemplate || `Auto-generated mission ${i}`;
      description = description.replace(/\{i\}/g, i.toString());
      
      await txc.run(`
        CREATE (m:Mission {
          id: $id,
          title: $title,
          description: $description,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        RETURN m
      `, {
        id: missionId,
        title: missionTitle,
        description: description
      });
      
      missions.push({
        id: missionId,
        title: missionTitle,
        description: description
      });
    }
    
    // Commit the transaction
    await txc.commit();
    
    res.status(201).json({
      message: `Created ${count} missions successfully`,
      count: missions.length,
      missions: missions
    });
  } catch (error) {
    console.error('Error creating missions in bulk:', error);
    res.status(500).json({ error: 'Failed to create missions in bulk', details: error.message });
  } finally {
    await session.close();
  }
});

// GET /api/missions/:id/hierarchy - Retrieve hierarchy for a specific mission
router.get('/:id/hierarchy', async (req, res) => {
  const { id } = req.params;
  const session = driver.session({ database: 'neo4j' });
  
  try {
    // Fetch the mission and its hierarchical data
    const result = await session.run(
      `MATCH (m:Mission {id: $id})
       OPTIONAL MATCH path = (m)-[:HAS_CHILD*]->(child:Mission)
       OPTIONAL MATCH (m)-[:DRIVES]->(s:Scenario)
       OPTIONAL MATCH (child)-[:DRIVES]->(childScenario:Scenario)
       RETURN m as rootMission,
              collect(DISTINCT child) as childMissions,
              collect(DISTINCT s) as directScenarios,
              collect(DISTINCT childScenario) as childScenarios,
              collect(DISTINCT path) as paths`,
      { id }
    );
    
    if (result.records.length === 0) {
      return res.status(404).json({ error: `Mission with ID ${id} not found` });
    }
    
    const record = result.records[0];
    const rootMission = record.get('rootMission').properties;
    const childMissions = record.get('childMissions').map(mission => mission.properties);
    const directScenarios = record.get('directScenarios').map(scenario => scenario.properties);
    const childScenarios = record.get('childScenarios').map(scenario => scenario.properties);
    const paths = record.get('paths');
    
    // Build hierarchy object
    const hierarchy = {
      ...rootMission,
      children: [],
      scenarios: directScenarios
    };
    
    // Helper function to find a mission in the hierarchy by ID
    const findMission = (missionId, node) => {
      if (node.id === missionId) return node;
      
      for (const child of node.children) {
        const found = findMission(missionId, child);
        if (found) return found;
      }
      
      return null;
    };
    
    // Process paths to build hierarchy
    for (const path of paths) {
      if (path.length === 0) continue;
      
      // Extract missions from path
      const missionsInPath = path.segments.map(segment => ({
        parentId: segment.start.properties.id,
        childId: segment.end.properties.id
      }));
      
      // Add each mission to its parent
      for (const { parentId, childId } of missionsInPath) {
        const childMission = childMissions.find(m => m.id === childId);
        if (!childMission) continue;
        
        const childScenariosList = childScenarios
          .filter(s => {
            // Find scenarios driven by this child mission
            const childMissionDrives = result.records.some(rec => 
              rec.get('childMissions').some(m => 
                m.properties.id === childId && rec.get('childScenarios').some(cs => cs.properties.id === s.id)
              )
            );
            return childMissionDrives;
          });
        
        const childWithScenarios = {
          ...childMission,
          children: [],
          scenarios: childScenariosList
        };
        
        const parent = findMission(parentId, hierarchy);
        if (parent) {
          // Check if already added
          const existingChild = parent.children.find(c => c.id === childId);
          if (!existingChild) {
            parent.children.push(childWithScenarios);
          }
        }
      }
    }
    
    // Handle direct parent-child relationships
    for (const childMission of childMissions) {
      // Find if this mission is already in hierarchy
      const existingInHierarchy = findMission(childMission.id, hierarchy);
      
      // If not found in hierarchy, it's a direct child of root
      if (!existingInHierarchy && paths.length === 0) {
        const childScenariosList = childScenarios
          .filter(s => s.id && childMission.id) // Make sure we have valid IDs
          .filter(s => {
            // Find scenarios driven by this child mission
            return result.records.some(rec => 
              rec.get('childMissions').some(m => 
                m.properties.id === childMission.id && 
                rec.get('childScenarios').some(cs => cs.properties.id === s.id)
              )
            );
          });
          
        hierarchy.children.push({
          ...childMission,
          children: [],
          scenarios: childScenariosList
        });
      }
    }
    
    res.status(200).json(hierarchy);
    
  } catch (error) {
    console.error(`Error retrieving hierarchy for mission ${id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve mission hierarchy', details: error.message });
  } finally {
    await session.close();
  }
});

module.exports = router;