import React, { useState, useRef, useEffect } from 'react';
import './ConnectorToolbar.css';

const ConnectorToolbar = ({ 
  onStartConnecting,
  onCancelConnecting,
  isConnecting,
  fromNode,
  connectionSuccess = false,
  position = { top: 130, left: 510 }, // Updated default position
  showRelationshipLines = true,
  setShowRelationshipLines = () => {},
  allowOnlyAdjacentConnections = true,
  setAllowOnlyAdjacentConnections = () => {}
}) => {
  const [isDragging, setIsDragging] = useState(false);
  // Initialize toolbarPosition from the position prop
  const [toolbarPosition, setToolbarPosition] = useState({ x: position.left, y: position.top });
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const toolbarRef = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  // Update toolbar position if the prop changes (e.g., window resize)
  useEffect(() => {
    setToolbarPosition({ x: position.left, y: position.top });
  }, [position.top, position.left]);

  // Format node info for display
  const getNodeDisplayInfo = (node) => {
    if (!node) return { id: 'None', domain: 'None' };
    
    // Extract domain and id for cleaner display
    const domain = node.data?.domain || 'Unknown';
    const id = node.id || 'Unknown';
    const title = node.data?.itemData?.title || '';
    const parentId = node.parentNode || 'None';
    
    return { 
      id,
      domain,
      title,
      parentId,
      display: title ? `${id} - ${title}` : id
    };
  };

  const sourceInfo = getNodeDisplayInfo(fromNode);

  // Handle relationship lines toggle with localStorage persistence
  const handleToggleRelationshipLines = (e) => {
    const checked = e.target.checked;
    setShowRelationshipLines(checked);
    localStorage.setItem('showRelationshipLines', JSON.stringify(checked));
  };

  // Handle cross domain connections toggle
  const handleToggleCrossDomainConnections = (e) => {
    const checked = e.target.checked;
    setAllowOnlyAdjacentConnections(!checked);
    localStorage.setItem('allowOnlyAdjacentConnections', JSON.stringify(!checked));
  };

  // Show success message when connection is created
  useEffect(() => {
    if (connectionSuccess) {
      setShowSuccessMessage(true);
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [connectionSuccess]);

  const handleMouseDown = (e) => {
    if (e.target.closest('.connector-button') || 
        e.target.closest('.connection-status') ||
        e.target.closest('.toolbar-controls')) return; // Don't drag when clicking buttons, status, or controls
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - toolbarPosition.x,
      y: e.clientY - toolbarPosition.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;
    
    // Keep toolbar within window bounds
    const toolbar = toolbarRef.current;
    const toolbarWidth = toolbar?.offsetWidth || 350;
    const toolbarHeight = toolbar?.offsetHeight || 50;
    
    const boundedX = Math.max(0, Math.min(window.innerWidth - toolbarWidth, newX));
    const boundedY = Math.max(0, Math.min(window.innerHeight - toolbarHeight, newY));
    
    setToolbarPosition({
      x: boundedX,
      y: boundedY
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
      };
    }
  }, [isDragging]);

  return (
    <div 
      ref={toolbarRef}
      className={`connector-toolbar ${isDragging ? 'dragging' : ''} ${isConnecting ? 'connecting-active' : ''} ${showSuccessMessage ? 'success-state' : ''}`}
      style={{ 
        left: toolbarPosition.x,
        top: toolbarPosition.y
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="toolbar-handle">⋮⋮</div>
      
      <div className="toolbar-content">
        {showSuccessMessage ? (
          <div className="connection-success-message">
            <span className="success-icon">✓</span>
            Connection created successfully!
          </div>
        ) : !isConnecting ? (
          <>
            <button 
              className="connector-button start-connection"
              onClick={onStartConnecting}
              title="Create a new connection between items"
            >
              Start Connection
            </button>
            <div className="toolbar-controls">
              <label className="checkbox-container">
                <input 
                  type="checkbox" 
                  checked={showRelationshipLines} 
                  onChange={handleToggleRelationshipLines}
                />
                <span className="checkmark"></span>
                Show Relationship Lines
              </label>
              <label className="checkbox-container">
                <input 
                  type="checkbox" 
                  checked={!allowOnlyAdjacentConnections} 
                  onChange={handleToggleCrossDomainConnections}
                />
                <span className="checkmark"></span>
                Allow cross-sequence connections
              </label>
            </div>
            <div className="connection-hint">
              Connect items across domains
            </div>
          </>
        ) : (
          <>
            <div className="connection-status">
              <div className="connection-row">
                <span className="label">From:</span>
                <span className="domain-badge" style={{ backgroundColor: getDomainColor(sourceInfo.domain) }}>
                  {sourceInfo.domain}
                </span>
                <span className="item-id" title={sourceInfo.display}>
                  {sourceInfo.display}
                </span>
              </div>
              <div className="connection-row connection-details">
                <span className="label"></span>
                <span className="parent-info">Container: {sourceInfo.parentId}</span>
              </div>
              <div className="connection-row">
                <span className="label">To:</span>
                <span className="status-message">Click on a compatible target item</span>
              </div>
            </div>
            <button 
              className="connector-button cancel-connection"
              onClick={onCancelConnecting}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Helper function to get domain-specific colors
const getDomainColor = (domain) => {
  const domainColors = {
    'Mission': '#14364F',
    'Scenario': '#14364F',
    'Requirements': '#14364F',
    'Parameter': '#14364F',
    'Functions': '#14364F',
    'Unknown': '#777'
  };
  
  return domainColors[domain] || domainColors['Unknown'];
};

export default ConnectorToolbar; 