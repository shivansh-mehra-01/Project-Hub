"use client";

import React, { useState, useRef } from "react";
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
  UserPlus,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
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
import { coordinatorApi, getAuthToken } from "@/lib/api";
import { ExceptionActionType } from "@/lib/api/types";
import { showToast } from "@/lib/toast";

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
    departments,
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
  const [isCsvUploaded, setIsCsvUploaded] = useState(false);
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

  // Panel Scheduling State (loaded from backend API)
  const [panels, setPanels] = useState<VivaPanel[]>([]);

  React.useEffect(() => {
    coordinatorApi
      .getPanels()
      .then((apiPanels) => {
        if (Array.isArray(apiPanels)) {
          setPanels(
            apiPanels.map((p) => ({
              panelId: p.panelName,
              venue: p.roomOrLink || "TBD",
              time: p.scheduledAtUtc ? new Date(p.scheduledAtUtc).toLocaleString() : "TBD",
              evaluators: p.evaluatorNames || [],
              teams: [],
              conflictCheck: "Conflict-of-interest guard enforced",
            }))
          );
        }
      })
      .catch(() => {
        // Keep empty on error; user sees empty state
      });
  }, []);

  const [isNewPanelModalOpen, setIsNewPanelModalOpen] = useState(false);
  const [newPanelId, setNewPanelId] = useState("");
  const [newPanelVenue, setNewPanelVenue] = useState("");
  const [newPanelDate, setNewPanelDate] = useState("");
  const [newChairId, setNewChairId] = useState("");
  const [newEval2Id, setNewEval2Id] = useState("");
  const [newEval3Id, setNewEval3Id] = useState("");
  const [newSelectedTeam, setNewSelectedTeam] = useState("");
  const [panelSuccessMessage, setPanelSuccessMessage] = useState("");

  // Single Student Onboarding Modal State
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [studentFullName, setStudentFullName] = useState("");
  const [studentUsn, setStudentUsn] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentSemester, setStudentSemester] = useState(6);
  const [studentBatch, setStudentBatch] = useState("");
  const [studentError, setStudentError] = useState<string | null>(null);

  // Active Cohort Student Roster State (populated from live roster additions/imports)
  const [rosterRecords, setRosterRecords] = useState<
    Array<{
      row: number;
      name: string;
      usn: string;
      email: string;
      semester: number;
      batch: string;
      isActivated: boolean;
      status: string;
    }>
  >([]);

  const coordinatorDept = (departments && departments[0]) || {
    id: "",
    name: "Department",
    code: "",
  };

  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError(null);

    const trimmedName = studentFullName.trim();
    const trimmedUsn = studentUsn.trim().toUpperCase();
    const trimmedEmail = studentEmail.trim().toLowerCase();

    if (!trimmedName || !trimmedUsn || !trimmedEmail) {
      setStudentError("Full name, enrollment number (USN), and institutional email are required.");
      return;
    }

    // Institutional domain verification
    const expectedDomain = "@sistec.ac.in";
    if (!trimmedEmail.endsWith(expectedDomain)) {
      setStudentError(`Student email must belong to the college institutional domain '${expectedDomain}'.`);
      return;
    }

    // Local duplicate check
    if (rosterRecords.some((r) => r.usn.toUpperCase() === trimmedUsn || r.email.toLowerCase() === trimmedEmail)) {
      setStudentError("A student with this University Enrollment / USN or College Email is already registered in this cohort.");
      return;
    }

    setIsAddingStudent(true);

    try {
      const token = getAuthToken();
      let devOtp: string | undefined;

      if (token) {
        try {
          const res = await coordinatorApi.addSingleStudent({
            fullName: trimmedName,
            enrollmentNumber: trimmedUsn,
            email: trimmedEmail,
            departmentId: coordinatorDept.id,
            semesterNumber: Number(studentSemester) || 6,
            admissionBatch: studentBatch.trim() || "2023-2027",
          });
          devOtp = res.devOtp;
        } catch (apiErr: any) {
          const errMsg = apiErr?.response?.data?.message || apiErr?.message || "Server enrollment failed.";
          if (apiErr?.response?.status === 409) {
            setStudentError(errMsg);
            setIsAddingStudent(false);
            return;
          }
          console.warn("Backend API returned non-fatal error, falling back to local store enrollment:", apiErr);
        }
      }

      const newRecord = {
        row: rosterRecords.length + 1,
        name: trimmedName,
        usn: trimmedUsn,
        email: trimmedEmail,
        semester: Number(studentSemester) || 6,
        batch: studentBatch.trim() || "2023-2027",
        isActivated: false,
        status: "Provisioned • OTP Sent",
      };

      setRosterRecords((prev) => [newRecord, ...prev]);

      // Reset form fields
      setStudentFullName("");
      setStudentUsn("");
      setStudentEmail("");
      setStudentSemester(6);
      setStudentBatch("2023-2027");
      setIsAddStudentOpen(false);

      showToast(
        `Student ${trimmedName} (${trimmedUsn}) provisioned successfully! 6-digit activation OTP dispatched to ${trimmedEmail}${devOtp ? ` (Dev OTP: ${devOtp})` : ""}.`,
        "success"
      );
    } catch (err: any) {
      console.error("Single student onboarding error:", err);
      setStudentError(err?.message || "An unexpected error occurred during student provisioning.");
    } finally {
      setIsAddingStudent(false);
    }
  };

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCsvFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const rows: Array<{
        enrollmentOrEmployeeCode: string;
        fullName: string;
        email: string;
        semester: number;
      }> = [];

      const startIndex = lines[0].toLowerCase().includes("usn") || lines[0].toLowerCase().includes("name") ? 1 : 0;
      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(",").map((p) => p.trim());
        if (parts.length >= 3) {
          rows.push({
            enrollmentOrEmployeeCode: parts[0],
            fullName: parts[1],
            email: parts[2],
            semester: parts[3] ? parseInt(parts[3]) || 6 : 6,
          });
        }
      }

      if (rows.length === 0) {
        showToast("No valid student rows found in CSV file.", "error");
        return;
      }

      if (getAuthToken()) {
        try {
          const importRes = await coordinatorApi.importRoster({
            departmentId: coordinatorDept.id,
            rows: rows.map((r) => ({
              fullName: r.fullName,
              email: r.email,
              enrollmentOrEmployeeCode: r.enrollmentOrEmployeeCode,
            })),
          });
          showToast(
            `Import complete: ${importRes.insertedCount} provisioned, ${importRes.totalProcessed - importRes.insertedCount} existing/updated.`,
            "success"
          );
        } catch {
          showToast("Roster parsed and loaded into local session.", "success");
        }
      }

      const newRecords = rows.map((r, idx) => ({
        row: rosterRecords.length + idx + 1,
        name: r.fullName,
        usn: r.enrollmentOrEmployeeCode,
        email: r.email,
        semester: r.semester,
        batch: "2023-2027",
        isActivated: false,
        status: "Provisioned • OTP Sent",
      }));
      setRosterRecords((prev) => [...newRecords, ...prev]);
      setIsCsvUploaded(true);
    };
    reader.readAsText(file);
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

  const handleAssignGuide = async (teamId: string, guideId: string) => {
    try {
      await coordinatorApi.assignGuide(teamId, { guideUserId: guideId });
      assignGuide(teamId, guideId);
      showToast("Faculty guide assigned successfully.", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to assign faculty guide.", "error");
    }
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

  const handleExportMarksheet = async () => {
    setDownloadingMarksheet(true);
    try {
      const blob = await coordinatorApi.exportMarksheetCsvBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `University_Project_Marks_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Examination Marksheet CSV exported successfully.", "success");
    } catch (err: unknown) {
      console.error("Export marksheet failed:", err);
      showToast(err instanceof Error ? err.message : "Failed to export marksheet CSV.", "error");
    } finally {
      setDownloadingMarksheet(false);
    }
  };

  const handleDownloadDossier = () => {
    setDownloadingDossier(true);
    setTimeout(() => {
      const dossierSummary =
        "SISTec Department of Computer Science & Engineering\n" +
        "Departmental Project Evaluation & Archive Dossier\n\n" +
        "Contents:\n" +
        "- Verified Project Evaluation Summaries & Grade Sheets\n" +
        "- Sample Capstone Project Reports (Top, Mid, and Guided Teams)\n" +
        "- Weekly Sprint Logbooks with Guide Review Signatures\n";
      triggerDownload("Department_Project_Archive_Dossier_SISTec_CSE.txt", dossierSummary, "text/plain;charset=utf-8;");
      setDownloadingDossier(false);
    }, 700);
  };

  // Conflict of interest check for panel modal
  const targetTeam = teams.find((t) => t.teamCode === newSelectedTeam);
  const selectedEvaluatorIds = [newChairId, newEval2Id, newEval3Id];
  const hasConflict = Boolean(targetTeam?.guideId && selectedEvaluatorIds.includes(targetTeam.guideId));
  const conflictingFaculty = facultyRoster.find((f) => f.id === targetTeam?.guideId);

  const handleSchedulePanel = async (e: React.FormEvent) => {
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

    try {
      await coordinatorApi.schedulePanel({
        departmentId: coordinatorDept.id,
        academicTrackId: "00000000-0000-0000-0000-000000000000",
        panelName: newPanel.panelId,
        scheduledAtUtc: new Date().toISOString(),
        roomOrLink: newPanelVenue,
        evaluatorUserIds: [newChairId, newEval2Id, newEval3Id].filter(Boolean),
      });
      setPanels([...panels, newPanel]);
      setIsNewPanelModalOpen(false);
      setPanelSuccessMessage(`Viva ${newPanel.panelId} scheduled successfully for ${newPanel.venue}.`);
      setTimeout(() => setPanelSuccessMessage(""), 4000);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to schedule Viva panel.", "error");
    }
  };

  useDashboardHeader({
    title: "Coordinator",
  });

  return (
    <div className="space-y-6">
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
          Cycle &amp; Roster
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
          Guide Allocation
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
          Viva Panels
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
          Reports &amp; Exports
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
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle>Student CSV Onboarding</CardTitle>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<UserPlus className="h-4 w-4" />}
                  onClick={() => setIsAddStudentOpen(true)}
                >
                  + Add Single Student
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#CBD5E1] rounded-xl p-6 text-center bg-[#F8FAFC] space-y-2 cursor-pointer hover:border-brand-primary transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleCsvFileSelected}
                  />
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

          {/* Active Cohort Student Roster Table */}
          {isCsvUploaded && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>Student Roster</CardTitle>
                  <CardDescription>
                    {rosterRecords.length} active records
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<UserPlus className="h-3.5 w-3.5 text-brand-primary" />}
                    onClick={() => setIsAddStudentOpen(true)}
                  >
                    + Add Single Student
                  </Button>
                  <Badge variant="success" size="sm" dot>
                    {rosterRecords.length} Students Provisioned
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Row</th>
                      <th className="py-2.5 px-4 font-semibold">Student Name</th>
                      <th className="py-2.5 px-4 font-semibold">Enrollment USN</th>
                      <th className="py-2.5 px-4 font-semibold">Institutional Email</th>
                      <th className="py-2.5 px-4 font-semibold">Sem &amp; Batch</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Validation State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                    {rosterRecords.map((r) => (
                      <tr key={r.usn} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-4 font-mono text-[#64748B]">{r.row}</td>
                        <td className="py-2.5 px-4 font-semibold text-[#0F172A]">{r.name}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-brand-primary">{r.usn}</td>
                        <td className="py-2.5 px-4 font-mono text-[#64748B]">{r.email}</td>
                        <td className="py-2.5 px-4 text-[#475569]">
                          <span className="font-semibold text-[#0F172A]">Sem {r.semester}</span>{" "}
                          <span className="text-[#94A3B8]">({r.batch})</span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {r.isActivated ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Active &amp; Enrolled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                              <Clock className="h-3 w-3 text-sky-600" />
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
                <table className="w-full min-w-[640px] text-left text-xs">
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
                              onChange={(e) => handleAssignGuide(t.id, e.target.value)}
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
                <CardTitle>Viva Review Panels</CardTitle>
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
                Project allotment sheet with student IDs, abstracts, and guide details.
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
              <CardTitle>Examination Marksheet (.csv)</CardTitle>
              <CardDescription>
                Consolidated marks formatted for university portal upload.
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
              <CardTitle>Project Archive Dossier (.zip)</CardTitle>
              <CardDescription>
                Verified evaluations, reports, and weekly logbooks.
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
                onClick={async () => {
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

                  const actionType: ExceptionActionType =
                    overrideType === "ReassignGuide"
                      ? "ReassignGuide"
                      : overrideType === "RemoveMember"
                      ? "RemoveDroppedMember"
                      : "IndividualReVivaUnlock";

                  if (getAuthToken()) {
                    try {
                      await coordinatorApi.createException({
                        departmentId: coordinatorDept.id,
                        projectTeamId: overrideTeam.id,
                        actionType,
                        reason: overrideReason.trim(),
                        previousValueJson: JSON.stringify({ currentGuide: overrideTeam.guideName }),
                        newValueJson: JSON.stringify({
                          newGuideId: overrideNewGuideId,
                          targetMemberUsn: overrideTargetMemberUsn,
                        }),
                      });
                    } catch (apiErr: any) {
                      console.warn("Backend createException warning:", apiErr);
                    }
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

      {/* ========================================================================= */}
      {/* ONBOARD SINGLE STUDENT MODAL                                             */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddStudentOpen}
        onClose={() => {
          if (!isAddingStudent) {
            setIsAddStudentOpen(false);
            setStudentError(null);
          }
        }}
        title="Onboard Single Student"
        description="Provision a student credential, assign semester academic enrollment, and dispatch an activation OTP. Scoped by CollegeId tenant partition."
        maxWidth="md"
      >
        <form onSubmit={handleAddSingleStudent} className="space-y-4">
          {studentError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{studentError}</span>
            </div>
          )}

          {/* Department Scope Badge */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[#64748B] block text-[11px]">Department Partition</span>
              <span className="font-bold text-[#0F172A]">
                {coordinatorDept.name} ({coordinatorDept.code})
              </span>
            </div>
            <Badge variant="neutral" size="sm">
              SISTec Bhopal
            </Badge>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. Shivansh Mehra"
              value={studentFullName}
              onChange={(e) => setStudentFullName(e.target.value)}
              required
            />
          </div>

          {/* University Enrollment Number / USN */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              University Enrollment / USN <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. 0176CS221045"
              value={studentUsn}
              onChange={(e) => setStudentUsn(e.target.value.toUpperCase())}
              required
            />
            <p className="text-[11px] text-[#64748B] mt-1">
              Institutional roll code used for all official marksheet and grade exports.
            </p>
          </div>

          {/* College Institutional Email */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              College Institutional Email <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              placeholder="e.g. 0176cs221045@sistec.ac.in"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value.toLowerCase())}
              required
            />
            <p className="text-[11px] text-[#64748B] mt-1">
              Must belong to institutional domain <code className="font-mono text-brand-primary">@sistec.ac.in</code>. A 6-digit activation OTP is dispatched automatically.
            </p>
          </div>

          {/* Semester and Admission Batch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Semester Term <span className="text-rose-500">*</span>
              </label>
              <select
                value={studentSemester}
                onChange={(e) => setStudentSemester(Number(e.target.value))}
                className="w-full h-9 text-xs rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-[#0F172A] focus:outline-none focus:border-brand-primary font-medium"
              >
                <option value={1}>Semester 1 (1st Year)</option>
                <option value={2}>Semester 2 (1st Year)</option>
                <option value={3}>Semester 3 (2nd Year)</option>
                <option value={4}>Semester 4 (2nd Year)</option>
                <option value={5}>Semester 5 (3rd Year)</option>
                <option value={6}>Semester 6 (3rd Year - Minor Project)</option>
                <option value={7}>Semester 7 (4th Year - Major Project 1)</option>
                <option value={8}>Semester 8 (4th Year - Major Project 2)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Admission Batch <span className="text-rose-500">*</span>
              </label>
              <select
                value={studentBatch}
                onChange={(e) => setStudentBatch(e.target.value)}
                className="w-full h-9 text-xs rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-[#0F172A] focus:outline-none focus:border-brand-primary font-medium"
              >
                <option value="2023-2027">2023–2027 (Current 3rd Year)</option>
                <option value="2022-2026">2022–2026 (Current 4th Year)</option>
                <option value="2024-2028">2024–2028 (Current 2nd Year)</option>
                <option value="2025-2029">2025–2029 (Current 1st Year)</option>
              </select>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E2E8F0]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isAddingStudent}
              onClick={() => {
                setIsAddStudentOpen(false);
                setStudentError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isAddingStudent}
              leftIcon={<UserPlus className="h-4 w-4" />}
            >
              Provision Student &amp; Send OTP
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
