import { NextRequest, NextResponse } from "next/server";
import {
  clearAuthCookies,
  getBackendApiUrl,
  REFRESH_COOKIE,
  setAuthCookies,
  validateCsrfOrigin,
} from "@/lib/bff/authCookies";
import { getClientForwardingHeaders } from "@/lib/bff/forwardedHeaders";
import { executeSingleFlightRefresh } from "@/lib/bff/refreshSingleFlight";

export async function POST(req: NextRequest) {
  if (!validateCsrfOrigin(req)) {
    return NextResponse.json({ message: "CSRF origin validation failed." }, { status: 403 });
  }

  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: "No refresh session." }, { status: 401 });
  }

  const refreshResult = await executeSingleFlightRefresh(
    refreshToken,
    getBackendApiUrl(),
    getClientForwardingHeaders(req)
  );

  if (!refreshResult.ok || !refreshResult.data?.token || !refreshResult.data?.refreshToken) {
    const failRes = NextResponse.json(refreshResult.data ?? {}, { status: 401 });
    if (!refreshResult.isRace) {
      clearAuthCookies(failRes);
    }
    return failRes;
  }

  const res = NextResponse.json({
    user: refreshResult.data.user,
    expiresAtUtc: refreshResult.data.expiresAtUtc,
  });
  setAuthCookies(res, refreshResult.data.token, refreshResult.data.refreshToken);
  return res;
}
