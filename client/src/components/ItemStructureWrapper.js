import React, { useState, useEffect, useRef } from 'react';
import ItemStructureTree from './ItemStructureTree';
import './ItemStructureTree.css';

/**
 * Wrapper component for handling different item structure data formats
 * This component handles data transformation and visualization
 */
const ItemStructureWrapper = ({ itemData, onDelete, onRename, onRefresh }) => {
  const [structureData, setStructureData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState(null);
  const treeRef = useRef(null);
  
  useEffect(() => {
    const processData = async () => {
      setIsProcessing(true);
      setError(null);
      
      try {
        if (!itemData) {
          setStructureData(null);
          return;
        }
        
        // Process the data to ensure it's in the correct format
        const processedData = transformData(itemData);
        setStructureData(processedData);
      } catch (err) {
        console.error("Error processing structure data:", err);
        setError("Failed to process structure data");
        setStructureData(null);
      } finally {
        setIsProcessing(false);
      }
    };
    
    processData();
  }, [itemData]);
  
  // Transform function to handle different data formats
  const transformData = (data) => {
    // If no data or empty object, return null
    if (!data || Object.keys(data).length === 0) {
      return null;
    }
    
    // If data already has the correct format, return it directly
    if (data.id && (data.children !== undefined || data.type !== undefined)) {
      return data;
    }
    
    // Handle first-generation format (object with item IDs as keys)
    if (typeof data === 'object' && !Array.isArray(data) && !data.id) {
      // Find the root node (there's usually just one key for root)
      const rootId = Object.keys(data)[0];
      const rootNode = data[rootId];
      
      // Create a transformed structure
      return transformNode(rootNode, rootId, data);
    }
    
    // Handle second-generation format (HAS_CHILD arrays)
    if (data.id && data.HAS_CHILD !== undefined) {
      return {
        id: data.id,
        title: data.title || data.id,
        type: data.labels && data.labels[0],
        children: Array.isArray(data.HAS_CHILD) 
          ? data.HAS_CHILD.map(child => transformData(child))
          : [],
        properties: { ...data }
      };
    }
    
    // Fallback for unknown formats
    return {
      id: data.id || 'unknown',
      title: data.title || data.id || 'Unknown Item',
      type: data.labels && data.labels[0] || 'Unknown',
      children: [],
      properties: { ...data }
    };
  };
  
  // Helper function to transform a node and its children recursively
  const transformNode = (node, nodeId, allNodes) => {
    if (!node) return null;
    
    // Create the node structure
    const result = {
      id: nodeId,
      title: node.title || nodeId,
      type: node.labels && node.labels[0] || 'Unknown',
      children: [],
      properties: { ...node }
    };
    
    // Process children if they exist
    if (node.children && typeof node.children === 'object') {
      Object.keys(node.children).forEach(childId => {
        const childNode = transformNode(node.children[childId], childId, allNodes);
        if (childNode) {
          result.children.push(childNode);
        }
      });
    }
    
    // Also check for childIds array (used in some data formats)
    const childIdsProperty = 
      Object.entries(node).find(([key]) => 
        key.endsWith('Ids') || key.includes('childIds') || key.includes('Child')
      );
    
    if (childIdsProperty && Array.isArray(childIdsProperty[1])) {
      childIdsProperty[1].forEach(childId => {
        // Only add if the child exists in allNodes and isn't already in children
        if (allNodes[childId] && !result.children.some(c => c.id === childId)) {
          const childNode = transformNode(allNodes[childId], childId, allNodes);
          if (childNode) {
            result.children.push(childNode);
          }
        }
      });
    }
    
    return result;
  };
  
  const handleExpandAll = () => {
    if (treeRef.current) {
      treeRef.current.expandAll();
    } else {
      console.warn('Tree reference not available');
      
      // Fallback to DOM approach if the ref isn't working
      setTimeout(() => {
        const expandableNodes = document.querySelectorAll('.expand-control.expandable .fa-chevron-right');
        console.log('Found expandable nodes (fallback):', expandableNodes.length);
        
        expandableNodes.forEach(node => {
          node.closest('.expand-control').click();
        });
      }, 100);
    }
  };
  
  if (isProcessing) {
    return <div className="structure-loading">Processing structure data...</div>;
  }
  
  if (error) {
    return <div className="structure-error">{error}</div>;
  }
  
  if (!structureData) {
    return (
      <div className="empty-tree">
        <div className="empty-tree-message">
          No structure data available
        </div>
      </div>
    );
  }
  
  return (
    <div className="item-structure-wrapper">
      <div className="structure-header">
        <h4>
          Structure for: {structureData.title || structureData.id}
          <small>{structureData.type}</small>
        </h4>
        
        <div className="structure-controls">
          <button 
            className="refresh-structure" 
            onClick={onRefresh}
            title="Refresh structure data"
          >
            Refresh
          </button>
          <button 
            className="expand-all" 
            onClick={handleExpandAll}
            title="Expand all nodes"
          >
            Expand All
          </button>
        </div>
      </div>
      
      <ItemStructureTree 
        ref={treeRef}
        itemStructure={structureData} 
        onDelete={onDelete}
        onRename={onRename}
      />
    </div>
  );
};

export default ItemStructureWrapper; 