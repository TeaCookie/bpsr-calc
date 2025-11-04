import type { MaterialDisplay, RecipeItem } from "../utils/types";
import { useState } from "react";
import * as React from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getExpandedRowModel,
} from '@tanstack/react-table'
import type { Row, ColumnMeta } from '@tanstack/react-table';
import { MainTableContext } from "../data/mainTableContext";
import styles from './mainTable.module.css';

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    tdClassName?: (args: { row: Row<TData> }) => string;
  }
}
const columnHelper = createColumnHelper<MaterialDisplay>();

const mainTableColumns = [
  // --- INFO GROUP ---
  columnHelper.group({
    header: "Info",
    columns: [
      columnHelper.accessor('id', {
        id: 'mainId',
        header: 'Name',
        cell: ({ row, getValue }) => {
          // Display value ONLY for parent rows (depth 0)
          return row.depth === 0 ? <div className="font-semibold">{getValue()}</div> : null;
        },
      }),
      columnHelper.accessor('price', {
        id: 'mainPrice',
        header: 'Price',
        cell: (info) => {
          // Display value ONLY for parent rows (depth 0)
          return info.row.depth === 0 ? `$${info.getValue()}` : null;
        },
      }),
      columnHelper.accessor('focusCost', {
        id: 'mainFocusCost',
        header: 'Focus Cost',
        cell: ({ row, getValue }) => {
          // Display value ONLY for parent rows (depth 0)
          return row.depth === 0 ? <div className="font-semibold">{getValue()}</div> : null;
        },
      }),
    ],
  }),

  // --- MATERIALS GROUP ---
  columnHelper.group({
    id: 'materials',
    header: 'Materials',
    columns: [
      // 1. Material Name Column
      columnHelper.accessor('materialId', {
        id: 'materialId',
        header: 'Name',
        meta: {
          // This function is called for every cell in this column
          tdClassName: ({ row }) => {
            let className = '';

            if (row.depth === 0 || row.original.isMaterial) {
              className += ` ${row.original.method}`;
            }

            return className.trim();
          },
        },
        cell: ({ row, getValue }) => {
          // RENDER: Always show, UNLESS it's a sub-row that doesn't carry this data.
          // Since the normalized data only populates materialName/quantity on the parent 
          // and the subsequent sub-rows, this will render correctly for all material-bearing rows.
          if (row.depth === 0 || row.original.isMaterial) {
            return <div className={row.depth === 0 ? '' : styles.materialCellText}>{getValue()}</div>;
          }
          return null;
        },
      }),

      // 2. Material Quantity Column
      columnHelper.accessor('quantity', {
        id: 'quantity',
        header: 'Quantity',
        cell: ({ row, getValue }) => {
          if (row.depth === 0 || row.original.isMaterial) {
            return getValue();
          }
          return null;
        },
      }),
      
      columnHelper.accessor('ingredientCost', {
        id: 'materialPrice',
        header: 'Price',
        meta: {
          tdClassName: ({ row }) => {
            return (row.original.method == 'buy') ? row.original.method : ''
          },
        },
        cell: ({ row, getValue }) => {
          if (row.depth === 0 || row.original.isMaterial) {
            return `$${getValue()?.toFixed(0)}`;
          }
          return null;
        }
      }),

      columnHelper.accessor('totalFocusCost', {
        id: 'materialFocusCost',
        header: 'Focus',
        meta: {
          tdClassName: ({ row }) => {
            return (row.original.method == 'craft') ? row.original.method : ''
          },
        },
        cell: ({ row, getValue }) => {
          if (row.depth === 0 || row.original.isMaterial) {
            return getValue()?.toFixed(2);
          }
          return null;
        }
      }),
    ],
  }),
  // --- OUTPUT GROUP ---
  columnHelper.group({
    header: "Output",
    columns: [
      columnHelper.accessor('profitPerFocus', {
        header: 'Profit/Focus',
        cell: ({ row, getValue }) => {
          // Display value ONLY for parent rows (depth 0)
          return row.depth === 0 ? <div className="font-mono">${getValue()?.toFixed(2)}</div> : null;
        },
      }),
    ],
  }),
];

export default function MainTable() {
  const ctx = React.useContext(MainTableContext);

  if (!ctx) {
    return <div>Loading...</div>;
  }

  const { tableData, isLoading, focusPrice } = ctx;

  // const { tableData, isLoading } = useContext(MainTableContext);
  const [expanded] = useState(true);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const table = useReactTable({
    data: tableData,
    columns: mainTableColumns,
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),

    state: { expanded: true },
    onExpandedChange: () => { },
    autoResetExpanded: false,
  });

  return (
    <div className={styles.tableContainer}>
      <table className={styles.mainTable}>

        {/* --- Table Header (Grouped Headers) --- */}
        <thead>
          {table.getHeaderGroups().map((headerGroup, index) => (
            <tr
              key={headerGroup.id}
              // Apply class based on header tier
              className={index === 0 ? styles.headerGroupRow : styles.columnHeaderRow}
            >
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  colSpan={header.colSpan}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        {/* --- Table Body --- */}
        <tbody>
          {table.getRowModel().rows.map((row, index, rowsArray) => {
            const isParent = row.depth === 0;

            // --- NEW LOGIC: Determine if this is the last row in a recipe group ---
            const nextRow = rowsArray[index + 1];

            // The row is the last in its group if:
            // 1. It is the very last row in the entire table (no nextRow), OR
            // 2. The next row in the array belongs to a different top-level parent.
            const isLastGroupRow =
              !nextRow ||
              (nextRow.depth === 0);

            // --- End NEW LOGIC ---
            let rowClassName = styles.dataRow;
            if (isLastGroupRow) {
              rowClassName += ` ${styles.isLastGroupRow}`;
            }

            return (
              <tr
                key={row.id}
                className={rowClassName}
              >
                {row.getVisibleCells().map(cell => {
                  // 1. Start with the base style class
                  let cellClassName = styles.tableCell;

                  // If in materials group, add specific class
                  if (cell.column.id === 'quantity' || cell.column.id === 'ingredientCost' || cell.column.id === 'focusCost') {
                    cellClassName += ` ${styles.materialsGroupNumber}`;
                  }

                  // 3. ⚠️ CRITICAL: Retrieve the dynamic class from the column's meta
                  const metaClassFn = cell.column.columnDef.meta?.tdClassName;
                  if (metaClassFn) {

                    // Execute the function defined in the column meta
                    const dynamicClassString = metaClassFn({ row: cell.row });
                    // console.log('Dynamic Class String:', dynamicClassString);

                    // ⚠️ CRITICAL FIX: Split the string and look up EACH class name in the CSS Module object
                    dynamicClassString.split(' ').forEach(className => {
                      // Ensure the class name is not empty AND it exists in the styles object
                      if (className && styles[className]) {
                        // Append the unique, scoped CSS Module name to the cellClassName
                        cellClassName += ` ${styles[className]}`;
                      }
                    });
                  }
                  return (
                    <td key={cell.id} className={cellClassName}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* --- DEBUG: inspect data supplied to the table --- */}
      <div style={{ marginTop: 16, whiteSpace: 'pre-wrap', fontSize: 12 }}>
        {/* <strong>DEBUG: tableData</strong>
        <pre>{JSON.stringify(tableData.slice(0), null, 2)}</pre>

        <strong>DEBUG: row model (originals)</strong>
        <pre>{JSON.stringify(table.getRowModel().rows.map(r => ({ id: r.id, depth: r.depth, original: r.original })), null, 2)}</pre> */}
        <strong>Focus Price:</strong> {focusPrice !== null ? `$${focusPrice.toFixed(2)}` : 'N/A'}
      </div>
    </div>
  );
}