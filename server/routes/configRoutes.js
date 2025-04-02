const express = require('express');
const driver = require('../db');
const neo4j = require('neo4j-driver');
const Config = require('../models/Config');

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

// GET /api/config/domain-display/:domainName - Retrieve display config for a domain
router.get('/domain-display/:domainName', async (req, res) => {
  const { domainName } = req.params;
  const session = driver.session();
  console.log(`[GET /api/config/domain-display/${domainName}] Handling request...`);
  try {
    const result = await session.run(
      // Revert to returning specific properties directly
      `MATCH (d:DomainDisplayConfig {domainName: $domainName})
       RETURN d.displayItems AS displayItems, d.domainColor AS domainColor`,
      { domainName: domainName }
    );
    console.log(`[GET /api/config/domain-display/${domainName}] Query executed. Records found: ${result.records.length}`);

    if (result.records.length > 0) {
      const record = result.records[0];
      
      // Get properties directly from the record
      const displayItems = record.get('displayItems') || []; // Default to empty array
      const domainColor = record.get('domainColor') || '#14364F'; // Default color
      
      // Log the extracted properties
      console.log(`[GET /api/config/domain-display/${domainName}] Extracted displayItems from record:`, JSON.stringify(displayItems));
      console.log(`[GET /api/config/domain-display/${domainName}] Extracted domainColor from record:`, domainColor);
      
      res.status(200).json({
        displayItems: displayItems,
        domainColor: domainColor
      });
    } else {
      // No config found, return defaults
      console.log(`[GET /api/config/domain-display/${domainName}] No node found. Returning default config.`);
      res.status(200).json({ 
        displayItems: [],
        domainColor: '#14364F'
      });
    }
  } catch (error) {
    console.error(`[GET /api/config/domain-display/${domainName}] Error retrieving display config:`, error);
    res.status(500).json({ error: `Failed to get display config for ${domainName}`, details: error.message });
  } finally {
    await session.close();
  }
});

// PUT /api/config/domain-display/:domainName - Update display config for a domain
router.put('/domain-display/:domainName', async (req, res) => {
  const { domainName } = req.params;
  const { displayItems, domainColor } = req.body;
  
  // Log incoming request details
  console.log(`[PUT /api/config/domain-display/${domainName}] Received request body:`, req.body);
  console.log(`[PUT /api/config/domain-display/${domainName}] Extracted displayItems:`, displayItems);
  console.log(`[PUT /api/config/domain-display/${domainName}] Extracted domainColor:`, domainColor);

  // Validation
  if (!Array.isArray(displayItems) || typeof domainColor !== 'string') {
    console.error(`[PUT /api/config/domain-display/${domainName}] Validation failed.`);
    return res.status(400).json({ error: 'Invalid display configuration data provided.' });
  }

  const session = driver.session();
  try {
    const params = {
      domainName: domainName,
      displayItems: displayItems,
      domainColor: domainColor
    };
    console.log(`[PUT /api/config/domain-display/${domainName}] Executing MERGE query with params:`, params);
    
    // Use MERGE to create or update the config node for this specific domain
    const result = await session.run(
      `MERGE (d:DomainDisplayConfig {domainName: $domainName})
       ON CREATE SET d.createdAt = datetime(), d.displayItems = $displayItems, d.domainColor = $domainColor
       ON MATCH SET d.updatedAt = datetime(), d.displayItems = $displayItems, d.domainColor = $domainColor
       RETURN d`,
      params
    );
    
    console.log(`[PUT /api/config/domain-display/${domainName}] Neo4j query result records length:`, result.records.length);

    if (result.records.length === 0) {
      console.error(`[PUT /api/config/domain-display/${domainName}] MERGE query failed to return a node.`);
      throw new Error('Failed to save domain display configuration in database');
    }

    const savedNode = result.records[0].get('d');
    const savedConfig = savedNode.properties;
    console.log(`[PUT /api/config/domain-display/${domainName}] Saved node properties:`, savedConfig);
    
    // Verify the saved property directly
    if (savedConfig && Array.isArray(savedConfig.displayItems)) {
       console.log(`[PUT /api/config/domain-display/${domainName}] Verification: savedConfig.displayItems (${savedConfig.displayItems.length}):`, savedConfig.displayItems);
    } else {
       console.error(`[PUT /api/config/domain-display/${domainName}] Verification FAILED: displayItems property missing or not an array in saved node!`);
    }

    res.status(200).json({ message: 'Configuration saved successfully', config: savedConfig });

  } catch (error) {
    console.error(`[PUT /api/config/domain-display/${domainName}] Error during save:`, error);
    res.status(500).json({ error: `Failed to save display config for ${domainName}`, details: error.message });
  } finally {
    await session.close();
  }
});

/**
 * Get container display configuration for a specific ItemType
 * GET /api/config/container-display/:itemtype
 */
router.get('/container-display/:itemtype', async (req, res) => {
  try {
    const { itemtype } = req.params;
    const configKey = `config/domain-display/${itemtype}`;
    
    // Attempt to find existing config
    const config = await Config.findOne({ key: configKey });
    
    // Return empty default if not found
    if (!config) {
      return res.json({
        displayRootNode: [],
        containerColor: '#336699'
      });
    }
    
    // Map the old key names to the new ones
    const { displayItems, domainColor } = config.value;
    
    // Return with updated key names
    return res.json({
      displayRootNode: displayItems || [],
      containerColor: domainColor || '#336699'
    });
  } catch (error) {
    console.error(`Error getting container config for ${req.params.itemtype}:`, error);
    return res.status(500).json({ error: `Failed to get config: ${error.message}` });
  }
});

/**
 * Update container display configuration for a specific ItemType
 * PUT /api/config/container-display/:itemtype
 */
router.put('/container-display/:itemtype', async (req, res) => {
  try {
    const { itemtype } = req.params;
    const { displayRootNode, containerColor } = req.body;
    const configKey = `config/domain-display/${itemtype}`;
    
    // Map the new key names to the old ones for backward compatibility
    const configValue = {
      displayItems: displayRootNode || [],
      domainColor: containerColor || '#336699'
    };
    
    // Attempt to find and update existing config
    let config = await Config.findOne({ key: configKey });
    
    if (config) {
      // Update existing config
      config.value = configValue;
      await config.save();
    } else {
      // Create new config
      config = new Config({
        key: configKey,
        value: configValue
      });
      await config.save();
    }
    
    // Return updated config with new key names
    return res.json({
      displayRootNode: configValue.displayItems,
      containerColor: configValue.domainColor
    });
  } catch (error) {
    console.error(`Error updating container config for ${req.params.itemtype}:`, error);
    return res.status(500).json({ error: `Failed to update config: ${error.message}` });
  }
});

// Add this new route to get app-wide configuration
router.get('/app', async (req, res) => {
  try {
    // Return global app configuration
    const appConfig = {
      itemTypes: ['Requirement', 'Parameter', 'Functions'],
      allowOnlyAdjacentConnections: true,
      domainConfiguration: {
        Requirement: { color: '#e63946', displayName: 'Requirements' },
        Parameter: { color: '#457b9d', displayName: 'Parameters' },
        Functions: { color: '#2a9d8f', displayName: 'Functions' }
      }
    };
    
    res.json(appConfig);
  } catch (error) {
    console.error('Error fetching app configuration:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 