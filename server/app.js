/**
 * Main application setup
 */

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Route imports
const configRoutes = require('./routes/configRoutes');
const itemTypeRoutes = require('./routes/itemTypeRoutes');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB in production (tests use in-memory DB)
if (process.env.NODE_ENV !== 'test') {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/digital-thread';
  mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
}

// Routes
app.use('/api/config', configRoutes);
app.use('/api/itemtype', itemTypeRoutes);

// Legacy routes - will gradually be replaced by the new ItemType routes
app.use('/api/missions', (req, res) => {
  res.json([{ id: 'legacy-mission', title: 'Legacy Mission' }]);
});

app.use('/api/scenarios', (req, res) => {
  res.json([{ id: 'legacy-scenario', title: 'Legacy Scenario' }]);
});

app.use('/api/requirements', (req, res) => {
  res.json([{ id: 'legacy-requirement', title: 'Legacy Requirement' }]);
});

app.use('/api/parameters', (req, res) => {
  res.json([{ id: 'legacy-parameter', title: 'Legacy Parameter' }]);
});

app.use('/api/functions', (req, res) => {
  res.json([{ id: 'legacy-function', title: 'Legacy Function' }]);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

module.exports = app; 