const mongoose = require('mongoose');

const requirementSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Draft', 'Reviewed', 'Approved', 'Deprecated'],
    default: 'Draft'
  },
  source: {
    type: String,
    trim: true
  },
  // References to child item types
  childParameterId: {
    type: [String],
    default: []
  },
  childFunctionsId: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
requirementSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Requirement = mongoose.model('Requirement', requirementSchema);

module.exports = Requirement; 