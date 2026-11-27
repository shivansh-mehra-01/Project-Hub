"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  GraduationCap,
  Layers,
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  Zap,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ShieldCheck,
  Info,
  Megaphone,
  RefreshCw,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { PageHeader } from "@/design-system/patterns/PageHeader";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { PageErrorState, PageLoadingState } from "@/design-system/patterns/PageStates";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { collegeApi } from "@/lib/api/collegeApi";
import { CollegeAnnouncementDto, CollegeOverviewDto } from "@/lib/api/types";
import { ApiConnectionBanner } from "../components/ApiConnectionBanner";
import {
  AnnouncementDetailModal,
  formatAnnouncementDate,
  getAnnouncementCategoryBadge,
  getAnnouncementPriorityBadge,
} from "../components/AnnouncementDetailModal";

export const CollegeOverviewView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [overview, setOverview] = useState<CollegeOverviewDto | null>(null);
  const [announcements, setAnnouncements] = useState<CollegeAnnouncementDto[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<CollegeAnnouncementDto | null>(null);

  useDashboardHeader({
    title: "Overview",
  });

  const loadAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    setAnnouncementsError(null);
    try {
      const items = await collegeApi.getAnnouncements();
      setAnnouncements(Array.isArray(items) ? items : []);
    } catch (err: unknown) {
      setAnnouncementsError(
        err instanceof Error ? err.message : "Failed to load platform announcements."
      );
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const ovRes = await collegeApi.getOverview();
      setOverview(ovRes);
    } catch (err: unknown) {
      setApiError(
        err instanceof Error
          ? err.message
          : "Failed to load live institutional metrics from Colabex backend."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    collegeApi
      .getOverview()
      .then((ovRes) => {
        if (active) setOverview(ovRes);
      })
      .catch((err: unknown) => {
        if (active) {
          setApiError(
            err instanceof Error
              ? err.message
              : "Failed to load live institutional metrics from Colabex backend."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    collegeApi
      .getAnnouncements()
      .then((items) => {
        if (active) setAnnouncements(Array.isArray(items) ? items : []);
      })
      .catch((err: unknown) => {
        if (active) {
          setAnnouncementsError(
            err instanceof Error ? err.message : "Failed to load platform announcements."
          );
        }
      })
      .finally(() => {
        if (active) setAnnouncementsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const departments = overview?.departmentSummaries ?? [];
  const actionItems = overview?.operationalActionItems ?? [];
  const activities = overview?.recentActivities ?? [];

  const totalStudents = overview?.totalStudents ?? 0;
  const totalFaculty = overview?.totalFaculty ?? 0;
  const totalDepartments = overview?.totalDepartments ?? departments.length;
  const totalCourses = overview?.totalCourses ?? 0;
  const appointedHodsCount = overview?.appointedHodsCount ?? 0;
  const vacantDepartmentsCount = overview?.vacantDepartmentsCount ?? 0;

  return (
    <div className="space-y-6 pb-8 font-sans">
      <PageHeader
        title={overview?.collegeName || "Institutional Overview"}
        badge={
          overview?.activeSession ? (
            <Badge variant="success" size="sm" dot>
              AY {overview.activeSession.label}
            </Badge>
          ) : overview ? (
            <Badge variant="warning" size="sm">
              Session Not Configured
            </Badge>
          ) : undefined
        }
        description={
          overview?.currentSemesterLabel
            ? `Active Term: ${overview.currentSemesterLabel}`
            : "Campus executive metrics, department leadership, and institutional configuration."
        }
        actions={
          <Link href="/college/settings">
            <Button size="sm" variant="secondary">
              College Settings
            </Button>
          </Link>
        }
      />

      {apiError && (
        <ApiConnectionBanner onRetry={loadData} message={apiError} isRetrying={loading} />
      )}

      {/* Loading State */}
      {loading && !overview && (
        <PageLoadingState message="Loading institutional overview..." />
      )}

      {overview && (
        <>
          {/* SECTION 1: ACADEMIC SESSION & INSTITUTION CONTEXT STRIP */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {overview.activeSession ? (
                  <>
                    <span className="font-semibold text-slate-900">
                      Academic Session {overview.activeSession.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      {overview.activeSession.isActive ? "Active Session" : "Configured"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-amber-900">
                      Academic Session Not Configured
                    </span>
                    <Link
                      href="/college/settings"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-[11px] font-semibold"
                    >
                      Configure Session
                    </Link>
                  </>
                )}

                {overview.currentSemesterLabel && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600">
                      Term:{" "}
                      <strong className="text-slate-900 font-semibold">
                        {overview.currentSemesterLabel}
                      </strong>
                    </span>
                  </>
                )}

                <span className="text-slate-300">•</span>
                <span className="text-slate-700 font-medium truncate max-w-sm">
                  {overview.collegeName}
                </span>
              </div>
            </div>

            {overview.totalProjects > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="text-[11px] font-medium text-slate-600">
                  {overview.totalProjects} Active{" "}
                  {overview.totalProjects === 1 ? "Project Team" : "Project Teams"}
                </span>
              </div>
            )}
          </div>

          {/* SECTION 2: CORE INSTITUTIONAL KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Active Student Accounts */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active Students
                </span>
                <div className="h-8 w-8 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 flex items-center justify-center">
                  <Users className="h-4 w-4" strokeWidth={1.75} />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                    {totalStudents.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {totalStudents === 1 ? "Student" : "Students"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {totalStudents > 0
                    ? "Active student accounts across departments"
                    : "No active student accounts onboarded yet"}
                </p>
              </div>
              <Link
                href="/college/students"
                className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1"
              >
                Manage Students <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* KPI 2: Active Faculty Members */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active Faculty
                </span>
                <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center">
                  <GraduationCap className="h-4 w-4" strokeWidth={1.75} />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                    {totalFaculty.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {totalFaculty === 1 ? "Member" : "Members"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {totalFaculty > 0
                    ? "Active Faculty & HOD accounts"
                    : "No active faculty members in directory"}
                </p>
              </div>
              <Link
                href="/college/users"
                className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1"
              >
                Manage Staff Directory <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* KPI 3: Configured Departments */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Departments
                </span>
                <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
                  <Layers className="h-4 w-4" strokeWidth={1.75} />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                    {totalDepartments}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {totalDepartments === 1 ? "Department" : "Departments"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Across {totalCourses} {totalCourses === 1 ? "degree program" : "degree programs"}
                </p>
              </div>
              <Link
                href="/college/courses"
                className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1"
              >
                Programs & Branches <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* KPI 4: HOD Appointment Coverage */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Department Leadership
                </span>
                <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-center justify-center">
                  <UserCheck className="h-4 w-4" strokeWidth={1.75} />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                    {appointedHodsCount} of {totalDepartments}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">Appointed</span>
                </div>
                <div className="mt-1">
                  {totalDepartments === 0 ? (
                    <span className="text-[11px] text-slate-500">
                      No departments configured yet
                    </span>
                  ) : vacantDepartmentsCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                      <AlertTriangle className="h-3 w-3" />
                      {vacantDepartmentsCount}{" "}
                      {vacantDepartmentsCount === 1 ? "department requires" : "departments require"}{" "}
                      HOD
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      All departments have appointed HODs
                    </span>
                  )}
                </div>
              </div>
              <Link
                href="/college/hods"
                className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1"
              >
                Manage Leadership <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* SECTION 3: DEPARTMENT LEADERSHIP OVERVIEW & INSTITUTIONAL IDENTITY */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left (7 Cols): Department Operational Roster */}
            <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
                  <h2 className="text-sm font-bold text-slate-900">
                    Department Coverage & Leadership
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                  {totalDepartments} {totalDepartments === 1 ? "Department" : "Departments"}
                </span>
              </div>

              {departments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-100 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                      <tr>
                        <th className="p-2.5">Department</th>
                        <th className="p-2.5">Appointed HOD</th>
                        <th className="p-2.5 text-center">Faculty</th>
                        <th className="p-2.5 text-center">Students / Quota</th>
                        <th className="p-2.5 text-right">Project Tracks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {departments.map((dept) => (
                        <tr key={dept.departmentId} className="hover:bg-slate-50/50">
                          <td className="p-2.5">
                            <span className="font-bold text-slate-900">{dept.departmentCode}</span>
                            <span className="block text-[11px] text-slate-500 truncate max-w-[180px]">
                              {dept.departmentName}
                            </span>
                          </td>
                          <td className="p-2.5">
                            {dept.hodName ? (
                              <span className="font-medium text-slate-900">{dept.hodName}</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-semibold">
                                Vacant
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center tabular-nums">{dept.facultyCount}</td>
                          <td className="p-2.5 text-center tabular-nums whitespace-nowrap">
                            {dept.studentCount} / {dept.intakeQuota}
                          </td>
                          <td className="p-2.5 text-right">
                            <span
                              className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-semibold ${
                                dept.activeTrackCount > 0
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {dept.activeTrackCount > 0
                                ? `${dept.activeTrackCount} Active`
                                : dept.trackStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No departments configured"
                  description="No departments are configured for this institution yet."
                />
              )}

              <div className="flex items-center justify-end pt-2 border-t border-slate-100 text-xs">
                <Link
                  href="/college/hods"
                  className="font-semibold text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1"
                >
                  Appoint or Manage HODs <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Right (5 Cols): Institutional Identity + Operational Action Items */}
            <div className="lg:col-span-5 space-y-5">
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
                  <h2 className="text-sm font-bold text-slate-900">Institutional Identity</h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center p-1 shrink-0">
                  {overview.crestUrl ? (
                    <Image
                      src={overview.crestUrl}
                      alt={`${overview.collegeName} Crest`}
                      width={48}
                      height={48}
                      className="h-full w-full object-contain"
                      unoptimized
                    />
                  ) : (
                    <Building2 className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
                  )}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h3
                    className="text-xs font-bold text-slate-900 truncate"
                    title={overview.collegeName}
                  >
                    {overview.collegeName}
                  </h3>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" strokeWidth={1.75} />
                    <span className="truncate" title={overview.campusAddress || undefined}>
                      {overview.campusAddress || "Campus address not configured"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden bg-slate-50/40 text-xs">
                <div className="grid grid-cols-2 divide-x divide-slate-100">
                  <div className="p-2.5 space-y-0.5">
                    <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Affiliated University
                    </span>
                    <span
                      className="block font-semibold text-slate-900 text-xs truncate"
                      title={overview.affiliatedUniversity || undefined}
                    >
                      {overview.affiliatedUniversity || "Not configured"}
                    </span>
                  </div>
                  <div className="p-2.5 space-y-0.5">
                    <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Campus Locations
                    </span>
                    <span className="block font-semibold text-slate-900 text-xs truncate">
                      {overview.campusesSummary || "Not configured"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-100">
                  <div className="p-2.5 space-y-0.5">
                    <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Institutional Domain
                    </span>
                    <span className="block font-semibold text-slate-900 text-xs truncate">
                      {overview.ssoDomain || "Not configured"}
                    </span>
                  </div>
                  <div className="p-2.5 space-y-0.5">
                    <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Access Policy
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-900 text-xs">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                      {overview.strictSsoEnforced ? "Strict Domain SSO" : "Standard Login"}
                    </span>
                  </div>
                </div>
              </div>

              <Link
                href="/college/settings"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors duration-200 ease-out cursor-pointer"
              >
                <span>Institutional Settings & Seal</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />
              </Link>
              </div>

              {/* Operational Action Items */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
                  <h2 className="text-sm font-bold text-slate-900">Operational Action Items</h2>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                  {actionItems.length} Pending
                </span>
              </div>

              <div className="space-y-2.5">
                {actionItems.length > 0 ? (
                  actionItems.map((item) => {
                    const isWarning = item.severity === "warning";
                    return (
                      <div
                        key={item.key}
                        className={`p-3 rounded-lg border flex items-start justify-between gap-3 ${
                          isWarning
                            ? "border-rose-200 bg-rose-50/50"
                            : "border-amber-200 bg-amber-50/40"
                        }`}
                      >
                        <div className="space-y-1">
                          <div
                            className={`flex items-center gap-1.5 text-xs font-bold ${
                              isWarning ? "text-rose-900" : "text-amber-900"
                            }`}
                          >
                            {isWarning ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                            ) : (
                              <Info className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            )}
                            <span>{item.title}</span>
                          </div>
                          <p
                            className={`text-[11px] leading-snug ${
                              isWarning ? "text-rose-700" : "text-amber-800"
                            }`}
                          >
                            {item.description}
                          </p>
                        </div>
                        <Link
                          href={item.actionHref}
                          className={`px-2.5 py-1 rounded text-white text-[11px] font-semibold shrink-0 cursor-pointer ${
                            isWarning
                              ? "bg-rose-600 hover:bg-rose-700"
                              : "bg-amber-700 hover:bg-amber-800"
                          }`}
                        >
                          {item.actionLabel}
                        </Link>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center space-y-1">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto" />
                    <span className="text-xs font-bold text-emerald-900 block">
                      No administrative actions required.
                    </span>
                    <p className="text-[11px] text-emerald-700">
                      Department leadership, academic session, and institution settings are configured.
                    </p>
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: GOVERNANCE AUDIT TRAIL */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
                  <h2 className="text-sm font-bold text-slate-900">Governance Audit Trail</h2>
                </div>
                <Link
                  href="/college/hods"
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 transition-colors"
                >
                  Leadership History →
                </Link>
              </div>

              {activities.length > 0 ? (
                <div className="relative pl-5 space-y-3.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-xs">
                  {activities.map((act, idx) => (
                    <div key={idx} className="relative space-y-0.5">
                      <div className="absolute -left-5 top-1.5 h-2 w-2 rounded-full bg-emerald-700 ring-2 ring-white" />
                      <div className="font-semibold text-slate-900 leading-snug">{act.title}</div>
                      <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-500">
                        {act.actor && <span className="font-medium">{act.actor}</span>}
                        {act.targetEntity && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="truncate max-w-xs">{act.targetEntity}</span>
                          </>
                        )}
                        <span className="text-slate-300">•</span>
                        <span
                          className="tabular-nums text-slate-400"
                          title={new Date(act.occurredAtUtc).toLocaleString()}
                        >
                          {act.timeAgo}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No recent audit events"
                  description="No recent institutional audit events recorded."
                />
              )}
            </div>
        </>
      )}

      {/* SECTION 5: PLATFORM ANNOUNCEMENTS */}
      <section
        aria-label="Platform Announcements"
        className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
              <Megaphone className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Platform Announcements</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAnnouncements}
              disabled={announcementsLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${announcementsLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/college/announcements"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold"
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {announcementsError ? (
          <PageErrorState error={announcementsError} onRetry={loadAnnouncements} />
        ) : announcementsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3" aria-label="Loading platform announcements">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="h-24 rounded-lg border border-slate-100 bg-slate-50 animate-pulse" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <EmptyState
            title="No platform announcements"
            description="Published notices targeted to your college will appear here automatically."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {announcements.slice(0, 3).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedAnnouncement(item)}
                className="text-left rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300 p-3.5 space-y-2 transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getAnnouncementPriorityBadge(
                          item.priority
                        )}`}
                      >
                        {item.priority}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getAnnouncementCategoryBadge(
                          item.category
                        )}`}
                      >
                        {item.category}
                      </span>
                    </div>
                    <span className="text-[10px] tabular-nums text-slate-400">
                      {formatAnnouncementDate(item.publishDateUtc)}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{item.title}</h3>
                  <p className="text-[11px] text-slate-600 line-clamp-2">
                    {item.shortDescription || item.fullMessage}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 pt-1">
                  Read Notice <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <AnnouncementDetailModal
        announcement={selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
      />
    </div>
  );
};
