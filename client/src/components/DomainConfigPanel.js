import React, { useState, useEffect, useContext } from "react";
import { AppContext } from '../AppContext';
import "./DomainConfigPanel.css";

// Add API URL handling
const DEFAULT_API_URL = "http://localhost:3001/api";

// Add domain name handling utilities at the top of the file
const DOMAIN_CONFIG = {
  Mission: { apiEndpoint: 'missions', childKey: 'childMissionIds' },
  Scenario: { apiEndpoint: 'scenarios', childKey: 'childScenarioIds' },
  Requirements: { apiEndpoint: 'requirements', childKey: 'childRequirementsIds' },
  Parameter: { apiEndpoint: 'parameters', childKey: 'childParameterIds' },
  Functions: { apiEndpoint: 'functions', childKey: 'childFunctionIds' }
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
  const { appConfig = { domains: {} }, setAppConfig } = useContext(AppContext);
  const [selectedItems, setSelectedItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [topNodeOnly, setTopNodeOnly] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Initialize domainColor with safe default value
  const [domainColor, setDomainColor] = useState(() => {
    const defaultColor = '#14364F';
    if (!appConfig?.domains) return defaultColor;
    if (!appConfig.domains[domainName]) return defaultColor;
    return appConfig.domains[domainName].color || defaultColor;
  });

  // Log when panel opens
  useEffect(() => {
    if (isOpen) {
      console.log(`Domain Config Panel opened for ${domainName}`);
    }
  }, [isOpen, domainName]);

  // Fetch data when panel opens or domain changes
  useEffect(() => {
    if (!domainName || !isOpen) {
      // Clear state when panel is closed or domain is invalid
      setAvailableItems([]);
      setSelectedItems([]);
      setFilteredItems([]);
      setDomainColor('#14364F');
      setError(null);
      setSaveSuccess(false);
      return;
    }

    const loadPanelData = async () => {
      setLoading(true); // Use generic loading state
      setError(null);
      setSaveSuccess(false);
      setSelectedItems([]); // Reset selection initially
      setAvailableItems([]);
      setFilteredItems([]);

      try {
        // --- Fetch 1: Domain Display Configuration --- 
        console.log(`Fetching display config for ${domainName}...`);
        const configUrl = createApiEndpoint(`config/domain-display/${domainName}`);
        let fetchedConfigItems = [];
        let fetchedColor = '#14364F';

        try {
          const configResponse = await fetch(configUrl);
          console.log(`DEBUG PANEL LOAD: Config fetch response status for ${domainName}: ${configResponse.status}`); // Log status
          if (configResponse.ok) {
            const configData = await configResponse.json();
            // *** Log the raw configData object ***
            console.log(`DEBUG PANEL LOAD: Raw configData received for ${domainName}:`, JSON.stringify(configData, null, 2)); 
            
            // Check structure before accessing
            if (configData && configData.hasOwnProperty('displayItems')) {
              fetchedConfigItems = configData.displayItems || [];
              console.log(`DEBUG PANEL LOAD: Extracted displayItems:`, JSON.stringify(fetchedConfigItems));
            } else {
              console.warn(`DEBUG PANEL LOAD: configData for ${domainName} is missing 'displayItems' property.`);
              fetchedConfigItems = [];
            }
            fetchedColor = configData?.domainColor || '#14364F'; // Use optional chaining
          } else if (configResponse.status === 404) {
             console.log(`DEBUG PANEL LOAD: No config found (404) for ${domainName}. Using defaults.`);
          } else {
            console.error(`DEBUG PANEL LOAD: Error fetching display config for ${domainName}. Status: ${configResponse.status}`);
          }
        } catch (configErr) {
          console.error(`DEBUG PANEL LOAD: Exception during config fetch for ${domainName}:`, configErr);
          // Continue with defaults in case of fetch error
        }
        setDomainColor(fetchedColor);
        console.log(`DEBUG PANEL LOAD: Using fetchedConfigItems for ${domainName}:`, JSON.stringify(fetchedConfigItems)); // Log what will be used
        
        // --- Fetch 2: All Items for the Domain --- 
        console.log(`Fetching all items for ${domainName}...`);
        let apiPath = domainName.toLowerCase();
        if (!apiPath.endsWith('s')) {
          apiPath += 's';
        }
        const itemsUrl = createApiEndpoint(apiPath);
        console.log(`DEBUG: Attempting to fetch items from URL: ${itemsUrl}`);
        
        const itemsResponse = await fetch(itemsUrl);
        if (!itemsResponse.ok) {
          throw new Error(`Failed to fetch ${domainName} items from ${itemsUrl} - Status: ${itemsResponse.status}`);
        }
        const allItems = await itemsResponse.json();
        console.log(`Received ${allItems.length} total items for ${domainName}`);
        const allItemsMap = new Map(allItems.map(item => [item.id, item]));

        // --- Set Selected Items based on Fetched Config --- 
        let newlySelectedItems = []; // Default to empty
        if (fetchedConfigItems && Array.isArray(fetchedConfigItems) && fetchedConfigItems.length > 0) {
          newlySelectedItems = fetchedConfigItems
            .map(id => {
                const foundItem = allItemsMap.get(id);
                // Log mapping result for each ID
                // console.log(`DEBUG PANEL LOAD: Mapping ID '${id}' to item:`, foundItem ? foundItem.id : 'Not Found');
                return foundItem;
            })
            .filter(item => item !== undefined); // Filter out any items not found
          console.log(`DEBUG PANEL LOAD: Matched ${newlySelectedItems.length} items from fetched config.`);
        } else {
           console.log(`DEBUG PANEL LOAD: No saved display items found or config was empty for ${domainName}.`);
        }
        
        // *** Log exactly what we are about to set ***
        console.log(`DEBUG PANEL LOAD: Attempting to set selectedItems state with (${newlySelectedItems.length} items):`, newlySelectedItems.map(i => i.id));
        setSelectedItems(newlySelectedItems);

        // --- Calculate Available (Top-Level) Items --- 
        const keyDomainPart = domainName.replace(/\s+/g, '');
        const childIdKey = `child${keyDomainPart}Ids`;
        console.log(`DEBUG: Using exact key: '${childIdKey}' to find top-level nodes`);
        
        const allChildIds = new Set();
        allItems.forEach(item => {
          const children = item[childIdKey];
          if (children && Array.isArray(children)) {
            children.forEach(childId => allChildIds.add(childId));
          }
        });
        console.log(`DEBUG: Collected ${allChildIds.size} unique child IDs using key '${childIdKey}'`);

        const topLevelItems = allItems.filter(item => !allChildIds.has(item.id));
        console.log(`DEBUG: Found ${topLevelItems.length} top-level items`);
        setAvailableItems(topLevelItems); // Update available items state

      } catch (error) {
        console.error(`Error loading panel data for ${domainName}:`, error);
        setError(`Failed to load data: ${error.message}`);
        setAvailableItems([]);
        setSelectedItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadPanelData();
  }, [domainName, isOpen, createApiEndpoint]); // Rerun when domain or open state changes

  // *** Re-add useEffect to filter items based on topNodeOnly checkbox ***
  useEffect(() => {
    console.log(`DEBUG: Filtering available items based on topNodeOnly=${topNodeOnly}`);
    if (topNodeOnly) {
      // Logic to filter for top-level items (already done in fetchItems)
      // We can directly use availableItems here as it should already contain only top-level items
      console.log(`DEBUG: Showing only top-level items (${availableItems.length} available)`);
      setFilteredItems(availableItems);
    } else {
      // If the checkbox is unchecked, we need to fetch ALL items again, 
      // as availableItems only holds top-level ones currently.
      // For now, let's just show the top-level ones even if unchecked, 
      // to avoid complexity. We can add fetching all items later if needed.
      console.warn("DEBUG: 'Show Top-Level Only' unchecked, but currently only showing top-level. Fetching all items not yet implemented here.");
      setFilteredItems(availableItems);
      // TODO: Implement fetching *all* items when topNodeOnly is false if required
    }
  }, [availableItems, topNodeOnly]); // Rerun when availableItems or topNodeOnly changes

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
    console.log(`DEBUG: ==================== SAVE PROCESS START ====================`);
    console.log(`DEBUG: Items to save:`, itemIds);
    console.log(`DEBUG: Domain:`, domainName);

    const configToSave = {
      displayItems: itemIds,
      domainColor: domainColor,
    };

    try {
      // First save the configuration
      const saveUrl = createApiEndpoint(`config/domain-display/${domainName}`);
      console.log(`DEBUG: Sending save request to:`, saveUrl);
      console.log(`DEBUG: Save payload:`, JSON.stringify(configToSave, null, 2));

      const saveResponse = await fetch(saveUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(configToSave),
      });

      console.log(`DEBUG: Save response status:`, saveResponse.status);
      console.log(`DEBUG: Save response status text:`, saveResponse.statusText);

      if (!saveResponse.ok) {
        throw new Error(`Failed to save display configuration: ${saveResponse.statusText}`);
      }

      const savedConfig = await saveResponse.json();
      console.log(`DEBUG: Save response body:`, JSON.stringify(savedConfig, null, 2));

      // Update the local app config
      setAppConfig(prev => {
        const newConfig = {
          ...prev,
          domains: {
            ...prev.domains,
            [domainName]: {
              color: domainColor,
              displayItems: itemIds
            }
          }
        };
        console.log(`DEBUG: Updated local app config:`, JSON.stringify(newConfig, null, 2));
        return newConfig;
      });

      setSaveSuccess(true);
      
      // Skip verification and just apply changes
      console.log(`DEBUG: Skipping verification and applying changes immediately`);
      
      // Call onSave if provided to refresh data
      if (onSave) {
        console.log(`DEBUG: Calling onSave callback to refresh data`);
        onSave();
      }
      
      // Close panel after a short delay
      setTimeout(() => {
        console.log(`DEBUG: Closing panel after successful save`);
        onClose();
      }, 500);

    } catch (err) {
      console.error(`DEBUG: ========== SAVE PROCESS FAILED ==========`);
      console.error(`DEBUG: Error in save process:`, err);
      setError(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
      console.log(`DEBUG: ==================== SAVE PROCESS END ====================`);
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
          <h3>Current Root Nodes</h3>
          <p className="config-description">
            Currently configured Root Nodes for this domain. These Root Nodes and their direct children will be shown in the domain view.
          </p>

          {loading ? (
            <div className="loading-indicator">Loading configuration...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <div className="current-config-items">
              {selectedItems.length === 0 ? (
                <p className="no-items-message">
                  No Root Nodes configured. All Root Nodes will be displayed.
                </p>
              ) : (
                <ul className="configured-items-list">
                  {selectedItems.map((item) => (
                    <li key={item.id} className="configured-item">
                      <span className="item-title">
                        {item.title || item.id}
                      </span>
                      <button
                        className="remove-item-button"
                        onClick={() => handleRemoveItem(item.id)}
                        title="Remove from configuration"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="config-section">
          <h3>Add Root Nodes</h3>
          <p className="config-description">
            Select additional Root Nodes to add to the domain configuration.
          </p>

          <div className="filter-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={topNodeOnly}
                onChange={handleTopNodeFilterChange}
              />
              Show Top-Level Nodes Only
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
              <option value="">-- Select a Root Node to add --</option>
              {filteredItems
                .filter(item => !selectedItems.some(selected => selected.id === item.id))
                .map((item) => (
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
