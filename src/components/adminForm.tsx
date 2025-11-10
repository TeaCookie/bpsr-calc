import React from "react";
import { useForm, useFieldArray } from 'react-hook-form'
import type { SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod';
import { actions } from 'astro:actions';
import { z } from 'zod'; 

// Import your existing types and schemas
import type { MaterialFormInputs} from "../lib/actionTypes";
// Import the clean MaterialSchema and YieldValues
import { MaterialSchema, YieldValues, ExtraValues } from "../lib/actionTypes"; 

import styles from './adminForm.module.css'

// 1. Define the extended type for the form's internal state
interface AdminFormState extends MaterialFormInputs {
    // These fields are only used for the form's internal state management
    yieldType: 'single' | 'array';
    yieldSingle: number;
    // We use the exact structure of the array that Zod's YieldValues expects
    yieldArray: z.infer<typeof YieldValues>[];
    extra: z.infer<typeof ExtraValues>[];
}

// 2. Define the Zod Schema that the RESOLVER will use. (Locally defined)
// This schema must match the structure of AdminFormState.
const AdminFormResolverSchema = MaterialSchema.extend({
    // Override the core 'yield' field to be optional/derived, as it's not directly input 
    yield: MaterialSchema.shape.yield.optional(), 

    // Add the temporary UI fields which are necessary for validation
    yieldType: z.literal('single').or(z.literal('array')),
    yieldSingle: z.number().positive("Yield quantity must be positive."),
    yieldArray: z.array(YieldValues),
    extra: z.array(ExtraValues),
});


interface AdminProps {
    initialData?: MaterialFormInputs
}

const AdminForm: React.FC<AdminProps> = ({ initialData }) => {
    
    // --- Determine initial yield type for form state ---
    const initialYieldIsArray = Array.isArray(initialData?.yield);
    
    // --- Setup React Hook Form ---
    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
        reset,
        setValue, 
        watch,
    } = useForm<AdminFormState>({
        // 🚀 Use the extended schema for the resolver
        resolver: zodResolver(AdminFormResolverSchema), 
        defaultValues: {
            id: initialData?.id || "",
            price: initialData?.price || 0.00,
            focusCost: initialData?.focusCost || 0,
            recipe: initialData?.recipe || [],
            extra: initialData?.extra || [],
            
            // --- Initial Yield Setup for Form State ---
            yieldType: initialYieldIsArray ? 'array' : 'single',
            yieldSingle: initialYieldIsArray ? 0 : (initialData?.yield as number) || 1,
            yieldArray: initialYieldIsArray ? (initialData?.yield as z.infer<typeof YieldValues>[]) : [],
        },
        mode: "onTouched"
    });

    // --- Dynamic Field Array Setup ---
    const { fields, append, remove } = useFieldArray({
        control,
        name: "recipe",
    });
    
    // --- Dynamic Yield Field Setup ---
    const { 
        fields: yieldFields, 
        append: appendYield, 
        remove: removeYield 
    } = useFieldArray({
        control,
        name: "yieldArray",
    });

    const {
      fields: extraFields,
      append: appendExtra,
      remove: removeExtra
    } = useFieldArray({
      control, 
      name: "extra"
    })

    const yieldMode = watch('yieldType', initialYieldIsArray ? 'array' : 'single');

    // --- Submission Handler ---
    const onSubmit: SubmitHandler<AdminFormState> = async (data) => {
        
        let finalYield: MaterialFormInputs['yield'];

        // 1. Determine the final 'yield' value based on the selected type
        if (data.yieldType === 'single') {
            finalYield = data.yieldSingle;
        } else {
            finalYield = data.yieldArray
                ?.filter(y => y.chance && y.quantity) || [];
            
            if (finalYield.length === 0) finalYield = 1; 
        }
        
        // Filter recipe data (as before)
        const recipeData = data.recipe?.filter(r => r.materialId && r.quantity);

        let finalExtra: MaterialFormInputs['extra'];

        finalExtra = data.extra?.filter(e => e.qualityOutput && e.chance && e.price !== undefined) || [];

        // 2. Construct the final payload for the Astro Action
        // NOTE: This now correctly matches the clean MaterialFormInputs type
        const payload: MaterialFormInputs = { 
            id: data.id,
            price: data.price,
            focusCost: data.focusCost,
            recipe: recipeData,
            yield: finalYield, 
            extra: finalExtra
        };

        try {
            const result = await actions.insertMaterial(payload);
            
            if (result.error) {
                console.error("Action execution failed:", result.error);
                alert(`Error from server: ${result.error.message}`);
                return; 
            }

            if (result.data.success) {
                alert(`Material "${result.data.materialId}" saved successfully!`);
                
                // 🎯 Reset now works because 'payload' matches MaterialFormInputs
                // and we are passing the extended 'data' object back.
                reset({ 
                    ...data, 
                    yield: finalYield 
                }); 
            } else {
                alert("Save operation failed on the server.");
            }
        } catch (error) {
            console.error("Submission failed:", error);
            alert(`Error: ${error || "Failed to communicate with the server."}`);
        }
    };

    // --- Component JSX (omitted for brevity, but remains the same) ---
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
                        autoComplete="off"
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

            {/* 🚀 YIELD CONFIGURATION */}
            <h3 className={styles.sectionTitle}>Yield Configuration</h3>
            <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                    <input 
                        type="radio" 
                        value="single" 
                        {...register('yieldType')}
                    />
                    Single Yield Number
                </label>
                <label className={styles.radioLabel}>
                    <input 
                        type="radio" 
                        value="array" 
                        {...register('yieldType')}
                    />
                    Chance/Quantity List (e.g., RNG Drop)
                </label>
            </div>
            
            {/* RENDER BASED ON YIELD MODE */}
            {yieldMode === 'single' && (
                <div className={styles.singleFieldWrapper}>
                    <label htmlFor="yieldSingle" className={styles.label}>Base Yield Quantity</label>
                    <input 
                        id="yieldSingle" 
                        type="number" 
                        step="0.01"
                        {...register("yieldSingle", { valueAsNumber: true })}
                        className={styles.inputField}
                    />
                    {errors.yieldSingle && <p className={styles.errorText}>{errors.yieldSingle.message}</p>}
                </div>
            )}

            {yieldMode === 'array' && (
                <div className={styles.arrayWrapper}>
                    {yieldFields.map((field, index) => (
                        <div key={field.id} className={styles.yieldRow}>
                            {/* Chance Input */}
                            <div className={styles.yieldInputContainer}>
                                <label className={styles.yieldLabel}>Chance (0.0 - 1.0)</label>
                                <input 
                                    type="number" 
                                    step="0.0001"
                                    min="0"
                                    max="1"
                                    {...register(`yieldArray.${index}.chance`, { valueAsNumber: true })}
                                    className={styles.inputField}
                                />
                                {errors.yieldArray?.[index]?.chance && 
                                    <p className={styles.errorText}>{errors.yieldArray[index].chance.message}</p>}
                            </div>
                            
                            {/* Quantity Input */}
                            <div className={styles.yieldInputContainer}>
                                <label className={styles.yieldLabel}>Quantity</label>
                                <input 
                                    type="number"
                                    min="0"
                                    {...register(`yieldArray.${index}.quantity`, { valueAsNumber: true })}
                                    className={styles.inputField}
                                />
                                {errors.yieldArray?.[index]?.quantity && 
                                    <p className={styles.errorText}>{errors.yieldArray[index].quantity.message}</p>}
                            </div>
                            
                            <button 
                                type="button" 
                                onClick={() => removeYield(index)} 
                                className={styles.removeButton}
                            >
                                X
                            </button>
                        </div>
                    ))}
                    
                    <button 
                        type="button" 
                        onClick={() => appendYield({ chance: 1, quantity: 1 })} 
                        className={styles.addButton}
                    >
                        + Add Yield Drop
                    </button>
                </div>
            )}

            {/* --- EXTRA OUTPUTS (Dynamic Array) --- */}
            <h3 className={styles.sectionTitle}>Extra Outputs (Multi-Outputs)</h3>
            <div className={styles.recipeList}>
                {extraFields.map((field, index) => (
                    <div key={field.id} className={styles.recipeRow}>
                        {/* Chance */}
                        <div className={styles.recipeInputContainer}>
                            <label className={styles.recipeLabel}>Chance (0.0-1.0)</label>
                            <input 
                                type="number" 
                                step="0.0001"
                                {...register(`extra.${index}.chance`, { valueAsNumber: true })}
                                className={styles.recipeInputField}
                            />
                            {errors.extra?.[index]?.chance && 
                                <p className={styles.errorText}>{errors.extra[index].chance.message}</p>}
                        </div>

                        {/* Output ID */}
                        <div className={styles.recipeInputContainer}>
                            <label className={styles.recipeLabel}>Output Material ID</label>
                            <input 
                                {...register(`extra.${index}.qualityOutput`)}
                                className={styles.recipeInputField}
                            />
                            {errors.extra?.[index]?.qualityOutput && 
                                <p className={styles.errorText}>{errors.extra[index].qualityOutput.message}</p>}
                        </div>

                        {/* Price */}
                        <div className={styles.recipeInputContainer}>
                            <label className={styles.recipeLabel}>Price ($)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                {...register(`extra.${index}.price`, { valueAsNumber: true })}
                                className={styles.recipeInputField}
                            />
                            {errors.extra?.[index]?.price && 
                                <p className={styles.errorText}>{errors.extra[index].price.message}</p>}
                        </div>
                        
                        {/* Remove Button */}
                        <button 
                            type="button" 
                            onClick={() => removeExtra(index)} 
                            className={styles.removeButton}
                        >
                            Remove
                        </button>
                    </div>
                ))}
                
                <button 
                    type="button" 
                    onClick={() => appendExtra({ chance: 1, qualityOutput: '', price: 0 })} 
                    className={styles.addButton}
                >
                    + Add Extra Output
                </button>
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