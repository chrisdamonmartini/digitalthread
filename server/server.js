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

// --- API Routes ---

// Import and use mission routes
const missionRoutes = require('./routes/missionRoutes');
app.use('/api/missions', missionRoutes);


app.get('/', (req, res) => {
  res.send('Digital Thread Navigator Backend is running!');
});

// Remove the /test-neo4j route, as db.js handles initial connection check

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// Remove the graceful shutdown logic for the driver here, as it's handled in db.js 