import React, { Suspense } from "react";
import { HodStartProjectWindowView } from "@/features/hod/views/HodStartProjectWindowView";

export default function HodStartProjectWindowPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-xs text-slate-500">
          Loading Start Project Window...
        </div>
      }
    >
      <HodStartProjectWindowView />
    </Suspense>
  );
}
