"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  ArrowRight,
  RotateCcw,
  LogOut,
  User,
  UserCheck,
} from "lucide-react";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { RoleType } from "@/mocks/store-types";
import { getCommandPaletteItems, getRouteIcon } from "@/navigation";

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
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
  const {
    currentPersona,
    switchPersona,
    resetToDefaults,
    teams,
    departments,
    facultyRoster,
    tenants,
  } = useProjectHubStore();
  const [query, setQuery] = useState("");

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

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

  // Retrieve strictly role-scoped navigation routes, actions, and entities from centralized navigation engine
  const baseItems = getCommandPaletteItems(
    currentPersona.role,
    {
      teams,
      departments,
      facultyRoster,
      tenants,
    },
    currentPersona.isProjectCoordinator
  );

  // Prefetch reachable routes on command palette open for instantaneous SPA transitions
  useEffect(() => {
    if (isOpen) {
      baseItems.forEach((item) => {
        if (item.path) {
          router.prefetch(item.path);
        }
      });
    }
  }, [isOpen, baseItems, router]);

  // Map to executable command items
  const allItems = [
    ...baseItems.map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      category: item.category,
      icon: getRouteIcon(item.iconName),
      action: () => {
        if (item.path) {
          router.push(item.path);
        }
        onClose();
      },
    })),

    // Demo role switchers: only present in demo mode
    ...(isDemoMode
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

  const searchFilteredItems = query.trim()
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
              {(["Navigation", "Actions", "Entities", "Role Switch"] as const).map((cat) => {
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
            <span className="text-emerald-400 font-semibold">
              {formatRoleLabel(currentPersona.role)}
            </span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            RBAC Scoped • Project Hub Navigation Engine
          </span>
        </div>
      </div>
    </div>
  );
};
