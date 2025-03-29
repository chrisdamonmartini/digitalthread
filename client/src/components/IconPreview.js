import React from 'react';
import MissionIcon from '../icons/Mission.svg';
import RequirementIcon from '../icons/Requirements.svg';
import ParameterIcon from '../icons/Parameters.svg';
import FunctionIcon from '../icons/Functions.svg';
import LogicalIcon from '../icons/Logical.svg';
import SimulationIcon from '../icons/AnalysisRequest.svg';
import TestIcon from '../icons/VerificationcenterIcon.svg';

const IconPreview = ({ iconType, size = 24 }) => {
  const getIconByType = () => {
    switch (iconType.toLowerCase()) {
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
        // Default icon is a simple placeholder
        return null;
    }
  };

  const iconSrc = getIconByType();
  
  if (!iconSrc) {
    // Return a default simple icon when no matching icon is found
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
    />
  );
};

export default IconPreview; 