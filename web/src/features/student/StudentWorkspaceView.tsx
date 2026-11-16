"use client";

import React, { useState } from "react";
import {
  FolderGit2,
  Kanban,
  FileCheck2,
  CheckCircle2,
  Clock,
  Plus,
  ExternalLink,
  Lock,
  Send,
  Users2,
  Check,
  AlertCircle,
  AlertTriangle,
  FileText,
  Upload,
  Link as LinkIcon,
  Settings,
  FileUp,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { StepperGPS } from "@/design-system/patterns/StepperGPS";
import { Modal } from "@/design-system/components/Modal";
import { Input } from "@/design-system/components/Input";
import { Textarea } from "@/design-system/components/Textarea";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { ArtifactSlot, TaskStatusType } from "@/mocks/store-types";
import { GithubIcon } from "@/design-system/components/Icons";

export const StudentWorkspaceView: React.FC = () => {
  const {
    teams,
    currentPersona,
    updateTaskStatus,
    createTask,
    submitWeeklyLog,
    approveProposal,
    inviteTeamMember,
    updateTeamRepo,
    uploadArtifact,
  } = useProjectHubStore();

  // Demo mode gate
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

  // Lifecycle state simulator: Off-Season, Pre-Approval Setup, Post-Approval Active
  const [lifecycleState, setLifecycleState] = useState<"offseason" | "preapproval" | "active">("active");

  // Post-approval sub-tabs
  const [subTab, setSubTab] = useState<"board" | "logs" | "overview" | "evaluations">("board");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("subtab");
      if (tabParam === "logs" || tabParam === "overview" || tabParam === "evaluations" || tabParam === "board") {
        setSubTab(tabParam as "board" | "logs" | "overview" | "evaluations");
      }
    }
  }, []);

  // New Task Modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("Shivansh Mehra");
  const [taskTag, setTaskTag] = useState("Hardware");
  const [taskDueDate, setTaskDueDate] = useState("2026-03-25");
  const [taskCreatedToast, setTaskCreatedToast] = useState(false);

  // Weekly Log Form
  const [logAccomplishments, setLogAccomplishments] = useState("");
  const [logBlockers, setLogBlockers] = useState("");
  const [logNextWeek, setLogNextWeek] = useState("");
  const [logHours, setLogHours] = useState(14);
  const [logSuccess, setLogSuccess] = useState(false);

  // Pre-approval proposal form
  const [proposalSubmitted, setProposalSubmitted] = useState(false);
  const [inviteUsn, setInviteUsn] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState("");

  // Repository & Jira modal
  const [showRepoModal, setShowRepoModal] = useState(false);
  const [repoSuccess, setRepoSuccess] = useState(false);

  // Document Vault Upload State
  const [uploadModalSlot, setUploadModalSlot] = useState<ArtifactSlot | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const [uploadToast, setUploadToast] = useState<string | null>(null);

  // Active student team
  const myTeam =
    teams.find(
      (t) =>
        t.teamCode === "2026-CS-MIN-01" ||
        t.id === "team-01" ||
        t.members.some((m) => m.name === currentPersona.name)
    ) ||
    teams[0] || {
      id: "team-default",
      teamCode: "2026-CS-MIN-01",
      title: "Smart IoT Energy Monitoring & Anomaly Detection for Campus Labs",
      abstract: "Edge telemetric hardware monitoring energy dissipation across university labs with LSTM anomaly prediction.",
      domain: "IoT & Smart Systems",
      sdgNumber: 7,
      guideName: "Prof. S. K. Verma",
      state: "Active",
      githubUrl: "https://github.com/sistec-cse/iot-energy-monitor",
      jiraUrl: "https://sistec-cse.atlassian.net/jira/projects/IOT",
      isRosterLocked: true,
      members: [],
      tasks: [],
      weeklyLogs: [],
      health: "Healthy",
    };

  // Proposal Title & Similarity Check
  const [proposalTitle, setProposalTitle] = useState(myTeam.title);

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

  const isTeamLead = currentPersona.role === "TeamLead" || myTeam.members.some((m) => m.isLead && m.name === currentPersona.name);

  const [githubUrl, setGithubUrl] = useState(myTeam.githubUrl || "https://github.com/sistec-cse/iot-energy-monitor");
  const [jiraUrl, setJiraUrl] = useState(myTeam.jiraUrl || "https://sistec-cse.atlassian.net/jira/projects/IOT");

  const handleOpenRepoModal = () => {
    setGithubUrl(myTeam.githubUrl || "https://github.com/sistec-cse/iot-energy-monitor");
    setJiraUrl(myTeam.jiraUrl || "https://sistec-cse.atlassian.net/jira/projects/IOT");
    setShowRepoModal(true);
  };

  const handleCreateTask = () => {
    if (!taskTitle.trim()) return;
    createTask(myTeam.id, taskTitle.trim(), taskTag, taskAssignee, taskDueDate);
    setShowTaskModal(false);
    setTaskTitle("");
    setTaskCreatedToast(true);
    setTimeout(() => setTaskCreatedToast(false), 3500);
  };

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

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsn.trim()) return;
    inviteTeamMember(myTeam.id, inviteUsn.trim(), "Student Peer");
    setInviteFeedback(`Invitation successfully dispatched to USN ${inviteUsn.trim()}.`);
    setInviteUsn("");
    setTimeout(() => setInviteFeedback(""), 4000);
  };

  const handleSaveRepoSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateTeamRepo(myTeam.id, githubUrl, jiraUrl);
    setShowRepoModal(false);
    setRepoSuccess(true);
    setTimeout(() => setRepoSuccess(false), 3500);
  };

  return (
    <AppShell pageTitle="Project Workspace" breadcrumb="SISTec CSE • Minor Project" activeTab="Workspace">
      {/* Semester GPS Stepper */}
      <StepperGPS currentStep={lifecycleState === "offseason" ? 1 : lifecycleState === "preapproval" ? 2 : 4} />

      {/* Lifecycle Mode Simulator Pill (Gated behind Demo Mode) */}
      {isDemoMode && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-[#E2E8F0] shadow-2xs select-none">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#0F172A]">Workspace Stage Preview:</span>
            <div className="flex gap-1 p-0.5 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setLifecycleState("offseason")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  lifecycleState === "offseason"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                1. Off-Season
              </button>
              <button
                type="button"
                onClick={() => setLifecycleState("preapproval")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  lifecycleState === "preapproval"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                2. Pre-Approval Setup
              </button>
              <button
                type="button"
                onClick={() => setLifecycleState("active")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  lifecycleState === "active"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                3. Post-Approval Active
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isTeamLead && (
              <Badge variant="role" role="TeamLead" size="sm" dot>
                Lead Authority Unlocked
              </Badge>
            )}
          </div>
        </div>
      )}

      {repoSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Repository &amp; Jira tracking endpoints saved to team project configuration.</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATE 1: OFF-SEASON                                                       */}
      {/* ========================================================================= */}
      {lifecycleState === "offseason" && (
        <Card className="text-center p-8 space-y-4">
          <div className="h-12 w-12 mx-auto rounded-full bg-brand-primary-tint text-brand-primary border border-brand-primary-border flex items-center justify-center">
            <Clock className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-[#0F172A]">Semester Project Cycle Begins March 1</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Minor Project allocations are currently in the preparation phase. Explore faculty
              problem statements in the Explore tab or complete your profile skills.
            </p>
          </div>
          <Button size="sm" variant="primary" onClick={() => setLifecycleState("preapproval")}>
            Preview Team Setup &amp; Proposal Stage
          </Button>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* STATE 2: PRE-APPROVAL SETUP                                               */}
      {/* ========================================================================= */}
      {lifecycleState === "preapproval" && (
        <div className="space-y-6">
          {inviteFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{inviteFeedback}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Team Roster & Invitations */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Team Formation Roster (Max 4 Members)</CardTitle>
                  <CardDescription>
                    {isTeamLead
                      ? "As Team Lead, invite peers and lock roster when complete."
                      : "Only the Team Lead can modify roster agreements."}
                  </CardDescription>
                </div>
                <Badge variant="warning" size="sm">
                  Roster Unlocked
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl bg-[#F8FAFC]">
                  {myTeam.members.map((m) => (
                    <div key={m.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                          <span>{m.name}</span>
                          {m.isLead && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              Lead
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#64748B]">{m.roleDescription}</span>
                      </div>
                      <span className="font-mono text-[11px] text-[#475569]">{m.enrollmentNumber}</span>
                    </div>
                  ))}
                </div>

                {isTeamLead ? (
                  <form onSubmit={handleSendInvite} className="flex gap-2">
                    <Input
                      placeholder="Enter student USN (e.g. 0176CS221038)"
                      value={inviteUsn}
                      onChange={(e) => setInviteUsn(e.target.value)}
                      className="text-xs"
                      required
                    />
                    <Button size="sm" variant="secondary" type="submit" className="shrink-0" leftIcon={<Send className="h-3 w-3" />}>
                      Send Invite
                    </Button>
                  </form>
                ) : (
                  <p className="text-[11px] text-[#64748B] italic">
                    Contact your Team Lead ({myTeam.members.find((m) => m.isLead)?.name || "Lead"}) to invite teammates.
                  </p>
                )}
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
                        This advisory is non-blocking, but your Faculty Guide recommends highlighting novel edge LSTM regression to avoid duplication in SAR audits.
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
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleLockAndSubmitProposal}
                    className="w-full"
                    leftIcon={<Lock className="h-3.5 w-3.5" />}
                  >
                    {proposalSubmitted ? "Submitted to Guide!" : "Lock Roster & Submit to Guide"}
                  </Button>
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
      {lifecycleState === "active" && (
        <div className="space-y-6">
          {/* Active Workspace Sub-Tabs */}
          <div className="flex border-b border-[#E2E8F0] gap-4 text-xs font-semibold select-none overflow-x-auto">
            <button
              type="button"
              onClick={() => setSubTab("board")}
              className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                subTab === "board"
                  ? "border-b-2 border-brand-primary text-brand-primary"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <Kanban className="h-4 w-4" strokeWidth={1.75} />
              <span>Sprint Board</span>
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
              <span>Friday Logs &amp; Docs</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab("overview")}
              className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                subTab === "overview"
                  ? "border-b-2 border-brand-primary text-brand-primary"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <FolderGit2 className="h-4 w-4" strokeWidth={1.75} />
              <span>Team Overview &amp; Roster</span>
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
              <span>Rubric Evaluations</span>
            </button>
          </div>

          {/* SUB-TAB A: 3-COLUMN KANBAN SPRINT BOARD */}
          {subTab === "board" && (
            <div className="space-y-4">
              {taskCreatedToast && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Sprint task added to Kanban board successfully.</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Sprint Tasks &amp; Milestones</h3>
                  <p className="text-xs text-[#64748B]">Click any task to advance status (Todo &rarr; InProgress &rarr; Done).</p>
                </div>
                <div className="flex items-center gap-2">
                  {isTeamLead && (
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<Settings className="h-3.5 w-3.5" />}
                      onClick={handleOpenRepoModal}
                    >
                      Repo &amp; Jira Links
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    onClick={() => setShowTaskModal(true)}
                  >
                    New Task
                  </Button>
                </div>
              </div>

              {/* 3 Kanban Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["Todo", "InProgress", "Done"] as TaskStatusType[]).map((columnStatus) => {
                  const tasksInCol = myTeam.tasks.filter((t) => t.status === columnStatus);

                  return (
                    <div
                      key={columnStatus}
                      className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-3"
                    >
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-[#0F172A]">{columnStatus}</span>
                        <span className="font-mono text-xs bg-white px-2 py-0.5 rounded-full border border-[#CBD5E1] text-[#475569] tabular-nums">
                          {tasksInCol.length}
                        </span>
                      </div>

                      <div className="space-y-2.5 min-h-[220px]">
                        {tasksInCol.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => {
                              const next =
                                task.status === "Todo"
                                  ? "InProgress"
                                  : task.status === "InProgress"
                                  ? "Done"
                                  : "Todo";
                              updateTaskStatus(task.id, next);
                            }}
                            className="p-3 bg-white rounded-lg border border-[#E2E8F0] shadow-2xs hover:border-brand-primary transition-all cursor-pointer space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-brand-primary bg-brand-primary-tint px-1.5 py-0.2 rounded border border-brand-primary-border">
                                {task.tag}
                              </span>
                              <span className="text-[10px] text-[#94A3B8] font-mono tabular-nums">
                                Due {task.dueDate}
                              </span>
                            </div>
                            <h4 className="text-xs font-semibold text-[#0F172A] leading-snug">
                              {task.title}
                            </h4>
                            <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1 border-t border-[#E2E8F0]">
                              <span>{task.assigneeName}</span>
                              <span className="text-[10px] text-emerald-600 font-medium">Click to Advance</span>
                            </div>
                          </div>
                        ))}

                        {tasksInCol.length === 0 && (
                          <div className="h-28 flex items-center justify-center text-[11px] text-[#94A3B8] border border-dashed border-[#CBD5E1] rounded-lg">
                            No {columnStatus} tasks
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUB-TAB B: FRIDAY LOGS & DELIVERABLE VAULT */}
          {subTab === "logs" && (
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
                        NBA Criterion 2 &amp; 3
                      </Badge>
                    </div>
                    <CardDescription>
                      Mandatory institutional milestone artifacts with versioning and plagiarism verification.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">Vault Status:</span>
                    <Badge variant="success" size="sm" dot>
                      {(myTeam.artifacts || []).filter((a) => a.status === "Approved").length || 3} of 4 Approved
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      {
                        slot: "Synopsis" as ArtifactSlot,
                        title: "1. Approved Synopsis PDF",
                        fallbackFile: "2026-CS-MIN-01-Synopsis-Approved.pdf",
                        fallbackSize: "1.8 MB",
                        defaultStatus: "Approved",
                        reqText: "Signed Guide Proposal Synopsis",
                      },
                      {
                        slot: "MidTermPPT" as ArtifactSlot,
                        title: "2. Mid-Term Review PPT",
                        fallbackFile: "2026-CS-MIN-01-MidTerm-Deck.pptx",
                        fallbackSize: "14.2 MB",
                        defaultStatus: "Approved",
                        reqText: "Defense Presentation Slide Deck",
                      },
                      {
                        slot: "PlagiarismReport" as ArtifactSlot,
                        title: "3. Plagiarism Report",
                        fallbackFile: "Turnitin-Originality-8pct.pdf",
                        fallbackSize: "620 KB",
                        defaultStatus: "Approved",
                        similarity: 8,
                        reqText: "Turnitin / DrillBit Report (< 15%)",
                      },
                      {
                        slot: "FinalThesis" as ArtifactSlot,
                        title: "4. Final Thesis PDF",
                        fallbackFile: undefined,
                        fallbackSize: undefined,
                        defaultStatus: "Pending",
                        reqText: "Complete B.Tech Dissertation",
                      },
                    ].map((item) => {
                      const artifact = (myTeam.artifacts || []).find((a) => a.slot === item.slot);
                      const isUploaded = Boolean(artifact?.fileName || item.fallbackFile);
                      const fileName = artifact?.fileName || item.fallbackFile;
                      const fileSize = artifact?.fileSize || item.fallbackSize;
                      const status = artifact?.status || item.defaultStatus;
                      const similarity = artifact?.similarityScore ?? item.similarity;

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
                                  <span className="font-mono font-medium text-slate-800 truncate max-w-[130px]">
                                    {fileName}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                                    {fileSize}
                                  </span>
                                </div>
                                {similarity !== undefined && (
                                  <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold font-mono">
                                    <ShieldCheck className="h-3 w-3" />
                                    <span>{similarity}% Similarity (Pass)</span>
                                  </div>
                                )}
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

              {/* Verified Diary & Deliverable Vault (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Verified Logbook History</CardTitle>
                    <CardDescription>
                      Guide-stamped weekly engineering diary feeding NBA Criterion 2 student tracking.
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
                              variant={log.guideStatus === "Approved" ? "success" : "warning"}
                              size="sm"
                              dot
                            >
                              {log.guideStatus}
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

          {/* SUB-TAB C: OVERVIEW */}
          {subTab === "overview" && (
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
                      <div className="font-bold text-[#0F172A] font-mono tabular-nums">
                        {myTeam.weeklyLogs.length} Verified
                      </div>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Sprint Tasks:</span>
                      <div className="font-bold text-[#0F172A] font-mono tabular-nums">
                        {myTeam.tasks.filter((t) => t.status === "Done").length}/{myTeam.tasks.length} Done
                      </div>
                    </div>
                  </div>

                  {/* Connected Integrations Card */}
                  <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-white space-y-2">
                    <span className="font-bold text-xs text-[#0F172A] block">Connected Repository &amp; Issue Trackers</span>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 font-mono">
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

                      <div className="flex items-center gap-2 font-mono">
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
                </CardContent>
              </Card>
            </div>
          )}

          {/* SUB-TAB D: EVALUATIONS */}
          {subTab === "evaluations" && (
            <Card>
              <CardHeader>
                <CardTitle>Mid-Semester Defense Evaluation Scorecard</CardTitle>
                <CardDescription>
                  Official viva panel marks mapped to Course Outcomes (COs) and NBA Program Outcomes (POs).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#64748B]">Consolidated Defense Score</span>
                    <div className="text-2xl font-bold font-mono text-brand-primary tabular-nums">
                      44.5 / 50.0
                    </div>
                  </div>
                  <Badge variant="success" size="md" dot>
                    Attainment Exceeds Target (89.0%)
                  </Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg border border-[#E2E8F0] bg-white flex justify-between">
                    <div>
                      <div className="font-semibold text-[#0F172A]">Problem Formulation &amp; Literature Review</div>
                      <div className="text-[11px] text-[#64748B]">NBA PO2 • Bloom&apos;s Level 2</div>
                    </div>
                    <span className="font-mono font-bold text-[#0F172A]">9.0 / 10.0</span>
                  </div>

                  <div className="p-3 rounded-lg border border-[#E2E8F0] bg-white flex justify-between">
                    <div>
                      <div className="font-semibold text-[#0F172A]">System Architecture &amp; High-Level Design</div>
                      <div className="text-[11px] text-[#64748B]">NBA PO3 • Bloom&apos;s Level 3</div>
                    </div>
                    <span className="font-mono font-bold text-[#0F172A]">14.0 / 15.0</span>
                  </div>

                  <div className="p-3 rounded-lg border border-[#E2E8F0] bg-white flex justify-between">
                    <div>
                      <div className="font-semibold text-[#0F172A]">Implementation &amp; Hardware Prototype</div>
                      <div className="text-[11px] text-[#64748B]">NBA PO5 • Bloom&apos;s Level 5</div>
                    </div>
                    <span className="font-mono font-bold text-[#0F172A]">13.0 / 15.0</span>
                  </div>

                  <div className="p-3 rounded-lg border border-[#E2E8F0] bg-white flex justify-between">
                    <div>
                      <div className="font-semibold text-[#0F172A]">Viva Defense &amp; Technical Questions</div>
                      <div className="text-[11px] text-[#64748B]">NBA PO10 • Bloom&apos;s Level 4</div>
                    </div>
                    <span className="font-mono font-bold text-[#0F172A]">8.5 / 10.0</span>
                  </div>
                </div>
              </CardContent>
            </Card>
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
            <Button variant="primary" size="sm" onClick={handleCreateTask}>
              Create Task
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
              value={taskAssignee}
              onChange={(e) => setTaskAssignee(e.target.value)}
              className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#0F172A] focus:outline-hidden focus:border-brand-primary cursor-pointer"
            >
              {myTeam.members.length > 0 ? (
                myTeam.members.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} {m.isLead ? "(Lead)" : ""} — {m.roleDescription}
                  </option>
                ))
              ) : (
                <option value={currentPersona.name}>{currentPersona.name}</option>
              )}
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
            <Button variant="ghost" size="sm" onClick={() => setUploadModalSlot(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!uploadModalSlot) return;
                const slot = uploadModalSlot;
                const name = customFileName.trim() || `${myTeam.teamCode}-${slot}.pdf`;
                const size =
                  slot === "MidTermPPT" ? "14.2 MB" : slot === "FinalThesis" ? "4.8 MB" : "1.8 MB";
                const sim = slot === "PlagiarismReport" ? 8 : undefined;
                uploadArtifact(myTeam.id, slot, name, size, sim);
                setUploadModalSlot(null);
                setUploadToast(`Deliverable "${name}" successfully archived in Document Vault.`);
                setTimeout(() => setUploadToast(null), 3500);
              }}
            >
              Upload &amp; Commit to Vault
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5 text-xs">
          <div className="border-2 border-dashed border-[#CBD5E1] rounded-xl p-6 text-center bg-[#F8FAFC] space-y-2">
            <div className="h-10 w-10 mx-auto rounded-full bg-brand-primary-tint text-brand-primary flex items-center justify-center">
              <Upload className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="text-xs font-semibold text-slate-800">
              Drag and drop your deliverable file here, or click to browse
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              Accepted formats: .pdf, .pptx, .docx (Max file size: 50MB)
            </p>
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
    </AppShell>
  );
};
