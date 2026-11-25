"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { isRouteAuthorized, ROLE_HOME_ROUTES, PUBLIC_ROUTES } from "./routeRegistry";

export interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * Client-side Route Guard paired with Next.js Edge Middleware and HttpOnly BFF sessions.
 */
export const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { currentPersona, isAuthenticated, isLoaded, logout } = useProjectHubStore();

  const isPublic = PUBLIC_ROUTES.includes(pathname);
  const isAuthorized =
    isPublic ||
    (isLoaded &&
      isAuthenticated &&
      !!currentPersona &&
      isRouteAuthorized(
        pathname,
        currentPersona.role,
        currentPersona.isProjectCoordinator
      ));

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && !isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
        logout();
        window.location.replace("/login");
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [isAuthenticated, logout, pathname]);

  useEffect(() => {
    if (isPublic || !isLoaded) {
      return;
    }

    if (!isAuthenticated || !currentPersona) {
      router.replace("/login");
      return;
    }

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
