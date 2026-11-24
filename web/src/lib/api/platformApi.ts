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
  getTenants: () => apiClient.get<CollegeTenantDto[]>("/api/platform/tenants", { suppressToast: true }),

  createTenant: (data: CreateTenantRequest) =>
    apiClient.post<CreateTenantResponse>("/api/platform/tenants", data),

  provisionAdmin: (tenantId: string, data?: { fullName?: string; email?: string }) =>
    apiClient.post<ProvisionAdminResponse>(`/api/platform/tenants/${tenantId}/provision-admin`, data),

  updateTenant: (id: string, data: UpdateTenantRequest) =>
    apiClient.put<CollegeTenantDto>(`/api/platform/tenants/${id}`, data),

  getOutcomes: () => apiClient.get<MasterOutcomeDto[]>("/api/platform/outcomes"),

  getSdgs: () => apiClient.get<MasterSdgDto[]>("/api/platform/sdgs"),

  getAuditLogs: (take = 100) =>
    apiClient.get<PlatformAuditLogDto[]>(`/api/platform/audit-logs?take=${take}`, { suppressToast: true }),

  createAuditLog: (data: {
    action: string;
    targetEntity: string;
    targetTenantId?: string;
    metadataJson?: string;
    ipAddress?: string;
  }) => apiClient.post<PlatformAuditLogDto>("/api/platform/audit-logs", data),

  getSessions: () => apiClient.get<any[]>("/api/platform/sessions", { suppressToast: true }),

  revokeSession: (sessionId: string) =>
    apiClient.post<{ success: boolean; revokedSessionId: string }>(
      `/api/platform/sessions/${sessionId}/revoke`
    ),
};
