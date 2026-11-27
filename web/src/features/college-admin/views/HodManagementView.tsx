"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  History,
  AlertCircle,
  Loader2,
  Search,
  AlertTriangle,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { PageHeader } from "@/design-system/patterns/PageHeader";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { ConfirmationDialog, PageLoadingState } from "@/design-system/patterns/PageStates";
import { TablePagination } from "@/design-system/patterns/TablePagination";
import { showToast } from "@/lib/toast";
import { Modal } from "@/design-system/components/Modal";
import { Button } from "@/design-system/components/Button";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { Select } from "@/design-system/components/Select";
import { collegeApi } from "@/lib/api/collegeApi";
import {
  DepartmentDto,
  HodAssignmentHistoryDto,
  HodManagementDto,
  CollegeStaffDto,
} from "@/lib/api/types";
import { ApiConnectionBanner } from "../components/ApiConnectionBanner";
import {
  formatFacultyDesignation,
  getEligibleHodCandidates,
  resolveSelectedHodOnDepartmentChange,
} from "./hodAppointmentHelpers";

export const HodManagementView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [hods, setHods] = useState<HodManagementDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [facultyList, setFacultyList] = useState<CollegeStaffDto[]>([]);
  const [historyList, setHistoryList] = useState<HodAssignmentHistoryDto[]>([]);

  // Filtering & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "appointed" | "vacant">("all");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Drawer
  const [showAppointModal, setShowAppointModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [targetDepartmentId, setTargetDepartmentId] = useState("");
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [confirmReplacement, setConfirmReplacement] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [relieveTarget, setRelieveTarget] = useState<HodManagementDto | null>(null);
  const [relieving, setRelieving] = useState(false);
  const [statusToggleTarget, setStatusToggleTarget] = useState<HodManagementDto | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  useDashboardHeader({
    title: "Department Leadership",
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setApiError(null);
      const [hodRes, deptRes, staffRes] = await Promise.all([
        collegeApi.getHods(),
        collegeApi.getDepartments(),
        collegeApi.getStaffUsers({ role: "Faculty" }),
      ]);

      setHods(hodRes || []);
      setDepartments(deptRes || []);
      setFacultyList(staffRes || []);
    } catch (err: unknown) {
      setApiError(
        err instanceof Error
          ? err.message
          : "Failed to connect to backend service. Leadership data unavailable."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = async () => {
    try {
      const res = await collegeApi.getHodHistory();
      setHistoryList(res || []);
    } catch {
      showToast("Unable to fetch tenure history from database.", "error");
    }
    setShowHistoryDrawer(true);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      collegeApi.getHods(),
      collegeApi.getDepartments(),
      collegeApi.getStaffUsers({ role: "Faculty" }),
    ])
      .then(([hodRes, deptRes, staffRes]) => {
        if (!active) return;
        setHods(hodRes || []);
        setDepartments(deptRes || []);
        setFacultyList(staffRes || []);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setApiError(
          err instanceof Error
            ? err.message
            : "Failed to connect to backend service. Leadership data unavailable."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const currentDepartmentHod = hods.find((h) => h.departmentId === targetDepartmentId);
  const hasExistingHod = Boolean(currentDepartmentHod?.hodUserId && currentDepartmentHod?.hodName);
  const eligibleFaculty = getEligibleHodCandidates(
    facultyList,
    targetDepartmentId,
    currentDepartmentHod?.hodUserId
  );

  const handleOpenAppoint = (deptId?: string) => {
    const dId = deptId || departments[0]?.id || "";
    const deptHod = hods.find((h) => h.departmentId === dId);
    const candidates = getEligibleHodCandidates(facultyList, dId, deptHod?.hodUserId);
    setTargetDepartmentId(dId);
    setSelectedFacultyId(candidates[0]?.id || "");
    setConfirmReplacement(false);
    setModalError(null);
    setShowAppointModal(true);
  };

  const handleDepartmentChange = (nextDeptId: string) => {
    const nextDeptHod = hods.find((h) => h.departmentId === nextDeptId);
    setTargetDepartmentId(nextDeptId);
    setSelectedFacultyId((prev) =>
      resolveSelectedHodOnDepartmentChange(facultyList, nextDeptId, prev, nextDeptHod?.hodUserId)
    );
    setConfirmReplacement(false);
    setModalError(null);
  };

  const handleAppointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setModalError(null);

    if (!targetDepartmentId) {
      setModalError("Please select a department.");
      return;
    }

    if (!selectedFacultyId) {
      setModalError("Please select an eligible faculty candidate.");
      return;
    }

    if (hasExistingHod && !confirmReplacement) {
      setModalError("Please confirm replacing the current HOD before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const targetDept = departments.find((d) => d.id === targetDepartmentId);
      const deptDisplayName = targetDept?.name || currentDepartmentHod?.departmentName || "Department";
      const fac = eligibleFaculty.find((f) => f.id === selectedFacultyId);

      await collegeApi.appointHod(targetDepartmentId, {
        hodUserId: selectedFacultyId,
        confirmReplacement: hasExistingHod ? confirmReplacement : false,
      });

      setShowAppointModal(false);
      await loadData();
      showToast(`Assigned ${fac?.fullName || "Faculty"} as HOD of ${deptDisplayName}.`, "success");
    } catch (err: unknown) {
      setModalError(
        err instanceof Error
          ? err.message
          : "Unable to appoint HOD. Please verify eligibility and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmToggleStatus = async () => {
    if (!statusToggleTarget?.hodUserId) return;
    const item = statusToggleTarget;
    const newStatus = !item.isActive;
    setTogglingStatus(true);
    try {
      await collegeApi.updateHodStatus(item.hodUserId!, { isActive: newStatus });
      showToast(
        `HOD account for ${item.hodName} is now ${newStatus ? "Active" : "Deactivated"}.`,
        "success"
      );
      setHods((prev) =>
        prev.map((h) => (h.hodUserId === item.hodUserId ? { ...h, isActive: newStatus } : h))
      );
      setStatusToggleTarget(null);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to update HOD status.",
        "error"
      );
    } finally {
      setTogglingStatus(false);
    }
  };

  // Program Info helper
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
  const totalDepartmentsCount = hods.length || departments.length;
  const activeHodCount = hods.filter((h) => h.hodUserId && h.hodName).length;
  const vacantDeptCount = totalDepartmentsCount - activeHodCount;

  const availablePrograms = useMemo(() => {
    const codes = new Set(hods.map((h) => getProgramInfo(h).code));
    return Array.from(codes).sort();
  }, [hods]);

  // Filtered List
  const filteredHods = useMemo(() => {
    return hods.filter((h) => {
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

      const progInfo = getProgramInfo(h);
      const matchesProgram =
        programFilter === "all" || progInfo.code.toLowerCase() === programFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesProgram;
    });
  }, [hods, searchQuery, statusFilter, programFilter]);

  const paginatedHods = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHods.slice(start, start + pageSize);
  }, [filteredHods, currentPage, pageSize]);

  return (
    <div className="space-y-6 pb-12 font-sans">
      <PageHeader
        title="Department Leadership"
        description="Appoint, replace, or relieve Heads of Department and review institutional succession history."
        actions={
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={loadHistory}
              leftIcon={<History className="h-3.5 w-3.5" />}
            >
              Tenure History
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleOpenAppoint()}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Appoint HOD
            </Button>
          </>
        }
      />

      {apiError && (
        <ApiConnectionBanner onRetry={loadData} message={apiError} isRetrying={loading} />
      )}

      {/* Header Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Branches</span>
          <span className="block text-2xl font-bold text-slate-900 font-mono mt-1">
            {totalDepartmentsCount}
          </span>
          <span className="text-[11px] text-slate-500">Department branches across all programs</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Appointed HODs</span>
          <span className="block text-2xl font-bold text-emerald-800 font-mono mt-1">
            {activeHodCount}
          </span>
          <span className="text-[11px] text-emerald-700 font-medium">Active HOD credentials provisioned</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Vacant Positions</span>
          <span className={`block text-2xl font-bold font-mono mt-1 ${vacantDeptCount > 0 ? "text-rose-600" : "text-slate-400"}`}>
            {vacantDeptCount}
          </span>
          <span className="text-[11px] text-slate-500">Awaiting leadership appointment</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                aria-label="Search branch, code, or HOD"
                placeholder="Search branch, code, or HOD..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <select
              aria-label="Filter by appointment status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "all" | "appointed" | "vacant");
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="appointed">Appointed</option>
              <option value="vacant">Vacant</option>
            </select>

            <select
              aria-label="Filter by program"
              value={programFilter}
              onChange={(e) => {
                setProgramFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="all">All Programs</option>
              {availablePrograms.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Body */}
        {loading ? (
          <PageLoadingState message="Loading department leadership roster..." className="border-0 rounded-none" />
        ) : filteredHods.length === 0 ? (
          <EmptyState
            title="No departments found"
            description="No departments match your current search or filter criteria."
            className="border-0 rounded-none"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3">Department Branch</th>
                    <th className="p-3">Program</th>
                    <th className="p-3">Head of Department</th>
                    <th className="p-3">Employee ID</th>
                    <th className="p-3">Account Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedHods.map((item) => {
                    const prog = getProgramInfo(item);
                    const isAppointed = Boolean(item.hodUserId && item.hodName);

                    return (
                      <tr key={item.departmentId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{item.departmentName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Code: {item.departmentCode}</div>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${prog.badgeClass}`}>
                            {prog.code}
                          </span>
                        </td>
                        <td className="p-3">
                          {isAppointed ? (
                            <div>
                              <div className="font-semibold text-slate-900">{item.hodName}</div>
                              <div className="text-[11px] text-slate-500">{item.hodEmail}</div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                              <AlertCircle className="h-3 w-3" />
                              Vacant
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600">
                          {item.employeeCode || "—"}
                        </td>
                        <td className="p-3">
                          {isAppointed ? (
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.isActive
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}>
                              {item.isActive ? "Active" : "Deactivated"}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Unassigned</span>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-2 whitespace-nowrap">
                          {isAppointed ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setStatusToggleTarget(item)}
                                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                              >
                                {item.isActive ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenAppoint(item.departmentId)}
                                className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 cursor-pointer"
                              >
                                Reassign
                              </button>
                              <button
                                type="button"
                                onClick={() => setRelieveTarget(item)}
                                className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
                              >
                                End Appointment
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenAppoint(item.departmentId)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-md cursor-pointer"
                            >
                              Appoint HOD
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredHods.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      {/* Appoint HOD Modal */}
      <Modal
        isOpen={showAppointModal}
        onClose={() => {
          if (!submitting) {
            setShowAppointModal(false);
            setModalError(null);
          }
        }}
        title="Appoint Head of Department"
        size="md"
      >
        <form onSubmit={handleAppointSubmit} className="space-y-4">
          {modalError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{modalError}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-2 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-800" />
              <span>Loading departments and faculty roster...</span>
            </div>
          ) : apiError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {apiError}
            </div>
          ) : (
            <>
              <Select
                label="Department"
                value={targetDepartmentId}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                disabled={submitting || departments.length === 0}
                required
              >
                {departments.length === 0 ? (
                  <option value="">No departments configured</option>
                ) : (
                  departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))
                )}
              </Select>

              {hasExistingHod && currentDepartmentHod && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2 text-xs text-amber-900">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
                    <div>
                      <span className="font-semibold">Current HOD:</span>{" "}
                      <span>{currentDepartmentHod.hodName}</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={confirmReplacement}
                      onChange={(e) => setConfirmReplacement(e.target.checked)}
                      disabled={submitting}
                      className="h-3.5 w-3.5 rounded border-amber-400 text-emerald-800 focus:ring-emerald-700"
                    />
                    <span>Confirm replacing the current HOD for this department</span>
                  </label>
                </div>
              )}

              <div>
                <Select
                  label="Select HOD"
                  value={selectedFacultyId}
                  onChange={(e) => {
                    setSelectedFacultyId(e.target.value);
                    setModalError(null);
                  }}
                  disabled={submitting || !targetDepartmentId || eligibleFaculty.length === 0}
                  required
                >
                  {eligibleFaculty.length === 0 ? (
                    <option value="">No eligible faculty found for this department.</option>
                  ) : (
                    <>
                      <option value="">Select eligible faculty</option>
                      {eligibleFaculty.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.fullName} — {formatFacultyDesignation(f.designation)}
                        </option>
                      ))}
                    </>
                  )}
                </Select>
                {targetDepartmentId && eligibleFaculty.length === 0 && (
                  <p className="mt-1.5 text-[11px] text-amber-700">
                    No eligible faculty found for this department.
                  </p>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setShowAppointModal(false);
                setModalError(null);
              }}
              disabled={submitting}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                loading ||
                Boolean(apiError) ||
                !targetDepartmentId ||
                !selectedFacultyId ||
                eligibleFaculty.length === 0 ||
                (hasExistingHod && !confirmReplacement)
              }
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 rounded-lg hover:bg-emerald-900 cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Appointing..." : "Appoint HOD"}
            </button>
          </div>
        </form>
      </Modal>

      {/* History Slide-Over Drawer */}
      <SlideOverDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        title="Leadership Succession History"
        description="Chronological record of department leadership appointments and tenure."
      >
        <div className="space-y-4">
          {historyList.length === 0 ? (
            <EmptyState
              title="No appointment history"
              description="No historical department leadership records found."
              className="border-0 py-6"
            />
          ) : (
            historyList.map((h) => (
              <div key={h.id} className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{h.hodName}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${h.isCurrent ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-600"}`}>
                    {h.isCurrent ? "Current HOD" : "Relieved"}
                  </span>
                </div>
                <div className="text-xs text-slate-600">Department: {h.departmentName} ({h.departmentCode})</div>
                <div className="text-[11px] text-slate-500">Email: {h.hodEmail} • Emp: {h.employeeCode}</div>
                <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100 space-y-0.5">
                  <div>Appointed: {new Date(h.appointedAtUtc).toLocaleDateString()} by {h.appointedBy}</div>
                  {h.relievedAtUtc && (
                    <div>Relieved: {new Date(h.relievedAtUtc).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </SlideOverDrawer>

      <ConfirmationDialog
        isOpen={Boolean(statusToggleTarget)}
        onClose={() => !togglingStatus && setStatusToggleTarget(null)}
        onConfirm={confirmToggleStatus}
        title={
          statusToggleTarget?.isActive
            ? "Deactivate HOD Account"
            : "Activate HOD Account"
        }
        description={
          statusToggleTarget?.isActive
            ? `Deactivate HOD account for ${statusToggleTarget.hodName} (${statusToggleTarget.departmentName})? They will be unable to sign in until reactivated.`
            : `Reactivate HOD account for ${statusToggleTarget?.hodName || "this HOD"} (${statusToggleTarget?.departmentName || ""})?`
        }
        confirmText={statusToggleTarget?.isActive ? "Deactivate" : "Activate"}
        variant={statusToggleTarget?.isActive ? "warning" : "primary"}
        isLoading={togglingStatus}
      />

      <ConfirmationDialog
        isOpen={Boolean(relieveTarget)}
        onClose={() => !relieving && setRelieveTarget(null)}
        onConfirm={async () => {
          if (!relieveTarget) return;
          setRelieving(true);
          try {
            await collegeApi.relieveHod(relieveTarget.departmentId);
            const relievedName = relieveTarget.hodName || "Faculty";
            setRelieveTarget(null);
            await loadData();
            showToast(
              `Ended HOD appointment for ${relievedName}. Faculty account remains active.`,
              "success"
            );
          } catch (err: unknown) {
            showToast(
              err instanceof Error ? err.message : "Failed to end HOD appointment.",
              "error"
            );
          } finally {
            setRelieving(false);
          }
        }}
        title="End HOD Appointment"
        description={`Are you sure you want to end the HOD appointment of ${relieveTarget?.hodName || "this faculty member"} for ${relieveTarget?.departmentName || ""} (${relieveTarget?.departmentCode || ""})? Their role will revert to Faculty and their account will remain active.`}
        confirmText="Confirm End Appointment"
        variant="danger"
        isLoading={relieving}
      />
    </div>
  );
};
