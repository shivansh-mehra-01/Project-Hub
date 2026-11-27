import { apiClient } from "./apiClient";
import {
  ArchivedProjectSummaryDto,
  ArtifactSlotDto,
  CheckSimilarityRequest,
  CollegeTrackDto,
  ContinueLineageRequest,
  CreateProjectIdeaRequest,
  CreateTaskRequest,
  FacultyGuideSummaryDto,
  ProjectIdeaDto,
  SimilarityCheckResultDto,
  SprintTaskDto,
  StudentDashboardDto,
  StudentPortfolioDto,
  StudentProfileDto,
  StudentWorkspaceDto,
  SubmitLogbookRequest,
  SubmitProposalRequest,
  UpdateProjectIdeaRequest,
  UpdateStudentProfileRequest,
  UpdateTaskRequest,
  UploadArtifactRequest,
  WeeklyLogDto,
  EligiblePeerDto,
  CreateStudentTeamRequest,
  SendTeamInvitationRequest,
  TeamInvitationDto,
  RespondInvitationRequest,
  TransferTeamLeadRequest,
  StudentTeamRosterDto,
  StudentGuidePreferenceDto,
  SubmitGuidePreferenceRequest,
  ProjectProgressDto,
  UpdateTaskStatusRequest,
} from "./types";

export const studentApi = {
  getDashboard: () => apiClient.get<StudentDashboardDto>("/api/student/dashboard"),

  getProfile: () => apiClient.get<StudentProfileDto>("/api/student/profile"),

  updateProfile: (data: UpdateStudentProfileRequest) =>
    apiClient.put<StudentProfileDto>("/api/student/profile", data),

  getWorkspace: () => apiClient.get<StudentWorkspaceDto>("/api/student/workspace"),

  getAvailableTracks: () => apiClient.get<CollegeTrackDto[]>("/api/student/tracks"),

  // Phase 3: Project Discovery
  getArchivedProjects: (params?: { search?: string; domain?: string; sdg?: string }) =>
    apiClient.get<ArchivedProjectSummaryDto[]>("/api/student/projects/archive", { params }),

  getArchivedProject: (id: string) =>
    apiClient.get<ArchivedProjectSummaryDto>(`/api/student/projects/archive/${id}`),

  // Phase 3: Idea Management & Proposal Lifecycle
  getIdeas: () => apiClient.get<ProjectIdeaDto[]>("/api/student/ideas"),

  getIdea: (id: string) => apiClient.get<ProjectIdeaDto>(`/api/student/ideas/${id}`),

  createIdea: (data: CreateProjectIdeaRequest) =>
    apiClient.post<ProjectIdeaDto>("/api/student/ideas", data),

  updateIdea: (id: string, data: UpdateProjectIdeaRequest) =>
    apiClient.put<ProjectIdeaDto>(`/api/student/ideas/${id}`, data),

  submitProposal: (id: string, data?: SubmitProposalRequest) =>
    apiClient.post<{ success: boolean; teamId: string; status: string; message: string }>(
      `/api/student/ideas/${id}/submit`,
      data || {}
    ),

  resubmitProposal: (id: string, data?: SubmitProposalRequest) =>
    apiClient.post<{ success: boolean; teamId: string; status: string; message: string }>(
      `/api/student/ideas/${id}/resubmit`,
      data || {}
    ),

  checkSimilarity: (data: CheckSimilarityRequest) =>
    apiClient.post<SimilarityCheckResultDto>("/api/student/ideas/check-similarity", data),

  createTask: (data: CreateTaskRequest) =>
    apiClient.post<SprintTaskDto>("/api/student/tasks", data),

  updateTask: (taskId: string, data: UpdateTaskRequest) =>
    apiClient.put<SprintTaskDto>(`/api/student/tasks/${taskId}`, data),

  submitLog: (data: SubmitLogbookRequest) =>
    apiClient.post<WeeklyLogDto>("/api/student/logs", data),

  uploadArtifact: (data: UploadArtifactRequest) =>
    apiClient.post<ArtifactSlotDto>("/api/student/artifacts", data),

  uploadArtifactFile: (slot: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.postFormData<ArtifactSlotDto>(`/api/student/artifacts/${slot}/upload`, formData);
  },

  downloadArtifactBlob: (artifactId: string) =>
    apiClient.getBlob(`/api/artifacts/${artifactId}/download`),

  getFacultyGuides: () => apiClient.get<FacultyGuideSummaryDto[]>("/api/student/faculty-guides"),

  continueLineage: (data: ContinueLineageRequest) =>
    apiClient.post<{
      success: boolean;
      previousTeamId: string;
      newTeamId: string;
      newTeamCode: string;
    }>("/api/student/continue-lineage", data),

  getPortfolio: () => apiClient.get<StudentPortfolioDto>("/api/student/portfolio"),

  // Phase 4: Team Formation, Membership & Invitation Lifecycle
  getEligiblePeers: (search?: string) =>
    apiClient.get<EligiblePeerDto[]>("/api/student/eligible-peers", { params: search ? { search } : undefined }),

  createTeam: (data: CreateStudentTeamRequest) =>
    apiClient.post<StudentTeamRosterDto>("/api/student/teams", data),

  getCurrentTeamRoster: () =>
    apiClient.get<StudentTeamRosterDto>("/api/student/teams/current"),

  sendTeamInvitation: (data: SendTeamInvitationRequest) =>
    apiClient.post<TeamInvitationDto>("/api/student/teams/invitations", data),

  getReceivedInvitations: () =>
    apiClient.get<TeamInvitationDto[]>("/api/student/invitations"),

  getSentInvitations: () =>
    apiClient.get<TeamInvitationDto[]>("/api/student/teams/invitations"),

  acceptInvitation: (id: string, data?: RespondInvitationRequest) =>
    apiClient.post<{ message: string; teamId: string; teamCode?: string }>(
      `/api/student/invitations/${id}/accept`,
      data || {}
    ),

  rejectInvitation: (id: string, data?: RespondInvitationRequest) =>
    apiClient.post<{ message: string }>(
      `/api/student/invitations/${id}/reject`,
      data || {}
    ),

  cancelInvitation: (id: string) =>
    apiClient.delete<{ message: string }>(`/api/student/teams/invitations/${id}`),

  transferLeadership: (data: TransferTeamLeadRequest) =>
    apiClient.put<{ message: string; newLeaderId: string; newLeaderName?: string }>(
      "/api/student/teams/leader",
      data
    ),

  leaveTeam: () =>
    apiClient.post<{ message: string }>("/api/student/teams/leave", {}),

  removeMember: (memberId: string) =>
    apiClient.delete<{ message: string }>(`/api/student/teams/members/${memberId}`),

  // Phase 5: Official Guide Allocation & Preference Lifecycle
  getGuidePreference: () =>
    apiClient.get<StudentGuidePreferenceDto>("/api/student/teams/guide-preference"),

  submitGuidePreference: (data: SubmitGuidePreferenceRequest) =>
    apiClient.post<StudentGuidePreferenceDto>("/api/student/teams/guide-preference", data),

  // Phase 6: Project Execution & Task Management
  getWorkspaceTasks: () =>
    apiClient.get<SprintTaskDto[]>("/api/student/workspace/tasks"),

  getWorkspaceProgress: () =>
    apiClient.get<ProjectProgressDto>("/api/student/workspace/progress"),

  createWorkspaceTask: (data: CreateTaskRequest) =>
    apiClient.post<SprintTaskDto>("/api/student/workspace/tasks", data),

  updateWorkspaceTask: (taskId: string, data: UpdateTaskRequest) =>
    apiClient.put<void>(`/api/student/workspace/tasks/${taskId}`, data),

  updateTaskStatus: (taskId: string, data: UpdateTaskStatusRequest) =>
    apiClient.patch<{ success: boolean; taskId: string; previousStatus: string; newStatus: string }>(
      `/api/student/workspace/tasks/${taskId}/status`,
      data
    ),

  deleteWorkspaceTask: (taskId: string) =>
    apiClient.delete<void>(`/api/student/workspace/tasks/${taskId}`),

  // Phase 7: Milestones
  getWorkspaceMilestones: () =>
    apiClient.get<import("./types").ProjectMilestoneDto[]>("/api/student/workspace/milestones"),

  createWorkspaceMilestone: (data: import("./types").CreateMilestoneRequest) =>
    apiClient.post<import("./types").ProjectMilestoneDto>("/api/student/workspace/milestones", data),

  updateWorkspaceMilestone: (milestoneId: string, data: import("./types").UpdateMilestoneRequest) =>
    apiClient.put<{ success: boolean; milestoneId: string }>(`/api/student/workspace/milestones/${milestoneId}`, data),

  submitWorkspaceMilestone: (milestoneId: string, data: import("./types").SubmitMilestoneRequest) =>
    apiClient.post<{ success: boolean; milestoneId: string; status: import("./types").MilestoneStatus }>(
      `/api/student/workspace/milestones/${milestoneId}/submit`,
      data
    ),

  getMilestoneHistory: (milestoneId: string) =>
    apiClient.get<import("./types").MilestoneReviewHistoryDto[]>(`/api/student/workspace/milestones/${milestoneId}/history`),

  // Phase 8: Final Project Report & Deliverables Submission
  getFinalSubmission: () =>
    apiClient.get<import("./types").ProjectReportSubmissionDto>("/api/student/workspace/submission"),

  saveSubmissionDraft: (data: import("./types").SaveSubmissionDraftRequest) =>
    apiClient.put<import("./types").ProjectReportSubmissionDto>("/api/student/workspace/submission/draft", data),

  attachReportDeliverable: (data: import("./types").AttachReportDeliverableRequest) =>
    apiClient.post<import("./types").ProjectReportSubmissionDto>("/api/student/workspace/submission/attach-report", data),

  submitFinalReport: (data: import("./types").SubmitFinalReportRequest) =>
    apiClient.post<import("./types").ProjectReportSubmissionDto>("/api/student/workspace/submission/submit", data),

  getSubmissionHistory: () =>
    apiClient.get<import("./types").SubmissionReviewHistoryDto[]>("/api/student/workspace/submission/history"),

  // Phase 9: Evaluation & Viva Defense
  getEvaluationResult: () =>
    apiClient.get<import("./types").StudentVivaResultDto>("/api/student/workspace/evaluation"),

  // Phase 10: Verified Student Portfolio & Academic Records
  getVerifiedPortfolio: () =>
    apiClient.get<import("./types").VerifiedStudentPortfolioDto>("/api/student/portfolio/verified"),

  updatePortfolioVisibility: (data: import("./types").UpdatePortfolioVisibilityRequest) =>
    apiClient.put<{ allowPublicPortfolio: boolean; message: string }>("/api/student/portfolio/visibility", data),

  getPublicPortfolio: (enrollmentNumber: string) =>
    apiClient.get<import("./types").PublicStudentPortfolioDto>(`/api/student/portfolio/${enrollmentNumber}/public`),

  getAcademicRecordTranscript: (recordId: string) =>
    apiClient.get<import("./types").StudentAcademicRecordDto>(`/api/student/records/${recordId}/transcript`),
};
