import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  clearAuthCookies,
  getBackendApiUrl,
  REFRESH_COOKIE,
  setAuthCookies,
  validateCsrfOrigin,
} from "@/lib/bff/authCookies";
import { getClientForwardingHeaders } from "@/lib/bff/forwardedHeaders";

async function handleProxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  if (!validateCsrfOrigin(req)) {
    return NextResponse.json({ message: "CSRF origin validation failed." }, { status: 403 });
  }

  const { path } = await context.params;
  const targetPath = path.join("/");
  const search = req.nextUrl.search || "";
  const targetUrl = `${getBackendApiUrl()}/${targetPath}${search}`;

  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  const forwardHeaders = new Headers(getClientForwardingHeaders(req));
  const contentType = req.headers.get("content-type");
  if (contentType) forwardHeaders.set("Content-Type", contentType);
  const accept = req.headers.get("accept");
  if (accept) forwardHeaders.set("Accept", accept);
  if (accessToken) forwardHeaders.set("Authorization", `Bearer ${accessToken}`);

  const method = req.method.toUpperCase();
  const bodyBuffer =
    method !== "GET" && method !== "HEAD" ? await req.arrayBuffer() : undefined;

  let backendRes = await fetch(targetUrl, {
    method,
    headers: forwardHeaders,
    body: bodyBuffer,
  });

  let updatedTokens: { token: string; refreshToken: string } | null = null;

  if (backendRes.status === 401 && refreshToken) {
    const refreshRes = await fetch(`${getBackendApiUrl()}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...getClientForwardingHeaders(req),
      },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => null);

    if (refreshRes?.ok) {
      const refreshData = await refreshRes.json();
      if (refreshData.token && refreshData.refreshToken) {
        updatedTokens = {
          token: refreshData.token,
          refreshToken: refreshData.refreshToken,
        };
        forwardHeaders.set("Authorization", `Bearer ${refreshData.token}`);
        backendRes = await fetch(targetUrl, {
          method,
          headers: forwardHeaders,
          body: bodyBuffer,
        });
      }
    }
  }

  const resHeaders = new Headers();
  const resContentType = backendRes.headers.get("content-type");
  if (resContentType) resHeaders.set("Content-Type", resContentType);
  const contentDisposition = backendRes.headers.get("content-disposition");
  if (contentDisposition) resHeaders.set("Content-Disposition", contentDisposition);

  const isNullBodyStatus =
    backendRes.status === 204 ||
    backendRes.status === 205 ||
    backendRes.status === 304;
  const resBody = isNullBodyStatus ? null : await backendRes.arrayBuffer();
  const res = new NextResponse(resBody, {
    status: backendRes.status,
    headers: resHeaders,
  });

  if (updatedTokens) {
    setAuthCookies(res, updatedTokens.token, updatedTokens.refreshToken);
  } else if (backendRes.status === 401) {
    clearAuthCookies(res);
  }

  return res;
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
