import React from 'react';

// Reusable Bulk Generate Form Component (extracted or defined similarly)
// For simplicity now, assume BulkGenerateFormComponent is passed as a prop or re-defined here

// Example definition (should match the one in App.js for now)
const BulkGenerateFormComponent = ({ domainName, numMissions, setNumMissions, minSubMissions, setMinSubMissions, maxSubMissions, setMaxSubMissions, handleBulkGenerate, isBusy, isGenerating }) => (
    <form onSubmit={(e) => handleBulkGenerate(e, domainName)} className="add-item-form bulk-generate-form">
        <h3>Bulk Generate {domainName}s</h3>
        <div><label>Number of Top-Level:</label><input type="number" value={numMissions} onChange={(e) => setNumMissions(parseInt(e.target.value, 10) || 0)} min="1" required disabled={isBusy}/></div>
        <div><label>Min Sub-Items:</label><input type="number" value={minSubMissions} onChange={(e) => setMinSubMissions(parseInt(e.target.value, 10) || 0)} min="0" required disabled={isBusy}/></div>
        <div><label>Max Sub-Items:</label><input type="number" value={maxSubMissions} onChange={(e) => setMaxSubMissions(parseInt(e.target.value, 10) || 0)} min={minSubMissions} required disabled={isBusy}/></div>
        <button type="submit" disabled={isBusy}>{isGenerating ? 'Generating...' : `Generate ${domainName}s`}</button>
    </form>
);


function DomainColumn({
    // Data & State Props
    domainName,
    items, // Array of items for this domain (e.g., missions, scenarios)
    isLoading, // Loading state specific to this domain's data
    isBusy, // Overall busy state for disabling actions
    isGenerating, // Bulk generation state
    linkingState, // { fromId, fromDomain }
    appConfig, // To check allowOnlyAdjacentConnections if needed here
    localDomainOrder, // Needed to calculate if this is a target column
    domainIndex, // Index of this domain in the order

    // State Setters for Forms (passed down from App.js)
    // Mission Form Specific (Example - will need to generalize or pass conditionally)
    newMissionTitle, setNewMissionTitle, newMissionDescription, setNewMissionDescription, 
    // Scenario Form Specific
    newScenarioTitle, setNewScenarioTitle, newScenarioDescription, setNewScenarioDescription,
    // Requirement Form Specific
    newRequirementTitle, setNewRequirementTitle, newRequirementDescription, setNewRequirementDescription,
    // Parameter Form Specific
    newParameterTitle, setNewParameterTitle, newParameterDescription, setNewParameterDescription, newParameterUnit, setNewParameterUnit, newParameterValueType, setNewParameterValueType,
    // Bulk Generate Form Specific (shared state)
    numMissions, setNumMissions, minSubMissions, setMinSubMissions, maxSubMissions, setMaxSubMissions,
    // Function Form Specific
    newFunctionTitle, setNewFunctionTitle, newFunctionDescription, setNewFunctionDescription, newFunctionType, setNewFunctionType,

    // Handler Function Props (passed down from App.js)
    onAddItem, // Function to call when 'Add' form is submitted
    onBulkGenerate, // Function for bulk generation
    onStartLinking, // Function to initiate linking from an item
    onCompleteLink, // Function to complete linking to an item
    error // Display error if relevant to this column (optional)
}) {

    // Determine if this column is a valid target for the current linking operation
    let isTargetColumn = false;
    if (linkingState.fromId && appConfig) { 
        const fromDomainIndex = localDomainOrder.indexOf(linkingState.fromDomain);
        if (appConfig.allowOnlyAdjacentConnections) {
            isTargetColumn = (domainIndex === fromDomainIndex + 1);
        } else {
            isTargetColumn = (domainIndex > fromDomainIndex); // Allow linking forward
        }
    }
    const isActiveSourceColumn = linkingState.fromDomain === domainName;

    // --- Define Forms based on domainName --- 
    let AddFormComponent = null;
    if (domainName === 'Mission') {
        AddFormComponent = (
            <form onSubmit={onAddItem} className="add-item-form">
              <h3>Add New {domainName}</h3>
              <div><label>Title:</label><input type="text" value={newMissionTitle} onChange={(e) => setNewMissionTitle(e.target.value)} required placeholder={`Enter ${domainName} title`} disabled={isBusy}/></div>
              <div><label>Description:</label><textarea value={newMissionDescription} onChange={(e) => setNewMissionDescription(e.target.value)} placeholder={`(Optional) Enter description`} disabled={isBusy}/></div>
              <button type="submit" disabled={isBusy}>{isLoading ? 'Adding...' : `Add ${domainName}`}</button>
            </form>
        );
    } else if (domainName === 'Scenario') {
         AddFormComponent = (
            <form onSubmit={onAddItem} className="add-item-form">
              <h3>Add New {domainName}</h3>
              <div><label>Title:</label><input type="text" value={newScenarioTitle} onChange={(e) => setNewScenarioTitle(e.target.value)} required disabled={isBusy}/></div>
              <div><label>Description:</label><textarea value={newScenarioDescription} onChange={(e) => setNewScenarioDescription(e.target.value)} disabled={isBusy}/></div>
              <button type="submit" disabled={isBusy}>{isLoading ? 'Adding...' : `Add ${domainName}`}</button>
            </form>
        );
    } else if (domainName === 'Requirements') {
         AddFormComponent = (
            <form onSubmit={onAddItem} className="add-item-form">
              <h3>Add New {domainName}</h3>
              <div><label>Title:</label><input type="text" value={newRequirementTitle} onChange={(e) => setNewRequirementTitle(e.target.value)} required disabled={isBusy}/></div>
              <div><label>Description:</label><textarea value={newRequirementDescription} onChange={(e) => setNewRequirementDescription(e.target.value)} disabled={isBusy}/></div>
              <button type="submit" disabled={isBusy}>{isLoading ? 'Adding...' : `Add ${domainName}`}</button>
            </form>
        );
    } else if (domainName === 'Parameter') {
         AddFormComponent = (
            <form onSubmit={onAddItem} className="add-item-form">
              <h3>Add New {domainName}</h3>
              <div><label>Title:</label><input type="text" value={newParameterTitle} onChange={(e) => setNewParameterTitle(e.target.value)} required disabled={isBusy}/></div>
              <div><label>Unit:</label><input type="text" value={newParameterUnit} onChange={(e) => setNewParameterUnit(e.target.value)} placeholder="e.g., kg, m/s" disabled={isBusy}/></div>
              <div><label>Value Type:</label>
                 <select value={newParameterValueType} onChange={(e) => setNewParameterValueType(e.target.value)} disabled={isBusy}>
                    <option value="number">Number</option>
                    <option value="string">String</option>
                    <option value="boolean">Boolean</option>
                    <option value="range">Range</option>
                 </select>
              </div>
              <div><label>Description:</label><textarea value={newParameterDescription} onChange={(e) => setNewParameterDescription(e.target.value)} disabled={isBusy}/></div>
              <button type="submit" disabled={isBusy}>{isLoading ? 'Adding...' : `Add ${domainName}`}</button>
            </form>
        );
    } else if (domainName === 'Functions') {
         AddFormComponent = (
            <form onSubmit={onAddItem} className="add-item-form">
              <h3>Add New {domainName}</h3>
              <div><label>Title:</label><input type="text" value={newFunctionTitle} onChange={(e) => setNewFunctionTitle(e.target.value)} required disabled={isBusy}/></div>
              <div><label>Type:</label><input type="text" value={newFunctionType} onChange={(e) => setNewFunctionType(e.target.value)} placeholder="e.g., Control, Calculation" disabled={isBusy}/></div>
              <div><label>Description:</label><textarea value={newFunctionDescription} onChange={(e) => setNewFunctionDescription(e.target.value)} disabled={isBusy}/></div>
              <button type="submit" disabled={isBusy}>{isLoading ? 'Adding...' : `Add ${domainName}`}</button>
            </form>
        );
    }

    // --- Render --- 
    if (!items) { // Handle case where items might not be loaded yet (or domain not implemented)
        return (
            <section key={domainName} className={`domain-column placeholder-column ${isTargetColumn ? 'linking-target' : ''}`}>
              <h2>{domainName}</h2>
              <p>(Content for {domainName} domain)</p>
              {isTargetColumn && (
                  <ul style={{marginTop: '20px'}}>
                      <li className="item-card clickable-target" onClick={() => alert('Linking to placeholder not implemented')}>Placeholder Item 1</li>
                      <li className="item-card clickable-target" onClick={() => alert('Linking to placeholder not implemented')}>Placeholder Item 2</li>
                  </ul>
              )}
            </section>
        );
    }

    return (
        <section key={domainName} className={`domain-column ${isTargetColumn ? 'linking-target' : ''} ${isActiveSourceColumn ? 'linking-active' : ''}`}>
            <h2>{domainName}</h2>
            
            {AddFormComponent} {/* Render the correct Add form */} 
            
            <BulkGenerateFormComponent 
                domainName={domainName} 
                numMissions={numMissions} setNumMissions={setNumMissions} 
                minSubMissions={minSubMissions} setMinSubMissions={setMinSubMissions} 
                maxSubMissions={maxSubMissions} setMaxSubMissions={setMaxSubMissions}
                handleBulkGenerate={onBulkGenerate}
                isBusy={isBusy}
                isGenerating={isGenerating}
            />
            
            <div className="item-list">
                {isLoading && <p>Loading...</p>}
                {!isLoading && items.length === 0 && <p>No {domainName}s found.</p>}
                {!isLoading && items.map((item) => {
                    // Determine if this item is a valid target for the current linking operation
                    let itemIsClickableTarget = false;
                    if (isTargetColumn) {
                       // Check if linking source domain matches the domain that links TO this column's domain
                       if (domainName === 'Scenario' && linkingState.fromDomain === 'Mission') itemIsClickableTarget = true;
                       else if (domainName === 'Requirements' && linkingState.fromDomain === 'Scenario') itemIsClickableTarget = true;
                       else if (domainName === 'Parameter' && linkingState.fromDomain === 'Requirements') itemIsClickableTarget = true;
                       else if (domainName === 'Functions' && linkingState.fromDomain === 'Parameter') itemIsClickableTarget = true; // Added
                       // Add more rules here as domains are added
                    }
                    
                    return (
                        <li key={item.id} 
                            className={`item-card ${itemIsClickableTarget ? 'clickable-target' : ''}`} 
                            onClick={itemIsClickableTarget ? () => onCompleteLink(item.id, domainName) : undefined}
                            title={itemIsClickableTarget ? `Link ${linkingState.fromId} to ${item.id}` : ''}
                        >
                            <strong>{item.id}: {item.title}</strong>
                            {/* Display specific properties based on domain */} 
                            {domainName === 'Parameter' && (item.unit || item.valueType) && (
                                <p style={{fontSize: '0.85em', color: '#555'}}>
                                    {item.valueType && `Type: ${item.valueType}`}{item.unit && item.valueType && ', '}{item.unit && `Unit: ${item.unit}`}
                                </p>
                            )}
                            {domainName === 'Functions' && item.functionType && (
                                <p style={{fontSize: '0.85em', color: '#555'}}>Type: {item.functionType}</p>
                            )}
                            {item.description && <p>{item.description}</p>}
                            
                            {/* Link Button */} 
                            {!linkingState.fromId && (
                                <button 
                                    className="link-button" 
                                    onClick={() => onStartLinking(item.id, domainName)} 
                                    disabled={isBusy} 
                                    title={`Link ${item.id} to next domain`}
                                > 
                                    Link &rarr;
                                </button>
                            )}
                        </li>
                    );
                })}
            </div>
        </section>
    );
}

export default DomainColumn; 