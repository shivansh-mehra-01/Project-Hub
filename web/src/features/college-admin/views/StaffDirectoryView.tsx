"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  KeyRound,
  CheckCircle2,
  Loader2,
  UserCheck,
  UserX,
  Mail,
  Building2,
  ShieldCheck,
  Shield,
  GraduationCap,
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  X,
  Check,
  ShieldAlert,
  History,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Modal } from "@/design-system/components/Modal";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { collegeApi } from "@/lib/api/collegeApi";
import {
  CollegeStaffDto,
  CourseProgramDto,
  CreateCollegeStaffRequest,
  UpdateCollegeStaffRequest,
  DepartmentDto,
  RoleType,
  FacultyDesignation,
  BulkStaffUploadRowDto,
  RosterImportPreviewDto,
  RosterImportHistoryDto,
} from "@/lib/api/types";
import { ApiConnectionBanner } from "../components/ApiConnectionBanner";
import {
  applyBackendRowErrors,
  generateRosterCsvTemplate,
  MAX_ROSTER_FILE_BYTES,
  parseRosterCsv,
  ParsedRosterRow,
  ROSTER_CSV_HEADERS,
} from "./rosterCsvHelpers";
import {
  generateStudentCsvTemplate,
  ParsedStudentRow,
  parseStudentCsv,
  STUDENT_CSV_HEADERS,
} from "./studentCsvHelpers";
import {
  formatStaffDepartmentDisplay,
  formatStaffDesignationDisplay,
  formatStaffRoleLabel,
  isLastActiveCollegeAdmin,
} from "./staffDirectoryHelpers";

export const StaffDirectoryView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [users, setUsers] = useState<CollegeStaffDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [programs, setPrograms] = useState<CourseProgramDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [departmentFilter, setDepartmentFilter] = useState<string>("All");

  // Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<RoleType>("Faculty");
  const [newDesignation, setNewDesignation] = useState<FacultyDesignation>("AssistantProfessor");
  const [newDeptId, setNewDeptId] = useState("");
  const [newEmpCode, setNewEmpCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit User Modal State
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<CollegeStaffDto | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<RoleType>("Faculty");
  const [editDesignation, setEditDesignation] = useState<FacultyDesignation | undefined>(undefined);
  const [editDeptId, setEditDeptId] = useState("");
  const [editEmpCode, setEditEmpCode] = useState("");
  const [updating, setUpdating] = useState(false);

  // Delete User Confirmation State
  const [userToDelete, setUserToDelete] = useState<CollegeStaffDto | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Password Reset Confirmation Modal State (Zero Admin Plaintext OTP)
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [targetResetUser, setTargetResetUser] = useState<CollegeStaffDto | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessNotice, setResetSuccessNotice] = useState<{ email: string; expiresAtUtc?: string } | null>(null);

  // Bulk CSV Import State
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportTab, setBulkImportTab] = useState<"file" | "paste">("file");
  const [rawCsvInput, setRawCsvInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvHeaderError, setCsvHeaderError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRosterRow[]>([]);
  const [bulkImportError, setBulkImportError] = useState<string | null>(null);
  const [staffServerPreview, setStaffServerPreview] = useState<RosterImportPreviewDto | null>(null);
  const [isPreviewingStaff, setIsPreviewingStaff] = useState(false);

  // Students.csv Import Modal State
  const [showStudentCsvModal, setShowStudentCsvModal] = useState(false);
  const [studentCsvText, setStudentCsvText] = useState("");
  const [studentCsvHeaders, setStudentCsvHeaders] = useState<string[]>([]);
  const [studentCsvHeaderError, setStudentCsvHeaderError] = useState<string | null>(null);
  const [parsedStudentRows, setParsedStudentRows] = useState<ParsedStudentRow[]>([]);
  const [studentCsvError, setStudentCsvError] = useState<string | null>(null);
  const [studentServerPreview, setStudentServerPreview] = useState<RosterImportPreviewDto | null>(null);
  const [isPreviewingStudents, setIsPreviewingStudents] = useState(false);
  const [isImportingStudents, setIsImportingStudents] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Roster Import History Modal State
  const [showImportHistoryModal, setShowImportHistoryModal] = useState(false);
  const [importHistory, setImportHistory] = useState<RosterImportHistoryDto[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useDashboardHeader({
    title: "Faculty & Staff",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setApiError(null);
      const [userRes, deptRes, progRes] = await Promise.all([
        collegeApi.getStaffUsers(),
        collegeApi.getDepartments(),
        collegeApi.getCoursePrograms(),
      ]);

      const collegeStaff = (userRes || []).filter((u) => u.role !== "SuperAdmin");
      setUsers(collegeStaff);
      setDepartments(deptRes || []);
      setPrograms(progRes || []);
    } catch (err: any) {
      console.error("Failed to load staff directory:", err);
      setApiError(err?.message || "Failed to connect to backend service. Staff accounts unavailable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddUser = () => {
    setNewName("");
    setNewEmail("");
    setNewRole("Faculty");
    setNewDesignation("AssistantProfessor");
    setNewDeptId(departments[0]?.id || "");
    setNewEmpCode("");
    setShowAddUserModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    setSubmitting(true);
    try {
      const payload: CreateCollegeStaffRequest = {
        fullName: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        designation: newRole === "Faculty" || newRole === "HOD" ? newDesignation : undefined,
        departmentId: newRole === "CollegeAdmin" ? undefined : newDeptId || undefined,
        employeeCode: newEmpCode.trim() || undefined,
      };

      await collegeApi.createStaffUser(payload);
      showToast(`User ${payload.fullName} provisioned. Account activation dispatched to ${payload.email}.`);
      setShowAddUserModal(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Error provisioning staff account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditUser = (user: CollegeStaffDto) => {
    setEditingUser(user);
    setEditName(user.fullName);
    setEditRole(user.role);
    setEditDesignation(user.designation || undefined);
    setEditDeptId(user.departmentId || "");
    setEditEmpCode(user.employeeCode || "");
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editName.trim()) return;
    setUpdating(true);
    try {
      const payload: UpdateCollegeStaffRequest = {
        fullName: editName.trim(),
        role: editRole,
        designation: (editRole === "Faculty" || editRole === "HOD") && editDesignation ? editDesignation : undefined,
        departmentId: editRole === "CollegeAdmin" ? undefined : editDeptId || undefined,
        employeeCode: editEmpCode.trim() || undefined,
      };

      await collegeApi.updateStaffUser(editingUser.id, payload);
      showToast(`Updated account details for ${payload.fullName}.`);
      setShowEditUserModal(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Error updating account.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = (user: CollegeStaffDto) => {
    if (isLastActiveCollegeAdmin(user, users)) {
      showToast("Cannot delete the last active College Admin.");
      return;
    }
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    const targetUser = userToDelete;
    setIsDeletingUser(true);
    try {
      await collegeApi.deleteStaffUser(targetUser.id);
      setUserToDelete(null);
      showToast(`Removed ${targetUser.fullName} from directory.`);
      await loadData();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Error removing user account.");
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleToggleStatus = async (user: CollegeStaffDto) => {
    if (user.isActive && isLastActiveCollegeAdmin(user, users)) {
      showToast("Cannot deactivate the last active College Admin.");
      return;
    }
    try {
      const newStatus = !user.isActive;
      await collegeApi.updateUserStatus(user.id, { isActive: newStatus });
      showToast(`Account for ${user.fullName} is now ${newStatus ? "Active" : "Deactivated"}.`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: newStatus } : u))
      );
    } catch (err: any) {
      console.error(err);
      showToast("Failed to update user status.");
    }
  };

  // Zero-Trust Secure Password Reset
  const handleInitiateReset = (user: CollegeStaffDto) => {
    setTargetResetUser(user);
    setResetError(null);
    setShowResetConfirmModal(true);
  };

  const handleConfirmReset = async () => {
    if (!targetResetUser) return;
    setIsResetting(true);
    setResetError(null);
    try {
      const res = await collegeApi.resetStaffPassword(targetResetUser.id);
      if (!res?.success || res.emailDispatched !== true) {
        const failureMsg =
          res?.message ||
          "Password reset verification code could not be delivered. Please check institutional mail settings.";
        setResetError(failureMsg);
        showToast(failureMsg);
        return;
      }

      setShowResetConfirmModal(false);
      setResetSuccessNotice({
        email: targetResetUser.email,
        expiresAtUtc: res.expiresAtUtc,
      });
      showToast(`6-digit password reset code dispatched to ${targetResetUser.email}.`);
    } catch (err: any) {
      console.error(err);
      const failureMsg =
        err?.message ||
        "Failed to dispatch password reset verification code. Please check institutional mail settings.";
      setResetError(failureMsg);
      showToast(failureMsg);
    } finally {
      setIsResetting(false);
    }
  };

  // CSV Template Downloader
  const handleDownloadSampleCsv = () => {
    const csvContent = generateRosterCsvTemplate(departments);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "colabex_faculty_roster_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCsvText = (text: string) => {
    setBulkImportError(null);
    if (!text.trim()) {
      setCsvHeaders([]);
      setCsvHeaderError(null);
      setParsedRows([]);
      return;
    }

    const result = parseRosterCsv(text, departments, users);
    setCsvHeaders(result.headers);
    setCsvHeaderError(result.headerError);
    setParsedRows(result.rows);
    setStaffServerPreview(null);
  };

  const handlePreviewBulkStaff = async () => {
    if (isPreviewingStaff || csvHeaderError || parsedRows.length === 0) return;
    setBulkImportError(null);
    setIsPreviewingStaff(true);
    try {
      const preview = await collegeApi.previewBulkStaff({
        csvHeaders: csvHeaders.length > 0 ? csvHeaders : [...ROSTER_CSV_HEADERS],
        staffRows: parsedRows.map((r): BulkStaffUploadRowDto => ({
          fullName: r.fullName,
          email: r.email,
          departmentCode: r.departmentCode,
          designation: (r.designation || r.rawDesignation) as FacultyDesignation,
        })),
      });
      setStaffServerPreview(preview);
      if (preview.headerErrors.length > 0) {
        setBulkImportError(preview.headerErrors.join(" "));
      }
    } catch (err: any) {
      setBulkImportError(err?.message || "Failed to validate faculty roster on server.");
    } finally {
      setIsPreviewingStaff(false);
    }
  };

  const handleExecuteBulkUpload = async () => {
    if (isImporting) return;
    setBulkImportError(null);

    if (csvHeaderError) {
      setBulkImportError(csvHeaderError);
      return;
    }

    if (parsedRows.length === 0 || parsedRows.some((r) => !r.isValid || !r.designation)) {
      setBulkImportError("Resolve all invalid or conflicting rows before importing.");
      return;
    }

    setIsImporting(true);
    try {
      const payload = {
        csvHeaders: csvHeaders.length > 0 ? csvHeaders : [...ROSTER_CSV_HEADERS],
        staffRows: parsedRows.map((r): BulkStaffUploadRowDto => ({
          fullName: r.fullName,
          email: r.email,
          departmentCode: r.departmentCode,
          designation: r.designation as FacultyDesignation,
        })),
      };

      const res = await collegeApi.bulkUploadStaff(payload);
      setShowBulkImportModal(false);
      setRawCsvInput("");
      setFileName("");
      setCsvHeaders([]);
      setCsvHeaderError(null);
      setParsedRows([]);
      setStaffServerPreview(null);
      setBulkImportError(null);
      await loadData();
      showToast(
        `Roster import complete: ${res.successfullyCreated} created, ${res.successfullyUpdated} updated.`
      );
    } catch (err: any) {
      console.error("Bulk roster import failed:", err);
      const apiErrors: string[] | undefined = err?.data?.errors;
      if (apiErrors && apiErrors.length > 0) {
        setParsedRows((prev) => applyBackendRowErrors(prev, apiErrors));
      }
      setBulkImportError(
        apiErrors && apiErrors.length > 0
          ? apiErrors.join(" ")
          : err?.message || "Failed to execute bulk faculty roster import."
      );
    } finally {
      setIsImporting(false);
    }
  };

  // Counts
  const facultyCount = users.filter((u) => u.role === "Faculty" || u.role === "HOD").length;
  const adminCount = users.filter((u) => u.role === "CollegeAdmin").length;

  // Filtered List (College staff only; platform SuperAdmin is excluded from institutional directory)
  const filteredUsers = users.filter((u) => {
    if (u.role === "SuperAdmin") return false;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.employeeCode && u.employeeCode.toLowerCase().includes(q)) ||
      (u.departmentName && u.departmentName.toLowerCase().includes(q));

    const matchesRole = roleFilter === "All" || u.role === roleFilter;
    const matchesDept = departmentFilter === "All" || u.departmentId === departmentFilter;

    return matchesSearch && matchesRole && matchesDept;
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
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Staff</span>
          <span className="block text-2xl font-bold text-slate-900 font-mono mt-1">
            {users.length}
          </span>
          <span className="text-[11px] text-slate-500">Across all roles and academic departments</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Teaching Faculty</span>
          <span className="block text-2xl font-bold text-emerald-800 font-mono mt-1">
            {facultyCount}
          </span>
          <span className="text-[11px] text-emerald-700 font-medium">Professors, Associate & Assistant Professors</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Administrative Officers</span>
          <span className="block text-2xl font-bold text-slate-700 font-mono mt-1">
            {adminCount}
          </span>
          <span className="text-[11px] text-slate-500">Principal, Deans & College Administrators</span>
        </div>
      </div>

      {/* Main Directory Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="All">All Roles</option>
              <option value="CollegeAdmin">College Admin</option>
              <option value="HOD">HOD</option>
              <option value="Faculty">Faculty</option>
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                setShowImportHistoryModal(true);
                setLoadingHistory(true);
                try {
                  const res = await collegeApi.getRosterImportHistory();
                  setImportHistory(res || []);
                } catch {
                  setImportHistory([]);
                } finally {
                  setLoadingHistory(false);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <History className="h-4 w-4 text-slate-500" />
              <span>Import History</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStudentCsvText("");
                setStudentCsvHeaders([]);
                setStudentCsvHeaderError(null);
                setParsedStudentRows([]);
                setStudentServerPreview(null);
                setStudentCsvError(null);
                setShowStudentCsvModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <Upload className="h-4 w-4 text-slate-500" />
              <span>Import Students.csv</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBulkImportModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <Upload className="h-4 w-4 text-slate-500" />
              <span>Import Faculty.csv</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddUser}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-800 rounded-lg hover:bg-emerald-900 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add Staff Member</span>
            </button>
          </div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin mr-2 text-emerald-800" />
            Loading staff directory...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No staff records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3">Staff Member</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">AICTE Cadre / Designation</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Employee ID</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.map((u) => {
                  const designationDisplay = formatStaffDesignationDisplay(u);
                  const departmentDisplay = formatStaffDepartmentDisplay(u);
                  const lastActiveAdmin = isLastActiveCollegeAdmin(u, users);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors align-top">
                      <td className="p-3 min-w-[180px] max-w-[260px]">
                        <div className="font-bold text-slate-900 break-words">{u.fullName}</div>
                        <div className="text-[11px] text-slate-500 break-all">{u.email}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === "CollegeAdmin"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : u.role === "HOD"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        }`}>
                          {formatStaffRoleLabel(u.role)}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {designationDisplay.isNeutral ? (
                          <span className="text-slate-400 text-xs">{designationDisplay.text}</span>
                        ) : (
                          <span className="font-medium text-slate-800">{designationDisplay.text}</span>
                        )}
                      </td>
                      <td className="p-3 min-w-[140px]">
                        {departmentDisplay.isInstitutionalScope ? (
                          <span className="text-[11px] font-medium text-slate-500">{departmentDisplay.primary}</span>
                        ) : departmentDisplay.isNeutral ? (
                          <span className="text-slate-400 text-xs">{departmentDisplay.primary}</span>
                        ) : (
                          <div>
                            <div className="font-medium text-slate-900">{departmentDisplay.primary}</div>
                            {departmentDisplay.secondary && (
                              <div className="text-[10px] text-slate-400 font-mono">{departmentDisplay.secondary}</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {u.employeeCode || "—"}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.isActive
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {u.isActive ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-x-3 gap-y-1 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleInitiateReset(u)}
                            title="Send secure user-directed password reset code (OTP)"
                            className="text-[11px] font-semibold text-slate-600 hover:text-emerald-800 cursor-pointer"
                          >
                            Reset Password
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            disabled={lastActiveAdmin}
                            title={lastActiveAdmin ? "Cannot deactivate the last active College Admin" : undefined}
                            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(u)}
                            className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            disabled={lastActiveAdmin}
                            title={lastActiveAdmin ? "Cannot delete the last active College Admin" : undefined}
                            className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        title="Add Staff Member"
        description="Provision an institutional account with designated AICTE cadre and department assignment."
        size="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Dr. Full Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <Input
            label="Official Email Address"
            type="email"
            placeholder="faculty@college.ac.in"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
          <Select
            label="System Role"
            value={newRole}
            onChange={(e: any) => setNewRole(e.target.value)}
            options={[
              { label: "Faculty", value: "Faculty" },
              { label: "Head of Department (HOD)", value: "HOD" },
              { label: "College Administrator", value: "CollegeAdmin" },
            ]}
          />

          {(newRole === "Faculty" || newRole === "HOD") && (
            <Select
              label="AICTE Cadre / Designation"
              value={newDesignation}
              onChange={(e: any) => setNewDesignation(e.target.value)}
              options={[
                { label: "Professor", value: "Professor" },
                { label: "Associate Professor", value: "AssociateProfessor" },
                { label: "Assistant Professor", value: "AssistantProfessor" },
                { label: "Adjunct Faculty", value: "AdjunctFaculty" },
              ]}
            />
          )}

          {newRole !== "CollegeAdmin" && (
            <Select
              label="Academic Department"
              value={newDeptId}
              onChange={(e) => setNewDeptId(e.target.value)}
              options={[
                { label: "-- Select Department --", value: "" },
                ...departments.map((d) => ({
                  label: `${d.name} (${d.code})`,
                  value: d.id,
                })),
              ]}
            />
          )}

          <Input
            label="Employee ID (Optional)"
            placeholder="EMP-001"
            value={newEmpCode}
            onChange={(e) => setNewEmpCode(e.target.value)}
          />

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
            Plaintext passwords are never generated or shown. An invitation link will be dispatched to the official email for secure user-directed setup.
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddUserModal(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 rounded-lg hover:bg-emerald-900 cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Provisioning..." : "Provision Account"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditUserModal}
        onClose={() => setShowEditUserModal(false)}
        title="Edit Staff Account"
        description="Update role, AICTE cadre designation, and department assignment."
        size="md"
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <Input
            label="Full Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />
          <Select
            label="System Role"
            value={editRole}
            onChange={(e: any) => setEditRole(e.target.value)}
            options={[
              { label: "Faculty", value: "Faculty" },
              { label: "Head of Department (HOD)", value: "HOD" },
              { label: "College Administrator", value: "CollegeAdmin" },
            ]}
          />

          {(editRole === "Faculty" || editRole === "HOD") && (
            <Select
              label="AICTE Cadre / Designation"
              value={editDesignation || ""}
              onChange={(e: any) => setEditDesignation(e.target.value as FacultyDesignation)}
              options={[
                { label: "-- Select Cadre / Designation --", value: "" },
                { label: "Professor", value: "Professor" },
                { label: "Associate Professor", value: "AssociateProfessor" },
                { label: "Assistant Professor", value: "AssistantProfessor" },
                { label: "Adjunct Faculty", value: "AdjunctFaculty" },
              ]}
            />
          )}

          {editRole !== "CollegeAdmin" && (
            <Select
              label="Academic Department"
              value={editDeptId || ""}
              onChange={(e) => setEditDeptId(e.target.value)}
              options={[
                { label: "-- Select Department --", value: "" },
                ...departments.map((d) => ({
                  label: `${d.name} (${d.code})`,
                  value: d.id,
                })),
              ]}
            />
          )}

          <Input
            label="Employee ID"
            value={editEmpCode}
            onChange={(e) => setEditEmpCode(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowEditUserModal(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 rounded-lg hover:bg-emerald-900 cursor-pointer disabled:opacity-50"
            >
              {updating ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Password Reset Confirmation Modal */}
      <Modal
        isOpen={showResetConfirmModal}
        onClose={() => {
          setShowResetConfirmModal(false);
          setResetError(null);
        }}
        title="Reset User Password"
        description="Send a 6-digit single-use password reset verification code to the user's official email address."
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">User-Directed OTP Reset</p>
              <p className="mt-0.5 text-amber-800/90 leading-relaxed">
                To maintain security compliance, passwords cannot be set manually by administrators. The user will receive a 6-digit verification code (OTP) by email, valid for 15 minutes, to set their new password on the login page.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-700 space-y-1">
            <div>Target User: <strong className="text-slate-900">{targetResetUser?.fullName}</strong></div>
            <div>Official Email: <strong className="text-slate-900">{targetResetUser?.email}</strong></div>
          </div>

          {resetError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium"
            >
              {resetError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setShowResetConfirmModal(false);
                setResetError(null);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReset}
              disabled={isResetting}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 rounded-lg hover:bg-emerald-900 cursor-pointer disabled:opacity-50"
            >
              {isResetting ? "Sending..." : "Send Verification Code"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Password Reset Success Notice Modal */}
      {resetSuccessNotice && (
        <Modal
          isOpen={true}
          onClose={() => setResetSuccessNotice(null)}
          title="Password Reset Code Dispatched"
          description="The user-directed OTP security workflow has been executed."
          size="sm"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Verification Code Sent</p>
                <p className="mt-0.5 text-emerald-800/90 leading-relaxed">
                  A cryptographically hashed 6-digit verification code (valid for 15 minutes) was generated and dispatched to <strong>{resetSuccessNotice.email}</strong>. The user can enter it on the Forgot Password screen to set a new password.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setResetSuccessNotice(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 rounded-lg hover:bg-emerald-900 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk CSV Import Modal */}
      <Modal
        isOpen={showBulkImportModal}
        onClose={() => {
          if (!isImporting) {
            setShowBulkImportModal(false);
            setBulkImportError(null);
          }
        }}
        title="Import Faculty Roster (CSV)"
        description="Upload a UTF-8 CSV using the 4-column contract: FullName, Email, DepartmentCode, Designation."
        size="lg"
      >
        <div className="space-y-4">
          {bulkImportError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{bulkImportError}</span>
            </div>
          )}

          {csvHeaderError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{csvHeaderError}</span>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 space-y-1">
            <div>
              <span className="font-semibold text-slate-800">Required columns:</span>{" "}
              <code className="font-mono text-slate-900">FullName,Email,DepartmentCode,Designation</code>
            </div>
            <div>
              <span className="font-semibold text-slate-800">Supported designations:</span>{" "}
              <code className="font-mono text-slate-900">Professor</code>,{" "}
              <code className="font-mono text-slate-900">AssociateProfessor</code>,{" "}
              <code className="font-mono text-slate-900">AssistantProfessor</code>,{" "}
              <code className="font-mono text-slate-900">AdjunctFaculty</code>,{" "}
              <code className="font-mono text-slate-900">Lecturer</code>
            </div>
            <div>
              All imported accounts are onboarded as Faculty. HOD appointments must be performed separately in Department Leadership.
            </div>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex gap-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setBulkImportTab("file")}
                className={`pb-1 cursor-pointer ${bulkImportTab === "file" ? "text-emerald-800 border-b-2 border-emerald-800" : "text-slate-500"}`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setBulkImportTab("paste")}
                className={`pb-1 cursor-pointer ${bulkImportTab === "paste" ? "text-emerald-800 border-b-2 border-emerald-800" : "text-slate-500"}`}
              >
                Paste CSV
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Template</span>
            </button>
          </div>

          {bulkImportTab === "file" ? (
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={isImporting}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > MAX_ROSTER_FILE_BYTES) {
                    setFileName(file.name);
                    setCsvHeaders([]);
                    setParsedRows([]);
                    setCsvHeaderError(`CSV file exceeds the ${MAX_ROSTER_FILE_BYTES / 1024} KB limit.`);
                    return;
                  }
                  setFileName(file.name);
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    parseCsvText(String(evt.target?.result ?? ""));
                  };
                  reader.readAsText(file, "UTF-8");
                }}
                className="hidden"
                id="csvFileInput"
              />
              <label htmlFor="csvFileInput" className="cursor-pointer block">
                <FileSpreadsheet className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-emerald-800">
                  {fileName ? fileName : "Click to select CSV file"}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">Supports UTF-8 CSV up to 1 MB / 500 rows</p>
              </label>
            </div>
          ) : (
            <div>
              <textarea
                rows={6}
                disabled={isImporting}
                value={rawCsvInput}
                onChange={(e) => {
                  setRawCsvInput(e.target.value);
                  parseCsvText(e.target.value);
                }}
                placeholder="FullName,Email,DepartmentCode,Designation"
                className="w-full p-2.5 font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          )}

          {/* Validation Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                <span>Validation Preview ({parsedRows.length} rows)</span>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    New: {parsedRows.filter((r) => r.status === "new").length}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                    Update: {parsedRows.filter((r) => r.status === "update").length}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                    Invalid: {parsedRows.filter((r) => !r.isValid).length}
                  </span>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                {parsedRows.map((r) => (
                  <div
                    key={r.rowNumber}
                    className={`p-2 flex items-center justify-between gap-2 ${r.isValid ? "bg-white" : "bg-rose-50/50"}`}
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] text-slate-400 mr-1.5">#{r.rowNumber}</span>
                      <span className="font-semibold text-slate-900">{r.fullName || "(missing name)"}</span>{" "}
                      ({r.email || "missing email"}) • {r.departmentCode || "—"} • {r.rawDesignation || "—"}
                    </div>
                    {r.status === "new" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold shrink-0">
                        <Check className="h-3 w-3" /> New Faculty
                      </span>
                    ) : r.status === "update" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 font-bold shrink-0">
                        <Check className="h-3 w-3" /> Update Existing
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 font-bold shrink-0">
                        <X className="h-3 w-3" /> {r.validationError}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {staffServerPreview && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 flex flex-wrap items-center gap-3">
              <span className="font-semibold text-slate-900">Server Verification:</span>
              <span className="text-emerald-700 font-semibold">{staffServerPreview.createCount} Create</span>
              <span className="text-blue-700 font-semibold">{staffServerPreview.updateCount} Update</span>
              <span className={staffServerPreview.invalidCount > 0 ? "text-rose-700 font-semibold" : "text-slate-500"}>
                {staffServerPreview.invalidCount} Invalid
              </span>
              {staffServerPreview.duplicateCount > 0 && (
                <span className="text-amber-700 font-semibold">{staffServerPreview.duplicateCount} Duplicate</span>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isImporting || isPreviewingStaff}
              onClick={() => {
                setShowBulkImportModal(false);
                setBulkImportError(null);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePreviewBulkStaff}
              disabled={isPreviewingStaff || isImporting || Boolean(csvHeaderError) || parsedRows.length === 0}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              {isPreviewingStaff ? "Verifying..." : "Verify on Server"}
            </button>
            <button
              type="button"
              onClick={handleExecuteBulkUpload}
              disabled={
                isImporting ||
                Boolean(csvHeaderError) ||
                parsedRows.length === 0 ||
                parsedRows.some((r) => !r.isValid)
              }
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 rounded-lg hover:bg-emerald-900 cursor-pointer disabled:opacity-50"
            >
              {isImporting
                ? "Importing..."
                : parsedRows.some((r) => !r.isValid)
                  ? `Fix ${parsedRows.filter((r) => !r.isValid).length} Invalid Row(s)`
                  : `Confirm & Import ${parsedRows.length} Faculty`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Remove Staff Account Confirmation Modal */}
      <Modal
        isOpen={!!userToDelete}
        onClose={() => !isDeletingUser && setUserToDelete(null)}
        title="Remove Staff Account"
        description="This action removes the staff member from the active institutional directory."
        size="md"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            <p className="font-semibold">
              Are you sure you want to remove &ldquo;{userToDelete?.fullName}&rdquo; ({userToDelete?.role})?
            </p>
            <p className="mt-1 text-rose-700">
              The account will be revoked immediately. Historical audit entries and course allocations will remain preserved for statutory compliance.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isDeletingUser}
              onClick={() => setUserToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isDeletingUser}
              onClick={confirmDeleteUser}
            >
              {isDeletingUser ? "Removing..." : "Remove Staff Account"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Students.csv Bulk Import Modal */}
      <Modal
        isOpen={showStudentCsvModal}
        onClose={() => !isImportingStudents && setShowStudentCsvModal(false)}
        title="Import Student Roster (Students.csv)"
        description="Provision approved student roster records with StudentNumber, DepartmentCode, Program, and AdmissionYear."
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
            <span className="text-slate-600">
              Required: <code className="font-mono font-semibold">StudentName, Email, StudentNumber, DepartmentCode</code>
            </span>
            <button
              type="button"
              onClick={() => {
                const csv = generateStudentCsvTemplate(departments);
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "Students.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:text-emerald-900 cursor-pointer shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Template</span>
            </button>
          </div>

          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const reader = new FileReader();
              reader.onload = (ev) => {
                const text = String(ev.target?.result || "");
                setStudentCsvText(text);
                setStudentCsvError(null);
                setStudentServerPreview(null);
                const res = parseStudentCsv(text, departments, programs);
                setStudentCsvHeaders(res.headers);
                setStudentCsvHeaderError(res.headerError);
                setParsedStudentRows(res.rows);
              };
              reader.readAsText(f);
            }}
            className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-xs file:font-semibold file:bg-white file:text-slate-700 hover:file:bg-slate-50"
          />

          <textarea
            rows={4}
            value={studentCsvText}
            onChange={(e) => {
              const text = e.target.value;
              setStudentCsvText(text);
              setStudentCsvError(null);
              setStudentServerPreview(null);
              if (!text.trim()) {
                setParsedStudentRows([]);
                setStudentCsvHeaderError(null);
                return;
              }
              const res = parseStudentCsv(text, departments, programs);
              setStudentCsvHeaders(res.headers);
              setStudentCsvHeaderError(res.headerError);
              setParsedStudentRows(res.rows);
            }}
            placeholder={"StudentName,Email,StudentNumber,DepartmentCode,Program,AdmissionYear,CurrentSemester"}
            className="w-full p-2.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
          />

          {(studentCsvHeaderError || studentCsvError) && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {studentCsvHeaderError || studentCsvError}
            </div>
          )}

          {parsedStudentRows.length > 0 && (
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
              {parsedStudentRows.map((r) => (
                <div key={r.rowNumber} className="p-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900">
                      Row {r.rowNumber}: {r.studentName} ({r.studentNumber})
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {r.email} • {r.departmentCode}
                    </span>
                  </div>
                  {r.isValid ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold shrink-0">
                      Valid
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-rose-700 shrink-0">
                      {r.validationError}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {studentServerPreview && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 flex flex-wrap items-center gap-3">
              <span className="font-semibold text-slate-900">Server Verification:</span>
              <span className="text-emerald-700 font-semibold">{studentServerPreview.createCount} Create</span>
              <span className="text-blue-700 font-semibold">{studentServerPreview.updateCount} Update</span>
              <span className={studentServerPreview.invalidCount > 0 ? "text-rose-700 font-semibold" : "text-slate-500"}>
                {studentServerPreview.invalidCount} Invalid
              </span>
              {studentServerPreview.duplicateCount > 0 && (
                <span className="text-amber-700 font-semibold">{studentServerPreview.duplicateCount} Duplicate</span>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isImportingStudents || isPreviewingStudents}
              onClick={() => setShowStudentCsvModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isPreviewingStudents || isImportingStudents || Boolean(studentCsvHeaderError) || parsedStudentRows.length === 0}
              onClick={async () => {
                setIsPreviewingStudents(true);
                setStudentCsvError(null);
                try {
                  const preview = await collegeApi.previewBulkStudents({
                    csvHeaders: studentCsvHeaders.length > 0 ? studentCsvHeaders : [...STUDENT_CSV_HEADERS],
                    studentRows: parsedStudentRows.map((r) => ({
                      studentName: r.studentName,
                      email: r.email,
                      studentNumber: r.studentNumber,
                      departmentCode: r.departmentCode,
                      program: r.program,
                      admissionYear: r.admissionYear,
                      currentSemester: r.currentSemester,
                    })),
                  });
                  setStudentServerPreview(preview);
                  if (preview.headerErrors.length > 0) {
                    setStudentCsvError(preview.headerErrors.join(" "));
                  } else if (preview.invalidCount > 0) {
                    const errs = preview.rows.filter((x) => x.action === "invalid").flatMap((x) => x.errors.map((e) => `Row ${x.rowNumber}: ${e}`));
                    if (errs.length > 0) setStudentCsvError(errs.join(" "));
                  }
                } catch (err: any) {
                  setStudentCsvError(err?.message || "Failed to verify student roster on server.");
                } finally {
                  setIsPreviewingStudents(false);
                }
              }}
            >
              {isPreviewingStudents ? "Verifying..." : "Verify on Server"}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={
                isImportingStudents ||
                Boolean(studentCsvHeaderError) ||
                parsedStudentRows.length === 0 ||
                parsedStudentRows.some((r) => !r.isValid)
              }
              onClick={async () => {
                setIsImportingStudents(true);
                setStudentCsvError(null);
                try {
                  const res = await collegeApi.bulkUploadStudents({
                    csvHeaders: studentCsvHeaders.length > 0 ? studentCsvHeaders : [...STUDENT_CSV_HEADERS],
                    studentRows: parsedStudentRows.map((r) => ({
                      studentName: r.studentName,
                      email: r.email,
                      studentNumber: r.studentNumber,
                      departmentCode: r.departmentCode,
                      program: r.program,
                      admissionYear: r.admissionYear,
                      currentSemester: r.currentSemester,
                    })),
                  });
                  setShowStudentCsvModal(false);
                  setStudentServerPreview(null);
                  await loadData();
                  showToast(`Students.csv imported: ${res.successfullyCreated} created, ${res.successfullyUpdated} updated.`);
                } catch (err: any) {
                  const errs: string[] | undefined = err?.data?.errors;
                  setStudentCsvError(errs && errs.length > 0 ? errs.join(" ") : err?.message || "Student roster import failed.");
                } finally {
                  setIsImportingStudents(false);
                }
              }}
            >
              {isImportingStudents ? "Importing..." : `Confirm & Import ${parsedStudentRows.length} Student(s)`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Roster Import History Modal */}
      <Modal
        isOpen={showImportHistoryModal}
        onClose={() => setShowImportHistoryModal(false)}
        title="Roster Import History"
        description="Audit trail of Faculty.csv and Students.csv roster imports for this college."
        size="lg"
      >
        <div className="space-y-3">
          {loadingHistory ? (
            <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-800" />
              <span>Loading import history...</span>
            </div>
          ) : importHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No roster imports have been recorded yet.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
              {importHistory.map((item) => (
                <div key={item.id} className="p-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {item.importType} Roster Import
                    </div>
                    <div className="text-[11px] text-slate-500">
                      By {item.actorEmail} • {new Date(item.occurredAtUtc).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px]">
                    <span className="text-emerald-700 font-semibold">+{item.createdCount} new</span>
                    {" · "}
                    <span className="text-blue-700 font-semibold">{item.updatedCount} updated</span>
                    <div className="text-[10px] text-slate-400">{item.totalSubmitted} submitted</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
