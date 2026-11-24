"use client";

import React from "react";
import {
  ShieldCheck,
  GraduationCap,
  Building2,
  FileCheck2,
  FolderArchive,
  ArrowRight,
  Plus,
  CheckCircle2,
  UploadCloud,
  FileDown,
  Layers,
} from "lucide-react";
import { AccreditationCycleDto, AccreditationFrameworkDto } from "@/lib/api/accreditationTypes";

interface OverviewTabProps {
  frameworks: AccreditationFrameworkDto[];
  cycles: AccreditationCycleDto[];
  onAddFramework: () => void;
  onNavigateTab: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  frameworks,
  cycles,
  onAddFramework,
  onNavigateTab,
}) => {
  const isWorkspaceEmpty = frameworks.length === 0;

  // Real Database Numbers
  const activeFrameworksCount = frameworks.filter((f) => f.isActive).length;
  const programCyclesCount = cycles.filter((c) => c.level === "Program").length;
  const pendingReviewsTotal = cycles.reduce((acc, c) => acc + (c.pendingReviews || 0), 0);
  const totalEvidenceDocuments = cycles.reduce((acc, c) => acc + (c.evidenceCount || 0), 0);

  // NBA & NAAC cycles
  const nbaCycle = cycles.find((c) => c.frameworkCode === "NBA");
  const naacCycle = cycles.find((c) => c.frameworkCode === "NAAC");

  if (isWorkspaceEmpty) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center space-y-3">
        <div className="mx-auto h-11 w-11 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
          <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900">No Accreditation Framework Configured</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Choose NBA or NAAC to start tracking accreditation requirements, documents, and scores.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddFramework}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          <span>Select Framework</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ========================================================================= */}
      {/* 1. VISUAL 4-STEP WORKFLOW TRACKER (Instant clarity for any user)          */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
          Accreditation Roadmap
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
          {/* Step 1 */}
          <button
            type="button"
            onClick={() => onNavigateTab("frameworks")}
            className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] font-bold text-emerald-800">STEP 1</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" strokeWidth={1.75} />
            </div>
            <div className="font-bold text-slate-900">Framework</div>
            <div className="text-[11px] text-slate-500 mt-0.5">NBA or NAAC</div>
          </button>

          {/* Step 2 */}
          <button
            type="button"
            onClick={() => onNavigateTab("programs")}
            className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] font-bold text-emerald-800">STEP 2</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" strokeWidth={1.75} />
            </div>
            <div className="font-bold text-slate-900">Map Programs</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Link CSE, ECE, ME</div>
          </button>

          {/* Step 3 */}
          <button
            type="button"
            onClick={() => onNavigateTab("evidence")}
            className="p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] font-bold text-slate-400">STEP 3</span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                In Progress
              </span>
            </div>
            <div className="font-bold text-slate-900">Collect Proof</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Upload rubrics & files</div>
          </button>

          {/* Step 4 */}
          <button
            type="button"
            onClick={() => onNavigateTab("reports")}
            className="p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] font-bold text-slate-400">STEP 4</span>
              <span className="text-[10px] text-slate-400">Final</span>
            </div>
            <div className="font-bold text-slate-900">Attest & Export</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Official SAR / SSR</div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. COMPACT KEY METRICS ROW (Clean, minimal, high-level)                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <span className="block text-xs text-slate-500">Active Frameworks</span>
          <span className="block text-xl font-bold text-slate-900 font-mono mt-1">
            {activeFrameworksCount}
          </span>
          <span className="block text-[11px] text-slate-400 mt-0.5">NBA & NAAC</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <span className="block text-xs text-slate-500">Enrolled Programs</span>
          <span className="block text-xl font-bold text-slate-900 font-mono mt-1">
            {programCyclesCount} Branches
          </span>
          <span className="block text-[11px] text-emerald-700 font-medium mt-0.5">UG Engineering</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <span className="block text-xs text-slate-500">Verified Evidence</span>
          <span className="block text-xl font-bold text-slate-900 font-mono mt-1">
            {totalEvidenceDocuments} Files
          </span>
          <span className="block text-[11px] text-slate-400 mt-0.5">In Document Vault</span>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab("reviews")}
          className="p-3.5 rounded-xl border border-slate-200 bg-white text-left hover:border-slate-300 transition-colors cursor-pointer"
        >
          <span className="block text-xs text-slate-500">Pending Reviews</span>
          <span className="block text-xl font-bold text-amber-700 font-mono mt-1">
            {pendingReviewsTotal} Pending
          </span>
          <span className="block text-[11px] text-amber-700 font-medium mt-0.5">Review Queue →</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. WORKSPACE CARDS (NBA vs NAAC - Clean & Action-Oriented)                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* NBA Card */}
        {nbaCycle ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                  PROGRAM LEVEL
                </span>
                <span className="text-xs font-mono font-bold text-slate-900">
                  {nbaCycle.completionPct ?? 0}% Ready
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">NBA Accreditation (Tier-II)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Active Program: <strong className="text-slate-800">{nbaCycle.programName || nbaCycle.cycleName}</strong>
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-800 rounded-full"
                  style={{ width: `${nbaCycle.completionPct ?? 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>10 Criteria Configured</span>
                <span>
                  Score:{" "}
                  <strong className="text-slate-900 font-mono">
                    {nbaCycle.overallScore != null ? `${nbaCycle.overallScore} / 1000` : "Evaluation Pending"}
                  </strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab("criteria")}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>Open NBA Criteria & Marks</span>
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold">
                  PROGRAM LEVEL
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Not Configured
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">NBA Accreditation (Tier-II)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  No active program cycle configured for NBA SAR evaluation.
                </p>
              </div>

              <div className="py-2 text-xs text-slate-500">
                Map department programs to NBA framework to track outcome attainment and criteria marks.
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab("programs")}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>Configure NBA Cycle</span>
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        )}

        {/* NAAC Card */}
        {naacCycle ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold">
                  COLLEGE LEVEL
                </span>
                <span className="text-xs font-mono font-bold text-slate-900">
                  {naacCycle.status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">NAAC Accreditation (SSR)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Target: <strong className="text-slate-800">{naacCycle.cycleName}</strong>
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-600 rounded-full"
                  style={{ width: `${naacCycle.completionPct ?? 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>7 Institutional Criteria</span>
                <span>
                  Grade:{" "}
                  <strong className="text-slate-900 font-mono">
                    {naacCycle.overallGrade ? `${naacCycle.overallGrade} Grade` : (naacCycle.overallScore != null ? `${naacCycle.overallScore} CGPA` : "Pending Evaluation")}
                  </strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab("criteria")}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>Open NAAC Setup</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold">
                  COLLEGE LEVEL
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Not Initiated
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">NAAC Accreditation (SSR)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Institutional NAAC assessment cycle has not been initiated.
                </p>
              </div>

              <div className="py-2 text-xs text-slate-500">
                Initiate a college-level NAAC cycle to manage quantitative metrics and qualitative SSR criteria.
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab("frameworks")}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>Configure NAAC Cycle</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. ACTIVE CYCLES TABLE (Simple, no clutter)                               */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Active Assessment Cycles
          </h4>
          <button
            type="button"
            onClick={() => onNavigateTab("frameworks")}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 transition-colors"
          >
            View All →
          </button>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase">
                <th className="py-2.5 px-4">Cycle Name</th>
                <th className="py-2.5 px-4">Framework</th>
                <th className="py-2.5 px-4">Progress</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cycles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No active assessment cycles found. Configure a framework and program to begin.
                  </td>
                </tr>
              ) : (
                cycles.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {c.cycleName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {c.frameworkCode}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 w-8">{c.completionPct}%</span>
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-800 rounded-full"
                            style={{ width: `${c.completionPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onNavigateTab("criteria")}
                        className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 transition-colors cursor-pointer"
                      >
                        Open →
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
  );
};
