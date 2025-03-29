import React, { useEffect, useRef } from 'react';
import { Handle } from 'reactflow';
import './FilterNode.css';

// Custom node for filter input
function FilterNode({ data, isConnectable }) {
  const inputRef = useRef(null);
  
  useEffect(() => {
    // Focus input on mount
    if (inputRef.current) {
      // Set value from any existing filter
      inputRef.current.value = data.currentFilter || '';
    }
  }, [data.currentFilter]);

  const handleChange = (e) => {
    const value = e.target.value;
    // Call the updateFilter function passed from the parent
    if (data.updateFilter && data.domainId) {
      data.updateFilter(data.domainId, value);
    }
  };

  // Handle click to ensure input gets focus
  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="filter-node" onClick={handleClick}>
      <input
        ref={inputRef}
        type="text"
        className="filter-input"
        placeholder={data.placeholder || "Filter"}
        onChange={handleChange}
        style={{ 
          width: '100%', 
          height: '100%', 
          padding: '12px 10px',
          boxSizing: 'border-box',
          fontSize: '0.95em',
          cursor: 'text'
        }}
      />
    </div>
  );
}

export default FilterNode; 