import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl, setAuthCookies, validateCsrfOrigin } from "@/lib/bff/authCookies";
import { getClientForwardingHeaders } from "@/lib/bff/forwardedHeaders";

export async function POST(req: NextRequest) {
  if (!validateCsrfOrigin(req)) {
    return NextResponse.json({ message: "CSRF origin validation failed." }, { status: 403 });
  }

  const body = await req.json();
  const backendRes = await fetch(`${getBackendApiUrl()}/api/auth/mfa/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...getClientForwardingHeaders(req),
    },
    body: JSON.stringify(body),
  });

  const data = await backendRes.json().catch(() => ({}));
  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status });
  }

  const res = NextResponse.json({
    user: data.user,
    expiresAtUtc: data.expiresAtUtc,
    mfaRequired: false,
  });

  if (data.token && data.refreshToken) {
    setAuthCookies(res, data.token, data.refreshToken);
  }
  return res;
}
