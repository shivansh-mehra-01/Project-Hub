import { apiClient } from "./apiClient";
import {
  CollegeTenantDto,
  CreateTenantRequest,
  MasterOutcomeDto,
  MasterSdgDto,
  PlatformAuditLogDto,
  UpdateTenantRequest,
} from "./types";

export const platformApi = {
  getTenants: () => apiClient.get<CollegeTenantDto[]>("/api/platform/tenants"),

  createTenant: (data: CreateTenantRequest) =>
    apiClient.post<CollegeTenantDto>("/api/platform/tenants", data),

  updateTenant: (id: string, data: UpdateTenantRequest) =>
    apiClient.put<CollegeTenantDto>(`/api/platform/tenants/${id}`, data),

  getOutcomes: () => apiClient.get<MasterOutcomeDto[]>("/api/platform/outcomes"),

  getSdgs: () => apiClient.get<MasterSdgDto[]>("/api/platform/sdgs"),

  getAuditLogs: () => apiClient.get<PlatformAuditLogDto[]>("/api/platform/audit-logs"),
};
