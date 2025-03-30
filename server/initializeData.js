const driver = require('./db');

// Default configuration for the app
const DEFAULT_CONFIG = {
  id: 'singleton',
  domainOrder: [
    'Mission',
    'Scenario',
    'Requirements',
    'Parameter',
    'Functions',
    'Logical',
    'EBOM',
    'Simulation Models',
    'Simulations',
    'Test Cases'
  ],
  allowOnlyAdjacentConnections: true,
  updatedAt: new Date().toISOString()
};

// Function to initialize the database with default config
async function initializeData() {
  const session = driver.session({ database: 'neo4j' });
  
  try {
    console.log('Checking for existing configuration...');
    
    // Check if config already exists
    const configCheck = await session.run(
      `MATCH (c:AppConfig {id: $id}) RETURN c`,
      { id: 'singleton' }
    );
    
    if (configCheck.records.length === 0) {
      console.log('No configuration found. Creating default configuration...');
      
      // Create default config
      await session.run(
        `CREATE (c:AppConfig $props)
         RETURN c`,
        { props: DEFAULT_CONFIG }
      );
      
      console.log('Default configuration created successfully!');
    } else {
      console.log('Configuration already exists. No changes made.');
    }
    
    console.log('Database initialization complete.');
    
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await session.close();
  }
  
  // Close the driver when done
  await driver.close();
}

// Run the initialization
initializeData(); 