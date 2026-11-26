"use client";

import React from "react";
import { X, Megaphone, Calendar, User } from "lucide-react";
import { CollegeAnnouncementDto } from "@/lib/api/types";

export function getAnnouncementPriorityBadge(priority: string): string {
  switch (priority) {
    case "Critical":
    case "Urgent":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "High":
      return "bg-amber-50 text-amber-800 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function getAnnouncementCategoryBadge(category: string): string {
  switch (category) {
    case "Service Incident":
    case "Security Advisory":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "Maintenance":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "Feature Update":
    case "Product Update":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    default:
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
  }
}

export function formatAnnouncementDate(utcDate?: string | null): string {
  if (!utcDate) return "—";
  const parsed = new Date(utcDate);
  if (Number.isNaN(parsed.getTime())) return utcDate;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface AnnouncementDetailModalProps {
  announcement: CollegeAnnouncementDto | null;
  onClose: () => void;
}

export const AnnouncementDetailModal: React.FC<AnnouncementDetailModalProps> = ({
  announcement,
  onClose,
}) => {
  if (!announcement) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="college-announcement-modal-title"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-4 border border-slate-200">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getAnnouncementCategoryBadge(
                  announcement.category
                )}`}
              >
                {announcement.category}
              </span>
              <span
                className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getAnnouncementPriorityBadge(
                  announcement.priority
                )}`}
              >
                {announcement.priority} Priority
              </span>
            </div>
            <h3
              id="college-announcement-modal-title"
              className="text-base font-bold text-slate-900 leading-snug"
            >
              {announcement.title}
            </h3>
            <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formatAnnouncementDate(announcement.publishDateUtc)}
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {announcement.createdByName || "Super Admin"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Megaphone className="w-3.5 h-3.5 text-slate-400" />
                {announcement.targetAudience}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close announcement"
            className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
          {announcement.fullMessage}
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
