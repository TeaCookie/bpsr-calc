import { z } from 'astro:schema'

const RecipeIngredientSchema = z.object({
  materialId: z.string().min(1, { message: "Ingredient ID is required." }),
  quantity: z.number().int().min(1, { message: "Quantity must be at least 1." }),
});

export const YieldValues = z.object({
  chance: z.number().positive().max(1),
  quantity: z.number().positive()
})

export const MaterialSchema = z.object({
  id: z.string(),
  price: z.number().positive(),
  recipe: z.array(RecipeIngredientSchema).optional(),
  yield: z.union([z.number(), z.array(YieldValues)]).optional(),
  focusCost: z.number().positive(),
});

export type MaterialFormInputs = z.infer<typeof MaterialSchema>