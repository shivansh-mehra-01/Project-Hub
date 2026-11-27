import { Suspense } from "react";
import { PlatformOverviewView } from "@/features/platform/overview/PlatformOverviewView";
import { PageLoadingState } from "@/design-system/patterns/PageStates";

export const metadata = {
  title: "Platform Overview | Colabex Super Admin",
  description: "Monitor your platform, manage pending actions and track important activities.",
};

export default function PlatformDashboardPage() {
  return (
    <Suspense fallback={<PageLoadingState message="Loading platform overview..." />}>
      <PlatformOverviewView />
    </Suspense>
  );
}
