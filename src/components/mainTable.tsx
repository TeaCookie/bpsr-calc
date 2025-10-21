import type { RecipeItem } from "../utils/types";
import { useState } from "react";
import * as React from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getExpandedRowModel,
} from '@tanstack/react-table'
import { MainTableContext } from "../data/mainTableContext";
import styles from './mainTable.module.css';

const columnHelper = createColumnHelper<RecipeItem>();

const mainTableColumns = [
  // --- INFO GROUP ---
  columnHelper.group({
    header: "Info",
    columns: [
      columnHelper.accessor('id', { 
        header: 'Name',
        cell: ({ row, getValue }) => {
          // Display value ONLY for parent rows (depth 0)
          return row.depth === 0 ? <div className="font-semibold">{getValue()}</div> : null;
        },
      }),
      columnHelper.accessor('price', {
        header: 'Price',
        cell: (info) => {
          // Display value ONLY for parent rows (depth 0)
          return info.row.depth === 0 ? `$${info.getValue()}` : null;
        },
      }),
    ],
  }),

  // --- MATERIALS GROUP ---
  columnHelper.group({
    header: "Materials",
    columns: [
      columnHelper.accessor('materialId', {
        id: 'materialId',
        header: 'Name',
        cell: ({ row, getValue }) => {
          return row.original.isMaterial ? getValue() : null;
        },
      }),
      columnHelper.accessor('quantity', {
        id: 'quantity', 
        header: 'Quantity',
        cell: ({ row, getValue }) => {
          return row.original.isMaterial ? getValue() : null;
        },
      }),
      // 3. Focus Cost (Accessor targets the 'focusCost' property on RecipeItem)
      columnHelper.accessor('focusCost', {
        header: 'Focus',
        cell: ({ row, getValue }) => {
          // Display value ONLY for parent rows (depth 0)
          return row.depth === 0 ? <div className="font-mono">{getValue()}</div> : null;
        },
      }),
    ],
  }),
  // --- OUTPUT GROUP ---
  columnHelper.group({
    header: "Output",
    columns: [
        columnHelper.display({
            id: 'output-placeholder',
            header: 'N/A',
            cell: () => <div className="text-gray-400">-</div>,
        }),
    ],
  }),
];

export default function MainTable() {
  // console.log('[MainTable] React.version (consumer):', (React as any).version);
  const ctx = React.useContext(MainTableContext);
  // console.log('[MainTable] context at render (full):', ctx);
  // console.log('[MainTable] context at render:', { tableDataLen: ctx.tableData?.length, isLoading: ctx.isLoading });

  const { tableData, isLoading } = ctx;
  
  // const { tableData, isLoading } = useContext(MainTableContext);
  const [expanded] = useState(true);
  
  if (isLoading){
    return <div>Loading...</div>;
  }

  const table = useReactTable({
    data: tableData,
    columns: mainTableColumns,
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),

    state: { expanded: true},
    onExpandedChange: () => {},
    autoResetExpanded: false,
  });

  return (
    <div>
      <table>

        {/* --- Table Header (Grouped Headers) --- */}
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
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
          {table.getRowModel().rows.map(row => {
            return (
              <tr
                key={row.id}
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                  >
                    {/* Render the content from the custom column definitions */}
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* --- DEBUG: inspect data supplied to the table --- */}
      {/* <div style={{marginTop:16, whiteSpace:'pre-wrap', fontSize:12}}>
        <strong>DEBUG: tableData</strong>
        <pre>{JSON.stringify(tableData, null, 2)}</pre>

        <strong>DEBUG: row model (originals)</strong>
        <pre>{JSON.stringify(table.getRowModel().rows.map(r => ({ id: r.id, depth: r.depth, original: r.original })), null, 2)}</pre>
      </div> */}
    </div>
  );
}