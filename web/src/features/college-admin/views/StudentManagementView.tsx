"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Search,
  Loader2,
  Upload,
  Download,
  History,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { PageHeader } from "@/design-system/patterns/PageHeader";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { ConfirmationDialog, PageLoadingState } from "@/design-system/patterns/PageStates";
import { TablePagination } from "@/design-system/patterns/TablePagination";
import { showToast } from "@/lib/toast";
import { Modal } from "@/design-system/components/Modal";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { collegeApi } from "@/lib/api/collegeApi";
import {
  CollegeStaffDto,
  CourseProgramDto,
  DepartmentDto,
  RoleType,
  RosterImportPreviewDto,
  RosterImportHistoryDto,
} from "@/lib/api/types";
import { ApiConnectionBanner } from "../components/ApiConnectionBanner";
import {
  generateStudentCsvTemplate,
  parseStudentCsv,
  ParsedStudentRow,
  STUDENT_CSV_HEADERS,
} from "./studentCsvHelpers";

type StudentRow = CollegeStaffDto & {
  status: "Active" | "Pending" | "Inactive";
  enrollmentOrEmployeeCode?: string;
  admissionYear?: string;
  currentSemesterTerm?: number;
  programName?: string;
};

export const StudentManagementView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [programs, setPrograms] = useState<CourseProgramDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add Student Modal State
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentNumber, setNewStudentNumber] = useState("");
  const [newDeptId, setNewDeptId] = useState("");
  const [newAdmissionYear, setNewAdmissionYear] = useState("");
  const [newSemester, setNewSemester] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  // Edit Student Modal State
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStudentNumber, setEditStudentNumber] = useState("");
  const [editDeptId, setEditDeptId] = useState("");
  const [editAdmissionYear, setEditAdmissionYear] = useState("");
  const [editSemester, setEditSemester] = useState("1");
  const [updating, setUpdating] = useState(false);

  // Delete & Status Toggle Confirmation State
  const [studentToDelete, setStudentToDelete] = useState<StudentRow | null>(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);
  const [studentToToggleStatus, setStudentToToggleStatus] = useState<StudentRow | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

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

  // Roster Import History Modal State
  const [showImportHistoryModal, setShowImportHistoryModal] = useState(false);
  const [importHistory, setImportHistory] = useState<RosterImportHistoryDto[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useDashboardHeader({
    title: "Students & Enrollment",
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setApiError(null);
      const [studentRes, deptRes, progRes, historyRes] = await Promise.all([
        collegeApi.getStudents(),
        collegeApi.getDepartments(),
        collegeApi.getCoursePrograms(),
        collegeApi.getRosterImportHistory().catch(() => [] as RosterImportHistoryDto[]),
      ]);

      setStudents(
        (studentRes || []).map((s) => ({
          ...s,
          status: s.isActive ? (s.isActivated ? "Active" : "Pending") : "Inactive",
        }))
      );
      setDepartments(deptRes || []);
      setPrograms(progRes || []);
      setImportHistory(historyRes || []);
    } catch (err: unknown) {
      setApiError(
        err instanceof Error
          ? err.message
          : "Failed to connect to backend service. Student directory unavailable."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      collegeApi.getStudents(),
      collegeApi.getDepartments(),
      collegeApi.getCoursePrograms(),
      collegeApi.getRosterImportHistory().catch(() => [] as RosterImportHistoryDto[]),
    ])
      .then(([studentRes, deptRes, progRes, historyRes]) => {
        if (!active) return;
        setStudents(
          (studentRes || []).map((s) => ({
            ...s,
            status: s.isActive ? (s.isActivated ? "Active" : "Pending") : "Inactive",
          }))
        );
        setDepartments(deptRes || []);
        setPrograms(progRes || []);
        setImportHistory(historyRes || []);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setApiError(
          err instanceof Error
            ? err.message
            : "Failed to connect to backend service. Student directory unavailable."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleOpenImportHistory = async () => {
    setShowImportHistoryModal(true);
    setLoadingHistory(true);
    try {
      const history = await collegeApi.getRosterImportHistory();
      setImportHistory(history || []);
    } catch {
      // Keep existing list if refresh fails
    } finally {
      setLoadingHistory(false);
    }
  };

  // Filtered List
  const filteredStudents = useMemo(() => {
    return students.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.employeeCode && u.employeeCode.toLowerCase().includes(q)) ||
        (u.enrollmentOrEmployeeCode && u.enrollmentOrEmployeeCode.toLowerCase().includes(q)) ||
        (u.departmentName && u.departmentName.toLowerCase().includes(q));

      const matchesDept = departmentFilter === "All" || u.departmentId === departmentFilter;
      const matchesStatus = statusFilter === "All" || u.status === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [students, searchQuery, departmentFilter, statusFilter]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const handleOpenAddStudent = () => {
    setNewStudentName("");
    setNewStudentEmail("");
    setNewStudentNumber("");
    setNewDeptId(departments[0]?.id || "");
    setNewAdmissionYear("");
    setNewSemester("1");
    setShowAddStudentModal(true);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentEmail.trim() || !newStudentNumber.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        fullName: newStudentName.trim(),
        email: newStudentEmail.trim().toLowerCase(),
        role: "Student" as RoleType,
        enrollmentOrEmployeeCode: newStudentNumber.trim(),
        departmentId: newDeptId || undefined,
        admissionYear: newAdmissionYear.trim() || undefined,
        currentSemester: Number.parseInt(newSemester, 10) || undefined,
      };

      await collegeApi.createStaffUser(payload);
      showToast(
        `Student ${newStudentName} provisioned. Account activation dispatched to ${newStudentEmail}.`,
        "success"
      );
      setShowAddStudentModal(false);
      void loadData();
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Error provisioning student account.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditStudent = (student: StudentRow) => {
    setEditingStudent(student);
    setEditName(student.fullName);
    setEditEmail(student.email);
    setEditStudentNumber(student.enrollmentOrEmployeeCode || "");
    setEditDeptId(student.departmentId?.toString() || "");
    setEditAdmissionYear(student.admissionYear || "");
    setEditSemester(student.currentSemesterTerm?.toString() || "1");
    setShowEditStudentModal(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editName.trim()) return;
    setUpdating(true);
    try {
      const payload = {
        fullName: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        role: "Student" as RoleType,
        enrollmentOrEmployeeCode: editStudentNumber.trim(),
        departmentId: editDeptId || undefined,
        admissionYear: editAdmissionYear.trim() || undefined,
        currentSemester: parseInt(editSemester, 10) || undefined,
      };

      await collegeApi.updateStaffUser(editingStudent.id, payload);
      showToast(`Updated account details for ${editName}.`, "success");
      setShowEditStudentModal(false);
      void loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error updating account.", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteStudent = (student: StudentRow) => {
    setStudentToDelete(student);
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    const targetStudent = studentToDelete;
    setIsDeletingStudent(true);
    try {
      await collegeApi.deleteStaffUser(targetStudent.id);
      setStudentToDelete(null);
      showToast(`Deleted ${targetStudent.fullName} from directory.`, "success");
      await loadData();
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Error deleting student account.",
        "error"
      );
    } finally {
      setIsDeletingStudent(false);
    }
  };

  const confirmToggleStudentStatus = async () => {
    if (!studentToToggleStatus) return;
    const target = studentToToggleStatus;
    const nextIsActive = !target.isActive;
    setIsTogglingStatus(true);
    try {
      await collegeApi.updateUserStatus(target.id, { isActive: nextIsActive });
      setStudentToToggleStatus(null);
      showToast(
        `Account for ${target.fullName} is now ${nextIsActive ? "Active" : "Deactivated"}.`,
        "success"
      );
      await loadData();
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Error updating student account status.",
        "error"
      );
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Counts
  const studentCount = students.length;
  const activatedCount = students.filter((u) => u.status === "Active").length;
  const studentImportsCount = importHistory.length;

  return (
    <div className="space-y-6 pb-12 font-sans">
      <PageHeader
        title="Students & Enrollment"
        description="Manage institutional student accounts, enrollment numbers, and bulk Students.csv roster imports."
        actions={
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleOpenImportHistory}
              leftIcon={<History className="h-3.5 w-3.5" />}
            >
              Import History
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowStudentCsvModal(true)}
              leftIcon={<Upload className="h-3.5 w-3.5" />}
            >
              Import Students.csv
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleOpenAddStudent}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Add Student
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
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</span>
          <span className="block text-2xl font-bold text-slate-900 font-mono mt-1">
            {studentCount}
          </span>
          <span className="text-[11px] text-slate-500">Students in institutional roster</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Activated Accounts</span>
          <span className="block text-2xl font-bold text-emerald-800 font-mono mt-1">
            {activatedCount}
          </span>
          <span className="text-[11px] text-emerald-700 font-medium">
            {studentCount - activatedCount} pending or inactive
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Import History</span>
          <span className="block text-2xl font-bold text-slate-700 font-mono mt-1">
            {studentImportsCount}
          </span>
          <span className="text-[11px] text-slate-500">Recorded roster imports</span>
        </div>
      </div>

      {/* Main Directory Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                aria-label="Search students by name, email, or ID"
                placeholder="Search students by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <select
              aria-label="Filter by department"
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>

            <select
              aria-label="Filter by account status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending Activation</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Table Body */}
        {loading ? (
          <PageLoadingState message="Loading student directory..." className="border-0 rounded-none" />
        ) : filteredStudents.length === 0 ? (
          <EmptyState
            title="No students found"
            description={
              students.length === 0
                ? "Add students individually or import an approved Students.csv roster."
                : "No students match your current search or filter criteria."
            }
            className="border-0 rounded-none"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Student Number</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Program</th>
                    <th className="p-3">Admission Year</th>
                    <th className="p-3">Current Semester</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedStudents.map((u) => {
                    const deptDisplay = u.departmentName || "—";

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors align-top">
                        <td className="p-3 min-w-[200px] max-w-[280px]">
                          <div className="font-bold text-slate-900 break-words">{u.fullName}</div>
                          <div className="text-[11px] text-slate-500 break-all">{u.email}</div>
                        </td>
                        <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                          {u.employeeCode || u.enrollmentOrEmployeeCode || "—"}
                        </td>
                        <td className="p-3">{u.email || "—"}</td>
                        <td className="p-3 min-w-[140px]">
                          <div>
                            <div className="font-medium text-slate-900">{deptDisplay}</div>
                            {u.departmentCode && (
                              <div className="text-[10px] text-slate-400 font-mono">{u.departmentCode}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">{u.programName || "—"}</td>
                        <td className="p-3">{u.admissionYear || "—"}</td>
                        <td className="p-3">{u.currentSemesterTerm || "—"}</td>
                        <td className="p-3 text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-x-3 gap-y-1 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenEditStudent(u)}
                              className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setStudentToToggleStatus(u)}
                              className={`text-[11px] font-semibold cursor-pointer ${
                                u.isActive
                                  ? "text-amber-700 hover:text-amber-900"
                                  : "text-emerald-700 hover:text-emerald-900"
                              }`}
                            >
                              {u.isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(u)}
                              className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
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
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredStudents.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      {/* Add Student Modal */}
      <Modal
        isOpen={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        title="Add Student"
        description="Provision an institutional student account with StudentNumber, Department, and AdmissionYear."
        size="md"
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Student Full Name"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            required
          />
          <Input
            label="Official Email Address"
            type="email"
            placeholder="student@college.ac.in"
            value={newStudentEmail}
            onChange={(e) => setNewStudentEmail(e.target.value)}
            required
          />
          <Input
            label="Student Number / Roll Number"
            placeholder="0176CS231001"
            value={newStudentNumber}
            onChange={(e) => setNewStudentNumber(e.target.value)}
            required
          />
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

          <Input
            label="Admission Year"
            placeholder="2023"
            value={newAdmissionYear}
            onChange={(e) => setNewAdmissionYear(e.target.value)}
            required
          />

          <Select
            label="Current Semester"
            value={newSemester}
            onChange={(e) => setNewSemester(e.target.value)}
            options={[
              { label: "1", value: "1" },
              { label: "2", value: "2" },
              { label: "3", value: "3" },
              { label: "4", value: "4" },
              { label: "5", value: "5" },
              { label: "6", value: "6" },
              { label: "7", value: "7" },
              { label: "8", value: "8" },
              { label: "9", value: "9" },
              { label: "10", value: "10" },
              { label: "11", value: "11" },
              { label: "12", value: "12" },
            ]}
          />

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
            Plaintext passwords are never generated or shown. An invitation link will be dispatched to the official email for secure user-directed setup.
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddStudentModal(false)}
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

      {/* Edit Student Modal */}
      <Modal
        isOpen={showEditStudentModal}
        onClose={() => setShowEditStudentModal(false)}
        title="Edit Student Account"
        description="Update student profile and enrollment information."
        size="md"
      >
        <form onSubmit={handleUpdateStudent} className="space-y-4">
          <Input
            label="Full Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />
          <Input
            label="Official Email Address"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            required
          />
          <Input
            label="Student Number / Roll Number"
            value={editStudentNumber}
            onChange={(e) => setEditStudentNumber(e.target.value)}
          />

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

          <Input
            label="Admission Year"
            value={editAdmissionYear}
            onChange={(e) => setEditAdmissionYear(e.target.value)}
          />

          <Select
            label="Current Semester"
            value={editSemester}
            onChange={(e) => setEditSemester(e.target.value)}
            options={[
              { label: "1", value: "1" },
              { label: "2", value: "2" },
              { label: "3", value: "3" },
              { label: "4", value: "4" },
              { label: "5", value: "5" },
              { label: "6", value: "6" },
              { label: "7", value: "7" },
              { label: "8", value: "8" },
              { label: "9", value: "9" },
              { label: "10", value: "10" },
              { label: "11", value: "11" },
              { label: "12", value: "12" },
            ]}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowEditStudentModal(false)}
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

      {/* Bulk CSV Import Modal */}
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
                } catch (err: unknown) {
                  setStudentCsvError(err instanceof Error ? err.message : "Failed to verify student roster on server.");
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
                  showToast(
                    `Students.csv imported: ${res.successfullyCreated} created, ${res.successfullyUpdated} updated.`,
                    "success"
                  );
                } catch (err: unknown) {
                  const errObj = err as { data?: { errors?: string[] }; message?: string };
                  const errs = errObj?.data?.errors;
                  setStudentCsvError(
                    errs && errs.length > 0
                      ? errs.join(" ")
                      : err instanceof Error
                        ? err.message
                        : "Student roster import failed."
                  );
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
            <EmptyState
              title="No roster imports recorded"
              description="No Faculty.csv or Students.csv roster imports have been recorded yet."
              className="border-0 py-6"
            />
          ) : (
            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-200 text-xs">
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

      <ConfirmationDialog
        isOpen={Boolean(studentToToggleStatus)}
        onClose={() => setStudentToToggleStatus(null)}
        onConfirm={confirmToggleStudentStatus}
        title={
          studentToToggleStatus?.isActive
            ? "Deactivate Student Account"
            : "Activate Student Account"
        }
        description={
          studentToToggleStatus?.isActive
            ? `Deactivate ${studentToToggleStatus.fullName} (${studentToToggleStatus.enrollmentOrEmployeeCode || studentToToggleStatus.email})? They will not be able to sign in until reactivated.`
            : `Reactivate ${studentToToggleStatus?.fullName || "this student"} (${studentToToggleStatus?.enrollmentOrEmployeeCode || studentToToggleStatus?.email || ""})? They will regain access to their student account.`
        }
        confirmText={studentToToggleStatus?.isActive ? "Deactivate" : "Activate"}
        variant={studentToToggleStatus?.isActive ? "warning" : "primary"}
        isLoading={isTogglingStatus}
      />

      <ConfirmationDialog
        isOpen={Boolean(studentToDelete)}
        onClose={() => setStudentToDelete(null)}
        onConfirm={confirmDeleteStudent}
        title="Delete Student Account"
        description={`Are you sure you want to permanently delete ${studentToDelete?.fullName || "this student"} (${studentToDelete?.enrollmentOrEmployeeCode || studentToDelete?.email || ""}) from the institutional student directory?`}
        confirmText="Delete Student"
        variant="danger"
        isLoading={isDeletingStudent}
      />
    </div>
  );
};