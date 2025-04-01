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

        // Add detailed logging for the fetched items
        if (domainName === "Requirement" && data.length > 0) {
          console.log("DEBUG: Fetched Requirement items (first 5):", JSON.stringify(data.slice(0, 5), null, 2));
          const itemsWithChildIds = data.filter(item => item.childRequirementsIds && Array.isArray(item.childRequirementsIds));
          console.log(`DEBUG: Found ${itemsWithChildIds.length} Requirement items with 'childRequirementsIds' property.`);
          if (itemsWithChildIds.length > 0) {
            console.log("DEBUG: First item with childRequirementsIds:", JSON.stringify(itemsWithChildIds[0], null, 2));
          }
        }

        // Fetch domain-specific display config
        console.log(`Fetching display configuration for domain: ${domainName}`);
        const configResponse = await fetch(
          createApiEndpoint(`config/domain-display/${domainName}`)
        );
        if (configResponse.ok) {
          const configData = await configResponse.json();
          console.log(`Received display config:`, configData);
          if (configData.domainColor) {
            setDomainColor(configData.domainColor);
          }
          if (configData.displayItems && configData.displayItems.length > 0) {
            // Match fetched config IDs with full item data
            const selectedDisplayItems = data.filter((item) =>
              configData.displayItems.includes(item.id)
            );
            setSelectedItems(selectedDisplayItems);
          } else {
            setSelectedItems([]); // No items specified in config
          }
        } else {
          console.log(`No display configuration found for ${domainName}, using defaults`);
          setSelectedItems([]); // Default to empty if fetch fails or no config exists
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
      const childIdKey = `child${domainName}Ids`;
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
        if (onSave) {
          onSave(); // Call the refresh function passed from App.js
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
