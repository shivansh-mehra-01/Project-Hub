import { NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/bff/authCookies";

export async function GET() {
  const backendRes = await fetch(`${getBackendApiUrl()}/api/auth/colleges`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const data = await backendRes.json().catch(() => []);
  return NextResponse.json(data, { status: backendRes.status });
}
