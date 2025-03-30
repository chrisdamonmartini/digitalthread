import React, { useState } from 'react';
import './IconSelector.css';

// List of icon options - you can expand this as needed
const ICON_OPTIONS = [
  { id: 'default', label: 'Default', value: '' },
  { id: 'star', label: 'Star', value: 'star' },
  { id: 'flag', label: 'Flag', value: 'flag' },
  { id: 'check', label: 'Check', value: 'check' },
  { id: 'gear', label: 'Gear', value: 'gear' },
  { id: 'document', label: 'Document', value: 'document' },
  { id: 'person', label: 'Person', value: 'person' },
  { id: 'lightbulb', label: 'Lightbulb', value: 'lightbulb' },
  { id: 'chart', label: 'Chart', value: 'chart' },
  { id: 'car', label: 'Car', value: 'car' },
  { id: 'aircraft', label: 'Aircraft', value: 'aircraft' },
  { id: 'satellite', label: 'Satellite', value: 'satellite' }
];

const IconSelector = ({ selectedIcon, onSelectIcon }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (iconValue) => {
    onSelectIcon(iconValue);
    setIsOpen(false);
  };

  // Helper to get icon display
  const getIconDisplay = (iconValue) => {
    if (!iconValue) return '✓'; // Default icon
    
    // Map icon names to symbols
    const iconMap = {
      'star': '★',
      'flag': '⚑',
      'check': '✓',
      'gear': '⚙',
      'document': '📄',
      'person': '👤',
      'lightbulb': '💡',
      'chart': '📊',
      'car': '🚗',
      'aircraft': '✈️',
      'satellite': '🛰️'
    };
    
    return iconMap[iconValue] || '✓';
  };

  return (
    <div className="icon-selector">
      <div 
        className="selected-icon"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="icon-display">
          {getIconDisplay(selectedIcon)}
        </span>
        <span className="icon-name">
          {selectedIcon ? ICON_OPTIONS.find(i => i.value === selectedIcon)?.label : 'Default'}
        </span>
        <span className="dropdown-arrow">▼</span>
      </div>
      
      {isOpen && (
        <div className="icon-dropdown">
          {ICON_OPTIONS.map(icon => (
            <div 
              key={icon.id}
              className={`icon-option ${selectedIcon === icon.value ? 'selected' : ''}`}
              onClick={() => handleSelect(icon.value)}
            >
              <span className="icon-display">
                {getIconDisplay(icon.value)}
              </span>
              <span className="icon-option-name">
                {icon.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IconSelector; 