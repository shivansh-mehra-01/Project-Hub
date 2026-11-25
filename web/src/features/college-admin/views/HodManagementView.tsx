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
  CollegeStaffDto,
} from "@/lib/api/types";
import { ApiConnectionBanner } from "../components/ApiConnectionBanner";

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
  const [appointMode, setAppointMode] = useState<"promote" | "create">("promote");
  const [targetDepartmentId, setTargetDepartmentId] = useState("");
  const [selectedFacultyId, setSelectedFacultyId] = useState("");

  // Create new HOD Form
  const [newHodName, setNewHodName] = useState("");
  const [newHodEmail, setNewHodEmail] = useState("");
  const [newHodCode, setNewHodCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useDashboardHeader({
    title: "Department Heads",
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

  const handleOpenAppoint = (deptId?: string) => {
    const dId = deptId || departments[0]?.id || hods[0]?.departmentId || "";
    setTargetDepartmentId(dId);
    setSelectedFacultyId(facultyList[0]?.id || "");
    setNewHodName("");
    setNewHodEmail("");
    setNewHodCode("");
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
        if (!selectedFacultyId) {
          showToast("Please select a faculty candidate.");
          return;
        }
        const fac = facultyList.find((f) => f.id === selectedFacultyId);
        await collegeApi.appointHod(targetDepartmentId, { hodUserId: selectedFacultyId });
        showToast(`Assigned ${fac?.fullName || "Faculty"} as HOD of ${deptDisplayName}.`);
      } else {
        if (!newHodName.trim() || !newHodEmail.trim()) {
          showToast("Name and email are required.");
          return;
        }
        const payload: CreateHodRequest = {
          fullName: newHodName.trim(),
          email: newHodEmail.trim(),
          employeeCode: newHodCode.trim() || `EMP-${Date.now().toString().slice(-4)}`,
          departmentId: targetDepartmentId,
        };
        await collegeApi.createHod(payload);
        showToast(`Created and appointed ${payload.fullName} as HOD of ${deptDisplayName}.`);
      }

      setShowAppointModal(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Error appointing HOD.");
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

      {/* Appoint / Promote Modal */}
      <Modal
        isOpen={showAppointModal}
        onClose={() => setShowAppointModal(false)}
        title="Appoint Head of Department (HOD)"
        description="Assign a faculty member or onboard an external appointee as Head of Department."
        size="md"
      >
        <form onSubmit={handleAppointSubmit} className="space-y-4">
          <Select
            label="Department Branch"
            value={targetDepartmentId}
            onChange={(e) => setTargetDepartmentId(e.target.value)}
            options={departments.map((d) => ({
              label: `${d.name} (${d.code})`,
              value: d.id,
            }))}
            required
          />

          <div className="flex border-b border-slate-200 pb-2 gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAppointMode("promote")}
              className={`pb-1 cursor-pointer ${appointMode === "promote" ? "text-emerald-800 border-b-2 border-emerald-800" : "text-slate-500"}`}
            >
              Promote Existing Faculty
            </button>
            <button
              type="button"
              onClick={() => setAppointMode("create")}
              className={`pb-1 cursor-pointer ${appointMode === "create" ? "text-emerald-800 border-b-2 border-emerald-800" : "text-slate-500"}`}
            >
              Onboard External HOD
            </button>
          </div>

          {appointMode === "promote" ? (
            <div>
              <Select
                label="Select Faculty Candidate"
                value={selectedFacultyId}
                onChange={(e) => setSelectedFacultyId(e.target.value)}
                options={facultyList.map((f) => ({
                  label: `${f.fullName} (${f.email}) - ${f.designation || "Faculty"}`,
                  value: f.id,
                }))}
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                The selected faculty member will be assigned Head of Department responsibilities for this branch.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                label="Full Name"
                placeholder="Dr. Full Name"
                value={newHodName}
                onChange={(e) => setNewHodName(e.target.value)}
                required
              />
              <Input
                label="Official Email"
                type="email"
                placeholder="hod.dept@college.ac.in"
                value={newHodEmail}
                onChange={(e) => setNewHodEmail(e.target.value)}
                required
              />
              <Input
                label="Employee ID (Optional)"
                placeholder="EMP-HOD-01"
                value={newHodCode}
                onChange={(e) => setNewHodCode(e.target.value)}
              />
              <p className="text-[11px] text-slate-500">
                An account invitation will be dispatched to this email address to establish access credentials.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAppointModal(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 rounded-lg hover:bg-emerald-900 cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Appointing..." : "Confirm Appointment"}
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
                <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100">
                  Appointed: {new Date(h.appointedAtUtc).toLocaleDateString()} by {h.appointedBy}
                </div>
              </div>
            ))
          )}
        </div>
      </SlideOverDrawer>
    </div>
  );
};
