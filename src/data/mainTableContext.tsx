import { createContext, useState, useEffect, useMemo, useCallback, useContext } from "react";
import type { Material, RecipeItem } from "../utils/types";
import { getAllMaterials } from "../utils/materialController";
import { normalizeData, buildMaterialMap, findFocusEquilibrium } from "../utils/dataCalcs";
import type { ComputedRecipeInfo } from "../utils/dataCalcs";

interface MainTableProviderProps {
  children: React.ReactNode;
  initialData?: Material[];
}

interface MainTableContextValue {
  tableData: RecipeItem[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  updatePrice: (id: string, newPrice: number) => void;
  materialsById: Map<string, Material>;
  focusPrice: number | null;
  focusCache?: Map<string, ComputedRecipeInfo>;
}

export const MainTableContext = createContext<MainTableContextValue | null>(null);

export const MainTableProvider = ({ children, initialData = [] }: MainTableProviderProps) => {
  const [rawData, setRawData] = useState<Material[]>(() => initialData);
  const [isLoading, setIsLoading] = useState<boolean>(initialData.length === 0);

  const [focusPrice, setFocusPrice] = useState<number | null>(null);
  const [focusCache, setFocusCache] = useState<Map<string, ComputedRecipeInfo>>(new Map());

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const materials = await getAllMaterials();
    setRawData(materials);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (initialData.length === 0) {
      fetchData();
    } else {
      // accept updates to the prop if server provides new data
      setRawData(initialData);
      setIsLoading(false);
    }
  }, [fetchData, initialData]);

  // use pure helpers from utils and memoize results
  const tableData = useMemo(() => normalizeData(rawData, focusCache), [rawData, focusCache]);
  const materialsById = useMemo(() => buildMaterialMap(rawData), [rawData]);

  useEffect(() => {
    if (!materialsById.size) return;

    // Compute equilibrium (you’ll plug in your function here)
    const { focusEquilibrium: newFocusPrice, cache: newFocusCache } = findFocusEquilibrium(materialsById);

    setFocusPrice(newFocusPrice);
    setFocusCache(newFocusCache);

  }, [materialsById]);


  const updatePrice = useCallback((id: string, newPrice: number) => {
    setRawData(prev => prev.map(m => m.id === id ? { ...m, price: newPrice } : m));
  }, []);

  const value = useMemo(() => ({
    tableData,
    isLoading,
    refreshData: fetchData,
    updatePrice,
    materialsById,
    focusPrice,
    focusCache,
  }), [tableData, isLoading, fetchData, updatePrice, materialsById, focusPrice, focusCache]);


  return (
    <MainTableContext.Provider value={value}>
      {children}
    </MainTableContext.Provider>
  );
};

/** safe hook for consumers */
export function useMainTable() {
  const ctx = useContext(MainTableContext);
  if (!ctx) throw new Error("useMainTable must be used within MainTableProvider");
  return ctx;
}
