import React, { createContext, useState, useEffect } from 'react';

// Create the context
export const AppContext = createContext();

// Create the provider component
export const AppContextProvider = ({ children }) => {
  const [appConfig, setAppConfig] = useState({
    itemTypes: ['Requirement', 'Parameter', 'Functions'],
    allowOnlyAdjacentConnections: true,
    domainConfiguration: {
      Requirement: { color: '#e63946', displayName: 'Requirements' },
      Parameter: { color: '#457b9d', displayName: 'Parameters' },
      Functions: { color: '#2a9d8f', displayName: 'Functions' }
    }
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Function to fetch app configuration from the server
  const fetchAppConfig = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/config/app');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch app configuration: ${response.statusText}`);
      }
      
      const config = await response.json();
      setAppConfig(prevConfig => ({
        ...prevConfig,
        ...config
      }));
    } catch (err) {
      console.error('Error fetching app configuration:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh app data - called after updates
  const refreshAppData = () => {
    fetchAppConfig();
  };

  // Initial load of app configuration
  useEffect(() => {
    fetchAppConfig();
  }, []);

  // The context value that will be provided
  const contextValue = {
    appConfig,
    setAppConfig,
    isLoading,
    error,
    refreshAppData
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}; 