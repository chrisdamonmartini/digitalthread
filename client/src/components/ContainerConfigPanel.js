import React, { useState, useEffect, useContext } from "react";
import { AppContext } from '../AppContext';
import "./ContainerConfigPanel.css";
import { fetchRootNode, updateContainerConfig } from '../api';

// Add ItemType config handling utilities
const ITEM_TYPE_CONFIG = {
  Mission: { apiEndpoint: 'missions', childKey: 'childMissionId' },
  Scenario: { apiEndpoint: 'scenarios', childKey: 'childScenarioId' },
  Requirements: { apiEndpoint: 'requirements', childKey: 'childRequirementsId' },
  Parameter: { apiEndpoint: 'parameters', childKey: 'childParameterId' },
  Functions: { apiEndpoint: 'functions', childKey: 'childFunctionId' }
};

// Helper function to get API endpoint for an ItemType
const getItemTypeApiEndpoint = (itemType) => {
  return ITEM_TYPE_CONFIG[itemType]?.apiEndpoint || itemType.toLowerCase() + 's';
};

// Helper function to get child ID key for an ItemType
const getChildIdKey = (itemType) => {
  return ITEM_TYPE_CONFIG[itemType]?.childKey || `child${itemType}Id`;
};

const ContainerConfigPanel = ({ isOpen, onClose, itemType, onSave }) => {
  const { appConfig = { itemType: {} }, setAppConfig } = useContext(AppContext);
  const [selectedItem, setSelectedItem] = useState([]);
  const [availableItem, setAvailableItem] = useState([]);
  const [filteredItem, setFilteredItem] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [topNodeOnly, setTopNodeOnly] = useState(true);

  // Initialize containerColor with safe default value
  const [containerColor, setContainerColor] = useState(() => {
    const defaultColor = '#14364F';
    if (!appConfig?.itemType) return defaultColor;
    if (!appConfig.itemType[itemType]) return defaultColor;
    return appConfig.itemType[itemType].color || defaultColor;
  });

  // Log when panel opens
  useEffect(() => {
    if (isOpen) {
      console.log(`Container Config Panel opened for ${itemType}`);
    }
  }, [isOpen, itemType]);

  // Fetch data when panel opens or ItemType changes
  useEffect(() => {
    if (!itemType || !isOpen) {
      // Clear state when panel is closed or ItemType is invalid
      setAvailableItem([]);
      setSelectedItem([]);
      setFilteredItem([]);
      setContainerColor('#14364F');
      setError(null);
      setSaveSuccess(false);
      return;
    }

    const loadPanelData = async () => {
      setLoading(true);
      setError(null);
      setSaveSuccess(false);
      setSelectedItem([]);
      setAvailableItem([]);
      setFilteredItem([]);

      try {
        // --- Fetch 1: Container Display Configuration --- 
        console.log(`Fetching display config for ${itemType}...`);
        let fetchedRootNode = [];
        let fetchedColor = '#14364F';

        try {
          const configResponse = await fetch(`/api/config/container-display/${itemType}`);
          if (configResponse.ok) {
            const configData = await configResponse.json();
            fetchedRootNode = configData.displayRootNode || [];
            fetchedColor = configData.containerColor || '#14364F';
          }
        } catch (configErr) {
          console.error(`Exception during config fetch for ${itemType}:`, configErr);
        }
        
        setContainerColor(fetchedColor);
        
        // --- Fetch 2: All Items for the ItemType --- 
        console.log(`Fetching all items for ${itemType}...`);
        
        const allItem = await fetchRootNode(itemType);
        console.log(`Received ${allItem.length} total items for ${itemType}`);
        const allItemMap = new Map(allItem.map(item => [item.id, item]));

        // --- Set Selected Items based on Fetched Config --- 
        let newlySelectedItem = [];
        if (fetchedRootNode && Array.isArray(fetchedRootNode) && fetchedRootNode.length > 0) {
          newlySelectedItem = fetchedRootNode
            .map(id => allItemMap.get(id))
            .filter(item => item !== undefined);
        }
        
        setSelectedItem(newlySelectedItem);

        // --- Calculate Available (Top-Level) Items --- 
        const childIdKey = getChildIdKey(itemType);
        
        const allChildId = new Set();
        allItem.forEach(item => {
          const children = item[childIdKey];
          if (children && Array.isArray(children)) {
            children.forEach(childId => allChildId.add(childId));
          }
        });

        const topLevelItem = allItem.filter(item => !allChildId.has(item.id));
        setAvailableItem(topLevelItem);

      } catch (error) {
        console.error(`Error loading panel data for ${itemType}:`, error);
        setError(`Failed to load data: ${error.message}`);
        setAvailableItem([]);
        setSelectedItem([]);
      } finally {
        setLoading(false);
      }
    };

    loadPanelData();
  }, [itemType, isOpen]);

  // Filter items based on topNodeOnly checkbox
  useEffect(() => {
    if (topNodeOnly) {
      setFilteredItem(availableItem);
    } else {
      setFilteredItem(availableItem);
      // TODO: Implement fetching *all* items when topNodeOnly is false if required
    }
  }, [availableItem, topNodeOnly]);

  // Handle adding an item to selected items
  const handleAddItem = () => {
    if (!selectedItemId) {
      return;
    }

    const itemToAdd = availableItem.find((item) => item.id === selectedItemId);
    
    if (!itemToAdd) {
      return;
    }

    // Only add if not already in the list
    if (!selectedItem.some((item) => item.id === selectedItemId)) {
      const newSelectedItem = [...selectedItem, itemToAdd];
      setSelectedItem(newSelectedItem);
    }

    setSelectedItemId("");
  };

  // Handle removing an item from selected items
  const handleRemoveItem = (itemId) => {
    setSelectedItem(selectedItem.filter((item) => item.id !== itemId));
  };

  // Handle color change
  const handleColorChange = (e) => {
    setContainerColor(e.target.value);
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

    const itemId = selectedItem.map((item) => item.id);

    const configToSave = {
      displayRootNode: itemId,
      containerColor: containerColor,
    };

    try {
      // Save the configuration
      const savedConfig = await updateContainerConfig(itemType, configToSave);

      // Update the local app config
      setAppConfig(prev => {
        const newConfig = {
          ...prev,
          itemType: {
            ...prev.itemType,
            [itemType]: {
              color: containerColor,
              displayRootNode: itemId
            }
          }
        };
        return newConfig;
      });

      setSaveSuccess(true);
      
      // Call onSave if provided to refresh data
      if (onSave) {
        onSave();
      }
      
      // Close panel after a short delay
      setTimeout(() => {
        onClose();
      }, 500);

    } catch (err) {
      setError(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`container-config-panel ${isOpen ? "open" : ""}`}>
      <div className="panel-header">
        <h2>Container Configuration</h2>
        <button className="close-button" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="panel-content">
        <div className="config-section">
          <h3>ItemType</h3>
          <input
            type="text"
            value={itemType}
            placeholder="ItemType"
            className="itemtype-input"
            readOnly
          />
        </div>

        <div className="config-section">
          <h3>Current Root Node</h3>
          <p className="config-description">
            Currently configured Root Node for this container. These Root Node and their direct child will be shown in the container view.
          </p>

          {loading ? (
            <div className="loading-indicator">Loading configuration...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <div className="current-config-items">
              {selectedItem.length === 0 ? (
                <p className="no-items-message">
                  No Root Node configured. All Root Node will be displayed.
                </p>
              ) : (
                <ul className="configured-items-list">
                  {selectedItem.map((item) => (
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
          <h3>Add Root Node</h3>
          <p className="config-description">
            Select additional Root Node to add to the container configuration.
          </p>

          <div className="filter-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={topNodeOnly}
                onChange={handleTopNodeFilterChange}
              />
              Show Top-Level Node Only
            </label>
          </div>

          <div className="item-selector">
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="item-select"
            >
              <option value="">-- Select a Root Node to add --</option>
              {filteredItem
                .filter(item => !selectedItem.some(selected => selected.id === item.id))
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
                value={containerColor}
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

export default ContainerConfigPanel; 