import { Suspense } from "react";
import { PlatformOverviewView } from "@/features/platform/overview/PlatformOverviewView";

export const metadata = {
  title: "Platform Overview | Colabex Super Admin",
  description: "Monitor your platform, manage pending actions and track important activities.",
};

export default function PlatformDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500 text-sm">
          Loading platform overview...
        </div>
      }
    >
      <PlatformOverviewView />
    </Suspense>
  );
}
