const express = require('express');
const driver = require('../db');

const router = express.Router();

const APPEARANCE_NODE_ID = 'appearance_settings'; // Fixed ID for the appearance settings node

// GET /api/appearance - Retrieve appearance settings
router.get('/', async (req, res) => {
  const session = driver.session({ database: 'neo4j' });
  try {
    // Try to find the existing appearance settings node
    const result = await session.run(
      `MATCH (a:AppSettings {id: $id}) RETURN a`,
      { id: APPEARANCE_NODE_ID }
    );

    if (result.records.length > 0) {
      // Settings found, return them
      const settings = result.records[0].get('a').properties;
      // Remove the id property from the response
      delete settings.id;
      res.status(200).json(settings);
    } else {
      // No settings found, return empty object
      res.status(200).json({});
    }
  } catch (error) {
    console.error('Error retrieving appearance settings:', error);
    res.status(500).json({ error: 'Failed to get appearance settings', details: error.message });
  } finally {
    await session.close();
  }
});

// PUT /api/appearance - Update appearance settings
router.put('/', async (req, res) => {
  const settings = req.body;
  
  // Basic validation
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Invalid appearance settings data provided.' });
  }
  
  const session = driver.session({ database: 'neo4j' });
  try {
    // First, check if settings node exists
    const checkResult = await session.run(
      `MATCH (a:AppSettings {id: $id}) RETURN a`,
      { id: APPEARANCE_NODE_ID }
    );
    
    let query;
    let params = { id: APPEARANCE_NODE_ID, settings };
    
    if (checkResult.records.length > 0) {
      // Update existing settings
      query = `
        MATCH (a:AppSettings {id: $id})
        SET a = { id: $id }
        WITH a
        UNWIND keys($settings) AS key
        SET a[key] = $settings[key]
        RETURN a
      `;
    } else {
      // Create new settings node
      // Prepare the properties object with id and all settings
      const properties = { id: APPEARANCE_NODE_ID, ...settings };
      
      query = `
        CREATE (a:AppSettings $properties)
        RETURN a
      `;
      params = { properties };
    }
    
    const result = await session.run(query, params);
    
    if (result.records.length === 0) {
      throw new Error('Failed to update appearance settings');
    }
    
    // Return the updated settings
    const updatedSettings = result.records[0].get('a').properties;
    // Remove the id property from the response
    delete updatedSettings.id;
    
    res.status(200).json(updatedSettings);
  } catch (error) {
    console.error('Error updating appearance settings:', error);
    res.status(500).json({ error: 'Failed to update appearance settings', details: error.message });
  } finally {
    await session.close();
  }
});

module.exports = router; 