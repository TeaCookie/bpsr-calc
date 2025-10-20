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
