import { Suspense } from "react";
import { HodProjectsView } from "@/features/hod/views/HodProjectsView";

export default function HODProjectsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500 font-mono">Loading projects...</div>}>
      <HodProjectsView />
    </Suspense>
  );
}
