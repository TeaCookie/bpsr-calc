import React from 'react';
import { useMaterialLookup } from '../data/materialLookUpContext';

// This component performs lookups for individual material prices/focus
export default function RecipeTableBody({ table }) {
  // Access the global lookup map (Material ID -> Material Object)
  const materialLookupMap = useMaterialLookup();
  
  // Helper to look up material price/focus from the global map
  const getMaterialDetails = (materialId) => {
    return materialLookupMap.get(materialId) || { price: 0, focusCost: 0, id: materialId };
  };

  return (
    <tbody>
      {table.getRowModel().rows.map(row => {
        const recipe = row.original;
        
        return (
          <tr key={recipe.id}>
            {/* Column 1 & 2: Name and Price */}
            <td>{recipe.name}</td>
            <td>{recipe.price.toLocaleString()}</td>

            {/* Column 3-6: Combined Material Details (Spans 4 visual columns) */}
            <td className="material-details-cell" colSpan="4">
              <div className="material-rows">
                {recipe.recipe.map((mat, index) => {
                  // HERE we use the lookup map to get the source data
                  const sourceMaterial = getMaterialDetails(mat.materialId);
                  
                  return (
                    <div 
                      key={index} 
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' }}
                    >
                      {/* Material Name (Looked up) */}
                      <span className="material-name">{sourceMaterial.id.replace(/_/g, ' ')}</span> 
                      
                      {/* Quantity */}
                      <span className="material-quantity">({mat.quantity}x)</span> 
                      
                      {/* Price (each) - NOW LOOKED UP */}
                      <span className="material-price">{sourceMaterial.price.toLocaleString()}</span> 
                      
                      {/* Focus (each) - NOW LOOKED UP */}
                      <span className="material-focus">{sourceMaterial.focusCost}</span>
                    </div>
                  );
                })}
              </div>
            
              {/* Sum Row: Placeholders for now */}
              <div className="material-sums" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
                <span>SUM:</span>
                <span className="total-quantity">({recipe.totalQuantity} total)</span>
                <span>---</span>
                <span>---</span>
              </div>
            </td>

            {/* Column 7: Profit/Focus Placeholder */}
            <td>{recipe.profitPerFocus.toFixed(2)}</td>
          </tr>
        );
      })}
    </tbody>
  );
}