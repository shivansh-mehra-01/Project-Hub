import { NextRequest } from "next/server";

/**
 * Extracts the client IP from incoming x-forwarded-for (first entry) or x-real-ip,
 * falling back to request IP when available.
 */
export function getForwardedClientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const xRealIp = req.headers.get("x-real-ip")?.trim();
  if (xRealIp) return xRealIp;

  const reqIp = (req as NextRequest & { ip?: string }).ip?.trim();
  return reqIp || null;
}

/**
 * Builds forwarding headers for upstream backend API calls from BFF route handlers.
 */
export function getClientForwardingHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  const clientIp = getForwardedClientIp(req);
  if (clientIp) {
    headers["X-Forwarded-For"] = clientIp;
  }

  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(/:$/, "");
  if (proto) {
    headers["X-Forwarded-Proto"] = proto;
  }

  return headers;
}
