"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileCheck2,
  Users2,
  GraduationCap,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Check,
  Lock,
  Search,
  CheckSquare,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  GitCommit,
  X,
  Send,
  AlertCircle,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { AppShell } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { Modal } from "@/design-system/components/Modal";
import { Input } from "@/design-system/components/Input";
import { Textarea } from "@/design-system/components/Textarea";
import { Select } from "@/design-system/components/Select";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { WeeklyLog, Team } from "@/mocks/store-types";
import { GithubIcon } from "@/design-system/components/Icons";

export interface FacultyViewProps {
  initialTab?: "queue" | "teams" | "grading";
}

export const FacultyView: React.FC<FacultyViewProps> = ({ initialTab = "queue" }) => {
  const router = useRouter();
  const {
    teams,
    evaluations,
    rubrics,
    currentPersona,
    reviewWeeklyLog,
    approveProposal,
    rejectProposal,
    submitEvaluationScores,
    lockEvaluation,
    postProblemIdea,
    saveIndividualEvaluations,
    individualEvaluations,
  } = useProjectHubStore();

  const [activeTab, setActiveTab] = useState<"queue" | "teams" | "grading">(initialTab);
  const [inspectingLog, setInspectingLog] = useState<WeeklyLog | null>(null);
  const [inspectingTeam, setInspectingTeam] = useState<Team | null>(null);
  const [proposalRevisionTeam, setProposalRevisionTeam] = useState<Team | null>(null);
  const [revisionRemarks, setRevisionRemarks] = useState("");
  const [guideRemarks, setGuideRemarks] = useState("");
  const [showPostIdeaModal, setShowPostIdeaModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Idea form state
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaAbstract, setIdeaAbstract] = useState("");
  const [ideaDomain, setIdeaDomain] = useState("IoT & Smart Systems");
  const [ideaSdg, setIdeaSdg] = useState("7");

  // Panel assigned defense teams (with verified non-guide conflict-of-interest check)
  const assignedDefenseTeams = [
    {
      id: "eval-team-01",
      teamCode: "2026-CS-MIN-01",
      title: "Smart IoT Energy Monitoring & Anomaly Detection for Campus Labs",
      leadName: "Shivansh Mehra",
      domain: "IoT & Cloud Infrastructure (SDG 7)",
      abstract: "Edge telemetric acquisition across campus lab circuits with LSTM anomaly regression models.",
      guideName: "Prof. S. K. Verma",
      commits: "28 commits (Verified)",
      attendance: "100% (5/5 weeks)",
      members: [
        { name: "Shivansh Mehra", role: "Edge Firmware & Lead", usn: "0176CS221045", logs: 5, commits: 28 },
        { name: "Aarav Sharma", role: "LSTM ML Pipeline", usn: "0176CS221002", logs: 4, commits: 16 },
        { name: "Diya Patel", role: "Next.js Web Dashboard", usn: "0176CS221021", logs: 4, commits: 12 },
      ],
      defaultScores: { "crit-01": 9.5, "crit-02": 14.5, "crit-03": 14.0, "crit-04": 9.0 },
    },
    {
      id: "eval-team-04",
      teamCode: "2026-CS-MIN-04",
      title: "Automated Solar Microgrid with MPPT Tracking",
      leadName: "Devansh Patel",
      domain: "Renewable Energy & IoT (SDG 7)",
      abstract: "Dual-axis solar tracking system driven by astronomical algorithm with Perturb and Observe (P&O) MPPT firmware.",
      guideName: "Prof. Priya Nair",
      commits: "48 commits (Verified)",
      attendance: "100% (5/5 weeks)",
      members: [
        { name: "Devansh Patel (Lead)", role: "Firmware & Embedded 40%", usn: "0176CS221019", logs: 5, commits: 48 },
        { name: "Meera Sen", role: "Power Electronics 35%", usn: "0176CS221033", logs: 5, commits: 32 },
        { name: "Kunal Jain", role: "Telemetry Dashboard 25%", usn: "0176CS221027", logs: 5, commits: 18 },
      ],
      defaultScores: { "crit-01": 9.5, "crit-02": 14.5, "crit-03": 14.0, "crit-04": 9.0 },
    },
    {
      id: "eval-team-07",
      teamCode: "2026-CS-MIN-07",
      title: "Decentralized University Credential Verification",
      leadName: "Neha Singhal",
      domain: "Web3 & Cryptography (SDG 9)",
      abstract: "Zero-knowledge proof verification pipeline for university transcripts and semester grade cards.",
      guideName: "Dr. Amit Rawat",
      commits: "36 commits (Verified)",
      attendance: "100% (5/5 weeks)",
      members: [
        { name: "Neha Singhal (Lead)", role: "Smart Contract Architecture 40%", usn: "0176CS221039", logs: 5, commits: 36 },
        { name: "Tarun Sharma", role: "Zero-Knowledge Circuit 35%", usn: "0176CS221051", logs: 4, commits: 22 },
        { name: "Pooja Verma", role: "Verification Portal 25%", usn: "0176CS221043", logs: 5, commits: 14 },
      ],
      defaultScores: { "crit-01": 8.5, "crit-02": 13.0, "crit-03": 12.5, "crit-04": 8.0 },
    },
    {
      id: "eval-team-09",
      teamCode: "2026-CS-MIN-09",
      title: "Warehouse AGV Robot with 2D LiDAR SLAM",
      leadName: "Vikram Rathore",
      domain: "Robotics & Automation (SDG 9)",
      abstract: "Differential drive robot running 2D Cartographer SLAM and TEB local planner for warehouse collision avoidance.",
      guideName: "Dr. Manisha Sharma",
      commits: "52 commits (Verified)",
      attendance: "100% (5/5 weeks)",
      members: [
        { name: "Vikram Rathore (Lead)", role: "ROS2 & LiDAR SLAM 45%", usn: "0176CS221058", logs: 5, commits: 52 },
        { name: "Ananya Dixit", role: "Motor Controller & PCB 30%", usn: "0176CS221008", logs: 5, commits: 26 },
        { name: "Siddharth Rao", role: "Warehouse Fleet Planner 25%", usn: "0176CS221048", logs: 4, commits: 19 },
      ],
      defaultScores: { "crit-01": 9.0, "crit-02": 14.0, "crit-03": 13.5, "crit-04": 9.0 },
    },
  ];

  const [selectedDefenseTeamId, setSelectedDefenseTeamId] = useState(assignedDefenseTeams[0].id);
  const [lockedDefenseTeamIds, setLockedDefenseTeamIds] = useState<string[]>([]);
  const currentDefenseTeam =
    assignedDefenseTeams.find((t) => t.id === selectedDefenseTeamId) || assignedDefenseTeams[0];

  const activeRubric = rubrics[0];
  const [scores, setScores] = useState<Record<string, number>>(currentDefenseTeam.defaultScores);
  const [vivaFeedback, setVivaFeedback] = useState("Solid hardware prototype demonstration with verified telemetry streaming.");

  // Individual Student Grading Matrix State (40% Weight: Module Ownership 15, Viva Q&A 15, Log Discipline 10)
  const [individualScores, setIndividualScores] = useState<
    Record<string, { moduleOwnership: number; vivaScore: number; logDiscipline: number }>
  >({
    "0176CS221045": { moduleOwnership: 14.5, vivaScore: 14.0, logDiscipline: 9.5 },
    "0176CS221002": { moduleOwnership: 13.5, vivaScore: 13.0, logDiscipline: 8.5 },
    "0176CS221021": { moduleOwnership: 13.0, vivaScore: 12.5, logDiscipline: 9.0 },
  });

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Switch defense team and update scores
  const handleSelectDefenseTeam = (teamId: string) => {
    setSelectedDefenseTeamId(teamId);
    const target = assignedDefenseTeams.find((t) => t.id === teamId);
    if (target) {
      setScores(target.defaultScores);
    }
  };

  const isCurrentDefenseLocked = lockedDefenseTeamIds.includes(currentDefenseTeam.id);

  // Filter teams mentored by this faculty (Prof. Verma: 2026-CS-MIN-01 & 2026-CS-MIN-02)
  const myGuidedTeams = teams.filter(
    (t) =>
      t.guideId === "usr-fac-verma" ||
      t.guideId === currentPersona.id ||
      t.teamCode === "2026-CS-MIN-01" ||
      t.teamCode === "2026-CS-MIN-02"
  );

  // Action Queue items: unreviewed weekly logs and pending proposals
  const pendingLogs = teams.flatMap((t) =>
    t.weeklyLogs
      .filter((l) => l.guideStatus === "Pending")
      .map((l) => ({ ...l, teamCode: t.teamCode, projectTitle: t.title }))
  );

  const pendingProposals = teams.filter((t) => t.state === "PendingGuide");

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  const handleScoreChange = (critId: string, val: number, max: number) => {
    if (isCurrentDefenseLocked) return;
    const clamped = Math.min(Math.max(0, val), max);
    setScores((prev) => ({ ...prev, [critId]: clamped }));
  };

  const handleSubmitMarks = () => {
    if (isCurrentDefenseLocked) return;
    setLockedDefenseTeamIds((prev) => [...prev, currentDefenseTeam.id]);
    submitEvaluationScores(evaluations[0]?.id || "eval-01", scores, vivaFeedback);
    lockEvaluation(evaluations[0]?.id || "eval-01");

    // Save 40% individual student grading matrix
    const sharedScaled = Number(((totalScore / (activeRubric?.totalMarks || 50)) * 60).toFixed(1));
    const evaluationsToSave = currentDefenseTeam.members.map((m) => {
      const ind = individualScores[m.usn] || { moduleOwnership: 13.0, vivaScore: 12.5, logDiscipline: 8.5 };
      const indivTotal = Number((ind.moduleOwnership + ind.vivaScore + ind.logDiscipline).toFixed(1));
      return {
        id: `indiv-eval-${m.usn}-${Date.now()}`,
        teamId: currentDefenseTeam.id,
        teamCode: currentDefenseTeam.teamCode,
        enrollmentNumber: m.usn,
        studentName: m.name,
        moduleOwnership: ind.moduleOwnership,
        vivaScore: ind.vivaScore,
        logDiscipline: ind.logDiscipline,
        individualTotal: indivTotal,
        sharedTeamScore: sharedScaled,
        finalTotalScore: Number((sharedScaled + indivTotal).toFixed(1)),
        verifiedLogsCount: m.logs ?? 4,
        verifiedCommitsCount: m.commits ?? 20,
        isFinalized: true,
      };
    });
    saveIndividualEvaluations(currentDefenseTeam.id, evaluationsToSave);

    showToast(`Shared (60%) & individual marks (40%) for ${currentDefenseTeam.teamCode} locked and submitted to NBA SAR.`);
  };

  const handlePostIdea = () => {
    if (!ideaTitle || !ideaAbstract) return;
    postProblemIdea({
      title: ideaTitle,
      abstract: ideaAbstract,
      domain: ideaDomain,
      facultyName: currentPersona.name,
      facultyId: currentPersona.id,
      sdgNumber: parseInt(ideaSdg) || 7,
      prerequisites: ["Python", "Engineering Fundamentals"],
      capacity: 4,
    });
    showToast(`Problem statement "${ideaTitle}" published to campus problem bank.`);
    setShowPostIdeaModal(false);
    setIdeaTitle("");
    setIdeaAbstract("");
  };

  const handleProposalRevisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalRevisionTeam) return;
    rejectProposal(proposalRevisionTeam.id, revisionRemarks || "Revision required in methodology");
    showToast(`Proposal ${proposalRevisionTeam.teamCode} returned to Team Lead with revision remarks.`);
    setProposalRevisionTeam(null);
    setRevisionRemarks("");
  };

  const tabConfigs: Record<
    string,
    { title: string; breadcrumb: string; label: string }
  > = {
    queue: {
      title: "Faculty Priority Action Queue",
      breadcrumb: "Mentorship & Evaluation Console • SISTec CSE",
      label: "Action Queue",
    },
    teams: {
      title: "Faculty Mentored Project Teams",
      breadcrumb: "Mentorship & Evaluation Console • SISTec CSE",
      label: "My Teams",
    },
    grading: {
      title: "Live Viva Defense Rubric Grading",
      breadcrumb: "Mentorship & Evaluation Console • SISTec CSE",
      label: "Live Viva Grading",
    },
  };

  const currentTabConfig = tabConfigs[activeTab] || tabConfigs.queue;

  return (
    <AppShell
      pageTitle={currentTabConfig.title}
      breadcrumb={currentTabConfig.breadcrumb}
      activeTab={currentTabConfig.label}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-[#111827] px-4 py-2.5 text-xs font-medium text-white shadow-xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 stroke-[1.75]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ACTION QUEUE                                                       */}
      {/* ========================================================================= */}
      {activeTab === "queue" && (
        <div className="space-y-6">
          {/* Pending Weekly Logs Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Friday Weekly Check-Ins Awaiting Review</CardTitle>
                <CardDescription>
                  Review student logbook submissions, record guidance, and approve engineering progress.
                </CardDescription>
              </div>
              <Badge variant={pendingLogs.length > 0 ? "warning" : "success"} size="sm" dot>
                {pendingLogs.length} Pending Review
              </Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {pendingLogs.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    title="All Weekly Check-Ins Reviewed"
                    description="Every Friday student logbook submission has been inspected, given mentor feedback, and approved."
                  />
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-500">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Team Code</th>
                      <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Student Author</th>
                      <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Sprint Week</th>
                      <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Accomplishments Summary</th>
                      <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Hours</th>
                      <th className="py-2.5 px-4 text-right font-semibold text-[11px] uppercase tracking-[0.06em]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                    {pendingLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-brand-primary">{log.teamCode}</td>
                        <td className="py-2.5 px-4 font-semibold text-[#0F172A]">{log.studentName}</td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700">Week {log.weekNumber}</td>
                        <td className="py-2.5 px-4 max-w-xs truncate text-[#475569]">
                          {log.accomplishments}
                        </td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700">{log.hoursSpent} hrs</td>
                        <td className="py-2.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setInspectingLog(log);
                              setGuideRemarks(log.guideRemarks || "");
                            }}
                          >
                            Review &amp; Verify
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Pending Proposal Endorsements Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Proposal Endorsements</CardTitle>
                <CardDescription>
                  New team project proposals awaiting your endorsement as designated Faculty Guide.
                </CardDescription>
              </div>
              <Badge variant={pendingProposals.length > 0 ? "warning" : "success"} size="sm" dot>
                {pendingProposals.length} Pending Endorsement
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingProposals.length === 0 ? (
                <EmptyState
                  title="No Pending Proposals"
                  description="No new student project proposals awaiting your faculty guide endorsement."
                />
              ) : (
                pendingProposals.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-brand-primary">{t.teamCode}</span>
                        <h4 className="text-xs font-bold text-[#0F172A]">{t.title}</h4>
                        <Badge variant="sdg" sdgNumber={t.sdgNumber} size="sm">
                          {t.domain}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#475569] line-clamp-1">{t.abstract}</p>
                      <div className="text-[11px] text-[#64748B]">
                        Lead: <span className="font-semibold text-slate-800">{t.members.find((m) => m.isLead)?.name}</span> ({t.members.length} members) • Mentor Designated: Prof. S. K. Verma
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          approveProposal(t.id, "Faculty");
                          showToast(`Proposal endorsed for team ${t.teamCode}. Forwarded to Coordinator.`);
                        }}
                        leftIcon={<Check className="h-3.5 w-3.5 stroke-[2]" />}
                      >
                        Endorse Proposal
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setProposalRevisionTeam(t);
                          setRevisionRemarks("");
                        }}
                        className="text-amber-700 hover:bg-amber-50"
                      >
                        Request Revisions
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MY TEAMS                                                           */}
      {/* ========================================================================= */}
      {activeTab === "teams" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold font-heading text-[#0F172A]">Mentored Project Teams</h3>
              <p className="text-xs text-[#64748B]">
                Track team milestone progress, sprint completion rates, and GitHub repository activity.
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="h-3.5 w-3.5 stroke-[2]" />}
              onClick={() => setShowPostIdeaModal(true)}
            >
              + Post Idea to Problem Bank
            </Button>
          </div>

          {myGuidedTeams.length === 0 ? (
            <EmptyState
              title="No Mentored Teams"
              description="You have not been assigned to mentor any project teams in this academic cycle."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myGuidedTeams.map((team) => {
                const totalTasks = team.tasks?.length || 4;
                const doneTasks = team.tasks?.filter((t) => t.status === "Done").length || 2;
                const completionPct = Math.round((doneTasks / totalTasks) * 100);

                // Format badge label with clean space
                const formattedState =
                  team.state === "PendingHOD"
                    ? "Pending HOD"
                    : team.state === "PendingGuide"
                    ? "Pending Guide"
                    : team.state === "PendingCoordinator"
                    ? "Pending Coordinator"
                    : team.state;

                const displayRepo = team.githubUrl
                  ? team.githubUrl.replace(/^https?:\/\//, "")
                  : "github.com/sistec-cse/iot-energy-monitor";

                return (
                  <Card
                    key={team.id}
                    className="hover:border-slate-300 transition-all cursor-pointer group"
                    onClick={() => setInspectingTeam(team)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-brand-primary bg-brand-primary-tint px-2 py-0.5 rounded border border-brand-primary-border">
                            {team.teamCode}
                          </span>
                          {((team.missedLogsCount !== undefined && team.missedLogsCount >= 2) ||
                            team.health === "AtRisk") && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              At Risk (2+ Missed Logs)
                            </span>
                          )}
                        </div>
                        <Badge variant={team.state === "Active" ? "success" : "warning"} size="sm" dot>
                          {formattedState}
                        </Badge>
                      </div>
                      <CardTitle className="pt-2 text-sm group-hover:text-brand-primary transition-colors">
                        {team.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">{team.abstract}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3.5 text-xs">
                      {/* Sprint Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#64748B]">Sprint Completion:</span>
                          <span className="font-mono font-bold text-brand-primary">
                            {doneTasks} of {totalTasks} Tasks ({completionPct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-primary rounded-full transition-all duration-300"
                            style={{ width: `${completionPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Members */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-[#64748B]">Enrolled Students:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {team.members.map((m) => (
                            <span
                              key={m.id}
                              className="px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0] font-mono text-[11px]"
                            >
                              {m.name} {m.isLead && "(Lead)"}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Links & Activity */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-[#E2E8F0]">
                        <span className="text-xs text-[#475569] flex items-center gap-1.5 font-mono truncate max-w-[200px]">
                          <GithubIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{displayRepo}</span>
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {team.weeklyLogs.length} Weekly Logs
                          </span>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectingTeam(team);
                            }}
                            className="text-xs"
                          >
                            Inspect &rarr;
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LIVE VIVA GRADING PANEL                                            */}
      {/* ========================================================================= */}
      {activeTab === "grading" && (
        <div className="space-y-4">
          {/* Multi-Team Defense Switcher & Conflict-of-Interest Bar */}
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-xs font-bold font-heading text-slate-800 whitespace-nowrap">
                Select Assigned Defense Team:
              </span>
              <select
                value={selectedDefenseTeamId}
                onChange={(e) => handleSelectDefenseTeam(e.target.value)}
                className="h-9 px-3 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-brand-primary cursor-pointer"
              >
                {assignedDefenseTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.teamCode} — {t.title} ({t.leadName})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-800">
                <ShieldCheck className="h-4 w-4 text-emerald-600 stroke-[2] shrink-0" />
                <span>Conflict-of-Interest Verified (Non-Guide Evaluator)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Panel: Project Details & Metrics (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-brand-primary bg-brand-primary-tint px-2 py-0.5 rounded border border-brand-primary-border">
                      {currentDefenseTeam.teamCode}
                    </span>
                    <Badge variant={isCurrentDefenseLocked ? "success" : "warning"} size="sm" dot>
                      {isCurrentDefenseLocked ? "Evaluation Finalized" : "In Defense"}
                    </Badge>
                  </div>
                  <CardTitle className="pt-2 text-sm">{currentDefenseTeam.title}</CardTitle>
                  <CardDescription>
                    Minor Project Phase-1: Mid-Term Defense &amp; Hardware Demonstration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div>
                    <span className="font-semibold text-[#0F172A]">Problem Abstract:</span>
                    <p className="text-[#475569] mt-1 leading-relaxed">
                      {currentDefenseTeam.abstract}
                    </p>
                  </div>

                  <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">Assigned Faculty Guide:</span>
                      <span className="font-semibold text-slate-900">{currentDefenseTeam.guideName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">Git Repository Activity:</span>
                      <span className="font-mono font-bold text-[#0F172A]">{currentDefenseTeam.commits}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">Friday Check-In Attendance:</span>
                      <span className="font-mono font-bold text-emerald-700">{currentDefenseTeam.attendance}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">UN SDG Target:</span>
                      <span className="font-bold text-emerald-800">{currentDefenseTeam.domain}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-semibold text-[#0F172A]">Student Team Members:</span>
                    <div className="space-y-1 font-mono text-[11px]">
                      {currentDefenseTeam.members.map((m) => (
                        <div key={m.usn} className="p-2 rounded bg-white border border-[#E2E8F0] flex justify-between">
                          <div>
                            <span className="font-semibold text-slate-900">{m.name}</span>
                            <span className="text-slate-400 ml-1.5 font-normal">({m.usn})</span>
                          </div>
                          <span className="text-[#64748B]">{m.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel: Rubric Score Inputs (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Card 1: Shared Project Defense Rubric (60% Weight) */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>{activeRubric.title}</CardTitle>
                      <Badge variant="neutral" size="sm">
                        60% Shared Weight
                      </Badge>
                    </div>
                    <CardDescription>
                      Shared team rubric criteria mapped to NBA Course Outcomes (CO1–CO4).
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-[#64748B]">Shared Total (60%):</span>
                    <div className="text-xl font-mono font-bold text-brand-primary tabular-nums">
                      {((totalScore / activeRubric.totalMarks) * 60).toFixed(1)} / 60
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({totalScore} / {activeRubric.totalMarks} raw)
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeRubric.criteria.map((crit) => (
                    <div
                      key={crit.id}
                      className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#0F172A]">{crit.name}</span>
                            <span className="font-mono text-[10px] font-bold bg-brand-primary-tint text-brand-primary px-1.5 py-0.2 rounded border border-brand-primary-border">
                              {crit.nbaCriterionCode}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#64748B]">{crit.description}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 pl-3">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={crit.maxScore}
                            disabled={isCurrentDefenseLocked}
                            value={scores[crit.id] ?? 0}
                            onChange={(e) =>
                              handleScoreChange(crit.id, parseFloat(e.target.value) || 0, crit.maxScore)
                            }
                            className="w-16 h-8 text-center font-mono font-bold text-xs bg-white rounded border border-[#CBD5E1] text-[#0F172A] focus:border-brand-primary focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-500"
                          />
                          <span className="text-xs font-mono text-[#64748B]">/ {crit.maxScore}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Card 2: Individual Student Assessment Matrix (40% Weight) */}
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>Individual Student Assessment Matrix</CardTitle>
                      <Badge variant="neutral" size="sm">
                        40% Individual Weight
                      </Badge>
                    </div>
                    <CardDescription>
                      Assign distinct marks per student based on module ownership (15m), viva defense (15m), and log discipline (10m).
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 font-medium">Max Individual:</span>
                    <div className="text-sm font-mono font-bold text-slate-800">40 Marks</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {currentDefenseTeam.members.map((m) => {
                      const ind = individualScores[m.usn] || { moduleOwnership: 13.0, vivaScore: 12.5, logDiscipline: 8.5 };
                      const indivTotal = Number((ind.moduleOwnership + ind.vivaScore + ind.logDiscipline).toFixed(1));
                      const sharedScaled = Number(((totalScore / activeRubric.totalMarks) * 60).toFixed(1));
                      const finalTotal = Number((sharedScaled + indivTotal).toFixed(1));

                      return (
                        <div
                          key={m.usn}
                          className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-[#0F172A]">{m.name}</span>
                                <span className="font-mono text-[11px] text-[#64748B]">({m.usn})</span>
                              </div>
                              <span className="text-[11px] text-slate-500">{m.role}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                {m.logs ?? 4} Logs Verified
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-300 font-mono">
                                <GitCommit className="h-3 w-3 text-slate-600" />
                                {m.commits ?? 20} Commits
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-[#E2E8F0]/80">
                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                Module Ownership (/15)
                              </label>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="15"
                                disabled={isCurrentDefenseLocked}
                                value={ind.moduleOwnership}
                                onChange={(e) =>
                                  setIndividualScores({
                                    ...individualScores,
                                    [m.usn]: {
                                      ...ind,
                                      moduleOwnership: Math.min(15, Math.max(0, parseFloat(e.target.value) || 0)),
                                    },
                                  })
                                }
                                className="w-full h-8 text-center font-mono font-bold text-xs bg-white rounded border border-[#CBD5E1] text-[#0F172A] focus:border-brand-primary focus:outline-hidden disabled:bg-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                Viva Q&amp;A (/15)
                              </label>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="15"
                                disabled={isCurrentDefenseLocked}
                                value={ind.vivaScore}
                                onChange={(e) =>
                                  setIndividualScores({
                                    ...individualScores,
                                    [m.usn]: {
                                      ...ind,
                                      vivaScore: Math.min(15, Math.max(0, parseFloat(e.target.value) || 0)),
                                    },
                                  })
                                }
                                className="w-full h-8 text-center font-mono font-bold text-xs bg-white rounded border border-[#CBD5E1] text-[#0F172A] focus:border-brand-primary focus:outline-hidden disabled:bg-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                Log Discipline (/10)
                              </label>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="10"
                                disabled={isCurrentDefenseLocked}
                                value={ind.logDiscipline}
                                onChange={(e) =>
                                  setIndividualScores({
                                    ...individualScores,
                                    [m.usn]: {
                                      ...ind,
                                      logDiscipline: Math.min(10, Math.max(0, parseFloat(e.target.value) || 0)),
                                    },
                                  })
                                }
                                className="w-full h-8 text-center font-mono font-bold text-xs bg-white rounded border border-[#CBD5E1] text-[#0F172A] focus:border-brand-primary focus:outline-hidden disabled:bg-slate-100"
                              />
                            </div>
                            <div className="flex flex-col justify-end">
                              <span className="text-[10px] text-slate-500">Student Final Score:</span>
                              <div className="font-mono text-sm font-bold text-brand-primary tabular-nums">
                                {finalTotal} / 100
                                <span className="text-[10px] font-normal text-slate-500 ml-1">
                                  ({indivTotal} ind + {sharedScaled} team)
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Textarea
                    label="Panel Evaluator Remarks & Recommendations"
                    rows={2}
                    disabled={isCurrentDefenseLocked}
                    value={vivaFeedback}
                    onChange={(e) => setVivaFeedback(e.target.value)}
                    placeholder="Note specific suggestions for the team..."
                  />

                  <div className="pt-2 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-[11px] text-[#64748B]">
                      Blended scores (60% team + 40% individual) feed SAR Criterion 3 attainment and student marksheets.
                    </span>
                    <Button
                      size="md"
                      variant="primary"
                      disabled={isCurrentDefenseLocked}
                      onClick={handleSubmitMarks}
                      leftIcon={<Lock className="h-4 w-4 stroke-[1.75]" />}
                    >
                      {isCurrentDefenseLocked ? "Marks Locked & Attested" : "Submit & Lock Panel Marks"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Review Weekly Log Slide-Over Drawer */}
      <SlideOverDrawer
        isOpen={!!inspectingLog}
        onClose={() => setInspectingLog(null)}
        title={`Week ${inspectingLog?.weekNumber} Check-In Review`}
        subtitle={`${inspectingLog?.studentName} • ${inspectingLog?.dateSubmitted}`}
        footer={
          inspectingLog && (
            <div className="flex items-center justify-between w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  reviewWeeklyLog(inspectingLog.id, "NeedsRevision", guideRemarks);
                  showToast(`Revision requested for Week ${inspectingLog.weekNumber} logbook.`);
                  setInspectingLog(null);
                }}
                className="text-amber-700 hover:bg-amber-50"
              >
                Request Revision
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  reviewWeeklyLog(inspectingLog.id, "Approved", guideRemarks || "Approved by guide.");
                  showToast(`Week ${inspectingLog.weekNumber} logbook verified & signed.`);
                  setInspectingLog(null);
                }}
                leftIcon={<Check className="h-3.5 w-3.5 stroke-[2]" />}
              >
                Verify &amp; Sign Logbook
              </Button>
            </div>
          )
        }
      >
        {inspectingLog && (
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[#0F172A]">Accomplishments this Week:</span>
              <p className="text-xs text-[#475569] p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] leading-relaxed">
                {inspectingLog.accomplishments}
              </p>
            </div>

            {inspectingLog.blockers && (
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Blockers / Impediments Encountered:
                </span>
                <p className="text-xs text-[#475569] p-3 rounded-lg bg-amber-50/50 border border-amber-200 leading-relaxed">
                  {inspectingLog.blockers}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-xs font-bold text-[#0F172A]">Planned for Next Week:</span>
              <p className="text-xs text-[#475569] p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] leading-relaxed">
                {inspectingLog.plannedNextWeek}
              </p>
            </div>

            <div className="flex justify-between items-center text-xs p-2.5 rounded bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]">
              <span>Logged Engineering Time:</span>
              <span className="font-mono font-bold tabular-nums">{inspectingLog.hoursSpent} Hours</span>
            </div>

            <Textarea
              label="Faculty Guide Feedback &amp; Recommendations"
              value={guideRemarks}
              onChange={(e) => setGuideRemarks(e.target.value)}
              placeholder="Add mentor feedback or hardware recommendations..."
              rows={3}
            />
          </div>
        )}
      </SlideOverDrawer>

      {/* Inspect Team Progress Slide-Over Drawer */}
      <SlideOverDrawer
        isOpen={!!inspectingTeam}
        onClose={() => setInspectingTeam(null)}
        title={inspectingTeam ? `${inspectingTeam.teamCode} — ${inspectingTeam.title}` : "Team Progress"}
        subtitle={`Guide: ${inspectingTeam?.guideName || "Prof. S. K. Verma"} • State: ${inspectingTeam?.state}`}
        footer={
          <div className="flex items-center justify-end w-full">
            <Button variant="secondary" size="sm" onClick={() => setInspectingTeam(null)}>
              Close Inspection
            </Button>
          </div>
        }
      >
        {inspectingTeam && (
          <div className="space-y-5 text-xs">
            {/* Abstract */}
            <div className="space-y-1">
              <span className="font-bold text-[#0F172A]">Project Abstract:</span>
              <p className="text-[#475569] leading-relaxed p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                {inspectingTeam.abstract}
              </p>
            </div>

            {/* Sprint Completion Progress */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-800">Sprint Completion Rate:</span>
                <span className="font-mono font-bold text-brand-primary">
                  {inspectingTeam.tasks?.filter((t) => t.status === "Done").length || 2} of {inspectingTeam.tasks?.length || 4} Tasks (50%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-brand-primary rounded-full" style={{ width: "50%" }} />
              </div>
            </div>

            {/* Linked VCS Repository Commits */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <GitCommit className="h-4 w-4 text-brand-primary" strokeWidth={1.75} />
                Repository Activity Telemetry
              </span>
              <p className="text-[11px] text-slate-600">
                Connected to <span className="font-mono font-bold text-slate-800">{inspectingTeam.githubUrl || "github.com/sistec-cse/iot-energy-monitor"}</span>
              </p>
              <div className="text-[10px] text-emerald-700 font-mono pt-1">
                48 commits on master • Last pushed 3 hours ago (Verified)
              </div>
            </div>

            {/* Team Roster */}
            <div className="space-y-2">
              <span className="font-bold text-[#0F172A] flex items-center gap-1.5">
                <Users2 className="h-4 w-4 text-brand-primary" strokeWidth={1.75} />
                Enrolled Team Members ({inspectingTeam.members.length})
              </span>
              <div className="space-y-1.5">
                {inspectingTeam.members.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-lg border border-[#E2E8F0] bg-white flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                        <span>{m.name}</span>
                        {m.isLead && (
                          <span className="text-[10px] bg-brand-primary-tint text-brand-primary font-bold px-1.5 py-0.2 rounded border border-brand-primary-border">
                            Team Lead
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#64748B] font-mono">{m.enrollmentNumber}</div>
                    </div>
                    <span className="text-[11px] text-[#475569] font-medium">{m.roleDescription}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Log History */}
            <div className="space-y-2">
              <span className="font-bold text-[#0F172A] flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-brand-primary" strokeWidth={1.75} />
                Weekly Logbook History ({inspectingTeam.weeklyLogs.length})
              </span>
              <div className="space-y-2">
                {inspectingTeam.weeklyLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg border border-[#E2E8F0] bg-white space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-brand-primary">Week {log.weekNumber}</span>
                      <Badge
                        variant={log.guideStatus === "Approved" ? "success" : "warning"}
                        size="sm"
                        dot
                      >
                        {log.guideStatus}
                      </Badge>
                    </div>
                    <p className="text-[#475569]">{log.accomplishments}</p>
                    <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1 border-t border-[#F1F5F9]">
                      <span>Author: {log.studentName}</span>
                      <span className="font-mono tabular-nums">{log.hoursSpent} Hours</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* Proposal Revision Modal */}
      {proposalRevisionTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 stroke-[2]" />
                <h3 className="text-sm font-bold font-heading text-slate-900">
                  Request Proposal Revision
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProposalRevisionTeam(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleProposalRevisionSubmit} className="mt-4 space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-700">Team Code:</span>
                <span className="ml-2 font-mono text-xs font-bold text-brand-primary">
                  {proposalRevisionTeam.teamCode}
                </span>
                <p className="text-xs text-slate-600 mt-1 font-medium">{proposalRevisionTeam.title}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Faculty Guide Revision Remarks
                </label>
                <textarea
                  required
                  rows={4}
                  value={revisionRemarks}
                  onChange={(e) => setRevisionRemarks(e.target.value)}
                  placeholder="e.g. Please specify the sensor telemetry polling frequency and add hardware failover diagrams before resubmitting."
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-brand-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setProposalRevisionTeam(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="bg-amber-700 hover:bg-amber-800"
                >
                  Send Revision Notice
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Idea Modal */}
      <Modal
        isOpen={showPostIdeaModal}
        onClose={() => setShowPostIdeaModal(false)}
        title="Post Project Idea to Campus Problem Bank"
        description="Students looking for capstone projects can explore and apply to work under your faculty guidance."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setShowPostIdeaModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handlePostIdea}>
              Publish Idea
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5">
          <Input
            label="Project Title"
            placeholder="e.g. Edge AI Waste Segregation System"
            value={ideaTitle}
            onChange={(e) => setIdeaTitle(e.target.value)}
          />
          <Textarea
            label="Problem Synopsis &amp; Technical Challenge"
            placeholder="Explain the engineering problem, hardware/software stack, and expected deliverables..."
            value={ideaAbstract}
            onChange={(e) => setIdeaAbstract(e.target.value)}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Domain"
              value={ideaDomain}
              onChange={(e) => setIdeaDomain(e.target.value)}
              options={[
                { label: "IoT & Smart Systems", value: "IoT & Smart Systems" },
                { label: "Computer Vision & AI", value: "Computer Vision & AI" },
                { label: "Cloud & Distributed Systems", value: "Cloud & Distributed Systems" },
                { label: "Robotics & Hardware", value: "Robotics & Hardware" },
              ]}
            />
            <Select
              label="Target UN SDG"
              value={ideaSdg}
              onChange={(e) => setIdeaSdg(e.target.value)}
              options={[
                { label: "SDG 3: Good Health", value: "3" },
                { label: "SDG 7: Clean Energy", value: "7" },
                { label: "SDG 9: Industry & Innovation", value: "9" },
                { label: "SDG 11: Sustainable Cities", value: "11" },
                { label: "SDG 13: Climate Action", value: "13" },
              ]}
            />
          </div>
        </div>
      </Modal>
    </AppShell>
  );
};
