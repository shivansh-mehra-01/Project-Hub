"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  GraduationCap,
  History,
  Lock,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Users2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { Textarea } from "@/design-system/components/Textarea";
import { Modal } from "@/design-system/components/Modal";
import { ConfirmationDialog } from "@/design-system/patterns/PageStates";
import { studentApi } from "@/lib/api/studentApi";
import {
  DashboardProjectSummaryDto,
  EligiblePeerDto,
  FacultyGuideSummaryDto,
  SimilarityCheckResultDto,
  StudentGuidePreferenceDto,
  StudentTeamRosterDto,
  TeamInvitationDto,
} from "@/lib/api/types";
import { showToast } from "@/lib/toast";

export interface WorkspacePreApprovalProps {
  activeProject?: DashboardProjectSummaryDto;
  teamRoster: StudentTeamRosterDto | null;
  sentInvitations: TeamInvitationDto[];
  guidePreference: StudentGuidePreferenceDto | null;
  facultyGuides: FacultyGuideSummaryDto[];
  currentUserId: string;
  isSoloTrack: boolean;
  onRefresh: () => Promise<void>;
  onRosterChange: (roster: StudentTeamRosterDto) => void;
  onFetchInvitations: () => Promise<void>;
  onFetchGuidePreference: () => Promise<void>;
  onFetchFacultyGuides: () => Promise<void>;
}

const DOMAIN_OPTIONS = [
  "Artificial Intelligence & ML",
  "IoT & Embedded Systems",
  "Cloud & Distributed Computing",
  "Cybersecurity & Cryptography",
  "Renewable Energy & Smart Grid",
  "Healthcare & Biomedical Engineering",
  "Robotics & Autonomous Systems",
  "Web & Mobile Application Engineering",
];

const SDG_OPTIONS = [
  "SDG-1", "SDG-2", "SDG-3", "SDG-4", "SDG-5", "SDG-6",
  "SDG-7", "SDG-8", "SDG-9", "SDG-10", "SDG-11", "SDG-12",
  "SDG-13", "SDG-14", "SDG-15", "SDG-16", "SDG-17",
];

export const WorkspacePreApproval: React.FC<WorkspacePreApprovalProps> = ({
  activeProject,
  teamRoster,
  sentInvitations,
  guidePreference,
  facultyGuides,
  currentUserId,
  isSoloTrack,
  onRefresh,
  onRosterChange,
  onFetchInvitations,
  onFetchGuidePreference,
  onFetchFacultyGuides,
}) => {
  const isRosterLocked = Boolean(teamRoster?.isRosterLocked || activeProject?.isRosterLocked);
  const isTeamLead = Boolean(teamRoster ? teamRoster.isCallerLead : activeProject?.isLeader);
  const projectStatus = activeProject?.status || teamRoster?.status || "Draft";
  const isDraft = projectStatus === "Draft" || projectStatus === "Rejected";

  const rosterMembers = teamRoster?.members?.length
    ? teamRoster.members
    : activeProject?.members || [];

  // Team & Invite State
  const [inviteUsn, setInviteUsn] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [showPeersModal, setShowPeersModal] = useState(false);
  const [eligiblePeers, setEligiblePeers] = useState<EligiblePeerDto[]>([]);
  const [peersLoading, setPeersLoading] = useState(false);
  const [peerSearchTerm, setPeerSearchTerm] = useState("");
  const [showTransferLeadModal, setShowTransferLeadModal] = useState(false);
  const [selectedTransferUserId, setSelectedTransferUserId] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Guide Modal State
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [selectedGuideId, setSelectedGuideId] = useState("");
  const [guideRemarks, setGuideRemarks] = useState("");
  const [isSubmittingGuide, setIsSubmittingGuide] = useState(false);
  const [guideSearchTerm, setGuideSearchTerm] = useState("");

  // Proposal Form State (controlled & synced with activeProject/teamRoster)
  const [proposalTitle, setProposalTitle] = useState(activeProject?.title || teamRoster?.title || "");
  const [proposalAbstract, setProposalAbstract] = useState(activeProject?.abstract || teamRoster?.abstract || "");
  const [proposalDomain, setProposalDomain] = useState(activeProject?.domainTag || teamRoster?.domainTag || DOMAIN_OPTIONS[0]);
  const [proposalSdg, setProposalSdg] = useState(activeProject?.sdgGoal || "SDG-9");
  const [similarityResult, setSimilarityResult] = useState<SimilarityCheckResultDto | null>(null);
  const [checkingSimilarity, setCheckingSimilarity] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);

  const fetchEligiblePeers = async (query?: string) => {
    setPeersLoading(true);
    try {
      const peers = await studentApi.getEligiblePeers(query);
      setEligiblePeers(peers || []);
    } catch {
      setEligiblePeers([]);
    } finally {
      setPeersLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsn.trim()) return;
    setIsSendingInvite(true);
    try {
      await studentApi.sendTeamInvitation({ enrollmentCode: inviteUsn.trim() });
      showToast(`Invitation sent to ${inviteUsn.trim().toUpperCase()}.`, "success");
      setInviteUsn("");
      await Promise.all([onFetchInvitations(), onRefresh()]);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to send invitation.", "error");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleInvitePeer = async (peer: EligiblePeerDto) => {
    setIsSendingInvite(true);
    try {
      await studentApi.sendTeamInvitation({ inviteeStudentId: peer.studentId });
      showToast(`Invitation sent to ${peer.fullName}.`, "success");
      await Promise.all([fetchEligiblePeers(peerSearchTerm), onFetchInvitations(), onRefresh()]);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to invite peer.", "error");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await studentApi.cancelInvitation(invitationId);
      showToast("Invitation cancelled.", "success");
      await Promise.all([onFetchInvitations(), onRefresh()]);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to cancel invitation.", "error");
    }
  };

  const handleTransferLeadership = async () => {
    if (!selectedTransferUserId) return;
    try {
      await studentApi.transferLeadership({ targetStudentId: selectedTransferUserId });
      setShowTransferLeadModal(false);
      showToast("Leadership transferred.", "success");
      await onRefresh();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to transfer leadership.", "error");
    }
  };

  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [rosterActionLoading, setRosterActionLoading] = useState(false);

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    setRosterActionLoading(true);
    try {
      await studentApi.removeMember(memberToRemove.id);
      showToast(`${memberToRemove.name} removed.`, "success");
      setMemberToRemove(null);
      await onRefresh();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to remove member.", "error");
    } finally {
      setRosterActionLoading(false);
    }
  };

  const handleConfirmLeaveTeam = async () => {
    setRosterActionLoading(true);
    try {
      await studentApi.leaveTeam();
      showToast("You have left the team.", "success");
      setConfirmLeaveOpen(false);
      await onRefresh();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to leave team.", "error");
    } finally {
      setRosterActionLoading(false);
    }
  };

  const handleSelectGuidePreference = async () => {
    if (!selectedGuideId) return;
    setIsSubmittingGuide(true);
    try {
      await studentApi.submitGuidePreference({
        guideUserId: selectedGuideId,
        remarks: guideRemarks.trim() || undefined,
      });
      showToast("Guide preference submitted.", "success");
      setIsGuideModalOpen(false);
      await Promise.all([onFetchGuidePreference(), onRefresh()]);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to submit guide preference.", "error");
    } finally {
      setIsSubmittingGuide(false);
    }
  };

  const handleCheckSimilarity = async () => {
    if (proposalTitle.trim().length < 5) {
      showToast("Enter at least 5 characters in the title first.", "error");
      return;
    }
    setCheckingSimilarity(true);
    try {
      const res = await studentApi.checkSimilarity({
        title: proposalTitle.trim(),
        abstract: proposalAbstract.trim() || undefined,
        excludeTeamId: activeProject?.teamId || teamRoster?.teamId,
      });
      setSimilarityResult(res);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Originality check failed.", "error");
    } finally {
      setCheckingSimilarity(false);
    }
  };

  const handleSaveProposalDraft = async () => {
    const teamId = activeProject?.teamId || teamRoster?.teamId;
    if (!teamId) return;
    if (proposalTitle.trim().length < 5) {
      showToast("Project title must be at least 5 characters.", "error");
      return;
    }
    if (proposalAbstract.trim().length < 20) {
      showToast("Project abstract must be at least 20 characters.", "error");
      return;
    }
    setSavingDraft(true);
    try {
      await studentApi.updateIdea(teamId, {
        title: proposalTitle.trim(),
        abstract: proposalAbstract.trim(),
        domainTag: proposalDomain,
        sdgCode: proposalSdg,
        guideUserId: guidePreference?.preferredGuideUserId || undefined,
      });
      showToast("Proposal draft saved.", "success");
      await onRefresh();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save draft.", "error");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmitProposal = async () => {
    const teamId = activeProject?.teamId || teamRoster?.teamId;
    if (!teamId) return;
    if (proposalTitle.trim().length < 5 || proposalAbstract.trim().length < 20) {
      showToast("Title (min 5 chars) and Abstract (min 20 chars) are required.", "error");
      return;
    }
    setSubmittingProposal(true);
    try {
      await studentApi.updateIdea(teamId, {
        title: proposalTitle.trim(),
        abstract: proposalAbstract.trim(),
        domainTag: proposalDomain,
        sdgCode: proposalSdg,
        guideUserId: guidePreference?.preferredGuideUserId || undefined,
      });
      if (activeProject?.proposalRemarks) {
        await studentApi.resubmitProposal(teamId, {});
      } else {
        await studentApi.submitProposal(teamId, {});
      }
      setShowSubmitConfirmModal(false);
      showToast("Proposal submitted for review. Roster is now locked.", "success");
      await onRefresh();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to submit proposal.", "error");
    } finally {
      setSubmittingProposal(false);
    }
  };

  const statusBadge = () => {
    switch (projectStatus) {
      case "PendingGuide":
        return <Badge variant="warning" size="sm" dot>Pending Guide Review</Badge>;
      case "PendingCoordinator":
        return <Badge variant="info" size="sm" dot>Pending Coordinator</Badge>;
      case "PendingHOD":
        return <Badge variant="info" size="sm" dot>Pending HOD Approval</Badge>;
      case "Rejected":
        return <Badge variant="danger" size="sm">Returned / Rejected</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Status Banner for Submitted / Returned Proposals */}
      {projectStatus.startsWith("Pending") && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <div className="font-bold text-amber-950">
              Proposal Under Review — {projectStatus.replace("Pending", "Awaiting ")}
            </div>
            <p className="text-amber-800">
              &ldquo;{activeProject?.title}&rdquo;
              {activeProject?.guideName ? ` • Guide: ${activeProject.guideName}` : ""}
            </p>
          </div>
        </div>
      )}

      {activeProject?.proposalRemarks && isDraft && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-950">Revision Requested</div>
            <p className="text-amber-800 mt-0.5">{activeProject.proposalRemarks}</p>
          </div>
        </div>
      )}

      {/* Team Discovery / Publish Bar (only in Draft for multi-member teams) */}
      {!isSoloTrack && teamRoster && teamRoster.status === "Draft" && (
        <Card className="border-slate-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-sm font-bold text-slate-900">
                  {teamRoster.teamName || teamRoster.title}
                </span>
                <span className="font-mono text-xs text-slate-500">{teamRoster.teamCode}</span>
                <Badge variant={teamRoster.isPublished ? "success" : "neutral"} size="sm">
                  {teamRoster.isPublished ? "Published" : "Private Draft"}
                </Badge>
              </div>
              {isTeamLead && !teamRoster.isPublished && !isRosterLocked && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={publishing}
                  onClick={async () => {
                    setPublishing(true);
                    try {
                      const updated = await studentApi.publishCurrentTeam();
                      onRosterChange(updated);
                      showToast("Team published in Explore Teams.", "success");
                    } catch (err: unknown) {
                      showToast(err instanceof Error ? err.message : "Failed to publish team.", "error");
                    } finally {
                      setPublishing(false);
                    }
                  }}
                >
                  {publishing ? "Publishing..." : "Publish Team"}
                </Button>
              )}
            </div>

            {isTeamLead && (teamRoster.incomingJoinRequests?.length ?? 0) > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="text-xs font-semibold text-slate-800">
                  Join Requests ({teamRoster.incomingJoinRequests!.length})
                </div>
                {teamRoster.incomingJoinRequests!.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{req.studentName}</span>
                      <span className="font-mono text-slate-500 ml-1.5">{req.studentUsn}</span>
                      <Badge variant="info" size="sm" className="ml-2">{req.desiredRole}</Badge>
                      {req.message && <p className="text-slate-600 mt-1">{req.message}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          try {
                            const updated = await studentApi.rejectJoinRequest(req.id);
                            onRosterChange(updated);
                            showToast(`Declined ${req.studentName}.`, "success");
                          } catch (err: unknown) {
                            showToast(err instanceof Error ? err.message : "Failed to reject.", "error");
                          }
                        }}
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={async () => {
                          try {
                            const updated = await studentApi.acceptJoinRequest(req.id);
                            onRosterChange(updated);
                            showToast(`${req.studentName} joined the team.`, "success");
                          } catch (err: unknown) {
                            showToast(err instanceof Error ? err.message : "Failed to accept.", "error");
                          }
                        }}
                      >
                        Accept
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main 2-Column Pre-Approval Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Column 1: Team Formation Roster */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">
              {isSoloTrack
                ? "Solo Project"
                : `Team Formation Roster (${rosterMembers.length}/${teamRoster?.maxTeamSize || 4})`}
            </CardTitle>
            <Badge
              variant={isSoloTrack ? "success" : isRosterLocked ? "neutral" : "warning"}
              size="sm"
            >
              {isSoloTrack ? "Individual" : isRosterLocked ? "Locked" : "Open"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {isRosterLocked && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-xs text-slate-600">
                <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Roster is locked for review.</span>
              </div>
            )}

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-slate-50/50">
              {rosterMembers.map((m) => (
                <div key={m.userId} className="p-3 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span className="truncate">{m.fullName}</span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          m.isTeamLead
                            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                            : "text-slate-600 bg-white border-slate-200"
                        }`}
                      >
                        {isSoloTrack ? "Author" : m.isTeamLead ? "Lead" : "Member"}
                      </span>
                    </div>
                    {m.moduleResponsibility && (
                      <div className="text-[11px] text-slate-500 truncate">{m.moduleResponsibility}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-[11px] text-slate-500">{m.enrollmentCode}</span>
                    {!isRosterLocked && !isSoloTrack && isTeamLead && !m.isTeamLead && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[10px] text-indigo-600 h-6 px-1.5"
                          onClick={() => {
                            setSelectedTransferUserId(m.userId);
                            setShowTransferLeadModal(true);
                          }}
                        >
                          Make Lead
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[10px] text-rose-600 h-6 px-1.5"
                          onClick={() => setMemberToRemove({ id: m.userId, name: m.fullName })}
                        >
                          Remove
                        </Button>
                      </>
                    )}
                    {!isRosterLocked && !isSoloTrack && !isTeamLead && m.userId === currentUserId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[10px] text-rose-600 h-6 px-1.5"
                        onClick={() => setConfirmLeaveOpen(true)}
                      >
                        Leave
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!isSoloTrack && !isRosterLocked && isTeamLead && (
              <div className="space-y-3 pt-1">
                {rosterMembers.length >= (teamRoster?.maxTeamSize || 4) ? (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                    <Users2 className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Team is at maximum capacity ({teamRoster?.maxTeamSize || 4} members).</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <form onSubmit={handleSendInvite} className="flex gap-2">
                      <Input
                        placeholder="Enter student USN (e.g. 0176CS221038)"
                        value={inviteUsn}
                        onChange={(e) => setInviteUsn(e.target.value)}
                        className="text-xs"
                        required
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        type="submit"
                        className="shrink-0"
                        disabled={isSendingInvite}
                        leftIcon={<Send className="h-3 w-3" />}
                      >
                        Send Invite
                      </Button>
                    </form>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-brand-primary"
                        onClick={() => {
                          fetchEligiblePeers();
                          setShowPeersModal(true);
                        }}
                        leftIcon={<Compass className="h-3.5 w-3.5" />}
                      >
                        Discover Classmates
                      </Button>
                    </div>
                  </div>
                )}

                {sentInvitations.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="text-xs font-semibold text-slate-700">
                      Pending Invitations ({sentInvitations.length})
                    </div>
                    {sentInvitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-800">{inv.inviteeName}</span>
                          <span className="font-mono text-[11px] text-slate-500 ml-1.5">
                            ({inv.inviteeEnrollmentCode})
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[10px] text-rose-600 h-6 px-1.5"
                          onClick={() => handleCancelInvitation(inv.id)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Column 2: Faculty Guide & Proposal */}
        <div className="space-y-5">
          {/* Guide Allocation Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-brand-primary" />
                <span>Faculty Guide</span>
              </CardTitle>
              <Badge
                variant={
                  guidePreference?.isOfficialGuideAssigned
                    ? "success"
                    : guidePreference?.guidePreferenceStatus === "Requested"
                    ? "warning"
                    : guidePreference?.guidePreferenceStatus === "Rejected"
                    ? "danger"
                    : "neutral"
                }
                size="sm"
              >
                {guidePreference?.isOfficialGuideAssigned
                  ? "Allocated"
                  : guidePreference?.guidePreferenceStatus === "Requested"
                  ? "Preference Sent"
                  : guidePreference?.guidePreferenceStatus === "Rejected"
                  ? "Rejected"
                  : "Not Selected"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {guidePreference?.guidePreferenceStatus === "Rejected" && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{guidePreference.guideAllocationRemarks || "Please select another faculty guide."}</span>
                </div>
              )}

              {guidePreference?.officiallyAllocatedGuideName ? (
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-emerald-950 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>{guidePreference.officiallyAllocatedGuideName}</span>
                    </div>
                    <div className="text-emerald-800 mt-0.5">
                      {guidePreference.officiallyAllocatedGuideDesignation || "Official Guide"} •{" "}
                      {guidePreference.officiallyAllocatedGuideDepartmentCode || "Department"}
                    </div>
                  </div>
                </div>
              ) : guidePreference?.preferredGuideName ? (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-brand-primary" />
                      <span>Preferred: {guidePreference.preferredGuideName}</span>
                    </div>
                    {guidePreference.guidePreferenceRemarks && (
                      <div className="text-slate-500 mt-0.5 italic">&ldquo;{guidePreference.guidePreferenceRemarks}&rdquo;</div>
                    )}
                  </div>
                  {isTeamLead && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        onFetchFacultyGuides();
                        setIsGuideModalOpen(true);
                      }}
                    >
                      Change
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-dashed border-slate-200">
                  <span className="text-slate-500">No preferred guide selected yet.</span>
                  {isTeamLead && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        onFetchFacultyGuides();
                        setIsGuideModalOpen(true);
                      }}
                    >
                      Select Guide
                    </Button>
                  )}
                </div>
              )}

              {guidePreference?.reassignmentHistory && guidePreference.reassignmentHistory.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <History className="h-3 w-3" />
                    <span>Reassignment History</span>
                  </div>
                  {guidePreference.reassignmentHistory.map((item) => (
                    <div key={item.id} className="text-[11px] text-slate-600 flex justify-between">
                      <span>
                        {item.previousGuideName || "Unassigned"} &rarr; <strong>{item.newGuideName}</strong>
                      </span>
                      <span className="text-slate-400">{new Date(item.approvedAtUtc).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Proposal Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Project Proposal</CardTitle>
              {statusBadge()}
            </CardHeader>
            <CardContent className="space-y-3.5">
              <Input
                label="Project Title"
                value={proposalTitle}
                onChange={(e) => setProposalTitle(e.target.value)}
                disabled={!isTeamLead || !isDraft}
              />

              <Textarea
                label="Abstract & Technical Approach"
                value={proposalAbstract}
                onChange={(e) => setProposalAbstract(e.target.value)}
                rows={3}
                disabled={!isTeamLead || !isDraft}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Domain</label>
                  <select
                    value={proposalDomain}
                    onChange={(e) => setProposalDomain(e.target.value)}
                    disabled={!isTeamLead || !isDraft}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
                  >
                    {DOMAIN_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">UN SDG</label>
                  <select
                    value={proposalSdg}
                    onChange={(e) => setProposalSdg(e.target.value)}
                    disabled={!isTeamLead || !isDraft}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
                  >
                    {SDG_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {similarityResult && (
                <div
                  className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                    similarityResult.isWarning
                      ? "bg-amber-50 border-amber-200 text-amber-900"
                      : "bg-emerald-50 border-emerald-200 text-emerald-900"
                  }`}
                >
                  {similarityResult.isWarning ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold">{similarityResult.message}</span>
                    {similarityResult.similarProjectCode && (
                      <span className="block text-[11px] mt-0.5">
                        Closest match: [{similarityResult.similarProjectCode}] {similarityResult.similarProjectTitle}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {isTeamLead && isDraft && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCheckSimilarity}
                    isLoading={checkingSimilarity}
                    leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                  >
                    Check Originality
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleSaveProposalDraft}
                      isLoading={savingDraft}
                    >
                      Save Draft
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setShowSubmitConfirmModal(true)}
                      leftIcon={<Lock className="h-3.5 w-3.5" />}
                    >
                      Lock Roster &amp; Submit to Guide
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit & Lock Confirmation Modal */}
      <Modal
        isOpen={showSubmitConfirmModal}
        onClose={() => setShowSubmitConfirmModal(false)}
        title="Lock Roster & Submit to Guide"
        description="Submitting locks your team roster and sends your proposal for faculty review."
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => setShowSubmitConfirmModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={submittingProposal}
              onClick={handleSubmitProposal}
              leftIcon={<Lock className="h-3.5 w-3.5" />}
            >
              Confirm &amp; Submit
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-slate-600">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>Roster Freezing Safeguard</span>
            </div>
            <p className="mt-1">Once submitted, team invitations and member changes are locked for review.</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="font-semibold text-slate-900">{proposalTitle}</div>
            <div className="text-slate-500 mt-1">Team Size: {rosterMembers.length} member(s)</div>
          </div>
        </div>
      </Modal>

      {/* Discover Classmates Modal */}
      <Modal
        isOpen={showPeersModal}
        onClose={() => setShowPeersModal(false)}
        title="Discover Available Classmates"
        description="Invite eligible unallocated peers from your department."
        footer={
          <Button variant="secondary" size="sm" onClick={() => setShowPeersModal(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-[11px] flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
            <span>Institutional Data Minimization Policy: Peer academic marks, CGPA, mobile numbers, and residential addresses are restricted.</span>
          </div>

          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, USN, or skills..."
              value={peerSearchTerm}
              onChange={(e) => {
                setPeerSearchTerm(e.target.value);
                fetchEligiblePeers(e.target.value);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-brand-primary"
            />
          </div>

          {peersLoading ? (
            <div className="py-6 text-center text-slate-400">Loading classmates...</div>
          ) : eligiblePeers.length === 0 ? (
            <div className="py-6 text-center text-slate-400">No eligible classmates found.</div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {eligiblePeers.map((peer) => (
                <div
                  key={peer.studentId}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">
                      {peer.fullName} <span className="font-mono text-slate-500 font-normal">{peer.enrollmentCode}</span>
                    </div>
                    {peer.skills && peer.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {peer.skills.map((s) => (
                          <span key={s} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={isSendingInvite}
                    onClick={() => handleInvitePeer(peer)}
                    leftIcon={<UserPlus className="h-3 w-3" />}
                  >
                    Invite
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Transfer Leadership Modal */}
      <Modal
        isOpen={showTransferLeadModal}
        onClose={() => setShowTransferLeadModal(false)}
        title="Transfer Team Leadership"
        description="Delegate Team Lead privileges to the selected member."
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => setShowTransferLeadModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleTransferLeadership}
              leftIcon={<Shield className="h-3.5 w-3.5" />}
            >
              Confirm Transfer
            </Button>
          </div>
        }
      >
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>Leadership Delegation Safeguard</span>
          </div>
          <p>You will become a standard member after transferring leadership.</p>
        </div>
      </Modal>

      {/* Guide Selection Modal */}
      <Modal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        title="Select Preferred Faculty Guide"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => setIsGuideModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedGuideId || isSubmittingGuide}
              onClick={handleSelectGuidePreference}
            >
              {isSubmittingGuide ? "Submitting..." : "Submit Preference"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 text-xs">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search faculty by name or expertise..."
              className="pl-9"
              value={guideSearchTerm}
              onChange={(e) => setGuideSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            {facultyGuides
              .filter(
                (f) =>
                  !guideSearchTerm ||
                  f.fullName.toLowerCase().includes(guideSearchTerm.toLowerCase()) ||
                  (f.skillsCsv && f.skillsCsv.toLowerCase().includes(guideSearchTerm.toLowerCase()))
              )
              .map((faculty) => {
                const isSelected = selectedGuideId === faculty.id;
                const isFull = !faculty.isAvailable;
                return (
                  <div
                    key={faculty.id}
                    onClick={() => {
                      if (!isFull) setSelectedGuideId(faculty.id);
                    }}
                    className={`p-3 rounded-lg border transition-all ${
                      isSelected
                        ? "border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary cursor-pointer"
                        : isFull
                        ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                        : "border-slate-200 hover:border-slate-300 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{faculty.fullName}</span>
                      <Badge variant={isFull ? "neutral" : "info"} size="sm">
                        {faculty.currentMentoredTeams}/{faculty.maxMentorTeams} Teams
                      </Badge>
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      {faculty.designation || "Faculty"} • {faculty.departmentCode || "Dept"}
                    </div>
                  </div>
                );
              })}
          </div>

          <Textarea
            label="Remarks (Optional)"
            placeholder="Why does your project align with this mentor?"
            rows={2}
            maxLength={500}
            value={guideRemarks}
            onChange={(e) => setGuideRemarks(e.target.value)}
          />
        </div>
      </Modal>

      <ConfirmationDialog
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleConfirmRemoveMember}
        title="Remove Team Member"
        description={`Remove ${memberToRemove?.name || "this member"} from the project team?`}
        confirmText="Remove Member"
        variant="danger"
        isLoading={rosterActionLoading}
      />

      <ConfirmationDialog
        isOpen={confirmLeaveOpen}
        onClose={() => setConfirmLeaveOpen(false)}
        onConfirm={handleConfirmLeaveTeam}
        title="Leave Project Team"
        description="Are you sure you want to leave this project team? You will need a new invitation or team to continue."
        confirmText="Leave Team"
        variant="danger"
        isLoading={rosterActionLoading}
      />
    </div>
  );
};
