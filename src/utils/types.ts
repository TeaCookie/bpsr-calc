export interface Material {
  id: string;
  price: number;
  recipe?: {
    materialId: string;
    quantity: number;
  }[];
  yield: number | {chance: number, quantity: number}[];
  focusCost: number;
  extra?: {qualityOutput: string, price: number, chance: number}[];
}

export interface RecipeItem extends Material {
  subRows?: RecipeItem[];
  isMaterial?: boolean;
  materialId?: string;
  quantity?: number;
  profitPerFocus?: number;
  method: "buy" | "craft" | "error" | "sum";
  ingredientCost: number;
}

export interface MaterialDisplay {
  id: string;
  price?: number;
  focusCost?: number;
  // Materials group
  subRows?: MaterialDisplay[];
  materialId?: string;
  quantity?: number;
  method: "buy" | "craft" | "error" | "sum";
  ingredientCost: number;
  totalFocusCost: number;
  // Output group
  profitPerFocus?: number;
  // Conditional formatting
  isMaterial: boolean;
}