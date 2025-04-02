# Automated Test Suite for Item Type Container Redesign

This document outlines automated tests to validate each step of the Container Redesign implementation plan.

## Test Technologies

- **Backend API Tests**: Jest + Supertest
- **Frontend Component Tests**: React Testing Library + Jest
- **E2E Tests**: Cypress
- **Performance Tests**: Lighthouse + custom metrics collection

## 1. Backend API Tests

### 1.1 ItemType RootNode API Tests

```javascript
// File: server/tests/api/itemtype-rootnode.test.js

const request = require('supertest');
const app = require('../../app');
const testDb = require('../test-db-setup');

describe('ItemType RootNode API', () => {
  beforeAll(async () => {
    await testDb.setup();
    // Seed with test data including configured RootNode
    await testDb.seedRootNodeData();
  });

  afterAll(async () => {
    await testDb.teardown();
  });

  test('TC-API-01: Returns correct RootNode data for configured ItemType', async () => {
    // Setup test data with known configuration
    const itemType = 'Mission';
    const expectedRootNode = ['mission-1', 'mission-2'];
    
    // Perform API call
    const response = await request(app)
      .get(`/api/itemtype/${itemType}/rootnode`)
      .expect(200);
      
    // Assertions
    expect(response.body).toHaveProperty('rootNode');
    expect(response.body).toHaveProperty('child');
    expect(response.body.rootNode.map(node => node.id)).toEqual(expect.arrayContaining(expectedRootNode));
    expect(response.body.rootNode[0]).toHaveProperty('title');
    expect(response.body.rootNode[0]).toHaveProperty('description');
    expect(response.body.rootNode[0]).toHaveProperty('childMissionId');
  });

  test('TC-API-02: Returns empty arrays for ItemType with no RootNode', async () => {
    // Setup test data with empty configuration
    const itemType = 'EmptyType';
    
    // Perform API call
    const response = await request(app)
      .get(`/api/itemtype/${itemType}/rootnode`)
      .expect(200);
      
    // Assertions
    expect(response.body).toEqual({
      rootNode: [],
      child: []
    });
  });

  test('TC-API-03: Updates container configuration correctly', async () => {
    // Setup test data
    const itemType = 'Scenario';
    const newConfig = {
      displayRootNode: ['scenario-1', 'scenario-3'],
      containerColor: '#336699'
    };
    
    // Perform API call to update
    await request(app)
      .put(`/api/config/container-display/${itemType}`)
      .send(newConfig)
      .expect(200);
      
    // Verify update was successful
    const response = await request(app)
      .get(`/api/config/container-display/${itemType}`)
      .expect(200);
      
    // Assertions
    expect(response.body.displayRootNode).toEqual(newConfig.displayRootNode);
    expect(response.body.containerColor).toEqual(newConfig.containerColor);
  });
});
```

### 1.2 API Performance Tests

```javascript
// File: server/tests/performance/api-performance.test.js

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
```

## 2. Frontend Component Tests

### 2.1 ContainerConfigPanel Tests

```javascript
// File: client/src/components/__tests__/ContainerConfigPanel.test.js

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppContext } from '../../AppContext';
import ContainerConfigPanel from '../ContainerConfigPanel';

// Mock API calls
jest.mock('../../api', () => ({
  fetchRootNode: jest.fn(),
  updateContainerConfig: jest.fn()
}));

describe('ContainerConfigPanel', () => {
  const mockAppConfig = {
    itemType: {
      Mission: { color: '#336699', displayRootNode: [] }
    }
  };
  
  const mockSetAppConfig = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-UI-01: Saves RootNode configuration correctly', async () => {
    // Mock API responses
    const mockItems = [
      { id: 'mission-1', title: 'Test Mission 1' },
      { id: 'mission-2', title: 'Test Mission 2' }
    ];
    
    require('../../api').fetchRootNode.mockResolvedValue(mockItems);
    require('../../api').updateContainerConfig.mockResolvedValue({ success: true });
    
    // Render component
    render(
      <AppContext.Provider value={{ appConfig: mockAppConfig, setAppConfig: mockSetAppConfig }}>
        <ContainerConfigPanel
          isOpen={true}
          onClose={jest.fn()}
          itemType="Mission"
          onSave={jest.fn()}
        />
      </AppContext.Provider>
    );
    
    // Verify title is correctly displayed
    expect(screen.getByText('Container Configuration')).toBeInTheDocument();
    expect(screen.getByText('Current Root Node')).toBeInTheDocument();
    
    // Select a RootNode to add
    await waitFor(() => {
      expect(screen.getByText('-- Select a Root Node to add --')).toBeInTheDocument();
    });
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'mission-1' } });
    
    // Add the RootNode
    const addButton = screen.getByRole('button', { name: 'Add' });
    fireEvent.click(addButton);
    
    // Verify added to the list
    await waitFor(() => {
      expect(screen.getByText('Test Mission 1')).toBeInTheDocument();
    });
    
    // Save changes
    const saveButton = screen.getByRole('button', { name: 'Save Changes' });
    fireEvent.click(saveButton);
    
    // Verify API called with correct data
    await waitFor(() => {
      expect(require('../../api').updateContainerConfig).toHaveBeenCalledWith(
        'Mission',
        expect.objectContaining({
          displayRootNode: ['mission-1'],
          containerColor: '#336699'
        })
      );
    });
    
    // Verify app config updated
    expect(mockSetAppConfig).toHaveBeenCalled();
  });
});
```

### 2.2 ItemTypeContainer Tests

```javascript
// File: client/src/components/__tests__/ItemTypeContainer.test.js

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ItemTypeContainer from '../ItemTypeContainer';

// Mock API calls
jest.mock('../../api', () => ({
  fetchContainerData: jest.fn()
}));

describe('ItemTypeContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-UI-02: Displays RootNode and their direct child correctly', async () => {
    // Mock API response with RootNode and child
    const mockData = {
      rootNode: [
        { 
          id: 'mission-1', 
          title: 'Root Mission 1', 
          description: 'Test description',
          childMissionId: ['child-1', 'child-2']
        }
      ],
      child: [
        { id: 'child-1', title: 'Child Mission 1' },
        { id: 'child-2', title: 'Child Mission 2' }
      ]
    };
    
    require('../../api').fetchContainerData.mockResolvedValue(mockData);
    
    // Render component
    render(
      <ItemTypeContainer 
        itemType="Mission"
        isLoading={false}
      />
    );
    
    // Verify data is displayed correctly
    await waitFor(() => {
      expect(screen.getByText('Root Mission 1')).toBeInTheDocument();
      expect(screen.getByText('Child Mission 1')).toBeInTheDocument();
      expect(screen.getByText('Child Mission 2')).toBeInTheDocument();
    });
  });

  test('TC-UI-03: Displays empty state message when no data exists', async () => {
    // Mock empty API response
    const emptyData = {
      rootNode: [],
      child: []
    };
    
    require('../../api').fetchContainerData.mockResolvedValue(emptyData);
    
    // Render component
    render(
      <ItemTypeContainer 
        itemType="Mission"
        isLoading={false}
      />
    );
    
    // Verify empty state is displayed
    await waitFor(() => {
      expect(screen.getByText(/No Root Node configured/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Your First Root Node/i })).toBeInTheDocument();
    });
  });
});
```

## 3. End-to-End Tests with Cypress

```javascript
// File: cypress/integration/container_redesign.spec.js

describe('Container Redesign E2E Tests', () => {
  beforeEach(() => {
    // Reset test data
    cy.task('db:reset');
    cy.task('db:seed');
    
    // Login if needed
    cy.login();
  });

  it('TC-REG-01: Linking between ItemType containers works correctly', () => {
    // Navigate to main page
    cy.visit('/');
    
    // Verify containers are displayed
    cy.get('.item-type-container').should('have.length.at.least', 2);
    
    // Start linking from a Mission item
    cy.contains('.item-card', 'Test Mission')
      .within(() => {
        cy.contains('Link →').click();
      });
    
    // Verify Scenario container is highlighted as a target
    cy.get('.item-type-container').eq(1)
      .should('have.class', 'linking-target');
    
    // Complete link to a Scenario item
    cy.get('.item-type-container').eq(1)
      .contains('.item-card', 'Test Scenario')
      .click();
    
    // Verify success message
    cy.contains('Link created successfully').should('be.visible');
    
    // Verify link is displayed in UI
    cy.get('.relationship-line').should('exist');
  });

  it('TC-REG-02: CRUD operations work with new implementation', () => {
    // Navigate to main page
    cy.visit('/');
    
    // --- Create ---
    
    // Open Mission container's add form
    cy.get('.item-type-container').first()
      .contains('Add New Mission')
      .click();
    
    // Fill in form
    cy.get('input[name="title"]').type('E2E Test Mission');
    cy.get('textarea[name="description"]').type('Created during E2E test');
    
    // Submit form
    cy.contains('button', 'Add Mission').click();
    
    // Verify mission was created
    cy.contains('.item-card', 'E2E Test Mission').should('be.visible');
    
    // --- Update ---
    
    // Open edit modal
    cy.contains('.item-card', 'E2E Test Mission')
      .find('.edit-button')
      .click();
    
    // Update title
    cy.get('input[name="title"]').clear().type('Updated Mission Title');
    
    // Save changes
    cy.contains('button', 'Save Changes').click();
    
    // Verify mission was updated
    cy.contains('.item-card', 'Updated Mission Title').should('be.visible');
    
    // --- Delete ---
    
    // Delete the mission
    cy.contains('.item-card', 'Updated Mission Title')
      .find('.delete-button')
      .click();
    
    // Confirm deletion
    cy.contains('button', 'Confirm Delete').click();
    
    // Verify mission was deleted
    cy.contains('.item-card', 'Updated Mission Title').should('not.exist');
  });
});
```

## 4. Performance Test Automation

```javascript
// File: performance/lighthouse-ci.js

const { exec } = require('child_process');
const fs = require('fs');

// Test both implementations and compare
async function runPerformanceTests() {
  // Run tests on old implementation
  console.log('Testing old implementation...');
  await runLighthouse('./old-implementation-url.json');
  
  // Run tests on new implementation
  console.log('Testing new implementation...');
  await runLighthouse('./new-implementation-url.json');
  
  // Compare results
  compareResults();
}

function runLighthouse(configFile) {
  return new Promise((resolve, reject) => {
    exec(`lighthouse-ci --config=${configFile}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

function compareResults() {
  // Load results
  const oldResults = JSON.parse(fs.readFileSync('./old-implementation-results.json'));
  const newResults = JSON.parse(fs.readFileSync('./new-implementation-results.json'));
  
  // Compare metrics
  const performanceScore = {
    old: oldResults.categories.performance.score * 100,
    new: newResults.categories.performance.score * 100
  };
  
  const fcp = {
    old: oldResults.audits['first-contentful-paint'].numericValue,
    new: newResults.audits['first-contentful-paint'].numericValue
  };
  
  const lcp = {
    old: oldResults.audits['largest-contentful-paint'].numericValue,
    new: newResults.audits['largest-contentful-paint'].numericValue
  };
  
  const networkRequests = {
    old: oldResults.audits['network-requests'].numericValue,
    new: newResults.audits['network-requests'].numericValue
  };
  
  // Calculate improvements
  const performanceImprovement = (performanceScore.new - performanceScore.old);
  const fcpImprovement = ((fcp.old - fcp.new) / fcp.old) * 100;
  const lcpImprovement = ((lcp.old - lcp.new) / lcp.old) * 100;
  const networkImprovement = ((networkRequests.old - networkRequests.new) / networkRequests.old) * 100;
  
  // Log results
  console.log('\n=== PERFORMANCE COMPARISON ===');
  console.log(`Performance Score: ${performanceImprovement.toFixed(2)}% improvement`);
  console.log(`First Contentful Paint: ${fcpImprovement.toFixed(2)}% faster`);
  console.log(`Largest Contentful Paint: ${lcpImprovement.toFixed(2)}% faster`);
  console.log(`Network Requests: ${networkImprovement.toFixed(2)}% reduction`);
  
  // Determine if passing performance criteria
  const passingCriteria = {
    networkReduction: networkImprovement >= 40,
    renderingSpeed: fcpImprovement >= 30 && lcpImprovement >= 30
  };
  
  console.log('\n=== TEST RESULTS ===');
  console.log(`TC-PERF-01 (Data Transfer): ${passingCriteria.networkReduction ? 'PASS' : 'FAIL'}`);
  console.log(`TC-PERF-02 (Rendering Performance): ${passingCriteria.renderingSpeed ? 'PASS' : 'FAIL'}`);
}

runPerformanceTests().catch(console.error);
```

## 5. Integration into CI/CD Pipeline

```yaml
# File: .github/workflows/container-redesign-tests.yml

name: Container Redesign Test Suite

on:
  push:
    branches: [ main, container-redesign-* ]
  pull_request:
    branches: [ main ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '14'
      - name: Install dependencies
        run: cd server && npm ci
      - name: Run backend tests
        run: cd server && npm test

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '14'
      - name: Install dependencies
        run: cd client && npm ci
      - name: Run component tests
        run: cd client && npm test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '14'
      - name: Install dependencies
        run: npm ci
      - name: Start application
        run: npm run start:test &
      - name: Run Cypress tests
        run: npm run cypress:run

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '14'
      - name: Install Lighthouse CI
        run: npm install -g lighthouse-ci
      - name: Run performance tests
        run: node performance/lighthouse-ci.js
      - name: Upload performance results
        uses: actions/upload-artifact@v2
        with:
          name: performance-results
          path: |
            ./old-implementation-results.json
            ./new-implementation-results.json
```

## 6. Test Automation Usage Guide

### Prerequisites
- Node.js 14+
- npm/yarn
- MongoDB (for backend tests)
- Chrome (for E2E and performance tests)

### Running the Test Suite

1. **Backend API Tests**
```bash
cd server
npm test
```

2. **Frontend Component Tests**
```bash
cd client
npm test
```

3. **End-to-End Tests**
```bash
# Start the application in test mode
npm run start:test

# In another terminal
npm run cypress:open  # Interactive mode
# or
npm run cypress:run   # Headless mode
```

4. **Performance Tests**
```bash
cd performance
node lighthouse-ci.js
```

5. **Run All Tests**
```bash
npm run test:all
```

### Test Reports

All tests generate reports in the following locations:
- Backend API Tests: `server/test-results/`
- Frontend Component Tests: `client/test-results/`
- E2E Tests: `cypress/reports/`
- Performance Tests: `performance/reports/`

### Continuous Integration

Tests automatically run on GitHub Actions for:
- Pull requests to main branch
- Pushes to main branch
- Pushes to branches matching `container-redesign-*`

### Testing Progress Tracking

Progress can be tracked via the GitHub project board:
- **Column 1**: To Do (remaining test cases)
- **Column 2**: In Progress (currently implementing)
- **Column 3**: Completed (passing tests)
- **Column 4**: Blockers (tests that cannot be implemented yet) 