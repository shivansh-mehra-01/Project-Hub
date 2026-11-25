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
};
