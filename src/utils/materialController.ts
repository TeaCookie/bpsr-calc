import { supabase } from "../lib/supabase";
import type { Material } from "./types";

export async function getAllMaterials() {
  const { data, error } = await supabase.from("Materials").select("*");
  if (error) {
    throw new Error("Error fetching materials: " + error.message);
  }
  return data as Material[];
}

export async function getMaterialById(id: string) {
  const materials = await getAllMaterials();
  return materials.find((mat) => mat.id === id);
}

