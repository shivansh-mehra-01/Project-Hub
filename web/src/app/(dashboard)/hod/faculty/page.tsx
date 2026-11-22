import { Suspense } from "react";
import { HodFacultyView } from "@/features/hod/views/HodFacultyView";

export default function HODFacultyPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500 font-mono">Loading faculty directory...</div>}>
      <HodFacultyView />
    </Suspense>
  );
}
