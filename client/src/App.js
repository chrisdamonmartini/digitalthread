import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Define the backend API base URL
// In development, React runs on 3000, backend on 3001
// We need to proxy requests or use the full URL.
// Using the full URL is simpler for now.
const API_URL = 'http://localhost:3001/api';

function App() {
  // State for Missions
  const [missions, setMissions] = useState([]);
  const [isLoadingMissions, setIsLoadingMissions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); 
  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [newMissionDescription, setNewMissionDescription] = useState('');
  const [numMissions, setNumMissions] = useState(10);
  const [minSubMissions, setMinSubMissions] = useState(4);
  const [maxSubMissions, setMaxSubMissions] = useState(8);
  
  // State for Configuration
  const [appConfig, setAppConfig] = useState(null);
  const [localDomainOrder, setLocalDomainOrder] = useState([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
  const [configDirty, setConfigDirty] = useState(false);

  // General Error State
  const [error, setError] = useState(null);

  // --- Fetch Config --- 
  const fetchConfig = useCallback(async () => {
    setIsLoadingConfig(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/config`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
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
  }, []);

  // --- Fetch Missions --- 
  const fetchMissions = useCallback(async () => {
    setIsLoadingMissions(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/missions`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setMissions(data);
    } catch (e) {
      console.error("Error fetching missions:", e);
      setError('Failed to load missions. Is the backend server running?');
    } finally {
      setIsLoadingMissions(false);
    }
  }, []); 

  // Fetch initial data (config and missions)
  useEffect(() => {
    fetchConfig();
    fetchMissions();
  }, [fetchConfig, fetchMissions]); 

  // --- Add Mission --- 
  const handleAddMission = async (event) => {
    event.preventDefault(); 
    if (!newMissionTitle.trim()) {
      alert('Please enter a mission title.');
      return;
    }
    setIsLoadingMissions(true); 
    setError(null);
    try {
      const response = await fetch(`${API_URL}/missions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: newMissionTitle,
          description: newMissionDescription 
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); 
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
      setNewMissionTitle('');
      setNewMissionDescription('');
      await fetchMissions(); 
    } catch (e) {
      console.error("Error adding mission:", e);
      setError(`Failed to add mission: ${e.message}`);
    } finally {
      setIsLoadingMissions(false); 
    }
  };

  // --- Bulk Generate Missions --- 
  const handleBulkGenerate = async (event) => {
    event.preventDefault();
    if (numMissions <= 0 || minSubMissions < 0 || maxSubMissions < minSubMissions) {
        alert('Please enter valid numbers for generation. Max sub-missions must be >= min sub-missions.');
        return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/missions/bulk-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          count: numMissions,      
          minSubs: minSubMissions, 
          maxSubs: maxSubMissions  
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
      const resultData = await response.json();
      console.log('Bulk generation successful:', resultData.message);
      await fetchMissions(); 
    } catch (e) {
      console.error("Error bulk generating missions:", e);
      setError(`Failed to bulk generate missions: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // --- Config Update Logic --- 

  // Generic function to update config on backend
  const updateConfigOnBackend = async (configUpdate) => {
      setIsUpdatingConfig(true);
      setError(null);
      try {
          const response = await fetch(`${API_URL}/config`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(configUpdate),
          });
          if (!response.ok) {
              const errorData = await response.json().catch(() => ({})); 
              throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Unknown error'}`);
          }
          const updatedConfig = await response.json();
          setAppConfig(updatedConfig); // Update main config state
          if (configUpdate.domainOrder) {
             setLocalDomainOrder(updatedConfig.domainOrder || []);
             setConfigDirty(false); 
          }
          console.log('Config updated successfully');
          return true; // Indicate success
      } catch (e) {
          console.error("Error updating config:", e);
          setError(`Failed to update config: ${e.message}`);
          return false; // Indicate failure
      } finally {
          setIsUpdatingConfig(false);
      }
  };
  
  // Handler for toggling adjacent connections
  const handleToggleAdjacentConnections = async (event) => {
      const newSetting = event.target.checked;
      if (!appConfig) return; 
      // Call the generic update function
      updateConfigOnBackend({ allowOnlyAdjacentConnections: newSetting });
  };

  // Handlers for reordering domains locally
  const moveDomain = (index, direction) => {
    const newOrder = [...localDomainOrder];
    const item = newOrder[index];
    const swapIndex = index + direction;

    if (swapIndex < 0 || swapIndex >= newOrder.length) {
      return; // Cannot move outside bounds
    }

    // Swap items
    newOrder[index] = newOrder[swapIndex];
    newOrder[swapIndex] = item;

    setLocalDomainOrder(newOrder);
    setConfigDirty(true); // Mark config as changed
  };

  // Handler for saving the reordered domains
  const handleSaveDomainOrder = async () => {
    if (!configDirty) return; // No changes to save
    // Call the generic update function
    const success = await updateConfigOnBackend({ domainOrder: localDomainOrder });
    // Note: configDirty flag is reset inside updateConfigOnBackend on success
  };

  // Determine combined loading state for disabling forms
  const isBusy = isLoadingMissions || isGenerating || isLoadingConfig || isUpdatingConfig;

  return (
    <div className="App">
      <header className="App-header">
        <h1>Digital Thread Navigator</h1>
      </header>
      
      {/* --- Settings Display --- */} 
      <section className="settings-panel">
         <h2>Configuration Settings</h2>
         {isLoadingConfig && <p>Loading configuration...</p>}
         {!isLoadingConfig && appConfig && (
            <div className="config-details">
                <div className="config-domain-order">
                    <strong>Domain Order:</strong>
                    <ol className="domain-order-list">
                      {localDomainOrder.map((domain, index) => (
                        <li key={domain}> 
                           <span>{domain}</span>
                           <div className="order-buttons">
                              <button 
                                 onClick={() => moveDomain(index, -1)} 
                                 disabled={index === 0 || isUpdatingConfig}
                                 title="Move Up"
                              >
                                 &uarr; {/* Up arrow */}
                              </button>
                              <button 
                                 onClick={() => moveDomain(index, 1)} 
                                 disabled={index === localDomainOrder.length - 1 || isUpdatingConfig}
                                 title="Move Down"
                              >
                                 &darr; {/* Down arrow */}
                              </button>
                           </div>
                        </li>
                      ))}
                    </ol>
                    {configDirty && (
                       <button 
                          onClick={handleSaveDomainOrder} 
                          disabled={isUpdatingConfig} 
                          className="save-order-button"
                       >
                          {isUpdatingConfig ? 'Saving Order...' : 'Save Domain Order'}
                       </button>
                    )}
                </div>
                
                <div className="config-toggle">
                   <label htmlFor="adjacent-toggle">Allow Only Adjacent Connections:</label>
                   <input 
                     type="checkbox" 
                     id="adjacent-toggle"
                     checked={appConfig.allowOnlyAdjacentConnections || false}
                     onChange={handleToggleAdjacentConnections}
                     disabled={isBusy}
                   />
                   <span>{isUpdatingConfig && !configDirty ? '(Updating...)' : ''}</span>
                </div>
            </div>
         )}
         {!isLoadingConfig && !appConfig && <p>Could not load configuration.</p>} 
         {error && <p className="error" style={{marginTop: '10px'}}>Error: {error}</p>}
      </section>
      
      <main>
        {localDomainOrder.map(domainName => {
           if (domainName === 'Mission') {
               return (
                   <section key={domainName} className="domain-column">
                    <h2>{domainName}</h2>
                    
                    <form onSubmit={handleAddMission} className="add-item-form">
                        <h3>Add New {domainName}</h3>
                        <div>
                            <label htmlFor={`${domainName}-title`}>Title:</label>
                            <input 
                                type="text"
                                id={`${domainName}-title`}
                                value={newMissionTitle}
                                onChange={(e) => setNewMissionTitle(e.target.value)}
                                required
                                placeholder={`Enter ${domainName} title`}
                                disabled={isBusy}
                            />
                         </div>
                         <div>
                            <label htmlFor={`${domainName}-desc`}>Description:</label>
                            <textarea
                                id={`${domainName}-desc`}
                                value={newMissionDescription}
                                onChange={(e) => setNewMissionDescription(e.target.value)}
                                placeholder={`(Optional) Enter description`}
                                disabled={isBusy}
                            />
                         </div>
                         <button type="submit" disabled={isBusy}>
                             {isLoadingMissions ? 'Adding...' : `Add ${domainName}`}
                         </button>
                    </form>

                    <form onSubmit={handleBulkGenerate} className="add-item-form bulk-generate-form">
                        <h3>Bulk Generate {domainName}s</h3>
                        <div>
                           <label htmlFor="num-missions">Number of Top-Level {domainName}s:</label>
                           <input 
                               type="number"
                               id="num-missions"
                               value={numMissions}
                               onChange={(e) => setNumMissions(parseInt(e.target.value, 10) || 0)}
                               min="1"
                               required
                               disabled={isBusy}
                           />
                        </div>
                        <div>
                           <label htmlFor="min-subs">Min Sub-{domainName}s per {domainName}:</label>
                           <input 
                               type="number"
                               id="min-subs"
                               value={minSubMissions}
                               onChange={(e) => setMinSubMissions(parseInt(e.target.value, 10) || 0)}
                               min="0"
                               required
                               disabled={isBusy}
                            />
                         </div>
                         <div>
                             <label htmlFor="max-subs">Max Sub-{domainName}s per {domainName}:</label>
                             <input 
                                 type="number"
                                 id="max-subs"
                                 value={maxSubMissions}
                                 onChange={(e) => setMaxSubMissions(parseInt(e.target.value, 10) || 0)}
                                 min={minSubMissions} 
                                 required
                                 disabled={isBusy}
                             />
                          </div>
                          <button type="submit" disabled={isBusy}>
                              {isGenerating ? 'Generating...' : `Generate ${domainName}s`}
                          </button>
                    </form>

                    <div className="item-list">
                      {(isLoadingMissions || isGenerating) && <p>Loading/Generating {domainName}s...</p>} 
                      {!isLoadingMissions && !isGenerating && !error && missions.length === 0 && (
                        <p>No {domainName}s found. Add one or generate some!</p>
                      )}
                      {!isLoadingMissions && !isGenerating && !error && missions.length > 0 && (
                        <ul>
                          {missions.map((mission) => (
                            <li key={mission.id} className="item-card">
                              <strong>{mission.id}: {mission.title}</strong>
                              {mission.description && <p>{mission.description}</p>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                   </section>
               );
           } else {
              return (
                 <section key={domainName} className="domain-column placeholder-column">
                   <h2>{domainName}</h2>
                   <p>(Content for {domainName} domain)</p>
                 </section>
              );
           }
        })}
      </main>
    </div>
  );
}

export default App;
