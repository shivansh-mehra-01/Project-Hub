import { Suspense } from "react";
import { StudentWorkspaceView } from "@/features/student/StudentWorkspaceView";
import { PageLoadingState } from "@/design-system/patterns/PageStates";

export default function StudentPage() {
  return (
    <Suspense fallback={<PageLoadingState message="Loading student workspace..." />}>
      <StudentWorkspaceView />
    </Suspense>
  );
}
