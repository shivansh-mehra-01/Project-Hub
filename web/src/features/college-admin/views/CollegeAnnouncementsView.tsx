"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Megaphone, RefreshCw, Search, ArrowLeft, Eye } from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { collegeApi } from "@/lib/api/collegeApi";
import { CollegeAnnouncementDto } from "@/lib/api/types";
import { ApiConnectionBanner } from "../components/ApiConnectionBanner";
import {
  AnnouncementDetailModal,
  formatAnnouncementDate,
  getAnnouncementCategoryBadge,
  getAnnouncementPriorityBadge,
} from "../components/AnnouncementDetailModal";

export const CollegeAnnouncementsView: React.FC = () => {
  const [announcements, setAnnouncements] = useState<CollegeAnnouncementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<CollegeAnnouncementDto | null>(null);

  useDashboardHeader({
    title: "Announcements",
    breadcrumb: "Platform Announcements & Operational Notices",
  });

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const items = await collegeApi.getAnnouncements();
      setAnnouncements(Array.isArray(items) ? items : []);
    } catch (err: any) {
      setApiError(err?.message || "Failed to load platform announcements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const filteredAnnouncements = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return announcements.filter((item) => {
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.fullMessage.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      const matchesPriority =
        priorityFilter === "All" || item.priority === priorityFilter;
      return matchesQuery && matchesPriority;
    });
  }, [announcements, searchQuery, priorityFilter]);

  return (
    <div className="space-y-5 pb-8 font-sans bg-[#f8fafc]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/college"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Overview
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Platform Announcements
            </h1>
            <p className="text-xs text-slate-500">
              Official platform bulletins, maintenance notices, and advisories for your college.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadAnnouncements}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {apiError && (
        <ApiConnectionBanner
          onRetry={loadAnnouncements}
          message={apiError}
          isRetrying={loading}
        />
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-wrap items-center gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search announcements by title, category, or message..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700 focus:border-emerald-700"
          />
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          aria-label="Filter by priority"
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 font-medium"
        >
          <option value="All">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Normal">Normal</option>
        </select>
      </div>

      {loading && announcements.length === 0 ? (
        <div className="space-y-3" aria-label="Loading platform announcements">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="h-24 rounded-xl border border-slate-200 bg-white animate-pulse"
            />
          ))}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center space-y-2">
          <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">
            {announcements.length === 0
              ? "No platform announcements"
              : "No matching announcements"}
          </p>
          <p className="text-xs text-slate-500">
            {announcements.length === 0
              ? "There are currently no published platform announcements for your college."
              : "Try clearing your search or priority filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAnnouncements.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getAnnouncementPriorityBadge(
                      item.priority
                    )}`}
                  >
                    {item.priority}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getAnnouncementCategoryBadge(
                      item.category
                    )}`}
                  >
                    {item.category}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {formatAnnouncementDate(item.publishDateUtc)}
                  </span>
                </div>
                <h2 className="text-sm font-bold text-slate-900">{item.title}</h2>
                <p className="text-xs text-slate-600 line-clamp-2">
                  {item.shortDescription || item.fullMessage}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAnnouncement(item)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 shrink-0 cursor-pointer self-start sm:self-center"
              >
                <Eye className="w-3.5 h-3.5" />
                Read Full Notice
              </button>
            </article>
          ))}
        </div>
      )}

      <AnnouncementDetailModal
        announcement={selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
      />
    </div>
  );
};
