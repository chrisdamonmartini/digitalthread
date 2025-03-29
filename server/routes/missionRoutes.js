const express = require('express');
const driver = require('../db'); // Import the shared driver instance
// No need for uuid here as we're generating sequential IDs

const router = express.Router();

// --- Helper Function to get the next starting Mission ID ---
// Finds the highest existing ID to determine where to start generating new ones.
async function getMissionStartIdNum() {
  const session = driver.session({ database: 'neo4j' });
  try {
    const result = await session.run(
      `MATCH (m:Mission)
       WHERE m.id STARTS WITH 'MIS-'
       WITH m.id AS id
       ORDER BY id DESC LIMIT 1
       RETURN toInteger(substring(id, 4)) AS lastNum` // Extract number after 'MIS-'
    );
    if (result.records.length > 0) {
      const lastNum = result.records[0].get('lastNum');
      // Check if lastNum is a valid integer before incrementing
      if (lastNum != null && Number.isInteger(lastNum.low)) { // Access .low for Neo4j integer
          return lastNum.low + 1;
      }
    }
    return 1; // Start from 1 if no missions exist or parsing fails
  } catch (error) {
    console.error('Error getting mission start ID number:', error);
    throw new Error('Could not determine starting mission ID');
  } finally {
    await session.close();
  }
}

// --- Route Handlers ---

// POST /api/missions - Create a single new mission
router.post('/', async (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Mission title is required' });
  }

  const session = driver.session({ database: 'neo4j' });
  let missionId; // Declare missionId here to use it in potential error message
  try {
    // Use the modified helper function to get the next *single* ID
    const nextNum = await getMissionStartIdNum(); // Reuse the logic for single adds
    missionId = `MIS-${String(nextNum).padStart(3, '0')}`;

    // Check if this specific ID already exists (more robust than just getting start)
    const checkResult = await session.run('MATCH (m:Mission {id: $id}) RETURN m', { id: missionId });
    if (checkResult.records.length > 0) {
        // Handle collision - could retry, or return error
        // For simplicity, returning an error here. A retry mechanism would be better.
         return res.status(409).json({ error: `Mission ID ${missionId} already exists. Please try again.` });
    }


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
    console.error(`Error creating mission (ID: ${missionId || 'N/A'}):`, error);
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

// POST /api/missions/bulk-generate - Create multiple missions and sub-missions
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
    const startIdNum = await getMissionStartIdNum();
    let currentIdNum = startIdNum;
    const generatedItems = []; // To hold data for Cypher UNWIND

    for (let i = 0; i < count; i++) {
      const parentId = `MIS-${String(currentIdNum).padStart(3, '0')}`;
      const parentData = {
        id: parentId,
        title: `Generated Mission ${parentId}`,
        description: `Bulk generated top-level mission.`,
        createdAt: new Date().toISOString(), // Use ISO string for Neo4j compatibility
        updatedAt: new Date().toISOString(),
        children: [] // Array to hold sub-mission data
      };

      const numSubMissions = Math.floor(Math.random() * (maxSubs - minSubs + 1)) + minSubs;

      for (let j = 0; j < numSubMissions; j++) {
         // Simple sub-mission ID - could be made more robust/unique
        const childId = `${parentId}-SUB-${String(j + 1).padStart(3, '0')}`;
        parentData.children.push({
            id: childId,
            title: `Generated Sub-Mission ${j+1} for ${parentId}`,
            description: `Bulk generated sub-mission.`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
      }
      generatedItems.push(parentData);
      currentIdNum++; // Increment for the next top-level mission
    }

    // --- Use UNWIND for efficient bulk creation in a single transaction ---
    const result = await session.run(
        `UNWIND $items AS item
         CREATE (parent:Mission {
             id: item.id,
             title: item.title,
             description: item.description,
             createdAt: datetime(item.createdAt),
             updatedAt: datetime(item.updatedAt)
         })
         // Create children and relationships for this parent
         WITH parent, item.children AS childrenData
         UNWIND childrenData AS childData // Process each child for the current parent
         CREATE (child:Mission {
             id: childData.id,
             title: childData.title,
             description: childData.description,
             createdAt: datetime(childData.createdAt),
             updatedAt: datetime(childData.updatedAt)
         })
         MERGE (parent)-[:HAS_CHILD]->(child) // Create relationship
         RETURN count(parent) AS parentsCreated, count(child) AS childrenCreated`, // Return counts (will be aggregated)
      { items: generatedItems } // Pass the prepared data array
    );

    // Note: The counts returned by the query might not be exactly what we expect
    // due to aggregation per parent/child pair. A simpler approach is to just return success.
    // console.log("Bulk creation result:", result.records); // For debugging

    res.status(201).json({
        message: `Successfully generated ${count} top-level missions with ${minSubs}-${maxSubs} sub-missions each.`,
        generatedCount: count // Just return the requested count for simplicity
    });

  } catch (error) {
    console.error('Error during bulk mission generation:', error);
    res.status(500).json({ error: 'Failed to bulk generate missions', details: error.message });
  } finally {
    await session.close();
  }
});

module.exports = router; 