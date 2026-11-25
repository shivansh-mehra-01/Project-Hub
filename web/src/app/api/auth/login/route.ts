import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl, setAuthCookies, validateCsrfOrigin } from "@/lib/bff/authCookies";

export async function POST(req: NextRequest) {
  if (!validateCsrfOrigin(req)) {
    return NextResponse.json({ message: "CSRF origin validation failed." }, { status: 403 });
  }

  const body = await req.json();
  const backendRes = await fetch(`${getBackendApiUrl()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  const data = await backendRes.json().catch(() => ({}));
  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status });
  }

  if (data.mfaRequired) {
    return NextResponse.json({
      mfaRequired: true,
      mfaChallengeToken: data.mfaChallengeToken,
      user: data.user,
    });
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
