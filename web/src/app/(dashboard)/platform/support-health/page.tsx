import { Suspense } from "react";
import { SupportHealthView } from "@/features/platform/support-health/SupportHealthView";

export const metadata = {
  title: "Support & Health | Colabex Super Admin",
  description: "Platform support ticket management and real-time core services health status.",
};

export default function PlatformSupportHealthPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500">Loading support &amp; health...</div>}>
      <SupportHealthView />
    </Suspense>
  );
}
