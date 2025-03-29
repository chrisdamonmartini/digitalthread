import React, { useState, useEffect } from 'react';
import IconPreview from './IconPreview';
import './IconSelector.css';

// List of built-in icon types for easy selection
const BUILT_IN_ICONS = [
  { id: 'default', name: 'Default' },
  { id: 'mission', name: 'Mission' },
  { id: 'requirement', name: 'Requirement' },
  { id: 'parameter', name: 'Parameter' },
  { id: 'function', name: 'Function' },
  { id: 'logical', name: 'Logical' },
  { id: 'simulation', name: 'Simulation' },
  { id: 'test', name: 'Test' }
];

// Additional SVG/icon options from the icon folder
const ADDITIONAL_ICONS = [
  { id: 'typeAction48', name: 'Action' },
  { id: 'typeTarget48', name: 'Target' },
  { id: 'typeWarning48', name: 'Warning' },
  { id: 'typeClass48', name: 'Class' },
  { id: 'cmdSettings24', name: 'Settings' },
  { id: 'cmdSearch24', name: 'Search' },
  { id: 'cmdRefresh24', name: 'Refresh' },
  { id: 'typePartComponent48', name: 'Part' },
  { id: 'TabIcon', name: 'Tab' }
];

// All available preset icons
const ALL_PRESET_ICONS = [...BUILT_IN_ICONS, ...ADDITIONAL_ICONS];

const IconSelector = ({ value, onChange, onUpload }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('presets');
  const [customIconUrl, setCustomIconUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter icons based on search term
  const filteredIcons = ALL_PRESET_ICONS.filter(icon => 
    icon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    icon.id.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Handle icon file upload
  const handleIconUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image/(svg\\+xml|png|jpeg|jpg)')) {
      alert('Please upload an SVG, PNG, or JPEG file.');
      return;
    }
    
    // If onUpload is provided, let the parent component handle the upload
    if (onUpload) {
      onUpload(file);
      setIsOpen(false);
      return;
    }
    
    // Otherwise, create a URL for previewing the uploaded icon
    const reader = new FileReader();
    reader.onload = (e) => {
      setCustomIconUrl(e.target.result);
      onChange({ type: 'custom', url: e.target.result });
      setIsOpen(false);
    };
    reader.readAsDataURL(file);
  };

  // Handle selecting a preset icon
  const handleSelectIcon = (iconId) => {
    onChange({ type: 'preset', id: iconId });
    setIsOpen(false);
  };
  
  // Close the selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const selector = document.getElementById('icon-selector');
      if (selector && !selector.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  return (
    <div className="icon-selector-container">
      <div className="icon-selector-trigger" onClick={() => setIsOpen(!isOpen)}>
        <div className="selected-icon">
          {value?.type === 'custom' ? (
            <img src={value.url} alt="Custom Icon" className="icon-preview" />
          ) : (
            <IconPreview iconType={value?.id || 'default'} size={28} />
          )}
        </div>
        <span className="icon-selector-text">
          {value?.type === 'custom' 
            ? 'Custom Icon' 
            : ALL_PRESET_ICONS.find(i => i.id === value?.id)?.name || 'Select Icon'}
        </span>
        <span className="icon-selector-arrow">▼</span>
      </div>
      
      {isOpen && (
        <div className="icon-selector-dropdown" id="icon-selector">
          <div className="icon-selector-tabs">
            <button 
              className={`icon-selector-tab ${selectedTab === 'presets' ? 'active' : ''}`}
              onClick={() => setSelectedTab('presets')}
            >
              Preset Icons
            </button>
            <button 
              className={`icon-selector-tab ${selectedTab === 'upload' ? 'active' : ''}`}
              onClick={() => setSelectedTab('upload')}
            >
              Upload Icon
            </button>
          </div>
          
          {selectedTab === 'presets' && (
            <>
              <div className="icon-search">
                <input
                  type="text"
                  placeholder="Search icons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="icon-grid">
                {filteredIcons.map(icon => (
                  <div 
                    key={icon.id}
                    className={`icon-item ${value?.id === icon.id ? 'selected' : ''}`}
                    onClick={() => handleSelectIcon(icon.id)}
                  >
                    <IconPreview iconType={icon.id} size={24} />
                    <span className="icon-name">{icon.name}</span>
                  </div>
                ))}
                {filteredIcons.length === 0 && (
                  <div className="no-icons-found">No icons match your search.</div>
                )}
              </div>
            </>
          )}
          
          {selectedTab === 'upload' && (
            <div className="icon-upload">
              <p>Upload a custom icon (SVG, PNG, or JPEG)</p>
              <input 
                type="file" 
                accept=".svg,.png,.jpg,.jpeg"
                onChange={handleIconUpload}
                className="file-input"
              />
              <div className="upload-note">
                For best results, use SVG format with a square aspect ratio.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IconSelector; 