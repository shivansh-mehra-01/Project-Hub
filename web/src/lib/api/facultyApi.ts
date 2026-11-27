import { apiClient } from "./apiClient";
import {
  ActionQueueDto,
  ArtifactSlotDto,
  AssignedDefenseTeamDto,
  ProjectProposalDto,
  ReturnProposalRequest,
  ReviewArtifactRequest,
  SubmitVivaEvaluationRequest,
  VerifyLogRequest,
} from "./types";

export const facultyApi = {
  getActionQueue: () => apiClient.get<ActionQueueDto>("/api/faculty/action-queue"),

  getMentoredTeams: () =>
    apiClient.get<ProjectProposalDto[]>("/api/faculty/mentored-teams"),

  verifyLog: (logId: string, data: VerifyLogRequest) =>
    apiClient.post<{
      success: boolean;
      logId: string;
      isVerified: boolean;
      status: string;
      mentorRemarks?: string;
    }>(`/api/faculty/logs/${logId}/verify`, data),

  endorseProposal: (teamId: string) =>
    apiClient.post<{ success: boolean; teamId: string; status: string }>(
      `/api/faculty/proposals/${teamId}/endorse`
    ),

  returnProposal: (teamId: string, data: ReturnProposalRequest) =>
    apiClient.post<{
      success: boolean;
      teamId: string;
      status: string;
      isReturned: boolean;
      remarks: string;
    }>(`/api/faculty/proposals/${teamId}/return`, data),

  rejectProposal: (teamId: string, data: ReturnProposalRequest) =>
    apiClient.post<{
      success: boolean;
      teamId: string;
      status: string;
      isRejected: boolean;
      remarks: string;
    }>(`/api/faculty/proposals/${teamId}/reject`, data),

  getAssignedDefenseTeams: () =>
    apiClient.get<AssignedDefenseTeamDto[]>("/api/faculty/defense-teams"),

  submitVivaEvaluation: (data: SubmitVivaEvaluationRequest) =>
    apiClient.post<{
      success: boolean;
      evaluationId: string;
      isLocked: boolean;
      individualScoresCount: number;
      isUpdated: boolean;
    }>("/api/faculty/evaluations", data),

  getTeamArtifacts: (teamId: string) =>
    apiClient.get<ArtifactSlotDto[]>(`/api/faculty/teams/${teamId}/artifacts`),

  downloadArtifact: (artifactId: string) =>
    apiClient.getBlob(`/api/artifacts/${artifactId}/download`),

  reviewArtifact: (artifactId: string, data: ReviewArtifactRequest) =>
    apiClient.post<{
      success: boolean;
      artifactId: string;
      status: string;
      reviewerNote?: string;
    }>(`/api/faculty/artifacts/${artifactId}/review`, data),

  // Phase 7: Additive Faculty Supervision API
  getSupervisionDashboard: () =>
    apiClient.get<import("./types").SupervisionDashboardDto>("/api/faculty/supervision/dashboard"),

  getSupervisedTeamDetail: (teamId: string) =>
    apiClient.get<import("./types").SupervisedTeamDetailDto>(`/api/faculty/supervision/teams/${teamId}`),

  reviewSupervisionMilestone: (milestoneId: string, data: import("./types").ReviewMilestoneRequest) =>
    apiClient.post<import("./types").ProjectMilestoneDto>(`/api/faculty/supervision/milestones/${milestoneId}/review`, data),

  reviewSupervisionArtifact: (artifactId: string, data: ReviewArtifactRequest) =>
    apiClient.post<{ success: boolean; artifactId: string; status: string }>(`/api/faculty/supervision/artifacts/${artifactId}/review`, data),

  verifySupervisionLog: (logId: string, data: { isVerified: boolean; mentorRemarks?: string }) =>
    apiClient.post<{ success: boolean; logId: string; isVerified: boolean }>(`/api/faculty/supervision/logs/${logId}/verify`, data),

  // Phase 8: Faculty Supervision of Final Submissions
  getTeamSubmission: (teamId: string) =>
    apiClient.get<import("./types").ProjectReportSubmissionDto>(`/api/faculty/supervision/teams/${teamId}/submission`),

  reviewFinalSubmission: (submissionId: string, data: import("./types").ReviewFinalSubmissionRequest) =>
    apiClient.post<import("./types").ProjectReportSubmissionDto>(`/api/faculty/supervision/submissions/${submissionId}/review`, data),

  downloadSubmissionReport: (submissionId: string) =>
    apiClient.getBlob(`/api/faculty/supervision/submissions/${submissionId}/download`),

  // Phase 9: Evaluation & Viva Defense
  getAssignedDefenseSessions: () =>
    apiClient.get<import("./types").AssignedDefenseSessionDto[]>("/api/evaluation/assigned"),

  submitAssessment: (data: import("./types").SubmitEvaluatorAssessmentRequest) =>
    apiClient.post<{ success: boolean; evaluationId: string; sharedTotalScore: number; isLocked: boolean; isDraft: boolean }>("/api/evaluation/assessments/submit", data),

  publishEvaluation: (teamId: string, data: import("./types").PublishEvaluationRequest) =>
    apiClient.post<{ success: boolean; teamId: string; outcome: string; isPublished: boolean; teamStatus: string }>(`/api/evaluation/teams/${teamId}/publish`, data),

  getRubrics: (departmentId?: string, trackId?: string) =>
    apiClient.get<import("./types").EvaluationRubricDto[]>("/api/evaluation/rubrics", { params: { departmentId, trackId } }),

  // Phase 10: Project Closure & Academic Records
  getClosureReadiness: (teamId: string) =>
    apiClient.get<import("./types").ClosureReadinessDto>(`/api/closure/teams/${teamId}/readiness`),

  formallyCloseProject: (teamId: string, data: import("./types").CloseProjectRequest) =>
    apiClient.post<import("./types").ProjectClosureResultDto>(`/api/closure/teams/${teamId}/close`, data),

  reopenClosedProject: (teamId: string, data: import("./types").ReopenProjectRequest) =>
    apiClient.post<import("./types").ProjectClosureResultDto>(`/api/closure/teams/${teamId}/reopen`, data),
};
