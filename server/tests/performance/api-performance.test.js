/**
 * Performance tests for the API endpoints
 */

const request = require('supertest');
const app = require('../../app');
const testDb = require('../test-db-setup');

describe('API Performance Tests', () => {
  beforeAll(async () => {
    await testDb.setup();
    await testDb.seedLargeDataset(); // Create large dataset for realistic testing
  });

  afterAll(async () => {
    await testDb.teardown();
  });

  test('TC-PERF-01: RootNode API reduces data transfer vs. old implementation', async () => {
    const itemType = 'Mission';
    
    // Old implementation - fetches all items
    const startOld = process.hrtime();
    const oldResponse = await request(app)
      .get(`/api/${itemType.toLowerCase()}s`)
      .expect(200);
    const oldDuration = getDurationInMs(startOld);
    const oldSize = JSON.stringify(oldResponse.body).length;
    
    // New implementation - fetches only root nodes and their children
    const startNew = process.hrtime();
    const newResponse = await request(app)
      .get(`/api/itemtype/${itemType}/rootnode`)
      .expect(200);
    const newDuration = getDurationInMs(startNew);
    const newSize = JSON.stringify(newResponse.body).length;
    
    // Calculate reduction percentage
    const sizeReduction = ((oldSize - newSize) / oldSize) * 100;
    const timeReduction = ((oldDuration - newDuration) / oldDuration) * 100;
    
    console.log(`Size reduction: ${sizeReduction.toFixed(2)}%`);
    console.log(`Time reduction: ${timeReduction.toFixed(2)}%`);
    
    // Assertions
    expect(sizeReduction).toBeGreaterThanOrEqual(40); // At least 40% reduction
    expect(timeReduction).toBeGreaterThanOrEqual(30); // At least 30% reduction
  });
});

// Helper to get duration in milliseconds
function getDurationInMs(start) {
  const diff = process.hrtime(start);
  return (diff[0] * 1e9 + diff[1]) / 1e6;
} 