const express = require('express');
const driver = require('../db'); // Import the shared driver instance
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs if needed (optional)

const router = express.Router();

// --- Helper Function to generate domain-specific IDs (Example) ---
// You might want a more robust sequence generator in a real app
async function getNextMissionId() {
  const session = driver.session({ database: 'neo4j' }); // Use default database
  try {
    // Find the highest current mission number
    const result = await session.run(
      `MATCH (m:Mission) 
       WHERE m.id STARTS WITH 'MIS-' 
       RETURN m.id ORDER BY m.id DESC LIMIT 1`
    );
    let nextNum = 1;
    if (result.records.length > 0) {
      const lastId = result.records[0].get('m.id');
      const lastNum = parseInt(lastId.split('-')[1], 10);
      if (!isNaN(lastNum)) {
          nextNum = lastNum + 1;
      }
    }
    return `MIS-${String(nextNum).padStart(3, '0')}`; // Format as MIS-001, MIS-002 etc.
  } catch (error) {
    console.error('Error generating next Mission ID:', error);
    throw new Error('Could not generate mission ID'); // Re-throw or handle appropriately
  } finally {
    await session.close();
  }
}

// --- Route Handlers ---

// POST /api/missions - Create a new mission
router.post('/', async (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Mission title is required' });
  }

  const session = driver.session({ database: 'neo4j' });
  try {
    const missionId = await getNextMissionId();

    const result = await session.run(
      `CREATE (m:Mission { 
         id: $id,
         title: $title,
         description: $description,
         createdAt: datetime(), 
         updatedAt: datetime()
       })
       RETURN m`, 
      {
        id: missionId,
        title: title,
        description: description || null // Handle optional description
      }
    );

    if (result.records.length === 0) {
      throw new Error('Mission creation failed in database');
    }

    const createdMission = result.records[0].get('m').properties;
    res.status(201).json(createdMission); // Respond with the created mission data

  } catch (error) {
    console.error('Error creating mission:', error);
    // Check for specific Neo4j errors if needed (e.g., constraints)
    res.status(500).json({ error: 'Failed to create mission', details: error.message });
  } finally {
    await session.close();
  }
});

// GET /api/missions - Retrieve all missions
router.get('/', async (req, res) => {
  const session = driver.session({ database: 'neo4j' });
  try {
    // Fetch all Mission nodes, ordering by ID for consistency
    const result = await session.run(
      `MATCH (m:Mission) RETURN m ORDER BY m.id`
    );

    // Extract the properties from each node
    const missions = result.records.map(record => record.get('m').properties);

    res.status(200).json(missions);

  } catch (error) {
    console.error('Error retrieving missions:', error);
    res.status(500).json({ error: 'Failed to retrieve missions', details: error.message });
  } finally {
    await session.close();
  }
});

// Add other routes (GET one, PUT, DELETE, relationships) later...

module.exports = router; 