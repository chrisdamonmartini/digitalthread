import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import './SettingsPage.css';
import IconSelector from './IconSelector';

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
        console.log('Fetching domains from API...');
        const response = await axios.get(`${API_URL}/domains`);
        console.log('Domains API response:', response.data);
        setDomains(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching domains:', err);
        // Provide default domains if API fails
        const defaultDomains = [
          { id: 'Mission', name: 'Mission', type: 'mission', order: 0, color: DEFAULT_DOMAIN_COLORS['Mission'] },
          { id: 'Scenario', name: 'Scenario', type: 'scenario', order: 1, color: DEFAULT_DOMAIN_COLORS['Scenario'] },
          { id: 'Requirements', name: 'Requirements', type: 'requirement', order: 2, color: DEFAULT_DOMAIN_COLORS['Requirements'] },
          { id: 'Parameter', name: 'Parameter', type: 'parameter', order: 3, color: DEFAULT_DOMAIN_COLORS['Parameter'] },
          { id: 'Functions', name: 'Functions', type: 'function', order: 4, color: DEFAULT_DOMAIN_COLORS['Functions'] }
        ];
        setDomains(defaultDomains);
        setError('Failed to load domains from server. Using defaults.');
        setLoading(false);
      }
    };

    // Fetch adjacent only setting
    const fetchSettings = async () => {
      try {
        console.log('Fetching settings from API...');
        const response = await axios.get(`${API_URL}/settings`);
        console.log('Settings API response:', response.data);
        if (response.data && response.data.adjacentOnly !== undefined) {
          setAdjacentOnly(response.data.adjacentOnly);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        // Default to true if API fails
        setAdjacentOnly(true);
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
      await axios.post(`${API_URL}/domains/order`, {
        domains: domains.map((domain, idx) => ({
          id: domain.id,
          order: idx
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
      await axios.post(`${API_URL}/settings`, {
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
        {domains.map((domain, idx) => (
          <DomainItem
            key={domain.id}
            domain={domain}
            index={idx}
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
        console.log('Item Management: Fetching domains from API...');
        const response = await axios.get(`${API_URL}/domains`);
        console.log('Item Management: Domains API response:', response.data);
        setDomains(response.data);
        if (response.data.length > 0) {
          setSelectedDomain(response.data[0].id);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching domains for item management:', err);
        // Provide default domains if API fails
        const defaultDomains = [
          { id: 'Mission', name: 'Mission', type: 'mission' },
          { id: 'Scenario', name: 'Scenario', type: 'scenario' },
          { id: 'Requirements', name: 'Requirements', type: 'requirement' },
          { id: 'Parameter', name: 'Parameter', type: 'parameter' },
          { id: 'Functions', name: 'Functions', type: 'function' }
        ];
        setDomains(defaultDomains);
        setSelectedDomain('Mission');
        setError('Failed to load domains from server. Using defaults.');
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
      
      const response = await axios.post(`${API_URL}/${domainType}s`, {
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
      
      // We'll let the server handle the index replacement
      const response = await axios.post(`${API_URL}/${domainType}s/bulk`, {
        prefix: bulkPrefix,
        count: bulkCount,
        descriptionTemplate: bulkDescriptionTemplate || `${bulkPrefix} item #i`
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
              onChange={(e) => setBulkCount(parseInt(e.target.value) || 0)}
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
              placeholder="Description template. Use {i} for item number."
              rows={3}
            />
            <small className="template-help">
              Use {'{'}'i'{'}'} to include the item number, e.g., "Test requirement number {'{'}'i'{'}'}"
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

// Appearance Settings placeholder component
const AppearanceSettings = () => {
  return (
    <div className="appearance-settings">
      <h3>Appearance Settings</h3>
      <p>Customize the appearance of domains and items in the Digital Thread.</p>
      <p>This section is under development.</p>
    </div>
  );
};

// Main SettingsPage component
function SettingsPage() {
  const [activeTab, setActiveTab] = useState('domains');

  return (
    <div className="settings-page-container">
      <h2>Settings</h2>
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
        {activeTab === 'domains' && (
          <DndProvider backend={HTML5Backend}>
            <DomainOrderSettings />
          </DndProvider>
        )}
        {activeTab === 'items' && <ItemManagementSettings />}
        {activeTab === 'appearance' && <AppearanceSettings />}
      </div>
    </div>
  );
}

export default SettingsPage; 