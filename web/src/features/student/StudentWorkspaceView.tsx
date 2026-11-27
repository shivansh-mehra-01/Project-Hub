"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Kanban,
  FileCheck2,
  CheckCircle2,
  Clock,
  Plus,
  ExternalLink,
  Lock,
  Send,
  Users2,
  AlertCircle,
  AlertTriangle,
  Upload,
  Link as LinkIcon,
  Settings,
  FileUp,
  ShieldCheck,
  Shield,
  Download,
  Loader2,
  GraduationCap,
  Compass,
  Sparkles,
  History,
  UserPlus,
  UserMinus,
  UserCheck,
  XCircle,
  Search,
  Mail,
  ArrowRightLeft,
  UserX,
  Trash2,
  Target,
  Calendar,
  Video,
  MapPin,
  Award,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { StudentTeamFormationPanel } from "./components/StudentTeamFormationPanel";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { StepperGPS } from "@/design-system/patterns/StepperGPS";
import { Modal } from "@/design-system/components/Modal";
import { Input } from "@/design-system/components/Input";
import { Textarea } from "@/design-system/components/Textarea";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { ArtifactSlot, GuideReviewStatusType, ProjectArtifact, TaskStatusType, Team } from "@/mocks/store-types";
import { studentApi } from "@/lib/api";
import {
  CollegeTrackDto,
  StudentDashboardDto,
  EligiblePeerDto,
  TeamInvitationDto,
  StudentTeamRosterDto,
  StudentGuidePreferenceDto,
  FacultyGuideSummaryDto,
  SprintTaskDto,
  ProjectProgressDto,
  SprintTaskStatus,
  ProjectMilestoneDto,
  ProjectReportSubmissionDto,
  FinalSubmissionStatus,
  SubmissionReviewHistoryDto,
  SubmissionReadinessDto,
  StudentVivaResultDto,
} from "@/lib/api/types";
import { showToast } from "@/lib/toast";
import { GithubIcon } from "@/design-system/components/Icons";

export const StudentWorkspaceView: React.FC = () => {
  const {
    teams,
    currentPersona,
    cycle,
    updateTaskStatus,
    createTask,
    submitWeeklyLog,
    approveProposal,
    inviteTeamMember,
    updateTeamRepo,
    uploadArtifact,
    uploadArtifactBinary,
  } = useProjectHubStore();

  // Post-approval sub-tabs (7 dedicated tabs)
  const [subTab, setSubTab] = useState<"tasks" | "milestones" | "logs" | "vault" | "final-submission" | "evaluations" | "roster">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("subtab");
      if (tabParam === "tasks" || tabParam === "board") return "tasks";
      if (tabParam === "milestones") return "milestones";
      if (tabParam === "logs") return "logs";
      if (tabParam === "vault") return "vault";
      if (tabParam === "final-submission" || tabParam === "submission") return "final-submission";
      if (tabParam === "evaluations") return "evaluations";
      if (tabParam === "roster" || tabParam === "overview") return "roster";
    }
    return "tasks";
  });

  const subTabBreadcrumbs: Record<string, string> = {
    tasks: "Sprint Tasks",
    milestones: "Project Milestones",
    logs: "Weekly Logbook",
    vault: "Capstone Vault",
    "final-submission": "Final Project Report & Deliverables",
    evaluations: "Evaluations & Defense",
    roster: "Team Roster & Settings",
  };

  // Phase 8 Final Submission & Academic Deliverables State
  const [submissionData, setSubmissionData] = useState<ProjectReportSubmissionDto | null>(null);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftAbstract, setDraftAbstract] = useState("");
  const [draftProblemStatement, setDraftProblemStatement] = useState("");
  const [draftMethodology, setDraftMethodology] = useState("");
  const [draftImplSummary, setDraftImplSummary] = useState("");
  const [draftResults, setDraftResults] = useState("");
  const [draftReferences, setDraftReferences] = useState("");
  const [draftRepoUrl, setDraftRepoUrl] = useState("");
  const [draftDemoUrl, setDraftDemoUrl] = useState("");
  const [submissionSaving, setSubmissionSaving] = useState(false);
  const [submissionSubmitting, setSubmissionSubmitting] = useState(false);
  const [submissionToast, setSubmissionToast] = useState<string | null>(null);

  const fetchFinalSubmission = useCallback(async () => {
    try {
      setSubmissionLoading(true);
      const data = await studentApi.getFinalSubmission();
      if (data) {
        setSubmissionData(data);
        setDraftTitle(data.projectTitle || "");
        setDraftAbstract(data.abstract || "");
        setDraftProblemStatement(data.problemStatement || "");
        setDraftMethodology(data.methodology || "");
        setDraftImplSummary(data.implementationSummary || "");
        setDraftResults(data.resultsAndConclusion || "");
        setDraftReferences(data.references || "");
        setDraftRepoUrl(data.repositoryUrl || "");
        setDraftDemoUrl(data.demoUrl || "");
      }
    } catch {
      // Unallocated or network error
    } finally {
      setSubmissionLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === "final-submission") {
      fetchFinalSubmission();
    }
  }, [subTab, fetchFinalSubmission]);

  // Phase 9 Evaluation & Defense State
  const [evaluationData, setEvaluationData] = useState<StudentVivaResultDto | null>(null);
  const [evaluationLoading, setEvaluationLoading] = useState(false);

  const fetchEvaluation = useCallback(async () => {
    try {
      setEvaluationLoading(true);
      const data = await studentApi.getEvaluationResult();
      if (data) {
        setEvaluationData(data);
      }
    } catch {
      // Unallocated or network error
    } finally {
      setEvaluationLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === "evaluations") {
      fetchEvaluation();
    }
  }, [subTab, fetchEvaluation]);

  // Phase 7 Milestones State
  const [liveMilestones, setLiveMilestones] = useState<ProjectMilestoneDto[]>([]);
  const milestonesLoading = false;
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showSubmitMilestoneModal, setShowSubmitMilestoneModal] = useState(false);
  const [selectedMilestoneForSubmit, setSelectedMilestoneForSubmit] = useState<ProjectMilestoneDto | null>(null);
  const [submissionEvidenceUrl, setSubmissionEvidenceUrl] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDesc, setMilestoneDesc] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [milestoneTaskPct, setMilestoneTaskPct] = useState(0);
  const [milestoneSubmitting, setMilestoneSubmitting] = useState(false);

  const fetchMilestones = useCallback(async () => {
    try {
      const list = await studentApi.getWorkspaceMilestones();
      setLiveMilestones(list || []);
    } catch {
      // Unallocated or network error
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (subTab === "milestones") {
      void studentApi.getWorkspaceMilestones().then((list) => {
        if (active && list) setLiveMilestones(list);
      }).catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [subTab]);

  const [dashboardData, setDashboardData] = useState<StudentDashboardDto | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [availableTracks, setAvailableTracks] = useState<CollegeTrackDto[]>([]);
  const [tracksLoading, setTracksLoading] = useState(true);

  const refreshWorkspace = useCallback(async () => {
    try {
      const [data, tracks, roster] = await Promise.all([
        studentApi.getDashboard(),
        studentApi.getAvailableTracks().catch(() => [] as CollegeTrackDto[]),
        studentApi.getCurrentTeamRoster().catch(() => null),
      ]);
      if (data) setDashboardData(data);
      setAvailableTracks(tracks || []);
      if (roster) setTeamRoster(roster);
    } catch (err: unknown) {
      setDashboardError(err instanceof Error ? err.message : "Failed to refresh workspace");
    } finally {
      setDashboardLoading(false);
      setTracksLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace]);

  useDashboardHeader({
    title: "Workspace",
  });

  // New Task Modal & Selected Task for Details
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Team["tasks"][0] | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskTag, setTaskTag] = useState("Hardware");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskCreatedToast, setTaskCreatedToast] = useState(false);
  const [taskCreating, setTaskCreating] = useState(false);

  // Phase 6 Live Tasks & Progress
  const [liveTasks, setLiveTasks] = useState<SprintTaskDto[] | null>(null);
  const [liveProgress, setLiveProgress] = useState<ProjectProgressDto | null>(null);

  const fetchTasks = async () => {
    try {
      const [tasksData, progressData] = await Promise.all([
        studentApi.getWorkspaceTasks(),
        studentApi.getWorkspaceProgress()
      ]);
      if (tasksData) setLiveTasks(tasksData);
      if (progressData) setLiveProgress(progressData);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to refresh tasks", "error");
    }
  };

  useEffect(() => {
    let active = true;
    if (subTab === "tasks") {
      void studentApi.getWorkspaceTasks().then((t) => {
        if (active && t) setLiveTasks(t);
      }).catch(() => {});
      void studentApi.getWorkspaceProgress().then((p) => {
        if (active && p) setLiveProgress(p);
      }).catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [subTab]);

  // Weekly Log Form
  const [logAccomplishments, setLogAccomplishments] = useState("");
  const [logBlockers, setLogBlockers] = useState("");
  const [logNextWeek, setLogNextWeek] = useState("");
  const [logHours, setLogHours] = useState(14);
  const [logSuccess, setLogSuccess] = useState(false);

  // Pre-approval proposal form & lock confirmation modal
  const [proposalSubmitted, setProposalSubmitted] = useState(false);
  const [draftSavedToast, setDraftSavedToast] = useState(false);
  const [showLockConfirmModal, setShowLockConfirmModal] = useState(false);
  const [inviteUsn, setInviteUsn] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState("");

  // Phase 4: Team formation & invitation states
  const [teamRoster, setTeamRoster] = useState<StudentTeamRosterDto | null>(null);
  const [receivedInvitations, setReceivedInvitations] = useState<TeamInvitationDto[]>([]);
  const [sentInvitations, setSentInvitations] = useState<TeamInvitationDto[]>([]);
  const [eligiblePeers, setEligiblePeers] = useState<EligiblePeerDto[]>([]);
  const [peersLoading, setPeersLoading] = useState(false);
  const [showPeersModal, setShowPeersModal] = useState(false);
  const [peerSearchTerm, setPeerSearchTerm] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [showTransferLeadModal, setShowTransferLeadModal] = useState(false);
  const [selectedTransferUserId, setSelectedTransferUserId] = useState<string>("");
  const [transferLeadFeedback, setTransferLeadFeedback] = useState<string | null>(null);

  // Phase 5: Official Guide Allocation & Preference states
  const [guidePreference, setGuidePreference] = useState<StudentGuidePreferenceDto | null>(null);
  const [facultyGuides, setFacultyGuides] = useState<FacultyGuideSummaryDto[]>([]);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [selectedGuideId, setSelectedGuideId] = useState("");
  const [guideRemarks, setGuideRemarks] = useState("");
  const [isSubmittingGuide, setIsSubmittingGuide] = useState(false);
  const [guideFeedback, setGuideFeedback] = useState("");
  const [guideSearchTerm, setGuideSearchTerm] = useState("");

  const fetchGuidePreference = async () => {
    try {
      const pref = await studentApi.getGuidePreference();
      if (pref) setGuidePreference(pref);
    } catch { }
  };

  const fetchFacultyGuides = async () => {
    try {
      const guides = await studentApi.getFacultyGuides();
      if (guides) setFacultyGuides(guides);
    } catch { }
  };

  const handleSelectGuidePreference = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedGuideId) return;
    setIsSubmittingGuide(true);
    try {
      const updated = await studentApi.submitGuidePreference({
        guideUserId: selectedGuideId,
        remarks: guideRemarks.trim() || undefined,
      });
      setGuidePreference(updated);
      setGuideFeedback("Faculty guide preference submitted successfully. Awaiting formal institutional allocation.");
      setIsGuideModalOpen(false);
      fetchTeamRoster();
      fetchGuidePreference();
    } catch (err: unknown) {
      setGuideFeedback(err instanceof Error ? err.message : "Failed to submit guide preference.");
    } finally {
      setIsSubmittingGuide(false);
      setTimeout(() => setGuideFeedback(""), 6000);
    }
  };

  const fetchInvitations = async () => {
    try {
      const [received, sent] = await Promise.all([
        studentApi.getReceivedInvitations().catch(() => []),
        studentApi.getSentInvitations().catch(() => []),
      ]);
      setReceivedInvitations(received || []);
      setSentInvitations(sent || []);
    } catch { }
  };

  const fetchTeamRoster = async () => {
    try {
      const roster = await studentApi.getCurrentTeamRoster();
      if (roster) setTeamRoster(roster);
    } catch { }
  };

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

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      studentApi.getReceivedInvitations().catch(() => []),
      studentApi.getSentInvitations().catch(() => []),
      studentApi.getCurrentTeamRoster().catch(() => null),
      studentApi.getGuidePreference().catch(() => null),
      studentApi.getFacultyGuides().catch(() => []),
    ]).then(([received, sent, roster, guidePref, guides]) => {
      if (!isMounted) return;
      if (received) setReceivedInvitations(received);
      if (sent) setSentInvitations(sent);
      if (roster) setTeamRoster(roster);
      if (guidePref) setGuidePreference(guidePref);
      if (guides) setFacultyGuides(guides);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Repository & Jira modal
  const [showRepoModal, setShowRepoModal] = useState(false);
  const [repoSuccess, setRepoSuccess] = useState(false);

  // Document Vault Upload State
  const [uploadModalSlot, setUploadModalSlot] = useState<ArtifactSlot | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const [uploadToast, setUploadToast] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingArtifact, setIsUploadingArtifact] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadArtifact = async (art?: ProjectArtifact) => {
    if (!art?.id) {
      showToast("Deliverable file is not available for download.", "error");
      return;
    }
    try {
      const blob = await studentApi.downloadArtifactBlob(art.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = art.fileName || "deliverable.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast(`Downloaded ${art.fileName || "deliverable.pdf"}`);
    } catch (err) {
      console.error("Artifact download failed:", err);
      showToast(err instanceof Error ? err.message : "Download failed. Please try again.", "error");
    }
  };

  // Empty placeholder shape used only when no live active project exists
  const emptyTeamPlaceholder: Team = {
    id: "",
    collegeId: "",
    departmentId: "",
    cycleId: "",
    teamCode: "",
    title: "",
    abstract: "",
    domain: "",
    sdgNumber: 0,
    guideName: "",
    state: "Draft",
    githubUrl: "",
    jiraUrl: "",
    isRosterLocked: false,
    members: [],
    tasks: [],
    weeklyLogs: [],
    artifacts: [],
    health: "Healthy",
  };

  const liveTeam = useMemo(() => {
    if (dashboardData?.activeProject) {
      const ap = dashboardData.activeProject;
      return {
        id: ap.teamId,
        teamCode: ap.teamCode,
        title: ap.title,
        abstract: ap.abstract,
        domain: ap.domainTag || "IoT & Smart Systems",
        sdgNumber: ap.sdgGoal ? parseInt(ap.sdgGoal.replace(/\D/g, "") || "7", 10) : 7,
        guideName: ap.guideName || "Unassigned",
        state: ap.status === "ActiveBuild" || ap.status === "ReadyForViva"
          ? ("Active" as const)
          : ap.status === "Completed"
          ? ("Completed" as const)
          : ap.status === "Draft"
          ? ("Draft" as const)
          : ("UnderReview" as const),
        githubUrl: ap.githubRepoUrl || "",
        jiraUrl: "",
        isRosterLocked: ap.isRosterLocked,
        members: (ap.members || []).map((m) => ({
          id: m.userId,
          userId: m.userId,
          name: m.fullName,
          enrollmentNumber: m.enrollmentCode,
          isLead: m.isTeamLead,
          roleDescription: m.moduleResponsibility || (m.isTeamLead ? "Team Lead & Architecture" : "Contributor"),
        })),
        tasks: (ap.tasks || []).map((t) => ({
          id: t.id,
          teamId: ap.teamId,
          title: t.title,
          status: (t.status === "Done" ? "Done" : t.status === "InProgress" ? "InProgress" : "Todo") as TaskStatusType,
          assigneeName: t.assigneeName || "Team Member",
          assigneeId: t.assignedToUserId,
          tag: t.categoryTag || "Development",
          dueDate: t.dueDateUtc ? t.dueDateUtc.split("T")[0] : "2026-04-15",
        })),
        weeklyLogs: (ap.weeklyLogs || []).map((l) => ({
          id: l.id,
          teamId: ap.teamId,
          studentId: l.authorUserId,
          studentName: l.authorName,
          weekNumber: l.weekNumber,
          dateSubmitted: l.createdAtUtc ? l.createdAtUtc.split("T")[0] : "2026-03-01",
          accomplishments: l.accomplishmentsSummary,
          blockers: l.blockersSummary || "",
          plannedNextWeek: "",
          guideStatus: (l.isVerified ? "Approved" : "Pending") as GuideReviewStatusType,
          guideRemarks: l.mentorRemarks,
          hoursSpent: l.hoursLogged,
        })),
        artifacts: (ap.artifacts || []).map((a) => ({
          id: a.id,
          slot: (a.slotType === "Synopsis" || a.slotType === "MidTermPPT" || a.slotType === "PlagiarismReport" || a.slotType === "FinalThesis" ? a.slotType : "Synopsis") as ArtifactSlot,
          name: a.slotType,
          fileName: a.fileName,
          fileSize: a.fileSizeBytes ? `${Math.round(a.fileSizeBytes / 1024)} KB` : undefined,
          uploadedAt: a.uploadedAtUtc,
          storageKey: a.storageKey,
          sha256Checksum: a.sha256Checksum,
          reviewerNote: a.reviewerNote,
          status: (a.status === "Verified" ? "Approved" : a.status === "RevisionRequested" ? "NeedsRevision" : a.fileName ? "Uploaded" : "Pending") as "Pending" | "Uploaded" | "Approved" | "NeedsRevision",
          similarityScore: undefined,
        })),
        health: ap.missedLogStreak > 1 ? ("AtRisk" as const) : ("Healthy" as const),
      };
    }
    return null;
  }, [dashboardData]);

  const myTeam = liveTeam || emptyTeamPlaceholder;

  // Derive live lifecycle state directly from active team state, dashboardData, and academic cycle
  const lifecycleState: "offseason" | "preapproval" | "active" =
    dashboardData?.allocationState === "Offseason" || (!dashboardData && !cycle.isActive)
      ? "offseason"
      : myTeam.state === "Active" || myTeam.state === "Completed"
      ? "active"
      : "preapproval";

  // Proposal Title & Similarity Check
  const [proposalTitle, setProposalTitle] = useState(myTeam.title);

  useEffect(() => {
    if (myTeam.title && !proposalTitle) {
      setProposalTitle(myTeam.title);
    }
  }, [myTeam.title]);

  // Archived department project repository for title overlap checks
  const archivedProjects = [
    {
      title: "IoT Smart Energy Metering & Power Analysis for Institutional Labs (2024-CS-MAJ-08)",
      keywords: ["iot", "smart", "energy", "monitoring", "metering", "power", "campus", "labs"],
    },
    {
      title: "Campus Grid Anomaly Detection and Surge Prediction Engine (2025-CS-MAJ-02)",
      keywords: ["campus", "grid", "anomaly", "detection", "surge", "prediction", "energy"],
    },
    {
      title: "Automated Solar Microgrid with MPPT Tracking Firmware (2024-CS-MIN-04)",
      keywords: ["automated", "solar", "microgrid", "mppt", "tracking"],
    },
  ];

  const titleSimilarityMatch = React.useMemo(() => {
    if (!proposalTitle || proposalTitle.trim().length < 5) return null;
    const inputWords = proposalTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !["and", "for", "the", "with", "system"].includes(w));
    if (inputWords.length === 0) return null;

    let bestMatch: { title: string; score: number } | null = null;
    for (const arch of archivedProjects) {
      const matching = inputWords.filter((w) => arch.keywords.includes(w));
      const score = Math.min(
        95,
        Math.round((matching.length / Math.max(inputWords.length, 3)) * 100)
      );
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { title: arch.title, score };
      }
    }
    return bestMatch && bestMatch.score >= 65 ? bestMatch : null;
  }, [proposalTitle]);

  const isRosterLocked = Boolean(teamRoster?.isRosterLocked || myTeam.isRosterLocked || proposalSubmitted);
  const currentUserId = dashboardData?.identity?.userId || currentPersona.id;
  const rosterMembers =
    teamRoster?.members && teamRoster.members.length > 0
      ? teamRoster.members.map((m) => ({
          id: m.userId,
          userId: m.userId,
          name: m.fullName,
          enrollmentNumber: m.enrollmentCode,
          isLead: m.isTeamLead,
          roleDescription: m.moduleResponsibility || (m.isTeamLead ? "Team Lead & Architecture" : "Contributor"),
        }))
      : myTeam.members;

  const isTeamLead =
    teamRoster
      ? Boolean(teamRoster.isCallerLead)
      : currentPersona.role === "TeamLead" ||
        rosterMembers.some((m) => m.isLead && (m.name === currentPersona.name || m.userId === currentUserId));
  const isSoloTrack = cycle.participationMode === "Individual" || (teamRoster ? teamRoster.maxTeamSize === 1 : myTeam.members.length === 1);

  const [githubUrl, setGithubUrl] = useState(myTeam.githubUrl || "https://github.com/sistec-cse/iot-energy-monitor");
  const [jiraUrl, setJiraUrl] = useState(myTeam.jiraUrl || "https://sistec-cse.atlassian.net/jira/projects/IOT");

  const handleOpenRepoModal = () => {
    setGithubUrl(myTeam.githubUrl || "https://github.com/sistec-cse/iot-energy-monitor");
    setJiraUrl(myTeam.jiraUrl || "https://sistec-cse.atlassian.net/jira/projects/IOT");
    setShowRepoModal(true);
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim() || taskTitle.trim().length < 3) {
      showToast("Task title must be at least 3 characters", "error");
      return;
    }
    setTaskCreating(true);
    try {
      const selectedMember = rosterMembers.find((m) => m.userId === taskAssigneeId || m.name === taskAssignee);
      await studentApi.createWorkspaceTask({
        title: taskTitle.trim(),
        categoryTag: taskTag,
        assignedToUserId: selectedMember?.userId || undefined,
        dueDateUtc: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
      });
      createTask(myTeam.id, taskTitle.trim(), taskTag, selectedMember?.name || taskAssignee, taskDueDate);
      setShowTaskModal(false);
      setTaskTitle("");
      setTaskCreatedToast(true);
      setTimeout(() => setTaskCreatedToast(false), 3500);
      showToast("Task created successfully", "success");
      await fetchTasks();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to create task", "error");
    } finally {
      setTaskCreating(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: SprintTaskStatus) => {
    try {
      await studentApi.updateTaskStatus(taskId, { status: newStatus });
      await fetchTasks();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to update task status", "error");
    }
  };

  const handleCreateMilestone = async () => {
    if (!milestoneTitle.trim() || !milestoneDesc.trim() || !milestoneDate) {
      showToast("Please fill all required milestone fields.", "error");
      return;
    }
    setMilestoneSubmitting(true);
    try {
      await studentApi.createWorkspaceMilestone({
        title: milestoneTitle.trim(),
        description: milestoneDesc.trim(),
        targetDateUtc: new Date(milestoneDate).toISOString(),
        requiredTaskCompletionPercentage: milestoneTaskPct,
      });
      showToast("Milestone created successfully.", "success");
      setShowMilestoneModal(false);
      setMilestoneTitle("");
      setMilestoneDesc("");
      setMilestoneDate("");
      setMilestoneTaskPct(0);
      await fetchMilestones();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to create milestone.", "error");
    } finally {
      setMilestoneSubmitting(false);
    }
  };

  const handleSubmitMilestone = async () => {
    if (!selectedMilestoneForSubmit || !submissionEvidenceUrl.trim()) {
      showToast("Please provide submission evidence URL or notes.", "error");
      return;
    }
    setMilestoneSubmitting(true);
    try {
      await studentApi.submitWorkspaceMilestone(selectedMilestoneForSubmit.id, {
        submissionEvidenceUrl: submissionEvidenceUrl.trim(),
        submissionNotes: submissionNotes.trim() || undefined,
      });
      showToast("Milestone submitted to official faculty guide for review.", "success");
      setShowSubmitMilestoneModal(false);
      setSelectedMilestoneForSubmit(null);
      setSubmissionEvidenceUrl("");
      setSubmissionNotes("");
      await fetchMilestones();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Submission failed.", "error");
    } finally {
      setMilestoneSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await studentApi.deleteWorkspaceTask(taskId);
      showToast("Task deleted successfully", "success");
      await fetchTasks();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to delete task", "error");
    }
  };

  const displayedTasks = liveTasks && liveTasks.length > 0
    ? liveTasks.map((t) => ({
        id: t.id,
        teamId: t.projectTeamId || myTeam.id,
        title: t.title,
        status: (t.status === "Done" ? "Done" : t.status === "InProgress" ? "InProgress" : "Todo") as TaskStatusType,
        assigneeName: t.assigneeName || "Team Member",
        assigneeId: t.assignedToUserId,
        tag: t.categoryTag || "Development",
        dueDate: t.dueDateUtc ? t.dueDateUtc.split("T")[0] : "No date",
        isOverdue: Boolean(t.isOverdue),
      }))
    : myTeam.tasks.map((t) => ({
        ...t,
        isOverdue: false,
      }));

  const totalTaskCount = liveProgress?.totalTasks ?? displayedTasks.length;
  const completedCount = liveProgress?.completedTasks ?? displayedTasks.filter((t) => t.status === "Done").length;
  const inProgressCount = liveProgress?.inProgressTasks ?? displayedTasks.filter((t) => t.status === "InProgress").length;
  const completionPercentage = liveProgress?.completionPercentage ?? (totalTaskCount > 0 ? Math.round((completedCount / totalTaskCount) * 100) : 0);

  const handleSubmitLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logAccomplishments) return;
    submitWeeklyLog(myTeam.id, logAccomplishments, logBlockers, logNextWeek, logHours);
    setLogSuccess(true);
    setLogAccomplishments("");
    setLogBlockers("");
    setLogNextWeek("");
    setTimeout(() => setLogSuccess(false), 3000);
  };

  const handleLockAndSubmitProposal = () => {
    approveProposal(myTeam.id, "Faculty");
    setProposalSubmitted(true);
    setTimeout(() => setProposalSubmitted(false), 3000);
  };

  const handleSendInvite = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inviteUsn.trim()) return;
    setIsSendingInvite(true);
    try {
      await studentApi.sendTeamInvitation({ enrollmentCode: inviteUsn.trim() });
      setInviteFeedback(`Invitation successfully dispatched to USN ${inviteUsn.trim().toUpperCase()}.`);
      setInviteUsn("");
      fetchInvitations();
      fetchTeamRoster();
    } catch (err: unknown) {
      setInviteFeedback(err instanceof Error ? err.message : "Failed to dispatch invitation");
    } finally {
      setIsSendingInvite(false);
      setTimeout(() => setInviteFeedback(""), 5000);
    }
  };

  const handleInvitePeer = async (peer: EligiblePeerDto) => {
    setIsSendingInvite(true);
    try {
      await studentApi.sendTeamInvitation({ inviteeStudentId: peer.studentId });
      setInviteFeedback(`Invitation successfully dispatched to ${peer.fullName} (${peer.enrollmentCode}).`);
      fetchEligiblePeers(peerSearchTerm);
      fetchInvitations();
      fetchTeamRoster();
    } catch (err: unknown) {
      setInviteFeedback(err instanceof Error ? err.message : "Failed to invite peer");
    } finally {
      setIsSendingInvite(false);
      setTimeout(() => setInviteFeedback(""), 5000);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await studentApi.acceptInvitation(invitationId);
      window.location.reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to accept invitation");
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      await studentApi.rejectInvitation(invitationId);
      fetchInvitations();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to decline invitation");
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await studentApi.cancelInvitation(invitationId);
      fetchInvitations();
      fetchTeamRoster();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to cancel invitation");
    }
  };

  const handleTransferLeadership = async () => {
    if (!selectedTransferUserId) return;
    try {
      await studentApi.transferLeadership({ targetStudentId: selectedTransferUserId });
      setShowTransferLeadModal(false);
      fetchTeamRoster();
      window.location.reload();
    } catch (err: unknown) {
      setTransferLeadFeedback(err instanceof Error ? err.message : "Failed to transfer leadership");
    }
  };

  const handleLeaveTeam = async () => {
    if (!confirm("Are you sure you want to voluntarily leave this project team?")) return;
    try {
      await studentApi.leaveTeam();
      window.location.reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to leave team");
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) return;
    try {
      await studentApi.removeMember(memberId);
      fetchTeamRoster();
      window.location.reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleSaveRepoSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateTeamRepo(myTeam.id, githubUrl, jiraUrl);
    setShowRepoModal(false);
    setRepoSuccess(true);
    setTimeout(() => setRepoSuccess(false), 3500);
  };

  if (dashboardLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-100 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-100 rounded-xl md:col-span-2" />
          <div className="h-64 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  const hasNoActiveProject =
    !dashboardData ||
    dashboardData.allocationState === "NoActiveEnrollment" ||
    dashboardData.allocationState === "Unallocated" ||
    dashboardData.allocationState === "Offseason" ||
    lifecycleState === "offseason";

  return (
    <div className="space-y-6">
      {/* Semester GPS Stepper (only shown once student has an active/draft project) */}
      {!hasNoActiveProject && (
        <StepperGPS
          currentStep={lifecycleState === "preapproval" ? 2 : 4}
        />
      )}

      {repoSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Repository &amp; Jira tracking endpoints saved to team project configuration.</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NO ACTIVE PROJECT / PROJECT WINDOW & EXPLORE TEAMS                        */}
      {/* ========================================================================= */}
      {hasNoActiveProject &&
        (dashboardData?.allocationState !== "Unallocated" || (!tracksLoading && availableTracks.length === 0)) && (
          <Card className="p-10 text-center">
            <p className="text-sm font-medium text-slate-600">No active project window</p>
          </Card>
        )}

      {dashboardData?.allocationState === "Unallocated" && availableTracks.length > 0 && (
        <StudentTeamFormationPanel
          availableTracks={availableTracks}
          tracksLoading={tracksLoading}
          onTeamCreated={refreshWorkspace}
        />
      )}

      {/* Incoming invitations (only shown if student actually has pending invitations) */}
      {dashboardData?.allocationState === "Unallocated" && receivedInvitations.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-brand-primary" />
              <CardTitle className="text-base">Incoming Team Invitations</CardTitle>
            </div>
            <Badge variant="warning" size="sm">
              {receivedInvitations.length} Pending
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {receivedInvitations.map((inv) => (
              <div key={inv.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{inv.projectTitle || "Project Formulation"}</span>
                    <span className="font-mono text-xs text-slate-500 font-medium">({inv.teamCode})</span>
                    <Badge variant="warning" size="sm">Pending Invitation</Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    {inv.message || `You were invited to join project team ${inv.teamCode}.`}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Invited by: <strong className="text-slate-700">{inv.inviterName}</strong>
                    {inv.expiresAtUtc ? ` • Expires: ${new Date(inv.expiresAtUtc).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="secondary" onClick={() => handleRejectInvitation(inv.id)}>
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleAcceptInvitation(inv.id)}
                    leftIcon={<UserCheck className="h-3.5 w-3.5" />}
                  >
                    Accept Invitation
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* STATE 2: PRE-APPROVAL SETUP                                               */}
      {/* ========================================================================= */}
      {(!dashboardData ||
        (dashboardData.allocationState !== "Unallocated" &&
          dashboardData.allocationState !== "Offseason" &&
          dashboardData.allocationState !== "NoActiveEnrollment")) &&
        (lifecycleState === "preapproval" || myTeam.state === "UnderReview" || myTeam.state === "Draft") && (
        <div className="space-y-6">
          {dashboardData?.activeProject && dashboardData.activeProject.status.startsWith("Pending") && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-900">
                  Project Proposal Under Institutional Review ({dashboardData.activeProject.status})
                </h4>
                <p className="text-xs text-amber-700">
                  Your proposal &ldquo;{dashboardData.activeProject.title}&rdquo; is awaiting formal review
                  {dashboardData.activeProject.guideName ? ` by ${dashboardData.activeProject.guideName}` : ""}.
                  Once approved by your guide and HOD, your sprint workspace will activate.
                </p>
              </div>
            </div>
          )}
          {inviteFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{inviteFeedback}</span>
            </div>
          )}

          {/* Team Publishing & Join Requests (Draft -> Published -> Team Formation) */}
          {!isSoloTrack && teamRoster && teamRoster.status === "Draft" && (
            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {teamRoster.teamName || teamRoster.title}
                      </span>
                      <Badge variant={teamRoster.isPublished ? "success" : "neutral"} size="sm">
                        {teamRoster.isPublished ? "Published • Open for Join Requests" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      {teamRoster.isPublished
                        ? "Eligible students in your project window can discover your team in Explore Teams and send join requests."
                        : "Review your team details and publish when you are ready for eligible students to discover and request to join."}
                    </p>
                  </div>

                  {isTeamLead && !teamRoster.isPublished && !isRosterLocked && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={async () => {
                        try {
                          const updated = await studentApi.publishCurrentTeam();
                          setTeamRoster(updated);
                          setInviteFeedback("Team published! Eligible students can now discover and request to join.");
                        } catch (err: unknown) {
                          setInviteFeedback(err instanceof Error ? err.message : "Failed to publish team.");
                        }
                      }}
                    >
                      Publish Team
                    </Button>
                  )}
                </div>

                {isTeamLead && (teamRoster.incomingJoinRequests?.length ?? 0) > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-2.5">
                    <div className="text-xs font-semibold text-slate-800">
                      Incoming Join Requests ({teamRoster.incomingJoinRequests!.length})
                    </div>
                    <div className="space-y-2">
                      {teamRoster.incomingJoinRequests!.map((req) => (
                        <div
                          key={req.id}
                          className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-900">
                                {req.studentName}
                              </span>
                              <span className="text-[11px] font-mono text-slate-500">
                                {req.studentUsn}
                              </span>
                              <Badge variant="info" size="sm">
                                Role: {req.desiredRole}
                              </Badge>
                            </div>
                            {req.studentSkills.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {req.studentSkills.map((sk) => (
                                  <span
                                    key={sk}
                                    className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-600"
                                  >
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            )}
                            {req.message && (
                              <p className="text-[11px] text-slate-600">{req.message}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={async () => {
                                try {
                                  const updated = await studentApi.rejectJoinRequest(req.id);
                                  setTeamRoster(updated);
                                  setInviteFeedback(`Declined join request from ${req.studentName}.`);
                                } catch (err: unknown) {
                                  setInviteFeedback(err instanceof Error ? err.message : "Failed to reject request.");
                                }
                              }}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={async () => {
                                try {
                                  const updated = await studentApi.acceptJoinRequest(req.id);
                                  setTeamRoster(updated);
                                  setInviteFeedback(`${req.studentName} joined the team as ${req.desiredRole}!`);
                                } catch (err: unknown) {
                                  setInviteFeedback(err instanceof Error ? err.message : "Failed to accept request.");
                                }
                              }}
                            >
                              Accept
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Team Roster & Invitations */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>
                    {isSoloTrack ? "Solo Project Workspace" : `Team Formation Roster (${rosterMembers.length}/${teamRoster?.maxTeamSize || 4} Members)`}
                  </CardTitle>
                  <CardDescription>
                    {isSoloTrack
                      ? "Operating in Individual Participation Mode. Solo workspace pre-allocated."
                      : isRosterLocked
                      ? "Team roster is permanently locked for academic review."
                      : isTeamLead
                      ? "As Team Lead, invite peers and lock roster when proposal is submitted."
                      : "Only the Team Lead can modify roster agreements."}
                  </CardDescription>
                </div>
                <Badge
                  variant={isSoloTrack ? "success" : isRosterLocked ? "neutral" : "warning"}
                  size="sm"
                  dot={isSoloTrack}
                >
                  {isSoloTrack ? "Solo Mode • Ready" : isRosterLocked ? "Roster Locked" : `Roster Unlocked (${rosterMembers.length}/${teamRoster?.maxTeamSize || 4})`}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {isRosterLocked && (
                  <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl flex items-center gap-2.5 text-xs text-slate-700">
                    <Lock className="h-4 w-4 text-slate-500 shrink-0" />
                    <span>Team roster is locked for academic review. Teammate invitations, removals, leadership transfers, and member exits are disabled.</span>
                  </div>
                )}

                <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl bg-[#F8FAFC]">
                  {rosterMembers.map((m) => (
                    <div key={m.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                          <span>{m.name}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              m.isLead
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                : "text-slate-600 bg-slate-100 border-slate-200"
                            }`}
                          >
                            {isSoloTrack ? "Solo Author" : m.isLead ? "Lead" : "Member"}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#64748B]">{m.roleDescription}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-[#475569]">{m.enrollmentNumber}</span>
                        {!isRosterLocked && !isSoloTrack && (
                          <>
                            {isTeamLead && !m.isLead && (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-[10px] text-indigo-600 hover:text-indigo-800 h-6 px-1.5"
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
                                  className="text-[10px] text-red-600 hover:text-red-800 h-6 px-1.5"
                                  onClick={() => handleRemoveMember(m.id, m.name)}
                                >
                                  Remove
                                </Button>
                              </div>
                            )}
                            {!isTeamLead && (m.userId === currentUserId || m.name === currentPersona.name) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-[10px] text-red-600 hover:text-red-800 h-6 px-1.5"
                                onClick={handleLeaveTeam}
                              >
                                Leave Team
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {isSoloTrack ? (
                  <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Teammate invitation omitted. You are registered in solo participation mode. Proceed with defining your project proposal.</span>
                  </div>
                ) : !isRosterLocked ? (
                  isTeamLead ? (
                    <div className="space-y-3 pt-1">
                      {rosterMembers.length >= (teamRoster?.maxTeamSize || 4) ? (
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                          <Users2 className="h-4 w-4 text-amber-600 shrink-0" />
                          <span>Team roster has reached maximum capacity of {teamRoster?.maxTeamSize || 4} members.</span>
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
                          <div className="flex justify-between items-center pt-1">
                            <span className="text-[11px] text-slate-500">
                              Looking for eligible department peers?
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-brand-primary font-medium hover:underline flex items-center gap-1"
                              onClick={() => {
                                fetchEligiblePeers();
                                setShowPeersModal(true);
                              }}
                            >
                              <Compass className="h-3.5 w-3.5" />
                              Discover Classmates
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Pending Sent Invitations */}
                      {sentInvitations.length > 0 && (
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                            <span>Pending Sent Invitations ({sentInvitations.length})</span>
                          </div>
                          <div className="space-y-2">
                            {sentInvitations.map((inv) => (
                              <div key={inv.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-semibold text-slate-800">{inv.inviteeName}</span>
                                  <span className="font-mono text-[11px] text-slate-500 ml-1.5">({inv.inviteeEnrollmentCode})</span>
                                  <span className="text-[10px] text-slate-400 block">Sent {new Date(inv.invitedAtUtc).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="warning" size="sm">Pending</Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-[10px] text-red-600 hover:text-red-800 h-6 px-1.5"
                                    onClick={() => handleCancelInvitation(inv.id)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#64748B] italic">
                      Contact your Team Lead ({rosterMembers.find((m) => m.isLead)?.name || "Lead"}) to invite teammates.
                    </p>
                  )
                ) : null}
              </CardContent>
            </Card>

            {/* Phase 5: Official Faculty Guide & Preference Allocation */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <span>Faculty Guide Allocation</span>
                  </CardTitle>
                  <CardDescription>
                    Student team preferred guide selection and formal institutional allocation.
                  </CardDescription>
                </div>
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
                  dot
                >
                  {guidePreference?.isOfficialGuideAssigned
                    ? "Officially Allocated"
                    : guidePreference?.guidePreferenceStatus === "Requested"
                    ? "Preference Submitted — Pending Allocation"
                    : guidePreference?.guidePreferenceStatus === "Rejected"
                    ? "Guide Request Rejected"
                    : "No Preference Submitted"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {guideFeedback && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>{guideFeedback}</span>
                  </div>
                )}

                {/* Rejection Alert Banner if applicable */}
                {guidePreference?.guidePreferenceStatus === "Rejected" && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-950 font-heading">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>Guide Request Returned / Rejected by Coordinator</span>
                    </div>
                    <p className="text-[11px] text-rose-800 leading-relaxed">
                      <strong>Remarks:</strong> {guidePreference.guideAllocationRemarks || "Please select another eligible faculty mentor for your project."}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Preferred Guide Section */}
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Student Team Preference</span>
                      <Badge variant={guidePreference?.preferredGuideUserId ? "info" : "neutral"} size="sm">
                        {guidePreference?.preferredGuideUserId ? "Requested" : "Unset"}
                      </Badge>
                    </div>
                    {guidePreference?.preferredGuideName ? (
                      <div className="space-y-1">
                        <div className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5 text-primary" />
                          <span>{guidePreference.preferredGuideName}</span>
                        </div>
                        <div className="text-xs text-slate-600">
                          {guidePreference.preferredGuideDesignation || "Faculty Mentor"} • Dept of {guidePreference.preferredGuideDepartmentCode || "CSE"}
                        </div>
                        {guidePreference.preferredGuideSkills && (
                          <div className="text-[11px] text-slate-500 pt-1">
                            <span className="font-medium text-slate-700">Expertise:</span> {guidePreference.preferredGuideSkills}
                          </div>
                        )}
                        {guidePreference.guidePreferenceRemarks && (
                          <div className="text-[11px] text-slate-500 italic pt-0.5">
                            &ldquo;{guidePreference.guidePreferenceRemarks}&rdquo;
                          </div>
                        )}
                        {guidePreference.guidePreferenceSubmittedAtUtc && (
                          <div className="text-[10px] text-slate-400 pt-1">
                            Submitted on {new Date(guidePreference.guidePreferenceSubmittedAtUtc).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic py-1">
                        No faculty guide preference has been submitted by the team lead yet.
                      </p>
                    )}
                  </div>

                  {/* Officially Allocated Guide Section */}
                  <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Officially Allocated Guide</span>
                      <Badge variant={guidePreference?.isOfficialGuideAssigned ? "success" : "neutral"} size="sm">
                        {guidePreference?.isOfficialGuideAssigned ? "Department Confirmed" : "Pending Action"}
                      </Badge>
                    </div>
                    {guidePreference?.officiallyAllocatedGuideName ? (
                      <div className="space-y-1">
                        <div className="font-semibold text-sm text-emerald-950 flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          <span>{guidePreference.officiallyAllocatedGuideName}</span>
                        </div>
                        <div className="text-xs text-emerald-800">
                          {guidePreference.officiallyAllocatedGuideDesignation || "Official Guide"} • Dept of {guidePreference.officiallyAllocatedGuideDepartmentCode || "CSE"}
                        </div>
                        {guidePreference.guideAllocatedByName && (
                          <div className="text-[11px] text-emerald-700 pt-1">
                            <span className="font-medium">Allocated by:</span> {guidePreference.guideAllocatedByName}
                          </div>
                        )}
                        {guidePreference.guideAllocationRemarks && (
                          <div className="text-[11px] text-emerald-800 pt-0.5">
                            <span className="font-medium">Institutional Remarks:</span> {guidePreference.guideAllocationRemarks}
                          </div>
                        )}
                        {guidePreference.guideAllocatedAtUtc && (
                          <div className="text-[10px] text-emerald-600 pt-0.5">
                            Confirmed on {new Date(guidePreference.guideAllocatedAtUtc).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic py-1">
                        Official guide allocation is pending review by the Department Coordinator / HOD office.
                      </p>
                    )}
                  </div>
                </div>

                {/* Reassignment History Timeline if available */}
                {guidePreference?.reassignmentHistory && guidePreference.reassignmentHistory.length > 0 && (
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <History className="h-3.5 w-3.5 text-slate-500" />
                      <span>Official Guide Reassignment Audit History</span>
                    </div>
                    <div className="divide-y divide-slate-200">
                      {guidePreference.reassignmentHistory.map((item) => (
                        <div key={item.id} className="py-2 text-xs space-y-0.5">
                          <div className="flex items-center justify-between text-slate-800">
                            <span>
                              <span className="text-slate-500">{item.previousGuideName || "Unassigned"}</span> &rarr;{" "}
                              <strong className="text-slate-900">{item.newGuideName}</strong>
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(item.approvedAtUtc).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Reason: &ldquo;{item.reason}&rdquo; • Approved by: {item.approvedByName}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team Lead Actions */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    {guidePreference?.isOfficialGuideAssigned ? (
                      <span className="text-emerald-700 font-medium">Official guide is permanently allocated. Reassignment requires institutional HOD override.</span>
                    ) : isTeamLead ? (
                      <span>As Team Lead, you can select or update your preferred faculty mentor before official allocation.</span>
                    ) : (
                      <span className="italic">Only the Team Lead can submit guide preferences.</span>
                    )}
                  </div>
                  {isTeamLead && !guidePreference?.isOfficialGuideAssigned && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        fetchFacultyGuides();
                        setIsGuideModalOpen(true);
                      }}
                    >
                      {guidePreference?.preferredGuideUserId ? "Change Preferred Guide" : "Select Preferred Guide"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Proposal Synopsis & SDG Mapping */}
            <Card>
              <CardHeader>
                <CardTitle>Project Proposal &amp; UN SDG Mapping</CardTitle>
                <CardDescription>
                  Define problem formulation and link primary sustainable development goal.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <div className="space-y-1.5">
                  <Input
                    label="Project Title"
                    value={proposalTitle}
                    onChange={(e) => setProposalTitle(e.target.value)}
                  />
                  {titleSimilarityMatch && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 space-y-1 animate-in fade-in duration-150">
                      <div className="flex items-center gap-1.5 font-bold text-amber-950 font-heading">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>Advisory: {titleSimilarityMatch.score}% keyword overlap with archived project</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Similar to: <strong className="font-semibold">&ldquo;{titleSimilarityMatch.title}&rdquo;</strong>.
                        This advisory is non-blocking, but your Faculty Guide recommends highlighting novel edge LSTM regression to distinguish your implementation from archived projects.
                      </p>
                    </div>
                  )}
                </div>
                <Textarea
                  label="Problem Abstract & Technical Approach"
                  defaultValue={myTeam.abstract}
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Domain" defaultValue={myTeam.domain} />
                  <Input label="UN SDG Number" defaultValue="SDG 7 (Clean Energy)" />
                </div>

                {isTeamLead && (
                  <div className="space-y-2 pt-1">
                    {draftSavedToast && (
                      <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5 animate-in fade-in duration-150">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Proposal draft saved locally. Complete when ready.</span>
                      </div>
                    )}
                    <div className="flex gap-2.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        type="button"
                        onClick={() => {
                          setDraftSavedToast(true);
                          setTimeout(() => setDraftSavedToast(false), 3000);
                        }}
                        className="flex-1"
                      >
                        Save Proposal Draft
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setShowLockConfirmModal(true)}
                        className="flex-1"
                        leftIcon={<Lock className="h-3.5 w-3.5" />}
                      >
                        {proposalSubmitted ? "Submitted to Guide!" : "Lock Roster & Submit to Guide"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 3-Tier Approval Tracker Card */}
          <Card>
            <CardHeader>
              <CardTitle>3-Tier Approval Workflow Tracker</CardTitle>
              <CardDescription>
                Proposals must be endorsed by the designated Guide, verified by the Coordinator, and signed by HOD.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800">Tier 1: Guide Endorsement</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-[11px] text-[#475569]">Prof. S. K. Verma endorsed proposal</span>
                </div>

                <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-800">Tier 2: Coordinator Check</span>
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-[11px] text-[#475569]">Batched into Master Allotment</span>
                </div>

                <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-800">Tier 3: HOD Sign-Off</span>
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <span className="text-[11px] text-[#475569]">Awaiting batch signature</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATE 3: POST-APPROVAL ACTIVE WORKSPACE                                    */}
      {/* ========================================================================= */}
      {(!dashboardData ||
        (dashboardData.allocationState !== "Unallocated" &&
          dashboardData.allocationState !== "Offseason" &&
          dashboardData.allocationState !== "NoActiveEnrollment")) &&
        lifecycleState === "active" && (
        <div className="space-y-6">
          {/* Phase 10: Formally Closed & Archived Banner */}
          {(dashboardData?.activeProject?.status === "Archived" || dashboardData?.activeProject?.status === "Completed") && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Award className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-emerald-950 font-heading">
                      Project Formally Closed &amp; Sealed
                    </h4>
                    <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded">
                      Archived Record
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                    This project lifecycle has been formally closed and verified by Department Leadership. Immutable academic records and cryptographic certificates have been generated.
                  </p>
                </div>
              </div>
              <Link href="/student/portfolio">
                <Button size="sm" variant="primary" className="shrink-0 bg-emerald-700 hover:bg-emerald-800 border-emerald-700 text-white">
                  View Verified Portfolio &rarr;
                </Button>
              </Link>
            </div>
          )}

          {/* Active Workspace 5 Clean Sub-Tabs */}
          <div className="flex border-b border-[#E2E8F0] gap-4 text-xs font-semibold select-none overflow-x-auto">
            <button
              type="button"
              onClick={() => setSubTab("tasks")}
              className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                subTab === "tasks"
                  ? "border-b-2 border-brand-primary text-brand-primary"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <Kanban className="h-4 w-4" strokeWidth={1.75} />
              <span>Sprint Tasks</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab("milestones")}
              className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                subTab === "milestones"
                  ? "border-b-2 border-brand-primary text-brand-primary"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <Target className="h-4 w-4" strokeWidth={1.75} />
              <span>Milestones</span>
              {liveMilestones.length > 0 && (
                <span className="ml-1 text-[10px] tabular-nums font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700">
                  {liveMilestones.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSubTab("logs")}
              className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                subTab === "logs"
                  ? "border-b-2 border-brand-primary text-brand-primary"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <FileCheck2 className="h-4 w-4" strokeWidth={1.75} />
              <span>Weekly Logbook</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab("vault")}
              className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                subTab === "vault"
                  ? "border-b-2 border-brand-primary text-brand-primary"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
              <span>Capstone Vault</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab("final-submission")}
              className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                subTab === "final-submission"
                  ? "border-b-2 border-brand-primary text-brand-primary"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <FileCheck2 className="h-4 w-4" strokeWidth={1.75} />
              <span>Final Submission</span>
              {submissionData && (
                <span className={`ml-1 text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                  submissionData.status === 'Accepted'
                    ? 'bg-emerald-100 text-emerald-800'
                    : submissionData.status === 'RevisionRequested'
                    ? 'bg-amber-100 text-amber-800'
                    : submissionData.status === 'Submitted' || submissionData.status === 'Resubmitted'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {submissionData.status}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSubTab("evaluations")}
              className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                subTab === "evaluations"
                  ? "border-b-2 border-brand-primary text-brand-primary"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
              <span>Evaluations &amp; Defense</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab("roster")}
              className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                subTab === "roster"
                  ? "border-b-2 border-brand-primary text-brand-primary"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <Users2 className="h-4 w-4" strokeWidth={1.75} />
              <span>Team Roster &amp; Settings</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* SUB-TAB 1: SPRINT TASKS (KANBAN)                                          */}
          {/* ========================================================================= */}
          {subTab === "tasks" && (
            <div className="space-y-4">
              {taskCreatedToast && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Sprint task added to Kanban board successfully.</span>
                </div>
              )}

              {/* Progress Metric Banner */}
              <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0F172A]">Sprint Progress</span>
                    <Badge variant={completionPercentage >= 100 ? "success" : completionPercentage > 50 ? "info" : "neutral"}>
                      {completionPercentage}% Complete
                    </Badge>
                  </div>
                  <p className="text-xs text-[#64748B]">
                    {completedCount} of {totalTaskCount} tasks completed • {inProgressCount} in progress
                  </p>
                </div>
                <div className="w-full sm:w-64 bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                  <div
                    className="bg-brand-primary h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, completionPercentage)}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Sprint Tasks &amp; Milestones</h3>
                  <p className="text-xs text-[#64748B]">Click any task to inspect details. Update progress via the status pill.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    onClick={() => setShowTaskModal(true)}
                    disabled={!isTeamLead}
                    title={isTeamLead ? "Create new task" : "Only Team Lead is authorized to create tasks"}
                  >
                    + New Task
                  </Button>
                </div>
              </div>

              {/* 3 Kanban Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["Todo", "InProgress", "Done"] as TaskStatusType[]).map((columnStatus) => {
                  const tasksInCol = displayedTasks.filter((t) => t.status === columnStatus);

                  return (
                    <div
                      key={columnStatus}
                      className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-3"
                    >
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-[#0F172A]">
                          {columnStatus === "InProgress" ? "In Progress" : columnStatus}
                        </span>
                        <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-[#CBD5E1] text-[#475569] tabular-nums">
                          {tasksInCol.length}
                        </span>
                      </div>

                      <div className="space-y-2.5 min-h-[220px]">
                        {tasksInCol.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTaskForDetails(task)}
                            className="p-3 bg-white rounded-lg border border-[#E2E8F0] shadow-2xs hover:border-brand-primary transition-all cursor-pointer space-y-2 group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-brand-primary bg-brand-primary-tint px-1.5 py-0.2 rounded border border-brand-primary-border">
                                {task.tag}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {task.isOverdue && (
                                  <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1 py-0.5 rounded">
                                    Overdue
                                  </span>
                                )}
                                <span className="text-[10px] text-[#94A3B8] tabular-nums">
                                  Due {task.dueDate}
                                </span>
                              </div>
                            </div>
                            <h4 className="text-xs font-semibold text-[#0F172A] leading-snug group-hover:text-brand-primary transition-colors">
                              {task.title}
                            </h4>
                            <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1 border-t border-[#E2E8F0]">
                              <span className="truncate max-w-[120px]">{task.assigneeName}</span>
                              <div className="flex items-center gap-1">
                                <select
                                  value={task.status}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleUpdateTaskStatus(task.id, e.target.value as SprintTaskStatus);
                                  }}
                                  className="text-[10px] font-semibold rounded px-1.5 py-0.5 border border-slate-200 bg-slate-50 text-slate-700 hover:border-brand-primary cursor-pointer focus:outline-hidden"
                                >
                                  <option value="Todo">Todo</option>
                                  <option value="InProgress">In Progress</option>
                                  <option value="Done">Done</option>
                                </select>
                                {isTeamLead && task.status !== "Done" && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTask(task.id);
                                    }}
                                    className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded"
                                    title="Delete task"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {tasksInCol.length === 0 && (
                          <div className="h-28 flex items-center justify-center text-[11px] text-[#94A3B8] border border-dashed border-[#CBD5E1] rounded-lg">
                            No {columnStatus === "InProgress" ? "in-progress" : columnStatus.toLowerCase()} tasks
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB: PROJECT MILESTONES & SUPERVISION REVIEWS (PHASE 7)               */}
          {/* ========================================================================= */}
          {subTab === "milestones" && (
            <div className="space-y-6">
              {/* Header with Title and Create Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Target className="h-5 w-5 text-brand-primary" />
                    <span>Project Milestones &amp; Faculty Reviews</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Track sprint checkpoints, task gates, and official faculty guide evaluations.
                  </p>
                </div>
                {isTeamLead && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setShowMilestoneModal(true)}
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                  >
                    + Create Milestone
                  </Button>
                )}
              </div>

              {/* Guide Allocation Notice */}
              {myTeam.guideName ? (
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>Official Faculty Guide: <strong>{myTeam.guideName}</strong></span>
                  </div>
                  <Badge variant="success" size="sm">Official Mentor Assigned</Badge>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Faculty guide has not been officially allocated yet. Submissions will open upon institutional allocation.</span>
                  </div>
                  <Badge variant="warning" size="sm">Allocation Pending</Badge>
                </div>
              )}

              {/* Milestones List */}
              {milestonesLoading ? (
                <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
                  <span>Loading milestones...</span>
                </div>
              ) : liveMilestones.length === 0 ? (
                <EmptyState
                  title="No Milestones Created"
                  description={isTeamLead
                    ? "Your team has not defined any project milestones yet. Click '+ Create Milestone' to set up key execution milestones."
                    : "No project milestones have been created by the Team Lead yet."}
                />
              ) : (
                <div className="space-y-4">
                  {liveMilestones.map((milestone) => {
                    const statusVariant =
                      milestone.status === "Approved"
                        ? "success"
                        : milestone.status === "SubmittedForReview"
                        ? "info"
                        : milestone.status === "RevisionRequested"
                        ? "warning"
                        : "neutral";

                    const statusLabel =
                      milestone.status === "Approved"
                        ? "Approved"
                        : milestone.status === "SubmittedForReview"
                        ? "Pending Faculty Review"
                        : milestone.status === "RevisionRequested"
                        ? "Revision Requested"
                        : "Draft / Pending";

                    return (
                      <Card key={milestone.id} className="p-5 space-y-4 hover:border-slate-300 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-slate-900">{milestone.title}</h4>
                              <Badge variant={statusVariant} size="sm">{statusLabel}</Badge>
                              {milestone.isOverdue && milestone.status !== "Approved" && (
                                <Badge variant="danger" size="sm">Overdue</Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                              {milestone.description}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[11px] text-slate-400">Target Date</div>
                            <div className="text-xs font-semibold text-slate-700">
                              {new Date(milestone.targetDateUtc).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Task Completion Gate Requirement */}
                        {milestone.requiredTaskCompletionPercentage > 0 && (
                          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <CheckCircle2 className="h-4 w-4 text-brand-primary shrink-0" />
                            <span>
                              Gate Requirement: Minimum <strong>{milestone.requiredTaskCompletionPercentage}%</strong> sprint tasks must be completed before submission.
                            </span>
                          </div>
                        )}

                        {/* Review Feedback Alert */}
                        {milestone.status === "RevisionRequested" && milestone.reviewFeedback && (
                          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                            <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                              <span>Guide Feedback ({milestone.reviewedByName || "Faculty Guide"}):</span>
                            </div>
                            <p className="pl-5 italic text-amber-800">&quot;{milestone.reviewFeedback}&quot;</p>
                          </div>
                        )}

                        {milestone.status === "Approved" && milestone.reviewFeedback && (
                          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                            <div className="font-semibold flex items-center gap-1.5 text-emerald-800">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Approved by {milestone.reviewedByName || "Faculty Guide"}:</span>
                            </div>
                            <p className="pl-5 italic text-emerald-800">&quot;{milestone.reviewFeedback}&quot;</p>
                          </div>
                        )}

                        {/* Action Buttons & Evidence */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs flex-wrap gap-2">
                          <div className="text-slate-500 text-[11px]">
                            {milestone.submittedAtUtc ? (
                              <span>
                                Submitted on {new Date(milestone.submittedAtUtc).toLocaleDateString()} by {milestone.submittedByName || "Team"}
                              </span>
                            ) : (
                              <span>Created for project tracking</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {milestone.submissionEvidenceUrl && (
                              <a
                                href={milestone.submissionEvidenceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-brand-primary hover:underline font-medium"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>View Evidence</span>
                              </a>
                            )}

                            {isTeamLead && (milestone.status === "Pending" || milestone.status === "RevisionRequested") && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  setSelectedMilestoneForSubmit(milestone);
                                  setSubmissionEvidenceUrl(milestone.submissionEvidenceUrl || "");
                                  setShowSubmitMilestoneModal(true);
                                }}
                              >
                                {milestone.status === "RevisionRequested" ? "Resubmit for Review" : "Submit for Review"}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Review History Iterations */}
                        {milestone.reviewHistories && milestone.reviewHistories.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              Review History ({milestone.reviewHistories.length} Iterations)
                            </div>
                            <div className="space-y-1 pl-2 border-l-2 border-slate-200">
                              {milestone.reviewHistories.map((h) => (
                                <div key={h.id} className="text-[11px] text-slate-600 flex items-center justify-between">
                                  <span>
                                    <strong>{h.reviewerName}</strong>: {h.resultStatus === "Approved" ? "Approved" : "Revision Requested"} — <em>&quot;{h.feedback}&quot;</em>
                                  </span>
                                  <span className="text-slate-400 tabular-nums text-[10px]">
                                    {new Date(h.reviewedAtUtc).toLocaleDateString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 2: WEEKLY LOGBOOK                                                 */}
          {/* ========================================================================= */}
          {subTab === "logs" && (
            <div className="space-y-6">
              {/* Two columns: Submission Form & Verified History */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Friday Submission Form (5 cols) */}
                <div className="md:col-span-5 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Submit Friday Weekly Check-In</CardTitle>
                      <CardDescription>
                        Mandatory weekly logbook reviewable by designated guide {myTeam.guideName || "Prof. S. K. Verma"}.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmitLog} className="space-y-3.5">
                        <Textarea
                          label="1. Accomplishments This Week"
                          placeholder="Tasks executed, hardware calibrated, models trained..."
                          value={logAccomplishments}
                          onChange={(e) => setLogAccomplishments(e.target.value)}
                          required
                          rows={3}
                        />
                        <Textarea
                          label="2. Blockers & Technical Roadblocks"
                          placeholder="Hardware shortages, software integration errors..."
                          value={logBlockers}
                          onChange={(e) => setLogBlockers(e.target.value)}
                          rows={2}
                        />
                        <Textarea
                          label="3. Planned Deliverables Next Week"
                          placeholder="Upcoming milestones and deliverables..."
                          value={logNextWeek}
                          onChange={(e) => setLogNextWeek(e.target.value)}
                          rows={2}
                        />
                        <Input
                          label="Hours Contributed this Week"
                          type="number"
                          value={logHours}
                          onChange={(e) => setLogHours(parseInt(e.target.value) || 0)}
                        />
                        <Button type="submit" variant="primary" size="md" className="w-full">
                          {logSuccess ? "Log Submitted & Pending Guide Sign-off!" : "Submit Friday Check-In"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>

                {/* Verified Diary (7 cols) */}
                <div className="md:col-span-7 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Verified Logbook History</CardTitle>
                      <CardDescription>
                        Guide-stamped weekly engineering diary for continuous student progress tracking.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {myTeam.weeklyLogs.length === 0 ? (
                        <EmptyState
                          title="No Weekly Logs Recorded"
                          description="Submit your first Friday check-in to start logging engineering hours."
                        />
                      ) : (
                        myTeam.weeklyLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#0F172A]">
                                Week {log.weekNumber} Check-In • {log.dateSubmitted}
                              </span>
                              <Badge
                                variant={
                                  log.guideStatus === "Approved"
                                    ? "success"
                                    : log.guideStatus === "NeedsRevision"
                                    ? "warning"
                                    : "info"
                                }
                                size="sm"
                                dot
                              >
                                {log.guideStatus === "NeedsRevision" ? "Needs Revision" : log.guideStatus}
                              </Badge>
                            </div>
                            <p className="text-[#475569] leading-relaxed">{log.accomplishments}</p>
                            {log.guideRemarks && (
                              <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-800 text-[11px]">
                                <strong>Guide Remarks:</strong> {log.guideRemarks}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 3: CAPSTONE VAULT                                                 */}
          {/* ========================================================================= */}
          {subTab === "vault" && (
            <div className="space-y-6">
              {uploadToast && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{uploadToast}</span>
                </div>
              )}

              {/* 4-Slot Official Capstone Document Vault */}
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>4-Slot Official Capstone Document Vault</CardTitle>
                      <Badge variant="neutral" size="sm">
                        Verified Archive
                      </Badge>
                    </div>
                    <CardDescription>
                      Mandatory institutional milestone deliverables with cryptographic timestamps and plagiarism verification.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Vault Status:</span>
                    <Badge
                      variant={(myTeam.artifacts || []).filter((a) => a.status === "Approved").length === 4 ? "success" : "info"}
                      size="sm"
                      dot
                    >
                      {(myTeam.artifacts || []).filter((a) => a.status === "Approved").length} of 4 Approved
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      {
                        slot: "Synopsis" as ArtifactSlot,
                        title: "1. Approved Synopsis PDF",
                        reqText: "Signed Guide Proposal Synopsis",
                      },
                      {
                        slot: "MidTermPPT" as ArtifactSlot,
                        title: "2. Mid-Term Review PPT",
                        reqText: "Defense Presentation Slide Deck",
                      },
                      {
                        slot: "PlagiarismReport" as ArtifactSlot,
                        title: "3. Plagiarism Report (<15%)",
                        reqText: "Turnitin / DrillBit Report (< 15%)",
                      },
                      {
                        slot: "FinalThesis" as ArtifactSlot,
                        title: "4. Final Thesis PDF",
                        reqText: "Complete B.Tech Dissertation",
                      },
                    ].map((item) => {
                      const artifact = (myTeam.artifacts || []).find((a) => a.slot === item.slot);
                      const isUploaded = Boolean(artifact?.fileName);
                      const fileName = artifact?.fileName;
                      const fileSize = artifact?.fileSize;
                      const status = artifact?.status || "Pending";
                      const similarity = artifact?.similarityScore;

                      return (
                        <div
                          key={item.slot}
                          className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-[#0F172A] font-heading truncate">
                                {item.title}
                              </span>
                              <Badge
                                variant={status === "Approved" ? "success" : status === "Uploaded" ? "info" : "warning"}
                                size="sm"
                                dot
                              >
                                {status}
                              </Badge>
                            </div>

                            <p className="text-[10px] text-[#64748B]">{item.reqText}</p>

                            {isUploaded ? (
                              <div className="p-2 rounded bg-white border border-[#CBD5E1] space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadArtifact(artifact)}
                                    className="font-medium text-brand-primary hover:underline truncate max-w-[130px] flex items-center gap-1 cursor-pointer text-left"
                                    title="Download vault deliverable"
                                  >
                                    <span className="truncate">{fileName}</span>
                                  </button>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="tabular-nums text-[10px] text-slate-400">
                                      {fileSize}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadArtifact(artifact)}
                                      className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-brand-primary cursor-pointer"
                                      title="Download artifact"
                                    >
                                      <Download className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {artifact?.sha256Checksum && (
                                    <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                      <span>SHA: {artifact.sha256Checksum.slice(0, 8)}...</span>
                                    </div>
                                  )}
                                  {similarity !== undefined && (
                                    <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold tabular-nums">
                                      <ShieldCheck className="h-3 w-3" />
                                      <span>{similarity}% Similarity (Pass)</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="p-2.5 rounded bg-white border border-dashed border-[#CBD5E1] text-center text-[11px] text-[#94A3B8]">
                                Awaiting thesis draft submission
                              </div>
                            )}
                          </div>

                          <Button
                            size="sm"
                            variant={isUploaded ? "secondary" : "primary"}
                            onClick={() => {
                              setUploadModalSlot(item.slot);
                              setSelectedFile(null);
                              setCustomFileName(
                                fileName ||
                                  (item.slot === "FinalThesis"
                                    ? "2026-CS-MIN-01-Final-Thesis-Draft.pdf"
                                    : "document.pdf")
                              );
                            }}
                            className="w-full text-xs"
                            leftIcon={<Upload className="h-3 w-3" />}
                          >
                            {isUploaded ? "Replace Artifact" : "Upload Document"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB: FINAL PROJECT REPORT & ACADEMIC DELIVERABLES (PHASE 8)           */}
          {/* ========================================================================= */}
          {subTab === "final-submission" && (
            <div className="space-y-4">
              {submissionToast && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{submissionToast}</span>
                </div>
              )}

              {/* Status Header Banner */}
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>Final Project Report &amp; Academic Deliverables</CardTitle>
                      <Badge
                        variant={
                          submissionData?.status === "Accepted"
                            ? "success"
                            : submissionData?.status === "RevisionRequested"
                            ? "warning"
                            : submissionData?.status === "Submitted" || submissionData?.status === "Resubmitted"
                            ? "info"
                            : "neutral"
                        }
                        size="sm"
                        dot
                      >
                        {submissionData?.status ? `Status: ${submissionData.status} (v${submissionData.versionNumber})` : "Draft (v1)"}
                      </Badge>
                    </div>
                    <CardDescription>
                      Comprehensive institutional project deliverable package. Submission requires faculty guide allocation, approved milestones, and attached report thesis.
                    </CardDescription>
                  </div>
                  {submissionData?.status === "Accepted" && (
                    <Badge variant="success" size="md">
                      Ready For Viva Defense
                    </Badge>
                  )}
                </CardHeader>
              </Card>

              {/* Institutional Readiness Gates Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-brand-primary" />
                    Academic Submission Readiness Gates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                      <div className="text-slate-500 font-medium">1. Allocated Guide</div>
                      <div className="flex items-center gap-1.5 mt-1 font-semibold">
                        {submissionData?.readiness?.hasAllocatedGuide ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span className="text-emerald-900 truncate">{submissionData.readiness.allocatedGuideName || "Allocated"}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <span className="text-rose-800">Not Allocated</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                      <div className="text-slate-500 font-medium">2. Approved Milestones</div>
                      <div className="flex items-center gap-1.5 mt-1 font-semibold">
                        {submissionData?.readiness?.hasApprovedMilestones ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span className="text-emerald-900">{submissionData.readiness.approvedMilestonesCount} Approved</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <span className="text-rose-800">0 Approved (&ge; 1 req)</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                      <div className="text-slate-500 font-medium">3. Pending Milestone Reviews</div>
                      <div className="flex items-center gap-1.5 mt-1 font-semibold">
                        {!submissionData?.readiness?.hasPendingMilestonesInReview ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span className="text-emerald-900">0 Pending</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span className="text-amber-800">{submissionData?.readiness?.pendingMilestonesCount} In Review</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                      <div className="text-slate-500 font-medium">4. Required Deliverables</div>
                      <div className="flex items-center gap-1.5 mt-1 font-semibold">
                        {submissionData?.readiness?.hasRequiredAcademicFields ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span className="text-emerald-900">Complete</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <span className="text-rose-800">Fields Missing</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                      <div className="text-slate-500 font-medium">5. Attached Thesis Document</div>
                      <div className="flex items-center gap-1.5 mt-1 font-semibold">
                        {submissionData?.readiness?.hasAttachedReport ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span className="text-emerald-900 truncate">{submissionData?.reportFileName || "Attached"}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <span className="text-rose-800">Not Attached</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {submissionData?.readiness?.blockingReasons && submissionData.readiness.blockingReasons.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5 text-amber-950">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>Submission Eligibility Gate Checklist ({submissionData.readiness.blockingReasons.length} unresolved)</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[11px]">
                        {submissionData.readiness.blockingReasons.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {submissionData?.readiness?.isEligibleForSubmission && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>All institutional readiness prerequisites are satisfied. Team Leader is authorized to submit for faculty review.</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Academic Deliverables Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Academic Project Deliverables Specification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Project Title"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    disabled={!isTeamLead || (submissionData?.status !== "Draft" && submissionData?.status !== "RevisionRequested")}
                  />

                  <Textarea
                    label="Abstract &amp; Executive Summary (Required, min 20 chars)"
                    value={draftAbstract}
                    onChange={(e) => setDraftAbstract(e.target.value)}
                    rows={3}
                    disabled={!isTeamLead || (submissionData?.status !== "Draft" && submissionData?.status !== "RevisionRequested")}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Textarea
                      label="Problem Formulation &amp; Background"
                      value={draftProblemStatement}
                      onChange={(e) => setDraftProblemStatement(e.target.value)}
                      rows={3}
                      disabled={!isTeamLead || (submissionData?.status !== "Draft" && submissionData?.status !== "RevisionRequested")}
                    />

                    <Textarea
                      label="Methodology &amp; Architectural Approach"
                      value={draftMethodology}
                      onChange={(e) => setDraftMethodology(e.target.value)}
                      rows={3}
                      disabled={!isTeamLead || (submissionData?.status !== "Draft" && submissionData?.status !== "RevisionRequested")}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Textarea
                      label="Implementation Summary &amp; Tech Stack"
                      value={draftImplSummary}
                      onChange={(e) => setDraftImplSummary(e.target.value)}
                      rows={3}
                      disabled={!isTeamLead || (submissionData?.status !== "Draft" && submissionData?.status !== "RevisionRequested")}
                    />

                    <Textarea
                      label="Results, Performance Analysis &amp; Conclusion"
                      value={draftResults}
                      onChange={(e) => setDraftResults(e.target.value)}
                      rows={3}
                      disabled={!isTeamLead || (submissionData?.status !== "Draft" && submissionData?.status !== "RevisionRequested")}
                    />
                  </div>

                  <Textarea
                    label="Academic References &amp; Standards (IEEE / ACM / ISO)"
                    value={draftReferences}
                    onChange={(e) => setDraftReferences(e.target.value)}
                    rows={2}
                    disabled={!isTeamLead || (submissionData?.status !== "Draft" && submissionData?.status !== "RevisionRequested")}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Source Code Repository URL"
                      value={draftRepoUrl}
                      onChange={(e) => setDraftRepoUrl(e.target.value)}
                      disabled={!isTeamLead || (submissionData?.status !== "Draft" && submissionData?.status !== "RevisionRequested")}
                    />

                    <Input
                      label="Live Demonstration / Deployment URL"
                      value={draftDemoUrl}
                      onChange={(e) => setDraftDemoUrl(e.target.value)}
                      disabled={!isTeamLead || (submissionData?.status !== "Draft" && submissionData?.status !== "RevisionRequested")}
                    />
                  </div>

                  {/* Attached Document Summary */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">Attached Final Report Document:</div>
                      <div className="text-slate-600 mt-0.5">
                        {submissionData?.reportFileName ? (
                          <span className="text-emerald-800 font-medium">
                            {submissionData.reportFileName} ({(submissionData.reportFileSizeBytes / 1024).toFixed(1)} KB)
                          </span>
                        ) : (
                          <span className="italic text-slate-500">No report document attached yet.</span>
                        )}
                      </div>
                    </div>
                    {isTeamLead && (submissionData?.status === "Draft" || submissionData?.status === "RevisionRequested") && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          const vaultArtifact = (myTeam.artifacts || []).find((a) => a.slot === "FinalThesis");
                          try {
                            const res = await studentApi.attachReportDeliverable({
                              reportFileName: vaultArtifact?.fileName || "Final-Capstone-Report.pdf",
                              reportFileSizeBytes: 2048576,
                              reportSha256Checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                            });
                            if (res) {
                              setSubmissionData(res);
                              setSubmissionToast("Final project report deliverable attached successfully.");
                              setTimeout(() => setSubmissionToast(null), 3000);
                            }
                          } catch {
                            showToast("Failed to attach report deliverable.", "error");
                          }
                        }}
                      >
                        {submissionData?.reportFileName ? "Update Report Attachment" : "Attach Deliverable from Vault"}
                      </Button>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                      {!isTeamLead ? (
                        <span className="italic">Only the Team Leader is authorized to save drafts and submit the final report.</span>
                      ) : submissionData?.status === "Accepted" ? (
                        <span className="text-emerald-700 font-semibold">Report is formally accepted. Changes are locked for viva examination.</span>
                      ) : submissionData?.status === "Submitted" || submissionData?.status === "Resubmitted" ? (
                        <span className="text-blue-700 font-semibold">Submission is pending faculty guide review.</span>
                      ) : (
                        <span>Save drafts anytime. Complete all readiness gates before formal submission.</span>
                      )}
                    </div>

                    {isTeamLead && (submissionData?.status === "Draft" || submissionData?.status === "RevisionRequested") && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={submissionSaving || submissionSubmitting}
                          onClick={async () => {
                            if (!draftTitle.trim() || draftTitle.trim().length < 3) {
                              showToast("Title must be at least 3 characters.", "error");
                              return;
                            }
                            if (!draftAbstract.trim() || draftAbstract.trim().length < 20) {
                              showToast("Abstract must be at least 20 characters.", "error");
                              return;
                            }
                            try {
                              setSubmissionSaving(true);
                              const updated = await studentApi.saveSubmissionDraft({
                                projectTitle: draftTitle.trim(),
                                abstract: draftAbstract.trim(),
                                problemStatement: draftProblemStatement.trim(),
                                methodology: draftMethodology.trim(),
                                implementationSummary: draftImplSummary.trim(),
                                resultsAndConclusion: draftResults.trim(),
                                references: draftReferences.trim(),
                                repositoryUrl: draftRepoUrl.trim() || undefined,
                                demoUrl: draftDemoUrl.trim() || undefined
                              });
                              if (updated) {
                                setSubmissionData(updated);
                                setSubmissionToast("Draft saved successfully.");
                                setTimeout(() => setSubmissionToast(null), 3000);
                              }
                            } catch (e: unknown) {
                              showToast(e instanceof Error ? e.message : "Failed to save submission draft.", "error");
                            } finally {
                              setSubmissionSaving(false);
                            }
                          }}
                        >
                          {submissionSaving ? "Saving..." : "Save Draft"}
                        </Button>

                        <Button
                          variant="primary"
                          size="sm"
                          disabled={!submissionData?.readiness?.isEligibleForSubmission || submissionSubmitting}
                          onClick={async () => {
                            try {
                              setSubmissionSubmitting(true);
                              const submitted = await studentApi.submitFinalReport({});
                              if (submitted) {
                                setSubmissionData(submitted);
                                setSubmissionToast("Final project report successfully submitted to your faculty guide!");
                                setTimeout(() => setSubmissionToast(null), 5000);
                              }
                            } catch (e: unknown) {
                              showToast(e instanceof Error ? e.message : "Submission failed. Please check readiness gates.", "error");
                            } finally {
                              setSubmissionSubmitting(false);
                            }
                          }}
                        >
                          {submissionSubmitting ? "Submitting..." : submissionData?.status === "RevisionRequested" ? "Resubmit Final Report (v" + (submissionData.versionNumber + 1) + ")" : "Submit Final Report"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Review & Revision History Timeline */}
              {submissionData?.reviewHistories && submissionData.reviewHistories.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <History className="h-4 w-4 text-brand-primary" />
                      Faculty Review &amp; Revision History ({submissionData.reviewHistories.length} iteration{submissionData.reviewHistories.length > 1 ? "s" : ""})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {submissionData.reviewHistories.map((rev) => (
                      <div key={rev.id} className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">Iteration v{rev.submissionVersion}</span>
                            <Badge
                              variant={rev.resultStatus === "Accepted" ? "success" : "warning"}
                              size="sm"
                            >
                              {rev.resultStatus}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-slate-500 tabular-nums">
                            {new Date(rev.reviewedAtUtc).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100">
                          {rev.feedback}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Reviewed by: <span className="font-semibold text-slate-800">{rev.reviewerName}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 4: EVALUATIONS & DEFENSE                                          */}
          {/* ========================================================================= */}
          {subTab === "evaluations" && (
            evaluationLoading ? (
              <Card>
                <CardContent className="py-16 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
                  <p className="text-xs text-slate-500">Loading evaluation records &amp; defense schedule...</p>
                </CardContent>
              </Card>
            ) : !evaluationData ? (
              <Card>
                <CardContent className="py-12">
                  <EmptyState
                    title="Defense Evaluation Inactive"
                    description="Your team does not currently have an active evaluation record. Viva defense schedules and rubrics will appear here once your project is approved and scheduled."
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Stage and Status Header Card */}
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-xs text-brand-primary bg-brand-primary-tint px-2 py-0.5 rounded border border-brand-primary-border">
                            {evaluationData.teamCode}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">Academic Viva Defense</span>
                        </div>
                        <CardTitle className="text-lg">{evaluationData.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            evaluationData.evaluationStage === "Published"
                              ? "success"
                              : evaluationData.evaluationStage === "Scheduled"
                              ? "info"
                              : "warning"
                          }
                          size="sm"
                          dot
                        >
                          {evaluationData.evaluationStage === "ReadyForViva"
                            ? "Ready For Defense"
                            : evaluationData.evaluationStage === "Scheduled"
                            ? "Defense Scheduled"
                            : evaluationData.evaluationStage === "EvaluationInProgress"
                            ? "Assessment In Progress"
                            : evaluationData.evaluationStage === "Evaluated"
                            ? "Evaluated (Pending Publication)"
                            : "Evaluation Published"}
                        </Badge>
                        <Badge
                          variant={
                            evaluationData.outcome === "Pass"
                              ? "success"
                              : evaluationData.outcome === "Fail"
                              ? "danger"
                              : evaluationData.outcome === "ReViva"
                              ? "warning"
                              : "neutral"
                          }
                          size="sm"
                        >
                          Outcome: {evaluationData.outcome}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Defense Schedule Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Calendar className="h-4 w-4 text-brand-primary" />
                        <span>Viva Defense Session Schedule</span>
                      </CardTitle>
                    </div>
                    {evaluationData.schedule && (
                      <Badge
                        variant={
                          evaluationData.schedule.status === "Completed"
                            ? "success"
                            : evaluationData.schedule.status === "Rescheduled"
                            ? "warning"
                            : evaluationData.schedule.status === "Cancelled"
                            ? "danger"
                            : "info"
                        }
                        size="sm"
                      >
                        {evaluationData.schedule.status}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {evaluationData.schedule ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                              Date &amp; Time
                            </span>
                            <div className="font-semibold text-slate-900 text-sm">
                              {new Date(evaluationData.schedule.scheduledDateUtc).toLocaleDateString(undefined, {
                                weekday: "short",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                            <div className="text-xs text-slate-600 tabular-nums mt-0.5">
                              {new Date(evaluationData.schedule.scheduledDateUtc).toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              ({evaluationData.schedule.durationMinutes} mins)
                            </div>
                          </div>

                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                              Defense Venue / Mode
                            </span>
                            {evaluationData.schedule.venueOrLink.toLowerCase().startsWith("http") ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-semibold text-indigo-700 text-xs">
                                  <Video className="h-4 w-4 shrink-0" />
                                  <span>Virtual Defense Session</span>
                                </div>
                                <a
                                  href={evaluationData.schedule.venueOrLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand-primary hover:underline flex items-center gap-1 text-xs font-mono break-all"
                                >
                                  <span>{evaluationData.schedule.venueOrLink}</span>
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-semibold text-emerald-800 text-xs">
                                  <MapPin className="h-4 w-4 shrink-0" />
                                  <span>Campus Physical Venue</span>
                                </div>
                                <div className="text-xs text-slate-700 font-medium">
                                  {evaluationData.schedule.venueOrLink}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                              Panel Evaluators
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                              <Users2 className="h-4 w-4 text-slate-500 shrink-0" />
                              <span>
                                {evaluationData.schedule.evaluatorNames?.length
                                  ? evaluationData.schedule.evaluatorNames.join(", ")
                                  : "Panel Assigned"}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-1">
                              Independent academic evaluation committee
                            </span>
                          </div>
                        </div>

                        {evaluationData.schedule.candidateInstructions && (
                          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
                            <span className="font-bold block mb-1">Instructions for Candidates:</span>
                            <p>{evaluationData.schedule.candidateInstructions}</p>
                          </div>
                        )}

                        {evaluationData.schedule.cancellationReason && (
                          <div className="p-3 bg-red-100/70 border border-red-300 rounded-xl text-xs text-red-950 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-red-700 shrink-0" />
                            <span>
                              <strong>Cancellation Notice:</strong> {evaluationData.schedule.cancellationReason}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                        <Clock className="h-5 w-5 text-slate-500 shrink-0" />
                        <div>
                          <h5 className="text-xs font-bold text-slate-800">Defense Scheduling Pending</h5>
                          <p className="text-[11px] text-slate-600">
                            The academic coordinator has not yet published the defense panel date and venue for your team. You will be notified once scheduled.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Scorecard & Marks: Sealed vs Published */}
                {!evaluationData.isPublished ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Lock className="h-4 w-4 text-amber-600" />
                        <span>Academic Evaluation Scorecard (Sealed)</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="p-6 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3 text-center">
                        <ShieldCheck className="h-8 w-8 text-amber-600 mx-auto" />
                        <h4 className="text-sm font-bold text-amber-900">Scores Sealed Until Official HOD Publication</h4>
                        <p className="text-xs text-amber-800 max-w-lg mx-auto">
                          In accordance with institutional academic integrity guidelines, individual and panel criteria scores are sealed until the Head of Department (HOD) or Academic Coordinator conducts moderation and formally publishes final grades.
                        </p>
                        <div className="pt-2">
                          <Badge variant="warning" size="sm">
                            Current Stage: {evaluationData.evaluationStage === "Evaluated" ? "Evaluated — Awaiting Department Moderation" : evaluationData.evaluationStage}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {/* Published Consolidated Scorecard */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Award className="h-4 w-4 text-brand-primary" />
                          <span>Official Published Scorecard</span>
                        </CardTitle>
                        <CardDescription>
                          Published by Department Authority on{" "}
                          {evaluationData.publishedAtUtc
                            ? new Date(evaluationData.publishedAtUtc).toLocaleString()
                            : "Official Record"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-xs text-[#64748B]">Consolidated Defense Score</span>
                            <div className="text-2xl font-bold text-brand-primary tabular-nums">
                              {evaluationData.sharedTotalScore?.toFixed(1) ?? "0"} / {evaluationData.sharedMaxScore?.toFixed(1) ?? "0"}
                            </div>
                          </div>
                          {evaluationData.sharedMaxScore && evaluationData.sharedMaxScore > 0 && (
                            <Badge
                              variant={
                                ((evaluationData.sharedTotalScore ?? 0) / evaluationData.sharedMaxScore) >= 0.75
                                  ? "success"
                                  : ((evaluationData.sharedTotalScore ?? 0) / evaluationData.sharedMaxScore) >= 0.5
                                  ? "info"
                                  : "danger"
                              }
                              size="md"
                              dot
                            >
                              Score:{" "}
                              {Math.round(((evaluationData.sharedTotalScore ?? 0) / evaluationData.sharedMaxScore) * 100)}%
                            </Badge>
                          )}
                        </div>

                        {/* Criteria Breakdown */}
                        {evaluationData.criteriaScores && evaluationData.criteriaScores.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-xs font-bold text-slate-800">Rubric Criteria Breakdown</h5>
                            <div className="space-y-2 text-xs">
                              {evaluationData.criteriaScores.map((c) => (
                                <div key={c.criterionCode} className="p-3 rounded-lg border border-[#E2E8F0] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div>
                                    <div className="font-semibold text-[#0F172A]">{c.title || c.criterionCode}</div>
                                    {c.remarks && <div className="text-[11px] text-[#64748B]">{c.remarks}</div>}
                                  </div>
                                  <span className="tabular-nums font-bold text-[#0F172A] shrink-0">
                                    {c.awardedMarks.toFixed(1)} / {c.maxMarks.toFixed(1)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Individual Student Contribution */}
                        {evaluationData.myIndividualScore && (
                          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold text-emerald-950">Your Individual Assessment Breakdown</h5>
                              <span className="tabular-nums text-xs font-bold text-emerald-900">
                                Final Computed Mark: {evaluationData.myIndividualScore.finalComputedStudentMark.toFixed(1)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div className="p-2.5 bg-white border border-emerald-100 rounded-lg">
                                <span className="text-[10px] text-slate-500 block">Module Ownership</span>
                                <span className="tabular-nums font-bold text-slate-900">
                                  {evaluationData.myIndividualScore.moduleOwnershipScore.toFixed(1)} / 10
                                </span>
                              </div>
                              <div className="p-2.5 bg-white border border-emerald-100 rounded-lg">
                                <span className="text-[10px] text-slate-500 block">Viva Q&amp;A Defense</span>
                                <span className="tabular-nums font-bold text-slate-900">
                                  {evaluationData.myIndividualScore.vivaQaScore.toFixed(1)} / 10
                                </span>
                              </div>
                              <div className="p-2.5 bg-white border border-emerald-100 rounded-lg">
                                <span className="text-[10px] text-slate-500 block">Logbook Discipline</span>
                                <span className="tabular-nums font-bold text-slate-900">
                                  {evaluationData.myIndividualScore.logDisciplineScore.toFixed(1)} / 10
                                </span>
                              </div>
                              <div className="p-2.5 bg-white border border-emerald-100 rounded-lg">
                                <span className="text-[10px] text-slate-500 block">Individual Subtotal</span>
                                <span className="tabular-nums font-bold text-emerald-800">
                                  {evaluationData.myIndividualScore.individualTotalScore.toFixed(1)} / 30
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Team Roster Grades */}
                        {evaluationData.teamMembersScores && evaluationData.teamMembersScores.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-xs font-bold text-slate-800">Team Roster Grade Allocations</h5>
                            <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl bg-white overflow-hidden">
                              {evaluationData.teamMembersScores.map((m) => (
                                <div key={m.studentUserId} className="p-3 flex items-center justify-between text-xs">
                                  <div>
                                    <div className="font-semibold text-slate-900">{m.studentName}</div>
                                    <span className="font-mono text-[11px] text-slate-500">{m.enrollmentCode}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="text-[11px] text-slate-500">
                                      Indiv: <strong className="tabular-nums text-slate-800">{m.individualTotalScore.toFixed(1)}/30</strong>
                                    </span>
                                    <span className="tabular-nums font-bold text-brand-primary text-xs bg-brand-primary-tint px-2 py-0.5 rounded border border-brand-primary-border">
                                      Total: {m.finalComputedStudentMark.toFixed(1)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Panel Remarks & Moderation */}
                        {(evaluationData.generalRemarks || evaluationData.moderationRemarks) && (
                          <div className="space-y-2 pt-2">
                            {evaluationData.generalRemarks && (
                              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                                <span className="font-bold text-slate-700 block mb-0.5">Evaluation Panel Feedback:</span>
                                <p className="text-slate-600">{evaluationData.generalRemarks}</p>
                              </div>
                            )}
                            {evaluationData.moderationRemarks && (
                              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-lg text-xs">
                                <span className="font-bold text-purple-900 block mb-0.5">HOD Moderation Remarks:</span>
                                <p className="text-purple-800">{evaluationData.moderationRemarks}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 5: TEAM ROSTER & SETTINGS                                         */}
          {/* ========================================================================= */}
          {subTab === "roster" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-brand-primary bg-brand-primary-tint px-2 py-0.5 rounded border border-brand-primary-border">
                      {myTeam.teamCode}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="success" size="sm" dot>
                        Active Build Phase
                      </Badge>
                      {isTeamLead && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setShowRepoModal(true)}
                          leftIcon={<Settings className="h-3.5 w-3.5" strokeWidth={1.75} />}
                        >
                          Configure Integrations
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardTitle className="pt-2 text-base">{myTeam.title}</CardTitle>
                  <CardDescription>{myTeam.abstract}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <span className="text-[#64748B]">Assigned Mentor:</span>
                      <div className="font-bold text-[#0F172A]">{myTeam.guideName}</div>
                    </div>
                    <div>
                      <span className="text-[#64748B]">UN SDG Target:</span>
                      <div className="font-bold text-emerald-700">SDG {myTeam.sdgNumber}</div>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Weekly Logs Signed:</span>
                      <div className="font-bold text-[#0F172A] tabular-nums">
                        {myTeam.weeklyLogs.length} Verified
                      </div>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Sprint Tasks:</span>
                      <div className="font-bold text-[#0F172A] tabular-nums">
                        {myTeam.tasks.filter((t) => t.status === "Done").length}/{myTeam.tasks.length} Done
                      </div>
                    </div>
                  </div>

                  {/* Connected Integrations Card */}
                  <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-white space-y-2">
                    <span className="font-bold text-xs text-[#0F172A] block">Connected Repository &amp; Issue Trackers</span>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <GithubIcon className="h-4 w-4 text-[#0F172A]" />
                        <span className="text-[#64748B]">GitHub:</span>
                        <a
                          href={githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-primary hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span>{githubUrl.replace("https://github.com/", "")}</span>
                          <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-[#0F172A]" />
                        <span className="text-[#64748B]">Jira:</span>
                        <a
                          href={jiraUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-primary hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span>{jiraUrl.replace("https://", "")}</span>
                          <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-xs text-[#0F172A]">Enrolled Team Members</h4>
                    <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl bg-white">
                      {myTeam.members.map((m) => (
                        <div key={m.id} className="p-3 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-[#0F172A]">
                              {m.name} {m.isLead && <span className="text-brand-primary font-semibold">(Team Lead)</span>}
                            </div>
                            <div className="text-[11px] text-[#64748B]">{m.roleDescription}</div>
                          </div>
                          <span className="font-mono text-xs tabular-nums text-[#475569]">
                            {m.enrollmentNumber}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Continue into Next Track Banner */}
                  <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                    <div className="space-y-0.5">
                      <span className="font-bold text-xs text-emerald-950 font-heading">
                        Academic Continuity to Major Project Phase-I
                      </span>
                      <p className="text-[11px] text-emerald-800">
                        Carry forward repository telemetry, team roster, and prototype architecture into Semester 7.
                      </p>
                    </div>
                    <Link href="/student/portfolio">
                      <Button size="sm" variant="primary" className="whitespace-nowrap">
                        Continue into Next Track &rarr;
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* New Task Modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="Create Sprint Task"
        description="Add a milestone task to your team's Kanban board."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setShowTaskModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateTask} disabled={taskCreating}>
              {taskCreating ? "Creating..." : "Create Task"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5">
          <Input
            label="Task Summary"
            placeholder="e.g. Integrate ESP32 ADC calibration curves"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Tag / Category</label>
              <select
                value={taskTag}
                onChange={(e) => setTaskTag(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#0F172A] focus:outline-hidden focus:border-brand-primary cursor-pointer"
              >
                <option value="Hardware">Hardware</option>
                <option value="Firmware">Firmware</option>
                <option value="Backend">Backend</option>
                <option value="Frontend">Frontend</option>
                <option value="ML">ML / Anomaly</option>
                <option value="Testing">QA / Calibration</option>
                <option value="Docs">Documentation</option>
              </select>
            </div>
            <Input
              label="Due Date"
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Assignee</label>
            <select
              value={taskAssigneeId}
              onChange={(e) => {
                setTaskAssigneeId(e.target.value);
                const match = rosterMembers.find((m) => m.userId === e.target.value);
                if (match) setTaskAssignee(match.name);
              }}
              className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#0F172A] focus:outline-hidden focus:border-brand-primary cursor-pointer"
            >
              <option value="">Select Team Member (Default: You)</option>
              {rosterMembers.map((m) => (
                <option key={m.userId || m.name} value={m.userId || ""}>
                  {m.name} {m.isLead ? "(Lead)" : ""} — {m.roleDescription}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Team Repository & Jira Integration Modal */}
      <Modal
        isOpen={showRepoModal}
        onClose={() => setShowRepoModal(false)}
        title="Configure Team VCS & Tracker Integrations"
        description="Link your team's GitHub repository and Jira workspace to sync commit telemetry."
        maxWidth="md"
      >
        <form onSubmit={handleSaveRepoSettings} className="space-y-4">
          <Input
            label="GitHub Repository URL"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/organization/repo"
            helperText="Faculty guides can inspect commit integrity directly from their dashboard."
            required
          />

          <Input
            label="Jira / Atlassian Board URL"
            value={jiraUrl}
            onChange={(e) => setJiraUrl(e.target.value)}
            placeholder="https://company.atlassian.net/jira/projects/PROJ"
            helperText="Optional link to sprint backlog and issue management."
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
            <Button size="sm" variant="secondary" type="button" onClick={() => setShowRepoModal(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit">
              Save Integrations
            </Button>
          </div>
        </form>
      </Modal>

      {/* Document Vault Upload Modal */}
      <Modal
        isOpen={!!uploadModalSlot}
        onClose={() => setUploadModalSlot(null)}
        title={`Upload Deliverable: ${
          uploadModalSlot === "Synopsis"
            ? "Approved Synopsis PDF"
            : uploadModalSlot === "MidTermPPT"
            ? "Mid-Term Review PPT"
            : uploadModalSlot === "PlagiarismReport"
            ? "Plagiarism Report (Turnitin)"
            : "Final Capstone Thesis PDF"
        }`}
        description="Attach official deliverable to lock submission timestamp for accreditation review."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setUploadModalSlot(null);
                setSelectedFile(null);
              }}
              disabled={isUploadingArtifact}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isUploadingArtifact || !selectedFile}
              onClick={async () => {
                if (!uploadModalSlot || !selectedFile) {
                  showToast("Please select a file to upload.", "error");
                  return;
                }
                setIsUploadingArtifact(true);
                const slot = uploadModalSlot;
                const name = customFileName.trim() || selectedFile.name;

                try {
                  await uploadArtifactBinary(myTeam.id, slot, selectedFile, name);
                  setUploadModalSlot(null);
                  setSelectedFile(null);
                  setUploadToast(`Deliverable "${name}" successfully archived in Document Vault.`);
                  setTimeout(() => setUploadToast(null), 3500);
                } catch (err: unknown) {
                  console.error("Upload failed:", err);
                  showToast(err instanceof Error ? err.message : "Upload failed. Please try again.", "error");
                } finally {
                  setIsUploadingArtifact(false);
                }
              }}
              leftIcon={
                isUploadingArtifact ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )
              }
            >
              {isUploadingArtifact ? "Uploading to Vault..." : "Upload & Commit to Vault"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5 text-xs">
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.ppt,.pptx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setSelectedFile(f);
                setCustomFileName(f.name);
              }
            }}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#CBD5E1] hover:border-brand-primary transition-colors cursor-pointer rounded-xl p-6 text-center bg-[#F8FAFC] space-y-2"
          >
            <div className="h-10 w-10 mx-auto rounded-full bg-brand-primary-tint text-brand-primary flex items-center justify-center">
              <Upload className="h-5 w-5" strokeWidth={1.75} />
            </div>
            {selectedFile ? (
              <div className="space-y-1">
                <div className="font-bold text-xs text-brand-primary">
                  {selectedFile.name}
                </div>
                <div className="text-[10px] text-slate-500 tabular-nums">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for cryptographic commit
                </div>
              </div>
            ) : (
              <>
                <div className="text-xs font-semibold text-slate-800">
                  Drag and drop your deliverable file here, or click to browse
                </div>
                <p className="text-[10px] text-slate-500">
                  Accepted formats: .pdf, .ppt, .pptx (Max file size: 25MB)
                </p>
              </>
            )}
          </div>

          <Input
            label="File Name / Label"
            value={customFileName}
            onChange={(e) => setCustomFileName(e.target.value)}
            placeholder="e.g. 2026-CS-MIN-01-Deliverable.pdf"
          />

          {uploadModalSlot === "PlagiarismReport" && (
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 space-y-0.5">
              <span className="font-semibold block">Automatic Turnitin Anti-Plagiarism Verification</span>
              <p className="text-[11px] leading-tight">
                Simulated similarity parsing verified: <strong>8% Originality match</strong> (&lt; 15% threshold satisfied).
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Task Details Modal */}
      <Modal
        isOpen={!!selectedTaskForDetails}
        onClose={() => setSelectedTaskForDetails(null)}
        title="Sprint Task Details"
        description={`Milestone deliverable allocated to ${selectedTaskForDetails?.assigneeName || "team member"}.`}
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Update Status:</span>
              <select
                value={selectedTaskForDetails?.status || "Todo"}
                onChange={(e) => {
                  if (selectedTaskForDetails) {
                    const newStatus = e.target.value as TaskStatusType;
                    updateTaskStatus(selectedTaskForDetails.id, newStatus);
                    setSelectedTaskForDetails({ ...selectedTaskForDetails, status: newStatus });
                  }
                }}
                className="text-xs font-semibold rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-800"
              >
                <option value="Todo">Todo</option>
                <option value="InProgress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setSelectedTaskForDetails(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedTaskForDetails && (
          <div className="space-y-4 text-xs">
            <div>
              <span className="font-semibold text-slate-500">Summary:</span>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">{selectedTaskForDetails.title}</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500">Category Tag:</span>
                <div className="font-semibold text-brand-primary">{selectedTaskForDetails.tag}</div>
              </div>
              <div>
                <span className="text-slate-500">Due Date:</span>
                <div className="tabular-nums font-semibold text-slate-800">{selectedTaskForDetails.dueDate}</div>
              </div>
              <div>
                <span className="text-slate-500">Assignee:</span>
                <div className="font-semibold text-slate-900">{selectedTaskForDetails.assigneeName}</div>
              </div>
              <div>
                <span className="text-slate-500">Current Status:</span>
                <div className="font-semibold text-emerald-700">
                  {selectedTaskForDetails.status === "InProgress" ? "In Progress" : selectedTaskForDetails.status}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Proposal Lock Confirmation Modal */}
      <Modal
        isOpen={showLockConfirmModal}
        onClose={() => setShowLockConfirmModal(false)}
        title="Lock Roster & Submit to Guide"
        description="Locking your team roster freezes invitations and dispatches your proposal to your Faculty Guide for formal academic endorsement."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => setShowLockConfirmModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                handleLockAndSubmitProposal();
                setShowLockConfirmModal(false);
              }}
              leftIcon={<Lock className="h-3.5 w-3.5" />}
            >
              Confirm &amp; Dispatch Proposal
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-slate-600">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-950 font-heading">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Roster Freezing Safeguard</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Once locked, team roster invitations are permanently disabled for this academic cycle. Any subsequent modifications will require formal exception override approval from Department Coordinator Prof. Priya Nair.
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <div className="font-semibold text-slate-800">Proposal Abstract:</div>
            <p className="text-slate-700 font-medium line-clamp-2">{proposalTitle}</p>
            <div className="text-[11px] text-slate-500">
              Mentor Designated: <strong>{myTeam.guideName || "Prof. S. K. Verma"}</strong> • Roster Size: <strong>{myTeam.members.length} members</strong>
            </div>
          </div>
        </div>
      </Modal>
      {/* Classmate Discovery Modal */}
      <Modal
        isOpen={showPeersModal}
        onClose={() => setShowPeersModal(false)}
        title="Discover Available Classmates"
        description="Search eligible department peers who have active enrollment and are not currently allocated to a project team."
        footer={
          <Button variant="secondary" size="sm" onClick={() => setShowPeersModal(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-[11px] flex items-center gap-2">
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
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
          </div>

          {peersLoading ? (
            <div className="py-8 text-center text-slate-400">Loading eligible classmates...</div>
          ) : eligiblePeers.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              No eligible unallocated classmates found matching your query.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {eligiblePeers.map((peer) => (
                <div key={peer.studentId} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-xs">{peer.fullName}</span>
                      <span className="font-mono text-[11px] text-slate-500">{peer.enrollmentCode}</span>
                    </div>
                    {peer.bio && <p className="text-[11px] text-slate-600 line-clamp-1">{peer.bio}</p>}
                    {peer.skills && peer.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {peer.skills.map((s, idx) => (
                          <span key={idx} className="text-[10px] bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    className="shrink-0"
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
        description="Transfer your Team Lead responsibilities, proposal submission rights, and roster management privileges to another team member."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
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
        <div className="space-y-3 text-xs text-slate-600">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-950 font-heading">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Leadership Delegation Safeguard</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Once transferred, you will become a standard Contributor member. Only the designated new Team Lead will be authorized to submit proposals and manage teammate rosters.
            </p>
          </div>
          {transferLeadFeedback && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              {transferLeadFeedback}
            </div>
          )}
        </div>
      </Modal>

      {/* Phase 5: Guide Selection Modal */}
      <Modal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        title="Select Preferred Faculty Guide"
        description="Browse eligible faculty mentors in your department and submit your team's guide preference."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => setIsGuideModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedGuideId || isSubmittingGuide}
              onClick={handleSelectGuidePreference}
            >
              {isSubmittingGuide ? "Submitting..." : "Submit Guide Preference"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search faculty by name or area of expertise..."
              className="pl-9"
              value={guideSearchTerm}
              onChange={(e) => setGuideSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            {facultyGuides.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-3 text-center">
                Loading eligible faculty mentors...
              </p>
            ) : (
              facultyGuides
                .filter(
                  (f) =>
                    !guideSearchTerm ||
                    f.fullName.toLowerCase().includes(guideSearchTerm.toLowerCase()) ||
                    (f.skillsCsv && f.skillsCsv.toLowerCase().includes(guideSearchTerm.toLowerCase()))
                )
                .map((faculty) => {
                  const isSelected = selectedGuideId === faculty.id;
                  const isAtCapacity = !faculty.isAvailable;
                  return (
                    <div
                      key={faculty.id}
                      onClick={() => {
                        if (!isAtCapacity) setSelectedGuideId(faculty.id);
                      }}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : isAtCapacity
                          ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-sm text-slate-900">{faculty.fullName}</div>
                        <Badge variant={isAtCapacity ? "neutral" : "info"} size="sm">
                          {faculty.currentMentoredTeams} / {faculty.maxMentorTeams} Teams
                        </Badge>
                      </div>
                      <div className="text-slate-600 mt-0.5">
                        {faculty.designation || "Faculty Mentor"} • Dept of {faculty.departmentCode || "CSE"}
                      </div>
                      {faculty.skillsCsv && (
                        <div className="text-[11px] text-slate-500 mt-1">
                          <span className="font-medium text-slate-700">Expertise:</span> {faculty.skillsCsv}
                        </div>
                      )}
                      {isAtCapacity && (
                        <div className="text-[10px] text-amber-700 font-medium mt-1">
                          At maximum mentorship capacity for this semester.
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>

          <Textarea
            label="Preference Remarks / Justification (Optional, Max 500 characters)"
            placeholder="Explain why your project aligns with this faculty member's research or domain expertise..."
            rows={2}
            maxLength={500}
            value={guideRemarks}
            onChange={(e) => setGuideRemarks(e.target.value)}
          />
          <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
            <span>Mandatory for revisions, advisory for initial nominations</span>
            <span>{guideRemarks.length}/500</span>
          </div>
        </div>
      </Modal>

      {/* Phase 7: Milestone Creation Modal */}
      {showMilestoneModal && (
        <Modal
          isOpen={showMilestoneModal}
          onClose={() => setShowMilestoneModal(false)}
          title="Create Project Milestone"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Milestone Title *</label>
              <Input
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                placeholder="e.g. System Architecture & Database Design Sign-off"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Description &amp; Deliverable Scope *</label>
              <Textarea
                rows={3}
                value={milestoneDesc}
                onChange={(e) => setMilestoneDesc(e.target.value)}
                placeholder="Detailed objectives, expected features, criteria for completion..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Target Date *</label>
                <Input
                  type="date"
                  value={milestoneDate}
                  onChange={(e) => setMilestoneDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Required Task Completion (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={milestoneTaskPct.toString()}
                  onChange={(e) => setMilestoneTaskPct(parseInt(e.target.value, 10) || 0)}
                  placeholder="0 - 100"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowMilestoneModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateMilestone}
                disabled={milestoneSubmitting}
              >
                {milestoneSubmitting ? "Creating..." : "Save Milestone"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Phase 7: Submit Milestone for Review Modal */}
      {showSubmitMilestoneModal && selectedMilestoneForSubmit && (
        <Modal
          isOpen={showSubmitMilestoneModal}
          onClose={() => {
            setShowSubmitMilestoneModal(false);
            setSelectedMilestoneForSubmit(null);
          }}
          title={`Submit Milestone: ${selectedMilestoneForSubmit.title}`}
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Provide verifiable evidence (GitHub PR, staging URL, demonstration recording, document link) for your official faculty guide to review.
            </p>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Evidence URL / Repository Link *</label>
              <Input
                value={submissionEvidenceUrl}
                onChange={(e) => setSubmissionEvidenceUrl(e.target.value)}
                placeholder="https://github.com/... or https://colabex-demo.app"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Submission Notes (Optional)</label>
              <Textarea
                rows={2}
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                placeholder="Highlights, demo instructions, or notes for your guide..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowSubmitMilestoneModal(false);
                  setSelectedMilestoneForSubmit(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitMilestone}
                disabled={milestoneSubmitting}
              >
                {milestoneSubmitting ? "Submitting..." : "Submit to Faculty Guide"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
