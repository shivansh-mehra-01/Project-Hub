"use client";

import React, { useState, useEffect, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Compass,
  FileCheck2,
  FolderGit2,
  GraduationCap,
  LayoutDashboard,
  Layers,
  LogOut,
  RotateCcw,
  Search,
  Sliders,
  User,
  UserCog,
  Users2,
  X,
  Shield,
  ShieldAlert,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CollabexLogo } from "@/components/brand/CollabexLogo";
import { CommandPalette, formatRoleLabel } from "../components/CommandPalette";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { RoleType } from "@/mocks/store-types";
import { getSidebarNav, getBreadcrumbs, RouteGuard, SidebarNavItem } from "@/navigation";

export const getAvatarInitials = (name: string): string => {
  const cleaned = name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.|Er\.)\s+/i, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const getRoleSubtitle = (role: RoleType, isCoordinator?: boolean): string => {
  switch (role) {
    case "Student":
      return "Student Member";
    case "TeamLead":
      return "Student Lead";
    case "Faculty":
      return isCoordinator ? "Project Coordinator" : "Faculty Guide";
    case "HOD":
      return "Department HOD";
    case "CollegeAdmin":
      return "College Administrator";
    case "SuperAdmin":
      return "Super Admin";
    default:
      return formatRoleLabel(role);
  }
};

export interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
  breadcrumb?: string;
  activeTab?: string;
}

export const AppShellContext = React.createContext<boolean>(false);

export const AppShell: React.FC<AppShellProps> = ({
  children,
  pageTitle,
  breadcrumb,
  activeTab,
}) => {
  const isInsideShell = useContext(AppShellContext);

  // If already mounted within an outer AppShell (e.g. from DashboardLayout), pass children through cleanly
  if (isInsideShell) {
    return <>{children}</>;
  }

  return (
    <AppShellContext.Provider value={true}>
      <AppShellInner pageTitle={pageTitle} breadcrumb={breadcrumb} activeTab={activeTab}>
        {children}
      </AppShellInner>
    </AppShellContext.Provider>
  );
};

const AppShellInner: React.FC<AppShellProps> = ({
  children,
  pageTitle,
  breadcrumb,
  activeTab,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { currentPersona, college, cycle, switchPersona, tenants, pilotRequests, teams, logout } =
    useProjectHubStore();

  const pendingHODCount = teams.filter((t) => t.state === "PendingHOD").length || 1;

  const [showNotifications, setShowNotifications] = useState(false);
  const [showCampusMenu, setShowCampusMenu] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("Gandhi Nagar (Main)");

  // Enforce strictly Emerald & Charcoal theme
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("projecthub_theme");
      document.documentElement.removeAttribute("data-theme");
    }
  }, []);

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-sync persona with route if accessed directly via URL
  useEffect(() => {
    if (pathname.startsWith("/admin") && currentPersona.role !== "SuperAdmin") {
      switchPersona("SuperAdmin");
    } else if (pathname.startsWith("/college") && currentPersona.role !== "CollegeAdmin") {
      switchPersona("CollegeAdmin");
    } else if (pathname.startsWith("/hod") && currentPersona.role !== "HOD") {
      switchPersona("HOD");
    } else if (pathname.startsWith("/coordinator") && currentPersona.role !== "Faculty") {
      switchPersona("Faculty");
    } else if (pathname.startsWith("/faculty") && currentPersona.role !== "Faculty") {
      switchPersona("Faculty");
    }
  }, [pathname, currentPersona.role, switchPersona]);

  // Role-scoped notifications (strictly isolated by role & team)
  const notifications = (() => {
    if (currentPersona.role === "Student" || currentPersona.role === "TeamLead") {
      return [
        {
          id: "n-s1",
          title: "Weekly Logbook Accepted",
          time: "10 mins ago",
          desc: "Guide Prof. S. K. Verma approved Week 5 Logbook with remarks for Team 2026-CS-MIN-01.",
        },
        {
          id: "n-s2",
          title: "Sprint Task Due",
          time: "2 hours ago",
          desc: "Task 'ESP32 firmware OTA integration' is due tomorrow for Team 2026-CS-MIN-01.",
        },
        {
          id: "n-s3",
          title: "Mid-Term Defense Scheduled",
          time: "Yesterday",
          desc: "Team 2026-CS-MIN-01 evaluation panel confirmed for May 04 at 10:30 AM (Room Lab-3).",
        },
      ];
    }
    if (currentPersona.role === "Faculty") {
      return [
        {
          id: "n-f1",
          title: "Friday Logbook Pending",
          time: "10 mins ago",
          desc: "Shivansh Mehra submitted Week 5 Logbook for review (Team 2026-CS-MIN-01).",
        },
        {
          id: "n-f2",
          title: "Mid-Term Evaluation Panel",
          time: "2 hours ago",
          desc: "You are assigned to evaluate 3 Minor project teams in Lab-3.",
        },
      ];
    }
    if (currentPersona.role === "HOD") {
      return [
        {
          id: "n-h1",
          title: "Proposal Ready for Sign-Off",
          time: "1 hour ago",
          desc: "Team 2026-CS-MIN-03 guide allotment approved by Coordinator.",
        },
        {
          id: "n-h2",
          title: "NBA Attainment Updated",
          time: "Yesterday",
          desc: "PO3 attainment reached 81.4% (Exceeds Target).",
        },
      ];
    }
    if (currentPersona.role === "CollegeAdmin") {
      return [
        {
          id: "n-c1",
          title: "Department SAR Sign-Off",
          time: "2 hours ago",
          desc: "CSE & ECE departments completed SAR Criterion 3 attestation.",
        },
        {
          id: "n-c2",
          title: "Directory Sync Complete",
          time: "1 day ago",
          desc: "1,280 student enrollments validated for AY 2025-26 Even Sem.",
        },
      ];
    }
    // SuperAdmin
    return [
      {
        id: "n-a1",
        title: "Tenant Partition Provisioned",
        time: "30 mins ago",
        desc: "SISTec Bhopal partition healthy on ap-south-1.",
      },
      {
        id: "n-a2",
        title: "Pilot Application Received",
        time: "3 hours ago",
        desc: "Medicaps University submitted a 90-day institutional pilot trial request.",
      },
    ];
  })();

  // Registered campus branches for multi-campus institutional switcher
  const campuses = [
    { id: "main", name: "Gandhi Nagar (Main Campus)", code: "INST-MP-0176" },
    { id: "ratibad", name: "Ratibad Campus", code: "INST-MP-0192" },
    { id: "pharmacy", name: "SISTec Pharmacy & Tech", code: "INST-MP-0205" },
  ];
  const isCollegeAdminMultiCampus =
    currentPersona.role === "CollegeAdmin" && campuses.length > 1;

  // Live badge counts dictionary passed to centralized navigation engine
  const pendingFacultyCount =
    teams.reduce((acc, t) => {
      const unreviewedLogs = t.weeklyLogs.filter((l) => l.guideStatus === "Pending").length;
      const isProposalPending = t.state === "PendingGuide" ? 1 : 0;
      return acc + unreviewedLogs + isProposalPending;
    }, 0) || 2;

  const liveBadgeCounts: Record<string, number> = {
    tenants: tenants.length,
    pilotRequests: pilotRequests.length,
    pendingHODCount,
    pendingFacultyCount,
  };

  // Centralized Navigation Engine: pure selectors determine strictly authorized items
  const navItems = getSidebarNav(
    currentPersona.role,
    liveBadgeCounts,
    currentPersona.isProjectCoordinator
  );

  const breadcrumbsInfo = getBreadcrumbs(pathname, currentPersona.role);
  const displayTitle = pageTitle || breadcrumbsInfo.pageTitle;
  const displayBreadcrumb = breadcrumb || breadcrumbsInfo.breadcrumb;
  const currentActiveTab = activeTab;

  const primaryItems = navItems.filter((i) => i.section !== "COORDINATOR" && i.label !== "Profile");
  const coordinatorItems = navItems.filter((i) => i.section === "COORDINATOR");
  const profileItem = navItems.find((i) => i.label === "Profile");

  const renderNavItem = (item: SidebarNavItem) => {
    const Icon = item.icon;
    const isProfileItem = item.label === "Profile";
    const isActive =
      currentActiveTab === item.label ||
      pathname === item.href ||
      (isProfileItem &&
        (currentActiveTab === "Account" ||
          pathname === "/account" ||
          pathname === "/student/profile"));

    return (
      <Link
        key={item.label}
        href={item.href}
        prefetch={true}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
          isActive
            ? "bg-brand-primary text-white font-semibold shadow-xs"
            : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
        )}
      >
        <Icon
          className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-slate-400")}
          strokeWidth={1.75}
        />
        <span className="truncate">{item.label}</span>
        {item.count !== undefined && (
          <span
            className={cn(
              "ml-auto text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full",
              isActive
                ? "bg-white/20 text-white"
                : "bg-white/10 text-slate-300 border border-white/10"
            )}
          >
            {item.count}
          </span>
        )}
      </Link>
    );
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-canvas-bg">
      {/* ========================================================================= */}
      {/* 1. DESKTOP FIXED SIDEBAR (240px, Dark L-Frame Anchor)                     */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex w-[240px] flex-col border-r border-white/[0.08] bg-[#111827] text-white fixed inset-y-0 z-30 select-none">
        
        {/* Top-Left Brand Lockup & Multi-Campus Switcher (Locked to 56px / h-14) */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.08] relative">
          <CollabexLogo variant="dark" size="sm" />

          {currentPersona.role === "SuperAdmin" ? (
            <span className="text-[10px] font-mono text-emerald-400/90 font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              Platform
            </span>
          ) : isCollegeAdminMultiCampus ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCampusMenu(!showCampusMenu)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Switch campus branch"
              >
                <span className="font-semibold text-white">{college.code}</span>
                <span className="text-[10px] text-slate-400 font-mono hidden xl:inline">({selectedBranch.split(" ")[0]})</span>
                <ChevronsUpDown
                  className="w-3 h-3 text-slate-400 shrink-0 ml-0.5"
                  strokeWidth={1.75}
                />
              </button>

              {/* Multi-Campus Dropdown */}
              {showCampusMenu && (
                <div className="absolute top-full right-0 mt-2 w-[216px] rounded-xl border border-white/10 bg-[#1F2937] shadow-2xl p-1.5 z-50 space-y-0.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold border-b border-white/[0.08]">
                    Campus Branches
                  </div>
                  {campuses.map((branch) => (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => {
                        setSelectedBranch(branch.name);
                        setShowCampusMenu(false);
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-lg flex flex-col cursor-pointer transition-colors",
                        selectedBranch === branch.name
                          ? "bg-brand-primary text-white font-semibold"
                          : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                      )}
                    >
                      <span className="text-xs truncate">{branch.name}</span>
                      <span className="text-[10px] opacity-75 font-mono">{branch.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className="text-[10px] font-mono font-medium text-slate-400 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
              {college.code}
            </span>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">
            Menu
          </div>
          {primaryItems.map(renderNavItem)}

          {coordinatorItems.length > 0 && (
            <>
              <div className="pt-3 pb-1 px-2 border-t border-white/[0.06] text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400 mt-2">
                Coordinator
              </div>
              {coordinatorItems.map(renderNavItem)}
            </>
          )}

          {profileItem && (
            <div className="pt-2 mt-1">
              {renderNavItem(profileItem)}
            </div>
          )}
        </nav>

        {/* Unified Bottom-Left Sidebar Footer */}
        <div className="p-3 border-t border-white/[0.08] bg-[#111827] pb-12">
          {/* Minimal Log out Action */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN CANVAS WRAPPER (offset on desktop by 240px)                       */}
      {/* ========================================================================= */}
      <div className="flex-1 lg:pl-[240px] flex flex-col min-w-0 pb-16 lg:pb-0">
        
        {/* Top Header (Locked to 56px / h-14 with 1px Hairline Border) */}
        <header className="h-14 border-b border-white/[0.08] bg-[#111827] sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between select-none">
          
          {/* Breadcrumb Hierarchy */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <CollabexLogo variant="dark" size="sm" iconOnly className="lg:hidden shrink-0" />
            <span className="text-sm font-semibold text-white tracking-tight font-heading truncate">
              {displayTitle}
            </span>
            {displayBreadcrumb && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" strokeWidth={1.75} />
                <span className="text-xs font-normal text-slate-400 truncate hidden sm:inline">
                  {displayBreadcrumb}
                </span>
              </>
            )}
          </div>

          {/* Center/Right Actions: Command Search + Dark Status Pill + Notifications */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Global Command Search (⌘K) */}
            <button
              type="button"
              onClick={() => setShowCommandPalette(true)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 text-xs px-2.5 sm:px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors cursor-pointer group"
              title="Search campus or jump to... (⌘K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" strokeWidth={1.75} />
              <span className="hidden md:inline text-xs font-sans">Search or jump to...</span>
              <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 border border-white/10 text-slate-300">
                ⌘K
              </kbd>
            </button>

            {/* Context-Aware Dark-Mode Status Pill */}
            {currentPersona.role === "SuperAdmin" ? (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-mono text-[11px] tabular-nums text-slate-200">
                  Production • ap-south-1
                </span>
              </div>
            ) : (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-slate-200">
                <Calendar className="w-3 h-3 text-emerald-400 shrink-0" strokeWidth={1.75} />
                <span className="font-mono text-[11px] tabular-nums text-slate-200">
                  {cycle.academicYear} • Minor Sem {cycle.semester}
                </span>
              </div>
            )}

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="h-4 w-4" strokeWidth={1.75} />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </button>

              {/* Notification Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-white/10 bg-[#1F2937] shadow-2xl p-3 z-50 space-y-2 text-white animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                    <span className="text-xs font-bold text-white font-heading">Notifications</span>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                  <div className="divide-y divide-white/[0.04] max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="py-2 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">{n.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-tight">{n.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Logout Button (< 1024px) */}
            <button
              type="button"
              onClick={handleLogout}
              className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              title="Log out"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
              <span>Log out</span>
            </button>


          </div>
        </header>

        {/* Main Content Area (Protected by Centralized RouteGuard) */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1200px] w-full mx-auto space-y-6">
          <RouteGuard>{children}</RouteGuard>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 3. MOBILE FIXED BOTTOM TAB BAR (< 768px, 64px height, max 4 tabs)         */}
      {/* ========================================================================= */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-[#111827] border-t border-white/[0.08] z-40 flex items-center justify-around px-2 select-none shadow-lg">
        {navItems.slice(0, currentPersona.role === "SuperAdmin" ? 5 : 4).map((item) => {
          const Icon = item.icon;
          const isActive = currentActiveTab === item.label || pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              prefetch={true}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition-colors relative",
                isActive
                  ? "text-emerald-400 font-semibold"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn("h-4 w-4 mb-1", isActive ? "text-emerald-400" : "text-slate-500")}
                  strokeWidth={1.75}
                />
                {item.count !== undefined && item.count > 0 && (
                  <span className="absolute -top-1 -right-2 text-[8px] font-mono font-bold px-1 rounded-full bg-emerald-500 text-white leading-none">
                    {item.count}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[56px] text-center">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ========================================================================= */}
      {/* 4. GLOBAL COMMAND PALETTE MODAL                                           */}
      {/* ========================================================================= */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
    </div>
  );
};
