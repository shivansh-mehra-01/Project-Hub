"use client";

import React, { useState, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Lock,
  Laptop,
  Globe,
  Ban,
  CheckCircle2,
  Clock,
  RefreshCw,
  Eye,
  FileCheck2,
  AlertTriangle,
  User,
  X,
  ArrowRight,
  Info,
  Check,
  Calendar,
  AlertCircle,
  FileText,
  SlidersHorizontal,
  Download,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import {
  usePlatformData,
  ActiveSessionRecord,
  SecurityIncidentRecord,
  PlatformAuditLogItem,
} from "../data/platformDataStore";

// IST Date Formatter helper
function formatIST(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    // If it's like "2026-11-21 15:42:19", handle directly or via Date
    const parts = dateStr.split(" ");
    if (parts.length === 2 && parts[0].includes("-") && parts[1].includes(":")) {
      const [year, month, day] = parts[0].split("-");
      const [hours, minutes] = parts[1].split(":");
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];
      const mIdx = parseInt(month, 10) - 1;
      const mName = monthNames[mIdx] || month;
      const h = parseInt(hours, 10);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${day} ${mName} ${year}, ${String(h12).padStart(2, "0")}:${minutes} ${ampm} IST`;
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return (
      d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }) + " IST"
    );
  } catch {
    return dateStr;
  }
}

export const SecurityAuditView: React.FC = () => {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "audit" ? "audit" : "sessions";

  const {
    activeSessions,
    terminateSession,
    securityIncidents,
    auditLogs,
    failedLoginAttemptsCount,
  } = usePlatformData();

  useDashboardHeader({
    title: "Security & Audit",
  });

  // Top Tabs: Exactly two primary tabs
  const [activeTab, setActiveTab] = useState<"sessions" | "audit">(initialTab);

  // References for clicking summary cards
  const sessionsTableRef = useRef<HTMLDivElement>(null);
  const alertsSectionRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // SESSION REVOCATION MODAL STATE
  // ---------------------------------------------------------------------------
  const [sessionToRevoke, setSessionToRevoke] = useState<ActiveSessionRecord | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // ---------------------------------------------------------------------------
  // AUDIT LOG FILTERS & SEARCH
  // ---------------------------------------------------------------------------
  const [auditSearch, setAuditSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [resultFilter, setResultFilter] = useState<string>("All");
  const [adminFilter, setAdminFilter] = useState<string>("All");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("All");
  const [selectedAuditLog, setSelectedAuditLog] = useState<PlatformAuditLogItem | null>(null);

  // Unique list of actors for filter dropdown
  const uniqueActors = useMemo(() => {
    const names = new Set<string>();
    auditLogs.forEach((l) => {
      if (l.user) names.add(l.user);
    });
    return Array.from(names).sort();
  }, [auditLogs]);

  // Filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // Search term
      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase();
        const matchesUser = log.user.toLowerCase().includes(q) || log.userEmail.toLowerCase().includes(q);
        const matchesAction = log.action.toLowerCase().includes(q);
        const matchesResource = log.affectedResource.toLowerCase().includes(q);
        const matchesIp = log.ipAddress.includes(q);
        if (!matchesUser && !matchesAction && !matchesResource && !matchesIp) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== "All" && log.category !== categoryFilter) {
        return false;
      }

      // Result filter
      if (resultFilter !== "All" && log.result !== resultFilter) {
        return false;
      }

      // Admin filter
      if (adminFilter !== "All" && log.user !== adminFilter) {
        return false;
      }

      // Date range filter
      if (dateRangeFilter !== "All") {
        const logDate = new Date(log.timestamp.replace(" ", "T")).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        if (dateRangeFilter === "Today" && now - logDate > oneDay) {
          return false;
        }
        if (dateRangeFilter === "Last 7 Days" && now - logDate > 7 * oneDay) {
          return false;
        }
        if (dateRangeFilter === "Last 30 Days" && now - logDate > 30 * oneDay) {
          return false;
        }
      }

      return true;
    });
  }, [auditLogs, auditSearch, categoryFilter, resultFilter, adminFilter, dateRangeFilter]);

  const hasActiveFilters =
    auditSearch.trim() !== "" ||
    categoryFilter !== "All" ||
    resultFilter !== "All" ||
    adminFilter !== "All" ||
    dateRangeFilter !== "All";

  const clearAllFilters = () => {
    setAuditSearch("");
    setCategoryFilter("All");
    setResultFilter("All");
    setAdminFilter("All");
    setDateRangeFilter("All");
  };

  const handleConfirmRevoke = () => {
    if (!sessionToRevoke) return;
    setIsRevoking(true);
    try {
      terminateSession(sessionToRevoke.id);
      setSessionToRevoke(null);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Date & Time (IST)",
      "Administrator",
      "Email",
      "Action",
      "Category",
      "Affected Resource",
      "Result",
      "IP Address",
      "Details",
    ];
    const rows = filteredAuditLogs.map((log) => [
      `"${formatIST(log.timestamp)}"`,
      `"${log.user.replace(/"/g, '""')}"`,
      `"${log.userEmail.replace(/"/g, '""')}"`,
      `"${log.action.replace(/"/g, '""')}"`,
      `"${log.category.replace(/"/g, '""')}"`,
      `"${log.affectedResource.replace(/"/g, '""')}"`,
      `"${log.result.replace(/"/g, '""')}"`,
      `"${log.ipAddress}"`,
      `"${(log.details || "").replace(/"/g, '""')}"`,
    ]);
    const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `colabex-audit-log-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ===================================================================== */}
      {/* PAGE HEADER                                                           */}
      {/* ===================================================================== */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Security &amp; Audit</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Monitor administrator access, review security events and track important platform activities.
        </p>
      </div>

      {/* ===================================================================== */}
      {/* PRIMARY TAB NAVIGATION (Exactly Two Tabs)                            */}
      {/* ===================================================================== */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab("sessions")}
            className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "sessions"
                ? "border-emerald-600 text-emerald-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Active Sessions
            <span className="text-[11px] font-mono px-2 py-0.2 bg-emerald-50 text-emerald-800 rounded-full font-bold border border-emerald-100">
              {activeSessions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "audit"
                ? "border-emerald-600 text-emerald-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            Platform Audit Log
            <span className="text-[11px] font-mono px-2 py-0.2 bg-slate-100 text-slate-700 rounded-full font-semibold border border-slate-200">
              {auditLogs.length}
            </span>
          </button>
        </nav>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: ACTIVE SESSIONS                                                */}
      {/* ===================================================================== */}
      {activeTab === "sessions" && (
        <div className="space-y-6">
          {/* A. Compact Summary: Exactly 2 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1: Active Sessions */}
            <div
              onClick={() => sessionsTableRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Active Sessions</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100/80 transition-colors">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {activeSessions.length}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Currently valid platform administrator sessions
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  Live
                </span>
              </div>
            </div>

            {/* Card 2: Failed Login Attempts (24h) */}
            <div
              onClick={() => alertsSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Failed Login Attempts (24h)</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-100/80 transition-colors">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {failedLoginAttemptsCount}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Rate-limited or blocked authorization attempts
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Rate-Limited
                </span>
              </div>
            </div>
          </div>

          {/* B. Active Administrator Sessions Table */}
          <div
            ref={sessionsTableRef}
            className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Active Administrator Sessions</h2>
                <p className="text-xs text-slate-500">
                  Valid platform administrator access tokens currently in session
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {activeSessions.length} {activeSessions.length === 1 ? "Session" : "Sessions"}
              </span>
            </div>

            {activeSessions.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold text-slate-800">No active administrator sessions</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  All platform administrator tokens have expired or been revoked.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Administrator</th>
                      <th className="py-3 px-4">Device &amp; Browser</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Login Time (IST)</th>
                      <th className="py-3 px-4">Last Active</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeSessions.map((session, idx) => {
                      const isCurrent = idx === 0 && session.accountEmail === "admin@collabex.in";

                      return (
                        <tr key={session.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                  {session.accountName}
                                  {isCurrent && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                                      Current Session
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {session.accountEmail}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            <span>{session.device}</span>
                            <span className="text-slate-400 mx-1.5">&bull;</span>
                            <span className="text-slate-500">{session.browser}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700 text-xs">
                            {session.ipAddress}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                            {formatIST(session.loginTime)}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-800 font-medium text-[11px]">
                            {session.lastActiveTime}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSessionToRevoke(session)}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Revoke Session
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* C. Recent Security Alerts: Compact Section Inside Tab 1 */}
          <div
            ref={alertsSectionRef}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-slate-700" />
                  Recent Security Alerts
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitored security incidents and access anomalies requiring platform administrator awareness.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {securityIncidents.length} Monitored
              </span>
            </div>

            <div className="space-y-3">
              {securityIncidents.map((alert) => {
                const isCritical = alert.severity === "Critical";
                const isWarning = alert.severity === "Warning" || alert.severity === "High";

                return (
                  <div
                    key={alert.id}
                    className="p-3.5 bg-slate-50/60 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs">
                          {alert.incidentType}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 text-[10px] font-bold rounded border ${
                            isCritical
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : isWarning
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                          {alert.status}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatIST(alert.detectedAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {alert.details}
                      </p>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Target: <span className="font-medium text-slate-700">{alert.affectedAccount}</span>
                        {alert.institution && (
                          <span> &bull; Scope: {alert.institution}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: PLATFORM AUDIT LOG                                             */}
      {/* ===================================================================== */}
      {activeTab === "audit" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {/* Header & Subtitle */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Platform Audit Log</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Append-only historical record of administrative actions across the Colabex platform.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV ({filteredAuditLogs.length})
              </button>
              <span className="text-xs text-slate-400 font-mono">
                Showing {filteredAuditLogs.length} of {auditLogs.length} Records
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="p-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center gap-2.5 text-xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search action, user, resource..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Authentication">Authentication</option>
              <option value="Administrator Management">Administrator Management</option>
              <option value="College Management">College Management</option>
              <option value="Platform Management">Platform Management</option>
              <option value="Subscription Management">Subscription Management</option>
            </select>

            {/* Result Filter */}
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
            >
              <option value="All">All Results</option>
              <option value="Success">Success</option>
              <option value="Failure">Failure</option>
            </select>

            {/* Administrator Filter */}
            <select
              value={adminFilter}
              onChange={(e) => setAdminFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
            >
              <option value="All">All Administrators</option>
              {uniqueActors.map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>

            {/* Date Range Filter */}
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
            >
              <option value="All">All Time</option>
              <option value="Today">Today</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Table */}
          {filteredAuditLogs.length === 0 ? (
            <div className="py-14 px-4 text-center">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold text-slate-800">No audit events found</p>
              <p className="text-xs text-slate-500 mt-0.5">
                No events matched your current search and filter criteria.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="mt-3 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  Reset all filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date &amp; Time (IST)</th>
                    <th className="py-3 px-4">Administrator</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Affected Resource</th>
                    <th className="py-3 px-4">Result</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuditLogs.map((log) => {
                    const isSuccess = log.result === "Success";

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                          {formatIST(log.timestamp)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{log.user}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {log.userEmail}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {log.action}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded-md">
                            {log.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={log.affectedResource}>
                          {log.affectedResource}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                              isSuccess
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-rose-50 text-rose-800 border-rose-200"
                            }`}
                          >
                            {log.result}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedAuditLog(log)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* REVOKE SESSION CONFIRMATION MODAL                                    */}
      {/* ===================================================================== */}
      {sessionToRevoke && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-200">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {sessionToRevoke.accountEmail === "admin@collabex.in" &&
                  activeSessions[0]?.id === sessionToRevoke.id
                    ? "Revoke Current Active Session?"
                    : "Revoke Administrator Session?"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Session ID: <span className="font-mono">{sessionToRevoke.id}</span>
                </p>
              </div>
              <button
                onClick={() => setSessionToRevoke(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning Content */}
            <div className="space-y-3 text-xs">
              {sessionToRevoke.accountEmail === "admin@collabex.in" &&
              activeSessions[0]?.id === sessionToRevoke.id ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 leading-relaxed">
                  <strong>Warning:</strong> You are currently signed in with this session. Revoking it will invalidate your authentication credentials and immediately log you out of the Super Admin console.
                </div>
              ) : (
                <p className="text-slate-600 leading-relaxed">
                  Are you sure you want to terminate the active session for{" "}
                  <strong className="text-slate-900">{sessionToRevoke.accountName}</strong> (
                  {sessionToRevoke.accountEmail}) on {sessionToRevoke.device}?
                </p>
              )}

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-slate-600 text-[11px]">
                <div className="flex justify-between">
                  <span>Device &amp; Client:</span>
                  <span className="font-semibold text-slate-800">
                    {sessionToRevoke.device} ({sessionToRevoke.browser})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Client IP:</span>
                  <span className="font-mono text-slate-800">{sessionToRevoke.ipAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span>Logged in at:</span>
                  <span className="font-mono text-slate-800">{formatIST(sessionToRevoke.loginTime)}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                The session refresh token will be invalidated immediately across all platform endpoints. An audit log entry will be permanently appended.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSessionToRevoke(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRevoking}
                onClick={handleConfirmRevoke}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
              >
                {isRevoking ? "Revoking..." : "Revoke Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* AUDIT LOG INSPECT DETAILS DRAWER                                      */}
      {/* ===================================================================== */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
            onClick={() => setSelectedAuditLog(null)}
          />

          {/* Drawer Container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-100 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {selectedAuditLog.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                        selectedAuditLog.result === "Success"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}
                    >
                      {selectedAuditLog.result}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    {selectedAuditLog.action}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedAuditLog(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-5 overflow-y-auto space-y-5 text-xs">
                {/* Event Summary Box */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Category</span>
                    <span className="font-semibold text-slate-800">{selectedAuditLog.category}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Timestamp (IST)</span>
                    <span className="font-mono text-slate-800">{formatIST(selectedAuditLog.timestamp)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Client IP</span>
                    <span className="font-mono text-slate-800">{selectedAuditLog.ipAddress}</span>
                  </div>
                </div>

                {/* Administrator (Actor) */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Responsible Administrator
                  </h4>
                  <div className="p-3 border border-slate-200 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{selectedAuditLog.user}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{selectedAuditLog.userEmail}</div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded border border-slate-200">
                      Super Admin
                    </span>
                  </div>
                </div>

                {/* Affected Target / Resource */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Affected Resource
                  </h4>
                  <div className="p-3 border border-slate-200 rounded-lg font-medium text-slate-800">
                    {selectedAuditLog.affectedResource}
                  </div>
                </div>

                {/* Explanation Details */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Event Details
                  </h4>
                  <p className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg text-slate-700 leading-relaxed">
                    {selectedAuditLog.details}
                  </p>
                </div>

                {/* State Changes (Before & After) if present */}
                {selectedAuditLog.changes && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      State Changes
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-lg">
                        <span className="text-[10px] uppercase font-bold text-rose-700 block mb-1">
                          Before
                        </span>
                        <div className="font-mono text-[11px] text-slate-700">
                          {selectedAuditLog.changes.before || "None"}
                        </div>
                      </div>
                      <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                        <span className="text-[10px] uppercase font-bold text-emerald-700 block mb-1">
                          After
                        </span>
                        <div className="font-mono text-[11px] text-slate-700">
                          {selectedAuditLog.changes.after || "None"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Raw Metadata Details */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Metadata Parameters
                  </h4>
                  <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto leading-relaxed">
                    {selectedAuditLog.metadataJson}
                  </pre>
                </div>

                {/* Integrity Notice */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-[11px] flex items-start gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    Append-only platform audit record signed and timestamped at the platform gateway. Passwords, session tokens, and sensitive authentication credentials are strictly excluded from audit payloads.
                  </span>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedAuditLog(null)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-lg shadow-2xs transition-colors"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
