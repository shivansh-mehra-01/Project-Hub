"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  LifeBuoy,
  HeartPulse,
  Search,
  User,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Lock,
  X,
  FileText,
  Check,
  Paperclip,
  ShieldCheck,
  Building2,
  Server,
  Database,
  KeyRound,
  HardDrive,
  Activity,
  Mail,
  HelpCircle,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import {
  usePlatformData,
  SupportTicketRecord,
  ServiceHealthRecord,
  PlatformIncidentRecord,
} from "../data/platformDataStore";
import { showToast } from "@/lib/toast";

export const SystemSupportView: React.FC = () => {
  const {
    services,
    alerts,
    incidents,
    tickets,
    adminUsers,
    replySupportTicket,
    updateTicketStatus,
    updateTicketPriority,
    assignSupportTicket,
    resolveSupportTicket,
  } = usePlatformData();

  useDashboardHeader({
    title: "System & Support",
    breadcrumb: "Operations / System & Support",
  });

  const searchParams = useSearchParams();
  const paramTab = searchParams.get("tab") || searchParams.get("section");
  const paramStatus = searchParams.get("status");
  const paramTicketId = searchParams.get("ticketId");

  // Top Section Switcher: Support Tickets vs System Health
  const [activeSection, setActiveSection] = useState<"tickets" | "health">(
    paramTab === "health" ? "health" : "tickets"
  );

  // =========================================================================
  // SUPPORT TICKETS: STATE & FILTERS
  // =========================================================================
  const [ticketSearch, setTicketSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(
    paramStatus === "Open" || paramStatus === "In Progress" || paramStatus === "Resolved"
      ? paramStatus
      : "All"
  );
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [collegeFilter, setCollegeFilter] = useState<string>("All");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("All");

  // Ticket Detail Drawer
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(paramTicketId || null);
  const [replyMode, setReplyMode] = useState<"reply" | "note">("reply");
  const [replyMessage, setReplyMessage] = useState("");

  // Resolve Ticket Confirmation Modal
  const [ticketToResolve, setTicketToResolve] = useState<SupportTicketRecord | null>(null);
  const [resolutionInputNotes, setResolutionInputNotes] = useState("");

  // Derive selected ticket
  const selectedTicket = useMemo(() => {
    return tickets.find((t) => t.id === selectedTicketId) || null;
  }, [tickets, selectedTicketId]);

  // Derive filter lists
  const uniqueColleges = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => {
      if (t.institutionName) set.add(t.institutionName);
    });
    return Array.from(set).sort();
  }, [tickets]);

  const uniqueAssignees = useMemo(() => {
    const names = new Set<string>();
    adminUsers.forEach((u) => {
      if (u.name) names.add(u.name);
    });
    tickets.forEach((t) => {
      if (t.assignedAgent && t.assignedAgent !== "Unassigned") {
        names.add(t.assignedAgent);
      }
    });
    return Array.from(names).sort();
  }, [adminUsers, tickets]);

  // Overview 4 Compact Status Indicators
  const ticketStats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === "Open").length;
    const inProgress = tickets.filter((t) => t.status === "In Progress").length;
    const resolved = tickets.filter((t) => t.status === "Resolved" || t.status === "Closed").length;
    return { total, open, inProgress, resolved };
  }, [tickets]);

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    const q = ticketSearch.toLowerCase().trim();
    return tickets.filter((t) => {
      const matchesSearch =
        !q ||
        t.ticketNumber?.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Resolved"
          ? t.status === "Resolved" || t.status === "Closed"
          : t.status === statusFilter);

      const matchesPriority = priorityFilter === "All" || t.priority === priorityFilter;

      const matchesCollege = collegeFilter === "All" || t.institutionName === collegeFilter;

      const matchesAssignee =
        assigneeFilter === "All" ||
        (assigneeFilter === "Unassigned"
          ? !t.assignedAgent || t.assignedAgent === "Unassigned"
          : t.assignedAgent === assigneeFilter);

      return matchesSearch && matchesStatus && matchesPriority && matchesCollege && matchesAssignee;
    });
  }, [tickets, ticketSearch, statusFilter, priorityFilter, collegeFilter, assigneeFilter]);

  // Handle Send Message (Reply to College or Internal Note)
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    const isInternal = replyMode === "note";
    replySupportTicket(selectedTicket.id, replyMessage.trim(), isInternal);
    setReplyMessage("");
  };

  // Handle Confirm Ticket Resolution
  const handleConfirmResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketToResolve) return;
    if (!resolutionInputNotes.trim()) {
      showToast("Please provide resolution notes explaining how the issue was resolved.", "error");
      return;
    }

    resolveSupportTicket(ticketToResolve.id, resolutionInputNotes.trim());
    setTicketToResolve(null);
    setResolutionInputNotes("");
  };

  // Date formatter
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr.replace(" ", "T"));
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: SupportTicketRecord["status"]) => {
    switch (status) {
      case "Open":
        return "bg-amber-50 text-amber-800 border border-amber-200";
      case "In Progress":
        return "bg-blue-50 text-blue-800 border border-blue-200";
      case "Resolved":
        return "bg-emerald-50 text-emerald-800 border border-emerald-200";
      case "Closed":
        return "bg-slate-100 text-slate-700 border border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border border-slate-200";
    }
  };

  // Priority Badge Helper
  const getPriorityBadge = (priority: SupportTicketRecord["priority"]) => {
    switch (priority) {
      case "Urgent":
        return "bg-rose-50 text-rose-700 border border-rose-200";
      case "High":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "Normal":
      case "Medium":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "Low":
      default:
        return "bg-slate-100 text-slate-700 border border-slate-200";
    }
  };

  // Service Icon Helper (Essential 6 services only)
  const getServiceIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "backend api":
        return <Server className="w-4 h-4 text-slate-700" />;
      case "database":
        return <Database className="w-4 h-4 text-slate-700" />;
      case "authentication":
        return <KeyRound className="w-4 h-4 text-slate-700" />;
      case "file storage":
        return <HardDrive className="w-4 h-4 text-slate-700" />;
      case "background workers":
        return <Activity className="w-4 h-4 text-slate-700" />;
      case "email service":
        return <Mail className="w-4 h-4 text-slate-700" />;
      default:
        return <Server className="w-4 h-4 text-slate-700" />;
    }
  };

  // Filter Essential 6 services
  const essentialServices = useMemo(() => {
    const targetNames = [
      "backend api",
      "database",
      "authentication",
      "file storage",
      "background workers",
      "email service",
    ];
    return services.filter((s) => targetNames.includes(s.serviceName.toLowerCase()));
  }, [services]);

  // Overall platform status
  const platformOverallStatus = useMemo<"Operational" | "Degraded" | "Major Outage">(() => {
    if (alerts.length > 0) {
      const hasCritical = alerts.some((a) => a.severity === "Critical");
      return hasCritical ? "Major Outage" : "Degraded";
    }
    const hasDegraded = essentialServices.some(
      (s) => s.status === "Degraded" || s.status === "Down" || s.status === "Outage"
    );
    if (hasDegraded) return "Degraded";
    return "Operational";
  }, [alerts, essentialServices]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ======================================================================= */}
      {/* 1. TOP SECTION NAVIGATION: SUPPORT TICKETS & SYSTEM HEALTH              */}
      {/* ======================================================================= */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveSection("tickets")}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeSection === "tickets"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <LifeBuoy className="w-4 h-4" />
            Support Tickets
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {ticketStats.open + ticketStats.inProgress} Active
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("health")}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeSection === "health"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            System Health
            <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Operational
            </span>
          </button>
        </nav>
      </div>

      {/* ======================================================================= */}
      {/* SECTION ONE: SUPPORT TICKETS                                            */}
      {/* ======================================================================= */}
      {activeSection === "tickets" && (
        <div className="space-y-5">
          {/* Header */}
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Support Tickets</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage support requests from affiliated colleges.
            </p>
          </div>

          {/* Overview: Exactly 4 compact status indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Tickets
              </span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">{ticketStats.total}</div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
              <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
                Open
              </span>
              <div className="text-xl font-bold font-mono text-amber-700 mt-1">{ticketStats.open}</div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
              <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
                In Progress
              </span>
              <div className="text-xl font-bold font-mono text-blue-700 mt-1">{ticketStats.inProgress}</div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                Resolved
              </span>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-1">{ticketStats.resolved}</div>
            </div>
          </div>

          {/* Compact Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs space-y-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Search by Ticket ID or Subject */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  placeholder="Search by ticket ID or subject..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 focus:border-slate-900 bg-white"
                />
                {ticketSearch && (
                  <button
                    onClick={() => setTicketSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-800 font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-800 font-medium"
              >
                <option value="All">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>

              {/* College Filter */}
              <select
                value={collegeFilter}
                onChange={(e) => setCollegeFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-800 font-medium max-w-xs truncate"
              >
                <option value="All">All Colleges</option>
                {uniqueColleges.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>

              {/* Assigned To Filter */}
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-800 font-medium"
              >
                <option value="All">All Assignees</option>
                <option value="Unassigned">Unassigned</option>
                {uniqueAssignees.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ticket Table (Strictly 8 Columns) */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Ticket ID</th>
                    <th className="py-2.5 px-3">Subject &amp; Category</th>
                    <th className="py-2.5 px-3">College</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Assigned To</th>
                    <th className="py-2.5 px-3">Last Updated</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-500 text-xs">
                        <LifeBuoy className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                        <p className="font-semibold text-slate-700">No support tickets found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Try adjusting your active search query or filters.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* 1. Ticket ID */}
                        <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {t.ticketNumber || t.id}
                        </td>

                        {/* 2. Subject & Category */}
                        <td className="py-3 px-3 max-w-xs">
                          <span className="font-semibold text-slate-900 block truncate">{t.subject}</span>
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                            {t.category}
                          </span>
                        </td>

                        {/* 3. College */}
                        <td className="py-3 px-3">
                          <span className="font-medium text-slate-800 block truncate max-w-xs">
                            {t.institutionName}
                          </span>
                          {t.collegeCode && (
                            <span className="text-[10px] font-mono text-slate-500">
                              {t.collegeCode}
                            </span>
                          )}
                        </td>

                        {/* 4. Priority */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${getPriorityBadge(
                              t.priority
                            )}`}
                          >
                            {t.priority}
                          </span>
                        </td>

                        {/* 5. Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${getStatusBadge(
                              t.status
                            )}`}
                          >
                            {t.status}
                          </span>
                        </td>

                        {/* 6. Assigned To */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={t.assignedAgent === "Unassigned" ? "text-slate-400 italic" : "font-medium text-slate-800"}>
                            {t.assignedAgent || "Unassigned"}
                          </span>
                        </td>

                        {/* 7. Last Updated */}
                        <td className="py-3 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                          {formatDate(t.updatedAt || t.createdAt)}
                        </td>

                        {/* 8. Action */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTicketId(t.id);
                              setReplyMode("reply");
                              setReplyMessage("");
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors"
                          >
                            View Ticket
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* SECTION TWO: SYSTEM HEALTH                                              */}
      {/* ======================================================================= */}
      {activeSection === "health" && (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Health</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitor the operational status of Colabex platform services.
            </p>
          </div>

          {/* Overall Platform Status: One compact overview */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md ${
                    platformOverallStatus === "Operational"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : platformOverallStatus === "Degraded"
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      platformOverallStatus === "Operational"
                        ? "bg-emerald-500"
                        : platformOverallStatus === "Degraded"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                  />
                  {platformOverallStatus}
                </span>
                <span className="text-xs text-slate-700 font-medium">
                  {platformOverallStatus === "Operational"
                    ? "All monitored platform services are operational. No college-facing degradations detected."
                    : platformOverallStatus === "Degraded"
                    ? "Some platform services are experiencing degraded performance."
                    : "A major platform service interruption is currently active."}
                </span>
              </div>

              <span className="text-[11px] font-mono text-slate-400">
                Automated monitoring active
              </span>
            </div>
          </div>

          {/* Essential Services (Only Backend API, Database, Authentication, File Storage, Background Workers, Email Service) */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Essential Platform Services
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Service Name</th>
                    <th className="py-2.5 px-4">Current Status</th>
                    <th className="py-2.5 px-4 text-right">Last Checked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {essentialServices.map((s) => (
                    <tr key={s.serviceName} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded bg-slate-100">
                            {getServiceIcon(s.serviceName)}
                          </div>
                          <span>{s.serviceName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Operational
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-500 text-[11px]">
                        {s.lastChecked}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Incidents: Display only when actual active incidents exist; otherwise small clean empty state */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Active Incidents
              </h2>
            </div>

            <div className="p-4">
              {alerts.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>No active incidents. All monitored services are operational.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((al) => (
                    <div
                      key={al.id}
                      className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{al.title}</span>
                        <span className="px-2 py-0.2 text-[10px] font-bold rounded bg-amber-200 text-amber-900">
                          {al.currentStatus}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                        <span>Affected Service: <strong>{al.affectedService}</strong></span>
                        <span>Start Time: <strong>{al.startTime}</strong></span>
                        <span>Impact: <strong>{al.impact}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Incident History: Compact historical list */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Recent Incident History
              </h2>
            </div>

            <div className="divide-y divide-slate-100">
              {incidents.map((inc) => (
                <div key={inc.id} className="p-3.5 hover:bg-slate-50/50 transition-colors text-xs space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-semibold text-slate-900">{inc.title}</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Duration: <strong className="text-slate-700">{inc.duration}</strong> &bull; {inc.date || formatDate(inc.startTime)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                    <span>Service: <strong>{inc.affectedService}</strong></span>
                    <span>Resolution: {inc.resolutionSummary || inc.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TICKET DETAILS SLIDE-OVER DRAWER / PANEL                                */}
      {/* ======================================================================= */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-150">
            {/* Header & Meta */}
            <div>
              <div className="p-4 border-b border-slate-200 bg-slate-50/80">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                        {selectedTicket.ticketNumber || selectedTicket.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded ${getPriorityBadge(
                          selectedTicket.priority
                        )}`}
                      >
                        {selectedTicket.priority} Priority
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded ${getStatusBadge(
                          selectedTicket.status
                        )}`}
                      >
                        {selectedTicket.status}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-slate-900 mt-2 leading-snug">
                      {selectedTicket.subject}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Category: <strong className="text-slate-700">{selectedTicket.category}</strong> &bull; Submitted {selectedTicket.createdAt}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedTicketId(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* College Information Card */}
              <div className="p-4 border-b border-slate-200 bg-white">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  College &amp; Requester Information
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">College</span>
                    <span className="font-semibold text-slate-900">{selectedTicket.institutionName}</span>
                    {selectedTicket.collegeCode && (
                      <span className="text-[10px] font-mono text-slate-500 block">
                        Code: {selectedTicket.collegeCode}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Official Contact</span>
                    <span className="font-semibold text-slate-900">{selectedTicket.requesterName}</span>
                    <span className="text-slate-500 block text-[11px] truncate">
                      {selectedTicket.requesterEmail}
                    </span>
                    {selectedTicket.requesterDesignation && (
                      <span className="text-[10px] text-slate-500 block">
                        {selectedTicket.requesterDesignation}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ticket Controls: Status, Priority, Assigned Admin */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Ticket Management Controls
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  {/* Status Dropdown */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Status</label>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as any;
                        if (newStatus === "Resolved") {
                          setTicketToResolve(selectedTicket);
                          setResolutionInputNotes(selectedTicket.resolutionNotes || "");
                        } else {
                          updateTicketStatus(selectedTicket.id, newStatus);
                        }
                      }}
                      className="w-full text-xs border border-slate-300 rounded p-1.5 bg-white font-medium"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  {/* Priority Dropdown */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Priority</label>
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => updateTicketPriority(selectedTicket.id, e.target.value as any)}
                      className="w-full text-xs border border-slate-300 rounded p-1.5 bg-white font-medium"
                    >
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Normal">Normal</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  {/* Assigned Super Admin */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Assigned Admin</label>
                    <select
                      value={selectedTicket.assignedAgent || "Unassigned"}
                      onChange={(e) => assignSupportTicket(selectedTicket.id, e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded p-1.5 bg-white font-medium truncate"
                    >
                      <option value="Unassigned">Unassigned</option>
                      {uniqueAssignees.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Description & Attachments */}
              <div className="p-4 border-b border-slate-200 bg-white space-y-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Issue Description
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200">
                    {selectedTicket.description || selectedTicket.conversation[0]?.message}
                  </p>
                </div>

                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Attachments ({selectedTicket.attachments.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedTicket.attachments.map((att) => (
                        <div
                          key={att.name}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded text-xs text-slate-700 font-mono"
                        >
                          <Paperclip className="w-3 h-3 text-slate-500" />
                          <span>{att.name}</span>
                          <span className="text-[10px] text-slate-400">({att.size})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution Notes (if ticket is resolved or closed) */}
                {selectedTicket.resolutionNotes && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between text-emerald-900 font-bold">
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Resolution Notes
                      </span>
                      {selectedTicket.resolvedAt && (
                        <span className="font-mono text-[10px] font-normal text-emerald-700">
                          Resolved {selectedTicket.resolvedAt}
                        </span>
                      )}
                    </div>
                    <p className="text-emerald-950 leading-relaxed">
                      {selectedTicket.resolutionNotes}
                    </p>
                  </div>
                )}
              </div>

              {/* Conversation History */}
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Conversation History ({selectedTicket.conversation.length})
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {selectedTicket.conversation.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg text-xs space-y-1 transition-all ${
                        msg.isInternalNote
                          ? "bg-amber-50 border border-amber-200 text-amber-950"
                          : msg.isStaff
                          ? "bg-slate-100 border border-slate-200 text-slate-900 ml-4"
                          : "bg-white border border-slate-200 text-slate-900 mr-4"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 font-semibold">
                          {msg.isInternalNote ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-200/80 px-1.5 py-0.2 rounded">
                              <Lock className="w-2.5 h-2.5" />
                              Internal Note &bull; Private
                            </span>
                          ) : msg.isStaff ? (
                            <span className="text-slate-800">
                              {msg.sender} (Support Staff)
                            </span>
                          ) : (
                            <span className="text-slate-800">
                              {msg.sender} (College Contact)
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">{msg.timestamp}</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Action Area: Reply / Internal Note Form */}
            <div className="p-4 border-t border-slate-200 bg-white space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReplyMode("reply")}
                    className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                      replyMode === "reply"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Reply to College
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplyMode("note")}
                    className={`px-3 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1 ${
                      replyMode === "note"
                        ? "bg-amber-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Lock className="w-3 h-3" />
                    Internal Note
                  </button>
                </div>

                {selectedTicket.status !== "Resolved" && selectedTicket.status !== "Closed" && (
                  <button
                    type="button"
                    onClick={() => {
                      setTicketToResolve(selectedTicket);
                      setResolutionInputNotes("");
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200"
                  >
                    Resolve Ticket
                  </button>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="space-y-2">
                <textarea
                  rows={2}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder={
                    replyMode === "reply"
                      ? "Write a reply visible to the college requester..."
                      : "Write an internal note visible only to support staff..."
                  }
                  className={`w-full text-xs border rounded p-2 focus:outline-none ${
                    replyMode === "note"
                      ? "border-amber-300 bg-amber-50/20 focus:border-amber-500"
                      : "border-slate-300 focus:border-slate-900"
                  }`}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {replyMode === "note"
                      ? "Internal notes are never dispatched to the college."
                      : "Replies are delivered to the requester's official contact."}
                  </span>
                  <button
                    type="submit"
                    disabled={!replyMessage.trim()}
                    className={`px-3.5 py-1.5 text-xs font-semibold text-white rounded transition-colors disabled:opacity-40 ${
                      replyMode === "note"
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-slate-900 hover:bg-slate-800"
                    }`}
                  >
                    {replyMode === "note" ? "Save Internal Note" : "Send Reply"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* RESOLUTION CONFIRMATION MODAL                                           */}
      {/* ======================================================================= */}
      {ticketToResolve && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5 border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Resolve Support Ticket</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Resolving ticket #{ticketToResolve.ticketNumber} for {ticketToResolve.institutionName}.
              </p>
            </div>

            <form onSubmit={handleConfirmResolve} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Resolution Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionInputNotes}
                  onChange={(e) => setResolutionInputNotes(e.target.value)}
                  placeholder="Summarize the action taken to resolve this institutional request..."
                  className="w-full text-xs border border-slate-300 rounded p-2 focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTicketToResolve(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                >
                  Confirm &amp; Resolve Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
