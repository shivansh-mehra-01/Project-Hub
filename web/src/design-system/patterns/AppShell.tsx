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
  Menu,
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
import { getAuthToken, hodApi } from "@/lib/api";
import { CommandPalette, formatRoleLabel } from "../components/CommandPalette";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { RoleType } from "@/mocks/store-types";
import { getSidebarNav, getBreadcrumbs, PUBLIC_ROUTES, RouteGuard, SidebarNavItem } from "@/navigation";
import { LogoutConfirmationModal, PendingActionsDrawer } from "@/features/platform/shared/GlobalPlatformModals";

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

export interface HeaderConfig {
  title?: string;
  breadcrumb?: string;
}

export const DashboardHeaderContext = React.createContext<{
  header: HeaderConfig | null;
  setHeader: (config: HeaderConfig | null) => void;
}>({
  header: null,
  setHeader: () => {},
});

export const useDashboardHeader = (config?: HeaderConfig) => {
  const { setHeader } = useContext(DashboardHeaderContext);
  useEffect(() => {
    if (config?.title || config?.breadcrumb) {
      setHeader(config);
    }
  }, [config?.title, config?.breadcrumb, setHeader]);
  return { setHeader };
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
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig | null>(null);

  // If already mounted within an outer AppShell (e.g. from DashboardLayout), pass children through cleanly
  if (isInsideShell) {
    return <>{children}</>;
  }

  return (
    <AppShellContext.Provider value={true}>
      <DashboardHeaderContext.Provider value={{ header: headerConfig, setHeader: setHeaderConfig }}>
        <AppShellInner
          pageTitle={headerConfig?.title || pageTitle}
          breadcrumb={headerConfig?.breadcrumb || breadcrumb}
          activeTab={activeTab}
        >
          {children}
        </AppShellInner>
      </DashboardHeaderContext.Provider>
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
  const { currentPersona, isAuthenticated, isLoaded, college, cycle, academicSessions, tenants, pilotRequests, teams, logout } =
    useProjectHubStore();

  const activeSessionLabel =
    academicSessions?.find((s) => s.isActive)?.label || academicSessions?.[0]?.label || "2026–2027";

  // Derive effective role from pathname for deterministic SSR hydration alignment
  const effectiveRole = (() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/platform")) return "SuperAdmin";
    if (pathname.startsWith("/college")) return "CollegeAdmin";
    if (pathname.startsWith("/hod")) return "HOD";
    if (pathname.startsWith("/coordinator") || pathname.startsWith("/faculty")) return "Faculty";
    return currentPersona.role;
  })();

  const displayPersonaName = currentPersona?.name || "User";

  const [realHodPendingCount, setRealHodPendingCount] = useState<number | null>(null);

  useEffect(() => {
    if (effectiveRole === "HOD" && getAuthToken()) {
      hodApi
        .getDashboard()
        .then((dash) => {
          if (dash) {
            const total =
              (dash.pendingProposals || 0) +
              (dash.pendingGradeUnlocks || 0) +
              (dash.pendingExceptions || 0);
            setRealHodPendingCount(total);
          }
        })
        .catch(() => {});
    }
  }, [effectiveRole, pathname]);

  const pendingHODCount = realHodPendingCount ?? 0;

  const [showNotifications, setShowNotifications] = useState(false);
  const [showCampusMenu, setShowCampusMenu] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("Gandhi Nagar (Main)");

  // Close mobile drawer on route navigation
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  // Drawer Escape key listener and body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileDrawerOpen) {
        setIsMobileDrawerOpen(false);
      }
    };

    if (isMobileDrawerOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileDrawerOpen]);

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

  // Role-scoped notifications (strictly isolated by role & team with deep-linking paths)
  const allNotifications = (() => {
    if (effectiveRole === "Student" || effectiveRole === "TeamLead") {
      return [
        {
          id: "n-s1",
          title: "Weekly Logbook Accepted",
          time: "10 mins ago",
          desc: "Guide Prof. S. K. Verma approved Week 5 Logbook with remarks for Team 2026-CS-MIN-01.",
          path: "/student?subtab=logs",
        },
        {
          id: "n-s2",
          title: "Sprint Task Due",
          time: "2 hours ago",
          desc: "Task 'ESP32 firmware OTA integration' is due tomorrow for Team 2026-CS-MIN-01.",
          path: "/student?subtab=tasks",
        },
        {
          id: "n-s3",
          title: "Mid-Term Defense Scheduled",
          time: "Yesterday",
          desc: "Team 2026-CS-MIN-01 evaluation panel confirmed for May 04 at 10:30 AM (Room Lab-3).",
          path: "/student?subtab=evaluations",
        },
      ];
    }
    if (effectiveRole === "Faculty") {
      return [
        {
          id: "n-f1",
          title: "Friday Logbook Pending",
          time: "10 mins ago",
          desc: "Shivansh Mehra submitted Week 5 Logbook for review (Team 2026-CS-MIN-01).",
          path: "/faculty",
        },
        {
          id: "n-f2",
          title: "Mid-Term Evaluation Panel",
          time: "2 hours ago",
          desc: "You are assigned to evaluate 3 Minor project teams in Lab-3.",
          path: "/faculty/evaluations",
        },
      ];
    }
    if (effectiveRole === "HOD") {
      return [
        {
          id: "n-h1",
          title: "Proposal Ready for Sign-Off",
          time: "1 hour ago",
          desc: "Team 2026-CS-MIN-03 guide allotment approved by Coordinator.",
          path: "/hod/approvals?subtab=allotments",
        },
        {
          id: "n-h2",
          title: "Department Evaluation Summary Ready",
          time: "Yesterday",
          desc: "Semester project evaluations and grade summaries are ready for review.",
          path: "/hod/reports",
        },
      ];
    }
    if (effectiveRole === "CollegeAdmin") {
      return [
        {
          id: "n-c1",
          title: "Department Tracks Active",
          time: "2 hours ago",
          desc: "CSE & ECE departments have active project tracks and guide allocations.",
          path: "/college/departments",
        },
        {
          id: "n-c2",
          title: "Directory Sync Complete",
          time: "1 day ago",
          desc: "1,280 student enrollments validated for AY 2025-26 Even Sem.",
          path: "/college/settings",
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
        path: "/platform/colleges",
      },
      {
        id: "n-a2",
        title: "Onboarding Application Received",
        time: "3 hours ago",
        desc: "New college submitted institutional onboarding application.",
        path: "/platform/colleges?status=Pending Review",
      },
    ];
  })();

  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const unreadNotifications = allNotifications.filter((n) => !readNotificationIds.includes(n.id));
  const unreadCount = unreadNotifications.length;

  const campuses: Array<{ id: string; name: string; code: string }> = [
    { id: "campus-01", name: "Gandhi Nagar (Main)", code: "GN" },
    { id: "campus-02", name: "Ratibad Campus", code: "RB" },
  ];

  // Render static badge (matching HOD/Faculty/Student) for single-tenant CollegeAdmin unless multiple campuses are explicitly configured
  const isCollegeAdminMultiCampus = false;

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
    effectiveRole,
    liveBadgeCounts,
    currentPersona.isProjectCoordinator
  );

  const breadcrumbsInfo = getBreadcrumbs(pathname, effectiveRole);
  const displayTitle = pageTitle || breadcrumbsInfo.pageTitle;
  const displayBreadcrumb = breadcrumb || breadcrumbsInfo.breadcrumb;
  const currentActiveTab = activeTab;

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPendingDrawer, setShowPendingDrawer] = useState(false);

  const SUPER_ADMIN_SECTIONS = [
    "WORKSPACE",
    "MANAGEMENT",
    "OPERATIONS",
    "ACCOUNT",
  ] as const;

  const primaryItems = navItems.filter((i) => i.section !== "COORDINATOR" && i.label !== "Profile" && i.label !== "My Profile");
  const coordinatorItems = navItems.filter((i) => i.section === "COORDINATOR");
  const profileItem = navItems.find((i) => i.label === "Profile" || i.label === "My Profile");

  const renderNavItem = (item: SidebarNavItem) => {
    const Icon = item.icon;
    const isProfileItem = item.label === "Profile" || item.label === "My Profile";
    const isLogoutItem = item.label === "Logout" || item.href === "/platform/logout";
    const isActive =
      currentActiveTab === item.label ||
      pathname === item.href ||
      (isProfileItem &&
        (currentActiveTab === "Account" ||
          pathname === "/account" ||
          pathname === "/platform/account/profile" ||
          pathname === "/student/profile"));

    if (isLogoutItem) {
      return (
        <button
          key={item.label}
          type="button"
          onClick={() => setShowLogoutModal(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer text-left"
        >
          <Icon className="h-4 w-4 shrink-0 text-rose-400" strokeWidth={1.75} />
          <span className="truncate">{item.label}</span>
        </button>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href}
        prefetch={true}
        className={cn(
          "group flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-xl transition-all duration-150 relative select-none",
          isActive
            ? "bg-emerald-600 text-white font-semibold shadow-xs shadow-emerald-950/30 border border-emerald-500/30"
            : "text-slate-300/90 hover:bg-white/[0.07] hover:text-white"
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-105",
            isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
          )}
          strokeWidth={isActive ? 2.2 : 1.75}
        />
        <span className="truncate tracking-[-0.01em]">{item.label}</span>
        {item.count !== undefined && item.count > 0 && (
          <span
            className={cn(
              "ml-auto text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full",
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

  const renderMobileNavItem = (item: SidebarNavItem) => {
    const Icon = item.icon;
    const isProfileItem = item.label === "Profile" || item.label === "My Profile";
    const isLogoutItem = item.label === "Logout" || item.href === "/platform/logout";
    const isActive =
      currentActiveTab === item.label ||
      pathname === item.href ||
      (isProfileItem &&
        (currentActiveTab === "Account" ||
          pathname === "/account" ||
          pathname === "/platform/account/profile" ||
          pathname === "/student/profile"));

    if (isLogoutItem) {
      return (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            setIsMobileDrawerOpen(false);
            setShowLogoutModal(true);
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 min-h-[44px] text-xs font-medium rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer text-left"
        >
          <Icon className="h-4 w-4 shrink-0 text-rose-400" strokeWidth={1.75} />
          <span className="truncate">{item.label}</span>
        </button>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href}
        prefetch={true}
        onClick={() => setIsMobileDrawerOpen(false)}
        className={cn(
          "group flex items-center gap-3 px-3 py-2.5 min-h-[44px] text-[13px] font-medium rounded-xl transition-all duration-150",
          isActive
            ? "bg-emerald-600 text-white font-semibold shadow-xs shadow-emerald-950/30 border border-emerald-500/30"
            : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
        )}
      >
        <Icon
          className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-slate-400")}
          strokeWidth={isActive ? 2.2 : 1.75}
        />
        <span className="truncate tracking-[-0.01em]">{item.label}</span>
        {item.count !== undefined && item.count > 0 && (
          <span
            className={cn(
              "ml-auto text-[10px] font-mono font-bold px-2 py-0.5 rounded-full",
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
    router.replace("/login");
  };

  // Back-Forward Cache (bfcache) protection:
  // If page is restored from bfcache or navigated back/forward without a valid token,
  // immediately purge memory state and hard-replace to /login.
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      const token = getAuthToken();
      if ((event.persisted || !token) && !token) {
        logout();
        window.location.replace("/login");
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [logout]);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (!isPublicRoute && isLoaded && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isPublicRoute, isLoaded, isAuthenticated, router]);

  if (!isPublicRoute && (!isLoaded || !isAuthenticated)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-slate-600 select-none">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin text-emerald-700" />
          <span className="text-xs text-slate-600 font-mono">
            Restoring authenticated workspace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-canvas-bg">
      {/* ========================================================================= */}
      {/* 1. DESKTOP FIXED SIDEBAR (256px, Dark L-Frame Anchor)                     */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-white/[0.08] bg-[#111827] text-white fixed inset-y-0 z-30 select-none">
        
        {/* Top-Left Brand Lockup & Multi-Campus Switcher (Locked to 56px / h-14) */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.08] relative">
          <CollabexLogo variant="dark" size="sm" />

          {effectiveRole === "SuperAdmin" ? (
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
                <span className="font-semibold text-white">{college?.code || "SISTEC"}</span>
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
            <span
              suppressHydrationWarning
              className="text-[10px] font-mono font-medium text-slate-400 px-1.5 py-0.5 rounded bg-white/5 border border-white/10"
            >
              {effectiveRole === "CollegeAdmin"
                ? college?.code || "SISTEC"
                : effectiveRole === "Student" || effectiveRole === "TeamLead"
                  ? [college?.code, currentPersona?.departmentCode].filter(Boolean).join(" • ") || "Student"
                  : `${college?.code || "SISTEC"} • CSE`}
            </span>
          )}
        </div>

        {/* Navigation Tabs */}
        {/* Navigation Tabs */}
        <nav className="flex-1 px-3 py-2.5 space-y-1.5 overflow-y-auto">
          {effectiveRole === "SuperAdmin" ? (
            <div className="space-y-0.5">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                Platform Console
              </div>
              {primaryItems.map(renderNavItem)}
              {profileItem && (
                <div className="pt-2 mt-2 border-t border-white/[0.08]">
                  {renderNavItem(profileItem)}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 select-none">
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
            </>
          )}
        </nav>

        {/* Unified Bottom-Left Sidebar Footer */}
        <div className="p-3 border-t border-white/[0.08] bg-[#111827]">
          {/* User Profile Mini Block */}
          <Link
            href={effectiveRole === "SuperAdmin" ? "/platform/account/profile" : "/account"}
            className={cn(
              "px-3 py-2.5 mb-2 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5 hover:bg-white/[0.08] transition-colors group cursor-pointer",
              (pathname === "/platform/account/profile" || pathname === "/account") && "border-brand-primary/50 bg-white/[0.08]"
            )}
            title="My Profile & Security Settings"
          >
            <div
              suppressHydrationWarning
              className="w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0"
            >
              {getAvatarInitials(displayPersonaName)}
            </div>
            <div className="min-w-0 flex-1">
              <p suppressHydrationWarning className="text-xs font-semibold text-white truncate group-hover:text-emerald-400 transition-colors">
                {displayPersonaName}
              </p>
              <p suppressHydrationWarning className="text-[11px] text-slate-400 truncate">
                {getRoleSubtitle(effectiveRole, currentPersona.isProjectCoordinator)}
              </p>
            </div>
          </Link>

          {/* Minimal Log out Action */}
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN CANVAS WRAPPER (offset on desktop by 256px / lg:pl-64)             */}
      {/* ========================================================================= */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        
        {/* Top Header (Locked to 56px / h-14 with 1px Hairline Border) */}
        <header className="h-14 border-b border-white/[0.08] bg-[#111827] sticky top-0 z-20 px-3 sm:px-6 flex items-center justify-between select-none">
          
          {/* Breadcrumb Hierarchy & Mobile Menu Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            {/* Mobile / Tablet Drawer Toggle Button (44x44px touch target) */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer mr-0.5 shrink-0"
            >
              <Menu className="w-5 h-5" strokeWidth={1.75} />
            </button>

            <CollabexLogo variant="dark" size="sm" className="lg:hidden shrink-0" />
            <span className="hidden sm:inline-block lg:hidden h-3.5 w-px bg-white/20" />
            <span className="text-sm font-semibold text-white tracking-tight font-heading truncate max-w-[140px] sm:max-w-[240px] md:max-w-none">
              {displayTitle}
            </span>
            {displayBreadcrumb && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0 hidden sm:inline" strokeWidth={1.75} />
                <span className="text-xs font-normal text-slate-400 truncate hidden md:inline">
                  {displayBreadcrumb}
                </span>
              </>
            )}
          </div>

          {/* Center/Right Actions: Command Search + Status Pill + Notifications */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Global Command Search (⌘K) */}
            <button
              type="button"
              onClick={() => setShowCommandPalette(true)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 text-xs px-2 sm:px-3 py-1.5 min-h-[36px] sm:min-h-0 rounded-md flex items-center gap-2 transition-colors cursor-pointer group"
              title="Search campus or jump to... (⌘K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" strokeWidth={1.75} />
              <span className="hidden md:inline text-xs font-sans">Search or jump to...</span>
              <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 border border-white/10 text-slate-300">
                ⌘K
              </kbd>
            </button>

            {/* Context-Aware Dark-Mode Status Pill */}
            {effectiveRole === "SuperAdmin" ? (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-mono text-[11px] tabular-nums text-slate-200">
                  Production • ap-south-1
                </span>
              </div>
            ) : effectiveRole === "CollegeAdmin" ? (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-slate-200">
                <Calendar className="w-3 h-3 text-emerald-400 shrink-0" strokeWidth={1.75} />
                <span className="font-mono text-[11px] tabular-nums text-slate-200">
                  AY {activeSessionLabel}
                </span>
              </div>
            ) : effectiveRole === "Student" || effectiveRole === "TeamLead" ? (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-slate-200">
                <Calendar className="w-3 h-3 text-emerald-400 shrink-0" strokeWidth={1.75} />
                <span className="font-mono text-[11px] tabular-nums text-slate-200">
                  {cycle.semester > 0
                    ? `${cycle.academicYear || activeSessionLabel} • Sem ${cycle.semester}`
                    : cycle.academicYear
                      ? `AY ${cycle.academicYear} • ${currentPersona.academicStatus || "Not Enrolled"}`
                      : currentPersona.academicStatus || "Session Not Configured"}
                </span>
              </div>
            ) : (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-slate-200">
                <Calendar className="w-3 h-3 text-emerald-400 shrink-0" strokeWidth={1.75} />
                <span className="font-mono text-[11px] tabular-nums text-slate-200">
                  {cycle.academicYear || "2025–2026"} • Minor Sem {cycle.semester || "6"}
                </span>
              </div>
            )}

            {/* Super Admin Quick Actions / Pending Approvals Queue */}
            {effectiveRole === "SuperAdmin" && (
              <button
                type="button"
                onClick={() => setShowPendingDrawer(true)}
                title="Pending Approvals & Onboarding Queue"
                className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Layers className="h-4 w-4" strokeWidth={1.75} />
                <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              </button>
            )}

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" strokeWidth={1.75} />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
              </button>

              {/* Notification Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl border border-white/10 bg-[#1F2937] shadow-2xl p-3 z-50 space-y-2 text-white animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-heading">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setReadNotificationIds(allNotifications.map((n) => n.id))}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                        >
                          Mark all as read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowNotifications(false)}
                        className="text-slate-400 hover:text-white p-1 cursor-pointer"
                      >
                        <X className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-white/[0.04] max-h-64 overflow-y-auto">
                    {allNotifications.map((n) => {
                      const isRead = readNotificationIds.includes(n.id);
                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!isRead) {
                              setReadNotificationIds((prev) => [...prev, n.id]);
                            }
                            setShowNotifications(false);
                            if (n.path) router.push(n.path);
                          }}
                          className={cn(
                            "py-2 px-1.5 rounded-lg space-y-0.5 cursor-pointer transition-colors hover:bg-white/5",
                            isRead ? "opacity-60" : "opacity-100"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {!isRead && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                              )}
                              <span className="text-xs font-semibold text-white">{n.title}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-tight pl-3">{n.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Role Badge Indicator */}
            <span
              suppressHydrationWarning
              className="inline-flex items-center text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300"
            >
              {formatRoleLabel(effectiveRole)}
            </span>
          </div>
        </header>

        {/* Main Content Area (Protected by Centralized RouteGuard, Responsive Container) */}
        <main className="flex-1 min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7 max-w-[1440px] w-full mx-auto space-y-6">
          <RouteGuard>{children}</RouteGuard>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 3. MOBILE SLIDE-OVER NAVIGATION DRAWER (< 1024px)                         */}
      {/* ========================================================================= */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-Over Drawer Panel */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation drawer"
            className="relative w-72 max-w-[calc(100vw-3rem)] bg-[#111827] text-white flex flex-col h-full shadow-2xl z-10 border-r border-white/10 animate-in slide-in-from-left duration-200 select-none"
          >
            {/* Drawer Header (56px / h-14) */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.08]">
              <CollabexLogo variant="dark" size="sm" />
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            {/* Role & User Context Banner */}
            <div className="px-4 py-3 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p suppressHydrationWarning className="text-xs font-semibold text-white truncate">{displayPersonaName}</p>
                <p suppressHydrationWarning className="text-[10px] text-slate-400 font-mono truncate">
                  {getRoleSubtitle(effectiveRole, currentPersona.isProjectCoordinator)}
                </p>
              </div>
              <div
                suppressHydrationWarning
                className="w-7 h-7 rounded-full bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center text-emerald-400 font-bold text-xs font-mono shrink-0"
              >
                {getAvatarInitials(displayPersonaName)}
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex-1 px-3 py-3 space-y-2 overflow-y-auto">
              {effectiveRole === "SuperAdmin" ? (
                <div className="space-y-0.5">
                  <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                    Platform Console
                  </div>
                  {primaryItems.map(renderMobileNavItem)}
                  {profileItem && (
                    <div className="pt-2 mt-2 border-t border-white/[0.08]">
                      {renderMobileNavItem(profileItem)}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                    Menu
                  </div>
                  {primaryItems.map(renderMobileNavItem)}

                  {coordinatorItems.length > 0 && (
                    <>
                      <div className="pt-3 pb-1 px-2 border-t border-white/[0.06] text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400 mt-2">
                        Coordinator
                      </div>
                      {coordinatorItems.map(renderMobileNavItem)}
                    </>
                  )}

                  {profileItem && (
                    <div className="pt-2 mt-1 border-t border-white/[0.06]">
                      {renderMobileNavItem(profileItem)}
                    </div>
                  )}
                </>
              )}
            </nav>

            {/* Drawer Footer with Logout Button */}
            <div className="p-3 border-t border-white/[0.08] bg-[#111827]">
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  setShowLogoutModal(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 min-h-[44px] text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>Log out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. GLOBAL COMMAND PALETTE MODAL                                           */}
      {/* ========================================================================= */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />

      {/* Global Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        isSuperAdmin={effectiveRole === "SuperAdmin"}
        onConfirm={() => {
          setShowLogoutModal(false);
          logout();
          router.replace("/login");
        }}
      />

      <PendingActionsDrawer
        isOpen={showPendingDrawer}
        onClose={() => setShowPendingDrawer(false)}
        onNavigate={(path) => {
          setShowPendingDrawer(false);
          router.push(path);
        }}
      />
    </div>
  );
};
