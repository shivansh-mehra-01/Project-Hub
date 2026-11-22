"use client";

import React, { useState } from "react";
import {
  Clock,
  Search,
  Filter,
  User,
  ShieldCheck,
  FileText,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { AccreditationActivityDto } from "@/lib/api/accreditationTypes";

interface ActivityLogTabProps {
  activityLogs: AccreditationActivityDto[];
  onNavigateTab: (tab: string) => void;
}

export const ActivityLogTab: React.FC<ActivityLogTabProps> = ({
  activityLogs,
  onNavigateTab,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");

  const filtered = activityLogs.filter((log) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      log.action.toLowerCase().includes(q) ||
      log.entityTitle.toLowerCase().includes(q) ||
      log.performedByName.toLowerCase().includes(q) ||
      (log.details && log.details.toLowerCase().includes(q));

    const matchAction = actionFilter === "ALL" || log.action === actionFilter;
    return matchSearch && matchAction;
  });

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. AUDIT LOG HEADER & SEARCH                                              */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-slate-900">Accreditation Governance Audit Trail</h2>
            <p className="text-xs text-slate-500">
              Immutable log of framework configuration, cycle setup, evidence uploads, and reviews.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-600">
            {activityLogs.length} Events Recorded
          </span>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, actor, or details..."
            className="w-full pl-8 pr-3 h-8 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ACTIVITY LOG TABLE (Single Surface with Dividers)                      */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4 min-w-[140px]">Timestamp</th>
                <th className="py-2.5 px-4 min-w-[160px]">Actor / Role</th>
                <th className="py-2.5 px-4 min-w-[140px]">Action Type</th>
                <th className="py-2.5 px-4 min-w-[200px]">Affected Entity</th>
                <th className="py-2.5 px-4 min-w-[280px]">Operational Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Timestamp */}
                  <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                    {new Date(log.performedAtUtc).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </td>

                  {/* Actor */}
                  <td className="py-3 px-4">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-900 block">
                        {log.performedByName}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {log.performedByRole}
                      </span>
                    </div>
                  </td>

                  {/* Action Type */}
                  <td className="py-3 px-4">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {log.action}
                    </span>
                  </td>

                  {/* Affected Entity */}
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {log.entityTitle}
                  </td>

                  {/* Details */}
                  <td className="py-3 px-4 text-slate-600 leading-relaxed">
                    {log.details || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
