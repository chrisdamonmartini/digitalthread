const express = require('express');
const driver = require('../db');

const router = express.Router();

// GET /api/domains - Get all domains with their order
router.get('/', async (req, res) => {
  const session = driver.session({ database: 'neo4j' });
  try {
    // First, get the domain order from config
    const configResult = await session.run(
      `MATCH (c:AppConfig {id: 'singleton'}) RETURN c.domainOrder AS domainOrder`
    );

    if (configResult.records.length === 0) {
      return res.status(404).json({ error: 'Domain configuration not found' });
    }

    const domainOrder = configResult.records[0].get('domainOrder');

    // Get appearance settings for colors
    const appearanceResult = await session.run(
      `MATCH (a:AppSettings {id: 'appearance_settings'}) RETURN a`
    );

    const properties = appearanceResult.records.length > 0 
      ? appearanceResult.records[0].get('a').properties 
      : {};

    // Build the domain list with colors and order
    const domains = domainOrder.map((domain, index) => {
      // Map domain names to their type/label used in the API
      let type;
      switch(domain) {
        case 'Mission': type = 'mission'; break;
        case 'Scenario': type = 'scenario'; break;
        case 'Requirements': type = 'requirement'; break;
        case 'Parameter': type = 'parameter'; break;
        case 'Functions': type = 'function'; break;
        case 'Logical': type = 'logical'; break;
        case 'EBOM': type = 'ebom'; break;
        case 'Simulation Models': type = 'simulationModel'; break;
        case 'Simulations': type = 'simulation'; break;
        case 'Test Cases': type = 'testCase'; break;
        default: type = domain.toLowerCase();
      }

      return {
        id: domain,
        name: domain,
        type: type,
        order: index,
        color: properties[`${domain}_color`] || '#cccccc',
        icon: properties[`${domain}_icon`] || ''
      };
    });

    res.status(200).json(domains);
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({ error: 'Failed to retrieve domains', details: error.message });
  } finally {
    await session.close();
  }
});

// POST /api/domains/order - Update domain order
router.post('/order', async (req, res) => {
  const { domains } = req.body;

  if (!Array.isArray(domains)) {
    return res.status(400).json({ error: 'Invalid domain order data. Expected array of domains.' });
  }

  const session = driver.session({ database: 'neo4j' });
  try {
    // Get current config first to validate
    const configResult = await session.run(
      `MATCH (c:AppConfig {id: 'singleton'}) RETURN c.domainOrder AS currentOrder`
    );

    if (configResult.records.length === 0) {
      return res.status(404).json({ error: 'Domain configuration not found' });
    }

    const currentOrder = configResult.records[0].get('currentOrder');

    // Validate that the new order contains all the same domains
    const newOrder = domains.map(d => d.id);
    if (newOrder.length !== currentOrder.length || 
        !currentOrder.every(domain => newOrder.includes(domain))) {
      return res.status(400).json({ 
        error: 'Invalid domain order. New order must contain all existing domains.' 
      });
    }

    // Update the domain order
    await session.run(
      `MATCH (c:AppConfig {id: 'singleton'})
       SET c.domainOrder = $newOrder
       SET c.updatedAt = datetime()
       RETURN c`,
      { newOrder }
    );

    res.status(200).json({ message: 'Domain order updated successfully' });
  } catch (error) {
    console.error('Error updating domain order:', error);
    res.status(500).json({ error: 'Failed to update domain order', details: error.message });
  } finally {
    await session.close();
  }
});

module.exports = router; 