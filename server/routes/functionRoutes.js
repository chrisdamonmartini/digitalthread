const express = require('express');
const driver = require('../db');

const router = express.Router();

// --- Helper Function to get the next starting Function ID ---
async function getFunctionStartIdNum() {
  const session = driver.session({ database: 'neo4j' });
  try {
    const result = await session.run(
      `MATCH (f:Function) // Use :Function label
       WHERE f.id STARTS WITH 'FUN-' // Use FUN- prefix
       WITH f.id AS id
       ORDER BY id DESC LIMIT 1
       RETURN toInteger(substring(id, 4)) AS lastNum` // Extract number after 'FUN-'
    );
    if (result.records.length > 0) {
      const lastNum = result.records[0].get('lastNum');
      if (lastNum != null && Number.isInteger(lastNum.low)) { 
          return lastNum.low + 1;
      }
    }
    return 1; // Start from 1
  } catch (error) {
    console.error('Error getting function start ID number:', error);
    throw new Error('Could not determine starting function ID');
  } finally {
    await session.close();
  }
}

// --- Route Handlers ---

// POST /api/functions - Create a new function
router.post('/', async (req, res) => {
  const { title, description, functionType } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Function title is required' });
  }

  const session = driver.session({ database: 'neo4j' });
  let functionId;
  try {
    const nextNum = await getFunctionStartIdNum();
    functionId = `FUN-${String(nextNum).padStart(3, '0')}`; // Use FUN- prefix

    // Optional: Check for ID collision
    const checkResult = await session.run('MATCH (f:Function {id: $id}) RETURN f', { id: functionId });
    if (checkResult.records.length > 0) {
         return res.status(409).json({ error: `Function ID ${functionId} already exists. Please try again.` });
    }

    const result = await session.run(
      `CREATE (f:Function { // Use :Function label
         id: $id,
         title: $title,
         description: $description,
         functionType: $functionType, // Add functionType
         createdAt: datetime(), 
         updatedAt: datetime()
       })
       RETURN f`, 
      {
        id: functionId,
        title: title,
        description: description || null, 
        functionType: functionType || null // Handle optional type
      }
    );

    if (result.records.length === 0) {
      throw new Error('Function creation failed in database');
    }

    const createdFunction = result.records[0].get('f').properties;
    res.status(201).json(createdFunction);

  } catch (error) {
    console.error(`Error creating function (ID: ${functionId || 'N/A'}):`, error);
    res.status(500).json({ error: 'Failed to create function', details: error.message });
  } finally {
    await session.close();
  }
});

// GET /api/functions - Retrieve all functions
router.get('/', async (req, res) => {
  const session = driver.session({ database: 'neo4j' });
  try {
    const result = await session.run(
      `MATCH (f:Function)
       OPTIONAL MATCH (p:Parameter)-[:INPUT_TO]->(f) // Incoming from Parameter
       // OPTIONAL MATCH (f)-[:OUTPUT_OF]->(l:LogicalElement) // Example: For next link
       RETURN f, 
              collect(DISTINCT p.id) AS inputParameterIds 
              // , collect(DISTINCT l.id) AS outputToLogicalIds // Example
       ORDER BY f.id` 
    );
    const functions = result.records.map(record => ({
      ...record.get('f').properties,
      inputParameterIds: record.get('inputParameterIds')
      // outputToLogicalIds: record.get('outputToLogicalIds') // Example
    }));
    res.status(200).json(functions);
  } catch (error) {
    console.error('Error retrieving functions:', error);
    res.status(500).json({ error: 'Failed to retrieve functions', details: error.message });
  } finally {
    await session.close();
  }
});

// POST /api/functions/bulk-generate - Create multiple functions and sub-functions
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
    const startIdNum = await getFunctionStartIdNum(); 
    let currentIdNum = startIdNum;
    const generatedItems = []; 
    const defaultFuncTypes = ['Control', 'DataProcessing', 'Calculation', 'Interface'];

    for (let i = 0; i < count; i++) {
      const parentId = `FUN-${String(currentIdNum).padStart(3, '0')}`;
      const parentData = {
        id: parentId,
        title: `Generated Function ${parentId}`,
        description: `Bulk generated top-level function.`,
        functionType: defaultFuncTypes[Math.floor(Math.random() * defaultFuncTypes.length)], // Assign random type
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        children: [] 
      };

      const numSubItems = Math.floor(Math.random() * (maxSubs - minSubs + 1)) + minSubs;

      for (let j = 0; j < numSubItems; j++) {
        const childId = `${parentId}-SUB-${String(j + 1).padStart(3, '0')}`; 
        parentData.children.push({
            id: childId,
            title: `Generated Sub-Function ${j+1} for ${parentId}`,
            description: `Bulk generated sub-function.`,
            functionType: parentData.functionType, // Inherit type
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
      }
      generatedItems.push(parentData);
      currentIdNum++;
    }

    // Use UNWIND for bulk creation (adapted for Functions)
    await session.run(
        `UNWIND $items AS item
         CREATE (parent:Function { // Use :Function label
             id: item.id,
             title: item.title,
             description: item.description,
             functionType: item.functionType,
             createdAt: datetime(item.createdAt),
             updatedAt: datetime(item.updatedAt)
         })
         WITH parent, item.children AS childrenData
         UNWIND childrenData AS childData
         CREATE (child:Function { // Use :Function label for children
             id: childData.id,
             title: childData.title,
             description: childData.description,
             functionType: childData.functionType,
             createdAt: datetime(childData.createdAt),
             updatedAt: datetime(childData.updatedAt)
         })
         MERGE (parent)-[:HAS_CHILD]->(child)`, 
      { items: generatedItems } 
    );

    res.status(201).json({
        message: `Successfully generated ${count} top-level functions with ${minSubs}-${maxSubs} sub-functions each.`,
        generatedCount: count 
    });

  } catch (error) {
    console.error('Error during bulk function generation:', error);
    res.status(500).json({ error: 'Failed to bulk generate functions', details: error.message });
  } finally {
    await session.close();
  }
});


// TODO: Add routes for GET /:id, PUT /:id, DELETE /:id
// TODO: Add routes for managing :HAS_CHILD relationships within Functions

module.exports = router; 