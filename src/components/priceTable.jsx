import React, { useState, useMemo } from 'react';
import { MaterialLookupProvider } from '../data/materialLookUpContext';
import { useReactTable, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table';
import { sortableColumns } from './tableConfig';
import RecipeTableBody from './recipeTableBody';

export default function ClientSortableTable({ initialRecipes }) {
  // The raw materials array is stored in 'materials'
  const materials = initialRecipes;

  // --- Calculation Logic (Filter Removed) ---
  const calculatedRecipes = useMemo(() => {
    if (!materials || materials.length === 0) return [];

    // We now iterate over ALL materials, not just those with a 'recipe' property.
    return materials.map(rawMat => {
      // Safely access the recipe array, defaulting to an empty array if null/undefined
      const recipeArray = rawMat.recipe || [];

      return {
        ...rawMat, // Include all original fields (id, price, focusCost, etc.)
        name: rawMat.id,

        // Calculation for Total Quantity: Will be 0 for materials with no recipe
        totalQuantity: recipeArray.reduce((a, m) => a + m.quantity, 0),

        // Placeholders for future calculations:
        totalMaterialCost: 0,
        profitPerFocus: 0,
      };
    });

  }, [materials]);
  // ----------------------------------------------------

  const [sorting, setSorting] = useState([{ id: 'profitPerFocus', desc: true }]);

  const table = useReactTable({
    data: calculatedRecipes, // Use the full calculated dataset
    columns: sortableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Helper to determine the sort indicator (Uses TanStack's column model)
  const getSortIndicator = (columnId) => {
    // 1. Get the column object from the TanStack instance
    const column = table.getColumn(columnId);

    // Safety check: if the column isn't found or isn't sorted, return the neutral icon
    if (!column || column.getIsSorted() === false) return '↕';

    // 2. Return the correct icon based on the sort direction
    return column.getIsSorted() === 'asc' ? '▲' : '▼';
  };

  // Helper to toggle sorting for a column (we used this in the onClick handlers)
  const toggleSorting = (columnId) => {
    const column = table.getColumn(columnId);
    if (column) {
      // Toggles sorting state and direction. Passing undefined/false lets TanStack handle the logic.
      column.toggleSorting(column.getIsSorted() === 'asc');
    }
  };

  return (
    <MaterialLookupProvider materialsArray={materials}>
      <table className="sortable-profit-table">
        <thead>
          <tr>
            {/* Group 1: Name and Price (Standard TH) */}
            <th onClick={() => toggleSorting('name')}>Name {getSortIndicator('name')}</th>
            <th onClick={() => toggleSorting('productPrice')}>Price {getSortIndicator('productPrice')}</th>

            {/* Group 2: Material Details (One TH with colspan="4" and an internal Grid) */}
            <th colSpan="4" style={{ padding: 0 }}>
              {/* Aligning the TH content with the body's internal grid */}
              <div
                // This grid row uses the same 4-column layout as the body TDs
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr',
                  width: '100%',
                }}
              >
                {/* Individual column labels with click handlers */}
                <div
                  style={{ cursor: 'pointer', padding: '8px', borderRight: '1px solid #ccc' }}
                  onClick={() => toggleSorting('materialId')}
                >
                  Material {getSortIndicator('materialId')}
                </div>
                <div
                  style={{ cursor: 'pointer', padding: '8px', borderRight: '1px solid #ccc' }}
                  onClick={() => toggleSorting('totalQuantity')}
                >
                  Quantity {getSortIndicator('totalQuantity')}
                </div>
                <div
                  style={{ cursor: 'pointer', padding: '8px', borderRight: '1px solid #ccc' }}
                  onClick={() => toggleSorting('totalMaterialCost')}
                >
                  Price (each) {getSortIndicator('totalMaterialCost')}
                </div>
                <div
                  style={{ cursor: 'pointer', padding: '8px' }}
                  onClick={() => toggleSorting('totalFocusCost')}
                >
                  Focus (each) {getSortIndicator('totalFocusCost')}
                </div>
              </div>
            </th>

            {/* Group 3: Profit (Standard TH) */}
            <th onClick={() => toggleSorting('profitPerFocus')}>Profit/Focus {getSortIndicator('profitPerFocus')}</th>
          </tr>
        </thead>

        <React.Suspense fallback={<tbody><tr><td colSpan="7">Loading recipes...</td></tr></tbody>}>
          {/* RecipeTableBody will now receive all items, rendering the material details 
              only for items that have a non-empty recipe array. */}
          <RecipeTableBody table={table} />
        </React.Suspense>
      </table>
    </MaterialLookupProvider>
  );
}