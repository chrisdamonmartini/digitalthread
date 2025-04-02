import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import ItemTypeContainer from '../components/ItemTypeContainer';
import ContainerConfigPanel from '../components/ContainerConfigPanel';
import './ContainerView.css';

function ContainerView() {
  const { appConfig, refreshAppData } = useContext(AppContext);
  const [itemTypes, setItemTypes] = useState([]);
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [currentItemType, setCurrentItemType] = useState(null);
  const [formState, setFormState] = useState({});
  const [loadingStates, setLoadingStates] = useState({});
  const [linkingState, setLinkingState] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  // Load the available item types from context
  useEffect(() => {
    if (appConfig && appConfig.itemTypes) {
      setItemTypes(appConfig.itemTypes);
    }
  }, [appConfig]);

  // Handle opening the config panel for a specific item type
  const handleOpenConfigPanel = (itemType) => {
    setCurrentItemType(itemType);
    setIsConfigPanelOpen(true);
  };

  // Handle closing the config panel
  const handleCloseConfigPanel = () => {
    setIsConfigPanelOpen(false);
    setCurrentItemType(null);
    refreshAppData(); // Refresh data when panel closes
  };

  // Handle adding a new item
  const handleAddItem = async (e) => {
    e.preventDefault();
    const itemType = currentItemType || e.target.getAttribute('data-item-type');
    
    if (!itemType || !formState.title) return;
    
    setIsBusy(true);
    setLoadingStates(prev => ({ ...prev, [itemType]: true }));
    
    try {
      const response = await fetch(`/api/item-types/${itemType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState)
      });
      
      if (!response.ok) throw new Error('Failed to add item');
      
      // Clear form and refresh data
      setFormState({});
      refreshAppData();
    } catch (error) {
      console.error('Error adding item:', error);
    } finally {
      setIsBusy(false);
      setLoadingStates(prev => ({ ...prev, [itemType]: false }));
    }
  };

  // Handle bulk generation of items
  const handleBulkGenerate = async (e, itemType) => {
    e.preventDefault();
    if (!itemType || !formState.bulk) return;
    
    setIsBusy(true);
    setLoadingStates(prev => ({ ...prev, [itemType]: true }));
    
    try {
      const response = await fetch(`/api/item-types/${itemType}/bulk-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState.bulk)
      });
      
      if (!response.ok) throw new Error('Failed to generate items');
      
      // Clear bulk form data and refresh
      setFormState(prev => ({ ...prev, bulk: null }));
      refreshAppData();
    } catch (error) {
      console.error('Error generating items:', error);
    } finally {
      setIsBusy(false);
      setLoadingStates(prev => ({ ...prev, [itemType]: false }));
    }
  };

  // Handle starting the linking process
  const handleStartLinking = (itemId, itemType) => {
    setLinkingState({ fromId: itemId, fromItemType: itemType });
  };

  // Handle completing a link between items
  const handleCompleteLink = async (targetId, targetItemType) => {
    if (!linkingState) return;
    
    setIsBusy(true);
    
    try {
      const response = await fetch('/api/item-types/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: linkingState.fromId,
          sourceItemType: linkingState.fromItemType,
          targetId,
          targetItemType
        })
      });
      
      if (!response.ok) throw new Error('Failed to create link');
      
      // Reset linking state and refresh data
      setLinkingState(null);
      refreshAppData();
    } catch (error) {
      console.error('Error creating link:', error);
    } finally {
      setIsBusy(false);
    }
  };

  // Handle cancelling the linking process
  const handleCancelLinking = () => {
    setLinkingState(null);
  };

  return (
    <div className="container-view">
      {/* Top bar with actions */}
      <div className="container-view-header">
        <h1>Container View</h1>
        {linkingState && (
          <div className="linking-controls">
            <span className="linking-message">
              Linking from {linkingState.fromItemType} ({linkingState.fromId})
            </span>
            <button 
              className="cancel-linking-button"
              onClick={handleCancelLinking}
            >
              Cancel Linking
            </button>
          </div>
        )}
      </div>
      
      {/* Main content area with item type containers */}
      <div className="container-view-content">
        {itemTypes.map((itemType, index) => (
          <ItemTypeContainer
            key={itemType}
            itemType={itemType}
            isLoading={loadingStates[itemType] || false}
            isBusy={isBusy}
            linkingState={linkingState}
            appConfig={appConfig}
            localItemTypeOrder={itemTypes}
            itemTypeIndex={index}
            onAddItem={handleAddItem}
            onBulkGenerate={handleBulkGenerate}
            onStartLinking={handleStartLinking}
            onCompleteLink={handleCompleteLink}
            onOpenConfigPanel={handleOpenConfigPanel}
            formState={formState}
            setFormState={setFormState}
          />
        ))}
      </div>
      
      {/* Config panel */}
      <ContainerConfigPanel
        isOpen={isConfigPanelOpen}
        onClose={handleCloseConfigPanel}
        itemType={currentItemType}
      />
    </div>
  );
}

export default ContainerView; 