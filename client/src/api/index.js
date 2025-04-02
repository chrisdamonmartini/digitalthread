/**
 * Fetches container data for a specific item type
 * @param {string} itemType - The type of item to fetch data for
 * @returns {Promise<Object>} The container data including rootNode and child items
 */
export const fetchContainerData = async (itemType) => {
  try {
    // First, get the container configuration to find the root node IDs
    const configResponse = await fetch(`/api/item-types/${itemType}/config`);
    if (!configResponse.ok) {
      throw new Error(`Failed to fetch container config: ${configResponse.statusText}`);
    }
    
    const config = await configResponse.json();
    
    // Get child key name based on item type (assuming consistent naming)
    const childKey = `child${itemType.replace(/\s+/g, '')}Id`;
    
    // Next, fetch all the items of this type
    const itemsResponse = await fetch(`/api/item-types/${itemType}`);
    if (!itemsResponse.ok) {
      throw new Error(`Failed to fetch items: ${itemsResponse.statusText}`);
    }
    
    const items = await itemsResponse.json();
    
    // Separate root nodes and child items
    const rootNodeIds = config.rootNodeIds || [];
    const rootNode = items.filter(item => rootNodeIds.includes(item.id));
    const child = items.filter(item => !rootNodeIds.includes(item.id));
    
    return {
      rootNode,
      child,
      childIdKey: childKey,
      config
    };
  } catch (error) {
    console.error('Error in fetchContainerData:', error);
    throw error;
  }
}; 