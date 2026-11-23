"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldCheck,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Info,
  Layers,
  Award,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Button } from "@/design-system/components/Button";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import {
  hodApi,
  getAuthToken,
  HodDashboardDto,
  NbaAttainmentReportDto,
  CollegeTrackDto,
  HodProjectDto,
} from "@/lib/api";
import { HodConfirmationDialog } from "../components/HodConfirmationDialog";

export const HodQualityView: React.FC = () => {
  useDashboardHeader({
    title: "Curriculum Outcomes & NBA Evidence",
    breadcrumb: "HOD Console • Department Quality",
  });

  const [dashboard, setDashboard] = useState<HodDashboardDto | null>(null);
  const [nbaReport, setNbaReport] = useState<NbaAttainmentReportDto | null>(null);
  const [tracks, setTracks] = useState<CollegeTrackDto[]>([]);
  const [projects, setProjects] = useState<HodProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Export ZIP loading
  const [isExportingZip, setIsExportingZip] = useState(false);

  // SAR Attestation Confirmation Dialog
  const [showAttestConfirm, setShowAttestConfirm] = useState(false);
  const [isAttesting, setIsAttesting] = useState(false);

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
      const [dashRes, nbaRes, tracksRes, projRes] = await Promise.allSettled([
        hodApi.getDashboard(),
        hodApi.getNbaAttainment(),
        hodApi.getTracks(),
        hodApi.getProjects(),
      ]);

      if (dashRes.status === "fulfilled" && dashRes.value) setDashboard(dashRes.value);
      if (nbaRes.status === "fulfilled" && nbaRes.value) setNbaReport(nbaRes.value);
      if (tracksRes.status === "fulfilled" && tracksRes.value) setTracks(tracksRes.value);
      if (projRes.status === "fulfilled" && projRes.value) setProjects(projRes.value);
    } catch (err) {
      console.warn("Failed to load quality data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Attestation Prerequisites Evaluation (mirrors backend gate logic)
  const prerequisites = useMemo(() => {
    const hasActiveTrack = tracks.some((t) => t.isActive);
    const pendingProposalsCount = dashboard?.pendingProposals ?? projects.filter((p) => p.status === "PendingHOD").length;
    const totalTeamsCount = dashboard?.totalTeams ?? projects.length;

    const trackSatisfied = hasActiveTrack || tracks.length > 0;
    const proposalsSatisfied = pendingProposalsCount === 0;
    const teamsSatisfied = totalTeamsCount > 0;

    const allSatisfied = trackSatisfied && proposalsSatisfied && teamsSatisfied;

    return {
      hasActiveTrack: trackSatisfied,
      pendingProposalsCount,
      proposalsSatisfied,
      totalTeamsCount,
      teamsSatisfied,
      allSatisfied,
    };
  }, [tracks, dashboard, projects]);

  // Action: Attest Department SAR
  const handleConfirmAttest = async () => {
    setIsAttesting(true);
    try {
      const res = await hodApi.attestSar();
      showToast(res.message || "Department SAR contribution successfully attested and sealed.");
      setShowAttestConfirm(false);
      loadData();
    } catch (err: any) {
      showToast(err?.message || "Completeness validation failed: Cannot attest SAR.");
    } finally {
      setIsAttesting(false);
    }
  };

  // Action: Download NBA SAR ZIP
  const handleDownloadZip = async () => {
    setIsExportingZip(true);
    try {
      const blob = await hodApi.exportNbaDossierZip();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const deptCode = dashboard?.departmentCode || "CSE";
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = `Collabex_NBA_SAR_${deptCode}_${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("Official NBA SAR Dossier ZIP downloaded successfully.");
    } catch (err) {
      showToast("Failed to download NBA dossier zip. Please check network connection.");
    } finally {
      setIsExportingZip(false);
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

      {/* Accreditation Command Header Banner */}
      <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shrink-0" />
            <h1 className="text-base sm:text-lg font-bold font-heading text-slate-900 tracking-tight">
              Department Academic Evidence &amp; SAR Contribution
            </h1>
            {dashboard?.isSarAttested ? (
              <Badge variant="success" size="sm" dot>
                Attested &amp; Sealed
              </Badge>
            ) : (
              <Badge variant="warning" size="sm">
                Attestation Pending
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Aggregates verified project rubrics and student exit feedback mapped to NBA Criterion 3 Program Outcomes.
          </p>
          {dashboard?.isSarAttested && (
            <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1.5 pt-0.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>
                Attested on{" "}
                {dashboard.sarAttestedAtUtc
                  ? new Date(dashboard.sarAttestedAtUtc).toLocaleDateString()
                  : "recently"}
                . Synchronized with Institutional Accreditation.
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {!dashboard?.isSarAttested && (
            <Button
              size="md"
              variant="secondary"
              disabled={!prerequisites.allSatisfied}
              onClick={() => setShowAttestConfirm(true)}
              leftIcon={<ShieldCheck className="h-4 w-4 text-emerald-700" />}
              className="bg-white hover:bg-slate-50 border-emerald-300 text-emerald-800 disabled:opacity-50"
            >
              Attest Department SAR
            </Button>
          )}
          <Button
            size="md"
            variant="primary"
            onClick={handleDownloadZip}
            isLoading={isExportingZip}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export Dossier ZIP
          </Button>
        </div>
      </div>

      {/* Attestation Prerequisites Card: Visible when SAR attestation is pending */}
      {!dashboard?.isSarAttested && (
        <Card className="border-slate-200/80 bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-xs font-bold uppercase tracking-[0.06em] text-slate-600">
              Department SAR Attestation Readiness
            </CardTitle>
            <CardDescription>
              Backend validation gates strictly enforce these prerequisites before permitting HOD digital attestation.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Prerequisite 1: Active Track */}
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center gap-3">
              {prerequisites.hasActiveTrack ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              )}
              <div className="space-y-0.5 text-xs">
                <div className="font-semibold text-slate-900">Active Academic Track</div>
                <div className="text-[11px] text-slate-500">
                  {prerequisites.hasActiveTrack ? "Configured & Active" : "No active tracks configured"}
                </div>
              </div>
            </div>

            {/* Prerequisite 2: No Pending Proposals */}
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center gap-3">
              {prerequisites.proposalsSatisfied ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              )}
              <div className="space-y-0.5 text-xs">
                <div className="font-semibold text-slate-900">Proposal Reviews</div>
                <div className="text-[11px] text-slate-500">
                  {prerequisites.proposalsSatisfied
                    ? "All proposals resolved (0 pending)"
                    : `${prerequisites.pendingProposalsCount} proposal(s) awaiting review`}
                </div>
              </div>
            </div>

            {/* Prerequisite 3: Registered Projects */}
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center gap-3">
              {prerequisites.teamsSatisfied ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              )}
              <div className="space-y-0.5 text-xs">
                <div className="font-semibold text-slate-900">Registered Projects</div>
                <div className="text-[11px] text-slate-500">
                  {prerequisites.teamsSatisfied
                    ? `${prerequisites.totalTeamsCount} teams enrolled`
                    : "No teams registered"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Program Outcome (PO) Attainment Summary Table */}
      <Card className="border-slate-200/80 bg-white overflow-hidden shadow-2xs">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle>Program Outcome (PO) Attainment Summary</CardTitle>
            <CardDescription>
              Derived dynamically from viva defense evaluation rubrics and graduating student exit feedback.
            </CardDescription>
          </div>
          <Badge variant="neutral" size="sm">
            AICTE / NBA Tier-II Reference
          </Badge>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 select-none">
              <tr>
                <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                  PO Code
                </th>
                <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Outcome Description
                </th>
                <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Direct (80%)
                </th>
                <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Indirect (20%)
                </th>
                <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Blended Attainment
                </th>
                <th className="py-3 px-4 text-right font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-900 font-mono tabular-nums">
              {(nbaReport?.poBreakdown || []).map((po) => (
                <tr key={po.poCode} className="hover:bg-slate-50/75 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{po.poCode}</td>
                  <td className="py-3 px-4 font-sans font-medium text-slate-900">
                    {po.title}
                  </td>
                  <td className="py-3 px-4">
                    {po.directAttainmentPct != null ? (
                      `${po.directAttainmentPct}%`
                    ) : (
                      <span className="text-slate-400 font-sans">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {po.indirectAttainmentPct != null ? (
                      `${po.indirectAttainmentPct}%`
                    ) : (
                      <span className="text-slate-400 font-sans">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {po.blendedAttainmentPct != null ? (
                      `${po.blendedAttainmentPct}%`
                    ) : (
                      <span className="text-slate-400 font-sans font-normal">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    {po.blendedAttainmentPct != null ? (
                      <Badge
                        variant={po.targetMet ? "success" : "neutral"}
                        size="sm"
                        dot={po.targetMet}
                      >
                        {po.targetMet ? "Target Met" : "Below Benchmark"}
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        No Data
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!nbaReport || nbaReport.poBreakdown.length === 0) && !loading && (
          <div className="p-8">
            <EmptyState
              title="No Attainment Records Found"
              description="Outcomes will populate once faculty defense rubrics and course exit surveys are submitted."
            />
          </div>
        )}
      </Card>

      {/* Attainment Methodology Reference Card */}
      <Card className="border-slate-200/80 bg-slate-50/50">
        <CardContent className="p-4 space-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Info className="h-4 w-4 text-brand-primary" />
            <span>Accreditation Attainment Methodology &amp; Benchmarks</span>
          </div>
          <p className="leading-relaxed">
            <strong>Direct Assessment (80%):</strong> Percentage of student capstone viva evaluations meeting or exceeding the 35-mark rubric competency benchmark.
          </p>
          <p className="leading-relaxed">
            <strong>Indirect Assessment (20%):</strong> Course exit surveys completed by graduating students, normalized across Program Outcomes on a 3-point Likert scale.
          </p>
          <p className="leading-relaxed">
            <strong>Institutional Benchmark:</strong> The current target benchmark is configured at <strong>70.0%</strong> blended attainment. Outcomes below this threshold are flagged for remedial curriculum action.
          </p>
        </CardContent>
      </Card>

      {/* SAR Attestation Confirmation Dialog */}
      <HodConfirmationDialog
        isOpen={showAttestConfirm}
        onClose={() => setShowAttestConfirm(false)}
        onConfirm={handleConfirmAttest}
        title="Confirm Department SAR Attestation"
        description="Digitally signing and attesting the Department Self-Assessment Report (SAR) locks the departmental contribution and submits verified evidence to Institutional Accreditation. Ensure all student scores and project portfolios are complete."
        confirmText="Attest &amp; Seal Department SAR"
        variant="primary"
        isLoading={isAttesting}
      />
    </div>
  );
};
