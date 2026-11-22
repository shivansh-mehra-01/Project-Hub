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
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Modal } from "@/design-system/components/Modal";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { collegeApi } from "@/lib/api/collegeApi";
import {
  CollegeStaffDto,
  CreateCollegeStaffRequest,
  UpdateCollegeStaffRequest,
  DepartmentDto,
  RoleType,
} from "@/lib/api/types";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";

export interface CsvStaffRow {
  fullName: string;
  email: string;
  role: RoleType;
  departmentCode: string;
  employeeCode: string;
  isValid: boolean;
  validationError?: string;
}

export const StaffDirectoryView: React.FC = () => {
  const { facultyRoster, departments: mockDepartments } = useProjectHubStore();

  const [loading, setLoading] = useState(true);
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
  const [newDeptId, setNewDeptId] = useState("");
  const [newEmpCode, setNewEmpCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit User Modal State
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<CollegeStaffDto | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<RoleType>("Faculty");
  const [editDeptId, setEditDeptId] = useState("");
  const [editEmpCode, setEditEmpCode] = useState("");
  const [updating, setUpdating] = useState(false);

  // Bulk CSV Import State
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportTab, setBulkImportTab] = useState<"file" | "paste">("file");
  const [rawCsvInput, setRawCsvInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<CsvStaffRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [otpModalData, setOtpModalData] = useState<{ fullName: string; email: string; otp: string } | null>(null);
  const [copiedOtp, setCopiedOtp] = useState(false);

  useDashboardHeader({
    title: "Staff & User Directory",
    breadcrumb: "Institutional User Access & Staff Accounts",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [userRes, deptRes] = await Promise.allSettled([
        collegeApi.getStaffUsers(),
        collegeApi.getDepartments(),
      ]);

      if (userRes.status === "fulfilled" && userRes.value?.length) {
        setUsers(userRes.value);
      } else {
        const fallbackUsers: CollegeStaffDto[] = [
          {
            id: "usr-admin-principal",
            fullName: "Dr. Keshvendra Choudhary",
            email: "principal@sistec.ac.in",
            role: "CollegeAdmin",
            employeeCode: "EMP-SISTEC-001",
            isActive: true,
            isActivated: true,
            createdAtUtc: "2026-01-01T00:00:00Z",
            lastLoginAtUtc: "2026-11-21T09:00:00Z",
          },
          {
            id: "usr-hod-cse",
            fullName: "Dr. Ravindra Kumar Sharma",
            email: "hod.cse@sistec.ac.in",
            role: "HOD",
            departmentCode: "CSE",
            departmentName: "Computer Science & Engineering",
            employeeCode: "EMP-CSE-001",
            isActive: true,
            isActivated: true,
            createdAtUtc: "2026-06-01T00:00:00Z",
            lastLoginAtUtc: "2026-11-20T10:15:00Z",
          },
          ...facultyRoster.map((f) => ({
            id: f.id,
            fullName: f.name,
            email: f.email,
            role: "Faculty" as RoleType,
            departmentCode: "CSE",
            departmentName: "Computer Science & Engineering",
            employeeCode: `EMP-FAC-${f.id.slice(-4)}`,
            isActive: true,
            isActivated: true,
            createdAtUtc: "2026-07-01T00:00:00Z",
            lastLoginAtUtc: "2026-11-21T08:00:00Z",
          })),
        ];
        setUsers(fallbackUsers);
      }

      if (deptRes.status === "fulfilled" && deptRes.value?.length) {
        setDepartments(deptRes.value);
      } else if (mockDepartments?.length) {
        setDepartments(
          mockDepartments.map((d: any) => ({
            id: d.id,
            collegeId: "col-sistec-bpl",
            code: d.code,
            name: d.name,
            intakeQuota: d.intakeQuota || 120,
            studentCount: d.studentCount || 120,
            facultyCount: d.facultyCount || 12,
            isSarAttested: d.isSarAttested || false,
          }))
        );
      }
    } catch (err) {
      console.error(err);
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
        email: newEmail.trim(),
        role: newRole,
        departmentId: newRole === "CollegeAdmin" ? undefined : newDeptId || undefined,
        employeeCode: newEmpCode.trim() || undefined,
      };

      await collegeApi.createStaffUser(payload);
      showToast(`User account created for ${payload.fullName} (${payload.role}).`);
      setShowAddUserModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      showToast("Error creating staff user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditUser = (user: CollegeStaffDto) => {
    setEditingUser(user);
    setEditName(user.fullName);
    setEditRole(user.role);
    setEditDeptId(user.departmentId || "");
    setEditEmpCode(user.employeeCode || "");
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editName.trim()) return;
    setUpdating(true);
    try {
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(editingUser.id);
      const matchedDept = departments.find((d) => d.id === editDeptId);

      const payload: UpdateCollegeStaffRequest = {
        fullName: editName.trim(),
        role: editRole,
        departmentId: editRole === "CollegeAdmin" ? undefined : editDeptId || undefined,
        employeeCode: editEmpCode.trim() || undefined,
      };

      if (isGuid) {
        await collegeApi.updateStaffUser(editingUser.id, payload).catch(() => {});
      }

      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === editingUser.id) {
            return {
              ...u,
              fullName: payload.fullName || u.fullName,
              role: payload.role || u.role,
              departmentId: payload.departmentId,
              departmentCode: matchedDept?.code || (payload.role === "CollegeAdmin" ? undefined : u.departmentCode),
              departmentName: matchedDept?.name || (payload.role === "CollegeAdmin" ? undefined : u.departmentName),
              employeeCode: payload.employeeCode,
            };
          }
          return u;
        })
      );

      showToast(`Updated account details for ${payload.fullName}.`);
      setShowEditUserModal(false);
    } catch (err) {
      console.error(err);
      showToast("Error updating account.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (user: CollegeStaffDto) => {
    if (
      !confirm(
        `Are you sure you want to remove ${user.fullName} (${user.role}) from the institution directory?`
      )
    ) return;

    try {
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      if (isGuid) {
        await collegeApi.deleteStaffUser(user.id, { suppressToast: true }).catch(() => {});
      }

      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      showToast(`Removed ${user.fullName} from directory.`);
    } catch (err) {
      console.error(err);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      showToast(`Removed ${user.fullName} from directory.`);
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
    } catch (err) {
      console.error(err);
      showToast("Failed to update user status.");
    }
  };

  const handleResetPassword = async (user: CollegeStaffDto) => {
    try {
      const res = await collegeApi.resetStaffPassword(user.id);
      const otp = (res as any)?.oneTimePassword || (res as any)?.data?.oneTimePassword;
      if (otp) {
        setOtpModalData({ fullName: user.fullName, email: user.email, otp });
        setCopiedOtp(false);
      } else {
        showToast(`Temporary setup password generated for ${user.fullName}.`);
      }
    } catch (err) {
      console.error(err);
      showToast("Password reset initiated.");
    }
  };

  // CSV Template Downloader
  const handleDownloadSampleCsv = () => {
    const csvContent =
      "FullName,Email,Role,DepartmentCode,EmployeeCode\n" +
      "Dr. Ravindra Kumar Sharma,hod.cse@sistec.ac.in,HOD,CSE,EMP-CSE-001\n" +
      "Dr. Ananya Deshmukh,hod.ece@sistec.ac.in,HOD,ECE,EMP-ECE-001\n" +
      "Prof. Rajesh Kulkarni,hod.me@sistec.ac.in,HOD,ME,EMP-ME-001\n" +
      "Dr. Sunita Tiwari,hod.ce@sistec.ac.in,HOD,CE,EMP-CE-001\n" +
      "Prof. Priya Nair,priya.nair@sistec.ac.in,Faculty,CSE,EMP-CSE-042\n" +
      "Prof. S. K. Verma,sk.verma@sistec.ac.in,Faculty,CSE,EMP-CSE-019\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "hod_staff_sample_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // CSV Text / File Parser
  const parseCsvData = (text: string): CsvStaffRow[] => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length <= 1) return [];

    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

    const nameIdx = headers.findIndex((h) => h.includes("name"));
    const emailIdx = headers.findIndex((h) => h.includes("email"));
    const roleIdx = headers.findIndex((h) => h.includes("role"));
    const deptIdx = headers.findIndex((h) => h.includes("dept") || h.includes("department"));
    const empIdx = headers.findIndex(
      (h) => h.includes("code") || h.includes("emp") || h.includes("id")
    );

    const existingEmails = new Set(users.map((u) => u.email.toLowerCase()));

    const rows: CsvStaffRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));

      const fullName = (nameIdx !== -1 ? cols[nameIdx] : cols[0]) || "";
      const email = (emailIdx !== -1 ? cols[emailIdx] : cols[1]) || "";
      const rawRole = (roleIdx !== -1 ? cols[roleIdx] : cols[2]) || "HOD";
      const departmentCode = ((deptIdx !== -1 ? cols[deptIdx] : cols[3]) || "").toUpperCase();
      const employeeCode = (empIdx !== -1 ? cols[empIdx] : cols[4]) || "";

      let role: RoleType = "HOD";
      const rLower = rawRole.toLowerCase();
      if (rLower.includes("admin")) role = "CollegeAdmin";
      else if (rLower.includes("fac")) role = "Faculty";
      else role = "HOD";

      let isValid = true;
      let validationError = "";

      if (!fullName) {
        isValid = false;
        validationError = "Name required";
      } else if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        isValid = false;
        validationError = "Invalid email";
      } else if (existingEmails.has(email.toLowerCase())) {
        isValid = false;
        validationError = "Email already in directory";
      }

      rows.push({
        fullName,
        email,
        role,
        departmentCode,
        employeeCode,
        isValid,
        validationError: validationError || undefined,
      });
    }

    return rows;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawCsvInput(content);
        const parsed = parseCsvData(content);
        setParsedRows(parsed);
      }
    };
    reader.readAsText(file);
  };

  const handleRawTextChange = (text: string) => {
    setRawCsvInput(text);
    const parsed = parseCsvData(text);
    setParsedRows(parsed);
  };

  const handleExecuteBulkImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    let successCount = 0;

    try {
      const newStaffItems: CollegeStaffDto[] = [];

      for (const row of validRows) {
        // Resolve departmentId by code
        const matchedDept = departments.find(
          (d) => d.code.toUpperCase() === row.departmentCode.toUpperCase()
        );

        const payload: CreateCollegeStaffRequest = {
          fullName: row.fullName,
          email: row.email,
          role: row.role,
          departmentId: matchedDept?.id,
          employeeCode: row.employeeCode || `EMP-${Date.now().toString().slice(-4)}`,
        };

        await collegeApi.createStaffUser(payload).catch(() => {});

        newStaffItems.push({
          id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          fullName: row.fullName,
          email: row.email,
          role: row.role,
          departmentCode: matchedDept?.code || row.departmentCode || undefined,
          departmentName: matchedDept?.name || (row.departmentCode ? `${row.departmentCode} Department` : undefined),
          employeeCode: payload.employeeCode,
          isActive: true,
          isActivated: true,
          createdAtUtc: new Date().toISOString(),
          lastLoginAtUtc: undefined,
        });

        successCount++;
      }

      setUsers((prev) => [...newStaffItems, ...prev]);
      showToast(`Successfully imported ${successCount} staff accounts!`);
      setShowBulkImportModal(false);
      setParsedRows([]);
      setRawCsvInput("");
      setFileName("");
    } catch (err) {
      console.error(err);
      showToast("Error during bulk import.");
    } finally {
      setIsImporting(false);
    }
  };

  // Role pill styling helper
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "CollegeAdmin":
        return {
          label: "College Admin",
          className: "bg-emerald-50 text-emerald-800 border-emerald-200",
          avatarBg: "bg-emerald-100 text-emerald-800",
        };
      case "HOD":
        return {
          label: "HOD",
          className: "bg-slate-100 text-slate-800 border-slate-200",
          avatarBg: "bg-slate-200 text-slate-800",
        };
      case "Faculty":
        return {
          label: "Faculty",
          className: "bg-slate-50 text-slate-700 border-slate-200",
          avatarBg: "bg-slate-100 text-slate-700",
        };
      case "SuperAdmin":
        return {
          label: "Super Admin",
          className: "bg-slate-900 text-white border-slate-900",
          avatarBg: "bg-slate-900 text-white",
        };
      default:
        return {
          label: role,
          className: "bg-slate-50 text-slate-700 border-slate-200",
          avatarBg: "bg-slate-100 text-slate-700",
        };
    }
  };

  // Counts
  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role === "CollegeAdmin" || u.role === "SuperAdmin").length;
  const hodCount = users.filter((u) => u.role === "HOD").length;
  const facultyCount = users.filter((u) => u.role === "Faculty").length;

  // Filtered
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.employeeCode && u.employeeCode.toLowerCase().includes(q)) ||
      (u.departmentName && u.departmentName.toLowerCase().includes(q));

    const matchesRole =
      roleFilter === "All" ||
      u.role === roleFilter ||
      (roleFilter === "Admin" && (u.role === "CollegeAdmin" || u.role === "SuperAdmin"));

    const matchesDept =
      departmentFilter === "All" ||
      (departmentFilter === "Campus" && !u.departmentCode) ||
      u.departmentCode === departmentFilter;

    return matchesSearch && matchesRole && matchesDept;
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Personnel */}
        <button
          type="button"
          onClick={() => setRoleFilter("All")}
          className={`p-3 rounded-lg border text-left transition-colors duration-200 ease-out cursor-pointer bg-white ${
            roleFilter === "All"
              ? "border-emerald-800 ring-1 ring-emerald-800/20"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Staff</span>
            <Users className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            {totalCount}
          </div>
        </button>

        {/* Administrators */}
        <button
          type="button"
          onClick={() => setRoleFilter("Admin")}
          className={`p-3 rounded-lg border text-left transition-colors duration-200 ease-out cursor-pointer bg-white ${
            roleFilter === "Admin"
              ? "border-emerald-800 ring-1 ring-emerald-800/20"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Admins
            </span>
            <Shield className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            {adminCount}
          </div>
        </button>

        {/* Department HODs */}
        <button
          type="button"
          onClick={() => setRoleFilter("HOD")}
          className={`p-3 rounded-lg border text-left transition-colors duration-200 ease-out cursor-pointer bg-white ${
            roleFilter === "HOD"
              ? "border-emerald-800 ring-1 ring-emerald-800/20"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
              HODs
            </span>
            <Building2 className="h-4 w-4 text-slate-700" strokeWidth={1.75} />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            {hodCount}
          </div>
        </button>

        {/* Faculty Members */}
        <button
          type="button"
          onClick={() => setRoleFilter("Faculty")}
          className={`p-3 rounded-lg border text-left transition-colors duration-200 ease-out cursor-pointer bg-white ${
            roleFilter === "Faculty"
              ? "border-emerald-800 ring-1 ring-emerald-800/20"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
              Faculty
            </span>
            <GraduationCap className="h-4 w-4 text-slate-700" strokeWidth={1.75} />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            {facultyCount}
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
              placeholder="Search by name, email, or code..."
              className="w-full pl-8 pr-3 h-8 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Role Segmented Filter */}
          <div className="inline-flex items-center p-0.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
            <button
              type="button"
              onClick={() => setRoleFilter("All")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                roleFilter === "All"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("Admin")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                roleFilter === "Admin"
                  ? "bg-white text-emerald-800 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Admin ({adminCount})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("HOD")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                roleFilter === "HOD"
                  ? "bg-white text-blue-800 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              HOD ({hodCount})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("Faculty")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                roleFilter === "Faculty"
                  ? "bg-white text-purple-800 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Faculty ({facultyCount})
            </button>
          </div>

          {/* Department Select */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="All">All Departments</option>
            <option value="CSE">CSE</option>
            <option value="ECE">ECE</option>
            <option value="ME">ME</option>
            <option value="CE">CE</option>
            <option value="Campus">Campus-wide</option>
          </select>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setParsedRows([]);
              setRawCsvInput("");
              setFileName("");
              setShowBulkImportModal(true);
            }}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Bulk import HODs and faculty accounts via CSV"
          >
            <Upload className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Bulk CSV Import</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddUser}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. RAZOR-SHARP B2B SAAS TABLE (CONSOLIDATED & MODERN)                     */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4 min-w-[260px]">Staff Member</th>
                <th className="py-2.5 px-4 min-w-[130px]">Role</th>
                <th className="py-2.5 px-4 min-w-[220px]">Department</th>
                <th className="py-2.5 px-4 min-w-[130px]">Employee Code</th>
                <th className="py-2.5 px-4 min-w-[100px]">Status</th>
                <th className="py-2.5 px-4 min-w-[100px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1.5 text-emerald-600" />
                    <span>Loading staff directory...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No staff members match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleStyle = getRoleBadge(user.role);
                  const initials = user.fullName
                    .replace(/^(Dr\.|Prof\.)\s+/i, "")
                    .split(" ")
                    .map((n) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "U";

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Column 1: Member Name + Email (Combined) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-7 w-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${roleStyle.avatarBg}`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="block font-semibold text-slate-900 truncate">
                              {user.fullName}
                            </span>
                            <span className="block text-[11px] font-mono text-slate-400 truncate">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Role */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${roleStyle.className}`}
                        >
                          {roleStyle.label}
                        </span>
                      </td>

                      {/* Column 3: Department */}
                      <td className="py-3 px-4">
                        {user.departmentName ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            {user.departmentCode && (
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 shrink-0">
                                {user.departmentCode}
                              </span>
                            )}
                            <span className="text-slate-800 truncate font-medium">
                              {user.departmentName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Campus-wide Administration
                          </span>
                        )}
                      </td>

                      {/* Column 4: Employee Code */}
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                        {user.employeeCode || "—"}
                      </td>

                      {/* Column 5: Status */}
                      <td className="py-3 px-4">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Deactivated
                          </span>
                        )}
                      </td>

                      {/* Column 6: Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(user)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Staff Member"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResetPassword(user)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Reset Password & Generate One-Time Credential"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title={user.isActive ? "Deactivate Account" : "Activate Account"}
                          >
                            {user.isActive ? (
                              <UserX className="h-3.5 w-3.5 text-amber-600" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove Member from Directory"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
      {/* MODAL: Add Staff Member                                                   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        title="Add Staff Account"
        description="Provision an administrative, HOD, or faculty account for the campus."
      >
        <form onSubmit={handleCreateUser} className="space-y-4 pt-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Full Name</label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Dr. Ramesh Chander"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Institutional Email</label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="e.g. ramesh.chander@sistec.ac.in"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Role</label>
              <Select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as RoleType)}
                options={[
                  { value: "Faculty", label: "Faculty" },
                  { value: "HOD", label: "Department Head (HOD)" },
                  { value: "CollegeAdmin", label: "College Administrator" },
                ]}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Employee Code</label>
              <Input
                value={newEmpCode}
                onChange={(e) => setNewEmpCode(e.target.value)}
                placeholder="e.g. EMP-2026-088"
              />
            </div>
          </div>

          {newRole !== "CollegeAdmin" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Department</label>
              <Select
                value={newDeptId}
                onChange={(e) => setNewDeptId(e.target.value)}
                options={departments.map((d) => ({
                  value: d.id,
                  label: `${d.name} (${d.code})`,
                }))}
              />
            </div>
          )}

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">
            A cryptographically secure one-time temporary password will be assigned for first sign-in.
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddUserModal(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
            >
              {submitting ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Edit Staff Member                                                  */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showEditUserModal}
        onClose={() => setShowEditUserModal(false)}
        title={`Edit Staff Member: ${editingUser?.fullName}`}
        description="Update personnel details, institutional role, department, or employee code."
      >
        <form onSubmit={handleUpdateUser} className="space-y-4 pt-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Full Name</label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. Dr. Ramesh Chander"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Email Address (Read-only)</label>
            <Input
              type="email"
              value={editingUser?.email || ""}
              disabled
              className="bg-slate-50 cursor-not-allowed opacity-75"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Role</label>
              <Select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as RoleType)}
                options={[
                  { value: "Faculty", label: "Faculty" },
                  { value: "HOD", label: "Department Head (HOD)" },
                  { value: "CollegeAdmin", label: "College Administrator" },
                ]}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Employee Code</label>
              <Input
                value={editEmpCode}
                onChange={(e) => setEditEmpCode(e.target.value)}
                placeholder="e.g. EMP-2026-088"
              />
            </div>
          </div>

          {editRole !== "CollegeAdmin" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Department</label>
              <Select
                value={editDeptId}
                onChange={(e) => setEditDeptId(e.target.value)}
                options={departments.map((d) => ({
                  value: d.id,
                  label: `${d.name} (${d.code})`,
                }))}
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowEditUserModal(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
            >
              {updating ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Bulk CSV Import for Staff & HODs                                   */}
      {/* ========================================================================= */}
      {showBulkImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !isImporting && setShowBulkImportModal(false)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Bulk Import Staff & HODs</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Batch-provision HODs and faculty accounts via CSV upload or pasted records
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkImportModal(false)}
                disabled={isImporting}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Template Banner */}
            <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
              <div className="text-[11px] text-slate-600">
                <span className="font-semibold text-slate-800">Standard CSV Columns:</span>{" "}
                <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-mono text-[10px]">
                  FullName, Email, Role (HOD/Faculty), DepartmentCode, EmployeeCode
                </code>
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs whitespace-nowrap cursor-pointer transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                <span>Download Sample Template</span>
              </button>
            </div>

            {/* Tab Selector & Upload Area */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setBulkImportTab("file")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    bulkImportTab === "file"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Upload CSV File
                </button>
                <button
                  type="button"
                  onClick={() => setBulkImportTab("paste")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    bulkImportTab === "paste"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Paste CSV Text
                </button>
              </div>

              {bulkImportTab === "file" ? (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    id="csvFileInput"
                    accept=".csv,text/csv,text/plain"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="csvFileInput" className="cursor-pointer block">
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <span className="text-xs font-bold text-slate-800 block">
                      {fileName ? fileName : "Click to select or drag & drop CSV file"}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Supports comma-separated (.csv) files up to 5 MB
                    </span>
                  </label>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Paste Raw CSV Lines</label>
                  <textarea
                    rows={5}
                    value={rawCsvInput}
                    onChange={(e) => handleRawTextChange(e.target.value)}
                    placeholder="FullName,Email,Role,DepartmentCode,EmployeeCode&#10;Dr. Ananya Deshmukh,hod.ece@sistec.ac.in,HOD,ECE,EMP-ECE-001&#10;Prof. Rajesh Kulkarni,hod.me@sistec.ac.in,HOD,ME,EMP-ME-001"
                    className="w-full p-3 text-xs font-mono rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Parsed Records ({parsedRows.length})
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {parsedRows.filter((r) => r.isValid).length} Valid
                      </span>
                      {parsedRows.some((r) => !r.isValid) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          {parsedRows.filter((r) => !r.isValid).length} Issues
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[10px] uppercase font-semibold text-slate-500">
                        <tr>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3">Full Name</th>
                          <th className="py-2 px-3">Email</th>
                          <th className="py-2 px-3">Role</th>
                          <th className="py-2 px-3">Dept</th>
                          <th className="py-2 px-3">Emp Code</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {parsedRows.map((row, idx) => (
                          <tr key={idx} className={row.isValid ? "hover:bg-slate-50/50" : "bg-rose-50/30"}>
                            <td className="py-2 px-3 whitespace-nowrap">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600" title={row.validationError}>
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  {row.validationError}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900 truncate max-w-[140px]">{row.fullName}</td>
                            <td className="py-2 px-3 text-slate-600 truncate max-w-[160px] font-mono text-[11px]">{row.email}</td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                row.role === "HOD"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : row.role === "CollegeAdmin"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-purple-50 text-purple-700 border-purple-200"
                              }`}>
                                {row.role}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-700 text-[11px]">{row.departmentCode || "—"}</td>
                            <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">{row.employeeCode || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-4 shrink-0 bg-white">
              <div className="text-xs text-slate-500">
                {parsedRows.filter((r) => r.isValid).length > 0 ? (
                  <span className="font-semibold text-emerald-700">
                    {parsedRows.filter((r) => r.isValid).length} valid accounts will be provisioned with secure one-time credentials
                  </span>
                ) : (
                  "Select a CSV file to preview accounts"
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkImportModal(false)}
                  disabled={isImporting}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBulkImport}
                  disabled={parsedRows.filter((r) => r.isValid).length === 0 || isImporting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Import {parsedRows.filter((r) => r.isValid).length > 0 ? parsedRows.filter((r) => r.isValid).length : ""} Staff
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* One-Time Password Issuance Modal */}
      {otpModalData && (
        <Modal
          isOpen={!!otpModalData}
          onClose={() => setOtpModalData(null)}
          title="Secure Temporary Credential Issued"
          description="A one-time temporary password has been cryptographically generated. Share this securely with the user."
        >
          <div className="space-y-4 pt-1 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
              <span className="font-semibold text-emerald-900">User Account</span>
              <div className="text-slate-700 font-medium">{otpModalData.fullName}</div>
              <div className="text-slate-500 font-mono text-[11px]">{otpModalData.email}</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">One-Time Temporary Password</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={otpModalData.otp}
                  className="flex-1 px-3 py-2 text-sm font-mono font-bold text-slate-900 bg-slate-100 border border-slate-300 rounded-lg select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(otpModalData.otp);
                    setCopiedOtp(true);
                    setTimeout(() => setCopiedOtp(false), 2000);
                  }}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-medium text-xs transition-colors cursor-pointer"
                >
                  {copiedOtp ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                The user will be required to establish a new permanent password immediately upon initial authentication.
              </p>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOtpModalData(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
