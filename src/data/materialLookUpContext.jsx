import React, { createContext, useContext } from 'react';

// Define the context shape and a default value
const MaterialLookupContext = createContext(null);

/**
 * Custom hook for easily accessing the Material lookup map.
 * The returned object will be a Map<materialId: string, material: Material>.
 */
export const useMaterialLookup = () => {
  const context = useContext(MaterialLookupContext);
  if (!context) {
    throw new Error('useMaterialLookup must be used within a MaterialLookupProvider');
  }
  return context;
};

/**
 * Provider component that transforms the raw array into a Map.
 * It makes the Map available to any component inside the React island.
 */
export function MaterialLookupProvider({ materialsArray, children }) {
  // Use useMemo to ensure the Map is created only when the input array changes
  const materialMap = React.useMemo(() => {
    if (!materialsArray || materialsArray.length === 0) {
      return new Map();
    }
    // Transform the array into a Map for O(1) lookup time (faster than searching an array)
    const map = new Map();
    materialsArray.forEach(material => {
      map.set(material.id, material);
    });
    return map;
  }, [materialsArray]);

  return (
    <MaterialLookupContext.Provider value={materialMap}>
      {children}
    </MaterialLookupContext.Provider>
  );
}

// NOTE: You will need to install react-dom and react if you haven't already: npm install react react-dom