export type RecipeComponent = { materialId: string; quantity: number };
import type { Material, MaterialDisplay, RecipeItem } from "./types";

export interface ComputedRecipeInfo {
  effectiveCostPerUnit: number;
  expectedYield: number;
  ingredientCost: number;
  focusCost: number;
  method: "buy" | "craft" | "error"
  profitPerFocus?: number;
  expectedRevenue?: number;
  baseFocusPerUnit?: number;
}

export function normalizeData(
  rawMaterials: Material[],
  focusCache: Map<string, ComputedRecipeInfo>
): MaterialDisplay[] {
  return rawMaterials.map((item) => {
    const itemCache = focusCache.get(item.id);
    // console.log('normalizing', item.id, 'with cache', itemCache);
    let subRows: MaterialDisplay[] = [];
    // Array normalization
    const rowData = (item.recipe && item.recipe.length > 0) ? item.recipe : [{ materialId: item.id, quantity: 1 }]
    const maxRows = Math.max(rowData.length, (item.extra?.length || 0) + 1)
    for (let i = 0; i< maxRows; i++){
      const ingredient = rowData[i]
      const extraOutput = item.extra?.[i - 1]
      const subCache = focusCache.get(rowData[i]?.materialId);

      subRows.push({
        id: extraOutput?.qualityOutput,
        price: extraOutput?.price,
        materialId: ingredient?.materialId,
        quantity: ingredient?.quantity,
        method: subCache?.method,
        ingredientCost: subCache?.effectiveCostPerUnit,
        totalFocusCost: subCache?.baseFocusPerUnit,
        isMaterial: true,
      }as MaterialDisplay)
    }
    // subRows = rowData.map((r) => {
    //   const subCache = focusCache.get(r.materialId);
    //   return {
    //     id: `${item.id}-${r.materialId}`,
    //     // price: subCache?.effectiveCostPerUnit ?? 0,
    //     // focusCost: subCache?.focusCost,
    //     materialId: r.materialId,
    //     quantity: r.quantity,
    //     method: subCache?.method || 'error',
    //     ingredientCost: subCache?.effectiveCostPerUnit,
    //     totalFocusCost: subCache?.focusCost,
    //     // profitPerFocus: subCache?.profitPerFocus,
    //     isMaterial: true,
    //   } as MaterialDisplay;
    // });
    // // inject sums into subRow display
    if (item.recipe && item.recipe?.length > 0) { 
      const totalFocusCostForSum = itemCache?.focusCost != null 
          ? itemCache.focusCost - item.focusCost 
          : undefined;
      subRows.push({
        // id: `${item.id}-sums`,
        price: itemCache?.expectedRevenue?.toFixed(2),
        ingredientCost: itemCache?.ingredientCost,
        totalFocusCost: totalFocusCostForSum,
        isMaterial: true
      } as MaterialDisplay)
    }

    const parentData = subRows.shift()
    // console.log("For: ", item.id, subRows)
    return {
      ...parentData,
      id: item.id,
      price: item.price,
      focusCost: item.focusCost,
      subRows: subRows,
      profitPerFocus: itemCache?.profitPerFocus
    } as MaterialDisplay;
  }
  )
};


export function buildMaterialMap(raw: Material[]): Map<string, Material> {
  const m = new Map<string, Material>();
  for (const it of raw) m.set(it.id, it);
  return m;
}

function resolveYield(yieldField: Material["yield"]): number {
  if (typeof yieldField === "number") return yieldField;
  if (Array.isArray(yieldField) && yieldField.length > 0) {
    // average yield for now
    return yieldField.reduce((sum, y) => sum + y.chance * y.quantity, 0);
  }
  return 1;
}

/**
 * Recursively compute the effective cost per unit for a given material.
 * Uses memoization via `cache`.
 */
function getEffectiveCost(
  materialId: string,
  materialsMap: Map<string, Material>,
  focusPrice: number,
  cache: Map<string, ComputedRecipeInfo>,
): ComputedRecipeInfo {
  // check cache
  const cached = cache.get(materialId);
  if (cached) return cached;

  const material = materialsMap.get(materialId);

  // Unknown material: fallback to zero-cost/mark error so rest of data stays usable
  if (!material) {
    const unknownFallback: ComputedRecipeInfo = {
      expectedYield: 1,
      ingredientCost: 0,
      effectiveCostPerUnit: 0,
      method: "error",
      focusCost: 0,
    };
    cache.set(materialId, unknownFallback);
    return unknownFallback;
  }



  const expectedYield = resolveYield(material.yield);
  let effectiveCostPerUnit = 0;
  let ingredientCost = 0;
  let focusCost = 0;
  let totalFocusCost = material.focusCost;
  let method: "buy" | "craft" | "error" = "error";

  if (material.recipe && material.recipe.length > 0) {
    for (const ingredient of material.recipe) {
      const ing = getEffectiveCost(
        ingredient.materialId,
        materialsMap,
        focusPrice,
        cache,
      );
      ingredientCost += ing.effectiveCostPerUnit * ingredient.quantity;
      // focusCost += ing.focusCost * ingredient.quantity
      if (ing.method === "craft"){
        const focusCostPerUnit = ing.baseFocusPerUnit || 0; 
        totalFocusCost += focusCostPerUnit * ingredient.quantity; 
      }
    }
  }
  const gatherCostPerUnit = (ingredientCost + totalFocusCost * focusPrice) / expectedYield;
  // console.log(`Material ${materialId}: gatherCostPerUnit=${gatherCostPerUnit.toFixed(2)}, marketPrice=${material.price.toFixed(2)}`);
  if (gatherCostPerUnit < material.price) {
    // console.log(`Material ${materialId}: gatherCostPerUnit=${gatherCostPerUnit.toFixed(2)}, marketPrice=${material.price.toFixed(2)}`);
    effectiveCostPerUnit = gatherCostPerUnit;
    method = "craft";
  } else {
    effectiveCostPerUnit = material.price;
    method = "buy";
  }
  if (!material.recipe || material.recipe.length === 0) {
    ingredientCost = material.price;
    focusCost = material.focusCost / expectedYield;
  }

  let baseFocusPerUnit = totalFocusCost / expectedYield;
  
  const result: ComputedRecipeInfo = {
    expectedYield,
    ingredientCost,
    effectiveCostPerUnit,
    method,
    focusCost: totalFocusCost,
    baseFocusPerUnit: baseFocusPerUnit,
  };
  // console.log(`Computed cost for ${materialId}:`, result);
  cache.set(materialId, result);
  return result;
}

/**
 * Iteratively solves for the equilibrium value of focus (V_F).
 */
export function findFocusEquilibrium(
  materialsById: Map<string, Material>
): { focusEquilibrium: number; cache: Map<string, ComputedRecipeInfo> } {
  // Iteration variables
  let currentFocusPrice = 0;
  let iteration = 0;
  let maxIterations = 100000;
  let tolerance = 0.001;
  let dampingFactor = 0.7

  let convergedCostCache: Map<string, ComputedRecipeInfo> | null = null;

  while (iteration < maxIterations) {
    let maxPPF = 0;

    const costCache = new Map<string, ComputedRecipeInfo>();

    for (const material of materialsById.values()) {

      const expectedYield = resolveYield(material.yield);
      const revenue = material.price * 0.95 * expectedYield;

      const effectiveCostInfo = getEffectiveCost(
        material.id,
        materialsById,
        currentFocusPrice,
        costCache
      );

      const profit = revenue - effectiveCostInfo.ingredientCost
      const PPF = profit / material.focusCost;

      if (PPF > maxPPF) {
        maxPPF = PPF;
      }
    }
    // Check for convergence
    if (Math.abs(maxPPF - currentFocusPrice) < tolerance) {
      console.log(`Solver converged in ${iteration} iterations.`);
      convergedCostCache = costCache;
      break;
    }
    // Update our guess and loop again
    const delta = maxPPF - currentFocusPrice;
    currentFocusPrice = currentFocusPrice + dampingFactor * delta;
    iteration++;
  }
  if (!convergedCostCache) {
    console.warn(`Solver did not converge after ${maxIterations} iterations.`);
    return { focusEquilibrium: currentFocusPrice, cache: new Map() };
  }
  for (const material of materialsById.values()) {
    const cachedInfo = convergedCostCache.get(material.id);
    if (!cachedInfo) continue;

    // Handle new multi-output recipes
    let expectedBaseValue = material.price
    if (material.extra && material.extra.length > 0) {
      for (const output of material.extra){
        expectedBaseValue -= output.chance * material.price
        expectedBaseValue += output.chance * output.price
      }
    }
    const expectedYield = resolveYield(material.yield)
    const revenue = expectedBaseValue * expectedYield * 0.95 

    const profit = revenue - cachedInfo.ingredientCost;
    let finalPPF = 0;
    if (material.focusCost > 0) {
      finalPPF = profit / material.focusCost;
    }
    console.log("for: ", material.id, cachedInfo, finalPPF)
    // Overwrite the cached object with the final PPF
    convergedCostCache.set(material.id, {
      ...cachedInfo,
      profitPerFocus: finalPPF,
      expectedRevenue: revenue
    });
  }

  return { focusEquilibrium: currentFocusPrice, cache: convergedCostCache };
}