/**
 * Server entry point
 */

const express = require('express');
const cors = require('cors'); // Import the cors package
const driver = require('./db'); // Import the driver from db.js
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// --- Neo4j Connection (Managed by db.js) ---
// We no longer initialize the driver here

// Middleware

// Enable CORS for all origins (simple setup for development)
// For production, you might want to restrict it to your specific frontend domain
app.use(cors()); 

app.use(express.json()); // To parse JSON request bodies

// Health check function to verify database connectivity
const checkDbHealth = async () => {
  const session = driver.session();
  try {
    // Run a simple query to verify connectivity
    await session.run('RETURN 1 as num');
    return { status: 'connected' };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { 
      status: 'disconnected',
      error: error.message
    };
  } finally {
    await session.close();
  }
};

// --- Health Check Endpoints ---

// GET /api/health - Check API and database health
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await checkDbHealth();
    
    res.json({
      api: {
        status: 'running',
        timestamp: new Date().toISOString()
      },
      database: dbStatus,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      api: {
        status: 'error',
        error: error.message
      },
      database: { status: 'unknown' }
    });
  }
});

// --- API Routes ---

// Import and use mission routes
const missionRoutes = require('./routes/missionRoutes');
app.use('/api/missions', missionRoutes);

// Import and use config routes
const configRoutes = require('./routes/configRoutes');
app.use('/api/config', configRoutes);

// Import and use scenario routes
const scenarioRoutes = require('./routes/scenarioRoutes');
app.use('/api/scenarios', scenarioRoutes);

// Import and use relationship routes
const relationshipRoutes = require('./routes/relationshipRoutes');
app.use('/api/relationships', relationshipRoutes);

// Import and use requirement routes
const requirementRoutes = require('./routes/requirementRoutes');
app.use('/api/requirements', requirementRoutes);

// Import and use parameter routes
const parameterRoutes = require('./routes/parameterRoutes');
app.use('/api/parameters', parameterRoutes);

// Import and use function routes
const functionRoutes = require('./routes/functionRoutes');
app.use('/api/functions', functionRoutes); // Use plural path

// Import and use appearance routes
const appearanceRoutes = require('./routes/appearanceRoutes');
app.use('/api/appearance', appearanceRoutes);

// Import and use item routes (NEW)
const itemRoutes = require('./routes/itemRoutes'); 
app.use('/api/items', itemRoutes);

// Import and use AI generator routes (NEW)
const aiGeneratorRoutes = require('./routes/aiGeneratorRoutes');
app.use('/api/ai-generator', aiGeneratorRoutes);

// Import routes
const itemTypeRoutes = require('./routes/itemTypeRoutes');  // Add the new routes

// Register routes
app.use('/api/parameters', parameterRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/functions', functionRoutes);
app.use('/api/item-types', itemTypeRoutes);  // Register the new routes

app.get('/', (req, res) => {
  res.send('Digital Thread Navigator Backend is running!');
});

// Remove the /test-neo4j route, as db.js handles initial connection check

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Remove the graceful shutdown logic for the driver here, as it's handled in db.js 