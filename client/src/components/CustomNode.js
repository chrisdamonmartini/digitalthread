import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

// Using memo for performance optimization, as node data might change
const CustomNode = memo(({ data }) => {
  // Destructure displayMode from data
  const { itemData, domain, displayMode = 'titleOnly' } = data;

  // Define a fixed width (adjust as needed)
  const nodeWidth = 220; // Reduce width slightly

  // Basic styling - can be moved to CSS later
  const nodeStyle = {
      border: 'none', 
      borderRadius: '4px',
      padding: 0, 
      background: 'white',
      width: nodeWidth,
      fontSize: '0.9em',
      // boxShadow: '0 1px 3px rgba(0,0,0,0.1)' // Remove shadow
  };

  const titleStyle = {
      fontWeight: 'bold',
      display: 'block',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      padding: '2px 4px', 
      margin: 0 // Explicitly remove margin
  };

  const detailStyle = {
      fontSize: '0.85em',
      color: '#555',
      margin: 0, // Ensure no margin
      padding: '1px 4px' 
  };

   const descriptionStyle = {
      margin: 0, // Ensure no margin
      fontSize: '0.8em',
      color: '#666',
      padding: '1px 4px'
  };

  const handleStyle = {
      width: 8,
      height: 8,
      // background: '#555', // Optional: style the handle dot
  };

  return (
    <div style={nodeStyle}>
      {/* Target Handle (Left Middle) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left-target" // Unique ID for this handle
        style={handleStyle}
      />
      
      {/* Content Wrapper - Apply text align here */} 
      <div style={{ textAlign: 'left' }}>
        {/* Always show Title */} 
        <strong style={titleStyle}>
            {(displayMode === 'idAndTitle' || displayMode === 'full') ? `${itemData.id}: ` : ''}{itemData.title}
        </strong>
        
        {/* Show Type/Unit only in full mode */} 
        {displayMode === 'full' && domain === 'Parameter' && (itemData.unit || itemData.valueType) && (
            <p style={detailStyle}>
                {itemData.valueType && `Type: ${itemData.valueType}`}{itemData.unit && itemData.valueType && ', '}{itemData.unit && `Unit: ${itemData.unit}`}
            </p>
        )}
        {displayMode === 'full' && domain === 'Functions' && itemData.functionType && (
            <p style={detailStyle}>Type: {itemData.functionType}</p>
        )}
        
        {/* Show Description only in full mode */} 
        {displayMode === 'full' && itemData.description && 
          <p style={descriptionStyle}>{itemData.description}</p>
        }
      </div>
      
      {/* Source Handle (Right Middle) */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right-source" // Unique ID for this handle
        style={handleStyle}
      />
    </div>
  );
});

export default CustomNode; 