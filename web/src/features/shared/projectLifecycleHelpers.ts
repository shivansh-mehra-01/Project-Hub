import type {
  ArtifactSlotDto,
  ClosureReadinessDto,
  MilestoneStatus,
  ProjectReportSubmissionDto,
  SprintTaskDto,
  TeamMemberDto,
} from "@/lib/api/types";

export interface MemberTaskContribution {
  userId: string;
  fullName: string;
  isTeamLead: boolean;
  assignedCount: number;
  completedCount: number;
  completionPercentage: number;
}

/**
 * Computes per-member task assignment and completion metrics from sprint tasks.
 */
export function computeMemberTaskContributions(
  members: Pick<TeamMemberDto, "userId" | "fullName" | "isTeamLead">[],
  tasks: Pick<SprintTaskDto, "assignedToUserId" | "status">[]
): MemberTaskContribution[] {
  return members.map((member) => {
    const assigned = tasks.filter((t) => t.assignedToUserId === member.userId);
    const completed = assigned.filter((t) => t.status === "Done").length;
    const pct = assigned.length > 0 ? Math.round((completed / assigned.length) * 100) : 0;
    return {
      userId: member.userId,
      fullName: member.fullName,
      isTeamLead: Boolean(member.isTeamLead),
      assignedCount: assigned.length,
      completedCount: completed,
      completionPercentage: pct,
    };
  });
}

/**
 * Validates that an external evidence URL uses http:// or https://.
 */
export function validateHttpUrl(rawUrl: string): { valid: boolean; error?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, error: "Evidence URL is required." };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, error: "Evidence URL must start with http:// or https://." };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Enter a valid Evidence URL (e.g. https://github.com/...)." };
  }
}

export function canStudentSubmitMilestone(status: MilestoneStatus, isTeamLead: boolean): boolean {
  return isTeamLead && (status === "Pending" || status === "RevisionRequested");
}

export function canGuideReviewMilestone(status: MilestoneStatus): boolean {
  return status === "SubmittedForReview";
}

export function canStudentEditSubmission(
  status: ProjectReportSubmissionDto["status"] | undefined,
  isTeamLead: boolean
): boolean {
  return isTeamLead && (!status || status === "Draft" || status === "RevisionRequested");
}

export interface SubmissionDraftFields {
  projectTitle: string;
  abstract: string;
  problemStatement: string;
  methodology: string;
  implementationSummary: string;
  resultsAndConclusion: string;
  references: string;
  repositoryUrl: string;
  demoUrl: string;
}

export function hasSubmissionDraftChanges(
  draft: SubmissionDraftFields,
  saved: Partial<SubmissionDraftFields> | null | undefined
): boolean {
  return (
    draft.projectTitle.trim() !== (saved?.projectTitle || "").trim() ||
    draft.abstract.trim() !== (saved?.abstract || "").trim() ||
    draft.problemStatement.trim() !== (saved?.problemStatement || "").trim() ||
    draft.methodology.trim() !== (saved?.methodology || "").trim() ||
    draft.implementationSummary.trim() !== (saved?.implementationSummary || "").trim() ||
    draft.resultsAndConclusion.trim() !== (saved?.resultsAndConclusion || "").trim() ||
    draft.references.trim() !== (saved?.references || "").trim() ||
    draft.repositoryUrl.trim() !== (saved?.repositoryUrl || "").trim() ||
    draft.demoUrl.trim() !== (saved?.demoUrl || "").trim()
  );
}

/**
 * Checks FinalViva required verified deliverables (FinalThesis and PlagiarismReport).
 */
export function checkFinalVivaDeliverableGate(
  checkpointType: string | undefined,
  artifacts: Pick<ArtifactSlotDto, "slotType" | "status">[]
): { passes: boolean; missing: string[] } {
  if (checkpointType !== "FinalViva") {
    return { passes: true, missing: [] };
  }
  const thesis = artifacts.find((a) => a.slotType === "FinalThesis" && a.status === "Verified");
  const plagiarism = artifacts.find(
    (a) => a.slotType === "PlagiarismReport" && a.status === "Verified"
  );
  const missing: string[] = [];
  if (!thesis) missing.push("Final Thesis Document");
  if (!plagiarism) missing.push("Plagiarism Verification Report (< 15% similarity)");
  return { passes: missing.length === 0, missing };
}

export function canFormallyCloseProject(
  readiness: Pick<ClosureReadinessDto, "canClose" | "isClosed"> | null | undefined
): boolean {
  return Boolean(readiness && readiness.canClose && !readiness.isClosed);
}

export function canReopenProject(
  readiness: Pick<ClosureReadinessDto, "isClosed"> | null | undefined
): boolean {
  return Boolean(readiness && readiness.isClosed);
}
