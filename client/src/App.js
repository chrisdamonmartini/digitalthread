import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactFlow, { ReactFlowProvider, Background, Controls, useNodesState, useEdgesState, MarkerType, applyNodeChanges, applyEdgeChanges, MiniMap, Panel, getBezierPath, getSmoothStepPath, getStraightPath } from 'reactflow'; // Import React Flow components with additional path functions
import { Routes, Route } from 'react-router-dom'; // Import routing components
import 'reactflow/dist/style.css'; // Import default styles

// Import icons for domain headers
import missionIcon from './icons/typeTarget48.svg'; 
import scenarioIcon from './icons/typeOperation48.svg';
import requirementsIcon from './icons/Requirements.svg';
import parameterIcon from './icons/typeItemRevision48.svg';
import functionsIcon from './icons/typeCaeBoundaryConditionItem48.svg';
import searchIcon from './icons/cmdSearch16.svg'; // Import search icon for the filter box
import settingsIcon from './icons/cmdSettings24.svg'; // Import settings icon for domain configuration

import './App.css';
import CustomNode from './components/CustomNode'; // Import CustomNode
import AppHeader from './components/AppHeader'; // Import new header
import SettingsPage from './components/SettingsPage'; // Import settings page
import FlowControls from './components/FlowControls'; // Import flow controls
import FilterNode from './components/FilterNode'; // Import the FilterNode component
import DomainConfigPanel from './components/DomainConfigPanel'; // Import the DomainConfigPanel component
import ConnectorToolbar from './components/ConnectorToolbar';

// API Error Message Component
const APIErrorMessage = ({ error, onRetry }) => {
  // Extract the error message and status
  const errorMsg = error || 'Unknown error occurred';
  const isConnectionError = errorMsg.includes('connection') || 
                           errorMsg.includes('network') || 
                           errorMsg.includes('timed out') ||
                           errorMsg.includes('Failed to fetch');
  const isInitializationError = errorMsg.includes('before initialization') ||
                               errorMsg.includes('Cannot access');
  const isDomainError = errorMsg.includes('domains') || 
                        errorMsg.includes('domain order') || 
                        errorMsg.includes('Domain names');
  
  // Determine potential solutions based on error type
  let possibleSolutions = [];
  
  if (isInitializationError) {
    possibleSolutions = [
      'Refresh the page to completely reload the application',
      'Check that the API server is running at ' + getApiUrl(),
      'Verify the database connection in the server',
      'Try the health check endpoint at ' + getApiUrl() + '/health'
    ];
  } else if (isConnectionError) {
    possibleSolutions = [
      'Check that the API server is running',
      'Verify the database connection in the server',
      'Ensure the API URL is correct',
      'Check for any firewall or network issues'
    ];
  } else if (isDomainError) {
    possibleSolutions = [
      'Ensure each domain container has a valid label',
      'Try clicking on different nodes to create your connection',
      'Check the browser console for more detailed error information'
    ];
  } else {
    possibleSolutions = [
      'Check server logs for more details',
      'Verify your request parameters',
      'Ensure you have the correct permissions'
    ];
  }
  
  return (
    <div className="api-error-message">
      <h3>API Error</h3>
      <p className="error-text">{errorMsg}</p>
      <div className="error-solutions">
        <p><strong>Possible solutions:</strong></p>
        <ul>
          {possibleSolutions.map((solution, idx) => (
            <li key={idx}>{solution}</li>
          ))}
        </ul>
      </div>
      <div className="api-info">
        <p><strong>API URL:</strong> {getApiUrl()}</p>
      </div>
      {onRetry && (
        <button className="retry-button" onClick={onRetry}>
          Retry Connection
        </button>
      )}
    </div>
  );
};

// Update API URL configuration with more robust fallback
const DEFAULT_API_URL = 'http://localhost:3001/api';

// Function to get API URL with fallbacks
const getApiUrl = () => {
  // Check if we have a stored or environment API URL
  const storedApiUrl = localStorage.getItem('apiUrl');
  const envApiUrl = process.env.REACT_APP_API_URL;
  
  // Return the first available URL with priority
  return envApiUrl || storedApiUrl || DEFAULT_API_URL;
};

// Use a function to create API endpoints to allow for dynamic changes
const createApiEndpoint = (path) => {
  return `${getApiUrl()}/${path}`;
};

// Global fetch wrapper with error handling
const fetchWithErrorHandling = async (endpoint, options = {}) => {
  try {
    // Add a timeout to the fetch request (5 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(endpoint, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId); // Clear the timeout if response is received
    
    // Always try to parse JSON, but handle cases where response is not JSON
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
      try {
        // Try to parse as JSON anyway in case content-type is wrong
        data = JSON.parse(data);
      } catch (e) {
        // It's genuinely not JSON, keep as text
      }
    }
    
    if (!response.ok) {
      // Handle HTTP errors
      const error = new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    
    return data;
  } catch (error) {
    // Handle network errors, timeouts, and parsing errors
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    
    // Enhance error with more information if we have it
    if (!error.status) {
      error.message = `Network or server error: ${error.message}`;
    }
    
    // Log the error for debugging
    console.error('API request failed:', error);
    
    // Rethrow to be handled by the calling function
    throw error;
  }
};

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

// Create a custom edge component with right-click menu and color-coded highlighting
const CustomEdge = ({ id, source, target, style, markerEnd, data, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, edgePath }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteIcon, setShowDeleteIcon] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  
  // Calculate the path based on source and target positions if edgePath is not provided
  const calculatedEdgePath = edgePath || getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })[0];

  // Extract relationship type and domains for color
  let displayRelationship = "Relationship";
  let relationshipType = "";
  let sourceDomain = "";
  let targetDomain = "";
  
  if (id) {
    const parts = id.split('-');
    if (parts.length >= 2) {
      relationshipType = parts[1];
      // Format the relationship type for display
      displayRelationship = parts[1].replace(/_/g, ' ').toLowerCase();
    }
    
    // Extract domain information if available
    const sourceNode = document.getElementById(source);
    const targetNode = document.getElementById(target);
    
    if (sourceNode && sourceNode.getAttribute('data-domain')) {
      sourceDomain = sourceNode.getAttribute('data-domain');
    }
    
    if (targetNode && targetNode.getAttribute('data-domain')) {
      targetDomain = targetNode.getAttribute('data-domain');
    }
  }
  
  // Get the appropriate color for this relationship type
  const getRelationshipColor = () => {
    // Map relationship types to colors (these should match your legend)
    switch (relationshipType) {
      case 'DRIVES': return '#3f83f8'; // blue
      case 'REQUIRES': return '#16a34a'; // green
      case 'DEFINES': return '#9333ea'; // purple
      case 'INPUT_TO': return '#f97316'; // orange
      default: return '#6b7280'; // gray for default
    }
  };
  
  const relationshipColor = getRelationshipColor();
  
  // Create a custom colored marker for the line
  const getColoredMarker = () => {
    const markerId = `marker-${id}`;
    return (
      <marker
        id={markerId}
        viewBox="0 0 10 10"
        refX="5"
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill={relationshipColor} />
      </marker>
    );
  };
  
  // Handler for right-click to show delete icon
  const handleContextMenu = (event) => {
    event.preventDefault(); // Prevent the browser's context menu
    event.stopPropagation();
    
    // Hide any existing delete icons first (globally)
    document.querySelectorAll('.edge-delete-icon').forEach(el => {
      if (el.getAttribute('data-edge-id') !== id) {
        el.style.display = 'none';
      }
    });
    
    // Get exact cursor position in ReactFlow space
    const reactFlowBounds = document.querySelector('.react-flow').getBoundingClientRect();
    const x = event.clientX - reactFlowBounds.left;
    const y = event.clientY - reactFlowBounds.top;
    
    // Set position to exact mouse position
    setContextMenuPosition({ x, y });
    
    setShowDeleteIcon(true);
  };
  
  // Handler for delete button click
  const handleDeleteClick = (event) => {
    event.stopPropagation();
    setShowDeleteIcon(false);
    
    // Extract relationship information from edge ID
    const parts = id.split('-');
    if (parts.length < 3) return;
    
    // Call the global function for deleting relationships
    window.handleDeleteRelationship(id);
  };
  
  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only close this specific edge's delete icon
      if (showDeleteIcon) {
        setShowDeleteIcon(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showDeleteIcon]);
  
  return (
    <>
      {/* Add a custom marker with the right color */}
      <defs>
        {getColoredMarker()}
      </defs>
      
      <path
        id={id}
        className="react-flow__edge-path"
        d={calculatedEdgePath}
        style={{
          ...style,
          stroke: relationshipColor,
          strokeWidth: isHovered ? 4 : style?.strokeWidth || 2,
          transition: 'stroke-width 0.2s, stroke 0.2s',
          cursor: 'pointer'
        }}
        markerEnd={`url(#marker-${id})`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onContextMenu={handleContextMenu}
      />
      
      {/* Tooltip on hover - ONLY show relationship type, nothing else */}
      {isHovered && (
        <g>
          <text
            x={(sourceX + targetX) / 2}
            y={(sourceY + targetY) / 2 - 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fill={relationshipColor}
            fontWeight="bold"
            style={{ pointerEvents: 'none' }}
          >
            {displayRelationship.toUpperCase()}
          </text>
        </g>
      )}
      
      {/* Context menu with delete icon - positioned at exact mouse location in ReactFlow space */}
      {showDeleteIcon && (
        <foreignObject
          width={30}
          height={30}
          x={contextMenuPosition.x - 15}
          y={contextMenuPosition.y - 15}
          style={{ 
            overflow: 'visible', 
            zIndex: 1000,
            pointerEvents: 'all' // Make sure it's clickable
          }}
          className="edge-delete-icon"
          data-edge-id={id}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              border: '1px solid #ddd'
            }}
            onClick={handleDeleteClick}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#ff4d4f"/>
            </svg>
          </div>
        </foreignObject>
      )}
    </>
  );
};

// For straight edges
const CustomStraightEdge = (props) => {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;
  
  // Calculate the path for straight edges
  const straightPath = getStraightPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  
  // Extract just the path string from the result
  const edgePath = straightPath[0];
  
  // Explicitly pass the calculated path
  return <CustomEdge {...props} edgePath={edgePath} />;
};

// Add a custom tooltip component for edges
const EdgeTooltip = ({ x, y, label }) => {
  return (
    <div 
      style={{
        position: 'absolute',
        left: x,
        top: y,
        background: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        fontSize: '12px',
        pointerEvents: 'none',
        zIndex: 1000
      }}
    >
      {label}
    </div>
  );
};

// Add a legend component to display relationship types and colors
const RelationshipLegend = () => {
  const relationships = [
    { type: 'DRIVES', label: 'Drives', color: '#3f83f8' },
    { type: 'REQUIRES', label: 'Requires', color: '#16a34a' },
    { type: 'DEFINES', label: 'Defines', color: '#9333ea' },
    { type: 'INPUT_TO', label: 'Input To', color: '#f97316' },
    { type: 'RELATES_TO', label: 'Relates To', color: '#6b7280' }
  ];

  return (
    <div className="relationship-legend">
      <h3>Relationship Types</h3>
      <div className="legend-items">
        {relationships.map(rel => (
          <div key={rel.type} className="legend-item">
            <svg width="50" height="12" style={{ marginRight: '8px' }}>
              <defs>
                <marker
                  id={`marker-legend-${rel.type}`}
                  viewBox="0 0 10 10"
                  refX="5"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={rel.color} />
                </marker>
              </defs>
              <path
                d="M 5,6 L 40,6"
                stroke={rel.color}
                strokeWidth="2.5"
                markerEnd={`url(#marker-legend-${rel.type})`}
              />
            </svg>
            <span className="legend-label">{rel.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

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
  // Add appInitialized state here early in the component
  const [appInitialized, setAppInitialized] = useState(false);
  const [nodeDisplayMode, setNodeDisplayMode] = useState('idAndTitle'); // 'full', 'idAndTitle', 'titleOnly'
  // Add state for relationship lines toggle with localStorage support
  const [showRelationshipLines, setShowRelationshipLines] = useState(() => {
    const saved = localStorage.getItem('showRelationshipLines');
    return saved !== null ? JSON.parse(saved) : true; // Change default to true
  });

  // Save showRelationshipLines preference to localStorage
  useEffect(() => {
    localStorage.setItem('showRelationshipLines', JSON.stringify(showRelationshipLines));
  }, [showRelationshipLines]);

  // Add state for domain icons toggle
  const [showDomainIcons, setShowDomainIcons] = useState(true);
  // Add state for curved vs straight edges with localStorage support
  const [useCurvedEdges, setUseCurvedEdges] = useState(() => {
    const saved = localStorage.getItem('useCurvedEdges');
    return saved !== null ? JSON.parse(saved) : false; // Default to straight lines
  });

  // Save useCurvedEdges preference to localStorage
  useEffect(() => {
    localStorage.setItem('useCurvedEdges', JSON.stringify(useCurvedEdges));
  }, [useCurvedEdges]);

  // Add state for line type with localStorage support
  const [lineType, setLineType] = useState(() => {
    const saved = localStorage.getItem('lineType');
    return saved !== null ? saved : 'straight'; // Options: straight, smoothstep, bezier, step
  });

  // Save lineType preference to localStorage
  useEffect(() => {
    localStorage.setItem('lineType', lineType);
  }, [lineType]);

  // Add state for arrowhead type with localStorage support
  const [arrowheadType, setArrowheadType] = useState(() => {
    const saved = localStorage.getItem('arrowheadType');
    return saved !== null ? saved : 'ArrowClosed'; // Options: ArrowClosed, Arrow, ArrowOpen
  });

  // Save arrowheadType preference to localStorage
  useEffect(() => {
    localStorage.setItem('arrowheadType', arrowheadType);
  }, [arrowheadType]);

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
  
  // Add edge types
  const edgeTypes = useMemo(() => ({
    custom: CustomEdge,
    straight: CustomStraightEdge,
    smoothstep: (props) => {
      const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;
      
      // Calculate the path for smoothstep
      const [edgePath] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });
      
      return <CustomEdge {...props} edgePath={edgePath} />;
    },
    step: (props) => {
      const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;
      
      // Calculate the path for step
      const [edgePath] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 0 // No border radius for strict orthogonal corners
      });
      
      return <CustomEdge {...props} edgePath={edgePath} />;
    },
    bezier: (props) => {
      const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;
      
      // Calculate the path for bezier
      const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });
      
      return <CustomEdge {...props} edgePath={edgePath} />;
    }
  }), []);

  const [activeDomainConfig, setActiveDomainConfig] = useState(null); // Track which domain is being configured
  const [retryCount, setRetryCount] = useState(0); // Add retry count state

  // Add domainDisplayConfig state to store display configuration
  const [domainDisplayConfig, setDomainDisplayConfig] = useState({});
  const [domainColors, setDomainColors] = useState({}); // Store domain colors
  const [isLoadingDisplayConfig, setIsLoadingDisplayConfig] = useState(true);

  // Add new state for connection handling
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState(null);
  const [connectionSuccess, setConnectionSuccess] = useState(false);

  // Add refresh tracking refs
  const refreshAttempts = React.useRef(0);
  const lastRefreshTime = React.useRef(0);
  const connectionCompleted = React.useRef(false);

  // State for managing configuration
  const [config, setConfig] = useState(null);
  const [allowOnlyAdjacentConnections, setAllowOnlyAdjacentConnections] = useState(true);

  // Forward-declare updateLocalRelationship to avoid reference error
  const updateLocalRelationshipTemp = (fromDomain, fromId, toId) => {
    console.log("Updating local relationship", { fromDomain, fromId, toId });
    // Implementation will be overridden later
  };
  // Use ref to avoid dependency cycle issues
  const updateLocalRelationshipRef = useRef(updateLocalRelationshipTemp);

  // --- useEffect for successMessage (Keep for linking feedback) --- 
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // --- Data Fetching functions --- 
  const fetchConfig = useCallback(async () => {
    try {
    setIsLoadingConfig(true);
    setError(null);
      
      const result = await fetchWithErrorHandling(createApiEndpoint('config'));
      setConfig(result);
      setAppConfig(result);
      setLocalDomainOrder(result.domainOrder || []);
      
      // Set the local state based on config
      if (result && result.allowOnlyAdjacentConnections !== undefined) {
        setAllowOnlyAdjacentConnections(result.allowOnlyAdjacentConnections);
      }
      
      setIsLoadingConfig(false);
      return result;
    } catch (e) {
      console.error("Error fetching config:", e);
      setIsLoadingConfig(false);
      setError(`Failed to fetch configuration: ${e.message}`);
      setAppConfig({});
      setLocalDomainOrder([]);
      throw e;
    }
  }, [fetchWithErrorHandling, setError, setAppConfig, setLocalDomainOrder]);

  // Function to fetch domain display configurations - moved up before where it's used
  const fetchDomainDisplayConfigs = useCallback(async () => {
    if (localDomainOrder.length === 0) {
      console.log("No domains to fetch configs for");
      setIsLoadingDisplayConfig(false);
      return;
    }
    
    console.log("Fetching domain display configs for domains:", localDomainOrder);
    setIsLoadingDisplayConfig(true);
    setError(null);
    
    const displayConfigMap = {};
    const colorMap = {};
    
    try {
      // Fetch the display configuration for each domain
      const fetchPromises = localDomainOrder.map(async (domainName) => {
        try {
          const response = await fetch(createApiEndpoint(`config/domain-display/${domainName}`));
          
          if (!response.ok) {
            // If config doesn't exist yet, that's OK - we'll return an empty array
            if (response.status === 404) {
              return { domainName, displayItems: [], domainColor: '#14364F' };
            }
            throw new Error(`Failed to fetch display config for ${domainName}`);
          }
          
          const data = await response.json();
          console.log(`Received display config for ${domainName}:`, data);
          
          // Handle both the array of IDs structure and the full items structure
          let displayItems = [];
          if (data.displayItems) {
            // If displayItems is an array of objects with 'id' properties, extract just the IDs
            if (Array.isArray(data.displayItems) && data.displayItems.length > 0 && typeof data.displayItems[0] === 'object') {
              displayItems = data.displayItems.map(item => item.id);
            } else {
              // Otherwise, assume it's already an array of IDs
              displayItems = Array.isArray(data.displayItems) ? data.displayItems : [];
            }
          }
          
          return { 
            domainName, 
            displayItems,
            domainColor: data.domainColor || '#14364F'
          };
        } catch (err) {
          console.error(`Error fetching display config for ${domainName}:`, err);
          return { domainName, displayItems: [], domainColor: '#14364F', error: err.message };
        }
      });
      
      const results = await Promise.all(fetchPromises);
      
      // Create maps of domain names to display items and colors
      results.forEach(result => {
        // Store the actual array of display item IDs
        displayConfigMap[result.domainName] = result.displayItems || [];
        colorMap[result.domainName] = result.domainColor || '#14364F';
        
        console.log(`Stored display config for ${result.domainName}: ${result.displayItems?.length || 0} items, color: ${result.domainColor}`);
      });
      
      console.log("Created display config map:", displayConfigMap);
      console.log("Created color map:", colorMap);
      
      setDomainDisplayConfig(displayConfigMap);
      setDomainColors(colorMap);
    } catch (err) {
      console.error('Error fetching domain display configurations:', err);
      setError('Failed to load domain display configurations');
    } finally {
      setIsLoadingDisplayConfig(false);
    }
  }, [localDomainOrder, createApiEndpoint]);

  const fetchMissions = useCallback(async () => {
    setIsLoadingMissions(true);
    setError(null);
    try {
      const data = await fetchWithErrorHandling(createApiEndpoint('missions'));
      setMissions(data);
    } catch (e) {
      console.error("Error fetching missions:", e);
      setError(`Failed to load missions: ${e.message}`);
    } finally {
      setIsLoadingMissions(false);
    }
  }, []);

  const fetchScenarios = useCallback(async () => {
    setIsLoadingScenarios(true);
    setError(null);
    try {
      const data = await fetchWithErrorHandling(createApiEndpoint('scenarios'));
      setScenarios(data);
    } catch (e) {
      console.error("Error fetching scenarios:", e);
      setError(`Failed to load scenarios: ${e.message}`);
    } finally {
      setIsLoadingScenarios(false);
    }
  }, []);

  const fetchRequirements = useCallback(async () => {
    setIsLoadingRequirements(true);
    setError(null);
    try {
      const data = await fetchWithErrorHandling(createApiEndpoint('requirements'));
      setRequirements(data);
    } catch (e) {
      console.error("Error fetching requirements:", e);
      setError(`Failed to load requirements: ${e.message}`);
    } finally {
      setIsLoadingRequirements(false);
    }
  }, []);

  const fetchParameters = useCallback(async () => {
    setIsLoadingParameters(true);
    setError(null);
    try {
      const data = await fetchWithErrorHandling(createApiEndpoint('parameters'));
      setParameters(data);
    } catch (e) {
      console.error("Error fetching parameters:", e);
      setError(`Failed to load parameters: ${e.message}`);
    } finally {
      setIsLoadingParameters(false);
    }
  }, []);

  const fetchFunctions = useCallback(async () => {
    setIsLoadingFunctions(true);
    setError(null);
    try {
      const data = await fetchWithErrorHandling(createApiEndpoint('functions')); // Use plural path
      setFunctions(data);
    } catch (e) {
      console.error("Error fetching functions:", e);
      setError(`Failed to load functions: ${e.message}`);
    } finally {
      setIsLoadingFunctions(false);
    }
  }, []);

  // --- Retry function for all connections ---
  const retryAllConnections = useCallback(() => {
    setError(null); // Clear existing errors
    console.log('Retrying all API connections...');
    
    // Show a temporary message
    setSuccessMessage('Retrying API connections...');
    
    // Increment retry count
    setRetryCount(prev => prev + 1);
    
    // Fetch all data
    Promise.all([
      fetchConfig(),
      fetchMissions(),
      fetchScenarios(),
      fetchRequirements(),
      fetchParameters(),
      fetchFunctions()
    ]).then(() => {
      // Set a success message if all succeed
      setSuccessMessage('Successfully reconnected to API!');
      setAppInitialized(true);
    }).catch(err => {
      console.error("Error during retry:", err);
      // Error will be set by the individual fetch functions
    });
  }, [
    fetchConfig, 
    fetchMissions, 
    fetchScenarios, 
    fetchRequirements, 
    fetchParameters, 
    fetchFunctions,
    setSuccessMessage,
    setError,
    setRetryCount,
    setAppInitialized
  ]);

  // When a domain config panel is closed, refresh the configurations
  const closeDomainConfigPanel = useCallback(() => {
    setActiveDomainConfig(null);
    // Refresh configs when panel is closed to ensure UI reflects any changes
    fetchDomainDisplayConfigs();
  }, [setActiveDomainConfig, fetchDomainDisplayConfigs]);

  // Initialize app function
  const initializeApp = useCallback(() => {
    return Promise.all([
      fetchConfig(),
      fetchMissions(),
      fetchScenarios(),
      fetchRequirements(),
      fetchParameters(),
      fetchFunctions()
    ]);
  }, [fetchConfig, fetchMissions, fetchScenarios, fetchRequirements, fetchParameters, fetchFunctions]);

  // Separate useEffects for each data loading step
  // 1. Initial data load
  useEffect(() => {
    console.log("Starting initial data fetch");
    initializeApp().then(() => {
      console.log("Initial data fetch complete");
    }).catch(err => {
      console.error("Error during initial data fetch:", err);
    });
  }, [initializeApp]);

  // 2. Check when domain order is loaded and fetch configs
  useEffect(() => {
    if (localDomainOrder.length > 0) {
      console.log("Domain order loaded:", localDomainOrder);
      fetchDomainDisplayConfigs();
    }
  }, [localDomainOrder, fetchDomainDisplayConfigs]);

  // 3. Mark app as initialized when all data is ready
  useEffect(() => {
    if (!appInitialized && 
        !isLoadingConfig && !isLoadingMissions && !isLoadingScenarios && 
        !isLoadingRequirements && !isLoadingParameters && !isLoadingFunctions &&
        !isLoadingDisplayConfig) {
      console.log("All data loaded, marking app as initialized");
      setAppInitialized(true);
      console.log("Digital Thread data loaded successfully!");
    }
  }, [
    appInitialized, isLoadingConfig, isLoadingMissions, isLoadingScenarios, 
    isLoadingRequirements, isLoadingParameters, isLoadingFunctions,
    isLoadingDisplayConfig
  ]);
  
  // Auto-retry logic for initialization
  useEffect(() => {
    const MAX_RETRIES = 2;
    
    // Skip if we've already initialized successfully or exceeded max retries
    if (appInitialized || retryCount > MAX_RETRIES) return;
    
    // Only attempt retry after a delay (on retry count changes)
    if (retryCount > 0) {
      const timer = setTimeout(() => {
        console.log(`Initialization attempt ${retryCount}/${MAX_RETRIES}`);
        initializeApp().then(() => {
          // Don't set appInitialized here - let the loading effect handle it
          console.log("Retry initialization successful");
        }).catch(err => {
          console.error("Initialization attempt failed:", err);
        });
      }, retryCount * 2000); // Increasing backoff
      
      return () => clearTimeout(timer);
    }
  }, [appInitialized, retryCount, initializeApp]);
  
  // --- Relationship Logic (Keep for linking interaction) --- 
  const startLinking = useCallback((fromId, fromDomain) => {
      setLinkingState({ fromId, fromDomain });
      setSuccessMessage(null); // Clear previous success message
      setError(null); // Clear previous error message
      console.log(`Start linking from ${fromDomain} item: ${fromId}`);
  }, [setLinkingState, setSuccessMessage, setError]);

  // Function for completing a relationship link after source and target nodes are selected
  const completeLink = useCallback(async (sourceNodeId, targetNodeId) => {
    // Clear any previous success state
    setConnectionSuccess(false);

    if (!sourceNodeId || !targetNodeId) {
      setIsConnecting(false);
      setConnectionSource(null);
      setError("Unable to create connection: Missing source or target node.");
      return false;
    }

    // Get source and target nodes
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    const targetNode = nodes.find(n => n.id === targetNodeId);

    if (!sourceNode || !targetNode) {
      setIsConnecting(false);
      setConnectionSource(null);
      setError("Unable to create connection: Source or target node not found.");
      return false;
    }

    // Determine parent nodes (domains)
    const sourceParentId = sourceNode.parentNode;
    const targetParentId = targetNode.parentNode;

    console.log("Connection details:", { 
      sourceId: sourceNodeId, 
      targetId: targetNodeId,
      sourceParentId,
      targetParentId,
      sourceData: sourceNode.data,
      targetData: targetNode.data
    });

    if (!sourceParentId || !targetParentId) {
      setIsConnecting(false);
      setConnectionSource(null);
      setError("Unable to create connection: Can only connect nodes within domains.");
      return false;
    }

    // Identify domain types
    const sourceParent = nodes.find(n => n.id === sourceParentId);
    const targetParent = nodes.find(n => n.id === targetParentId);

    if (!sourceParent || !targetParent) {
      setIsConnecting(false);
      setConnectionSource(null);
      setError("Unable to create connection: Parent domains not found.");
      console.error("Parent domains not found:", { sourceParentId, targetParentId });
      return false;
    }

    // Extract domain names from parent nodes
    const fromDomain = sourceParent.data?.label;
    const toDomain = targetParent.data?.label;

    console.log("Domain information:", { fromDomain, toDomain });

    if (!fromDomain || !toDomain) {
      setIsConnecting(false);
      setConnectionSource(null);
      setError("Unable to create connection: Domain names not found in parent nodes.");
      console.error("Domain names missing:", { sourceParent, targetParent });
      return false;
    }

    // Get domain index positions
    const fromIndex = localDomainOrder.indexOf(fromDomain);
    const toIndex = localDomainOrder.indexOf(toDomain);

    if (fromIndex === -1 || toIndex === -1) {
      setIsConnecting(false);
      setConnectionSource(null);
      setError(`Unable to create connection: One or both domains (${fromDomain}, ${toDomain}) not found in domain order. Please check the domain containers and try again.`);
      console.error("Domain order:", localDomainOrder);
      console.error("Domain extraction issue:", {
        sourceParentId,
        targetParentId,
        sourceParent: sourceParent ? { id: sourceParent.id, data: sourceParent.data } : null,
        targetParent: targetParent ? { id: targetParent.id, data: targetParent.data } : null
      });
      return false;
    }

    // Validate domain connection is allowed
    if (allowOnlyAdjacentConnections && toIndex !== fromIndex + 1) {
      setIsConnecting(false);
      setConnectionSource(null);
      setError(`Unable to create connection: Connection only allowed from ${fromDomain} to ${localDomainOrder[fromIndex + 1]}.`);
      return false;
    }

    // Don't allow backwards connections
    if (toIndex <= fromIndex) {
      setIsConnecting(false);
      setConnectionSource(null);
      setError(`Unable to create connection: Backward connections (${fromDomain} to ${toDomain}) are not allowed.`);
      return false;
    }

    // Define relationship type based on domain pair
    const relationshipTypes = {
      'Mission_Scenario': 'DRIVES',
      'Scenario_Requirements': 'REQUIRES',
      'Requirements_Parameter': 'DEFINES',
      'Parameter_Functions': 'INPUT_TO'
      // Add more relationships as needed for future domains
    };

    const relationshipKey = `${fromDomain}_${toDomain}`;
    const relationshipType = relationshipTypes[relationshipKey];

    if (!relationshipType) {
      setIsConnecting(false);
      setConnectionSource(null);
      setError(`Unable to create connection: No relationship defined between ${fromDomain} and ${toDomain}.`);
      return false;
    }

    try {
      // Create relationship via API
      const result = await fetchWithErrorHandling(createApiEndpoint('relationships'), {
              method: 'POST',
              headers: {
                 'Content-Type': 'application/json',
              },
              body: JSON.stringify({
          fromId: sourceNodeId,
          toId: targetNodeId,
                 fromDomain,
                 toDomain,
                 relationshipType
              })
          });

      // Update local data to reflect the new relationship
      updateLocalRelationshipRef.current(fromDomain, sourceNodeId, targetNodeId);

      console.log(`Successfully created relationship: ${result.message}`);
      
      // Create the visual edge if relationship was created successfully
      if (showRelationshipLines) {
        const newEdge = {
          id: `${sourceNodeId}-${relationshipType}-${targetNodeId}`,
          source: sourceNodeId,
          target: targetNodeId,
          type: useCurvedEdges ? 'custom' : 'straight', // Use custom edge type
          animated: false,
          style: { stroke: '#00587c', strokeWidth: 2 }
        };
        
        setEdges(eds => [...eds, newEdge]);
      }
      
      // Set success state for UI feedback
      setConnectionSuccess(true);
      setSuccessMessage(`Created ${relationshipType} relationship from ${sourceNodeId} to ${targetNodeId}`);
      
      // Leave connecting mode active for potential additional connections
      setConnectionSource(null);
      
      // Return success to the caller
      return true;
    } catch (error) {
      console.error("Error creating relationship:", error);
      setError(`Failed to create relationship: ${error.message}`);
      setIsConnecting(false);
      setConnectionSource(null);
      return false;
    }
  }, [
    nodes, 
    localDomainOrder, 
    fetchWithErrorHandling, 
    showRelationshipLines, 
    setEdges, 
    setError, 
    setSuccessMessage,
    allowOnlyAdjacentConnections,
    useCurvedEdges
    // updateLocalRelationship removed to avoid reference error
  ]);

  const cancelLinking = useCallback(() => {
      setLinkingState({ fromId: null, fromDomain: null });
      console.log('Linking cancelled');
  }, [setLinkingState]);

  // Function to update filter for a specific domain
  const updateDomainFilter = useCallback((domainId, filterText) => {
    setDomainFilters(prev => ({
      ...prev,
      [domainId]: filterText
    }));
  }, [setDomainFilters]);

  // Keep track of original domain positions
  const storeDomainPosition = useCallback((nodeId, position) => {
    setDomainPositions(prev => ({
      ...prev,
      [nodeId]: position
    }));
  }, [setDomainPositions]);

  // Function to handle settings icon click
  const handleDomainSettingsClick = useCallback((domainName) => {
    setActiveDomainConfig(domainName);
    console.log(`Opening configuration for domain: ${domainName}`);
  }, [setActiveDomainConfig]);
  
  // --- useEffect to Calculate Nodes and Edges --- 
  useEffect(() => {
    // Check if data is still loading
    if (isLoadingConfig || isLoadingMissions || isLoadingScenarios || 
        isLoadingRequirements || isLoadingParameters || isLoadingFunctions || 
        isLoadingDisplayConfig || !appConfig) {
      console.log("Waiting for data to calculate hierarchical layout...");
      console.log("Loading states:", {
        config: isLoadingConfig,
        missions: isLoadingMissions,
        scenarios: isLoadingScenarios,
        requirements: isLoadingRequirements,
        parameters: isLoadingParameters,
        functions: isLoadingFunctions,
        displayConfig: isLoadingDisplayConfig
      });
      setNodes([]);
      setEdges([]);
      return;
    }

    console.log(`Calculating ${showRelationshipLines ? 'nodes and edges' : 'nodes only'} with Parent Containers and Space...`);
    console.log("Domain Display Config:", JSON.stringify(domainDisplayConfig));
    console.log("Domain Colors:", JSON.stringify(domainColors));
    console.log("Available domains:", localDomainOrder);

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
    const columnWidth = 460; // Width to handle indentation
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
        Requirements: new Set(requirements.flatMap(item => item.childRequirementsIds || [])),
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
        
        // Filter top-level items based on domain display configuration
        let topLevelItems = Array.from(itemMap.values()).filter(item => !childIdSet?.has(item.id));
        
        // Add debug logging
        console.log(`Domain ${domainName}: Found ${topLevelItems.length} top-level items before filtering`);
        
        // Apply domain display configuration filtering if available
        const displayItemIds = domainDisplayConfig[domainName];
        console.log(`Domain ${domainName} display config:`, displayItemIds);
        
        if (displayItemIds && displayItemIds.length > 0) {
          // Only show items that are in the display configuration
          console.log(`Filtering ${domainName} to only show items:`, displayItemIds);
          topLevelItems = topLevelItems.filter(item => displayItemIds.includes(item.id));
          console.log(`${domainName}: ${topLevelItems.length} items after filtering`);
          
          if (topLevelItems.length === 0) {
            console.warn(`No top-level items matched the display filter for ${domainName}. Check the item IDs in the configuration.`);
          }
        } else {
          console.log(`${domainName}: No display filtering applied, showing all ${topLevelItems.length} items`);
        }
        
        
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
        // Use color from domainColors state if available, otherwise use default
        const domainColor = domainColors[domainName] || domainSpecificConfig.color || '#14364F';

        // Check if this domain has a stored position and use it
        const storedPosition = domainPositions[parentNodeId];
        const usePosition = storedPosition ? storedPosition : { x: parentX, y: parentY };
        
        if (storedPosition) {
          console.log(`Using stored position for ${parentNodeId}: ${JSON.stringify(storedPosition)}`);
        }

        // --- 1. Add Parent Node --- 
        newNodes.push({
          id: parentNodeId,
          type: 'default',
          position: usePosition,
          data: { label: '' },  // Remove the domain name label that shows at the top
          draggable: true, // Parent node must be draggable
          selectable: false,
          style: { 
              width: columnWidth, 
              height: parentHeight, 
              backgroundColor: 'white',
              border: `1px solid ${domainColor}`,
              borderRadius: '4px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              cursor: 'default'
          }
        });

        // Add drag indicator at top of container with no outline
        newNodes.push({
          id: `dragbar-${parentNodeId}`, // Changed to prevent potential conflicts
          type: 'default',
          parentNode: parentNodeId,
          draggable: false,
          selectable: false,
          position: { x: 0, y: 0 },
          data: { label: '' }, // Empty label instead of dots
          style: {
            width: columnWidth,
            height: 20, // Increased height for drag area
            backgroundColor: 'transparent', // Transparent background
            cursor: 'grab',
            fontSize: '9px',
            color: '#666',
            textAlign: 'center',
            pointerEvents: 'none', // Let clicks pass through to parent
            backgroundImage: `
              radial-gradient(circle, #666 2px, transparent 2px),
              radial-gradient(circle, #666 2px, transparent 2px),
              radial-gradient(circle, #666 2px, transparent 2px),
              radial-gradient(circle, #666 2px, transparent 2px),
              radial-gradient(circle, #666 2px, transparent 2px),
              radial-gradient(circle, #666 2px, transparent 2px)
            `,
            backgroundSize: '10px 10px',
            backgroundPosition: 'center 4px, center 12px, calc(50% - 15px) 4px, calc(50% - 15px) 12px, calc(50% + 15px) 4px, calc(50% + 15px) 12px',
            backgroundRepeat: 'no-repeat',
            border: 'none', // Ensure no border
            outline: 'none', // Ensure no outline
            boxShadow: 'none', // Ensure no shadow
            borderRadius: '0' // Ensure no border radius
          }
        });

        // Function to create non-draggable node properties
        const createNonDraggableNode = (node) => ({
          ...node,
          draggable: false,
          selectable: false,
          style: {
            ...node.style,
            pointerEvents: node.className === 'drag-handle' ? 'all' : 'none'
          }
        });

        // --- 2. Add Domain Icon (if icons are enabled) ---
        if (showDomainIcons) {
          if (domainSpecificConfig.icon) {
            newNodes.push(createNonDraggableNode({
              id: `icon-${parentNodeId}`,
              parentNode: parentNodeId,
              position: { x: parentPadding, y: parentPadding + 4 },
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
                filter: 'drop-shadow(0 0 0 transparent)',
                cursor: 'default',
                zIndex: 1
              }
            }));
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
              border: 'none',
              outline: 'none',
              cursor: 'default',
              zIndex: 3, // Ensure title is above the handle
              pointerEvents: 'none'
          }
        });

        // Add settings icon to the domain header (right-justified)
        newNodes.push({
          id: `settings-icon-${parentNodeId}`,
          parentNode: parentNodeId,
          draggable: false,
          selectable: false,
          position: { 
            x: columnWidth - parentPadding - 24,
            y: parentPadding + 3
          },
          data: { 
            label: null,
            domainName: domainName
          },
          style: {
            width: 24,
            height: 24,
            backgroundImage: `url(${settingsIcon})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            zIndex: 5,
            pointerEvents: 'all' // Ensure the icon receives click events
          },
          events: {
            onClick: (event) => {
              event.stopPropagation();
              handleDomainSettingsClick(domainName);
            }
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
      console.log("Calculating relationship edges for display...");
      
      // Create a map of relationships for debugging
      const relationshipMap = {
        'Mission': 'drivenScenarioIds',
        'Scenario': 'requiredRequirementIds',
        'Requirements': 'definedParameterIds',
        'Parameter': 'inputToFunctionIds'
      };
      
      // Log relationship fields for debugging
      Object.entries(itemMaps).forEach(([domain, itemMap]) => {
        const relationshipField = relationshipMap[domain];
        if (relationshipField) {
          const totalRelationships = Array.from(itemMap.values())
            .map(item => item[relationshipField]?.length || 0)
            .reduce((a, b) => a + b, 0);
          console.log(`${domain} has ${totalRelationships} relationships in ${relationshipField}`);
        }
      });
      
      // Track all edges created to avoid duplicates
      const edgeIds = new Set();
      
      // Process each domain to create relationship edges
      localDomainOrder.forEach((domainName, index) => {
        const itemMap = itemMaps[domainName];
        if (!itemMap || index >= localDomainOrder.length - 1) return; // Skip last domain as it can't have outgoing relationships
        
        const targetDomain = localDomainOrder[index + 1];
        if (!targetDomain) return;
        
        // Get the relationship field name for this domain
        let relationshipField;
        if (domainName === 'Mission') relationshipField = 'drivenScenarioIds';
        else if (domainName === 'Scenario') relationshipField = 'requiredRequirementIds';
        else if (domainName === 'Requirements') relationshipField = 'definedParameterIds';
        else if (domainName === 'Parameter') relationshipField = 'inputToFunctionIds';
        
        if (!relationshipField) {
          console.log(`No relationship field defined for ${domainName}`);
          return;
        }
        
        const itemsInThisColumn = Array.from(itemMap.values());
        let edgeCount = 0;
        
        itemsInThisColumn.forEach((item) => {
          const sourceId = item.id;
          const targetIds = item[relationshipField] || [];
          
          if (targetIds.length > 0) {
            console.log(`${domainName} ${sourceId} has ${targetIds.length} relationships to ${targetDomain}`);
          }
          
          targetIds.forEach(targetId => {
            const edgeType = getRelationshipType(domainName, targetDomain);
            const edgeId = `${sourceId}-${edgeType}-${targetId}`;
            
            // Skip if we've already processed this edge
            if (edgeIds.has(edgeId)) return;
            edgeIds.add(edgeId);
            
            // Check if the source and target nodes exist in the current nodes array
            const sourceExists = nodes.some(node => node.id === sourceId);
            const targetExists = nodes.some(node => node.id === targetId);
            
            if (sourceExists && targetExists) {
              edgeCount++;
            newEdges.push({
                id: edgeId,
              source: sourceId, 
              target: targetId, 
              sourceHandle: 'right-source', 
              targetHandle: 'left-target', 
                type: lineType, // Use selected line type
              animated: false,
              style: { 
                  strokeWidth: 2.5,
                stroke: '#00587c',
              },
              markerEnd: { 
                type: MarkerType[arrowheadType], 
                width: 15, 
                height: 15, 
                color: '#00587c'
              },
                zIndex: 5,
                data: { // Add data for tooltip
                  sourceId,
                  targetId,
                  relationshipType: edgeType // Use the correctly defined edgeType variable here
                },
                interactionWidth: 20 // Increase the interaction area width to make hover easier
              });
            } else {
              console.log(`Skipping edge ${edgeId} - source or target node not found`);
            }
          });
        });
        
        console.log(`Created ${edgeCount} edges from ${domainName} to ${targetDomain}`);
      });
      
      // Check if there was a recent connection created that might not be in the API data yet
      // This ensures connections are visible immediately after creation
      if (connectionSuccess && connectionSource) {
        // Extract source and target information from the last connection
        const sourceId = connectionSource.id;
        const sourceDomain = connectionSource.data?.domain;
        const targetNodes = nodes.filter(n => 
          n.data?.domain === localDomainOrder[localDomainOrder.indexOf(sourceDomain) + 1] && 
          n.selectable !== false && !n.id.startsWith('icon-') && !n.id.startsWith('title-')
        );
        
        // Find target node that has connection highlight
        const targetNode = targetNodes.find(n => n.data?.isConnectionHighlighted === true);
        
        if (targetNode) {
          const targetId = targetNode.id;
          const targetDomain = targetNode.data?.domain;
          const edgeType = getRelationshipType(sourceDomain, targetDomain);
          const edgeId = `${sourceId}-${edgeType}-${targetId}`;
          
          // Only add if this edge doesn't already exist
          if (!edgeIds.has(edgeId)) {
            console.log(`Adding temporary edge for new connection: ${sourceId} -> ${targetId}`);
            edgeIds.add(edgeId);
            
            newEdges.push({
              id: edgeId,
              source: sourceId, 
              target: targetId, 
              sourceHandle: 'right-source', 
              targetHandle: 'left-target', 
              type: lineType, // Use selected line type
              animated: false,
              style: { 
                strokeWidth: 2.5,
                stroke: '#4caf50', // Use green for newly created connections
              },
              markerEnd: { 
                type: MarkerType[arrowheadType], 
                width: 15, 
                height: 15, 
                color: '#4caf50'
              },
              zIndex: 6, // Higher z-index to appear on top
              data: { // Add data property with relationship information
                sourceId,
                targetId,
                relationshipType: edgeType
              }
            });
          }
        }
      }
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
    setNodes, setEdges,
    handleDomainSettingsClick,
    domainDisplayConfig,
    isLoadingDisplayConfig, // Add loading state as dependency
    domainColors, // Add domainColors as a dependency
    useCurvedEdges,
    domainPositions, // Add domainPositions as a dependency to preserve positions
    lineType,
    arrowheadType
  ]);

  // Define a function to handle when a node is dragged
  const onNodeDrag = useCallback((event, node) => {
    // Only apply the logic to domain parent nodes
    if (!node.id.startsWith('domain-')) return;

    // Get all domain nodes (parent containers)
    const domainNodes = nodes.filter(n => n.id.startsWith('domain-'));
    
    // Get the current node's dimensions
    const currentNodeWidth = node.style?.width || 380; // Use the default width if not defined
    const currentNodeHeight = node.style?.height || 400; // Approximate height if not defined
    const currentNodeX = node.position.x;
    const currentNodeY = node.position.y;
    
    // Minimum spacing between domains - increase this to prevent any overlap
    const minDomainSpacing = 40; // Increased spacing between domains
    
    // Remove minimum boundary constraints to allow free movement in all directions
    // const minX = 20; // Minimum X position - REMOVED
    // const minY = 0;  // Minimum Y position - REMOVED
    
    // Check if node is being dragged outside boundaries - REMOVED
    // if (currentNodeX < minX) {
    //   node.position.x = minX;
    // }
    // if (currentNodeY < minY) {
    //   node.position.y = minY;
    // }
    
    // Flag to track if position was adjusted due to collision
    let positionAdjusted = false;
    
    // Check for overlaps with all other domain nodes
    domainNodes.forEach(otherNode => {
      // Skip the node being dragged
      if (otherNode.id === node.id) return;
      
      const otherNodeWidth = otherNode.style?.width || 380;
      const otherNodeHeight = otherNode.style?.height || 400;
      const otherNodeX = otherNode.position.x;
      const otherNodeY = otherNode.position.y;
      
      // Calculate edge-to-edge distances between nodes
      const leftDist = (currentNodeX - otherNodeX);
      const topDist = (currentNodeY - otherNodeY);
      const rightDist = (otherNodeX - currentNodeX);
      const bottomDist = (otherNodeY - currentNodeY);
      
      // Calculate minimum required distances to prevent overlap
      const minHorizDist = (currentNodeWidth + otherNodeWidth) / 2 + minDomainSpacing;
      const minVertDist = (currentNodeHeight + otherNodeHeight) / 2 + minDomainSpacing;
      
      // Check if there's overlap in both dimensions
      const horizOverlap = Math.abs(leftDist) < minHorizDist;
      const vertOverlap = Math.abs(topDist) < minVertDist;
      
      if (horizOverlap && vertOverlap) {
        positionAdjusted = true;
        
        // Determine which direction requires the smallest adjustment
        const horizAdjustment = minHorizDist - Math.abs(leftDist);
        const vertAdjustment = minVertDist - Math.abs(topDist);
        
        if (horizAdjustment < vertAdjustment) {
          // Horizontal adjustment is smaller
          if (leftDist > 0) {
            // Current node is to the right
            node.position.x = otherNodeX + minHorizDist;
          } else {
            // Current node is to the left
            node.position.x = otherNodeX - minHorizDist;
          }
        } else {
          // Vertical adjustment is smaller
          if (topDist > 0) {
            // Current node is below
            node.position.y = otherNodeY + minVertDist;
          } else {
            // Current node is above
            node.position.y = otherNodeY - minVertDist;
          }
        }
      }
    });
    
    // Optional: Snap to grid if no collisions were detected
    if (!positionAdjusted) {
      const gridSize = 20; // Snap to every 20px
      node.position.x = Math.round(node.position.x / gridSize) * gridSize;
      node.position.y = Math.round(node.position.y / gridSize) * gridSize;
    }
    
  }, [nodes]);
  
  // Handle when node drag ends
  const onNodeDragStop = useCallback((event, node) => {
    if (node.id.startsWith('domain-')) {
      // Store the final position of the domain
      storeDomainPosition(node.id, { ...node.position });
    }
  }, [storeDomainPosition]);

  // Function to handle mouse move for connection preview
  const handleMouseMove = useCallback((event) => {
    if (isConnecting && connectionSource) {
      // Get mouse position relative to the ReactFlow canvas
      const { clientX, clientY } = event;
      const reactFlowBounds = document.querySelector('.react-flow').getBoundingClientRect();
      
      // Get source node's position and dimensions
      const sourceNode = nodes.find(n => n.id === connectionSource.id);
      if (!sourceNode) return;
      
      // Calculate source node's position in the viewport
      const sourceNodeDOMNode = document.querySelector(`[data-id="${connectionSource.id}"]`);
      if (!sourceNodeDOMNode) return;
      
      const sourceNodeBounds = sourceNodeDOMNode.getBoundingClientRect();
      const sourceX = sourceNodeBounds.right; // Right edge of source node
      const sourceY = sourceNodeBounds.top + (sourceNodeBounds.height / 2); // Center of source node
      
      // Create or update a temporary edge
      const tempEdgeId = 'temp-connection-edge';
      const mouseX = clientX - reactFlowBounds.left;
      const mouseY = clientY - reactFlowBounds.top;
      
      // Remove any existing temp edge
      setEdges(edges => edges.filter(edge => edge.id !== tempEdgeId).concat([{
        id: tempEdgeId,
        source: connectionSource.id,
        target: 'mouse',
        targetX: mouseX,
        targetY: mouseY,
        targetPosition: 'left',
        sourceX: sourceX - reactFlowBounds.left,
        sourceY: sourceY - reactFlowBounds.top,
        sourcePosition: 'right',
        style: { stroke: '#00587c', strokeWidth: 2, strokeDasharray: '5,5' },
        type: useCurvedEdges ? 'simplebezier' : 'straight',
        animated: true,
        interactionWidth: 0, // Prevent interaction with temp edge
        data: { // Add data for tooltip
          sourceId: connectionSource.id,
          targetId: 'mouse', 
          relationshipType: 'TEMP'
        }
      }]));
    }
  }, [isConnecting, connectionSource, nodes, setEdges, useCurvedEdges]);

  // Function to check if two domains can be connected
  const canConnect = useCallback((sourceDomain, targetDomain) => {
    const validConnections = {
      'Mission': ['Scenario'],
      'Scenario': ['Requirements'],
      'Requirements': ['Parameter'],
      'Parameter': ['Functions']
    };
    
    // Add debug feedback
    if (sourceDomain && targetDomain) {
      const isValid = validConnections[sourceDomain]?.includes(targetDomain);
      console.log(`Connection ${sourceDomain} -> ${targetDomain}: ${isValid ? 'Valid' : 'Invalid'}`);
      return isValid;
    }
    return false;
  }, []);

  // Function to start connection mode
  const handleStartConnecting = useCallback(() => {
    setIsConnecting(true);
    setConnectionSource(null);
    setConnectionSuccess(false);
    setError(null);
    console.log('Connection mode started');
  }, [setError]);

  // Function to cancel connection mode
  const handleCancelConnecting = useCallback(() => {
    setIsConnecting(false);
    setConnectionSource(null);
    setConnectionSuccess(false);
    setError(null);
    console.log('Connection mode canceled');
  }, [setError]);

  // Function to handle node hover during connection
  const handleNodeMouseEnter = useCallback((event, node) => {
    // If we're not in connecting mode, do nothing
    if (!isConnecting) return;
    
    // Skip parent containers and non-item nodes
    if (node.type === 'parentContainer' || 
        node.id.startsWith('handle-') || 
        node.id.startsWith('title-') || 
        node.id.startsWith('icon-')) {
      return;
    }
    
    // Add a subtle highlight to indicate this node can be clicked
    const updatedNodes = nodes.map(n => {
      if (n.id === node.id) {
        return {
          ...n,
          style: {
            ...n.style,
            boxShadow: '0 0 0 2px #00587c',
            transition: 'all 0.2s ease-in-out'
          }
        };
      }
      return n;
    });
    
    setNodes(updatedNodes);
  }, [isConnecting, nodes, setNodes]);

  // Function to handle node hover exit
  const handleNodeMouseLeave = useCallback((event, node) => {
    // If we're not in connecting mode, do nothing
    if (!isConnecting) return;
    
    // Remove highlight when mouse leaves
    const updatedNodes = nodes.map(n => {
      if (n.id === node.id) {
        const newStyle = { ...n.style };
        delete newStyle.boxShadow;
        
        return {
          ...n,
          style: newStyle
        };
      }
      return n;
    });
    
    setNodes(updatedNodes);
  }, [isConnecting, nodes, setNodes]);

  // Function to handle node clicks during connection
  const handleNodeClick = useCallback((event, node) => {
    // If settings icon is clicked, open configuration panel
    if (node.id.startsWith('settings-icon-')) {
      event.stopPropagation();
      const domainName = node.data?.domainName;
      
      if (domainName) {
        setActiveDomainConfig(domainName);
        console.log(`Opening configuration for domain: ${domainName}`);
      }
      return;
    }
    
    // If we're not connecting, do nothing else
    if (!isConnecting) return;
    
    // If node is a parent container or handle or non-item node, ignore
    if (node.type === 'parentContainer' || 
        node.id.startsWith('handle-') || 
        node.id.startsWith('title-') || 
        node.id.startsWith('icon-') ||
        node.id.startsWith('filter-') ||
        node.id.startsWith('search-icon-') ||
        node.id.startsWith('domain-') || 
        node.id.startsWith('dragbar-') ||
        !node.parentNode) {
      console.log("Ignoring click on non-connectable node:", node.id, node);
      return;
    }
    
    console.log("Processing click on node:", node.id, "parent:", node.parentNode, "data:", node.data);
    
    // If this is a new connection (no source selected)
    if (!connectionSource) {
      // Verify this node has required data for connections
      const parentNode = nodes.find(n => n.id === node.parentNode);
      console.log("Retrieved parent node:", parentNode ? 
        { id: parentNode.id, data: parentNode.data, type: parentNode.type } : "Not found");
      
      if (!parentNode || !parentNode.data || !parentNode.data.label) {
        console.error("Cannot use node as connection source - missing parent domain info:", node);
        console.error("Parent node details:", parentNode ? 
          { id: parentNode.id, data: JSON.stringify(parentNode.data), parentId: node.parentNode } : 
          { searchedForId: node.parentNode });
        setError("Unable to start connection: Selected node doesn't have valid domain information.");
        return;
      }
      
      // Set the clicked node as the connection source
      setConnectionSource(node);
      console.log(`Connection source set: ${node.id} in domain ${parentNode.data.label}`);
      return;
    }
    
    // If we already have a source and this is a different node, complete the connection
    if (connectionSource.id !== node.id) {
      // Verify target node has required parent info
      const targetParentNode = nodes.find(n => n.id === node.parentNode);
      console.log("Retrieved target parent node:", targetParentNode ? 
        { id: targetParentNode.id, data: targetParentNode.data, type: targetParentNode.type } : "Not found");
      
      if (!targetParentNode || !targetParentNode.data || !targetParentNode.data.label) {
        console.error("Cannot use node as connection target - missing parent domain info:", node);
        console.error("Target parent node details:", targetParentNode ? 
          { id: targetParentNode.id, data: JSON.stringify(targetParentNode.data), parentId: node.parentNode } : 
          { searchedForId: node.parentNode });
        setError("Unable to complete connection: Target node doesn't have valid domain information.");
        return;
      }
      
      console.log(`Attempting connection: ${connectionSource.id} -> ${node.id}`);
      
      // Attempt to create the connection
      completeLink(connectionSource.id, node.id)
        .then(success => {
          console.log(`Connection attempt from ${connectionSource.id} to ${node.id}: ${success ? 'Success' : 'Failed'}`);
        })
        .catch(err => {
          console.error('Error completing connection:', err);
        });
    }
  }, [isConnecting, connectionSource, setConnectionSource, completeLink, nodes, setActiveDomainConfig, setError]);

  // Effect to cleanup after a connection is completed
  useEffect(() => {
    if (connectionSuccess) {
      // Force a recalculation of the edges when a connection is successfully created
      console.log("Connection successful - forcing edge recalculation");
      
      // Only do this once per successful connection
      if (!connectionCompleted.current) {
        connectionCompleted.current = true;
        
        // First update, to refresh immediately after success
        setTimeout(() => {
          if (showRelationshipLines) {
            const forceRefresh = [...nodes]; 
            setNodes(forceRefresh);
          }
        }, 100);
        
        // Second update, a bit later to catch any delayed data updates
        setTimeout(() => {
          if (showRelationshipLines) {
            const forceRefresh = [...nodes];
            setNodes(forceRefresh);
            
            // Reset the connection completed flag after the final refresh
            setTimeout(() => {
              connectionCompleted.current = false;
            }, 500);
          }
        }, 1000);
      }
    }
  }, [connectionSuccess, showRelationshipLines, nodes, setNodes]);

  // Effect to cleanup after a connection is completed
  useEffect(() => {
    if (connectionSuccess) {
      // Clear the connection success status after a delay
      const timer = setTimeout(() => {
        setConnectionSuccess(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [connectionSuccess]);

  // Effect to clean up temporary edges when connection state changes
  useEffect(() => {
    if (!isConnecting) {
      // Remove any temporary connection edge when not in connecting mode
      setEdges(edges => edges.filter(edge => edge.id !== 'temp-connection-edge'));
    }
  }, [isConnecting, setEdges]);

  // Add a function to delete a relationship
  const handleDeleteRelationship = useCallback(async (edgeId) => {
    try {
      // Parse the edge ID to get details
      const [sourceId, relationshipType, targetId] = edgeId.split('-');
      
      // Map relationship type to domain information
      const domainPairs = {
        'DRIVES': { fromDomain: 'Mission', toDomain: 'Scenario' },
        'REQUIRES': { fromDomain: 'Scenario', toDomain: 'Requirements' },
        'DEFINES': { fromDomain: 'Requirements', toDomain: 'Parameter' },
        'INPUT_TO': { fromDomain: 'Parameter', toDomain: 'Functions' }
      };
      
      // Get domain information for this relationship
      const domainInfo = domainPairs[relationshipType];
      if (!domainInfo) {
        setError(`Unknown relationship type: ${relationshipType}`);
        return;
      }
      
      console.log(`Attempting to delete relationship: ${sourceId} (${domainInfo.fromDomain}) -> ${targetId} (${domainInfo.toDomain})`);
      
      // Make API call to delete the relationship
      await fetchWithErrorHandling(createApiEndpoint('relationships'), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromId: sourceId,
          toId: targetId,
          fromDomain: domainInfo.fromDomain,
          toDomain: domainInfo.toDomain,
          relationshipType
        })
      });
      
      // Update local data to remove the relationship
      const updateLocalData = () => {
        if (domainInfo.fromDomain === 'Mission') {
          setMissions(prev => prev.map(item => {
            if (item.id === sourceId) {
              return {
                ...item,
                drivenScenarioIds: (item.drivenScenarioIds || []).filter(id => id !== targetId)
              };
            }
            return item;
          }));
        } else if (domainInfo.fromDomain === 'Scenario') {
          setScenarios(prev => prev.map(item => {
            if (item.id === sourceId) {
              return {
                ...item,
                requiredRequirementIds: (item.requiredRequirementIds || []).filter(id => id !== targetId)
              };
            }
            return item;
          }));
        } else if (domainInfo.fromDomain === 'Requirements') {
          setRequirements(prev => prev.map(item => {
            if (item.id === sourceId) {
              return {
                ...item,
                definedParameterIds: (item.definedParameterIds || []).filter(id => id !== targetId)
              };
            }
            return item;
          }));
        } else if (domainInfo.fromDomain === 'Parameter') {
          setParameters(prev => prev.map(item => {
            if (item.id === sourceId) {
              return {
                ...item,
                inputToFunctionIds: (item.inputToFunctionIds || []).filter(id => id !== targetId)
              };
            }
            return item;
          }));
        }
      };
      
      // Update local data and refresh UI
      updateLocalData();
      
      // Remove the edge from the UI
      setEdges(prev => prev.filter(edge => edge.id !== edgeId));
      
      // Also refresh the API data
      if (domainInfo.fromDomain === 'Mission') fetchMissions();
      else if (domainInfo.fromDomain === 'Scenario') fetchScenarios();
      else if (domainInfo.fromDomain === 'Requirements') fetchRequirements();
      else if (domainInfo.fromDomain === 'Parameter') fetchParameters();
      
      if (domainInfo.toDomain === 'Scenario') fetchScenarios();
      else if (domainInfo.toDomain === 'Requirements') fetchRequirements();
      else if (domainInfo.toDomain === 'Parameter') fetchParameters();
      else if (domainInfo.toDomain === 'Functions') fetchFunctions();
      
      setSuccessMessage('Relationship deleted successfully!');
    } catch (e) {
      console.error("Error deleting relationship:", e);
      setError(`Failed to delete relationship: ${e.message}`);
    }
  }, [
    fetchWithErrorHandling, 
    setMissions, 
    setScenarios, 
    setRequirements, 
    setParameters, 
    fetchMissions, 
    fetchScenarios, 
    fetchRequirements, 
    fetchParameters, 
    fetchFunctions, 
    setEdges, 
    setError, 
    setSuccessMessage
  ]);

  // Make handleDeleteRelationship available globally
  useEffect(() => {
    window.handleDeleteRelationship = handleDeleteRelationship;
    // Cleanup when component unmounts
    return () => {
      delete window.handleDeleteRelationship;
    };
  }, [handleDeleteRelationship]);

  // Enhanced edge context menu handling
  const onEdgeContextMenu = (event, edge) => {
    // This function is no longer needed as we handle context menu in the CustomEdge component
    // The CustomEdge component now handles all right-click interactions directly
    event.preventDefault();
  };

  // Function to update app configuration
  const updateConfig = useCallback(async (newConfig) => {
    try {
      const response = await fetchWithErrorHandling(createApiEndpoint('config'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newConfig)
      });
      setConfig(response);
      return response;
    } catch (e) {
      setError(`Failed to update configuration: ${e.message}`);
      throw e;
    }
  }, [fetchWithErrorHandling, setError]);

  // Handle toggling adjacent connections setting
  const handleSetAllowOnlyAdjacentConnections = useCallback(async (value) => {
    if (!config) return;
    
    try {
      // Update local state
      setAllowOnlyAdjacentConnections(value);
      
      // Update server config
      const newConfig = {
        ...config,
        allowOnlyAdjacentConnections: value
      };
      
      await updateConfig(newConfig);
      setSuccessMessage(value ? 
        'Connection mode set to adjacent domains only' : 
        'Connection mode set to allow cross-sequence connections');
    } catch (error) {
      console.error("Error updating connection mode:", error);
      // Revert local state if server update fails
      setAllowOnlyAdjacentConnections(!value);
    }
  }, [config, updateConfig, setSuccessMessage]);

  // Update the updateLocalRelationship implementation
  useEffect(() => {
    // Function to update local data structures after creating a relationship
    updateLocalRelationshipRef.current = (fromDomain, fromId, toId) => {
      console.log(`Updating relationship: ${fromDomain} (${fromId}) -> ${toId}`);
      
      // Update local state based on domain type
      if (fromDomain === 'Mission') {
        setMissions(prev => prev.map(item => {
          if (item.id === fromId) {
            return {
              ...item,
              drivenScenarioIds: [...(item.drivenScenarioIds || []), toId]
            };
          }
          return item;
        }));
      } else if (fromDomain === 'Scenario') {
        setScenarios(prev => prev.map(item => {
          if (item.id === fromId) {
            return {
              ...item,
              requiredRequirementIds: [...(item.requiredRequirementIds || []), toId]
            };
          }
          return item;
        }));
      } else if (fromDomain === 'Requirements') {
        setRequirements(prev => prev.map(item => {
          if (item.id === fromId) {
            return {
              ...item,
              definedParameterIds: [...(item.definedParameterIds || []), toId]
            };
          }
          return item;
        }));
      } else if (fromDomain === 'Parameter') {
        setParameters(prev => prev.map(item => {
          if (item.id === fromId) {
            return {
              ...item,
              inputToFunctionIds: [...(item.inputToFunctionIds || []), toId]
            };
          }
          return item;
        }));
      }

      // Refresh the display by forcing a nodes update
      setNodes([...nodes]);
      
      // Also refresh the API data
      if (fromDomain === 'Mission') fetchMissions();
      else if (fromDomain === 'Scenario') fetchScenarios();
      else if (fromDomain === 'Requirements') fetchRequirements();
      else if (fromDomain === 'Parameter') fetchParameters();
      
      // Refresh the target domain data as well
      const targetDomainMap = {
        'Mission': 'Scenario',
        'Scenario': 'Requirements',
        'Requirements': 'Parameter',
        'Parameter': 'Functions'
      };
      
      const targetDomain = targetDomainMap[fromDomain];
      if (targetDomain === 'Scenario') fetchScenarios();
      else if (targetDomain === 'Requirements') fetchRequirements();
      else if (targetDomain === 'Parameter') fetchParameters();
      else if (targetDomain === 'Functions') fetchFunctions();
    };
  }, [
    setMissions, 
    setScenarios, 
    setRequirements, 
    setParameters, 
    nodes, 
    setNodes, 
    fetchMissions, 
    fetchScenarios, 
    fetchRequirements, 
    fetchParameters, 
    fetchFunctions
  ]);

  // Add effect to update only edge types when lineType changes
  useEffect(() => {
    // Skip if there are no edges or we're still loading
    if (edges.length === 0 || !appInitialized) return;
    
    console.log("Updating edge types based on line type preference...");
    
    // Update all edges to use the new edge type
    const updatedEdges = edges.map(edge => ({
      ...edge,
      type: lineType,
      markerEnd: {
        ...edge.markerEnd,
        type: MarkerType[arrowheadType]
      }
    }));
    
    // Force a complete re-render of the edges
    setEdges([]);
    
    // Use setTimeout to ensure the state update cycle completes
    setTimeout(() => {
      setEdges(updatedEdges);
    }, 10);
  }, [lineType, arrowheadType, appInitialized, edges.length, setEdges]);

  // --- Main JSX for Flow View --- 
  return (
    <div className="flow-view-container" style={{ height: '100%' }}>
      {/* Display API Error Message if there's an error */}
      {error && <APIErrorMessage error={error} onRetry={retryAllConnections} />}
      
      {/* Show loading UI if not initialized */}
      {(!appInitialized || isLoadingConfig) && (
        <div className="loading-container">
          <div className="loading-message">
            <h2>Connecting to Digital Thread API...</h2>
            <p>Please ensure the server is running.</p>
            <button className="retry-button" onClick={retryAllConnections}>Retry Connection</button>
          </div>
        </div>
      )}
      
      {/* Only render React Flow when initialized */}
      {appInitialized && (
        <>
          {/* React Flow Canvas */} 
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={handleNodeClick}
            onNodeMouseEnter={handleNodeMouseEnter}
            onNodeMouseLeave={handleNodeMouseLeave}
            onMouseMove={handleMouseMove}
            onEdgeContextMenu={onEdgeContextMenu}  // Add context menu for edges
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}  // Add edge types
            fitView
            snapToGrid={true}
            snapGrid={[20, 20]}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            panOnDrag={[2]} // Only pan when middle mouse button (2) is used
            minZoom={0.5}
            maxZoom={1.5}
            nodesDraggable={true} // Ensure nodes are draggable
            elementsSelectable={false} // Prevent selection by default
            style={{ cursor: 'default' }} // Set default cursor for the flow area
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls />
            <MiniMap />
            
            {/* Move Connector Toolbar inside ReactFlow to get it out of the header */}
            <Panel position="top-center" style={{ 
              background: 'transparent', 
              border: 'none',
              boxShadow: 'none'
            }}>
              <ConnectorToolbar
                onStartConnecting={handleStartConnecting}
                onCancelConnecting={handleCancelConnecting}
                isConnecting={isConnecting}
                fromNode={connectionSource}
                connectionSuccess={connectionSuccess}
                position={{ x: window.innerWidth / 2 - 175, y: 80 }} // Position it lower inside the FlowView
              />
            </Panel>
            
            {/* Add Relationship Legend (Bottom-Right) */}
            <Panel position="bottom-right" style={{ 
              padding: '10px', 
              background: 'white', 
              borderRadius: '5px', 
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)', 
              marginBottom: '40px' 
            }}>
              <RelationshipLegend />
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
            onStartConnecting={handleStartConnecting}
            allowOnlyAdjacentConnections={allowOnlyAdjacentConnections}
            setAllowOnlyAdjacentConnections={handleSetAllowOnlyAdjacentConnections}
            useCurvedEdges={useCurvedEdges}
            setUseCurvedEdges={setUseCurvedEdges}
            lineType={lineType}
            setLineType={setLineType}
            arrowheadType={arrowheadType}
            setArrowheadType={setArrowheadType}
          />
          
          {/* Domain Configuration Panel */}
          <DomainConfigPanel 
            isOpen={activeDomainConfig !== null}
            onClose={closeDomainConfigPanel}
            domainName={activeDomainConfig || ''}
          />
        </>
      )}
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
