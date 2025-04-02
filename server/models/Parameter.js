/**
 * Parameter model
 */

const mongoose = require('mongoose');

const ParameterSchema = new mongoose.Schema({
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
  unit: {
    type: String
  },
  valueType: {
    type: String,
    enum: ['number', 'string', 'boolean', 'range'],
    default: 'number'
  },
  childParameterId: {
    type: [String],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('Parameter', ParameterSchema); 