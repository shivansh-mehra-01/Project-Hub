"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Megaphone,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  Send,
  X,
  Check,
  AlertTriangle,
  Building2,
  Lock,
  History,
  Info,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import {
  usePlatformData,
  AnnouncementRecord,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementAudience,
} from "../data/platformDataStore";
import { showToast } from "@/lib/toast";

export const PlatformManagementView: React.FC = () => {
  const {
    announcements,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    publishAnnouncementNow,
    withdrawAnnouncement,
    colleges,
  } = usePlatformData();

  useDashboardHeader({
    title: "Announcements",
    breadcrumb: "Management / Announcements",
  });

  // =========================================================================
  // LISTING SCREEN FILTERS & SEARCH
  // =========================================================================
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // =========================================================================
  // MODALS STATE
  // =========================================================================
  const [showCreateEditModal, setShowCreateEditModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementRecord | null>(null);
  const [viewingAnnouncement, setViewingAnnouncement] = useState<AnnouncementRecord | null>(null);
  const [announcementToWithdrawOrDelete, setAnnouncementToWithdrawOrDelete] = useState<AnnouncementRecord | null>(null);
  const [withdrawalReason, setWithdrawalReason] = useState("");

  // =========================================================================
  // CREATE / EDIT FORM STATE
  // =========================================================================
  const [formTitle, setFormTitle] = useState("");
  const [formFullMessage, setFormFullMessage] = useState("");
  const [formCategory, setFormCategory] = useState<AnnouncementCategory>("Maintenance");
  const [formPriority, setFormPriority] = useState<AnnouncementPriority>("Normal");
  const [formAudience, setFormAudience] = useState<AnnouncementAudience>("All Colleges");
  const [formSelectedColleges, setFormSelectedColleges] = useState<string[]>([]);
  const [collegeSearchQuery, setCollegeSearchQuery] = useState("");
  const [formPublishOption, setFormPublishOption] = useState<"now" | "scheduled" | "draft">("now");
  const [formScheduledDate, setFormScheduledDate] = useState("");

  // Check scheduled announcements on mount and transition any reached times
  useEffect(() => {
    const nowIso = new Date().toISOString();
    announcements.forEach((a) => {
      if (a.status === "Scheduled" && a.scheduledFor && a.scheduledFor <= nowIso) {
        publishAnnouncementNow(a.id);
      }
    });
  }, [announcements, publishAnnouncementNow]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingAnnouncement(null);
    setFormTitle("");
    setFormFullMessage("");
    setFormCategory("Maintenance");
    setFormPriority("Normal");
    setFormAudience("All Colleges");
    setFormSelectedColleges([]);
    setCollegeSearchQuery("");
    setFormPublishOption("now");
    setFormScheduledDate("");
    setShowCreateEditModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (ann: AnnouncementRecord) => {
    setEditingAnnouncement(ann);
    setFormTitle(ann.title);
    setFormFullMessage(ann.fullMessage);
    setFormCategory(ann.category);
    setFormPriority(ann.priority);
    setFormAudience(ann.targetAudience);
    setFormSelectedColleges(ann.selectedCollegeCodes || []);
    setCollegeSearchQuery("");
    setFormPublishOption(
      ann.status === "Scheduled" ? "scheduled" : ann.status === "Draft" ? "draft" : "now"
    );
    setFormScheduledDate(ann.scheduledFor || "");
    setShowCreateEditModal(true);
  };

  // Toggle college selection for "Selected Colleges"
  const toggleCollegeSelection = (code: string) => {
    setFormSelectedColleges((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Filter colleges for the college selector
  const filteredColleges = useMemo(() => {
    const q = collegeSearchQuery.toLowerCase().trim();
    if (!q) return colleges;
    return colleges.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [colleges, collegeSearchQuery]);

  // Form Submission
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      showToast("Please enter an announcement title.", "error");
      return;
    }

    if (!formFullMessage.trim()) {
      showToast("Please provide the announcement message content.", "error");
      return;
    }

    if (formAudience === "Selected Colleges" && formSelectedColleges.length === 0) {
      showToast("Please select at least one college for targeted audience.", "error");
      return;
    }

    if (formPublishOption === "scheduled" && !formScheduledDate) {
      showToast("Please specify the scheduled date and time for publication.", "error");
      return;
    }

    const payload: Partial<AnnouncementRecord> = {
      title: formTitle.trim(),
      category: formCategory,
      priority: formPriority,
      fullMessage: formFullMessage.trim(),
      shortDescription: formFullMessage.slice(0, 100) + (formFullMessage.length > 100 ? "..." : ""),
      targetAudience: formAudience,
      selectedCollegeCodes: formAudience === "Selected Colleges" ? formSelectedColleges : [],
      status: formPublishOption === "draft" ? "Draft" : formPublishOption === "scheduled" ? "Scheduled" : "Published",
      scheduledFor: formPublishOption === "scheduled" ? formScheduledDate : undefined,
    };

    if (editingAnnouncement) {
      updateAnnouncement(editingAnnouncement.id, payload);
    } else {
      addAnnouncement(payload);
    }

    setShowCreateEditModal(false);
  };

  // Filtered Announcements
  const filteredAnnouncements = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return announcements.filter((ann) => {
      const matchesSearch =
        !q ||
        ann.title.toLowerCase().includes(q) ||
        ann.fullMessage.toLowerCase().includes(q) ||
        ann.category.toLowerCase().includes(q) ||
        (ann.targetAudience && ann.targetAudience.toLowerCase().includes(q));

      const matchesCategory =
        categoryFilter === "All" || ann.category === categoryFilter;

      const matchesStatus =
        statusFilter === "All" || ann.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [announcements, searchQuery, categoryFilter, statusFilter]);

  // Published Count
  const publishedCount = useMemo(() => {
    return announcements.filter((a) => a.status === "Published").length;
  }, [announcements]);

  // Priority badge styling
  const getPriorityBadge = (priority: AnnouncementPriority) => {
    switch (priority) {
      case "Urgent":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "High":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Normal":
      case "Medium":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Low":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // Category badge styling
  const getCategoryBadge = (category: AnnouncementCategory) => {
    switch (category) {
      case "Maintenance":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "Service Incident":
        return "bg-rose-50 text-rose-800 border-rose-200";
      case "Feature Update":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "Security Advisory":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "General Notice":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // Status badge styling
  const getStatusBadge = (status: AnnouncementRecord["status"]) => {
    switch (status) {
      case "Published":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Scheduled":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Draft":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Withdrawn":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === "—") return "—";
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ======================================================================= */}
      {/* 1. HEADER (Page Title, Short Description, Create Action)                 */}
      {/* ======================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Announcements</h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
              Simplified UI
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Communicate important platform updates to affiliated colleges.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-xs transition-colors self-start sm:self-auto shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Announcement
        </button>
      </div>

      {/* ======================================================================= */}
      {/* 2. ANNOUNCEMENT LIST TOOLBAR (Search, Status Pills, Category Filter)     */}
      {/* ======================================================================= */}
      <div className="space-y-3">
        {/* Sub-header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Announcement List</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {publishedCount} Published
            </span>
          </div>

          <button
            onClick={handleOpenCreate}
            className="sm:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg self-start"
          >
            <Plus className="w-3.5 h-3.5" /> Create
          </button>
        </div>

        {/* Search bar & Create button row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search announcements..."
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="shrink-0">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
            >
              <option value="All">All Categories</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Service Incident">Service Incident</option>
              <option value="Feature Update">Feature Update</option>
              <option value="Security Advisory">Security Advisory</option>
              <option value="General Notice">General Notice</option>
            </select>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {["All", "Published", "Scheduled", "Draft"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              {st}
              <span
                className={`ml-1.5 text-[10px] font-mono px-1 rounded ${
                  statusFilter === st ? "bg-slate-800 text-white" : "text-slate-500"
                }`}
              >
                {st === "All"
                  ? announcements.length
                  : announcements.filter((a) => a.status === st).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 3. ANNOUNCEMENT TABLE                                                    */}
      {/* Columns: Announcement, Target Audience, Priority, Publish Date,         */}
      {/* Status, Actions                                                         */}
      {/* ======================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Announcement</th>
                <th className="py-3 px-4">Target Audience</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Publish Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAnnouncements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No announcements found</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {searchQuery || statusFilter !== "All" || categoryFilter !== "All"
                        ? "Try adjusting your search terms or filters."
                        : "Click '+ Create Announcement' above to publish your first platform bulletin."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAnnouncements.map((ann) => (
                  <tr key={ann.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* 1. Announcement (Title + Category) */}
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="space-y-1">
                        <span className="font-semibold text-slate-900 block leading-snug">
                          {ann.title}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold border rounded-md ${getCategoryBadge(
                              ann.category
                            )}`}
                          >
                            {ann.category}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Target Audience */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <span className="font-medium text-slate-800 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {ann.targetAudience}
                        </span>
                        {ann.targetAudience === "Selected Colleges" &&
                          ann.selectedCollegeCodes &&
                          ann.selectedCollegeCodes.length > 0 && (
                            <span className="text-[10px] font-mono text-slate-500 block">
                              {ann.selectedCollegeCodes.length} {ann.selectedCollegeCodes.length === 1 ? "college" : "colleges"} ({ann.selectedCollegeCodes.join(", ")})
                            </span>
                          )}
                      </div>
                    </td>

                    {/* 3. Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${getPriorityBadge(
                          ann.priority
                        )}`}
                      >
                        {ann.priority} priority
                      </span>
                    </td>

                    {/* 4. Publish Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600 text-[11px]">
                      {ann.status === "Scheduled" ? (
                        <div className="flex items-center gap-1 text-blue-700">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{formatDate(ann.scheduledFor || ann.publishDate)}</span>
                        </div>
                      ) : (
                        <span>{formatDate(ann.publishDate)}</span>
                      )}
                    </td>

                    {/* 5. Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-md border ${getStatusBadge(
                          ann.status
                        )}`}
                      >
                        {ann.status === "Published" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                        {ann.status === "Scheduled" && <Clock className="w-3 h-3 text-blue-600" />}
                        {ann.status === "Draft" && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                        {ann.status === "Withdrawn" && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                        {ann.status}
                      </span>
                    </td>

                    {/* 6. Actions (View, Edit, Delete / Withdraw) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setViewingAnnouncement(ann)}
                          className="font-semibold text-slate-700 hover:text-slate-900 hover:underline"
                        >
                          View
                        </button>

                        <span className="text-slate-300">&bull;</span>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(ann)}
                          className="font-semibold text-slate-700 hover:text-slate-900 hover:underline"
                        >
                          Edit
                        </button>

                        <span className="text-slate-300">&bull;</span>

                        {ann.status === "Published" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setAnnouncementToWithdrawOrDelete(ann);
                              setWithdrawalReason("");
                            }}
                            className="font-semibold text-rose-600 hover:text-rose-800 hover:underline"
                          >
                            Withdraw
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setAnnouncementToWithdrawOrDelete(ann);
                              setWithdrawalReason("");
                            }}
                            className="font-semibold text-rose-600 hover:text-rose-800 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 4. CREATE / EDIT ANNOUNCEMENT MODAL                                      */}
      {/* Required Fields Only: Title, Message, Category, Priority, Target        */}
      {/* Audience, Publishing Options                                            */}
      {/* ======================================================================= */}
      {showCreateEditModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-slate-700" />
                  {editingAnnouncement ? "Edit Announcement" : "Create Announcement"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publish operational announcements, maintenance windows, and security notices to colleges.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning if Editing a Live Published Announcement */}
            {editingAnnouncement && editingAnnouncement.status === "Published" && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Notice: Active Published Announcement</strong>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    This announcement is currently visible to college administrators. Updating will immediately reflect live on college dashboards and an audit log entry will be recorded.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {/* A. Announcement Title */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Announcement Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled Infrastructure Maintenance"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              {/* B. Message */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide complete details, dates, affected services, and guidance for college administrators..."
                  value={formFullMessage}
                  onChange={(e) => setFormFullMessage(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs leading-relaxed focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              {/* C. Category & D. Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as AnnouncementCategory)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-800 focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  >
                    <option value="Maintenance">Maintenance</option>
                    <option value="Service Incident">Service Incident</option>
                    <option value="Feature Update">Feature Update</option>
                    <option value="Security Advisory">Security Advisory</option>
                    <option value="General Notice">General Notice</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Priority <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as AnnouncementPriority)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-800 focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Normal">Normal</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              {/* E. Target Audience */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Target Audience <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "All Colleges", label: "All Colleges" },
                    { key: "Active Colleges", label: "Active Colleges" },
                    { key: "Selected Colleges", label: "Selected Colleges" },
                  ].map((aud) => (
                    <button
                      type="button"
                      key={aud.key}
                      onClick={() => setFormAudience(aud.key as AnnouncementAudience)}
                      className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition-all ${
                        formAudience === aud.key
                          ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {aud.label}
                    </button>
                  ))}
                </div>

                {/* Searchable Multi-Select College Selector if Selected Colleges is active */}
                {formAudience === "Selected Colleges" && (
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                      <span>Select Targeted Colleges:</span>
                      <span className="font-mono text-slate-900 font-bold">
                        {formSelectedColleges.length} Selected
                      </span>
                    </div>

                    {/* College Search input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={collegeSearchQuery}
                        onChange={(e) => setCollegeSearchQuery(e.target.value)}
                        placeholder="Filter colleges by name or code..."
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pt-1">
                      {filteredColleges.map((col) => (
                        <label
                          key={col.code}
                          className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={formSelectedColleges.includes(col.code)}
                            onChange={() => toggleCollegeSelection(col.code)}
                            className="rounded text-slate-900 focus:ring-slate-900 h-3.5 w-3.5"
                          />
                          <span className="font-medium text-slate-800 line-clamp-1">
                            {col.name} ({col.code})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* F. Publishing Options */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block font-semibold text-slate-800">
                  Publishing Options <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "now", label: "Publish Now" },
                    { key: "scheduled", label: "Schedule for Later" },
                    { key: "draft", label: "Save as Draft" },
                  ].map((opt) => (
                    <button
                      type="button"
                      key={opt.key}
                      onClick={() => setFormPublishOption(opt.key as any)}
                      className={`p-2 rounded-lg border text-xs font-semibold text-center transition-all ${
                        formPublishOption === opt.key
                          ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Date & Time Selector for Schedule for Later */}
                {formPublishOption === "scheduled" && (
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1.5 animate-in fade-in-50">
                    <label className="block text-[11px] font-semibold text-blue-900">
                      Configure Publication Date &amp; Time (IST):
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formScheduledDate}
                      onChange={(e) => setFormScheduledDate(e.target.value)}
                      className="w-full border border-blue-300 rounded-md p-2 text-xs font-mono bg-white"
                    />
                    <p className="text-[10px] text-blue-700">
                      The announcement will automatically become published and visible to colleges at this time.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateEditModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-xs transition-colors"
                >
                  {formPublishOption === "draft"
                    ? "Save as Draft"
                    : formPublishOption === "scheduled"
                    ? "Schedule Announcement"
                    : editingAnnouncement
                    ? "Save & Update Live"
                    : "Publish Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 5. VIEW ANNOUNCEMENT DETAILS MODAL                                      */}
      {/* ======================================================================= */}
      {viewingAnnouncement && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${getCategoryBadge(
                    viewingAnnouncement.category
                  )}`}
                >
                  {viewingAnnouncement.category}
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${getPriorityBadge(
                    viewingAnnouncement.priority
                  )}`}
                >
                  {viewingAnnouncement.priority} priority
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getStatusBadge(
                    viewingAnnouncement.status
                  )}`}
                >
                  {viewingAnnouncement.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingAnnouncement(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {viewingAnnouncement.title}
              </h3>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Announcement Message
                </span>
                <p className="text-slate-800 leading-relaxed whitespace-pre-line text-xs">
                  {viewingAnnouncement.fullMessage}
                </p>
              </div>

              {/* Target Audience & Schedule Metadata */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-white border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">Target Audience:</span>
                  <span className="font-semibold text-slate-900">{viewingAnnouncement.targetAudience}</span>
                  {viewingAnnouncement.targetAudience === "Selected Colleges" &&
                    viewingAnnouncement.selectedCollegeCodes && (
                      <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                        {viewingAnnouncement.selectedCollegeCodes.join(", ")}
                      </span>
                    )}
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block">Publication Date:</span>
                  <span className="font-mono text-slate-900 font-semibold">
                    {formatDate(viewingAnnouncement.publishDate)}
                  </span>
                </div>
              </div>

              {/* Audit History */}
              {viewingAnnouncement.auditLog && viewingAnnouncement.auditLog.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <History className="w-3.5 h-3.5" />
                    Audit Trail History
                  </span>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto text-[11px]">
                    {viewingAnnouncement.auditLog.map((log) => (
                      <div
                        key={log.id}
                        className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-slate-800">{log.action}: </span>
                          <span className="text-slate-600">{log.details || log.performedBy}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-2">
                          {log.timestamp}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                {(viewingAnnouncement.status === "Draft" ||
                  viewingAnnouncement.status === "Scheduled") && (
                  <button
                    type="button"
                    onClick={() => {
                      publishAnnouncementNow(viewingAnnouncement.id);
                      setViewingAnnouncement(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Publish Immediately
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = viewingAnnouncement;
                    setViewingAnnouncement(null);
                    handleOpenEdit(toEdit);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setViewingAnnouncement(null)}
                  className="px-4 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 6. WITHDRAW / DELETE CONFIRMATION MODAL                                 */}
      {/* ======================================================================= */}
      {announcementToWithdrawOrDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-3.5 border border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {announcementToWithdrawOrDelete.status === "Published"
                  ? "Withdraw Announcement?"
                  : announcementToWithdrawOrDelete.status === "Scheduled"
                  ? "Cancel Scheduled Broadcast?"
                  : "Delete Draft Announcement?"}
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {announcementToWithdrawOrDelete.status === "Published" ? (
                <>
                  Withdrawing <strong>&quot;{announcementToWithdrawOrDelete.title}&quot;</strong> will immediately remove it from all affiliated college dashboards. An audit log entry will be recorded.
                </>
              ) : announcementToWithdrawOrDelete.status === "Scheduled" ? (
                <>
                  Are you sure you want to cancel the scheduled broadcast for <strong>&quot;{announcementToWithdrawOrDelete.title}&quot;</strong>?
                </>
              ) : (
                <>
                  Are you sure you want to permanently delete this draft announcement? This action cannot be undone.
                </>
              )}
            </p>

            {/* Optional Reason for Published Announcement Withdrawal */}
            {announcementToWithdrawOrDelete.status === "Published" && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Withdrawal Reason (Optional Audit Note):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Outdated maintenance schedule superseded"
                  value={withdrawalReason}
                  onChange={(e) => setWithdrawalReason(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAnnouncementToWithdrawOrDelete(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (announcementToWithdrawOrDelete.status === "Published") {
                    withdrawAnnouncement(announcementToWithdrawOrDelete.id, withdrawalReason.trim() || undefined);
                  } else {
                    deleteAnnouncement(announcementToWithdrawOrDelete.id);
                  }
                  setAnnouncementToWithdrawOrDelete(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
              >
                {announcementToWithdrawOrDelete.status === "Published"
                  ? "Confirm Withdrawal"
                  : "Confirm Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
