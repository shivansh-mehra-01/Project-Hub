export const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined" && window.location.hostname && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    const protocol = window.location.protocol || "http:";
    return `${protocol}//${window.location.hostname}:5000`;
  }
  return "http://localhost:5000";
};

export const API_BASE_URL = getApiBaseUrl();

export interface SystemHealthResponse {
  status: string;
  environment: string;
  version: string;
  timestampUtc: string;
  database: {
    status: string;
    provider: string;
  };
  redis: {
    status: string;
    engine: string;
  };
  tenant: {
    resolved: boolean;
    collegeId: string | null;
    mode: string;
  };
}

export async function getSystemHealth(): Promise<SystemHealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Health check failed with HTTP ${response.status}`);
  }

  return response.json();
}

