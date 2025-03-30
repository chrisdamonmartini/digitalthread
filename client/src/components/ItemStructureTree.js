import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import './ItemStructureTree.css';
import { FaChevronRight, FaChevronDown, FaFolder, FaFolderOpen, FaPen, FaTrash, FaInfo } from 'react-icons/fa';

// Enhanced ItemStructureTree component that handles multiple data formats
const ItemStructureTree = forwardRef(({ itemStructure, onDelete, onRename }, ref) => {
  // Track which nodes are expanded
  const [expandedNodes, setExpandedNodes] = useState({});
  // Track which node is being renamed
  const [editingNode, setEditingNode] = useState(null);
  // Track the new name being entered
  const [newTitle, setNewTitle] = useState('');
  // Track which node has properties expanded
  const [expandedProperties, setExpandedProperties] = useState({});
  
  // For debugging
  useEffect(() => {
    console.log("ItemStructureTree received data:", itemStructure);
  }, [itemStructure]);
  
  // Initialize root node as expanded when component mounts or data changes
  useEffect(() => {
    if (itemStructure && itemStructure.id) {
      setExpandedNodes(prev => ({
        ...prev,
        [itemStructure.id]: true
      }));
    }
  }, [itemStructure]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    expandAll: () => {
      // Collect all node IDs in the structure
      const collectNodeIds = (node, ids = []) => {
        if (!node) return ids;
        ids.push(node.id);
        if (node.children && node.children.length > 0) {
          node.children.forEach(child => collectNodeIds(child, ids));
        }
        return ids;
      };
      
      // Normalize data first
      const normalizedData = normalizeData(itemStructure);
      
      // Get all node IDs
      const allNodeIds = collectNodeIds(normalizedData);
      
      // Set all nodes to expanded
      const newExpandedState = {};
      allNodeIds.forEach(id => {
        newExpandedState[id] = true;
      });
      
      setExpandedNodes(newExpandedState);
      console.log('Expanded all nodes programmatically:', allNodeIds.length);
    }
  }));
  
  // Toggle expansion state of a node
  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };
  
  // Toggle property expansion
  const toggleProperties = (nodeId) => {
    setExpandedProperties(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };
  
  // Start renaming a node
  const startRename = (item) => {
    setEditingNode(item.id);
    setNewTitle(item.title || '');
  };
  
  // Finish renaming and call parent handler
  const finishRename = () => {
    if (editingNode && newTitle && newTitle.trim() !== '') {
      onRename(editingNode, newTitle);
    }
    setEditingNode(null);
    setNewTitle('');
  };
  
  // Cancel rename operation
  const cancelRename = () => {
    setEditingNode(null);
    setNewTitle('');
  };

  // Normalize data structure to a common format
  const normalizeData = (data) => {
    // If data is null or undefined, return null
    if (!data) return null;
    
    // Check if this is the new format (with children array)
    if (data.children !== undefined) {
      return data;
    }
    
    // Handle old format (with HAS_CHILD array)
    const result = {
      id: data.id || '',
      title: data.title || data.id || '',
      type: data.labels && data.labels[0] || 'Unknown',
      children: [],
      properties: { ...data }
    };
    
    // Process HAS_CHILD relationships if they exist
    if (data.HAS_CHILD && Array.isArray(data.HAS_CHILD) && data.HAS_CHILD.length > 0) {
      result.children = data.HAS_CHILD.map(child => normalizeData(child));
    }
    
    return result;
  };

  // Get appropriate icon based on node type
  const getNodeTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'mission':
        return 'M';
      case 'scenario':
      case 'scenarios':
        return 'S';
      case 'requirement':
        return 'R';
      case 'function':
      case 'functions':
        return 'F';
      case 'parameter':
        return 'P';
      default:
        return 'I';
    }
  };

  // Recursively render a node and its children
  const renderNode = (item, depth = 0) => {
    if (!item) return null;
    
    const { id, title, type, children = [], properties = {} } = item;
    const hasChildren = children && children.length > 0;
    const isExpanded = expandedNodes[id];
    const arePropertiesExpanded = expandedProperties[id];
    
    // Extract key properties for display
    let keyProperties = [];
    if (properties) {
      if (properties.description) {
        keyProperties.push(['Description', properties.description]);
      }
      if (properties.createdAt) {
        keyProperties.push(['Created', typeof properties.createdAt === 'object' 
          ? 'Date object' 
          : new Date(properties.createdAt).toLocaleString()]);
      }
      if (properties.programType) {
        keyProperties.push(['Program Type', properties.programType]);
      }
    }
    
    // Determine CSS classes based on depth and expansion
    const nodeClasses = `tree-node depth-${depth} ${hasChildren ? 'has-children' : ''} ${isExpanded ? 'expanded' : ''}`;
    
    return (
      <div key={id} className={nodeClasses}>
        <div className="node-header">
          {/* Expand/collapse control */}
          <span 
            className={`expand-control ${hasChildren ? 'expandable' : 'empty'}`}
            onClick={() => hasChildren && toggleNode(id)}
          >
            {hasChildren 
              ? isExpanded ? <FaChevronDown /> : <FaChevronRight />
              : <span className="node-dot"></span>}
          </span>
          
          {/* Node icon and title */}
          <div className="node-icon">
            {isExpanded ? <FaFolderOpen /> : <FaFolder />}
          </div>
          
          <div className="node-title">
            {editingNode === id ? (
              <div className="rename-controls">
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && finishRename()}
                  autoFocus
                />
                <button className="small-button save" onClick={finishRename}>✓</button>
                <button className="small-button cancel" onClick={cancelRename}>✕</button>
              </div>
            ) : (
              <>
                <span className={`node-type ${(type || '').toLowerCase()}`}>
                  {getNodeTypeIcon(type)}
                </span>
                <span className="title">{title || id}</span>
                <span className="node-id">{id}</span>
              </>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="node-actions">
            <button 
              className="small-button info" 
              onClick={() => toggleProperties(id)}
              title={arePropertiesExpanded ? "Hide details" : "Show details"}
            >
              <FaInfo />
            </button>
            <button 
              className="small-button rename" 
              onClick={() => startRename(item)}
              title="Rename item"
            >
              <FaPen />
            </button>
            <button 
              className="small-button delete" 
              onClick={() => onDelete(id)}
              title="Delete item"
            >
              <FaTrash />
            </button>
          </div>
        </div>
        
        {/* Properties section when expanded */}
        {arePropertiesExpanded && (
          <div className="node-properties">
            <div className="property node-id-property">
              <span className="property-name">ID:</span>
              <span className="property-value">{id}</span>
            </div>
            
            <div className="property node-type-property">
              <span className="property-name">Type:</span>
              <span className="property-value">{type || 'Unknown'}</span>
            </div>
            
            {/* Display key properties */}
            {keyProperties.map(([key, value]) => (
              <div key={key} className="property">
                <span className="property-name">{key}:</span>
                <span className="property-value">
                  {typeof value === 'object' 
                    ? JSON.stringify(value) 
                    : String(value)
                  }
                </span>
              </div>
            ))}
            
            {/* Type-specific child IDs */}
            {Object.entries(properties).filter(([key]) => 
              key.includes('childIds') || 
              key.includes('Child') || 
              key.endsWith('Ids')
            ).map(([key, value]) => (
              <div key={key} className="property child-ids">
                <span className="property-name">{key}:</span>
                <span className="property-value">
                  {Array.isArray(value) 
                    ? value.length > 0 
                      ? value.join(', ')
                      : '(empty array)' 
                    : String(value)
                  }
                </span>
              </div>
            ))}
          </div>
        )}
        
        {/* Children section when expanded */}
        {isExpanded && hasChildren && (
          <div className="children-container">
            {children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // If structure is empty
  if (!itemStructure || (Object.keys(itemStructure).length === 0)) {
    return (
      <div className="empty-tree">
        <div className="empty-tree-message">
          No structure data available
        </div>
      </div>
    );
  }

  // Normalize data to a consistent format
  const normalizedData = normalizeData(itemStructure);

  return (
    <div className="item-structure-tree">
      {renderNode(normalizedData, 0)}
    </div>
  );
});

export default ItemStructureTree; 