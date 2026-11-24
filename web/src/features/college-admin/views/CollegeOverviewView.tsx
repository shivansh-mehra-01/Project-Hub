"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  GraduationCap,
  Layers,
  GitFork,
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  Zap,
  BookOpen,
  UserCheck,
  FileText,
  Bell,
  CheckCircle2,
  Info,
  AlertTriangle,
  Monitor,
  Briefcase,
  ChevronRight,
  MapPin,
  TrendingUp,
  Download,
  ShieldCheck,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { collegeApi } from "@/lib/api/collegeApi";
import {
  CollegeOverviewDto,
  DepartmentDto,
  CourseProgramDto,
  OverviewCourseHierarchyDto,
  AicteCadreComplianceDto,
  CohortEnrollmentCapacityDto,
} from "@/lib/api/types";
import { ApiConnectionBanner } from "../components/ApiConnectionBanner";

export const CollegeOverviewView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [overview, setOverview] = useState<CollegeOverviewDto | null>(null);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [programs, setPrograms] = useState<CourseProgramDto[]>([]);

  useDashboardHeader({
    title: "Overview",
    breadcrumb: "Institutional KPIs, intake quotas, and statutory compliance status",
  });

  const loadData = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [ovRes, deptRes, progRes] = await Promise.all([
        collegeApi.getOverview(),
        collegeApi.getDepartments(),
        collegeApi.getCoursePrograms(),
      ]);
      setOverview(ovRes);
      setDepartments(deptRes || []);
      setPrograms(progRes || []);
    } catch (err: any) {
      console.error("Failed to load college overview data:", err);
      setApiError(err?.message || "Failed to load live institutional metrics from Colabex backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Derived Values from live persistent data
  const totalStudents = overview?.totalStudents ?? 0;
  const totalFaculty = overview?.totalFaculty ?? 0;
  const totalCourses = overview?.totalCourses ?? programs.length;
  const totalBranches = overview?.totalBranches ?? departments.length;

  const cohortCap: CohortEnrollmentCapacityDto = overview?.cohortCapacity || {
    totalSanctionedMultiCohortCapacity: departments.reduce((acc, d) => acc + (d.intakeQuota || 120) * 4, 0) || 480,
    totalEnrolledStudents: totalStudents,
    utilizationPercentage: 0,
    hasReliableEnrollmentRecords: false,
    statusMessage: "Active student accounts used for estimation.",
  };

  const aictePrograms: AicteCadreComplianceDto[] = overview?.programAicteCompliance || [];

  const activeSessionLabel = overview?.activeSession?.label || "2026–2027";
  const currentSemester = overview?.currentSemesterLabel || "Odd Semester";
  const lastUpdatedFormatted = overview?.lastUpdatedUtc
    ? `${new Date(overview.lastUpdatedUtc).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} • ${new Date(overview.lastUpdatedUtc).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`
    : "Live Synced";

  const institutionName = overview?.collegeName || "Sagar Institute of Science and Technology (SISTec)";
  const affiliation = overview?.affiliatedUniversity || "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)";
  const collegeType = overview?.collegeType || "Engineering";
  const establishedYear = overview?.establishedYear || "1952";
  const campusesSummary = overview?.campusesSummary || "1 Campus";
  const crestUrl = overview?.crestUrl || "/college-crest.png";

  const totalDeptsForSar = overview?.totalDepartmentsForSar ?? departments.length;
  const attestedDeptsCount = overview?.attestedDepartmentsCount ?? departments.filter((d) => d.isSarAttested).length;
  const sarAttestPct = overview?.sarDepartmentAttestationPct ?? (totalDeptsForSar > 0 ? Math.round((attestedDeptsCount / totalDeptsForSar) * 100) : 0);

  const vacantDepts = departments.filter((d) => !d.hodUserId && !d.hodName);
  const appointedDeptsCount = departments.length - vacantDepts.length;

  const academicStructure: OverviewCourseHierarchyDto[] = overview?.academicStructure || [];
  const activities = overview?.recentActivities || [];
  const notifications = overview?.notifications || [];

  return (
    <div className="space-y-6 pb-8 font-sans bg-[#f8fafc]">
      {/* Backend Connection Error Banner (shown only when API fails) */}
      {apiError && (
        <ApiConnectionBanner onRetry={loadData} message={apiError} isRetrying={loading} />
      )}

      {/* Loading Skeleton */}
      {loading && !overview && (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-800 mr-2" />
          <span className="text-xs font-semibold text-slate-700">Connecting to institutional backend...</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: ACADEMIC SESSION & CAMPUS STATUS STRIP                          */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
            <Calendar className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-semibold text-slate-900">
              Academic Session {activeSessionLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Active Term
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">
              Term: <strong className="text-slate-900 font-semibold">{currentSemester}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600 font-medium truncate max-w-sm">
              {institutionName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <Clock className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />
          <span>Synced: {lastUpdatedFormatted}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: STATUTORY EXECUTIVE KPI SURFACES                               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Cohort Intake Capacity & Utilization */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Student Intake</span>
            <div className="h-8 w-8 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 flex items-center justify-center">
              <Users className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                {cohortCap.totalEnrolledStudents.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                / {cohortCap.totalSanctionedMultiCohortCapacity.toLocaleString()} Seats
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-sky-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, cohortCap.utilizationPercentage)}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-sky-800 font-mono">
                {cohortCap.utilizationPercentage}% Enrolled
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 truncate" title={cohortCap.statusMessage}>
            {cohortCap.statusMessage}
          </span>
        </div>

        {/* KPI 2: AICTE Faculty Strength & Ratio */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AICTE Faculty Strength</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center">
              <GraduationCap className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                {totalFaculty}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Faculty Members
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              {aictePrograms.length > 0 ? (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                  aictePrograms.every((p) => p.cadreStatus === "Compliant")
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : aictePrograms.some((p) => p.cadreStatus === "Compliant — subject to qualification verification")
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : aictePrograms.some((p) => p.cadreStatus === "Insufficient Data")
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}>
                  {aictePrograms.some((p) => p.cadreStatus === "Insufficient Data")
                    ? "Cadres Unassigned in Directory"
                    : aictePrograms.some((p) => p.cadreStatus === "Compliant — subject to qualification verification")
                    ? "Compliant — Subject to Qualification Verification"
                    : aictePrograms.every((p) => p.cadreStatus === "Compliant")
                    ? "Cadre Compliant (1:2:6)"
                    : "Cadre Shortfall Detected"}
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">UG Engineering Norm 1:20</span>
              )}
            </div>
          </div>
          <Link
            href="/college/users"
            className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1"
          >
            Manage Staff & Cadres <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* KPI 3: Department Leadership & HOD Status */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department Leadership</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-center justify-center">
              <UserCheck className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                {appointedDeptsCount} of {departments.length}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Appointed
              </span>
            </div>
            <div className="mt-1">
              {vacantDepts.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                  <AlertTriangle className="h-3 w-3" />
                  {vacantDepts.length} {vacantDepts.length === 1 ? "branch requires" : "branches require"} HOD
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  All departments have appointed leadership
                </span>
              )}
            </div>
          </div>
          <Link
            href="/college/hods"
            className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1"
          >
            View Leadership Roster <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* KPI 4: Institutional SAR Readiness */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SAR Attestation</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                {sarAttestPct}%
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Attested
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${sarAttestPct}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-amber-800 font-mono">
                {attestedDeptsCount} of {totalDeptsForSar} Branches
              </span>
            </div>
          </div>
          <Link
            href="/college/accreditation"
            className="text-[11px] font-semibold text-amber-800 hover:text-amber-900 inline-flex items-center gap-1"
          >
            View Accreditation <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: AICTE CADRE COMPLIANCE & INSTITUTION PROFILE                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Surface 1: AICTE Program Compliance Matrix (7 Cols) */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
              <h2 className="text-sm font-bold text-slate-900">AICTE Cadre & Faculty-Student Ratio (FSR)</h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              AICTE APH 2024–2027
            </span>
          </div>

          {aictePrograms.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-100 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-2.5">Program</th>
                    <th className="p-2.5 text-center">Annual Intake</th>
                    <th className="p-2.5 text-center">Sanctioned Seats</th>
                    <th className="p-2.5 text-center">Faculty (Req / Avail)</th>
                    <th className="p-2.5 text-center">FSR Ratio</th>
                    <th className="p-2.5 text-right">Cadre Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {aictePrograms.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-bold text-slate-900">
                        {p.programCode}
                        <span className="block text-[10px] text-slate-400 font-normal">{p.programLevel}</span>
                      </td>
                      <td className="p-2.5 text-center font-mono">{p.sanctionedIntake}</td>
                      <td className="p-2.5 text-center font-mono">{p.totalSanctionedStrength}</td>
                      <td className="p-2.5 text-center font-mono font-medium">
                        {p.requiredFaculty} / <span className={p.availableFaculty < p.requiredFaculty ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"}>{p.availableFaculty}</span>
                      </td>
                      <td className="p-2.5 text-center font-mono">{p.actualRatio}</td>
                      <td className="p-2.5 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.cadreStatus === "Compliant"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : p.cadreStatus === "Compliant — subject to qualification verification"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : p.cadreStatus === "Insufficient Data"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                        }`}>
                          {p.cadreStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Statutory Qualification Notice if Associate Professor substitution is active */}
              {aictePrograms.some((p) => p.isSubstituted && p.qualificationVerificationNotice) && (
                <div className="mt-3 p-3.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <ShieldAlert className="h-4 w-4 text-amber-800 shrink-0" strokeWidth={2} />
                    <span>Statutory Qualification Notice</span>
                  </div>
                  {aictePrograms
                    .filter((p) => p.isSubstituted && p.qualificationVerificationNotice)
                    .map((p, idx) => (
                      <p key={idx} className="text-[11px] text-amber-900 leading-relaxed pl-5.5">
                        <strong>[{p.programCode}]:</strong> {p.qualificationVerificationNotice}
                      </p>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
              No statutory program data loaded. Ensure degree programs and branch quotas are configured in Programs & Branches.
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-500">
              Professors, Associate Professors, and Assistant Professors cadre distribution audited per AICTE norms.
            </span>
            <Link
              href="/college/users"
              className="font-semibold text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1"
            >
              Assign Cadres in Staff Directory <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Surface 2: Campus Profile & University Affiliation (5 Cols) */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
              <h2 className="text-sm font-bold text-slate-900">Institutional Identity</h2>
            </div>
            <Link
              href="/college/settings"
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1"
            >
              Settings <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 rounded-lg border border-slate-200 bg-white flex items-center justify-center p-1 shrink-0">
              <Image
                src={crestUrl}
                alt="College Crest"
                width={48}
                height={48}
                className="h-full w-full object-contain"
                unoptimized
              />
            </div>
            <div className="min-w-0 space-y-0.5">
              <h3 className="text-xs font-bold text-slate-900 truncate" title={institutionName}>
                {institutionName}
              </h3>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <MapPin className="h-3 w-3 text-slate-400 shrink-0" strokeWidth={1.75} />
                <span className="truncate">Airport Road, Gandhi Nagar, Bhopal</span>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden bg-slate-50/40 text-xs">
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              <div className="p-2.5 space-y-0.5">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Affiliated University
                </span>
                <span className="block font-semibold text-slate-900 text-xs truncate" title={affiliation}>
                  {affiliation}
                </span>
              </div>
              <div className="p-2.5 space-y-0.5">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Institution Category
                </span>
                <span className="block font-semibold text-slate-900 text-xs truncate">
                  {collegeType}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              <div className="p-2.5 space-y-0.5">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Established Year
                </span>
                <span className="block font-semibold text-slate-900 text-xs">
                  Year {establishedYear}
                </span>
              </div>
              <div className="p-2.5 space-y-0.5">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Campus Locations
                </span>
                <span className="block font-semibold text-slate-900 text-xs truncate">
                  {campusesSummary}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/college/settings"
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors duration-200 ease-out cursor-pointer"
          >
            <span>Institutional Settings & Seals</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: INSTITUTIONAL ACTION ITEMS & GOVERNANCE AUDIT TRAIL             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Surface 1: Immediate Action Items / Priority Exceptions (5 Cols) */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
              <h2 className="text-sm font-bold text-slate-900">Governance Action Items</h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 font-mono">
              {(vacantDepts.length > 0 ? 1 : 0) + (aictePrograms.some((p) => p.cadreStatus !== "Compliant") ? 1 : 0) + (sarAttestPct < 100 ? 1 : 0)} Pending
            </span>
          </div>

          <div className="space-y-2.5">
            {vacantDepts.length > 0 && (
              <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/50 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    <span>HOD Vacancies Requiring Appointment</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-snug">
                    {vacantDepts.length} {vacantDepts.length === 1 ? "branch is" : "branches are"} operating without appointed departmental leadership.
                  </p>
                </div>
                <Link
                  href="/college/hods"
                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                >
                  Appoint
                </Link>
              </div>
            )}

            {aictePrograms.some((p) => p.cadreStatus !== "Compliant") && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>AICTE Faculty Cadre Shortfall</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    Teaching staff cadre distribution does not satisfy AICTE 1:2:6 cadre ratio or requires qualification verification.
                  </p>
                </div>
                <Link
                  href="/college/users"
                  className="px-2.5 py-1 rounded bg-amber-700 hover:bg-amber-800 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                >
                  Review
                </Link>
              </div>
            )}

            {sarAttestPct < 100 && (
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-800 shrink-0" />
                    <span>NBA SAR Department Sign-Off</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    {totalDeptsForSar - attestedDeptsCount} {totalDeptsForSar - attestedDeptsCount === 1 ? "department has" : "departments have"} pending SAR self-assessment attestations.
                  </p>
                </div>
                <Link
                  href="/college/accreditation"
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                >
                  Attest
                </Link>
              </div>
            )}

            {vacantDepts.length === 0 && !aictePrograms.some((p) => p.cadreStatus !== "Compliant") && sarAttestPct === 100 && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center space-y-1">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto" />
                <span className="text-xs font-bold text-emerald-900 block">All Governance Mandates Complete</span>
                <p className="text-[11px] text-emerald-700">All leadership appointments, faculty cadres, and SAR dossiers are verified.</p>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Action queue monitors regulatory deadlines and leadership vacancies.</span>
          </div>
        </div>

        {/* Surface 2: Governance Audit Trail (7 Cols) */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
              <h2 className="text-sm font-bold text-slate-900">Governance Audit Trail</h2>
            </div>
            <Link
              href="/college/accreditation?tab=activity"
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 transition-colors"
            >
              Full Audit Log →
            </Link>
          </div>

          <div className="relative pl-5 space-y-3.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-xs">
            {activities.length > 0 ? (
              activities.map((act, idx) => (
                <div key={idx} className="relative space-y-0.5">
                  <div className="absolute -left-5 top-1.5 h-2 w-2 rounded-full bg-emerald-700 ring-2 ring-white" />
                  <div className="font-semibold text-slate-900 leading-snug">{act.title}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{act.timeAgo}</div>
                </div>
              ))
            ) : (
              <div className="text-slate-400 text-xs italic py-4">No recent institutional activities recorded.</div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Immutable institutional audit log capturing administrative actions.</span>
            <span className="text-[10px] font-mono text-slate-400">Audit Ledger Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
