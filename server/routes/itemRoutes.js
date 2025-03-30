const express = require('express');
const router = express.Router();
const driver = require('../db'); // Import the driver directly from db.js
const neo4j = require('neo4j-driver');

// Helper function to extract node properties
const extractNodeProperties = (record, nodeAlias) => {
    // Check if record exists
    if (!record) return null;

    const node = record.get(nodeAlias);
    // If node doesn't exist in the record, return null
    if (!node) return null;

    // Ensure properties exists and is an object
    const properties = node.properties || {};
    
    // Create a new object to avoid modifying the original
    const result = {
        id: properties.id || '',
        labels: node.labels || [],
    };

    // Convert Neo4j integers/floats if necessary (BigInts)
    Object.keys(properties).forEach(key => {
        if (neo4j.isInt(properties[key])) {
            result[key] = properties[key].toNumber(); // Or toString() if they can be large
        } else if (properties[key] === null || properties[key] === undefined) {
            // Skip null/undefined values or set them to empty defaults if needed
            result[key] = '';
        } else {
            result[key] = properties[key];
        }
        // Add float handling if needed
    });
    
    return result;
};


// 1. Search Items Endpoint
// GET /api/items/search?q=<query>
router.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const session = driver.session(); // Create session from driver directly
    try {
        // Basic search query (adjust property and matching logic as needed)
        // This searches across all nodes for a title containing the query (case-insensitive)
        const result = await session.run(
            'MATCH (n) WHERE toLower(n.title) CONTAINS toLower($query) RETURN n LIMIT 25',
            { query }
        );

        const items = result.records.map(record => extractNodeProperties(record, 'n'));
        res.json(items);
    } catch (error) {
        console.error('Error searching items:', error);
        res.status(500).json({ error: 'Failed to search items', details: error.message });
    } finally {
        await session.close();
    }
});

// 2. Get Item Structure Endpoint
// GET /api/items/structure/:itemId
router.get('/structure/:itemId', async (req, res) => {
    const { itemId } = req.params;
    
    // Safety check
    if (!itemId) {
        return res.status(400).json({ error: 'Item ID is required' });
    }
    
    const session = driver.session(); // Create session from driver directly

    try {
        // First, fetch the root item to make sure it exists
        const rootResult = await session.run(
            'MATCH (root {id: $itemId}) RETURN root',
            { itemId }
        );

        if (rootResult.records.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Extract root properties
        const rootNode = extractNodeProperties(rootResult.records[0], 'root');

        // Simplified approach - just get direct children/parent relationships
        // Using a short depth (2) to avoid overwhelming the response
        const relationshipsResult = await session.run(
            `MATCH (root {id: $itemId})
             OPTIONAL MATCH (root)<-[r1:HAS_CHILD]-(child)
             RETURN root, collect(distinct child) as children`,
            { itemId }
        );

        // Initialize the structure with the root node data
        const structure = {
            ...rootNode,
            HAS_CHILD: []
        };
        
        // If we have results, process them
        if (relationshipsResult.records.length > 0) {
            // Get the children from the result
            const childrenNodes = relationshipsResult.records[0].get('children');
            
            // Convert Neo4j nodes to plain objects and add to structure
            if (childrenNodes && childrenNodes.length > 0) {
                structure.HAS_CHILD = childrenNodes.map(child => {
                    // Extract basic properties
                    const childProps = {};
                    if (child.properties) {
                        Object.keys(child.properties).forEach(key => {
                            const value = child.properties[key];
                            childProps[key] = neo4j.isInt(value) ? value.toNumber() : value;
                        });
                    }
                    
                    return {
                        _id: childProps.id || '',
                        _labels: child.labels || [],
                        ...childProps
                    };
                });
            }
        }
        
        res.json(structure);

    } catch (error) {
        console.error(`Error fetching structure for item ${itemId}:`, error);
        res.status(500).json({ error: 'Failed to fetch item structure', details: error.message });
    } finally {
        await session.close();
    }
});

// 3. Restructure Item Endpoint (Change Parent)
// PUT /api/items/:itemId/parent
// Body: { newParentId: '...' } or { newParentId: null } to detach
router.put('/:itemId/parent', async (req, res) => {
    const { itemId } = req.params;
    const { newParentId } = req.body; // ID of the new parent node, or null

    if (newParentId === undefined) {
        return res.status(400).json({ error: 'newParentId is required in the request body (can be null)' });
    }

    if (itemId === newParentId) {
      return res.status(400).json({ error: 'Item cannot be its own parent' });
    }

    const session = driver.session(); // Create session from driver directly
    try {
        // First check if the item we're moving exists
        const itemCheck = await session.run(
            'MATCH (i {id: $itemId}) RETURN i LIMIT 1',
            { itemId }
        );

        if (itemCheck.records.length === 0) {
            return res.status(404).json({ error: `Item with ID ${itemId} not found.` });
        }

        // Start transaction
        const tx = session.beginTransaction();

        try {
            // 1. Delete existing HAS_CHILD relationship(s)
            await tx.run(
                'MATCH (parent)-[r:HAS_CHILD]->(child {id: $itemId}) DELETE r',
                { itemId }
            );

            // 2. If newParentId is provided, create the new relationship
            if (newParentId !== null) {
                // Check if parent exists
                 const parentCheck = await tx.run(
                    'MATCH (p {id: $newParentId}) RETURN p LIMIT 1',
                    { newParentId }
                 );
                 if (parentCheck.records.length === 0) {
                     throw new Error(`New parent item with ID ${newParentId} not found.`);
                 }
                
                // Create new relationship - note that HAS_CHILD directionality is FROM parent TO child
                await tx.run(
                    'MATCH (child {id: $itemId}), (parent {id: $newParentId}) MERGE (parent)-[:HAS_CHILD]->(child)',
                    { itemId, newParentId }
                );
            }

            // Commit transaction
            await tx.commit();
            res.json({ 
                success: true,
                message: `Item ${itemId} parent updated successfully.`,
                itemId,
                newParentId
            });

        } catch (error) {
            console.error('Error during restructure transaction:', error);
            // Rollback transaction on error
            await tx.rollback();
            // Provide specific error message if parent not found
            if (error.message.includes('not found')) {
                 res.status(404).json({ error: 'Failed to restructure item', details: error.message });
            } else {
                 res.status(500).json({ error: 'Failed to restructure item', details: error.message });
            }
        }
    } catch (error) {
         // Catch errors related to starting the transaction itself
        console.error('Error managing restructure transaction:', error);
        res.status(500).json({ error: 'Failed to restructure item', details: error.message });
    } finally {
        await session.close();
    }
});

// 4. Delete Item Endpoint
// DELETE /api/items/:itemId
router.delete('/:itemId', async (req, res) => {
    const { itemId } = req.params;
    const session = driver.session(); // Create session from driver directly

    try {
        // Detach and delete the node to remove it and all its relationships
        const result = await session.run(
            'MATCH (n {id: $itemId}) DETACH DELETE n RETURN count(n) as deletedCount',
            { itemId }
        );

        const deletedCount = result.records[0].get('deletedCount').toNumber();

        if (deletedCount === 0) {
            return res.status(404).json({ error: 'Item not found for deletion' });
        }

        res.status(200).json({ message: `Item ${itemId} deleted successfully.` }); // 200 OK or 204 No Content
    } catch (error) {
        console.error(`Error deleting item ${itemId}:`, error);
        res.status(500).json({ error: 'Failed to delete item', details: error.message });
    } finally {
        await session.close();
    }
});

// 5. Update Item Endpoint (For renaming and updating properties)
// PUT /api/items/:itemId
router.put('/:itemId', async (req, res) => {
    const { itemId } = req.params;
    const updates = req.body;
    
    // Prevent updating the ID property
    if (updates.id && updates.id !== itemId) {
        return res.status(400).json({ error: 'Cannot change the ID of an existing item' });
    }
    
    // Make sure there's at least one property to update
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No properties provided for update' });
    }
    
    const session = driver.session();
    try {
        // First check if the item exists
        const checkResult = await session.run(
            'MATCH (n {id: $itemId}) RETURN n',
            { itemId }
        );
        
        if (checkResult.records.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        // Build the update query with dynamic property setting
        let setClause = 'SET ';
        const params = { itemId };
        
        Object.entries(updates).forEach(([key, value], index) => {
            // Skip id property as we've already checked it
            if (key === 'id') return;
            
            const paramName = `param${index}`;
            setClause += `n.${key} = $${paramName}`;
            params[paramName] = value;
            
            if (index < Object.keys(updates).length - 1) {
                setClause += ', ';
            }
        });
        
        // Only proceed if we have properties to update
        if (setClause === 'SET ') {
            return res.status(400).json({ error: 'No valid properties provided for update' });
        }
        
        // Run the update query
        const result = await session.run(
            `MATCH (n {id: $itemId}) ${setClause} RETURN n`,
            params
        );
        
        // Extract the updated node and return its properties
        const updatedNode = extractNodeProperties(result.records[0], 'n');
        
        res.json({
            message: 'Item updated successfully',
            item: updatedNode
        });
        
    } catch (error) {
        console.error(`Error updating item ${itemId}:`, error);
        res.status(500).json({ error: 'Failed to update item', details: error.message });
    } finally {
        await session.close();
    }
});

module.exports = router; 