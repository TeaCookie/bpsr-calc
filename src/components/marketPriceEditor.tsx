import React, { useState, useMemo, useEffect } from 'react';
import { useMainTable } from '../data/mainTableContext'; // Adjust path
import styles from './MarketPriceEditor.module.css'; // We'll create this file

export default function MarketPriceEditor() {
  const { materialsById, updatePrice } = useMainTable();
  const [searchTerm, setSearchTerm] = useState('');

  // This is the "local sandbox". We only store the *changes* here.
  // Map<materialId, newPrice>
  const [localEdits, setLocalEdits] = useState<Map<string, number>>(new Map());

  // 1. Get the base list of materials from the context
  const materialsList = useMemo(() => {
    // Convert the context's Map to an array for filtering/rendering
    return Array.from(materialsById.values());
  }, [materialsById]);

  // 2. Filter the list based on the search term
  const filteredMaterials = useMemo(() => {
    if (!searchTerm) {
      return materialsList; // Show all if search is empty
    }
    const lowerSearch = searchTerm.toLowerCase();
    return materialsList.filter(material => 
      material.id.toLowerCase().includes(lowerSearch)
    );
  }, [materialsList, searchTerm]);

  // 3. Handle a user typing in a price input
  const handlePriceChange = (id: string, newPriceStr: string) => {
    const price = parseFloat(newPriceStr);
    
    // Check if the new price is a valid number
    if (!isNaN(price) && price >= 0) {
      // Update our local sandbox state
      setLocalEdits(prevMap => {
        const newMap = new Map(prevMap);
        newMap.set(id, price);
        return newMap;
      });
    }
  };

  // 4. Handle the "Commit" button click
  const handleCommitChanges = () => {
    // Loop over all our local edits and call the context's update function
    localEdits.forEach((newPrice, id) => {
      updatePrice(id, newPrice);
    });
    
    // Clear the local sandbox, which re-enables the commit button
    setLocalEdits(new Map());
  };

  // The "dirty" state is just whether our local sandbox has any edits
  const isDirty = localEdits.size > 0;

  return (
    <div className={styles.editorContainer}>
      
      {/* 1. The Search Bar */}
      <div className={styles.searchWrapper}>
        <input
          type="text"
          placeholder="Search materials..."
          className={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 2. The Editable Price Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.priceTable}>
          <thead>
            <tr>
              <th>Material ID</th>
              <th>Local Price</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.map(material => {
              // The displayed price is the local edit, OR the context's price
              const displayPrice = localEdits.get(material.id) ?? material.price;
              
              return (
                <tr key={material.id}>
                  <td>{material.id}</td>
                  <td className={styles.editableCell}>
                    <input
                      type="number"
                      
                      min="0"
                      className={styles.priceInput}
                      // Use the displayPrice (local or context)
                      value={displayPrice}
                      // When it changes, update the local sandbox
                      onChange={(e) => handlePriceChange(material.id, e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. The Bottom Bar */}
      <div className={styles.bottomBar}>
        <button
          className={styles.commitButton}
          onClick={handleCommitChanges}
          disabled={!isDirty} // Only enable if changes are made
        >
          {isDirty ? 'Update Context (Recalculate)' : 'No Local Changes'}
        </button>
      </div>
    </div>
  );
}