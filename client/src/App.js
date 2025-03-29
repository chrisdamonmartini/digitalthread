import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Define the backend API base URL
// In development, React runs on 3000, backend on 3001
// We need to proxy requests or use the full URL.
// Using the full URL is simpler for now.
const API_URL = 'http://localhost:3001/api';

function App() {
  const [missions, setMissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [newMissionDescription, setNewMissionDescription] = useState('');

  // --- Fetch Missions --- 
  const fetchMissions = useCallback(async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  }, []); // useCallback ensures this function identity is stable

  // Fetch missions on initial component mount
  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]); // Re-run if fetchMissions changes (it won't due to useCallback)

  // --- Add Mission --- 
  const handleAddMission = async (event) => {
    event.preventDefault(); // Prevent default form submission
    if (!newMissionTitle.trim()) {
      alert('Please enter a mission title.');
      return;
    }
    setIsLoading(true); // Indicate activity
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
        const errorData = await response.json().catch(() => ({})); // Try to get error details
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      // Clear the form
      setNewMissionTitle('');
      setNewMissionDescription('');
      // Refresh the mission list to show the new one
      await fetchMissions(); 

    } catch (e) {
      console.error("Error adding mission:", e);
      setError(`Failed to add mission: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Digital Thread Navigator</h1>
      </header>
      <main>
        <section className="domain-column">
          <h2>Missions</h2>
          
          {/* Add Mission Form */} 
          <form onSubmit={handleAddMission} className="add-item-form">
             <h3>Add New Mission</h3>
             <div>
                <label htmlFor="mission-title">Title:</label>
                <input 
                  type="text"
                  id="mission-title"
                  value={newMissionTitle}
                  onChange={(e) => setNewMissionTitle(e.target.value)}
                  required
                  placeholder="Enter mission title"
                />
             </div>
             <div>
                <label htmlFor="mission-desc">Description:</label>
                <textarea
                  id="mission-desc"
                  value={newMissionDescription}
                  onChange={(e) => setNewMissionDescription(e.target.value)}
                  placeholder="(Optional) Enter description"
                />
             </div>
             <button type="submit" disabled={isLoading}>
               {isLoading ? 'Adding...' : 'Add Mission'}
             </button>
          </form>
          
          {/* Display Missions */} 
          <div className="item-list">
            {isLoading && <p>Loading missions...</p>}
            {error && <p className="error">Error: {error}</p>}
            {!isLoading && !error && missions.length === 0 && (
              <p>No missions found. Add one above!</p>
            )}
            {!isLoading && !error && missions.length > 0 && (
              <ul>
                {missions.map((mission) => (
                  <li key={mission.id} className="item-card">
                    <strong>{mission.id}: {mission.title}</strong>
                    {mission.description && <p>{mission.description}</p>}
                    {/* Add buttons for details, edit, delete later */}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Add columns for other domains (Scenario, Requirements, etc.) later */} 
      </main>
    </div>
  );
}

export default App;
