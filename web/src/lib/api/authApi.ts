import { apiClient } from "./apiClient";
import {
  AuthResponse,
  LoginRequest,
  RequestPasswordOtpRequest,
  RequestPasswordOtpResponse,
  ResetPasswordRequest,
  ResolveTenantResponse,
} from "./types";

export const authApi = {
  resolveTenant: (email: string) =>
    apiClient.get<ResolveTenantResponse>("/api/auth/resolve-tenant", {
      params: { email },
      skipAuth: true,
      suppressToast: true,
    }),

  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>("/api/auth/login", data, {
      skipAuth: true,
    }),

  requestPasswordOtp: (data: RequestPasswordOtpRequest) =>
    apiClient.post<RequestPasswordOtpResponse>(
      "/api/auth/request-password-otp",
      data,
      {
        skipAuth: true,
      }
    ),

  resetPassword: (data: ResetPasswordRequest) =>
    apiClient.post<AuthResponse>("/api/auth/reset-password", data, {
      skipAuth: true,
    }),
};
