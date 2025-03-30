import React from 'react';
import './DomainConfigPanel.css';

const DomainConfigPanel = ({ isOpen, onClose, domainName }) => {
  return (
    <div className={`domain-config-panel ${isOpen ? 'open' : ''}`}>
      <div className="panel-header">
        <h2>Domain Configuration</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="panel-content">
        <div className="config-section">
          <h3>Domain Title</h3>
          <input 
            type="text" 
            value={domainName} 
            placeholder="Domain Name"
            className="domain-title-input"
            // Future implementation: update domain title
          />
        </div>
        
        <div className="config-section">
          <h3>Domain Icon</h3>
          <div className="icon-selector">
            {/* Future implementation: icon selection interface */}
            <p>Icon selector will be implemented here</p>
          </div>
        </div>
        
        <div className="config-section">
          <h3>Visual Settings</h3>
          <div className="color-picker">
            <label>
              Color:
              <input 
                type="color" 
                defaultValue="#14364F"
                // Future implementation: update domain color
              />
            </label>
          </div>
        </div>
        
        <div className="config-actions">
          <button className="action-button cancel" onClick={onClose}>Cancel</button>
          <button className="action-button save">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default DomainConfigPanel; 