import React, { useState, useEffect } from "react";
import "./DomainConfigPanel.css";

// Add API URL handling
const DEFAULT_API_URL = "http://localhost:3001/api";

// Add domain name handling utilities at the top of the file
const DOMAIN_CONFIG = {
  Mission: { apiEndpoint: 'missions', childKey: 'childMissionIds' },
  Scenario: { apiEndpoint: 'scenarios', childKey: 'childScenarioIds' },
  Requirements: { apiEndpoint: 'requirements', childKey: 'childRequirementsIds' },
  Parameter: { apiEndpoint: 'parameters', childKey: 'childParamIds' },
  Functions: { apiEndpoint: 'functions', childKey: 'childFuncIds' }
};

// Helper function to get API endpoint for a domain
const getDomainApiEndpoint = (domainName) => {
  return DOMAIN_CONFIG[domainName]?.apiEndpoint || domainName.toLowerCase() + 's';
};

// Helper function to get child ID key for a domain
const getChildIdKey = (domainName) => {
  return DOMAIN_CONFIG[domainName]?.childKey || `child${domainName}Ids`;
};

// Function to get API URL with fallbacks
const getApiUrl = () => {
  const storedApiUrl = localStorage.getItem("apiUrl");
  const envApiUrl = process.env.REACT_APP_API_URL;
  return envApiUrl || storedApiUrl || DEFAULT_API_URL;
};

// Create API endpoint helper
const createApiEndpoint = (path) => {
  return `${getApiUrl()}/${path}`;
};

const DomainConfigPanel = ({ isOpen, onClose, domainName, onSave }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [domainColor, setDomainColor] = useState("#14364F");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [topNodeOnly, setTopNodeOnly] = useState(true);

  // Log when panel opens
  useEffect(() => {
    if (isOpen) {
      console.log(`Domain Config Panel opened for ${domainName}`);
    }
  }, [isOpen, domainName]);

  // Fetch available items and configurations for the domain when the panel opens
  useEffect(() => {
    const fetchItems = async () => {
      if (!isOpen || !domainName) return;

      setLoading(true);
      setError(null);
      setSaveSuccess(false);

      try {
        const apiDomain = getDomainApiEndpoint(domainName);
        console.log(
          `Fetching all available items for domain: ${domainName} using API endpoint: ${apiDomain}`,
        );

        // Fetch all items for this domain
        const response = await fetch(createApiEndpoint(apiDomain));

        if (!response.ok) {
          throw new Error(
            `Error fetching ${domainName} items: ${response.statusText}`,
          );
        }

        const data = await response.json();
        console.log(`Received ${data.length} items for ${domainName}`);
        
        // DETAILED INSPECTION: Log the first item's properties to find the child relationship key
        if (data.length > 0) {
          console.log(`DEBUG: First item properties:`, Object.keys(data[0]));
          console.log(`DEBUG: First item full data:`, data[0]);
          
          // Look for any property that might contain child IDs
          const childProperties = Object.keys(data[0]).filter(key => 
            key.toLowerCase().includes('child') || 
            key.toLowerCase().includes('req') || 
            key.toLowerCase().includes('id') ||
            (data[0][key] && Array.isArray(data[0][key]))
          );
          
          console.log(`DEBUG: Potential child ID properties:`, childProperties);
        }
        
        setAvailableItems(data);

        // Add detailed logging for the fetched items
        const childIdKey = getChildIdKey(domainName);
        if (data.length > 0) {
          console.log(`DEBUG: Fetched ${domainName} items (first 5):`, JSON.stringify(data.slice(0, 5), null, 2));
          const itemsWithChildIds = data.filter(item => item[childIdKey] && Array.isArray(item[childIdKey]));
          console.log(`DEBUG: Found ${itemsWithChildIds.length} items with '${childIdKey}' property.`);
          if (itemsWithChildIds.length > 0) {
            console.log(`DEBUG: First item with ${childIdKey}:`, JSON.stringify(itemsWithChildIds[0], null, 2));
          }
        }

        // Fetch domain-specific display config
        console.log(`Fetching display configuration for domain: ${domainName}`);
        const configResponse = await fetch(
          createApiEndpoint(`config/domain-display/${domainName}`)
        );

        // Reset selected items by default
        setSelectedItems([]);
        
        if (configResponse.ok) {
          const configData = await configResponse.json();
          console.log(`Received display config:`, configData);
          
          // Set domain color if it exists
          if (configData.domainColor) {
            setDomainColor(configData.domainColor);
          }
          
          // Handle display items if they exist and are not empty
          if (configData.displayItems && Array.isArray(configData.displayItems) && configData.displayItems.length > 0) {
            console.log(`Found ${configData.displayItems.length} display items in config:`, configData.displayItems);
            
            // Match fetched config IDs with full item data
            const selectedDisplayItems = data.filter((item) =>
              configData.displayItems.includes(item.id)
            );
            
            console.log(`Matched ${selectedDisplayItems.length} items from available items`);
            setSelectedItems(selectedDisplayItems);
          } else {
            console.log(`No display items found in config, keeping empty selection`);
          }
        } else {
          console.log(`No display configuration found for ${domainName}, using defaults`);
          setDomainColor('#00587c'); // Set default color
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

  // Filter items when availableItems or topNodeOnly changes
  useEffect(() => {
    if (topNodeOnly) {
      const childIds = new Set();
      const childIdKey = getChildIdKey(domainName);
      console.log(`DEBUG: Using exact key: '${childIdKey}' to find top-level nodes`);
      
      // Collect all child IDs using ONLY the specific key
      availableItems.forEach(item => {
        if (item[childIdKey] && Array.isArray(item[childIdKey])) {
          item[childIdKey].forEach(id => childIds.add(id));
        }
      });
      
      console.log(`DEBUG: Collected ${childIds.size} child IDs using key '${childIdKey}':`, Array.from(childIds).slice(0, 20));
      
      // Filter out items whose IDs are in the childIds set
      const topLevelItems = availableItems.filter(item => !childIds.has(item.id));
      
      console.log(`DEBUG: Filtered from ${availableItems.length} to ${topLevelItems.length} top-level items.`);
      if (topLevelItems.length > 0) {
          console.log(`DEBUG: Identified top-level items (first 5):`, topLevelItems.slice(0, 5).map(i => ({id: i.id, title: i.title})));
      } else if (availableItems.length > 0) {
          console.warn(`DEBUG: No top-level items identified. Ensure items have the correct '${childIdKey}' property or that not all items are children.`);
      }
      
      setFilteredItems(topLevelItems);
    } else {
      console.log("DEBUG: Showing all available items (Top Node Only filter disabled).");
      setFilteredItems(availableItems);
    }
  }, [availableItems, topNodeOnly, domainName]);

  // Track changes to selectedItems
  useEffect(() => {
    console.log(`DEBUG: selectedItems state changed, now has ${selectedItems.length} items`);
    if (selectedItems.length > 0) {
      console.log(`DEBUG: Current selected items:`, selectedItems.map(item => item.id));
    }
  }, [selectedItems]);

  // Handle adding an item to selected items
  const handleAddItem = () => {
    console.log(`DEBUG: Add button clicked, selectedItemId=${selectedItemId}`);
    
    if (!selectedItemId) {
      console.log(`DEBUG: No item selected to add`);
      return;
    }

    console.log(`DEBUG: Looking for item with id=${selectedItemId} in availableItems`);
    const itemToAdd = availableItems.find((item) => item.id === selectedItemId);
    
    if (!itemToAdd) {
      console.log(`DEBUG: Item with id=${selectedItemId} not found in available items!`);
      return;
    }

    console.log(`DEBUG: Adding item to selected items:`, itemToAdd);

    // Only add if not already in the list
    if (!selectedItems.some((item) => item.id === selectedItemId)) {
      console.log(`DEBUG: Item not already in list, adding it now`);
      const newSelectedItems = [...selectedItems, itemToAdd];
      console.log(`DEBUG: New selected items will have ${newSelectedItems.length} items`);
      setSelectedItems(newSelectedItems);
    } else {
      console.log(`DEBUG: Item already in selected list, not adding again`);
    }

    setSelectedItemId("");
  };

  // Handle removing an item from selected items
  const handleRemoveItem = (itemId) => {
    console.log(`Removing item from selected items: ${itemId}`);
    setSelectedItems(selectedItems.filter((item) => item.id !== itemId));
  };

  // Handle color change
  const handleColorChange = (e) => {
    setDomainColor(e.target.value);
  };

  // Handle top node only filter change
  const handleTopNodeFilterChange = (e) => {
    setTopNodeOnly(e.target.checked);
  };

  // Save display configuration
  const handleSaveConfig = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    const itemIds = selectedItems.map((item) => item.id);
    console.log(`DEBUG: Preparing to save ${itemIds.length} selected items:`, itemIds);
    
    const configToSave = {
      displayItems: itemIds,
      domainColor: domainColor,
    };

    console.log(`Saving config for ${domainName}:`, configToSave);

    try {
      // Log the request details
      const url = createApiEndpoint(`config/domain-display/${domainName}`);
      console.log(`DEBUG: Sending PUT request to: ${url}`);
      console.log(`DEBUG: Request body:`, JSON.stringify(configToSave, null, 2));
      
      const response = await fetch(
        url,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(configToSave),
        },
      );

      console.log(`Save response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(
          `Failed to save display configuration: ${response.statusText}`,
        );
      }

      const responseData = await response.json();
      console.log(`Save response data:`, responseData);

      // Show success message briefly before refreshing
      setSaveSuccess(true);
      
      // Wait for state to update and success message to show
      setTimeout(() => {
        if (onSave) {
          console.log("Refreshing flow data after config change...");
          // Call the refresh function passed from App.js
          onSave();
          
          // Wait for refresh to start before closing panel
          setTimeout(() => {
            console.log("Closing panel after refresh started");
            onClose();
          }, 500);
        } else {
          // If no refresh function, just close panel
          onClose();
        }
      }, 1000);
    } catch (err) {
      console.error("Error saving display configuration:", err);
      setError(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`domain-config-panel ${isOpen ? "open" : ""}`}>
      <div className="panel-header">
        <h2>Domain Configuration</h2>
        <button className="close-button" onClick={onClose}>
          ×
        </button>
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
            Select specific items to display in this domain container. Only
            these items and their direct children will be shown in the domain
            view.
          </p>

          {loading ? (
            <div className="loading-indicator">Loading items...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <>
              <div className="filter-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={topNodeOnly}
                    onChange={handleTopNodeFilterChange}
                  />
                  Top Node Only
                </label>
              </div>

              <div className="item-selector">
                <select
                  value={selectedItemId}
                  onChange={(e) => {
                    console.log(`DEBUG: Dropdown selection changed to: ${e.target.value}`);
                    setSelectedItemId(e.target.value);
                  }}
                  className="item-select"
                >
                  <option value="">-- Select an item to display --</option>
                  {filteredItems.map((item) => (
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

              <div className="selected-items-list" key={`selected-list-${selectedItems.length}`}>
                <h4>Selected Display Items:</h4>
                {selectedItems.length === 0 ? (
                  <p className="no-items-message">
                    No items selected. All items will be displayed.
                  </p>
                ) : (
                  <ul>
                    {selectedItems.map((item) => (
                      <li key={item.id} className="selected-item">
                        <span className="item-title">
                          {item.title || item.id}
                        </span>
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
                value={domainColor}
                onChange={handleColorChange}
              />
            </label>
          </div>
        </div>

        {saveSuccess && (
          <div className="success-message">
            Configuration saved successfully!
          </div>
        )}

        <div className="config-actions">
          <button className="action-button cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="action-button save"
            onClick={handleSaveConfig}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DomainConfigPanel;
