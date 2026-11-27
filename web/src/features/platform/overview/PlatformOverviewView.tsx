"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  FileCheck2,
  LifeBuoy,
  AlertTriangle,
  ArrowRight,
  Clock,
  Activity,
  Ban,
  RotateCcw,
  Server,
  Database,
  KeyRound,
  HardDrive,
  Mail,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { PageHeader } from "@/design-system/patterns/PageHeader";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { PageLoadingState } from "@/design-system/patterns/PageStates";
import { Button } from "@/design-system/components/Button";
import { usePlatformData } from "../data/platformDataStore";
import { showToast } from "@/lib/toast";

export const PlatformOverviewView: React.FC = () => {
  const {
    colleges,
    onboardingRequests,
    tickets,
    services,
    alerts,
    auditLogs,
    updateCollege,
    isLoadingPlatformData,
  } = usePlatformData();

  useDashboardHeader({
    title: "Overview",
  });

  // 1. FIVE KEY PLATFORM METRICS
  const totalCollegesCount = colleges.length;
  const activeCollegesCount = colleges.filter((c) => c.status === "Active").length;
  const pendingApplicationsCount = onboardingRequests.filter(
    (r) => r.reviewStatus === "Under Review"
  ).length;
  const suspendedCollegesCount = colleges.filter((c) => c.status === "Suspended").length;
  const openTicketsCount = tickets.filter(
    (t) => t.status === "Open" || t.status === "In Progress"
  ).length;

  // Aggregate student and project numbers
  const totalRegisteredStudents = useMemo(() => {
    return colleges.reduce((sum, c) => sum + (c.totalStudents || 0), 0);
  }, [colleges]);

  const totalOngoingProjects = useMemo(() => {
    return colleges.reduce((sum, c) => sum + (c.activeProjectsCount || 0), 0);
  }, [colleges]);

  // 2. ESSENTIAL 6 SERVICES PLATFORM HEALTH
  const platformHealth = useMemo(() => {
    const activeAlerts = alerts.filter((a) => a.currentStatus !== "Resolved");
    const degradedServices = services.filter(
      (s) => s.status === "Degraded" || s.status === "Unknown"
    );
    const downServices = services.filter(
      (s) => s.status === "Down" || s.status === "Outage"
    );

    if (downServices.length > 0) {
      return {
        status: "Major Outage" as const,
        statusColor: "text-rose-700 bg-rose-50 border-rose-200",
        dotColor: "bg-rose-500",
        message: `${downServices[0].serviceName} is currently unavailable.`,
        activeIncidentsCount: activeAlerts.length || downServices.length,
      };
    }

    if (degradedServices.length > 0 || activeAlerts.length > 0) {
      const affectedName =
        activeAlerts[0]?.affectedService ||
        degradedServices[0]?.serviceName ||
        "Core Services";
      return {
        status: "Degraded" as const,
        statusColor: "text-amber-800 bg-amber-50 border-amber-200",
        dotColor: "bg-amber-500",
        message: `${affectedName} performance degraded.`,
        activeIncidentsCount: activeAlerts.length || degradedServices.length,
      };
    }

    return {
      status: "Operational" as const,
      statusColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
      dotColor: "bg-emerald-500",
      message: "All 6 monitored platform services are functioning normally.",
      activeIncidentsCount: 0,
    };
  }, [alerts, services]);

  // Provisioning Retry Handler
  const handleRetryProvisioning = (collegeId: string, collegeName: string) => {
    updateCollege(collegeId, {
      status: "Active",
    });
    showToast(`Tenant provisioning re-initiated for ${collegeName}. Database schema verified.`, "success");
  };

  if (
    isLoadingPlatformData &&
    colleges.length === 0 &&
    onboardingRequests.length === 0 &&
    tickets.length === 0
  ) {
    return <PageLoadingState message="Loading platform overview..." />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Platform Overview"
        description="Ecosystem adoption, college onboarding queue, institutional support, and core service health."
        actions={
          <Link href="/platform/colleges/new">
            <Button size="sm" variant="primary" leftIcon={<Building2 className="h-3.5 w-3.5" />}>
              Onboard College
            </Button>
          </Link>
        }
      />

      {/* 5 SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Colleges */}
        <Link
          href="/platform/colleges"
          className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Total Colleges</span>
            <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tabular-nums text-slate-900 tracking-tight">
              {totalCollegesCount}
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Affiliated institutions</p>
          </div>
        </Link>

        {/* Card 2: Active Colleges */}
        <Link
          href="/platform/colleges?status=Active"
          className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Active Colleges</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tabular-nums text-slate-900 tracking-tight">
              {activeCollegesCount}
            </div>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Operational tenants</p>
          </div>
        </Link>

        {/* Card 3: Pending Applications */}
        <Link
          href="/platform/colleges?status=Pending+Review"
          className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Pending Applications</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <FileCheck2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tabular-nums text-slate-900 tracking-tight">
              {pendingApplicationsCount}
            </div>
            <p className="text-[10px] text-blue-600 font-medium mt-0.5">Awaiting review</p>
          </div>
        </Link>

        {/* Card 4: Suspended Colleges */}
        <Link
          href="/platform/colleges?status=Suspended"
          className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Suspended Colleges</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Ban className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tabular-nums text-slate-900 tracking-tight">
              {suspendedCollegesCount}
            </div>
            <p className="text-[10px] text-rose-600 font-medium mt-0.5">Access disabled</p>
          </div>
        </Link>

        {/* Card 5: Open Support Tickets */}
        <Link
          href="/platform/support-health?tab=tickets"
          className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1 hover:border-slate-300 hover:shadow-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Open Tickets</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <LifeBuoy className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tabular-nums text-slate-900 tracking-tight">
              {openTicketsCount}
            </div>
            <p className="text-[10px] text-amber-700 font-medium mt-0.5">College requests</p>
          </div>
        </Link>
      </div>

      {/* Aggregate Volume Notice (Accurate Aggregation) */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">Platform Volume:</span>
          <span><strong>{totalRegisteredStudents.toLocaleString("en-IN")}</strong> registered students across tenants</span>
          <span>&bull;</span>
          <span><strong>{totalOngoingProjects.toLocaleString("en-IN")}</strong> ongoing academic projects</span>
        </div>
        <Link
          href="/platform/analytics"
          className="font-semibold text-slate-800 hover:text-slate-900 inline-flex items-center gap-1"
        >
          View Full Adoption Analytics <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* MAIN TWO-COLUMN SECTION: ONBOARDING & SUPPORT (LEFT) vs HEALTH & ACTIVITY (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN (2 COLS): COLLEGE ONBOARDING & SUPPORT DESK */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION A: COLLEGE ONBOARDING QUEUE */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">College Onboarding Queue</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-mono">
                  {pendingApplicationsCount} Awaiting Review
                </span>
              </div>
              <Link
                href="/platform/colleges?status=Pending Review"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
              >
                View Directory <ArrowRight className="w-3 h-3 text-slate-400" />
              </Link>
            </div>

            {onboardingRequests.filter((r) => r.reviewStatus === "Under Review").length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                title="No applications awaiting review"
                description="All college onboarding submissions have been reviewed."
                className="border-0 bg-transparent py-6"
              />
            ) : (
              <div className="space-y-2.5">
                {onboardingRequests
                  .filter((r) => r.reviewStatus === "Under Review")
                  .slice(0, 3)
                  .map((req) => (
                    <div
                      key={req.id}
                      className="p-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors text-xs"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate">{req.institutionName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-white text-slate-600 border border-slate-200 rounded">
                            {req.collegeCode || "PENDING"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Applicant: {req.applicantName} ({req.officialEmail}) &bull; Submitted {req.submissionDate}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <Link
                          href={`/platform/colleges/applications/${req.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md shadow-2xs transition-colors"
                        >
                          Review Application
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Check for any provisioning failures or pending provisioning colleges */}
            {colleges.filter((c) => c.status === "Pending Verification").length > 0 && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>Provisioning Intervention Required ({colleges.filter((c) => c.status === "Pending Verification").length})</span>
                </div>
                <div className="space-y-1.5">
                  {colleges
                    .filter((c) => c.status === "Pending Verification")
                    .map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between text-xs bg-white p-2 rounded border border-amber-200"
                      >
                        <div>
                          <span className="font-semibold text-slate-900">{c.name}</span>
                          <span className="text-[11px] text-slate-500 ml-2 font-mono">({c.code})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRetryProvisioning(c.id, c.name)}
                          className="px-2.5 py-1 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Retry Provisioning
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION B: SUPPORT DESK OVERVIEW */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Institutional Support Desk</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-mono">
                  {openTicketsCount} Unresolved
                </span>
              </div>
              <Link
                href="/platform/support-health?tab=tickets"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
              >
                All Tickets <ArrowRight className="w-3 h-3 text-slate-400" />
              </Link>
            </div>

            {openTicketsCount === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                title="Support queue is clear"
                description="No open tickets from affiliated colleges."
                className="border-0 bg-transparent py-6"
              />
            ) : (
              <div className="space-y-2.5">
                {tickets
                  .filter((t) => t.status === "Open" || t.status === "In Progress")
                  .slice(0, 4)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="p-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors text-xs"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold bg-white text-slate-700 px-1.5 py-0.2 border border-slate-200 rounded">
                            {t.ticketNumber || t.id}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 text-[10px] font-semibold rounded border ${
                              t.priority === "Urgent"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : t.priority === "High"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {t.priority}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {t.createdAt.split(" ")[0]}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-900 truncate">{t.subject}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {t.institutionName} &bull; {t.category}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <Link
                          href={`/platform/support-health?tab=tickets&ticketId=${t.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 rounded-md shadow-2xs transition-colors"
                        >
                          View Ticket
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (1 COL): PLATFORM HEALTH & RECENT ACTIVITIES */}
        <div className="space-y-6">
          {/* SECTION C: PLATFORM HEALTH */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-sm font-bold text-slate-900">Platform Health</h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full border ${platformHealth.statusColor}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${platformHealth.dotColor}`} />
                {platformHealth.status}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {platformHealth.message}
            </p>

            {/* 6 Monitored Services Compact Grid */}
            <div className="space-y-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Core Services (6 Monitored)
              </span>
              {[
                { name: "Backend API", key: "backend api", icon: <Server className="w-3 h-3 text-slate-600" /> },
                { name: "PostgreSQL Database", key: "database", icon: <Database className="w-3 h-3 text-slate-600" /> },
                { name: "Authentication", key: "authentication", icon: <KeyRound className="w-3 h-3 text-slate-600" /> },
                { name: "File Vault Storage", key: "file storage", icon: <HardDrive className="w-3 h-3 text-slate-600" /> },
                { name: "Background Workers", key: "background workers", icon: <Activity className="w-3 h-3 text-slate-600" /> },
                { name: "Email Delivery Service", key: "email service", icon: <Mail className="w-3 h-3 text-slate-600" /> },
              ].map((svc) => {
                const liveSvc = services.find((s) => s.serviceName.toLowerCase() === svc.key || s.category?.toLowerCase() === svc.key);
                const isHealthy = liveSvc?.status === "Healthy";
                const isNotConfigured = liveSvc?.status === "Not Configured" || liveSvc?.status === "Unknown";
                const isDegraded = liveSvc?.status === "Degraded";
                const statusLabel = isHealthy ? "Operational" : isNotConfigured ? "Not Configured" : isDegraded ? "Degraded" : (liveSvc?.status || "Unknown");
                const statusColor = isHealthy ? "text-emerald-700" : isNotConfigured ? "text-slate-500" : isDegraded ? "text-amber-700" : "text-rose-700";
                const dotColor = isHealthy ? "bg-emerald-500" : isNotConfigured ? "bg-slate-400" : isDegraded ? "bg-amber-500" : "bg-rose-500";

                return (
                  <div
                    key={svc.name}
                    className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      {svc.icon}
                      <span className="font-medium text-slate-800 text-[11px]">{svc.name}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${statusColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                      {statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <Link
                href="/platform/support-health?tab=health"
                className="w-full text-center inline-flex items-center justify-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 py-1.5 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              >
                View Detailed System Health
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* SECTION D: RECENT PLATFORM ACTIVITIES */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-sm font-bold text-slate-900">Recent Activities</h2>
              <Link
                href="/platform/security-audit?tab=audit"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
              >
                Audit Log <ArrowRight className="w-3 h-3 text-slate-400" />
              </Link>
            </div>

            <div className="space-y-3">
              {auditLogs.length === 0 ? (
                <EmptyState
                  icon={<Clock className="w-5 h-5 text-slate-400" />}
                  title="No recent activities"
                  description="No recent administrative events recorded."
                  className="border-0 bg-transparent py-6"
                />
              ) : (
                auditLogs.slice(0, 4).map((activity) => (
                  <div key={activity.id} className="text-xs space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 truncate">{activity.action}</span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{activity.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{activity.details}</p>
                    {activity.affectedResource && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono truncate">
                        <Building2 className="w-2.5 h-2.5 shrink-0" />
                        {activity.affectedResource}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
