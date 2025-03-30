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

// Additional icons
let TypeAction, TypeTarget, TypeWarning, TypeClass, CmdSettings, CmdSearch, 
    CmdRefresh, TypePartComponent, TabIcon;

try { TypeAction = require('../icons/typeAction48.svg').default; } catch (e) { console.error('Failed to load typeAction48 icon:', e); }
try { TypeTarget = require('../icons/typeTarget48.svg').default; } catch (e) { console.error('Failed to load typeTarget48 icon:', e); }
try { TypeWarning = require('../icons/typeWarning48.svg').default; } catch (e) { console.error('Failed to load typeWarning48 icon:', e); }
try { TypeClass = require('../icons/typeClass48.svg').default; } catch (e) { console.error('Failed to load typeClass48 icon:', e); }
try { CmdSettings = require('../icons/cmdSettings24.svg').default; } catch (e) { console.error('Failed to load cmdSettings24 icon:', e); }
try { CmdSearch = require('../icons/cmdSearch24.svg').default; } catch (e) { console.error('Failed to load cmdSearch24 icon:', e); }
try { CmdRefresh = require('../icons/cmdRefresh24.svg').default; } catch (e) { console.error('Failed to load cmdRefresh24 icon:', e); }
try { TypePartComponent = require('../icons/typePartComponent48.svg').default; } catch (e) { console.error('Failed to load typePartComponent48 icon:', e); }
try { TabIcon = require('../icons/TabIcon.svg').default; } catch (e) { console.error('Failed to load TabIcon icon:', e); }

const IconPreview = ({ iconType, size = 24, customUrl = null }) => {
  const [hasError, setHasError] = useState(false);

  // If customUrl is provided, render it directly
  if (customUrl && !hasError) {
    return (
      <img 
        src={customUrl} 
        alt="Custom icon" 
        style={{
          width: size,
          height: size,
          verticalAlign: 'middle',
          objectFit: 'contain',
          backgroundColor: 'rgba(255,255,255,0.8)',
          borderRadius: '4px'
        }}
        onError={(e) => {
          console.error('Failed to load custom icon:', e);
          setHasError(true);
        }}
      />
    );
  }

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
        // Additional icons
        case 'typeaction48':
          return TypeAction;
        case 'typetarget48':
          return TypeTarget;
        case 'typewarning48':
          return TypeWarning;
        case 'typeclass48':
          return TypeClass;
        case 'cmdsettings24':
          return CmdSettings;
        case 'cmdsearch24':
          return CmdSearch;
        case 'cmdrefresh24':
          return CmdRefresh;
        case 'typepartcomponent48':
          return TypePartComponent;
        case 'tabicon':
          return TabIcon;
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
          verticalAlign: 'middle',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {hasError && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: Math.max(8, size / 3),
            color: '#666'
          }}>!</div>
        )}
      </div>
    );
  }
  
  return (
    <img 
      src={iconSrc} 
      alt={`${iconType} icon`} 
      style={{
        width: size,
        height: size,
        verticalAlign: 'middle',
        objectFit: 'contain'
      }}
      onError={(e) => {
        console.error(`Failed to load icon ${iconType}:`, e);
        setHasError(true);
      }}
    />
  );
};

export default IconPreview; 