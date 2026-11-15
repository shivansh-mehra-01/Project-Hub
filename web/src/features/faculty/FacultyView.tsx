"use client";

import React, { useState } from "react";
import {
  FileCheck2,
  Users2,
  GraduationCap,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  Check,
  X,
  Lock,
  Sparkles,
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
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { WeeklyLog } from "@/mocks/store-types";
import { GithubIcon } from "@/design-system/components/Icons";

export const FacultyView: React.FC = () => {
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
  } = useProjectHubStore();

  const [activeTab, setActiveTab] = useState<"queue" | "teams" | "grading">("queue");
  const [inspectingLog, setInspectingLog] = useState<WeeklyLog | null>(null);
  const [guideRemarks, setGuideRemarks] = useState("");
  const [showPostIdeaModal, setShowPostIdeaModal] = useState(false);

  // New Idea form state
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaAbstract, setIdeaAbstract] = useState("");
  const [ideaDomain, setIdeaDomain] = useState("IoT & Smart Systems");
  const [ideaSdg, setIdeaSdg] = useState("7");

  // Live Viva Grading state
  const selectedEval = evaluations[0];
  const activeRubric = rubrics[0];
  const [scores, setScores] = useState<Record<string, number>>({
    "crit-01": 9,
    "crit-02": 14,
    "crit-03": 13,
    "crit-04": 8.5,
  });
  const [vivaFeedback, setVivaFeedback] = useState("Solid prototype hardware demo.");
  const [isLocked, setIsLocked] = useState(false);

  // Filter teams mentored by this faculty or sample
  const myGuidedTeams = teams.filter((t) => t.guideId === "usr-fac-verma" || t.guideId === currentPersona.id);

  // Action Queue items: unreviewed weekly logs and pending proposals
  const pendingLogs = teams.flatMap((t) =>
    t.weeklyLogs
      .filter((l) => l.guideStatus === "Pending")
      .map((l) => ({ ...l, teamCode: t.teamCode, projectTitle: t.title }))
  );

  const pendingProposals = teams.filter((t) => t.state === "PendingGuide");

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  const handleScoreChange = (critId: string, val: number, max: number) => {
    const clamped = Math.min(Math.max(0, val), max);
    setScores((prev) => ({ ...prev, [critId]: clamped }));
  };

  const handleSubmitMarks = () => {
    if (selectedEval) {
      submitEvaluationScores(selectedEval.id, scores, vivaFeedback);
      lockEvaluation(selectedEval.id);
      setIsLocked(true);
      setTimeout(() => setIsLocked(false), 3000);
    }
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
    setShowPostIdeaModal(false);
    setIdeaTitle("");
    setIdeaAbstract("");
  };

  return (
    <AppShell pageTitle="Faculty Academic Workspace" breadcrumb="Mentorship & Evaluation Console">
      {/* 3 Primary Faculty Tabs */}
      <div className="flex border-b border-[#E2E8F0] gap-4 text-xs font-semibold select-none">
        <button
          type="button"
          onClick={() => setActiveTab("queue")}
          className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "queue"
              ? "border-b-2 border-[#4F46E5] text-[#4F46E5]"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          <span>Priority Action Queue</span>
          {pendingLogs.length + pendingProposals.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {pendingLogs.length + pendingProposals.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("teams")}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeTab === "teams"
              ? "border-b-2 border-[#4F46E5] text-[#4F46E5]"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          My Mentored Teams ({myGuidedTeams.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("grading")}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeTab === "grading"
              ? "border-b-2 border-[#4F46E5] text-[#4F46E5]"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          Live Viva Grading Panel
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ACTION QUEUE                                                       */}
      {/* ========================================================================= */}
      {activeTab === "queue" && (
        <div className="space-y-6">
          {/* Pending Weekly Logs Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Friday Weekly Check-Ins Awaiting Review</CardTitle>
                <CardDescription>
                  Review student logbook submissions, record guidance, and approve engineering progress.
                </CardDescription>
              </div>
              <Badge variant="warning" size="sm" dot>
                {pendingLogs.length} Pending
              </Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Team Code</th>
                    <th className="py-2.5 px-4 font-semibold">Student Author</th>
                    <th className="py-2.5 px-4 font-semibold">Week #</th>
                    <th className="py-2.5 px-4 font-semibold">Accomplishments Summary</th>
                    <th className="py-2.5 px-4 font-semibold">Hours</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                  {pendingLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-4 font-mono font-bold text-[#4F46E5]">{log.teamCode}</td>
                      <td className="py-2.5 px-4 font-semibold">{log.studentName}</td>
                      <td className="py-2.5 px-4 font-mono tabular-nums">Week {log.weekNumber}</td>
                      <td className="py-2.5 px-4 max-w-xs truncate text-[#475569]">
                        {log.accomplishments}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums">{log.hoursSpent} hrs</td>
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

                  {pendingLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-[#64748B]">
                        All Friday student weekly logs have been reviewed and approved.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Pending Proposal Endorsements Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Proposal Endorsements</CardTitle>
                <CardDescription>
                  New team project proposals awaiting your endorsement as designated Guide.
                </CardDescription>
              </div>
              <Badge variant="warning" size="sm" dot>
                {pendingProposals.length} Pending
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingProposals.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#4F46E5]">{t.teamCode}</span>
                      <h4 className="text-xs font-bold text-[#0F172A]">{t.title}</h4>
                      <Badge variant="sdg" sdgNumber={t.sdgNumber} size="sm">
                        {t.domain}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#475569] line-clamp-1">{t.abstract}</p>
                    <div className="text-[11px] text-[#64748B]">
                      Lead: {t.members.find((m) => m.isLead)?.name} ({t.members.length} members)
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => approveProposal(t.id, "Faculty")}
                      leftIcon={<Check className="h-3.5 w-3.5" />}
                    >
                      Endorse Proposal
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => rejectProposal(t.id, "Requires revision")}
                    >
                      Request Revisions
                    </Button>
                  </div>
                </div>
              ))}

              {pendingProposals.length === 0 && (
                <div className="py-6 text-center text-xs text-[#64748B]">
                  No pending proposals requiring guide endorsement.
                </div>
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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Mentored Project Teams</h3>
              <p className="text-xs text-[#64748B]">
                Track team milestone progress, weekly log submissions, and GitHub activity.
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setShowPostIdeaModal(true)}
            >
              Post Idea to Problem Bank
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myGuidedTeams.map((team) => (
              <Card key={team.id} className="hover:border-[#CBD5E1] transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-[#4F46E5] bg-[#EEF2FF] px-2 py-0.5 rounded border border-indigo-100">
                      {team.teamCode}
                    </span>
                    <Badge variant={team.health === "Healthy" ? "success" : "warning"} size="sm" dot>
                      {team.state}
                    </Badge>
                  </div>
                  <CardTitle className="pt-2 text-sm">{team.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{team.abstract}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
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
                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                    {team.githubUrl ? (
                      <a
                        href={team.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#475569] hover:text-[#4F46E5] flex items-center gap-1 font-mono"
                      >
                        <GithubIcon className="h-3.5 w-3.5" />
                        <span>github.com/repo</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-[#94A3B8]">No repo linked</span>
                    )}

                    <span className="text-[11px] font-semibold text-emerald-600">
                      {team.weeklyLogs.length} Weekly Logs Approved
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LIVE VIVA GRADING PANEL                                            */}
      {/* ========================================================================= */}
      {activeTab === "grading" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Project Details & Metrics (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-[#4F46E5] bg-[#EEF2FF] px-2 py-0.5 rounded">
                    {selectedEval.teamCode}
                  </span>
                  <Badge variant="info" size="sm">
                    In Defense
                  </Badge>
                </div>
                <CardTitle className="pt-2 text-sm">{selectedEval.teamTitle}</CardTitle>
                <CardDescription>
                  Minor Project Phase-1: Mid-Term Defense &amp; Hardware Demonstration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div>
                  <span className="font-semibold text-[#0F172A]">Problem Abstract:</span>
                  <p className="text-[#475569] mt-1 leading-relaxed">
                    Edge telemetric hardware monitoring energy dissipation across university labs with
                    LSTM anomaly prediction.
                  </p>
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Git Commits:</span>
                    <span className="font-mono font-bold text-[#0F172A]">48 commits (Verified)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Friday Check-In Attendance:</span>
                    <span className="font-mono font-bold text-emerald-600">100% (5/5 weeks)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">UN SDG Target:</span>
                    <span className="font-bold text-emerald-700">SDG 7 (Clean Energy)</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-semibold text-[#0F172A]">Student Team Members:</span>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="p-2 rounded bg-white border border-[#E2E8F0] flex justify-between">
                      <span>Shivansh Mehra (Lead)</span>
                      <span className="text-[#64748B]">Firmware 40%</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-[#E2E8F0] flex justify-between">
                      <span>Aarav Sharma</span>
                      <span className="text-[#64748B]">ML Pipeline 35%</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-[#E2E8F0] flex justify-between">
                      <span>Diya Patel</span>
                      <span className="text-[#64748B]">UI Dashboard 25%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Rubric Score Inputs (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>{activeRubric.title}</CardTitle>
                  <CardDescription>
                    Marks are directly attributed to NBA PO/PSO Course Outcomes.
                  </CardDescription>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-[#64748B]">Total Score:</span>
                  <div className="text-xl font-mono font-bold text-[#4F46E5] tabular-nums">
                    {totalScore} / {activeRubric.totalMarks}
                  </div>
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
                          <span className="font-mono text-[10px] font-bold bg-[#EEF2FF] text-[#4F46E5] px-1.5 py-0.2 rounded border border-indigo-100">
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
                          value={scores[crit.id] ?? 0}
                          onChange={(e) =>
                            handleScoreChange(crit.id, parseFloat(e.target.value) || 0, crit.maxScore)
                          }
                          className="w-16 h-8 text-center font-mono font-bold text-xs bg-white rounded border border-[#CBD5E1] text-[#0F172A] focus:border-[#4F46E5] focus:outline-none"
                        />
                        <span className="text-xs font-mono text-[#64748B]">/ {crit.maxScore}</span>
                      </div>
                    </div>
                  </div>
                ))}

                <Textarea
                  label="Panel Evaluator General Remarks & Recommendations"
                  rows={2}
                  value={vivaFeedback}
                  onChange={(e) => setVivaFeedback(e.target.value)}
                  placeholder="Note specific suggestions for final major project phase..."
                />

                <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-[11px] text-[#64748B]">
                    Scores automatically feed Criterion 3 attainment formulas.
                  </span>
                  <Button
                    size="md"
                    variant="primary"
                    onClick={handleSubmitMarks}
                    leftIcon={<Lock className="h-4 w-4" />}
                  >
                    {isLocked ? "Marks Locked & Saved!" : "Submit & Lock Panel Marks"}
                  </Button>
                </div>
              </CardContent>
            </Card>
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
                  setInspectingLog(null);
                }}
              >
                Request Revision
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  reviewWeeklyLog(inspectingLog.id, "Approved", guideRemarks || "Approved by guide.");
                  setInspectingLog(null);
                }}
                leftIcon={<Check className="h-3.5 w-3.5" />}
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

            <div className="flex justify-between items-center text-xs p-2.5 rounded bg-[#EEF2FF] border border-indigo-100 text-[#3730A3]">
              <span>Logged Engineering Time:</span>
              <span className="font-mono font-bold tabular-nums">{inspectingLog.hoursSpent} Hours</span>
            </div>

            <Textarea
              label="Guide Feedback & Guidance Remarks"
              value={guideRemarks}
              onChange={(e) => setGuideRemarks(e.target.value)}
              placeholder="Add mentor feedback or hardware recommendations..."
              rows={3}
            />
          </div>
        )}
      </SlideOverDrawer>

      {/* Post Idea Modal */}
      <Modal
        isOpen={showPostIdeaModal}
        onClose={() => setShowPostIdeaModal(false)}
        title="Post Project Idea to Campus Problem Bank"
        description="Students looking for project proposals can explore and apply to work under your guidance."
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
            label="Problem Synopsis & Technical Challenge"
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
