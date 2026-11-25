import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl, setAuthCookies, validateCsrfOrigin } from "@/lib/bff/authCookies";

export async function POST(req: NextRequest) {
  if (!validateCsrfOrigin(req)) {
    return NextResponse.json({ message: "CSRF origin validation failed." }, { status: 403 });
  }

  const body = await req.json();
  const backendRes = await fetch(`${getBackendApiUrl()}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  const data = await backendRes.json().catch(() => ({}));
  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status });
  }

  const res = NextResponse.json({
    user: data.user,
    expiresAtUtc: data.expiresAtUtc,
  });

  if (data.token && data.refreshToken) {
    setAuthCookies(res, data.token, data.refreshToken);
  }
  return res;
}
