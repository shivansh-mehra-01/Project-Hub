import { Suspense } from "react";
import { HodApprovalsView } from "@/features/hod/views/HodApprovalsView";

export default function HODApprovalsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500 font-mono">Loading approvals queue...</div>}>
      <HodApprovalsView />
    </Suspense>
  );
}
