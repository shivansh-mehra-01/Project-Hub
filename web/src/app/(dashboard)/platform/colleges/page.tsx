import { Suspense } from "react";
import { CollegesView } from "@/features/platform/colleges/CollegesView";

export const metadata = {
  title: "Colleges | Colabex Super Admin",
  description: "Manage affiliated colleges, tenant status, capacity, and onboarding applications.",
};

export default function CollegesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500">Loading colleges...</div>}>
      <CollegesView />
    </Suspense>
  );
}
