import { Suspense } from "react";
import { HodOverviewView } from "@/features/hod/views/HodOverviewView";

export default function HodPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500 font-mono">Loading overview...</div>}>
      <HodOverviewView />
    </Suspense>
  );
}
