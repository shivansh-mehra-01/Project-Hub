"use client";

import React, { useState } from "react";
import {
  GitFork,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Search,
  Filter,
  ArrowRight,
  UserCheck,
  Layers,
} from "lucide-react";
import { ProgramMappingDto } from "@/lib/api/accreditationTypes";

interface ProgramMappingTabProps {
  mappings: ProgramMappingDto[];
  onMapProgram: (programId: string, cycleId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const ProgramMappingTab: React.FC<ProgramMappingTabProps> = ({
  mappings,
  onMapProgram,
  onNavigateTab,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Verified" | "Mapped" | "Unmapped">("ALL");

  const filtered = mappings.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      m.programName.toLowerCase().includes(q) ||
      m.programCode.toLowerCase().includes(q) ||
      m.departmentName.toLowerCase().includes(q) ||
      (m.hodName && m.hodName.toLowerCase().includes(q));

    const matchStatus = statusFilter === "ALL" || m.mappingStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. SECTION HEADER & PRINCIPLE DESCRIPTION                                 */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-slate-900">Academic Program Accreditation Mapping</h2>
            <p className="text-xs text-slate-500">
              NBA accreditation is program-oriented. Map official academic degree programs to their applicable regulatory frameworks.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600">
            Academic Lineage: Institution → Degree Program → Department Branch → Assessment Cycle
          </span>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search program, branch, or HOD..."
              className="w-full pl-8 pr-3 h-8 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <div className="inline-flex items-center p-0.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === "ALL"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All ({mappings.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Verified")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === "Verified"
                  ? "bg-white text-emerald-800 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Verified
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Mapped")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === "Mapped"
                  ? "bg-white text-emerald-800 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Mapped
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Unmapped")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === "Unmapped"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Unmapped
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PROGRAM MAPPING TABLE (Single Surface with Dividers)                    */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4 min-w-[220px]">Official Program Title</th>
                <th className="py-2.5 px-4 min-w-[140px]">Branch / Department</th>
                <th className="py-2.5 px-4 min-w-[180px]">Supervising HOD</th>
                <th className="py-2.5 px-4 min-w-[110px] text-center">Eligibility</th>
                <th className="py-2.5 px-4 min-w-[140px]">Criteria Progress</th>
                <th className="py-2.5 px-4 min-w-[110px] text-center">Status</th>
                <th className="py-2.5 px-4 min-w-[120px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Official Program Title */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {item.programCode}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          {item.programLevel}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-900 leading-snug">
                        {item.programName}
                      </div>
                    </div>
                  </td>

                  {/* Branch / Department */}
                  <td className="py-3.5 px-4">
                    <span className="font-medium text-slate-700">
                      {item.departmentName}
                    </span>
                  </td>

                  {/* Supervising HOD */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <UserCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" strokeWidth={1.75} />
                      <span>{item.hodName || "Pending Appointment"}</span>
                    </div>
                  </td>

                  {/* Eligibility */}
                  <td className="py-3.5 px-4 text-center">
                    {item.isEligible ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" strokeWidth={1.75} />
                        <span>Eligible</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                        <AlertCircle className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />
                        <span>Ineligible</span>
                      </span>
                    )}
                  </td>

                  {/* Criteria Progress */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-slate-900">
                          {item.criteriaCompletionPct}%
                        </span>
                        <span className="text-slate-400 font-mono">
                          {item.evidenceCount} docs
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-800 rounded-full"
                          style={{ width: `${item.criteriaCompletionPct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        item.mappingStatus === "Verified"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : item.mappingStatus === "Mapped"
                          ? "bg-slate-100 text-slate-800 border border-slate-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.mappingStatus === "Verified"
                            ? "bg-emerald-600"
                            : item.mappingStatus === "Mapped"
                            ? "bg-slate-600"
                            : "bg-amber-600"
                        }`}
                      />
                      {item.mappingStatus}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onNavigateTab("criteria")}
                      className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 transition-colors cursor-pointer"
                    >
                      Configure SAR →
                    </button>
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
