const neo4j = require('neo4j-driver');
require('dotenv').config();

const neo4jUri = process.env.NEO4J_URI || 'neo4j://localhost:7687';
const neo4jUser = process.env.NEO4J_USER || 'neo4j';
const neo4jPassword = process.env.NEO4J_PASSWORD;

if (!neo4jPassword) {
  console.error('FATAL ERROR: NEO4J_PASSWORD is not defined in the environment variables.');
  process.exit(1);
}

let driver;

try {
  driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword), {
    // Optional driver configurations can go here
    // e.g., connectionTimeout: 30000, maxConnectionPoolSize: 50
  });

  // Verify connectivity during initialization (optional but recommended)
  driver.verifyConnectivity()
    .then(() => {
      console.log('Successfully connected to Neo4j.');
    })
    .catch((error) => {
      console.error('Neo4j connectivity verification failed:', error);
      process.exit(1);
    });

} catch (error) {
  console.error('Could not create Neo4j driver instance:', error);
  process.exit(1);
}

// Function to gracefully close the driver connection
const closeDriver = async () => {
  if (driver) {
    try {
      await driver.close();
      console.log('Neo4j driver closed.');
    } catch (error) {
      console.error('Error closing Neo4j driver:', error);
    }
  }
};

// Handle process exit signals to close the driver gracefully
process.on('exit', closeDriver);
process.on('SIGINT', async () => { // Catches Ctrl+C event
    await closeDriver();
    process.exit(0);
});
process.on('SIGTERM', async () => { // Catches termination signals
    await closeDriver();
    process.exit(0);
});

module.exports = driver; 