/**
 * Scenario model
 */

const mongoose = require('mongoose');

const ScenarioSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  childScenarioId: {
    type: [String],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('Scenario', ScenarioSchema); 