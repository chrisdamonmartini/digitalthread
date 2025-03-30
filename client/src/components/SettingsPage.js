import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import IconPreview from './IconPreview';
import IconSelector from './IconSelector';
import './SettingsPage.css'; // Add CSS import
import ItemStructureTree from './ItemStructureTree'; // <-- Import the new component

// Update API_URL to use the createApiEndpoint function
const DEFAULT_API_URL = 'http://localhost:3001/api';

// Function to get API URL with fallbacks (similar to App.js)
const getApiUrl = () => {
  // Check if we have a stored or environment API URL
  const storedApiUrl = localStorage.getItem('apiUrl');
  const envApiUrl = process.env.REACT_APP_API_URL;
  
  // Return the first available URL with priority
  return envApiUrl || storedApiUrl || DEFAULT_API_URL;
};

// Use a function to create API endpoints to allow for dynamic changes
const createApiEndpoint = (path) => {
  return `${getApiUrl()}/${path}`;
};

// Update the default colors to match the flow page
const DEFAULT_DOMAIN_COLORS = {
  'Mission': '#4285F4',       // Blue
  'Scenario': '#34A853',      // Green
  'Requirements': '#FBBC05',  // Yellow/Gold
  'Parameter': '#EA4335',     // Red
  'Functions': '#8F00FF',     // Purple
  'Logical': '#FF6D01',       // Orange
  'EBOM': '#0097A7',          // Teal
  'Simulation Models': '#757575', // Gray
  'Simulations': '#E91E63',   // Pink
  'Test Cases': '#9E9E9E'     // Light Gray
};

// Update the default icons to match the flow page
const DEFAULT_DOMAIN_ICONS = {
  'Mission': 'mission',
  'Scenario': 'simulation',
  'Requirements': 'requirement',
  'Parameter': 'parameter',
  'Functions': 'function',
  'Logical': 'logical',
  'EBOM': 'typePartComponent48',
  'Simulation Models': 'simulation',
  'Simulations': 'simulation',
  'Test Cases': 'test'
};

// Component for reordering domains
const DomainOrderSettings = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allowAdjacentOnly, setAllowAdjacentOnly] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Fetch current domain configuration
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const response = await fetch(createApiEndpoint('config'));
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Set domains from config
        setDomains(data.domainOrder || []);
        
        // Check if config has adjacency setting
        if (data.hasOwnProperty('allowAdjacentOnly')) {
          setAllowAdjacentOnly(data.allowAdjacentOnly);
        }
        
        setError(null);
      } catch (e) {
        console.error("Error fetching domain config:", e);
        setError("Failed to load domain configuration");
      } finally {
        setLoading(false);
      }
    };
    
    fetchConfig();
  }, []);
  
  // Handle drag end for reordering
  const onDragEnd = (result) => {
    if (!result.destination) return; // Dropped outside list
    
    const newDomains = Array.from(domains);
    const [moved] = newDomains.splice(result.source.index, 1);
    newDomains.splice(result.destination.index, 0, moved);
    
    setDomains(newDomains);
    setSaveSuccess(false); // Reset success message when changes are made
  };
  
  // Save domain order to server
  const saveDomainOrder = async () => {
    try {
      const response = await fetch(createApiEndpoint('config'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domainOrder: domains,
          allowAdjacentOnly: allowAdjacentOnly
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setSaveSuccess(true);
      // Show success message for 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
      
    } catch (e) {
      console.error("Error saving domain order:", e);
      setError("Failed to save domain configuration");
    }
  };
  
  // Move domain up/down with buttons
  const moveDomain = (index, direction) => {
    if (
      (direction === -1 && index === 0) || 
      (direction === 1 && index === domains.length - 1)
    ) {
      return; // Can't move first item up or last item down
    }
    
    const newDomains = Array.from(domains);
    const temp = newDomains[index];
    newDomains[index] = newDomains[index + direction];
    newDomains[index + direction] = temp;
    
    setDomains(newDomains);
    setSaveSuccess(false); // Reset success message when changes are made
  };

  if (loading) return <div>Loading domain configuration...</div>;
  if (error) return <div className="error-message">{error}</div>;
  
  return (
    <div className="domain-order-settings">
      <h3>Domain Order</h3>
      <p>Drag and drop domains to reorder, or use the up/down buttons.</p>
      
      <div className="domain-order-list-container">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="domains" isDropDisabled={false}>
            {(provided) => (
              <ul 
                className="domain-order-list"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {domains.map((domain, index) => (
                  <Draggable key={domain} draggableId={domain} index={index} isDragDisabled={false}>
                    {(provided) => (
                      <li
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="domain-order-item"
                      >
                        <span className="domain-name">{domain}</span>
                        <div className="domain-order-buttons">
                          <button 
                            onClick={() => moveDomain(index, -1)}
                            disabled={index === 0}
                            className="domain-order-button"
                          >
                            ↑
                          </button>
                          <button 
                            onClick={() => moveDomain(index, 1)}
                            disabled={index === domains.length - 1}
                            className="domain-order-button"
                          >
                            ↓
                          </button>
                        </div>
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      </div>
      
      <div className="domain-order-options">
        <label className="option-checkbox">
          <input 
            type="checkbox" 
            checked={allowAdjacentOnly} 
            onChange={(e) => setAllowAdjacentOnly(e.target.checked)}
          />
          Allow connections between adjacent domains only
        </label>
      </div>
      
      <div className="domain-order-actions">
        <button 
          onClick={saveDomainOrder}
          className="primary-button"
        >
          Save Domain Configuration
        </button>
        {saveSuccess && (
          <span className="success-message">Domain configuration saved successfully!</span>
        )}
      </div>
    </div>
  );
};

// Component for item management
const ItemManagementSettings = () => {
  const [selectedDomain, setSelectedDomain] = useState('Mission');
  const [domains, setDomains] = useState([]);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    // Domain-specific fields will be added conditionally
  });
  const [bulkSettings, setBulkSettings] = useState({
    prefix: '',
    count: 5,
    startNumber: 1,
  });
  const [message, setMessage] = useState({ text: '', type: '' });

  // New states for search and structure display
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemStructure, setItemStructure] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [structureLoading, setStructureLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [structureError, setStructureError] = useState(null);

  // Fetch available domains
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const response = await fetch(createApiEndpoint('config'));
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setDomains(data.domainOrder || []);
        
        // Set first domain as default if domains exist and none is selected
        if (data.domainOrder?.length > 0 && !selectedDomain) {
          setSelectedDomain(data.domainOrder[0]);
        }
      } catch (e) {
        console.error("Error fetching domains:", e);
        setMessage({ text: "Failed to load domains", type: 'error' });
      }
    };
    
    fetchDomains();
  }, [selectedDomain]);

  // Generate dynamic form fields based on domain
  const getDomainSpecificFields = () => {
    switch (selectedDomain) {
      case 'Parameter':
        return (
          <>
            <div className="form-group">
              <label>Value Type</label>
              <input 
                type="text" 
                value={formData.valueType || ''} 
                onChange={(e) => setFormData({...formData, valueType: e.target.value})}
                placeholder="e.g., string, number, boolean"
              />
            </div>
            <div className="form-group">
              <label>Unit</label>
              <input 
                type="text" 
                value={formData.unit || ''} 
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                placeholder="e.g., kg, m, s"
              />
            </div>
          </>
        );
      case 'Functions':
        return (
          <div className="form-group">
            <label>Function Type</label>
            <input 
              type="text" 
              value={formData.functionType || ''} 
              onChange={(e) => setFormData({...formData, functionType: e.target.value})}
              placeholder="e.g., process, calculation, control"
            />
          </div>
        );
      default:
        return null;
    }
  };

  // Handle form submission for single item
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const endpoint = createApiEndpoint(`${selectedDomain.toLowerCase()}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Clear form and show success message
      setFormData({
        id: '',
        title: '',
        description: '',
      });
      setMessage({ text: `New ${selectedDomain} created successfully!`, type: 'success' });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      
    } catch (e) {
      console.error(`Error creating ${selectedDomain}:`, e);
      setMessage({ text: `Failed to create ${selectedDomain}`, type: 'error' });
    }
  };

  // Handle bulk generation
  const handleBulkGenerate = async () => {
    try {
      const endpoint = createApiEndpoint(`${selectedDomain.toLowerCase()}/bulk`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bulkSettings),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Show success message with count of created items
      setMessage({ 
        text: `Successfully generated ${data.count || bulkSettings.count} ${selectedDomain} items!`, 
        type: 'success' 
      });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      
    } catch (e) {
      console.error(`Error bulk generating ${selectedDomain}:`, e);
      setMessage({ text: `Failed to generate ${selectedDomain} items`, type: 'error' });
    }
  };

  // Handle search query change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    // Potentially trigger search on type, or add a search button
    // For now, just updates the query state
  };

  // Execute search
  const executeSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    setSelectedItem(null); // Clear selected item on new search
    setItemStructure(null);

    try {
      const response = await fetch(createApiEndpoint(`items/search?q=${encodeURIComponent(searchQuery)}`));
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Catch if response is not JSON
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Error searching items:", error);
      setSearchError(error.message);
      setSearchResults([]); // Clear results on error
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle selecting an item from search results
  const handleSelectItem = async (item) => {
    if (selectedItem?.id === item.id) {
        setSelectedItem(null); // Deselect if clicking the same item
        setItemStructure(null);
        setStructureError(null);
        return;
    }
    
    setSelectedItem(item);
    setItemStructure(null);
    setStructureLoading(true);
    setStructureError(null);
    setSearchResults([]); // Optionally clear search results after selection
    setSearchQuery(''); // Optionally clear search query

    try {
      const response = await fetch(createApiEndpoint(`items/structure/${item.id}`));
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
         if (response.status === 501) { // Handle specific APOC error message
            throw new Error(errorData.error || 'Failed to fetch structure: APOC procedure likely missing or misconfigured on the server.');
        } else {
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
      }
      const structureData = await response.json();
      setItemStructure(structureData);
    } catch (error) {
      console.error("Error fetching item structure:", error);
      setStructureError(error.message);
      setItemStructure(null); // Clear structure on error
      // Keep selectedItem so user knows what failed
    } finally {
      setStructureLoading(false);
    }
  };

  // Handle deleting an item
  const handleDeleteItem = async (itemIdToDelete) => {
    // Confirmation dialog
    if (!window.confirm(`Are you sure you want to delete item ${itemIdToDelete} and all its descendants/relationships? This cannot be undone.`)) {
        return;
    }

    // Find the item's title for message (optional, could also pass from TreeNode)
    // This requires searching the potentially nested structure, might be complex.
    // Simpler approach: use the ID in the message or fetch title separately if needed.
    const itemTitle = selectedItem?.id === itemIdToDelete ? selectedItem.title : itemIdToDelete;

    try {
        const response = await fetch(createApiEndpoint(`items/${itemIdToDelete}`), {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        // Deletion successful
        setMessage({ text: `Item ${itemTitle} deleted successfully.`, type: 'success' });
        
        // Clear the selected item and structure view as it's now invalid
        setSelectedItem(null);
        setItemStructure(null);
        setStructureError(null);
        setStructureLoading(false);
        // Optionally, re-run search if search results were visible, or clear them
        setSearchResults([]);
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);

    } catch (error) {
        console.error(`Error deleting item ${itemIdToDelete}:`, error);
        // Show error specific to deletion
        setStructureError(`Failed to delete item ${itemTitle}: ${error.message}`); // Show error in structure pane
         setMessage({ text: `Failed to delete item ${itemTitle}`, type: 'error' }); // Also show main message
    }
  };

  // Handle renaming an item
  const handleRenameItem = async (itemId, newTitle) => {
    if (!newTitle || newTitle.trim() === '') {
      setMessage({ text: 'Item title cannot be empty', type: 'error' });
      return;
    }

    try {
      const response = await fetch(createApiEndpoint(`items/${itemId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTitle
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Show success message
      setMessage({ text: `Item renamed to "${newTitle}" successfully.`, type: 'success' });
      
      // If we're renaming the currently selected item, update the selectedItem state
      if (selectedItem && selectedItem.id === itemId) {
        setSelectedItem({
          ...selectedItem,
          title: newTitle
        });
      }
      
      // Get the structure again to reflect the updated name
      if (selectedItem) {
        handleSelectItem(selectedItem);
      }
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);

    } catch (error) {
      console.error(`Error renaming item ${itemId}:`, error);
      setMessage({ text: `Failed to rename item: ${error.message}`, type: 'error' });
    }
  };

  return (
    <div className="item-management-settings">
      <h3>Item Management</h3>
      
      <div className="domain-selector">
        <label>Select Domain:</label>
        <select 
          value={selectedDomain} 
          onChange={(e) => setSelectedDomain(e.target.value)}
        >
          {domains.map(domain => (
            <option key={domain} value={domain}>{domain}</option>
          ))}
        </select>
      </div>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <div className="item-management-container">
        <div className="create-single-item">
          <h4>Create Single {selectedDomain}</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>ID</label>
              <input 
                type="text" 
                value={formData.id} 
                onChange={(e) => setFormData({...formData, id: e.target.value})}
                placeholder={`${selectedDomain}-001`}
                required
              />
            </div>
            <div className="form-group">
              <label>Title</label>
              <input 
                type="text" 
                value={formData.title} 
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder={`${selectedDomain} Title`}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Description of the item..."
                rows="3"
              />
            </div>
            
            {getDomainSpecificFields()}
            
            <button type="submit" className="primary-button">
              Create {selectedDomain}
            </button>
          </form>
        </div>
        
        <div className="bulk-generation">
          <h4>Bulk Generate {selectedDomain}s</h4>
          <div className="form-group">
            <label>Prefix</label>
            <input 
              type="text" 
              value={bulkSettings.prefix} 
              onChange={(e) => setBulkSettings({...bulkSettings, prefix: e.target.value})}
              placeholder={`${selectedDomain.toUpperCase()}`}
            />
          </div>
          <div className="form-group">
            <label>Count</label>
            <input 
              type="number" 
              value={bulkSettings.count} 
              onChange={(e) => setBulkSettings({...bulkSettings, count: parseInt(e.target.value) || 0})}
              min="1"
              max="50"
            />
          </div>
          <div className="form-group">
            <label>Start Number</label>
            <input 
              type="number" 
              value={bulkSettings.startNumber} 
              onChange={(e) => setBulkSettings({...bulkSettings, startNumber: parseInt(e.target.value) || 1})}
              min="1"
            />
          </div>
          <button 
            onClick={handleBulkGenerate}
            className="primary-button"
          >
            Generate {bulkSettings.count} {selectedDomain}s
          </button>
        </div>
      </div>

      {/* New Search and Structure Section */}
      <div className="item-search-structure-section">
        <h4>Search and Edit Items</h4>

        {/* Search Input */}
        <div className="search-input-container">
          <label htmlFor="itemSearch">Search Items:</label>
          <input
            type="text"
            id="itemSearch"
            name="itemSearch"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Enter search term..."
          />
          <button onClick={executeSearch} disabled={searchLoading || !searchQuery.trim()}>
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Two-column layout for results and structure */}
        <div className="search-structure-container">
          {/* Search Results */}
          <div className="search-results-container">
            <h5>Search Results</h5>
            {searchError && <div className="error-message">{searchError}</div>}
            {searchLoading && <div className="info-message">Searching...</div>}
            
            {searchResults.length > 0 && (
              <ul>
                {searchResults.map(item => (
                  <li 
                    key={item.id} 
                    onClick={() => handleSelectItem(item)} 
                    className={`search-result-item ${selectedItem?.id === item.id ? 'selected' : ''}`}
                  >
                    <span className={`node-icon ${item.labels?.[0]?.toLowerCase() || 'default'}`}></span>
                    <span className="item-title">{item.title}</span>
                    <span className="item-type">({item.labels?.join(', ') || 'Node'})</span>
                  </li>
                ))}
              </ul>
            )}
            
            {searchResults.length === 0 && !searchLoading && searchQuery && (
              <p>No results found.</p>
            )}
            
            {searchResults.length === 0 && !searchLoading && !searchQuery && (
              <p className="info-message">Enter a search term above to find items.</p>
            )}
          </div>

          {/* Structure Display Pane */}
          <div className="item-structure-pane">
            {structureError && <div className="error-message">{structureError}</div>}
            {structureLoading && <div className="info-message">Loading structure...</div>}
            
            {selectedItem && !structureLoading && !structureError && (
              <>
                <h4>
                  Structure for: {selectedItem.title}
                  <small>{selectedItem.labels?.join(', ')}</small>
                </h4>
                
                {itemStructure && (
                  <ItemStructureTree 
                    itemStructure={itemStructure} 
                    onDelete={handleDeleteItem}
                    onRename={handleRenameItem}
                  />
                )}
                
                {!itemStructure && !structureLoading && !structureError && (
                  <div className="empty-tree-message">
                    This item has no structure data.
                  </div>
                )}
              </>
            )}
            
            {!selectedItem && !structureLoading && (
              <div className="empty-tree-message">
                Select an item from the search results to view its structure.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Component for appearance settings (colors and icons)
const AppearanceSettings = () => {
  const [domains, setDomains] = useState([]);
  const [domainSettings, setDomainSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [customIcons, setCustomIcons] = useState({});

  // Fetch current appearance settings
  useEffect(() => {
    const fetchAppearanceSettings = async () => {
      setLoading(true);
      try {
        // Get domain list
        const configResponse = await fetch(createApiEndpoint('config'));
        if (!configResponse.ok) {
          throw new Error(`HTTP error! status: ${configResponse.status}`);
        }
        const configData = await configResponse.json();
        setDomains(configData.domainOrder || []);
        
        // Get appearance settings
        const appearanceResponse = await fetch(createApiEndpoint('appearance'));
        let appearanceData = {};
        
        if (appearanceResponse.ok) {
          appearanceData = await appearanceResponse.json();
          
          // Extract custom icons if they exist
          const icons = {};
          Object.keys(appearanceData).forEach(domain => {
            if (appearanceData[domain]?.iconType === 'custom' && appearanceData[domain]?.iconData) {
              icons[domain] = appearanceData[domain].iconData;
            }
          });
          setCustomIcons(icons);
        } else if (appearanceResponse.status !== 404) {
          throw new Error(`HTTP error! status: ${appearanceResponse.status}`);
        }
        
        // Initialize settings for each domain
        const settings = {};
        
        configData.domainOrder.forEach((domain) => {
          const domainSettings = appearanceData[domain] || {};
          const iconSetting = domainSettings.iconType === 'custom'
            ? { type: 'custom', url: domainSettings.iconData }
            : { type: 'preset', id: domainSettings.icon || DEFAULT_DOMAIN_ICONS[domain] || 'default' };
          
          settings[domain] = {
            color: domainSettings.color || DEFAULT_DOMAIN_COLORS[domain] || '#cccccc',
            icon: iconSetting
          };
        });
        
        setDomainSettings(settings);
        setError(null);
      } catch (e) {
        console.error("Error fetching appearance settings:", e);
        setError("Failed to load appearance settings");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAppearanceSettings();
  }, []);
  
  // Update color for a domain
  const handleColorChange = (domain, color) => {
    setDomainSettings(prev => ({
      ...prev,
      [domain]: {
        ...prev[domain],
        color
      }
    }));
    setSaveSuccess(false);
  };
  
  // Update icon for a domain
  const handleIconChange = (domain, icon) => {
    setDomainSettings(prev => ({
      ...prev,
      [domain]: {
        ...prev[domain],
        icon
      }
    }));
    setSaveSuccess(false);
  };
  
  // Handle icon upload
  const handleIconUpload = (domain, file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const iconData = e.target.result;
      
      // Update custom icons state
      setCustomIcons(prev => ({
        ...prev,
        [domain]: iconData
      }));
      
      // Update domain settings with the custom icon
      setDomainSettings(prev => ({
        ...prev,
        [domain]: {
          ...prev[domain],
          icon: { type: 'custom', url: iconData }
        }
      }));
      
      setSaveSuccess(false);
    };
    reader.readAsDataURL(file);
  };
  
  // Save appearance settings
  const saveAppearanceSettings = async () => {
    try {
      // Convert the domainSettings structure to the format expected by the API
      const formattedSettings = {};
      
      Object.keys(domainSettings).forEach(domain => {
        const { color, icon } = domainSettings[domain];
        
        formattedSettings[domain] = {
          color,
          iconType: icon.type,
          icon: icon.type === 'preset' ? icon.id : null,
          iconData: icon.type === 'custom' ? icon.url : null
        };
      });
      
      const response = await fetch(createApiEndpoint('appearance'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedSettings),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
    } catch (e) {
      console.error("Error saving appearance settings:", e);
      setError("Failed to save appearance settings");
    }
  };
  
  if (loading) return <div>Loading appearance settings...</div>;
  if (error) return <div className="error-message">{error}</div>;
  
  return (
    <div className="appearance-settings">
      <h3>Domain Appearance</h3>
      <p>Customize the color and icon for each domain. You can select from preset icons or upload your own.</p>
      
      <div className="appearance-domain-list">
        {domains.map(domain => (
          <div key={domain} className="appearance-domain-item">
            <div className="domain-preview" style={{ backgroundColor: domainSettings[domain]?.color || '#ccc' }}>
              <div className="domain-icon-wrapper">
                {domainSettings[domain]?.icon?.type === 'custom' ? (
                  <IconPreview 
                    size={32} 
                    customUrl={domainSettings[domain].icon.url} 
                  />
                ) : (
                  <IconPreview 
                    iconType={domainSettings[domain]?.icon?.id || 'default'} 
                    size={32} 
                  />
                )}
              </div>
              <span>{domain}</span>
            </div>
            
            <div className="appearance-controls">
              <div className="color-control">
                <label htmlFor={`color-${domain}`}>Color:</label>
                <input
                  id={`color-${domain}`}
                  type="color"
                  value={domainSettings[domain]?.color || '#cccccc'}
                  onChange={(e) => handleColorChange(domain, e.target.value)}
                />
              </div>
              
              <div className="icon-control">
                <label htmlFor={`icon-${domain}`}>Icon:</label>
                <IconSelector
                  value={domainSettings[domain]?.icon}
                  onChange={(icon) => handleIconChange(domain, icon)}
                  onUpload={(file) => handleIconUpload(domain, file)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="appearance-actions">
        <button 
          onClick={saveAppearanceSettings}
          className="primary-button"
        >
          Save Appearance Settings
        </button>
        {saveSuccess && (
          <span className="success-message">Appearance settings saved successfully!</span>
        )}
      </div>
    </div>
  );
};

// AI Data Generator Component
const AiDataGenerator = () => {
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [itemCount, setItemCount] = useState(5);
  const [depth, setDepth] = useState(2);
  const [connectToNext, setConnectToNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [programType, setProgramType] = useState('');
  const [customProgramType, setCustomProgramType] = useState('');
  
  // For cross-connections
  const [sourceDomain, setSourceDomain] = useState('');
  const [targetDomain, setTargetDomain] = useState('');
  const [connectionCount, setConnectionCount] = useState(10);
  const [crossConnectSuccess, setCrossConnectSuccess] = useState(false);
  const [crossConnectLoading, setCrossConnectLoading] = useState(false);
  const [crossConnectResults, setCrossConnectResults] = useState(null);
  const [crossConnectError, setCrossConnectError] = useState(null);

  // For preview panel
  const [previewItems, setPreviewItems] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [selectedPreviewItems, setSelectedPreviewItems] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [dragOverItemId, setDragOverItemId] = useState(null);

  // Predefined program types
  const programTypes = [
    'Missile System',
    'Commercial Aircraft',
    'Fighter Aircraft',
    'Electric Vehicle',
    'Satellite',
    'Submarine',
    'Medical Device',
    'Industrial Robot',
    'Autonomous Drone',
    'Custom' // Option for custom entry
  ];

  // Fetch domain configuration
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const response = await fetch(createApiEndpoint('config'));
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Set domains from config
        setDomains(data.domainOrder || []);
        
        // Set initial selected domains
        if (data.domainOrder && data.domainOrder.length > 0) {
          setSelectedDomain(data.domainOrder[0]);
          setSourceDomain(data.domainOrder[0]);
          if (data.domainOrder.length > 1) {
            setTargetDomain(data.domainOrder[1]);
          }
        }
        
        setError(null);
      } catch (e) {
        console.error("Error fetching domain config:", e);
        setError("Failed to load domain configuration");
      }
    };
    
    fetchDomains();
  }, []);

  // Handle form submission for previewing generated data
  const handlePreview = async (e) => {
    e.preventDefault();
    
    // Validate that a program type is selected
    if (!programType) {
      setError("Please select a program type");
      return;
    }
    
    // If custom is selected, validate that a custom type is entered
    if (programType === 'Custom' && !customProgramType.trim()) {
      setError("Please enter a custom program type");
      return;
    }
    
    setPreviewLoading(true);
    setError(null);
    setPreviewItems([]);
    
    try {
      const finalProgramType = programType === 'Custom' ? customProgramType : programType;
      
      const response = await fetch(createApiEndpoint('ai-generator/preview'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: selectedDomain,
          count: parseInt(itemCount),
          depth: parseInt(depth),
          programType: finalProgramType
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.error === 'Database connection error') {
          throw new Error(`Database connection error: ${data.details}. Please make sure Neo4j is running.`);
        } else {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
      }
      
      // Initialize all preview items as selected by default
      const initialSelectedState = {};
      data.previewItems.forEach(item => {
        initialSelectedState[item.id] = true;
      });
      
      setPreviewItems(data.previewItems || []);
      setSelectedPreviewItems(initialSelectedState);
      
    } catch (e) {
      console.error("Error generating preview:", e);
      if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
        setError("Network error: Cannot connect to the server. Please make sure the server is running.");
      } else if (e.message.includes('Database connection error')) {
        setError(e.message);
      } else {
        setError(e.message || "Failed to generate preview");
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle approving selected preview items
  const handleApprove = async () => {
    const selectedItems = previewItems.filter(item => selectedPreviewItems[item.id]);
    
    if (selectedItems.length === 0) {
      setError("No items selected for approval");
      return;
    }
    
    setApproveLoading(true);
    setError(null);
    
    try {
      const finalProgramType = programType === 'Custom' ? customProgramType : programType;
      
      const response = await fetch(createApiEndpoint('ai-generator/approve'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: selectedDomain,
          items: selectedItems,
          connectToNext,
          programType: finalProgramType
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      setResults(data);
      setGenerateSuccess(true);
      setPreviewItems([]); // Clear preview after successful approval
      
      // Show success message for 3 seconds
      setTimeout(() => setGenerateSuccess(false), 3000);
      
    } catch (e) {
      console.error("Error approving items:", e);
      setError(e.message || "Failed to approve items");
    } finally {
      setApproveLoading(false);
    }
  };

  // Toggle selection of a preview item
  const toggleItemSelection = (itemId) => {
    setSelectedPreviewItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Toggle all preview items selection
  const toggleAllItems = (selectAll) => {
    const newSelectedState = {};
    previewItems.forEach(item => {
      newSelectedState[item.id] = selectAll;
    });
    setSelectedPreviewItems(newSelectedState);
  };

  // Handle program type change
  const handleProgramTypeChange = (e) => {
    const value = e.target.value;
    setProgramType(value);
    
    // Reset custom program type if not "Custom"
    if (value !== 'Custom') {
      setCustomProgramType('');
    }
  };

  // Handle form submission for cross-connecting domains
  const handleCrossConnect = async (e) => {
    e.preventDefault();
    setCrossConnectLoading(true);
    setCrossConnectError(null);
    setCrossConnectResults(null);
    
    try {
      const response = await fetch(createApiEndpoint('ai-generator/cross-connect'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceDomain,
          targetDomain,
          connectionCount: parseInt(connectionCount)
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      setCrossConnectResults(data);
      setCrossConnectSuccess(true);
      
      // Show success message for 3 seconds
      setTimeout(() => setCrossConnectSuccess(false), 3000);
      
    } catch (e) {
      console.error("Error creating cross-connections:", e);
      setCrossConnectError(e.message || "Failed to create connections");
    } finally {
      setCrossConnectLoading(false);
    }
  };

  // Handle renaming a preview item
  const handleRenameItem = (itemId, newTitle, newDescription) => {
    setPreviewItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId 
          ? { ...item, title: newTitle, description: newDescription } 
          : item
      )
    );
    setEditingItem(null);
  };

  // Handle deleting a preview item
  const handleDeletePreviewItem = (itemId) => {
    // Get the item to be deleted
    const itemToDelete = previewItems.find(item => item.id === itemId);
    
    if (!itemToDelete) return;
    
    // If this is a parent node, ask for confirmation
    if (previewItems.some(item => item.parentId === itemId)) {
      const confirmDelete = window.confirm(
        "This will delete this item and all its children. Are you sure?"
      );
      
      if (!confirmDelete) return;
    }
    
    // Helper function to find all descendants of an item
    const findAllDescendants = (id) => {
      const directChildren = previewItems.filter(item => item.parentId === id);
      let allDescendants = [...directChildren];
      
      // Recursively find descendants of each child
      directChildren.forEach(child => {
        const childDescendants = findAllDescendants(child.id);
        allDescendants = [...allDescendants, ...childDescendants];
      });
      
      return allDescendants;
    };
    
    // Get all descendants of the item to delete
    const descendants = findAllDescendants(itemId);
    const allIdsToDelete = [itemId, ...descendants.map(item => item.id)];
    
    // Remove the item and all its descendants
    setPreviewItems(prevItems => prevItems.filter(item => !allIdsToDelete.includes(item.id)));
    
    // Update selection state to remove all deleted items
    setSelectedPreviewItems(prevSelected => {
      const newSelected = { ...prevSelected };
      allIdsToDelete.forEach(id => {
        delete newSelected[id];
      });
      return newSelected;
    });
  };

  // Handle preview item drag start
  const handleDragStart = (e, itemId) => {
    setDraggedItemId(itemId);
  };

  // Handle preview item drag over
  const handleDragOver = (e, itemId) => {
    e.preventDefault();
    if (itemId !== draggedItemId) {
      setDragOverItemId(itemId);
    }
  };

  // Handle preview item drop
  const handleDrop = (e, targetItemId) => {
    e.preventDefault();
    
    if (!draggedItemId || draggedItemId === targetItemId) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }
    
    // Find the dragged and target items
    const draggedItem = previewItems.find(item => item.id === draggedItemId);
    const targetItem = previewItems.find(item => item.id === targetItemId);
    
    // Only allow reordering within the same hierarchy level and with the same parent
    if (
      draggedItem && 
      targetItem && 
      draggedItem.level === targetItem.level &&
      draggedItem.parentId === targetItem.parentId
    ) {
      // Reorder items
      setPreviewItems(prevItems => {
        const newItems = [...prevItems];
        const draggedItemIndex = newItems.findIndex(item => item.id === draggedItemId);
        const targetItemIndex = newItems.findIndex(item => item.id === targetItemId);
        
        const [draggedItem] = newItems.splice(draggedItemIndex, 1);
        newItems.splice(targetItemIndex, 0, draggedItem);
        
        return newItems;
      });
    }
    
    setDraggedItemId(null);
    setDragOverItemId(null);
  };

  return (
    <div className="ai-data-generator-container">
      <h3>AI Data Generator</h3>
      <p>Create a hierarchical structure with a single root item and multiple levels of children items.</p>
      
      <div className="generator-layout">
        {/* Left side - Generator Controls */}
        <div className="generator-controls">
          <div className="generator-section">
            <h4>Generate Domain Items</h4>
            <form onSubmit={handlePreview} className="generator-form">
              <div className="form-group">
                <label>Program Type:</label>
                <select 
                  value={programType} 
                  onChange={handleProgramTypeChange}
                  required
                  disabled={previewLoading}
                  className="program-type-select"
                >
                  <option value="">Select program type</option>
                  {programTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              {programType === 'Custom' && (
                <div className="form-group">
                  <label>Custom Program Type:</label>
                  <input 
                    type="text" 
                    value={customProgramType} 
                    onChange={(e) => setCustomProgramType(e.target.value)}
                    placeholder="E.g., Space Launch System, Wind Turbine, etc."
                    required
                    disabled={previewLoading}
                  />
                </div>
              )}
              
              <div className="form-group">
                <label>Domain:</label>
                <select 
                  value={selectedDomain} 
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  required
                  disabled={previewLoading}
                >
                  <option value="">Select a domain</option>
                  {domains.map(domain => (
                    <option key={domain} value={domain}>{domain}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="itemCount">Number of Children:</label>
                <input 
                  id="itemCount"
                  type="number" 
                  value={itemCount} 
                  onChange={(e) => setItemCount(e.target.value)}
                  min="1"
                  max="50"
                  required
                  disabled={previewLoading}
                />
              </div>
              
              <div className="form-group">
                <label>Hierarchical Depth:</label>
                <input 
                  type="number" 
                  value={depth} 
                  onChange={(e) => setDepth(e.target.value)}
                  min="1"
                  max="3"
                  required
                  disabled={previewLoading}
                />
                <div className="form-help">
                  1 = Root + children, 2 = Root + children + grandchildren, 3 = Root + three levels of descendants
                </div>
              </div>
              
              <div className="form-group checkbox-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={connectToNext} 
                    onChange={(e) => setConnectToNext(e.target.checked)}
                    disabled={previewLoading}
                  />
                  Connect to next domain (if available)
                </label>
              </div>
              
              <button 
                type="submit"
                className="generator-button"
                disabled={previewLoading || !selectedDomain || !programType || (programType === 'Custom' && !customProgramType.trim())}
              >
                {previewLoading ? 'Generating...' : 'Preview Items'}
              </button>
              
              {generateSuccess && (
                <div className="success-message">
                  Data generated successfully!
                </div>
              )}
              
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}
            </form>
            
            {results && (
              <div className="generator-results">
                <h5>Results</h5>
                <p>Added {results.itemsCreated} items with {results.connectionsCreated} relationships</p>
                <p>Program Type: {programType === 'Custom' ? customProgramType : programType}</p>
              </div>
            )}
          </div>
          
          <div className="generator-section">
            <h4>Cross-Connect Domains</h4>
            <p>Create relationships between items in different domains</p>
            
            <form onSubmit={handleCrossConnect} className="generator-form">
              <div className="form-group">
                <label>Source Domain:</label>
                <select 
                  value={sourceDomain} 
                  onChange={(e) => setSourceDomain(e.target.value)}
                  required
                  disabled={crossConnectLoading}
                >
                  <option value="">Select source domain</option>
                  {domains.map(domain => (
                    <option key={domain} value={domain}>{domain}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Target Domain:</label>
                <select 
                  value={targetDomain} 
                  onChange={(e) => setTargetDomain(e.target.value)}
                  required
                  disabled={crossConnectLoading}
                >
                  <option value="">Select target domain</option>
                  {domains.map(domain => (
                    <option key={domain} value={domain}>{domain}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Number of Connections:</label>
                <input 
                  type="number" 
                  value={connectionCount} 
                  onChange={(e) => setConnectionCount(e.target.value)}
                  min="1"
                  max="100"
                  required
                  disabled={crossConnectLoading}
                />
              </div>
              
              <button 
                type="submit"
                className="generator-button"
                disabled={crossConnectLoading || !sourceDomain || !targetDomain || sourceDomain === targetDomain}
              >
                {crossConnectLoading ? 'Creating Connections...' : 'Create Connections'}
              </button>
              
              {crossConnectSuccess && (
                <div className="success-message">
                  Connections created successfully!
                </div>
              )}
              
              {crossConnectError && (
                <div className="error-message">
                  {crossConnectError}
                </div>
              )}
            </form>
            
            {crossConnectResults && (
              <div className="generator-results">
                <h5>Results</h5>
                <p>{crossConnectResults.message}</p>
                <p>Relationship type: {crossConnectResults.relationshipType}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Right side - Preview Panel */}
        <div className={`preview-panel ${previewItems.length > 0 ? 'active' : ''}`}>
          <div className="preview-header">
            <h4>Preview Generated Items</h4>
            {previewItems.length > 0 && (
              <div className="preview-actions">
                <button 
                  className="select-all-button"
                  onClick={() => toggleAllItems(true)}
                >
                  Select All
                </button>
                <button 
                  className="select-none-button"
                  onClick={() => toggleAllItems(false)}
                >
                  Select None
                </button>
                <button 
                  className="generator-button approve-button"
                  onClick={handleApprove}
                  disabled={approveLoading || Object.values(selectedPreviewItems).every(v => !v)}
                >
                  {approveLoading ? 'Approving...' : 'Approve Selected'}
                </button>
              </div>
            )}
            
            {previewItems.length > 0 && (
              <div className="preview-instructions">
                <small>
                  <span className="drag-icon">↕</span> Drag to reorder items
                  <span className="edit-icon">✎</span> Click to edit item
                  <span className="delete-icon">✕</span> Click to delete item
                </small>
              </div>
            )}
          </div>
          
          {previewLoading ? (
            <div className="preview-loading">
              <p>Generating preview items...</p>
            </div>
          ) : error ? (
            <div className="preview-error">
              <div className="error-icon">⚠️</div>
              <h4>Error</h4>
              <p>{error}</p>
              <div className="error-help">
                {error.includes('Database connection error') && (
                  <div className="database-help">
                    <h5>Troubleshooting Steps:</h5>
                    <ol>
                      <li>Make sure Neo4j database is running</li>
                      <li>Check database connection settings in server/.env</li>
                      <li>Restart the server application</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          ) : previewItems.length > 0 ? (
            <div className="preview-items">
              <div className="preview-count">
                {Object.values(selectedPreviewItems).filter(Boolean).length} of {previewItems.length} items selected
              </div>
              <div className="items-table-container">
                <table className="items-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input 
                          type="checkbox" 
                          checked={previewItems.length > 0 && Object.values(selectedPreviewItems).every(Boolean)}
                          onChange={(e) => toggleAllItems(e.target.checked)}
                        />
                      </th>
                      <th>Title</th>
                      <th>Description</th>
                      <th style={{ width: '80px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewItems.map(item => (
                      <tr 
                        key={item.id} 
                        className={`
                          ${selectedPreviewItems[item.id] ? 'selected-row' : ''}
                          ${dragOverItemId === item.id ? 'drag-over' : ''}
                          ${item.level ? `level-${item.level}` : ''}
                          ${item.isParent ? 'parent-item' : ''}
                        `}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        onDragOver={(e) => handleDragOver(e, item.id)}
                        onDrop={(e) => handleDrop(e, item.id)}
                        onDragEnd={() => setDragOverItemId(null)}
                      >
                        <td>
                          <input 
                            type="checkbox" 
                            checked={!!selectedPreviewItems[item.id]}
                            onChange={() => toggleItemSelection(item.id)}
                          />
                        </td>
                        {editingItem === item.id ? (
                          <td colSpan={2}>
                            <div className="edit-item-form">
                              <input 
                                type="text"
                                value={item.title}
                                onChange={(e) => setPreviewItems(prevItems => 
                                  prevItems.map(i => i.id === item.id ? {...i, title: e.target.value} : i)
                                )}
                                className="edit-title-input"
                              />
                              <textarea
                                value={item.description}
                                onChange={(e) => setPreviewItems(prevItems => 
                                  prevItems.map(i => i.id === item.id ? {...i, description: e.target.value} : i)
                                )}
                                className="edit-description-input"
                                rows={3}
                              />
                              <div className="edit-actions">
                                <button 
                                  className="save-edit-button"
                                  onClick={() => setEditingItem(null)}
                                >
                                  Save
                                </button>
                                <button 
                                  className="cancel-edit-button"
                                  onClick={() => {
                                    // Reset to original values
                                    const originalItem = previewItems.find(i => i.id === item.id);
                                    if (originalItem) {
                                      // This is a no-op now since we're editing in place, but useful if we change approach
                                      setEditingItem(null);
                                    }
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        ) : (
                          <>
                            <td className="drag-handle-cell">
                              <span className="drag-handle">↕</span>
                              <span className={`hierarchy-indicator level-${item.level || 0}`}>
                                {item.level > 0 && '└ '}
                              </span>
                              <span className={item.isParent ? 'parent-title' : ''}>
                                {item.title}
                              </span>
                            </td>
                            <td className="description-cell">{item.description}</td>
                          </>
                        )}
                        <td className="action-cell">
                          {editingItem !== item.id && (
                            <>
                              <button 
                                className="item-action-button edit-button" 
                                onClick={() => setEditingItem(item.id)}
                                title="Edit item"
                              >
                                ✎
                              </button>
                              <button 
                                className="item-action-button delete-button"
                                onClick={() => handleDeletePreviewItem(item.id)}
                                title="Delete item"
                              >
                                ✕
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty-preview">
              <p>Generate a preview to see items before adding them to the database.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function SettingsPage() {
  const [activeTab, setActiveTab] = useState('domains');
  
  // Navigate back to flow view
  const handleBackToFlow = () => {
    window.location.href = '/';
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Settings</h2>
        <button 
          className="back-to-flow-button"
          onClick={handleBackToFlow}
        >
          ← Back to Flow
        </button>
      </div>
      
      <div className="settings-tabs">
        <button 
          className={`tab-button ${activeTab === 'domains' ? 'active' : ''}`} 
          onClick={() => setActiveTab('domains')}
        >
          Domain Order
        </button>
        <button 
          className={`tab-button ${activeTab === 'items' ? 'active' : ''}`} 
          onClick={() => setActiveTab('items')}
        >
          Item Management
        </button>
        <button 
          className={`tab-button ${activeTab === 'appearance' ? 'active' : ''}`} 
          onClick={() => setActiveTab('appearance')}
        >
          Appearance
        </button>
        <button 
          className={`tab-button ${activeTab === 'generator' ? 'active' : ''}`} 
          onClick={() => setActiveTab('generator')}
        >
          AI Generator
        </button>
      </div>
      
      <div className="settings-content">
        {activeTab === 'domains' && <DomainOrderSettings />}
        {activeTab === 'items' && <ItemManagementSettings />}
        {activeTab === 'appearance' && <AppearanceSettings />}
        {activeTab === 'generator' && <AiDataGenerator />}
      </div>
    </div>
  );
}

export default SettingsPage; 