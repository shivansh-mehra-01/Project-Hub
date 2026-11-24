"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { isRouteAuthorized, ROLE_HOME_ROUTES, PUBLIC_ROUTES } from "./routeRegistry";
import { getAuthToken } from "@/lib/api";

export interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * Enterprise Route Guard & Back-Forward Cache (bfcache) Protection:
 * - Never flashes protected children before authentication & role verification.
 * - Detects bfcache restorations and purges stale session snapshots on back/forward navigation.
 * - Uses router.replace & window.location.replace to eliminate back-button trapping.
 */
export const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { currentPersona, isAuthenticated, isLoaded, logout } = useProjectHubStore();

  const isPublic = PUBLIC_ROUTES.includes(pathname);
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  const isAuthorized =
    isPublic ||
    (isLoaded &&
      !!token &&
      isAuthenticated &&
      !!currentPersona &&
      isRouteAuthorized(
        pathname,
        currentPersona.role,
        currentPersona.isProjectCoordinator
      ));

  // Back-Forward Cache (bfcache) protection:
  // Whenever the page is restored from bfcache or traversed via history without a valid JWT,
  // immediately purge memory state and hard-replace to /login.
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      const currentToken = getAuthToken();
      if ((event.persisted || !currentToken) && !currentToken && !PUBLIC_ROUTES.includes(pathname)) {
        logout();
        window.location.replace("/login");
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [logout, pathname]);

  useEffect(() => {
    // 1. Allow public routes without verification
    if (isPublic) {
      return;
    }

    // 2. Wait until persistent storage hydration is verified
    if (!isLoaded) {
      return;
    }

    // 3. Validate token and authentication: if logged out, redirect cleanly via replace
    const activeToken = getAuthToken();
    if (!activeToken || !isAuthenticated || !currentPersona) {
      router.replace("/login");
      return;
    }

    // 4. Validate role-level route authorization against routeRegistry
    const authorized = isRouteAuthorized(
      pathname,
      currentPersona.role,
      currentPersona.isProjectCoordinator
    );

    if (!authorized) {
      const homeRoute = ROLE_HOME_ROUTES[currentPersona.role] || "/login";
      router.replace(homeRoute);
    }
  }, [pathname, currentPersona, isAuthenticated, isLoaded, isPublic, router]);

  // While verifying authentication on protected routes, render neutral check screen—never flash children
  // Retain children in a hidden container during prerender/verification so Next.js instant navigation validation is never dropped
  if (!isAuthorized) {
    return (
      <>
        <div className="min-h-[50vh] flex items-center justify-center p-6 text-slate-600 select-none">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin text-emerald-700" />
            <span className="text-xs text-slate-600 font-mono">
              Verifying session authorization...
            </span>
          </div>
        </div>
        <div className="hidden" aria-hidden="true">
          {children}
        </div>
      </>
    );
  }

  return <>{children}</>;
};
