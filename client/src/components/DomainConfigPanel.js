import React, { useState, useEffect } from 'react';
import './DomainConfigPanel.css';

// Add API URL handling
const DEFAULT_API_URL = 'http://localhost:3001/api';

// Function to get API URL with fallbacks
const getApiUrl = () => {
  const storedApiUrl = localStorage.getItem('apiUrl');
  const envApiUrl = process.env.REACT_APP_API_URL;
  return envApiUrl || storedApiUrl || DEFAULT_API_URL;
};

// Create API endpoint helper
const createApiEndpoint = (path) => {
  return `${getApiUrl()}/${path}`;
};

const DomainConfigPanel = ({ isOpen, onClose, domainName }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState('');

  // Fetch available items for the domain when the panel opens
  useEffect(() => {
    const fetchItems = async () => {
      if (!isOpen || !domainName) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Use a lowercase version of domain name for API routes (consistent with backend)
        let apiDomain = domainName.toLowerCase();
        
        // Handle pluralization for API endpoints
        if (domainName === 'Requirements') {
          apiDomain = 'requirements';
        } else if (domainName === 'Functions') {
          apiDomain = 'functions';
        } else if (!apiDomain.endsWith('s')) {
          apiDomain = apiDomain + 's';
        }
        
        // Fetch all items for this domain
        const response = await fetch(createApiEndpoint(apiDomain));
        
        if (!response.ok) {
          throw new Error(`Error fetching ${domainName} items: ${response.statusText}`);
        }
        
        const data = await response.json();
        setAvailableItems(data);
        
        // Also fetch currently selected items for display
        const configResponse = await fetch(createApiEndpoint(`config/domain-display/${domainName}`));
        
        if (configResponse.ok) {
          const configData = await configResponse.json();
          
          // If we have display items, load their full details by matching IDs
          if (configData.displayItems && configData.displayItems.length > 0) {
            const selectedDisplayItems = data.filter(item => 
              configData.displayItems.includes(item.id)
            );
            setSelectedItems(selectedDisplayItems);
          }
        }
      } catch (err) {
        console.error(`Error loading ${domainName} items:`, err);
        setError(`Could not load ${domainName} items. ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchItems();
  }, [isOpen, domainName]);
  
  // Handle adding an item to selected items
  const handleAddItem = () => {
    if (!selectedItemId) return;
    
    const itemToAdd = availableItems.find(item => item.id === selectedItemId);
    if (!itemToAdd) return;
    
    // Only add if not already in the list
    if (!selectedItems.some(item => item.id === selectedItemId)) {
      setSelectedItems([...selectedItems, itemToAdd]);
    }
    
    setSelectedItemId('');
  };
  
  // Handle removing an item from selected items
  const handleRemoveItem = (itemId) => {
    setSelectedItems(selectedItems.filter(item => item.id !== itemId));
  };
  
  // Save display configuration
  const handleSaveConfig = async () => {
    try {
      const response = await fetch(createApiEndpoint(`config/domain-display/${domainName}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayItems: selectedItems.map(item => item.id)
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save display configuration: ${response.statusText}`);
      }
      
      // Close panel on success
      onClose();
    } catch (err) {
      console.error('Error saving display configuration:', err);
      setError(`Failed to save: ${err.message}`);
    }
  };

  return (
    <div className={`domain-config-panel ${isOpen ? 'open' : ''}`}>
      <div className="panel-header">
        <h2>Domain Configuration</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="panel-content">
        <div className="config-section">
          <h3>Domain Title</h3>
          <input 
            type="text" 
            value={domainName} 
            placeholder="Domain Name"
            className="domain-title-input"
            readOnly
          />
        </div>
        
        <div className="config-section">
          <h3>Display Items</h3>
          <p className="config-description">
            Select specific items to display in this domain container. Only these items and their 
            direct children will be shown in the domain view.
          </p>
          
          {loading ? (
            <div className="loading-indicator">Loading items...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <>
              <div className="item-selector">
                <select 
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="item-select"
                >
                  <option value="">-- Select an item to display --</option>
                  {availableItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.title || item.id}
                    </option>
                  ))}
                </select>
                <button 
                  className="add-item-button"
                  onClick={handleAddItem}
                  disabled={!selectedItemId}
                >
                  Add
                </button>
              </div>
              
              <div className="selected-items-list">
                <h4>Selected Display Items:</h4>
                {selectedItems.length === 0 ? (
                  <p className="no-items-message">No items selected. All items will be displayed.</p>
                ) : (
                  <ul>
                    {selectedItems.map(item => (
                      <li key={item.id} className="selected-item">
                        <span className="item-title">{item.title || item.id}</span>
                        <button 
                          className="remove-item-button"
                          onClick={() => handleRemoveItem(item.id)}
                          title="Remove from display"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
        
        <div className="config-section">
          <h3>Visual Settings</h3>
          <div className="color-picker">
            <label>
              Color:
              <input 
                type="color" 
                defaultValue="#14364F"
                // Future implementation: update domain color
              />
            </label>
          </div>
        </div>
        
        <div className="config-actions">
          <button className="action-button cancel" onClick={onClose}>Cancel</button>
          <button 
            className="action-button save"
            onClick={handleSaveConfig}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default DomainConfigPanel; 