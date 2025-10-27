export type RecipeComponent = { materialId: string; quantity: number };
import type { Material, RecipeItem } from "./types";

export interface ComputedRecipeInfo {
  effectiveCostPerUnit: number;
  expectedYield: number;
  ingredientCost: number;
  method: "buy" | "craft" | "error"
  profitPerFocus?: number;
}

export function normalizeData(
  rawMaterials: Material[],
  focusCache: Map<string, ComputedRecipeInfo> 
): RecipeItem[] {
  return rawMaterials.map((item) => {
    const first = item.recipe?.[0];
    const itemCache = focusCache.get(item.id);
    console.log('normalizing', item.id, 'with cache', itemCache);
    let subRows: RecipeItem[] = [];
    if (item.recipe && item.recipe.length > 1) {
      subRows = item.recipe.slice(1).map((r) => {
        const subCache = focusCache.get(r.materialId);
        return {
          id: `${item.id}-${r.materialId}`,
          price: subCache?.effectiveCostPerUnit ?? 0,
          focusCost: 0,
          isMaterial: true,
          materialId: r.materialId,
          quantity: r.quantity,
          recipe: undefined,
          yield: 0,
          name: r.materialId,
          method: subCache?.method ?? 'error',
        } as RecipeItem;
      });
    }

    return {
      ...item,
      name: item.id,
      isMaterial: false,
      yield: item.yield,
      subRows,
      materialId: first?.materialId,
      quantity: first?.quantity ?? 0,
      method: itemCache?.method ?? 'error',
      profitPerFocus: itemCache?.profitPerFocus ?? 0,
      effectiveCostPerUnit: itemCache?.effectiveCostPerUnit ?? item.price,
    } as RecipeItem;
  });
}

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
  // visiting: Set<string> = new Set()
): ComputedRecipeInfo {
  // check cache
  const cached = cache.get(materialId);
  if (cached) return cached;

  // detect cycles
  // if (visiting.has(materialId)) {
  //   const material = materialsById.get(materialId);
  //   const expectedYield = material ? resolveYield(material.yield) : 1;
  //   const fallback: ComputedRecipeInfo = {
  //     expectedYield,
  //     totalInputCostPerCraft: 0,
  //     effectiveCostPerUnit: material?.price ?? 0,
  //     method: "error",
  //   };
  //   cache.set(materialId, fallback);
  //   return fallback;
  // }
  // visiting.add(materialId);

  const material = materialsMap.get(materialId);
  
  // Unknown material: fallback to zero-cost/mark error so rest of data stays usable
  if (!material) {

    const unknownFallback: ComputedRecipeInfo = {
      expectedYield: 1,
      ingredientCost: 0,
      effectiveCostPerUnit: 0,
      method: "error",
    };
    cache.set(materialId, unknownFallback);
    // visiting.delete(materialId);
    return unknownFallback;
  }

  const expectedYield = resolveYield(material.yield);
  let effectiveCostPerUnit = 0;
  let ingredientCost = 0;
  let method: "buy" | "craft" | "error" = "error";
  // Material with recipe (craftable)
  if (material.recipe && material.recipe.length > 0) {
    for (const ingredient of material.recipe) {
      const ing = getEffectiveCost(
        ingredient.materialId,
        materialsMap,
        focusPrice,
        cache,
      );
      ingredientCost +=
        ing.effectiveCostPerUnit * ingredient.quantity;
    }
    if (expectedYield > 0) {
      const craftCostPerUnit = (ingredientCost + material.focusCost * focusPrice) / expectedYield;
      effectiveCostPerUnit = Math.min(craftCostPerUnit, material.price);
      method = effectiveCostPerUnit === material.price ? "buy" : "craft";
    }
  }
  // Gatherable material
  else if (material.focusCost > 0) {
    if (expectedYield > 0) {
      ingredientCost = material.price;
      const gatherCostPerUnit =
        (material.focusCost * focusPrice) / expectedYield;
      effectiveCostPerUnit = Math.min(material.price, gatherCostPerUnit);
      method = effectiveCostPerUnit === material.price ? "buy" : "craft";
    }
  }
    const result: ComputedRecipeInfo = {
      expectedYield,
      ingredientCost,
      effectiveCostPerUnit,
      method,
    };
    console.log(`Computed cost for ${materialId}:`, result);  
    cache.set(materialId, result);
    // visiting.delete(materialId);
    return result;
}

/**
 * Calculates the profit-per-focus for *using focus* on a material
 * (either by crafting or gathering).
 */
function getProfitPerFocus(
  material: Material,
  focusPrice: number,
  cache: Map<string, ComputedRecipeInfo>,
  materialsMap: Map<string, Material>
): number {
  
  const expectedYield = resolveYield(material.yield);
  const revenue = material.price * 0.95 * expectedYield;

  let ingredientCost = 0;
  if (material.recipe && material.recipe.length > 0) {
    for (const ingredient of material.recipe) {
      const ingCostInfo = getEffectiveCost(
        ingredient.materialId,
        materialsMap,
        focusPrice,
        cache
      );
      ingredientCost += ingCostInfo.effectiveCostPerUnit * ingredient.quantity;
    }
  }
  const profit = revenue - ingredientCost
  const PPF = profit / material.focusCost;
  return PPF;
}

/**
 * One iteration: compute average profit per focus given a focus price.
 */
// export function computeAverageProfitPerFocus(
//   materials: Material[],
//   materialsById: Map<string, Material>,
//   focusPrice: number,
//   cache: Map<string, ComputedRecipeInfo> // shared cache
// ): { averageProfitPerFocus: number; cache: Map<string, ComputedRecipeInfo> } {
//   const crafts: number[] = [];

//   for (const material of materials) {
//     if (!material.recipe || material.recipe.length === 0) continue; // skip gatherables

//     const data = getEffectiveCost(material.id, materialsById, focusPrice, cache);

//     // skip if focusCost = 0 to avoid divide-by-zero
//     if (material.focusCost <= 0) continue;

//     const sellRevenue = material.price * 0.95 * data.expectedYield;
//     const profit =
//       sellRevenue - data.ingredientCost - material.focusCost * focusPrice;
//     const profitPerFocus = profit / material.focusCost;

//     crafts.push(profitPerFocus);
//     data.profitPerFocus = profitPerFocus;
//   }

//   const averageProfitPerFocus =
//     crafts.reduce((a, b) => a + b, 0) / (crafts.length || 1);

//   return { averageProfitPerFocus, cache };
// }

// export function findFocusEquilibriumold(
//   materials: Material[],
//   materialsById: Map<string, Material>,
//   {
//     initialFocusPrice = 100,
//     learningRate = 0.5,
//     tolerance = 0.001,
//     maxIterations = 50,
//   } = {}
// ): { focusPrice: number; cache: Map<string, ComputedRecipeInfo>; iterations: number } {
//   let focusPrice = initialFocusPrice;
//   const cache = new Map<string, ComputedRecipeInfo>();

//   for (let i = 0; i < maxIterations; i++) {
//     const { averageProfitPerFocus } = computeAverageProfitPerFocus(
//       materials,
//       materialsById,
//       focusPrice,
//       cache
//     );

//     if (Math.abs(averageProfitPerFocus) < tolerance) {
//       return { focusPrice, cache, iterations: i + 1 };
//     }

//     // adjust focus price (dampen oscillations)
//     focusPrice += learningRate * averageProfitPerFocus;

//     // keep it positive
//     focusPrice = Math.max(focusPrice, 0.0001);

//     if (i === maxIterations - 1)
//       return { focusPrice, cache, iterations: maxIterations };
//   }

//   console.log("Focus equilibrium: max iterations reached");
//   return { focusPrice, cache, iterations: maxIterations };
// }

/**
 * Iteratively solves for the equilibrium value of focus (V_F).
 */
export function findFocusEquilibrium(
  materialsById: Map<string, Material>
): {focusEquilibrium: number; cache: Map<string, ComputedRecipeInfo>} {
  // Iteration variables
  let currentFocusPrice = 0;
  let iteration = 0;
  let maxIterations = 50;
  let tolerance = 0.001;

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
    currentFocusPrice = maxPPF;
    iteration++;
  }
  if (!convergedCostCache) {
        console.warn(`Solver did not converge after ${maxIterations} iterations.`);
        return {focusEquilibrium: currentFocusPrice, cache: new Map()};
    }
  for (const material of materialsById.values()) {
        const cachedInfo = convergedCostCache.get(material.id);
        if (!cachedInfo) continue;

        const expectedYield = resolveYield(material.yield);
        const revenue = material.price * 0.95 * expectedYield;
        
        const profit = revenue - cachedInfo.ingredientCost;
        let finalPPF = 0;
        if (material.focusCost > 0) {
            finalPPF = profit / material.focusCost;
        }

        // Overwrite the cached object with the final PPF
        convergedCostCache.set(material.id, {
            ...cachedInfo,
            profitPerFocus: finalPPF
        });
    }

    return {focusEquilibrium: currentFocusPrice, cache: convergedCostCache};
}