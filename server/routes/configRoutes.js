const express = require('express');
const driver = require('../db');
const neo4j = require('neo4j-driver');

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

// Helper to check if the database is accessible
const checkDbConnection = async () => {
  const session = driver.session();
  try {
    // Run a simple query to check connection
    await session.run('RETURN 1 as num');
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  } finally {
    await session.close();
  }
};

// GET /api/config - Retrieve the current app configuration (or create default)
router.get('/', async (req, res) => {
  // First check database connectivity
  const isConnected = await checkDbConnection();
  if (!isConnected) {
    return res.status(503).json({
      error: 'Database connection failure',
      details: 'Unable to connect to the database. Please check that Neo4j is running.',
      status: 'disconnected'
    });
  }

  const session = driver.session();
  try {
    // Try to find the existing config node
    const result = await session.run(
      `MATCH (c:AppConfig {id: $id}) RETURN c`,
      { id: CONFIG_NODE_ID }
    );

    if (result.records.length > 0) {
      // Config found, return it
      const configNode = result.records[0].get('c');
      const existingConfig = {};
      
      // Safely extract properties, converting Neo4j types
      if (configNode && configNode.properties) {
        Object.keys(configNode.properties).forEach(key => {
          const value = configNode.properties[key];
          if (key === 'domainOrder' && Array.isArray(value)) {
            // Handle array values
            existingConfig[key] = value;
          } else if (neo4j.isInt(value)) {
            // Convert Neo4j integers to JavaScript numbers
            existingConfig[key] = value.toNumber();
          } else {
            existingConfig[key] = value;
          }
        });
      }
      
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
      console.log('No configuration found, creating default configuration...');
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
      
      const configNode = writeResult.records[0].get('c');
      const createdConfig = {};
      
      // Safely extract properties from the created node
      if (configNode && configNode.properties) {
        Object.keys(configNode.properties).forEach(key => {
          const value = configNode.properties[key];
          if (key === 'domainOrder' && Array.isArray(value)) {
            // Handle array values
            createdConfig[key] = value;
          } else if (neo4j.isInt(value)) {
            // Convert Neo4j integers to JavaScript numbers
            createdConfig[key] = value.toNumber();
          } else {
            createdConfig[key] = value;
          }
        });
      }
      
      res.status(200).json(createdConfig); // Return the newly created default config
    }
  } catch (error) {
    console.error('Error retrieving/creating app configuration:', error);
    res.status(500).json({ 
      error: 'Failed to get application configuration', 
      details: error.message,
      status: 'error' 
    });
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

   // First check database connectivity
   const isConnected = await checkDbConnection();
   if (!isConnected) {
     return res.status(503).json({
       error: 'Database connection failure',
       details: 'Unable to connect to the database. Please check that Neo4j is running.',
       status: 'disconnected'
     });
   }

   const session = driver.session();
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

        const configNode = result.records[0].get('c');
        const updatedConfig = {};
        
        // Safely extract properties
        if (configNode && configNode.properties) {
          Object.keys(configNode.properties).forEach(key => {
            const value = configNode.properties[key];
            if (key === 'domainOrder' && Array.isArray(value)) {
              // Handle array values
              updatedConfig[key] = value;
            } else if (neo4j.isInt(value)) {
              // Convert Neo4j integers to JavaScript numbers
              updatedConfig[key] = value.toNumber();
            } else {
              updatedConfig[key] = value;
            }
          });
        }
        
        res.status(200).json(updatedConfig);

   } catch (error) {
        console.error('Error updating app configuration:', error);
        res.status(500).json({ 
          error: 'Failed to update application configuration', 
          details: error.message,
          status: 'error'
        });
   } finally {
        await session.close();
   }
});

// GET /api/config/domain-display/:domainName
// Get the display configuration for a specific domain
router.get('/domain-display/:domainName', async (req, res) => {
  const { domainName } = req.params;
  
  if (!domainName) {
    return res.status(400).json({ error: 'Domain name is required' });
  }
  
  const session = driver.session();
  try {
    // Check if a display configuration already exists for this domain
    const result = await session.run(
      `MATCH (c:DomainDisplayConfig {domainName: $domainName})
       RETURN c.displayItems AS displayItems, c.domainColor AS domainColor`,
      { domainName }
    );
    
    if (result.records.length === 0) {
      // No configuration found, return an empty list
      return res.json({ displayItems: [], domainColor: '#14364F' });
    }
    
    // Get display item IDs and domain color
    const displayItemIds = result.records[0].get('displayItems') || [];
    const domainColor = result.records[0].get('domainColor') || '#14364F';
    
    // If there are display items, fetch their details
    let displayItems = [];
    if (displayItemIds.length > 0) {
      // Dynamically determine the label to use based on domain name
      // This assumes your domain nodes have labels that match their names
      // Note: Neo4j is case-sensitive for labels, so we need to get the first character uppercase
      let domainLabel = domainName;
      if (domainLabel === 'Requirements') {
        domainLabel = 'Requirement'; // Handle special case for Requirements label
      } else if (domainLabel === 'Functions') {
        domainLabel = 'Function'; // Handle special case for Functions label
      } else if (domainLabel.endsWith('s')) {
        // Remove trailing 's' for most domains
        domainLabel = domainLabel.slice(0, -1);
      }
      
      // Fetch the actual items
      const itemsResult = await session.run(
        `MATCH (item:${domainLabel})
         WHERE item.id IN $itemIds
         RETURN item`,
        { itemIds: displayItemIds }
      );
      
      displayItems = itemsResult.records.map(record => record.get('item').properties);
    }
    
    res.json({ displayItems, domainColor });
  } catch (error) {
    console.error(`Error retrieving ${domainName} display configuration:`, error);
    res.status(500).json({ error: `Failed to retrieve ${domainName} display configuration`, details: error.message });
  } finally {
    session.close();
  }
});

// PUT /api/config/domain-display/:domainName
// Update the display configuration for a specific domain
router.put('/domain-display/:domainName', async (req, res) => {
  const { domainName } = req.params;
  const { displayItems, domainColor } = req.body;
  
  if (!domainName) {
    return res.status(400).json({ error: 'Domain name is required' });
  }
  
  if (!Array.isArray(displayItems)) {
    return res.status(400).json({ error: 'displayItems must be an array of item IDs' });
  }
  
  const session = driver.session();
  try {
    // Use MERGE to create or update the configuration
    await session.run(
      `MERGE (c:DomainDisplayConfig {domainName: $domainName})
       SET c.displayItems = $displayItems,
           c.domainColor = $domainColor,
           c.updatedAt = datetime()
       RETURN c`,
      { 
        domainName,
        displayItems,
        domainColor: domainColor || '#14364F'
      }
    );
    
    res.json({ 
      success: true, 
      message: `Successfully updated display configuration for ${domainName}` 
    });
  } catch (error) {
    console.error(`Error updating ${domainName} display configuration:`, error);
    res.status(500).json({ error: `Failed to update ${domainName} display configuration`, details: error.message });
  } finally {
    session.close();
  }
});

module.exports = router; 