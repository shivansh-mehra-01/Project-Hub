import { apiClient } from "./apiClient";
import {
  AdminProfileDto,
  UpdateAdminProfileRequest,
  RequestEmailChangeRequest,
  VerifyEmailChangeRequest,
  ChangePasswordRequest,
  ReauthenticateRequest,
  MfaStatusDto,
  AccountSessionDto,
  NotificationPreferencesDto,
  ConsolePreferencesDto,
} from "./types";

export const accountApi = {
  getProfile: () => apiClient.get<AdminProfileDto>("/api/account/profile"),

  updateProfile: (data: UpdateAdminProfileRequest) =>
    apiClient.put<AdminProfileDto>("/api/account/profile", data),

  requestEmailChange: (data: RequestEmailChangeRequest) =>
    apiClient.post<{ success: boolean; message: string; devOtp?: string }>(
      "/api/account/request-email-change",
      data
    ),

  verifyEmailChange: (data: VerifyEmailChangeRequest) =>
    apiClient.post<{ success: boolean; email: string; message: string }>(
      "/api/account/verify-email-change",
      data
    ),

  requestPhoneVerification: () =>
    apiClient.post<{ success: boolean; message: string; devOtp?: string }>(
      "/api/account/request-phone-verification"
    ),

  verifyPhone: (data: { otp: string }) =>
    apiClient.post<{ success: boolean; phoneNumber: string; isPhoneVerified: boolean; message: string }>(
      "/api/account/verify-phone",
      data
    ),

  changePassword: (data: ChangePasswordRequest) =>
    apiClient.post<{ success: boolean; passwordChangedAtUtc: string; revokedOtherSessions: boolean; message: string }>(
      "/api/account/change-password",
      data
    ),

  getMfaStatus: () => apiClient.get<MfaStatusDto>("/api/account/mfa/status"),

  regenerateRecoveryCodes: (data: ReauthenticateRequest) =>
    apiClient.post<{ success: boolean; codes: string[]; generatedAtUtc: string; message: string }>(
      "/api/account/mfa/regenerate-recovery-codes",
      data
    ),

  getSessions: () => apiClient.get<AccountSessionDto[]>("/api/account/sessions"),

  revokeSession: (id: string) =>
    apiClient.post<{ success: boolean; revokedSessionId: string; message: string }>(
      `/api/account/sessions/${id}/revoke`
    ),

  revokeOtherSessions: () =>
    apiClient.post<{ success: boolean; revokedCount: number; message: string }>(
      "/api/account/sessions/revoke-others"
    ),

  updateNotificationPreferences: (data: NotificationPreferencesDto) =>
    apiClient.put<NotificationPreferencesDto>("/api/account/notification-preferences", data),

  updateConsolePreferences: (data: ConsolePreferencesDto) =>
    apiClient.put<ConsolePreferencesDto>("/api/account/console-preferences", data),

  logout: () => apiClient.post<{ success: boolean; message: string }>("/api/account/logout"),
};
