import { apiClient } from "./apiClient";
import {
  CollegeTrackDto,
  CreateDepartmentTrackRequest,
  DepartmentStudentResultDto,
  ExceptionAuditLogDto,
  FacultyWorkloadDto,
  GradeUnlockRequestDto,
  HodAcademicContextDto,
  HodAssignGuideRequest,
  HodDashboardDto,
  HodProjectDto,
  HodReportsSummaryDto,
  ProjectProposalDto,
  ToggleCoordinatorRequest,
  UpdateMentorCapRequest,
} from "./types";

export const hodApi = {
  getDashboard: () => apiClient.get<HodDashboardDto>("/api/hod/dashboard"),

  updateEvaluationCutoff: (evaluationCutoffDateUtc: string | null) =>
    apiClient.put<HodDashboardDto>("/api/hod/department-settings/evaluation-cutoff", {
      evaluationCutoffDateUtc,
    }),

  getAcademicContext: () => apiClient.get<HodAcademicContextDto>("/api/hod/academic-context"),

  getTracks: () => apiClient.get<CollegeTrackDto[]>("/api/hod/tracks"),

  createTrack: (data: CreateDepartmentTrackRequest) =>
    apiClient.post<CollegeTrackDto>("/api/hod/tracks", data),

  getProjects: (params?: {
    status?: string;
    trackId?: string;
    search?: string;
    hasGuide?: boolean;
    isAtRisk?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.trackId) searchParams.set("trackId", params.trackId);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.hasGuide !== undefined) searchParams.set("hasGuide", String(params.hasGuide));
    if (params?.isAtRisk !== undefined) searchParams.set("isAtRisk", String(params.isAtRisk));
    const qs = searchParams.toString();
    return apiClient.get<HodProjectDto[]>(`/api/hod/projects${qs ? `?${qs}` : ""}`);
  },

  assignGuide: (teamId: string, data: HodAssignGuideRequest) =>
    apiClient.post<{
      success: boolean;
      teamId: string;
      teamCode: string;
      guideUserId: string;
      guideName: string;
      previousGuideName?: string;
      status: string;
    }>(`/api/hod/projects/${teamId}/assign-guide`, data),

  getProposals: () => apiClient.get<ProjectProposalDto[]>("/api/hod/proposals"),

  approveProposal: (teamId: string) =>
    apiClient.post<{ success: boolean; teamId: string; status: string }>(
      `/api/hod/proposals/${teamId}/approve`
    ),

  endorseProposal: (teamId: string) =>
    apiClient.post<{ success: boolean; teamId: string; status: string }>(
      `/api/hod/proposals/${teamId}/endorse`
    ),

  returnProposal: (teamId: string, remarks?: string) =>
    apiClient.post<{ success: boolean; teamId: string; status: string; remarks: string }>(
      `/api/hod/proposals/${teamId}/return`,
      { remarks }
    ),

  bulkApproveProposals: (teamIds: string[]) =>
    apiClient.post<{ success: boolean; approvedCount: number; teamIds: string[]; message: string }>(
      "/api/hod/proposals/bulk-approve",
      { teamIds }
    ),

  getFaculty: () => apiClient.get<FacultyWorkloadDto[]>("/api/hod/faculty"),

  toggleCoordinator: (facultyId: string, data: ToggleCoordinatorRequest) =>
    apiClient.put<{ success: boolean; facultyId: string; isProjectCoordinator: boolean }>(
      `/api/hod/faculty/${facultyId}/coordinator`,
      data
    ),

  updateMentorCap: (facultyId: string, data: UpdateMentorCapRequest) =>
    apiClient.put<{ success: boolean; facultyId: string; maxMentorTeams: number }>(
      `/api/hod/faculty/${facultyId}/mentor-cap`,
      data
    ),

  getExceptions: () => apiClient.get<ExceptionAuditLogDto[]>("/api/hod/exceptions"),

  approveException: (id: string) =>
    apiClient.post<{ success: boolean; id: string; isApproved: boolean }>(
      `/api/hod/exceptions/${id}/approve`
    ),

  rejectException: (id: string, remarks?: string) =>
    apiClient.post<{ success: boolean; id: string; isApproved: boolean }>(
      `/api/hod/exceptions/${id}/reject`,
      { remarks }
    ),

  getGradeUnlocks: () => apiClient.get<GradeUnlockRequestDto[]>("/api/hod/grade-unlocks"),

  approveGradeUnlock: (id: string, remarks?: string) =>
    apiClient.post<{ success: boolean; id: string; evaluationId?: string; isLocked: boolean; approvedAtUtc?: string }>(
      `/api/hod/grade-unlocks/${id}/approve`,
      { remarks }
    ),

  rejectGradeUnlock: (id: string, remarks?: string) =>
    apiClient.post<{ success: boolean; id: string; isApproved: boolean; remarks?: string }>(
      `/api/hod/grade-unlocks/${id}/reject`,
      { remarks }
    ),

  getDepartmentResults: () => apiClient.get<DepartmentStudentResultDto[]>("/api/hod/results"),

  getReportsSummary: () => apiClient.get<HodReportsSummaryDto>("/api/hod/reports/summary"),
};
