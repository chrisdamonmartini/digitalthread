/**
 * Routes for ItemType API endpoints
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ItemTypeConfig = require('../models/ItemTypeConfig');
const Parameter = require('../models/Parameter');
const Requirement = require('../models/Requirement');
const Function = require('../models/Function');

// Model mapping for dynamic model selection
const MODEL_MAP = {
  'Parameter': Parameter,
  'Requirement': Requirement,
  'Functions': Function
};

/**
 * Get all items of a specific type
 */
router.get('/:itemType', async (req, res) => {
  try {
    const { itemType } = req.params;
    
    if (!MODEL_MAP[itemType]) {
      return res.status(400).json({ error: `Unknown item type: ${itemType}` });
    }
    
    const items = await MODEL_MAP[itemType].find({});
    res.json(items);
  } catch (error) {
    console.error(`Error fetching ${req.params.itemType} items:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get configuration for a specific item type
 */
router.get('/:itemType/config', async (req, res) => {
  try {
    const { itemType } = req.params;
    
    // Find or create a config document for this item type
    let config = await ItemTypeConfig.findOne({ itemType });
    
    if (!config) {
      // Create default config if none exists
      config = new ItemTypeConfig({
        itemType,
        rootNodeIds: [],
        displaySettings: {
          backgroundColor: '#ffffff',
          textColor: '#333333',
          borderColor: '#e0e0e0'
        }
      });
      await config.save();
    }
    
    res.json(config);
  } catch (error) {
    console.error(`Error fetching ${req.params.itemType} config:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update configuration for a specific item type
 */
router.put('/:itemType/config', async (req, res) => {
  try {
    const { itemType } = req.params;
    const { rootNodeIds, displaySettings } = req.body;
    
    // Find or create config
    let config = await ItemTypeConfig.findOne({ itemType });
    
    if (!config) {
      config = new ItemTypeConfig({ itemType });
    }
    
    // Update config properties
    if (rootNodeIds !== undefined) {
      config.rootNodeIds = rootNodeIds;
    }
    
    if (displaySettings) {
      config.displaySettings = {
        ...config.displaySettings,
        ...displaySettings
      };
    }
    
    await config.save();
    res.json({ success: true, config });
  } catch (error) {
    console.error(`Error updating ${req.params.itemType} config:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create a new item of a specific type
 */
router.post('/:itemType', async (req, res) => {
  try {
    const { itemType } = req.params;
    
    if (!MODEL_MAP[itemType]) {
      return res.status(400).json({ error: `Unknown item type: ${itemType}` });
    }
    
    const Model = MODEL_MAP[itemType];
    const newItem = new Model(req.body);
    await newItem.save();
    
    res.status(201).json(newItem);
  } catch (error) {
    console.error(`Error creating ${req.params.itemType}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Link an item to another item
 */
router.post('/link', async (req, res) => {
  try {
    const { sourceItemType, sourceId, targetItemType, targetId } = req.body;
    
    if (!MODEL_MAP[sourceItemType] || !MODEL_MAP[targetItemType]) {
      return res.status(400).json({ error: 'Invalid item types' });
    }
    
    // Get the child ID key for this relation
    const childIdKey = `child${targetItemType.replace(/\s+/g, '')}Id`;
    
    // Find the source item
    const sourceItem = await MODEL_MAP[sourceItemType].findById(sourceId);
    if (!sourceItem) {
      return res.status(404).json({ error: 'Source item not found' });
    }
    
    // Initialize the child array if it doesn't exist
    if (!sourceItem[childIdKey]) {
      sourceItem[childIdKey] = [];
    }
    
    // Add the target ID if it's not already in the array
    if (!sourceItem[childIdKey].includes(targetId)) {
      sourceItem[childIdKey].push(targetId);
      await sourceItem.save();
    }
    
    res.json({ success: true, sourceItem });
  } catch (error) {
    console.error('Error linking items:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Remove a link between items
 */
router.delete('/link', async (req, res) => {
  try {
    const { sourceItemType, sourceId, targetItemType, targetId } = req.body;
    
    if (!MODEL_MAP[sourceItemType] || !MODEL_MAP[targetItemType]) {
      return res.status(400).json({ error: 'Invalid item types' });
    }
    
    // Get the child ID key for this relation
    const childIdKey = `child${targetItemType.replace(/\s+/g, '')}Id`;
    
    // Find the source item
    const sourceItem = await MODEL_MAP[sourceItemType].findById(sourceId);
    if (!sourceItem) {
      return res.status(404).json({ error: 'Source item not found' });
    }
    
    // Remove the target ID from the array if it exists
    if (sourceItem[childIdKey] && sourceItem[childIdKey].includes(targetId)) {
      sourceItem[childIdKey] = sourceItem[childIdKey].filter(id => id !== targetId);
      await sourceItem.save();
    }
    
    res.json({ success: true, sourceItem });
  } catch (error) {
    console.error('Error removing link:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 