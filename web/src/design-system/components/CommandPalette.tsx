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
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { currentPersona, switchPersona, resetToDefaults } = useProjectHubStore();
  const [query, setQuery] = useState("");

  // Keyboard shortcut listener for Cmd+K / Ctrl+K & Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open is handled by parent via isOpen
        }
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allItems: CommandItem[] = [
    // Common Navigation
    {
      id: "nav-student-workspace",
      title: "Student Sprint Workspace",
      subtitle: "Kanban board & Friday log submissions",
      category: "Navigation",
      icon: FolderGit2,
      action: () => {
        router.push("/student");
        onClose();
      },
    },
    {
      id: "nav-student-explore",
      title: "Explore Problem Statements",
      subtitle: "UN SDG initiatives & open student projects",
      category: "Navigation",
      icon: Compass,
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
      action: () => {
        router.push("/student/portfolio");
        onClose();
      },
    },
    {
      id: "nav-faculty-queue",
      title: "Faculty Action Queue",
      subtitle: "Pending student submissions & guide reviews",
      category: "Navigation",
      icon: FileCheck2,
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
      action: () => {
        router.push("/coordinator");
        onClose();
      },
    },
    {
      id: "nav-hod-overview",
      title: "Department Overview",
      subtitle: "HOD dashboard & batch progression funnel",
      category: "Navigation",
      icon: Building2,
      action: () => {
        router.push("/hod");
        onClose();
      },
    },
    {
      id: "nav-hod-nba",
      title: "NBA Criterion 2 & 3 Dossier",
      subtitle: "Direct attainment matrix & examination marksheet",
      category: "Navigation",
      icon: Layers,
      action: () => {
        router.push("/hod/nba");
        onClose();
      },
    },
    {
      id: "nav-college-overview",
      title: "College Campus Overview",
      subtitle: "Branch KPIs, intake quotas & SAR score",
      category: "Navigation",
      icon: Building2,
      action: () => {
        router.push("/college");
        onClose();
      },
    },
    {
      id: "nav-superadmin-tenants",
      title: "SuperAdmin Tenants",
      subtitle: "Global tenant partitioning & database telemetry",
      category: "Navigation",
      icon: Shield,
      action: () => {
        router.push("/admin");
        onClose();
      },
    },
    {
      id: "nav-superadmin-audit",
      title: "SuperAdmin Audit Logs",
      subtitle: "Immutable platform governance & security audit trail",
      category: "Navigation",
      icon: ShieldAlert,
      action: () => {
        router.push("/admin/audit");
        onClose();
      },
    },
    // Role Switchers (Quick Sandbox Access)
    {
      id: "role-student",
      title: "Switch to Student Lead",
      subtitle: "Persona: Shivansh Mehra (Sem 8)",
      category: "Role Switch",
      icon: User,
      action: () => {
        switchPersona("TeamLead");
        router.push("/student");
        onClose();
      },
    },
    {
      id: "role-faculty",
      title: "Switch to Faculty Guide",
      subtitle: "Persona: Prof. Verma",
      category: "Role Switch",
      icon: User,
      action: () => {
        switchPersona("Faculty");
        router.push("/faculty");
        onClose();
      },
    },
    {
      id: "role-hod",
      title: "Switch to HOD (CSE)",
      subtitle: "Persona: Dr. R. K. Sharma",
      category: "Role Switch",
      icon: User,
      action: () => {
        switchPersona("HOD");
        router.push("/hod");
        onClose();
      },
    },
    {
      id: "role-college",
      title: "Switch to College Admin",
      subtitle: "Persona: Principal Office",
      category: "Role Switch",
      icon: User,
      action: () => {
        switchPersona("CollegeAdmin");
        router.push("/college");
        onClose();
      },
    },
    {
      id: "role-superadmin",
      title: "Switch to Super Admin",
      subtitle: "Persona: Platform Ops",
      category: "Role Switch",
      icon: User,
      action: () => {
        switchPersona("SuperAdmin");
        router.push("/admin");
        onClose();
      },
    },
    // Actions
    {
      id: "action-reset",
      title: "Reset Campus Mock Data",
      subtitle: "Restore default SISTec sample records",
      category: "Actions",
      icon: RotateCcw,
      action: () => {
        resetToDefaults();
        onClose();
      },
    },
    {
      id: "action-signout",
      title: "Sign Out / Change Account",
      subtitle: "Return to institutional credentials portal",
      category: "Actions",
      icon: LogOut,
      action: () => {
        router.push("/login");
        onClose();
      },
    },
  ];

  const filteredItems = query.trim()
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

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
            placeholder="Search screens, roles, or quick jump... (Esc to exit)"
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
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching destinations or commands found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <>
              {/* Group by category */}
              {(["Navigation", "Role Switch", "Actions"] as const).map((cat) => {
                const groupItems = filteredItems.filter((i) => i.category === cat);
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

        {/* Footer info bar */}
        <div className="px-4 py-2 border-t border-white/[0.08] bg-[#0F172A] flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 font-mono text-[10px]">
            <span>Active Persona:</span>
            <span className="text-emerald-400 font-semibold">{currentPersona.role}</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Navigation Hub • Project Hub
          </span>
        </div>
      </div>
    </div>
  );
};
