import React from "react";
import {
  ROUTE_REGISTRY,
  findRouteByPath,
  getRouteIcon,
  IconName,
} from "./routeRegistry";
import { RoleType } from "@/mocks/store-types";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconName: IconName;
  count?: number;
  section?: "MENU" | "COORDINATOR";
}

export interface BreadcrumbInfo {
  pageTitle: string;
  breadcrumb: string;
  group: string;
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
      count = liveBadgeCounts[route.badgeKey];
    }

    return {
      label: route.label,
      href: route.path,
      icon: getRouteIcon(route.iconName),
      iconName: route.iconName,
      count,
      section: route.coordinatorOnly ? "COORDINATOR" : "MENU",
    };
  });
};

/**
 * Pure selector returning exact parent/child breadcrumb labels for the top header
 */
export const getBreadcrumbs = (pathname: string, _role?: RoleType): BreadcrumbInfo => {
  const route = findRouteByPath(pathname);
  if (!route) {
    return {
      pageTitle: "Project Hub",
      breadcrumb: "Institutional Governance",
      group: "Project Hub",
    };
  }

  return {
    pageTitle: route.breadcrumbGroup || route.label,
    breadcrumb: route.breadcrumbTitle || route.description,
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
    tenants?: Array<{ id: string; name: string; domain: string; plan: string }>;
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
  if (role === "Student" || role === "TeamLead") {
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
      },
      {
        id: "act-course-exit-survey",
        title: "Complete 60s Course Exit Survey",
        subtitle: "Rate PO attainments and unlock tamper-proof credential export",
        category: "Actions",
        iconName: "GraduationCap",
        path: "/student/portfolio",
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
    if (isProjectCoordinator) {
      items.push(
        {
          id: "act-coord-matcher",
          title: "Heuristic Guide-Student Auto-Matcher",
          subtitle: "Balance faculty mentorship quotas and match research domains",
          category: "Actions",
          iconName: "Briefcase",
          path: "/coordinator?tab=allocator",
        },
        {
          id: "act-coord-override",
          title: "Request Mid-Term Administrative Override",
          subtitle: "Submit guide reassignment or re-viva unlock for HOD endorsement",
          category: "Actions",
          iconName: "Sliders",
          path: "/coordinator?tab=allocator",
        }
      );
    }
  } else if (role === "HOD") {
    items.push(
      {
        id: "act-hod-bulk-signoff",
        title: "Bulk Sign-off Guide Allotments",
        subtitle: "Endorse coordinator master allotment roster in one click",
        category: "Actions",
        iconName: "FileCheck2",
        path: "/hod/approvals?subtab=allotments",
      },
      {
        id: "act-hod-overrides",
        title: "Review Exception Overrides Queue",
        subtitle: "Endorse or reject coordinator administrative exception requests",
        category: "Actions",
        iconName: "Sliders",
        path: "/hod/approvals?subtab=overrides",
      },
      {
        id: "act-hod-nba-export",
        title: "Export 9-Sample NBA Portfolio ZIP",
        subtitle: "Package 3 Best, 3 Average, and 3 Weak capstone dossiers for SAR audit",
        category: "Actions",
        iconName: "Layers",
        path: "/hod/nba",
      }
    );
  } else if (role === "CollegeAdmin") {
    items.push(
      {
        id: "act-college-sar",
        title: "Attest Institutional NBA SAR Criterion 2 & 3",
        subtitle: "Synthesize all department sign-offs for university audit submission",
        category: "Actions",
        iconName: "ShieldAlert",
        path: "/college/compliance",
      },
      {
        id: "act-college-seal",
        title: "Update Principal Digital Cryptographic Seal",
        subtitle: "Verify institutional credential signing keys and SVG emblem",
        category: "Actions",
        iconName: "Sliders",
        path: "/college/settings",
      }
    );
  } else if (role === "SuperAdmin") {
    items.push(
      {
        id: "act-admin-provision",
        title: "Onboard New College Tenant",
        subtitle: "Provision isolated Postgres schema partition and S3 storage bucket",
        category: "Actions",
        iconName: "Building2",
        path: "/admin",
      },
      {
        id: "act-admin-audit-export",
        title: "Export Platform Governance Audit Trail",
        subtitle: "Download immutable security audit logs in CSV format",
        category: "Actions",
        iconName: "ShieldAlert",
        path: "/admin/audit",
      }
    );
  }

  // 3. Searchable Entities (Filtered strictly by permission scope)
  if (role === "Student" || role === "TeamLead") {
    // Teammates and exploration items
    const myTeam = storeData.teams?.[0];
    if (myTeam) {
      items.push({
        id: `entity-team-${myTeam.teamCode}`,
        title: `${myTeam.teamCode}: ${myTeam.title}`,
        subtitle: `Assigned Guide: ${myTeam.guideName || "Prof. S. K. Verma"} • Active Team`,
        category: "Entities",
        iconName: "FolderGit2",
        path: "/student",
      });
    }
  } else if (role === "Faculty") {
    // Mentored teams
    if (storeData.teams) {
      for (const t of storeData.teams) {
        items.push({
          id: `entity-team-${t.id}`,
          title: `${t.teamCode}: ${t.title}`,
          subtitle: `Guided by ${t.guideName || "Faculty"} • Project Workspace`,
          category: "Entities",
          iconName: "Users2",
          path: "/faculty/teams",
        });
      }
    }
  } else if (role === "HOD") {
    // Department teams and faculty roster
    if (storeData.teams) {
      for (const t of storeData.teams) {
        items.push({
          id: `entity-hod-team-${t.id}`,
          title: `${t.teamCode}: ${t.title}`,
          subtitle: `Guide: ${t.guideName || "Pending"} • Department Allotment`,
          category: "Entities",
          iconName: "FolderGit2",
          path: "/hod/approvals",
        });
      }
    }
    if (storeData.facultyRoster) {
      for (const f of storeData.facultyRoster) {
        items.push({
          id: `entity-fac-${f.id}`,
          title: f.name,
          subtitle: `${f.designation} • Department Faculty Roster`,
          category: "Entities",
          iconName: "Users2",
          path: "/hod/faculty",
        });
      }
    }
  } else if (role === "CollegeAdmin") {
    // Departments
    if (storeData.departments) {
      for (const d of storeData.departments) {
        items.push({
          id: `entity-dept-${d.id}`,
          title: `Dept. of ${d.name} (${d.code})`,
          subtitle: d.hodName
            ? `Appointed HOD: ${d.hodName} • Academic Department`
            : `Academic Department • ${d.code}`,
          category: "Entities",
          iconName: "Building2",
          path: "/college/departments",
        });
      }
    }
  } else if (role === "SuperAdmin") {
    // College Tenants
    if (storeData.tenants) {
      for (const tn of storeData.tenants) {
        items.push({
          id: `entity-tenant-${tn.id}`,
          title: tn.name,
          subtitle: `${tn.domain} • ${tn.plan} License Plan`,
          category: "Entities",
          iconName: "Building2",
          path: "/admin",
        });
      }
    }
  }

  return items;
};
