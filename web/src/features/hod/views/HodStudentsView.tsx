"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  GraduationCap,
  Users,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Edit3,
  X,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Card, CardContent } from "@/design-system/components/Card";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { hodApi } from "@/lib/api/hodApi";
import { HodAcademicContextDto, HodDepartmentStudentDto } from "@/lib/api/types";

export const HodStudentsView: React.FC = () => {
  useDashboardHeader({
    title: "Department Students & Enrollment",
    breadcrumb: "HOD Console • Students",
  });

  const [students, setStudents] = useState<HodDepartmentStudentDto[]>([]);
  const [context, setContext] = useState<HodAcademicContextDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [semesterFilter, setSemesterFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingStudent, setEditingStudent] = useState<HodDepartmentStudentDto | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [targetSemester, setTargetSemester] = useState<number>(1);
  const [targetStatus, setTargetStatus] = useState<"Active" | "Promoted" | "Detained" | "Graduated" | "Withdrawn">("Active");
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [studentsData, ctxData] = await Promise.all([
        hodApi.getStudents(),
        hodApi.getAcademicContext().catch(() => null),
      ]);
      setStudents(studentsData);
      setContext(ctxData);
    } catch (err: any) {
      setError(err?.message || "Failed to load department students.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const semesterOptions = useMemo(() => {
    const nums = context?.availableSemesters?.map((s) => s.semesterNumber) ?? [1, 2, 3, 4, 5, 6, 7, 8];
    return Array.from(new Set(nums)).sort((a, b) => a - b);
  }, [context]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const match =
          s.fullName.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.studentNumber.toLowerCase().includes(q) ||
          (s.activeTeamTitle?.toLowerCase().includes(q) ?? false);
        if (!match) return false;
      }
      if (semesterFilter !== "ALL") {
        if (semesterFilter === "UNENROLLED") {
          if (s.currentSemesterNumber != null) return false;
        } else if (String(s.currentSemesterNumber) !== semesterFilter) {
          return false;
        }
      }
      if (statusFilter !== "ALL" && s.academicStatus !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [students, searchQuery, semesterFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => s.academicStatus === "Active").length;
    const notEnrolled = students.filter((s) => s.academicStatus === "Not Enrolled").length;
    const inTeams = students.filter((s) => Boolean(s.activeTeamCode)).length;
    return { total, active, notEnrolled, inTeams };
  }, [students]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openSingleEnroll = (student: HodDepartmentStudentDto) => {
    setEditingStudent(student);
    setTargetSemester(student.currentSemesterNumber ?? 1);
    setTargetStatus(
      student.academicStatus === "Detained" ||
        student.academicStatus === "Graduated" ||
        student.academicStatus === "Promoted" ||
        student.academicStatus === "Withdrawn"
        ? student.academicStatus
        : "Active"
    );
  };

  const handleSaveSingle = async () => {
    if (!editingStudent) return;
    try {
      setSaving(true);
      await hodApi.updateStudentEnrollment(editingStudent.id, {
        semesterNumber: targetSemester,
        academicStatus: targetStatus,
      });
      showToast(`Updated ${editingStudent.fullName} to Semester ${targetSemester} (${targetStatus}).`);
      setEditingStudent(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to update student enrollment.");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkEnroll = async () => {
    if (selectedIds.size === 0) return;
    try {
      setSaving(true);
      const res = await hodApi.bulkEnrollStudents({
        studentIds: Array.from(selectedIds),
        semesterNumber: targetSemester,
        academicStatus: "Active",
      });
      showToast(`Enrolled ${res.updatedCount} student(s) into ${res.semesterName}.`);
      setBulkModalOpen(false);
      setSelectedIds(new Set());
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to bulk enroll students.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Department Students &amp; Semester Enrollment
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View students in{" "}
            <span className="font-semibold text-slate-700">
              {context?.departmentName || "your department"}
            </span>{" "}
            and assign active semester enrollments so they can access open project tracks.
          </p>
        </div>

        {selectedIds.size > 0 && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<UserCheck className="h-4 w-4" />}
            onClick={() => {
              setTargetSemester(1);
              setBulkModalOpen(true);
            }}
          >
            Enroll {selectedIds.size} Selected to Semester
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] font-medium text-slate-500">Total Department Students</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] font-medium text-slate-500">Active Semester Enrolled</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] font-medium text-slate-500">Not Enrolled (Pending)</div>
            <div className={`text-2xl font-bold mt-1 ${stats.notEnrolled > 0 ? "text-amber-600" : "text-slate-900"}`}>
              {stats.notEnrolled}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] font-medium text-slate-500">Assigned to Project Teams</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.inTeams}</div>
          </CardContent>
        </Card>
      </div>

      {stats.notEnrolled > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">
              {stats.notEnrolled} student(s) currently have no active semester enrollment.
            </span>{" "}
            Students marked &ldquo;Not Enrolled&rdquo; cannot see open department project tracks until you assign their current semester below.
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name, USN, email, or project..."
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
            >
              <option value="ALL">All Semesters</option>
              <option value="UNENROLLED">Not Enrolled</option>
              {semesterOptions.map((n) => (
                <option key={n} value={String(n)}>
                  Semester {n}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Not Enrolled">Not Enrolled</option>
              <option value="Promoted">Promoted</option>
              <option value="Detained">Detained</option>
            </select>
          </div>

          {loading ? (
            <div className="py-10 text-center text-xs text-slate-500">Loading students...</div>
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              icon={<Users className="h-7 w-7 text-slate-400" />}
              title="No matching students"
              description="No students in your department match the current filters."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredStudents.length && filteredStudents.length > 0}
                        onChange={toggleSelectAll}
                        aria-label="Select all students"
                      />
                    </th>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">USN / Roll No.</th>
                    <th className="py-2.5 px-3">Semester &amp; Status</th>
                    <th className="py-2.5 px-3">Active Project</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(student.id)}
                          onChange={() => toggleSelect(student.id)}
                          aria-label={`Select ${student.fullName}`}
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{student.fullName}</div>
                        <div className="text-[11px] text-slate-500">{student.email}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                        {student.studentNumber || "—"}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant={
                              student.academicStatus === "Active"
                                ? "success"
                                : student.academicStatus === "Not Enrolled"
                                ? "warning"
                                : "neutral"
                            }
                            size="sm"
                          >
                            {student.academicStatus}
                          </Badge>
                          {student.currentSemesterNumber ? (
                            <span className="text-[11px] font-medium text-slate-700">
                              Sem {student.currentSemesterNumber}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {student.activeTeamTitle ? (
                          <div>
                            <div className="font-medium text-slate-800">{student.activeTeamTitle}</div>
                            <div className="text-[11px] text-slate-500">{student.activeTeamCode}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">Unallocated</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                          onClick={() => openSingleEnroll(student)}
                        >
                          {student.academicStatus === "Not Enrolled" ? "Enroll" : "Edit Semester"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {(editingStudent || bulkModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-emerald-700" />
                <h2 className="text-sm font-bold text-slate-900">
                  {bulkModalOpen
                    ? `Enroll ${selectedIds.size} Selected Student(s)`
                    : `Semester Enrollment — ${editingStudent?.fullName}`}
                </h2>
              </div>
              <button
                onClick={() => {
                  setEditingStudent(null);
                  setBulkModalOpen(false);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Semester
                </label>
                <select
                  value={targetSemester}
                  onChange={(e) => setTargetSemester(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                >
                  {semesterOptions.map((n) => (
                    <option key={n} value={n}>
                      Semester {n}
                    </option>
                  ))}
                </select>
              </div>

              {!bulkModalOpen && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Status
                  </label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value as typeof targetStatus)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  >
                    <option value="Active">Active</option>
                    <option value="Promoted">Promoted</option>
                    <option value="Detained">Detained</option>
                    <option value="Graduated">Graduated</option>
                    <option value="Withdrawn">Withdrawn</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingStudent(null);
                  setBulkModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={saving}
                onClick={bulkModalOpen ? handleBulkEnroll : handleSaveSingle}
              >
                {saving ? "Saving..." : bulkModalOpen ? "Confirm Bulk Enroll" : "Save Enrollment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
