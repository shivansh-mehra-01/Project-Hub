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
  const activeAictePrograms = aictePrograms.filter((p) => p.cadreStatus !== "No Intake");
  const hasFacultyComplianceIssue = activeAictePrograms.some((p) => p.cadreStatus !== "Compliant");

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
      {/* SECTION 1: ACADEMIC YEAR & STATUS STRIP                                    */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
            <Calendar className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="flex items-center gap-2.5 flex-wrap text-xs">
            <span className="font-semibold text-slate-900">
              Academic Year {activeSessionLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Current Semester
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">
              Semester: <strong className="text-slate-900 font-semibold">{currentSemester.replace(/ Semester/i, "")}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <Clock className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />
          <span>Last Updated: {lastUpdatedFormatted.replace("Live Synced", "Recently")}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: DASHBOARD SUMMARY CARDS                                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {/* Card 1: Total Students */}
        <div className="h-full rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</span>
            <div className="h-8 w-8 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 flex items-center justify-center">
              <Users className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 font-heading tabular-nums tracking-tight">
                {cohortCap.totalEnrolledStudents.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                / {cohortCap.totalSanctionedMultiCohortCapacity.toLocaleString()} Seats
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`bg-sky-600 h-1.5 rounded-full transition-all duration-500 ${
                    cohortCap.utilizationPercentage > 0 && cohortCap.utilizationPercentage < 4 ? "min-w-[12px]" : ""
                  }`}
                  style={{ width: `${Math.min(100, cohortCap.utilizationPercentage)}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-sky-800 tabular-nums shrink-0">
                {cohortCap.utilizationPercentage}% Enrolled
              </span>
            </div>
          </div>
          <Link
            href="/college/courses"
            className="text-[11px] font-semibold text-sky-800 hover:text-sky-900 inline-flex items-center gap-1 mt-auto"
          >
            View Programs & Intake <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Card 2: Total Faculty */}
        <div className="h-full rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Faculty</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center">
              <GraduationCap className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 font-heading tabular-nums tracking-tight">
                {totalFaculty}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Faculty Members
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              {activeAictePrograms.length > 0 ? (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                  activeAictePrograms.every((p) => p.cadreStatus === "Compliant")
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : activeAictePrograms.some((p) => p.cadreStatus === "Compliant — subject to qualification verification")
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : activeAictePrograms.some((p) => p.cadreStatus === "Insufficient Data")
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}>
                  {activeAictePrograms.some((p) => p.cadreStatus === "Insufficient Data")
                    ? "Faculty Roles Not Assigned"
                    : activeAictePrograms.some((p) => p.cadreStatus === "Compliant — subject to qualification verification")
                    ? "Meets Requirements (Check Needed)"
                    : activeAictePrograms.every((p) => p.cadreStatus === "Compliant")
                    ? "Meets Requirements"
                    : "Faculty Shortage"}
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  No Active Intake
                </span>
              )}
            </div>
          </div>
          <Link
            href="/college/users"
            className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1 mt-auto"
          >
            Manage Faculty <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Card 3: Department Heads */}
        <div className="h-full rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department Heads</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-center justify-center">
              <UserCheck className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 font-heading tabular-nums tracking-tight">
                {appointedDeptsCount} of {departments.length}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Assigned
              </span>
            </div>
            <div className="mt-1.5">
              {vacantDepts.length > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {vacantDepts.length} {vacantDepts.length === 1 ? "Dept" : "Depts"} Need HOD
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  All Departments Assigned
                </span>
              )}
            </div>
          </div>
          <Link
            href="/college/hods"
            className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1 mt-auto"
          >
            Department Head List <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Card 4: SAR Approval */}
        <div className="h-full rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SAR Approval</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 font-heading tabular-nums tracking-tight">
                {sarAttestPct}%
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Approved
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`bg-amber-600 h-1.5 rounded-full transition-all duration-500 ${
                    sarAttestPct > 0 && sarAttestPct < 4 ? "min-w-[12px]" : ""
                  }`}
                  style={{ width: `${sarAttestPct}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-amber-800 tabular-nums shrink-0">
                {attestedDeptsCount} of {totalDeptsForSar} Branches
              </span>
            </div>
          </div>
          <Link
            href="/college/accreditation"
            className="text-[11px] font-semibold text-amber-800 hover:text-amber-900 inline-flex items-center gap-1 mt-auto"
          >
            View Accreditation Details <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: FACULTY & STUDENT DETAILS / COLLEGE INFORMATION                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Surface 1: AICTE Program Compliance Matrix (7 Cols) */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
              <h2 className="text-sm font-bold text-slate-900">Faculty and Student Details</h2>
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
                    <th className="p-2.5">Course</th>
                    <th className="p-2.5 text-center">Students Per Year</th>
                    <th className="p-2.5 text-center">Approved Seats</th>
                    <th className="p-2.5 text-center">Faculty (Required / Available)</th>
                    <th className="p-2.5 text-center">Student-Faculty Ratio</th>
                    <th className="p-2.5 text-right">Faculty Status</th>
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
                        {p.requiredFaculty} /{" "}
                        <span
                          className={
                            p.cadreStatus === "No Intake"
                              ? "text-slate-400"
                              : p.availableFaculty < p.requiredFaculty
                              ? "text-rose-600 font-bold"
                              : "text-emerald-700 font-bold"
                          }
                        >
                          {p.availableFaculty}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-600">{p.actualRatio}</td>
                      <td className="p-2.5 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                          p.cadreStatus === "No Intake"
                            ? "bg-slate-100 text-slate-600 border border-slate-200"
                            : p.cadreStatus === "Compliant"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : p.cadreStatus === "Compliant — subject to qualification verification"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : p.cadreStatus === "Insufficient Data"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                        }`}>
                          {p.cadreStatus === "No Intake"
                            ? "No Intake"
                            : p.cadreStatus === "Compliant"
                            ? "Meets Requirements"
                            : p.cadreStatus === "Insufficient Data"
                            ? "Data Incomplete"
                            : p.cadreStatus === "Compliant — subject to qualification verification"
                            ? "Meets Requirements (Check Needed)"
                            : "Faculty Shortage"}
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
              No course data loaded. Ensure degree programs and branch quotas are configured in Programs & Branches.
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-500">
              Faculty details are checked according to AICTE rules.
            </span>
            <Link
              href="/college/users"
              className="font-semibold text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1"
            >
              Assign Faculty Roles <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Surface 2: Campus Profile & University Affiliation (5 Cols) */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
              <h2 className="text-sm font-bold text-slate-900">College Information</h2>
            </div>
            <Link
              href="/college/settings"
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1"
            >
              Settings & Logo <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="relative h-12 w-12 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-center p-1.5 shrink-0">
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

          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden bg-slate-50/40 text-xs flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              <div className="p-3 space-y-0.5">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  University
                </span>
                <span className="block font-semibold text-slate-900 text-xs truncate" title={affiliation}>
                  {affiliation}
                </span>
              </div>
              <div className="p-3 space-y-0.5">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  College Type
                </span>
                <span className="block font-semibold text-slate-900 text-xs truncate">
                  {collegeType}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              <div className="p-3 space-y-0.5">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Year Established
                </span>
                <span className="block font-semibold text-slate-900 text-xs font-mono">
                  {establishedYear}
                </span>
              </div>
              <div className="p-3 space-y-0.5">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Number of Campuses
                </span>
                <span className="block font-semibold text-slate-900 text-xs truncate">
                  {campusesSummary}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: PENDING TASKS & ACTIVITY HISTORY                                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Surface 1: Pending Tasks (5 Cols) */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
              <h2 className="text-sm font-bold text-slate-900">Pending Tasks</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold font-mono">
              {(vacantDepts.length > 0 ? 1 : 0) + (hasFacultyComplianceIssue ? 1 : 0) + (sarAttestPct < 100 ? 1 : 0)} Pending
            </span>
          </div>

          <div className="space-y-2.5 flex-1">
            {vacantDepts.length > 0 && (
              <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/50 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    <span>Department Heads Needed</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-snug">
                    {vacantDepts.length} {vacantDepts.length === 1 ? "department does" : "departments do"} not have a department head.
                  </p>
                </div>
                <Link
                  href="/college/hods"
                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                >
                  Assign
                </Link>
              </div>
            )}

            {hasFacultyComplianceIssue && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Faculty Shortage</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    Faculty numbers do not meet AICTE requirements or need qualification checks.
                  </p>
                </div>
                <Link
                  href="/college/users"
                  className="px-2.5 py-1 rounded bg-amber-700 hover:bg-amber-800 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                >
                  Check
                </Link>
              </div>
            )}

            {sarAttestPct < 100 && (
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-800 shrink-0" />
                    <span>Department Approval</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    {totalDeptsForSar - attestedDeptsCount} {totalDeptsForSar - attestedDeptsCount === 1 ? "department has" : "departments have"} not completed their SAR approval.
                  </p>
                </div>
                <Link
                  href="/college/accreditation"
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                >
                  Approve
                </Link>
              </div>
            )}

            {vacantDepts.length === 0 && !hasFacultyComplianceIssue && sarAttestPct === 100 && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center space-y-1">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto" />
                <span className="text-xs font-bold text-emerald-900 block">All Tasks Complete</span>
                <p className="text-[11px] text-emerald-700">All leadership appointments, faculty cadres, and department approvals are verified.</p>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between mt-auto">
            <span>Tracks pending actions and department head vacancies.</span>
          </div>
        </div>

        {/* Surface 2: Activity History (7 Cols) */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
              <h2 className="text-sm font-bold text-slate-900">Activity History</h2>
            </div>
            <Link
              href="/college/accreditation?tab=activity"
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 transition-colors"
            >
              View All Activities →
            </Link>
          </div>

          <div className="flex-1 relative pl-5 space-y-3.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-xs">
            {activities.length > 0 ? (
              activities.map((act, idx) => {
                const formattedTitle = act.title
                  .replace(/HOD appointed for Department/i, "Department Head Assigned")
                  .replace(/HOD appointed for/i, "Department Head assigned for");
                const formattedTime = act.timeAgo
                  .replace(/(\d+)d ago/i, "$1 days ago")
                  .replace(/1 days ago/i, "1 day ago")
                  .replace(/(\d+)h ago/i, "$1 hours ago")
                  .replace(/1 hours ago/i, "1 hour ago")
                  .replace(/(\d+)m ago/i, "$1 minutes ago")
                  .replace(/1 minutes ago/i, "1 minute ago");

                return (
                  <div key={idx} className="relative space-y-0.5">
                    <div className="absolute -left-5 top-1.5 h-2 w-2 rounded-full bg-emerald-700 ring-2 ring-white" />
                    <div className="font-semibold text-slate-900 leading-snug">{formattedTitle}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{formattedTime}</div>
                  </div>
                );
              })
            ) : (
              <div className="text-slate-400 text-xs italic py-4">No recent activities recorded.</div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between mt-auto">
            <span>Keeps a record of recent institutional activities.</span>
            <span className="text-[10px] font-mono text-slate-400">Activity Record Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
