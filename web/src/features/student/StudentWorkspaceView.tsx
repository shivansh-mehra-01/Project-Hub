"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  FileCheck2,
  Kanban,
  Mail,
  ShieldCheck,
  Target,
  UserCheck,
  Users2,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { StepperGPS } from "@/design-system/patterns/StepperGPS";
import { PageHeader } from "@/design-system/patterns/PageHeader";
import { TabBar } from "@/design-system/patterns/TabBar";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { PageErrorState, PageLoadingState } from "@/design-system/patterns/PageStates";
import { useSyncedSearchParam } from "@/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { StudentTeamFormationPanel } from "./components/StudentTeamFormationPanel";
import { WorkspacePreApproval } from "./components/WorkspacePreApproval";
import { WorkspaceTasksTab } from "./components/WorkspaceTasksTab";
import { WorkspaceMilestonesTab } from "./components/WorkspaceMilestonesTab";
import { WorkspaceLogsTab } from "./components/WorkspaceLogsTab";
import { WorkspaceVaultTab } from "./components/WorkspaceVaultTab";
import { WorkspaceSubmissionTab } from "./components/WorkspaceSubmissionTab";
import { WorkspaceEvaluationsTab } from "./components/WorkspaceEvaluationsTab";
import { WorkspaceRosterTab } from "./components/WorkspaceRosterTab";
import { studentApi } from "@/lib/api/studentApi";
import {
  CollegeTrackDto,
  FacultyGuideSummaryDto,
  ProjectMilestoneDto,
  ProjectProgressDto,
  ProjectReportSubmissionDto,
  SprintTaskDto,
  StudentDashboardDto,
  StudentGuidePreferenceDto,
  StudentTeamRosterDto,
  StudentVivaResultDto,
  TeamInvitationDto,
} from "@/lib/api/types";
import { showToast } from "@/lib/toast";

type ActiveTab =
  | "tasks"
  | "milestones"
  | "logs"
  | "vault"
  | "final-submission"
  | "evaluations"
  | "roster";

const ALLOWED_SUBTABS: readonly string[] = [
  "tasks",
  "milestones",
  "logs",
  "vault",
  "final-submission",
  "submission",
  "evaluations",
  "roster",
  "overview",
];

const normalizeSubTab = (raw: string): ActiveTab => {
  if (raw === "submission") return "final-submission";
  if (raw === "overview") return "roster";
  if (
    raw === "milestones" ||
    raw === "logs" ||
    raw === "vault" ||
    raw === "final-submission" ||
    raw === "evaluations" ||
    raw === "roster"
  ) {
    return raw;
  }
  return "tasks";
};

export const StudentWorkspaceView: React.FC = () => {
  useDashboardHeader({ title: "Workspace" });

  const [rawSubTab, setRawSubTab] = useSyncedSearchParam<string>(
    "subtab",
    "tasks",
    ALLOWED_SUBTABS
  );
  const subTab: ActiveTab = normalizeSubTab(rawSubTab);
  const setSubTab = (next: ActiveTab) => setRawSubTab(next);

  const [dashboardData, setDashboardData] = useState<StudentDashboardDto | null>(null);
  const [availableTracks, setAvailableTracks] = useState<CollegeTrackDto[]>([]);
  const [teamRoster, setTeamRoster] = useState<StudentTeamRosterDto | null>(null);
  const [receivedInvitations, setReceivedInvitations] = useState<TeamInvitationDto[]>([]);
  const [sentInvitations, setSentInvitations] = useState<TeamInvitationDto[]>([]);
  const [guidePreference, setGuidePreference] = useState<StudentGuidePreferenceDto | null>(null);
  const [facultyGuides, setFacultyGuides] = useState<FacultyGuideSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active execution tab state
  const [liveTasks, setLiveTasks] = useState<SprintTaskDto[] | null>(null);
  const [liveProgress, setLiveProgress] = useState<ProjectProgressDto | null>(null);
  const [liveMilestones, setLiveMilestones] = useState<ProjectMilestoneDto[]>([]);
  const [submissionData, setSubmissionData] = useState<ProjectReportSubmissionDto | null>(null);
  const [evaluationData, setEvaluationData] = useState<StudentVivaResultDto | null>(null);

  const refreshWorkspace = useCallback(async () => {
    setError(null);
    try {
      const [dash, tracks, roster, received, sent, guidePref] = await Promise.all([
        studentApi.getDashboard(),
        studentApi.getAvailableTracks().catch(() => [] as CollegeTrackDto[]),
        studentApi.getCurrentTeamRoster().catch(() => null),
        studentApi.getReceivedInvitations().catch(() => [] as TeamInvitationDto[]),
        studentApi.getSentInvitations().catch(() => [] as TeamInvitationDto[]),
        studentApi.getGuidePreference().catch(() => null),
      ]);
      setDashboardData(dash);
      setAvailableTracks(tracks || []);
      setTeamRoster(roster);
      setReceivedInvitations(received || []);
      setSentInvitations(sent || []);
      setGuidePreference(guidePref);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      studentApi.getDashboard(),
      studentApi.getAvailableTracks().catch(() => [] as CollegeTrackDto[]),
      studentApi.getCurrentTeamRoster().catch(() => null),
      studentApi.getReceivedInvitations().catch(() => [] as TeamInvitationDto[]),
      studentApi.getSentInvitations().catch(() => [] as TeamInvitationDto[]),
      studentApi.getGuidePreference().catch(() => null),
    ])
      .then(([dash, tracks, roster, received, sent, guidePref]) => {
        if (!active) return;
        setDashboardData(dash);
        setAvailableTracks(tracks || []);
        setTeamRoster(roster);
        setReceivedInvitations(received || []);
        setSentInvitations(sent || []);
        setGuidePreference(guidePref);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load workspace.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const [tasks, prog] = await Promise.all([
        studentApi.getWorkspaceTasks(),
        studentApi.getWorkspaceProgress(),
      ]);
      setLiveTasks(tasks || []);
      setLiveProgress(prog || null);
    } catch {
      // ignore when unallocated
    }
  }, []);

  const fetchMilestones = useCallback(async () => {
    try {
      const list = await studentApi.getWorkspaceMilestones();
      setLiveMilestones(list || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchInvitations = useCallback(async () => {
    try {
      const [received, sent] = await Promise.all([
        studentApi.getReceivedInvitations().catch(() => []),
        studentApi.getSentInvitations().catch(() => []),
      ]);
      setReceivedInvitations(received || []);
      setSentInvitations(sent || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchGuidePreference = useCallback(async () => {
    try {
      const pref = await studentApi.getGuidePreference();
      setGuidePreference(pref);
    } catch {
      // ignore
    }
  }, []);

  const fetchFacultyGuides = useCallback(async () => {
    try {
      const guides = await studentApi.getFacultyGuides();
      setFacultyGuides(guides || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!dashboardData?.activeProject) return;
    const status = dashboardData.activeProject.status;
    const isActive = status === "ActiveBuild" || status === "ReadyForViva" || status === "Completed" || status === "Archived";
    if (!isActive) return;

    let active = true;
    studentApi
      .getWorkspaceMilestones()
      .then((list) => {
        if (active) setLiveMilestones(list || []);
      })
      .catch(() => {});

    if (subTab === "tasks") {
      Promise.all([studentApi.getWorkspaceTasks(), studentApi.getWorkspaceProgress()])
        .then(([tasks, prog]) => {
          if (!active) return;
          setLiveTasks(tasks || []);
          setLiveProgress(prog || null);
        })
        .catch(() => {});
    } else if (subTab === "final-submission") {
      studentApi.getFinalSubmission().then((d) => {
        if (active && d) setSubmissionData(d);
      }).catch(() => {});
    } else if (subTab === "evaluations") {
      studentApi.getEvaluationResult().then((d) => {
        if (active && d) setEvaluationData(d);
      }).catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [subTab, dashboardData]);

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await studentApi.acceptInvitation(invitationId);
      showToast("Invitation accepted.", "success");
      await refreshWorkspace();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to accept invitation.", "error");
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      await studentApi.rejectInvitation(invitationId);
      showToast("Invitation declined.", "success");
      await fetchInvitations();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to decline invitation.", "error");
    }
  };

  if (loading) {
    return <PageLoadingState message="Loading student workspace..." />;
  }

  if (error && !dashboardData) {
    return <PageErrorState error={error} onRetry={() => void refreshWorkspace()} />;
  }

  const allocationState = dashboardData?.allocationState;
  const activeProject = dashboardData?.activeProject;
  const projectStatus = activeProject?.status || teamRoster?.status || "Draft";

  const isActiveExecution =
    allocationState === "Allocated" &&
    (projectStatus === "ActiveBuild" ||
      projectStatus === "ReadyForViva" ||
      projectStatus === "Completed" ||
      projectStatus === "Archived");

  const isPreApproval =
    (allocationState === "Allocated" || Boolean(teamRoster)) && !isActiveExecution;

  const isClosed = projectStatus === "Completed" || projectStatus === "Archived";
  const isSoloTrack = teamRoster ? teamRoster.maxTeamSize === 1 : activeProject?.memberCount === 1;
  const isTeamLead = Boolean(teamRoster ? teamRoster.isCallerLead : activeProject?.isLeader);

  const stepperStep = isClosed
    ? 5
    : isActiveExecution
    ? 4
    : projectStatus.startsWith("Pending")
    ? 3
    : 2;

  const tabs: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "tasks", label: "Tasks", icon: Kanban },
    { id: "milestones", label: "Milestones", icon: Target },
    { id: "logs", label: "Logbook", icon: FileCheck2 },
    { id: "vault", label: "Vault", icon: ShieldCheck },
    { id: "final-submission", label: "Final Report", icon: FileCheck2 },
    { id: "evaluations", label: "Evaluations", icon: CheckCircle2 },
    { id: "roster", label: "Team", icon: Users2 },
  ];

  const headerTitle = isActiveExecution && activeProject
    ? activeProject.title
    : isPreApproval
      ? activeProject?.title || teamRoster?.teamName || "Pre-Approval Setup"
      : "Project Workspace";

  const headerDescription = isActiveExecution && activeProject
    ? `Team ${activeProject.teamCode}${activeProject.guideName ? ` • Guide: ${activeProject.guideName}` : ""}`
    : isPreApproval
      ? "Finalize your team roster, project proposal, and preferred faculty guide."
      : "Join an active project window, form a team, or respond to team invitations.";

  const stageBadge = isActiveExecution ? (
    <Badge variant={isClosed ? "success" : "info"} size="sm" dot>
      {projectStatus}
    </Badge>
  ) : isPreApproval ? (
    <Badge variant="warning" size="sm" dot>
      Pre-Approval
    </Badge>
  ) : (
    <Badge variant="neutral" size="sm">
      Team Formation
    </Badge>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={headerTitle}
        description={headerDescription}
        badge={stageBadge}
      />

      {(isPreApproval || isActiveExecution) && <StepperGPS currentStep={stepperStep} />}

      {/* Stage 1: No Active Project */}
      {!isPreApproval && !isActiveExecution && (
        <>
          {allocationState === "Unallocated" && availableTracks.length > 0 ? (
            <StudentTeamFormationPanel
              availableTracks={availableTracks}
              tracksLoading={false}
              onTeamCreated={refreshWorkspace}
            />
          ) : (
            <EmptyState
              title={
                allocationState === "NoActiveEnrollment"
                  ? "No active semester enrollment"
                  : "No active project window"
              }
              description="Project actions will appear here once your department opens a project window."
            />
          )}

          {receivedInvitations.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4 text-brand-primary" />
                  <span>Incoming Team Invitations</span>
                </CardTitle>
                <Badge variant="warning" size="sm">{receivedInvitations.length} Pending</Badge>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {receivedInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-900">
                        {inv.projectTitle || "Team Invitation"}{" "}
                        <span className="font-mono text-slate-500 font-normal">({inv.teamCode})</span>
                      </div>
                      <div className="text-slate-500">Invited by {inv.inviterName}</div>
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
                        Accept
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Stage 2: Pre-Approval Team & Proposal Setup */}
      {isPreApproval && (
        <WorkspacePreApproval
          key={activeProject?.teamId || teamRoster?.teamId || "pre"}
          activeProject={activeProject}
          teamRoster={teamRoster}
          sentInvitations={sentInvitations}
          guidePreference={guidePreference}
          facultyGuides={facultyGuides}
          currentUserId={dashboardData?.identity?.userId || ""}
          isSoloTrack={isSoloTrack}
          onRefresh={refreshWorkspace}
          onRosterChange={setTeamRoster}
          onFetchInvitations={fetchInvitations}
          onFetchGuidePreference={fetchGuidePreference}
          onFetchFacultyGuides={fetchFacultyGuides}
        />
      )}

      {/* Stage 3: Active Project Execution */}
      {isActiveExecution && activeProject && (
        <div className="space-y-5">
          {isClosed && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs">
                <Award className="h-5 w-5 text-emerald-700 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-950">Project Completed &amp; Archived</div>
                  <div className="text-emerald-800">Your verified record is available in your portfolio.</div>
                </div>
              </div>
              <Link href="/student/portfolio">
                <Button size="sm" variant="primary">View Portfolio &rarr;</Button>
              </Link>
            </div>
          )}

          {(() => {
            const activeTasks = liveTasks ?? activeProject.tasks;
            const overdueTasks = activeTasks.filter((t) => t.isOverdue && t.status !== "Done").length;
            const overdueMilestones = liveMilestones.filter((m) => m.isOverdue && m.status !== "Approved").length;
            const nextMilestone = liveMilestones
              .filter((m) => m.status !== "Approved")
              .sort((a, b) => new Date(a.targetDateUtc).getTime() - new Date(b.targetDateUtc).getTime())[0];
            const verifiedArtifacts = activeProject.artifacts.filter((a) => a.status === "Verified").length;

            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs">
                  <div className="text-slate-500">Execution Stage</div>
                  <div className="font-bold text-slate-900 mt-0.5">{projectStatus}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs">
                  <div className="text-slate-500">Next Milestone Deadline</div>
                  <div className="font-bold text-slate-900 mt-0.5 truncate">
                    {nextMilestone
                      ? `${nextMilestone.title} (${new Date(nextMilestone.targetDateUtc).toLocaleDateString()})`
                      : liveMilestones.length > 0
                        ? "All milestones approved"
                        : "No milestones scheduled"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs">
                  <div className="text-slate-500">Overdue Items</div>
                  <div
                    className={`font-bold mt-0.5 ${
                      overdueTasks + overdueMilestones > 0 ? "text-rose-700" : "text-emerald-700"
                    }`}
                  >
                    {overdueTasks + overdueMilestones > 0
                      ? `${overdueTasks} task(s), ${overdueMilestones} milestone(s)`
                      : "On track"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs">
                  <div className="text-slate-500">Verified Vault Deliverables</div>
                  <div className="font-bold text-slate-900 mt-0.5">{verifiedArtifacts} / 4</div>
                </div>
              </div>
            );
          })()}

          <TabBar
            ariaLabel="Active project workspace sections"
            activeTab={subTab}
            onChange={setSubTab}
            tabs={tabs.map((tab) => {
              const Icon = tab.icon;
              return {
                id: tab.id,
                label: tab.label,
                icon: <Icon className="h-4 w-4" />,
              };
            })}
          />

          {subTab === "tasks" && (
            <WorkspaceTasksTab
              tasks={liveTasks ?? activeProject.tasks}
              progress={liveProgress}
              members={activeProject.members}
              isTeamLead={isTeamLead}
              onRefreshTasks={fetchTasks}
            />
          )}

          {subTab === "milestones" && (
            <WorkspaceMilestonesTab
              milestones={liveMilestones}
              isTeamLead={isTeamLead}
              onRefreshMilestones={fetchMilestones}
            />
          )}

          {subTab === "logs" && (
            <WorkspaceLogsTab
              logs={activeProject.weeklyLogs}
              guideName={activeProject.guideName}
              onRefresh={refreshWorkspace}
            />
          )}

          {subTab === "vault" && (
            <WorkspaceVaultTab
              artifacts={activeProject.artifacts}
              onRefresh={refreshWorkspace}
            />
          )}

          {subTab === "final-submission" && (
            <WorkspaceSubmissionTab
              key={submissionData?.id || "draft"}
              submission={submissionData}
              artifacts={activeProject.artifacts}
              isTeamLead={isTeamLead}
              onSubmissionChange={setSubmissionData}
              onGoToVault={() => setSubTab("vault")}
            />
          )}

          {subTab === "evaluations" && (
            <WorkspaceEvaluationsTab evaluation={evaluationData} />
          )}

          {subTab === "roster" && <WorkspaceRosterTab project={activeProject} />}
        </div>
      )}
    </div>
  );
};
