import React, { useState, useEffect } from 'react';
import './ItemStructureTree.css';

// Helper to determine node type icon class
const getNodeIconClass = (labels) => {
    if (!labels || labels.length === 0) return 'default';
    
    const label = labels[0].toLowerCase();
    
    // Map common label names to icon classes
    const labelMappings = {
        'mission': 'mission',
        'scenario': 'scenario',
        'requirement': 'requirement',
        'parameter': 'parameter',
        'function': 'function',
        'logical': 'logical',
        'ebom': 'ebom',
        'simulation': 'simulation',
        'test': 'test'
    };
    
    return labelMappings[label] || 'default';
};

// Recursive component to render each node and its children
const TreeNode = ({ node, onDelete, onRename, level = 0, activeRelType, path = '' }) => {
    const [expanded, setExpanded] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    
    // Safety checks for malformed data
    if (!node || typeof node !== 'object') {
        console.warn('Invalid node data:', node);
        return null;
    }
    
    // Extract relevant properties from the node structure
    const nodeId = node.id || node._id || ''; 
    const title = node.title || node.name || `Node ${nodeId}`; // Use title, name, or fallback
    const labels = node._labels || [];
    const nodeType = getNodeIconClass(labels);
    
    // Get children based on the active relationship type
    let childNodes = [];
    if (activeRelType && node[activeRelType] && Array.isArray(node[activeRelType])) {
        childNodes = node[activeRelType];
    }
    const hasChildren = childNodes.length > 0;

    const handleToggle = (e) => {
        e.stopPropagation();
        setExpanded(!expanded);
    };

    const handleDeleteClick = (e) => {
      e.stopPropagation();
      if (onDelete) {
        onDelete(nodeId);
      }
    };
    
    const handleEditClick = (e) => {
        e.stopPropagation();
        setEditedTitle(title);
        setEditing(true);
    };
    
    const handleSaveEdit = (e) => {
        e.stopPropagation();
        if (onRename && editedTitle && editedTitle !== title) {
            onRename(nodeId, editedTitle);
        }
        setEditing(false);
    };
    
    const handleCancelEdit = (e) => {
        e.stopPropagation();
        setEditing(false);
    };
    
    const handleEditTitleChange = (e) => {
        setEditedTitle(e.target.value);
    };
    
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSaveEdit(e);
        } else if (e.key === 'Escape') {
            handleCancelEdit(e);
        }
    };

    return (
        <li className="tree-node">
            <div className="node-content">
                {hasChildren && (
                    <span className="node-toggle" onClick={handleToggle}>
                        {expanded ? '−' : '+'}
                    </span>
                )}
                {!hasChildren && <span className="node-toggle" style={{ visibility: 'hidden' }}>•</span>}
                
                <span className={`node-icon ${nodeType}`} title={labels.join(', ')}></span>
                
                {editing ? (
                    <div className="edit-container">
                        <input 
                            type="text" 
                            value={editedTitle} 
                            onChange={handleEditTitleChange}
                            onKeyDown={handleKeyDown}
                            className="edit-title-input"
                            autoFocus
                        />
                        <div className="edit-actions">
                            <button 
                                className="save-button" 
                                onClick={handleSaveEdit}
                                title="Save changes"
                            >
                                ✓
                            </button>
                            <button 
                                className="cancel-button" 
                                onClick={handleCancelEdit}
                                title="Cancel"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <span className="node-title" title={title}>{title}</span>
                        
                        {labels.length > 0 && (
                            <span className="node-labels">({labels.join(', ')})</span>
                        )}
                        
                        <div className="node-actions">
                            <button 
                                className="edit-button" 
                                onClick={handleEditClick} 
                                title="Edit Item"
                            >
                                ✎
                            </button>
                            <button 
                                className="delete-button" 
                                onClick={handleDeleteClick} 
                                title="Delete Item"
                            >
                                ✕
                            </button>
                        </div>
                    </>
                )}
            </div>
            
            {hasChildren && expanded && (
                <ul className="children-list">
                    {childNodes.map((childNode, index) => {
                        if (!childNode || typeof childNode !== 'object') {
                            console.warn('Invalid child node data:', childNode);
                            return null;
                        }
                        
                        // Create a unique key that doesn't rely solely on _id
                        const childKey = `${childNode.id || childNode._id || index}-${path}-${index}`;
                        
                        return (
                            <TreeNode 
                                key={childKey} 
                                node={childNode} 
                                onDelete={onDelete}
                                onRename={onRename}
                                level={level + 1}
                                activeRelType={activeRelType}
                                path={`${path}.${index}`}
                            />
                        );
                    })}
                </ul>
            )}
        </li>
    );
};

// Main component to render the tree
const ItemStructureTree = ({ itemStructure, onDelete, onRename }) => {
    // Determine available relationship types in the structure
    const [relationshipTypes, setRelationshipTypes] = useState([]);
    const [activeRelType, setActiveRelType] = useState(null);
    const [error, setError] = useState(null);

    // Effect to analyze the structure and find relationship types
    useEffect(() => {
        try {
            if (!itemStructure) {
                setRelationshipTypes([]);
                setActiveRelType(null);
                return;
            }

            // Safety check for malformed data
            if (typeof itemStructure !== 'object') {
                setError(`Invalid itemStructure data: ${typeof itemStructure}`);
                setRelationshipTypes([]);
                setActiveRelType(null);
                return;
            }

            // Look for array properties that could be relationship types
            const possibleRelTypes = [];
            const nonRelTypes = ['_id', '_labels', 'id', 'title', 'description', 'children']; // Known non-relationship properties

            Object.keys(itemStructure).forEach(key => {
                if (Array.isArray(itemStructure[key]) && !nonRelTypes.includes(key)) {
                    possibleRelTypes.push(key);
                }
            });

            setRelationshipTypes(possibleRelTypes);
            setError(null);
            
            // Select the first relationship type if we have any, or look for a common parent-child type
            if (possibleRelTypes.length > 0) {
                const commonRelTypes = ['HAS_CHILD', 'PARENT_OF', 'CONTAINS', 'SUB_OF', 'CHILD_OF', 'ChildrenOf'];
                
                // First check for HAS_CHILD as seen in the UI
                if (possibleRelTypes.includes('HAS_CHILD')) {
                    setActiveRelType('HAS_CHILD');
                } else {
                    // Try other common relationship types
                    const foundCommonType = possibleRelTypes.find(type => commonRelTypes.includes(type));
                    setActiveRelType(foundCommonType || possibleRelTypes[0]);
                }
            } else {
                setActiveRelType(null);
            }
        } catch (err) {
            console.error("Error analyzing item structure:", err);
            setError(`Error analyzing structure: ${err.message}`);
            setRelationshipTypes([]);
            setActiveRelType(null);
        }
    }, [itemStructure]);

    // Handle invalid data or errors
    if (error) {
        return (
            <div className="error-message">
                {error}
            </div>
        );
    }

    if (!itemStructure) {
        return (
            <div className="empty-tree-message">
                No structure data available.
            </div>
        );
    }

    // If we have relationship types, show the filter
    const showRelTypeFilter = relationshipTypes.length > 1;

    return (
        <div className="item-structure-tree">
            {showRelTypeFilter && (
                <div className="relationship-filter">
                    <label>Relationship Type:</label>
                    <select 
                        value={activeRelType || ''} 
                        onChange={(e) => setActiveRelType(e.target.value)}
                    >
                        {relationshipTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
            )}
            
            <ul className="tree-root">
                <TreeNode 
                    key={`root-${itemStructure.id || itemStructure._id || 'unknown'}`}
                    node={itemStructure} 
                    onDelete={onDelete}
                    onRename={onRename}
                    activeRelType={activeRelType}
                    path="root"
                />
            </ul>
        </div>
    );
};

export default ItemStructureTree; 