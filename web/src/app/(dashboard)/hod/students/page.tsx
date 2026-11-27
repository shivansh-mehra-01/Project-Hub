import React, { Suspense } from "react";
import { HodStudentsView } from "@/features/hod/views/HodStudentsView";

export default function HodStudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-xs text-slate-500">
          Loading department student roster...
        </div>
      }
    >
      <HodStudentsView />
    </Suspense>
  );
}
