
import { createContext, useState, useEffect, useMemo, useCallback } from "react";
import type { Material, RecipeItem } from "../utils/types";
import { getAllMaterials } from "../utils/materialController";

interface MainTableProviderProps {
  children: React.ReactNode;
  initialData?: Material[];
}

interface MainTableContextValue {
  tableData: RecipeItem[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

export const MainTableContext = createContext<MainTableContextValue>({
  tableData: [],
  isLoading: false,
  refreshData: async () => { }
});

const normalizeData = (rawMaterials: Material[]): RecipeItem[] => {
  return rawMaterials.map(item => {
    const parentItem: RecipeItem = {
      ...item,
      name: item.id,
      isMaterial: false,
      // Ensure yield is handled if needed
      yield: item.yield
    } as RecipeItem;

    if (item.recipe) {
      parentItem.subRows = item.recipe.map(material => ({
        id: `${item.id}-${material.materialId}`,
        price: item.price,
        focusCost: item.focusCost,

        isMaterial: true,
        materialId: material.materialId,
        quantity: material.quantity,

        recipe: undefined,
        yield: 0,
        name: item.id
      })) as RecipeItem[];
    }

    return parentItem;
  });
};

export const MainTableProvider = ({ children, initialData = [] }: MainTableProviderProps) => {
  const [rawData, setRawData] = useState<Material[]>(() => initialData);
  const [isLoading, setIsLoading] = useState<boolean>(initialData.length === 0);

  // run-on-every-render log to show client runtime values
  // (use browser console after client:load hydration)
  // console.log('[MainTableProvider] render (client?)', {
  //   initialDataLen: initialData?.length,
  //   rawDataLen: rawData?.length,
  //   isLoading
  // });


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const materials = await getAllMaterials();
    setRawData(materials);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (initialData.length === 0) {
      // Case 1: No data provided, must fetch.
      fetchData();
    } else {
      // Case 2: Data was provided. Update the state to reflect the latest prop value.
      setRawData(initialData);
      setIsLoading(false);
    }
    console.log('[MainTableProvider] initialData length:', initialData?.length);
    console.log('[MainTableProvider] rawData length:', rawData?.length);
  }, [fetchData, initialData]);

  const tableData = useMemo(() => normalizeData(rawData), [rawData]);
  //   // debug: show the normalized data that will be provided to consumers
  // useEffect(() => {
  //   console.log('[MainTableProvider] tableData length (normalized):', tableData?.length);
  //   // optionally show a sample:
  //   console.log('[MainTableProvider] tableData sample:', tableData?.slice(0,3));
  // }, [tableData]);

  const value = useMemo(() => ({
    tableData,
    isLoading,
    refreshData: fetchData
  }), [tableData, isLoading, fetchData]);

  return (
    <MainTableContext.Provider value={value}>
      {children}
    </MainTableContext.Provider>
  );


}
