/**
 * Mission model
 */

const mongoose = require('mongoose');

const MissionSchema = new mongoose.Schema({
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
  childMissionId: {
    type: [String],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('Mission', MissionSchema); 