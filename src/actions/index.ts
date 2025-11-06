import { defineAction } from 'astro:actions';
import { MaterialSchema } from '../lib/actionTypes';

import { supabase } from '../lib/supabase'; 


// Define the action group
export const server = {
  // --- Create/Insert Action ---
  insertMaterial: defineAction({
    // 1. Input validation using the Zod schema
    input: MaterialSchema,
    
    handler: async (data, context) => {
      // 2. IMPORTANT: Check for admin/authentication here if needed
      // if (!context.currentUser || !context.currentUser.isAdmin) {
      //   throw new Error("Unauthorized");
      // }

      // 3. Database operation
      const { data: materialData, error } = await supabase
        .from('Materials') 
        .insert([{
          id: data.id,
          price: data.price,
          recipe: data.recipe,
          yield: data.yield,
          focusCost: data.focusCost,
        }])
        .select();

      if (error) {
        console.error("Supabase insert error:", error);
        // Throw an error that the client can catch
        throw new Error(`Database error: ${error.message}`);
      }

      return { success: true, materialId: data.id };
    },
  }),
  
  // You'd add updateMaterial, deleteMaterial here later
};