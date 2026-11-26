import { apiClient } from "./apiClient";
import {
  CollegeTenantDto,
  CreateTenantRequest,
  CreateTenantResponse,
  HealthDetailsDto,
  MasterSdgDto,
  PlatformAdministratorDto,
  PlatformAnalyticsOverviewDto,
  PlatformAnnouncementDto,
  PlatformAuditLogDto,
  PlatformSecuritySummaryDto,
  PlatformSessionDto,
  ProvisionAdminResponse,
  SavePlatformAnnouncementRequest,
  SupportTicketDto,
  UpdateTenantRequest,
} from "./types";

export const platformApi = {
  getTenants: () => apiClient.get<CollegeTenantDto[]>("/api/platform/tenants", { suppressToast: true }),

  getTenant: (id: string) => apiClient.get<CollegeTenantDto>(`/api/platform/tenants/${id}`, { suppressToast: true }),

  getTenantAuditLogs: (id: string, take = 100) =>
    apiClient.get<PlatformAuditLogDto[]>(`/api/platform/tenants/${id}/audit-logs?take=${take}`, {
      suppressToast: true,
    }),

  createTenant: (data: CreateTenantRequest) =>
    apiClient.post<CreateTenantResponse>("/api/platform/tenants", data),

  provisionAdmin: (
    tenantId: string,
    data?: { fullName?: string; email?: string; replaceExisting?: boolean; reason?: string }
  ) => apiClient.post<ProvisionAdminResponse>(`/api/platform/tenants/${tenantId}/provision-admin`, data),

  updateTenant: (id: string, data: UpdateTenantRequest) =>
    apiClient.put<CollegeTenantDto>(`/api/platform/tenants/${id}`, data),

  getSdgs: () => apiClient.get<MasterSdgDto[]>("/api/platform/sdgs"),

  getAuditLogs: (
    take = 200,
    filters?: { search?: string; category?: string; result?: string; fromUtc?: string; toUtc?: string }
  ) => {
    const params = new URLSearchParams({ take: String(take) });
    if (filters?.search) params.set("search", filters.search);
    if (filters?.category && filters.category !== "All") params.set("category", filters.category);
    if (filters?.result && filters.result !== "All") params.set("result", filters.result);
    if (filters?.fromUtc) params.set("fromUtc", filters.fromUtc);
    if (filters?.toUtc) params.set("toUtc", filters.toUtc);
    return apiClient.get<PlatformAuditLogDto[]>(`/api/platform/audit-logs?${params.toString()}`, {
      suppressToast: true,
    });
  },

  createAuditLog: (data: {
    action: string;
    targetEntity: string;
    targetTenantId?: string;
    metadataJson?: string;
    ipAddress?: string;
  }) => apiClient.post<PlatformAuditLogDto>("/api/platform/audit-logs", data),

  getSecuritySummary: () =>
    apiClient.get<PlatformSecuritySummaryDto>("/api/platform/security-summary", { suppressToast: true }),

  getHealthDetails: () =>
    apiClient.get<HealthDetailsDto>("/api/health/details", { suppressToast: true }),

  getSessions: () =>
    apiClient.get<PlatformSessionDto[]>("/api/platform/sessions", { suppressToast: true }),

  revokeSession: (sessionId: string) =>
    apiClient.post<{ success: boolean; revokedSessionId: string }>(
      `/api/platform/sessions/${sessionId}/revoke`
    ),

  getAdministrators: () =>
    apiClient.get<PlatformAdministratorDto[]>("/api/platform/administrators", { suppressToast: true }),

  inviteAdministrator: (data: { fullName: string; email: string; platformRole?: string }) =>
    apiClient.post<PlatformAdministratorDto>("/api/platform/administrators", data),

  updateAdministratorStatus: (id: string, isActive: boolean) =>
    apiClient.put<{ success: boolean; isActive: boolean }>(`/api/platform/administrators/${id}/status`, { isActive }),

  revokeAdministratorSessions: (id: string) =>
    apiClient.post<{ success: boolean; message: string }>(`/api/platform/administrators/${id}/revoke-sessions`),

  getAnalytics: (range: "7d" | "30d" | "90d" | "all" = "30d") =>
    apiClient.get<PlatformAnalyticsOverviewDto>(`/api/platform/analytics?range=${range}`, { suppressToast: true }),

  getAnnouncements: () =>
    apiClient.get<PlatformAnnouncementDto[]>("/api/platform/announcements", { suppressToast: true }),

  createAnnouncement: (data: SavePlatformAnnouncementRequest) =>
    apiClient.post<PlatformAnnouncementDto>("/api/platform/announcements", data),

  updateAnnouncement: (id: string, data: SavePlatformAnnouncementRequest) =>
    apiClient.put<PlatformAnnouncementDto>(`/api/platform/announcements/${id}`, data),

  publishAnnouncement: (id: string) =>
    apiClient.post<PlatformAnnouncementDto>(`/api/platform/announcements/${id}/publish`),

  withdrawAnnouncement: (id: string) =>
    apiClient.post<PlatformAnnouncementDto>(`/api/platform/announcements/${id}/withdraw`),

  archiveAnnouncement: (id: string, reason?: string) =>
    apiClient.post<PlatformAnnouncementDto>(`/api/platform/announcements/${id}/archive`, { reason }),

  deleteAnnouncement: (id: string) =>
    apiClient.delete<void>(`/api/platform/announcements/${id}`),

  getTickets: () =>
    apiClient.get<SupportTicketDto[]>("/api/platform/tickets", { suppressToast: true }),

  createTicket: (data: {
    collegeId?: string;
    institutionName?: string;
    subject: string;
    description: string;
    category?: string;
    priority?: string;
  }) => apiClient.post<SupportTicketDto>("/api/platform/tickets", data),

  replyTicket: (id: string, message: string, isInternalNote: boolean) =>
    apiClient.post<SupportTicketDto>(`/api/platform/tickets/${id}/reply`, { message, isInternalNote }),

  updateTicketStatus: (id: string, status: string) =>
    apiClient.put<SupportTicketDto>(`/api/platform/tickets/${id}/status`, { status }),

  updateTicketPriority: (id: string, priority: string) =>
    apiClient.put<SupportTicketDto>(`/api/platform/tickets/${id}/priority`, { priority }),

  assignTicket: (id: string, assignedToName?: string, assignedToEmail?: string) =>
    apiClient.put<SupportTicketDto>(`/api/platform/tickets/${id}/assign`, { assignedToName, assignedToEmail }),

  resolveTicket: (id: string, resolutionNotes?: string) =>
    apiClient.post<SupportTicketDto>(`/api/platform/tickets/${id}/resolve`, { resolutionNotes }),

  closeTicket: (id: string) =>
    apiClient.post<SupportTicketDto>(`/api/platform/tickets/${id}/close`),
};
