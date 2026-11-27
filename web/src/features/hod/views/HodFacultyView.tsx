"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Minus,
  Plus,
  Shield,
  UserCheck,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Button } from "@/design-system/components/Button";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { hodApi, getAuthToken, FacultyWorkloadDto } from "@/lib/api";
import { HodMetricCard } from "../components/HodMetricCard";
import { HodConfirmationDialog } from "../components/HodConfirmationDialog";

export const HodFacultyView: React.FC = () => {
  useDashboardHeader({
    title: "Faculty Directory",
  });

  const [faculty, setFaculty] = useState<FacultyWorkloadDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Stepper mutation tracking: facultyId being updated
  const [mutatingCapId, setMutatingCapId] = useState<string | null>(null);

  // Coordinator toggle confirmation dialog state
  const [confirmCoordinatorTarget, setConfirmCoordinatorTarget] = useState<{
    facultyId: string;
    fullName: string;
    currentIsCoordinator: boolean;
  } | null>(null);
  const [isUpdatingCoordinator, setIsUpdatingCoordinator] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadFaculty = useCallback(async () => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await hodApi.getFaculty();
      if (data) setFaculty(data);
    } catch (err) {
      console.warn("Failed to load department faculty:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFaculty();
  }, [loadFaculty]);

  // Workload Summary Analytics (strictly verified from actual data)
  const summary = useMemo(() => {
    const totalFaculty = faculty.length;
    const totalMentoredTeams = faculty.reduce((acc, f) => acc + (f.currentMentoredTeams || 0), 0);
    const atCapacityCount = faculty.filter((f) => f.currentMentoredTeams >= f.maxMentorTeams).length;
    const coordinatorsCount = faculty.filter((f) => f.isProjectCoordinator).length;
    const avgLoad = totalFaculty > 0 ? (totalMentoredTeams / totalFaculty).toFixed(1) : "0.0";

    return {
      totalFaculty,
      totalMentoredTeams,
      atCapacityCount,
      coordinatorsCount,
      avgLoad,
    };
  }, [faculty]);

  // Mentorship Cap Stepper Handler
  const handleUpdateMentorCap = async (facultyId: string, delta: number) => {
    const target = faculty.find((f) => f.facultyId === facultyId);
    if (!target) return;

    // Enforce limits: minimum 1, maximum 10
    const newCap = target.maxMentorTeams + delta;
    if (newCap < 1 || newCap > 10) return;

    // Boundary rule: Cannot reduce cap below current assigned workload
    if (delta < 0 && newCap < target.currentMentoredTeams) {
      showToast(
        `Cannot reduce cap below current workload (${target.currentMentoredTeams} active teams assigned).`
      );
      return;
    }

    // Optimistic UI update
    setFaculty((prev) =>
      prev.map((f) => (f.facultyId === facultyId ? { ...f, maxMentorTeams: newCap } : f))
    );
    setMutatingCapId(facultyId);

    try {
      await hodApi.updateMentorCap(facultyId, { maxMentorTeams: newCap });
      showToast(`Mentorship capacity for ${target.fullName} updated to ${newCap} teams.`);
    } catch (err: any) {
      // Rollback on failure
      setFaculty((prev) =>
        prev.map((f) => (f.facultyId === facultyId ? { ...f, maxMentorTeams: target.maxMentorTeams } : f))
      );
      showToast(err?.message || "Failed to update mentor capacity ceiling.");
    } finally {
      setMutatingCapId(null);
    }
  };

  // Coordinator Toggle Confirmed Handler
  const handleConfirmCoordinatorToggle = async () => {
    if (!confirmCoordinatorTarget) return;

    const { facultyId, fullName, currentIsCoordinator } = confirmCoordinatorTarget;
    setIsUpdatingCoordinator(true);

    try {
      await hodApi.toggleCoordinator(facultyId, { isProjectCoordinator: !currentIsCoordinator });

      setFaculty((prev) =>
        prev.map((f) =>
          f.facultyId === facultyId ? { ...f, isProjectCoordinator: !currentIsCoordinator } : f
        )
      );

      showToast(
        !currentIsCoordinator
          ? `Project Coordinator authority granted to ${fullName}.`
          : `Project Coordinator authority revoked for ${fullName}.`
      );
      setConfirmCoordinatorTarget(null);
    } catch (err: any) {
      showToast(err?.message || "Failed to update Project Coordinator appointment.");
    } finally {
      setIsUpdatingCoordinator(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Compact Workload Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HodMetricCard
          label="Eligible Faculty Mentors"
          value={summary.totalFaculty}
          subtitle={`${summary.coordinatorsCount} designated Coordinator${summary.coordinatorsCount === 1 ? "" : "s"}`}
          icon={Users}
          variant="neutral"
        />

        <HodMetricCard
          label="Total Mentored Teams"
          value={summary.totalMentoredTeams}
          subtitle={`Average load: ${summary.avgLoad} teams / guide`}
          icon={Briefcase}
          variant="emerald"
        />

        <HodMetricCard
          label="At Capacity Ceiling"
          value={summary.atCapacityCount}
          subtitle={summary.atCapacityCount > 0 ? "Requires workload rebalancing" : "All mentors have open slots"}
          icon={AlertTriangle}
          variant={summary.atCapacityCount > 0 ? "amber" : "neutral"}
        />

        <HodMetricCard
          label="Project Coordinators"
          value={summary.coordinatorsCount}
          subtitle="Authorized for semester cycle ops"
          icon={Shield}
          variant="blue"
        />
      </div>

      {/* Faculty Workload Table */}
      <Card className="border-slate-200/80 bg-white overflow-hidden shadow-2xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle>Faculty Mentorship Quotas</CardTitle>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 select-none">
              <tr>
                <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Faculty Member
                </th>
                <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Institutional Email
                </th>
                <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Current Workload
                </th>
                <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Max Capacity Quota
                </th>
                <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Workload Utilization
                </th>
                <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Coordinator Appointment
                </th>
                <th className="py-3 px-4 text-right font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Authority Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-900">
              {faculty.map((fac) => {
                const utilPct =
                  fac.maxMentorTeams > 0
                    ? Math.min(100, Math.round((fac.currentMentoredTeams / fac.maxMentorTeams) * 100))
                    : 0;

                const isAtCap = fac.currentMentoredTeams >= fac.maxMentorTeams;
                const isMutatingThis = mutatingCapId === fac.facultyId;

                const utilBarColor =
                  utilPct >= 100
                    ? "bg-rose-500"
                    : utilPct >= 75
                    ? "bg-amber-500"
                    : "bg-emerald-500";

                return (
                  <tr key={fac.facultyId} className="hover:bg-slate-50/75 transition-colors">
                    {/* Name */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{fac.fullName}</div>
                      {fac.employeeCode && (
                        <div className="font-mono text-[10px] text-slate-500">
                          Emp: {fac.employeeCode}
                        </div>
                      )}
                    </td>

                    {/* Email */}
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {fac.email}
                    </td>

                    {/* Current Teams */}
                    <td className="py-3 px-4 font-mono font-bold tabular-nums text-slate-900">
                      {fac.currentMentoredTeams} Teams
                    </td>

                    {/* Stepper Controls */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateMentorCap(fac.facultyId, -1)}
                          disabled={
                            isMutatingThis ||
                            fac.maxMentorTeams <= 1 ||
                            fac.maxMentorTeams <= fac.currentMentoredTeams
                          }
                          className="h-6.5 w-6.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-slate-700 cursor-pointer shadow-2xs transition-colors"
                          title="Decrease maximum quota by 1"
                        >
                          <Minus className="h-3 w-3 stroke-[2.5]" />
                        </button>

                        <span className="font-mono font-bold text-xs text-slate-900 w-16 text-center tabular-nums">
                          {fac.maxMentorTeams} Teams
                        </span>

                        <button
                          type="button"
                          onClick={() => handleUpdateMentorCap(fac.facultyId, 1)}
                          disabled={isMutatingThis || fac.maxMentorTeams >= 10}
                          className="h-6.5 w-6.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-slate-700 cursor-pointer shadow-2xs transition-colors"
                          title="Increase maximum quota by 1"
                        >
                          <Plus className="h-3 w-3 stroke-[2.5]" />
                        </button>
                      </div>
                    </td>

                    {/* Workload Utilization */}
                    <td className="py-3 px-4">
                      <div className="space-y-1 max-w-[120px]">
                        <div className="flex justify-between items-center text-[11px] font-mono tabular-nums">
                          <span className={isAtCap ? "font-bold text-rose-700" : "text-slate-700"}>
                            {fac.currentMentoredTeams}/{fac.maxMentorTeams}
                          </span>
                          <span className="text-slate-500 font-medium">{utilPct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${utilBarColor}`}
                            style={{ width: `${utilPct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Coordinator Appointment Switch */}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmCoordinatorTarget({
                            facultyId: fac.facultyId,
                            fullName: fac.fullName,
                            currentIsCoordinator: fac.isProjectCoordinator,
                          })
                        }
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                          fac.isProjectCoordinator ? "bg-brand-primary" : "bg-slate-300"
                        }`}
                        role="switch"
                        aria-checked={fac.isProjectCoordinator}
                        title={`Click to ${fac.isProjectCoordinator ? "revoke" : "grant"} Project Coordinator appointment`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            fac.isProjectCoordinator ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>

                    {/* Authority Status */}
                    <td className="py-3 px-4 text-right">
                      {fac.isProjectCoordinator ? (
                        <Badge variant="warning" size="sm" dot>
                          Project Coordinator
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Faculty Guide
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {faculty.length === 0 && !loading && (
          <div className="p-8">
            <EmptyState
              title="No Faculty Members in Department"
              description="Institutional faculty onboarding is administered by College Admin in Institutional Staff Directory (/college/users)."
            />
          </div>
        )}
      </Card>

      {/* Confirmation Dialog for Project Coordinator Appointment */}
      <HodConfirmationDialog
        isOpen={!!confirmCoordinatorTarget}
        onClose={() => setConfirmCoordinatorTarget(null)}
        onConfirm={handleConfirmCoordinatorToggle}
        title={
          confirmCoordinatorTarget?.currentIsCoordinator
            ? "Revoke Project Coordinator Authority"
            : "Appoint as Project Coordinator"
        }
        description={
          confirmCoordinatorTarget?.currentIsCoordinator
            ? `Are you sure you want to revoke Project Coordinator administrative privileges for ${confirmCoordinatorTarget?.fullName}? They will retain their base Faculty Guide mentorship role.`
            : `Are you sure you want to appoint ${confirmCoordinatorTarget?.fullName} as a departmental Project Coordinator? This grants authority to manage semester cycle parameters, schedule evaluation panels, and submit exception overrides.`
        }
        confirmText={
          confirmCoordinatorTarget?.currentIsCoordinator
            ? "Revoke Appointment"
            : "Confirm Appointment"
        }
        variant={confirmCoordinatorTarget?.currentIsCoordinator ? "warning" : "primary"}
        isLoading={isUpdatingCoordinator}
      />
    </div>
  );
};
