import React from "react";
import {
  LayoutDashboard,
  FolderGit2,
  Compass,
  GraduationCap,
  User,
  Users2,
  FileCheck2,
  Sliders,
  Building2,
  Layers,
  Shield,
  ShieldAlert,
  Briefcase,
  CreditCard,
  Users,
  Boxes,
  HeartPulse,
  LifeBuoy,
  Megaphone,
  ShieldCheck,
  BarChart3,
  Settings,
  LogOut,
  FileText,
  Activity,
  Bell,
  BookOpen,
} from "lucide-react";
import { RoleType } from "@/mocks/store-types";

export type IconName =
  | "LayoutDashboard"
  | "FolderGit2"
  | "Compass"
  | "GraduationCap"
  | "User"
  | "Users2"
  | "FileCheck2"
  | "Sliders"
  | "Building2"
  | "Layers"
  | "Shield"
  | "ShieldAlert"
  | "Briefcase"
  | "CreditCard"
  | "Users"
  | "Boxes"
  | "HeartPulse"
  | "LifeBuoy"
  | "Megaphone"
  | "ShieldCheck"
  | "BarChart3"
  | "Settings"
  | "LogOut"
  | "FileText"
  | "Activity"
  | "Bell"
  | "BookOpen";

export type PlatformNavSection =
  | "WORKSPACE"
  | "MANAGEMENT"
  | "OPERATIONS"
  | "ACCOUNT"
  | "MENU"
  | "COORDINATOR";

export interface RouteDefinition {
  path: string;
  label: string;
  breadcrumbGroup: string;
  breadcrumbTitle?: string;
  iconName: IconName;
  allowedRoles: RoleType[];
  badgeKey?: "tenants" | "pilotRequests" | "pendingHODCount" | "pendingFacultyCount" | "pendingOnboarding" | "tickets";
  description: string;
  coordinatorOnly?: boolean;
  isSidebarItem?: boolean;
  sidebarOrder?: number;
  section?: PlatformNavSection;
}

export const ROUTE_REGISTRY: RouteDefinition[] = [
  // =========================================================================
  // 1. FINAL APPROVED SUPER ADMIN 8-SCREEN PLATFORM CONSOLE NAVIGATION
  // =========================================================================

  // --- PRIMARY SIDEBAR ITEMS ---
  {
    path: "/platform/dashboard",
    label: "Overview",
    breadcrumbGroup: "Platform Console",
    breadcrumbTitle: "Ecosystem Overview",
    iconName: "LayoutDashboard",
    allowedRoles: ["SuperAdmin"],
    description: "Platform KPIs, pending onboarding queue, support overview, and system status",
    isSidebarItem: true,
    sidebarOrder: 1,
    section: "MENU",
  },
  {
    path: "/platform/colleges",
    label: "Colleges",
    breadcrumbGroup: "Management",
    breadcrumbTitle: "College Registry & Onboarding Governance",
    iconName: "Building2",
    allowedRoles: ["SuperAdmin"],
    badgeKey: "tenants",
    description: "Manage affiliated institutions, application lifecycle, and tenant status",
    isSidebarItem: true,
    sidebarOrder: 2,
    section: "MENU",
  },
  {
    path: "/platform/academic-reference",
    label: "Academic Reference",
    breadcrumbGroup: "Governance",
    breadcrumbTitle: "Standard University, Program & Branch Catalog",
    iconName: "BookOpen",
    allowedRoles: ["SuperAdmin"],
    description: "Standard RGPV B.Tech programs and verified engineering branch catalog",
    isSidebarItem: true,
    sidebarOrder: 3,
    section: "MENU",
  },
  {
    path: "/platform/administrators",
    label: "Platform Administrators",
    breadcrumbGroup: "Security & Operations",
    breadcrumbTitle: "Platform Operator Accounts & Access",
    iconName: "Users",
    allowedRoles: ["SuperAdmin"],
    description: "Platform operator directory, predefined roles, and session security",
    isSidebarItem: true,
    sidebarOrder: 4,
    section: "MENU",
  },
  {
    path: "/platform/announcements",
    label: "Announcements",
    breadcrumbGroup: "Communications",
    breadcrumbTitle: "Platform Announcements & Broadcasts",
    iconName: "Megaphone",
    allowedRoles: ["SuperAdmin"],
    description: "Broadcast maintenance notices, platform updates, and policy bulletins",
    isSidebarItem: true,
    sidebarOrder: 5,
    section: "MENU",
  },
  {
    path: "/platform/support-health",
    label: "Support & Health",
    breadcrumbGroup: "Operations",
    breadcrumbTitle: "Institutional Support Desk & Core Services Health",
    iconName: "LifeBuoy",
    allowedRoles: ["SuperAdmin"],
    badgeKey: "tickets",
    description: "College support ticket resolution and core services availability monitoring",
    isSidebarItem: true,
    sidebarOrder: 6,
    section: "MENU",
  },
  {
    path: "/platform/security-audit",
    label: "Security & Audit",
    breadcrumbGroup: "Security & Governance",
    breadcrumbTitle: "Active Sessions & Platform Audit Trail",
    iconName: "ShieldCheck",
    allowedRoles: ["SuperAdmin"],
    description: "Active administrator sessions, security events, and immutable audit log",
    isSidebarItem: true,
    sidebarOrder: 7,
    section: "MENU",
  },
  {
    path: "/platform/analytics",
    label: "Analytics & Adoption",
    breadcrumbGroup: "Intelligence",
    breadcrumbTitle: "Ecosystem Adoption & Usage Reports",
    iconName: "BarChart3",
    allowedRoles: ["SuperAdmin"],
    description: "Cross-college adoption metrics, active usage velocity, and CSV reports",
    isSidebarItem: true,
    sidebarOrder: 8,
    section: "MENU",
  },

  // --- SUB-PAGES & NON-SIDEBAR ROUTES ---
  {
    path: "/platform/colleges/applications",
    label: "Application Review",
    breadcrumbGroup: "Management",
    breadcrumbTitle: "Institutional Onboarding Applications",
    iconName: "FileText",
    allowedRoles: ["SuperAdmin"],
    description: "Review and process institutional onboarding applications",
    isSidebarItem: false,
    section: "MENU",
  },
  {
    path: "/platform/colleges/new",
    label: "Add College",
    breadcrumbGroup: "Management",
    breadcrumbTitle: "Add New College",
    iconName: "Building2",
    allowedRoles: ["SuperAdmin"],
    description: "Register a new institution and provision its dedicated multi-tenant partition",
    isSidebarItem: false,
    section: "MENU",
  },
  {
    path: "/platform/account/profile",
    label: "My Profile",
    breadcrumbGroup: "Account",
    breadcrumbTitle: "Super Admin Profile",
    iconName: "User",
    allowedRoles: ["SuperAdmin"],
    description: "Administrator identity, credentials, security, and preferences",
    isSidebarItem: true,
    sidebarOrder: 10,
    section: "ACCOUNT",
  },

  // --- CONSOLIDATED / ALIAS ROUTE MAPPINGS FOR BACKWARD-COMPATIBILITY ---
  {
    path: "/platform/users",
    label: "Platform Administrators",
    breadcrumbGroup: "Security & Operations",
    iconName: "Users",
    allowedRoles: ["SuperAdmin"],
    description: "Alias for /platform/administrators",
    isSidebarItem: false,
  },
  {
    path: "/platform/management",
    label: "Announcements",
    breadcrumbGroup: "Communications",
    iconName: "Megaphone",
    allowedRoles: ["SuperAdmin"],
    description: "Alias for /platform/announcements",
    isSidebarItem: false,
  },
  {
    path: "/platform/system-support",
    label: "Support & Health",
    breadcrumbGroup: "Operations",
    iconName: "LifeBuoy",
    allowedRoles: ["SuperAdmin"],
    description: "Alias for /platform/support-health",
    isSidebarItem: false,
  },
  {
    path: "/platform/academic-master-data",
    label: "Academic Reference",
    breadcrumbGroup: "Governance",
    iconName: "BookOpen",
    allowedRoles: ["SuperAdmin"],
    description: "Alias for /platform/academic-reference",
    isSidebarItem: false,
  },
  {
    path: "/platform/subscriptions",
    label: "Colleges",
    breadcrumbGroup: "Management",
    iconName: "CreditCard",
    allowedRoles: ["SuperAdmin"],
    description: "Redirect to /platform/colleges (licensing managed per college)",
    isSidebarItem: false,
  },
  {
    path: "/platform/business/subscriptions",
    label: "Colleges",
    breadcrumbGroup: "Management",
    iconName: "CreditCard",
    allowedRoles: ["SuperAdmin"],
    description: "Redirect to /platform/colleges",
    isSidebarItem: false,
  },
  {
    path: "/platform/institutions",
    label: "Colleges",
    breadcrumbGroup: "Management",
    iconName: "Building2",
    allowedRoles: ["SuperAdmin"],
    description: "Alias for /platform/colleges",
    isSidebarItem: false,
  },
  {
    path: "/platform/configuration",
    label: "Academic Reference",
    breadcrumbGroup: "Governance",
    iconName: "Sliders",
    allowedRoles: ["SuperAdmin"],
    description: "Redirect to /platform/academic-reference",
    isSidebarItem: false,
  },
  {
    path: "/platform/integrations",
    label: "Platform Administrators",
    breadcrumbGroup: "Management",
    iconName: "Boxes",
    allowedRoles: ["SuperAdmin"],
    description: "Redirect to /platform/administrators",
    isSidebarItem: false,
  },
  {
    path: "/platform/system",
    label: "System Health",
    breadcrumbGroup: "Operations",
    iconName: "HeartPulse",
    allowedRoles: ["SuperAdmin"],
    description: "Alias for /platform/support-health",
    isSidebarItem: false,
  },
  {
    path: "/platform/support",
    label: "Support Desk",
    breadcrumbGroup: "Operations",
    iconName: "LifeBuoy",
    allowedRoles: ["SuperAdmin"],
    description: "Alias for /platform/support-health",
    isSidebarItem: false,
  },
  {
    path: "/platform/security",
    label: "Security & Audit",
    breadcrumbGroup: "Operations",
    iconName: "ShieldCheck",
    allowedRoles: ["SuperAdmin"],
    description: "Alias for /platform/security-audit",
    isSidebarItem: false,
  },
  {
    path: "/platform/audit",
    label: "Security & Audit",
    breadcrumbGroup: "Operations",
    iconName: "FileCheck2",
    allowedRoles: ["SuperAdmin"],
    description: "Alias for /platform/security-audit",
    isSidebarItem: false,
  },
  {
    path: "/platform/account/settings",
    label: "My Profile",
    breadcrumbGroup: "Account",
    iconName: "Settings",
    allowedRoles: ["SuperAdmin"],
    description: "Alias for /platform/account/profile",
    isSidebarItem: false,
  },
  {
    path: "/platform/logout",
    label: "Logout",
    breadcrumbGroup: "Account",
    iconName: "LogOut",
    allowedRoles: ["SuperAdmin"],
    description: "Terminate administrative session",
    isSidebarItem: false,
  },

  // Legacy /admin route aliases (routed to /platform/dashboard etc.)
  {
    path: "/admin",
    label: "Overview",
    breadcrumbGroup: "Platform Console",
    iconName: "LayoutDashboard",
    allowedRoles: ["SuperAdmin"],
    description: "Platform Overview",
    isSidebarItem: false,
  },
  {
    path: "/admin/subscriptions",
    label: "Colleges",
    breadcrumbGroup: "Business Operations",
    iconName: "Shield",
    allowedRoles: ["SuperAdmin"],
    description: "Redirect to /platform/colleges",
    isSidebarItem: false,
  },
  {
    path: "/admin/health",
    label: "System Health",
    breadcrumbGroup: "Operations",
    iconName: "Sliders",
    allowedRoles: ["SuperAdmin"],
    description: "Redirect to /platform/support-health",
    isSidebarItem: false,
  },
  {
    path: "/admin/audit",
    label: "Audit Logs",
    breadcrumbGroup: "Governance",
    iconName: "ShieldAlert",
    allowedRoles: ["SuperAdmin"],
    description: "Redirect to /platform/security-audit",
    isSidebarItem: false,
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
    path: "/college/departments",
    label: "Departments & HODs",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Academic Leadership & Quotas",
    iconName: "Users2",
    allowedRoles: ["CollegeAdmin"],
    description: "Appointed departmental leadership, HOD assignments & student quotas",
    isSidebarItem: true,
    sidebarOrder: 2,
  },
  {
    path: "/college/settings",
    label: "Campus Settings",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Institutional Configuration & Seal",
    iconName: "Sliders",
    allowedRoles: ["CollegeAdmin"],
    description: "Principal digital seal, SSO domain validation & CSV directory sync",
    isSidebarItem: true,
    sidebarOrder: 3,
  },
  {
    path: "/college/compliance",
    label: "Accreditation",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "NBA Criterion 2 & 3 Sign-Off",
    iconName: "FileCheck2",
    allowedRoles: ["CollegeAdmin"],
    description: "Institutional accreditation sign-off matrix & SAR dossier exporter",
    isSidebarItem: true,
    sidebarOrder: 4,
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
    iconName: "User",
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
  SuperAdmin: "/platform/dashboard",
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
  Users2,
  FileCheck2,
  Sliders,
  Building2,
  Layers,
  Shield,
  ShieldAlert,
  Briefcase,
  CreditCard,
  Users,
  Boxes,
  HeartPulse,
  LifeBuoy,
  Megaphone,
  ShieldCheck,
  BarChart3,
  Settings,
  LogOut,
  FileText,
  Activity,
  Bell,
  BookOpen,
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

  // Allow legacy admin paths for SuperAdmin
  if (role === "SuperAdmin" && (pathname.startsWith("/platform") || pathname.startsWith("/admin") || pathname === "/account")) {
    return true;
  }

  const route = findRouteByPath(pathname);
  if (!route) return false;

  // Coordinator check
  if (route.coordinatorOnly) {
    return role === "Faculty" && isProjectCoordinator;
  }

  return route.allowedRoles.includes(role);
};
