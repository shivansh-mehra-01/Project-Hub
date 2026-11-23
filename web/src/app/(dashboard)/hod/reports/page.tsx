import { Suspense } from "react";
import { HodReportsView } from "@/features/hod/views/HodReportsView";

export default function HODReportsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500 font-mono">Loading reports tabulation...</div>}>
      <HodReportsView />
    </Suspense>
  );
}
