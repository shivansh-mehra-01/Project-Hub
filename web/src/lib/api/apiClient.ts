import { showToast } from "@/lib/toast";
import { UserProfileDto } from "./types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const TOKEN_KEY = "projecthub_jwt_token";
const USER_KEY = "projecthub_user_profile";

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function getUserProfile(): UserProfileDto | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfileDto;
  } catch {
    return null;
  }
}

export function setAuthSession(token: string, user: UserProfileDto, persistLocal = false): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  if (persistLocal) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  try {
    // Notify all open tabs of logout via localStorage event
    localStorage.setItem("collabex_logout_event", Date.now().toString());
  } catch {
    // Quota or private browsing mode
  }
}

let isHandlingSessionExpiry = false;

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
  suppressToast?: boolean;
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  let url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const query = searchParams.toString();
    if (query) {
      url += (url.includes("?") ? "&" : "?") + query;
    }
  }

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  if (!options.skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (networkError: any) {
    const msg = `Unable to reach Collabex API at ${API_BASE_URL}. Ensure the backend service is running.`;
    if (!options.suppressToast) {
      showToast(msg, "warning");
    }
    throw new ApiError(msg, 0, networkError);
  }

  if (response.status === 401) {
    const isAuthAttempt =
      endpoint.includes("/auth/login") ||
      endpoint.includes("/auth/reset-password") ||
      endpoint.includes("/auth/request-password-otp");

    if (!isAuthAttempt) {
      clearAuthSession();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("collabex:session-expired"));
        if (!isHandlingSessionExpiry && window.location.pathname !== "/login") {
          isHandlingSessionExpiry = true;
          showToast("Your session has expired. Please sign in again.", "warning");
          // Use location.replace so expired session is removed from browser history
          window.location.replace("/login");
          setTimeout(() => {
            isHandlingSessionExpiry = false;
          }, 3000);
        }
      }
      throw new ApiError("Your session has expired. Please sign in again.", 401);
    }
  }

  let data: any = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    if (data && typeof data === "object") {
      errorMessage = data.message || data.title || data.error || errorMessage;
    } else if (typeof data === "string" && data.trim()) {
      if (
        data.includes("<html") ||
        data.includes("<!DOCTYPE") ||
        data.includes("System.") ||
        data.includes("Exception:") ||
        response.status >= 500
      ) {
        errorMessage =
          response.status >= 500
            ? "An unexpected server error occurred. Please try again."
            : "Invalid server response.";
      } else {
        errorMessage = data.trim();
      }
    }

    if (
      response.status >= 500 &&
      (!errorMessage || errorMessage.includes("System.") || errorMessage.includes("Exception:"))
    ) {
      errorMessage = "An unexpected server error occurred. Please try again.";
    }

    // Cap message length to prevent UI deformation
    if (errorMessage.length > 180) {
      errorMessage = errorMessage.substring(0, 177) + "...";
    }

    if ((response.status === 400 || response.status === 403) && !options.suppressToast) {
      showToast(errorMessage, "error");
    }

    throw new ApiError(errorMessage, response.status, data);
  }

  return data as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};
