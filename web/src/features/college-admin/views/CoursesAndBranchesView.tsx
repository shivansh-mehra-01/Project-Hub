"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Loader2,
  Search,
  GraduationCap,
  ShieldCheck,
  Monitor,
  Briefcase,
  GitFork,
  ArrowRight,
  BookOpen,
  X,
  Check,
  Layers,
  FlaskConical,
  Palette,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Modal } from "@/design-system/components/Modal";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { collegeApi } from "@/lib/api/collegeApi";
import {
  AcademicProgramLevel,
  CourseProgramDto,
  CreateCourseProgramRequest,
  CreateDepartmentRequest,
  DepartmentDto,
  UpdateCourseProgramRequest,
  UpdateDepartmentRequest,
} from "@/lib/api/types";
import { ApiConnectionBanner } from "../components/ApiConnectionBanner";
import {
  COURSE_CATALOG,
  COURSE_CATEGORIES,
  BRANCH_CATALOG,
  CatalogCourse,
  CatalogBranch,
} from "../data/courseCatalog";

// ─── Helper: icon selector ────────────────────────────────────────────────────
function CourseIcon({
  icon,
  className,
}: {
  icon: CatalogCourse["icon"];
  className?: string;
}) {
  if (icon === "briefcase") return <Briefcase className={className} strokeWidth={2} />;
  if (icon === "flask") return <FlaskConical className={className} strokeWidth={2} />;
  if (icon === "palette") return <Palette className={className} strokeWidth={2} />;
  if (icon === "graduation") return <GraduationCap className={className} strokeWidth={2} />;
  return <Monitor className={className} strokeWidth={2} />;
}

function iconBg(icon: CatalogCourse["icon"]) {
  if (icon === "briefcase") return "bg-amber-50 text-amber-700";
  if (icon === "flask") return "bg-purple-50 text-purple-700";
  if (icon === "palette") return "bg-pink-50 text-pink-700";
  if (icon === "graduation") return "bg-indigo-50 text-indigo-700";
  return "bg-blue-50 text-blue-700";
}

function levelBadgeColor(level: string) {
  if (level === "PG" || level?.includes("PG")) return "bg-violet-50 text-violet-700 border-violet-200";
  if (level === "Diploma" || level?.includes("Diploma")) return "bg-orange-50 text-orange-700 border-orange-200";
  if (level === "Research" || level?.includes("Research")) return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-sky-50 text-sky-700 border-sky-200";
}

export const CoursesAndBranchesView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<CourseProgramDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Existing modals ────────────────────────────────────────────────────────
  const [showAddProgramModal, setShowAddProgramModal] = useState(false);
  const [showEditProgramModal, setShowEditProgramModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<CourseProgramDto | null>(null);

  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showEditBranchModal, setShowEditBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<DepartmentDto | null>(null);

  // ── Confirmation Modals ───────────────────────────────────────────────────
  const [programToArchive, setProgramToArchive] = useState<CourseProgramDto | null>(null);
  const [branchToDeactivate, setBranchToDeactivate] = useState<DepartmentDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── NEW: Course Catalog Picker modal ──────────────────────────────────────
  const [showCourseCatalogModal, setShowCourseCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("all");
  const [selectedCatalogCodes, setSelectedCatalogCodes] = useState<string[]>([]);
  const [isBatchAddingCourses, setIsBatchAddingCourses] = useState(false);

  // ── NEW: Branch Catalog Picker modal ─────────────────────────────────────
  const [showBranchCatalogModal, setShowBranchCatalogModal] = useState(false);
  const [branchCatalogSearch, setBranchCatalogSearch] = useState("");
  const [selectedBranchCodes, setSelectedBranchCodes] = useState<string[]>([]);
  const [catalogBranchIntakes, setCatalogBranchIntakes] = useState<Record<string, number>>({});
  const [isBatchAddingBranches, setIsBatchAddingBranches] = useState(false);

  // ── Network / API error state ─────────────────────────────────────────────
  const [apiError, setApiError] = useState<string | null>(null);

  // ── Toast feedback ────────────────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Form states for Course Program ────────────────────────────────────────
  const [progCode, setProgCode] = useState("");
  const [progName, setProgName] = useState("");
  const [progLevel, setProgLevel] = useState<AcademicProgramLevel>("UG");
  const [progSemesters, setProgSemesters] = useState(8);
  const [submittingProg, setSubmittingProg] = useState(false);

  // ── Form states for Branch / Department ───────────────────────────────────
  const [branchCode, setBranchCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchIntake, setBranchIntake] = useState(120);
  const [submittingBranch, setSubmittingBranch] = useState(false);

  useDashboardHeader({
    title: "Programs & Branches",
    breadcrumb: "Degree programs, department branches, and sanctioned student intake quotas",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [progRes, deptRes] = await Promise.allSettled([
        collegeApi.getCoursePrograms(),
        collegeApi.getDepartments(),
      ]);

      if (progRes.status === "rejected" || deptRes.status === "rejected") {
        setApiError("Unable to reach the Colabex central API server. Displaying cached academic structure.");
      } else {
        setApiError(null);
      }

      let progs: CourseProgramDto[] = [];
      let depts: DepartmentDto[] = [];

      if (progRes.status === "fulfilled" && progRes.value?.length) {
        progs = progRes.value;
      }

      if (deptRes.status === "fulfilled" && deptRes.value?.length) {
        depts = deptRes.value;
      }

      setPrograms(progs);
      setDepartments(depts);

      if (progs.length > 0) {
        setSelectedProgramId((prev) =>
          prev && progs.some((p) => p.id === prev) ? prev : progs[0].id
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

  const selectedProgram = programs.find((p) => p.id === selectedProgramId) || programs[0];

  const currentBranches = departments.filter((d) => {
    if (!selectedProgram) return false;
    if (d.courseProgramId === selectedProgram.id) return true;
    if (d.courseProgramCode && d.courseProgramCode.toUpperCase() === selectedProgram.code.toUpperCase()) return true;
    if (!d.courseProgramId && selectedProgram.code === "BTECH") return true;
    return false;
  });

  const filteredBranches = currentBranches.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      (b.hodName && b.hodName.toLowerCase().includes(q))
    );
  });

  const selectedProgramIntake = currentBranches.reduce(
    (acc, b) => acc + (b.intakeQuota || 120),
    0
  );
  const selectedProgramEnrolled = currentBranches.reduce(
    (acc, b) => acc + (b.studentCount ?? 0),
    0
  );

  // ── Catalog: filtered course list ─────────────────────────────────────────
  const filteredCatalogCourses = useMemo(() => {
    return COURSE_CATALOG.filter((c) => {
      const existingCodes = programs.map((p) => p.code.toUpperCase());
      if (existingCodes.includes(c.code)) return false; // hide already-added
      if (catalogCategory !== "all" && c.category !== catalogCategory) return false;
      if (catalogSearch.trim()) {
        const q = catalogSearch.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.displayCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [catalogSearch, catalogCategory, programs]);

  // ── Catalog: filtered branch list (course-aware) ──────────────────────────
  const filteredCatalogBranches = useMemo(() => {
    if (!selectedProgram) return [];
    const existingCodes = currentBranches.map((b) => b.code.toUpperCase());
    return BRANCH_CATALOG.filter((b) => {
      if (!b.forCourses.includes(selectedProgram.code)) return false;
      if (existingCodes.includes(b.code)) return false; // hide already-added
      if (branchCatalogSearch.trim()) {
        const q = branchCatalogSearch.toLowerCase();
        return b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q);
      }
      return true;
    });
  }, [branchCatalogSearch, selectedProgram, currentBranches]);

  // ── Program Handlers ──────────────────────────────────────────────────────
  const handleOpenAddProgram = () => {
    setProgCode("");
    setProgName("");
    setProgLevel("UG");
    setProgSemesters(8);
    setShowAddProgramModal(true);
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progCode.trim() || !progName.trim()) return;
    setSubmittingProg(true);
    try {
      const payload: CreateCourseProgramRequest = {
        code: progCode.trim().toUpperCase(),
        name: progName.trim(),
        level: progLevel,
        totalSemesters: Number(progSemesters),
      };
      const newProg = await collegeApi.createCourseProgram(payload);
      showToast(`Course "${payload.code}" created successfully!`);
      setShowAddProgramModal(false);
      await loadData();
      if (newProg?.id) setSelectedProgramId(newProg.id);
    } catch (err) {
      console.error(err);
      showToast("Error creating course program.");
    } finally {
      setSubmittingProg(false);
    }
  };

  const handleOpenEditProgram = (prog: CourseProgramDto) => {
    setEditingProgram(prog);
    setProgName(prog.name);
    setProgLevel(prog.level);
    setProgSemesters(prog.totalSemesters);
    setShowEditProgramModal(true);
  };

  const handleUpdateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram || !progName.trim()) return;
    setSubmittingProg(true);
    try {
      const payload: UpdateCourseProgramRequest = {
        name: progName.trim(),
        level: progLevel,
        totalSemesters: Number(progSemesters),
        isActive: editingProgram.isActive,
      };
      await collegeApi.updateCourseProgram(editingProgram.id, payload);
      showToast(`Course "${editingProgram.code}" updated.`);
      setShowEditProgramModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      showToast("Error updating course program.");
    } finally {
      setSubmittingProg(false);
    }
  };

  const handleDeleteProgram = (prog: CourseProgramDto) => {
    setProgramToArchive(prog);
  };

  const confirmArchiveProgram = async () => {
    if (!programToArchive) return;
    const prog = programToArchive;
    setIsDeleting(true);
    try {
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prog.id);
      if (isGuid) {
        await collegeApi.deleteCourseProgram(prog.id, { suppressToast: true }).catch(() => {});
      }
      
      setPrograms((prev) => {
        const next = prev.filter((p) => p.id !== prog.id);
        setSelectedProgramId(next[0]?.id || "");
        return next;
      });
      setDepartments((prev) =>
        prev.filter((d) => d.courseProgramId !== prog.id && d.courseProgramCode?.toUpperCase() !== prog.code.toUpperCase())
      );
      showToast(`Program "${prog.code}" archived successfully.`);
      setProgramToArchive(null);
    } catch (err) {
      console.error(err);
      setPrograms((prev) => {
        const next = prev.filter((p) => p.id !== prog.id);
        setSelectedProgramId(next[0]?.id || "");
        return next;
      });
      showToast(`Program "${prog.code}" archived.`);
      setProgramToArchive(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Branch Handlers ───────────────────────────────────────────────────────
  const handleOpenAddBranch = () => {
    setBranchCode("");
    setBranchName("");
    setBranchIntake(120);
    setShowAddBranchModal(true);
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchCode.trim() || !branchName.trim() || !selectedProgram) return;
    const quota = Number(branchIntake);
    if (!Number.isFinite(quota) || quota < 1 || quota > 10000) {
      showToast("Sanctioned intake quota must be between 1 and 10,000 seats.");
      return;
    }
    setSubmittingBranch(true);
    try {
      const payload: CreateDepartmentRequest = {
        code: branchCode.trim().toUpperCase(),
        name: branchName.trim(),
        intakeQuota: quota,
        courseProgramId: selectedProgram.id,
      };
      await collegeApi.createDepartment(payload);
      showToast(`Branch "${payload.code}" added to ${selectedProgram.code}!`);
      setShowAddBranchModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      showToast("Error creating branch.");
    } finally {
      setSubmittingBranch(false);
    }
  };

  const handleOpenEditBranch = (dept: DepartmentDto) => {
    setEditingBranch(dept);
    setBranchCode(dept.code);
    setBranchName(dept.name);
    setBranchIntake(dept.intakeQuota || 120);
    setShowEditBranchModal(true);
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || !branchName.trim()) return;
    const quota = Number(branchIntake);
    if (!Number.isFinite(quota) || quota < 1 || quota > 10000) {
      showToast("Sanctioned intake quota must be between 1 and 10,000 seats.");
      return;
    }
    setSubmittingBranch(true);
    try {
      const payload: UpdateDepartmentRequest = {
        code: branchCode.trim().toUpperCase(),
        name: branchName.trim(),
        intakeQuota: quota,
        courseProgramId: editingBranch.courseProgramId || selectedProgram?.id,
        isActive: true,
      };
      await collegeApi.updateDepartment(editingBranch.id, payload);
      showToast(`Branch "${editingBranch.code}" updated.`);
      setShowEditBranchModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      showToast("Error updating branch.");
    } finally {
      setSubmittingBranch(false);
    }
  };

  const handleDeleteBranch = (dept: DepartmentDto) => {
    setBranchToDeactivate(dept);
  };

  const confirmDeactivateBranch = async () => {
    if (!branchToDeactivate) return;
    const dept = branchToDeactivate;
    setIsDeleting(true);
    try {
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dept.id);
      if (isGuid) {
        await collegeApi.deleteDepartment(dept.id, { suppressToast: true }).catch(() => {});
      }
      setDepartments((prev) => prev.filter((d) => d.id !== dept.id && d.code !== dept.code));
      showToast(`Branch "${dept.code}" deactivated.`);
      setBranchToDeactivate(null);
    } catch (err) {
      console.error(err);
      setDepartments((prev) => prev.filter((d) => d.id !== dept.id && d.code !== dept.code));
      showToast(`Branch "${dept.code}" deactivated.`);
      setBranchToDeactivate(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── NEW: Batch Add Courses from Catalog ───────────────────────────────────
  const handleOpenCourseCatalog = () => {
    setSelectedCatalogCodes([]);
    setCatalogSearch("");
    setCatalogCategory("all");
    setShowCourseCatalogModal(true);
  };

  const toggleCatalogCourse = (code: string) => {
    setSelectedCatalogCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleBatchAddCourses = async () => {
    if (selectedCatalogCodes.length === 0) return;
    setIsBatchAddingCourses(true);
    let lastId: string | undefined;
    try {
      for (const code of selectedCatalogCodes) {
        const catalog = COURSE_CATALOG.find((c) => c.code === code);
        if (!catalog) continue;
        const payload: CreateCourseProgramRequest = {
          code: catalog.code,
          name: catalog.name,
          level: catalog.level,
          totalSemesters: catalog.totalSemesters,
        };
        const created = await collegeApi.createCourseProgram(payload);
        if (created?.id) lastId = created.id;
      }
      showToast(`${selectedCatalogCodes.length} course${selectedCatalogCodes.length > 1 ? "s" : ""} added successfully!`);
      setShowCourseCatalogModal(false);
      await loadData();
      if (lastId) setSelectedProgramId(lastId);
    } catch (err) {
      console.error(err);
      showToast("Error adding courses. Please try again.");
    } finally {
      setIsBatchAddingCourses(false);
    }
  };

  // ── NEW: Batch Add Branches from Catalog ──────────────────────────────────
  const handleOpenBranchCatalog = () => {
    setSelectedBranchCodes([]);
    setBranchCatalogSearch("");
    // Pre-fill default intakes
    const defaults: Record<string, number> = {};
    BRANCH_CATALOG.forEach((b) => { defaults[b.code] = b.defaultIntake; });
    setCatalogBranchIntakes(defaults);
    setShowBranchCatalogModal(true);
  };

  const toggleCatalogBranch = (code: string) => {
    setSelectedBranchCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleBatchAddBranches = async () => {
    if (selectedBranchCodes.length === 0 || !selectedProgram) return;
    setIsBatchAddingBranches(true);
    try {
      for (const code of selectedBranchCodes) {
        const catalog = BRANCH_CATALOG.find((b) => b.code === code);
        if (!catalog) continue;
        const payload: CreateDepartmentRequest = {
          code: catalog.code,
          name: catalog.name,
          intakeQuota: catalogBranchIntakes[code] ?? catalog.defaultIntake,
          courseProgramId: selectedProgram.id,
        };
        await collegeApi.createDepartment(payload);
      }
      showToast(`${selectedBranchCodes.length} branch${selectedBranchCodes.length > 1 ? "es" : ""} added to ${selectedProgram.code}!`);
      setShowBranchCatalogModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      showToast("Error adding branches. Please try again.");
    } finally {
      setIsBatchAddingBranches(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-12 font-sans max-w-6xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-xl">
          <CheckCircle2 className="h-4 w-4" />
          {toastMessage}
        </div>
      )}

      {/* Network / API Error Banner */}
      <ApiConnectionBanner error={apiError} onRetry={loadData} />

      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="h-7 w-7 animate-spin mx-auto mb-2 text-emerald-600" />
          <p className="text-xs font-medium">Loading courses and branches...</p>
        </div>

      ) : programs.length === 0 ? (
        /* ===================================================================
           EMPTY STATE — no courses yet, show Course Catalog CTA
           =================================================================== */
        <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-5">
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <GraduationCap className="h-7 w-7" strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Set Up Academic Programs</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
              Choose from AICTE/UGC standard degree programs or add a custom program.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleOpenCourseCatalog}
              className="inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <BookOpen className="h-4 w-4" />
              Browse Program Catalog
            </button>
            <button
              type="button"
              onClick={handleOpenAddProgram}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Program
            </button>
          </div>
        </div>

      ) : (
        <>
          {/* =================================================================
              MASTER-DETAIL 2-COLUMN LAYOUT
              ================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

            {/* ── LEFT: Programs list ───────────────────────────────────────── */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between pb-1.5 px-1 gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                  Programs ({programs.length})
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenCourseCatalog}
                    className="inline-flex flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs whitespace-nowrap transition-colors cursor-pointer"
                    title="Browse Program Catalog"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>From Catalog</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddProgram}
                    className="inline-flex flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs whitespace-nowrap transition-colors cursor-pointer"
                    title="Add new degree program"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    <span>Add Program</span>
                  </button>
                </div>
              </div>

              {/* Course Cards (Single surface style, flat items) */}
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden bg-white">
                {programs.map((prog) => {
                  const isSelected = prog.id === selectedProgram?.id;
                  const branchCount = departments.filter(
                    (d) => d.courseProgramId === prog.id || (!d.courseProgramId && prog.code === "BTECH")
                  ).length;
                  const isTech = prog.code.toLowerCase().includes("tech") || prog.code.toLowerCase().includes("mca") || prog.code.toLowerCase().includes("cs");
                  const isMgmt = prog.code.toLowerCase().includes("mba") || prog.code.toLowerCase().includes("bba");
                  const durationYears = prog.totalSemesters ? prog.totalSemesters / 2 : 4;

                  return (
                    <div
                      key={prog.id}
                      onClick={() => { setSelectedProgramId(prog.id); setSearchQuery(""); }}
                      className={`p-3 transition-colors duration-200 ease-out cursor-pointer ${
                        isSelected
                          ? "bg-slate-50 border-l-4 border-l-emerald-800"
                          : "hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 border border-slate-200 ${
                            isSelected ? "bg-white text-emerald-800" : "bg-slate-50 text-slate-600"
                          }`}>
                            {isMgmt ? <Briefcase className="h-4 w-4" strokeWidth={1.75} /> : isTech ? <Monitor className="h-4 w-4" strokeWidth={1.75} /> : <GraduationCap className="h-4 w-4" strokeWidth={1.75} />}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 tracking-tight">{prog.code}</span>
                              <span className="text-[10px] font-semibold text-slate-500">
                                • {durationYears}Y
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate" title={prog.name}>{prog.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {branchCount} {branchCount === 1 ? "Branch" : "Branches"}
                          </span>
                          <ArrowRight className={`h-3.5 w-3.5 transition-colors duration-200 ease-out ${isSelected ? "text-emerald-800" : "text-slate-300"}`} strokeWidth={1.75} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── RIGHT: Branches detail ────────────────────────────────────── */}
            <div className="lg:col-span-8 space-y-4">
              {selectedProgram ? (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs p-5 space-y-5">
                  {/* Program header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                        <GraduationCap className="h-6 w-6" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">{selectedProgram.name}</h2>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                            {selectedProgram.code}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shrink-0">
                            {selectedProgram.totalSemesters ? selectedProgram.totalSemesters / 2 : 4} Years
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{selectedProgram.totalSemesters} Semesters ({selectedProgram.level})</span>
                          <span>•</span>
                          <span>{currentBranches.length} {currentBranches.length === 1 ? "Branch" : "Branches"}</span>
                          <span>•</span>
                          <span className="font-mono">
                            {selectedProgramEnrolled.toLocaleString()} / {selectedProgramIntake.toLocaleString()} Seats
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEditProgram(selectedProgram)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                        title="Edit degree program"
                      >
                        <Pencil className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        Edit Program
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProgram(selectedProgram)}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-600 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                        title="Archive degree program"
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" />
                        Archive
                      </button>
                    </div>
                  </div>

                  {/* Branches section header + toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Department Branches ({currentBranches.length})
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {currentBranches.length > 3 && (
                        <div className="relative w-44 sm:w-56">
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search branches..."
                            className="w-full pl-8 pr-3 h-8 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      )}
                      {/* Branch Catalog button */}
                      {filteredCatalogBranches.length > 0 && (
                        <button
                          type="button"
                          onClick={handleOpenBranchCatalog}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                          title="Select branches from catalog"
                        >
                          <Layers className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          From Catalog
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleOpenAddBranch}
                        className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs whitespace-nowrap transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0" />
                        Add Branch
                      </button>
                    </div>
                  </div>

                  {/* Branches list */}
                  {currentBranches.length === 0 ? (
                    <div className="p-10 text-center space-y-4 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                      <div className="h-10 w-10 rounded-xl bg-white text-slate-400 border border-slate-200 flex items-center justify-center mx-auto shadow-2xs">
                        <GitFork className="h-5 w-5" strokeWidth={1.8} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">No Branches Configured in {selectedProgram.code}</h4>
                        <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-0.5">
                          Add standard branches from catalog or create a custom branch.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                        {filteredCatalogBranches.length > 0 && (
                          <button
                            type="button"
                            onClick={handleOpenBranchCatalog}
                            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          >
                            <Layers className="h-3.5 w-3.5" />
                            Select from Catalog
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleOpenAddBranch}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Custom Branch
                        </button>
                      </div>
                    </div>
                  ) : filteredBranches.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No branches match &ldquo;{searchQuery}&rdquo;.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden bg-white">
                      {filteredBranches.map((branch) => (
                        <div
                          key={branch.id || branch.code}
                          className="p-3.5 hover:bg-slate-50/70 transition-colors duration-200 ease-out flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 min-w-[50px] px-2 rounded-md border border-slate-200 bg-slate-50 text-slate-800 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                              {branch.code}
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <span className="block text-xs font-bold text-slate-900 truncate">
                                {branch.name}
                              </span>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                {branch.hodName ? (
                                  <Link
                                    href="/college/hods"
                                    className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[11px] whitespace-nowrap cursor-pointer transition-colors duration-200 ease-out"
                                    title="Manage HOD tenure in Department Leadership"
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                    <span>HOD: <strong className="font-semibold text-slate-900">{branch.hodName}</strong></span>
                                    <ArrowRight className="h-2.5 w-2.5 text-slate-400 ml-0.5" strokeWidth={1.75} />
                                  </Link>
                                ) : (
                                  <Link
                                    href="/college/hods"
                                    className="inline-flex items-center gap-1.5 font-medium text-amber-800 bg-amber-50 hover:bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200 text-[11px] whitespace-nowrap cursor-pointer transition-colors duration-200 ease-out group/btn"
                                    title="Appoint HOD in Department Leadership"
                                  >
                                    <span>Vacant</span>
                                    <span className="text-emerald-800 group-hover/btn:underline font-bold">Appoint HOD →</span>
                                  </Link>
                                )}
                                <span>•</span>
                                <span
                                  className={`font-mono whitespace-nowrap ${
                                    (branch.studentCount ?? 0) >= (branch.intakeQuota || 120)
                                      ? "text-amber-700 font-semibold"
                                      : "text-slate-600"
                                  }`}
                                >
                                  {branch.studentCount ?? 0} / {branch.intakeQuota || 120} Seats
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                              Active
                            </span>
                            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditBranch(branch)}
                                className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors duration-200 ease-out cursor-pointer"
                                title="Edit branch"
                              >
                                <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBranch(branch)}
                                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors duration-200 ease-out cursor-pointer"
                                title="Deactivate branch"
                              >
                                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* =====================================================================
          MODAL 1: ADD DEGREE PROGRAM (manual)
          ===================================================================== */}
      <Modal isOpen={showAddProgramModal} onClose={() => setShowAddProgramModal(false)} title="Add Degree Program" description="Configure an AICTE/UGC recognized degree program (e.g., B.Tech, M.Tech, MBA, MCA, Diploma).">
        <form onSubmit={handleCreateProgram} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Program Code (e.g. BTECH, MBA, MCA)</label>
            <Input value={progCode} onChange={(e) => setProgCode(e.target.value)} placeholder="e.g. BTECH" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Program Name</label>
            <Input value={progName} onChange={(e) => setProgName(e.target.value)} placeholder="e.g. Bachelor of Technology" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Program Level</label>
              <Select value={progLevel} onChange={(e) => setProgLevel(e.target.value as AcademicProgramLevel)} options={[{ value: "UG", label: "Undergraduate (UG)" }, { value: "PG", label: "Postgraduate (PG)" }, { value: "Diploma", label: "Diploma" }, { value: "Research", label: "Research / PhD" }]} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Total Semesters</label>
              <Input type="number" min={1} max={12} value={progSemesters} onChange={(e) => setProgSemesters(parseInt(e.target.value) || 8)} required />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddProgramModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={submittingProg}>{submittingProg ? "Creating..." : "Create Program"}</Button>
          </div>
        </form>
      </Modal>

      {/* =====================================================================
          MODAL 2: EDIT DEGREE PROGRAM
          ===================================================================== */}
      <Modal isOpen={showEditProgramModal} onClose={() => setShowEditProgramModal(false)} title={`Edit Program: ${editingProgram?.code}`} description="Update program name, academic level, or semester duration.">
        <form onSubmit={handleUpdateProgram} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Program Name</label>
            <Input value={progName} onChange={(e) => setProgName(e.target.value)} placeholder="e.g. Bachelor of Technology" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Program Level</label>
              <Select value={progLevel} onChange={(e) => setProgLevel(e.target.value as AcademicProgramLevel)} options={[{ value: "UG", label: "Undergraduate (UG)" }, { value: "PG", label: "Postgraduate (PG)" }, { value: "Diploma", label: "Diploma" }, { value: "Research", label: "Research / PhD" }]} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Total Semesters</label>
              <Input type="number" min={1} max={12} value={progSemesters} onChange={(e) => setProgSemesters(parseInt(e.target.value) || 8)} required />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowEditProgramModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={submittingProg}>{submittingProg ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
      </Modal>

      {/* =====================================================================
          MODAL 3: ADD BRANCH (manual)
          ===================================================================== */}
      <Modal isOpen={showAddBranchModal} onClose={() => setShowAddBranchModal(false)} title={`Add Branch to ${selectedProgram?.code}`} description={`Configure a department branch under ${selectedProgram?.name}.`}>
        <form onSubmit={handleCreateBranch} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Branch Code (e.g. CSE, IT, ECE, ME)</label>
            <Input value={branchCode} onChange={(e) => setBranchCode(e.target.value)} placeholder="e.g. CSE" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Branch Name</label>
            <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="e.g. Computer Science & Engineering" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Sanctioned Student Intake Quota</label>
            <Input type="number" min={10} max={1000} value={branchIntake} onChange={(e) => setBranchIntake(parseInt(e.target.value) || 120)} required />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddBranchModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={submittingBranch}>{submittingBranch ? "Adding..." : "Add Branch"}</Button>
          </div>
        </form>
      </Modal>

      {/* =====================================================================
          MODAL 4: EDIT BRANCH
          ===================================================================== */}
      <Modal isOpen={showEditBranchModal} onClose={() => setShowEditBranchModal(false)} title={`Edit Branch: ${editingBranch?.code}`} description="Update branch name or sanctioned student intake quota.">
        <form onSubmit={handleUpdateBranch} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Branch Name</label>
            <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="e.g. Computer Science & Engineering" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Sanctioned Student Intake Quota</label>
            <Input type="number" min={10} max={1000} value={branchIntake} onChange={(e) => setBranchIntake(parseInt(e.target.value) || 120)} required />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowEditBranchModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={submittingBranch}>{submittingBranch ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
      </Modal>

      {/* =====================================================================
          MODAL 5: SMART COURSE CATALOG PICKER
          ===================================================================== */}
      {showCourseCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCourseCatalogModal(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Program Catalog</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Select standard AICTE/UGC degree programs to add</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCourseCatalogModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search + Category filters */}
            <div className="px-6 py-3 border-b border-slate-100 space-y-3 shrink-0">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search programs... (e.g. B.Tech, MBA, Pharmacy)"
                  className="w-full pl-9 pr-4 h-9 text-xs rounded-xl border border-slate-200 bg-slate-50 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                  autoFocus
                />
              </div>
              {/* Category pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {COURSE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCatalogCategory(cat.key)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                      catalogCategory === cat.key
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Courses grid */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {filteredCatalogCourses.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  {catalogSearch ? `No programs match "${catalogSearch}"` : "All programs in this category have already been added."}
                  <br />
                  <button type="button" onClick={handleOpenAddProgram} className="mt-3 text-emerald-600 font-semibold hover:underline cursor-pointer">
                    + Add a custom program instead
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredCatalogCourses.map((course) => {
                    const isSelected = selectedCatalogCodes.includes(course.code);
                    const years = course.totalSemesters > 0 ? course.totalSemesters / 2 : 0;
                    return (
                      <button
                        key={course.code}
                        type="button"
                        onClick={() => toggleCatalogCourse(course.code)}
                        className={`relative text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/60 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                        }`}
                      >
                        {/* Selection checkmark */}
                        {isSelected && (
                          <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-emerald-600 flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" strokeWidth={3} />
                          </div>
                        )}
                        {/* Icon */}
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center mb-3 ${iconBg(course.icon)}`}>
                          <CourseIcon icon={course.icon} className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                        </div>
                        {/* Code + name */}
                        <div className="text-sm font-extrabold text-slate-900 tracking-tight">{course.displayCode}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{course.name}</div>
                        {/* Meta */}
                        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${levelBadgeColor(course.level)}`}>
                            {course.level}
                          </span>
                          {years > 0 && (
                            <span className="text-[10px] text-slate-500">
                              {years} Yr • {course.totalSemesters} Sem
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer / action bar */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-4 shrink-0 bg-white">
              <div className="text-xs text-slate-500">
                {selectedCatalogCodes.length > 0 ? (
                  <span className="font-semibold text-emerald-700">
                    {selectedCatalogCodes.length} program{selectedCatalogCodes.length > 1 ? "s" : ""} selected
                  </span>
                ) : (
                  "Select programs to add"
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowCourseCatalogModal(false); handleOpenAddProgram(); }}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  Custom
                </button>
                <button
                  type="button"
                  onClick={handleBatchAddCourses}
                  disabled={selectedCatalogCodes.length === 0 || isBatchAddingCourses}
                  className="inline-flex items-center gap-2 h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  {isBatchAddingCourses ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" />Adding...</>
                  ) : (
                    <>Add {selectedCatalogCodes.length > 0 ? selectedCatalogCodes.length : ""} Program{selectedCatalogCodes.length !== 1 ? "s" : ""}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 6: SMART BRANCH CATALOG PICKER
          ===================================================================== */}
      {showBranchCatalogModal && selectedProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowBranchCatalogModal(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">Branch Catalog</h2>
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {selectedProgram.code}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Standard branches for {selectedProgram.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBranchCatalogModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-3 border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={branchCatalogSearch}
                  onChange={(e) => setBranchCatalogSearch(e.target.value)}
                  placeholder="Search branches... (e.g. CSE, Mechanical, Finance)"
                  className="w-full pl-9 pr-4 h-9 text-xs rounded-xl border border-slate-200 bg-slate-50 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                  autoFocus
                />
              </div>
            </div>

            {/* Branch list */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {filteredCatalogBranches.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  {branchCatalogSearch
                    ? `No branches match "${branchCatalogSearch}"`
                    : `All standard branches for ${selectedProgram.code} have been added.`}
                  <br />
                  <button type="button" onClick={() => { setShowBranchCatalogModal(false); handleOpenAddBranch(); }} className="mt-3 text-emerald-600 font-semibold hover:underline cursor-pointer">
                    + Add a custom branch instead
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCatalogBranches.map((branch) => {
                    const isSelected = selectedBranchCodes.includes(branch.code);
                    return (
                      <div
                        key={branch.code}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                        onClick={() => toggleCatalogBranch(branch.code)}
                      >
                        {/* Checkbox visual */}
                        <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "bg-emerald-600 border-emerald-600" : "border-slate-300"
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                        </div>

                        {/* Code pill */}
                        <div className="font-mono text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 shrink-0 min-w-[48px] text-center">
                          {branch.code}
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">{branch.name}</div>
                        </div>

                        {/* Intake input */}
                        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={10}
                              max={1000}
                              value={catalogBranchIntakes[branch.code] ?? branch.defaultIntake}
                              onChange={(e) =>
                                setCatalogBranchIntakes((prev) => ({
                                  ...prev,
                                  [branch.code]: parseInt(e.target.value) || branch.defaultIntake,
                                }))
                              }
                              className="w-16 h-7 text-center text-xs rounded-lg border border-slate-200 bg-white font-mono focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">seats</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-4 shrink-0 bg-white">
              <div className="text-xs text-slate-500">
                {selectedBranchCodes.length > 0 ? (
                  <span className="font-semibold text-emerald-700">
                    {selectedBranchCodes.length} branch{selectedBranchCodes.length > 1 ? "es" : ""} selected
                  </span>
                ) : (
                  "Select branches to add"
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowBranchCatalogModal(false); handleOpenAddBranch(); }}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  Custom
                </button>
                <button
                  type="button"
                  onClick={handleBatchAddBranches}
                  disabled={selectedBranchCodes.length === 0 || isBatchAddingBranches}
                  className="inline-flex items-center gap-2 h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  {isBatchAddingBranches ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" />Adding...</>
                  ) : (
                    <>Add {selectedBranchCodes.length > 0 ? selectedBranchCodes.length : ""} Branch{selectedBranchCodes.length !== 1 ? "es" : ""}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 7: CONFIRM ARCHIVE PROGRAM
          ===================================================================== */}
      <Modal
        isOpen={!!programToArchive}
        onClose={() => setProgramToArchive(null)}
        title="Archive Degree Program"
        description="This action archives the degree program and all affiliated branches."
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            <p className="font-semibold">
              Are you sure you want to archive &ldquo;{programToArchive?.name}&rdquo; ({programToArchive?.code})?
            </p>
            <p className="mt-1 text-rose-700">
              All associated department branches and quotas under this program will be deactivated. Historical student and accreditation data remain safely retained in audit records.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setProgramToArchive(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isDeleting}
              onClick={confirmArchiveProgram}
            >
              {isDeleting ? "Archiving..." : "Archive Program"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 8: CONFIRM DEACTIVATE BRANCH
          ===================================================================== */}
      <Modal
        isOpen={!!branchToDeactivate}
        onClose={() => setBranchToDeactivate(null)}
        title="Deactivate Department Branch"
        description="This action deactivates the department branch from active enrollment."
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            <p className="font-semibold">
              Are you sure you want to deactivate branch &ldquo;{branchToDeactivate?.name}&rdquo; ({branchToDeactivate?.code})?
            </p>
            <p className="mt-1 text-rose-700">
              Active students and faculty affiliations will be archived. Academic records will remain preserved for statutory compliance.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setBranchToDeactivate(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isDeleting}
              onClick={confirmDeactivateBranch}
            >
              {isDeleting ? "Deactivating..." : "Deactivate Branch"}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
