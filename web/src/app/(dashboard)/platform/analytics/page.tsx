import { Suspense } from "react";
import { AnalyticsReportsView } from "@/features/platform/analytics/AnalyticsReportsView";

export const metadata = {
  title: "Analytics & Adoption | Colabex Super Admin",
  description: "Track platform adoption, multi-tenant utilization, and institutional growth across Colabex.",
};

export default function AnalyticsReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500 text-sm">
          Loading Analytics &amp; Reports workspace...
        </div>
      }
    >
      <AnalyticsReportsView />
    </Suspense>
  );
}
