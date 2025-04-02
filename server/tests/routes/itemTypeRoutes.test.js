const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const app = express();
const itemTypeRoutes = require('../../routes/itemTypeRoutes');
const ItemTypeConfig = require('../../models/ItemTypeConfig');
const Parameter = require('../../models/Parameter');
const Requirement = require('../../models/Requirement');
const Function = require('../../models/Function');

// Configure the app
app.use(express.json());
app.use('/api/item-types', itemTypeRoutes);

// Mock data
let mockParameter;
let mockRequirement;

describe('Item Type Routes', () => {
  let mongoServer;

  // Setup database connection
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  // Cleanup after tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Clear database between tests
  beforeEach(async () => {
    await ItemTypeConfig.deleteMany({});
    await Parameter.deleteMany({});
    await Requirement.deleteMany({});
    await Function.deleteMany({});

    // Create test items
    mockParameter = await Parameter.create({
      id: 'param1',
      title: 'Length',
      unit: 'mm',
      valueType: 'number',
      description: 'Length parameter'
    });

    const param2 = await Parameter.create({
      id: 'param2',
      title: 'Width',
      unit: 'mm',
      valueType: 'number'
    });

    mockRequirement = await Requirement.create({
      id: 'req1',
      title: 'First Requirement',
      description: 'Test requirement'
    });
  });

  describe('GET /:itemType', () => {
    it('should return all items of the specified type', async () => {
      const response = await request(app).get('/api/item-types/Parameter');
      
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0].title).toBe('Length');
      expect(response.body[1].title).toBe('Width');
    });

    it('should return 400 for unknown item type', async () => {
      const response = await request(app).get('/api/item-types/Unknown');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Unknown item type');
    });
  });

  describe('GET /:itemType/config', () => {
    it('should create a default config if none exists', async () => {
      const response = await request(app).get('/api/item-types/Parameter/config');
      
      expect(response.status).toBe(200);
      expect(response.body.itemType).toBe('Parameter');
      expect(response.body.rootNodeIds).toEqual([]);
      expect(response.body.displaySettings).toBeDefined();
      expect(response.body.displaySettings.backgroundColor).toBe('#ffffff');
    });

    it('should return existing config', async () => {
      // Create a config first
      await ItemTypeConfig.create({
        itemType: 'Parameter',
        rootNodeIds: ['param1'],
        displaySettings: {
          backgroundColor: '#f0f0f0'
        }
      });

      const response = await request(app).get('/api/item-types/Parameter/config');
      
      expect(response.status).toBe(200);
      expect(response.body.itemType).toBe('Parameter');
      expect(response.body.rootNodeIds).toEqual(['param1']);
      expect(response.body.displaySettings.backgroundColor).toBe('#f0f0f0');
    });
  });

  describe('PUT /:itemType/config', () => {
    it('should update an existing config', async () => {
      // Create a config first
      await ItemTypeConfig.create({
        itemType: 'Parameter',
        rootNodeIds: [],
        displaySettings: {
          backgroundColor: '#ffffff'
        }
      });

      const updateData = {
        rootNodeIds: ['param1', 'param2'],
        displaySettings: {
          backgroundColor: '#f5f5f5',
          textColor: '#222222'
        }
      };

      const response = await request(app)
        .put('/api/item-types/Parameter/config')
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.config.rootNodeIds).toEqual(['param1', 'param2']);
      expect(response.body.config.displaySettings.backgroundColor).toBe('#f5f5f5');
      expect(response.body.config.displaySettings.textColor).toBe('#222222');
    });

    it('should create a new config if none exists', async () => {
      const updateData = {
        rootNodeIds: ['param1'],
        displaySettings: {
          backgroundColor: '#eeeeee'
        }
      };

      const response = await request(app)
        .put('/api/item-types/Parameter/config')
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.config.rootNodeIds).toEqual(['param1']);
      expect(response.body.config.displaySettings.backgroundColor).toBe('#eeeeee');
    });

    it('should partially update config when only some fields are provided', async () => {
      // Create a config first
      await ItemTypeConfig.create({
        itemType: 'Parameter',
        rootNodeIds: ['param1'],
        displaySettings: {
          backgroundColor: '#ffffff',
          textColor: '#333333'
        }
      });

      const updateData = {
        displaySettings: {
          backgroundColor: '#f0f0f0'
        }
      };

      const response = await request(app)
        .put('/api/item-types/Parameter/config')
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.config.rootNodeIds).toEqual(['param1']); // Unchanged
      expect(response.body.config.displaySettings.backgroundColor).toBe('#f0f0f0'); // Changed
      expect(response.body.config.displaySettings.textColor).toBe('#333333'); // Unchanged
    });
  });

  describe('POST /link and DELETE /link', () => {
    it('should create a link between two items', async () => {
      const linkData = {
        sourceItemType: 'Requirement',
        sourceId: mockRequirement._id,
        targetItemType: 'Parameter',
        targetId: mockParameter._id
      };

      const response = await request(app)
        .post('/api/item-types/link')
        .send(linkData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.sourceItem.childParameterId).toContain(mockParameter._id.toString());
    });

    it('should remove a link between two items', async () => {
      // First create a link
      mockRequirement.childParameterId = [mockParameter._id];
      await mockRequirement.save();

      const unlinkData = {
        sourceItemType: 'Requirement',
        sourceId: mockRequirement._id,
        targetItemType: 'Parameter',
        targetId: mockParameter._id
      };

      const response = await request(app)
        .delete('/api/item-types/link')
        .send(unlinkData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.sourceItem.childParameterId).not.toContain(mockParameter._id.toString());
    });

    it('should return 404 when source item is not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const linkData = {
        sourceItemType: 'Requirement',
        sourceId: nonExistentId,
        targetItemType: 'Parameter',
        targetId: mockParameter._id
      };

      const response = await request(app)
        .post('/api/item-types/link')
        .send(linkData);
      
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Source item not found');
    });
  });

  describe('POST /:itemType', () => {
    it('should create a new item of the specified type', async () => {
      const newItem = {
        id: 'param3',
        title: 'Height',
        unit: 'cm',
        valueType: 'number',
        description: 'Height parameter'
      };

      const response = await request(app)
        .post('/api/item-types/Parameter')
        .send(newItem);
      
      expect(response.status).toBe(201);
      expect(response.body.id).toBe('param3');
      expect(response.body.title).toBe('Height');

      // Verify it was actually saved to the database
      const savedItem = await Parameter.findOne({ id: 'param3' });
      expect(savedItem).toBeTruthy();
      expect(savedItem.title).toBe('Height');
    });

    it('should return 400 for unknown item type', async () => {
      const newItem = {
        id: 'test1',
        title: 'Test'
      };

      const response = await request(app)
        .post('/api/item-types/Unknown')
        .send(newItem);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Unknown item type');
    });
  });
}); 