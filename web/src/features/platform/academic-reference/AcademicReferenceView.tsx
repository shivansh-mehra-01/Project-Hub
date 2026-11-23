"use client";

import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  X,
  Edit2,
  Power,
  Info,
  GraduationCap,
  Building2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { usePlatformData, AcademicBranchRecord } from "../data/platformDataStore";
import { showToast } from "@/lib/toast";

export const AcademicReferenceView: React.FC = () => {
  const { branches, addBranch, updateBranch, toggleBranchStatus } = usePlatformData();

  useDashboardHeader({
    title: "Academic Reference",
    breadcrumb: "Governance / Standard Academic Catalog",
  });

  // Filter to initial approved scope (B.Tech branches)
  const btechBranches = useMemo(() => {
    return branches.filter((b) => !b.programCode || b.programCode === "B.Tech" || b.programCode === "BTECH");
  }, [branches]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<AcademicBranchRecord | null>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formError, setFormError] = useState("");

  const filteredBranches = useMemo(() => {
    return btechBranches.filter((b) => {
      if (statusFilter !== "All" && b.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q);
      }
      return true;
    });
  }, [btechBranches, statusFilter, searchTerm]);

  const activeCount = btechBranches.filter((b) => b.status === "Active").length;
  const totalCount = btechBranches.length;

  const handleOpenAdd = () => {
    setEditingBranch(null);
    setFormName("");
    setFormCode("");
    setFormError("");
    setShowModal(true);
  };

  const handleOpenEdit = (branch: AcademicBranchRecord) => {
    setEditingBranch(branch);
    setFormName(branch.name);
    setFormCode(branch.code);
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    const trimmedCode = formCode.trim().toUpperCase();

    if (!trimmedName || !trimmedCode) {
      setFormError("Both branch name and standard branch code are required.");
      return;
    }

    // Check for duplicate code
    const isDuplicate = btechBranches.some(
      (b) => b.code.toUpperCase() === trimmedCode && (!editingBranch || b.id !== editingBranch.id)
    );

    if (isDuplicate) {
      setFormError(`Branch code '${trimmedCode}' already exists in the standard catalog.`);
      return;
    }

    if (editingBranch) {
      updateBranch(editingBranch.id, {
        name: trimmedName,
        code: trimmedCode,
      });
      showToast(`Branch ${trimmedCode} updated successfully.`, "success");
    } else {
      addBranch({
        name: trimmedName,
        code: trimmedCode,
        programCode: "B.Tech",
        departmentCode: `DEPT-${trimmedCode}`,
        durationYears: 4,
        status: "Active",
        intakeSeats: 60,
      });
      showToast(`Branch ${trimmedCode} added to standard catalog.`, "success");
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ======================================================================= */}
      {/* 1. HEADER & RESPONSIBILITY BOUNDARY CALLOUT                              */}
      {/* ======================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Academic Reference Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Standard platform university, program, and engineering branch catalog for affiliated institutions.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Standard Branch
        </button>
      </div>

      {/* Responsibility Boundary Informational Banner */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3 text-xs text-blue-900">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-blue-950">Architectural Responsibility Boundary</p>
          <p className="text-blue-800 text-[11px] leading-relaxed">
            Super Admin maintains this global standard reference catalog. Individual colleges inherit these nomenclatures and select which branches operate on their campus in their College Admin panel. Campus department administration and faculty allotments remain strictly within institutional workflows.
          </p>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 2. APPROVED SCOPE SUMMARY CARDS                                         */}
      {/* ======================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Affiliated University */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Affiliating University
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
              Active Scope
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-sm font-bold text-slate-900">RGPV Bhopal</h3>
            <p className="text-xs text-slate-500 mt-0.5">Rajiv Gandhi Proudyogiki Vishwavidyalaya</p>
          </div>
        </div>

        {/* Card 2: Academic Program */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Supported Program
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
              4 Years / 8 Semesters
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-sm font-bold text-slate-900">Bachelor of Technology (B.Tech)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Undergraduate Engineering Degree</p>
          </div>
        </div>

        {/* Card 3: Standard Branches Count */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Standard Branches
            </span>
            <span className="text-xs font-semibold text-slate-700 font-mono">
              {activeCount} Active / {totalCount} Total
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-slate-900">{totalCount}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Standard disciplines in catalog</p>
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 3. FILTERS & SEARCH                                                     */}
      {/* ======================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 text-xs">
            {(["All", "Active", "Inactive"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === st
                    ? "bg-slate-900 text-white font-semibold"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search branch name or code..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 4. STANDARD BRANCH CATALOG TABLE                                        */}
      {/* ======================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Branch Code</th>
                <th className="py-3 px-4">Standard Discipline Name</th>
                <th className="py-3 px-4">Program</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700 text-xs">No standard branches found</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      No branch matches the search query or selected status filter.
                    </p>
                    {(statusFilter !== "All" || searchTerm) && (
                      <button
                        onClick={() => {
                          setStatusFilter("All");
                          setSearchTerm("");
                        }}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Clear Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredBranches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                        {b.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{b.name}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">B.Tech (UG)</td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">4 Years (8 Sems)</td>
                    <td className="py-3.5 px-4">
                      {b.status === "Active" ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Branch"
                        >
                          <Edit2 className="w-3 h-3 text-slate-400" />
                          Edit
                        </button>

                        <button
                          onClick={() => toggleBranchStatus(b.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                            b.status === "Active"
                              ? "text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                              : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                          }`}
                          title={b.status === "Active" ? "Deactivate Branch" : "Activate Branch"}
                        >
                          <Power className="w-3 h-3" />
                          {b.status === "Active" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 5. ADD / EDIT BRANCH MODAL                                              */}
      {/* ======================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingBranch ? "Edit Standard Branch" : "Add Standard B.Tech Branch"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Discipline / Branch Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Computer Science & Engineering"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Standard Branch Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="e.g., CSE, IT, ECE, ME"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 focus:bg-white text-slate-900 font-mono uppercase"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Must be unique across the standard catalog.
                </span>
              </div>

              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {editingBranch ? "Save Changes" : "Add Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
