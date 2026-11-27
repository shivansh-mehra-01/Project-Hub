import { Suspense } from "react";
import { HodOverviewView } from "@/features/hod/views/HodOverviewView";
import { PageLoadingState } from "@/design-system/patterns/PageStates";

export default function HodPage() {
  return (
    <Suspense fallback={<PageLoadingState message="Loading department overview..." />}>
      <HodOverviewView />
    </Suspense>
  );
}
