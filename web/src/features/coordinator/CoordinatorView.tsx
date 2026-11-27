"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Plus,
  Clock,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/components/Card";
import { Input } from "@/design-system/components/Input";
import { Textarea } from "@/design-system/components/Textarea";
import { Modal } from "@/design-system/components/Modal";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { coordinatorApi, getUserProfile, authApi } from "@/lib/api";
import { ExceptionActionType, ProjectProposalDto, UserProfileDto, VivaPanelDto } from "@/lib/api/types";
import { showToast } from "@/lib/toast";

interface DepartmentFacultyItem {
  id: string;
  fullName: string;
  designation?: string;
  currentMentoredTeams: number;
  maxMentorTeams: number;
  isAvailable: boolean;
}

export const CoordinatorView: React.FC = () => {
  useDashboardHeader({ title: "Coordinator" });

  const [profile, setProfile] = useState<UserProfileDto | null>(() => getUserProfile());
  const [activeSubTab, setActiveSubTab] = useState<"teams" | "roster" | "panels" | "reports">(() => {
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (tab === "roster" || tab === "panels" || tab === "reports") return tab;
    }
    return "teams";
  });

  const [teams, setTeams] = useState<ProjectProposalDto[]>([]);
  const [faculty, setFaculty] = useState<DepartmentFacultyItem[]>([]);
  const [panels, setPanels] = useState<VivaPanelDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Exception / Override Drawer
  const [overrideTeam, setOverrideTeam] = useState<ProjectProposalDto | null>(null);
  const [overrideType, setOverrideType] = useState<ExceptionActionType>("ReassignGuide");
  const [overrideNewGuideId, setOverrideNewGuideId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [submittingOverride, setSubmittingOverride] = useState(false);

  // Proposal Return Modal
  const [returnTargetTeam, setReturnTargetTeam] = useState<ProjectProposalDto | null>(null);
  const [returnRemarks, setReturnRemarks] = useState("");

  // Schedule Panel Modal
  const [isNewPanelModalOpen, setIsNewPanelModalOpen] = useState(false);
  const [newPanelName, setNewPanelName] = useState("");
  const [newPanelVenue, setNewPanelVenue] = useState("");
  const [newPanelDate, setNewPanelDate] = useState("");
  const [selectedEvaluators, setSelectedEvaluators] = useState<string[]>(["", "", ""]);
  const [newSelectedTeamId, setNewSelectedTeamId] = useState("");
  const [schedulingPanel, setSchedulingPanel] = useState(false);

  // Single Student Modal & CSV Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [studentFullName, setStudentFullName] = useState("");
  const [studentUsn, setStudentUsn] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentSemester, setStudentSemester] = useState(6);
  const [studentBatch, setStudentBatch] = useState("");
  const [downloadingMarksheet, setDownloadingMarksheet] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [teamsRes, facRes, panelsRes] = await Promise.all([
        coordinatorApi.getTeams().catch(() => [] as ProjectProposalDto[]),
        coordinatorApi.getFaculty().catch(() => [] as DepartmentFacultyItem[]),
        coordinatorApi.getPanels().catch(() => [] as VivaPanelDto[]),
      ]);
      setTeams(teamsRes || []);
      setFaculty(facRes || []);
      setPanels(panelsRes || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (!profile) {
      authApi.session().then((res) => {
        if (active && res.authenticated && res.user) setProfile(res.user);
      }).catch(() => {});
    }
    Promise.all([
      coordinatorApi.getTeams().catch(() => [] as ProjectProposalDto[]),
      coordinatorApi.getFaculty().catch(() => [] as DepartmentFacultyItem[]),
      coordinatorApi.getPanels().catch(() => [] as VivaPanelDto[]),
    ])
      .then(([teamsRes, facRes, panelsRes]) => {
        if (!active) return;
        setTeams(teamsRes || []);
        setFaculty(facRes || []);
        setPanels(panelsRes || []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profile]);

  const departmentId = profile?.departmentId || "";

  const handleAssignGuide = async (teamId: string, guideUserId: string) => {
    if (!guideUserId) return;
    try {
      await coordinatorApi.assignGuide(teamId, { guideUserId });
      showToast("Faculty guide assigned.", "success");
      await loadAll();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to assign guide.", "error");
    }
  };

  const handleVerifyProposal = async (teamId: string) => {
    try {
      await coordinatorApi.verifyProposal(teamId);
      showToast("Proposal verified and forwarded to HOD.", "success");
      await loadAll();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to verify proposal.", "error");
    }
  };

  const handleReturnProposal = async () => {
    if (!returnTargetTeam || !returnRemarks.trim()) {
      showToast("Revision remarks are required.", "error");
      return;
    }
    try {
      await coordinatorApi.returnProposal(returnTargetTeam.teamId, returnRemarks.trim());
      setReturnTargetTeam(null);
      setReturnRemarks("");
      showToast("Proposal returned for revision.", "success");
      await loadAll();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to return proposal.", "error");
    }
  };

  const handleCsvFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const startIndex = lines[0]?.toLowerCase().includes("usn") || lines[0]?.toLowerCase().includes("name") ? 1 : 0;
    const rows = lines
      .slice(startIndex)
      .map((line) => line.split(",").map((p) => p.trim()))
      .filter((parts) => parts.length >= 3 && parts[0] && parts[1] && parts[2])
      .map((parts) => ({
        enrollmentOrEmployeeCode: parts[0],
        fullName: parts[1],
        email: parts[2],
      }));

    if (rows.length === 0) {
      showToast("No valid rows found in CSV (expected: USN, Name, Email).", "error");
      return;
    }

    try {
      const res = await coordinatorApi.importRoster({
        departmentId,
        rows,
      });
      showToast(`Imported ${res.insertedCount} student(s) (${res.totalProcessed} processed).`, "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to import roster.", "error");
    }
  };

  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentFullName.trim() || !studentUsn.trim() || !studentEmail.trim()) return;
    setIsAddingStudent(true);
    try {
      await coordinatorApi.addSingleStudent({
        fullName: studentFullName.trim(),
        enrollmentNumber: studentUsn.trim().toUpperCase(),
        email: studentEmail.trim().toLowerCase(),
        departmentId,
        semesterNumber: Number(studentSemester) || 6,
        admissionBatch: studentBatch.trim() || "Current",
      });
      setStudentFullName("");
      setStudentUsn("");
      setStudentEmail("");
      setIsAddStudentOpen(false);
      showToast("Student provisioned and activation email queued.", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to onboard student.", "error");
    } finally {
      setIsAddingStudent(false);
    }
  };

  const targetTeam = teams.find((t) => t.teamId === newSelectedTeamId);
  const hasConflict = Boolean(
    targetTeam?.guideUserId && selectedEvaluators.includes(targetTeam.guideUserId)
  );

  const handleSchedulePanel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasConflict) return;
    const evaluatorUserIds = Array.from(new Set(selectedEvaluators.filter(Boolean)));
    if (evaluatorUserIds.length === 0) {
      showToast("Select at least one evaluator.", "error");
      return;
    }
    setSchedulingPanel(true);
    try {
      await coordinatorApi.schedulePanel({
        departmentId,
        academicTrackId: "00000000-0000-0000-0000-000000000000",
        panelName: newPanelName.trim(),
        scheduledAtUtc: newPanelDate ? new Date(newPanelDate).toISOString() : new Date().toISOString(),
        roomOrLink: newPanelVenue.trim(),
        evaluatorUserIds,
      });
      setIsNewPanelModalOpen(false);
      setNewPanelName("");
      setNewPanelVenue("");
      setNewPanelDate("");
      showToast("Viva panel scheduled.", "success");
      await loadAll();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to schedule panel.", "error");
    } finally {
      setSchedulingPanel(false);
    }
  };

  const handleSubmitOverride = async () => {
    if (!overrideTeam || overrideReason.trim().length < 15) return;
    setSubmittingOverride(true);
    try {
      await coordinatorApi.createException({
        departmentId,
        projectTeamId: overrideTeam.teamId,
        actionType: overrideType,
        reason: overrideReason.trim(),
        previousValueJson: JSON.stringify({ currentGuide: overrideTeam.guideName }),
        newValueJson: JSON.stringify({ newGuideId: overrideNewGuideId }),
      });
      setOverrideTeam(null);
      setOverrideReason("");
      showToast("Exception request submitted to HOD.", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to submit exception.", "error");
    } finally {
      setSubmittingOverride(false);
    }
  };

  const handleExportMarksheet = async () => {
    setDownloadingMarksheet(true);
    try {
      const blob = await coordinatorApi.exportMarksheetCsvBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Project_Marksheet_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Marksheet exported.", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Export failed.", "error");
    } finally {
      setDownloadingMarksheet(false);
    }
  };

  const handleExportTeamsCsv = () => {
    const header = "Team Code,Project Title,Domain,Guide,Status,Members\n";
    const rows = teams
      .map(
        (t) =>
          `"${t.teamCode}","${t.title.replace(/"/g, '""')}","${t.domainTag || ""}","${
            t.guideName || "Unassigned"
          }","${t.status}",${t.memberCount}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Department_Teams_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tabs: { id: "teams" | "roster" | "panels" | "reports"; label: string }[] = [
    { id: "teams", label: `Teams & Guides (${teams.length})` },
    { id: "roster", label: "Student Onboarding" },
    { id: "panels", label: `Viva Panels (${panels.length})` },
    { id: "reports", label: "Exports" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold overflow-x-auto select-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id)}
            className={`pb-2.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === tab.id
                ? "border-b-2 border-brand-primary text-brand-primary"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Teams & Guide Allocation */}
      {activeSubTab === "teams" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Department Teams &amp; Proposals</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading teams...</div>
            ) : teams.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No teams yet" description="Student teams will appear here once created." />
              </div>
            ) : (
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Team</th>
                    <th className="py-2.5 px-4 font-semibold">Project</th>
                    <th className="py-2.5 px-4 font-semibold">Members</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold">Guide</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {teams.map((t) => (
                    <tr key={t.teamId} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono font-bold text-brand-primary">{t.teamCode}</td>
                      <td className="py-2.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">{t.title}</div>
                        <div className="text-[11px] text-slate-500">{t.domainTag}</div>
                      </td>
                      <td className="py-2.5 px-4 tabular-nums">{t.memberCount}</td>
                      <td className="py-2.5 px-4">
                        <Badge
                          variant={t.status === "ActiveBuild" ? "success" : t.status === "PendingCoordinator" ? "warning" : "neutral"}
                          size="sm"
                        >
                          {t.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4">
                        <select
                          className="h-7 text-xs rounded border border-slate-200 bg-white px-2 text-slate-800"
                          value={t.guideUserId || ""}
                          onChange={(e) => handleAssignGuide(t.teamId, e.target.value)}
                        >
                          <option value="">Assign Guide...</option>
                          {faculty.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.fullName} ({f.currentMentoredTeams}/{f.maxMentorTeams})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.status === "PendingCoordinator" && (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleVerifyProposal(t.teamId)}
                                leftIcon={<CheckCircle2 className="h-3 w-3" />}
                              >
                                Verify
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setReturnTargetTeam(t);
                                  setReturnRemarks("");
                                }}
                                leftIcon={<RotateCcw className="h-3 w-3" />}
                              >
                                Return
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setOverrideTeam(t);
                              setOverrideNewGuideId(t.guideUserId || "");
                              setOverrideReason("");
                            }}
                          >
                            Exception
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
      )}

      {/* Tab 2: Student Onboarding */}
      {activeSubTab === "roster" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Student Roster Onboarding</CardTitle>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<UserPlus className="h-3.5 w-3.5" />}
              onClick={() => setIsAddStudentOpen(true)}
            >
              Add Student
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 space-y-2 cursor-pointer hover:border-brand-primary transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCsvFileSelected}
              />
              <UploadCloud className="h-6 w-6 text-brand-primary mx-auto" />
              <div className="text-xs font-semibold text-slate-900">
                Upload Student Roster CSV
              </div>
              <p className="text-[11px] text-slate-500">
                Columns: <code className="font-mono">USN, Name, Email</code>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Viva Panels */}
      {activeSubTab === "panels" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Viva Review Panels</CardTitle>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setIsNewPanelModalOpen(true)}
            >
              Schedule Panel
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {panels.length === 0 ? (
              <EmptyState
                title="No Viva Panels Scheduled"
                description="Schedule a panel to assign evaluators and a venue."
              />
            ) : (
              panels.map((p) => (
                <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold bg-brand-primary text-white px-2 py-0.5 rounded">
                        {p.panelName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {p.roomOrLink || "TBD"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {p.scheduledAtUtc ? new Date(p.scheduledAtUtc).toLocaleString() : "TBD"}
                      </span>
                    </div>
                  </div>
                  <div className="text-slate-600">
                    <strong>Evaluators:</strong>{" "}
                    {p.evaluatorNames?.length ? p.evaluatorNames.join(", ") : "None assigned"}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Exports */}
      {activeSubTab === "reports" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-6 w-6 text-emerald-700 shrink-0" />
              <div>
                <div className="text-sm font-bold text-slate-900">Department Teams (.csv)</div>
                <div className="text-xs text-slate-500">All teams, domains, guides, and statuses</div>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={handleExportTeamsCsv} leftIcon={<Download className="h-3.5 w-3.5" />}>
              Export
            </Button>
          </Card>

          <Card className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-6 w-6 text-blue-700 shrink-0" />
              <div>
                <div className="text-sm font-bold text-slate-900">Examination Marksheet (.csv)</div>
                <div className="text-xs text-slate-500">Consolidated evaluation marks</div>
              </div>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={handleExportMarksheet}
              isLoading={downloadingMarksheet}
              leftIcon={<Download className="h-3.5 w-3.5" />}
            >
              Export
            </Button>
          </Card>
        </div>
      )}

      {/* Return Proposal Modal */}
      <Modal
        isOpen={Boolean(returnTargetTeam)}
        onClose={() => setReturnTargetTeam(null)}
        title={`Return Proposal: ${returnTargetTeam?.teamCode || ""}`}
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => setReturnTargetTeam(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleReturnProposal}>
              Return for Revision
            </Button>
          </div>
        }
      >
        <Textarea
          label="Revision Remarks *"
          rows={3}
          value={returnRemarks}
          onChange={(e) => setReturnRemarks(e.target.value)}
          placeholder="Specify required revisions..."
        />
      </Modal>

      {/* Schedule Viva Panel Modal */}
      <Modal
        isOpen={isNewPanelModalOpen}
        onClose={() => setIsNewPanelModalOpen(false)}
        title="Schedule Viva Panel"
        maxWidth="lg"
      >
        <form onSubmit={handleSchedulePanel} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Panel Name *"
              value={newPanelName}
              onChange={(e) => setNewPanelName(e.target.value)}
              placeholder="e.g. Panel A"
              required
            />
            <Input
              label="Venue / Link *"
              value={newPanelVenue}
              onChange={(e) => setNewPanelVenue(e.target.value)}
              placeholder="e.g. Seminar Hall 2"
              required
            />
          </div>

          <Input
            label="Date & Time *"
            type="datetime-local"
            value={newPanelDate}
            onChange={(e) => setNewPanelDate(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[0, 1, 2].map((idx) => (
              <div key={idx}>
                <label className="block font-semibold text-slate-700 mb-1">
                  Evaluator {idx + 1}
                </label>
                <select
                  value={selectedEvaluators[idx]}
                  onChange={(e) => {
                    const next = [...selectedEvaluators];
                    next[idx] = e.target.value;
                    setSelectedEvaluators(next);
                  }}
                  className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2"
                >
                  <option value="">Select Faculty...</option>
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.fullName}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Conflict Check Team (Optional)</label>
            <select
              value={newSelectedTeamId}
              onChange={(e) => setNewSelectedTeamId(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5"
            >
              <option value="">Select Team...</option>
              {teams.map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.teamCode} — {t.title} ({t.guideName || "No Guide"})
                </option>
              ))}
            </select>
          </div>

          {hasConflict ? (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
              <span>Conflict of interest: a selected evaluator is the guide for {targetTeam?.teamCode}.</span>
            </div>
          ) : targetTeam ? (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>No guide conflict for {targetTeam.teamCode}.</span>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button size="sm" variant="secondary" type="button" onClick={() => setIsNewPanelModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" disabled={hasConflict || schedulingPanel} isLoading={schedulingPanel}>
              Schedule Panel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Exception Override Drawer */}
      <SlideOverDrawer
        isOpen={Boolean(overrideTeam)}
        onClose={() => setOverrideTeam(null)}
        title={overrideTeam ? `Exception: ${overrideTeam.teamCode}` : "Exception"}
        subtitle="Requires HOD approval"
        footer={
          <div className="flex justify-between w-full">
            <Button variant="ghost" size="sm" onClick={() => setOverrideTeam(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={overrideReason.trim().length < 15 || submittingOverride}
              isLoading={submittingOverride}
              onClick={handleSubmitOverride}
            >
              Submit to HOD
            </Button>
          </div>
        }
      >
        {overrideTeam && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-900">{overrideTeam.title}</div>
              <div className="text-slate-500 mt-0.5">Current Guide: {overrideTeam.guideName || "Unassigned"}</div>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">Override Type</label>
              <select
                value={overrideType}
                onChange={(e) => setOverrideType(e.target.value as ExceptionActionType)}
                className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5"
              >
                <option value="ReassignGuide">Reassign Guide</option>
                <option value="RemoveDroppedMember">Remove Member</option>
                <option value="IndividualReVivaUnlock">Re-Viva Unlock</option>
              </select>
            </div>

            {overrideType === "ReassignGuide" && (
              <div>
                <label className="block font-semibold text-slate-800 mb-1">New Faculty Guide</label>
                <select
                  value={overrideNewGuideId}
                  onChange={(e) => setOverrideNewGuideId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5"
                >
                  <option value="">Select Mentor...</option>
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.fullName} ({f.currentMentoredTeams}/{f.maxMentorTeams})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Textarea
              label="Justification (min 15 chars) *"
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Explain the reason for this exception..."
            />
          </div>
        )}
      </SlideOverDrawer>

      {/* Add Single Student Modal */}
      <Modal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        title="Add Student"
        maxWidth="md"
      >
        <form onSubmit={handleAddSingleStudent} className="space-y-3 text-xs">
          <Input
            label="Full Name *"
            value={studentFullName}
            onChange={(e) => setStudentFullName(e.target.value)}
            required
          />
          <Input
            label="Enrollment / USN *"
            value={studentUsn}
            onChange={(e) => setStudentUsn(e.target.value)}
            required
          />
          <Input
            label="Institutional Email *"
            type="email"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Semester"
              type="number"
              min={1}
              max={10}
              value={studentSemester}
              onChange={(e) => setStudentSemester(parseInt(e.target.value, 10) || 6)}
            />
            <Input
              label="Batch (Optional)"
              value={studentBatch}
              onChange={(e) => setStudentBatch(e.target.value)}
              placeholder="e.g. 2023-2027"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button size="sm" variant="secondary" type="button" onClick={() => setIsAddStudentOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" isLoading={isAddingStudent}>
              Provision Student
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
