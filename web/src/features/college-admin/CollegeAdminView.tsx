"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users2,
  Building2,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Award,
  Sliders,
  Settings,
  GraduationCap,
  Save,
  ArrowRight,
  FileCheck2,
  Calendar,
  Download,
  Upload,
  FileSpreadsheet,
  Check,
  Clock,
  ExternalLink,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { AppShell } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Modal } from "@/design-system/components/Modal";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { Department, ProjectCycle } from "@/mocks/store-types";

export interface CollegeAdminViewProps {
  initialTab?: "overview" | "departments" | "settings" | "compliance";
}

export const CollegeAdminView: React.FC<CollegeAdminViewProps> = ({ initialTab = "overview" }) => {
  const router = useRouter();
  const {
    college,
    departments,
    cycle,
    addDepartment,
    reassignHOD,
    onboardCollege,
    updateCycle,
  } = useProjectHubStore();

  const [activeTab, setActiveTab] = useState<"overview" | "departments" | "settings" | "compliance">(initialTab);
  
  // Modals & Drawers
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [inspectingDept, setInspectingDept] = useState<Department | null>(null);

  // New Department Form State
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptCode, setNewDeptCode] = useState("");
  const [newDeptHod, setNewDeptHod] = useState("");
  const [newDeptIntake, setNewDeptIntake] = useState("120");
  const [newDeptFaculty, setNewDeptFaculty] = useState("12");

  // Reassign HOD in Drawer
  const [selectedHodName, setSelectedHodName] = useState("");
  const [hodReassignedToast, setHodReassignedToast] = useState(false);

  // New Academic Cycle Form State
  const [cycleYear, setCycleYear] = useState("2026–2027");
  const [cycleType, setCycleType] = useState<"Minor" | "Major">("Minor");
  const [cycleSem, setCycleSem] = useState("6");
  const [cycleDeadline, setCycleDeadline] = useState("2026-03-31");
  const [cycleSavedToast, setCycleSavedToast] = useState(false);

  // Campus Settings State
  const [collegeDisplayName, setCollegeDisplayName] = useState(college.name);
  const [ssoDomain, setSsoDomain] = useState(college.domain);
  const [principalSealUploaded, setPrincipalSealUploaded] = useState(true);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // CSV Import State
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvImportSuccess, setCsvImportSuccess] = useState(false);

  // Export Feedback
  const [exportingDeptCode, setExportingDeptCode] = useState<string | null>(null);
  const [exportSarSuccess, setExportSarSuccess] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const switchTab = (tab: "overview" | "departments" | "settings" | "compliance") => {
    setActiveTab(tab);
    if (tab === "overview") router.push("/college");
    else if (tab === "departments") router.push("/college/departments");
    else if (tab === "settings") router.push("/college/settings");
    else if (tab === "compliance") router.push("/college/compliance");
  };

  const handleCreateDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName || !newDeptCode) return;
    addDepartment(
      newDeptName,
      newDeptCode,
      newDeptHod || "Appointed HOD",
      parseInt(newDeptIntake) || 120,
      parseInt(newDeptFaculty) || 12
    );
    setShowAddDeptModal(false);
    setNewDeptName("");
    setNewDeptCode("");
    setNewDeptHod("");
  };

  const handleReassignHodSubmit = () => {
    if (!inspectingDept || !selectedHodName) return;
    reassignHOD(inspectingDept.id, selectedHodName);
    setInspectingDept({
      ...inspectingDept,
      hodName: selectedHodName,
    });
    setHodReassignedToast(true);
    setTimeout(() => setHodReassignedToast(false), 2000);
  };

  const handleLaunchCycle = (e: React.FormEvent) => {
    e.preventDefault();
    updateCycle({
      academicYear: cycleYear,
      type: cycleType,
      semester: parseInt(cycleSem) || 6,
      proposalDeadline: cycleDeadline,
      isActive: true,
    });
    setCycleSavedToast(true);
    setTimeout(() => {
      setCycleSavedToast(false);
      setShowNewCycleModal(false);
    }, 1200);
  };

  const handleSaveSettings = () => {
    onboardCollege({
      name: collegeDisplayName,
      domain: ssoDomain,
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2200);
  };

  const handleSimulateCsvImport = () => {
    setCsvImportSuccess(true);
    setTimeout(() => {
      setCsvImportSuccess(false);
      setShowCsvImportModal(false);
      setCsvFileName(null);
    }, 1500);
  };

  const handleExportBranchZip = (code: string) => {
    setExportingDeptCode(code);
    setTimeout(() => {
      setExportingDeptCode(null);
      const link = document.createElement("a");
      link.href = "#";
      link.setAttribute("download", `NBA_Criterion2_3_${code}_Dossier.zip`);
    }, 1200);
  };

  const handleDownloadSarSummary = () => {
    setExportSarSuccess(true);
    setTimeout(() => setExportSarSuccess(false), 2500);
  };

  const tabLabels: Record<string, string> = {
    overview: "Overview",
    departments: "Departments & HODs",
    settings: "Campus Settings",
    compliance: "Accreditation",
  };

  const breadcrumbs: Record<string, string> = {
    overview: "Institutional Executive Overview",
    departments: "Academic Branches & Leadership",
    settings: "Campus Branding & Directory Sync",
    compliance: "NBA Criterion 2 & 3 Attainment",
  };

  return (
    <AppShell
      pageTitle="College Executive Console"
      breadcrumb={breadcrumbs[activeTab] || "Institutional Governance"}
      activeTab={tabLabels[activeTab] || "Overview"}
    >
      {/* ========================================================================= */}
      {/* TAB 1: EXECUTIVE OVERVIEW                                                 */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* 4 Cross-Branch KPI Cards with Unified Slate/Emerald Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-slate-500">Total Enrolled Intake</span>
                  <div className="text-xl font-bold text-slate-900 tabular-nums font-mono">
                    {departments.reduce((acc, d) => acc + d.studentCount, 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500">Across {departments.length} engineering branches</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Users2 className="h-5 w-5" strokeWidth={1.75} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-slate-500">Academic Departments</span>
                  <div className="text-xl font-bold text-slate-900 tabular-nums font-mono">{departments.length}</div>
                  <span className="text-[10px] text-emerald-600 font-medium">All Appointed &amp; Active</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5" strokeWidth={1.75} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-slate-500">Guide Mentoring Load</span>
                  <div className="text-xl font-bold text-slate-900 tabular-nums font-mono">89.2%</div>
                  <span className="text-[10px] text-emerald-600 font-medium">Avg 3.8 teams / mentor</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-5 w-5" strokeWidth={1.75} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-slate-500">Institutional NBA Attainment</span>
                  <div className="text-xl font-bold text-emerald-700 flex items-center gap-1.5 tabular-nums font-mono">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>91.4%</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-medium">Criterion 2 &amp; 3 Satisfied</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Academic Cycle Governance Card */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <CardTitle>Academic Cycle Governance</CardTitle>
                <CardDescription>
                  Central campus semester schedule, student team proposal cutoff, and viva defense examination windows.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setShowNewCycleModal(true)}
              >
                Launch New Cycle
              </Button>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Active Academic Batch</span>
                <div className="text-sm font-bold text-slate-900 font-mono">
                  {cycle.academicYear} • {cycle.type} Sem {cycle.semester}
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold">Active &amp; Enrolling</span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Proposal Submission Deadline</span>
                <div className="text-sm font-bold text-slate-900 font-mono">
                  {cycle.proposalDeadline || "March 15, 2026"}
                </div>
                <span className="text-[10px] text-slate-500">Coordinator Review Period</span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Team Size Policy</span>
                <div className="text-sm font-bold text-slate-900 font-mono">
                  Min {cycle.minTeamSize || 3} — Max {cycle.maxTeamSize || 4} Students
                </div>
                <span className="text-[10px] text-slate-500">Interdisciplinary Permitted</span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Final Defense Window</span>
                <div className="text-sm font-bold text-slate-900 font-mono">May 02 – May 08, 2026</div>
                <span className="text-[10px] text-emerald-600 font-semibold">Rubric Panel Scheduled</span>
              </div>
            </CardContent>
          </Card>

          {/* Departmental Performance Summary */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <CardTitle>Departmental Performance Summary</CardTitle>
                <CardDescription>
                  Branch partitions, appointed departmental leadership, and live Criterion 3 attainment.
                </CardDescription>
              </div>
              <Button size="sm" variant="secondary" onClick={() => switchTab("departments")}>
                Manage Branches &rarr;
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Branch Code</th>
                    <th className="py-3 px-4">Department Name</th>
                    <th className="py-3 px-4">Appointed HOD</th>
                    <th className="py-3 px-4">Enrolled Intake</th>
                    <th className="py-3 px-4">Faculty Mentors</th>
                    <th className="py-3 px-4 text-right">Criterion 3 Attainment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-900">
                  {departments.map((dept) => (
                    <tr
                      key={dept.id}
                      onClick={() => {
                        setInspectingDept(dept);
                        setSelectedHodName(dept.hodName || "");
                      }}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-brand-primary">
                        <span className="px-2 py-0.5 rounded bg-brand-primary-tint border border-brand-primary-border">
                          {dept.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 group-hover:text-brand-primary transition-colors">
                        {dept.name}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {dept.hodName || "Appointed HOD"}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-800">
                        {dept.studentCount} students
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-800">
                        {dept.facultyCount} mentors
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                        {dept.criterion3Attainment || 80.0}%
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
      {/* TAB 2: DEPARTMENTS & HODS                                                 */}
      {/* ========================================================================= */}
      {activeTab === "departments" && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading">
                Academic Branches &amp; Appointed HODs
              </h2>
              <p className="text-xs text-slate-500">
                Configure departmental quotas, review faculty-to-student ratios, and reassign branch leadership.
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setShowAddDeptModal(true)}
            >
              Add Department
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {departments.map((dept) => (
              <Card
                key={dept.id}
                onClick={() => {
                  setInspectingDept(dept);
                  setSelectedHodName(dept.hodName || "");
                }}
                className="hover:border-brand-primary hover:shadow-xs transition-all cursor-pointer group"
              >
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-brand-primary-tint text-brand-primary px-2 py-0.5 rounded border border-brand-primary-border">
                      {dept.code}
                    </span>
                    <Badge variant="success" size="sm" dot>
                      Accredited
                    </Badge>
                  </div>
                  <CardTitle className="pt-2 text-sm truncate group-hover:text-brand-primary transition-colors">
                    {dept.name}
                  </CardTitle>
                  <CardDescription className="font-medium text-slate-700 truncate">
                    HOD: {dept.hodName || "Appointed HOD"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 space-y-2.5 text-xs text-slate-600">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span>Student Intake:</span>
                    <span className="font-semibold text-slate-900 font-mono tabular-nums">
                      {dept.studentCount} students
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span>Faculty Mentors:</span>
                    <span className="font-semibold text-slate-900 font-mono tabular-nums">
                      {dept.facultyCount} mentors
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-0.5">
                    <span>Criterion 3 Attainment:</span>
                    <span className="font-semibold text-emerald-700 font-mono tabular-nums">
                      {dept.criterion3Attainment || 80.0}% (Met)
                    </span>
                  </div>
                  <div className="pt-1 text-[11px] text-brand-primary font-semibold flex items-center justify-end group-hover:translate-x-0.5 transition-transform">
                    Inspect Branch &rarr;
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CAMPUS SETTINGS & DIRECTORY SYNC                                   */}
      {/* ========================================================================= */}
      {activeTab === "settings" && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Branding & Digital Seal (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle>Institutional Identity &amp; Digital Seal</CardTitle>
                <CardDescription>
                  College crest and Principal authorization seal stamped onto all generated student certificates and NBA dossiers.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <Input
                  label="Official College Display Name"
                  value={collegeDisplayName}
                  onChange={(e) => setCollegeDisplayName(e.target.value)}
                />

                <Input
                  label="Institutional Code"
                  value={college.code}
                  disabled
                  readOnly
                  helperText="Assigned during multi-tenant provisioning (Immutable)"
                />

                {/* Crest & Seal Preview Component */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <span className="text-xs font-bold text-slate-900 block">
                    Institutional Crest &amp; Principal Digital Seal
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    {/* College Crest Box */}
                    <div className="p-3 rounded-lg bg-white border border-slate-200 flex flex-col items-center justify-center text-center space-y-1.5">
                      <div className="h-12 w-12 rounded-xl bg-brand-primary text-white font-bold font-heading text-base flex items-center justify-center shadow-xs">
                        PH
                      </div>
                      <span className="text-[11px] font-semibold text-slate-800">Campus Crest</span>
                      <span className="text-[10px] text-slate-400 font-mono">sistec_crest.svg</span>
                    </div>

                    {/* Principal Seal Stamp */}
                    <div className="p-3 rounded-lg bg-white border border-slate-200 flex flex-col items-center justify-center text-center space-y-1.5">
                      <div className="h-12 w-12 rounded-full border-2 border-emerald-700 border-dashed bg-emerald-50 text-emerald-800 flex flex-col items-center justify-center text-[8px] font-bold font-mono leading-none">
                        <span>SEAL</span>
                        <span className="text-[6px] tracking-tighter">PRINCIPAL</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-800">Principal Digital Seal</span>
                      <span className="text-[10px] text-emerald-600 font-mono font-medium">Verified Active</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setPrincipalSealUploaded(true)}
                      className="text-xs font-semibold text-brand-primary hover:underline cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload Revised Seal (.PNG / .SVG)</span>
                    </button>
                    <span className="text-[10px] text-slate-400">Max size 2MB</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleSaveSettings}
                    leftIcon={<Save className="h-3.5 w-3.5" />}
                  >
                    Save Branding Changes
                  </Button>
                  {settingsSaved && (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      <span>Branding configuration updated!</span>
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: SSO & Directory CSV Onboarding (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            {/* SSO Configuration */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle>Institutional SSO &amp; Domain Isolation</CardTitle>
                <CardDescription>
                  Enforces authentication strictly through college-authorized Google Workspace / Azure AD accounts.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5">
                <Input
                  label="Authorized Campus Domain"
                  value={ssoDomain}
                  onChange={(e) => setSsoDomain(e.target.value)}
                  helperText="Restricts user sign-in strictly to @sistec.ac.in accounts"
                />

                <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs text-emerald-800 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Zero Public Signup Enforced</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-emerald-900">
                    Students and faculty cannot self-register with personal Gmail/Yahoo accounts. Access is pre-provisioned via the campus directory.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Institutional Directory & CSV Onboarding */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Institutional Directory &amp; Roster Sync</CardTitle>
                    <CardDescription>
                      Bulk student enrollment and faculty mentor onboarding.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-medium">Synced Faculty Mentors</span>
                    <div className="text-lg font-bold font-mono text-slate-900 pt-0.5">88 Faculty</div>
                    <span className="text-[10px] text-emerald-600">Active in Department Lists</span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-medium">Enrolled Students</span>
                    <div className="text-lg font-bold font-mono text-slate-900 pt-0.5">1,280 Students</div>
                    <span className="text-[10px] text-slate-500">Pre-Registered Cohort</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Need to update cohort rosters?</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}
                    onClick={() => setShowCsvImportModal(true)}
                  >
                    Import Faculty / Student CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ACCREDITATION (NBA CRITERION 2 & 3 SIGN-OFF MATRIX)                 */}
      {/* ========================================================================= */}
      {activeTab === "compliance" && (
        <section className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-heading">
              Institutional Accreditation &amp; NBA Readiness
            </h2>
            <p className="text-xs text-slate-500">
              Automated synthesis monitoring NBA Criterion 2 (Student Support &amp; Progression) and Criterion 3 (Course Outcomes).
            </p>
          </div>

          {/* 3 Top Accreditation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Institutional SAR Status</span>
                <Badge variant="success" size="sm" dot>Accredited</Badge>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">91.4% Overall</div>
                <p className="text-[11px] text-slate-500">All 4 engineering branches satisfy the mandatory 80/20 CO-PO threshold.</p>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                <span>Next Audit Cycle:</span>
                <span className="font-semibold text-slate-900 font-mono">November 2026</span>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Signed SAR Dossiers</span>
                <Badge variant="info" size="sm">4 Branches</Badge>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-bold font-mono text-emerald-700 tabular-nums">3 of 4 Attested</div>
                <p className="text-[11px] text-slate-500">CSE, ECE, and CE final rubric scorecards attested by departmental HODs.</p>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[11px] flex justify-end">
                <button
                  type="button"
                  onClick={handleDownloadSarSummary}
                  className="font-semibold text-brand-primary hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download College SAR Summary &rarr;</span>
                </button>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">NBA Peer-Team Audit Readiness</span>
                <Badge variant="success" size="sm" dot>Ready</Badge>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">3 Best / 3 Avg / 3 Weak</div>
                <p className="text-[11px] text-slate-500">Cryptographic audit packages ready for direct peer-team inspection.</p>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                <span>Auditor Portal:</span>
                <span className="font-mono text-emerald-700 font-semibold">Active &amp; Verified</span>
              </div>
            </Card>
          </div>

          {exportSarSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>College-wide SAR Criterion 2 &amp; 3 Summary Packager downloaded successfully.</span>
              </span>
              <span className="text-[10px] font-mono">SAR_SISTEC_2026.pdf</span>
            </div>
          )}

          {/* Departmental NBA Sign-Off Matrix Table */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle>Departmental NBA Sign-Off Matrix</CardTitle>
              <CardDescription>
                Criterion 3 attainment percentages, official HOD attestation statuses, and audit ZIP packages.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Engineering Department</th>
                    <th className="py-3 px-4">Appointed HOD</th>
                    <th className="py-3 px-4">Criterion 3 Attainment %</th>
                    <th className="py-3 px-4">HOD Sign-Off Status</th>
                    <th className="py-3 px-4 text-right">Audit Package Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-900">
                  {departments.map((dept) => {
                    const isAttested = dept.hodSignOffStatus === "Attested & Locked";
                    const isExporting = exportingDeptCode === dept.code;

                    return (
                      <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-brand-primary-tint text-brand-primary border border-brand-primary-border">
                            {dept.code}
                          </span>
                          <span>{dept.name}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {dept.hodName || "Appointed HOD"}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700 tabular-nums">
                          {dept.criterion3Attainment || 80.0}% (Exceeds Target)
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              isAttested
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isAttested ? "bg-emerald-600" : "bg-amber-600"
                              }`}
                            />
                            {dept.hodSignOffStatus || "Attested & Locked"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleExportBranchZip(dept.code)}
                            className="text-xs font-semibold text-brand-primary hover:text-brand-primary-hover hover:underline cursor-pointer flex items-center justify-end gap-1 ml-auto"
                          >
                            {isExporting ? (
                              <span className="text-slate-400">Packaging ZIP...</span>
                            ) : (
                              <>
                                <Download className="h-3.5 w-3.5" />
                                <span>Export Branch ZIP</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ========================================================================= */}
      {/* MODALS & DRAWERS                                                          */}
      {/* ========================================================================= */}

      {/* 1. Add Department Modal */}
      <Modal
        isOpen={showAddDeptModal}
        onClose={() => setShowAddDeptModal(false)}
        title="Add Academic Engineering Department"
        description="Provision a new academic branch and appoint departmental leadership for project cycle sign-offs."
        maxWidth="md"
      >
        <form onSubmit={handleCreateDepartment} className="space-y-3.5 text-xs">
          <Input
            label="Department Name"
            placeholder="e.g. Artificial Intelligence & Data Science"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Department Code"
              placeholder="e.g. AIDS"
              value={newDeptCode}
              onChange={(e) => setNewDeptCode(e.target.value)}
              required
            />
            <Input
              label="Appointed HOD Full Name"
              placeholder="e.g. Dr. Vikram Sengupta"
              value={newDeptHod}
              onChange={(e) => setNewDeptHod(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Enrolled Student Capacity"
              type="number"
              placeholder="120"
              value={newDeptIntake}
              onChange={(e) => setNewDeptIntake(e.target.value)}
            />
            <Input
              label="Faculty Mentors Allotted"
              type="number"
              placeholder="12"
              value={newDeptFaculty}
              onChange={(e) => setNewDeptFaculty(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button size="sm" variant="secondary" onClick={() => setShowAddDeptModal(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit">
              Provision Department
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Launch New Academic Cycle Modal */}
      <Modal
        isOpen={showNewCycleModal}
        onClose={() => setShowNewCycleModal(false)}
        title="Launch Academic Project Cycle"
        description="Configure calendar year, student team proposal cutoff, and final evaluation windows across all branches."
        maxWidth="md"
      >
        <form onSubmit={handleLaunchCycle} className="space-y-3.5 text-xs">
          {cycleSavedToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Academic cycle launched successfully across all branches!</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Academic Year"
              value={cycleYear}
              onChange={(e) => setCycleYear(e.target.value)}
              placeholder="2026–2027"
              required
            />
            <Select
              label="Project Type & Semester"
              value={cycleType}
              onChange={(e) => {
                const type = e.target.value as "Minor" | "Major";
                setCycleType(type);
                setCycleSem(type === "Minor" ? "6" : "8");
              }}
              options={[
                { label: "Minor Project (Semester 6)", value: "Minor" },
                { label: "Major Project (Semester 8)", value: "Major" },
              ]}
            />
          </div>

          <Input
            label="Proposal Submission Cutoff Date"
            type="date"
            value={cycleDeadline}
            onChange={(e) => setCycleDeadline(e.target.value)}
            required
          />

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-[11px] leading-relaxed">
            Launching this cycle will automatically open student proposal submission portals across CSE, ECE, ME, and CE departments.
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button size="sm" variant="secondary" onClick={() => setShowNewCycleModal(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit">
              Launch Cycle Across Branches
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. CSV Onboarding Modal */}
      <Modal
        isOpen={showCsvImportModal}
        onClose={() => setShowCsvImportModal(false)}
        title="Bulk Roster CSV Onboarding"
        description="Import student enrollment lists and faculty mentor directory to pre-provision campus accounts."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          {csvImportSuccess ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2 text-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
              <div className="font-bold text-sm">Directory Synchronized!</div>
              <p className="text-[11px]">
                Successfully pre-provisioned 1,280 student accounts and 88 faculty mentor profiles into the SISTec tenant database partition.
              </p>
            </div>
          ) : (
            <>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center space-y-2 hover:border-brand-primary transition-colors cursor-pointer bg-slate-50/50">
                <FileSpreadsheet className="h-8 w-8 text-brand-primary mx-auto" />
                <div className="font-semibold text-slate-800 text-xs">
                  {csvFileName || "Drag and drop your official university CSV here"}
                </div>
                <p className="text-[10px] text-slate-500">
                  Required columns: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">USN, StudentName, BranchCode, Email, Semester</code>
                </p>
                <button
                  type="button"
                  onClick={() => setCsvFileName("SISTEC_RGPV_Batch_2026_Enrolled.csv")}
                  className="text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                >
                  Or click to load sample university CSV
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <Button size="sm" variant="secondary" onClick={() => setShowCsvImportModal(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSimulateCsvImport}
                  disabled={!csvFileName}
                >
                  Confirm &amp; Sync Directory
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* 4. Inspect Department Slide-Over Drawer */}
      <SlideOverDrawer
        isOpen={!!inspectingDept}
        onClose={() => setInspectingDept(null)}
        title={inspectingDept ? `${inspectingDept.name} (${inspectingDept.code})` : "Department Details"}
        subtitle="Branch-level NBA Criterion 3 attainment, student intake & appointed leadership"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button size="sm" variant="ghost" onClick={() => setInspectingDept(null)}>
              Close
            </Button>
            <Button size="sm" variant="primary" onClick={handleReassignHodSubmit}>
              Save HOD Assignment
            </Button>
          </div>
        }
      >
        {inspectingDept && (
          <div className="space-y-5 text-xs">
            {hodReassignedToast && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Head of Department reassigned &amp; synced across system.</span>
              </div>
            )}

            {/* Current HOD Leadership */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="font-bold text-slate-900 block">Current Department Leadership</span>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xs text-slate-900">
                    {inspectingDept.hodName || "Dr. Ravindra Kumar Sharma"}
                  </div>
                  <div className="text-[11px] text-slate-500">Head of Department (HOD)</div>
                </div>
                <Badge variant="success" size="sm" dot>
                  Authorized
                </Badge>
              </div>
            </div>

            {/* Reassign HOD Selector */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 block">Reassign Head of Department</span>
              <Select
                label="Select Senior Professor / Doctorate Lead"
                value={selectedHodName}
                onChange={(e) => setSelectedHodName(e.target.value)}
                options={[
                  { label: "Dr. Ravindra Kumar Sharma (Professor)", value: "Dr. Ravindra Kumar Sharma" },
                  { label: "Dr. Ananya Deshmukh (Professor)", value: "Dr. Ananya Deshmukh" },
                  { label: "Prof. Rajesh Kulkarni (Associate Professor)", value: "Prof. Rajesh Kulkarni" },
                  { label: "Dr. Sunita Tiwari (Professor)", value: "Dr. Sunita Tiwari" },
                  { label: "Dr. Amit Rawat (Professor)", value: "Dr. Amit Rawat" },
                  { label: "Prof. S. K. Verma (Associate Professor)", value: "Prof. S. K. Verma" },
                ]}
              />
            </div>

            {/* Department Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-0.5">
                <span className="text-[11px] text-slate-500">Enrolled Intake</span>
                <div className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                  {inspectingDept.studentCount}
                </div>
                <span className="text-[10px] text-emerald-600">Active in Minor Sem 6</span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-0.5">
                <span className="text-[11px] text-slate-500">Faculty Mentors</span>
                <div className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                  {inspectingDept.facultyCount}
                </div>
                <span className="text-[10px] text-slate-500">Avg 3.8 teams / mentor</span>
              </div>
            </div>

            {/* NBA Criterion 3 Attainment */}
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900">NBA Criterion 3 Attainment</span>
                <Badge variant="success" size="sm">
                  {inspectingDept.criterion3Attainment || 80.0}%
                </Badge>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Calculated directly from weekly guide continuous assessments and locked defense rubrics. Target threshold (≥ 70%) is exceeded across all course outcomes.
              </p>
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </AppShell>
  );
};
