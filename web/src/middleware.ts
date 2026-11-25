import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/platform",
  "/admin",
  "/college",
  "/hod",
  "/coordinator",
  "/faculty",
  "/student",
  "/account",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const hasAccessCookie = req.cookies.has("colabex_access_token");
  const hasRefreshCookie = req.cookies.has("colabex_refresh_token");

  if (!hasAccessCookie && !hasRefreshCookie) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/platform/:path*",
    "/admin/:path*",
    "/college/:path*",
    "/hod/:path*",
    "/coordinator/:path*",
    "/faculty/:path*",
    "/student/:path*",
    "/account/:path*",
  ],
};
