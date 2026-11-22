import { Suspense } from "react";
import { HodQualityView } from "@/features/hod/views/HodQualityView";

export default function HODQualityPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500 font-mono">Loading quality outcomes...</div>}>
      <HodQualityView />
    </Suspense>
  );
}
