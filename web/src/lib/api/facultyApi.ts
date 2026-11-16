import { apiClient } from "./apiClient";
import {
  ActionQueueDto,
  CreateProblemStatementRequest,
  ProjectProposalDto,
  SubmitVivaEvaluationRequest,
  VerifyLogRequest,
} from "./types";

export const facultyApi = {
  getActionQueue: () => apiClient.get<ActionQueueDto>("/api/faculty/action-queue"),

  getMentoredTeams: () =>
    apiClient.get<ProjectProposalDto[]>("/api/faculty/mentored-teams"),

  verifyLog: (logId: string, data: VerifyLogRequest) =>
    apiClient.post<{ success: boolean; logId: string; isVerified: boolean }>(
      `/api/faculty/logs/${logId}/verify`,
      data
    ),

  endorseProposal: (teamId: string) =>
    apiClient.post<{ success: boolean; teamId: string; status: string }>(
      `/api/faculty/proposals/${teamId}/endorse`
    ),

  getProblemBank: () => apiClient.get<any[]>("/api/faculty/problem-bank"),

  createProblemStatement: (data: CreateProblemStatementRequest) =>
    apiClient.post<{ success: boolean; id: string; title: string }>(
      "/api/faculty/problem-bank",
      data
    ),

  submitVivaEvaluation: (data: SubmitVivaEvaluationRequest) =>
    apiClient.post<{
      success: boolean;
      evaluationId: string;
      isLocked: boolean;
      individualScoresCount: number;
    }>("/api/faculty/evaluations", data),
};
