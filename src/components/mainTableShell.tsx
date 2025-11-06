// src/components/MainTableShell.tsx
import { MainTableProvider } from "../data/mainTableContext";
import MainTable from "./mainTable";
import MarketPriceEditor from "./marketPriceEditor";
import type { Material } from "../utils/types";

export default function MainTableShell({ initialData }: { initialData?: Material[] }) {
  return (
    <MainTableProvider initialData={initialData}>
      <div className="dashboard-layout">
        <div className="price-editor-container">
          <MarketPriceEditor />
        </div>
        <div className="main-table-container">
          <MainTable />
        </div>
      </div>
    </MainTableProvider>
  );
}
