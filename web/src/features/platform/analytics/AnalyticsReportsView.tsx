"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  CheckCircle2,
  Download,
  Search,
  FolderGit2,
  AlertCircle,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { platformApi } from "@/lib/api/platformApi";
import { PlatformAnalyticsOverviewDto } from "@/lib/api/types";
import { showToast } from "@/lib/toast";

function formatTimestamp(iso?: string | null): string {
  if (!iso) return "No activity yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return `"${s}"`;
}

export const AnalyticsReportsView: React.FC = () => {
  useDashboardHeader({
    title: "Analytics & Adoption",
  });

  const [analytics, setAnalytics] = useState<PlatformAnalyticsOverviewDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    platformApi
      .getAnalytics(range)
      .then((data) => {
        if (!active) return;
        setAnalytics(data);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || "Failed to load platform analytics.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [range]);

  const filteredColleges = useMemo(() => {
    const list = analytics?.colleges ?? [];
    const q = searchTerm.trim().toLowerCase();
    return list.filter((c) => {
      const statusLabel = c.isActive ? "Active" : "Inactive";
      if (statusFilter !== "All" && statusLabel !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.tenantCode.toLowerCase().includes(q)
      );
    });
  }, [analytics, searchTerm, statusFilter]);

  const handleExportCsv = () => {
    if (!analytics) {
      showToast("Analytics data is not loaded yet.", "warning");
      return;
    }

    const rows = [
      ["College Name", "College Code", "Status", "Departments", "Faculty", "Active Students", "Active Projects", "Completed Projects", `Logbooks (${range})`, "Last Activity UTC"].map(escapeCsvCell).join(","),
      ...filteredColleges.map((c) =>
        [
          c.name,
          c.tenantCode,
          c.isActive ? "Active" : "Inactive",
          c.departmentCount ?? 0,
          c.facultyCount ?? 0,
          c.activeStudents,
          c.activeProjects,
          c.completedProjects ?? 0,
          c.logbooksInRange ?? 0,
          c.lastActivityAtUtc ?? "",
        ]
          .map(escapeCsvCell)
          .join(",")
      ),
    ];

    const csv = rows.join("\n");
    const filename = `Colabex_Platform_Usage_${range}_${new Date().toISOString().slice(0, 10)}.csv`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${filteredColleges.length} college record(s) to ${filename}.`, "success");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Analytics &amp; Adoption</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Live platform-wide institutional counts and college usage across Colabex.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            aria-label="Date range filter"
            value={range}
            onChange={(e) => setRange(e.target.value as "7d" | "30d" | "90d" | "all")}
            className="px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-hidden"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All Time</option>
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isLoading || !analytics}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Usage CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Core Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/platform/colleges"
          className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Colleges</span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {isLoading ? "—" : (analytics?.totalColleges ?? 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Onboarded institutions</p>
          </div>
        </Link>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Colleges</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {isLoading ? "—" : (analytics?.activeColleges ?? 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Active tenant workspaces</p>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Registered Students</span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {isLoading ? "—" : (analytics?.registeredStudents ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Total student accounts</p>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Projects</span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {isLoading ? "—" : (analytics?.activeProjects ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Non-archived project teams</p>
          </div>
        </div>
      </div>

      {/* Adoption Velocity Strip (Real DB-backed activity in selected range) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-500">Active Users ({range})</span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
            {isLoading ? "—" : (analytics?.activeUsersInRange ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-500">Faculty &amp; HODs</span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
            {isLoading ? "—" : (analytics?.activeFaculty ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-500">Weekly Logbooks ({range})</span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
            {isLoading ? "—" : (analytics?.weeklyLogbooksInRange ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-500">Viva Evaluations ({range})</span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
            {isLoading ? "—" : (analytics?.evaluationsInRange ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* College-wise Platform Usage */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">College-wise Platform Usage</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Real-time student, project, and login activity per onboarded college.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search college name or code..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 focus:bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "All" | "Active" | "Inactive")}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">College Name</th>
                <th className="py-3 px-4">Depts</th>
                <th className="py-3 px-4">Faculty</th>
                <th className="py-3 px-4">Active Students</th>
                <th className="py-3 px-4">Active / Done Projects</th>
                <th className="py-3 px-4">Logbooks ({range})</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                    Loading platform usage...
                  </td>
                </tr>
              ) : filteredColleges.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700 text-xs">
                      {analytics?.totalColleges === 0 ? "No colleges onboarded yet" : "No matching colleges"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {analytics?.totalColleges === 0
                        ? "Onboard an institution from the Colleges console to view usage metrics here."
                        : "Adjust your search query or status filter."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredColleges.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{c.tenantCode}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{c.departmentCount ?? 0}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{c.facultyCount ?? 0}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{c.activeStudents}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {c.activeProjects} <span className="text-slate-400">/ {c.completedProjects ?? 0}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{c.logbooksInRange ?? 0}</td>
                    <td className="py-3.5 px-4 text-slate-500">{formatTimestamp(c.lastActivityAtUtc)}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
                          c.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
