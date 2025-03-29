import React, { useState } from 'react';
import './FlowControls.css';

// Component for flow-specific controls that appear over the diagram
const FlowControls = ({ 
  nodeDisplayMode, 
  setNodeDisplayMode, 
  showRelationshipLines,
  setShowRelationshipLines,
  showDomainIcons = true,
  setShowDomainIcons = () => {}, // Default no-op function if not provided
  domainConfig = {},
  updateDomainColor = () => {} // Function to update domain color
}) => {
  const [selectedDomain, setSelectedDomain] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <div className="flow-controls">
      <div className="flow-controls-panel">
        <div className="flow-panel-section">
          <h3>Legend</h3>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#00587c' }}></div>
              <span>Relationship Line</span>
            </div>
            <div className="legend-item">
              <div className="legend-box"></div>
              <span>Domain Container</span>
            </div>
            <div className="legend-item">
              <div className="legend-item-node"></div>
              <span>Item</span>
            </div>
          </div>
        </div>

        <div className="flow-panel-section">
          <h3>Display Options</h3>
          <div className="display-options">
            <label className="checkbox-container">
              <input 
                type="checkbox" 
                checked={nodeDisplayMode === 'idAndTitle' || nodeDisplayMode === 'full'} 
                onChange={(e) => {
                  if (e.target.checked) {
                    // If the full description was already shown, keep it
                    if (nodeDisplayMode === 'full') return;
                    // Otherwise just show ID + title
                    setNodeDisplayMode('idAndTitle');
                  } else {
                    setNodeDisplayMode('titleOnly');
                  }
                }}
              />
              <span className="checkmark"></span>
              Show IDs with titles
            </label>

            <label className="checkbox-container">
              <input 
                type="checkbox" 
                checked={nodeDisplayMode === 'full'} 
                onChange={(e) => {
                  if (e.target.checked) {
                    setNodeDisplayMode('full');
                  } else {
                    // If unchecked, fall back to previous state
                    setNodeDisplayMode(prev => 
                      prev === 'full' ? 'idAndTitle' : prev
                    );
                  }
                }}
              />
              <span className="checkmark"></span>
              Show descriptions and details
            </label>

            <label className="checkbox-container">
              <input 
                type="checkbox" 
                checked={showRelationshipLines} 
                onChange={(e) => setShowRelationshipLines(e.target.checked)}
              />
              <span className="checkmark"></span>
              Show relationship lines
            </label>
            
            <label className="checkbox-container">
              <input 
                type="checkbox" 
                checked={showDomainIcons} 
                onChange={(e) => setShowDomainIcons(e.target.checked)}
              />
              <span className="checkmark"></span>
              Show domain icons
            </label>
          </div>
        </div>

        {/* Placeholder for future domain color settings - would need additional state management */}
        {/* <div className="flow-panel-section">
          <h3>Domain Colors</h3>
          <div className="domain-color-options">
            <select 
              value={selectedDomain} 
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="domain-select"
            >
              <option value="">Select a domain...</option>
              {Object.keys(domainConfig).map(domain => (
                <option key={domain} value={domain}>{domain}</option>
              ))}
            </select>
            
            {selectedDomain && (
              <div className="color-picker-container">
                <button 
                  className="color-picker-button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                >
                  Change Color
                </button>
                {showColorPicker && (
                  <input 
                    type="color"
                    value={domainConfig[selectedDomain]?.color || '#14364F'}
                    onChange={(e) => {
                      updateDomainColor(selectedDomain, e.target.value);
                      setShowColorPicker(false);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default FlowControls; 