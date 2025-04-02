/**
 * Routes for ItemType API endpoints
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Get models
const Mission = require('../models/Mission');
const Scenario = require('../models/Scenario');
const Requirements = require('../models/Requirements');
const Parameter = require('../models/Parameter');
const Functions = require('../models/Functions');
const Config = require('../models/Config');

// Helper functions for retrieving models and child keys
const MODEL_MAP = {
  'Mission': Mission,
  'Scenario': Scenario,
  'Requirements': Requirements,
  'Parameter': Parameter,
  'Functions': Functions
};

const CHILD_KEY_MAP = {
  'Mission': 'childMissionId',
  'Scenario': 'childScenarioId',
  'Requirements': 'childRequirementsId',
  'Parameter': 'childParameterId',
  'Functions': 'childFunctionId'
};

/**
 * Get RootNode and direct child for a specific ItemType
 * GET /api/itemtype/:itemtype/rootnode
 */
router.get('/:itemtype/rootnode', async (req, res) => {
  try {
    const { itemtype } = req.params;
    
    // Check if the model exists for this itemtype
    const Model = MODEL_MAP[itemtype];
    if (!Model) {
      return res.status(400).json({ error: `Invalid itemtype: ${itemtype}` });
    }
    
    // Get the child key for this itemtype
    const childKey = CHILD_KEY_MAP[itemtype];
    
    // Get configured RootNode IDs from the config
    const configKey = `config/domain-display/${itemtype}`;
    const config = await Config.findOne({ key: configKey });
    
    // Default to empty array if no config exists
    const rootNodeIds = config?.value?.displayItems || [];
    
    // If no root nodes configured, return empty arrays
    if (rootNodeIds.length === 0) {
      return res.json({ rootNode: [], child: [] });
    }
    
    // Get the RootNode
    const rootNode = await Model.find({ id: { $in: rootNodeIds } });
    
    // Get all childIds from the RootNode
    const childIds = [];
    rootNode.forEach(node => {
      if (node[childKey] && Array.isArray(node[childKey])) {
        childIds.push(...node[childKey]);
      }
    });
    
    // Get the child data
    const child = await Model.find({ id: { $in: childIds } });
    
    return res.json({ rootNode, child });
  } catch (error) {
    console.error(`Error getting RootNode for ${req.params.itemtype}:`, error);
    return res.status(500).json({ error: `Failed to get RootNode: ${error.message}` });
  }
});

module.exports = router; 