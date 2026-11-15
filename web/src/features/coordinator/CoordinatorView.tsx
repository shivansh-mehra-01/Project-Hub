"use client";

import React, { useState } from "react";
import {
  Briefcase,
  UploadCloud,
  FileSpreadsheet,
  Users2,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  Building,
  Check,
  FileArchive,
} from "lucide-react";
import { AppShell } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";

export const CoordinatorView: React.FC = () => {
  const { teams, facultyRoster, assignGuide, approveProposal } = useProjectHubStore();

  const [activeSubTab, setActiveSubTab] = useState<"roster" | "allocator" | "panels" | "reports">("roster");
  const [isCsvUploaded, setIsCsvUploaded] = useState(true);
  const [isAutoMatching, setIsAutoMatching] = useState(false);
  const [matchSuccess, setMatchSuccess] = useState(false);
  const [submittedToHOD, setSubmittedToHOD] = useState(false);

  // Mock CSV preview data
  const csvRecords = [
    { row: 1, name: "Shivansh Mehra", usn: "0176CS221045", email: "0176cs221045@sistec.ac.in", status: "Valid" },
    { row: 2, name: "Aarav Sharma", usn: "0176CS221002", email: "0176cs221002@sistec.ac.in", status: "Valid" },
    { row: 3, name: "Diya Patel", usn: "0176CS221021", email: "0176cs221021@sistec.ac.in", status: "Valid" },
    { row: 4, name: "Rohan Gupta", usn: "0176CS221038", email: "rohan.gupta@gmail.com", status: "Warning: Non-institutional email" },
  ];

  const handleAutoGroupOrphans = () => {
    setIsAutoMatching(true);
    setTimeout(() => {
      setIsAutoMatching(false);
      setMatchSuccess(true);
      setTimeout(() => setMatchSuccess(false), 3000);
    }, 800);
  };

  const handleSubmitMasterAllotment = () => {
    // Advance any PendingCoordinator teams to PendingHOD
    teams.forEach((t) => {
      if (t.state === "PendingCoordinator" || t.state === "PendingGuide") {
        approveProposal(t.id, "Faculty");
      }
    });
    setSubmittedToHOD(true);
    setTimeout(() => setSubmittedToHOD(false), 3000);
  };

  return (
    <AppShell pageTitle="Project Coordinator Batch Operations" breadcrumb="CSE Minor Project — Semester 6 (2026)">
      {/* 4 Coordinator Sub-Tabs */}
      <div className="flex border-b border-[#E2E8F0] gap-4 text-xs font-semibold select-none">
        <button
          type="button"
          onClick={() => setActiveSubTab("roster")}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeSubTab === "roster"
              ? "border-b-2 border-[#4F46E5] text-[#4F46E5]"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          1. Cycle &amp; Roster Setup
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("allocator")}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeSubTab === "allocator"
              ? "border-b-2 border-[#4F46E5] text-[#4F46E5]"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          2. Team &amp; Guide Allocator
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("panels")}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeSubTab === "panels"
              ? "border-b-2 border-[#4F46E5] text-[#4F46E5]"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          3. Review &amp; Panel Scheduler
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("reports")}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeSubTab === "reports"
              ? "border-b-2 border-[#4F46E5] text-[#4F46E5]"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cycle Deadlines Form */}
            <Card>
              <CardHeader>
                <CardTitle>Academic Cycle Parameters</CardTitle>
                <CardDescription>
                  Configure semester timeline and team size boundaries.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Academic Year" value="2025-2026" disabled />
                  <Input label="Project Type" value="Minor (Semester 6)" disabled />
                </div>
                <Input
                  label="Proposal Submission Deadline"
                  type="date"
                  defaultValue="2026-03-31"
                  helperText="Rosters will freeze automatically at 23:59 UTC"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Min Team Size" type="number" defaultValue="2" />
                  <Input label="Max Team Size" type="number" defaultValue="4" />
                </div>
                <Button size="sm" variant="primary">
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
                  <div className="h-10 w-10 mx-auto rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-[#4F46E5]">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div className="text-xs text-[#0F172A] font-medium">
                    Drag and drop student roster CSV, or{" "}
                    <span className="text-[#4F46E5] underline cursor-pointer">browse file</span>
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Columns required: <code className="font-mono">USN, Name, Email, Semester</code>
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#64748B]">Sample template:</span>
                  <a
                    href="#"
                    className="font-medium text-[#4F46E5] hover:underline flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" />
                    <span>Download sisters-cse-template.csv</span>
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
                        <td className="py-2.5 px-4 font-mono font-bold text-[#4F46E5]">{r.usn}</td>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-indigo-100 bg-[#EEF2FF]">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[#4F46E5]" />
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
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Team Code</th>
                    <th className="py-2.5 px-4 font-semibold">Title &amp; Domain</th>
                    <th className="py-2.5 px-4 font-semibold">Members</th>
                    <th className="py-2.5 px-4 font-semibold">Assigned Guide</th>
                    <th className="py-2.5 px-4 font-semibold">State</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Reassign</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                  {teams.map((t) => (
                    <tr key={t.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-4 font-mono font-bold text-[#4F46E5]">{t.teamCode}</td>
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
      {/* SUB-TAB 3: REVIEW & PANEL SCHEDULER                                       */}
      {/* ========================================================================= */}
      {activeSubTab === "panels" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Mid-Semester Viva Review Panels</CardTitle>
                <CardDescription>
                  3-faculty panels assigned to classrooms with conflict-of-interest prevention.
                </CardDescription>
              </div>
              <Badge variant="success" size="sm" dot>
                Conflict-of-Interest Validated
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
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
              ].map((p) => (
                <div key={p.panelId} className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-[#4F46E5] text-white px-2 py-0.5 rounded">
                        {p.panelId}
                      </span>
                      <span className="text-xs font-semibold text-[#0F172A]">{p.venue}</span>
                      <span className="text-xs text-[#64748B]">• {p.time}</span>
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
                      <div className="mt-1 flex gap-2">
                        {p.teams.map((tm) => (
                          <span
                            key={tm}
                            className="font-mono text-xs font-bold text-[#4F46E5] bg-white px-2 py-1 rounded border border-[#E2E8F0]"
                          >
                            {tm}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
              <Button size="sm" variant="secondary" className="w-full" leftIcon={<Download className="h-3.5 w-3.5" />}>
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
              <Button size="sm" variant="secondary" className="w-full" leftIcon={<Download className="h-3.5 w-3.5" />}>
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
              <Button size="sm" variant="primary" className="w-full" leftIcon={<Download className="h-3.5 w-3.5" />}>
                Download Audit Dossier
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
};
