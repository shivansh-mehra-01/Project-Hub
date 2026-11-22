"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Calendar,
  Layers,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import {
  AccreditationFrameworkDto,
  FrameworkVersionDto,
  AccreditationCycleDto,
  CreateCycleRequest,
} from "@/lib/api/accreditationTypes";

interface FrameworksAndCyclesTabProps {
  frameworks: AccreditationFrameworkDto[];
  frameworkVersions: FrameworkVersionDto[];
  cycles: AccreditationCycleDto[];
  activeCycleId: string;
  onSelectCycle: (cycleId: string) => void;
  onCreateCycle: (req: CreateCycleRequest) => void;
  onNavigateTab: (tab: string) => void;
}

export const FrameworksAndCyclesTab: React.FC<FrameworksAndCyclesTabProps> = ({
  frameworks,
  frameworkVersions,
  cycles,
  activeCycleId,
  onSelectCycle,
  onCreateCycle,
  onNavigateTab,
}) => {
  const [selectedFrameworkCode, setSelectedFrameworkCode] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredCycles = cycles.filter((c) => {
    const matchFw = selectedFrameworkCode === "ALL" || c.frameworkCode === selectedFrameworkCode;
    const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchFw && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. AVAILABLE FRAMEWORKS CATALOG (Single Surface with Dividers)            */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-slate-900">Supported Accreditation Frameworks</h2>
            <p className="text-xs text-slate-500">
              National Board of Accreditation (NBA) and NAAC Institutional Frameworks integrated into the engine.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {frameworks.length} Frameworks Active
          </span>
        </div>

        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
          {frameworks.map((fw) => {
            const versions = frameworkVersions.filter((v) => v.frameworkId === fw.id);
            const activeFwCycles = cycles.filter((c) => c.frameworkId === fw.id);

            return (
              <div
                key={fw.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {fw.code}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold">
                      {fw.level} Assessment
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {versions.length} Version{versions.length === 1 ? "" : "s"} Available
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{fw.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{fw.description}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right space-y-0.5">
                    <span className="block text-xs font-semibold text-slate-900">
                      {activeFwCycles.length} Cycle{activeFwCycles.length === 1 ? "" : "s"} Enrolled
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      Latest: {versions[0]?.versionLabel.split("(")[0] || "Active Manual"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ASSESSMENT CYCLES GOVERNANCE                                            */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        {/* Header & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-slate-900">Accreditation Assessment Cycles</h2>
            <p className="text-xs text-slate-500">
              Active SAR and institutional cycles running for the current academic session.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Framework Filter */}
            <div className="inline-flex items-center p-0.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
              <button
                type="button"
                onClick={() => setSelectedFrameworkCode("ALL")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedFrameworkCode === "ALL"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedFrameworkCode("NBA")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedFrameworkCode === "NBA"
                    ? "bg-white text-emerald-800 font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                NBA
              </button>
              <button
                type="button"
                onClick={() => setSelectedFrameworkCode("NAAC")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedFrameworkCode === "NAAC"
                    ? "bg-white text-emerald-800 font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                NAAC
              </button>
            </div>
          </div>
        </div>

        {/* Cycles List (Single Surface with Dividers) */}
        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
          {filteredCycles.map((cycle) => {
            const isSelected = cycle.id === activeCycleId;

            return (
              <div
                key={cycle.id}
                className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                  isSelected ? "bg-emerald-50/30" : "hover:bg-slate-50/60"
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {cycle.frameworkCode}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {cycle.level} Accreditation
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-mono text-slate-500">
                      AY {cycle.academicYear}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      {cycle.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {cycle.cycleName}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>
                      Manual: <strong className="text-slate-700 font-semibold">{cycle.versionLabel}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Duration: {cycle.startDate} to {cycle.endDate || "Ongoing"}
                    </span>
                  </div>
                </div>

                {/* Progress & Metrics */}
                <div className="flex items-center gap-6 lg:border-l lg:border-slate-100 lg:pl-6 shrink-0">
                  <div className="space-y-1 text-right min-w-[120px]">
                    <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Completion
                    </span>
                    <div className="flex items-center gap-2 justify-end">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {cycle.completionPct}%
                      </span>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-800 rounded-full"
                          style={{ width: `${cycle.completionPct}%` }}
                        />
                      </div>
                    </div>
                    <span className="block text-[10px] text-slate-400">
                      {cycle.evidenceCount} verified documents
                    </span>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCycle(cycle.id);
                        onNavigateTab("criteria");
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
