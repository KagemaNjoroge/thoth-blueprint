import React from 'react';

const EdgeMarkerDefs = () => {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        {/* Many marker (crow's foot) for many-to-one and many-to-many relationships */}
        <marker
          id="many"
          viewBox="0 0 12 12"
          refX="11"
          refY="6"
          markerWidth="12"
          markerHeight="12"
          orient="auto"
        >
          <path
            d="M 11,1 L 1,6 L 11,11"
            fill="none"
            stroke="#a1a1aa"
            strokeWidth="1.5"
          />
        </marker>

        {/* Selected versions */}
        <marker
          id="many-selected"
          viewBox="0 0 12 12"
          refX="11"
          refY="6"
          markerWidth="12"
          markerHeight="12"
          orient="auto"
        >
          <path
            d="M 11,1 L 1,6 L 11,11"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2"
          />
        </marker>
      </defs>
    </svg>
  );
};

export default EdgeMarkerDefs;