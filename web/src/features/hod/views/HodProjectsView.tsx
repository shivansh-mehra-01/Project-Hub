"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Eye,
  UserCheck,
  CheckCircle2,
  Filter,
  ArrowUpDown,
  RotateCcw,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Button } from "@/design-system/components/Button";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import {
  hodApi,
  getAuthToken,
  HodProjectDto,
  CollegeTrackDto,
  FacultyWorkloadDto,
} from "@/lib/api";
import { HodTablePagination } from "../components/HodTablePagination";
import { ProjectDetailsDrawer } from "../components/ProjectDetailsDrawer";
import { AssignGuideModal } from "../components/AssignGuideModal";

type SortField = "teamCode" | "title" | "guideName" | "status";
type SortDirection = "asc" | "desc";

export const HodProjectsView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  useDashboardHeader({
    title: "Department Projects Governance",
    breadcrumb: "HOD Console • Projects",
  });

  // Data states
  const [projects, setProjects] = useState<HodProjectDto[]>([]);
  const [tracks, setTracks] = useState<CollegeTrackDto[]>([]);
  const [faculty, setFaculty] = useState<FacultyWorkloadDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [trackFilter, setTrackFilter] = useState("ALL");
  const [onlyWithoutGuide, setOnlyWithoutGuide] = useState(false);
  const [onlyAtRisk, setOnlyAtRisk] = useState(false);

  // Sorting and pagination states
  const [sortField, setSortField] = useState<SortField>("teamCode");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Drawers
  const [inspectingProject, setInspectingProject] = useState<HodProjectDto | null>(null);
  const [assigningProject, setAssigningProject] = useState<HodProjectDto | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync initial query parameters from URL
  useEffect(() => {
    const statusParam = searchParams.get("status");
    const riskParam = searchParams.get("onlyAtRisk");
    const guideParam = searchParams.get("onlyWithoutGuide");
    const searchParam = searchParams.get("search");

    if (statusParam) setStatusFilter(statusParam);
    if (riskParam === "true") setOnlyAtRisk(true);
    if (guideParam === "true") setOnlyWithoutGuide(true);
    if (searchParam) {
      setSearchQuery(searchParam);
      setDebouncedSearch(searchParam);
    }
  }, [searchParams]);

  // Debounce search input (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = useCallback(async () => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [projRes, tracksRes, facRes] = await Promise.allSettled([
        hodApi.getProjects(),
        hodApi.getTracks(),
        hodApi.getFaculty(),
      ]);

      if (projRes.status === "fulfilled" && projRes.value) setProjects(projRes.value);
      if (tracksRes.status === "fulfilled" && tracksRes.value) setTracks(tracksRes.value);
      if (facRes.status === "fulfilled" && facRes.value) setFaculty(facRes.value);
    } catch (err) {
      console.warn("Failed to load projects data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset pagination when any filter changes
  const handleFilterChange = (setter: (val: any) => void, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  // Clear all active filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setStatusFilter("ALL");
    setTrackFilter("ALL");
    setOnlyWithoutGuide(false);
    setOnlyAtRisk(false);
    setCurrentPage(1);
  };

  const isAnyFilterActive = useMemo(() => {
    return (
      debouncedSearch !== "" ||
      statusFilter !== "ALL" ||
      trackFilter !== "ALL" ||
      onlyWithoutGuide ||
      onlyAtRisk
    );
  }, [debouncedSearch, statusFilter, trackFilter, onlyWithoutGuide, onlyAtRisk]);

  // Handle column sorting toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Filtered dataset
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (trackFilter !== "ALL" && p.academicTrackId !== trackFilter) return false;
      if (onlyWithoutGuide && p.guideUserId) return false;
      if (onlyAtRisk && p.status !== "AtRisk" && p.missedLogStreak < 2) return false;

      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        return (
          p.teamCode.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.abstract.toLowerCase().includes(q) ||
          p.domainTag.toLowerCase().includes(q) ||
          (p.guideName && p.guideName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [projects, statusFilter, trackFilter, onlyWithoutGuide, onlyAtRisk, debouncedSearch]);

  // Sorted dataset
  const sortedProjects = useMemo(() => {
    const list = [...filteredProjects];
    list.sort((a, b) => {
      let valA: string = "";
      let valB: string = "";

      if (sortField === "teamCode") {
        valA = a.teamCode || "";
        valB = b.teamCode || "";
      } else if (sortField === "title") {
        valA = a.title || "";
        valB = b.title || "";
      } else if (sortField === "guideName") {
        valA = a.guideName || "";
        valB = b.guideName || "";
      } else if (sortField === "status") {
        valA = a.status || "";
        valB = b.status || "";
      }

      const cmp = valA.localeCompare(valB, undefined, { numeric: true });
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filteredProjects, sortField, sortDirection]);

  // Paginated slice
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProjects.slice(start, start + pageSize);
  }, [sortedProjects, currentPage, pageSize]);

  return (
    <div className="space-y-5">
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
              Department Projects Governance
            </h1>
            <Badge variant="neutral" size="sm">
              {projects.length} Registered Teams
            </Badge>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Monitor capstone group execution, review member responsibilities, and assign departmental faculty mentors.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200/80 bg-white">
        <CardContent className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects by code, title, domain, mentor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8.5 w-full pl-8 pr-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
              className="h-8.5 text-xs rounded-lg border border-slate-300 bg-white px-2.5 text-slate-800 focus:outline-none focus:border-brand-primary cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="PendingGuide">Pending Guide Review</option>
              <option value="PendingCoordinator">Pending Coordinator</option>
              <option value="PendingHOD">Pending HOD Sign-Off</option>
              <option value="ActiveBuild">Active Build</option>
              <option value="AtRisk">At Risk</option>
              <option value="ReadyForViva">Ready For Viva</option>
              <option value="Completed">Completed</option>
            </select>

            {/* Academic Track Dropdown */}
            {tracks.length > 0 && (
              <select
                value={trackFilter}
                onChange={(e) => handleFilterChange(setTrackFilter, e.target.value)}
                className="h-8.5 text-xs rounded-lg border border-slate-300 bg-white px-2.5 text-slate-800 focus:outline-none focus:border-brand-primary cursor-pointer"
              >
                <option value="ALL">All Academic Tracks</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quick Checkbox Filters & Clear Button */}
          <div className="flex items-center gap-3.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyWithoutGuide}
                onChange={(e) => handleFilterChange(setOnlyWithoutGuide, e.target.checked)}
                className="rounded border-slate-300 text-brand-primary accent-brand-primary cursor-pointer"
              />
              <span className="font-medium">No Guide Only</span>
            </label>

            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyAtRisk}
                onChange={(e) => handleFilterChange(setOnlyAtRisk, e.target.checked)}
                className="rounded border-slate-300 text-brand-primary accent-brand-primary cursor-pointer"
              />
              <span className="font-medium">At-Risk Only</span>
            </label>

            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer ml-1"
                title="Reset all search & filter parameters"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Projects Data Table */}
      <Card className="border-slate-200/80 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 select-none">
              <tr>
                <th
                  onClick={() => handleSort("teamCode")}
                  className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em] cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Team Code</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("title")}
                  className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em] cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Project Title</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Track &amp; Domain
                </th>
                <th
                  onClick={() => handleSort("guideName")}
                  className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em] cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Faculty Guide</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Team Size
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em] cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right font-semibold text-[11px] uppercase tracking-[0.06em]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-900">
              {paginatedProjects.map((p) => {
                const statusVariant =
                  p.status === "Completed"
                    ? "success"
                    : p.status === "ActiveBuild"
                    ? "info"
                    : p.status === "AtRisk"
                    ? "danger"
                    : "neutral";

                return (
                  <tr key={p.id} className="hover:bg-slate-50/75 transition-colors">
                    {/* Team Code */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {p.teamCode}
                    </td>

                    {/* Title */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate" title={p.title}>
                        {p.title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5" title={p.abstract}>
                        {p.abstract}
                      </div>
                    </td>

                    {/* Track & Domain */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">
                        {p.academicTrackName || "General Track"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {p.domainTag || "Core"}
                      </div>
                    </td>

                    {/* Faculty Guide */}
                    <td className="py-3 px-4">
                      {p.guideName ? (
                        <span className="font-medium text-slate-800">{p.guideName}</span>
                      ) : (
                        <Badge variant="warning" size="sm">
                          Unassigned
                        </Badge>
                      )}
                    </td>

                    {/* Team Size */}
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                      {p.memberCount} Members
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      <Badge variant={statusVariant} size="sm" dot>
                        {p.status}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setInspectingProject(p)}
                          leftIcon={<Eye className="h-3.5 w-3.5 text-slate-600" />}
                          className="h-7 text-xs"
                        >
                          Details
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setAssigningProject(p)}
                          className="h-7 text-xs text-brand-primary hover:bg-emerald-50"
                        >
                          {p.guideUserId ? "Reassign Guide" : "Assign Guide"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {sortedProjects.length === 0 && !loading && (
          <div className="p-8">
            <EmptyState
              title={isAnyFilterActive ? "No Projects Match Filter Criteria" : "No Registered Projects"}
              description={
                isAnyFilterActive
                  ? "Adjust search keywords or clear status and track filters to view registered teams."
                  : "Student capstone projects will populate once teams complete track registration."
              }
              actionLabel={isAnyFilterActive ? "Clear All Filters" : undefined}
              onAction={isAnyFilterActive ? handleClearFilters : undefined}
            />
          </div>
        )}

        {/* Table Pagination */}
        <HodTablePagination
          currentPage={currentPage}
          totalItems={sortedProjects.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      {/* Project Details Slide-Over Drawer */}
      <ProjectDetailsDrawer
        project={inspectingProject}
        onClose={() => setInspectingProject(null)}
        onAssignGuide={(proj) => {
          setInspectingProject(null);
          setAssigningProject(proj);
        }}
      />

      {/* Guide Allocation / Reassignment Modal */}
      <AssignGuideModal
        project={assigningProject}
        faculty={faculty}
        isOpen={!!assigningProject}
        onClose={() => setAssigningProject(null)}
        onSuccess={(msg) => {
          showToast(msg);
          loadData();
        }}
      />
    </div>
  );
};
