import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  clearAuthCookies,
  getBackendApiUrl,
  validateCsrfOrigin,
} from "@/lib/bff/authCookies";

export async function POST(req: NextRequest) {
  if (!validateCsrfOrigin(req)) {
    return NextResponse.json({ message: "CSRF origin validation failed." }, { status: 403 });
  }

  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  if (accessToken) {
    await fetch(`${getBackendApiUrl()}/api/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }).catch(() => null);
  }

  const res = NextResponse.json({ success: true });
  clearAuthCookies(res);
  return res;
}
