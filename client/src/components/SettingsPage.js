import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import IconPreview from './IconPreview';
import IconSelector from './IconSelector';
import './SettingsPage.css'; // Add CSS import

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
        const response = await fetch(`${API_URL}/config`);
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
      const response = await fetch(`${API_URL}/config`, {
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

  // Fetch available domains
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const response = await fetch(`${API_URL}/config`);
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
      const endpoint = `${API_URL}/${selectedDomain.toLowerCase()}`;
      
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
      const endpoint = `${API_URL}/${selectedDomain.toLowerCase()}/bulk`;
      
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
      
      const response = await fetch(`${API_URL}/appearance`, {
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
                {activeTab === 'domains' && <DomainOrderSettings />}
                {activeTab === 'items' && <ItemManagementSettings />}
                {activeTab === 'appearance' && <AppearanceSettings />}
            </div>
        </div>
    );
}

export default SettingsPage; 