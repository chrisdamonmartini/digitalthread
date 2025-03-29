import React, { useState } from 'react';

function ControlPanel({ 
    // Pass all necessary state and handlers from App.js
    localDomainOrder = [], // Default to empty array
    isBusy, 
    isGenerating, 
    // Add handlers
    onAddItem, 
    onBulkGenerate, 
    // Add Form State
    newMissionTitle, setNewMissionTitle, newMissionDescription, setNewMissionDescription, 
    newScenarioTitle, setNewScenarioTitle, newScenarioDescription, setNewScenarioDescription,
    newRequirementTitle, setNewRequirementTitle, newRequirementDescription, setNewRequirementDescription,
    newParameterTitle, setNewParameterTitle, newParameterDescription, setNewParameterDescription, newParameterUnit, setNewParameterUnit, newParameterValueType, setNewParameterValueType,
    newFunctionTitle, setNewFunctionTitle, newFunctionDescription, setNewFunctionDescription, newFunctionType, setNewFunctionType,
    // Bulk Form State
    numMissions, setNumMissions, minSubMissions, setMinSubMissions, maxSubMissions, setMaxSubMissions,
    // Loading States for Add buttons (optional, could use isBusy)
    isLoadingMissions, isLoadingScenarios, isLoadingRequirements, isLoadingParameters, isLoadingFunctions,
}) {
    
    const [selectedDomain, setSelectedDomain] = useState(localDomainOrder[0] || ''); // Default to first domain

    // Function to get the correct Add form based on selectedDomain
    const renderAddForm = () => {
        switch(selectedDomain) {
            case 'Mission':
                return (
                    <form onSubmit={(e) => onAddItem(e, 'Mission')} className="add-item-form">
                      <h3>Add New {selectedDomain}</h3>
                      <div><label>Title:</label><input type="text" value={newMissionTitle} onChange={(e) => setNewMissionTitle(e.target.value)} required disabled={isBusy}/></div>
                      <div><label>Description:</label><textarea value={newMissionDescription} onChange={(e) => setNewMissionDescription(e.target.value)} disabled={isBusy}/></div>
                      <button type="submit" disabled={isBusy}>{isLoadingMissions ? 'Adding...' : `Add ${selectedDomain}`}</button>
                    </form>
                );
            case 'Scenario':
                 return (
                    <form onSubmit={(e) => onAddItem(e, 'Scenario')} className="add-item-form">
                      <h3>Add New {selectedDomain}</h3>
                      <div><label>Title:</label><input type="text" value={newScenarioTitle} onChange={(e) => setNewScenarioTitle(e.target.value)} required disabled={isBusy}/></div>
                      <div><label>Description:</label><textarea value={newScenarioDescription} onChange={(e) => setNewScenarioDescription(e.target.value)} disabled={isBusy}/></div>
                      <button type="submit" disabled={isBusy}>{isLoadingScenarios ? 'Adding...' : `Add ${selectedDomain}`}</button>
                    </form>
                );
            case 'Requirements':
                 return (
                    <form onSubmit={(e) => onAddItem(e, 'Requirements')} className="add-item-form">
                      <h3>Add New {selectedDomain}</h3>
                      <div><label>Title:</label><input type="text" value={newRequirementTitle} onChange={(e) => setNewRequirementTitle(e.target.value)} required disabled={isBusy}/></div>
                      <div><label>Description:</label><textarea value={newRequirementDescription} onChange={(e) => setNewRequirementDescription(e.target.value)} disabled={isBusy}/></div>
                      <button type="submit" disabled={isBusy}>{isLoadingRequirements ? 'Adding...' : `Add ${selectedDomain}`}</button>
                    </form>
                );
            case 'Parameter':
                 return (
                    <form onSubmit={(e) => onAddItem(e, 'Parameter')} className="add-item-form">
                      <h3>Add New {selectedDomain}</h3>
                      <div><label>Title:</label><input type="text" value={newParameterTitle} onChange={(e) => setNewParameterTitle(e.target.value)} required disabled={isBusy}/></div>
                      <div><label>Unit:</label><input type="text" value={newParameterUnit} onChange={(e) => setNewParameterUnit(e.target.value)} placeholder="e.g., kg, m/s" disabled={isBusy}/></div>
                      <div><label>Value Type:</label>
                         <select value={newParameterValueType} onChange={(e) => setNewParameterValueType(e.target.value)} disabled={isBusy}>
                            <option value="number">Number</option><option value="string">String</option><option value="boolean">Boolean</option><option value="range">Range</option>
                         </select>
                      </div>
                      <div><label>Description:</label><textarea value={newParameterDescription} onChange={(e) => setNewParameterDescription(e.target.value)} disabled={isBusy}/></div>
                      <button type="submit" disabled={isBusy}>{isLoadingParameters ? 'Adding...' : `Add ${selectedDomain}`}</button>
                    </form>
                );
            case 'Functions':
                 return (
                    <form onSubmit={(e) => onAddItem(e, 'Functions')} className="add-item-form">
                      <h3>Add New {selectedDomain}</h3>
                      <div><label>Title:</label><input type="text" value={newFunctionTitle} onChange={(e) => setNewFunctionTitle(e.target.value)} required disabled={isBusy}/></div>
                      <div><label>Type:</label><input type="text" value={newFunctionType} onChange={(e) => setNewFunctionType(e.target.value)} placeholder="e.g., Control" disabled={isBusy}/></div>
                      <div><label>Description:</label><textarea value={newFunctionDescription} onChange={(e) => setNewFunctionDescription(e.target.value)} disabled={isBusy}/></div>
                      <button type="submit" disabled={isBusy}>{isLoadingFunctions ? 'Adding...' : `Add ${selectedDomain}`}</button>
                    </form>
                );
            // Add cases for other domains
            default:
                return <p>Select a domain to add items.</p>;
        }
    };

    // Bulk Generate Form (Doesn't depend on selectedDomain, uses shared state)
    const BulkGenerateFormComponent = (
        <form onSubmit={(e) => onBulkGenerate(e, selectedDomain)} className="add-item-form bulk-generate-form">
            <h3>Bulk Generate {selectedDomain}s</h3>
            <div><label>Number of Top-Level:</label><input type="number" value={numMissions} onChange={(e) => setNumMissions(parseInt(e.target.value, 10) || 0)} min="1" required disabled={isBusy}/></div>
            <div><label>Min Sub-Items:</label><input type="number" value={minSubMissions} onChange={(e) => setMinSubMissions(parseInt(e.target.value, 10) || 0)} min="0" required disabled={isBusy}/></div>
            <div><label>Max Sub-Items:</label><input type="number" value={maxSubMissions} onChange={(e) => setMaxSubMissions(parseInt(e.target.value, 10) || 0)} min={minSubMissions} required disabled={isBusy}/></div>
            <button type="submit" disabled={isBusy || !selectedDomain}>{isGenerating ? 'Generating...' : `Generate ${selectedDomain}s`}</button>
        </form>
    );

    return (
        <div className="control-panel">
            <h2>Controls</h2>
            
            {/* Domain Selector */} 
            <div className="form-section">
                <label htmlFor="domain-select">Select Domain:</label>
                <select 
                    id="domain-select" 
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                >
                    <option value="" disabled>-- Select Domain --</option>
                    {localDomainOrder.map(domain => (
                        <option key={domain} value={domain}>{domain}</option>
                    ))}
                </select>
            </div>

            {/* Conditional Add Form */} 
            <div className="form-section">
                {selectedDomain && renderAddForm()} 
            </div>

            {/* Bulk Generate Form */} 
            <div className="form-section">
                {selectedDomain && BulkGenerateFormComponent}
            </div>
            
            {/* TODO: Add Delete Controls? */} 
        </div>
    );
}

export default ControlPanel; 