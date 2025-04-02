/**
 * API module for the Container Redesign
 * Provides functions for interacting with the new API endpoints
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * Fetches RootNode for a specific ItemType
 * @param {string} itemType - The type of item (e.g., 'Mission', 'Scenario')
 * @returns {Promise<Array>} - Root nodes data
 */
export const fetchRootNode = async (itemType) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/itemtype/${itemType}/rootnode`);
    return response.data.rootNode;
  } catch (error) {
    console.error(`Error fetching root nodes for ${itemType}:`, error);
    throw error;
  }
};

/**
 * Fetches container data (root nodes and their children) for a specific ItemType
 * @param {string} itemType - The type of item (e.g., 'Mission', 'Scenario')
 * @returns {Promise<Object>} - Container data with rootNode and child arrays
 */
export const fetchContainerData = async (itemType) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/itemtype/${itemType}/rootnode`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching container data for ${itemType}:`, error);
    throw error;
  }
};

/**
 * Updates the container configuration for a specific ItemType
 * @param {string} itemType - The type of item (e.g., 'Mission', 'Scenario')
 * @param {Object} config - Configuration data with displayRootNode and containerColor
 * @returns {Promise<Object>} - Updated configuration
 */
export const updateContainerConfig = async (itemType, config) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/config/container-display/${itemType}`, config);
    return response.data;
  } catch (error) {
    console.error(`Error updating container configuration for ${itemType}:`, error);
    throw error;
  }
};

export default {
  fetchRootNode,
  fetchContainerData,
  updateContainerConfig
}; 