import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl, validateCsrfOrigin } from "@/lib/bff/authCookies";

export async function POST(req: NextRequest) {
  if (!validateCsrfOrigin(req)) {
    return NextResponse.json({ message: "CSRF origin validation failed." }, { status: 403 });
  }

  const body = await req.json();
  const backendRes = await fetch(`${getBackendApiUrl()}/api/auth/roster-signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  const data = await backendRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: backendRes.status });
}
