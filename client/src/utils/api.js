// API utility functions

// Default API URL
const DEFAULT_API_URL = 'http://localhost:3001/api';

// Function to get API URL with fallbacks
const getApiUrl = () => {
  // Check if we have a stored or environment API URL
  const storedApiUrl = localStorage.getItem('apiUrl');
  const envApiUrl = process.env.REACT_APP_API_URL;
  
  // Return the first available URL with priority
  return envApiUrl || storedApiUrl || DEFAULT_API_URL;
};

// Create a function to generate API endpoints
export const createApiEndpoint = (path) => {
  return `${getApiUrl()}/${path}`;
}; 