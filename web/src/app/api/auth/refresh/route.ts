import { NextRequest, NextResponse } from "next/server";
import {
  clearAuthCookies,
  getBackendApiUrl,
  REFRESH_COOKIE,
  setAuthCookies,
  validateCsrfOrigin,
} from "@/lib/bff/authCookies";

export async function POST(req: NextRequest) {
  if (!validateCsrfOrigin(req)) {
    return NextResponse.json({ message: "CSRF origin validation failed." }, { status: 403 });
  }

  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: "No refresh session." }, { status: 401 });
  }

  const backendRes = await fetch(`${getBackendApiUrl()}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await backendRes.json().catch(() => ({}));
  if (!backendRes.ok || !data.token || !data.refreshToken) {
    const failRes = NextResponse.json(data, { status: 401 });
    clearAuthCookies(failRes);
    return failRes;
  }

  const res = NextResponse.json({
    user: data.user,
    expiresAtUtc: data.expiresAtUtc,
  });
  setAuthCookies(res, data.token, data.refreshToken);
  return res;
}
