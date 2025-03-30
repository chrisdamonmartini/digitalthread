import React, { useState, useEffect } from "react";
import "./DomainConfigPanel.css";

// Add API URL handling
const DEFAULT_API_URL = "http://localhost:3001/api";

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

const DomainConfigPanel = ({ isOpen, onClose, domainName }) => {
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
        // Use a lowercase version of domain name for API routes (consistent with backend)
        let apiDomain = domainName.toLowerCase();

        // Handle pluralization for API endpoints
        if (domainName === "Mission") {
          apiDomain = "missions";
        } else if (domainName === "Scenario") {
          apiDomain = "scenarios";
        } else if (domainName === "Parameter") {
          apiDomain = "parameters";
        } else if (domainName === "Requirement") {
          apiDomain = "requirements";
        } else if (domainName === "Function") {
          apiDomain = "functions";
        } else if (!apiDomain.endsWith("s")) {
          apiDomain = apiDomain + "s";
        }

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
        setAvailableItems(data);

        // Fetch currently selected items and visual configs for display
        console.log(`Fetching display configuration for domain: ${domainName}`);
        const configResponse = await fetch(
          createApiEndpoint(`config/domain-display/${domainName}`),
        );

        if (configResponse.ok) {
          const configData = await configResponse.json();
          console.log(`Received display config:`, configData);

          // Set domain color if available
          if (configData.domainColor) {
            setDomainColor(configData.domainColor);
          }

          // If we have display items, load their full details by matching IDs
          if (configData.displayItems && configData.displayItems.length > 0) {
            console.log(
              `Found ${configData.displayItems.length} selected items in config`,
            );
            const selectedDisplayItems = data.filter((item) =>
              configData.displayItems.includes(item.id),
            );
            console.log(
              `Matched ${selectedDisplayItems.length} items from available items`,
            );
            setSelectedItems(selectedDisplayItems);
          } else {
            console.log("No selected items found in config");
            setSelectedItems([]);
          }
        } else {
          console.log(
            `No display configuration found for ${domainName}, using defaults`,
          );
          setSelectedItems([]);
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
      // Identify top-level nodes by checking if they have no parent
      // First, collect all child IDs from all items
      const childIds = new Set();
      
      // Check each possible property name based on domain type
      const childIdProps = [
        `child${domainName}Ids`,        // Exact match (e.g., childMissionIds)
        `child${domainName.toLowerCase()}Ids`,  // Lowercase (e.g., childmissionIds)
        'childIds'                      // Generic fallback
      ];
      
      // Debug log to check for Fault Detection function
      console.log("Checking for Fault Detection function in items:");
      const faultFn = availableItems.find(item => 
        item.title && item.title.includes("Fault Detection")
      );
      if (faultFn) {
        console.log("Found Fault Detection function:", faultFn);
        // Check which childIds property it has
        childIdProps.forEach(prop => {
          if (faultFn[prop]) {
            console.log(`Function has ${prop}:`, faultFn[prop]);
          }
        });
      } else {
        console.log("No Fault Detection function found in available items");
      }
      
      // Collect all child IDs from all items using all possible property names
      availableItems.forEach(item => {
        for (const prop of childIdProps) {
          if (item[prop] && Array.isArray(item[prop])) {
            item[prop].forEach(id => childIds.add(id));
          }
        }
      });
      
      // Debug log for child IDs
      console.log(`Collected ${childIds.size} child IDs`);
      
      // Filter out items that are found in any childIds array
      const topLevelItems = availableItems.filter(item => !childIds.has(item.id));
      
      // Check if the Fault function made it through filtering
      if (faultFn) {
        const isFaultInTopLevel = topLevelItems.some(item => item.id === faultFn.id);
        console.log(`Is Fault Detection function in top level items? ${isFaultInTopLevel}`);
        if (!isFaultInTopLevel) {
          console.log(`Fault Detection function (${faultFn.id}) was excluded because it's a child of another item`);
        }
      }
      
      console.log(`Filtered from ${availableItems.length} to ${topLevelItems.length} top-level items using parent-child relationship check`);
      setFilteredItems(topLevelItems);
    } else {
      // Show all items
      setFilteredItems(availableItems);
    }
  }, [availableItems, topNodeOnly, domainName]);

  // Handle adding an item to selected items
  const handleAddItem = () => {
    if (!selectedItemId) return;

    const itemToAdd = availableItems.find((item) => item.id === selectedItemId);
    if (!itemToAdd) return;

    console.log(`Adding item to selected items:`, itemToAdd);

    // Only add if not already in the list
    if (!selectedItems.some((item) => item.id === selectedItemId)) {
      setSelectedItems([...selectedItems, itemToAdd]);
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

    const configToSave = {
      displayItems: selectedItems.map((item) => item.id),
      domainColor: domainColor,
    };

    console.log(`Saving config for ${domainName}:`, configToSave);

    try {
      const response = await fetch(
        createApiEndpoint(`config/domain-display/${domainName}`),
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

      // Show success message briefly before closing
      setSaveSuccess(true);
      setTimeout(() => {
        onClose(); // Close panel after success
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
                  onChange={(e) => setSelectedItemId(e.target.value)}
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

              <div className="selected-items-list">
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
