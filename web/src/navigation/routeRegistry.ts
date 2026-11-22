import React from "react";
import {
  LayoutDashboard,
  FolderGit2,
  Compass,
  GraduationCap,
  User,
  Users,
  Users2,
  FileCheck2,
  Sliders,
  Building2,
  Layers,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Briefcase,
  FolderTree,
  Award,
  GitFork,
  UserCheck,
  CircleUser,
} from "lucide-react";
import { RoleType } from "@/mocks/store-types";

export type IconName =
  | "LayoutDashboard"
  | "FolderGit2"
  | "Compass"
  | "GraduationCap"
  | "User"
  | "Users"
  | "Users2"
  | "FileCheck2"
  | "Sliders"
  | "Building2"
  | "Layers"
  | "Shield"
  | "ShieldAlert"
  | "ShieldCheck"
  | "Briefcase"
  | "FolderTree"
  | "Award"
  | "GitFork"
  | "UserCheck"
  | "CircleUser";

export interface RouteDefinition {
  path: string;
  label: string;
  breadcrumbGroup: string;
  breadcrumbTitle?: string;
  iconName: IconName;
  allowedRoles: RoleType[];
  badgeKey?: "tenants" | "pilotRequests" | "pendingHODCount" | "pendingFacultyCount";
  description: string;
  coordinatorOnly?: boolean;
  isSidebarItem?: boolean;
  sidebarOrder?: number;
}

export const ROUTE_REGISTRY: RouteDefinition[] = [
  // =========================================================================
  // 1. SUPERADMIN ROUTES (/admin)
  // =========================================================================
  {
    path: "/admin",
    label: "Tenants",
    breadcrumbGroup: "SuperAdmin Platform",
    breadcrumbTitle: "Multi-Tenant Partitioning",
    iconName: "Building2",
    allowedRoles: ["SuperAdmin"],
    badgeKey: "tenants",
    description: "Global college tenant partitioning & storage quotas",
    isSidebarItem: true,
    sidebarOrder: 1,
  },
  {
    path: "/admin/templates",
    label: "Master Templates",
    breadcrumbGroup: "SuperAdmin Platform",
    breadcrumbTitle: "NBA Criteria Schemas",
    iconName: "Layers",
    allowedRoles: ["SuperAdmin"],
    description: "AICTE / NBA criterion 2 & 3 schemas and evaluation rubrics",
    isSidebarItem: true,
    sidebarOrder: 2,
  },
  {
    path: "/admin/subscriptions",
    label: "Subscriptions",
    breadcrumbGroup: "SuperAdmin Platform",
    breadcrumbTitle: "Licenses & Pilots",
    iconName: "Shield",
    allowedRoles: ["SuperAdmin"],
    badgeKey: "pilotRequests",
    description: "Annual institutional licenses & pending 90-day pilot requests",
    isSidebarItem: true,
    sidebarOrder: 3,
  },
  {
    path: "/admin/health",
    label: "Health & Telemetry",
    breadcrumbGroup: "SuperAdmin Platform",
    breadcrumbTitle: "Worker Telemetry & DB Pool",
    iconName: "Sliders",
    allowedRoles: ["SuperAdmin"],
    description: "Database partitions, connection pooling & background worker telemetry",
    isSidebarItem: true,
    sidebarOrder: 4,
  },
  {
    path: "/admin/audit",
    label: "Audit Logs",
    breadcrumbGroup: "SuperAdmin Platform",
    breadcrumbTitle: "Governance Audit Trail",
    iconName: "ShieldAlert",
    allowedRoles: ["SuperAdmin"],
    description: "Immutable platform governance & security audit logs",
    isSidebarItem: true,
    sidebarOrder: 5,
  },

  // =========================================================================
  // 2. COLLEGE ADMIN ROUTES (/college)
  // =========================================================================
  {
    path: "/college",
    label: "Overview",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Campus Executive KPIs",
    iconName: "LayoutDashboard",
    allowedRoles: ["CollegeAdmin"],
    description: "Campus KPIs, intake quotas & cycle governance overview",
    isSidebarItem: true,
    sidebarOrder: 1,
  },
  {
    path: "/college/courses",
    label: "Courses & Branches",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Academic Degree Programs & Branches",
    iconName: "GitFork",
    allowedRoles: ["CollegeAdmin"],
    description: "Degree programs (B.Tech, MBA, MCA) and branch hierarchy management",
    isSidebarItem: true,
    sidebarOrder: 2,
  },
  {
    path: "/college/hods",
    label: "HOD Leadership",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Department Leadership & Appointments",
    iconName: "UserCheck",
    allowedRoles: ["CollegeAdmin"],
    description: "Legacy route - redirects to courses & branches for direct HOD assignment",
    isSidebarItem: false,
  },
  {
    path: "/college/users",
    label: "Staff Directory",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Institutional User Access & Staff Directory",
    iconName: "Users",
    allowedRoles: ["CollegeAdmin"],
    description: "Staff accounts, role assignments, activation & password resets",
    isSidebarItem: true,
    sidebarOrder: 3,
  },
  {
    path: "/college/accreditation",
    label: "Accreditation",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Accreditation Engine & Compliance Governance",
    iconName: "ShieldCheck",
    allowedRoles: ["CollegeAdmin"],
    description: "NBA Tier-II SAR and NAAC Institutional Accreditation Engine",
    isSidebarItem: true,
    sidebarOrder: 4,
  },
  {
    path: "/college/accreditation/frameworks",
    label: "Frameworks & Cycles",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Frameworks & Assessment Cycles",
    iconName: "ShieldCheck",
    allowedRoles: ["CollegeAdmin"],
    description: "Manage accreditation frameworks, manuals and cycles",
    isSidebarItem: false,
  },
  {
    path: "/college/accreditation/programs",
    label: "Program Mapping",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Academic Program Accreditation Mapping",
    iconName: "GitFork",
    allowedRoles: ["CollegeAdmin"],
    description: "Map academic branches and programs to NBA frameworks",
    isSidebarItem: false,
  },
  {
    path: "/college/accreditation/criteria",
    label: "Criteria & Metrics",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Criteria, Sub-Criteria & Measurable Metrics",
    iconName: "Layers",
    allowedRoles: ["CollegeAdmin"],
    description: "Tree structure of accreditation criteria and attainment metrics",
    isSidebarItem: false,
  },
  {
    path: "/college/accreditation/evidence",
    label: "Evidence & Documents",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Accreditation Document Vault",
    iconName: "FileCheck2",
    allowedRoles: ["CollegeAdmin"],
    description: "Central repository of institutional evidence and proof files",
    isSidebarItem: false,
  },
  {
    path: "/college/accreditation/reviews",
    label: "Reviews & Approvals",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Accreditation Verification & Endorsements Queue",
    iconName: "UserCheck",
    allowedRoles: ["CollegeAdmin"],
    description: "Review workflow for submitted evidence and metrics",
    isSidebarItem: false,
  },
  {
    path: "/college/accreditation/reports",
    label: "Reports & Export",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Official SAR / SSR Dossier Generation",
    iconName: "Award",
    allowedRoles: ["CollegeAdmin"],
    description: "Export self-assessment reports and Dean digital attestation",
    isSidebarItem: false,
  },
  {
    path: "/college/accreditation/activity",
    label: "Activity Log",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Accreditation Audit Trail",
    iconName: "ShieldAlert",
    allowedRoles: ["CollegeAdmin"],
    description: "Immutable log of accreditation configuration and reviews",
    isSidebarItem: false,
  },
  {
    path: "/college/compliance",
    label: "Accreditation",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Accreditation & Compliance",
    iconName: "ShieldCheck",
    allowedRoles: ["CollegeAdmin"],
    description: "Institutional accreditation sign-off matrix & SAR dossier exporter",
    isSidebarItem: false,
  },
  {
    path: "/college/settings",
    label: "Campus Settings",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Institutional Configuration & Seal",
    iconName: "Building2",
    allowedRoles: ["CollegeAdmin"],
    description: "Campus profile, digital seal, quotas, module toggles & SSO security",
    isSidebarItem: true,
    sidebarOrder: 5,
  },
  {
    path: "/college/departments",
    label: "Departments",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Academic Leadership & Quotas",
    iconName: "FolderTree",
    allowedRoles: ["CollegeAdmin"],
    description: "Legacy route - redirects to courses & branches",
    isSidebarItem: false,
  },

  // =========================================================================
  // 3. DEPARTMENT HOD ROUTES (/hod)
  // =========================================================================
  {
    path: "/hod",
    label: "Overview",
    breadcrumbGroup: "HOD Console",
    breadcrumbTitle: "Computer Science & Engineering",
    iconName: "LayoutDashboard",
    allowedRoles: ["HOD"],
    description: "Department cohort overview, approval funnel & faculty mentorship",
    isSidebarItem: true,
    sidebarOrder: 1,
  },
  {
    path: "/hod/approvals",
    label: "Approvals Queue",
    breadcrumbGroup: "HOD Console",
    breadcrumbTitle: "Endorsements & Exception Overrides",
    iconName: "FileCheck2",
    allowedRoles: ["HOD"],
    badgeKey: "pendingHODCount",
    description: "Guide allotments, capstone proposals & administrative exception overrides",
    isSidebarItem: true,
    sidebarOrder: 2,
  },
  {
    path: "/hod/nba",
    label: "NBA Criterion 2 & 3",
    breadcrumbGroup: "HOD Console",
    breadcrumbTitle: "Accreditation Dossier (SAR 2.2 & 3.3)",
    iconName: "GraduationCap",
    allowedRoles: ["HOD"],
    description: "Direct + Indirect 80/20 CO-PO attainment matrix & 9-sample portfolio package",
    isSidebarItem: true,
    sidebarOrder: 3,
  },
  {
    path: "/hod/faculty",
    label: "Faculty Setup",
    breadcrumbGroup: "HOD Console",
    breadcrumbTitle: "Department Faculty Roster",
    iconName: "Sliders",
    allowedRoles: ["HOD"],
    description: "Faculty mentorship capacity quotas & coordinator appointments",
    isSidebarItem: true,
    sidebarOrder: 4,
  },

  // =========================================================================
  // 4. FACULTY GUIDE ROUTES (/faculty)
  // =========================================================================
  {
    path: "/faculty",
    label: "Action Queue",
    breadcrumbGroup: "Mentorship & Evaluation Console",
    breadcrumbTitle: "SISTec CSE",
    iconName: "FileCheck2",
    allowedRoles: ["Faculty"],
    badgeKey: "pendingFacultyCount",
    description: "Pending student proposals, Friday logbook sign-offs & guide reviews",
    isSidebarItem: true,
    sidebarOrder: 1,
  },
  {
    path: "/faculty/teams",
    label: "My Teams",
    breadcrumbGroup: "Mentorship & Evaluation Console",
    breadcrumbTitle: "Mentored Project Teams",
    iconName: "Users2",
    allowedRoles: ["Faculty"],
    description: "Guided capstone teams, repository health & weekly sprint progress",
    isSidebarItem: true,
    sidebarOrder: 2,
  },
  {
    path: "/faculty/evaluations",
    label: "Live Viva Grading",
    breadcrumbGroup: "Mentorship & Evaluation Console",
    breadcrumbTitle: "Defense Rubric Scoring",
    iconName: "GraduationCap",
    allowedRoles: ["Faculty"],
    description: "60/40 blended viva defense rubric & individual student assessment matrix",
    isSidebarItem: true,
    sidebarOrder: 3,
  },

  // =========================================================================
  // 5. PROJECT COORDINATOR ROUTE (/coordinator)
  // =========================================================================
  {
    path: "/coordinator",
    label: "Coordinator Console",
    breadcrumbGroup: "Project Coordinator Operations",
    breadcrumbTitle: "CSE Minor Project — Semester 6 (2026)",
    iconName: "Briefcase",
    allowedRoles: ["Faculty"],
    coordinatorOnly: true,
    description: "Cycle parameters, guide allocation, panel scheduling & exception overrides",
    isSidebarItem: true,
    sidebarOrder: 4,
  },

  // =========================================================================
  // 6. STUDENT & TEAM LEAD ROUTES (/student)
  // =========================================================================
  {
    path: "/student",
    label: "Workspace",
    breadcrumbGroup: "Project Workspace",
    breadcrumbTitle: "SISTec CSE • Minor Project",
    iconName: "FolderGit2",
    allowedRoles: ["Student", "TeamLead"],
    description: "Sprint tasks, 4-slot capstone document vault & weekly logbook",
    isSidebarItem: true,
    sidebarOrder: 1,
  },
  {
    path: "/student/explore",
    label: "Explore",
    breadcrumbGroup: "Explore & Ideation Directory",
    breadcrumbTitle: "Campus Project Bank & Peer Matching",
    iconName: "Compass",
    allowedRoles: ["Student", "TeamLead"],
    description: "Faculty research bank, SDG alignment & peer team matching",
    isSidebarItem: true,
    sidebarOrder: 2,
  },
  {
    path: "/student/portfolio",
    label: "Portfolio",
    breadcrumbGroup: "Academic Project Portfolio",
    breadcrumbTitle: "Verified Institutional Transcript",
    iconName: "GraduationCap",
    allowedRoles: ["Student", "TeamLead"],
    description: "Continuous degree project lineage, QR credentials & 60-second exit survey",
    isSidebarItem: true,
    sidebarOrder: 3,
  },
  {
    path: "/student/profile",
    label: "Profile",
    breadcrumbGroup: "Learner Academic Profile",
    breadcrumbTitle: "Student USN & Identity Records",
    iconName: "User",
    allowedRoles: ["Student", "TeamLead"],
    description: "Institutional enrollment USN, technical skill badges & VCS endpoints",
    isSidebarItem: true,
    sidebarOrder: 4,
  },

  // =========================================================================
  // 7. UNIVERSAL ACCOUNT ROUTE (/account)
  // =========================================================================
  {
    path: "/account",
    label: "Profile",
    breadcrumbGroup: "Account & Profile",
    breadcrumbTitle: "Institutional Credentials & Security",
    iconName: "CircleUser",
    allowedRoles: ["SuperAdmin", "CollegeAdmin", "HOD", "Faculty"],
    description: "University profile, institutional role authority & security credentials",
    isSidebarItem: true,
    sidebarOrder: 99,
  },
];

// Publicly accessible paths without authentication
export const PUBLIC_ROUTES = ["/", "/login", "/onboarding"];

// Authorized Landing / Home Routes per Role
export const ROLE_HOME_ROUTES: Record<RoleType, string> = {
  SuperAdmin: "/admin",
  CollegeAdmin: "/college",
  HOD: "/hod",
  Faculty: "/faculty",
  TeamLead: "/student",
  Student: "/student",
};

// Lucide Icon Component Map
export const ICON_MAP: Record<IconName, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  LayoutDashboard,
  FolderGit2,
  Compass,
  GraduationCap,
  User,
  Users,
  Users2,
  FileCheck2,
  Sliders,
  Building2,
  Layers,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Briefcase,
  FolderTree,
  Award,
  GitFork,
  UserCheck,
  CircleUser,
};

export const getRouteIcon = (name: IconName): React.ComponentType<{ className?: string; strokeWidth?: number }> => {
  return ICON_MAP[name] || LayoutDashboard;
};

// Find route by exact or prefix match
export const findRouteByPath = (pathname: string): RouteDefinition | undefined => {
  if (!pathname) return undefined;
  // First try exact match
  const exact = ROUTE_REGISTRY.find((r) => r.path === pathname);
  if (exact) return exact;

  // Fallback: match longest prefix for nested subroutes
  const prefixMatches = ROUTE_REGISTRY.filter((r) => pathname.startsWith(r.path)).sort(
    (a, b) => b.path.length - a.path.length
  );
  return prefixMatches[0];
};

// Check if a role is authorized for a specific path
export const isRouteAuthorized = (
  pathname: string,
  role: RoleType,
  isProjectCoordinator = false
): boolean => {
  if (PUBLIC_ROUTES.includes(pathname)) return true;

  const route = findRouteByPath(pathname);
  if (!route) return false;

  // Coordinator check
  if (route.coordinatorOnly) {
    return role === "Faculty" && isProjectCoordinator;
  }

  return route.allowedRoles.includes(role);
};
