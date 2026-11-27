import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/bff/authCookies";
import { getClientForwardingHeaders } from "@/lib/bff/forwardedHeaders";

export async function GET(req: NextRequest) {
  const backendRes = await fetch(`${getBackendApiUrl()}/api/auth/colleges`, {
    method: "GET",
    headers: { Accept: "application/json", ...getClientForwardingHeaders(req) },
    cache: "no-store",
  });

  const data = await backendRes.json().catch(() => []);
  return NextResponse.json(data, { status: backendRes.status });
}
