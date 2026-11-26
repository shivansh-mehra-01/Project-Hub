import React from "react";
import {
  ROUTE_REGISTRY,
  findRouteByPath,
  getRouteIcon,
  IconName,
  PlatformNavSection,
} from "./routeRegistry";
import { RoleType } from "@/mocks/store-types";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconName: IconName;
  count?: number;
  section?: PlatformNavSection | string;
}

export interface BreadcrumbInfo {
  pageTitle: string;
  breadcrumb?: string;
  group?: string;
}

export interface CommandPaletteEntity {
  id: string;
  title: string;
  subtitle: string;
  category: "Navigation" | "Actions" | "Entities" | "Role Switch";
  iconName: IconName;
  path?: string;
  actionId?: string;
}

/**
 * Pure selector returning strictly authorized sidebar items with live badge counts
 */
export const getSidebarNav = (
  role: RoleType,
  liveBadgeCounts: Record<string, number> = {},
  isProjectCoordinator = false
): SidebarNavItem[] => {
  const eligibleRoutes = ROUTE_REGISTRY.filter((route) => {
    if (!route.isSidebarItem) return false;
    if (route.coordinatorOnly) {
      return role === "Faculty" && isProjectCoordinator;
    }
    return route.allowedRoles.includes(role);
  });

  // Sort by defined sidebarOrder
  const sorted = [...eligibleRoutes].sort(
    (a, b) => (a.sidebarOrder || 99) - (b.sidebarOrder || 99)
  );

  return sorted.map((route) => {
    let count: number | undefined;
    if (route.badgeKey && liveBadgeCounts[route.badgeKey] !== undefined) {
      const rawCount = liveBadgeCounts[route.badgeKey];
      count = rawCount > 0 ? rawCount : undefined;
    }

    let itemSection: string = "MENU";
    if (role === "SuperAdmin") {
      itemSection = route.section || "MENU";
    } else {
      itemSection = route.coordinatorOnly ? "COORDINATOR" : "MENU";
    }

    return {
      label: route.label,
      href: route.path,
      icon: getRouteIcon(route.iconName),
      iconName: route.iconName,
      count,
      section: itemSection,
    };
  });
};

/**
 * Pure selector returning exact parent/child breadcrumb labels for the top header
 */
export const getBreadcrumbs = (pathname: string, role?: RoleType): BreadcrumbInfo => {
  if (role === "SuperAdmin" && pathname.startsWith("/platform")) {
    const route = findRouteByPath(pathname);
    if (route) {
      return {
        pageTitle: route.breadcrumbGroup || "Platform Console",
        breadcrumb: route.breadcrumbTitle,
        group: route.breadcrumbGroup || "Platform Console",
      };
    }
  }

  const route = findRouteByPath(pathname);
  if (!route) {
    return {
      pageTitle: "Project Hub",
      breadcrumb: undefined,
      group: "Project Hub",
    };
  }

  return {
    pageTitle: route.breadcrumbGroup || route.label,
    breadcrumb: route.breadcrumbTitle,
    group: route.breadcrumbGroup,
  };
};

/**
 * Pure selector returning strictly role-scoped navigation routes and searchable entities
 */
export const getCommandPaletteItems = (
  role: RoleType,
  storeData: {
    teams?: Array<{ id: string; teamCode: string; title: string; guideName?: string }>;
    facultyRoster?: Array<{ id: string; name: string; designation: string }>;
    departments?: Array<{ id: string; name: string; code: string; hodName?: string }>;
    tenants?: Array<{ id: string; name: string; domain: string; plan: string; code?: string }>;
  } = {},
  isProjectCoordinator = false
): CommandPaletteEntity[] => {
  const items: CommandPaletteEntity[] = [];

  // 1. Strictly Authorized Navigation Routes
  const authorizedRoutes = ROUTE_REGISTRY.filter((route) => {
    if (route.coordinatorOnly) {
      return role === "Faculty" && isProjectCoordinator;
    }
    return route.allowedRoles.includes(role);
  });

  for (const r of authorizedRoutes) {
    items.push({
      id: `nav-${r.path}`,
      title: r.label === "Profile" ? `${role} Profile & Settings` : r.label,
      subtitle: r.description,
      category: "Navigation",
      iconName: r.iconName,
      path: r.path,
    });
  }

  // 2. Role-Scoped Quick Actions
  if (role === "SuperAdmin") {
    items.push(
      {
        id: "act-admin-onboard",
        title: "Add New Engineering College",
        subtitle: "Register institution and provision dedicated multi-tenant partition",
        category: "Actions",
        iconName: "Building2",
        path: "/platform/colleges/new",
      },
      {
        id: "act-admin-announcement",
        title: "Broadcast Platform Announcement",
        subtitle: "Notify colleges of scheduled maintenance or platform updates",
        category: "Actions",
        iconName: "Megaphone",
        path: "/platform/announcements",
      },
      {
        id: "act-admin-support",
        title: "Support Desk & Core Service Health",
        subtitle: "Review unresolved college tickets and monitor service availability",
        category: "Actions",
        iconName: "LifeBuoy",
        path: "/platform/support-health",
      },
      {
        id: "act-admin-audit-export",
        title: "Security Surveillance & Audit Trail",
        subtitle: "Review active administrator sessions and privileged audit records",
        category: "Actions",
        iconName: "ShieldCheck",
        path: "/platform/security-audit",
      }
    );
  } else if (role === "Student" || role === "TeamLead") {
    items.push(
      {
        id: "act-submit-log",
        title: "Submit Friday Check-In",
        subtitle: "Log weekly accomplishments, blockers, and engineering hours",
        category: "Actions",
        iconName: "FileCheck2",
        path: "/student?subtab=logs",
      },
      {
        id: "act-upload-vault",
        title: "Upload Capstone Artifact",
        subtitle: "Submit synopsis, review deck, or final dissertation PDF",
        category: "Actions",
        iconName: "FolderGit2",
        path: "/student?subtab=logs",
      }
    );
  } else if (role === "Faculty") {
    items.push(
      {
        id: "act-eval-rubric",
        title: "Grade Defense Viva Rubric",
        subtitle: "Open 60/40 blended scoring matrix for assigned defense team",
        category: "Actions",
        iconName: "GraduationCap",
        path: "/faculty/evaluations",
      },
      {
        id: "act-review-logs",
        title: "Sign-off Student Weekly Logs",
        subtitle: "Approve pending engineering diaries in mentorship queue",
        category: "Actions",
        iconName: "FileCheck2",
        path: "/faculty",
      }
    );
  }

  // 3. Searchable Entities
  if (role === "SuperAdmin" && storeData.tenants) {
    for (const tn of storeData.tenants) {
      items.push({
        id: `entity-tenant-${tn.id}`,
        title: tn.name,
        subtitle: `${tn.domain} • ${tn.plan} License Plan`,
        category: "Entities",
        iconName: "Building2",
        path: `/platform/institutions?search=${encodeURIComponent(tn.code || tn.name)}`,
      });
    }
  }

  return items;
};
