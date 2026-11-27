"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Download,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  ArrowUpDown,
  RotateCcw,
  GraduationCap,
  Award,
  Users,
  CheckSquare,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Button } from "@/design-system/components/Button";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import {
  hodApi,
  getAuthToken,
  DepartmentStudentResultDto,
  HodReportsSummaryDto,
} from "@/lib/api";
import { HodMetricCard } from "../components/HodMetricCard";
import { HodTablePagination } from "../components/HodTablePagination";

type SortField = "usn" | "studentName" | "totalMarks";
type SortDirection = "asc" | "desc";

export const HodReportsView: React.FC = () => {
  useDashboardHeader({
    title: "Department Academic Reports & Tabulation",
    breadcrumb: "HOD Console • Reports",
  });

  const [results, setResults] = useState<DepartmentStudentResultDto[]>([]);
  const [summary, setSummary] = useState<HodReportsSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Sorting and pagination states
  const [sortField, setSortField] = useState<SortField>("usn");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [resRes, sumRes] = await Promise.allSettled([
        hodApi.getDepartmentResults(),
        hodApi.getReportsSummary(),
      ]);

      if (resRes.status === "fulfilled" && resRes.value) setResults(resRes.value);
      if (sumRes.status === "fulfilled" && sumRes.value) setSummary(sumRes.value);
    } catch (err) {
      console.warn("Failed to load reports data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived Summary Metrics
  const calculatedSummary = useMemo(() => {
    const totalStudents = summary?.totalStudents || results.length;
    const evaluatedStudents = results.filter((r) => r.totalMarks > 0).length;
    const completedProjects = summary?.completedProjects || 0;
    const passedStudents = results.filter((r) => r.totalMarks >= 50).length;
    const passRate =
      evaluatedStudents > 0
        ? `${Math.round((passedStudents / evaluatedStudents) * 100)}%`
        : "N/A";

    return {
      totalStudents,
      evaluatedStudents,
      completedProjects,
      passRate,
    };
  }, [summary, results]);

  // Filtered dataset
  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (gradeFilter !== "ALL" && r.letterGrade !== gradeFilter) return false;
      const resultLabel = r.letterGrade === "F" ? "Fail" : "Pass";
      if (statusFilter !== "ALL" && resultLabel !== statusFilter) return false;

      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        return (
          r.usn.toLowerCase().includes(q) ||
          r.studentName.toLowerCase().includes(q) ||
          r.teamCode.toLowerCase().includes(q) ||
          r.projectTitle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [results, gradeFilter, statusFilter, debouncedSearch]);

  // Sorted dataset
  const sortedResults = useMemo(() => {
    const list = [...filteredResults];
    list.sort((a, b) => {
      if (sortField === "totalMarks") {
        return sortDirection === "asc"
          ? a.totalMarks - b.totalMarks
          : b.totalMarks - a.totalMarks;
      }

      const valA = (sortField === "usn" ? a.usn : a.studentName) || "";
      const valB = (sortField === "usn" ? b.usn : b.studentName) || "";
      const cmp = valA.localeCompare(valB, undefined, { numeric: true });
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filteredResults, sortField, sortDirection]);

  // Paginated slice
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedResults.slice(start, start + pageSize);
  }, [sortedResults, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const isAnyFilterActive = debouncedSearch !== "" || gradeFilter !== "ALL" || statusFilter !== "ALL";

  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setGradeFilter("ALL");
    setStatusFilter("ALL");
    setCurrentPage(1);
  };

  // CSV Export Handler
  const handleExportCsv = () => {
    if (results.length === 0) {
      showToast("No marksheet results available to export.");
      return;
    }

    const headers = [
      "Roll/USN",
      "Student Name",
      "Team Code",
      "Project Title",
      "Guide Score (/30)",
      "Mid-Term Score (/30)",
      "External Viva Score (/40)",
      "Total Marks (/100)",
      "Letter Grade",
      "Result",
    ];

    const rows = results.map((r) => [
      `"${r.usn}"`,
      `"${r.studentName.replace(/"/g, '""')}"`,
      `"${r.teamCode}"`,
      `"${r.projectTitle.replace(/"/g, '""')}"`,
      r.guideScore,
      r.midTermScore,
      r.externalVivaScore,
      r.totalMarks,
      `"${r.letterGrade}"`,
      `"${r.letterGrade === "F" ? "Fail" : "Pass"}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().split("T")[0];
    link.download = `Department_Tabulation_Register_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Official tabulation marksheet exported as CSV.");
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shrink-0" />
            <h1 className="text-base sm:text-lg font-bold font-heading text-slate-900 tracking-tight">
              Department Academic Reports &amp; Tabulation
            </h1>
            <Badge variant="neutral" size="sm">
              AY 2025–2026
            </Badge>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Cumulative continuous assessments and viva voce scores feeding academic transcripts and university tabulation sheets.
          </p>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={handleExportCsv}
          leftIcon={<Download className="h-3.5 w-3.5" />}
          className="shrink-0"
        >
          Export Marksheet CSV
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HodMetricCard
          label="Registered Students"
          value={calculatedSummary.totalStudents}
          subtitle="Enrolled in Capstone Track"
          icon={Users}
          variant="neutral"
        />

        <HodMetricCard
          label="Evaluated Students"
          value={calculatedSummary.evaluatedStudents}
          subtitle={`Of ${calculatedSummary.totalStudents} total students`}
          icon={CheckSquare}
          variant="emerald"
        />

        <HodMetricCard
          label="Completed Projects"
          value={calculatedSummary.completedProjects}
          subtitle="Archived / Finalized Teams"
          icon={GraduationCap}
          variant="blue"
        />

        <HodMetricCard
          label="Department Pass Rate"
          value={calculatedSummary.passRate}
          subtitle="Scoring Total ≥ 50 Marks"
          icon={Award}
          variant="emerald"
        />
      </div>

      {/* Search & Filter Bar */}
      <Card className="border-slate-200/80 bg-white">
        <CardContent className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by USN, student name, team code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8.5 w-full pl-8 pr-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            {/* Letter Grade Filter */}
            <select
              value={gradeFilter}
              onChange={(e) => {
                setGradeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8.5 text-xs rounded-lg border border-slate-300 bg-white px-2.5 text-slate-800 focus:outline-none focus:border-brand-primary cursor-pointer"
            >
              <option value="ALL">All Letter Grades</option>
              <option value="A+">Grade A+ (≥ 85)</option>
              <option value="A">Grade A (≥ 75)</option>
              <option value="B">Grade B (≥ 65)</option>
              <option value="C">Grade C (≥ 50)</option>
              <option value="F">Grade F (&lt; 50)</option>
            </select>

            {/* Result Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8.5 text-xs rounded-lg border border-slate-300 bg-white px-2.5 text-slate-800 focus:outline-none focus:border-brand-primary cursor-pointer"
            >
              <option value="ALL">All Results</option>
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
            </select>
          </div>

          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer shrink-0"
              title="Reset search and filters"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </CardContent>
      </Card>

      {/* Tabulation Register Data Table */}
      <Card className="border-slate-200/80 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 select-none">
              <tr>
                <th
                  onClick={() => handleSort("usn")}
                  className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em] cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Roll / USN</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("studentName")}
                  className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em] cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Student Name</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Team Code
                </th>
                <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Guide (/30)
                </th>
                <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Mid-Term (/30)
                </th>
                <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                  External (/40)
                </th>
                <th
                  onClick={() => handleSort("totalMarks")}
                  className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em] cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Total (/100)</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Grade
                </th>
                <th className="py-3 px-4 text-right font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Result
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-900 font-mono tabular-nums">
              {paginatedResults.map((r) => (
                <tr key={r.usn} className="hover:bg-slate-50/75 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{r.usn}</td>
                  <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                    {r.studentName}
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono">{r.teamCode}</td>
                  <td className="py-3 px-4">{r.guideScore}</td>
                  <td className="py-3 px-4">{r.midTermScore}</td>
                  <td className="py-3 px-4">{r.externalVivaScore}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{r.totalMarks}</td>
                  <td className="py-3 px-4 font-sans">
                    <Badge
                      variant={r.letterGrade === "F" ? "danger" : "neutral"}
                      size="sm"
                    >
                      {r.letterGrade}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    <Badge
                      variant={r.letterGrade === "F" ? "danger" : "success"}
                      size="sm"
                      dot={r.letterGrade !== "F"}
                    >
                      {r.letterGrade === "F" ? "Fail" : "Pass"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedResults.length === 0 && !loading && (
          <div className="p-8">
            <EmptyState
              title={isAnyFilterActive ? "No Records Match Filter Criteria" : "No Tabulation Results Evaluated"}
              description={
                isAnyFilterActive
                  ? "Adjust search keyword or clear grade and status filters to view student records."
                  : "Student marks will appear here once faculty mentors and external examiners complete evaluation rubrics."
              }
              actionLabel={isAnyFilterActive ? "Clear Filters" : undefined}
              onAction={isAnyFilterActive ? handleClearFilters : undefined}
            />
          </div>
        )}

        <HodTablePagination
          currentPage={currentPage}
          totalItems={sortedResults.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>
    </div>
  );
};
