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
  updateDomainColor = () => {}, // Function to update domain color
  onStartConnecting,  // Add this prop to receive the connection handler
  allowOnlyAdjacentConnections = true,  // New prop for connection restrictions
  setAllowOnlyAdjacentConnections = () => {}, // Setter for connection restrictions
  lineType = 'straight',
  setLineType = () => {},
  arrowheadType = 'ArrowClosed',
  setArrowheadType = () => {}
}) => {
  const [selectedDomain, setSelectedDomain] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Define available line types
  const lineTypes = [
    { value: 'straight', label: 'Straight' },
    { value: 'smoothstep', label: 'Smooth Step' },
    { value: 'step', label: 'Step (Orthogonal)' },
    { value: 'bezier', label: 'Bezier Curve' }
  ];

  // Define available arrowhead types
  const arrowheadTypes = [
    { value: 'ArrowClosed', label: 'Closed Arrow' },
    { value: 'Arrow', label: 'Standard Arrow' },
    { value: 'ArrowOpen', label: 'Open Arrow' }
  ];

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

        <div className="flow-panel-section">
          <h3>Connection Options</h3>
          <div className="display-options">
            <label className="checkbox-container">
              <input 
                type="checkbox" 
                checked={!allowOnlyAdjacentConnections} 
                onChange={(e) => setAllowOnlyAdjacentConnections(!e.target.checked)}
              />
              <span className="checkmark"></span>
              Allow cross-sequence connections
            </label>

            <div className="select-option">
              <label>Line Type:</label>
              <select 
                value={lineType} 
                onChange={(e) => setLineType(e.target.value)}
                className="line-type-select"
              >
                {lineTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <div className="line-type-example">
                <svg width="180" height="30">
                  {lineType === 'straight' && (
                    <line x1="40" y1="15" x2="140" y2="15" stroke="#00587c" strokeWidth="2.5" />
                  )}
                  {lineType === 'smoothstep' && (
                    <path 
                      d="M 40,15 C 60,15 60,15 80,5 S 100,25 120,15 S 140,15 140,15" 
                      fill="none" 
                      stroke="#00587c" 
                      strokeWidth="2.5" 
                    />
                  )}
                  {lineType === 'step' && (
                    <path 
                      d="M 40,15 H 70 V 5 H 110 V 15 H 140" 
                      fill="none" 
                      stroke="#00587c" 
                      strokeWidth="2.5" 
                    />
                  )}
                  {lineType === 'bezier' && (
                    <path 
                      d="M 40,15 C 65,0 115,30 140,15" 
                      fill="none" 
                      stroke="#00587c" 
                      strokeWidth="2.5" 
                    />
                  )}
                  <g transform="translate(140, 15)">
                    {arrowheadType === 'ArrowClosed' && (
                      <polygon points="-10,0 -10,6 0,0 -10,-6" fill="#00587c" />
                    )}
                    {arrowheadType === 'Arrow' && (
                      <path d="M -10,6 L 0,0 L -10,-6" fill="none" stroke="#00587c" strokeWidth="2.5" />
                    )}
                    {arrowheadType === 'ArrowOpen' && (
                      <path d="M -10,6 L 0,0 L -10,-6" fill="none" stroke="#00587c" strokeWidth="2" />
                    )}
                  </g>
                </svg>
              </div>
            </div>

            <div className="select-option">
              <label>Arrowhead Type:</label>
              <select 
                value={arrowheadType} 
                onChange={(e) => setArrowheadType(e.target.value)}
                className="arrowhead-type-select"
              >
                {arrowheadTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <div className="arrowhead-type-example">
                <svg width="180" height="30">
                  <line x1="40" y1="15" x2="140" y2="15" stroke="#00587c" strokeWidth="2.5" />
                  <g transform="translate(140, 15)">
                    {arrowheadType === 'ArrowClosed' && (
                      <polygon points="-10,0 -10,6 0,0 -10,-6" fill="#00587c" />
                    )}
                    {arrowheadType === 'Arrow' && (
                      <path d="M -10,6 L 0,0 L -10,-6" fill="none" stroke="#00587c" strokeWidth="2.5" />
                    )}
                    {arrowheadType === 'ArrowOpen' && (
                      <path d="M -10,6 L 0,0 L -10,-6" fill="none" stroke="#00587c" strokeWidth="2" />
                    )}
                  </g>
                </svg>
              </div>
            </div>

            <div className="option-item">
              <button 
                className="connection-button" 
                onClick={onStartConnecting}
              >
                Create Connection
              </button>
            </div>
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