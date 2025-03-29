const express = require('express');
const driver = require('../db');

const router = express.Router();

// --- Helper Function to get the next starting Parameter ID ---
async function getParameterStartIdNum() {
  const session = driver.session({ database: 'neo4j' });
  try {
    const result = await session.run(
      `MATCH (p:Parameter) // Use :Parameter label
       WHERE p.id STARTS WITH 'PAR-' // Use PAR- prefix
       WITH p.id AS id
       ORDER BY id DESC LIMIT 1
       RETURN toInteger(substring(id, 4)) AS lastNum` // Extract number after 'PAR-'
    );
    if (result.records.length > 0) {
      const lastNum = result.records[0].get('lastNum');
      if (lastNum != null && Number.isInteger(lastNum.low)) { 
          return lastNum.low + 1;
      }
    }
    return 1; // Start from 1
  } catch (error) {
    console.error('Error getting parameter start ID number:', error);
    throw new Error('Could not determine starting parameter ID');
  } finally {
    await session.close();
  }
}

// --- Route Handlers ---

// POST /api/parameters - Create a new parameter
router.post('/', async (req, res) => {
  // Include new properties: unit, valueType
  const { title, description, unit, valueType } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Parameter title is required' });
  }

  const session = driver.session({ database: 'neo4j' });
  let parameterId;
  try {
    const nextNum = await getParameterStartIdNum();
    parameterId = `PAR-${String(nextNum).padStart(3, '0')}`; // Use PAR- prefix

    // Optional: Check for ID collision
    const checkResult = await session.run('MATCH (p:Parameter {id: $id}) RETURN p', { id: parameterId });
    if (checkResult.records.length > 0) {
         return res.status(409).json({ error: `Parameter ID ${parameterId} already exists. Please try again.` });
    }

    const result = await session.run(
      `CREATE (p:Parameter { // Use :Parameter label
         id: $id,
         title: $title,
         description: $description,
         unit: $unit, // Add unit
         valueType: $valueType, // Add valueType
         createdAt: datetime(), 
         updatedAt: datetime()
       })
       RETURN p`, 
      {
        id: parameterId,
        title: title,
        description: description || null, 
        unit: unit || null, // Handle optional unit
        valueType: valueType || 'number' // Default valueType if not provided
      }
    );

    if (result.records.length === 0) {
      throw new Error('Parameter creation failed in database');
    }

    const createdParameter = result.records[0].get('p').properties;
    res.status(201).json(createdParameter);

  } catch (error) {
    console.error(`Error creating parameter (ID: ${parameterId || 'N/A'}):`, error);
    res.status(500).json({ error: 'Failed to create parameter', details: error.message });
  } finally {
    await session.close();
  }
});

// GET /api/parameters - Retrieve all parameters
router.get('/', async (req, res) => {
  const session = driver.session({ database: 'neo4j' });
  try {
    const result = await session.run(
      `MATCH (p:Parameter)
       OPTIONAL MATCH (r:Requirement)-[:DEFINES]->(p)
       OPTIONAL MATCH (p)-[:INPUT_TO]->(f:Function)
       RETURN p, 
              collect(DISTINCT r.id) AS definingRequirementIds, 
              collect(DISTINCT f.id) AS inputToFunctionIds
       ORDER BY p.id` 
    );
    const parameters = result.records.map(record => ({
      ...record.get('p').properties,
      definingRequirementIds: record.get('definingRequirementIds'),
      inputToFunctionIds: record.get('inputToFunctionIds')
    }));
    res.status(200).json(parameters);
  } catch (error) {
    console.error('Error retrieving parameters:', error);
    res.status(500).json({ error: 'Failed to retrieve parameters', details: error.message });
  } finally {
    await session.close();
  }
});

// POST /api/parameters/bulk-generate - Create multiple parameters and sub-parameters
router.post('/bulk-generate', async (req, res) => {
  const { count, minSubs, maxSubs } = req.body;

  // Validate input
  if (!Number.isInteger(count) || count <= 0 ||
      !Number.isInteger(minSubs) || minSubs < 0 ||
      !Number.isInteger(maxSubs) || maxSubs < minSubs) {
    return res.status(400).json({ error: 'Invalid input parameters for bulk generation.' });
  }

  const session = driver.session({ database: 'neo4j' });
  try {
    const startIdNum = await getParameterStartIdNum(); 
    let currentIdNum = startIdNum;
    const generatedItems = []; 
    const defaultUnits = ['m', 'kg', 's', 'A', 'K', 'mol', 'cd', '%'];
    const defaultValueTypes = ['number', 'string', 'boolean', 'range'];

    for (let i = 0; i < count; i++) {
      const parentId = `PAR-${String(currentIdNum).padStart(3, '0')}`; // Use PAR- prefix
      const parentData = {
        id: parentId,
        title: `Generated Parameter ${parentId}`,
        description: `Bulk generated top-level parameter.`,
        unit: defaultUnits[Math.floor(Math.random() * defaultUnits.length)], // Assign random unit
        valueType: defaultValueTypes[Math.floor(Math.random() * defaultValueTypes.length)], // Assign random type
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        children: [] 
      };

      const numSubItems = Math.floor(Math.random() * (maxSubs - minSubs + 1)) + minSubs;

      for (let j = 0; j < numSubItems; j++) {
        const childId = `${parentId}-SUB-${String(j + 1).padStart(3, '0')}`; 
        parentData.children.push({
            id: childId,
            title: `Generated Sub-Parameter ${j+1} for ${parentId}`,
            description: `Bulk generated sub-parameter.`,
            unit: parentData.unit, // Inherit unit for simplicity
            valueType: parentData.valueType, // Inherit type for simplicity
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
      }
      generatedItems.push(parentData);
      currentIdNum++;
    }

    // Use UNWIND for bulk creation (adapted for Parameters)
    await session.run(
        `UNWIND $items AS item
         CREATE (parent:Parameter { // Use :Parameter label
             id: item.id,
             title: item.title,
             description: item.description,
             unit: item.unit, 
             valueType: item.valueType,
             createdAt: datetime(item.createdAt),
             updatedAt: datetime(item.updatedAt)
         })
         WITH parent, item.children AS childrenData
         UNWIND childrenData AS childData
         CREATE (child:Parameter { // Use :Parameter label for children too
             id: childData.id,
             title: childData.title,
             description: childData.description,
             unit: childData.unit,
             valueType: childData.valueType,
             createdAt: datetime(childData.createdAt),
             updatedAt: datetime(childData.updatedAt)
         })
         MERGE (parent)-[:HAS_CHILD]->(child)`, 
      { items: generatedItems } 
    );

    res.status(201).json({
        message: `Successfully generated ${count} top-level parameters with ${minSubs}-${maxSubs} sub-parameters each.`,
        generatedCount: count 
    });

  } catch (error) {
    console.error('Error during bulk parameter generation:', error);
    res.status(500).json({ error: 'Failed to bulk generate parameters', details: error.message });
  } finally {
    await session.close();
  }
});


// TODO: Add routes for GET /:id, PUT /:id, DELETE /:id
// TODO: Add routes for managing :HAS_CHILD relationships within Parameters

module.exports = router; 