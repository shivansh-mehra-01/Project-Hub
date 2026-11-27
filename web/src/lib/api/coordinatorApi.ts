import { apiClient } from "./apiClient";
import {
  AddSingleStudentRequest,
  AssignGuideRequest,
  CreateExceptionRequest,
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

  getFaculty: () =>
    apiClient.get<Array<{ id: string; fullName: string; designation?: string; isAvailable: boolean; currentMentoredTeams: number; maxMentorTeams: number }>>(
      "/api/coordinator/faculty"
    ),

  verifyProposal: (teamId: string, remarks?: string) =>
    apiClient.post<{ success: boolean; teamId: string; status: string }>(
      `/api/coordinator/proposals/${teamId}/verify`,
      remarks ? { remarks } : {}
    ),

  returnProposal: (teamId: string, remarks: string) =>
    apiClient.post<{ success: boolean; teamId: string; status: string }>(
      `/api/coordinator/proposals/${teamId}/return`,
      { remarks }
    ),

  assignGuide: (teamId: string, data: AssignGuideRequest) =>
    apiClient.post<{ success: boolean; teamId: string; guideId: string; guideName: string }>(
      `/api/coordinator/teams/${teamId}/assign-guide`,
      data
    ),

  getPanels: () => apiClient.get<VivaPanelDto[]>("/api/coordinator/panels"),

  schedulePanel: (data: ScheduleVivaPanelRequest) =>
    apiClient.post<VivaPanelDto>("/api/coordinator/panels", data),

  createException: (data: CreateExceptionRequest) =>
    apiClient.post<{ success: boolean; exceptionId?: string; status?: string }>("/api/coordinator/exceptions", data),

  exportMarksheetCsvBlob: (trackId?: string) =>
    apiClient.getBlob("/api/coordinator/export-marksheet", {
      params: trackId ? { trackId } : undefined,
    }),
};
