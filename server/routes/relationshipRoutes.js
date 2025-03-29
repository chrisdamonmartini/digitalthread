const express = require('express');
const driver = require('../db');

const router = express.Router();

const CONFIG_NODE_ID = 'singleton'; // Match the ID used in configRoutes

// Helper to get current config (simplified version - assumes config exists)
// A more robust implementation might share logic with configRoutes or use a service layer.
async function getCurrentConfig(session) {
    const result = await session.run(
        `MATCH (c:AppConfig {id: $id}) RETURN c`,
        { id: CONFIG_NODE_ID }
    );
    if (result.records.length === 0) {
        throw new Error('Application configuration not found.'); // Should not happen if GET /api/config was called once
    }
    return result.records[0].get('c').properties;
}

// Helper to get the node label based on domain name
// This is a simple mapping, might need adjustment if domain names differ from labels
function getLabelForDomain(domainName) {
    // Simple case: assume domain name matches label
    // Add more complex mapping if needed (e.g., 'Simulation Models' -> :SimulationModel)
    switch(domainName) {
        case 'Mission': return 'Mission';
        case 'Scenario': return 'Scenario';
        case 'Requirements': return 'Requirement';
        case 'Parameter': return 'Parameter';
        case 'Functions': return 'Function';
        case 'Logical': return 'LogicalElement'; // Example: might be different
        case 'EBOM': return 'EBOMItem'; // Example
        case 'Simulation Models': return 'SimulationModel'; // Example
        case 'Simulations': return 'SimulationRun'; // Example
        case 'Test Cases': return 'TestCase'; // Example
        default: throw new Error(`Unknown domain: ${domainName}`);
    }
}

// POST /api/relationships - Create a relationship between two items
router.post('/', async (req, res) => {
    const { fromId, toId, fromDomain, toDomain, relationshipType } = req.body;

    if (!fromId || !toId || !fromDomain || !toDomain || !relationshipType) {
        return res.status(400).json({ error: 'Missing required fields (fromId, toId, fromDomain, toDomain, relationshipType)' });
    }

    const session = driver.session({ database: 'neo4j' });
    try {
        // 1. Get current configuration
        const config = await getCurrentConfig(session);
        const { domainOrder, allowOnlyAdjacentConnections } = config;

        // 2. Validate based on configuration
        const fromIndex = domainOrder.indexOf(fromDomain);
        const toIndex = domainOrder.indexOf(toDomain);

        if (fromIndex === -1 || toIndex === -1) {
            return res.status(400).json({ error: `Invalid domain names provided: ${fromDomain}, ${toDomain}` });
        }

        if (allowOnlyAdjacentConnections) {
            if (toIndex !== fromIndex + 1) {
                return res.status(400).json({ 
                    error: `Configuration violation: Connections only allowed between adjacent domains in the current order (${fromDomain} -> ${domainOrder[fromIndex+1]}).` 
                });
            }
        }
        // Add other validation if needed (e.g., disallow backward connections even if adjacent rule is off)
        // else if (toIndex <= fromIndex) {
        //    return res.status(400).json({ error: 'Backward connections are not allowed.' });
        // }
        
        // 3. Determine Node Labels
        const fromLabel = getLabelForDomain(fromDomain);
        const toLabel = getLabelForDomain(toDomain);

        // 4. Create Relationship using MERGE
        // NOTE: Using MERGE is safer than CREATE to avoid duplicate relationships.
        // We use labels in the MATCH clause for efficiency and correctness.
        const result = await session.run(
            `MATCH (a {id: $fromId}), (b {id: $toId})
             // Optional: Add label checks for extra safety if IDs aren't globally unique across types
             // WHERE labels(a)[0] = $fromLabel AND labels(b)[0] = $toLabel 
             MERGE (a)-[r:${relationshipType}]->(b) // Dynamically set relationship type
             RETURN type(r) as createdRelationshipType, a.id as from, b.id as to`, 
            {
                fromId: fromId,
                toId: toId,
                // Optional params if label check is added:
                // fromLabel: fromLabel, 
                // toLabel: toLabel
            }
        );

        if (result.records.length === 0) {
            // This could happen if one of the nodes (a or b) wasn't found by ID
            return res.status(404).json({ error: `Could not create relationship. Ensure items with IDs '${fromId}' and '${toId}' exist.` });
        }

        res.status(201).json({
             message: `Relationship '${result.records[0].get('createdRelationshipType')}' created successfully.`,
             from: result.records[0].get('from'),
             to: result.records[0].get('to')
            });

    } catch (error) {
        console.error('Error creating relationship:', error);
        // Handle specific errors like constraint violations if needed
        res.status(500).json({ error: 'Failed to create relationship', details: error.message });
    } finally {
        await session.close();
    }
});

// TODO: Add routes for DELETE /relationships (more complex, needs relationship ID or from/to info)
// TODO: Add routes for GET /relationships (e.g., get relationships for a specific node)

module.exports = router; 