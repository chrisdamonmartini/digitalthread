import React, { useState, useEffect } from 'react';
import { fetchContainerData } from '../api';
import "./ItemTypeContainer.css";

function ItemTypeContainer({
  // Data & State Props
  itemType,
  isLoading, // Loading state specific to this item type's data
  isBusy, // Overall busy state for disabling actions
  isGenerating, // Bulk generation state
  linkingState, // { fromId, fromItemType }
  appConfig, // To check allowOnlyAdjacentConnections if needed here
  localItemTypeOrder, // Needed to calculate if this is a target column
  itemTypeIndex, // Index of this item type in the order

  // Handler Function Props
  onAddItem, // Function to call when 'Add' form is submitted
  onBulkGenerate, // Function for bulk generation
  onStartLinking, // Function to initiate linking from an item
  onCompleteLink, // Function to complete linking to an item
  onOpenConfigPanel, // Function to open the container config panel
  
  // Form state props
  formState,
  setFormState
}) {
  const [containerData, setContainerData] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState(null);

  // Determine if this column is a valid target for the current linking operation
  let isTargetColumn = false;
  if (linkingState?.fromId && appConfig) { 
    const fromItemTypeIndex = localItemTypeOrder?.indexOf(linkingState.fromItemType);
    if (appConfig.allowOnlyAdjacentConnections) {
      isTargetColumn = (itemTypeIndex === fromItemTypeIndex + 1);
    } else {
      isTargetColumn = (itemTypeIndex > fromItemTypeIndex);
    }
  }
  const isActiveSourceColumn = linkingState?.fromItemType === itemType;

  // Fetch container data when itemType changes
  useEffect(() => {
    if (!itemType) return;

    const loadContainerData = async () => {
      setLocalLoading(true);
      setError(null);

      try {
        const data = await fetchContainerData(itemType);
        setContainerData(data);
      } catch (err) {
        console.error(`Error loading container data for ${itemType}:`, err);
        setError(`Failed to load data: ${err.message}`);
      } finally {
        setLocalLoading(false);
      }
    };

    loadContainerData();
  }, [itemType]);

  // --- Generate the appropriate add form based on the item type ---
  const renderAddForm = () => {
    if (!formState || !setFormState) return null;

    const handleChange = (field, value) => {
      setFormState(prev => ({
        ...prev,
        [field]: value
      }));
    };

    return (
      <form onSubmit={onAddItem} className="add-item-form">
        <h3>Add New {itemType}</h3>
        
        {/* Title field - common to all item types */}
        <div>
          <label>Title:</label>
          <input 
            type="text" 
            value={formState.title || ''} 
            onChange={(e) => handleChange('title', e.target.value)} 
            required 
            placeholder={`Enter ${itemType} title`} 
            disabled={isBusy}
          />
        </div>
        
        {/* Render item type specific fields */}
        {itemType === 'Parameter' && (
          <>
            <div>
              <label>Unit:</label>
              <input 
                type="text" 
                value={formState.unit || ''} 
                onChange={(e) => handleChange('unit', e.target.value)} 
                placeholder="e.g., kg, m/s" 
                disabled={isBusy}
              />
            </div>
            <div>
              <label>Value Type:</label>
              <select 
                value={formState.valueType || 'number'} 
                onChange={(e) => handleChange('valueType', e.target.value)} 
                disabled={isBusy}
              >
                <option value="number">Number</option>
                <option value="string">String</option>
                <option value="boolean">Boolean</option>
                <option value="range">Range</option>
              </select>
            </div>
          </>
        )}
        
        {itemType === 'Functions' && (
          <div>
            <label>Type:</label>
            <input 
              type="text" 
              value={formState.functionType || ''} 
              onChange={(e) => handleChange('functionType', e.target.value)} 
              placeholder="e.g., Control, Calculation" 
              disabled={isBusy}
            />
          </div>
        )}
        
        {/* Description field - common to all item types */}
        <div>
          <label>Description:</label>
          <textarea 
            value={formState.description || ''} 
            onChange={(e) => handleChange('description', e.target.value)} 
            placeholder="(Optional) Enter description" 
            disabled={isBusy}
          />
        </div>
        
        <button type="submit" disabled={isBusy}>
          {isLoading ? 'Adding...' : `Add ${itemType}`}
        </button>
      </form>
    );
  };

  // --- Handle bulk generation form ---
  const renderBulkGenerateForm = () => {
    if (!formState || !setFormState || !onBulkGenerate) return null;

    const handleChange = (field, value) => {
      setFormState(prev => ({
        ...prev,
        bulk: {
          ...(prev.bulk || {}),
          [field]: value
        }
      }));
    };

    return (
      <form 
        onSubmit={(e) => onBulkGenerate(e, itemType)} 
        className="add-item-form bulk-generate-form"
      >
        <h3>Bulk Generate {itemType}s</h3>
        <div>
          <label>Number of Top-Level:</label>
          <input 
            type="number" 
            value={formState.bulk?.count || 1} 
            onChange={(e) => handleChange('count', parseInt(e.target.value, 10) || 0)} 
            min="1" 
            required 
            disabled={isBusy}
          />
        </div>
        <div>
          <label>Min Sub-Items:</label>
          <input 
            type="number" 
            value={formState.bulk?.minSubItems || 0} 
            onChange={(e) => handleChange('minSubItems', parseInt(e.target.value, 10) || 0)} 
            min="0" 
            required 
            disabled={isBusy}
          />
        </div>
        <div>
          <label>Max Sub-Items:</label>
          <input 
            type="number" 
            value={formState.bulk?.maxSubItems || 0} 
            onChange={(e) => handleChange('maxSubItems', parseInt(e.target.value, 10) || 0)} 
            min={formState.bulk?.minSubItems || 0} 
            required 
            disabled={isBusy}
          />
        </div>
        <button type="submit" disabled={isBusy}>
          {isGenerating ? 'Generating...' : `Generate ${itemType}s`}
        </button>
      </form>
    );
  };

  // --- Render config button ---
  const renderConfigButton = () => {
    if (!onOpenConfigPanel) return null;

    return (
      <button 
        className="config-button" 
        onClick={() => onOpenConfigPanel(itemType)}
        disabled={isBusy}
      >
        Configure Container
      </button>
    );
  };

  // --- Render empty state ---
  const renderEmptyState = () => {
    return (
      <div className="empty-state">
        <h4>No Root Node configured</h4>
        <p>This container has no Root Node to display.</p>
        <button 
          className="empty-state-button" 
          onClick={() => onOpenConfigPanel(itemType)}
          disabled={isBusy}
        >
          Add Your First Root Node
        </button>
      </div>
    );
  };

  // --- Render item list ---
  const renderItems = () => {
    if (!containerData) return null;
    
    const { rootNode, child } = containerData;
    const childIdKey = `child${itemType.replace(/\s+/g, '')}Id`;
    
    // Map of child items by ID for quick lookup
    const childMap = new Map(child.map(item => [item.id, item]));
    
    if (rootNode.length === 0) {
      return renderEmptyState();
    }
    
    return (
      <ul className="item-tree">
        {rootNode.map(node => (
          <li key={node.id} className="root-node">
            <div className="item-card">
              <strong>{node.id}: {node.title}</strong>
              
              {/* Display specific properties based on item type */} 
              {itemType === 'Parameter' && (node.unit || node.valueType) && (
                <p className="item-metadata">
                  {node.valueType && `Type: ${node.valueType}`}{node.unit && node.valueType && ', '}{node.unit && `Unit: ${node.unit}`}
                </p>
              )}
              {itemType === 'Functions' && node.functionType && (
                <p className="item-metadata">Type: {node.functionType}</p>
              )}
              
              {node.description && <p className="item-description">{node.description}</p>}
              
              {/* Link Button */} 
              {!linkingState?.fromId && (
                <button 
                  className="link-button" 
                  onClick={() => onStartLinking(node.id, itemType)} 
                  disabled={isBusy} 
                  title={`Link ${node.id} to next item type`}
                > 
                  Link &rarr;
                </button>
              )}
            </div>
            
            {/* Render child items if any */}
            {node[childIdKey] && node[childIdKey].length > 0 && (
              <ul className="child-items">
                {node[childIdKey].map(childId => {
                  const childItem = childMap.get(childId);
                  if (!childItem) return null;
                  
                  return (
                    <li key={childId} className="child-node">
                      <div className="item-card">
                        <strong>{childItem.id}: {childItem.title}</strong>
                        
                        {/* Display specific properties for child items */}
                        {itemType === 'Parameter' && (childItem.unit || childItem.valueType) && (
                          <p className="item-metadata">
                            {childItem.valueType && `Type: ${childItem.valueType}`}
                            {childItem.unit && childItem.valueType && ', '}
                            {childItem.unit && `Unit: ${childItem.unit}`}
                          </p>
                        )}
                        {itemType === 'Functions' && childItem.functionType && (
                          <p className="item-metadata">Type: {childItem.functionType}</p>
                        )}
                        
                        {childItem.description && <p className="item-description">{childItem.description}</p>}
                        
                        {/* Link Button for child items */} 
                        {!linkingState?.fromId && (
                          <button 
                            className="link-button" 
                            onClick={() => onStartLinking(childItem.id, itemType)} 
                            disabled={isBusy} 
                            title={`Link ${childItem.id} to next item type`}
                          > 
                            Link &rarr;
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>
    );
  };

  // --- Main render ---
  return (
    <section className={`item-type-container ${isTargetColumn ? 'linking-target' : ''} ${isActiveSourceColumn ? 'linking-active' : ''}`}>
      <div className="container-header">
        <h2>{itemType}</h2>
        {renderConfigButton()}
      </div>
      
      {renderAddForm()}
      {renderBulkGenerateForm()}
      
      <div className="item-list">
        {(isLoading || localLoading) && (
          <div className="loading-indicator">Loading...</div>
        )}
        
        {error && (
          <div className="error-message">{error}</div>
        )}
        
        {!isLoading && !localLoading && !error && renderItems()}
      </div>
    </section>
  );
}

export default ItemTypeContainer; 