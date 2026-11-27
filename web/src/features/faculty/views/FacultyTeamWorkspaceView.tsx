"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { facultyApi } from "@/lib/api/facultyApi";
import {
  ArtifactSlotDto,
  ClosureReadinessDto,
  ProjectMilestoneDto,
  ProjectProposalDto,
  ProjectReportSubmissionDto,
  SupervisedTeamDetailDto,
  WeeklyLogDto,
} from "@/lib/api/types";
import { DeliverableVaultTable } from "../components/DeliverableVaultTable";
import {
  ProposalDecisionModal,
  ProposalDecisionType,
} from "../components/ProposalDecisionModal";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Modal } from "@/design-system/components/Modal";
import { Textarea } from "@/design-system/components/Textarea";
import { TabBar } from "@/design-system/patterns/TabBar";
import { ConfirmationDialog } from "@/design-system/patterns/PageStates";
import { EmptyState } from "@/design-system/patterns/EmptyState";
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
  ExternalLink,
  Download,
  Lock,
  Unlock,
} from "lucide-react";

export interface FacultyTeamWorkspaceViewProps {
  teamId: string;
}

export const FacultyTeamWorkspaceView: React.FC<FacultyTeamWorkspaceViewProps> = ({
  teamId,
}) => {
  const router = useRouter();
  const [team, setTeam] = useState<ProjectProposalDto | null>(null);
  const [supervisedDetail, setSupervisedDetail] = useState<SupervisedTeamDetailDto | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactSlotDto[]>([]);
  const [submission, setSubmission] = useState<ProjectReportSubmissionDto | null>(null);
  const [closureReadiness, setClosureReadiness] = useState<ClosureReadinessDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    "overview" | "milestones" | "logs" | "deliverables" | "submission" | "proposal"
  >("overview");

  // Milestone review modal state
  const [milestoneReviewTarget, setMilestoneReviewTarget] = useState<{
    milestone: ProjectMilestoneDto;
    isApproved: boolean;
  } | null>(null);
  const [milestoneFeedback, setMilestoneFeedback] = useState("");
  const [reviewingMilestone, setReviewingMilestone] = useState(false);

  // Weekly log verification modal state
  const [logVerifyTarget, setLogVerifyTarget] = useState<{
    log: WeeklyLogDto;
    isVerified: boolean;
  } | null>(null);
  const [logRemarks, setLogRemarks] = useState("");
  const [verifyingLog, setVerifyingLog] = useState(false);

  // Final report review modal state
  const [submissionReviewTarget, setSubmissionReviewTarget] = useState<{
    isApproved: boolean;
  } | null>(null);
  const [submissionFeedback, setSubmissionFeedback] = useState("");
  const [reviewingSubmission, setReviewingSubmission] = useState(false);

  // Closure / Reopen modal state
  const [closureAction, setClosureAction] = useState<"close" | "reopen" | null>(null);
  const [closureText, setClosureText] = useState("");
  const [processingClosure, setProcessingClosure] = useState(false);

  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    type: ProposalDecisionType;
  }>({
    isOpen: false,
    type: "endorse",
  });

  const applyWorkspaceData = useCallback(
    async (targetTeamId: string) => {
      const teams = await facultyApi.getMentoredTeams();
      const targetTeam = teams.find((t) => t.teamId === targetTeamId);
      if (!targetTeam) {
        setIsUnauthorized(true);
        return;
      }
      setTeam(targetTeam);

      const [arts, detail, sub, readiness] = await Promise.all([
        facultyApi.getTeamArtifacts(targetTeamId),
        facultyApi.getSupervisedTeamDetail(targetTeamId).catch(() => null),
        facultyApi.getTeamSubmission(targetTeamId).catch(() => null),
        facultyApi.getClosureReadiness(targetTeamId).catch(() => null),
      ]);
      setArtifacts(arts);
      setSupervisedDetail(detail);
      setSubmission(sub);
      setClosureReadiness(readiness);
    },
    []
  );

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsUnauthorized(false);
    try {
      await applyWorkspaceData(teamId);
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
  }, [teamId, applyWorkspaceData]);

  useEffect(() => {
    let active = true;
    facultyApi
      .getMentoredTeams()
      .then(async (teams) => {
        if (!active) return;
        const targetTeam = teams.find((t) => t.teamId === teamId);
        if (!targetTeam) {
          setIsUnauthorized(true);
          return;
        }
        setTeam(targetTeam);
        const [arts, detail, sub, readiness] = await Promise.all([
          facultyApi.getTeamArtifacts(teamId),
          facultyApi.getSupervisedTeamDetail(teamId).catch(() => null),
          facultyApi.getTeamSubmission(teamId).catch(() => null),
          facultyApi.getClosureReadiness(teamId).catch(() => null),
        ]);
        if (!active) return;
        setArtifacts(arts);
        setSupervisedDetail(detail);
        setSubmission(sub);
        setClosureReadiness(readiness);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const errorObj = err as { status?: number; message?: string };
        if (errorObj?.status === 403 || errorObj?.status === 404) {
          setIsUnauthorized(true);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load project workspace.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [teamId]);

  const handleConfirmMilestoneReview = async () => {
    if (!milestoneReviewTarget) return;
    if (!milestoneReviewTarget.isApproved && milestoneFeedback.trim().length < 5) {
      showToast("Please provide revision feedback (at least 5 characters).", "error");
      return;
    }
    setReviewingMilestone(true);
    try {
      await facultyApi.reviewSupervisionMilestone(milestoneReviewTarget.milestone.id, {
        isApproved: milestoneReviewTarget.isApproved,
        feedback: milestoneFeedback.trim() || "Milestone approved by faculty guide.",
      });
      showToast(
        milestoneReviewTarget.isApproved
          ? "Milestone approved."
          : "Revision requested for milestone.",
        "success"
      );
      setMilestoneReviewTarget(null);
      setMilestoneFeedback("");
      await loadWorkspace();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to review milestone.", "error");
    } finally {
      setReviewingMilestone(false);
    }
  };

  const handleConfirmLogVerification = async () => {
    if (!logVerifyTarget) return;
    setVerifyingLog(true);
    try {
      await facultyApi.verifySupervisionLog(logVerifyTarget.log.id, {
        isVerified: logVerifyTarget.isVerified,
        mentorRemarks: logRemarks.trim() || undefined,
      });
      showToast(
        logVerifyTarget.isVerified ? "Weekly log verified." : "Weekly log feedback recorded.",
        "success"
      );
      setLogVerifyTarget(null);
      setLogRemarks("");
      await loadWorkspace();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to update log verification.", "error");
    } finally {
      setVerifyingLog(false);
    }
  };

  const handleDownloadSubmissionReport = async () => {
    if (!submission?.id) return;
    try {
      const blob = await facultyApi.downloadSubmissionReport(submission.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = submission.reportFileName || "final-report.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to download final report.", "error");
    }
  };

  const handleConfirmSubmissionReview = async () => {
    if (!submission || !submissionReviewTarget) return;
    if (!submissionReviewTarget.isApproved && submissionFeedback.trim().length < 5) {
      showToast("Please provide revision feedback (at least 5 characters).", "error");
      return;
    }
    setReviewingSubmission(true);
    try {
      await facultyApi.reviewFinalSubmission(submission.id, {
        isApproved: submissionReviewTarget.isApproved,
        feedback: submissionFeedback.trim() || "Final project report accepted.",
      });
      showToast(
        submissionReviewTarget.isApproved
          ? "Final project report accepted."
          : "Final project report returned for revision.",
        "success"
      );
      setSubmissionReviewTarget(null);
      setSubmissionFeedback("");
      await loadWorkspace();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to review final report.", "error");
    } finally {
      setReviewingSubmission(false);
    }
  };

  const handleConfirmClosureAction = async () => {
    if (!closureAction) return;
    if (closureText.trim().length < 5) {
      showToast("Please enter remarks/reason (at least 5 characters).", "error");
      return;
    }
    setProcessingClosure(true);
    try {
      if (closureAction === "close") {
        await facultyApi.formallyCloseProject(teamId, { closureRemarks: closureText.trim() });
        showToast("Project formally closed and archived to student portfolios.", "success");
      } else {
        await facultyApi.reopenClosedProject(teamId, { reason: closureText.trim() });
        showToast("Closed project reopened for remediation.", "success");
      }
      setClosureAction(null);
      setClosureText("");
      await loadWorkspace();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Project closure action failed.", "error");
    } finally {
      setProcessingClosure(false);
    }
  };

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
      <TabBar
        ariaLabel="Faculty team workspace sections"
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: "overview", label: "Overview & Formulation" },
          { id: "milestones", label: "Milestones", count: supervisedDetail?.milestones.length ?? 0 },
          { id: "logs", label: "Weekly Logs", count: supervisedDetail?.weeklyLogs.length ?? 0 },
          { id: "deliverables", label: "Deliverables Vault", count: artifacts.length },
          { id: "submission", label: "Final Report & Closure" },
          { id: "proposal", label: "Proposal Controls" },
        ]}
      />

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

      {/* Tab: Milestones */}
      {activeTab === "milestones" && (
        <Card>
          <CardHeader className="p-4 pb-3 border-b border-[#E2E8F0]">
            <CardTitle className="text-sm font-bold text-[#0F172A]">
              Project Milestones &amp; Checkpoints
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {!supervisedDetail || supervisedDetail.milestones.length === 0 ? (
              <EmptyState
                title="No milestones submitted yet"
                description="Milestones created by the team lead will appear here for review."
              />
            ) : (
              supervisedDetail.milestones.map((m) => (
                <div key={m.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{m.title}</span>
                      <Badge
                        variant={
                          m.status === "Approved"
                            ? "success"
                            : m.status === "SubmittedForReview"
                              ? "info"
                              : m.status === "RevisionRequested"
                                ? "warning"
                                : "neutral"
                        }
                        size="sm"
                      >
                        {m.status}
                      </Badge>
                    </div>
                    <span className="text-slate-500 tabular-nums">
                      Target: {new Date(m.targetDateUtc).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-600">{m.description}</p>
                  {m.submissionEvidenceUrl && (
                    <a
                      href={m.submissionEvidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-medium"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Inspect Submitted Evidence</span>
                    </a>
                  )}
                  {m.status === "SubmittedForReview" && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setMilestoneFeedback("");
                          setMilestoneReviewTarget({ milestone: m, isApproved: true });
                        }}
                      >
                        Approve Milestone
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setMilestoneFeedback("");
                          setMilestoneReviewTarget({ milestone: m, isApproved: false });
                        }}
                      >
                        Request Revision
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Weekly Logs */}
      {activeTab === "logs" && (
        <Card>
          <CardHeader className="p-4 pb-3 border-b border-[#E2E8F0]">
            <CardTitle className="text-sm font-bold text-[#0F172A]">
              Weekly Progress Logbook
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {!supervisedDetail || supervisedDetail.weeklyLogs.length === 0 ? (
              <EmptyState
                title="No weekly logs submitted"
                description="Student weekly check-ins will appear here for verification."
              />
            ) : (
              supervisedDetail.weeklyLogs.map((log) => (
                <div key={log.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">
                      Week {log.weekNumber} • {log.authorName} • {log.hoursLogged}h
                    </span>
                    <Badge variant={log.isVerified ? "success" : "info"} size="sm">
                      {log.isVerified ? "Verified" : "Pending Review"}
                    </Badge>
                  </div>
                  <p className="text-slate-700">{log.accomplishmentsSummary}</p>
                  {log.blockersSummary && <p className="text-slate-500">Blockers: {log.blockersSummary}</p>}
                  {!log.isVerified && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setLogRemarks("");
                          setLogVerifyTarget({ log, isVerified: true });
                        }}
                      >
                        Verify Log
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setLogRemarks("");
                          setLogVerifyTarget({ log, isVerified: false });
                        }}
                      >
                        Add Remarks
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Deliverables Vault */}
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

      {/* Tab: Final Report & Project Closure */}
      {activeTab === "submission" && (
        <div className="space-y-5">
          <Card>
            <CardHeader className="p-4 pb-3 border-b border-[#E2E8F0] flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-[#0F172A]">
                Final Project Report Submission
              </CardTitle>
              {submission && (
                <Badge
                  variant={
                    submission.status === "Accepted"
                      ? "success"
                      : submission.status === "RevisionRequested"
                        ? "warning"
                        : "info"
                  }
                  size="sm"
                >
                  {submission.status} (v{submission.versionNumber})
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {!submission ? (
                <EmptyState
                  title="No final report submitted"
                  description="The student team has not saved or submitted a final project report yet."
                />
              ) : (
                <>
                  <div className="font-bold text-sm text-slate-900">{submission.projectTitle}</div>
                  <p className="text-slate-600 whitespace-pre-wrap">{submission.abstract}</p>
                  {submission.reportFileName && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="font-medium text-slate-800">{submission.reportFileName}</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<Download className="h-3.5 w-3.5" />}
                        onClick={handleDownloadSubmissionReport}
                      >
                        Download Report
                      </Button>
                    </div>
                  )}
                  {(submission.status === "Submitted" || submission.status === "Resubmitted") && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setSubmissionFeedback("");
                          setSubmissionReviewTarget({ isApproved: true });
                        }}
                      >
                        Accept Final Report
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSubmissionFeedback("");
                          setSubmissionReviewTarget({ isApproved: false });
                        }}
                      >
                        Request Revision
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-3 border-b border-[#E2E8F0] flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-[#0F172A]">
                Project Closure &amp; Archival Readiness
              </CardTitle>
              {closureReadiness && (
                <Badge variant={closureReadiness.isClosed ? "success" : closureReadiness.canClose ? "info" : "warning"} size="sm">
                  {closureReadiness.isClosed ? "Formally Closed" : closureReadiness.canClose ? "Ready to Close" : "Blocked"}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {!closureReadiness ? (
                <p className="text-slate-500">Closure readiness details are unavailable for this team stage.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                      <div className="text-slate-500">Final Report</div>
                      <div className="font-semibold text-slate-900 mt-0.5">
                        {closureReadiness.finalReportAccepted ? "Accepted" : "Pending Acceptance"}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                      <div className="text-slate-500">Evaluation Published</div>
                      <div className="font-semibold text-slate-900 mt-0.5">
                        {closureReadiness.evaluationPublished
                          ? `Published (${closureReadiness.evaluationOutcome || "Recorded"})`
                          : "Pending Publication"}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                      <div className="text-slate-500">Individual Scores</div>
                      <div className="font-semibold text-slate-900 mt-0.5">
                        {closureReadiness.scoredMembersCount} / {closureReadiness.totalMembersCount} Finalized
                      </div>
                    </div>
                  </div>

                  {closureReadiness.blockingReasons.length > 0 && !closureReadiness.isClosed && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                      <strong>Blocking Conditions:</strong> {closureReadiness.blockingReasons.join(" • ")}
                    </div>
                  )}

                  {closureReadiness.isClosed && closureReadiness.existingClosure && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                      <div className="font-bold">
                        Closed on {new Date(closureReadiness.existingClosure.closedAtUtc).toLocaleDateString()} by {closureReadiness.existingClosure.closedByName}
                      </div>
                      <div className="font-mono text-[11px]">
                        Certificate Hash: {closureReadiness.existingClosure.closureCertificateHash}
                      </div>
                      <div>
                        Academic Records Generated: {closureReadiness.existingClosure.academicRecordsGenerated}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    {!closureReadiness.isClosed ? (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={!closureReadiness.canClose}
                        leftIcon={<Lock className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setClosureText("");
                          setClosureAction("close");
                        }}
                      >
                        Formally Close Project
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<Unlock className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setClosureText("");
                          setClosureAction("reopen");
                        }}
                      >
                        Reopen Closed Project
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
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

      {/* Milestone Review Modal */}
      <Modal
        isOpen={Boolean(milestoneReviewTarget)}
        onClose={() => !reviewingMilestone && setMilestoneReviewTarget(null)}
        title={
          milestoneReviewTarget?.isApproved
            ? `Approve Milestone: ${milestoneReviewTarget.milestone.title}`
            : `Request Revision: ${milestoneReviewTarget?.milestone.title || ""}`
        }
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setMilestoneReviewTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={milestoneReviewTarget?.isApproved ? "primary" : "danger"}
              size="sm"
              isLoading={reviewingMilestone}
              onClick={handleConfirmMilestoneReview}
            >
              {milestoneReviewTarget?.isApproved ? "Confirm Approval" : "Send Revision Request"}
            </Button>
          </div>
        }
      >
        <Textarea
          label={milestoneReviewTarget?.isApproved ? "Approval Remarks (Optional)" : "Revision Feedback *"}
          rows={3}
          value={milestoneFeedback}
          onChange={(e) => setMilestoneFeedback(e.target.value)}
          placeholder="Enter feedback for the student team..."
        />
      </Modal>

      {/* Weekly Log Verification Modal */}
      <Modal
        isOpen={Boolean(logVerifyTarget)}
        onClose={() => !verifyingLog && setLogVerifyTarget(null)}
        title={`Week ${logVerifyTarget?.log.weekNumber || ""} Logbook Review`}
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setLogVerifyTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" isLoading={verifyingLog} onClick={handleConfirmLogVerification}>
              {logVerifyTarget?.isVerified ? "Verify Log" : "Save Remarks"}
            </Button>
          </div>
        }
      >
        <Textarea
          label="Mentor Remarks (Optional)"
          rows={3}
          value={logRemarks}
          onChange={(e) => setLogRemarks(e.target.value)}
          placeholder="Add mentorship observations or guidance..."
        />
      </Modal>

      {/* Final Report Review Modal */}
      <Modal
        isOpen={Boolean(submissionReviewTarget)}
        onClose={() => !reviewingSubmission && setSubmissionReviewTarget(null)}
        title={submissionReviewTarget?.isApproved ? "Accept Final Project Report" : "Request Report Revision"}
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setSubmissionReviewTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={submissionReviewTarget?.isApproved ? "primary" : "danger"}
              size="sm"
              isLoading={reviewingSubmission}
              onClick={handleConfirmSubmissionReview}
            >
              {submissionReviewTarget?.isApproved ? "Accept Report" : "Return for Revision"}
            </Button>
          </div>
        }
      >
        <Textarea
          label={submissionReviewTarget?.isApproved ? "Acceptance Feedback (Optional)" : "Revision Feedback *"}
          rows={3}
          value={submissionFeedback}
          onChange={(e) => setSubmissionFeedback(e.target.value)}
          placeholder="Enter review notes for the student team..."
        />
      </Modal>

      {/* Project Closure / Reopen Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(closureAction)}
        onClose={() => !processingClosure && setClosureAction(null)}
        onConfirm={handleConfirmClosureAction}
        title={closureAction === "close" ? "Formally Close & Archive Project" : "Reopen Closed Project"}
        description={
          closureAction === "close"
            ? "Closing this project generates immutable academic portfolio records for all scored team members and archives the project."
            : "Reopening this project returns it from Completed/Archived status for remediation."
        }
        confirmText={closureAction === "close" ? "Close & Archive Project" : "Reopen Project"}
        variant={closureAction === "close" ? "primary" : "warning"}
        isLoading={processingClosure}
      >
        <Textarea
          label={closureAction === "close" ? "Closure Remarks *" : "Reopen Reason *"}
          rows={3}
          value={closureText}
          onChange={(e) => setClosureText(e.target.value)}
          placeholder={closureAction === "close" ? "Final sign-off remarks..." : "Reason for reopening..."}
        />
      </ConfirmationDialog>
    </div>
  );
};
