import { apiClient } from "./apiClient";
import {
  CollegeTenantDto,
  CreateTenantRequest,
  CreateTenantResponse,
  MasterOutcomeDto,
  MasterSdgDto,
  PlatformAuditLogDto,
  ProvisionAdminResponse,
  UpdateTenantRequest,
} from "./types";

export const platformApi = {
  getTenants: () => apiClient.get<CollegeTenantDto[]>("/api/platform/tenants"),

  createTenant: (data: CreateTenantRequest) =>
    apiClient.post<CreateTenantResponse>("/api/platform/tenants", data),

  provisionAdmin: (tenantId: string, data?: { fullName?: string; email?: string }) =>
    apiClient.post<ProvisionAdminResponse>(`/api/platform/tenants/${tenantId}/provision-admin`, data),

  updateTenant: (id: string, data: UpdateTenantRequest) =>
    apiClient.put<CollegeTenantDto>(`/api/platform/tenants/${id}`, data),

  getOutcomes: () => apiClient.get<MasterOutcomeDto[]>("/api/platform/outcomes"),

  getSdgs: () => apiClient.get<MasterSdgDto[]>("/api/platform/sdgs"),

  getAuditLogs: () => apiClient.get<PlatformAuditLogDto[]>("/api/platform/audit-logs"),
};
