export interface Material {
  id: string;
  price: number;
  recipe?: {
    materialId: string;
    quantity: number;
  }[];
  yield: number | {chance: number, quantity: number}[];
  focusCost: number;
}

export interface RecipeItem extends Material {
  subRows?: RecipeItem[];
  isMaterial?: boolean;
  materialId?: string;
  quantity?: number;
}
