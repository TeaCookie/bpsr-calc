import React from "react";
import { useForm, useFieldArray } from 'react-hook-form'
import type { SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod';
import { actions } from 'astro:actions';
import type { MaterialFormInputs} from "../lib/actionTypes";
import { MaterialSchema } from "../lib/actionTypes";
import styles from './adminForm.module.css'

interface AdminProps {
  initialData?: MaterialFormInputs
}

const AdminForm: React.FC<AdminProps> = ({ initialData }) => {
  // --- Setup React Hook Form ---
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty, isValid },
    reset
  } = useForm<MaterialFormInputs>({
    resolver: zodResolver(MaterialSchema),
    defaultValues: initialData || {
      id: "",
      price: 0.00,
      focusCost: 0,
      recipe: [],
      yield: 1
    },
    mode: "onTouched"
  });
  // --- Setup Dynamic Recipe Fields ---
  const { fields, append, remove } = useFieldArray({
    control,
    name: "recipe", // Corresponds to the 'recipe' array in MaterialFormInputs
  });
  // --- Submission Handler ---
  const onSubmit: SubmitHandler<MaterialFormInputs> = async (data) => {
    try {
      // Filter out empty recipe rows before submission
      const recipeData = data.recipe?.filter(r => r.materialId && r.quantity);

      const payload = { ...data, recipe: recipeData };

      const result = await actions.insertMaterial(payload);

        
        if (result.error) {
            // This handles errors thrown inside the action's handler (e.g., Supabase errors)
            console.error("Action execution failed:", result.error);
            alert(`Error from server: ${result.error.message}`);
            return; 
        }

        // 2. Access the success/materialId from the 'data' property
        if (result.data.success) { // <-- FIX: access via result.data
            alert(`Material "${result.data.materialId}" saved successfully!`);
            reset(payload);
        } else {
            // Fallback for cases where success is false (if your action handles that logic)
            alert("Save operation failed on the server.");
        }
    } catch (error) {
      console.error("Submission failed:", error);
      // Display the server-side error message
      alert(`Error: ${error || "Failed to communicate with the server."}`);
    }
  };

  // --- Component JSX ---
  return (
        <form onSubmit={handleSubmit(onSubmit)} className={styles.formContainer}>
            <h2 className={styles.formTitle}>Material Editor</h2>

            {/* --- CORE MATERIAL INFO --- */}
            <div className={styles.coreFieldsGrid}>
                {/* Material ID */}
                <div>
                    <label htmlFor="id" className={styles.label}>Material ID (Unique Key)</label>
                    <input 
                        id="id" 
                        {...register("id")} 
                        className={styles.inputField}
                    />
                    {errors.id && <p className={styles.errorText}>{errors.id.message}</p>}
                </div>
                
                {/* Price */}
                <div>
                    <label htmlFor="price" className={styles.label}>Price ($)</label>
                    <input 
                        id="price" 
                        type="number" 
                        step="0.01"
                        {...register("price", { valueAsNumber: true })}
                        className={styles.inputField}
                    />
                    {errors.price && <p className={styles.errorText}>{errors.price.message}</p>}
                </div>

                {/* Focus Cost */}
                <div>
                    <label htmlFor="focusCost" className={styles.label}>Focus Cost</label>
                    <input 
                        id="focusCost" 
                        type="number" 
                        step="0.01"
                        {...register("focusCost", { valueAsNumber: true })}
                        className={styles.inputField}
                    />
                    {errors.focusCost && <p className={styles.errorText}>{errors.focusCost.message}</p>}
                </div>
            </div>

            {/* --- RECIPE INGREDIENTS (Dynamic Array) --- */}
            <h3 className={styles.sectionTitle}>Recipe Ingredients (Optional)</h3>
            <div className={styles.recipeList}>
                {fields.map((field, index) => (
                    <div key={field.id} className={styles.recipeRow}>
                        {/* Ingredient ID */}
                        <div className={styles.recipeInputContainer}>
                            <label className={styles.recipeLabel}>Ingredient ID</label>
                            <input 
                                {...register(`recipe.${index}.materialId`)}
                                className={styles.recipeInputField}
                            />
                            {errors.recipe?.[index]?.materialId && 
                                <p className={styles.errorText}>{errors.recipe[index].materialId.message}</p>}
                        </div>
                        
                        {/* Quantity */}
                        <div className={styles.recipeQuantityContainer}>
                            <label className={styles.recipeLabel}>Quantity</label>
                            <input 
                                type="number"
                                {...register(`recipe.${index}.quantity`, { valueAsNumber: true })}
                                className={styles.recipeInputField}
                            />
                            {errors.recipe?.[index]?.quantity && 
                                <p className={styles.errorText}>{errors.recipe[index].quantity.message}</p>}
                        </div>
                        
                        {/* Remove Button */}
                        <button 
                            type="button" 
                            onClick={() => remove(index)} 
                            className={styles.removeButton}
                        >
                            Remove
                        </button>
                    </div>
                ))}
                
                <button 
                    type="button" 
                    onClick={() => append({ materialId: '', quantity: 1 })} 
                    className={styles.addButton}
                >
                    + Add Ingredient
                </button>
            </div>
            
            {/* --- SUBMIT BUTTON --- */}
            <div className={styles.submitSection}>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={isSubmitting ? styles.submitButtonLoading : styles.submitButton}
                >
                    {isSubmitting ? 'Saving...' : 'Save Material'}
                </button>
            </div>
        </form>
    );
};

export default AdminForm;