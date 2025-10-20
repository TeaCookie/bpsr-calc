import { createColumnHelper } from '@tanstack/react-table';

const columnHelper = createColumnHelper();

// Define columns for every field you need to display or sort.
// We are assuming placeholders for the material price/focus data for now.
export const sortableColumns = [
  // 1. Name Column (Group 1)
  columnHelper.accessor('name', {
    header: 'Name',
    id: 'name',
    enableSorting: true,
  }),

  // 2. Price Column (Final Product Price - Group 1)
  columnHelper.accessor('productPrice', {
    header: 'Price',
    id: 'productPrice',
    enableSorting: true,
    // We can define a sorting function for numbers here if needed, 
    // but the default accessor is usually fine.
  }),
  
  // --- Group 2 (Material Details) ---
  // We use placeholder IDs for the actual values you'll calculate later. 
  // These will be used by the manual header's click handlers.
  
  // 3. Material Name/ID (Used for filtering/finding the recipe row)
  columnHelper.accessor('id', {
    header: 'Material (ID)',
    id: 'materialId', // Using the primary ID as a proxy for the material row
    enableSorting: false, // You generally don't sort by the material ID field itself
  }),

  // 4. Total Quantity (A simple aggregated sum we'll calculate later for sorting)
  columnHelper.accessor('totalQuantity', { 
    header: 'Total Quantity',
    id: 'totalQuantity',
    enableSorting: true,
  }),

  // 5. Total Material Cost (This represents the SUM for the Price(each) column)
  columnHelper.accessor('totalMaterialCost', {
    header: 'Total Cost (Buy)',
    id: 'totalMaterialCost',
    enableSorting: true,
  }),

  // 6. Total Focus Cost (This represents the SUM for the Focus(each) column)
  columnHelper.accessor('totalFocusCost', {
    header: 'Total Focus',
    id: 'totalFocusCost',
    enableSorting: true,
  }),
  
  // 7. Profit/Focus Column (Group 3)
  columnHelper.accessor('profitPerFocus', {
    header: 'Profit/Focus',
    id: 'profitPerFocus',
    enableSorting: true,
  }),
];

// In your ClientSortableTable.jsx, you will only reference these 'id's
// when calling toggleSorting('columnId').