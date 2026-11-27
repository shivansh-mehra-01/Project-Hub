import { Suspense } from "react";
import { HodTracksView } from "@/features/hod/views/HodTracksView";

export default function HODProjectTracksPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500 font-mono">Loading project tracks...</div>}>
      <HodTracksView />
    </Suspense>
  );
}
