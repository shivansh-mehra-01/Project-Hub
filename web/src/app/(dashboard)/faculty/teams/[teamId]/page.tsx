import { Suspense } from "react";
import { FacultyTeamWorkspaceView } from "@/features/faculty/views/FacultyTeamWorkspaceView";

export const metadata = {
  title: "Team Project Workspace | Colabex",
  description: "Dedicated project team supervision, deliverables vault, and proposal reviews.",
};

export default async function TeamWorkspacePage(props: {
  params: Promise<{ teamId: string }>;
}) {
  const params = await props.params;

  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500">Loading project workspace...</div>}>
      <FacultyTeamWorkspaceView teamId={params.teamId} />
    </Suspense>
  );
}
