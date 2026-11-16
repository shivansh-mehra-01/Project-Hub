"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { isRouteAuthorized, ROLE_HOME_ROUTES, PUBLIC_ROUTES } from "./routeRegistry";

export interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * Validates currentUser.role against routeRegistry.ts on every route change.
 * - Redirects unauthorized access cleanly to the role's home route.
 * - Redirects logged-out users cleanly to /login.
 */
export const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { currentPersona, isAuthenticated } = useProjectHubStore();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. Allow public routes without any check
    if (PUBLIC_ROUTES.includes(pathname)) {
      setIsAuthorized(true);
      return;
    }

    // 2. Validate authentication: if logged out or unauthenticated, redirect to /login
    if (!isAuthenticated || !currentPersona) {
      setIsAuthorized(false);
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
      setIsAuthorized(false);
      // Clean redirect to authorized home route
      const homeRoute = ROLE_HOME_ROUTES[currentPersona.role] || "/login";
      router.replace(homeRoute);
      return;
    }

    setIsAuthorized(true);
  }, [pathname, currentPersona, isAuthenticated, router]);

  // While checking on client or when unauthorized, render fallback or null
  if (isAuthorized === false && !PUBLIC_ROUTES.includes(pathname)) {
    return (
      <div className="min-h-screen bg-[#111827] flex items-center justify-center p-6 text-white select-none">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-300 font-mono">
            Redirecting to authorized workspace...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
