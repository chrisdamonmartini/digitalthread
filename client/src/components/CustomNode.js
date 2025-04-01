import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import './CustomNode.css'; // Import the CSS file

// Icons for expand/collapse
const ExpandIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 8H13" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 3V13" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CollapseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 8H13" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Using memo for performance optimization, as node data might change
const CustomNode = memo(({ id, data }) => {
  // Destructure displayMode and new tree-related props from data
  const { 
    itemData, 
    domain, 
    displayMode = 'titleOnly', 
    maxContentWidth, 
    depth = 0, // Add depth for potential styling
    hasChildren = false, 
    isExpanded = false, 
    toggleExpansion = () => {}
  } = data;

  // Remove inline style definitions
  // const nodeWidth = 220;
  // const nodeStyle = { ... };
  // const titleStyle = { ... };
  // const detailStyle = { ... };
  // const descriptionStyle = { ... };

  // Handle style to make them less visible
  const handleStyle = { 
    visibility: 'hidden' // Hide handles completely
  };
  
  // Container style that respects maxContentWidth
  const contentStyle = maxContentWidth ? {
    maxWidth: `${maxContentWidth}px`,
    width: '100%'
  } : {};

  // Format the display text based on the display mode
  let displayText = itemData.title; // Default to title only
  if (displayMode === 'idAndTitle' || displayMode === 'full') {
    displayText = `${itemData.id}: ${itemData.title}`; 
  }

  const handleExpandClick = (e) => {
    e.stopPropagation(); // Prevent node click
    toggleExpansion(id); // Use node ID here
  };

  return (
    // Apply the main CSS class and depth for potential styling
    <div className={`custom-node-item depth-${depth}`} style={{ background: 'transparent', border: 'none' }}>
      {/* Handles (will be hidden by style) */}
      <Handle type="target" position={Position.Left} id="left-target" style={handleStyle}/>
      
      {/* Content Wrapper with constrained width */} 
      <div style={contentStyle} className="node-content">
        {/* Expand/Collapse Toggle */} 
        <span 
          className={`expand-collapse-icon ${hasChildren ? 'visible' : 'hidden'}`}
          onClick={handleExpandClick}
        >
          {hasChildren ? (isExpanded ? <CollapseIcon /> : <ExpandIcon />) : null}
        </span>

        {/* Title with truncation */} 
        <strong className="node-title">
            {displayText}
        </strong>
        
        {/* Details - only shown in full mode */} 
        {displayMode === 'full' && domain === 'Parameter' && (itemData.unit || itemData.valueType) && (
            <p className="node-details">
                {itemData.valueType && `Type: ${itemData.valueType}`}{itemData.unit && itemData.valueType && ', '}{itemData.unit && `Unit: ${itemData.unit}`}
            </p>
        )}
        {displayMode === 'full' && domain === 'Functions' && itemData.functionType && (
            <p className="node-details">
                Type: {itemData.functionType}
            </p>
        )}
        {displayMode === 'full' && itemData.description &&
          <p className="node-description">
              {itemData.description}
          </p>
        }
      </div>
      
      <Handle type="source" position={Position.Right} id="right-source" style={handleStyle}/>
    </div>
  );
});

export default CustomNode; 