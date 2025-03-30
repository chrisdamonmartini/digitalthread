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
      // Settings found, now we need to convert the flat properties to domain objects
      const rawProperties = result.records[0].get('a').properties;
      
      // Remove the id property
      delete rawProperties.id;
      
      // Convert flat properties to domain objects
      const responseSettings = {};
      const domainSet = new Set();
      
      // First identify all unique domains
      Object.keys(rawProperties).forEach(key => {
        // Keys are in format: domain_property
        const domain = key.split('_')[0];
        domainSet.add(domain);
      });
      
      // For each domain, construct its settings object
      domainSet.forEach(domain => {
        responseSettings[domain] = {
          color: rawProperties[`${domain}_color`] || '',
          iconType: rawProperties[`${domain}_iconType`] || 'preset',
          icon: rawProperties[`${domain}_icon`] || '',
          iconData: rawProperties[`${domain}_iconData`] || null
        };
      });
      
      res.status(200).json(responseSettings);
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

  // Size limit check for custom icons
  const MAX_ICON_SIZE = 500 * 1024; // Increase to 500KB for larger icons
  for (const domain in settings) {
    if (settings[domain]?.iconType === 'custom' && settings[domain]?.iconData) {
      try {
        const iconData = settings[domain].iconData;
        // Make sure the data is a valid base64 data URL
        if (!iconData.startsWith('data:') || !iconData.includes(';base64,')) {
          return res.status(400).json({
            error: `Invalid custom icon data format for domain "${domain}"`,
            details: "Icon data must be a valid base64 data URL"
          });
        }
        
        const base64Data = iconData.split(';base64,')[1];
        if (!base64Data) {
          return res.status(400).json({
            error: `Invalid base64 data for domain "${domain}"`,
            details: "Could not extract base64 content"
          });
        }
        
        // Check the size of the base64 data
        const iconSize = Buffer.from(base64Data, 'base64').length;
        console.log(`Icon size for ${domain}: ${iconSize / 1024}KB`);
        
        if (iconSize > MAX_ICON_SIZE) {
          return res.status(400).json({
            error: `Custom icon for domain "${domain}" exceeds the maximum size of 500KB`,
            details: `Current size: ${Math.round(iconSize / 1024)}KB`
          });
        }
      } catch (err) {
        console.error(`Error processing custom icon for ${domain}:`, err);
        return res.status(400).json({
          error: `Error processing custom icon for domain "${domain}"`,
          details: err.message
        });
      }
    }
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
      // Update existing settings - Create flattened primitive properties
      const flatSettings = {};
      
      // For each domain, flatten its settings to primitive values with dotted notation
      for (const domain of Object.keys(settings)) {
        const domainSettings = settings[domain];
        flatSettings[`${domain}_color`] = domainSettings.color || '';
        flatSettings[`${domain}_iconType`] = domainSettings.iconType || 'preset';
        flatSettings[`${domain}_icon`] = domainSettings.icon || '';
        // Only include iconData if it exists to avoid null values
        if (domainSettings.iconData) {
          flatSettings[`${domain}_iconData`] = domainSettings.iconData;
        }
      }
      
      // Build SET clauses for each property
      const setClauses = Object.keys(flatSettings).map(key => 
        `a.${key} = $settings.${key}`
      ).join(', ');
      
      query = `
        MATCH (a:AppSettings {id: $id})
        SET a.id = $id, ${setClauses}
        RETURN a
      `;
      
      params = { id: APPEARANCE_NODE_ID, settings: flatSettings };
    } else {
      // Create new settings node with flattened properties
      const properties = { id: APPEARANCE_NODE_ID };
      
      // Add each domain's settings as flattened primitive properties
      for (const domain of Object.keys(settings)) {
        const domainSettings = settings[domain];
        properties[`${domain}_color`] = domainSettings.color || '';
        properties[`${domain}_iconType`] = domainSettings.iconType || 'preset';
        properties[`${domain}_icon`] = domainSettings.icon || '';
        // Only include iconData if it exists to avoid null values
        if (domainSettings.iconData) {
          properties[`${domain}_iconData`] = domainSettings.iconData;
        }
      }
      
      query = `
        CREATE (a:AppSettings $properties)
        RETURN a
      `;
      params = { properties };
    }
    
    console.log('Executing Neo4j query with params:', JSON.stringify(params).slice(0, 100) + '...');
    
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