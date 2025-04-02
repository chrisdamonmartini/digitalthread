const mongoose = require('mongoose');

const functionSchema = new mongoose.Schema({
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
  functionType: {
    type: String,
    trim: true
  },
  implementation: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Draft', 'Implemented', 'Tested', 'Deployed'],
    default: 'Draft'
  },
  // Child references to other item types if needed
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
functionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Function = mongoose.model('Function', functionSchema);

module.exports = Function; 