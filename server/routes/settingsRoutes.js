const express = require('express');
const driver = require('../db');

const router = express.Router();
const CONFIG_NODE_ID = 'singleton'; // Fixed ID for the config node

// GET /api/settings - Get application settings
router.get('/', async (req, res) => {
  const session = driver.session({ database: 'neo4j' });
  try {
    console.log('GET /api/settings - Fetching application settings...');
    
    const result = await session.run(
      `MATCH (c:AppConfig {id: $id}) 
       RETURN c.allowOnlyAdjacentConnections AS adjacentOnly`,
      { id: CONFIG_NODE_ID }
    );

    if (result.records.length === 0) {
      console.log('Settings not found - returning defaults');
      // Return default settings if not found
      return res.status(200).json({
        adjacentOnly: true
      });
    }

    const settings = {
      adjacentOnly: result.records[0].get('adjacentOnly')
    };

    console.log('Settings found:', settings);
    res.status(200).json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to retrieve settings', details: error.message });
  } finally {
    await session.close();
  }
});

// POST /api/settings - Update application settings
router.post('/', async (req, res) => {
  const { adjacentOnly } = req.body;

  if (typeof adjacentOnly !== 'boolean') {
    return res.status(400).json({ 
      error: 'Invalid settings data. Expected "adjacentOnly" as boolean.' 
    });
  }

  const session = driver.session({ database: 'neo4j' });
  try {
    const result = await session.run(
      `MATCH (c:AppConfig {id: $id})
       SET c.allowOnlyAdjacentConnections = $adjacentOnly
       SET c.updatedAt = datetime()
       RETURN c`,
      { 
        id: CONFIG_NODE_ID,
        adjacentOnly
      }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    res.status(200).json({ 
      message: 'Settings updated successfully',
      adjacentOnly
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings', details: error.message });
  } finally {
    await session.close();
  }
});

module.exports = router; 