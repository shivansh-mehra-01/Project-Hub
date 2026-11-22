"use client";

import React, { useState } from "react";
import {
  LifeBuoy,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  MessageSquare,
  User,
  Send,
  Lock,
  Plus,
  BookOpen,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Modal } from "@/design-system/components/Modal";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { Input } from "@/design-system/components/Input";
import { Textarea } from "@/design-system/components/Textarea";
import { Select } from "@/design-system/components/Select";
import { usePlatformData, SupportTicketRecord } from "../data/platformDataStore";
import { showToast } from "@/lib/toast";

export const SupportCenterView: React.FC = () => {
  const { tickets, replySupportTicket, updateTicketStatus, adminUsers } = usePlatformData();

  // Active Category Tab
  const [activeTab, setActiveTab] = useState<"tickets" | "staff" | "categories" | "slas" | "kb">("tickets");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Viewing Ticket State
  const [viewingTicket, setViewingTicket] = useState<SupportTicketRecord | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);

  useDashboardHeader({
    title: "Support Center",
    breadcrumb: "Institutional Triage, Support SLAs & Technical Knowledge Base",
  });

  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status === "Open").length;
  const inProgressTickets = tickets.filter((t) => t.status === "In Progress").length;
  const resolvedTickets = tickets.filter((t) => t.status === "Resolved").length;

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    const matchesSearch =
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.institutionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.requesterName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingTicket || !replyMessage.trim()) return;
    replySupportTicket(viewingTicket.id, replyMessage.trim(), isInternalNote);
    setReplyMessage("");
    // Update local modal instance
    const updated = tickets.find((t) => t.id === viewingTicket.id);
    if (updated) setViewingTicket(updated);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP METRICS STRIP                                                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Tickets</span>
          <div className="text-lg font-bold font-mono text-slate-900">{totalTickets}</div>
          <span className="text-[10px] text-slate-500">All time</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Open &amp; Unassigned</span>
          <div className="text-lg font-bold font-mono text-amber-700">{openTickets}</div>
          <span className="text-[10px] text-amber-600 font-medium">Action required</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">In Progress</span>
          <div className="text-lg font-bold font-mono text-blue-700">{inProgressTickets}</div>
          <span className="text-[10px] text-slate-500">Under triage</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Resolved</span>
          <div className="text-lg font-bold font-mono text-emerald-800">{resolvedTickets}</div>
          <span className="text-[10px] text-emerald-600 font-medium">98.2% CSAT</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Avg First Response</span>
          <div className="text-lg font-bold font-mono text-slate-900">18 mins</div>
          <span className="text-[10px] text-emerald-600 font-medium">Target: &lt; 60 mins</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Avg Resolution Time</span>
          <div className="text-lg font-bold font-mono text-slate-900">4.2 hours</div>
          <span className="text-[10px] text-slate-500">Target: &lt; 24 hours</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CATEGORY SWITCHER                                                      */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-2">
        {[
          { key: "tickets", label: "All Support Tickets" },
          { key: "staff", label: "Support Staff & Workload" },
          { key: "categories", label: "Ticket Categories" },
          { key: "slas", label: "SLA Targets & Escalation" },
          { key: "kb", label: "Knowledge Base Articles" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === tab.key
                ? "bg-brand-primary text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 3. TAB: ALL SUPPORT TICKETS                                               */}
      {/* ========================================================================= */}
      {activeTab === "tickets" && (
        <Card>
          <CardHeader className="p-3 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tickets by subject, college, or ID..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-brand-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 cursor-pointer focus:outline-hidden"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-4">Ticket ID</th>
                  <th className="py-2.5 px-4">Subject</th>
                  <th className="py-2.5 px-4">Institution</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Priority</th>
                  <th className="py-2.5 px-4">Assigned Agent</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900">
                {filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-brand-primary">{t.ticketNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-[240px] truncate" title={t.subject}>
                      {t.subject}
                    </td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-[160px]">{t.institutionName}</td>
                    <td className="py-3 px-4 text-slate-700">{t.category}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          t.priority === "High"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{t.assignedAgent}</td>
                    <td className="py-3 px-4">
                      <Badge variant={t.status === "Resolved" ? "success" : t.status === "In Progress" ? "warning" : "danger"} size="sm" dot>
                        {t.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setViewingTicket(t)}
                        className="text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                      >
                        Open Thread
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB: SUPPORT STAFF WORKLOAD                                            */}
      {/* ========================================================================= */}
      {activeTab === "staff" && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm">Assigned Support Staff &amp; Realtime Workload</CardTitle>
            <CardDescription className="text-xs">
              Staff availability, active ticket queues, and resolution performance.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {adminUsers
              .filter((u) => (u.platformRole as string) === "Support Engineer" || u.assignedSupportTeams?.length)
              .map((staff) => (
                <div key={staff.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">{staff.name}</span>
                      <span className="text-slate-500 text-[11px] font-mono">{staff.email}</span>
                    </div>
                    <Badge variant="success" size="sm" dot>
                      Available
                    </Badge>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Active Workload:</span>
                      <span className="font-bold text-slate-900">{staff.workloadTicketsCount || 2} Open Tickets</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Assigned Teams:</span>
                      <span className="text-slate-800">{staff.assignedSupportTeams?.join(", ") || "General Triage"}</span>
                    </div>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB: KNOWLEDGE BASE                                                    */}
      {/* ========================================================================= */}
      {activeTab === "kb" && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Institutional Knowledge Base Articles</CardTitle>
              <CardDescription className="text-xs">
                Self-service troubleshooting guides for college admins, guides, and students.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            {[
              { title: "Configuring SAML 2.0 Single Sign-On with Google Workspace", cat: "Authentication", audience: "College Admin", reads: 320 },
              { title: "Standard 60/40 Blended Viva Defense Rubric Attestation Guide", cat: "Academic Evaluation", audience: "Faculty Guide", reads: 610 },
              { title: "Exporting 9-Sample Capstone Portfolio Package for SAR Criterion 3", cat: "Accreditation", audience: "Department HOD", reads: 480 },
              { title: "Troubleshooting Student Friday Weekly Logbook Lockouts", cat: "Project Management", audience: "Students & Guides", reads: 890 },
            ].map((art, i) => (
              <div key={i} className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900 text-xs block">{art.title}</span>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                    <span>Category: {art.cat}</span>
                    <span>• Target: {art.audience}</span>
                    <span>• {art.reads} Views</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-xs">
                  Read Article &rarr;
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* DRAWER: TICKET THREAD & CONVERSATION */}
      <SlideOverDrawer
        isOpen={!!viewingTicket}
        onClose={() => setViewingTicket(null)}
        title={viewingTicket?.subject}
        subtitle={`${viewingTicket?.ticketNumber} • ${viewingTicket?.institutionName}`}
        badge={
          viewingTicket && (
            <Badge variant={viewingTicket.status === "Resolved" ? "success" : "warning"} size="sm" dot>
              {viewingTicket.status}
            </Badge>
          )
        }
      >
        {viewingTicket && (
          <div className="space-y-4 text-xs">
            {/* Requester Bar */}
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Requester:</span>
                <span className="font-semibold text-slate-900">{viewingTicket.requesterName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Contact Email:</span>
                <span className="font-mono text-slate-900">{viewingTicket.requesterEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category / Priority:</span>
                <span className="font-semibold text-slate-800">{viewingTicket.category} • {viewingTicket.priority}</span>
              </div>
            </div>

            {/* Conversation History */}
            <div className="space-y-3">
              <span className="font-bold text-slate-900 block">Conversation &amp; Notes</span>
              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {viewingTicket.conversation.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      msg.isInternalNote
                        ? "bg-amber-50/70 border-amber-200 text-amber-950"
                        : msg.isStaff
                        ? "bg-slate-50 border-slate-200 text-slate-900"
                        : "bg-white border-slate-200 text-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 font-bold">
                        {msg.isInternalNote && <Lock className="h-3 w-3 text-amber-700" />}
                        <span>{msg.sender}</span>
                        {msg.isInternalNote && <span className="text-[10px] text-amber-700 font-mono">(Internal Note)</span>}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>
                    </div>
                    <p className="leading-relaxed text-[11px]">{msg.message}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSendReply} className="space-y-2.5 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternalNote}
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                    className="rounded text-brand-primary accent-brand-primary h-3.5 w-3.5"
                  />
                  <span className="text-slate-700 text-[11px] font-semibold">Post as Internal Note</span>
                </label>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateTicketStatus(viewingTicket.id, "Resolved")}
                  >
                    Mark as Resolved
                  </Button>
                </div>
              </div>

              <Textarea
                placeholder={isInternalNote ? "Write an internal diagnostic note (visible to staff only)..." : "Type response to institution requester..."}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={3}
              />

              <div className="flex justify-end">
                <Button size="sm" variant="primary" type="submit" leftIcon={<Send className="h-3.5 w-3.5" />}>
                  {isInternalNote ? "Save Internal Note" : "Send Response"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
};
