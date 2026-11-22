"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  History,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  UserCheck,
  UserX,
  Building2,
  Clock,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Modal } from "@/design-system/components/Modal";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { collegeApi } from "@/lib/api/collegeApi";
import {
  CreateHodRequest,
  DepartmentDto,
  HodAssignmentHistoryDto,
  HodManagementDto,
} from "@/lib/api/types";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";

export const HodManagementView: React.FC = () => {
  const {
    departments: mockDepartments,
    coursePrograms,
    facultyRoster,
    reassignHOD: mockReassignHod,
  } = useProjectHubStore();

  const [loading, setLoading] = useState(true);
  const [hods, setHods] = useState<HodManagementDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [historyList, setHistoryList] = useState<HodAssignmentHistoryDto[]>([]);

  // Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "appointed" | "vacant">("all");
  const [programFilter, setProgramFilter] = useState<string>("all");

  // Modals & Drawer
  const [showAppointModal, setShowAppointModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [appointMode, setAppointMode] = useState<"promote" | "create">("promote");
  const [targetDepartmentId, setTargetDepartmentId] = useState("");
  const [selectedFacultyId, setSelectedFacultyId] = useState("");

  // Create new HOD Form
  const [newHodName, setNewHodName] = useState("");
  const [newHodEmail, setNewHodEmail] = useState("");
  const [newHodCode, setNewHodCode] = useState("");
  const [newHodPassword, setNewHodPassword] = useState("Pass@1234");
  const [submitting, setSubmitting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useDashboardHeader({
    title: "Department Leadership",
    breadcrumb: "HOD Appointments & Leadership Governance",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [hodRes, deptRes] = await Promise.allSettled([
        collegeApi.getHods(),
        collegeApi.getDepartments(),
      ]);

      // Build the actual college departments from mock store (ground truth for this college's config)
      const mockDepts: DepartmentDto[] = mockDepartments.map((d: any) => ({
        id: d.id,
        collegeId: "col-sistec-bpl",
        code: d.code,
        name: d.name,
        intakeQuota: d.intakeQuota || 120,
        studentCount: d.studentCount || 120,
        facultyCount: d.facultyCount || 12,
        isSarAttested: d.isSarAttested || false,
        hodName: d.hodName,
        courseProgramId: d.courseProgramId,
        courseProgramCode: d.courseProgramCode,
        courseProgramName: d.courseProgramName,
      }));

      // For HOD list: prefer live API data only if it has reasonable count (<=50 and matches college depts)
      // Backend may return master RGPV catalog — filter to only departments matching our college's mock depts
      let resolvedHods: HodManagementDto[] = [];
      if (hodRes.status === "fulfilled" && hodRes.value?.length) {
        const collegeDeptCodes = new Set(mockDepartments.map((d: any) => d.code.toUpperCase()));
        const filteredHods = hodRes.value.filter(
          (h) => collegeDeptCodes.has(h.departmentCode?.toUpperCase() ?? "")
        );
        if (filteredHods.length > 0) {
          resolvedHods = filteredHods;
        }
      }

      // Fall back to building HOD list from mock departments
      if (resolvedHods.length === 0 && mockDepartments?.length) {
        resolvedHods = mockDepartments.map((d: any) => ({
          departmentId: d.id,
          departmentCode: d.code,
          departmentName: d.name,
          courseProgramCode: d.courseProgramCode || "",
          courseProgramName: d.courseProgramName || "",
          hodUserId: d.hodName ? `usr-hod-${d.code.toLowerCase()}` : undefined,
          hodName: d.hodName || undefined,
          hodEmail: d.hodName ? `hod.${d.code.toLowerCase()}@sistec.ac.in` : undefined,
          employeeCode: d.hodName ? `EMP-HOD-${d.code}` : undefined,
          isActive: Boolean(d.hodName),
          appointedAtUtc: d.hodName ? "2026-07-01T00:00:00Z" : undefined,
        }));
      }

      setHods(resolvedHods);

      // For departments dropdown (appoint modal): use mock store (actual college config)
      if (deptRes.status === "fulfilled" && deptRes.value?.length) {
        const collegeDeptCodes = new Set(mockDepartments.map((d: any) => d.code.toUpperCase()));
        const filtered = deptRes.value.filter(
          (d) => collegeDeptCodes.has(d.code?.toUpperCase() ?? "")
        );
        setDepartments(filtered.length > 0 ? filtered : mockDepts);
      } else {
        setDepartments(mockDepts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await collegeApi.getHodHistory();
      if (res) {
        setHistoryList(res);
      }
    } catch (err) {
      console.warn("Failed to load HOD history, using fallback", err);
      setHistoryList([
        {
          id: "hist-1",
          departmentId: "dept-cse",
          departmentCode: "CSE",
          departmentName: "Computer Science & Engineering",
          hodUserId: "usr-hod-cse",
          hodName: "Dr. Ravindra Kumar Sharma",
          hodEmail: "hod.cse@sistec.ac.in",
          employeeCode: "EMP-CSE-001",
          appointedAtUtc: "2026-07-01T09:00:00Z",
          appointedBy: "admin@collabex.in",
          isCurrent: true,
        },
      ]);
    }
    setShowHistoryDrawer(true);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAppoint = (deptId?: string) => {
    const dId = deptId || departments[0]?.id || hods[0]?.departmentId || "";
    setTargetDepartmentId(dId);
    setSelectedFacultyId(facultyRoster[0]?.id || "");
    setNewHodName("");
    setNewHodEmail("");
    setNewHodCode("");
    setNewHodPassword("Pass@1234");
    setAppointMode("promote");
    setShowAppointModal(true);
  };

  const handleAppointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDepartmentId) return;
    setSubmitting(true);
    try {
      const targetDept = departments.find((d) => d.id === targetDepartmentId);
      const targetHod = hods.find((h) => h.departmentId === targetDepartmentId);
      const deptDisplayName = targetDept?.name || targetHod?.departmentName || "Department";

      if (appointMode === "promote") {
        if (!selectedFacultyId) return;
        const fac = facultyRoster.find((f) => f.id === selectedFacultyId);
        await collegeApi.appointHod(targetDepartmentId, { hodUserId: selectedFacultyId });
        mockReassignHod(targetDepartmentId, fac?.name || "Appointed HOD");
        showToast(`Assigned ${fac?.name || "Faculty"} as HOD of ${deptDisplayName}.`);
      } else {
        if (!newHodName.trim() || !newHodEmail.trim()) return;
        const payload: CreateHodRequest = {
          fullName: newHodName.trim(),
          email: newHodEmail.trim(),
          employeeCode: newHodCode.trim() || `EMP-${Date.now().toString().slice(-4)}`,
          departmentId: targetDepartmentId,
          temporaryPassword: newHodPassword || "Pass@1234",
        };
        await collegeApi.createHod(payload);
        mockReassignHod(targetDepartmentId, payload.fullName);
        showToast(`Created and appointed ${payload.fullName} as HOD of ${deptDisplayName}.`);
      }

      setShowAppointModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      showToast("Error appointing HOD.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: HodManagementDto) => {
    if (!item.hodUserId) return;
    try {
      const newStatus = !item.isActive;
      await collegeApi.updateHodStatus(item.hodUserId, { isActive: newStatus });
      showToast(`HOD account for ${item.hodName} is now ${newStatus ? "Active" : "Deactivated"}.`);
      setHods((prev) =>
        prev.map((h) => (h.hodUserId === item.hodUserId ? { ...h, isActive: newStatus } : h))
      );
    } catch (err) {
      console.error(err);
      showToast("Failed to update HOD status.");
    }
  };

  // Helper to infer degree program cleanly
  const getProgramInfo = (item: HodManagementDto): { code: string; badgeClass: string } => {
    if (item.courseProgramCode) {
      const c = item.courseProgramCode.toUpperCase();
      if (c.includes("BTECH") || c.includes("TECH")) return { code: "B.Tech", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" };
      if (c.includes("MBA")) return { code: "MBA", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      if (c.includes("MCA")) return { code: "MCA", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" };
      return { code: c, badgeClass: "bg-slate-100 text-slate-700 border-slate-200" };
    }
    const dCode = item.departmentCode.toUpperCase();
    if (dCode.startsWith("MBA")) return { code: "MBA", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (dCode.startsWith("MCA")) return { code: "MCA", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" };
    return { code: "B.Tech", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" };
  };

  // Counts
  const totalDepartmentsCount = hods.length || departments.length || 9;
  const activeHodCount = hods.filter((h) => h.hodUserId && h.hodName).length;
  const vacantDeptCount = totalDepartmentsCount - activeHodCount;

  // Filtered List
  const filteredHods = hods.filter((h) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      h.departmentName.toLowerCase().includes(q) ||
      h.departmentCode.toLowerCase().includes(q) ||
      (h.hodName && h.hodName.toLowerCase().includes(q)) ||
      (h.hodEmail && h.hodEmail.toLowerCase().includes(q));

    const isAppointed = Boolean(h.hodUserId && h.hodName);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "appointed" && isAppointed) ||
      (statusFilter === "vacant" && !isAppointed);

    const prog = getProgramInfo(h);
    const matchesProgram =
      programFilter === "all" ||
      prog.code.toLowerCase() === programFilter.toLowerCase() ||
      (programFilter === "btech" && prog.code.includes("Tech"));

    return matchesSearch && matchesStatus && matchesProgram;
  });

  return (
    <div className="space-y-4 pb-8 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-lg animate-in fade-in">
          <CheckCircle2 className="h-4 w-4" />
          {toastMessage}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. COMPACT SAAS METRIC ROW (CLEAN, NO FLUFF)                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Departments */}
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer bg-white ${
            statusFilter === "all"
              ? "border-slate-800 shadow-2xs ring-1 ring-slate-800/10"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Departments</span>
            <Building2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            {totalDepartmentsCount}
          </div>
        </button>

        {/* Appointed */}
        <button
          type="button"
          onClick={() => setStatusFilter("appointed")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer bg-white ${
            statusFilter === "appointed"
              ? "border-emerald-600 shadow-2xs ring-1 ring-emerald-600/15"
              : "border-slate-200 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-800 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Appointed HODs
            </span>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-1 font-mono tabular-nums">
            {activeHodCount}
          </div>
        </button>

        {/* Vacant */}
        <button
          type="button"
          onClick={() => setStatusFilter("vacant")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer bg-white ${
            statusFilter === "vacant"
              ? "border-amber-600 shadow-2xs ring-1 ring-amber-600/15"
              : "border-slate-200 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Vacant Positions
            </span>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-700 mt-1 font-mono tabular-nums">
            {vacantDeptCount}
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. MINIMALIST SEARCH & ACTION TOOLBAR                                      */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Left: Search & Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search departments..."
              className="w-full pl-8 pr-3 h-8 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="inline-flex items-center p-0.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All ({totalDepartmentsCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("vacant")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === "vacant"
                  ? "bg-white text-amber-800 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Vacant ({vacantDeptCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("appointed")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === "appointed"
                  ? "bg-white text-emerald-800 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Appointed ({activeHodCount})
            </button>
          </div>

          {/* Program Select */}
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Programs</option>
            <option value="btech">B.Tech</option>
            <option value="mba">MBA</option>
            <option value="mca">MCA</option>
          </select>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadHistory}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            <History className="h-3.5 w-3.5 text-slate-400" />
            <span>History</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAppoint()}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Appoint HOD</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. RAZOR-SHARP B2B SAAS TABLE (CLEAN, NO EMPTY HYPHENS)                   */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4 min-w-[220px]">Department</th>
                <th className="py-2.5 px-4 min-w-[110px]">Program</th>
                <th className="py-2.5 px-4 min-w-[260px]">Head of Department</th>
                <th className="py-2.5 px-4 min-w-[100px]">Status</th>
                <th className="py-2.5 px-4 min-w-[130px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1.5 text-emerald-600" />
                    <span>Loading leadership roster...</span>
                  </td>
                </tr>
              ) : filteredHods.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    No departments match the current filter.
                  </td>
                </tr>
              ) : (
                filteredHods.map((item) => {
                  const hasHod = Boolean(item.hodUserId && item.hodName);
                  const prog = getProgramInfo(item);

                  return (
                    <tr
                      key={item.departmentId}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Department Name + Code */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                            {item.departmentCode}
                          </span>
                          <span className="font-semibold text-slate-900 truncate">
                            {item.departmentName}
                          </span>
                        </div>
                      </td>

                      {/* Program */}
                      <td className="py-3 px-4">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border shrink-0 ${prog.badgeClass}`}>
                          {prog.code}
                        </span>
                      </td>

                      {/* Head of Department */}
                      <td className="py-3 px-4">
                        {hasHod ? (
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                              {item.hodName?.replace(/^(Dr\.|Prof\.)\s+/i, "").charAt(0) || "H"}
                            </div>
                            <div className="min-w-0">
                              <span className="block font-medium text-slate-900 truncate">
                                {item.hodName}
                              </span>
                              <span className="block text-[11px] font-mono text-slate-400 truncate">
                                {item.hodEmail} {item.employeeCode ? `• ${item.employeeCode}` : ""}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal italic">Unassigned</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {hasHod ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Vacant
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {hasHod ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenAppoint(item.departmentId)}
                              className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              Reassign
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(item)}
                              className="text-xs font-medium text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
                              title={item.isActive ? "Deactivate" : "Activate"}
                            >
                              {item.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenAppoint(item.departmentId)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Assign HOD</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Appoint / Replace HOD                                              */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showAppointModal}
        onClose={() => setShowAppointModal(false)}
        title="Appoint Department Head (HOD)"
        description="Select a department and assign faculty leadership."
      >
        <form onSubmit={handleAppointSubmit} className="space-y-4 pt-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Target Department</label>
            <Select
              value={targetDepartmentId}
              onChange={(e) => setTargetDepartmentId(e.target.value)}
              options={departments.map((d) => ({
                value: d.id,
                label: `${d.name} (${d.code})`,
              }))}
            />
          </div>

          {/* Mode Switcher */}
          <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-xs">
            <button
              type="button"
              onClick={() => setAppointMode("promote")}
              className={`flex-1 py-1.5 font-medium rounded-md transition-all ${
                appointMode === "promote"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Promote Faculty
            </button>
            <button
              type="button"
              onClick={() => setAppointMode("create")}
              className={`flex-1 py-1.5 font-medium rounded-md transition-all ${
                appointMode === "create"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              New Account
            </button>
          </div>

          {appointMode === "promote" ? (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Select Faculty Member</label>
              <Select
                value={selectedFacultyId}
                onChange={(e) => setSelectedFacultyId(e.target.value)}
                options={facultyRoster.map((f) => ({
                  value: f.id,
                  label: `${f.name} • ${f.designation} (${f.email})`,
                }))}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Full Name</label>
                <Input
                  value={newHodName}
                  onChange={(e) => setNewHodName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Verma"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Email Address</label>
                <Input
                  type="email"
                  value={newHodEmail}
                  onChange={(e) => setNewHodEmail(e.target.value)}
                  placeholder="e.g. rajesh.verma@sistec.ac.in"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Employee Code</label>
                  <Input
                    value={newHodCode}
                    onChange={(e) => setNewHodCode(e.target.value)}
                    placeholder="e.g. EMP-102"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Temporary Password</label>
                  <Input
                    value={newHodPassword}
                    onChange={(e) => setNewHodPassword(e.target.value)}
                    placeholder="Pass@1234"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAppointModal(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
            >
              {submitting ? "Appointing..." : "Save Appointment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* DRAWER: HOD Assignment History                                            */}
      {/* ========================================================================= */}
      <SlideOverDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        title="Leadership History"
        subtitle="Departmental leadership assignment audit trail"
      >
        <div className="space-y-4 pt-2">
          {historyList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No historical records found.
            </div>
          ) : (
            <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {historyList.map((item) => (
                <div key={item.id} className="relative space-y-0.5">
                  <div
                    className={`absolute -left-6 top-1 h-3 w-3 rounded-full border-2 ${
                      item.isCurrent
                        ? "bg-emerald-600 border-white ring-2 ring-emerald-200"
                        : "bg-slate-300 border-white"
                    }`}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900">{item.hodName}</span>
                    {item.isCurrent && (
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {item.departmentName} ({item.departmentCode})
                  </div>
                  <div className="text-[10px] text-slate-400 pt-0.5">
                    {new Date(item.appointedAtUtc).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {item.appointedBy && ` • By ${item.appointedBy}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SlideOverDrawer>
    </div>
  );
};
