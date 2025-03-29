import React, { useState } from 'react';

// Try/catch block for each import to handle any SVG loading issues
let MissionIcon, RequirementIcon, ParameterIcon, FunctionIcon, LogicalIcon, SimulationIcon, TestIcon;

try { MissionIcon = require('../icons/Mission.svg').default; } catch (e) { console.error('Failed to load Mission icon:', e); }
try { RequirementIcon = require('../icons/Requirements.svg').default; } catch (e) { console.error('Failed to load Requirements icon:', e); }
try { ParameterIcon = require('../icons/Parameters.svg').default; } catch (e) { console.error('Failed to load Parameters icon:', e); }
try { FunctionIcon = require('../icons/Functions.svg').default; } catch (e) { console.error('Failed to load Functions icon:', e); }
try { LogicalIcon = require('../icons/Logical.svg').default; } catch (e) { console.error('Failed to load Logical icon:', e); }
try { SimulationIcon = require('../icons/AnalysisRequest.svg').default; } catch (e) { console.error('Failed to load Simulation icon:', e); }
try { TestIcon = require('../icons/VerificationcenterIcon.svg').default; } catch (e) { console.error('Failed to load Test icon:', e); }

const IconPreview = ({ iconType, size = 24 }) => {
  const [hasError, setHasError] = useState(false);

  const getIconByType = () => {
    try {
      switch (iconType?.toLowerCase()) {
        case 'mission':
          return MissionIcon;
        case 'requirement':
          return RequirementIcon;
        case 'parameter':
          return ParameterIcon;
        case 'function':
          return FunctionIcon;
        case 'logical':
          return LogicalIcon;
        case 'simulation':
          return SimulationIcon;
        case 'test':
          return TestIcon;
        default:
          return null;
      }
    } catch (err) {
      console.error(`Error loading icon for type ${iconType}:`, err);
      return null;
    }
  };

  const iconSrc = getIconByType();
  
  if (!iconSrc || hasError) {
    // Return a default simple icon when no matching icon is found or there was an error
    return (
      <div 
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: '#ccc',
          display: 'inline-block',
          verticalAlign: 'middle'
        }}
      />
    );
  }
  
  return (
    <img 
      src={iconSrc} 
      alt={`${iconType} icon`} 
      style={{
        width: size,
        height: size,
        verticalAlign: 'middle'
      }}
      onError={() => setHasError(true)}
    />
  );
};

export default IconPreview; 