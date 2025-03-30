import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, { ReactFlowProvider, Background, Controls, useNodesState, useEdgesState, MarkerType, applyNodeChanges, applyEdgeChanges, MiniMap, Panel } from 'reactflow'; // Import React Flow components
import { Routes, Route } from 'react-router-dom'; // Import routing components
import 'reactflow/dist/style.css'; // Import default styles

// Import icons for domain headers
import missionIcon from './icons/typeTarget48.svg'; 
import scenarioIcon from './icons/typeOperation48.svg';
import requirementsIcon from './icons/Requirements.svg';
import parameterIcon from './icons/typeItemRevision48.svg';
import functionsIcon from './icons/typeCaeBoundaryConditionItem48.svg';
import searchIcon from './icons/cmdSearch16.svg'; // Import search icon for the filter box

import './App.css';
import CustomNode from './components/CustomNode'; // Import CustomNode
import AppHeader from './components/AppHeader'; // Import new header
import SettingsPage from './components/SettingsPage'; // Import settings page
import FlowControls from './components/FlowControls'; // Import flow controls
import FilterNode from './components/FilterNode'; // Import the FilterNode component

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

// Main content for the React Flow view
function FlowView() { 
  // --- State needed ONLY for the Flow View --- 
  const [missions, setMissions] = useState([]);
  const [isLoadingMissions, setIsLoadingMissions] = useState(true); 
  const [scenarios, setScenarios] = useState([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);
  const [requirements, setRequirements] = useState([]);
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(true);
  const [parameters, setParameters] = useState([]);
  const [isLoadingParameters, setIsLoadingParameters] = useState(true);
  const [functions, setFunctions] = useState([]);
  const [isLoadingFunctions, setIsLoadingFunctions] = useState(true);
  
  // Re-add config state needed for layout
  const [appConfig, setAppConfig] = useState(null); 
  const [localDomainOrder, setLocalDomainOrder] = useState([]); 
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  
  const [linkingState, setLinkingState] = useState({ fromId: null, fromDomain: null });
  const [error, setError] = useState(null); 
  const [successMessage, setSuccessMessage] = useState(null); 
  const [nodeDisplayMode, setNodeDisplayMode] = useState('idAndTitle'); // 'full', 'idAndTitle', 'titleOnly'
  // Add state for relationship lines toggle
  const [showRelationshipLines, setShowRelationshipLines] = useState(false);
  // Add state for domain icons toggle
  const [showDomainIcons, setShowDomainIcons] = useState(true);

  // Add state for filter text for each domain
  const [domainFilters, setDomainFilters] = useState({});
  const [domainPositions, setDomainPositions] = useState({}); // Store domain positions
  
  // React Flow State
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const nodeTypes = useMemo(() => ({
    custom: CustomNode,
    filter: FilterNode, // Register the FilterNode component
  }), []);

  // --- useEffect for successMessage (Keep for linking feedback) --- 
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // --- Data Fetching (Keep fetch functions) --- 
  const fetchConfig = useCallback(async () => {
    setIsLoadingConfig(true); // Make sure this setter exists
    setError(null);
    try {
      const response = await fetch(`${API_URL}/config`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      // Ensure we set the state variables added back
      setAppConfig(data); 
      setLocalDomainOrder(data.domainOrder || []); 
    } catch (e) {
      console.error("Error fetching config:", e);
      setError('Failed to load application configuration.');
      setAppConfig({}); // Or null, depending on how downstream code handles error
      setLocalDomainOrder([]);
    } finally {
      setIsLoadingConfig(false); // Ensure this setter exists
    }
  }, [setError, setAppConfig, setLocalDomainOrder, setIsLoadingConfig]); // Add setters to dependencies

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
  }, []);

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
  }, []);

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
  }, []);

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
  }, []);

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

  // --- Relationship Logic (Keep for linking interaction) --- 
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
          setLinkingState({ fromId: null, fromDomain: null }); // Reset linking state
      }
  };

  const cancelLinking = () => {
      setLinkingState({ fromId: null, fromDomain: null });
      console.log('Linking cancelled');
  };

  // Function to update filter for a specific domain
  const updateDomainFilter = useCallback((domainId, filterText) => {
    setDomainFilters(prev => ({
      ...prev,
      [domainId]: filterText
    }));
  }, []);

  // Keep track of original domain positions
  const storeDomainPosition = useCallback((nodeId, position) => {
    setDomainPositions(prev => ({
      ...prev,
      [nodeId]: position
    }));
  }, []);

  // --- useEffect to Calculate Nodes and Edges --- 
  useEffect(() => {
    // Check if data is still loading
    if (isLoadingConfig || isLoadingMissions || isLoadingScenarios || isLoadingRequirements || isLoadingParameters || isLoadingFunctions || !appConfig) {
      console.log("Waiting for data to calculate hierarchical layout...");
      setNodes([]);
      setEdges([]);
      return;
    }

    console.log(`Calculating ${showRelationshipLines ? 'nodes and edges' : 'nodes only'} with Parent Containers and Space...`);

    const newNodes = [];
    const newEdges = [];
    
    // Domain-specific configurations including icons and colors
    const domainConfig = {
      'Mission': { icon: missionIcon, color: '#14364F' },
      'Scenario': { icon: scenarioIcon, color: '#14364F' },
      'Requirements': { icon: requirementsIcon, color: '#14364F' },
      'Parameter': { icon: parameterIcon, color: '#14364F' },
      'Functions': { icon: functionsIcon, color: '#14364F' }
    };
    
    // Layout parameters
    const columnStartX = 50;    
    const parentPadding = 15; // Padding inside parent node
    const parentTitleHeight = 25; // Space allocated for the title text itself
    const spaceBelowTitle = 45; // *** Space for filter/icons ***
    const columnWidth = 380; // Width to handle indentation
    const nodeWidth = columnWidth - (parentPadding * 2) - 20; // Reduce a bit for indentation
    const maxIndentation = 4; // Maximum number of indentation levels
    const indentX = Math.min(20, (nodeWidth / maxIndentation)); // Calculate indentation that won't exceed container
    const columnGap = 50;
    
    // Dynamic spacing based on display mode       
    const baseItemHeight = nodeDisplayMode === 'titleOnly' ? 25 : 
                          nodeDisplayMode === 'idAndTitle' ? 30 : 
                          50; // full display mode
    const nodeGapY = nodeDisplayMode === 'titleOnly' ? 0 : 
                    nodeDisplayMode === 'idAndTitle' ? 1 : 
                    2; // Minimal spacing between nodes
    const detailLineHeight = 18; 
    const descriptionLineHeight = 18; 
    const descriptionMaxLines = 2;

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

        // --- Calculate required height for children recursively --- 
        let totalContentHeight = 0;
        const topLevelItems = Array.from(itemMap.values()).filter(item => !childIdSet?.has(item.id));
        
        // Define calculateBranchHeight here so it can access nodeDisplayMode and other constants
        const calculateBranchHeight = (itemId) => {
            const item = itemMap.get(itemId);
            if (!item) return 0;
            
            // Use display mode-specific base height
            let calculatedNodeHeight = baseItemHeight;
            
            // Add extra height for details in full mode
            if (nodeDisplayMode === 'full') {
                if ((domainName === 'Parameter' && (item.unit || item.valueType)) || 
                    (domainName === 'Functions' && item.functionType)) {
                    calculatedNodeHeight += detailLineHeight;
                }
                if (item.description) {
                    const lines = Math.min(descriptionMaxLines, (item.description.length / 30) + 1);
                    calculatedNodeHeight += lines * descriptionLineHeight;
                }
            }
            
            // Calculate height for this branch (node + children)
            let currentBranchHeight = calculatedNodeHeight;
            const childIdKey = `child${domainName.replace(/\s+/g, '')}Ids`;
            const childIds = item[childIdKey] || [];
            
            // Add heights of children with gaps
            if (childIds.length > 0) {
                childIds.forEach((childId, index) => {
                    currentBranchHeight += calculateBranchHeight(childId);
                    // Add gap after each child except the last
                    if (index < childIds.length - 1) {
                        currentBranchHeight += nodeGapY;
                    }
                });
            }
            
            return currentBranchHeight;
        };
        
        // First calculate content height without processing nodes
        if (topLevelItems.length > 0) {
            // Get raw content height
            topLevelItems.forEach((topItem, index) => {
                totalContentHeight += calculateBranchHeight(topItem.id);
                // Add gap after each item (except the last one if we don't want padding at the bottom)
                if (index < topLevelItems.length - 1) {
                    totalContentHeight += nodeGapY;
                }
            });
        }
        
        // Define filter box variables
        const filterBoxHeight = 48; // Increase height by 25% (from 38 to 48)
        const filterBoxPadding = 8;
        const spaceBelowFilter = 10;
        const searchIconSize = 16;
        
        // Modify filter positioning
        const filterBoxWidth = nodeWidth * 0.85; // Increase width from 70% to 85%
        const filterBoxY = parentPadding + parentTitleHeight + 30; // Move down further (from 20 to 30)
        
        // Calculate total parent height needed with padding
        const parentHeight = parentPadding + parentTitleHeight + spaceBelowTitle + 
                             filterBoxHeight + spaceBelowFilter + // Add space for filter
                             totalContentHeight + parentPadding;
        const parentNodeId = `domain-${domainName.replace(/\s+/g, '-')}`;
        const parentX = currentColumnX;
        const parentY = 0; 

        // Get domain-specific configuration
        const domainSpecificConfig = domainConfig[domainName] || {};
        const domainColor = domainSpecificConfig.color || '#14364F'; // Default color if not specified

        // --- 1. Add Parent Node --- 
        newNodes.push({
          id: parentNodeId,
          type: 'default',
          position: { x: parentX, y: parentY },
          data: { label: null }, 
          draggable: true, 
          selectable: false,
          style: { 
              width: columnWidth, 
              height: parentHeight, 
              backgroundColor: 'white',
              border: `1px solid ${domainColor}`, // Use domain-specific color
              borderRadius: '4px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
          },
          zIndex: 0 
        });

        // --- 2. Add Domain Icon (if icons are enabled) ---
        if (showDomainIcons) {
          if (domainSpecificConfig.icon) {
            newNodes.push({
              id: `icon-${parentNodeId}`,
              parentNode: parentNodeId,
              draggable: false,
              selectable: false,
              position: { x: parentPadding, y: parentPadding + 4 }, // Adjust to vertically center with title text
              data: { label: null },
              style: {
                width: 40,
                height: 40,
                backgroundImage: `url(${domainSpecificConfig.icon})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                filter: 'drop-shadow(0 0 0 transparent)', // Remove any filter effects
                zIndex: 1
              }
            });
          }
        }

        // --- 3. Add Title Node (positioned based on icons) ---
        const titleX = showDomainIcons ? parentPadding + 45 : parentPadding;
        const titleWidth = showDomainIcons ? nodeWidth - 45 : nodeWidth;
        
        newNodes.push({
          id: `title-${parentNodeId}`,
          parentNode: parentNodeId, 
          draggable: false,
          selectable: false,
          position: { x: titleX, y: parentPadding },
          data: { label: domainName },
          style: { 
              width: titleWidth,
              fontFamily: "'Segoe UI', sans-serif",
              fontWeight: 'bold',
              fontSize: '1.2em', 
              color: '#333',
              textAlign: 'left',
              paddingBottom: '5px',
              backgroundColor: 'transparent',
              border: 'none', // Remove any border
              outline: 'none', // Add outline: none to ensure no outline is displayed
              zIndex: 1 
          }
        });

        // --- 4. Add Filter Input Box ---
        // Use filterBoxY already defined above
        
        // Add filter input box
        newNodes.push({
          id: `filter-${parentNodeId}`,
          parentNode: parentNodeId,
          draggable: false,
          selectable: false,
          type: 'filter', // Custom filter node type
          position: { x: parentPadding, y: filterBoxY }, // Position at the left edge
          data: { 
            label: '', 
            domainId: parentNodeId,
            updateFilter: updateDomainFilter,
            placeholder: "Filter",
            currentFilter: domainFilters[parentNodeId] || ''
          },
          style: {
            width: filterBoxWidth,
            height: filterBoxHeight - 18, // Match the increased height, adjusting for padding
            fontSize: '0.9em',
            fontFamily: "'Segoe UI', sans-serif",
            zIndex: 10 // Increase zIndex to ensure it's on top
          }
        });
        
        // Add search icon for the filter box - now positioned to align with the middle of the filter box
        newNodes.push({
          id: `search-icon-${parentNodeId}`,
          parentNode: parentNodeId,
          draggable: false,
          selectable: false,
          position: { 
            x: parentPadding + filterBoxWidth + 10, // Moved further right (from +4 to +10)
            y: filterBoxY + ((filterBoxHeight - 18) / 2) - 10 // Move up by 10px for better centering
          },
          data: { label: null },
          style: {
            width: searchIconSize,
            height: searchIconSize,
            backgroundImage: `url(${searchIcon})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            zIndex: 10 // Increase zIndex to ensure it's on top
          }
        });

        // Starting Y for the *items* inside the parent - update to account for filter box
        let startYOffsetForItems = parentPadding + parentTitleHeight + spaceBelowTitle + filterBoxHeight + spaceBelowFilter;

        // --- 5. Recursive function to position CHILD nodes --- 
        const processNodeAndChildren = (itemId, parentNodeId, relativeXBase, startY, depth) => {
            const item = itemMap.get(itemId); 
            if (!item) return { yOffset: 0 };

            // Calculate position, ensuring it doesn't extend beyond container bounds
            const actualIndent = Math.min(depth, maxIndentation) * indentX; // Limit max indentation
            const nodeX = relativeXBase + actualIndent; 
            const nodeY = startY; 
            
            // Check if this node should be filtered out
            const currentFilter = domainFilters[parentNodeId]?.toLowerCase() || '';
            const itemMatchesFilter = !currentFilter || 
                item.id.toLowerCase().includes(currentFilter) ||
                item.title.toLowerCase().includes(currentFilter) ||
                (item.description && item.description.toLowerCase().includes(currentFilter));
            
            if (itemMatchesFilter) {
                newNodes.push({
                    id: item.id,
                    parentNode: parentNodeId,
                    extent: 'parent',
                    position: { x: nodeX, y: nodeY },
                    type: 'custom',
                    data: { 
                        itemData: item, 
                        domain: domainName, 
                        displayMode: nodeDisplayMode,
                        maxContentWidth: nodeWidth - actualIndent // Pass available width to node
                    },
                    style: { 
                        width: nodeWidth,
                        maxWidth: '100%',
                        overflow: 'hidden'
                    },
                    draggable: false,
                    zIndex: 2
                });
            }

            let cumulativeYOffset = baseItemHeight; // Use dynamic baseItemHeight here
            
            const childIdKey = `child${domainName.replace(/\s+/g, '')}Ids`;
            const childIds = item[childIdKey] || [];
            
            // Process each child node recursively
            if (childIds.length > 0) {
                 childIds.forEach(childId => {
                     // Skip processing if parent is filtered out (prevents orphaned children)
                     if (!itemMatchesFilter) return;
                    
                     const { yOffset: childBranchHeight } = processNodeAndChildren(
                         childId, parentNodeId, relativeXBase, startY + cumulativeYOffset + nodeGapY, depth + 1
                     );
                     cumulativeYOffset += childBranchHeight + nodeGapY; // Add gap between nodes
                 });
            }
            
            // Only return the height if this node is visible after filtering
            return { yOffset: itemMatchesFilter ? cumulativeYOffset : 0 };
        };

        // --- 6. Process top-level items --- 
        let currentRelativeY = startYOffsetForItems; 
        topLevelItems.forEach(topItem => {
             const { yOffset: branchHeight } = processNodeAndChildren(topItem.id, parentNodeId, parentPadding, currentRelativeY, 0);
             currentRelativeY += branchHeight + nodeGapY; // Add gap between top-level items
        });

        currentColumnX += columnWidth + columnGap;
    }); // End of localDomainOrder.forEach

    // Calculate relationship edges if they should be shown
    if (showRelationshipLines) {
      localDomainOrder.forEach((domainName) => {
        const itemMap = itemMaps[domainName];
        if (!itemMap) return;
        
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
              animated: false,
              style: { 
                strokeWidth: 3,
                stroke: '#00587c',
              },
              markerEnd: { 
                type: MarkerType.ArrowClosed, 
                width: 15, 
                height: 15, 
                color: '#00587c'
              },
              zIndex: 5
            });
          });
        });
      });
    }

    console.log(`Calculated ${newNodes.length} nodes.`);
    console.log(`Calculated ${newEdges.length} edges (Inter-domain only).`);
    setNodes(newNodes);
    setEdges(newEdges);

  }, [ // Dependencies 
    missions, scenarios, requirements, parameters, functions,
    localDomainOrder, appConfig, nodeDisplayMode, showRelationshipLines, showDomainIcons,
    isLoadingConfig, isLoadingMissions, isLoadingScenarios, isLoadingRequirements, isLoadingParameters, isLoadingFunctions,
    domainFilters, // Add domainFilters as a dependency
    updateDomainFilter, // Add updateDomainFilter as a dependency
    setNodes, setEdges
  ]);

  // Define a function to handle when a node is dragged
  const onNodeDrag = useCallback((event, node) => {
    // Only apply the logic to domain parent nodes
    if (!node.id.startsWith('domain-')) return;

    // Get all domain nodes (parent containers)
    const domainNodes = nodes.filter(n => n.id.startsWith('domain-'));
    
    // Get the current node's dimensions
    const currentNodeWidth = node.style?.width || 380; // Use the default width if not defined
    const currentNodeX = node.position.x;
    
    // Minimum spacing between domains (horizontal)
    const minDomainSpacing = 50; // Match the columnGap value
    
    // Boundaries to keep nodes within visible area
    const minX = 20; // Minimum X position
    
    // Check if node is being dragged outside boundaries
    if (currentNodeX < minX) {
      node.position.x = minX;
    }
    
    // Check distance from current node to all other domain nodes
    let hasCollision = false;
    domainNodes.forEach(otherNode => {
      // Skip the node being dragged
      if (otherNode.id === node.id) return;
      
      const otherNodeWidth = otherNode.style?.width || 380;
      const otherNodeX = otherNode.position.x;
      
      // Calculate horizontal distance between nodes
      const distanceX = currentNodeX - otherNodeX;
      
      // If nodes are getting too close (from either left or right)
      if (Math.abs(distanceX) < (currentNodeWidth + otherNodeWidth)/2 + minDomainSpacing) {
        hasCollision = true;
        // Only reposition if the node is actively being dragged (not during initial layout)
        if (event) {
          // Reposition the node being dragged to maintain minimum spacing
          if (distanceX > 0) {
            // Current node is to the right of other node
            node.position.x = otherNodeX + otherNodeWidth/2 + currentNodeWidth/2 + minDomainSpacing;
          } else {
            // Current node is to the left of other node
            node.position.x = otherNodeX - otherNodeWidth/2 - currentNodeWidth/2 - minDomainSpacing;
          }
        }
      }
    });
    
    // Optional: Snap to grid if there's no collision
    if (!hasCollision) {
      const gridSize = 20; // Snap to every 20px
      node.position.x = Math.round(node.position.x / gridSize) * gridSize;
    }
    
  }, [nodes]);
  
  // Handle when node drag ends
  const onNodeDragStop = useCallback((event, node) => {
    if (node.id.startsWith('domain-')) {
      // Store the final position of the domain
      storeDomainPosition(node.id, { ...node.position });
    }
  }, [storeDomainPosition]);

  // --- Main JSX for Flow View --- 
  return (
    <div className="flow-view-container" style={{ height: '100%' }}>
      {/* React Flow Canvas */} 
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid={true}
        snapGrid={[20, 20]}
      >
        <Background />
        <Controls />
        <MiniMap />
        <Panel position="top-right">
          {/* ... panel content ... */}
        </Panel>
      </ReactFlow>
      
      {/* Flow Controls with Legend and Display Options */}
      <FlowControls 
        nodeDisplayMode={nodeDisplayMode}
        setNodeDisplayMode={setNodeDisplayMode}
        showRelationshipLines={showRelationshipLines}
        setShowRelationshipLines={setShowRelationshipLines}
        showDomainIcons={showDomainIcons}
        setShowDomainIcons={setShowDomainIcons}
      />
    </div>
  );
}

// App component now handles routing and overall layout
function App() {
  return (
    // ReactFlowProvider is needed around components using flow hooks
    <ReactFlowProvider> 
        <div className="App" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <AppHeader />
            <div className="main-content" style={{ flexGrow: 1, overflow: 'auto' }}> { /* Allow content to scroll */}
                <Routes>
                    <Route path="/" element={<FlowView />} />
                    <Route path="/settings" element={<SettingsPage />} />
                </Routes>
            </div>
        </div>
    </ReactFlowProvider>
  );
}

export default App;
