"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { facultyApi } from "@/lib/api/facultyApi";
import {
  ArtifactSlotDto,
  ProjectProposalDto,
} from "@/lib/api/types";
import { DeliverableVaultTable } from "../components/DeliverableVaultTable";
import {
  ProposalDecisionModal,
  ProposalDecisionType,
} from "../components/ProposalDecisionModal";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { showToast } from "@/lib/toast";
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  Users,
  CheckCircle2,
  RotateCcw,
  XCircle,
} from "lucide-react";

export interface FacultyTeamWorkspaceViewProps {
  teamId: string;
}

export const FacultyTeamWorkspaceView: React.FC<FacultyTeamWorkspaceViewProps> = ({
  teamId,
}) => {
  const router = useRouter();
  const [team, setTeam] = useState<ProjectProposalDto | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactSlotDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "proposal" | "deliverables">("overview");

  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    type: ProposalDecisionType;
  }>({
    isOpen: false,
    type: "endorse",
  });

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsUnauthorized(false);
    try {
      // 1. Fetch mentored teams to locate authorized team
      const teams = await facultyApi.getMentoredTeams();
      const targetTeam = teams.find((t) => t.teamId === teamId);

      if (!targetTeam) {
        setIsUnauthorized(true);
        setIsLoading(false);
        return;
      }

      setTeam(targetTeam);

      // 2. Fetch deliverables vault for this team
      const arts = await facultyApi.getTeamArtifacts(teamId);
      setArtifacts(arts);
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      if (errorObj?.status === 403 || errorObj?.status === 404) {
        setIsUnauthorized(true);
      } else {
        const msg = err instanceof Error ? err.message : "Failed to load project workspace.";
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWorkspace();
  }, [loadWorkspace]);

  const handleDownloadArtifact = async (artifact: ArtifactSlotDto) => {
    if (!artifact.id) {
      showToast("Artifact file not available for download.", "warning");
      return;
    }
    try {
      showToast(`Initiating download for ${artifact.fileName || "deliverable.pdf"}...`, "info");
      const blob = await facultyApi.downloadArtifact(artifact.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = artifact.fileName || `${artifact.slotType}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("Download completed.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to download artifact deliverable.";
      showToast(msg, "error");
    }
  };

  const handleReviewArtifact = async (
    artifact: ArtifactSlotDto,
    isApproved: boolean,
    reviewerNote?: string
  ) => {
    if (!artifact.id) return;
    try {
      await facultyApi.reviewArtifact(artifact.id, {
        isApproved,
        reviewerNote,
      });
      showToast(
        isApproved
          ? `Deliverable '${artifact.slotType}' marked as Verified.`
          : `Revision requested for '${artifact.slotType}'.`,
        "success"
      );
      // Reload artifacts
      const arts = await facultyApi.getTeamArtifacts(teamId);
      setArtifacts(arts);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit artifact review.";
      showToast(msg, "error");
    }
  };

  const handleConfirmDecision = async (
    targetTeamId: string,
    decision: ProposalDecisionType,
    remarks?: string
  ) => {
    if (decision === "endorse") {
      await facultyApi.endorseProposal(targetTeamId);
      showToast("Proposal endorsed & forwarded to Department Coordinator.", "success");
    } else if (decision === "return") {
      await facultyApi.returnProposal(targetTeamId, { remarks: remarks! });
      showToast("Proposal returned to student team for revision.", "success");
    } else if (decision === "reject") {
      await facultyApi.rejectProposal(targetTeamId, { remarks: remarks! });
      showToast("Proposal rejected. Guide assignment revoked.", "success");
    }
    await loadWorkspace();
  };

  if (isUnauthorized) {
    return (
      <div className="p-12 max-w-lg mx-auto text-center rounded-2xl bg-white border border-slate-200 mt-8 shadow-sm">
        <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-[#0F172A]">Workspace Access Restricted</h2>
        <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
          You are not authorized to view this project team&apos;s academic workspace, or the requested team record does not exist in your department mentorship portfolio.
        </p>
        <div className="mt-6">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => router.push("/faculty/teams")}
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Return to My Teams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Workspace Breadcrumbs & Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => router.push("/faculty/teams")}
              className="text-xs text-[#64748B] hover:text-[#0F172A] flex items-center gap-1 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> My Teams
            </button>
            <span className="text-xs text-slate-300">/</span>
            <span className="text-xs font-mono font-semibold text-[#0F172A]">
              {team?.teamCode || "Loading..."}
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
            {team?.title || "Project Team Workspace"}
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Dedicated academic supervision, capstone vault governance, and formulation reviews
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={loadWorkspace}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Workspace
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={loadWorkspace}>
            Retry
          </Button>
        </div>
      )}

      {/* Team Meta Ribbon */}
      {team && (
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge variant="neutral" className="font-mono text-xs font-semibold px-2.5 py-1">
              {team.teamCode}
            </Badge>
            <Badge variant={team.status === "ActiveBuild" ? "success" : team.status === "AtRisk" ? "danger" : "warning"} dot>
              {team.status}
            </Badge>
            {team.domainTag && (
              <span className="text-xs text-[#64748B] font-medium bg-slate-100 px-2.5 py-0.5 rounded-full">
                {team.domainTag}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-[#64748B]">
            {team.sdgCode && (
              <Badge variant="sdg" sdgNumber={parseInt(team.sdgCode.replace(/\D/g, "") || "9", 10)}>
                {team.sdgCode}
              </Badge>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {team.memberCount} Students
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[#E2E8F0] flex items-center gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 transition-colors relative ${
            activeTab === "overview"
              ? "text-brand-primary border-b-2 border-brand-primary"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          Overview & Formulation
        </button>
        <button
          onClick={() => setActiveTab("deliverables")}
          className={`pb-3 transition-colors relative ${
            activeTab === "deliverables"
              ? "text-brand-primary border-b-2 border-brand-primary"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          Deliverables Vault (4 Slots)
        </button>
        <button
          onClick={() => setActiveTab("proposal")}
          className={`pb-3 transition-colors relative ${
            activeTab === "proposal"
              ? "text-brand-primary border-b-2 border-brand-primary"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          Proposal Decision Controls
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && team && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-[#0F172A]">
                Project Abstract & Synopsis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 text-xs text-[#0F172A] leading-relaxed whitespace-pre-wrap">
              {team.abstract || "No detailed technical synopsis submitted."}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Similarity & Past Project Advisory
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 text-xs">
                {team.similarityScorePct !== undefined && team.similarityScorePct !== null ? (
                  <div>
                    <p
                      className={`text-2xl font-bold ${
                        team.similarityScorePct > 20 ? "text-amber-700" : "text-emerald-700"
                      }`}
                    >
                      {team.similarityScorePct}%
                    </p>
                    <p className="text-[#64748B] mt-1 text-[11px]">
                      {team.similarProjectCode
                        ? `Reference match: ${team.similarProjectCode}`
                        : "Compared against institutional project repository"}
                    </p>
                  </div>
                ) : (
                  <p className="text-[#64748B]">No similarity advisory record indexed.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Continuous Mentorship Discipline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 text-xs text-[#64748B] space-y-1.5">
                <p>
                  <strong className="text-[#0F172A]">Current Academic Status:</strong> {team.status}
                </p>
                <p>
                  <strong className="text-[#0F172A]">Deliverables Verified:</strong>{" "}
                  {artifacts.filter((a) => a.status === "Verified").length} of 4 slots
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Deliverables Vault */}
      {activeTab === "deliverables" && (
        <Card>
          <CardHeader className="p-4 pb-3 border-b border-[#E2E8F0]">
            <CardTitle className="text-sm font-bold text-[#0F172A]">
              Official Capstone 4-Slot Vault
            </CardTitle>
            <p className="text-xs text-[#64748B] mt-0.5">
              Review and attest required academic deliverables (Synopsis, MidTerm PPT, Plagiarism Report, Final Thesis)
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <DeliverableVaultTable
              artifacts={artifacts}
              isLoading={isLoading}
              onDownload={handleDownloadArtifact}
              onReview={handleReviewArtifact}
              canReview={true}
            />
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Proposal Decisions */}
      {activeTab === "proposal" && team && (
        <Card>
          <CardHeader className="p-4 pb-3 border-b border-[#E2E8F0]">
            <CardTitle className="text-sm font-bold text-[#0F172A]">
              Proposal Endorsement & Governance Decisions
            </CardTitle>
            <p className="text-xs text-[#64748B] mt-0.5">
              Current Status: <strong className="text-[#0F172A]">{team.status}</strong>
            </p>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {team.status === "PendingGuide" ? (
              <div className="space-y-4">
                <p className="text-xs text-[#475569] leading-relaxed">
                  This proposal is currently awaiting your faculty guide decision. You can endorse it to advance to the Department Coordinator, return it to the student team with specific revision notes, or reject it.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    variant="primary"
                    onClick={() => setDecisionModal({ isOpen: true, type: "endorse" })}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Endorse Proposal
                  </Button>

                  <Button
                    variant="secondary"
                    className="border-amber-300 text-amber-800 hover:bg-amber-50"
                    onClick={() => setDecisionModal({ isOpen: true, type: "return" })}
                    leftIcon={<RotateCcw className="w-4 h-4" />}
                  >
                    Return for Revision
                  </Button>

                  <Button
                    variant="danger"
                    onClick={() => setDecisionModal({ isOpen: true, type: "reject" })}
                    leftIcon={<XCircle className="w-4 h-4" />}
                  >
                    Reject Proposal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#64748B]">
                <p className="font-semibold text-[#0F172A] mb-1">
                  Proposal Decisions Closed
                </p>
                <p>
                  This proposal is currently in <strong className="text-[#0F172A]">{team.status}</strong> status. Guide endorsement controls are only active when a proposal is in <strong className="text-[#0F172A]">PendingGuide</strong> status.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Proposal Decision Confirmation Modal */}
      {team && (
        <ProposalDecisionModal
          isOpen={decisionModal.isOpen}
          onClose={() => setDecisionModal((prev) => ({ ...prev, isOpen: false }))}
          decisionType={decisionModal.type}
          teamId={team.teamId}
          teamCode={team.teamCode}
          onConfirm={handleConfirmDecision}
        />
      )}
    </div>
  );
};
