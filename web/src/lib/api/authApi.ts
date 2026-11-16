import { apiClient } from "./apiClient";
import {
  ActivateRequest,
  AuthResponse,
  DemoLoginRequest,
  LoginRequest,
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

  demoLogin: (data: DemoLoginRequest) =>
    apiClient.post<AuthResponse>("/api/auth/demo-login", data, {
      skipAuth: true,
    }),

  activate: (data: ActivateRequest) =>
    apiClient.post<AuthResponse>("/api/auth/activate", data, {
      skipAuth: true,
    }),
};
