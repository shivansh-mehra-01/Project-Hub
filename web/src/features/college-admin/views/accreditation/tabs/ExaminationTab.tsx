"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  ShieldCheck,
  Award,
  Hash,
  Clock,
  Printer,
} from "lucide-react";
import { collegeApi } from "@/lib/api/collegeApi";
import {
  ExaminationTabulationRegisterDto,
  ExaminationTabulationRowDto,
  DepartmentDto,
} from "@/lib/api/types";
import { Modal } from "@/design-system/components/Modal";
import { ApiConnectionBanner } from "../../../components/ApiConnectionBanner";

interface ExaminationTabProps {
  departments: DepartmentDto[];
}

export const ExaminationTab: React.FC<ExaminationTabProps> = ({ departments }) => {
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [register, setRegister] = useState<ExaminationTabulationRegisterDto | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  // Certification Modal
  const [showCertifyModal, setShowCertifyModal] = useState(false);
  const [certifyRemarks, setCertifyRemarks] = useState("");
  const [isCertifying, setIsCertifying] = useState(false);
  const [certifiedResult, setCertifiedResult] = useState<{ certifiedBy: string; certifiedAtUtc: string; checksum: string } | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadRegister = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await collegeApi.getExaminationResults({
        departmentId: selectedDeptId !== "all" ? selectedDeptId : undefined,
      });
      setRegister(res);
    } catch (err: any) {
      console.error("Failed to load examination tabulation register:", err);
      setApiError(err?.message || "Failed to load examination tabulation register from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegister();
  }, [selectedDeptId]);

  const handleCertify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCertifying(true);
    try {
      const res = await collegeApi.certifyExaminationResults({ remarks: certifyRemarks });
      setCertifiedResult({
        certifiedBy: res.certifiedBy,
        certifiedAtUtc: res.certifiedAtUtc,
        checksum: res.checksum,
      });
      setShowCertifyModal(false);
      showToast("Examination Tabulation Register officially certified!");
      loadRegister();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Failed to certify examination register.");
    } finally {
      setIsCertifying(false);
    }
  };

  const handleExportCsv = () => {
    if (!register || register.rows.length === 0) {
      showToast("No student records available for export.");
      return;
    }

    const headers = [
      "EnrollmentNumber",
      "StudentName",
      "Department",
      "TeamCode",
      "ProjectTitle",
      `GuideScore(${register.guideWeightPct}%)`,
      `MidTermScore(${register.midTermWeightPct}%)`,
      `FinalVivaScore(${register.finalVivaWeightPct}%)`,
      "TotalScore(100)",
      "Grade",
      "GradePoints",
      "ResultStatus",
    ];

    const csvRows = register.rows.map((r) => [
      r.enrollmentNumber,
      `"${r.studentName}"`,
      r.departmentCode,
      r.teamNumber,
      `"${r.projectTitle.replace(/"/g, '""')}"`,
      r.guideScore,
      r.midTermScore,
      r.finalVivaScore,
      r.totalScore,
      r.grade,
      r.gradePoints,
      r.resultStatus,
    ]);

    const csvString = [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `University_Tabulation_Register_${register.academicYear.replace(/–/g, "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Tabulation Register CSV exported successfully!");
  };

  // Filtered rows
  const filteredRows = (register?.rows || []).filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.studentName.toLowerCase().includes(q) ||
      r.enrollmentNumber.toLowerCase().includes(q) ||
      r.projectTitle.toLowerCase().includes(q) ||
      r.teamNumber.toLowerCase().includes(q);

    const matchesGrade = gradeFilter === "all" || r.grade === gradeFilter;

    return matchesSearch && matchesGrade;
  });

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-lg">
          <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
          <span>{toastMessage}</span>
        </div>
      )}

      {apiError && (
        <ApiConnectionBanner onRetry={loadRegister} message={apiError} isRetrying={loading} />
      )}

      {/* Header Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Evaluation Weights</span>
          <div className="mt-1 flex items-baseline gap-1.5 text-xs font-bold text-slate-900">
            <span>Guide: {register?.guideWeightPct ?? 30}%</span>
            <span>• Mid: {register?.midTermWeightPct ?? 30}%</span>
            <span>• Viva: {register?.finalVivaWeightPct ?? 40}%</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Total: 100% (Continuous Evaluation)</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Evaluated</span>
          <span className="block text-2xl font-bold text-slate-900 font-mono mt-1">
            {register?.totalStudentsTabulated ?? 0}
          </span>
          <span className="text-[11px] text-slate-500">Students across capstone teams</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Pass Rate</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-emerald-800 font-mono">
              {register?.totalStudentsTabulated ? Math.round(((register.totalPassed) / register.totalStudentsTabulated) * 100) : 0}%
            </span>
            <span className="text-xs text-slate-500">
              ({register?.totalPassed ?? 0} Passed / {register?.totalFailed ?? 0} Failed)
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Standard 10-point CBCS grading</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Certification Status</span>
          <div className="mt-1">
            {certifiedResult || register?.isCertified ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Certified by COE / Dean
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <Clock className="h-3.5 w-3.5" />
                Draft Internal Register
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block truncate">
            {certifiedResult ? `Hash: ${certifiedResult.checksum.slice(0, 16)}...` : "Awaiting Institutional Sign-Off"}
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search student, enrollment, or project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>

            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="all">All Grades</option>
              <option value="A+">A+ (&ge;90%)</option>
              <option value="A">A (&ge;80%)</option>
              <option value="B+">B+ (&ge;70%)</option>
              <option value="B">B (&ge;60%)</option>
              <option value="C+">C+ (&ge;50%)</option>
              <option value="C">C (&ge;40%)</option>
              <option value="F">F (&lt;40%)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <Download className="h-4 w-4 text-slate-500" />
              <span>Export Tabulation CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCertifyModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-800 rounded-lg hover:bg-emerald-900 cursor-pointer shadow-xs"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Certify Register</span>
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin mr-2 text-emerald-800" />
            Compiling institutional continuous evaluations...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No student marks found for the selected department or filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3">Enrollment / USN</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Dept</th>
                  <th className="p-3">Project / Team</th>
                  <th className="p-3 text-center">Guide ({register?.guideWeightPct}%)</th>
                  <th className="p-3 text-center">Mid-Term ({register?.midTermWeightPct}%)</th>
                  <th className="p-3 text-center">Final Viva ({register?.finalVivaWeightPct}%)</th>
                  <th className="p-3 text-center">Total (100)</th>
                  <th className="p-3 text-center">Grade</th>
                  <th className="p-3 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRows.map((row) => (
                  <tr key={row.studentId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-mono font-semibold text-slate-900">
                      {row.enrollmentNumber}
                    </td>
                    <td className="p-3 font-semibold text-slate-900">
                      {row.studentName}
                    </td>
                    <td className="p-3 font-medium text-slate-600">
                      {row.departmentCode}
                    </td>
                    <td className="p-3 max-w-xs">
                      <div className="font-medium text-slate-800 truncate" title={row.projectTitle}>{row.projectTitle}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{row.teamNumber}</div>
                    </td>
                    <td className="p-3 text-center font-mono">{row.guideScore}</td>
                    <td className="p-3 text-center font-mono">{row.midTermScore}</td>
                    <td className="p-3 text-center font-mono">{row.finalVivaScore}</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-900">{row.totalScore}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.grade === "A+" || row.grade === "A"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : row.grade === "B+" || row.grade === "B"
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : row.grade === "F"
                          ? "bg-rose-50 text-rose-800 border border-rose-200"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {row.grade} ({row.gradePoints} GP)
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`font-bold text-[11px] ${row.resultStatus === "Pass" ? "text-emerald-700" : "text-rose-600"}`}>
                        {row.resultStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Official Institutional Examination Tabulation Register • Autonomous CBCS Grading Standards</span>
          <span className="font-mono">RGPV Ordinance 4-A / Autonomous Compliant</span>
        </div>
      </div>

      {/* Certify Modal */}
      <Modal
        isOpen={showCertifyModal}
        onClose={() => setShowCertifyModal(false)}
        title="Certify Examination Tabulation Register"
        description="Execute official institutional sign-off for semester capstone results. Once certified, records are cryptographically sealed in the audit trail."
        size="md"
      >
        <form onSubmit={handleCertify} className="space-y-4">
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <p className="font-semibold">Statutory Authority</p>
            <p className="text-[11px] leading-relaxed">
              This certification confirms that guide continuous evaluations, mid-term reviews, and viva panel defenses have been verified across all affiliated academic departments.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Institutional Remarks / Controller of Examinations Endorsement
            </label>
            <textarea
              rows={3}
              value={certifyRemarks}
              onChange={(e) => setCertifyRemarks(e.target.value)}
              placeholder="e.g., Results verified and certified by Academic Examination Board on Nov 22, 2026."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-700"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCertifyModal(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCertifying}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 rounded-lg hover:bg-emerald-900 cursor-pointer disabled:opacity-50"
            >
              {isCertifying ? "Certifying..." : "Confirm & Seal Register"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
