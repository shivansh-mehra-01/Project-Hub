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
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // 1. Allow public routes without any check
    if (PUBLIC_ROUTES.includes(pathname)) {
      setIsRedirecting(false);
      return;
    }

    // 2. Validate authentication: if logged out or unauthenticated, redirect to /login
    if (!isAuthenticated || !currentPersona) {
      setIsRedirecting(true);
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
      setIsRedirecting(true);
      // Clean redirect to authorized home route
      const homeRoute = ROLE_HOME_ROUTES[currentPersona.role] || "/login";
      router.replace(homeRoute);
      return;
    }

    setIsRedirecting(false);
  }, [pathname, currentPersona, isAuthenticated, router]);

  // While redirecting an unauthorized user, show clean light porcelain screen
  if (isRedirecting && !PUBLIC_ROUTES.includes(pathname)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-slate-600 select-none">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-600 font-mono">
            Redirecting to authorized workspace...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
