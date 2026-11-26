import { showToast } from "@/lib/toast";
import { UserProfileDto } from "./types";

export const getApiBaseUrl = (): string => {
  return "/api/proxy";
};

export const API_BASE_URL = "/api/proxy";

// In-memory profile cache only — JWT and refresh tokens are stored exclusively in HttpOnly cookies.
let inMemoryUserProfile: UserProfileDto | null = null;

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
  // Tokens are HttpOnly and never exposed to browser JavaScript.
  return null;
}

export function getUserProfile(): UserProfileDto | null {
  return inMemoryUserProfile;
}

export function setAuthSession(_token: string | null | undefined, user: UserProfileDto, _persistLocal = false): void {
  inMemoryUserProfile = user;
}

export function clearAuthSession(): void {
  inMemoryUserProfile = null;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("collabex_logout_event", Date.now().toString());
    } catch {
      // Ignore storage quota errors
    }
  }
}

let isHandlingSessionExpiry = false;

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
  suppressToast?: boolean;
  directBff?: boolean;
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  let url = options.directBff ? cleanEndpoint : `${API_BASE_URL}${cleanEndpoint}`;

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

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: "same-origin",
      headers,
    });
  } catch (networkError: any) {
    const msg = "Unable to reach Collabex API. Ensure the backend service is running.";
    if (!options.suppressToast) {
      showToast(msg, "warning");
    }
    throw new ApiError(msg, 0, networkError);
  }

  if (response.status === 401) {
    const isAuthAttempt =
      endpoint.includes("/auth/login") ||
      endpoint.includes("/auth/reset-password") ||
      endpoint.includes("/auth/request-password-otp") ||
      endpoint.includes("/auth/session") ||
      endpoint.includes("/auth/mfa/verify");

    if (!isAuthAttempt) {
      clearAuthSession();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("collabex:session-expired"));
        if (!isHandlingSessionExpiry && window.location.pathname !== "/login") {
          isHandlingSessionExpiry = true;
          showToast("Your session has expired. Please sign in again.", "warning");
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
  if (response.status !== 204 && response.status !== 205) {
    const contentType = response.headers.get("content-type");
    if (contentType && (contentType.includes("json") || contentType.includes("problem+json"))) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    if (data && typeof data === "object") {
      if (data.errors && typeof data.errors === "object") {
        const errorEntries = Object.values(data.errors).flat();
        if (errorEntries.length > 0 && typeof errorEntries[0] === "string") {
          errorMessage = errorEntries[0];
        } else {
          errorMessage = data.title || data.message || errorMessage;
        }
      } else {
        errorMessage = data.message || data.title || data.error || errorMessage;
      }
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

  postFormData: <T>(endpoint: string, formData: FormData, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: formData,
    }),

  getBlob: async (endpoint: string, options?: RequestOptions): Promise<Blob> => {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    let url = `${API_BASE_URL}${cleanEndpoint}`;
    if (options?.params) {
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
    const headers = new Headers(options?.headers || {});
    const response = await fetch(url, {
      ...options,
      credentials: "same-origin",
      headers,
      method: "GET",
    });
    if (!response.ok) {
      throw new ApiError(`Download failed with status ${response.status}`, response.status);
    }
    return await response.blob();
  },
};
