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
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Modal } from "@/design-system/components/Modal";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { collegeApi } from "@/lib/api/collegeApi";
import {
  CollegeStaffDto,
  CreateCollegeStaffRequest,
  UpdateCollegeStaffRequest,
  DepartmentDto,
  RoleType,
  FacultyDesignation,
  BulkStaffUploadRowDto,
} from "@/lib/api/types";
import { ApiConnectionBanner } from "../components/ApiConnectionBanner";

export interface CsvStaffRow {
  fullName: string;
  email: string;
  role: RoleType;
  designation?: FacultyDesignation;
  departmentCode: string;
  employeeCode: string;
  isValid: boolean;
  validationError?: string;
}

export const StaffDirectoryView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [users, setUsers] = useState<CollegeStaffDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
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
  const [resetSuccessNotice, setResetSuccessNotice] = useState<{ email: string; expiresAtUtc?: string } | null>(null);

  // Bulk CSV Import State
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportTab, setBulkImportTab] = useState<"file" | "paste">("file");
  const [rawCsvInput, setRawCsvInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<CsvStaffRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useDashboardHeader({
    title: "Faculty & Staff",
    breadcrumb: "User accounts, AICTE designations, department affiliations, and credentials",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setApiError(null);
      const [userRes, deptRes] = await Promise.all([
        collegeApi.getStaffUsers(),
        collegeApi.getDepartments(),
      ]);

      setUsers(userRes || []);
      setDepartments(deptRes || []);
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
    setEditDesignation(user.designation);
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
        designation: editRole === "Faculty" || editRole === "HOD" ? editDesignation : undefined,
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
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await collegeApi.deleteStaffUser(userToDelete.id);
      showToast(`Removed ${userToDelete.fullName} from directory.`);
      setUserToDelete(null);
      loadData();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Error removing user account.");
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleToggleStatus = async (user: CollegeStaffDto) => {
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
    setShowResetConfirmModal(true);
  };

  const handleConfirmReset = async () => {
    if (!targetResetUser) return;
    setIsResetting(true);
    try {
      const res = await collegeApi.resetStaffPassword(targetResetUser.id);
      setShowResetConfirmModal(false);
      setResetSuccessNotice({
        email: targetResetUser.email,
        expiresAtUtc: res.expiresAtUtc,
      });
      showToast(`Password reset link dispatched directly to ${targetResetUser.email}.`);
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Failed to initiate password reset.");
    } finally {
      setIsResetting(false);
    }
  };

  // CSV Template Downloader
  const handleDownloadSampleCsv = () => {
    const csvContent =
      "FullName,Email,Role,Designation,DepartmentCode,EmployeeCode\n" +
      "Dr. Ravindra Kumar Sharma,hod.cse@sistec.ac.in,HOD,Professor,CSE,EMP-CSE-001\n" +
      "Dr. Ananya Deshmukh,ananya@sistec.ac.in,Faculty,AssociateProfessor,ECE,EMP-ECE-012\n" +
      "Prof. Priya Nair,priya.nair@sistec.ac.in,Faculty,AssistantProfessor,CSE,EMP-CSE-042\n" +
      "Prof. Rajesh Kulkarni,rajesh@sistec.ac.in,Faculty,AssociateProfessor,ME,EMP-ME-023\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "collabex_faculty_staff_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCsvText = (text: string) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      setParsedRows([]);
      return;
    }

    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const validDepts = new Set(departments.map((d) => d.code.toUpperCase()));
    const validRoles: RoleType[] = ["CollegeAdmin", "HOD", "Faculty", "Student"];

    const rows: CsvStaffRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      if (cols.length < 3) continue;

      const fullName = cols[0] || "";
      const email = cols[1] || "";
      const roleStr = cols[2] || "Faculty";
      const desigStr = cols[3] || "AssistantProfessor";
      const deptCode = cols[4] || "";
      const empCode = cols[5] || "";

      let isValid = true;
      let validationError = "";

      if (!fullName) {
        isValid = false;
        validationError = "Missing full name";
      } else if (!email || !email.includes("@")) {
        isValid = false;
        validationError = "Invalid email address";
      } else if (roleStr !== "CollegeAdmin" && deptCode && !validDepts.has(deptCode.toUpperCase())) {
        isValid = false;
        validationError = `Invalid department code: ${deptCode}`;
      }

      rows.push({
        fullName,
        email,
        role: (validRoles.includes(roleStr as RoleType) ? roleStr : "Faculty") as RoleType,
        designation: desigStr as FacultyDesignation,
        departmentCode: deptCode.toUpperCase(),
        employeeCode: empCode,
        isValid,
        validationError: isValid ? undefined : validationError,
      });
    }

    setParsedRows(rows);
  };

  const handleExecuteBulkUpload = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      showToast("No valid rows to import.");
      return;
    }

    setIsImporting(true);
    try {
      const payload = {
        staffRows: validRows.map((r) => ({
          fullName: r.fullName,
          email: r.email,
          role: r.role,
          designation: r.designation,
          departmentCode: r.departmentCode,
          employeeCode: r.employeeCode,
        })),
      };

      const res = await collegeApi.bulkUploadStaff(payload);
      showToast(`Successfully onboarded ${res.successfullyCreated} staff accounts (${res.failedCount} failed).`);
      setShowBulkImportModal(false);
      setParsedRows([]);
      loadData();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Failed to execute bulk onboarding.");
    } finally {
      setIsImporting(false);
    }
  };

  // Counts
  const facultyCount = users.filter((u) => u.role === "Faculty" || u.role === "HOD").length;
  const adminCount = users.filter((u) => u.role === "CollegeAdmin").length;

  // Filtered List
  const filteredUsers = users.filter((u) => {
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
              onClick={() => setShowBulkImportModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <Upload className="h-4 w-4 text-slate-500" />
              <span>Import CSV</span>
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
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{u.fullName}</div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === "CollegeAdmin"
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : u.role === "HOD"
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      {u.designation ? (
                        <span className="font-medium text-slate-800">{u.designation}</span>
                      ) : (
                        <span className="text-amber-700 text-[10px] font-semibold">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3">
                      {u.departmentName ? (
                        <div>
                          <div className="font-medium text-slate-900">{u.departmentName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{u.departmentCode}</div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Institutional Scope</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-600">
                      {u.employeeCode || "—"}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.isActive
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {u.isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleInitiateReset(u)}
                        title="Send secure user-directed password reset link"
                        className="text-[11px] font-semibold text-slate-600 hover:text-emerald-800 cursor-pointer"
                      >
                        Reset Password
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
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
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
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
              options={departments.map((d) => ({
                label: `${d.name} (${d.code})`,
                value: d.id,
              }))}
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
              value={editDesignation || "AssistantProfessor"}
              onChange={(e: any) => setEditDesignation(e.target.value)}
              options={[
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
              value={editDeptId}
              onChange={(e) => setEditDeptId(e.target.value)}
              options={departments.map((d) => ({
                label: `${d.name} (${d.code})`,
                value: d.id,
              }))}
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
        onClose={() => setShowResetConfirmModal(false)}
        title="Reset User Password"
        description="Send a secure single-use password reset link directly to the user's official email address."
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">User-Directed Reset</p>
              <p className="mt-0.5 text-amber-800/90 leading-relaxed">
                To maintain security compliance, passwords cannot be set manually by administrators. The user will receive an email link valid for 24 hours to set their new password.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-700 space-y-1">
            <div>Target User: <strong className="text-slate-900">{targetResetUser?.fullName}</strong></div>
            <div>Official Email: <strong className="text-slate-900">{targetResetUser?.email}</strong></div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowResetConfirmModal(false)}
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
              {isResetting ? "Dispatching..." : "Send Reset Link"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Password Reset Success Notice Modal */}
      {resetSuccessNotice && (
        <Modal
          isOpen={true}
          onClose={() => setResetSuccessNotice(null)}
          title="Password Reset Link Dispatched"
          description="The user-directed security workflow has been executed."
          size="sm"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Reset Instructions Sent</p>
                <p className="mt-0.5 text-emerald-800/90 leading-relaxed">
                  A cryptographically hashed token was generated and dispatched to <strong>{resetSuccessNotice.email}</strong>.
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
        onClose={() => setShowBulkImportModal(false)}
        title="Import Staff Directory (CSV)"
        description="Upload a CSV file containing staff names, emails, roles, and AICTE designations for batch onboarding."
        size="lg"
      >
        <div className="space-y-4">
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
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFileName(file.name);
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      parseCsvText(evt.target?.result as string);
                    };
                    reader.readAsText(file);
                  }
                }}
                className="hidden"
                id="csvFileInput"
              />
              <label htmlFor="csvFileInput" className="cursor-pointer block">
                <FileSpreadsheet className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-emerald-800">
                  {fileName ? fileName : "Click to select CSV file"}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">Supports UTF-8 CSV with headers</p>
              </label>
            </div>
          ) : (
            <div>
              <textarea
                rows={6}
                value={rawCsvInput}
                onChange={(e) => {
                  setRawCsvInput(e.target.value);
                  parseCsvText(e.target.value);
                }}
                placeholder="FullName,Email,Role,Designation,DepartmentCode,EmployeeCode"
                className="w-full p-2.5 font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          )}

          {/* Validation Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Validation Preview ({parsedRows.filter((r) => r.isValid).length} valid of {parsedRows.length} rows)</span>
              </div>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                {parsedRows.map((r, idx) => (
                  <div key={idx} className={`p-2 flex items-center justify-between ${r.isValid ? "bg-white" : "bg-rose-50/50"}`}>
                    <div>
                      <span className="font-semibold text-slate-900">{r.fullName}</span> ({r.email}) • {r.role} • {r.designation || "Faculty"} • {r.departmentCode}
                    </div>
                    {r.isValid ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                        <Check className="h-3 w-3" /> Valid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 font-bold">
                        <X className="h-3 w-3" /> {r.validationError}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowBulkImportModal(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteBulkUpload}
              disabled={isImporting || parsedRows.filter((r) => r.isValid).length === 0}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 rounded-lg hover:bg-emerald-900 cursor-pointer disabled:opacity-50"
            >
              {isImporting ? "Importing..." : `Import ${parsedRows.filter((r) => r.isValid).length} Staff Accounts`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Remove Staff Account Confirmation Modal */}
      <Modal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
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
            <Button type="button" variant="ghost" size="sm" onClick={() => setUserToDelete(null)}>
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
    </div>
  );
};
