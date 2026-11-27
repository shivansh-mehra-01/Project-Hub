"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FileCheck2,
  Check,
  RotateCcw,
  Unlock,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Button } from "@/design-system/components/Button";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import {
  hodApi,
  getAuthToken,
  ProjectProposalDto,
  ExceptionAuditLogDto,
  GradeUnlockRequestDto,
} from "@/lib/api";
import { ReturnProposalModal } from "../components/ReturnProposalModal";
import { HodConfirmationDialog } from "../components/HodConfirmationDialog";

type ApprovalQueueType = "proposals" | "overrides" | "unlocks";

export const HodApprovalsView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  useDashboardHeader({
    title: "Approvals",
  });

  // Active queue state synchronized with URL search parameter
  const initialQueue = (searchParams.get("queue") as ApprovalQueueType) || "proposals";
  const [activeQueue, setActiveQueue] = useState<ApprovalQueueType>(initialQueue);

  // Data states
  const [proposals, setProposals] = useState<ProjectProposalDto[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionAuditLogDto[]>([]);
  const [gradeUnlocks, setGradeUnlocks] = useState<GradeUnlockRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Proposal selection for bulk approval
  const [selectedProposalIds, setSelectedProposalIds] = useState<string[]>([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  // Return Proposal Modal
  const [returnTeam, setReturnTeam] = useState<{ id: string; teamCode: string; title: string } | null>(null);

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
      const [propRes, excRes, unlRes] = await Promise.allSettled([
        hodApi.getProposals(),
        hodApi.getExceptions(),
        hodApi.getGradeUnlocks(),
      ]);

      if (propRes.status === "fulfilled" && propRes.value) setProposals(propRes.value);
      if (excRes.status === "fulfilled" && excRes.value) setExceptions(excRes.value);
      if (unlRes.status === "fulfilled" && unlRes.value) setGradeUnlocks(unlRes.value);
    } catch (err) {
      console.warn("Failed to load approvals queue:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Synchronize queue switch with URL search params
  const handleQueueChange = (queue: ApprovalQueueType) => {
    setActiveQueue(queue);
    setSelectedProposalIds([]);
    router.replace(`/hod/approvals?queue=${queue}`, { scroll: false });
  };

  const pendingExceptions = useMemo(() => {
    return exceptions.filter((e) => !e.isApproved);
  }, [exceptions]);

  const totalPendingDecisions = useMemo(() => {
    return proposals.length + pendingExceptions.length + gradeUnlocks.length;
  }, [proposals.length, pendingExceptions.length, gradeUnlocks.length]);

  // Single Proposal Sign-Off
  const handleApproveProposal = async (teamId: string) => {
    try {
      await hodApi.approveProposal(teamId);
      showToast("Proposal approved and transitioned to Active Build with locked roster.");
      loadData();
    } catch (err: any) {
      showToast(err?.message || "Failed to approve proposal.");
    }
  };

  // Bulk Proposals Sign-Off
  const handleConfirmBulkApprove = async () => {
    if (selectedProposalIds.length === 0) return;
    setIsBulkApproving(true);

    try {
      const res = await hodApi.bulkApproveProposals(selectedProposalIds);
      showToast(res.message || `Successfully approved ${res.approvedCount} proposal(s).`);
      setSelectedProposalIds([]);
      setShowBulkConfirm(false);
      loadData();
    } catch (err: any) {
      showToast(err?.message || "Failed to bulk approve proposals.");
    } finally {
      setIsBulkApproving(false);
    }
  };

  // Exception Override Review
  const handleReviewException = async (id: string, approve: boolean) => {
    try {
      if (approve) {
        await hodApi.approveException(id);
        showToast("Governance exception override endorsed and executed.");
      } else {
        await hodApi.rejectException(id, "Rejected by HOD");
        showToast("Governance exception override rejected.");
      }
      loadData();
    } catch (err: any) {
      showToast(err?.message || "Failed to process exception override.");
    }
  };

  // Grade Unlock Review
  const handleReviewGradeUnlock = async (id: string, approve: boolean) => {
    try {
      if (approve) {
        await hodApi.approveGradeUnlock(id, "Grade modification authorized by HOD");
        showToast("Grade rubric unlocked for faculty mentor re-entry.");
      } else {
        await hodApi.rejectGradeUnlock(id, "Rejected by HOD");
        showToast("Grade unlock request rejected.");
      }
      loadData();
    } catch (err: any) {
      showToast(err?.message || "Failed to process grade unlock request.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Single Compact Queue Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-slate-100 rounded-xl border border-slate-200/80">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {/* Queue 1: Proposals */}
          <button
            type="button"
            onClick={() => handleQueueChange("proposals")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
              activeQueue === "proposals"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <span>Proposals</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                proposals.length > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-600"
              }`}
            >
              {proposals.length}
            </span>
          </button>

          {/* Queue 2: Overrides */}
          <button
            type="button"
            onClick={() => handleQueueChange("overrides")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
              activeQueue === "overrides"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <span>Governance Exceptions</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                pendingExceptions.length > 0
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {pendingExceptions.length}
            </span>
          </button>

          {/* Queue 3: Unlocks */}
          <button
            type="button"
            onClick={() => handleQueueChange("unlocks")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
              activeQueue === "unlocks"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <span>Grade Unlock Requests</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                gradeUnlocks.length > 0
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {gradeUnlocks.length}
            </span>
          </button>
        </div>

        {/* Bulk Actions for Proposals */}
        {activeQueue === "proposals" && selectedProposalIds.length > 0 && (
          <div className="flex items-center gap-2 px-2 shrink-0">
            <span className="text-xs font-semibold text-slate-800">
              {selectedProposalIds.length} Selected
            </span>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowBulkConfirm(true)}
              className="h-7 text-xs"
            >
              Bulk Sign-Off ({selectedProposalIds.length})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedProposalIds([])}
              className="h-7 text-xs text-slate-500 hover:text-slate-800"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* QUEUE 1: PROPOSALS AWAITING SIGN-OFF                                      */}
      {/* ========================================================================= */}
      {activeQueue === "proposals" && (
        <Card className="border-slate-200/80 bg-white overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 select-none">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        proposals.length > 0 && selectedProposalIds.length === proposals.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) setSelectedProposalIds(proposals.map((p) => p.teamId));
                        else setSelectedProposalIds([]);
                      }}
                      className="rounded border-slate-300 text-brand-primary accent-brand-primary cursor-pointer"
                      aria-label="Select all proposals"
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                    Team Code
                  </th>
                  <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                    Project Title &amp; Abstract
                  </th>
                  <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                    Domain &amp; SDG
                  </th>
                  <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                    Assigned Guide
                  </th>
                  <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                    Members
                  </th>
                  <th className="py-3 px-4 text-right font-semibold text-[11px] uppercase tracking-[0.06em]">
                    HOD Decision
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900">
                {proposals.map((pr) => {
                  const isSelected = selectedProposalIds.includes(pr.teamId);
                  return (
                    <tr
                      key={pr.teamId}
                      className={`hover:bg-slate-50/75 transition-colors ${
                        isSelected ? "bg-emerald-50/30" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedProposalIds((prev) =>
                              prev.includes(pr.teamId)
                                ? prev.filter((id) => id !== pr.teamId)
                                : [...prev, pr.teamId]
                            );
                          }}
                          className="rounded border-slate-300 text-brand-primary accent-brand-primary cursor-pointer"
                          aria-label={`Select proposal ${pr.teamCode}`}
                        />
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {pr.teamCode}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate" title={pr.title}>
                          {pr.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5" title={pr.abstract}>
                          {pr.abstract}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="sdg"
                          sdgNumber={Number(pr.sdgCode?.replace(/\D/g, "")) || 9}
                          size="sm"
                        >
                          {pr.domainTag || "Core"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {pr.guideName || "Unassigned"}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                        {pr.memberCount} Members
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setReturnTeam({
                                id: pr.teamId,
                                teamCode: pr.teamCode,
                                title: pr.title,
                              })
                            }
                            className="h-7 text-xs text-amber-800 hover:bg-amber-50"
                          >
                            Return
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleApproveProposal(pr.teamId)}
                            leftIcon={<Check className="h-3.5 w-3.5" />}
                            className="h-7 text-xs"
                          >
                            Sign-Off
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {proposals.length === 0 && !loading && (
            <div className="p-8">
              <EmptyState
                title="No Pending Proposals"
                description="All student capstone proposals have been reviewed and signed off. Approved teams transition directly to Active Build."
              />
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* QUEUE 2: GOVERNANCE EXCEPTION OVERRIDES                                   */}
      {/* ========================================================================= */}
      {activeQueue === "overrides" && (
        <Card className="border-slate-200/80 bg-white">
          <CardContent className="space-y-3 p-4 sm:p-5">
            {pendingExceptions.length === 0 && !loading ? (
              <div className="p-6">
                <EmptyState
                  title="No Pending Exception Overrides"
                  description="All Project Coordinator administrative exception requests (guide reassignments, roster amendments) have been resolved."
                />
              </div>
            ) : (
              pendingExceptions.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-xl border border-amber-200/90 bg-amber-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-amber-200">
                        {log.teamCode}
                      </span>
                      <Badge variant="warning" size="sm">
                        {log.actionType}
                      </Badge>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Requested by: {log.requestedByName || "Project Coordinator"} •{" "}
                        {new Date(log.createdAtUtc).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 leading-relaxed">
                      <strong>Audit Rationale:</strong> &ldquo;{log.reason}&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReviewException(log.id, false)}
                      className="text-slate-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleReviewException(log.id, true)}
                      leftIcon={<Check className="h-3.5 w-3.5" />}
                    >
                      Endorse &amp; Execute
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* QUEUE 3: GRADE UNLOCK REQUESTS                                            */}
      {/* ========================================================================= */}
      {activeQueue === "unlocks" && (
        <Card className="border-slate-200/80 bg-white">
          <CardContent className="space-y-3 p-4 sm:p-5">
            {gradeUnlocks.length === 0 && !loading ? (
              <div className="p-6">
                <EmptyState
                  title="No Active Grade Unlock Requests"
                  description="All mid-term and final viva defense rubric evaluations are securely finalized and locked."
                />
              </div>
            ) : (
              gradeUnlocks.map((u) => (
                <div
                  key={u.id}
                  className="p-4 rounded-xl border border-rose-200/80 bg-rose-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-rose-200">
                        {u.teamCode}
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {u.teamTitle}
                      </span>
                      <Badge variant="neutral" size="sm">
                        {u.checkpointType}
                      </Badge>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(u.requestedAtUtc).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 leading-relaxed">
                      Requested by <strong>{u.requestedByFacultyName}</strong>: &ldquo;{u.reason}&rdquo;
                    </p>

                    <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-medium">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <span>
                        Authorizing an unlock allows the mentor to revise locked evaluation marks.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReviewGradeUnlock(u.id, false)}
                      className="text-slate-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleReviewGradeUnlock(u.id, true)}
                      leftIcon={<Unlock className="h-3.5 w-3.5" />}
                    >
                      Authorize Unlock
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Return Proposal Modal */}
      <ReturnProposalModal
        team={returnTeam}
        isOpen={!!returnTeam}
        onClose={() => setReturnTeam(null)}
        onSuccess={(msg) => {
          showToast(msg);
          loadData();
        }}
      />

      {/* Bulk Approval Confirmation Dialog */}
      <HodConfirmationDialog
        isOpen={showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        onConfirm={handleConfirmBulkApprove}
        title="Confirm Bulk Proposal Sign-Off"
        description={`You are about to sign off and lock rosters for ${selectedProposalIds.length} capstone proposals simultaneously. This will transition each team to Active Build.`}
        confirmText={`Sign Off ${selectedProposalIds.length} Proposals`}
        variant="primary"
        isLoading={isBulkApproving}
      />
    </div>
  );
};
