"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Calendar,
  Layers,
  GitFork,
  FileCheck2,
  FolderArchive,
  BarChart3,
  Clock,
  Plus,
  Award,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { getUserProfile } from "@/lib/api/apiClient";
import { useAccreditation } from "./accreditationStore";
import { OverviewTab } from "./tabs/OverviewTab";
import { FrameworksAndCyclesTab } from "./tabs/FrameworksAndCyclesTab";
import { ProgramMappingTab } from "./tabs/ProgramMappingTab";
import { CriteriaAndMetricsTab } from "./tabs/CriteriaAndMetricsTab";
import { EvidenceAndDocumentsTab } from "./tabs/EvidenceAndDocumentsTab";
import { ReviewsAndApprovalsTab } from "./tabs/ReviewsAndApprovalsTab";
import { ReportsAndExportTab } from "./tabs/ReportsAndExportTab";
import { ExaminationTab } from "./tabs/ExaminationTab";
import { ActivityLogTab } from "./tabs/ActivityLogTab";
import { Modal } from "@/design-system/components/Modal";
import { Input } from "@/design-system/components/Input";
import { collegeApi } from "@/lib/api/collegeApi";
import { DepartmentDto } from "@/lib/api/types";

export type AccreditationTab =
  | "overview"
  | "frameworks"
  | "programs"
  | "criteria"
  | "evidence"
  | "reviews"
  | "reports"
  | "examination"
  | "activity";

interface AccreditationModuleProps {
  initialTab?: AccreditationTab;
}

export const AccreditationModule: React.FC<AccreditationModuleProps> = ({
  initialTab = "overview",
}) => {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AccreditationTab>(initialTab);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("2026–2027");
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);

  useEffect(() => {
    collegeApi.getDepartments().then((res) => {
      if (res) setDepartments(res);
    }).catch(() => {});
  }, []);

  // Load accreditation state
  const {
    frameworks,
    frameworkVersions,
    cycles,
    activeCycle,
    activeCycleId,
    setActiveCycleId,
    programMappings,
    criteria,
    metrics,
    evidenceList,
    reviews,
    activityLogs,
    createCycle,
    uploadEvidence,
    updateReview,
    mapProgramToCycle,
  } = useAccreditation();

  // Modals state
  const [showAddFrameworkModal, setShowAddFrameworkModal] = useState(false);
  const [showCreateCycleModal, setShowCreateCycleModal] = useState(false);

  // Form states
  const [newCycleFrameworkId, setNewCycleFrameworkId] = useState(frameworks[0]?.id || "fw-nba");
  const [newCycleVersionId, setNewCycleVersionId] = useState(frameworkVersions[0]?.id || "ver-nba-2025");
  const [newCycleName, setNewCycleName] = useState("");
  const [newCycleYear, setNewCycleYear] = useState("2026–2027");

  useDashboardHeader({
    title: "Accreditation",
  });

  const currentUser = getUserProfile();
  const institutionName = currentUser?.collegeName || "Sagar Institute of Science and Technology (SISTec)";

  // Clean, concise tab definitions (no bloated labels)
  const tabItems: Array<{ id: AccreditationTab; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; count?: number }> = [
    { id: "overview", label: "Overview", icon: Layers },
    { id: "frameworks", label: "Frameworks & Cycles", icon: ShieldCheck, count: cycles.length },
    { id: "programs", label: "Program Mapping", icon: GitFork },
    { id: "criteria", label: "Criteria & Metrics", icon: BarChart3 },
    { id: "evidence", label: "Evidence Vault", icon: FolderArchive, count: evidenceList.length },
    { id: "reviews", label: "Reviews & Approvals", icon: FileCheck2, count: reviews.filter((r) => r.status === "Pending").length },
    { id: "reports", label: "Reports & Dossier", icon: ShieldCheck },
    { id: "examination", label: "Examination Register", icon: Award },
    { id: "activity", label: "Audit Trail", icon: Clock },
  ];

  const handleTabChange = (tabId: AccreditationTab) => {
    setActiveTab(tabId);
    if (tabId === "overview") {
      router.push("/college/accreditation");
    } else {
      router.push(`/college/accreditation/${tabId}`);
    }
  };

  const handleCreateCycleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCycleName.trim()) return;
    createCycle({
      frameworkId: newCycleFrameworkId,
      versionId: newCycleVersionId,
      cycleName: newCycleName.trim(),
      academicYear: newCycleYear,
      startDate: "2026-07-01",
      endDate: "2027-05-31",
    });
    setShowCreateCycleModal(false);
    setNewCycleName("");
    setActiveTab("frameworks");
  };

  return (
    <div className="space-y-5 pb-12 font-sans bg-[#f8fafc]">
      {/* ========================================================================= */}
      {/* SECTION 1: CLEAN HEADER (No redundant walls of text)                      */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Accreditation & Examination
            </h1>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-medium text-slate-500 truncate max-w-xs">
              {institutionName}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            NBA SAR preparation, NAAC compliance, evidence verification, and examination results.
          </p>
        </div>

        {/* Academic Session Selector & Action Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-700 cursor-pointer"
            >
              <option value="2026–2027">AY 2026–2027</option>
              <option value="2025–2026">AY 2025–2026</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateCycleModal(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>New Cycle</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: 8 TAB NAVIGATION STRIP (Clean & sleek)                         */}
      {/* ========================================================================= */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <div className="flex gap-1 text-xs font-semibold min-w-max pb-px">
          {tabItems.map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-colors cursor-pointer relative ${
                  isActive
                    ? "text-emerald-800 font-bold border-b-2 border-emerald-800 bg-white"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                }`}
              >
                <IconComp
                  className={`h-4 w-4 ${isActive ? "text-emerald-800" : "text-slate-400"}`}
                  strokeWidth={1.75}
                />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-slate-200/80 text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: TAB CONTENT                                                    */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <OverviewTab
          frameworks={frameworks}
          cycles={cycles}
          onAddFramework={() => setShowAddFrameworkModal(true)}
          onNavigateTab={(t) => handleTabChange(t as AccreditationTab)}
        />
      )}

      {activeTab === "frameworks" && (
        <FrameworksAndCyclesTab
          frameworks={frameworks}
          frameworkVersions={frameworkVersions}
          cycles={cycles}
          activeCycleId={activeCycleId}
          onSelectCycle={(id) => setActiveCycleId(id)}
          onCreateCycle={(req) => createCycle(req)}
          onNavigateTab={(t) => handleTabChange(t as AccreditationTab)}
        />
      )}

      {activeTab === "programs" && (
        <ProgramMappingTab
          mappings={programMappings}
          onMapProgram={(pid, cid) => mapProgramToCycle(pid, cid)}
          onNavigateTab={(t) => handleTabChange(t as AccreditationTab)}
        />
      )}

      {activeTab === "criteria" && (
        <CriteriaAndMetricsTab
          criteria={criteria}
          metrics={metrics}
          onNavigateTab={(t) => handleTabChange(t as AccreditationTab)}
        />
      )}

      {activeTab === "evidence" && (
        <EvidenceAndDocumentsTab
          evidenceList={evidenceList}
          onUploadEvidence={(req) => uploadEvidence(req)}
          onNavigateTab={(t) => handleTabChange(t as AccreditationTab)}
        />
      )}

      {activeTab === "reviews" && (
        <ReviewsAndApprovalsTab
          reviews={reviews}
          onUpdateReview={(rid, req) => updateReview(rid, req)}
          onNavigateTab={(t) => handleTabChange(t as AccreditationTab)}
        />
      )}

      {activeTab === "reports" && (
        <ReportsAndExportTab
          activeCycle={activeCycle}
          onNavigateTab={(t) => handleTabChange(t as AccreditationTab)}
        />
      )}

      {activeTab === "examination" && (
        <ExaminationTab departments={departments} />
      )}

      {activeTab === "activity" && (
        <ActivityLogTab
          activityLogs={activityLogs}
          onNavigateTab={(t) => handleTabChange(t as AccreditationTab)}
        />
      )}

      {/* Modal: Enroll Framework */}
      <Modal
        isOpen={showAddFrameworkModal}
        onClose={() => setShowAddFrameworkModal(false)}
        title="Enroll Accreditation Framework"
        description="Select an accreditation framework for your campus tenant."
      >
        <div className="space-y-4 pt-1 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg border border-emerald-700 bg-emerald-50/50 space-y-1">
              <span className="font-bold text-slate-900 block">NBA Tier-II</span>
              <span className="text-[11px] text-slate-600 block">Engineering Programs</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
              <span className="font-bold text-slate-900 block">NAAC RAF</span>
              <span className="text-[11px] text-slate-600 block">Institutional 7 Criteria</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddFrameworkModal(false)}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddFrameworkModal(false);
                setActiveTab("frameworks");
              }}
              className="px-4 py-1.5 font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
            >
              Confirm Enrollment
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Launch Cycle */}
      <Modal
        isOpen={showCreateCycleModal}
        onClose={() => setShowCreateCycleModal(false)}
        title="Launch Assessment Cycle"
        description="Initiate a data collection cycle for SAR/SSR preparation."
      >
        <form onSubmit={handleCreateCycleSubmit} className="space-y-3 pt-1 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Target Framework</label>
            <select
              value={newCycleFrameworkId}
              onChange={(e) => setNewCycleFrameworkId(e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-700"
            >
              {frameworks.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Cycle Title</label>
            <Input
              value={newCycleName}
              onChange={(e) => setNewCycleName(e.target.value)}
              placeholder="e.g. B.Tech Mechanical - 2026 SAR Cycle"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Academic Year</label>
            <Input
              value={newCycleYear}
              onChange={(e) => setNewCycleYear(e.target.value)}
              placeholder="2026–2027"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCreateCycleModal(false)}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
            >
              Start Cycle
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
