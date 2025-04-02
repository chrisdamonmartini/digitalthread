const mongoose = require('mongoose');

// Schema for display settings
const displaySettingsSchema = new mongoose.Schema({
  backgroundColor: {
    type: String,
    default: '#ffffff'
  },
  textColor: {
    type: String,
    default: '#333333'
  },
  borderColor: {
    type: String,
    default: '#e0e0e0'
  },
  headerBackgroundColor: {
    type: String,
    default: '#3c4b64'
  },
  headerTextColor: {
    type: String,
    default: '#ffffff'
  }
}, { _id: false });

// Main schema for item type configuration
const itemTypeConfigSchema = new mongoose.Schema({
  itemType: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  rootNodeIds: {
    type: [String],
    default: []
  },
  displaySettings: {
    type: displaySettingsSchema,
    default: () => ({})
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
itemTypeConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const ItemTypeConfig = mongoose.model('ItemTypeConfig', itemTypeConfigSchema);

module.exports = ItemTypeConfig; 