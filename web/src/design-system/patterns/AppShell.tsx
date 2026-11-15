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
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* ========================================================================= */}
      {/* 1. DESKTOP FIXED SIDEBAR (240px, Dark Anchor #111827)                      */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex w-[240px] flex-col border-r border-[#1F2937] bg-[#111827] text-white fixed inset-y-0 z-30 select-none">
        {/* Brand & College Tenant Header */}
        <div className="h-16 flex items-center px-4 border-b border-[#1F2937] gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#047857] flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0 font-heading">
            PH
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs text-[#F9FAFB] tracking-tight truncate font-heading">
              {currentPersona.role === "SuperAdmin" ? "Project Hub • Platform Ops" : `${college.code} • Project Hub`}
            </span>
            <span className="text-[10px] text-[#9CA3AF] truncate">
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
          <div className="p-2.5 rounded-lg bg-[#1F2937] border border-[#374151] flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
                Active Persona
              </span>
              <Badge variant="role" role={currentPersona.role} size="sm" dot />
            </div>
            <div className="text-xs font-semibold text-[#F9FAFB] truncate font-heading">
              {currentPersona.name}
            </div>
            {currentPersona.enrollmentNumber && (
              <div className="font-mono text-[10px] text-[#9CA3AF] tabular-nums">
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
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
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
                    ? "bg-[#047857] text-[#F9FAFB] font-semibold shadow-xs"
                    : "text-[#9CA3AF] hover:bg-[#1F2937] hover:text-[#F9FAFB]"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#F9FAFB]" : "text-[#9CA3AF]")} strokeWidth={1.75} />
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
        <div className="p-3 border-t border-[#1F2937] space-y-2 bg-[#111827]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
              Switch Persona
            </span>
            <button
              type="button"
              onClick={resetToDefaults}
              title="Reset Campus Mock Data"
              className="text-[#9CA3AF] hover:text-emerald-400 text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
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
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-[#374151] bg-[#1F2937] text-xs font-medium text-white hover:bg-[#252F3F] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 truncate">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.75} />
                <span className="truncate">{currentPersona.role}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-[#9CA3AF]" strokeWidth={1.75} />
            </button>

            {/* Persona Switcher Menu Popover */}
            {showRoleMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-[#374151] bg-[#1F2937] shadow-xl p-1.5 z-50 space-y-0.5 text-xs">
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
                        ? "bg-[#047857] text-white font-semibold"
                        : "text-[#D1D5DB] hover:bg-[#374151] hover:text-white"
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
            className="flex items-center gap-2 px-2 py-1 text-[11px] font-medium text-[#64748B] hover:text-[#DC2626] transition-colors"
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
        <header className="h-14 lg:h-16 border-b border-[#E2E8F0] bg-white sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
          {/* Breadcrumb / Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-[#0F172A] truncate">
              {pageTitle || "Project Hub"}
            </span>
            {breadcrumb && (
              <>
                <span className="text-[#CBD5E1]">/</span>
                <span className="text-xs font-medium text-[#475569] truncate hidden sm:inline">
                  {breadcrumb}
                </span>
              </>
            )}
          </div>

          {/* Center/Right Status Indicators & Notifications */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Context-Aware Status Indicator */}
            {currentPersona.role === "SuperAdmin" ? (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                <span className="h-2 w-2 rounded-full bg-[#047857] animate-pulse" />
                <span className="font-mono font-medium text-[11px] tabular-nums">Production • ap-south-1</span>
              </div>
            ) : (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0]">
                <Calendar className="h-3.5 w-3.5 text-[#047857]" strokeWidth={1.75} />
                <span className="font-mono text-xs tabular-nums">{cycle.academicYear} • Minor Sem {cycle.semester}</span>
              </div>
            )}

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="h-4 w-4" strokeWidth={1.75} />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#047857]" />
              </button>

              {/* Notification Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-[#E2E8F0] bg-white shadow-xl p-3 z-50 space-y-2">
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
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                title="Switch Persona"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#047857]" strokeWidth={1.75} />
                <span className="truncate max-w-[80px]">{currentPersona.role}</span>
                <ChevronDown className="h-3 w-3 text-[#94A3B8]" strokeWidth={1.75} />
              </button>

              {showMobileRoleMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#E2E8F0] bg-white shadow-xl p-2 z-50 space-y-1 text-xs">
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
                      className="text-[10px] text-[#047857] hover:underline flex items-center gap-1 cursor-pointer"
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
                          ? "bg-[#ECFDF5] text-[#065F46] font-semibold"
                          : "text-[#475569] hover:bg-[#F1F5F9]"
                      )}
                    >
                      <span>{r}</span>
                      {currentPersona.role === r && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#047857]" strokeWidth={2} />
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
            <div className="flex items-center gap-2 pl-2 border-l border-[#E2E8F0]">
              <div className="h-8 w-8 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] flex items-center justify-center text-xs font-bold font-mono">
                {currentPersona.name.charAt(0)}
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-xs font-semibold text-[#0F172A] leading-none">
                  {currentPersona.name}
                </span>
                <span className="text-[10px] text-[#64748B] mt-0.5">
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
                  ? "text-[#047857] font-semibold"
                  : "text-[#64748B] hover:text-[#0F172A]"
              )}
            >
              <Icon className={cn("h-4 w-4 mb-1", isActive ? "text-[#047857]" : "text-[#94A3B8]")} strokeWidth={1.75} />
              <span className="truncate max-w-[64px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

