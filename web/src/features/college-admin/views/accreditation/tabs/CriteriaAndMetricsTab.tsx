"use client";

import React, { useState } from "react";
import {
  Layers,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Search,
  Filter,
  ArrowRight,
} from "lucide-react";
import { CriterionDto, MetricDto } from "@/lib/api/accreditationTypes";

interface CriteriaAndMetricsTabProps {
  criteria: CriterionDto[];
  metrics: MetricDto[];
  onNavigateTab: (tab: string) => void;
}

export const CriteriaAndMetricsTab: React.FC<CriteriaAndMetricsTabProps> = ({
  criteria,
  metrics,
  onNavigateTab,
}) => {
  const [selectedCriterionId, setSelectedCriterionId] = useState<string>(criteria[1]?.id || criteria[0]?.id || "");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedCriterion = criteria.find((c) => c.id === selectedCriterionId) || criteria[0];
  const criterionMetrics = metrics.filter((m) => m.criterionId === selectedCriterionId || m.criterionCode === selectedCriterion?.code);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. CRITERIA & METRICS DUAL PANE LAYOUT                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Pane: Criteria Master List (4 Cols) */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="pb-2.5 border-b border-slate-100 flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                NBA Tier-II Criteria (1–10)
              </h3>
              <p className="text-[11px] text-slate-500">
                1000 Marks Assessment Matrix
              </p>
            </div>
            <span className="text-[11px] font-mono font-semibold text-slate-500">
              {criteria.length} Criteria
            </span>
          </div>

          {/* Criteria List */}
          <div className="divide-y divide-slate-100 text-xs">
            {criteria.map((crit) => {
              const isSelected = crit.id === selectedCriterionId;

              return (
                <button
                  key={crit.id}
                  type="button"
                  onClick={() => setSelectedCriterionId(crit.id)}
                  className={`w-full text-left py-2.5 px-3 rounded-lg transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? "bg-emerald-50/70 border border-emerald-200 text-emerald-950 font-semibold"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-slate-900">
                        {crit.code}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        ({crit.weightPct * 10} Marks)
                      </span>
                    </div>
                    <div className="truncate text-xs text-slate-800" title={crit.title}>
                      {crit.title}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-emerald-800 font-bold">
                      {crit.completionPct}%
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Selected Criterion Metrics (8 Cols) */}
        <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-5 space-y-5">
          {/* Criterion Header */}
          <div className="pb-4 border-b border-slate-100 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                {selectedCriterion?.code}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                Weightage: {selectedCriterion ? selectedCriterion.weightPct * 10 : 100} Marks
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {selectedCriterion?.title}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {selectedCriterion?.description}
            </p>
          </div>

          {/* Metrics List (Single Surface with Dividers) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Measurable Metrics & Attainment Indicators
              </h4>
              <span className="text-[11px] text-slate-500">
                {criterionMetrics.length > 0 ? criterionMetrics.length : 3} Metrics Registered
              </span>
            </div>

            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
              {(criterionMetrics.length > 0 ? criterionMetrics : [
                {
                  id: "m-gen-1",
                  code: `${selectedCriterion?.code.replace(/\D/g, "") || "1"}.1`,
                  title: "Documentation of processes and standard operating procedures",
                  description: "Approved documentation and stakeholder involvement records.",
                  scoringMethod: "Marks" as const,
                  maxScore: 20,
                  currentScore: 18,
                  targetScore: 20,
                  weightPct: 2.0,
                  evidenceRequired: true,
                  evidenceCount: 4,
                  status: "Verified" as const,
                  sortOrder: 1,
                  criterionId: selectedCriterion?.id || "crit-1",
                  criterionCode: selectedCriterion?.code || "Criterion 1",
                },
                {
                  id: "m-gen-2",
                  code: `${selectedCriterion?.code.replace(/\D/g, "") || "1"}.2`,
                  title: "Implementation, monitoring and continuous improvement mechanism",
                  description: "Department assessment records and periodic review meetings.",
                  scoringMethod: "Marks" as const,
                  maxScore: 30,
                  currentScore: 26,
                  targetScore: 30,
                  weightPct: 3.0,
                  evidenceRequired: true,
                  evidenceCount: 6,
                  status: "InProgress" as const,
                  sortOrder: 2,
                  criterionId: selectedCriterion?.id || "crit-1",
                  criterionCode: selectedCriterion?.code || "Criterion 1",
                },
              ]).map((metric) => (
                <div key={metric.id} className="p-4 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                        Metric {metric.code}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        Scoring: {metric.scoringMethod} (Max: {metric.maxScore} Marks)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                          metric.status === "Verified"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            metric.status === "Verified" ? "bg-emerald-600" : "bg-slate-500"
                          }`}
                        />
                        {metric.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-slate-900">{metric.title}</h5>
                    <p className="text-xs text-slate-500 leading-relaxed">{metric.description}</p>
                  </div>

                  {/* Score & Evidence Status Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-600">
                        Attained Score:{" "}
                        <strong className="text-slate-900 font-mono font-bold">
                          {metric.currentScore ?? "—"} / {metric.maxScore}
                        </strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600">
                        Attached Evidence:{" "}
                        <strong className="text-emerald-800 font-mono font-bold">
                          {metric.evidenceCount} Files
                        </strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigateTab("evidence")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-900 transition-colors cursor-pointer"
                    >
                      <span>Manage Evidence</span>
                      <ArrowRight className="h-3 w-3" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
