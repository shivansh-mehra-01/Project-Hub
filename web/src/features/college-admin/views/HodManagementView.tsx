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
  AlertTriangle,
  Upload,
  Download,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Modal } from "@/design-system/components/Modal";
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

  // Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "appointed" | "vacant">("all");
  const [programFilter, setProgramFilter] = useState<string>("all");

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

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useDashboardHeader({
    title: "Department Leadership",
    breadcrumb: "Department HOD appointments, vacancies, and leadership succession",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
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
    } catch (err: any) {
      console.error("Failed to load department leadership data:", err);
      setApiError(err?.message || "Failed to connect to backend service. Leadership data unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await collegeApi.getHodHistory();
      setHistoryList(res || []);
    } catch (err) {
      console.error("Failed to load HOD history:", err);
      showToast("Unable to fetch tenure history from database.");
    }
    setShowHistoryDrawer(true);
  };

  useEffect(() => {
    loadData();
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
      showToast(`Assigned ${fac?.fullName || "Faculty"} as HOD of ${deptDisplayName}.`);
    } catch (err: any) {
      console.error("Failed to appoint HOD:", err);
      setModalError(err?.message || "Unable to appoint HOD. Please verify eligibility and try again.");
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
    } catch (err: any) {
      console.error(err);
      showToast("Failed to update HOD status.");
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

    const progInfo = getProgramInfo(h);
    const matchesProgram =
      programFilter === "all" || progInfo.code.toLowerCase() === programFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesProgram;
  });

  return (
    <div className="space-y-6 pb-12 font-sans bg-[#f8fafc]">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-lg">
          <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
          <span>{toastMessage}</span>
        </div>
      )}

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
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search branch, code, or HOD..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="appointed">Appointed</option>
              <option value="vacant">Vacant</option>
            </select>

            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="all">All Programs</option>
              <option value="B.Tech">B.Tech</option>
              <option value="M.Tech">M.Tech</option>
              <option value="MBA">MBA</option>
              <option value="MCA">MCA</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <History className="h-4 w-4 text-slate-500" />
              <span>Tenure History</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAppoint()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-800 rounded-lg hover:bg-emerald-900 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Appoint HOD</span>
            </button>
          </div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin mr-2 text-emerald-800" />
            Loading department leadership roster...
          </div>
        ) : filteredHods.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No departments match your filter criteria.
          </div>
        ) : (
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
                {filteredHods.map((item) => {
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
                      <td className="p-3 text-right space-x-2">
                        {isAppointed ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(item)}
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
            <div className="text-center py-8 text-xs text-slate-500">
              No historical appointment records found.
            </div>
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

      {/* End HOD Appointment Confirmation Modal */}
      <Modal
        isOpen={Boolean(relieveTarget)}
        onClose={() => !relieving && setRelieveTarget(null)}
        title="End HOD Appointment"
        description="Revoke Head of Department privileges while keeping the faculty account active."
      >
        {relieveTarget && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              Are you sure you want to end the HOD appointment of{" "}
              <span className="font-bold">{relieveTarget.hodName}</span> for{" "}
              <span className="font-bold">
                {relieveTarget.departmentName} ({relieveTarget.departmentCode})
              </span>
              ? Their role will revert to <span className="font-semibold">Faculty</span> and their account will remain active.
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={relieving}
                onClick={() => setRelieveTarget(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={relieving}
                onClick={async () => {
                  setRelieving(true);
                  try {
                    await collegeApi.relieveHod(relieveTarget.departmentId);
                    const relievedName = relieveTarget.hodName || "Faculty";
                    setRelieveTarget(null);
                    await loadData();
                    showToast(`Ended HOD appointment for ${relievedName}. Faculty account remains active.`);
                  } catch (err: any) {
                    showToast(err?.message || "Failed to end HOD appointment.");
                  } finally {
                    setRelieving(false);
                  }
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-700 rounded-lg hover:bg-rose-800 cursor-pointer disabled:opacity-50"
              >
                {relieving ? "Ending..." : "Confirm End Appointment"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
