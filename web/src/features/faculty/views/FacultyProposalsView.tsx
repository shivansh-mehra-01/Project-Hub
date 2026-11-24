"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { facultyApi } from "@/lib/api/facultyApi";
import { ProjectProposalDto } from "@/lib/api/types";
import { ProposalReviewDrawer } from "../components/ProposalReviewDrawer";
import {
  ProposalDecisionModal,
  ProposalDecisionType,
} from "../components/ProposalDecisionModal";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { showToast } from "@/lib/toast";
import {
  FileText,
  RefreshCw,
  AlertCircle,
  Users,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Eye,
  ArrowLeft,
} from "lucide-react";

export const FacultyProposalsView: React.FC = () => {
  const router = useRouter();
  const [proposals, setProposals] = useState<ProjectProposalDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("PendingGuide");
  const [inspectingProposal, setInspectingProposal] = useState<ProjectProposalDto | null>(null);

  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    type: ProposalDecisionType;
    teamId: string;
    teamCode: string;
  }>({
    isOpen: false,
    type: "endorse",
    teamId: "",
    teamCode: "",
  });

  const loadProposals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const teams = await facultyApi.getMentoredTeams();
      setProposals(teams);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load project proposals.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProposals();
  }, [loadProposals]);

  const filteredProposals = useMemo(() => {
    if (statusFilter === "ALL") return proposals;
    return proposals.filter((p) => p.status === statusFilter);
  }, [proposals, statusFilter]);

  const handleOpenDecision = (teamId: string, teamCode: string, type: ProposalDecisionType) => {
    setDecisionModal({
      isOpen: true,
      type,
      teamId,
      teamCode,
    });
  };

  const handleConfirmDecision = async (
    teamId: string,
    decision: ProposalDecisionType,
    remarks?: string
  ) => {
    if (decision === "endorse") {
      await facultyApi.endorseProposal(teamId);
      showToast("Proposal endorsed & forwarded to Department Coordinator.", "success");
    } else if (decision === "return") {
      await facultyApi.returnProposal(teamId, { remarks: remarks! });
      showToast("Proposal returned to student team for revision.", "success");
    } else if (decision === "reject") {
      await facultyApi.rejectProposal(teamId, { remarks: remarks! });
      showToast("Proposal rejected. Guide assignment revoked.", "success");
    }
    setInspectingProposal(null);
    await loadProposals();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => router.push("/faculty")}
              className="text-xs text-[#64748B] hover:text-[#0F172A] flex items-center gap-1 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </button>
          </div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
            Student Project Proposals Review Queue
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Formulation review, academic curriculum endorsement, and student dossier governance
          </p>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={loadProposals}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Proposals
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={loadProposals}>
            Retry
          </Button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-100 w-fit text-xs font-semibold">
        {[
          { key: "PendingGuide", label: "Awaiting Endorsement" },
          { key: "Draft", label: "Draft / Returned" },
          { key: "PendingCoordinator", label: "Under Coordinator Review" },
          { key: "ALL", label: `All Proposals (${proposals.length})` },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === f.key
                ? "bg-white text-[#0F172A] shadow-xs"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Proposals List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-slate-100 rounded-xl animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : filteredProposals.length > 0 ? (
        <div className="space-y-4">
          {filteredProposals.map((prop) => {
            const isPending = prop.status === "PendingGuide";
            return (
              <Card key={prop.teamId} className="hover:border-slate-300 transition-colors">
                <CardHeader className="p-5 pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral" className="font-mono text-xs">
                        {prop.teamCode}
                      </Badge>
                      <Badge variant={isPending ? "warning" : "info"} dot>
                        {prop.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#64748B]">
                      {prop.domainTag && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-medium">
                          {prop.domainTag}
                        </span>
                      )}
                      {prop.sdgCode && (
                        <Badge variant="sdg" sdgNumber={parseInt(prop.sdgCode.replace(/\D/g, "") || "9", 10)}>
                          {prop.sdgCode}
                        </Badge>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {prop.memberCount} Students
                      </span>
                    </div>
                  </div>

                  <CardTitle className="text-base font-bold text-[#0F172A]">
                    {prop.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-5 pt-0 pb-3 text-xs text-[#475569] leading-relaxed line-clamp-3">
                  {prop.abstract || "No abstract provided."}
                </CardContent>

                <CardFooter className="p-5 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-[#64748B]">
                    {prop.similarityScorePct !== undefined && prop.similarityScorePct !== null && (
                      <span className="text-[11px]">
                        Similarity Overlap:{" "}
                        <strong
                          className={prop.similarityScorePct > 20 ? "text-amber-700" : "text-emerald-700"}
                        >
                          {prop.similarityScorePct}%
                        </strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setInspectingProposal(prop)}
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      Inspect Dossier
                    </Button>

                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleOpenDecision(prop.teamId, prop.teamCode, "reject")}
                          leftIcon={<XCircle className="w-3.5 h-3.5" />}
                        >
                          Reject
                        </Button>

                        <Button
                          size="sm"
                          variant="secondary"
                          className="border-amber-300 text-amber-800 hover:bg-amber-50"
                          onClick={() => handleOpenDecision(prop.teamId, prop.teamCode, "return")}
                          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                        >
                          Return
                        </Button>

                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleOpenDecision(prop.teamId, prop.teamCode, "endorse")}
                          leftIcon={<CheckCircle2 className="w-4 h-4" />}
                        >
                          Endorse
                        </Button>
                      </>
                    )}
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
          <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-sm text-[#0F172A]">No Proposals in this Queue</h3>
          <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
            There are currently no proposals matching the &apos;{statusFilter}&apos; filter.
          </p>
        </div>
      )}

      {/* Dossier Drawer */}
      <ProposalReviewDrawer
        isOpen={Boolean(inspectingProposal)}
        onClose={() => setInspectingProposal(null)}
        proposal={inspectingProposal}
        onEndorse={(teamId) => handleOpenDecision(teamId, inspectingProposal?.teamCode || "Team", "endorse")}
        onReturn={(teamId) => handleOpenDecision(teamId, inspectingProposal?.teamCode || "Team", "return")}
        onReject={(teamId) => handleOpenDecision(teamId, inspectingProposal?.teamCode || "Team", "reject")}
      />

      {/* Decision Modal */}
      <ProposalDecisionModal
        isOpen={decisionModal.isOpen}
        onClose={() => setDecisionModal((prev) => ({ ...prev, isOpen: false }))}
        decisionType={decisionModal.type}
        teamId={decisionModal.teamId}
        teamCode={decisionModal.teamCode}
        onConfirm={handleConfirmDecision}
      />
    </div>
  );
};
