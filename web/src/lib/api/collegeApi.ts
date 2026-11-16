import { apiClient } from "./apiClient";
import {
  AppointHodRequest,
  CollegeOverviewDto,
  CollegeSettingsDto,
  CollegeTrackDto,
  CreateCollegeTrackRequest,
  CreateDepartmentRequest,
  DepartmentDto,
  SignOffComplianceRequest,
  UpdateCollegeSettingsRequest,
} from "./types";

export const collegeApi = {
  getOverview: () => apiClient.get<CollegeOverviewDto>("/api/college/overview"),

  getDepartments: () => apiClient.get<DepartmentDto[]>("/api/college/departments"),

  createDepartment: (data: CreateDepartmentRequest) =>
    apiClient.post<DepartmentDto>("/api/college/departments", data),

  appointHod: (departmentId: string, data: AppointHodRequest) =>
    apiClient.put<{ success: boolean; departmentId: string; hodId: string; hodName: string }>(
      `/api/college/departments/${departmentId}/appoint-hod`,
      data
    ),

  getTracks: () => apiClient.get<CollegeTrackDto[]>("/api/college/tracks"),

  createTrack: (data: CreateCollegeTrackRequest) =>
    apiClient.post<CollegeTrackDto>("/api/college/tracks", data),

  getSettings: () => apiClient.get<CollegeSettingsDto>("/api/college/settings"),

  updateSettings: (data: UpdateCollegeSettingsRequest) =>
    apiClient.put<CollegeSettingsDto>("/api/college/settings", data),

  signOffCompliance: (data: SignOffComplianceRequest) =>
    apiClient.post<{ success: boolean; attestedAtUtc: string; message: string }>(
      "/api/college/compliance/sign-off",
      data
    ),
};
