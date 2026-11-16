"use client";

import React, { useState } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Download,
  Check,
  FileArchive,
  Plus,
  Clock,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  UserCog,
  UserX,
  RotateCcw,
} from "lucide-react";
import { AppShell } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Input } from "@/design-system/components/Input";
import { Textarea } from "@/design-system/components/Textarea";
import { Modal } from "@/design-system/components/Modal";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { Team } from "@/mocks/store-types";

interface VivaPanel {
  panelId: string;
  venue: string;
  time: string;
  evaluators: string[];
  teams: string[];
  conflictCheck: string;
}

export const CoordinatorView: React.FC = () => {
  const {
    teams,
    facultyRoster,
    assignGuide,
    approveProposal,
    cycle,
    updateCycle,
    submitExceptionOverride,
    exceptionAuditLogs,
  } = useProjectHubStore();

  const [activeSubTab, setActiveSubTab] = useState<"roster" | "allocator" | "panels" | "reports">("roster");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "allocator" || tabParam === "panels" || tabParam === "reports" || tabParam === "roster") {
        setActiveSubTab(tabParam as "roster" | "allocator" | "panels" | "reports");
      }
    }
  }, []);
  const [isCsvUploaded, setIsCsvUploaded] = useState(true);
  const [isAutoMatching, setIsAutoMatching] = useState(false);
  const [matchSuccess, setMatchSuccess] = useState(false);
  const [submittedToHOD, setSubmittedToHOD] = useState(false);

  // Team Override Drawer State
  const [overrideTeam, setOverrideTeam] = useState<Team | null>(null);
  const [overrideType, setOverrideType] = useState<"ReassignGuide" | "RemoveMember" | "ReVivaUnlock">("ReassignGuide");
  const [overrideNewGuideId, setOverrideNewGuideId] = useState("");
  const [overrideTargetMemberUsn, setOverrideTargetMemberUsn] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideToast, setOverrideToast] = useState<string | null>(null);

  // Cycle Parameters State
  const [proposalDeadline, setProposalDeadline] = useState(cycle.proposalDeadline || "2026-03-31");
  const [minTeamSize, setMinTeamSize] = useState(cycle.minTeamSize?.toString() || "2");
  const [maxTeamSize, setMaxTeamSize] = useState(cycle.maxTeamSize?.toString() || "4");
  const [cycleSaved, setCycleSaved] = useState(false);

  // Export Feedback States
  const [downloadingAllotment, setDownloadingAllotment] = useState(false);
  const [downloadingMarksheet, setDownloadingMarksheet] = useState(false);
  const [downloadingDossier, setDownloadingDossier] = useState(false);

  // Panel Scheduling State
  const [panels, setPanels] = useState<VivaPanel[]>([
    {
      panelId: "PANEL-A",
      venue: "Seminar Hall 1",
      time: "March 18, 2026 • 10:00 AM - 01:00 PM",
      evaluators: ["Prof. Priya Nair (Chair)", "Dr. Amit Rawat", "Dr. Manisha Sharma"],
      teams: ["2026-CS-MIN-01", "2026-CS-MIN-03"],
      conflictCheck: "Prof. S. K. Verma excluded from Team 01 scoring (Conflict Free)",
    },
    {
      panelId: "PANEL-B",
      venue: "IoT Lab 2",
      time: "March 18, 2026 • 02:00 PM - 05:00 PM",
      evaluators: ["Prof. S. K. Verma (Chair)", "Dr. Manisha Sharma", "Prof. Priya Nair"],
      teams: ["2026-CS-MIN-02", "2026-CS-MIN-04"],
      conflictCheck: "Prof. Priya Nair excluded from Team 02 scoring (Conflict Free)",
    },
  ]);

  const [isNewPanelModalOpen, setIsNewPanelModalOpen] = useState(false);
  const [newPanelId, setNewPanelId] = useState("PANEL-C");
  const [newPanelVenue, setNewPanelVenue] = useState("Seminar Hall 2");
  const [newPanelDate, setNewPanelDate] = useState("March 19, 2026 • 10:00 AM - 01:00 PM");
  const [newChairId, setNewChairId] = useState("usr-fac-rawat");
  const [newEval2Id, setNewEval2Id] = useState("usr-fac-msharma");
  const [newEval3Id, setNewEval3Id] = useState("usr-fac-verma");
  const [newSelectedTeam, setNewSelectedTeam] = useState("2026-CS-MIN-01");
  const [panelSuccessMessage, setPanelSuccessMessage] = useState("");

  // Mock CSV preview data
  const csvRecords = [
    { row: 1, name: "Shivansh Mehra", usn: "0176CS221045", email: "0176cs221045@sistec.ac.in", status: "Valid" },
    { row: 2, name: "Aarav Sharma", usn: "0176CS221002", email: "0176cs221002@sistec.ac.in", status: "Valid" },
    { row: 3, name: "Diya Patel", usn: "0176CS221021", email: "0176cs221021@sistec.ac.in", status: "Valid" },
    { row: 4, name: "Rohan Gupta", usn: "0176CS221038", email: "rohan.gupta@gmail.com", status: "Warning: Non-institutional email" },
  ];

  // Helper to trigger browser client file download
  const triggerDownload = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsvTemplate = (e: React.MouseEvent) => {
    e.preventDefault();
    const csvContent =
      "USN,Name,Email,Semester\n" +
      "0176CS221045,Shivansh Mehra,0176cs221045@sistec.ac.in,6\n" +
      "0176CS221002,Aarav Sharma,0176cs221002@sistec.ac.in,6\n" +
      "0176CS221021,Diya Patel,0176cs221021@sistec.ac.in,6\n" +
      "0176CS221038,Rohan Gupta,0176cs221038@sistec.ac.in,6\n";
    triggerDownload("sistec-cse-template.csv", csvContent, "text/csv;charset=utf-8;");
  };

  const handleSaveCycle = () => {
    updateCycle({
      proposalDeadline,
      minTeamSize: Number(minTeamSize) || 2,
      maxTeamSize: Number(maxTeamSize) || 4,
    });
    setCycleSaved(true);
    setTimeout(() => setCycleSaved(false), 3500);
  };

  const handleAutoGroupOrphans = () => {
    setIsAutoMatching(true);
    setTimeout(() => {
      setIsAutoMatching(false);
      setMatchSuccess(true);
      setTimeout(() => setMatchSuccess(false), 3000);
    }, 800);
  };

  const handleSubmitMasterAllotment = () => {
    teams.forEach((t) => {
      if (t.state === "PendingCoordinator" || t.state === "PendingGuide") {
        approveProposal(t.id, "Faculty");
      }
    });
    setSubmittedToHOD(true);
    setTimeout(() => setSubmittedToHOD(false), 3000);
  };

  const handleExportAllotment = () => {
    setDownloadingAllotment(true);
    setTimeout(() => {
      const header = "Team Code,Project Title,Domain,Members,Faculty Guide,State\n";
      const rows = teams
        .map(
          (t) =>
            `"${t.teamCode}","${t.title}","${t.domain}","${t.members.map((m) => m.name).join("; ")}","${
              t.guideName || "Unassigned"
            }","${t.state}"`
        )
        .join("\n");
      triggerDownload("SISTec_CSE_Master_Project_Allotment_2026.csv", header + rows, "text/csv;charset=utf-8;");
      setDownloadingAllotment(false);
    }, 600);
  };

  const handleExportMarksheet = () => {
    setDownloadingMarksheet(true);
    setTimeout(() => {
      const header = "Enrollment USN,Student Name,Team Code,Guide Score (/30),Viva Defense Score (/50),Total (/100),Grade,NBA Attainment\n";
      const rows =
        "0176CS221045,Shivansh Mehra,2026-CS-MIN-01,28.5,44.5,89.0,A+,Met (High)\n" +
        "0176CS221002,Aarav Sharma,2026-CS-MIN-01,27.0,43.0,86.0,A+,Met (High)\n" +
        "0176CS221021,Diya Patel,2026-CS-MIN-01,26.5,42.0,84.5,A,Met (Target)\n" +
        "0176CS221038,Rohan Gupta,2026-CS-MIN-02,25.0,39.5,79.0,B+,Met (Target)\n";
      triggerDownload("RGPV_CSE_Semester_6_Evaluation_Marksheet.csv", header + rows, "text/csv;charset=utf-8;");
      setDownloadingMarksheet(false);
    }, 600);
  };

  const handleDownloadDossier = () => {
    setDownloadingDossier(true);
    setTimeout(() => {
      const dossierSummary =
        "SISTec Department of Computer Science & Engineering\n" +
        "NBA Accreditation SAR Criterion 2 & 3 Dossier (Academic Year 2025-2026)\n\n" +
        "Contents:\n" +
        "- Formatted CO-PO & PSO Attainment Calculations (84.2% CO1, 81.4% CO2, 79.6% CO3, 85.0% CO4)\n" +
        "- 3 Best Samples (2026-CS-MIN-01, 2025-CS-MAJ-04, 2025-CS-MAJ-11)\n" +
        "- 3 Average Samples (2026-CS-MIN-02, 2024-CS-MAJ-08, 2024-CS-MAJ-19)\n" +
        "- 3 Weak Remedial Samples with Faculty Mentoring Action Plans\n" +
        "- Weekly Sprint Logbooks with Guide Bi-weekly Signatures\n";
      triggerDownload("NBA_Criterion_2_3_Dossier_SISTec_CSE_2026.txt", dossierSummary, "text/plain;charset=utf-8;");
      setDownloadingDossier(false);
    }, 700);
  };

  // Conflict of interest check for panel modal
  const targetTeam = teams.find((t) => t.teamCode === newSelectedTeam);
  const selectedEvaluatorIds = [newChairId, newEval2Id, newEval3Id];
  const hasConflict = Boolean(targetTeam?.guideId && selectedEvaluatorIds.includes(targetTeam.guideId));
  const conflictingFaculty = facultyRoster.find((f) => f.id === targetTeam?.guideId);

  const handleSchedulePanel = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasConflict) return;

    const chairName = facultyRoster.find((f) => f.id === newChairId)?.name || "Chair";
    const eval2Name = facultyRoster.find((f) => f.id === newEval2Id)?.name || "Evaluator 2";
    const eval3Name = facultyRoster.find((f) => f.id === newEval3Id)?.name || "Evaluator 3";

    const newPanel: VivaPanel = {
      panelId: newPanelId.trim() || `PANEL-${String.fromCharCode(65 + panels.length)}`,
      venue: newPanelVenue,
      time: newPanelDate,
      evaluators: [`${chairName} (Chair)`, eval2Name, eval3Name],
      teams: [newSelectedTeam],
      conflictCheck: `${targetTeam?.guideName || "Guide"} excluded from ${newSelectedTeam} scoring (Conflict Free)`,
    };

    setPanels([...panels, newPanel]);
    setIsNewPanelModalOpen(false);
    setPanelSuccessMessage(`Viva ${newPanel.panelId} scheduled successfully for ${newPanel.venue}.`);
    setTimeout(() => setPanelSuccessMessage(""), 4000);
  };

  return (
    <AppShell pageTitle="Project Coordinator Batch Operations" breadcrumb="CSE Minor Project — Semester 6 (2026)">
      {overrideToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{overrideToast}</span>
          </div>
          <span className="font-mono text-[11px] text-emerald-700">Status: Pending HOD Endorsement</span>
        </div>
      )}

      {/* 4 Coordinator Sub-Tabs */}
      <div className="flex border-b border-[#E2E8F0] gap-4 text-xs font-semibold select-none overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab("roster")}
          className={`pb-2.5 transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === "roster"
              ? "border-b-2 border-brand-primary text-brand-primary"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          1. Cycle &amp; Roster Setup
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("allocator")}
          className={`pb-2.5 transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === "allocator"
              ? "border-b-2 border-brand-primary text-brand-primary"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          2. Team &amp; Guide Allocator
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("panels")}
          className={`pb-2.5 transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === "panels"
              ? "border-b-2 border-brand-primary text-brand-primary"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          3. Review &amp; Panel Scheduler
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("reports")}
          className={`pb-2.5 transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === "reports"
              ? "border-b-2 border-brand-primary text-brand-primary"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          4. Reports &amp; Exports
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: CYCLE & ROSTER SETUP                                           */}
      {/* ========================================================================= */}
      {activeSubTab === "roster" && (
        <div className="space-y-6">
          {cycleSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Academic cycle parameters saved successfully in the department registry.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cycle Deadlines Form */}
            <Card>
              <CardHeader>
                <CardTitle>Academic Cycle Parameters</CardTitle>
                <CardDescription>
                  Configure semester timeline and team size boundaries for Minor Project Sem 6.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Academic Year" value="2025-2026" disabled readOnly />
                  <Input label="Project Type" value="Minor (Semester 6)" disabled readOnly />
                </div>
                <Input
                  label="Proposal Submission Deadline"
                  type="date"
                  value={proposalDeadline}
                  onChange={(e) => setProposalDeadline(e.target.value)}
                  helperText="Rosters will freeze automatically at 23:59 UTC"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Min Team Size"
                    type="number"
                    value={minTeamSize}
                    onChange={(e) => setMinTeamSize(e.target.value)}
                  />
                  <Input
                    label="Max Team Size"
                    type="number"
                    value={maxTeamSize}
                    onChange={(e) => setMaxTeamSize(e.target.value)}
                  />
                </div>
                <Button size="sm" variant="primary" onClick={handleSaveCycle}>
                  Save Cycle Parameters
                </Button>
              </CardContent>
            </Card>

            {/* CSV Roster Drag & Drop */}
            <Card>
              <CardHeader>
                <CardTitle>Bulk Student CSV Onboarding</CardTitle>
                <CardDescription>
                  Pre-registers student USNs and institutional emails into the department partition.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-[#CBD5E1] rounded-xl p-6 text-center bg-[#F8FAFC] space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-brand-primary">
                    <UploadCloud className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="text-xs text-[#0F172A] font-medium">
                    Drag and drop student roster CSV, or{" "}
                    <span className="text-brand-primary underline cursor-pointer">browse file</span>
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Columns required: <code className="font-mono">USN, Name, Email, Semester</code>
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#64748B]">Sample template:</span>
                  <a
                    href="#download-template"
                    onClick={handleDownloadCsvTemplate}
                    className="font-medium text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="h-3 w-3" strokeWidth={1.75} />
                    <span>Download sistec-cse-template.csv</span>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CSV Verification Preview Table */}
          {isCsvUploaded && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>CSV Parsing &amp; Verification Preview</CardTitle>
                  <CardDescription>
                    4 records inspected from uploaded CSV. Non-institutional domains flagged automatically.
                  </CardDescription>
                </div>
                <Badge variant="success" size="sm" dot>
                  Roster Parsed
                </Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Row</th>
                      <th className="py-2.5 px-4 font-semibold">Student Name</th>
                      <th className="py-2.5 px-4 font-semibold">Enrollment USN</th>
                      <th className="py-2.5 px-4 font-semibold">Institutional Email</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Validation State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                    {csvRecords.map((r) => (
                      <tr key={r.row} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-4 font-mono text-[#64748B]">{r.row}</td>
                        <td className="py-2.5 px-4 font-semibold">{r.name}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-brand-primary">{r.usn}</td>
                        <td className="py-2.5 px-4 font-mono text-[#64748B]">{r.email}</td>
                        <td className="py-2.5 px-4 text-right">
                          {r.status === "Valid" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <AlertTriangle className="h-3 w-3" />
                              {r.status}
                            </span>
                          )}
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
      {/* SUB-TAB 2: TEAM & GUIDE ALLOCATOR                                         */}
      {/* ========================================================================= */}
      {activeSubTab === "allocator" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5]">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5 font-heading">
                <Sparkles className="h-4 w-4 text-brand-primary" strokeWidth={1.75} />
                <span>Heuristic Guide-Student Matcher</span>
              </div>
              <p className="text-[11px] text-[#475569]">
                Auto-pairs orphan students into balanced teams and matches team project domains with
                faculty research profiles.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAutoGroupOrphans}
                isLoading={isAutoMatching}
              >
                {matchSuccess ? "Orphans Paired!" : "Auto-Group Orphans"}
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSubmitMasterAllotment}
                leftIcon={<Check className="h-3.5 w-3.5" />}
              >
                {submittedToHOD ? "Submitted to HOD!" : "Submit Master Allotment to HOD"}
              </Button>
            </div>
          </div>

          {/* Team-To-Guide Allocation Table */}
          <Card>
            <CardHeader>
              <CardTitle>Team Allotment Roster</CardTitle>
              <CardDescription>
                Assign faculty mentors and verify guide workload thresholds before submitting to HOD.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {teams.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="No Teams Registered"
                    description="Student teams will appear here once student leaders register project proposals."
                  />
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Team Code</th>
                      <th className="py-2.5 px-4 font-semibold">Title &amp; Domain</th>
                      <th className="py-2.5 px-4 font-semibold">Members</th>
                      <th className="py-2.5 px-4 font-semibold">Assigned Guide</th>
                      <th className="py-2.5 px-4 font-semibold">State</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Actions / Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                    {teams.map((t) => (
                      <tr key={t.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-mono font-bold text-brand-primary">{t.teamCode}</span>
                            {((t.missedLogsCount !== undefined && t.missedLogsCount >= 2) ||
                              t.health === "AtRisk") && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                At Risk (2+ Missed Logs)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 max-w-xs">
                          <div className="font-semibold truncate">{t.title}</div>
                          <div className="text-[10px] text-[#64748B]">{t.domain}</div>
                        </td>
                        <td className="py-2.5 px-4 tabular-nums">
                          {t.members.length} members ({t.members.find((m) => m.isLead)?.name || "Lead"})
                        </td>
                        <td className="py-2.5 px-4 font-medium text-[#475569]">
                          {t.guideName || (
                            <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge
                            variant={
                              t.state === "Active"
                                ? "success"
                                : t.state === "PendingHOD"
                                ? "info"
                                : "warning"
                            }
                            size="sm"
                            dot
                          >
                            {t.state}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <select
                              className="h-7 text-xs rounded border border-[#E2E8F0] bg-white px-2 text-[#0F172A] focus:outline-none"
                              value={t.guideId || ""}
                              onChange={(e) => assignGuide(t.id, e.target.value)}
                            >
                              <option value="">Select Mentor...</option>
                              {facultyRoster.map((fac) => (
                                <option key={fac.id} value={fac.id}>
                                  {fac.name} ({fac.guidedCount}/{fac.maxTeams})
                                </option>
                              ))}
                            </select>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setOverrideTeam(t);
                                setOverrideNewGuideId(t.guideId || "");
                                setOverrideTargetMemberUsn(t.members[0]?.enrollmentNumber || "");
                                setOverrideReason("");
                              }}
                              className="text-[11px] shrink-0"
                            >
                              Team Override
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: REVIEW & PANEL SCHEDULER                                       */}
      {/* ========================================================================= */}
      {activeSubTab === "panels" && (
        <div className="space-y-4">
          {panelSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{panelSuccessMessage}</span>
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Mid-Semester Viva Review Panels</CardTitle>
                <CardDescription>
                  3-faculty panels assigned to classrooms with automated conflict-of-interest prevention.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success" size="sm" dot>
                  Conflict-of-Interest Validated
                </Badge>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsNewPanelModalOpen(true)}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Schedule New Viva Panel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {panels.length === 0 ? (
                <EmptyState
                  title="No Viva Panels Scheduled"
                  description="Click 'Schedule New Viva Panel' to configure evaluators, venues, and team rosters."
                />
              ) : (
                panels.map((p) => (
                  <div key={p.panelId} className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-brand-primary text-white px-2 py-0.5 rounded">
                          {p.panelId}
                        </span>
                        <span className="text-xs font-semibold text-[#0F172A] flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-[#64748B]" strokeWidth={1.75} />
                          {p.venue}
                        </span>
                        <span className="text-xs text-[#64748B] flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-[#64748B]" strokeWidth={1.75} />
                          {p.time}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {p.conflictCheck}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[11px] font-semibold text-[#64748B]">Panel Evaluators:</span>
                        <ul className="mt-1 space-y-0.5 text-[#0F172A] list-disc list-inside">
                          {p.evaluators.map((ev, i) => (
                            <li key={i}>{ev}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-[#64748B]">Assigned Teams:</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {p.teams.map((tm) => (
                            <span
                              key={tm}
                              className="font-mono text-xs font-bold text-brand-primary bg-brand-primary-tint px-2 py-1 rounded border border-brand-primary-border"
                            >
                              {tm}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: REPORTS & EXPORTS                                              */}
      {/* ========================================================================= */}
      {activeSubTab === "reports" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:border-[#CBD5E1] transition-all">
            <CardHeader>
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <CardTitle>Master Allotment Excel (.xlsx)</CardTitle>
              <CardDescription>
                Official university project allotment sheet with student USNs, project abstracts, and
                guide signatures.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={handleExportAllotment}
                isLoading={downloadingAllotment}
                leftIcon={<Download className="h-3.5 w-3.5" />}
              >
                Export Allotment.xlsx
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-[#CBD5E1] transition-all">
            <CardHeader>
              <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-2">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <CardTitle>University Examination Marksheet (.csv)</CardTitle>
              <CardDescription>
                Consolidated rubric marks formatted strictly for RGPV university examination portal uploads.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={handleExportMarksheet}
                isLoading={downloadingMarksheet}
                leftIcon={<Download className="h-3.5 w-3.5" />}
              >
                Export Marksheet.csv
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-[#CBD5E1] transition-all">
            <CardHeader>
              <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mb-2">
                <FileArchive className="h-5 w-5" />
              </div>
              <CardTitle>NBA Criterion 2 &amp; 3 Audit Dossier (.zip)</CardTitle>
              <CardDescription>
                Complete package containing CO-PO attainment matrices, 3 Best/Avg/Weak reports, and logbooks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                variant="primary"
                className="w-full"
                onClick={handleDownloadDossier}
                isLoading={downloadingDossier}
                leftIcon={<Download className="h-3.5 w-3.5" />}
              >
                Download Audit Dossier
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SCHEDULE NEW VIVA PANEL MODAL */}
      <Modal
        isOpen={isNewPanelModalOpen}
        onClose={() => setIsNewPanelModalOpen(false)}
        title="Schedule New Viva Review Panel"
        description="Assign 3 independent faculty members to evaluate student presentations with conflict detection."
        maxWidth="lg"
      >
        <form onSubmit={handleSchedulePanel} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Panel Designation"
              value={newPanelId}
              onChange={(e) => setNewPanelId(e.target.value)}
              placeholder="e.g. PANEL-C"
              required
            />
            <Input
              label="Classroom / Venue"
              value={newPanelVenue}
              onChange={(e) => setNewPanelVenue(e.target.value)}
              placeholder="e.g. Seminar Hall 2"
              required
            />
          </div>

          <Input
            label="Date & Time Slot"
            value={newPanelDate}
            onChange={(e) => setNewPanelDate(e.target.value)}
            placeholder="e.g. March 19, 2026 • 10:00 AM - 01:00 PM"
            required
          />

          <div className="space-y-3 pt-1 border-t border-[#E2E8F0]">
            <h4 className="text-xs font-semibold text-[#0F172A]">Panel Evaluators (Minimum 3):</h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-medium text-[#475569] block mb-1">Panel Chair</label>
                <select
                  value={newChairId}
                  onChange={(e) => setNewChairId(e.target.value)}
                  className="w-full h-8 text-xs rounded-lg border border-[#E2E8F0] bg-white px-2 text-[#0F172A] focus:outline-none focus:border-brand-primary"
                >
                  {facultyRoster.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#475569] block mb-1">Evaluator 2</label>
                <select
                  value={newEval2Id}
                  onChange={(e) => setNewEval2Id(e.target.value)}
                  className="w-full h-8 text-xs rounded-lg border border-[#E2E8F0] bg-white px-2 text-[#0F172A] focus:outline-none focus:border-brand-primary"
                >
                  {facultyRoster.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#475569] block mb-1">Evaluator 3</label>
                <select
                  value={newEval3Id}
                  onChange={(e) => setNewEval3Id(e.target.value)}
                  className="w-full h-8 text-xs rounded-lg border border-[#E2E8F0] bg-white px-2 text-[#0F172A] focus:outline-none focus:border-brand-primary"
                >
                  {facultyRoster.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-[#E2E8F0]">
            <label className="text-xs font-semibold text-[#0F172A] block">Assigned Project Team:</label>
            <select
              value={newSelectedTeam}
              onChange={(e) => setNewSelectedTeam(e.target.value)}
              className="w-full h-9 text-xs rounded-lg border border-[#E2E8F0] bg-white px-3 text-[#0F172A] focus:outline-none focus:border-brand-primary"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.teamCode}>
                  {t.teamCode} — {t.title} (Guide: {t.guideName || "Unassigned"})
                </option>
              ))}
            </select>
          </div>

          {/* Conflict of Interest Warning / Confirmation */}
          {hasConflict ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
                <span>Conflict of Interest Detected!</span>
              </div>
              <p className="text-[11px] text-red-700">
                {conflictingFaculty?.name} is the designated project guide for {newSelectedTeam}. Project guides cannot serve as viva panel evaluators for their own teams. Please replace this evaluator.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Conflict Free: None of the 3 panel evaluators are guides for {newSelectedTeam}.</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
            <Button size="sm" variant="secondary" type="button" onClick={() => setIsNewPanelModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" disabled={hasConflict}>
              Schedule Panel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Team Override & Exception Governance Drawer */}
      <SlideOverDrawer
        isOpen={!!overrideTeam}
        onClose={() => setOverrideTeam(null)}
        title={overrideTeam ? `Team Override: ${overrideTeam.teamCode}` : "Team Override"}
        subtitle="Audited Administrative Exception Workflow • Requires HOD Sign-Off"
        footer={
          overrideTeam && (
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" size="sm" onClick={() => setOverrideTeam(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={overrideReason.trim().length < 15}
                onClick={() => {
                  if (!overrideTeam) return;
                  const newGuide = facultyRoster.find((f) => f.id === overrideNewGuideId);
                  const targetMember = overrideTeam.members.find(
                    (m) => m.enrollmentNumber === overrideTargetMemberUsn
                  );

                  let desc = "";
                  if (overrideType === "ReassignGuide") {
                    desc = `Reassign Faculty Guide to ${newGuide?.name || "New Mentor"}`;
                  } else if (overrideType === "RemoveMember") {
                    desc = `Remove dropped member ${targetMember?.name || "Student"} (${overrideTargetMemberUsn})`;
                  } else {
                    desc = `Unlock Individual Re-Viva Defense for ${targetMember?.name || "Student"} (${overrideTargetMemberUsn})`;
                  }

                  submitExceptionOverride({
                    teamId: overrideTeam.id,
                    teamCode: overrideTeam.teamCode,
                    teamTitle: overrideTeam.title,
                    type: overrideType,
                    description: desc,
                    reason: overrideReason.trim(),
                    requestedBy: "Prof. Priya Nair (Coordinator)",
                    targetMemberUsn: overrideTargetMemberUsn,
                    targetMemberName: targetMember?.name,
                    newGuideId: overrideNewGuideId,
                    newGuideName: newGuide?.name,
                  });

                  setOverrideToast(`Exception override "${desc}" submitted to HOD approval queue.`);
                  setTimeout(() => setOverrideToast(null), 5000);
                  setOverrideTeam(null);
                  setOverrideReason("");
                }}
              >
                Submit for HOD Sign-Off
              </Button>
            </div>
          )
        }
      >
        {overrideTeam && (
          <div className="space-y-5 text-xs">
            {/* Team Snapshot */}
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-brand-primary">{overrideTeam.teamCode}</span>
                <Badge variant={overrideTeam.health === "AtRisk" ? "danger" : "neutral"} size="sm">
                  {overrideTeam.health === "AtRisk" ? "At Risk" : overrideTeam.state}
                </Badge>
              </div>
              <h4 className="font-semibold text-slate-900">{overrideTeam.title}</h4>
              <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1 border-t border-[#E2E8F0]">
                <span>Guide: {overrideTeam.guideName || "Unassigned"}</span>
                <span>{overrideTeam.members.length} enrolled members</span>
              </div>
            </div>

            {/* Override Action Selector */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-900 block">Select Override Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "ReassignGuide" as const, label: "Reassign Guide", icon: UserCog },
                  { id: "RemoveMember" as const, label: "Remove Member", icon: UserX },
                  { id: "ReVivaUnlock" as const, label: "Re-Viva Unlock", icon: RotateCcw },
                ].map((act) => {
                  const Icon = act.icon;
                  const isSelected = overrideType === act.id;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setOverrideType(act.id)}
                      className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? "bg-brand-primary-tint border-brand-primary-border text-brand-primary font-bold shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                      <span className="text-[11px] leading-tight">{act.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Specific Parameters */}
            {overrideType === "ReassignGuide" && (
              <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 bg-white">
                <label className="font-semibold text-slate-800 block">New Faculty Guide Designation</label>
                <select
                  value={overrideNewGuideId}
                  onChange={(e) => setOverrideNewGuideId(e.target.value)}
                  className="w-full h-8 text-xs rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-[#0F172A] focus:outline-hidden focus:border-brand-primary"
                >
                  <option value="">Select Replacement Mentor...</option>
                  {facultyRoster.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.guidedCount}/{f.maxTeams} teams) — {f.designation}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 block">
                  Current Guide: <strong>{overrideTeam.guideName || "Unassigned"}</strong>
                </span>
              </div>
            )}

            {overrideType === "RemoveMember" && (
              <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 bg-white">
                <label className="font-semibold text-slate-800 block">Select Member to Drop / Deregister</label>
                <select
                  value={overrideTargetMemberUsn}
                  onChange={(e) => setOverrideTargetMemberUsn(e.target.value)}
                  className="w-full h-8 text-xs rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-[#0F172A] focus:outline-hidden focus:border-brand-primary"
                >
                  <option value="">Select Student...</option>
                  {overrideTeam.members.map((m) => (
                    <option key={m.enrollmentNumber} value={m.enrollmentNumber}>
                      {m.name} ({m.enrollmentNumber}) {m.isLead ? "— Team Lead" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-amber-700 leading-tight">
                  Warning: Removing a member will adjust the active roster size. Minimum team size constraint is {cycle.minTeamSize || 2} members.
                </p>
              </div>
            )}

            {overrideType === "ReVivaUnlock" && (
              <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 bg-white">
                <label className="font-semibold text-slate-800 block">Target Student for Re-Viva</label>
                <select
                  value={overrideTargetMemberUsn}
                  onChange={(e) => setOverrideTargetMemberUsn(e.target.value)}
                  className="w-full h-8 text-xs rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-[#0F172A] focus:outline-hidden focus:border-brand-primary"
                >
                  <option value="">Select Student...</option>
                  {overrideTeam.members.map((m) => (
                    <option key={m.enrollmentNumber} value={m.enrollmentNumber}>
                      {m.name} ({m.enrollmentNumber})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Re-viva unlocks individual assessment inputs in the Faculty Viva panel while preserving team shared score.
                </p>
              </div>
            )}

            {/* Mandatory Audit Reason */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-900 block flex items-center justify-between">
                <span>Mandatory Exception Justification</span>
                <span className="text-[10px] font-normal text-slate-500">Min 15 chars</span>
              </label>
              <Textarea
                rows={3}
                required
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Student suffered verified medical emergency on viva date; hospital discharge slip verified by coordinator..."
              />
              <p className="text-[10px] text-slate-500 leading-tight">
                This reason is cryptographically committed to the permanent department compliance audit log and requires formal endorsement by the HOD.
              </p>
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </AppShell>
  );
};
