"use client";

import React, { useState } from "react";
import {
  FileText,
  Download,
  Stamp,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { AccreditationCycleDto } from "@/lib/api/accreditationTypes";
import { Modal } from "@/design-system/components/Modal";
import { Textarea } from "@/design-system/components/Textarea";

interface ReportsAndExportTabProps {
  activeCycle: AccreditationCycleDto | null;
  onNavigateTab: (tab: string) => void;
}

export const ReportsAndExportTab: React.FC<ReportsAndExportTabProps> = ({
  activeCycle,
  onNavigateTab,
}) => {
  const [showSignOffModal, setShowSignOffModal] = useState(false);
  const [signOffRemarks, setSignOffRemarks] = useState(
    "Verified all program criteria, rubrics, indirect surveys, and departmental records for institutional compliance."
  );
  const [isExporting, setIsExporting] = useState(false);
  const [isAttested, setIsAttested] = useState(false);

  // NBA Criteria Breakdown
  const criteriaData = [
    { code: "Criterion 1", title: "Vision, Mission & PEOs", max: 50, attained: 48, status: "Complete" },
    { code: "Criterion 2", title: "Program Curriculum & Teaching-Learning", max: 100, attained: 88, status: "Complete" },
    { code: "Criterion 3", title: "Course Outcomes & PO Attainment", max: 120, attained: 101, status: "Complete" },
    { code: "Criterion 4", title: "Students' Performance", max: 150, attained: 112, status: "Complete" },
    { code: "Criterion 5", title: "Faculty Information & Contributions", max: 200, attained: 124, status: "In Progress" },
    { code: "Criterion 6", title: "Facilities & Technical Support", max: 80, attained: 72, status: "Complete" },
    { code: "Criterion 7", title: "Continuous Improvement", max: 75, attained: 38, status: "In Progress" },
    { code: "Criterion 8", title: "First Year Academics", max: 50, attained: 40, status: "Complete" },
    { code: "Criterion 9", title: "Student Support Systems", max: 50, attained: 35, status: "Complete" },
    { code: "Criterion 10", title: "Governance, Institutional Support & Finance", max: 125, attained: 81, status: "In Progress" },
  ];

  const totalMax = criteriaData.reduce((acc, c) => acc + c.max, 0);
  const totalAttained = criteriaData.reduce((acc, c) => acc + c.attained, 0);

  const handleExportJson = () => {
    setIsExporting(true);
    try {
      const exportData = {
        cycleName: activeCycle?.cycleName || "B.Tech CSE - 2026 SAR Accreditation Cycle",
        framework: activeCycle?.frameworkCode || "NBA",
        academicYear: activeCycle?.academicYear || "2026–2027",
        totalScore: `${totalAttained} / ${totalMax}`,
        scorePct: `${((totalAttained / totalMax) * 100).toFixed(1)}%`,
        status: activeCycle?.status || "DataCollection",
        criteria: criteriaData,
        exportedAtUtc: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Accreditation_SAR_Dossier_2026.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  };

  const handleSignOff = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAttested(true);
    setShowSignOffModal(false);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE REPORT SUMMARY CARD                                          */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                {activeCycle?.frameworkCode || "NBA"}
              </span>
              <span className="text-xs font-semibold text-slate-600">
                Self Assessment Report (SAR) Dossier
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-mono text-slate-500">
                AY {activeCycle?.academicYear || "2026–2027"}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900">
              {activeCycle?.cycleName || "B.Tech CSE - 2026 SAR Accreditation Cycle"}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowSignOffModal(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Stamp className="h-3.5 w-3.5 text-emerald-800" strokeWidth={1.75} />
              <span>{isAttested ? "Dean Attested" : "Dean Sign-Off & Seal"}</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-xs"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  <span>Packaging Dossier...</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span>Export Official Dossier</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3 Key Attainment Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40">
            <span className="block text-xs font-medium text-slate-500">Overall SAR Marks</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-slate-900 font-mono">
                {totalAttained} / {totalMax}
              </span>
              <span className="text-[11px] font-semibold text-emerald-700">
                {((totalAttained / totalMax) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40">
            <span className="block text-xs font-medium text-slate-500">Accreditation Threshold</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-slate-900 font-mono">
                &ge; 600 Marks
              </span>
              <span className="text-[11px] font-semibold text-emerald-700">
                Threshold Met (3 Yrs)
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40">
            <span className="block text-xs font-medium text-slate-500">Institutional Seal</span>
            <div className="mt-1">
              {isAttested ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" strokeWidth={1.75} />
                  <span>Attested by Principal / Dean</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                  <Clock className="h-4 w-4 text-amber-600" strokeWidth={1.75} />
                  <span>Ready for Final Sign-Off</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CRITERIA MARKS BREAKDOWN TABLE (Single Surface with Dividers)          */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Criterion-Wise Evaluation Scores Breakdown
          </h3>
          <span className="text-xs font-mono font-semibold text-slate-500">
            10 Standard Criteria
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4 min-w-[120px]">Criterion</th>
                <th className="py-2.5 px-4 min-w-[280px]">Evaluation Category</th>
                <th className="py-2.5 px-4 min-w-[100px] text-center">Max Marks</th>
                <th className="py-2.5 px-4 min-w-[120px] text-center">Attained Marks</th>
                <th className="py-2.5 px-4 min-w-[150px]">Attainment %</th>
                <th className="py-2.5 px-4 min-w-[100px] text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {criteriaData.map((crit) => {
                const pct = ((crit.attained / crit.max) * 100).toFixed(1);

                return (
                  <tr key={crit.code} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {crit.code}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {crit.title}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">
                      {crit.max}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                      {crit.attained}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-emerald-800 w-10">
                          {pct}%
                        </span>
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-800 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                          crit.status === "Complete" ? "text-emerald-700" : "text-amber-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            crit.status === "Complete" ? "bg-emerald-600" : "bg-amber-500"
                          }`}
                        />
                        {crit.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sign-off Modal */}
      {showSignOffModal && (
        <Modal
          isOpen={showSignOffModal}
          onClose={() => setShowSignOffModal(false)}
          title="Dean / Principal Official Compliance Attestation"
          description="Attach institutional digital seal to all departmental Criterion attainment dossiers."
        >
          <form onSubmit={handleSignOff} className="space-y-4 pt-1 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
              <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
                <span>Accreditation Regulatory Compliance Attestation</span>
              </div>
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                By sealing, you officially attest that all capstone project rubrics, attainment calculations, and faculty records meet NBA/NAAC guidelines.
              </p>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Official Attestation Remarks</label>
              <Textarea
                rows={3}
                value={signOffRemarks}
                onChange={(e) => setSignOffRemarks(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSignOffModal(false)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
              >
                Sign & Attest Dossier
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
