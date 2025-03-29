const express = require('express');
const driver = require('../db');

const router = express.Router();

const CONFIG_NODE_ID = 'singleton'; // Fixed ID for the single config node

// Default configuration if none is found
const DEFAULT_CONFIG = {
  domainOrder: [
    'Mission',
    'Scenario',
    'Requirements',
    'Parameter',
    'Functions',
    'Logical',
    'EBOM',
    'Simulation Models',
    'Simulations',
    'Test Cases'
  ],
  allowOnlyAdjacentConnections: true
};

// GET /api/config - Retrieve the current app configuration (or create default)
router.get('/', async (req, res) => {
  const session = driver.session({ database: 'neo4j' });
  try {
    // Try to find the existing config node
    const result = await session.run(
      `MATCH (c:AppConfig {id: $id}) RETURN c`,
      { id: CONFIG_NODE_ID }
    );

    if (result.records.length > 0) {
      // Config found, return it
      const existingConfig = result.records[0].get('c').properties;
      // Ensure all default keys exist in the stored config, adding them if missing
      const mergedConfig = {
         ...DEFAULT_CONFIG, // Start with defaults
         ...existingConfig, // Override with stored values
         id: CONFIG_NODE_ID // Ensure ID is always present
      };
      // Update the node if merge resulted in changes (optional, but keeps DB consistent)
      // For simplicity, we just return the merged object here.
      // A more robust approach might write back the merged config.
      res.status(200).json(mergedConfig);

    } else {
      // No config found, create the default one
      const writeResult = await session.run(
        `CREATE (c:AppConfig { 
            id: $id,
            domainOrder: $domainOrder,
            allowOnlyAdjacentConnections: $allowOnlyAdjacentConnections,
            updatedAt: datetime()
         })
         RETURN c`,
        {
          id: CONFIG_NODE_ID,
          domainOrder: DEFAULT_CONFIG.domainOrder,
          allowOnlyAdjacentConnections: DEFAULT_CONFIG.allowOnlyAdjacentConnections
        }
      );
      if (writeResult.records.length === 0) {
         throw new Error('Failed to create default configuration');
      }
      const createdConfig = writeResult.records[0].get('c').properties;
      res.status(200).json(createdConfig); // Return the newly created default config
    }
  } catch (error) {
    console.error('Error retrieving/creating app configuration:', error);
    res.status(500).json({ error: 'Failed to get application configuration', details: error.message });
  } finally {
    await session.close();
  }
});

// PUT /api/config - Update the app configuration
router.put('/', async (req, res) => {
   const { domainOrder, allowOnlyAdjacentConnections } = req.body;

   // Basic validation (add more specific validation as needed)
   if (!Array.isArray(domainOrder) && typeof allowOnlyAdjacentConnections !== 'boolean') {
     return res.status(400).json({ error: 'Invalid configuration data provided.' });
   }

   const session = driver.session({ database: 'neo4j' });
   try {
        // Prepare updates - only include fields that were provided in the request
        const updates = {};
        if (Array.isArray(domainOrder)) { // Check if domainOrder was provided
            updates.domainOrder = domainOrder;
        }
        if (typeof allowOnlyAdjacentConnections === 'boolean') {
            updates.allowOnlyAdjacentConnections = allowOnlyAdjacentConnections;
        }
        // REMOVE timestamp update from JS object
        // updates.updatedAt = datetime(); 

        // Check if there's anything to update besides timestamp
        if (Object.keys(updates).length === 0) {
             return res.status(400).json({ error: 'No valid configuration fields provided for update.' });
        }

        const result = await session.run(
            `MATCH (c:AppConfig {id: $id})
             SET c += $updates // Apply updates from request body
             SET c.updatedAt = datetime() // Update timestamp using Cypher function
             RETURN c`,
            {
                id: CONFIG_NODE_ID,
                updates: updates // Pass only the relevant updates
            }
        );

        if (result.records.length === 0) {
             // This shouldn't happen if GET always creates the node, but handle defensively
            return res.status(404).json({ error: 'Configuration node not found. Cannot update.' });
        }

        const updatedConfig = result.records[0].get('c').properties;
        res.status(200).json(updatedConfig);

   } catch (error) {
        console.error('Error updating app configuration:', error);
        res.status(500).json({ error: 'Failed to update application configuration', details: error.message });
   } finally {
        await session.close();
   }
});


module.exports = router; 