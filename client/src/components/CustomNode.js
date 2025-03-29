import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import './CustomNode.css'; // Import the CSS file

// Using memo for performance optimization, as node data might change
const CustomNode = memo(({ data }) => {
  // Destructure displayMode from data
  const { itemData, domain, displayMode = 'titleOnly', maxContentWidth } = data;

  // Remove inline style definitions
  // const nodeWidth = 220;
  // const nodeStyle = { ... };
  // const titleStyle = { ... };
  // const detailStyle = { ... };
  // const descriptionStyle = { ... };

  // Handle style to make them less visible
  const handleStyle = { 
    width: 8, 
    height: 8,
    opacity: 0.6,
    background: '#666'
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

  return (
    // Apply the main CSS class
    <div className="custom-node-item">
      {/* Handles */}
      <Handle type="target" position={Position.Left} id="left-target" style={handleStyle}/>
      
      {/* Content Wrapper with constrained width */} 
      <div style={contentStyle} className="node-content">
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