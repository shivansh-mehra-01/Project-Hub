import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  clearAuthCookies,
  getBackendApiUrl,
  REFRESH_COOKIE,
  setAuthCookies,
} from "@/lib/bff/authCookies";
import { getClientForwardingHeaders } from "@/lib/bff/forwardedHeaders";
import { executeSingleFlightRefresh } from "@/lib/bff/refreshSingleFlight";

export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  const forwardingHeaders = getClientForwardingHeaders(req);

  if (accessToken) {
    const meRes = await fetch(`${getBackendApiUrl()}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...forwardingHeaders,
      },
    }).catch(() => null);

    if (meRes?.ok) {
      const user = await meRes.json();
      return NextResponse.json({ authenticated: true, user });
    }
  }

  let refreshWasRace = false;
  if (refreshToken) {
    const refreshResult = await executeSingleFlightRefresh(
      refreshToken,
      getBackendApiUrl(),
      forwardingHeaders
    );

    if (refreshResult.ok && refreshResult.data?.token && refreshResult.data?.refreshToken) {
      const res = NextResponse.json({ authenticated: true, user: refreshResult.data.user });
      setAuthCookies(res, refreshResult.data.token, refreshResult.data.refreshToken);
      return res;
    }

    if (refreshResult.isRace) {
      refreshWasRace = true;
    }
  }

  const res = NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  if (!refreshWasRace) {
    clearAuthCookies(res);
  }
  return res;
}
