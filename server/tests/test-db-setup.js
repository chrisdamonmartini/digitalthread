/**
 * Test Database Setup
 * Provides utilities for setting up and tearing down test databases
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Connect to the in-memory database.
 */
module.exports.setup = async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  const mongooseOpts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };

  await mongoose.connect(mongoUri, mongooseOpts);
};

/**
 * Seed the database with test data for Root Node API testing
 */
module.exports.seedRootNodeData = async () => {
  // Import models
  const Mission = require('../models/Mission');
  const Scenario = require('../models/Scenario');
  const Config = require('../models/Config');
  
  // Create test missions
  const mission1 = new Mission({
    id: 'mission-1',
    title: 'Test Mission 1',
    description: 'Test description for mission 1',
    childMissionId: ['child-mission-1', 'child-mission-2']
  });
  
  const mission2 = new Mission({
    id: 'mission-2',
    title: 'Test Mission 2',
    description: 'Test description for mission 2',
    childMissionId: ['child-mission-3']
  });
  
  const childMission1 = new Mission({
    id: 'child-mission-1',
    title: 'Child Mission 1',
    description: 'Child of mission 1'
  });
  
  const childMission2 = new Mission({
    id: 'child-mission-2',
    title: 'Child Mission 2',
    description: 'Child of mission 1'
  });
  
  const childMission3 = new Mission({
    id: 'child-mission-3',
    title: 'Child Mission 3',
    description: 'Child of mission 2'
  });
  
  // Create test scenarios
  const scenario1 = new Scenario({
    id: 'scenario-1',
    title: 'Test Scenario 1',
    description: 'Test description for scenario 1'
  });
  
  const scenario2 = new Scenario({
    id: 'scenario-2',
    title: 'Test Scenario 2',
    description: 'Test description for scenario 2'
  });
  
  const scenario3 = new Scenario({
    id: 'scenario-3',
    title: 'Test Scenario 3',
    description: 'Test description for scenario 3'
  });
  
  // Create test configs for container displays
  const missionConfig = new Config({
    key: 'config/domain-display/Mission',
    value: {
      displayItems: ['mission-1', 'mission-2'],
      domainColor: '#336699'
    }
  });
  
  const scenarioConfig = new Config({
    key: 'config/domain-display/Scenario',
    value: {
      displayItems: ['scenario-1', 'scenario-2'],
      domainColor: '#336699'
    }
  });
  
  const emptyTypeConfig = new Config({
    key: 'config/domain-display/EmptyType',
    value: {
      displayItems: [],
      domainColor: '#336699'
    }
  });
  
  // Save all test data
  await Promise.all([
    mission1.save(),
    mission2.save(),
    childMission1.save(),
    childMission2.save(),
    childMission3.save(),
    scenario1.save(),
    scenario2.save(),
    scenario3.save(),
    missionConfig.save(),
    scenarioConfig.save(),
    emptyTypeConfig.save()
  ]);
  
  console.log('Test data seeded successfully');
};

/**
 * Seed the database with a large dataset for performance testing
 */
module.exports.seedLargeDataset = async () => {
  // Import models
  const Mission = require('../models/Mission');
  const Config = require('../models/Config');
  
  // Create a large number of missions for performance testing
  const missions = [];
  const childMissions = [];
  
  // Create 100 top-level missions
  for (let i = 1; i <= 100; i++) {
    const childIds = [];
    
    // Each top mission has 10 children
    for (let j = 1; j <= 10; j++) {
      const childId = `child-mission-${i}-${j}`;
      childIds.push(childId);
      
      childMissions.push(new Mission({
        id: childId,
        title: `Child Mission ${i}-${j}`,
        description: `This is child mission ${j} of parent mission ${i}`
      }));
    }
    
    missions.push(new Mission({
      id: `mission-${i}`,
      title: `Test Mission ${i}`,
      description: `This is test mission ${i} with 10 children`,
      childMissionId: childIds
    }));
  }
  
  // Create a config with just 5 root nodes displayed
  const missionConfig = new Config({
    key: 'config/domain-display/Mission',
    value: {
      displayItems: ['mission-1', 'mission-2', 'mission-3', 'mission-4', 'mission-5'],
      domainColor: '#336699'
    }
  });
  
  // Save all missions
  await Promise.all([
    ...missions.map(mission => mission.save()),
    ...childMissions.map(child => child.save()),
    missionConfig.save()
  ]);
  
  console.log('Large test dataset seeded successfully');
};

/**
 * Drop database, close the connection and stop mongod.
 */
module.exports.teardown = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
};

/**
 * Remove all data from collections but keep the connection.
 */
module.exports.clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
}; 