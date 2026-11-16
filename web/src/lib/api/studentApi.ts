import { apiClient } from "./apiClient";
import {
  ArtifactSlotDto,
  ContinueLineageRequest,
  CreateTaskRequest,
  SprintTaskDto,
  StudentPortfolioDto,
  StudentWorkspaceDto,
  SubmitExitSurveyRequest,
  SubmitLogbookRequest,
  UpdateTaskRequest,
  UploadArtifactRequest,
  WeeklyLogDto,
} from "./types";

export const studentApi = {
  getWorkspace: () => apiClient.get<StudentWorkspaceDto>("/api/student/workspace"),

  createTask: (data: CreateTaskRequest) =>
    apiClient.post<SprintTaskDto>("/api/student/tasks", data),

  updateTask: (taskId: string, data: UpdateTaskRequest) =>
    apiClient.put<SprintTaskDto>(`/api/student/tasks/${taskId}`, data),

  submitLog: (data: SubmitLogbookRequest) =>
    apiClient.post<WeeklyLogDto>("/api/student/logs", data),

  uploadArtifact: (data: UploadArtifactRequest) =>
    apiClient.post<ArtifactSlotDto>("/api/student/artifacts", data),

  getProblemBank: () => apiClient.get<any[]>("/api/student/problem-bank"),

  continueLineage: (data: ContinueLineageRequest) =>
    apiClient.post<{
      success: boolean;
      previousTeamId: string;
      newTeamId: string;
      newTeamCode: string;
    }>("/api/student/continue-lineage", data),

  submitExitSurvey: (data: SubmitExitSurveyRequest) =>
    apiClient.post<{
      success: boolean;
      surveyId: string;
      submittedAtUtc: string;
    }>("/api/student/exit-survey", data),

  getPortfolio: () => apiClient.get<StudentPortfolioDto>("/api/student/portfolio"),
};
