import { apiClient } from "./apiClient";
import {
  AuthResponse,
  LoginRequest,
  RequestPasswordOtpRequest,
  RequestPasswordOtpResponse,
  ResetPasswordRequest,
  UserProfileDto,
} from "./types";

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>("/api/auth/login", data, {
      skipAuth: true,
      directBff: true,
    }),

  logout: () =>
    apiClient.post<{ success: boolean }>("/api/auth/logout", undefined, {
      directBff: true,
      suppressToast: true,
    }),

  session: () =>
    apiClient.get<{ authenticated: boolean; user: UserProfileDto | null }>("/api/auth/session", {
      directBff: true,
      suppressToast: true,
    }),

  refresh: () =>
    apiClient.post<{ user: UserProfileDto; expiresAtUtc: string }>("/api/auth/refresh", undefined, {
      directBff: true,
      suppressToast: true,
    }),

  requestPasswordOtp: (data: RequestPasswordOtpRequest) =>
    apiClient.post<RequestPasswordOtpResponse>(
      "/api/auth/request-password-otp",
      data,
      {
        skipAuth: true,
        directBff: true,
      }
    ),

  resetPassword: (data: ResetPasswordRequest) =>
    apiClient.post<AuthResponse>("/api/auth/reset-password", data, {
      skipAuth: true,
      directBff: true,
    }),

  activate: (data: { email: string; token: string; newPassword: string }) =>
    apiClient.post<AuthResponse>("/api/auth/activate", data, {
      skipAuth: true,
      directBff: true,
    }),

  getPublicColleges: () =>
    apiClient.get<Array<{ id: string; name: string; tenantCode: string }>>("/api/auth/colleges", {
      skipAuth: true,
      directBff: true,
      suppressToast: true,
    }),

  rosterSignup: (data: { collegeId: string; collegeUserId: string; email: string }) =>
    apiClient.post<{ message: string; status: string }>("/api/auth/roster-signup", data, {
      skipAuth: true,
      directBff: true,
      suppressToast: true,
    }),

  getProfile: () => apiClient.get<UserProfileDto>("/api/auth/me"),

  updateProfile: (data: { fullName: string; phoneNumber?: string }) =>
    apiClient.put<UserProfileDto>("/api/auth/me", data),

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => apiClient.post<{ message: string }>("/api/auth/change-password", data),

  enrollMfa: () =>
    apiClient.post<{ secret: string; otpauthUri: string }>("/api/auth/mfa/enroll"),

  confirmMfa: (data: { code: string }) =>
    apiClient.post<{ success: boolean; mfaEnabled: boolean; recoveryCodes: string[] }>(
      "/api/auth/mfa/confirm",
      data
    ),
};
