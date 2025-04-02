/**
 * Functions model
 */

const mongoose = require('mongoose');

const FunctionsSchema = new mongoose.Schema({
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
  functionType: {
    type: String
  },
  childFunctionId: {
    type: [String],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('Functions', FunctionsSchema); 