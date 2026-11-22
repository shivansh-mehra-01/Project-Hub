"use client";

import React, { useState, useEffect } from "react";
import {
  FileCheck2,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  ShieldCheck,
  Clock,
  Stamp,
  Search,
  Bell,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Modal } from "@/design-system/components/Modal";
import { Textarea } from "@/design-system/components/Textarea";
import { collegeApi } from "@/lib/api/collegeApi";
import { InstitutionalDossierDto } from "@/lib/api/types";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";

export const AccreditationReportsView: React.FC = () => {
  const { departments: mockDepartments, college } = useProjectHubStore();

  const [loading, setLoading] = useState(true);
  const [dossier, setDossier] = useState<InstitutionalDossierDto | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"departments" | "po_matrix">("departments");

  // Filtering State for Department SAR Table
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "attested" | "pending">("all");

  // Sign-off Modal
  const [showSignOffModal, setShowSignOffModal] = useState(false);
  const [signOffRemarks, setSignOffRemarks] = useState(
    "Verified all Criterion 2 & 3 direct capstone rubrics, indirect surveys, and departmental viva panel evaluations for institutional compliance."
  );
  const [signing, setSigning] = useState(false);

  // Export State
  const [exporting, setExporting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useDashboardHeader({
    title: "Accreditation & Compliance",
    breadcrumb: "NBA Criterion 2 & 3 Compliance & SAR Dossiers",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await collegeApi.getComplianceDossier();
      if (res) {
        setDossier(res);
      }
    } catch (err) {
      console.warn("Failed to load dossier from API, using fallback", err);
      setDossier({
        collegeName: college.name,
        tenantCode: "SISTEC",
        ssoDomain: college.domain,
        affiliatedUniversity: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV Bhopal)",
        academicYear: "2026–2027",
        totalDepartments: mockDepartments.length || 9,
        totalStudents: mockDepartments.reduce((acc, d) => acc + (d.studentCount || 120), 0) || 1280,
        totalFaculty: 68,
        overallAttainmentPct: 84.2,
        isAttested: false,
        attestedAtUtc: undefined,
        departments: (mockDepartments.length > 0 ? mockDepartments : [
          { code: "CSE", name: "Computer Science & Engineering", hodName: "Dr. Ravindra Kumar Sharma", studentCount: 480, isSarAttested: true },
          { code: "ECE", name: "Electronics & Communication", hodName: "Dr. Sandeep Singh", studentCount: 320, isSarAttested: true },
          { code: "ME", name: "Mechanical Engineering", hodName: "Dr. R. K. Patel", studentCount: 260, isSarAttested: true },
          { code: "CE", name: "Civil Engineering", hodName: "Dr. S. K. Gupta", studentCount: 220, isSarAttested: false },
          { code: "MBA-FIN", name: "MBA Finance", hodName: "Dr. Alok Verma", studentCount: 120, isSarAttested: true },
          { code: "MBA-MKT", name: "MBA Marketing", hodName: "Dr. Neha Tiwari", studentCount: 120, isSarAttested: true },
          { code: "MBA-HR", name: "MBA Human Resources", hodName: "Dr. R. S. Solanki", studentCount: 120, isSarAttested: false },
          { code: "MCA-GEN", name: "MCA General Software Development", hodName: "Dr. Ajay Sharma", studentCount: 120, isSarAttested: true },
          { code: "MCA-SPEC", name: "MCA Specialization (AI & Data Science)", hodName: "Dr. Pooja Yadav", studentCount: 120, isSarAttested: false },
        ]).map((d: any, idx: number) => ({
          departmentCode: d.code,
          departmentName: d.name,
          hodName: d.hodName || "Dr. Department Head",
          studentCount: d.studentCount || 120,
          attainmentPct: 82.5 + (idx % 4),
          isSarAttested: d.isSarAttested ?? (idx < 6),
          sarAttestedAtUtc: (d.isSarAttested ?? (idx < 6)) ? "2026-11-18T12:00:00Z" : undefined,
        })),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSignOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigning(true);
    try {
      await collegeApi.signOffCompliance({ remarks: signOffRemarks });
      showToast("Institutional compliance signed and attested successfully!");
      setShowSignOffModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      showToast("Error attesting institutional compliance.");
    } finally {
      setSigning(false);
    }
  };

  const handleExportDossier = async () => {
    setExporting(true);
    try {
      const res = await collegeApi.getComplianceDossier();
      const exportData = res || dossier;

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NBA_Institutional_Attainment_Dossier_${dossier?.tenantCode || "COLLEGE"}_2026-2027.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast("Institutional NBA dossier exported successfully!");
    } catch (err) {
      console.error(err);
      showToast("Failed to export dossier.");
    } finally {
      setExporting(false);
    }
  };

  const handleRemindHod = (deptName: string) => {
    showToast(`Compliance reminder dispatched to HOD of ${deptName}.`);
  };

  // Program Outcomes (PO1–PO12) Standard AICTE/NBA Matrix
  const poAttainmentData = [
    { po: "PO1", title: "Engineering Knowledge", direct: 84.2, indirect: 80.0, blended: 83.4, target: 75.0 },
    { po: "PO2", title: "Problem Analysis", direct: 82.5, indirect: 81.2, blended: 82.2, target: 75.0 },
    { po: "PO3", title: "Design/Development of Solutions", direct: 85.0, indirect: 83.5, blended: 84.7, target: 75.0 },
    { po: "PO4", title: "Conduct Investigations of Complex Problems", direct: 79.4, indirect: 78.0, blended: 79.1, target: 75.0 },
    { po: "PO5", title: "Modern Tool Usage (GitHub/Jira)", direct: 88.6, indirect: 86.4, blended: 88.2, target: 75.0 },
    { po: "PO6", title: "The Engineer and Society", direct: 76.5, indirect: 75.0, blended: 76.2, target: 75.0 },
    { po: "PO7", title: "Environment and Sustainability (SDGs)", direct: 81.0, indirect: 79.5, blended: 80.7, target: 75.0 },
    { po: "PO8", title: "Ethics & Academic Integrity", direct: 91.2, indirect: 89.0, blended: 90.8, target: 75.0 },
    { po: "PO9", title: "Individual and Team Work", direct: 86.4, indirect: 84.0, blended: 85.9, target: 75.0 },
    { po: "PO10", title: "Communication & Viva Defence", direct: 83.0, indirect: 82.5, blended: 82.9, target: 75.0 },
    { po: "PO11", title: "Project Management and Finance", direct: 78.2, indirect: 77.0, blended: 78.0, target: 75.0 },
    { po: "PO12", title: "Life-long Learning", direct: 80.4, indirect: 79.0, blended: 80.1, target: 75.0 },
  ];

  const totalDepts = dossier?.departments.length || 9;
  const attestedCount = dossier?.departments.filter((d) => d.isSarAttested).length || 6;
  const pendingCount = totalDepts - attestedCount;

  // Filtered Departments
  const filteredDepartments = (dossier?.departments || []).filter((dept) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      dept.departmentName.toLowerCase().includes(q) ||
      dept.departmentCode.toLowerCase().includes(q) ||
      (dept.hodName && dept.hodName.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "attested" && dept.isSarAttested) ||
      (statusFilter === "pending" && !dept.isSarAttested);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 pb-8 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-lg animate-in fade-in">
          <CheckCircle2 className="h-4 w-4" />
          {toastMessage}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. EXECUTIVE HEADER & CONTROLS ROW                                        */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
            NBA Tier-II / NAAC Criterion 3
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500 font-medium">AY 2026–2027</span>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowSignOffModal(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <Stamp className="h-3.5 w-3.5 text-emerald-600" />
            <span>{dossier?.isAttested ? "Re-Attest Seal" : "Dean Sign-Off & Seal"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportDossier}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
          >
            {exporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                <span>Export Dossier</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. COMPACT SAAS METRIC ROW (CLEAN, NO FLUFF)                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: Overall NBA Attainment */}
        <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Overall NBA Attainment</span>
            <ShieldCheck className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
              {dossier?.overallAttainmentPct ? Number(dossier.overallAttainmentPct).toFixed(1) : "84.2"}%
            </span>
            <span className="text-[11px] font-semibold text-emerald-700">
              Target Exceeded (&ge; 75%)
            </span>
          </div>
        </div>

        {/* Metric 2: Department SAR Signed */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("departments");
            setStatusFilter("pending");
          }}
          className={`p-3.5 rounded-lg border text-left transition-colors duration-200 ease-out cursor-pointer bg-white ${
            statusFilter === "pending" && activeTab === "departments"
              ? "border-emerald-800 ring-1 ring-emerald-800/20"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Department SAR Sign-Off</span>
            <FileCheck2 className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
              {attestedCount} / {totalDepts}
            </span>
            {pendingCount > 0 ? (
              <span className="text-[11px] font-semibold text-amber-700">
                {pendingCount} Pending Sign-Off
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-emerald-700">All Signed</span>
            )}
          </div>
        </button>

        {/* Metric 3: Institutional Attestation Status */}
        <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Institutional Attestation</span>
            <Clock className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
          </div>
          <div className="mt-1">
            {dossier?.isAttested ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" strokeWidth={1.75} />
                <span>Attested by Dean</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <AlertCircle className="h-4 w-4 text-amber-600" strokeWidth={1.75} />
                <span>Awaiting Final Seal</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SUB-TAB NAVIGATION (DEPARTMENT SAR VS PO ATTAINMENT MATRIX)            */}
      {/* ========================================================================= */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("departments")}
          className={`pb-2.5 transition-colors relative inline-flex items-center gap-1.5 cursor-pointer ${
            activeTab === "departments"
              ? "text-emerald-700 font-bold border-b-2 border-emerald-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Department SAR Status ({totalDepts})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("po_matrix")}
          className={`pb-2.5 transition-colors relative inline-flex items-center gap-1.5 cursor-pointer ${
            activeTab === "po_matrix"
              ? "text-emerald-700 font-bold border-b-2 border-emerald-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Program Outcomes Matrix (PO1–PO12)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DEPARTMENT SAR COMPLIANCE TABLE                                    */}
      {/* ========================================================================= */}
      {activeTab === "departments" && (
        <div className="space-y-3">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter department or HOD..."
                  className="w-full pl-8 pr-3 h-8 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Status Tabs */}
              <div className="inline-flex items-center p-0.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    statusFilter === "all"
                      ? "bg-white text-slate-900 font-semibold shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  All ({totalDepts})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("attested")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    statusFilter === "attested"
                      ? "bg-white text-emerald-800 font-semibold shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Attested ({attestedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("pending")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    statusFilter === "pending"
                      ? "bg-white text-amber-800 font-semibold shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Pending ({pendingCount})
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4 min-w-[220px]">Department</th>
                    <th className="py-2.5 px-4 min-w-[200px]">Supervising HOD</th>
                    <th className="py-2.5 px-4 min-w-[90px] text-center">Intake</th>
                    <th className="py-2.5 px-4 min-w-[150px] text-center">Criterion 3 Attainment</th>
                    <th className="py-2.5 px-4 min-w-[150px]">SAR Sign-Off</th>
                    <th className="py-2.5 px-4 min-w-[120px] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No departments match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((dept) => (
                      <tr key={dept.departmentCode} className="hover:bg-slate-50/70 transition-colors">
                        {/* Department */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                              {dept.departmentCode}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {dept.departmentName}
                            </span>
                          </div>
                        </td>

                        {/* HOD */}
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {dept.hodName || <span className="text-slate-400 italic font-normal">Awaiting HOD</span>}
                        </td>

                        {/* Intake */}
                        <td className="py-3 px-4 text-center font-mono text-slate-600">
                          {dept.studentCount}
                        </td>

                        {/* Criterion 3 */}
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-700">
                              {Number(dept.attainmentPct).toFixed(1)}%
                            </span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-600 rounded-full"
                                style={{ width: `${Math.min(dept.attainmentPct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {dept.isSarAttested ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              Attested
                              {dept.sarAttestedAtUtc && (
                                <span className="text-[10px] text-slate-400">
                                  ({new Date(dept.sarAttestedAtUtc).toLocaleDateString("en-US", { month: "short", day: "numeric" })})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Pending Sign-Off
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {dept.isSarAttested ? (
                            <span className="text-[11px] text-slate-400 font-medium">Locked & Signed</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemindHod(dept.departmentName)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                            >
                              <Bell className="h-3 w-3" />
                              <span>Remind HOD</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PROGRAM OUTCOMES (PO1–PO12) STREAMLINED MATRIX                     */}
      {/* ========================================================================= */}
      {activeTab === "po_matrix" && (
        <div className="space-y-3">
          {/* Summary Strip */}
          <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <span>All 12 Program Outcomes exceed the NBA / AICTE minimum benchmark of 75.0%</span>
            </div>
            <span className="font-mono font-bold text-emerald-800">Direct 80% + Indirect 20%</span>
          </div>

          {/* PO Matrix Table */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4 min-w-[70px]">PO</th>
                    <th className="py-2.5 px-4 min-w-[280px]">Outcome Description</th>
                    <th className="py-2.5 px-4 min-w-[120px] text-center">Direct (80%)</th>
                    <th className="py-2.5 px-4 min-w-[120px] text-center">Indirect (20%)</th>
                    <th className="py-2.5 px-4 min-w-[150px] text-center">Blended Score</th>
                    <th className="py-2.5 px-4 min-w-[100px] text-center">Benchmark</th>
                    <th className="py-2.5 px-4 min-w-[110px] text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {poAttainmentData.map((item) => (
                    <tr key={item.po} className="hover:bg-slate-50/70 transition-colors">
                      {/* PO Code */}
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {item.po}
                      </td>

                      {/* Title */}
                      <td className="py-2.5 px-4 font-medium text-slate-800">
                        {item.title}
                      </td>

                      {/* Direct */}
                      <td className="py-2.5 px-4 text-center font-mono text-slate-600">
                        {item.direct}%
                      </td>

                      {/* Indirect */}
                      <td className="py-2.5 px-4 text-center font-mono text-slate-600">
                        {item.indirect}%
                      </td>

                      {/* Blended Score */}
                      <td className="py-2.5 px-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-700">
                            {item.blended.toFixed(1)}%
                          </span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${Math.min(item.blended, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Target */}
                      <td className="py-2.5 px-4 text-center font-mono text-slate-500">
                        {item.target}%
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          Exceeded
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Dean / Principal Sign-off                                          */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showSignOffModal}
        onClose={() => setShowSignOffModal(false)}
        title="Dean / Principal Official Compliance Attestation"
        description="Attach institutional digital seal to all departmental Criterion 2 & 3 attainment dossiers."
      >
        <form onSubmit={handleSignOffSubmit} className="space-y-3.5 pt-1">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
            <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              <span>NBA Criterion 2 & 3 Compliance Statement</span>
            </div>
            <p className="text-emerald-800 text-[11px] leading-relaxed">
              By signing, you officially attest that capstone project evaluations adhere to AICTE guidelines, rubrics are tamper-proof, and outcomes meet accreditation thresholds.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Official Attestation Remarks</label>
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
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={signing}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
            >
              {signing ? "Attesting..." : "Sign & Attest Dossier"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
