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
  Archive,
  Info,
  ShieldAlert,
  ArrowRight,
  Filter,
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

export const AnnouncementsView: React.FC = () => {
  const {
    announcements,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    publishAnnouncementNow,
    withdrawAnnouncement,
    archiveAnnouncement,
    colleges,
  } = usePlatformData();

  useDashboardHeader({
    title: "Announcements",
    breadcrumb: "Operations / Announcements",
  });

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");

  // Modal states
  const [showCreateEditModal, setShowCreateEditModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementRecord | null>(null);
  const [viewingAnnouncement, setViewingAnnouncement] = useState<AnnouncementRecord | null>(null);
  const [announcementToArchive, setAnnouncementToArchive] = useState<AnnouncementRecord | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [announcementToDelete, setAnnouncementToDelete] = useState<AnnouncementRecord | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formFullMessage, setFormFullMessage] = useState("");
  const [formCategory, setFormCategory] = useState<AnnouncementCategory>("Maintenance");
  const [formPriority, setFormPriority] = useState<AnnouncementPriority>("Normal");
  const [formAudience, setFormAudience] = useState<AnnouncementAudience>("All Colleges");
  const [formSelectedColleges, setFormSelectedColleges] = useState<string[]>([]);
  const [collegeSearchQuery, setCollegeSearchQuery] = useState("");
  const [formPublishOption, setFormPublishOption] = useState<"now" | "draft">("now");

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
    setFormPublishOption(ann.status === "Draft" ? "draft" : "now");
    setShowCreateEditModal(true);
  };

  // Toggle college selection
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

    const payload: Partial<AnnouncementRecord> = {
      title: formTitle.trim(),
      category: formCategory,
      priority: formPriority,
      fullMessage: formFullMessage.trim(),
      shortDescription: formFullMessage.slice(0, 120) + (formFullMessage.length > 120 ? "..." : ""),
      targetAudience: formAudience,
      selectedCollegeCodes: formAudience === "Selected Colleges" ? formSelectedColleges : [],
      status: formPublishOption === "draft" ? "Draft" : "Published",
      publishDate: formPublishOption === "now" ? new Date().toISOString().replace("T", " ").slice(0, 19) : new Date().toISOString().replace("T", " ").slice(0, 10),
    };

    if (editingAnnouncement) {
      updateAnnouncement(editingAnnouncement.id, payload);
      showToast("Announcement updated successfully.", "success");
    } else {
      addAnnouncement(payload);
      showToast(
        formPublishOption === "draft"
          ? "Announcement saved as Draft."
          : "Announcement published to colleges.",
        "success"
      );
    }

    setShowCreateEditModal(false);
  };

  // Handle Archive Submission
  const handleConfirmArchive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementToArchive) return;
    archiveAnnouncement(announcementToArchive.id, archiveReason.trim() || "Archived by administrator");
    setAnnouncementToArchive(null);
    setArchiveReason("");
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = () => {
    if (!announcementToDelete) return;
    deleteAnnouncement(announcementToDelete.id);
    setAnnouncementToDelete(null);
    showToast("Announcement deleted.", "info");
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

      const matchesPriority =
        priorityFilter === "All" || ann.priority === priorityFilter;

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Archived"
          ? ann.status === "Withdrawn" || ann.status === "Archived"
          : ann.status === statusFilter);

      return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
    });
  }, [announcements, searchQuery, categoryFilter, priorityFilter, statusFilter]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: announcements.length,
      published: announcements.filter((a) => a.status === "Published").length,
      draft: announcements.filter((a) => a.status === "Draft").length,
      archived: announcements.filter((a) => a.status === "Withdrawn" || a.status === "Archived").length,
    };
  }, [announcements]);

  // Priority badge helper
  const getPriorityBadge = (priority: AnnouncementPriority) => {
    switch (priority) {
      case "Critical":
      case "Urgent":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "High":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Normal":
      case "Medium":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // Category badge helper
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

  // Status badge helper
  const getStatusBadge = (status: AnnouncementRecord["status"]) => {
    switch (status) {
      case "Published":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Draft":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Withdrawn":
      case "Archived":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Announcements</h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
              Platform Broadcast
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Communicate maintenance schedules, service disruptions, and platform policy updates to affiliated colleges.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-xs transition-colors self-start sm:self-auto shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Announcement
        </button>
      </div>

      {/* Toolbar: Search, Category & Priority filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search announcements by title or content..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 focus:border-slate-900 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-800 font-medium"
          >
            <option value="All">All Categories</option>
            <option value="Maintenance">Maintenance Notice</option>
            <option value="Service Incident">Service Disruption</option>
            <option value="Feature Update">Platform Update</option>
            <option value="Security Advisory">Security Advisory</option>
            <option value="General Notice">General Announcement</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-800 font-medium"
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Normal">Normal</option>
          </select>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-2.5 text-xs">
          {[
            { id: "All", label: "All", count: counts.all },
            { id: "Published", label: "Published", count: counts.published },
            { id: "Draft", label: "Drafts", count: counts.draft },
            { id: "Archived", label: "Archived", count: counts.archived },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-mono px-1 rounded ${
                statusFilter === tab.id ? "bg-slate-800 text-slate-200" : "bg-white text-slate-500"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Announcements Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5">Announcement</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Target Audience</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Published Date</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAnnouncements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    <Megaphone className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No announcements found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      No notices match your current filters or search query.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAnnouncements.map((ann) => (
                  <tr key={ann.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3.5 max-w-sm">
                      <div className="font-semibold text-slate-900 truncate">{ann.title}</div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {ann.shortDescription || ann.fullMessage}
                      </div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getCategoryBadge(ann.category)}`}>
                        {ann.category}
                      </span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-medium text-slate-800">
                        {ann.targetAudience}
                      </span>
                      {ann.targetAudience === "Selected Colleges" && ann.selectedCollegeCodes && (
                        <span className="text-[10px] text-slate-500 block font-mono">
                          {ann.selectedCollegeCodes.length} college(s)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getPriorityBadge(ann.priority)}`}>
                        {ann.priority}
                      </span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getStatusBadge(ann.status)}`}>
                        {ann.status}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                      {formatDate(ann.publishDate)}
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingAnnouncement(ann)}
                          title="Preview Announcement"
                          className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {ann.status === "Draft" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(ann)}
                              title="Edit Draft"
                              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                publishAnnouncementNow(ann.id);
                                showToast("Announcement published immediately.", "success");
                              }}
                              title="Publish Now"
                              className="px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded cursor-pointer"
                            >
                              Publish
                            </button>
                          </>
                        ) : ann.status === "Published" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setAnnouncementToArchive(ann);
                              setArchiveReason("");
                            }}
                            title="Archive Announcement"
                            className="p-1 rounded text-slate-500 hover:text-amber-700 hover:bg-amber-50 cursor-pointer"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => setAnnouncementToDelete(ann)}
                          title="Delete"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showCreateEditModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-5 space-y-4 border border-slate-200 animate-in fade-in-50 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingAnnouncement ? "Edit Announcement" : "Create Platform Announcement"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publish operational notices and updates to affiliated colleges.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Announcement Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Scheduled Infrastructure Maintenance Window"
                  className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded-md p-2 bg-white"
                  >
                    <option value="Maintenance">Maintenance Notice</option>
                    <option value="Service Incident">Service Disruption</option>
                    <option value="Feature Update">Platform Update</option>
                    <option value="Security Advisory">Security Advisory</option>
                    <option value="General Notice">General Announcement</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Priority Level</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded-md p-2 bg-white"
                  >
                    <option value="Normal">Normal (Informational)</option>
                    <option value="High">High (Requires Attention)</option>
                    <option value="Critical">Critical (Urgent Banner)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Target Audience</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="audience"
                      value="All Colleges"
                      checked={formAudience === "All Colleges"}
                      onChange={() => setFormAudience("All Colleges")}
                      className="text-slate-900 focus:ring-slate-900"
                    />
                    <span>All Colleges ({colleges.length})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="audience"
                      value="Selected Colleges"
                      checked={formAudience === "Selected Colleges"}
                      onChange={() => setFormAudience("Selected Colleges")}
                      className="text-slate-900 focus:ring-slate-900"
                    />
                    <span>Specific Colleges</span>
                  </label>
                </div>

                {formAudience === "Selected Colleges" && (
                  <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700">
                        Select Target Colleges ({formSelectedColleges.length} selected)
                      </span>
                    </div>
                    <input
                      type="text"
                      value={collegeSearchQuery}
                      onChange={(e) => setCollegeSearchQuery(e.target.value)}
                      placeholder="Search college by name or code..."
                      className="w-full text-xs border border-slate-300 rounded p-1.5 bg-white"
                    />
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                      {filteredColleges.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={formSelectedColleges.includes(c.code)}
                            onChange={() => toggleCollegeSelection(c.code)}
                            className="rounded text-slate-900 focus:ring-slate-900"
                          />
                          <span className="font-semibold text-slate-800">{c.code}</span>
                          <span className="text-slate-600 truncate">{c.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Message Content <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formFullMessage}
                  onChange={(e) => setFormFullMessage(e.target.value)}
                  placeholder="Provide complete details regarding the notice, affected systems, and expected duration..."
                  className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Publishing Option</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="publishOpt"
                      value="now"
                      checked={formPublishOption === "now"}
                      onChange={() => setFormPublishOption("now")}
                    />
                    <span>Publish Immediately</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="publishOpt"
                      value="draft"
                      checked={formPublishOption === "draft"}
                      onChange={() => setFormPublishOption("draft")}
                    />
                    <span>Save as Draft</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateEditModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors cursor-pointer"
                >
                  {formPublishOption === "draft" ? "Save Draft" : "Publish Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {viewingAnnouncement && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-4 border border-slate-200 animate-in fade-in-50 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getCategoryBadge(viewingAnnouncement.category)}`}>
                    {viewingAnnouncement.category}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getPriorityBadge(viewingAnnouncement.priority)}`}>
                    {viewingAnnouncement.priority} Priority
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getStatusBadge(viewingAnnouncement.status)}`}>
                    {viewingAnnouncement.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-2">
                  {viewingAnnouncement.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Audience: <strong className="text-slate-700">{viewingAnnouncement.targetAudience}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewingAnnouncement(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
              {viewingAnnouncement.fullMessage}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                Posted {viewingAnnouncement.publishDate}
              </span>
              <button
                type="button"
                onClick={() => setViewingAnnouncement(null)}
                className="px-3.5 py-1 text-xs font-semibold bg-slate-900 text-white rounded cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVE MODAL */}
      {announcementToArchive && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5 border border-slate-200 animate-in fade-in-50 duration-150">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Archive Announcement</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Archiving will remove this announcement from college notification feeds.
              </p>
            </div>

            <form onSubmit={handleConfirmArchive} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Reason for Archiving
                </label>
                <input
                  type="text"
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="e.g. Maintenance completed, advisory resolved"
                  className="w-full text-xs border border-slate-300 rounded p-2 focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAnnouncementToArchive(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors cursor-pointer"
                >
                  Confirm &amp; Archive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {announcementToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-3.5 border border-slate-200 animate-in fade-in-50 duration-150">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Delete Announcement</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Are you sure you want to delete &ldquo;{announcementToDelete.title}&rdquo;? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setAnnouncementToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors cursor-pointer"
              >
                Delete Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
