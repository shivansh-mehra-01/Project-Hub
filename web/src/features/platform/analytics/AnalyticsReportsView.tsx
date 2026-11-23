"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  CheckCircle2,
  Calendar,
  Filter,
  FileSpreadsheet,
  Download,
  Search,
  ArrowRight,
  TrendingUp,
  FolderGit2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  FileText,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { usePlatformData, CollegeTenantRecord } from "../data/platformDataStore";
import { showToast } from "@/lib/toast";

export type DateRangePreset = "30d" | "90d" | "ay2026" | "custom";
export type ReportType = "platform-usage" | "college-usage" | "college-growth";

interface CollegeUsageItem {
  id: string;
  name: string;
  shortName: string;
  code: string;
  university: string;
  status: "Active" | "Inactive";
  registeredStudents: number;
  activeStudents: number;
  registeredFaculty: number;
  activeFaculty: number;
  ongoingProjects: number;
  lastActivity: string;
}

interface GeneratedReportRecord {
  id: string;
  name: string;
  reportType: ReportType;
  targetScope: string;
  dateRangeLabel: string;
  generatedAt: string;
  filename: string;
  csvContent: string;
  fileSizeBytes: number;
}

function formatIST(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const parts = dateStr.split(" ");
    if (parts.length === 2 && parts[0].includes("-") && parts[1].includes(":")) {
      const [year, month, day] = parts[0].split("-");
      const [hours, minutes] = parts[1].split(":");
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];
      const mIdx = parseInt(month, 10) - 1;
      const mName = monthNames[mIdx] || month;
      const h = parseInt(hours, 10);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${day} ${mName} ${year}, ${String(h12).padStart(2, "0")}:${minutes} ${ampm} IST`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export const AnalyticsReportsView: React.FC = () => {
  const { colleges } = usePlatformData();

  useDashboardHeader({
    title: "Analytics & Adoption",
    breadcrumb: "Operations / Analytics & Adoption",
  });

  // ---------------------------------------------------------------------------
  // 1. DATE RANGE STATE (Affects period-specific metrics, trend & reports)
  // ---------------------------------------------------------------------------
  const [dateRange, setDateRange] = useState<DateRangePreset>("30d");
  const [customStartDate, setCustomStartDate] = useState("2026-10-01");
  const [customEndDate, setCustomEndDate] = useState("2026-11-22");

  const dateRangeLabel = useMemo(() => {
    switch (dateRange) {
      case "30d":
        return "Last 30 Days";
      case "90d":
        return "Last 90 Days";
      case "ay2026":
        return "This Academic Year (2026–2027)";
      case "custom":
        return `${customStartDate} to ${customEndDate}`;
    }
  }, [dateRange, customStartDate, customEndDate]);

  // ---------------------------------------------------------------------------
  // 2. COLLEGE-WISE METRICS DERIVATION
  // ---------------------------------------------------------------------------
  const collegeUsageData: CollegeUsageItem[] = useMemo(() => {
    return colleges.map((c) => {
      const isSistec = c.code === "SISTEC";
      const isLnct = c.code === "LNCT";
      const isMedicaps = c.code === "MEDICAPS";
      const isUit = c.code === "UITRGPV";
      const isIps = c.code === "IPSACAD";

      // Period scaling factors based on date range
      const periodRatio = dateRange === "30d" ? 0.82 : dateRange === "90d" ? 0.88 : 0.92;

      let activeStudents = 0;
      let activeFaculty = 0;
      let ongoingProjects = 0;
      let lastActivity = "";
      const status: "Active" | "Inactive" = c.status === "Active" ? "Active" : "Inactive";

      if (status === "Active") {
        if (isSistec) {
          activeStudents = Math.round(c.totalStudents * periodRatio);
          activeFaculty = Math.round(c.totalFaculty * 0.86);
          ongoingProjects = 370;
          lastActivity = "2026-11-21 14:10:00";
        } else if (isLnct) {
          activeStudents = Math.round(c.totalStudents * (periodRatio - 0.02));
          activeFaculty = Math.round(c.totalFaculty * 0.84);
          ongoingProjects = 740;
          lastActivity = "2026-11-21 16:20:00";
        } else if (isMedicaps) {
          activeStudents = Math.round(c.totalStudents * (periodRatio - 0.04));
          activeFaculty = Math.round(c.totalFaculty * 0.82);
          ongoingProjects = 510;
          lastActivity = "2026-11-20 16:40:00";
        } else if (isUit) {
          activeStudents = Math.round(c.totalStudents * (periodRatio - 0.03));
          activeFaculty = Math.round(c.totalFaculty * 0.85);
          ongoingProjects = 320;
          lastActivity = "2026-11-20 14:15:00";
        } else {
          activeStudents = Math.round(c.totalStudents * 0.75);
          activeFaculty = Math.round(c.totalFaculty * 0.75);
          ongoingProjects = Math.round(c.totalStudents / 4.2);
          lastActivity = "2026-11-18 11:30:00";
        }
      } else {
        // Inactive / pending verification colleges have 0 active usage in period
        activeStudents = 0;
        activeFaculty = 0;
        ongoingProjects = 0;
        lastActivity = "2026-11-10 16:20:00";
      }

      return {
        id: c.id,
        name: c.name,
        shortName: c.shortName || c.name,
        code: c.code,
        university: c.university,
        status,
        registeredStudents: c.totalStudents,
        activeStudents,
        registeredFaculty: c.totalFaculty,
        activeFaculty,
        ongoingProjects,
        lastActivity,
      };
    });
  }, [colleges, dateRange]);

  // ---------------------------------------------------------------------------
  // 3. FOUR PRIMARY METRICS
  // ---------------------------------------------------------------------------
  // Cumulative Counts (strictly do NOT change with date range)
  const totalOnboardedColleges = colleges.filter(
    (c) => c.status === "Active" || c.status === "Pending Verification"
  ).length;

  const totalRegisteredStudents = colleges.reduce((sum, c) => sum + c.totalStudents, 0);

  // Period-Specific Activity Metrics
  const activeCollegesCount = collegeUsageData.filter((c) => c.status === "Active" && c.activeStudents > 0).length;
  const activeProjectsCount = collegeUsageData.reduce((sum, c) => sum + c.ongoingProjects, 0);
  const totalActiveStudents = collegeUsageData.reduce((sum, c) => sum + c.activeStudents, 0);
  const totalActiveFaculty = collegeUsageData.reduce((sum, c) => sum + c.activeFaculty, 0);

  // ---------------------------------------------------------------------------
  // 4. PLATFORM ADOPTION TREND (Interval milestones matching date range)
  // ---------------------------------------------------------------------------
  const adoptionMilestones = useMemo(() => {
    if (dateRange === "30d") {
      return [
        { label: "Week 1 (Oct 24 - Oct 31)", activeColleges: 3, activeStudents: 5900, percentage: 65 },
        { label: "Week 2 (Nov 01 - Nov 07)", activeColleges: 4, activeStudents: 6450, percentage: 71 },
        { label: "Week 3 (Nov 08 - Nov 14)", activeColleges: 4, activeStudents: 6880, percentage: 75 },
        { label: "Week 4 (Nov 15 - Nov 22)", activeColleges: 4, activeStudents: totalActiveStudents, percentage: 79 },
      ];
    } else if (dateRange === "90d") {
      return [
        { label: "Sep 2026", activeColleges: 3, activeStudents: 5200, percentage: 57 },
        { label: "Oct 2026", activeColleges: 4, activeStudents: 6300, percentage: 69 },
        { label: "Nov 2026", activeColleges: 4, activeStudents: totalActiveStudents, percentage: 79 },
      ];
    } else {
      return [
        { label: "Q1 (Jul - Aug 2026)", activeColleges: 2, activeStudents: 3800, percentage: 42 },
        { label: "Q2 (Sep - Oct 2026)", activeColleges: 4, activeStudents: 6300, percentage: 69 },
        { label: "Q3 to Date (Nov 2026)", activeColleges: 4, activeStudents: totalActiveStudents, percentage: 79 },
      ];
    }
  }, [dateRange, totalActiveStudents]);

  // ---------------------------------------------------------------------------
  // 5. COLLEGE-WISE TABLE: SEARCH, FILTER, SORT & PAGINATION
  // ---------------------------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [sortField, setSortField] = useState<"activeStudents" | "ongoingProjects" | "lastActivity" | "name">("activeStudents");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filteredColleges = useMemo(() => {
    let result = collegeUsageData.filter((c) => {
      if (statusFilter !== "All" && c.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.university.toLowerCase().includes(q)
        );
      }
      return true;
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "activeStudents") {
        comparison = a.activeStudents - b.activeStudents;
      } else if (sortField === "ongoingProjects") {
        comparison = a.ongoingProjects - b.ongoingProjects;
      } else if (sortField === "lastActivity") {
        comparison = new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime();
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

    return result;
  }, [collegeUsageData, searchTerm, statusFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredColleges.length / itemsPerPage) || 1;
  const paginatedColleges = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredColleges.slice(start, start + itemsPerPage);
  }, [filteredColleges, currentPage]);

  const handleSortChange = (field: "activeStudents" | "ongoingProjects" | "lastActivity" | "name") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // ---------------------------------------------------------------------------
  // 6. REPORTS GENERATOR
  // ---------------------------------------------------------------------------
  const [selectedReportType, setSelectedReportType] = useState<ReportType>("platform-usage");
  const [selectedReportCollege, setSelectedReportCollege] = useState<string>("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReportsHistory, setGeneratedReportsHistory] = useState<GeneratedReportRecord[]>([]);

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    setTimeout(() => {
      setIsGenerating(false);
      const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
      const targetCollegeRecord = colleges.find((c) => c.code === selectedReportCollege);
      const targetScopeName = selectedReportCollege === "all" ? "All Onboarded Colleges" : targetCollegeRecord?.name || selectedReportCollege;

      let csv = "";
      let filename = "";

      if (selectedReportType === "platform-usage") {
        filename = `Colabex_Platform_Usage_Summary_${dateRange}_${Date.now()}.csv`;
        csv = [
          `"Colabex SaaS Platform - Platform Usage Summary Report"`,
          `"Reporting Period: ${dateRangeLabel}"`,
          `"Generated At: ${timestamp} IST"`,
          `"Target Scope: ${targetScopeName}"`,
          `""`,
          `"Metric","Value","Type","Description"`,
          `"Total Onboarded Colleges",${totalOnboardedColleges},"Cumulative","Total institutions onboarded on Colabex platform"`,
          `"Active Colleges in Period",${activeCollegesCount},"Period-Specific","Institutions with active project or review transactions"`,
          `"Total Registered Students",${totalRegisteredStudents},"Cumulative","Enrolled student accounts in platform database"`,
          `"Active Students in Period",${totalActiveStudents},"Period-Specific","Students performing project sprints or review submissions"`,
          `"Total Registered Faculty",${colleges.reduce((s, c) => s + c.totalFaculty, 0)},"Cumulative","Faculty mentor and coordinator accounts"`,
          `"Active Faculty in Period",${totalActiveFaculty},"Period-Specific","Faculty participating in guidance and assessment"`,
          `"Currently Ongoing Projects",${activeProjectsCount},"Period-Specific","Projects actively ongoing across campuses"`,
          `"Completed Capstone Projects",380,"Period-Specific","Projects successfully completed and archived"`,
        ].join("\n");
      } else if (selectedReportType === "college-usage") {
        filename = `Colabex_College_Usage_Report_${selectedReportCollege}_${Date.now()}.csv`;
        const targetList =
          selectedReportCollege === "all"
            ? collegeUsageData
            : collegeUsageData.filter((c) => c.code === selectedReportCollege);

        csv = [
          `"Colabex SaaS Platform - College-wise Usage Report"`,
          `"Reporting Period: ${dateRangeLabel}"`,
          `"Generated At: ${timestamp} IST"`,
          `"Target Scope: ${targetScopeName}"`,
          `""`,
          `"College Name","College Code","University","Status","Registered Students","Active Students","Adoption Rate","Registered Faculty","Active Faculty","Ongoing Projects","Last Activity"`,
          ...targetList.map((m) => {
            const adoptionRate = m.registeredStudents > 0 ? ((m.activeStudents / m.registeredStudents) * 100).toFixed(1) + "%" : "0.0%";
            return `"${m.name}","${m.code}","${m.university}","${m.status}",${m.registeredStudents},${m.activeStudents},"${adoptionRate}",${m.registeredFaculty},${m.activeFaculty},${m.ongoingProjects},"${m.lastActivity} IST"`;
          }),
        ].join("\n");
      } else {
        filename = `Colabex_College_Growth_Report_${dateRange}_${Date.now()}.csv`;
        csv = [
          `"Colabex SaaS Platform - College Growth & Onboarding Report"`,
          `"Reporting Period: ${dateRangeLabel}"`,
          `"Generated At: ${timestamp} IST"`,
          `"Target Scope: ${targetScopeName}"`,
          `""`,
          `"Metric","Value","Period","Operational Notes"`,
          `"Colleges Onboarded in Period",1,"Period-Specific","New college tenant partitions provisioned"`,
          `"Total Operational Colleges",${totalOnboardedColleges},"Cumulative","Active institutions utilizing Colabex enterprise modules"`,
          `"Active College Adoption Rate","${((activeCollegesCount / (totalOnboardedColleges || 1)) * 100).toFixed(1)}%","Period-Specific","Percentage of colleges with ongoing student team sprints"`,
          `"New Student Registrations",320,"Period-Specific","New student accounts enrolled during selected timeframe"`,
          `"New Faculty Registrations",18,"Period-Specific","New institutional mentors and guides inducted"`,
          `"New Projects Initiated",140,"Period-Specific","New semester capstone projects approved in period"`,
        ].join("\n");
      }

      // Download file to browser
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const reportRecord: GeneratedReportRecord = {
        id: `rep-${Date.now().toString().slice(-4)}`,
        name:
          selectedReportType === "platform-usage"
            ? "Platform Usage Summary Report"
            : selectedReportType === "college-usage"
            ? "College-wise Usage Report"
            : "College Growth & Onboarding Report",
        reportType: selectedReportType,
        targetScope: targetScopeName,
        dateRangeLabel,
        generatedAt: formatIST(timestamp),
        filename,
        csvContent: csv,
        fileSizeBytes: blob.size,
      };

      setGeneratedReportsHistory((prev) => [reportRecord, ...prev]);
      showToast(`Report downloaded successfully: ${filename}`, "success");
    }, 600);
  };

  const downloadHistoryReport = (rep: GeneratedReportRecord) => {
    const blob = new Blob([rep.csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = rep.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded: ${rep.filename}`, "info");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ===================================================================== */}
      {/* PAGE HEADER & ACCESSIBLE DATE RANGE SELECTOR                          */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Analytics &amp; Adoption</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track platform adoption, multi-tenant utilization, and institutional growth across Colabex.
          </p>
        </div>

        {/* Compact Date Range Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs text-xs font-medium">
            <button
              onClick={() => setDateRange("30d")}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                dateRange === "30d"
                  ? "bg-emerald-50 text-emerald-800 font-bold shadow-xs border border-emerald-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateRange("90d")}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                dateRange === "90d"
                  ? "bg-emerald-50 text-emerald-800 font-bold shadow-xs border border-emerald-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Last 90 Days
            </button>
            <button
              onClick={() => setDateRange("ay2026")}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                dateRange === "ay2026"
                  ? "bg-emerald-50 text-emerald-800 font-bold shadow-xs border border-emerald-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Academic Year
            </button>
            <button
              onClick={() => setDateRange("custom")}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                dateRange === "custom"
                  ? "bg-emerald-50 text-emerald-800 font-bold shadow-xs border border-emerald-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Custom
            </button>
          </div>

          {dateRange === "custom" && (
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 text-xs shadow-2xs">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-0.5 border border-slate-300 rounded text-slate-700 font-mono text-[11px]"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-0.5 border border-slate-300 rounded text-slate-700 font-mono text-[11px]"
              />
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 1: PLATFORM OVERVIEW (4 PRIMARY METRICS & ADOPTION TREND)      */}
      {/* ===================================================================== */}
      <div className="space-y-4">
        {/* Four Primary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Colleges (Cumulative) */}
          <Link
            href="/platform/colleges"
            className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Colleges</span>
              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 group-hover:text-slate-900 group-hover:bg-slate-100 transition-colors">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {totalOnboardedColleges}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Onboarded institutions (Cumulative)
              </p>
            </div>
          </Link>

          {/* 2. Active Colleges (Period-Specific) */}
          <Link
            href="/platform/colleges?status=Approved"
            className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Active Colleges</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100/80 transition-colors">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {activeCollegesCount}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Active in {dateRangeLabel}
              </p>
            </div>
          </Link>

          {/* 3. Registered Students (Cumulative) */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Registered Students</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {totalRegisteredStudents.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Enrolled student accounts (Cumulative)
              </p>
            </div>
          </div>

          {/* 4. Active Projects (Period-Specific) */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Active Projects</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <FolderGit2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {activeProjectsCount.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Ongoing projects in {dateRangeLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Compact Platform Adoption Trend */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Active Platform Adoption Trend ({dateRangeLabel})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified institutional activity progression and active student engagement over time.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {activeCollegesCount} of {totalOnboardedColleges} Colleges Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {adoptionMilestones.map((m, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-lg space-y-2 text-xs"
              >
                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <span className="text-[11px] truncate" title={m.label}>{m.label}</span>
                  <span className="font-semibold text-slate-900">{m.percentage}%</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${m.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono">
                  <span>{m.activeColleges} Active Colleges</span>
                  <span>{m.activeStudents.toLocaleString("en-IN")} Students</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 2: COLLEGE-WISE PLATFORM USAGE (MAIN OPERATIONAL SECTION)     */}
      {/* ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">College-wise Platform Usage</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare platform adoption across institutions and identify colleges requiring engagement.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Showing {filteredColleges.length} {filteredColleges.length === 1 ? "College" : "Colleges"}
          </span>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by college name or code..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Institutions</option>
              <option value="Inactive">Inactive / Pending</option>
            </select>
          </div>

          {/* Quick Sort Options */}
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <span>Sort by:</span>
            <button
              onClick={() => handleSortChange("activeStudents")}
              className={`px-2 py-1 rounded border transition-colors cursor-pointer ${
                sortField === "activeStudents"
                  ? "bg-white border-slate-300 text-slate-900 font-bold shadow-2xs"
                  : "border-transparent text-slate-600 hover:bg-slate-200/50"
              }`}
            >
              Active Students {sortField === "activeStudents" && (sortOrder === "desc" ? "↓" : "↑")}
            </button>
            <button
              onClick={() => handleSortChange("ongoingProjects")}
              className={`px-2 py-1 rounded border transition-colors cursor-pointer ${
                sortField === "ongoingProjects"
                  ? "bg-white border-slate-300 text-slate-900 font-bold shadow-2xs"
                  : "border-transparent text-slate-600 hover:bg-slate-200/50"
              }`}
            >
              Projects {sortField === "ongoingProjects" && (sortOrder === "desc" ? "↓" : "↑")}
            </button>
            <button
              onClick={() => handleSortChange("lastActivity")}
              className={`px-2 py-1 rounded border transition-colors cursor-pointer ${
                sortField === "lastActivity"
                  ? "bg-white border-slate-300 text-slate-900 font-bold shadow-2xs"
                  : "border-transparent text-slate-600 hover:bg-slate-200/50"
              }`}
            >
              Last Activity {sortField === "lastActivity" && (sortOrder === "desc" ? "↓" : "↑")}
            </button>
          </div>
        </div>

        {/* Table Content */}
        {filteredColleges.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-800">No colleges found</p>
            <p className="text-xs text-slate-500 mt-0.5">
              No institution matched your filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4">College Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Registered Students</th>
                  <th className="py-3 px-4 text-right">Active Students</th>
                  <th className="py-3 px-4 text-right">Active Faculty</th>
                  <th className="py-3 px-4 text-right">Ongoing Projects</th>
                  <th className="py-3 px-4">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedColleges.map((college) => {
                  const isActive = college.status === "Active";
                  const adoptionRate =
                    college.registeredStudents > 0
                      ? Math.round((college.activeStudents / college.registeredStudents) * 100)
                      : 0;

                  return (
                    <tr key={college.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <Link
                          href={`/platform/colleges/${college.id}`}
                          className="font-semibold text-slate-900 hover:text-emerald-700 transition-colors inline-block"
                        >
                          {college.name}
                        </Link>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {college.code} &bull; {college.university}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {college.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-right">
                        {college.registeredStudents.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-bold text-slate-900">
                          {college.activeStudents.toLocaleString("en-IN")}
                        </div>
                        {isActive && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {adoptionRate}% adoption
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800 text-right font-medium">
                        {college.activeFaculty}
                        <span className="text-[10px] text-slate-400 block font-normal">
                          of {college.registeredFaculty}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 text-right">
                        {college.ongoingProjects.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                        {formatIST(college.lastActivity)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredColleges.length > 0 && (
          <div className="p-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredColleges.length)} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredColleges.length)} of {filteredColleges.length} Colleges
            </span>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <span className="font-medium text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* SECTION 3: REPORTS (PLATFORM-LEVEL EXPORT CENTER)                     */}
      {/* ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Platform Reports
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate and download platform adoption, institutional usage, and platform expansion CSV reports.
          </p>
        </div>

        {/* Generation Form */}
        <form onSubmit={handleGenerateReport} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Report Type */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">Report Type</label>
            <select
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value as ReportType)}
              className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
            >
              <option value="platform-usage">Platform Usage Summary</option>
              <option value="college-usage">College-wise Usage Report</option>
              <option value="college-growth">College Growth Report</option>
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {selectedReportType === "platform-usage" && "Consolidated usage & active engagement metrics."}
              {selectedReportType === "college-usage" && "Adoption comparison across institutions."}
              {selectedReportType === "college-growth" && "Onboarding expansion & registration velocity."}
            </span>
          </div>

          {/* Target College */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">Target College</label>
            <select
              value={selectedReportCollege}
              onChange={(e) => setSelectedReportCollege(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Affiliated Colleges</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {selectedReportCollege === "all" ? "Aggregate all onboarded institutions" : "Filter export to single institution"}
            </span>
          </div>

          {/* Date Range Scope */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">Date Range</label>
            <div className="p-2 border border-slate-200 bg-slate-50/70 rounded-lg text-slate-800 font-medium">
              {dateRangeLabel}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Synchronized with the page date selector
            </span>
          </div>

          {/* Format & Trigger Action */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">Format &amp; Action</label>
            <div className="flex items-center gap-2">
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold text-xs flex-1">
                CSV (RFC 4180)
              </div>
              <button
                type="submit"
                disabled={isGenerating}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shrink-0 shadow-2xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                {isGenerating ? "Compiling..." : "Generate Report"}
              </button>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Downloads instantly to local drive
            </span>
          </div>
        </form>

        {/* Report Generation History / Feedback */}
        {generatedReportsHistory.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-semibold text-slate-900">Recently Generated Reports</h3>
            <div className="space-y-2">
              {generatedReportsHistory.map((rep) => (
                <div
                  key={rep.id}
                  className="p-3 bg-slate-50/80 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{rep.name}</span>
                      <span className="px-1.5 py-0.2 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                        Ready
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Scope: {rep.targetScope} &bull; Period: {rep.dateRangeLabel} &bull; Generated: {rep.generatedAt}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {Math.round(rep.fileSizeBytes / 1024 * 10) / 10} KB
                    </span>
                    <button
                      onClick={() => downloadHistoryReport(rep)}
                      className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-slate-500" />
                      Download Again
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
