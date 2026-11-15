"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Users2,
  GraduationCap,
  Sliders,
  FolderArchive,
  Download,
  Unlock,
  Check,
  X,
  Eye,
  FileSpreadsheet,
  FileArchive,
  HelpCircle,
  Search,
} from "lucide-react";
import { AppShell } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { Team } from "@/mocks/store-types";

export const HODView: React.FC = () => {
  const {
    teams,
    facultyRoster,
    evaluations,
    toggleFacultyCoordinator,
    approveProposal,
    rejectProposal,
    approveGradeUnlock,
    rejectGradeUnlock,
  } = useProjectHubStore();

  const [activeTab, setActiveTab] = useState<"overview" | "approvals" | "nba" | "faculty">("overview");
  const [approvalSubTab, setApprovalSubTab] = useState<"allotments" | "proposals" | "unlocks" | "results">(
    "allotments"
  );
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [inspectingTeam, setInspectingTeam] = useState<Team | null>(null);
  const [zipPackaging, setZipPackaging] = useState(false);
  const [zipSuccess, setZipSuccess] = useState(false);
  const [unlockRejected, setUnlockRejected] = useState(false);

  // Multi-Year Archive state
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveBatch, setArchiveBatch] = useState("ALL");

  // Sync tab with URL hash
  useEffect(() => {
    const handleHashSync = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "approvals" || hash === "nba" || hash === "faculty") {
        setActiveTab(hash);
      } else if (!hash || hash === "overview") {
        setActiveTab("overview");
      }
    };
    handleHashSync();
    window.addEventListener("hashchange", handleHashSync);
    return () => window.removeEventListener("hashchange", handleHashSync);
  }, []);

  const switchTab = (tab: "overview" | "approvals" | "nba" | "faculty") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", tab === "overview" ? "/hod" : `/hod#${tab}`);
    }
  };

  // Teams waiting for HOD sign-off
  const pendingHODTeams = teams.filter((t) => t.state === "PendingHOD");
  const allPendingApprovals = teams.filter(
    (t) => t.state === "PendingHOD" || t.state === "PendingCoordinator"
  );

  const toggleSelectTeam = (id: string) => {
    if (selectedTeamIds.includes(id)) {
      setSelectedTeamIds(selectedTeamIds.filter((tId) => tId !== id));
    } else {
      setSelectedTeamIds([...selectedTeamIds, id]);
    }
  };

  const handleBulkSignOff = () => {
    selectedTeamIds.forEach((id) => approveProposal(id, "HOD"));
    setSelectedTeamIds([]);
  };

  const handleGenerateZip = () => {
    setZipPackaging(true);
    setTimeout(() => {
      setZipPackaging(false);
      setZipSuccess(true);
      setTimeout(() => setZipSuccess(false), 4000);
    }, 1200);
  };

  return (
    <AppShell pageTitle="HOD Executive Workspace" breadcrumb="Department of Computer Science & Engineering">
      {/* 4 Navigation Sub-Tabs */}
      <div className="flex border-b border-[#E2E8F0] gap-4 text-xs font-semibold select-none">
        <button
          type="button"
          onClick={() => switchTab("overview")}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeTab === "overview"
              ? "border-b-2 border-[#4F46E5] text-[#4F46E5]"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          Executive Overview
        </button>
        <button
          type="button"
          onClick={() => switchTab("approvals")}
          className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "approvals"
              ? "border-b-2 border-[#4F46E5] text-[#4F46E5]"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          <span>Approvals Queue</span>
          {pendingHODTeams.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {pendingHODTeams.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => switchTab("nba")}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeTab === "nba"
              ? "border-b-2 border-[#4F46E5] text-[#4F46E5]"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          NBA Criterion 2 &amp; 3 Dossier
        </button>
        <button
          type="button"
          onClick={() => switchTab("faculty")}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeTab === "faculty"
              ? "border-b-2 border-[#4F46E5] text-[#4F46E5]"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          Faculty Setup &amp; Coordinator Toggles
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXECUTIVE OVERVIEW                                                 */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* 4 Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-[#64748B]">Minor Projects (Sem 6)</span>
                  <div className="text-xl font-bold text-[#0F172A] tabular-nums">24 Teams</div>
                  <span className="text-[10px] text-emerald-600 font-medium">96 Students Enrolled</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <FileCheck2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-[#64748B]">Major Projects (Sem 8)</span>
                  <div className="text-xl font-bold text-[#0F172A] tabular-nums">32 Teams</div>
                  <span className="text-[10px] text-emerald-600 font-medium">Phase-2 Final Viva</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-[#64748B]">Pending HOD Sign-Offs</span>
                  <div className="text-xl font-bold text-amber-700 tabular-nums">
                    {pendingHODTeams.length} Batches
                  </div>
                  <span className="text-[10px] text-amber-600 font-medium">Awaiting endorsement</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-[#64748B]">Guide Capacity Balance</span>
                  <div className="text-xl font-bold text-emerald-600 tabular-nums">100% Balanced</div>
                  <span className="text-[10px] text-[#64748B]">Max 4-5 teams / mentor</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Users2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Batch Lifecycle Funnel Progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Department Project Lifecycle Funnel</CardTitle>
              <CardDescription>
                State distribution of teams advancing from initial proposal to locked NBA attainment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-[#64748B] uppercase font-bold">1. Draft</div>
                  <div className="text-lg font-bold text-[#0F172A] tabular-nums">1</div>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="text-[10px] text-amber-800 uppercase font-bold">2. Guide Review</div>
                  <div className="text-lg font-bold text-amber-900 tabular-nums">1</div>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="text-[10px] text-blue-800 uppercase font-bold">3. Coordinator</div>
                  <div className="text-lg font-bold text-blue-900 tabular-nums">0</div>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
                  <div className="text-[10px] text-purple-800 uppercase font-bold">4. HOD Queue</div>
                  <div className="text-lg font-bold text-purple-900 tabular-nums">
                    {pendingHODTeams.length}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="text-[10px] text-emerald-800 uppercase font-bold">5. Active Build</div>
                  <div className="text-lg font-bold text-emerald-900 tabular-nums">1</div>
                </div>
                <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                  <div className="text-[10px] text-indigo-800 uppercase font-bold">6. Completed</div>
                  <div className="text-lg font-bold text-indigo-900 tabular-nums">0</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guide Workload Distribution Table */}
          <Card>
            <CardHeader>
              <CardTitle>Faculty Guide Workload Matrix</CardTitle>
              <CardDescription>
                Faculty members assigned to guide Minor &amp; Major project teams.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Faculty Name</th>
                    <th className="py-2.5 px-4 font-semibold">Designation</th>
                    <th className="py-2.5 px-4 font-semibold">Assigned Teams</th>
                    <th className="py-2.5 px-4 font-semibold">Max Quota</th>
                    <th className="py-2.5 px-4 font-semibold">Coordinator Flag</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                  {facultyRoster.map((f) => (
                    <tr key={f.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-4 font-semibold">{f.name}</td>
                      <td className="py-2.5 px-4 text-[#64748B]">{f.designation}</td>
                      <td className="py-2.5 px-4 font-mono tabular-nums">{f.guidedCount} Teams</td>
                      <td className="py-2.5 px-4 font-mono tabular-nums">{f.maxTeams} Teams</td>
                      <td className="py-2.5 px-4">
                        {f.isProjectCoordinator ? (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Coordinator
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#64748B]">Guide / Evaluator</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-medium tabular-nums text-emerald-600">
                        {Math.round((f.guidedCount / f.maxTeams) * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: APPROVALS QUEUE                                                    */}
      {/* ========================================================================= */}
      {activeTab === "approvals" && (
        <div className="space-y-4">
          {/* Sub-Queue Filter Tabs */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5 p-1 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0] overflow-x-auto">
              <button
                type="button"
                onClick={() => setApprovalSubTab("allotments")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  approvalSubTab === "allotments"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Guide Allotments ({pendingHODTeams.length})
              </button>
              <button
                type="button"
                onClick={() => setApprovalSubTab("proposals")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  approvalSubTab === "proposals"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                All Pending ({allPendingApprovals.length})
              </button>
              <button
                type="button"
                onClick={() => setApprovalSubTab("unlocks")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  approvalSubTab === "unlocks"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Grade Unlock Requests ({unlockRejected ? "0" : "1"})
              </button>
              <button
                type="button"
                onClick={() => setApprovalSubTab("results")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  approvalSubTab === "results"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Consolidated Results
              </button>
            </div>

            {selectedTeamIds.length > 0 && (
              <Button
                size="sm"
                variant="primary"
                onClick={handleBulkSignOff}
                leftIcon={<Check className="h-3.5 w-3.5" />}
              >
                Bulk Sign-Off ({selectedTeamIds.length} Teams)
              </Button>
            )}
          </div>

          {/* Allotment & Proposal Queue Table */}
          {approvalSubTab === "allotments" || approvalSubTab === "proposals" ? (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                    <tr>
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={
                            pendingHODTeams.length > 0 &&
                            selectedTeamIds.length === pendingHODTeams.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTeamIds(pendingHODTeams.map((t) => t.id));
                            } else {
                              setSelectedTeamIds([]);
                            }
                          }}
                          className="rounded text-[#4F46E5]"
                        />
                      </th>
                      <th className="py-3 px-4 font-semibold">Team Code</th>
                      <th className="py-3 px-4 font-semibold">Project Title</th>
                      <th className="py-3 px-4 font-semibold">Domain &amp; SDG</th>
                      <th className="py-3 px-4 font-semibold">Proposed Guide</th>
                      <th className="py-3 px-4 font-semibold">Current State</th>
                      <th className="py-3 px-4 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                    {(approvalSubTab === "allotments" ? pendingHODTeams : allPendingApprovals).map(
                      (team) => (
                        <tr key={team.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedTeamIds.includes(team.id)}
                              onChange={() => toggleSelectTeam(team.id)}
                              className="rounded text-[#4F46E5]"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-[#4F46E5]">
                            {team.teamCode}
                          </td>
                          <td className="py-3 px-4 max-w-xs font-semibold truncate">
                            {team.title}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="sdg" sdgNumber={team.sdgNumber} size="sm">
                              {team.domain}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-medium text-[#475569]">
                            {team.guideName || "Unassigned"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="warning" size="sm" dot>
                              {team.state}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setInspectingTeam(team)}
                              leftIcon={<Eye className="h-3.5 w-3.5" />}
                            >
                              Inspect
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => approveProposal(team.id, "HOD")}
                            >
                              Sign-Off
                            </Button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>

                {(approvalSubTab === "allotments" ? pendingHODTeams : allPendingApprovals).length ===
                  0 && (
                  <div className="p-6">
                    <EmptyState
                      title="No Pending Proposals"
                      description="All student capstone proposals have been reviewed and signed off by the HOD."
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ) : approvalSubTab === "unlocks" ? (
            /* Grade Unlock Requests Queue */
            <Card>
              <CardHeader>
                <CardTitle>Post-Lock Grade Correction Requests</CardTitle>
                <CardDescription>
                  Faculty requests to adjust evaluation marks after viva completion lock.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!unlockRejected ? (
                  <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#0F172A]">
                          Team 2026-CS-MIN-01: Smart IoT Energy Monitoring
                        </span>
                        <span className="text-[11px] font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200 text-amber-800">
                          Mid-Term Viva
                        </span>
                      </div>
                      <p className="text-xs text-[#475569]">
                        Requested by: <span className="font-semibold">Prof. Priya Nair</span> • Reason:{" "}
                        <em>&ldquo;Hardware sensor code demo marks were transcribed as 13/15 instead of 15/15.&rdquo;</em>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => approveGradeUnlock("eval-01")}
                        leftIcon={<Unlock className="h-3.5 w-3.5" />}
                      >
                        Authorize Unlock
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          rejectGradeUnlock("eval-01");
                          setUnlockRejected(true);
                        }}
                      >
                        Reject Request
                      </Button>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="No Active Grade Correction Requests"
                    description="All mid-term and final defense rubric marks are securely finalized."
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            /* Consolidated Results Sub-Tab */
            <Card>
              <CardHeader>
                <CardTitle>Consolidated Student Marksheet &amp; Letter Grades</CardTitle>
                <CardDescription>
                  Cumulative internal assessments, guide continuous evals, and external viva scores feeding NBA SAR Criterion 3.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">University USN</th>
                      <th className="py-2.5 px-4 font-semibold">Student Name</th>
                      <th className="py-2.5 px-4 font-semibold">Team Code</th>
                      <th className="py-2.5 px-4 font-semibold">Guide Score (/30)</th>
                      <th className="py-2.5 px-4 font-semibold">Defense Score (/50)</th>
                      <th className="py-2.5 px-4 font-semibold">Total (/100)</th>
                      <th className="py-2.5 px-4 font-semibold">Letter Grade</th>
                      <th className="py-2.5 px-4 text-right font-semibold">NBA Attainment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A] font-mono tabular-nums">
                    {[
                      { usn: "0176CS221045", name: "Shivansh Mehra", team: "2026-CS-MIN-01", guide: 28.5, viva: 44.5, total: 89.0, grade: "A+", nba: "Met (High)" },
                      { usn: "0176CS221002", name: "Aarav Sharma", team: "2026-CS-MIN-01", guide: 27.0, viva: 43.0, total: 86.0, grade: "A+", nba: "Met (High)" },
                      { usn: "0176CS221021", name: "Diya Patel", team: "2026-CS-MIN-01", guide: 26.5, viva: 42.0, total: 84.5, grade: "A", nba: "Met (Target)" },
                      { usn: "0176CS221038", name: "Rohan Gupta", team: "2026-CS-MIN-02", guide: 25.0, viva: 39.5, total: 79.0, grade: "B+", nba: "Met (Target)" },
                      { usn: "0176CS221049", name: "Sanya Saxena", team: "2026-CS-MIN-02", guide: 28.0, viva: 45.0, total: 91.0, grade: "O", nba: "Met (High)" },
                    ].map((row) => (
                      <tr key={row.usn} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-4 font-bold text-[#4F46E5]">{row.usn}</td>
                        <td className="py-2.5 px-4 font-sans font-semibold text-[#0F172A]">{row.name}</td>
                        <td className="py-2.5 px-4 text-[#475569]">{row.team}</td>
                        <td className="py-2.5 px-4">{row.guide}</td>
                        <td className="py-2.5 px-4">{row.viva}</td>
                        <td className="py-2.5 px-4 font-bold text-[#0F172A]">{row.total}</td>
                        <td className="py-2.5 px-4 font-sans">
                          <span className="font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                            {row.grade}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-sans">
                          <span className="font-semibold text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {row.nba}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: NBA CRITERION 2 & 3 DOSSIER                                        */}
      {/* ========================================================================= */}
      {activeTab === "nba" && (
        <div className="space-y-6">
          {/* Export Action Card */}
          <div className="p-5 rounded-xl border border-indigo-100 bg-[#EEF2FF] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#4F46E5]" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  NBA Accreditation Evidence Synthesis (SAR 2.2 &amp; 3.3)
                </h3>
              </div>
              <p className="text-xs text-[#475569] max-w-2xl leading-relaxed">
                Direct evidence calculation of Course Outcomes (COs) mapped to Program Outcomes (PO1–PO12)
                and Program Specific Outcomes (PSOs). Generates the official audit sample package.
              </p>
            </div>

            <Button
              size="md"
              variant="primary"
              onClick={handleGenerateZip}
              isLoading={zipPackaging}
              leftIcon={<Download className="h-4 w-4" />}
            >
              {zipSuccess ? "Downloaded NBA-Audit-Dossier.zip" : "Package 3 Best + 3 Avg + 3 Weak ZIP"}
            </Button>
          </div>

          {/* Live CO-PO Attainment Matrix */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Direct Course Outcome (CO) to PO/PSO Attainment Matrix</CardTitle>
                <CardDescription>
                  Calculated against standard 80/20 threshold benchmarks (&gt;= 70% Target Met).
                </CardDescription>
              </div>
              <Badge variant="success" size="sm" dot>
                Target Attainment Met
              </Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-center text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                  <tr>
                    <th className="py-2.5 px-3 text-left font-semibold">Course Outcome</th>
                    <th className="py-2.5 px-2 font-semibold">PO1</th>
                    <th className="py-2.5 px-2 font-semibold">PO2</th>
                    <th className="py-2.5 px-2 font-semibold">PO3</th>
                    <th className="py-2.5 px-2 font-semibold">PO4</th>
                    <th className="py-2.5 px-2 font-semibold">PO5</th>
                    <th className="py-2.5 px-2 font-semibold">PO7</th>
                    <th className="py-2.5 px-2 font-semibold">PO9</th>
                    <th className="py-2.5 px-2 font-semibold">PO10</th>
                    <th className="py-2.5 px-2 font-semibold">PSO1</th>
                    <th className="py-2.5 px-2 font-semibold">PSO2</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Attainment %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A] font-mono tabular-nums">
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-3 text-left font-sans font-semibold">
                      CO1: Problem Formulation
                    </td>
                    <td>3</td>
                    <td>3</td>
                    <td>2</td>
                    <td>2</td>
                    <td>1</td>
                    <td>-</td>
                    <td>2</td>
                    <td>2</td>
                    <td>3</td>
                    <td>2</td>
                    <td className="text-right text-emerald-600 font-bold">84.2%</td>
                  </tr>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-3 text-left font-sans font-semibold">
                      CO2: Architecture &amp; Design
                    </td>
                    <td>2</td>
                    <td>2</td>
                    <td>3</td>
                    <td>2</td>
                    <td>3</td>
                    <td>2</td>
                    <td>2</td>
                    <td>2</td>
                    <td>3</td>
                    <td>3</td>
                    <td className="text-right text-emerald-600 font-bold">81.4%</td>
                  </tr>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-3 text-left font-sans font-semibold">
                      CO3: Prototype Implementation
                    </td>
                    <td>2</td>
                    <td>1</td>
                    <td>3</td>
                    <td>3</td>
                    <td>3</td>
                    <td>2</td>
                    <td>3</td>
                    <td>3</td>
                    <td>3</td>
                    <td>3</td>
                    <td className="text-right text-emerald-600 font-bold">79.6%</td>
                  </tr>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-3 text-left font-sans font-semibold">
                      CO4: Technical Viva &amp; Ethics
                    </td>
                    <td>1</td>
                    <td>1</td>
                    <td>1</td>
                    <td>2</td>
                    <td>1</td>
                    <td>3</td>
                    <td>3</td>
                    <td>3</td>
                    <td>2</td>
                    <td>2</td>
                    <td className="text-right text-emerald-600 font-bold">85.0%</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Multi-Year Department Project Archive Card */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Multi-Year Department Project Archive &amp; SAR Evidence</CardTitle>
                <CardDescription>
                  Search past Minor &amp; Major capstone batches with signed rubrics and university marksheets.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
                  <input
                    type="text"
                    placeholder="Search projects, stack..."
                    value={archiveSearch}
                    onChange={(e) => setArchiveSearch(e.target.value)}
                    className="h-8 pl-8 pr-2.5 text-xs rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
                <select
                  value={archiveBatch}
                  onChange={(e) => setArchiveBatch(e.target.value)}
                  className="h-8 text-xs rounded-lg border border-[#E2E8F0] bg-white px-2 focus:outline-none"
                >
                  <option value="ALL">All Batches</option>
                  <option value="2026">2026 (Minor Sem 6)</option>
                  <option value="2025">2025 (Major Sem 8)</option>
                  <option value="2024">2024 (Major Sem 8)</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Batch</th>
                    <th className="py-2.5 px-4 font-semibold">Team Code</th>
                    <th className="py-2.5 px-4 font-semibold">Project Title</th>
                    <th className="py-2.5 px-4 font-semibold">Faculty Guide</th>
                    <th className="py-2.5 px-4 font-semibold">Domain &amp; SDG</th>
                    <th className="py-2.5 px-4 font-semibold">Score</th>
                    <th className="py-2.5 px-4 text-right font-semibold">SAR Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                  {[
                    { batch: "2026 Minor", code: "2026-CS-MIN-01", title: "Smart IoT Energy Monitoring for Labs", guide: "Prof. S. K. Verma", domain: "IoT (SDG 7)", score: "89.0%", status: "Active Audit" },
                    { batch: "2025 Major", code: "2025-CS-MAJ-04", title: "Automated Solar Microgrid with MPPT Tracking", guide: "Prof. S. K. Verma", domain: "Energy (SDG 7)", score: "92.0%", status: "Best Project" },
                    { batch: "2025 Major", code: "2025-CS-MAJ-11", title: "Contrastive Learning Chest X-Ray Diagnostics", guide: "Dr. Amit Rawat", domain: "Health (SDG 3)", score: "88.5%", status: "IEEE Published" },
                    { batch: "2024 Major", code: "2024-CS-MAJ-08", title: "Warehouse AGV Robot with 2D LiDAR SLAM", guide: "Prof. Priya Nair", domain: "Robotics (SDG 9)", score: "88.0%", status: "Dossier Archived" },
                    { batch: "2024 Major", code: "2024-CS-MAJ-19", title: "Decentralized University Credential Verification", guide: "Dr. R. K. Sharma", domain: "Web3 (SDG 9)", score: "84.0%", status: "Dossier Archived" },
                  ]
                    .filter((item) => {
                      if (archiveBatch !== "ALL" && !item.batch.includes(archiveBatch)) return false;
                      if (archiveSearch && !item.title.toLowerCase().includes(archiveSearch.toLowerCase()) && !item.code.toLowerCase().includes(archiveSearch.toLowerCase())) return false;
                      return true;
                    })
                    .map((item) => (
                      <tr key={item.code} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#64748B]">{item.batch}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-[#4F46E5]">{item.code}</td>
                        <td className="py-2.5 px-4 font-semibold max-w-xs truncate">{item.title}</td>
                        <td className="py-2.5 px-4 text-[#475569]">{item.guide}</td>
                        <td className="py-2.5 px-4 text-[#64748B]">{item.domain}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-emerald-600">{item.score}</td>
                        <td className="py-2.5 px-4 text-right">
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FACULTY SETUP & COORDINATOR TOGGLES                                 */}
      {/* ========================================================================= */}
      {activeTab === "faculty" && (
        <Card>
          <CardHeader>
            <CardTitle>Department Faculty Roster &amp; Coordinator Authorities</CardTitle>
            <CardDescription>
              Toggle the Project Coordinator switch to grant batch scheduling, CSV onboarding, and
              panel creation privileges.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Faculty Name</th>
                  <th className="py-3 px-4 font-semibold">Institutional Email</th>
                  <th className="py-3 px-4 font-semibold">Designation</th>
                  <th className="py-3 px-4 font-semibold">Max Team Capacity</th>
                  <th className="py-3 px-4 font-semibold">Project Coordinator Authority</th>
                  <th className="py-3 px-4 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                {facultyRoster.map((fac) => (
                  <tr key={fac.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-4 font-semibold">{fac.name}</td>
                    <td className="py-3 px-4 font-mono text-[#64748B]">{fac.email}</td>
                    <td className="py-3 px-4 text-[#475569]">{fac.designation}</td>
                    <td className="py-3 px-4 font-mono tabular-nums">{fac.maxTeams} Teams</td>
                    <td className="py-3 px-4">
                      {/* Interactive Switch Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleFacultyCoordinator(fac.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          fac.isProjectCoordinator ? "bg-[#4F46E5]" : "bg-[#CBD5E1]"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            fac.isProjectCoordinator ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span className="ml-2 text-[11px] font-medium text-[#475569]">
                        {fac.isProjectCoordinator ? "Coordinator (ON)" : "Guide Only"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {fac.isProjectCoordinator ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Active Authority
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#64748B]">Base Faculty</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Inspect Team Slide-Over Drawer */}
      <SlideOverDrawer
        isOpen={!!inspectingTeam}
        onClose={() => setInspectingTeam(null)}
        title={inspectingTeam?.teamCode}
        subtitle="HOD Proposal Allotment Review"
        badge={
          inspectingTeam && (
            <Badge variant="warning" size="sm">
              {inspectingTeam.state}
            </Badge>
          )
        }
        footer={
          inspectingTeam && (
            <div className="flex items-center justify-between w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  rejectProposal(inspectingTeam.id, "Requires revision");
                  setInspectingTeam(null);
                }}
              >
                Request Coordinator Revision
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  approveProposal(inspectingTeam.id, "HOD");
                  setInspectingTeam(null);
                }}
                leftIcon={<Check className="h-3.5 w-3.5" />}
              >
                Sign Off Allotment
              </Button>
            </div>
          )
        }
      >
        {inspectingTeam && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-[#0F172A]">{inspectingTeam.title}</h4>
              <p className="text-xs text-[#475569] mt-1 leading-relaxed">
                {inspectingTeam.abstract}
              </p>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Domain:</span>
                <span className="font-semibold text-[#0F172A]">{inspectingTeam.domain}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">UN SDG Target:</span>
                <span className="font-semibold text-emerald-700">SDG {inspectingTeam.sdgNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Proposed Faculty Mentor:</span>
                <span className="font-semibold text-[#4F46E5]">{inspectingTeam.guideName}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-bold text-[#0F172A]">Enrolled Student Members:</h5>
              <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-lg bg-white">
                {inspectingTeam.members.map((m) => (
                  <div key={m.id} className="p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-[#0F172A]">
                        {m.name} {m.isLead && <span className="text-[#4F46E5] font-bold">(Lead)</span>}
                      </div>
                      <div className="text-[11px] text-[#64748B]">{m.roleDescription}</div>
                    </div>
                    <span className="font-mono text-[11px] tabular-nums text-[#475569]">
                      {m.enrollmentNumber}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </AppShell>
  );
};

