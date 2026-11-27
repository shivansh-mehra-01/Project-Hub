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
  CreditCard,
  Boxes,
  HeartPulse,
  LifeBuoy,
  Megaphone,
  BarChart3,
  Settings,
  LogOut,
  FileText,
  Activity,
  Bell,
  BookOpen,
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
  | "BookOpen"
  | "FolderTree"
  | "Award"
  | "GitFork"
  | "UserCheck"
  | "CircleUser";

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
    path: "/college/courses",
    label: "Programs & Branches",
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
    label: "Department Leadership",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Department Leadership & Appointments",
    iconName: "UserCheck",
    allowedRoles: ["CollegeAdmin"],
    description: "Department HOD roster, vacancy status, faculty appointment & succession history",
    isSidebarItem: true,
    sidebarOrder: 3,
  },
  {
    path: "/college/students",
    label: "Students & Enrollment",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Institutional Student Roster & Enrollment",
    iconName: "GraduationCap",
    allowedRoles: ["CollegeAdmin"],
    description: "Institutional student roster, master profiles, and academic enrollment management",
    isSidebarItem: true,
    sidebarOrder: 4,
  },

  {
    path: "/college/users",
    label: "Faculty & Staff",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Institutional User Access & Staff Directory",
    iconName: "Users",
    allowedRoles: ["CollegeAdmin"],
    description: "Staff accounts, AICTE designations, activation & user-directed password resets",
    isSidebarItem: true,
    sidebarOrder: 5,
  },
  {
    path: "/college/announcements",
    label: "Announcements",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Platform Announcements & Notices",
    iconName: "Megaphone",
    allowedRoles: ["CollegeAdmin"],
    description: "Published platform notices, maintenance advisories, and operational bulletins",
    isSidebarItem: true,
    sidebarOrder: 5,
  },
  {
    path: "/college/settings",
    label: "College Settings",
    breadcrumbGroup: "Institutional Console",
    breadcrumbTitle: "Institutional Configuration & Seal",
    iconName: "Building2",
    allowedRoles: ["CollegeAdmin"],
    description: "Campus profile, digital seal, quotas, module toggles & SSO security",
    isSidebarItem: true,
    sidebarOrder: 6,
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
  // 3. DEPARTMENT HOD ROUTES (/hod) - 6 CORE PRODUCT AREAS
  // =========================================================================
  {
    path: "/hod",
    label: "Overview",
    breadcrumbGroup: "HOD Console",
    breadcrumbTitle: "Department Executive Overview",
    iconName: "LayoutDashboard",
    allowedRoles: ["HOD"],
    description: "Department cohort overview, approval funnel & faculty mentorship",
    isSidebarItem: true,
    sidebarOrder: 1,
  },
  {
    path: "/hod/projects",
    label: "Projects",
    breadcrumbGroup: "HOD Console",
    breadcrumbTitle: "Department Projects & Tracks",
    iconName: "FolderGit2",
    allowedRoles: ["HOD"],
    description: "Department project tracks, student project teams & guide assignments",
    isSidebarItem: true,
    sidebarOrder: 2,
  },
  {
    path: "/hod/projects/tracks",
    label: "Project Tracks",
    breadcrumbGroup: "HOD Console",
    breadcrumbTitle: "Department Project Tracks",
    iconName: "Compass",
    allowedRoles: ["HOD"],
    description: "Initialize, launch, configure & govern department project tracks",
    isSidebarItem: false,
  },
  {
    path: "/hod/projects/start-window",
    label: "Start Project Window",
    breadcrumbGroup: "HOD Console",
    breadcrumbTitle: "Start Project Window",
    iconName: "Compass",
    allowedRoles: ["HOD"],
    description: "Initiate a new academic project window for a specific semester",
    isSidebarItem: false,
  },
  {
    path: "/hod/students",
    label: "Students",
    breadcrumbGroup: "HOD Console",
    breadcrumbTitle: "Department Students & Enrollment",
    iconName: "GraduationCap",
    allowedRoles: ["HOD"],
    description: "Department student roster, semester enrollment & cohort assignment",
    isSidebarItem: true,
    sidebarOrder: 3,
  },
  {
    path: "/hod/faculty",
    label: "Faculty & Guides",
    breadcrumbGroup: "HOD Console",
    breadcrumbTitle: "Faculty Mentorship & Workload",
    iconName: "Users",
    allowedRoles: ["HOD"],
    description: "Faculty mentorship capacity quotas & coordinator appointments",
    isSidebarItem: true,
    sidebarOrder: 4,
  },
  {
    path: "/hod/approvals",
    label: "Approvals",
    breadcrumbGroup: "HOD Console",
    breadcrumbTitle: "Decisions & Exception Overrides",
    iconName: "FileCheck2",
    allowedRoles: ["HOD"],
    badgeKey: "pendingHODCount",
    description: "Proposals, guide reassignments, roster amendments & grade unlocks",
    isSidebarItem: true,
    sidebarOrder: 5,
  },
  {
    path: "/hod/reports",
    label: "Reports",
    breadcrumbGroup: "HOD Console",
    breadcrumbTitle: "Department Academic Reports",
    iconName: "BarChart3",
    allowedRoles: ["HOD"],
    description: "Project completion, faculty workload balance & student result marksheet",
    isSidebarItem: true,
    sidebarOrder: 6,
  },

  // =========================================================================
  // 4. FACULTY / GUIDE ROUTES (/faculty)
  // =========================================================================
  {
    path: "/faculty",
    label: "Dashboard",
    breadcrumbGroup: "Faculty & Guide Console",
    breadcrumbTitle: "Action Queue & Workload Overview",
    iconName: "LayoutDashboard",
    allowedRoles: ["Faculty"],
    badgeKey: "pendingFacultyCount",
    description: "Action queue, pending proposals, weekly logbook sign-offs & team progress",
    isSidebarItem: true,
    sidebarOrder: 1,
  },
  {
    path: "/faculty/teams",
    label: "My Teams",
    breadcrumbGroup: "Faculty & Guide Console",
    breadcrumbTitle: "Mentored Project Teams",
    iconName: "Users2",
    allowedRoles: ["Faculty"],
    description: "Mentored capstone teams, repository health, deliverables & activity tracking",
    isSidebarItem: true,
    sidebarOrder: 2,
  },
  {
    path: "/faculty/teams/[teamId]",
    label: "Team Workspace",
    breadcrumbGroup: "Faculty & Guide Console",
    breadcrumbTitle: "Team Mentorship Workspace",
    iconName: "FolderGit2",
    allowedRoles: ["Faculty"],
    description: "Deep-link team workspace for deliverable vault, proposal review, and progress logs",
    isSidebarItem: false,
    sidebarOrder: 99,
  },
  {
    path: "/faculty/proposals",
    label: "Proposals",
    breadcrumbGroup: "Faculty & Guide Console",
    breadcrumbTitle: "Capstone Proposal Review Queue",
    iconName: "FileCheck2",
    allowedRoles: ["Faculty"],
    description: "Review, endorse, return for revision, or reject student project proposals",
    isSidebarItem: true,
    sidebarOrder: 3,
  },
  {
    path: "/faculty/logs",
    label: "Weekly Logs",
    breadcrumbGroup: "Faculty & Guide Console",
    breadcrumbTitle: "Continuous Progress Logs Inspection",
    iconName: "Activity",
    allowedRoles: ["Faculty"],
    description: "Weekly student sprint logbooks, guide sign-offs, and continuous evaluation verification",
    isSidebarItem: true,
    sidebarOrder: 4,
  },
  {
    path: "/faculty/deliverables",
    label: "Deliverables",
    breadcrumbGroup: "Faculty & Guide Console",
    breadcrumbTitle: "Deliverables & Artifacts Vault",
    iconName: "FileText",
    allowedRoles: ["Faculty"],
    description: "Inspect student project deliverables, verify plagiarism reports, and download binary artifacts",
    isSidebarItem: true,
    sidebarOrder: 5,
  },
  {
    path: "/faculty/evaluations",
    label: "Viva Evaluations",
    breadcrumbGroup: "Faculty & Guide Console",
    breadcrumbTitle: "Defense Rubric & Examination Scoring",
    iconName: "Award",
    allowedRoles: ["Faculty"],
    description: "60/40 blended viva defense rubric & individual student assessment matrix",
    isSidebarItem: true,
    sidebarOrder: 6,
  },

  // =========================================================================
  // 5. PROJECT COORDINATOR ROUTE (/coordinator)
  // =========================================================================
  {
    path: "/coordinator",
    label: "Coordinator Console",
    breadcrumbGroup: "Project Coordinator Operations",
    breadcrumbTitle: "Academic Track Operations & Governance",
    iconName: "Briefcase",
    allowedRoles: ["Faculty"],
    coordinatorOnly: true,
    description: "Cycle parameters, guide allocation, panel scheduling & exception overrides",
    isSidebarItem: true,
    sidebarOrder: 8,
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
    label: "Account",
    breadcrumbGroup: "Account",
    breadcrumbTitle: "User Credentials & Security",
    iconName: "CircleUser",
    allowedRoles: ["SuperAdmin", "CollegeAdmin", "HOD", "Faculty"],
    description: "University profile, institutional role authority & security credentials",
    isSidebarItem: false,
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
  CreditCard,
  Boxes,
  HeartPulse,
  LifeBuoy,
  Megaphone,
  BarChart3,
  Settings,
  LogOut,
  FileText,
  Activity,
  Bell,
  BookOpen,
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
