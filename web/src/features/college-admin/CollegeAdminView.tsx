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
  ChevronDown,
  ChevronRight,
  FolderTree,
  LayoutGrid,
  Layers,
  BookOpen,
  BookMarked,
  CheckSquare,
  Square,
  Loader2,
  Info,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Modal } from "@/design-system/components/Modal";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { showToast } from "@/lib/toast";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { Department, ProjectCycle } from "@/mocks/store-types";

// Central RGPV B.Tech Engineering Branches Catalog
const RGPV_BTECH_CENTRAL_BRANCHES = [
  { code: "CSE", name: "Computer Science & Engineering" },
  { code: "IT", name: "Information Technology" },
  { code: "EC", name: "Electronics & Communication Engineering" },
  { code: "ME", name: "Mechanical Engineering" },
  { code: "CE", name: "Civil Engineering" },
  { code: "EE", name: "Electrical Engineering" },
  { code: "EX", name: "Electrical & Electronics Engineering" },
  { code: "AIML", name: "CSE (AI & Machine Learning)" },
  { code: "CS-DS", name: "CSE (Data Science)" },
  { code: "CS-CS", name: "CSE (Cyber Security)" },
  { code: "CS-IoT", name: "CSE (Internet of Things)" },
  { code: "CSBS", name: "Computer Science & Business Systems" },
];

export interface CollegeAdminViewProps {
  initialTab?: "overview" | "departments" | "settings" | "compliance";
}

export const CollegeAdminView: React.FC<CollegeAdminViewProps> = ({ initialTab = "overview" }) => {
  const router = useRouter();
  const {
    college,
    departments,
    cycle,
    academicSessions,
    coursePrograms,
    semesterTerms,
    subjectOfferings,
    addDepartment,
    reassignHOD,
    onboardCollege,
    updateCycle,
    importRgpvCatalog,
    configureAcademicSession,
  } = useProjectHubStore();

  const [activeTab, setActiveTab] = useState<"overview" | "departments" | "settings" | "compliance">(initialTab);
  
  // Modals & Drawers
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [inspectingDept, setInspectingDept] = useState<Department | null>(null);

  const activeSession = academicSessions?.find((s) => s.isActive) || academicSessions?.[0];

  // RGPV Catalog & Academic Hierarchy View State
  const [deptViewMode, setDeptViewMode] = useState<"cards" | "hierarchy">("cards");
  const [showRgpvImportModal, setShowRgpvImportModal] = useState(false);
  const [isImportingRgpv, setIsImportingRgpv] = useState(false);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>(["BTECH"]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([
    "CSE",
    "IT",
    "EC",
    "ME",
    "CE",
    "AIML",
  ]);
  const [showRequestBranchModal, setShowRequestBranchModal] = useState(false);
  const [requestBranchData, setRequestBranchData] = useState({
    name: "",
    code: "",
    program: "BTECH",
    approvalRef: "",
    remarks: "",
  });
  const [expandedPrograms, setExpandedPrograms] = useState<string[]>(["prog-btech-01", "BTECH"]);
  const [expandedBranches, setExpandedBranches] = useState<string[]>(["dept-cse", "CSE"]);
  const [rgpvSuccessToast, setRgpvSuccessToast] = useState<string | null>(null);

  const toggleProgram = (progKey: string) => {
    setExpandedPrograms((prev) =>
      prev.includes(progKey) ? prev.filter((k) => k !== progKey) : [...prev, progKey]
    );
  };

  const toggleBranch = (branchKey: string) => {
    setExpandedBranches((prev) =>
      prev.includes(branchKey) ? prev.filter((k) => k !== branchKey) : [...prev, branchKey]
    );
  };

  const handleImportRgpvSubmit = async () => {
    setIsImportingRgpv(true);
    try {
      const res = await importRgpvCatalog("RGPV", selectedPrograms, selectedBranches);
      setRgpvSuccessToast(res?.message || "Successfully configured academic structure from RGPV catalog!");
      setShowRgpvImportModal(false);
      setDeptViewMode("hierarchy");
      setTimeout(() => setRgpvSuccessToast(null), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsImportingRgpv(false);
    }
  };

  const handleRequestBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestBranchData.name.trim() || !requestBranchData.code.trim()) {
      showToast("Please provide branch name and code.", "error");
      return;
    }
    showToast(
      `Branch request for "${requestBranchData.name} (${requestBranchData.code.toUpperCase()})" submitted to Super Admin for central RGPV catalog review.`,
      "success"
    );
    setShowRequestBranchModal(false);
    setRequestBranchData({
      name: "",
      code: "",
      program: "BTECH",
      approvalRef: "",
      remarks: "",
    });
  };

  // New Department Form State
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptCode, setNewDeptCode] = useState("");
  const [newDeptHod, setNewDeptHod] = useState("");
  const [newDeptIntake, setNewDeptIntake] = useState("120");
  const [newDeptFaculty, setNewDeptFaculty] = useState("12");

  // Reassign HOD in Drawer
  const [selectedHodName, setSelectedHodName] = useState("");
  const [hodReassignedToast, setHodReassignedToast] = useState(false);

  // Institutional Academic Session Form State
  const [sessionYear, setSessionYear] = useState("2026–2027");
  const [sessionExamCutoff, setSessionExamCutoff] = useState("2027-05-31");
  const [sessionAllowInterdisciplinary, setSessionAllowInterdisciplinary] = useState(true);
  const [sessionSavedToast, setSessionSavedToast] = useState(false);

  // Human-readable date formatter
  const formatReadableDate = (dateStr?: string | null): string => {
    if (!dateStr) return "Not Scheduled";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[d.getUTCMonth()];
      const day = String(d.getUTCDate()).padStart(2, "0");
      const year = d.getUTCFullYear();
      let hours = d.getUTCHours();
      const minutes = String(d.getUTCMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const hourStr = String(hours).padStart(2, "0");
      return `${month} ${day}, ${year} • ${hourStr}:${minutes} ${ampm}`;
    } catch {
      return dateStr;
    }
  };

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

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    await configureAcademicSession({
      academicYear: sessionYear,
      examCutoffDateUtc: sessionExamCutoff ? `${sessionExamCutoff}T23:59:59Z` : undefined,
      allowInterdisciplinaryTeams: sessionAllowInterdisciplinary,
    });
    setSessionSavedToast(true);
    setTimeout(() => {
      setSessionSavedToast(false);
      setShowSessionModal(false);
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

  useDashboardHeader({
    title: "College Executive Console",
    breadcrumb: breadcrumbs[activeTab] || "Institutional Governance",
  });

  return (
    <div className="space-y-6">
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
                    {departments.reduce((acc, d) => acc + (d.studentCount || 120), 0).toLocaleString()}
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

          {/* Institutional Academic Session Governance Card */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <CardTitle>Institutional Academic Session Governance</CardTitle>
                <CardDescription>
                  Central campus academic calendar, institutional exam cutoff deadline, and campus-wide interdisciplinary policy.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => {
                  if (activeSession) {
                    setSessionYear(activeSession.label);
                    setSessionExamCutoff(activeSession.examCutoffDateUtc?.split("T")[0] || "2027-05-31");
                    setSessionAllowInterdisciplinary(activeSession.allowInterdisciplinaryTeams ?? true);
                  }
                  setShowSessionModal(true);
                }}
              >
                + Open Academic Session
              </Button>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Active Academic Session</span>
                <div className="text-sm font-bold text-slate-900 font-mono">
                  AY {activeSession?.label || "2026–2027"}
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active &amp; Enrolling
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Institutional Exam Cutoff Deadline</span>
                <div className="text-sm font-bold text-slate-900 font-mono">
                  {formatReadableDate(activeSession?.examCutoffDateUtc || "2027-05-31T23:59:59Z")}
                </div>
                <span className="text-[10px] text-slate-500">Campus-Wide Viva &amp; Defense Window</span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Campus Team Formation Policy</span>
                <div className="text-sm font-bold text-slate-900 font-mono">
                  {activeSession?.allowInterdisciplinaryTeams ? "Interdisciplinary Permitted" : "Strict Single-Branch"}
                </div>
                <span className="text-[10px] text-slate-500">
                  {activeSession?.allowInterdisciplinaryTeams
                    ? "Cross-Department Collaboration Enabled"
                    : "Single-Department Teams Only"}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Department Track Launch Readiness</span>
                <div className="text-sm font-bold text-slate-900 font-mono">
                  {departments.filter((d) => d.trackStatus === "Active").length} / {departments.length} Branches Active
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold">
                  {departments.filter((d) => d.trackStatus !== "Active").length === 0
                    ? "All Branches Launched by HODs"
                    : `${departments.filter((d) => d.trackStatus !== "Active").length} Awaiting HOD Launch`}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Departmental Performance Summary */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <CardTitle>Departmental Performance Summary</CardTitle>
                <CardDescription>
                  Branch partitions, appointed departmental leadership, live project track launch status, and Criterion 3 attainment.
                </CardDescription>
              </div>
              <Button size="sm" variant="secondary" onClick={() => switchTab("departments")}>
                Manage Branches &rarr;
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Branch Code</th>
                    <th className="py-3 px-4">Department Name</th>
                    <th className="py-3 px-4">Appointed HOD</th>
                    <th className="py-3 px-4">Track Status</th>
                    <th className="py-3 px-4">Enrolled Intake</th>
                    <th className="py-3 px-4">Faculty Mentors</th>
                    <th className="py-3 px-4 text-right">Criterion 3 Attainment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-900">
                  {departments.map((dept) => {
                    const isTrackActive = dept.trackStatus === "Active";
                    return (
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
                        <td className="py-3 px-4">
                          {isTrackActive ? (
                            <Badge variant="success" size="sm" dot>
                              Active ({dept.activeTrackCount || 1} {(dept.activeTrackCount || 1) === 1 ? "Track" : "Tracks"})
                            </Badge>
                          ) : (
                            <Badge variant="warning" size="sm" dot>
                              Awaiting HOD Launch
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-800">
                          {dept.studentCount || 120} students
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-800">
                          {dept.facultyCount || 12} mentors
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                          {dept.criterion3Attainment || 80.0}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DEPARTMENTS & ACADEMIC HIERARCHY                                   */}
      {/* ========================================================================= */}
      {activeTab === "departments" && (
        <section className="space-y-4">
          {rgpvSuccessToast && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{rgpvSuccessToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setRgpvSuccessToast(null)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Department Tab Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-white">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-heading">
                  Academic Branches &amp; Dynamic Hierarchy
                </h2>
                <Badge variant="neutral" size="sm">
                  {departments.length} Branches Active
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Configure departmental quotas, review faculty-to-student ratios, and manage multi-level university course programs.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* View Switcher: Departments & HODs vs University Syllabus & Programs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setDeptViewMode("cards")}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    deptViewMode === "cards"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Departments & Appointed HODs View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Departments &amp; HODs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeptViewMode("hierarchy")}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    deptViewMode === "hierarchy"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="University Syllabus & Academic Program Tree"
                >
                  <FolderTree className="h-3.5 w-3.5 text-emerald-600" />
                  <span>University Syllabus &amp; Programs</span>
                </button>
              </div>

              {/* 1-Click Load RGPV Catalog Button */}
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Sparkles className="h-3.5 w-3.5 text-emerald-600" />}
                onClick={() => setShowRgpvImportModal(true)}
              >
                1-Click Load RGPV Catalog
              </Button>

              {/* Add Department Button */}
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setShowAddDeptModal(true)}
              >
                Add Department
              </Button>
            </div>
          </div>

          {/* VIEW MODE A: CARDS GRID */}
          {deptViewMode === "cards" && (
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
          )}

          {/* VIEW MODE B: DYNAMIC MULTI-LEVEL ACADEMIC HIERARCHY TREE */}
          {deptViewMode === "hierarchy" && (
            <div className="space-y-4">
              {/* Master University Affiliation Card */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs font-bold font-mono text-xs">
                    RGPV
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-emerald-950 font-heading">
                        Rajiv Gandhi Proudyogiki Vishwavidyalaya (State Technological University of M.P.)
                      </h3>
                      <Badge variant="success" size="sm">
                        CBCS / AICTE Flexible Scheme
                      </Badge>
                    </div>
                    <p className="text-xs text-emerald-800">
                      Standardized Curriculum Schemes, 4 Degree Programs, 19 Core &amp; 6 Emerging Engineering Branches with 60/40 Capstone Rubric Structure.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-emerald-950">
                      {coursePrograms.length} Programs • {departments.length} Branches
                    </div>
                    <div className="text-[11px] text-emerald-700 font-medium">
                      {subjectOfferings.length} Project Subject Offerings Active
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowRgpvImportModal(true)}
                    leftIcon={<Sparkles className="h-3 w-3 text-emerald-600" />}
                  >
                    Sync Catalog
                  </Button>
                </div>
              </div>

              {/* Course Programs & Department Branch Tree */}
              <div className="space-y-3">
                {coursePrograms.map((prog) => {
                  const isProgExpanded =
                    expandedPrograms.includes(prog.id) ||
                    expandedPrograms.includes(prog.code);
                  
                  // Filter departments belonging to this program, or all if BTECH fallback
                  const progDepts = departments.filter(
                    (d) =>
                      d.courseProgramId === prog.id ||
                      (!d.courseProgramId && prog.code === "BTECH")
                  );

                  return (
                    <div
                      key={prog.id}
                      className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-all"
                    >
                      {/* Program Header Accordion */}
                      <div
                        onClick={() => toggleProgram(prog.code || prog.id)}
                        className="p-3.5 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/80 transition-colors cursor-pointer border-b border-slate-100"
                      >
                        <div className="flex items-center gap-3">
                          <ChevronRight
                            className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                              isProgExpanded ? "rotate-90" : ""
                            }`}
                          />
                          <Badge
                            variant={
                              prog.level === "UG"
                                ? "success"
                                : prog.level === "PG"
                                ? "info"
                                : "neutral"
                            }
                            size="sm"
                          >
                            {prog.level}
                          </Badge>
                          <div>
                            <span className="font-mono font-bold text-xs text-slate-900 mr-2">
                              {prog.code}
                            </span>
                            <span className="font-semibold text-xs text-slate-900">
                              {prog.name}
                            </span>
                            <span className="text-[11px] text-slate-500 ml-2">
                              • {prog.totalSemesters} Semesters
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-600 font-medium">
                            {progDepts.length} Branches Assigned
                          </span>
                          <span className="text-xs text-slate-400">
                            {isProgExpanded ? "Collapse" : "Expand"}
                          </span>
                        </div>
                      </div>

                      {/* Program Content: Branches and Semesters */}
                      {isProgExpanded && (
                        <div className="p-3 bg-white space-y-3">
                          {progDepts.length === 0 ? (
                            <div className="text-center py-4 text-xs text-slate-400">
                              No departments currently configured for {prog.name}. Click &quot;1-Click Load RGPV Catalog&quot; to import standard university branches.
                            </div>
                          ) : (
                            progDepts.map((dept) => {
                              const isBranchExpanded =
                                expandedBranches.includes(dept.id) ||
                                expandedBranches.includes(dept.code);
                              
                              // Semesters for this branch with deduplication by semesterNumber
                              const branchSemesters = semesterTerms.filter(
                                (st) =>
                                  (st.departmentId === dept.id || st.departmentCode === dept.code || !st.departmentId) &&
                                  (!st.courseProgramId || st.courseProgramId === prog.id)
                              );

                              const uniqueSemesters = Array.from(
                                new Map(branchSemesters.map((s) => [s.semesterNumber, s])).values()
                              ).sort((a, b) => a.semesterNumber - b.semesterNumber);

                              return (
                                <div
                                  key={dept.id}
                                  className="rounded-lg border border-slate-200 bg-slate-50/40 p-3 space-y-2.5"
                                >
                                  {/* Branch Row */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                      <button
                                        type="button"
                                        onClick={() => toggleBranch(dept.code || dept.id)}
                                        className="p-1 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                                        title="Toggle Semesters & Subjects"
                                      >
                                        <ChevronRight
                                          className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                            isBranchExpanded ? "rotate-90" : ""
                                          }`}
                                        />
                                      </button>
                                      <span className="font-mono font-bold text-xs bg-brand-primary-tint text-brand-primary px-2 py-0.5 rounded border border-brand-primary-border">
                                        {dept.code}
                                      </span>
                                      <span className="font-bold text-xs text-slate-900">
                                        {dept.name}
                                      </span>
                                      <span className="text-[11px] text-slate-600 hidden md:inline">
                                        • HOD: {dept.hodName || "Appointed HOD"}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-[11px] font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                                        {dept.studentCount} Intake
                                      </span>
                                      <span className="text-[11px] font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                                        {dept.facultyCount} Mentors
                                      </span>
                                      <Badge variant="success" size="sm">
                                        {dept.criterion3Attainment || 80.0}% Attainment
                                      </Badge>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setInspectingDept(dept);
                                          setSelectedHodName(dept.hodName || "");
                                        }}
                                      >
                                        Inspect
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Branch Child: Semesters & Subject Offerings */}
                                  {isBranchExpanded && (
                                    <div className="pl-6 border-l-2 border-emerald-500/30 space-y-2 pt-1">
                                      {uniqueSemesters.length === 0 ? (
                                        <div className="text-[11px] text-slate-400 italic">
                                          No active semester terms linked.
                                        </div>
                                      ) : (
                                        uniqueSemesters.map((sem) => {
                                          const semOfferings = subjectOfferings.filter(
                                            (so) =>
                                              (so.departmentId === dept.id || !so.departmentId) &&
                                              so.semesterNumber === sem.semesterNumber
                                          );

                                          return (
                                            <div
                                              key={sem.id}
                                              className="p-2.5 rounded-md bg-white border border-slate-200 space-y-1.5"
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs font-bold text-slate-900 font-mono">
                                                    Semester {sem.semesterNumber}
                                                  </span>
                                                  <Badge variant="neutral" size="sm">
                                                    {sem.parity} Sem • {sem.academicSessionName || "AY 2025-26"}
                                                  </Badge>
                                                </div>
                                                <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">
                                                  {sem.isActive ? "Active Cohort" : "Archived"}
                                                </span>
                                              </div>

                                              {/* Subject Offerings inside Semester */}
                                              <div className="space-y-1 pt-1">
                                                {semOfferings.length === 0 ? (
                                                  <div className="text-[10px] text-slate-400">
                                                    Theory &amp; Laboratory Courses (No project capstone track in this semester)
                                                  </div>
                                                ) : (
                                                  semOfferings.map((so) => (
                                                    <div
                                                      key={so.id}
                                                      className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200/80 text-xs"
                                                    >
                                                      <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-brand-primary text-[11px]">
                                                          {so.subjectCode}
                                                        </span>
                                                        <span className="font-semibold text-slate-800">
                                                          {so.subjectName}
                                                        </span>
                                                        <Badge variant="info" size="sm">
                                                          {so.subjectType}
                                                        </Badge>
                                                        <span className="text-[11px] text-slate-500 font-mono">
                                                          {so.credits} Credits
                                                        </span>
                                                      </div>

                                                      <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-mono text-emerald-700 font-medium">
                                                          60% Internal Continuous / 40% External Viva
                                                        </span>
                                                        <Badge variant="success" size="sm" dot>
                                                          Track Active
                                                        </Badge>
                                                      </div>
                                                    </div>
                                                  ))
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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

      {/* 2. Open Institutional Academic Session Modal */}
      <Modal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        title="Open Institutional Academic Session"
        description="Configure campus academic year, institutional exam cutoff date, and interdisciplinary team policy for all departments."
        maxWidth="md"
      >
        <form onSubmit={handleOpenSession} className="space-y-4 text-xs">
          {sessionSavedToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Institutional academic session opened successfully!</span>
            </div>
          )}

          <div className="space-y-3.5">
            <Input
              label="Academic Year"
              value={sessionYear}
              onChange={(e) => setSessionYear(e.target.value)}
              placeholder="e.g. 2026–2027"
              required
              helperText="The overarching institutional academic year governing all campus programs."
            />

            <Input
              label="Institutional Exam Cutoff Date"
              type="date"
              value={sessionExamCutoff}
              onChange={(e) => setSessionExamCutoff(e.target.value)}
              required
              helperText="Campus-wide cutoff deadline for final viva/defense evaluations and rubric marks."
            />

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-900">
                  Allow Interdisciplinary Teams
                </span>
                <p className="text-[11px] text-slate-500">
                  Permit students from different engineering branches to form joint capstone teams.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSessionAllowInterdisciplinary(!sessionAllowInterdisciplinary)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  sessionAllowInterdisciplinary ? "bg-brand-primary" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    sessionAllowInterdisciplinary ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[11px] leading-relaxed">
            Opening this institutional session establishes the campus calendar. Individual semester project tracks (Minor/Major, Rubric Splits, Enrolment Modes) remain owned and launched by respective Department HODs.
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button size="sm" variant="secondary" onClick={() => setShowSessionModal(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit">
              Open Academic Session
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

      {/* 3.5. 1-Click Load RGPV Master Catalog Modal */}
      <Modal
        isOpen={showRgpvImportModal}
        onClose={() => setShowRgpvImportModal(false)}
        title="1-Click Load RGPV University Catalog"
        description="Instantly import official Rajiv Gandhi Proudyogiki Vishwavidyalaya standards into your college tenant partition."
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {/* RGPV Affiliation Header Box */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/80 space-y-1.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-700" />
              <span className="font-bold text-emerald-950 text-sm">
                Official RGPV Curriculum &amp; Academic Hierarchy Standards
              </span>
            </div>
            <p className="text-emerald-900 leading-relaxed text-[11px]">
              Loading university standards automatically maps standardized <strong>Curriculum Schemes (CBCS / AICTE Flexible)</strong>, degree programs, all core &amp; emerging engineering branches, odd/even semester terms, and Capstone Project course offerings with standard <strong>60% Continuous Assessment / 40% Final External Viva</strong> rubric splits.
            </p>
          </div>

          {/* Select Programs to Import */}
          <div className="space-y-2">
            <span className="font-bold text-slate-900 block text-xs">
              Select Degree Programs to Provision into College Partition:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  code: "BTECH",
                  title: "B.Tech (Undergraduate)",
                  desc: "19 Core + 6 Emerging Branches (CBCS / AICTE Flexible • 8 Semesters)",
                  level: "UG",
                  recommended: true,
                },
                {
                  code: "MTECH",
                  title: "M.Tech (Postgraduate)",
                  desc: "11 Advanced Specializations (AICTE CBCS • 4 Semesters)",
                  level: "PG",
                  recommended: true,
                },
                {
                  code: "MCA",
                  title: "MCA (Postgraduate)",
                  desc: "Master of Computer Applications (2-Year CBCS • 4 Semesters)",
                  level: "PG",
                  recommended: true,
                },
                {
                  code: "MBA",
                  title: "MBA (Postgraduate)",
                  desc: "Management Studies Dual Specialization (4 Semesters)",
                  level: "PG",
                  recommended: true,
                },
                {
                  code: "BPHARM",
                  title: "B.Pharm (Undergraduate)",
                  desc: "Pharmacy Council of India (PCI Scheme • 8 Semesters)",
                  level: "UG",
                  recommended: false,
                },
                {
                  code: "DIPLOMA",
                  title: "Diploma in Engineering",
                  desc: "State Polytechnic Board 3-Year Curriculum (6 Semesters)",
                  level: "Diploma",
                  recommended: false,
                },
              ].map((prog) => {
                const isSelected = selectedPrograms.includes(prog.code);
                return (
                  <div
                    key={prog.code}
                    onClick={() => {
                      setSelectedPrograms((prev) =>
                        isSelected
                          ? prev.filter((c) => c !== prog.code)
                          : [...prev, prog.code]
                      );
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/50 shadow-2xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="pt-0.5 text-emerald-700">
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs">
                          {prog.title}
                        </span>
                        {prog.recommended && (
                          <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {prog.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Select B.Tech Engineering Branches (from Central RGPV Master Catalog) */}
          {selectedPrograms.includes("BTECH") && (
            <div className="space-y-2.5 pt-3 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <span className="font-bold text-slate-900 block text-xs">
                    Select B.Tech Branches Offered by Your Institution:
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Only selected branches from the central catalog will be provisioned in your college partition.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedBranches(RGPV_BTECH_CENTRAL_BRANCHES.map((b) => b.code))
                    }
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    Select All ({RGPV_BTECH_CENTRAL_BRANCHES.length})
                  </button>
                  <span className="text-slate-300">&bull;</span>
                  <button
                    type="button"
                    onClick={() => setSelectedBranches([])}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Branch Checkboxes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {RGPV_BTECH_CENTRAL_BRANCHES.map((br) => {
                  const isChecked = selectedBranches.includes(br.code);
                  return (
                    <div
                      key={br.code}
                      onClick={() => {
                        setSelectedBranches((prev) =>
                          isChecked
                            ? prev.filter((c) => c !== br.code)
                            : [...prev, br.code]
                        );
                      }}
                      className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between gap-2 transition-all ${
                        isChecked
                          ? "bg-emerald-50/70 border-emerald-500 shadow-2xs font-semibold text-slate-900"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="text-emerald-700 shrink-0">
                          {isChecked ? (
                            <CheckSquare className="h-3.5 w-3.5" />
                          ) : (
                            <Square className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </div>
                        <span className="truncate text-[11px]">{br.name}</span>
                      </div>
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                        {br.code}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Request Missing Branch Callout */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>Missing a branch offered by your institution?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRequestBranchModal(true)}
                  className="font-bold text-emerald-800 hover:text-emerald-900 underline text-xs shrink-0 self-start sm:self-auto"
                >
                  Request Central Branch Addition &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Hierarchy Auto-Provisioning Notice */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 space-y-1 text-[11px]">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-slate-600" />
              <span>Multi-Tenant Row-Level Security (RLS) Isolation</span>
            </div>
            <p>
              Imported branches and course programs are safely tagged with SISTec&apos;s unique College ID (<code className="font-mono text-emerald-700">{college.id}</code>). All existing academic data, student enrollments, and guide assignments are fully preserved.
            </p>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowRgpvImportModal(false)}
              disabled={isImportingRgpv}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleImportRgpvSubmit}
              disabled={selectedPrograms.length === 0 || selectedBranches.length === 0 || isImportingRgpv}
              leftIcon={
                isImportingRgpv ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                )
              }
            >
              {isImportingRgpv
                ? "Importing RGPV Catalog..."
                : `Import ${selectedPrograms.length} Programs & ${selectedBranches.length} Branches`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 3.6. Request Central Branch Addition Modal */}
      <Modal
        isOpen={showRequestBranchModal}
        onClose={() => setShowRequestBranchModal(false)}
        title="Request Central Branch Addition"
        description="Submit a request to Super Admin to add a missing RGPV-approved engineering branch to the central catalog."
        maxWidth="md"
      >
        <form onSubmit={handleRequestBranchSubmit} className="space-y-3.5 text-xs">
          <Input
            label="Branch Name"
            placeholder="e.g. Robotics and Automation"
            value={requestBranchData.name}
            onChange={(e) => setRequestBranchData({ ...requestBranchData, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Branch Code"
              placeholder="e.g. RA"
              value={requestBranchData.code}
              onChange={(e) =>
                setRequestBranchData({ ...requestBranchData, code: e.target.value.toUpperCase() })
              }
              required
            />
            <Select
              label="Degree Program"
              value={requestBranchData.program}
              onChange={(e) => setRequestBranchData({ ...requestBranchData, program: e.target.value })}
              options={[
                { value: "BTECH", label: "B.Tech (Undergraduate)" },
                { value: "MTECH", label: "M.Tech (Postgraduate)" },
                { value: "MCA", label: "MCA" },
              ]}
            />
          </div>
          <Input
            label="RGPV Affiliation / AICTE Notification Order Ref"
            placeholder="e.g. RGPV/Acad/Affil/2026/892"
            value={requestBranchData.approvalRef}
            onChange={(e) => setRequestBranchData({ ...requestBranchData, approvalRef: e.target.value })}
          />
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Statutory Justification / Remarks
            </label>
            <textarea
              rows={2}
              value={requestBranchData.remarks}
              onChange={(e) => setRequestBranchData({ ...requestBranchData, remarks: e.target.value })}
              placeholder="Specify the ordinance or statutory approval details..."
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            Once verified by the Super Admin, this branch will become centrally available across all eligible RGPV colleges.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button size="sm" variant="secondary" onClick={() => setShowRequestBranchModal(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit">
              Submit Request
            </Button>
          </div>
        </form>
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
    </div>
  );
};
