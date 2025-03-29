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
       RETURN m, collect(s.id) AS drivenScenarioIds // Return mission and list of driven scenario IDs
       ORDER BY m.id`
    );

    // Extract properties and relationship info
    const missions = result.records.map(record => ({
        ...record.get('m').properties, // Spread mission properties
        drivenScenarioIds: record.get('drivenScenarioIds') // Add the array of scenario IDs
    }));

    res.status(200).json(missions);

  } catch (error) {
    console.error('Error retrieving missions:', error);
    res.status(500).json({ error: 'Failed to retrieve missions', details: error.message });
  } finally {
    await session.close();
  }
});

module.exports = router;