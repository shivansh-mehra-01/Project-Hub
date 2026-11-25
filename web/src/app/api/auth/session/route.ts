import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  clearAuthCookies,
  getBackendApiUrl,
  REFRESH_COOKIE,
  setAuthCookies,
} from "@/lib/bff/authCookies";

export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  if (accessToken) {
    const meRes = await fetch(`${getBackendApiUrl()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    }).catch(() => null);

    if (meRes?.ok) {
      const user = await meRes.json();
      return NextResponse.json({ authenticated: true, user });
    }
  }

  if (refreshToken) {
    const refreshRes = await fetch(`${getBackendApiUrl()}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => null);

    if (refreshRes?.ok) {
      const data = await refreshRes.json();
      if (data.token && data.refreshToken) {
        const res = NextResponse.json({ authenticated: true, user: data.user });
        setAuthCookies(res, data.token, data.refreshToken);
        return res;
      }
    }
  }

  const res = NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  clearAuthCookies(res);
  return res;
}
