import { apiClient } from "./apiClient";
import {
  AddSingleStudentRequest,
  AssignGuideRequest,
  CreateExceptionRequest,
  ExceptionAuditLogDto,
  ProjectProposalDto,
  RosterImportRequest,
  RosterImportResultDto,
  ScheduleVivaPanelRequest,
  SingleStudentProvisionedResponse,
  VivaPanelDto,
} from "./types";

export const coordinatorApi = {
  importRoster: (data: RosterImportRequest) =>
    apiClient.post<RosterImportResultDto>("/api/coordinator/roster/import", data),

  addSingleStudent: (data: AddSingleStudentRequest) =>
    apiClient.post<SingleStudentProvisionedResponse>("/api/coordinator/roster/student", data),

  getTeams: (departmentId?: string, trackId?: string) =>
    apiClient.get<ProjectProposalDto[]>("/api/coordinator/teams", {
      params: { departmentId, trackId },
    }),

  assignGuide: (teamId: string, data: AssignGuideRequest) =>
    apiClient.post<{ success: boolean; teamId: string; guideId: string; guideName: string }>(
      `/api/coordinator/teams/${teamId}/assign-guide`,
      data
    ),

  getPanels: () => apiClient.get<VivaPanelDto[]>("/api/coordinator/panels"),

  schedulePanel: (data: ScheduleVivaPanelRequest) =>
    apiClient.post<VivaPanelDto>("/api/coordinator/panels", data),

  getExceptions: () => apiClient.get<ExceptionAuditLogDto[]>("/api/coordinator/exceptions"),

  createException: (data: CreateExceptionRequest) =>
    apiClient.post<{ success: boolean; id: string }>("/api/coordinator/exceptions", data),

  exportMarksheetCsvBlob: (trackId?: string) =>
    apiClient.getBlob("/api/coordinator/export-marksheet", {
      params: trackId ? { trackId } : undefined,
    }),
};
