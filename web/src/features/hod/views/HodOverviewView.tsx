"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FolderGit2,
  AlertCircle,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Button } from "@/design-system/components/Button";
import { hodApi, getAuthToken, HodDashboardDto, HodProjectDto } from "@/lib/api";
import { HodMetricCard } from "../components/HodMetricCard";

export const HodOverviewView: React.FC = () => {
  const router = useRouter();

  useDashboardHeader({
    title: "Department Executive Overview",
    breadcrumb: "HOD Console • Overview",
  });

  const [dashboard, setDashboard] = useState<HodDashboardDto | null>(null);
  const [projects, setProjects] = useState<HodProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [dashRes, projRes] = await Promise.allSettled([
        hodApi.getDashboard(),
        hodApi.getProjects(),
      ]);

      if (dashRes.status === "fulfilled" && dashRes.value) {
        setDashboard(dashRes.value);
      }
      if (projRes.status === "fulfilled" && projRes.value) {
        setProjects(projRes.value);
      }
    } catch (err) {
      console.warn("Failed to load HOD overview:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Total pending decisions count
  const totalPendingDecisions = useMemo(() => {
    if (!dashboard) return 0;
    return (
      (dashboard.pendingProposals || 0) +
      (dashboard.pendingGradeUnlocks || 0) +
      (dashboard.pendingExceptions || 0)
    );
  }, [dashboard]);

  // Derived 7-stage lifecycle funnel from real database projects
  const funnelStages = useMemo(() => {
    const total = projects.length;
    const stages = [
      {
        name: "Draft",
        statusKey: "Draft",
        count: projects.filter((p) => p.status === "Draft").length,
        style: "bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300",
      },
      {
        name: "Guide Review",
        statusKey: "PendingGuide",
        count: projects.filter((p) => p.status === "PendingGuide").length,
        style: "bg-amber-50/80 border-amber-200 text-amber-900 hover:border-amber-300",
      },
      {
        name: "Coordinator",
        statusKey: "PendingCoordinator",
        count: projects.filter((p) => p.status === "PendingCoordinator").length,
        style: "bg-blue-50/80 border-blue-200 text-blue-900 hover:border-blue-300",
      },
      {
        name: "HOD Queue",
        statusKey: "PendingHOD",
        count: projects.filter((p) => p.status === "PendingHOD").length,
        style: "bg-purple-50/80 border-purple-200 text-purple-900 hover:border-purple-300",
      },
      {
        name: "Active Build",
        statusKey: "ActiveBuild",
        count: projects.filter((p) => p.status === "ActiveBuild").length,
        style: "bg-emerald-50/80 border-emerald-200 text-emerald-900 hover:border-emerald-300",
      },
      {
        name: "Ready for Viva",
        statusKey: "ReadyForViva",
        count: projects.filter((p) => p.status === "ReadyForViva").length,
        style: "bg-teal-50/80 border-teal-200 text-teal-900 hover:border-teal-300",
      },
      {
        name: "Completed",
        statusKey: "Completed",
        count: projects.filter((p) => p.status === "Completed").length,
        style: "bg-slate-100 border-slate-300 text-slate-900 hover:border-slate-400",
      },
    ];

    return stages.map((s) => ({
      ...s,
      pct: total > 0 ? Math.round((s.count / total) * 100) : 0,
    }));
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shrink-0" />
            <h1 className="text-base sm:text-lg font-bold font-heading text-slate-900 tracking-tight truncate">
              Department of {dashboard?.departmentName || "Computer Science & Engineering"}
            </h1>
            <Badge variant="neutral" size="sm">
              {dashboard?.departmentCode || "CSE"}
            </Badge>
            {dashboard?.isSarAttested ? (
              <Badge variant="success" size="sm" dot>
                SAR Attested &amp; Sealed
              </Badge>
            ) : (
              <Badge variant="warning" size="sm">
                SAR Attestation Pending
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Academic Session: <span className="font-semibold text-slate-800">AY 2025–2026</span> •{" "}
            {dashboard?.totalStudentsEnrolled || 0} Undergraduates Enrolled •{" "}
            {dashboard?.availableMentors || 0} Faculty Mentors
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => router.push("/hod/quality")}
            leftIcon={<ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />}
          >
            Accreditation Status
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => router.push("/hod/approvals")}
            leftIcon={<AlertCircle className="h-3.5 w-3.5" />}
          >
            Review Approvals
          </Button>
        </div>
      </div>

      {/* 4 Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Active Projects */}
        <HodMetricCard
          label="Active Projects"
          value={dashboard?.activeBuildTeams ?? projects.filter((p) => p.status === "ActiveBuild").length}
          subtitle={`Of ${dashboard?.totalTeams ?? projects.length} Total Registered`}
          icon={FolderGit2}
          variant="emerald"
          onClick={() => router.push("/hod/projects?status=ActiveBuild")}
        />

        {/* 2. Pending Approvals */}
        <HodMetricCard
          label="Pending Approvals"
          value={totalPendingDecisions}
          subtitle="Proposals, Unlocks &amp; Overrides"
          icon={AlertCircle}
          variant={totalPendingDecisions > 0 ? "amber" : "neutral"}
          onClick={() => router.push("/hod/approvals")}
        />

        {/* 3. At-Risk Projects */}
        <HodMetricCard
          label="At-Risk Projects"
          value={dashboard?.atRiskTeams ?? projects.filter((p) => p.status === "AtRisk" || p.missedLogStreak >= 2).length}
          subtitle="Missed Logs ≥ 2 Weeks"
          icon={Clock}
          variant={(dashboard?.atRiskTeams ?? 0) > 0 ? "rose" : "neutral"}
          onClick={() => router.push("/hod/projects?onlyAtRisk=true")}
        />

        {/* 4. Projects Without Guide */}
        <HodMetricCard
          label="Without Assigned Guide"
          value={dashboard?.projectsWithoutGuide ?? projects.filter((p) => !p.guideUserId).length}
          subtitle="Requires Mentor Allocation"
          icon={Users}
          variant={(dashboard?.projectsWithoutGuide ?? 0) > 0 ? "amber" : "neutral"}
          onClick={() => router.push("/hod/projects?onlyWithoutGuide=true")}
        />
      </div>

      {/* Project Lifecycle Pipeline Funnel */}
      <Card className="border-slate-200/80 bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Department Project Lifecycle Pipeline</CardTitle>
            <CardDescription>
              Real-time distribution of capstone groups across academic governance milestones. Click any stage to inspect teams.
            </CardDescription>
          </div>
          <Badge variant="neutral" size="sm">
            Total: {projects.length} Teams
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center text-xs">
            {funnelStages.map((stage) => (
              <button
                key={stage.name}
                type="button"
                onClick={() => router.push(`/hod/projects?status=${stage.statusKey}`)}
                className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer text-left sm:text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${stage.style}`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider truncate">
                  {stage.name}
                </div>
                <div className="text-xl font-bold font-heading tabular-nums mt-1">
                  {stage.count}
                </div>
                <div className="text-[10px] opacity-75 mt-0.5">
                  {stage.pct}% of cohort
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actionable Alerts Section: Show ONLY unresolved bottlenecks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
            Actionable Governance Triage
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Alert: Pending Approvals */}
          {totalPendingDecisions > 0 ? (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-amber-950">
                    {totalPendingDecisions} Decision{totalPendingDecisions === 1 ? "" : "s"} Awaiting HOD Sign-Off
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Student proposals, mentor exception requests, and grade unlock appeals require administrative endorsement.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => router.push("/hod/approvals")}
                className="shrink-0 bg-amber-700 hover:bg-amber-800 text-white"
              >
                Review Queue
              </Button>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center gap-3 text-xs text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>All student capstone proposals &amp; exceptions are signed off. Approvals queue is clear.</span>
            </div>
          )}

          {/* Alert: Unassigned Guides */}
          {(dashboard?.projectsWithoutGuide ?? 0) > 0 ? (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/60 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Users className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-rose-950">
                    {dashboard?.projectsWithoutGuide} Project{dashboard?.projectsWithoutGuide === 1 ? "" : "s"} Without Faculty Guide
                  </div>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    Unassigned teams cannot proceed with sprint tasks or submit weekly logbooks until a mentor is allocated.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => router.push("/hod/projects?onlyWithoutGuide=true")}
                className="shrink-0 border-rose-300 text-rose-900 hover:bg-rose-100"
              >
                Assign Guides
              </Button>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center gap-3 text-xs text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>100% of registered project groups have dedicated faculty mentors allocated.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
