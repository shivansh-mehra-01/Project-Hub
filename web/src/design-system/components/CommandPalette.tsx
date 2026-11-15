"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  ArrowRight,
  FolderGit2,
  Building2,
  Layers,
  GraduationCap,
  Users2,
  Sliders,
  FileCheck2,
  Compass,
  User,
  Shield,
  ShieldAlert,
  RotateCcw,
  LogOut,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { RoleType } from "@/mocks/store-types";

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Navigation" | "Actions" | "Role Switch";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  allowedRoles?: RoleType[];
  coordinatorOnly?: boolean;
  action: () => void;
}

export const formatRoleLabel = (role: string): string => {
  switch (role) {
    case "SuperAdmin":
      return "Super Admin";
    case "CollegeAdmin":
      return "College Admin";
    case "HOD":
      return "Department HOD";
    case "Faculty":
      return "Faculty Guide";
    case "TeamLead":
      return "Team Lead";
    case "Student":
      return "Student Member";
    default:
      return role;
  }
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { currentPersona, switchPersona, resetToDefaults } = useProjectHubStore();
  const [query, setQuery] = useState("");

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

  // Keyboard shortcut listener for Cmd+K / Ctrl+K & Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Master command palette registry with strict RBAC scoping
  const allItems: CommandItem[] = [
    // 1. Student / TeamLead Scoped Navigation
    {
      id: "nav-student-workspace",
      title: "Student Sprint Workspace",
      subtitle: "Kanban sprint board & Friday log submissions",
      category: "Navigation",
      icon: FolderGit2,
      allowedRoles: ["Student", "TeamLead"],
      action: () => {
        router.push("/student");
        onClose();
      },
    },
    {
      id: "nav-student-explore",
      title: "Explore Campus Repository",
      subtitle: "Faculty problem bank & peer matching",
      category: "Navigation",
      icon: Compass,
      allowedRoles: ["Student", "TeamLead"],
      action: () => {
        router.push("/student/explore");
        onClose();
      },
    },
    {
      id: "nav-student-portfolio",
      title: "Verified Student Portfolio",
      subtitle: "Signed credentials & academic defense transcripts",
      category: "Navigation",
      icon: GraduationCap,
      allowedRoles: ["Student", "TeamLead"],
      action: () => {
        router.push("/student/portfolio");
        onClose();
      },
    },
    {
      id: "nav-student-profile",
      title: "Learner Academic Profile",
      subtitle: "University enrollment identity & VCS links",
      category: "Navigation",
      icon: User,
      allowedRoles: ["Student", "TeamLead"],
      action: () => {
        router.push("/student/profile");
        onClose();
      },
    },

    // 2. Faculty Scoped Navigation
    {
      id: "nav-faculty-queue",
      title: "Faculty Action Queue",
      subtitle: "Pending student submissions & guide reviews",
      category: "Navigation",
      icon: FileCheck2,
      allowedRoles: ["Faculty"],
      action: () => {
        router.push("/faculty");
        onClose();
      },
    },
    {
      id: "nav-faculty-teams",
      title: "Faculty Mentored Teams",
      subtitle: "Team repositories & weekly milestones",
      category: "Navigation",
      icon: Users2,
      allowedRoles: ["Faculty"],
      action: () => {
        router.push("/faculty/teams");
        onClose();
      },
    },
    {
      id: "nav-faculty-evaluations",
      title: "Live Viva Defense Grading",
      subtitle: "Interactive rubric scorecard & CO-PO mapping",
      category: "Navigation",
      icon: GraduationCap,
      allowedRoles: ["Faculty"],
      action: () => {
        router.push("/faculty/evaluations");
        onClose();
      },
    },
    {
      id: "nav-coordinator",
      title: "Batch Operations Console",
      subtitle: "Guide pairing, panel scheduler & CSV onboarding",
      category: "Navigation",
      icon: Sliders,
      allowedRoles: ["Faculty"],
      coordinatorOnly: true,
      action: () => {
        router.push("/coordinator");
        onClose();
      },
    },

    // 3. HOD Scoped Navigation
    {
      id: "nav-hod-overview",
      title: "Department Executive Overview",
      subtitle: "Cohort funnel & faculty mentorship matrix",
      category: "Navigation",
      icon: Building2,
      allowedRoles: ["HOD"],
      action: () => {
        router.push("/hod");
        onClose();
      },
    },
    {
      id: "nav-hod-approvals",
      title: "HOD Approvals & Endorsements",
      subtitle: "Guide allotments, grade unlock appeals & bulk sign-off",
      category: "Navigation",
      icon: FileCheck2,
      allowedRoles: ["HOD"],
      action: () => {
        router.push("/hod/approvals");
        onClose();
      },
    },
    {
      id: "nav-hod-nba",
      title: "NBA Criterion 2 & 3 Dossier",
      subtitle: "CO-PO attainment matrix & 9-sample portfolio package",
      category: "Navigation",
      icon: Layers,
      allowedRoles: ["HOD"],
      action: () => {
        router.push("/hod/nba");
        onClose();
      },
    },
    {
      id: "nav-hod-faculty",
      title: "Department Faculty Roster",
      subtitle: "Coordinator toggles & mentor capacity steppers",
      category: "Navigation",
      icon: Users2,
      allowedRoles: ["HOD"],
      action: () => {
        router.push("/hod/faculty");
        onClose();
      },
    },

    // 4. College Admin Scoped Navigation
    {
      id: "nav-college-overview",
      title: "Institutional Executive Overview",
      subtitle: "Campus KPIs, intake quotas & cycle governance",
      category: "Navigation",
      icon: Building2,
      allowedRoles: ["CollegeAdmin"],
      action: () => {
        router.push("/college");
        onClose();
      },
    },
    {
      id: "nav-college-departments",
      title: "Academic Branches & Leadership",
      subtitle: "Appointed HODs & departmental quotas",
      category: "Navigation",
      icon: Users2,
      allowedRoles: ["CollegeAdmin"],
      action: () => {
        router.push("/college/departments");
        onClose();
      },
    },
    {
      id: "nav-college-settings",
      title: "Campus Settings & Digital Seal",
      subtitle: "Principal digital seal, SSO & roster CSV sync",
      category: "Navigation",
      icon: Sliders,
      allowedRoles: ["CollegeAdmin"],
      action: () => {
        router.push("/college/settings");
        onClose();
      },
    },
    {
      id: "nav-college-compliance",
      title: "Institutional NBA Accreditation",
      subtitle: "Departmental sign-off matrix & SAR dossier exporter",
      category: "Navigation",
      icon: ShieldAlert,
      allowedRoles: ["CollegeAdmin"],
      action: () => {
        router.push("/college/compliance");
        onClose();
      },
    },

    // 5. Super Admin Scoped Navigation
    {
      id: "nav-superadmin-tenants",
      title: "SuperAdmin Tenants",
      subtitle: "Global college tenant partitioning & storage quotas",
      category: "Navigation",
      icon: Building2,
      allowedRoles: ["SuperAdmin"],
      action: () => {
        router.push("/admin");
        onClose();
      },
    },
    {
      id: "nav-superadmin-templates",
      title: "Master NBA Templates & Rubrics",
      subtitle: "AICTE / NBA criterion 2 & 3 schemas",
      category: "Navigation",
      icon: Layers,
      allowedRoles: ["SuperAdmin"],
      action: () => {
        router.push("/admin/templates");
        onClose();
      },
    },
    {
      id: "nav-superadmin-subscriptions",
      title: "Institutional Subscriptions & Pilots",
      subtitle: "Annual license plans & pending 90-day pilots",
      category: "Navigation",
      icon: Shield,
      allowedRoles: ["SuperAdmin"],
      action: () => {
        router.push("/admin/subscriptions");
        onClose();
      },
    },
    {
      id: "nav-superadmin-health",
      title: "Platform Health & Worker Telemetry",
      subtitle: "Database connections & Hangfire background workers",
      category: "Navigation",
      icon: Sliders,
      allowedRoles: ["SuperAdmin"],
      action: () => {
        router.push("/admin/health");
        onClose();
      },
    },
    {
      id: "nav-superadmin-audit",
      title: "Platform Governance & Audit Logs",
      subtitle: "Immutable security audit trail & tenant provisioning logs",
      category: "Navigation",
      icon: ShieldAlert,
      allowedRoles: ["SuperAdmin"],
      action: () => {
        router.push("/admin/audit");
        onClose();
      },
    },

    // 6. Universal Institutional Profile & Account Settings
    {
      id: "nav-institutional-account",
      title: "Profile & Institutional Credentials",
      subtitle: "Digital signature seal, employee ID & campus SSO",
      category: "Navigation",
      icon: User,
      allowedRoles: ["SuperAdmin", "CollegeAdmin", "HOD", "Faculty"],
      action: () => {
        router.push("/account");
        onClose();
      },
    },

    // 6. Role Switchers (Strictly isolated by current role)
    ...(isDemoMode
      ? currentPersona.role === "Student" || currentPersona.role === "TeamLead"
        ? [
            {
              id: "role-switch-lead",
              title: "Switch to Team Lead",
              subtitle: "Persona: Shivansh Mehra (Project Lead)",
              category: "Role Switch" as const,
              icon: UserCheck,
              action: () => {
                switchPersona("TeamLead");
                router.push("/student");
                onClose();
              },
            },
            {
              id: "role-switch-student",
              title: "Switch to Student Member",
              subtitle: "Persona: Aarav Sharma (Member)",
              category: "Role Switch" as const,
              icon: User,
              action: () => {
                switchPersona("Student");
                router.push("/student");
                onClose();
              },
            },
          ]
        : [
            {
              id: "role-switch-student",
              title: "Switch to Student Lead",
              subtitle: "Persona: Shivansh Mehra (Sem 8)",
              category: "Role Switch" as const,
              icon: User,
              action: () => {
                switchPersona("TeamLead");
                router.push("/student");
                onClose();
              },
            },
            {
              id: "role-switch-faculty",
              title: "Switch to Faculty Guide",
              subtitle: "Persona: Prof. S. K. Verma",
              category: "Role Switch" as const,
              icon: User,
              action: () => {
                switchPersona("Faculty");
                router.push("/faculty");
                onClose();
              },
            },
            {
              id: "role-switch-hod",
              title: "Switch to Department HOD",
              subtitle: "Persona: Dr. Ravindra Kumar Sharma (CSE)",
              category: "Role Switch" as const,
              icon: User,
              action: () => {
                switchPersona("HOD");
                router.push("/hod");
                onClose();
              },
            },
            {
              id: "role-switch-college",
              title: "Switch to College Admin",
              subtitle: "Persona: Dr. Keshvendra Choudhary (Principal Office)",
              category: "Role Switch" as const,
              icon: User,
              action: () => {
                switchPersona("CollegeAdmin");
                router.push("/college");
                onClose();
              },
            },
            {
              id: "role-switch-superadmin",
              title: "Switch to Super Admin",
              subtitle: "Persona: Platform Dev Startup Admin",
              category: "Role Switch" as const,
              icon: User,
              action: () => {
                switchPersona("SuperAdmin");
                router.push("/admin");
                onClose();
              },
            },
          ]
      : []),

    // 7. Global Actions
    ...(isDemoMode && currentPersona.role !== "Student" && currentPersona.role !== "TeamLead"
      ? [
          {
            id: "action-reset",
            title: "Reset Campus Mock Data",
            subtitle: "Restore default SISTec records and cycle configurations",
            category: "Actions" as const,
            icon: RotateCcw,
            action: () => {
              resetToDefaults();
              onClose();
            },
          },
        ]
      : []),
    {
      id: "action-signout",
      title: "Sign Out / Change Account",
      subtitle: "Return to institutional credentials portal",
      category: "Actions" as const,
      icon: LogOut,
      action: () => {
        router.push("/login");
        onClose();
      },
    },
  ];

  // RBAC Filtering: strictly restrict items based on active role
  const roleFilteredItems = allItems.filter((item) => {
    if (item.allowedRoles && !item.allowedRoles.includes(currentPersona.role)) {
      return false;
    }
    if (item.coordinatorOnly && !currentPersona.isProjectCoordinator) {
      return false;
    }
    return true;
  });

  const searchFilteredItems = query.trim()
    ? roleFilteredItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : roleFilteredItems;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#111827] text-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08] bg-[#161F30]">
          <Search className="h-4 w-4 text-emerald-400 shrink-0" strokeWidth={2} />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search screens, actions, or jump to... (Esc to exit)"
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-hidden font-sans"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-white/[0.04]">
          {searchFilteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching destinations or commands found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <>
              {(["Navigation", "Role Switch", "Actions"] as const).map((cat) => {
                const groupItems = searchFilteredItems.filter((i) => i.category === cat);
                if (groupItems.length === 0) return null;

                return (
                  <div key={cat} className="py-1">
                    <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                      {cat}
                    </div>
                    {groupItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.action}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left hover:bg-white/[0.06] hover:text-emerald-300 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 group-hover:text-emerald-400 text-slate-400 transition-colors">
                              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                                {item.title}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {item.subtitle}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer info bar with formatted role spacing */}
        <div className="px-4 py-2 border-t border-white/[0.08] bg-[#0F172A] flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 font-mono text-[10px]">
            <span>Active Persona:</span>
            <span className="text-emerald-400 font-semibold">{formatRoleLabel(currentPersona.role)}</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            RBAC Scoped • Project Hub
          </span>
        </div>
      </div>
    </div>
  );
};
