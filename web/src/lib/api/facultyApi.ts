import { apiClient } from "./apiClient";
import {
  ActionQueueDto,
  ArtifactSlotDto,
  AssignedDefenseTeamDto,
  CreateProblemStatementRequest,
  ProblemBankStatement,
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

  getProblemBank: () => apiClient.get<ProblemBankStatement[]>("/api/faculty/problem-bank"),

  createProblemStatement: (data: CreateProblemStatementRequest) =>
    apiClient.post<ProblemBankStatement>(
      "/api/faculty/problem-bank",
      data
    ),

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
};
