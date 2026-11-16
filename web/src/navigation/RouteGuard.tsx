"use client";

import React, { useEffect, useState } from "react";
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
  const { currentPersona, isAuthenticated, logout } = useProjectHubStore();
  const [isAuthVerified, setIsAuthVerified] = useState(false);

  const isPublic = PUBLIC_ROUTES.includes(pathname);

  // Back-Forward Cache (bfcache) protection:
  // Whenever the page is restored from bfcache or traversed via history without a valid JWT,
  // immediately purge memory state and hard-replace to /login.
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      const token = getAuthToken();
      if ((event.persisted || !token) && !token && !PUBLIC_ROUTES.includes(pathname)) {
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
      setIsAuthVerified(true);
      return;
    }

    // 2. Validate token and authentication: if logged out, redirect cleanly via replace
    const token = getAuthToken();
    if (!token || !isAuthenticated || !currentPersona) {
      setIsAuthVerified(false);
      router.replace("/login");
      return;
    }

    // 3. Validate role-level route authorization against routeRegistry
    const authorized = isRouteAuthorized(
      pathname,
      currentPersona.role,
      currentPersona.isProjectCoordinator
    );

    if (!authorized) {
      setIsAuthVerified(false);
      const homeRoute = ROLE_HOME_ROUTES[currentPersona.role] || "/login";
      router.replace(homeRoute);
      return;
    }

    setIsAuthVerified(true);
  }, [pathname, currentPersona, isAuthenticated, isPublic, router]);

  // While verifying authentication on protected routes, render neutral check screen—never flash children
  if (!isPublic && !isAuthVerified) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-slate-600 select-none">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin text-emerald-700" />
          <span className="text-xs text-slate-600 font-mono">
            Verifying session authorization...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
