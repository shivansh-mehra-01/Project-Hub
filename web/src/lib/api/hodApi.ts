import { apiClient } from "./apiClient";
import {
  CollegeTrackDto,
  CreateDepartmentTrackRequest,
  ExceptionAuditLogDto,
  FacultyWorkloadDto,
  HodDashboardDto,
  NbaAttainmentReportDto,
  ProjectProposalDto,
  ToggleCoordinatorRequest,
  UpdateMentorCapRequest,
} from "./types";

export const hodApi = {
  getDashboard: () => apiClient.get<HodDashboardDto>("/api/hod/dashboard"),

  getTracks: () => apiClient.get<CollegeTrackDto[]>("/api/hod/tracks"),

  createTrack: (data: CreateDepartmentTrackRequest) =>
    apiClient.post<CollegeTrackDto>("/api/hod/tracks", data),

  getProposals: () => apiClient.get<ProjectProposalDto[]>("/api/hod/proposals"),

  endorseProposal: (teamId: string) =>
    apiClient.post<{ success: boolean; teamId: string; status: string }>(
      `/api/hod/proposals/${teamId}/endorse`
    ),

  returnProposal: (teamId: string, remarks?: string) =>
    apiClient.post<{ success: boolean; teamId: string; status: string; remarks: string }>(
      `/api/hod/proposals/${teamId}/return`,
      { remarks }
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

  getNbaAttainment: () => apiClient.get<NbaAttainmentReportDto>("/api/hod/nba-attainment"),

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
};
