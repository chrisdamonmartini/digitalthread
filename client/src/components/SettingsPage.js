import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import IconPreview from './IconPreview';
import IconSelector from './IconSelector';
import './SettingsPage.css'; // Add CSS import
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

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

// Draggable domain item component
const DomainItem = ({ domain, index, moveDomain }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'DOMAIN',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'DOMAIN',
    hover: (draggedItem) => {
      if (draggedItem.index !== index) {
        moveDomain(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className="domain-item"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="domain-name">{domain.name}</div>
      <div className="domain-color" style={{ backgroundColor: domain.color }}></div>
    </div>
  );
};

// Domain Order Settings Component
const DomainOrderSettings = () => {
  const [domains, setDomains] = useState([]);
  const [adjacentOnly, setAdjacentOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch domains from the server
    const fetchDomains = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:3001/api/domains');
        setDomains(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching domains:', err);
        setError('Failed to load domains. Please try again.');
        setLoading(false);
      }
    };

    // Fetch adjacent only setting
    const fetchSettings = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/settings');
        if (response.data && response.data.adjacentOnly !== undefined) {
          setAdjacentOnly(response.data.adjacentOnly);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };

    fetchDomains();
    fetchSettings();
  }, []);

  const moveDomain = (fromIndex, toIndex) => {
    const updatedDomains = [...domains];
    const [movedDomain] = updatedDomains.splice(fromIndex, 1);
    updatedDomains.splice(toIndex, 0, movedDomain);
    setDomains(updatedDomains);
  };

  const handleSaveDomainOrder = async () => {
    try {
      await axios.post('http://localhost:3001/api/domains/order', {
        domains: domains.map((domain, index) => ({
          id: domain.id,
          order: index
        }))
      });
      alert('Domain order saved successfully!');
    } catch (err) {
      console.error('Error saving domain order:', err);
      alert('Failed to save domain order. Please try again.');
    }
  };

  const handleToggleAdjacentOnly = async () => {
    const newValue = !adjacentOnly;
    setAdjacentOnly(newValue);
    try {
      await axios.post('http://localhost:3001/api/settings', {
        adjacentOnly: newValue
      });
    } catch (err) {
      console.error('Error updating settings:', err);
      alert('Failed to update settings. Please try again.');
      setAdjacentOnly(!newValue); // Revert on error
    }
  };

  if (loading) return <div>Loading domains...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="domain-order-settings">
      <h3>Arrange Domains</h3>
      <p>Drag and drop domains to reorder them in the Digital Thread.</p>
      <div className="domains-container">
        {domains.map((domain, index) => (
          <DomainItem
            key={domain.id}
            domain={domain}
            index={index}
            moveDomain={moveDomain}
          />
        ))}
      </div>
      <button 
        className="save-button"
        onClick={handleSaveDomainOrder}
      >
        Save Domain Order
      </button>
      
      <div className="adjacent-setting">
        <h3>Connection Settings</h3>
        <label className="adjacent-toggle">
          <input
            type="checkbox"
            checked={adjacentOnly}
            onChange={handleToggleAdjacentOnly}
          />
          Allow connections between adjacent domains only
        </label>
        <p className="setting-description">
          When enabled, items can only be connected to items in the adjacent domains.
          When disabled, connections can be made between any domains.
        </p>
      </div>
    </div>
  );
};

// Item Management Settings Component
const ItemManagementSettings = () => {
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form states
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemIcon, setNewItemIcon] = useState('');
  
  // Bulk generation
  const [bulkPrefix, setBulkPrefix] = useState('');
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkDescriptionTemplate, setBulkDescriptionTemplate] = useState('');
  const [generatingItems, setGeneratingItems] = useState(false);

  useEffect(() => {
    // Fetch domains
    const fetchDomains = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:3001/api/domains');
        setDomains(response.data);
        if (response.data.length > 0) {
          setSelectedDomain(response.data[0].id);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching domains:', err);
        setError('Failed to load domains. Please try again.');
        setLoading(false);
      }
    };

    fetchDomains();
  }, []);

  const handleDomainChange = (e) => {
    setSelectedDomain(e.target.value);
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    
    if (!selectedDomain || !newItemTitle) {
      alert('Please select a domain and provide a title.');
      return;
    }
    
    try {
      const domainType = domains.find(d => d.id === selectedDomain)?.type;
      
      const response = await axios.post(`http://localhost:3001/api/${domainType}s`, {
        title: newItemTitle,
        description: newItemDescription,
        icon: newItemIcon
      });
      
      if (response.status === 201) {
        alert('Item created successfully!');
        // Reset form
        setNewItemTitle('');
        setNewItemDescription('');
        setNewItemIcon('');
      }
    } catch (err) {
      console.error('Error creating item:', err);
      alert('Failed to create item. Please try again.');
    }
  };

  const handleBulkGenerate = async (e) => {
    e.preventDefault();
    
    if (!selectedDomain || !bulkPrefix || bulkCount <= 0) {
      alert('Please select a domain, provide a prefix, and specify a valid count.');
      return;
    }
    
    try {
      setGeneratingItems(true);
      const domainType = domains.find(d => d.id === selectedDomain)?.type;
      
      const response = await axios.post(`http://localhost:3001/api/${domainType}s/bulk`, {
        prefix: bulkPrefix,
        count: bulkCount,
        descriptionTemplate: bulkDescriptionTemplate
      });
      
      if (response.status === 201) {
        alert(`Successfully generated ${bulkCount} items!`);
        // Reset form
        setBulkPrefix('');
        setBulkCount(10);
        setBulkDescriptionTemplate('');
      }
      setGeneratingItems(false);
    } catch (err) {
      console.error('Error generating items:', err);
      alert('Failed to generate items. Please try again.');
      setGeneratingItems(false);
    }
  };

  if (loading) return <div>Loading domains...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="item-management-settings">
      <div className="domain-selector">
        <h3>Select Domain</h3>
        <select 
          value={selectedDomain} 
          onChange={handleDomainChange}
          className="domain-select"
        >
          {domains.map(domain => (
            <option key={domain.id} value={domain.id}>
              {domain.name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="item-creation-section">
        <h3>Create Individual Item</h3>
        <form onSubmit={handleCreateItem} className="item-form">
          <div className="form-group">
            <label>Title:</label>
            <input
              type="text"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              placeholder="Enter item title"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Description:</label>
            <textarea
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              placeholder="Enter item description"
              rows={3}
            />
          </div>
          
          <div className="form-group">
            <label>Icon:</label>
            <IconSelector 
              selectedIcon={newItemIcon} 
              onSelectIcon={setNewItemIcon} 
            />
          </div>
          
          <button type="submit" className="create-button">
            Create Item
          </button>
        </form>
      </div>
      
      <div className="bulk-generation-section">
        <h3>Bulk Generate Items</h3>
        <form onSubmit={handleBulkGenerate} className="bulk-form">
          <div className="form-group">
            <label>Name Prefix:</label>
            <input
              type="text"
              value={bulkPrefix}
              onChange={(e) => setBulkPrefix(e.target.value)}
              placeholder="e.g., 'Requirement'"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Number of Items:</label>
            <input
              type="number"
              value={bulkCount}
              onChange={(e) => setBulkCount(parseInt(e.target.value))}
              min="1"
              max="100"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Description Template:</label>
            <textarea
              value={bulkDescriptionTemplate}
              onChange={(e) => setBulkDescriptionTemplate(e.target.value)}
              placeholder="Description template. Use {index} for item number."
              rows={3}
            />
            <small className="template-help">
              Use {index} to include the item number, e.g., "Test requirement number {index}"
            </small>
          </div>
          
          <button 
            type="submit" 
            className="generate-button"
            disabled={generatingItems}
          >
            {generatingItems ? 'Generating...' : 'Generate Items'}
          </button>
        </form>
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
        const configResponse = await fetch(`${API_URL}/config`);
        if (!configResponse.ok) {
          throw new Error(`HTTP error! status: ${configResponse.status}`);
        }
        const configData = await configResponse.json();
        setDomains(configData.domainOrder || []);
        
        // Get appearance settings
        const appearanceResponse = await fetch(`${API_URL}/appearance`);
        let appearanceData = {};
        
        if (appearanceResponse.ok) {
          appearanceData = await appearanceResponse.json();
          console.log('Received appearance data:', JSON.stringify(appearanceData).slice(0, 200) + '...');
          
          // Check if the data has the expected structure
          // Sometimes we might get an unintended nested structure from the database
          if (typeof appearanceData === 'object' && appearanceData !== null) {
            // Check for possible nested appearance settings structure
            const keys = Object.keys(appearanceData);
            if (keys.length === 1 && keys[0] === 'appearance_settings') {
              console.log('Detected nested appearance settings, fixing structure...');
              appearanceData = appearanceData.appearance_settings;
            }

            // Clean up any invalid domain entries (they should be objects, not primitives)
            for (const domain in appearanceData) {
              if (typeof appearanceData[domain] !== 'object' || appearanceData[domain] === null) {
                console.warn(`Invalid appearance setting for domain ${domain}, removing:`, appearanceData[domain]);
                delete appearanceData[domain];
              }
            }
          }
          
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
      
      // Check for any potential issues with icon data
      let hasIssues = false;
      let issueMessages = [];
      
      Object.keys(domainSettings).forEach(domain => {
        const { color, icon } = domainSettings[domain];
        
        // Basic validation
        if (!color) {
          hasIssues = true;
          issueMessages.push(`Domain "${domain}" is missing a color value.`);
        }
        
        if (!icon || !icon.type) {
          hasIssues = true;
          issueMessages.push(`Domain "${domain}" has an invalid icon configuration.`);
        }
        
        // Check custom icon data format
        if (icon?.type === 'custom') {
          if (!icon.url) {
            hasIssues = true;
            issueMessages.push(`Custom icon for "${domain}" is missing image data.`);
          } else if (!icon.url.startsWith('data:') || !icon.url.includes(';base64,')) {
            hasIssues = true;
            issueMessages.push(`Custom icon for "${domain}" has an invalid data format.`);
          }
        }
        
        // Make sure all values are primitives - Neo4j cannot store complex objects
        formattedSettings[domain] = {
          color: color || DEFAULT_DOMAIN_COLORS[domain] || '#cccccc',
          iconType: icon?.type || 'preset',
          icon: icon?.type === 'preset' ? (icon?.id || DEFAULT_DOMAIN_ICONS[domain] || 'default') : null,
          // Don't send iconData if it's not a custom icon to avoid NO_VALUE errors
          ...(icon?.type === 'custom' && icon.url ? { iconData: icon.url } : {})
        };
      });
      
      // Show issues if any were found
      if (hasIssues) {
        setError(`Please fix the following issues before saving:\n${issueMessages.join('\n')}`);
        return;
      }
      
      console.log('Sending appearance settings to API:', JSON.stringify(formattedSettings).slice(0, 200) + '...');
      
      const response = await fetch(`${API_URL}/appearance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedSettings),
      });
      
      // Log the actual HTTP response for debugging
      const responseText = await response.text();
      console.log(`Appearance API response (${response.status}):`, responseText);
      
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          // Try to parse the error response
          const errorData = JSON.parse(responseText);
          if (errorData?.error) {
            errorMsg = errorData.error;
            if (errorData.details) {
              errorMsg += ': ' + errorData.details;
            }
          }
        } catch (e) {
          // Fallback to the basic error if JSON parsing fails
        }
        throw new Error(errorMsg);
      }
      
      setSaveSuccess(true);
      setError(null); // Clear any previous errors
      setTimeout(() => setSaveSuccess(false), 3000);
      
    } catch (e) {
      console.error("Error saving appearance settings:", e);
      setError(`Failed to save appearance settings: ${e.message}`);
    }
  };
  
  if (loading) return <div>Loading appearance settings...</div>;
  if (error) return <div className="error-message">{error}</div>;
  
  return (
    <div className="appearance-settings">
      <h3>Domain Appearance</h3>
      <p>Customize the color and icon for each domain. You can select from preset icons or upload your own.</p>
      
      {error && <div className="error-message">{error}</div>}
      
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

function SettingsPage() {
    const [activeTab, setActiveTab] = useState('domains'); // 'domains', 'items', or 'appearance'
        
    return (
        <div className="settings-page-container">
            <h1>Application Settings</h1>
            
            <div className="settings-tabs">
                <button 
                    className={`tab-button ${activeTab === 'domains' ? 'active' : ''}`}
                    onClick={() => setActiveTab('domains')}
                >
                    Domain Configuration
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
            </div>

            <div className="settings-tab-content">
                {activeTab === 'domains' && <DndProvider backend={HTML5Backend}>
                    <DomainOrderSettings />
                </DndProvider>}
                {activeTab === 'items' && <ItemManagementSettings />}
                {activeTab === 'appearance' && <AppearanceSettings />}
            </div>
        </div>
    );
}

export default SettingsPage; 