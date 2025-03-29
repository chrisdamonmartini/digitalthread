import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, { ReactFlowProvider, Background, Controls, useNodesState, useEdgesState, MarkerType } from 'reactflow'; // Import React Flow components
import 'reactflow/dist/style.css'; // Import default styles

import './App.css';
import CustomNode from './components/CustomNode'; // Import CustomNode
import ControlPanel from './components/ControlPanel'; // Import ControlPanel

const API_URL = 'http://localhost:3001/api';

// Helper to determine the relationship type 
function getRelationshipType(sourceDomain, targetDomain) {
    if (sourceDomain === 'Mission' && targetDomain === 'Scenario') return 'DRIVES';
    if (sourceDomain === 'Scenario' && targetDomain === 'Requirements') return 'REQUIRES';
    if (sourceDomain === 'Requirements' && targetDomain === 'Parameter') return 'DEFINES'; // Added
    if (sourceDomain === 'Parameter' && targetDomain === 'Functions') return 'INPUT_TO'; // Added
    // Add other relationship types as domains are added
    console.warn(`No relationship type defined for ${sourceDomain} -> ${targetDomain}`);
    return 'RELATES_TO'; 
}

function AppContent() { 
  // --- State --- 
  const [missions, setMissions] = useState([]);
  const [isLoadingMissions, setIsLoadingMissions] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false); 
  const [scenarios, setScenarios] = useState([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);
  const [requirements, setRequirements] = useState([]);
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(true);
  const [parameters, setParameters] = useState([]);
  const [isLoadingParameters, setIsLoadingParameters] = useState(true);
  const [functions, setFunctions] = useState([]);
  const [isLoadingFunctions, setIsLoadingFunctions] = useState(true);
  
  // State for individual Add forms - MOVED to ControlPanel or passed differently
  // const [newMissionTitle, setNewMissionTitle] = useState('');
  // ... etc for all domains ...
  
  // Shared state for Bulk Generate form
  const [numMissions, setNumMissions] = useState(10); 
  const [minSubMissions, setMinSubMissions] = useState(4); 
  const [maxSubMissions, setMaxSubMissions] = useState(8); 

  // Config, Linking, Messages State
  const [appConfig, setAppConfig] = useState(null); 
  const [localDomainOrder, setLocalDomainOrder] = useState([]); 
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
  const [configDirty, setConfigDirty] = useState(false); 
  const [linkingState, setLinkingState] = useState({ fromId: null, fromDomain: null });
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [nodeDisplayMode, setNodeDisplayMode] = useState('titleOnly');

  // React Flow State
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  // ... (useEffect for successMessage) ...
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // --- Data Fetching --- 
  const fetchConfig = useCallback(async () => {
    setIsLoadingConfig(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/config`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setAppConfig(data);
      setLocalDomainOrder(data.domainOrder || []);
      setConfigDirty(false);
    } catch (e) {
      console.error("Error fetching config:", e);
      setError('Failed to load application configuration.');
      setAppConfig({}); 
      setLocalDomainOrder([]);
    } finally {
      setIsLoadingConfig(false);
    }
  }, []); // Empty dependency array

  const fetchMissions = useCallback(async () => {
    setIsLoadingMissions(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/missions`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setMissions(data);
    } catch (e) {
      console.error("Error fetching missions:", e);
      setError('Failed to load missions.');
    } finally {
      setIsLoadingMissions(false);
    }
  }, []); // Empty dependency array

  const fetchScenarios = useCallback(async () => {
    setIsLoadingScenarios(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/scenarios`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setScenarios(data);
    } catch (e) {
      console.error("Error fetching scenarios:", e);
      setError('Failed to load scenarios.');
    } finally {
      setIsLoadingScenarios(false);
    }
  }, []); // Empty dependency array

  const fetchRequirements = useCallback(async () => {
    setIsLoadingRequirements(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/requirements`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setRequirements(data);
    } catch (e) {
      console.error("Error fetching requirements:", e);
      setError('Failed to load requirements.');
    } finally {
      setIsLoadingRequirements(false);
    }
  }, []); // Empty dependency array

  // --- Fetch Parameters --- 
  const fetchParameters = useCallback(async () => {
    setIsLoadingParameters(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/parameters`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setParameters(data);
    } catch (e) {
      console.error("Error fetching parameters:", e);
      setError('Failed to load parameters.');
    } finally {
      setIsLoadingParameters(false);
    }
  }, []); // Empty dependency array

  // --- Fetch Functions --- 
  const fetchFunctions = useCallback(async () => {
    setIsLoadingFunctions(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/functions`); // Use plural path
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setFunctions(data);
    } catch (e) {
      console.error("Error fetching functions:", e);
      setError('Failed to load functions.');
    } finally {
      setIsLoadingFunctions(false);
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    // Fetch all data initially
    Promise.all([
       fetchConfig(),
       fetchMissions(),
       fetchScenarios(),
       fetchRequirements(),
       fetchParameters(),
       fetchFunctions()
    ]).catch(err => {
       console.error("Error during initial data fetch:", err);
       // Handle collective error if needed
    });
  }, []); // Empty array: Run only once on mount

  // --- useEffect to Calculate Nodes and Edges --- 
  useEffect(() => {
    if (isLoadingConfig || isLoadingMissions || isLoadingScenarios || isLoadingRequirements || isLoadingParameters || isLoadingFunctions || !appConfig) return;

    console.log("Calculating nodes and edges with styled Parent Grouping...");

    const newNodes = [];
    const newEdges = [];
    // Layout parameters
    const columnStartX = 50;    
    const parentPadding = 20; 
    const parentTitleHeight = 30; // Reduced height for title area inside parent
    const columnWidth = 300;    
    const nodeWidth = columnWidth - (parentPadding * 2); 
    const columnGap = 60;       
    const nodeHeight = 60;      // Height of item nodes 
    const nodeGapY = 0;         // No gap between items
    const indentX = 30;         
    const topLevelGapY = 0;    // No gap between top-level items
    
    const itemMaps = {
        Mission: new Map(missions.map(item => [item.id, item])),
        Scenario: new Map(scenarios.map(item => [item.id, item])),
        Requirements: new Map(requirements.map(item => [item.id, item])),
        Parameter: new Map(parameters.map(item => [item.id, item])),
        Functions: new Map(functions.map(item => [item.id, item])),
    };
    const childIdSets = {
        Mission: new Set(missions.flatMap(item => item.childMissionIds || [])),
        Scenario: new Set(scenarios.flatMap(item => item.childScenarioIds || [])),
        Requirements: new Set(requirements.flatMap(item => item.childRequirementIds || [])),
        Parameter: new Set(parameters.flatMap(item => item.childParameterIds || [])),
        Functions: new Set(functions.flatMap(item => item.childFunctionIds || [])),
    };

    let currentColumnX = columnStartX;

    localDomainOrder.forEach((domainName) => {
        const itemMap = itemMaps[domainName];
        const childIdSet = childIdSets[domainName];
        if (!itemMap) return; 

        // --- Calculate height needed for items --- 
        let totalContentHeight = 0;
        const topLevelItems = Array.from(itemMap.values()).filter(item => !childIdSet?.has(item.id));
        const calculateBranchHeight = (itemId) => {
            const item = itemMap.get(itemId);
            if (!item) return 0;
            
            let currentBranchHeight = nodeHeight; // Start with current node height
            const childIdKey = `child${domainName.replace(/\s+/g, '')}Ids`;
            const childIds = item[childIdKey] || [];
            
            childIds.forEach(childId => {
                currentBranchHeight += calculateBranchHeight(childId); // Add child height (nodeGapY is 0)
            });
            return currentBranchHeight;
        };
        topLevelItems.forEach(topItem => { totalContentHeight += calculateBranchHeight(topItem.id); });
        
        const parentHeight = parentTitleHeight + totalContentHeight + (parentPadding * 2);
        const parentNodeId = `domain-${domainName.replace(/\s+/g, '-')}`;
        const parentX = currentColumnX;
        const parentY = 0; 

        // --- 1. Add Parent Node --- 
        newNodes.push({
          id: parentNodeId,
          type: 'group', // Can be default or group
          position: { x: parentX, y: parentY },
          data: { label: null }, 
          style: { 
              width: columnWidth, 
              height: parentHeight,
              backgroundColor: 'rgba(245, 245, 245, 0.8)', // Light background for container
              border: '1px solid #ccc',
              borderRadius: '8px',
              // Padding is visual, children are positioned absolutely relative to parent origin
          },
          zIndex: 0 // Ensure parent is behind children and title
        });

        // --- 2. Add Title Node (Positioned inside parent) ---
        newNodes.push({
          id: `title-${parentNodeId}`,
          parentNode: parentNodeId, // Make title part of the group
          // extent: 'parent', // Title shouldn't be dragged anyway
          draggable: false,
          selectable: false,
          position: { x: parentPadding, y: parentPadding / 2 }, // Position inside parent top
          data: { label: domainName },
          style: { 
              width: nodeWidth,
              fontWeight: 'bold', 
              fontSize: '1.2em', 
              color: '#333',
              textAlign: 'center',
              borderBottom: '1px solid #ddd', 
              paddingBottom: '5px', 
              backgroundColor: 'transparent', // Transparent background
              zIndex: 1 // Above parent bg, below items
          }
        });

        let currentRelativeY = parentTitleHeight + parentPadding; // Starting Y *inside* the parent

        // --- 3. Recursive function to position CHILD nodes --- 
        const processNodeAndChildren = (itemId, parentNodeId, relativeXBase, startY, depth) => {
            const item = itemMap.get(itemId);
            if (!item) return { yOffset: 0 };

            const nodeX = relativeXBase + (depth * indentX); 
            const nodeY = startY; 
            
            newNodes.push({
                id: item.id,
                parentNode: parentNodeId, // Associate with parent 
                extent: 'parent', // Constrain to parent bounds
                position: { x: nodeX, y: nodeY }, // Position relative to parent
                type: 'custom',
                data: { itemData: item, domain: domainName, displayMode: nodeDisplayMode },
                zIndex: 2 // Ensure items are above parent and title
            });

            let cumulativeYOffset = nodeHeight; // Node's own height

            const childIdKey = `child${domainName.replace(/\s+/g, '')}Ids`;
            const childIds = item[childIdKey] || [];
            if (childIds.length > 0) {
                 childIds.forEach(childId => {
                     const { yOffset: childBranchHeight } = processNodeAndChildren(
                         childId, parentNodeId, relativeXBase, startY + cumulativeYOffset, depth + 1
                     );
                     cumulativeYOffset += childBranchHeight; // Add child height (nodeGapY is 0)
                 });
            }
            return { yOffset: cumulativeYOffset };
        };

        // --- 4. Process top-level items --- 
        topLevelItems.forEach(topItem => {
             const { yOffset: branchHeight } = processNodeAndChildren(topItem.id, parentNodeId, parentPadding, currentRelativeY, 0);
             currentRelativeY += branchHeight; // Move Y down
        });

        // --- 5. Calculate Inter-domain Edges (uses currentItemMap) --- 
        const itemsInThisColumn = Array.from(itemMap.values());
        itemsInThisColumn.forEach((item) => {
            const sourceId = item.id;
            let targetIds = [];
            if (domainName === 'Mission') targetIds = item.drivenScenarioIds || [];
            else if (domainName === 'Scenario') targetIds = item.requiredRequirementIds || [];
            else if (domainName === 'Requirements') targetIds = item.definedParameterIds || [];
            else if (domainName === 'Parameter') targetIds = item.inputToFunctionIds || [];
            
            targetIds.forEach(targetId => {
                 const edgeType = getRelationshipType(domainName, localDomainOrder[localDomainOrder.indexOf(domainName) + 1]);
                 newEdges.push({
                     id: `${sourceId}-${edgeType}-${targetId}`,
                     source: sourceId, 
                     target: targetId, 
                     sourceHandle: 'right-source',
                     targetHandle: 'left-target',
                     type: 'smoothstep', 
                     animated: true,
                     style: { strokeWidth: 2, stroke: '#007bff' },
                     markerEnd: { 
                         type: MarkerType.ArrowClosed, 
                         width: 15, 
                         height: 15,
                         color: '#007bff' 
                     },
                     zIndex: 5 // Add zIndex to render edges above nodes
                 });
            });
        });

        currentColumnX += columnWidth + columnGap;
    }); // End of localDomainOrder.forEach

    console.log(`Calculated ${newNodes.length} nodes (Parents, Titles, Items).`);
    console.log(`Calculated ${newEdges.length} edges (Inter-domain only).`);
    setNodes(newNodes);
    setEdges(newEdges);

}, [ // Dependencies (Ensure all external variables used are listed)
    missions, scenarios, requirements, parameters, functions,
    localDomainOrder, appConfig, nodeDisplayMode,
    isLoadingConfig, isLoadingMissions, isLoadingScenarios, isLoadingRequirements, isLoadingParameters, isLoadingFunctions,
    setNodes, setEdges
]);

  // --- Add Item Handler (Generic - To be passed to ControlPanel) ---
  const handleAddItem = useCallback(async (event, domainName, itemData) => {
    event.preventDefault();
    // Basic validation (can be enhanced in ControlPanel or here)
    if (!itemData || !itemData.title?.trim()) {
        alert(`Please enter a title for the new ${domainName}.`);
        return;
    }

    let apiPath = domainName.toLowerCase().replace(/\s+/g, '');
    if (domainName === 'Mission') apiPath = 'missions';
    else if (domainName === 'Scenario') apiPath = 'scenarios';
    else if (domainName === 'Requirements') apiPath = 'requirements';
    else if (domainName === 'Parameter') apiPath = 'parameters';
    else if (domainName === 'Functions') apiPath = 'functions';
    else { console.error('Unknown domain for add:', domainName); return; }

    const apiUrl = `${API_URL}/${apiPath}`;
    let setIsLoading, refreshFunc;
    // Map domain to specific loading state setter and refresh function
    if (domainName === 'Mission') { setIsLoading = setIsLoadingMissions; refreshFunc = fetchMissions; }
    else if (domainName === 'Scenario') { setIsLoading = setIsLoadingScenarios; refreshFunc = fetchScenarios; }
    else if (domainName === 'Requirements') { setIsLoading = setIsLoadingRequirements; refreshFunc = fetchRequirements; }
    else if (domainName === 'Parameter') { setIsLoading = setIsLoadingParameters; refreshFunc = fetchParameters; }
    else if (domainName === 'Functions') { setIsLoading = setIsLoadingFunctions; refreshFunc = fetchFunctions; }
    else { return; } // Should not happen

    setIsLoading(true); setError(null);
    try {
        const response = await fetch(apiUrl, { 
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(itemData) // Send the data collected by ControlPanel
        });
        if (!response.ok) { 
            const err = await response.json().catch(()=>{}); 
            throw new Error(err?.error || `HTTP ${response.statusText}`); 
        }
        // No need to clear form state here, ControlPanel can handle that if needed
        if (refreshFunc) await refreshFunc();
    } catch (e) { 
        console.error(`Err add ${domainName}:`, e);
        setError(`Failed to add ${domainName}: ${e.message}`);
    } finally { 
        setIsLoading(false); 
    }
  }, [fetchMissions, fetchScenarios, fetchRequirements, fetchParameters, fetchFunctions]); // Add all fetch functions

  // --- Bulk Generate Handler ---
  const handleBulkGenerate = useCallback(async (event, domainName) => {
    // ... (logic remains largely the same, need to update API path check and refresh logic)
    event.preventDefault();
    if (!domainName) return;
    
    let apiPathSegment = domainName.toLowerCase().replace(/\s+/g, '');
    let refreshFunction = null;

    // Map domain name to API path and refresh function
    switch(domainName) {
        case 'Mission': 
            apiPathSegment = 'missions'; 
            refreshFunction = fetchMissions;
            break;
        case 'Scenario': 
            apiPathSegment = 'scenarios'; 
            refreshFunction = fetchScenarios;
            break;
        case 'Requirements': 
            apiPathSegment = 'requirements'; 
            refreshFunction = fetchRequirements;
            break;
        case 'Parameter': 
            apiPathSegment = 'parameters'; 
            refreshFunction = fetchParameters;
            break;
        case 'Functions': // Added
            apiPathSegment = 'functions'; 
            refreshFunction = fetchFunctions;
            break;
        // Add other cases here...
        default: 
            console.error(`API path segment unknown for domain: ${domainName}`);
            setError(`Cannot determine API path for domain: ${domainName}`);
            return;
    }
        
    if (numMissions <= 0 || minSubMissions < 0 || maxSubMissions < minSubMissions) {
        alert('Please enter valid numbers for generation.'); return;
    }
    setIsGenerating(true); setError(null);
    try {
      const apiUrl = `${API_URL}/${apiPathSegment}/bulk-generate`; 
      console.log(`Calling bulk generate: ${apiUrl}`);

      const response = await fetch(apiUrl, { 
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ count: numMissions, minSubs: minSubMissions, maxSubs: maxSubMissions }),
      });

      const resultData = await response.json();
      if (!response.ok) {
        throw new Error(resultData.error || `HTTP error! status: ${response.status}`);
      }
      
      console.log(`Bulk generation successful for ${domainName}:`, resultData.message);
      setSuccessMessage(resultData.message || `Bulk generated ${domainName}s.`);

      // Call the correct refresh function
      if (refreshFunction) await refreshFunction();

    } catch (e) {
      console.error(`Error bulk generating ${domainName}s:`, e);
      setError(`Failed to bulk generate ${domainName}s: ${e.message}`);
    } finally {
      setIsGenerating(false); 
    }
  }, [numMissions, minSubMissions, maxSubMissions, fetchMissions, fetchScenarios, fetchRequirements, fetchParameters, fetchFunctions]); // Add fetchFunctions dependency

  // --- Config Update Logic --- 
  const updateConfigOnBackend = async (configUpdate) => { /* ... */ };
  const handleToggleAdjacentConnections = async (event) => { /* ... */ };
  const moveDomain = (index, direction) => { /* ... */ };
  const handleSaveDomainOrder = async () => { /* ... */ };

  // --- Relationship Logic (Re-adding definitions) --- 
  const startLinking = (fromId, fromDomain) => {
      setLinkingState({ fromId, fromDomain });
      setSuccessMessage(null); // Clear previous success message
      setError(null); // Clear previous error message
      console.log(`Start linking from ${fromDomain} item: ${fromId}`);
  };

  const completeLink = async (toId, toDomain) => {
      if (!linkingState.fromId || !linkingState.fromDomain) return;
      
      const { fromId, fromDomain } = linkingState;
      const relationshipType = getRelationshipType(fromDomain, toDomain);
      
      console.log(`Attempting to link ${fromDomain} (${fromId}) -> ${toDomain} (${toId}) with type ${relationshipType}`);
      setError(null); // Clear previous errors
      setIsUpdatingConfig(true); // Use general updating flag for visual feedback

      try {
          const response = await fetch(`${API_URL}/relationships`, {
              method: 'POST',
              headers: {
                 'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                 fromId,
                 toId,
                 fromDomain,
                 toDomain,
                 relationshipType
              })
          });

          const resultData = await response.json(); // Always try to parse JSON

          if (!response.ok) {
              throw new Error(resultData.error || `HTTP error! status: ${response.status}`);
          }

          console.log('Link created:', resultData);
          setSuccessMessage(resultData.message || 'Link created successfully!'); 
          // Optionally: Refresh data related to the linked items if needed

      } catch (e) {
          console.error("Error creating link:", e);
          setError(`Failed to create link: ${e.message}`);
      } finally {
          setIsUpdatingConfig(false);
          setLinkingState({ fromId: null, fromDomain: null }); // Reset linking state
      }
  };

  const cancelLinking = () => {
      setLinkingState({ fromId: null, fromDomain: null });
      console.log('Linking cancelled');
  };

  // Determine combined loading state 
  const isBusy = isLoadingMissions || isLoadingScenarios || isLoadingRequirements || isLoadingParameters || isLoadingFunctions || isGenerating || isLoadingConfig || isUpdatingConfig;

  // --- Main JSX (Updated) --- 
  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header className="App-header"><h1>Digital Thread Navigator</h1></header>
      
      {/* Render Settings Panel */} 
      <section className="settings-panel">
          <h2>Configuration Settings</h2>
          {isLoadingConfig && <p>Loading configuration...</p>}
          {!isLoadingConfig && appConfig && (
             <div className="config-details">
                 {/* Domain Order UI */} 
                 <div className="config-domain-order"> {/* ... */} </div>
                 {/* Adjacent Connections Toggle UI */} 
                 <div className="config-toggle"> {/* ... */} </div>

                 {/* Node Display Mode Toggle */} 
                 <div className="config-display-mode">
                     <strong>Node Display:</strong>
                     <label><input type="radio" name="displayMode" value="titleOnly" checked={nodeDisplayMode === 'titleOnly'} onChange={(e) => setNodeDisplayMode(e.target.value)} /> Title Only</label>
                     <label><input type="radio" name="displayMode" value="idAndTitle" checked={nodeDisplayMode === 'idAndTitle'} onChange={(e) => setNodeDisplayMode(e.target.value)} /> ID + Title</label>
                     <label><input type="radio" name="displayMode" value="full" checked={nodeDisplayMode === 'full'} onChange={(e) => setNodeDisplayMode(e.target.value)} /> Full Detail</label>
                 </div>
             </div>
          )}
          {error && <p className="error message-box">Error: {error}</p>}
          {successMessage && <p className="success message-box">{successMessage}</p>}
          {linkingState.fromId && (
              <div className="linking-indicator message-box">
                  <span>Linking from {linkingState.fromDomain} ({linkingState.fromId}). Click target item or </span>
                  <button onClick={cancelLinking}>Cancel</button>
              </div>
           )}
      </section>

      {/* Render Control Panel */} 
      <ControlPanel 
          localDomainOrder={localDomainOrder}
          isBusy={isBusy}
          isGenerating={isGenerating}
          onAddItem={handleAddItem} // Pass the generic add handler
          onBulkGenerate={handleBulkGenerate}
          // Pass shared bulk state
          numMissions={numMissions} setNumMissions={setNumMissions} 
          minSubMissions={minSubMissions} setMinSubMissions={setMinSubMissions} 
          maxSubMissions={maxSubMissions} setMaxSubMissions={setMaxSubMissions}
          // Pass individual loading states for Add buttons
          isLoadingMissions={isLoadingMissions} 
          isLoadingScenarios={isLoadingScenarios} 
          isLoadingRequirements={isLoadingRequirements} 
          isLoadingParameters={isLoadingParameters} 
          isLoadingFunctions={isLoadingFunctions}
          // Note: We need a better way to manage Add form state, 
          // ideally within ControlPanel itself or passed more generically.
          // For now, this example assumes ControlPanel manages its own form inputs.
      />

      {/* Render React Flow */} 
      <div className="reactflow-wrapper" style={{ flexGrow: 1, height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes} // *** Pass custom node types ***
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

// New App component wraps AppContent with the Provider
function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
}

export default App;
