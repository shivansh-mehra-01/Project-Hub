"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Compass,
  FileCheck2,
  FolderGit2,
  GraduationCap,
  LayoutDashboard,
  Layers,
  LogOut,
  RotateCcw,
  Sliders,
  Sparkles,
  User,
  Users2,
  X,
  Shield,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { RoleType } from "@/mocks/store-types";

export interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
  breadcrumb?: string;
  activeTab?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  pageTitle,
  breadcrumb,
  activeTab,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { currentPersona, college, cycle, switchPersona, resetToDefaults } =
    useProjectHubStore();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showMobileRoleMenu, setShowMobileRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Enforce strictly Emerald & Charcoal theme
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("projecthub_theme");
      document.documentElement.removeAttribute("data-theme");
    }
  }, []);

  // Auto-sync persona with route if accessed directly via URL
  React.useEffect(() => {
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

  // Simulated alerts
  const notifications = [
    {
      id: "n-1",
      title: "Friday Logbook Pending",
      time: "10 mins ago",
      desc: "Shivansh Mehra submitted Week 5 Logbook for review.",
    },
    {
      id: "n-2",
      title: "Proposal Ready for Sign-Off",
      time: "1 hour ago",
      desc: "Team 2026-CS-MIN-02 proposal approved by Guide.",
    },
    {
      id: "n-3",
      title: "NBA Attainment Updated",
      time: "Yesterday",
      desc: "PO3 attainment reached 81.4% (Exceeds Target).",
    },
  ];

  // Determine role-based navigation tabs (strictly max 4 primary tabs)
  const getNavItems = () => {
    switch (currentPersona.role) {
      case "SuperAdmin":
        return [
          { label: "Tenants", href: "/admin", icon: Building2 },
          { label: "Master Templates", href: "/admin/templates", icon: Layers },
          { label: "Subscriptions", href: "/admin/subscriptions", icon: Shield },
          { label: "Health & Telemetry", href: "/admin/health", icon: Sliders },
        ];
      case "CollegeAdmin":
        return [
          { label: "Overview", href: "/college", icon: LayoutDashboard },
          { label: "Departments & HODs", href: "/college/departments", icon: Users2 },
          { label: "Campus Settings", href: "/college/settings", icon: Sliders },
          { label: "Accreditation", href: "/college/compliance", icon: FileCheck2 },
        ];
      case "HOD":
        return [
          { label: "Overview", href: "/hod", icon: LayoutDashboard },
          { label: "Approvals Queue", href: "/hod/approvals", icon: FileCheck2 },
          { label: "NBA Criterion 2 & 3", href: "/hod/nba", icon: GraduationCap },
          { label: "Faculty Setup", href: "/hod/faculty", icon: Sliders },
        ];
      case "Faculty": {
        const baseItems = [
          { label: "Action Queue", href: "/faculty", icon: FileCheck2 },
          { label: "My Teams", href: "/faculty/teams", icon: Users2 },
          { label: "Live Viva Grading", href: "/faculty/evaluations", icon: GraduationCap },
        ];
        // Dynamic 4th Tab if ProjectCoordinator = true (User Refinement)
        if (currentPersona.isProjectCoordinator) {
          baseItems.push({
            label: "Batch Ops",
            href: "/coordinator",
            icon: Briefcase,
          });
        }
        return baseItems;
      }
      case "Student":
      case "TeamLead":
        return [
          { label: "Workspace", href: "/student", icon: FolderGit2 },
          { label: "Explore", href: "/student/explore", icon: Compass },
          { label: "Portfolio", href: "/student/portfolio", icon: GraduationCap },
          { label: "Profile", href: "/student/profile", icon: User },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const handleRoleSwitch = (role: RoleType) => {
    switchPersona(role);
    setShowRoleMenu(false);
    if (role === "SuperAdmin") router.push("/admin");
    else if (role === "CollegeAdmin") router.push("/college");
    else if (role === "HOD") router.push("/hod");
    else if (role === "Faculty") router.push("/faculty");
    else if (role === "Student" || role === "TeamLead") router.push("/student");
  };

  return (
    <div className="flex min-h-screen bg-canvas-bg">
      {/* ========================================================================= */}
      {/* 1. DESKTOP FIXED SIDEBAR (240px, Master Dark Anchor)                       */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex w-[240px] flex-col border-r border-shell-border bg-shell-bg text-shell-text fixed inset-y-0 z-30 select-none">
        {/* Brand & College Tenant Header */}
        <div className="h-16 flex items-center px-4 border-b border-shell-border gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-brand-primary flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0 font-heading">
            PH
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs text-shell-text tracking-tight truncate font-heading">
              {currentPersona.role === "SuperAdmin" ? "Project Hub • Platform Ops" : `${college.code} • Project Hub`}
            </span>
            <span className="text-[10px] text-shell-muted truncate">
              {currentPersona.role === "SuperAdmin"
                ? "Global Multi-Tenant Control"
                : currentPersona.departmentId
                ? "Dept. of CSE"
                : "Institutional Admin"}
            </span>
          </div>
        </div>

        {/* Current Role Identity Card */}
        <div className="px-3 pt-3 pb-2">
          <div className="p-2.5 rounded-lg bg-shell-surface border border-shell-border flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-shell-muted">
                Active Persona
              </span>
              <Badge variant="role" role={currentPersona.role} size="sm" dot />
            </div>
            <div className="text-xs font-semibold text-shell-text truncate font-heading">
              {currentPersona.name}
            </div>
            {currentPersona.enrollmentNumber && (
              <div className="font-mono text-[10px] text-shell-muted tabular-nums">
                USN: {currentPersona.enrollmentNumber}
              </div>
            )}
            {currentPersona.isProjectCoordinator && (
              <div className="text-[10px] font-medium text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800 w-fit">
                ★ Coordinator Authority
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs (Max 4 per role) */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-shell-muted">
            Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.label || pathname === item.href;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-brand-primary text-white font-semibold shadow-xs"
                    : "text-shell-muted hover:bg-shell-surface hover:text-shell-text"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-shell-muted")} strokeWidth={1.75} />
                <span className="truncate">{item.label}</span>
                {item.label === "Batch Ops" && (
                  <span className="ml-auto text-[9px] bg-emerald-900 text-emerald-200 font-bold px-1.5 py-0.2 rounded font-mono">
                    ON
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Persona Switcher Quick Dock & Controls */}
        <div className="p-3 border-t border-shell-border space-y-2 bg-shell-bg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-shell-muted">
              Switch Persona
            </span>
            <button
              type="button"
              onClick={resetToDefaults}
              title="Reset Campus Mock Data"
              className="text-shell-muted hover:text-emerald-400 text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="h-3 w-3" strokeWidth={1.75} />
              <span>Reset</span>
            </button>
          </div>

          {/* Quick Persona Selector Dropdown Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-shell-border bg-shell-surface text-xs font-medium text-shell-text hover:bg-shell-surface/80 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 truncate">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.75} />
                <span className="truncate">{currentPersona.role}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-shell-muted" strokeWidth={1.75} />
            </button>

            {/* Persona Switcher Menu Popover */}
            {showRoleMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-shell-border bg-shell-surface shadow-xl p-1.5 z-50 space-y-0.5 text-xs">
                {(
                  [
                    "SuperAdmin",
                    "CollegeAdmin",
                    "HOD",
                    "Faculty",
                    "Student",
                    "TeamLead",
                  ] as RoleType[]
                ).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleSwitch(r)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-md flex items-center justify-between cursor-pointer transition-colors",
                      currentPersona.role === r
                        ? "bg-brand-primary text-white font-semibold"
                        : "text-shell-muted hover:bg-shell-border/60 hover:text-shell-text"
                    )}
                  >
                    <span>{r}</span>
                    {currentPersona.role === r && <CheckCircle2 className="h-3.5 w-3.5 text-white" strokeWidth={2} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sign Out Link */}
          <Link
            href="/login"
            className="flex items-center gap-2 px-2 py-1 text-[11px] font-medium text-shell-muted hover:text-rose-400 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Sign Out / Change Account</span>
          </Link>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN CANVAS WRAPPER (offset on desktop by 240px)                       */}
      {/* ========================================================================= */}
      <div className="flex-1 lg:pl-[240px] flex flex-col min-w-0 pb-16 lg:pb-0">
        {/* Top Header (64px desktop / 56px mobile) */}
        <header className="h-14 lg:h-16 border-b border-topbar-border bg-topbar-bg sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between transition-colors duration-200">
          {/* Breadcrumb / Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-topbar-text truncate">
              {pageTitle || "Project Hub"}
            </span>
            {breadcrumb && (
              <>
                <span className="text-topbar-text/40">/</span>
                <span className="text-xs font-medium text-topbar-text/70 truncate hidden sm:inline">
                  {breadcrumb}
                </span>
              </>
            )}
          </div>

          {/* Center/Right Status Indicators & Notifications */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Context-Aware Status Indicator */}
            {currentPersona.role === "SuperAdmin" ? (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-primary-tint text-brand-primary-text border border-brand-primary-border">
                <span className="h-2 w-2 rounded-full bg-brand-primary animate-pulse" />
                <span className="font-mono font-medium text-[11px] tabular-nums">Production • ap-south-1</span>
              </div>
            ) : (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-topbar-bg/40 text-topbar-text/80 border border-topbar-border">
                <Calendar className="h-3.5 w-3.5 text-brand-primary" strokeWidth={1.75} />
                <span className="font-mono text-xs tabular-nums">{cycle.academicYear} • Minor Sem {cycle.semester}</span>
              </div>
            )}

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-topbar-text/70 hover:text-topbar-text hover:bg-topbar-text/10 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="h-4 w-4" strokeWidth={1.75} />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand-primary" />
              </button>

              {/* Notification Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-card-border bg-card-bg shadow-xl p-3 z-50 space-y-2 text-slate-800">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <span className="text-xs font-bold text-[#0F172A] font-heading">Notifications</span>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="text-[#94A3B8] hover:text-[#0F172A]"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                  <div className="divide-y divide-[#E2E8F0] max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="py-2 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#0F172A]">{n.title}</span>
                          <span className="text-[10px] text-[#94A3B8]">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-[#475569] leading-tight">{n.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Persona Switcher Button (< 1024px) */}
            <div className="relative lg:hidden">
              <button
                type="button"
                onClick={() => setShowMobileRoleMenu(!showMobileRoleMenu)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-topbar-border bg-topbar-bg/60 text-[11px] font-semibold text-topbar-text hover:bg-topbar-text/10 transition-colors cursor-pointer"
                title="Switch Persona"
              >
                <Sparkles className="h-3.5 w-3.5 text-brand-primary" strokeWidth={1.75} />
                <span className="truncate max-w-[80px]">{currentPersona.role}</span>
                <ChevronDown className="h-3 w-3 text-topbar-text/60" strokeWidth={1.75} />
              </button>

              {showMobileRoleMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#E2E8F0] bg-white shadow-xl p-2 z-50 space-y-1 text-xs text-slate-800">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-[#E2E8F0]">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                      Switch Persona
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        resetToDefaults();
                        setShowMobileRoleMenu(false);
                      }}
                      className="text-[10px] text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="h-2.5 w-2.5" strokeWidth={1.75} />
                      <span>Reset</span>
                    </button>
                  </div>
                  {(
                    [
                      "SuperAdmin",
                      "CollegeAdmin",
                      "HOD",
                      "Faculty",
                      "Student",
                      "TeamLead",
                    ] as RoleType[]
                  ).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        handleRoleSwitch(r);
                        setShowMobileRoleMenu(false);
                      }}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 rounded-md flex items-center justify-between cursor-pointer transition-colors",
                        currentPersona.role === r
                          ? "bg-brand-primary-tint text-brand-primary-text font-semibold"
                          : "text-[#475569] hover:bg-[#F1F5F9]"
                      )}
                    >
                      <span>{r}</span>
                      {currentPersona.role === r && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-brand-primary" strokeWidth={2} />
                      )}
                    </button>
                  ))}
                  <div className="pt-1 border-t border-[#E2E8F0]">
                    <Link
                      href="/login"
                      onClick={() => setShowMobileRoleMenu(false)}
                      className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-medium text-[#64748B] hover:text-[#DC2626] transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
                      <span>Sign Out</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar with Role Tag */}
            <div className="flex items-center gap-2 pl-2 border-l border-topbar-border">
              <div className="h-8 w-8 rounded-full bg-brand-primary-tint border border-brand-primary-border text-brand-primary flex items-center justify-center text-xs font-bold font-mono">
                {currentPersona.name.charAt(0)}
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-xs font-semibold text-topbar-text leading-none">
                  {currentPersona.name}
                </span>
                <span className="text-[10px] text-topbar-text/70 mt-0.5">
                  {currentPersona.role}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area (Max width 1200px) */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1200px] w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 3. MOBILE FIXED BOTTOM TAB BAR (< 768px, 64px height, max 4 tabs)         */}
      {/* ========================================================================= */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-white border-t border-[#E2E8F0] z-40 flex items-center justify-around px-2 select-none shadow-sm">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.label || pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-brand-primary font-semibold"
                  : "text-[#64748B] hover:text-[#0F172A]"
              )}
            >
              <Icon className={cn("h-4 w-4 mb-1", isActive ? "text-brand-primary" : "text-[#94A3B8]")} strokeWidth={1.75} />
              <span className="truncate max-w-[64px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

