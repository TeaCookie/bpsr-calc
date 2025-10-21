import MainTable from "../components/mainTable";
import { MainTableProvider } from "../data/mainTableContext";
import type { Material } from "./types";

export default function MainTableShell({ initialData }: { initialData?: Material[] }) {
  return (
    <MainTableProvider initialData={initialData}>
      <MainTable />
    </MainTableProvider>
  );
}