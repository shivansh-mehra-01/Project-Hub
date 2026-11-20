"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Users2,
  GraduationCap,
  Download,
  Unlock,
  Check,
  X,
  Eye,
  Search,
  Lock,
  ShieldCheck,
  Plus,
  Minus,
  Sparkles,
  ArrowUpRight,
  Filter,
  Layers,
  ChevronRight,
  BookOpen,
  Building2,
  Calendar,
  FolderGit2,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { Modal } from "@/design-system/components/Modal";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { Team } from "@/mocks/store-types";
import { hodApi, getAuthToken, HodAcademicContextDto, CollegeTrackDto } from "@/lib/api";

export interface HODViewProps {
  initialTab?: "overview" | "approvals" | "nba" | "faculty";
}

export const HODView: React.FC<HODViewProps> = ({ initialTab = "overview" }) => {
  const router = useRouter();
  const {
    teams,
    facultyRoster,
    departments,
    coursePrograms,
    academicSessions,
    semesterTerms,
    subjectOfferings,
    cycle,
    updateCycle,
    addSemesterTerm,
    addSubjectOffering,
    toggleFacultyCoordinator,
    approveProposal,
    rejectProposal,
    approveGradeUnlock,
    rejectGradeUnlock,
    updateFacultyCapacity,
    addFaculty,
    lockDepartmentSAR,
    bulkApproveProposals,
    exceptionAuditLogs,
    reviewExceptionOverride,
    courseExitSurveys,
  } = useProjectHubStore();

  const [activeTab, setActiveTab] = useState<"overview" | "approvals" | "nba" | "faculty">(initialTab);
  const [departmentTracks, setDepartmentTracks] = useState<CollegeTrackDto[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string>("track-minor-6");
  const [approvalSubTab, setApprovalSubTab] = useState<
    "allotments" | "proposals" | "unlocks" | "overrides" | "results"
  >("allotments");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [inspectingTeam, setInspectingTeam] = useState<Team | null>(null);
  const [returnModalTeam, setReturnModalTeam] = useState<Team | null>(null);
  const [returnRemarks, setReturnRemarks] = useState("");
  const [showSampleZipModal, setShowSampleZipModal] = useState(false);
  const [zipPackaging, setZipPackaging] = useState(false);
  const [zipSuccess, setZipSuccess] = useState(false);
  const [unlockRejected, setUnlockRejected] = useState(false);
  const [showAddFacultyModal, setShowAddFacultyModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const CUSTOM_OFFERING_VALUE = "__CUSTOM_OFFERING__";

  // Academic Context State
  const [academicContext, setAcademicContext] = useState<HodAcademicContextDto | null>(null);

  // Launch Academic Track Modal State
  const [showLaunchTrackModal, setShowLaunchTrackModal] = useState(false);
  const [trackTitleManuallyEdited, setTrackTitleManuallyEdited] = useState(false);
  const [newTrackName, setNewTrackName] = useState("Minor Project (Semester 6)");
  const [newTrackSemesterNum, setNewTrackSemesterNum] = useState<number>(6);
  const [newTrackSemesterTermId, setNewTrackSemesterTermId] = useState<string>("sem-cse-6");
  const [newTrackSubjectOfferingId, setNewTrackSubjectOfferingId] = useState<string>("off-cse-606");
  const [isCustomOffering, setIsCustomOffering] = useState(false);
  const [customSubjectCode, setCustomSubjectCode] = useState("CS-606");
  const [customSubjectName, setCustomSubjectName] = useState("Minor Project (4 Credits)");
  const [customCredits, setCustomCredits] = useState<number>(4);
  const [newTrackParticipationMode, setNewTrackParticipationMode] = useState<"Team" | "Individual">("Team");
  const [newTrackEnrolmentMode, setNewTrackEnrolmentMode] = useState<"SelfJoin" | "CoordinatorAllotted" | "Hybrid">("SelfJoin");
  const [newTrackAllowCrossBranch, setNewTrackAllowCrossBranch] = useState(false);
  const [newTrackProposalDeadline, setNewTrackProposalDeadline] = useState("2026-03-31");
  const [isLaunchingTrack, setIsLaunchingTrack] = useState(false);

  // New faculty form state
  const [newFacultyForm, setNewFacultyForm] = useState({
    name: "",
    email: "",
    designation: "Assistant Professor",
    maxTeams: 4,
  });

  // Multi-Year Archive state
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveBatch, setArchiveBatch] = useState("ALL");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const subtabParam = params.get("subtab");
      if (
        subtabParam === "allotments" ||
        subtabParam === "proposals" ||
        subtabParam === "unlocks" ||
        subtabParam === "overrides" ||
        subtabParam === "results"
      ) {
        setApprovalSubTab(subtabParam);
      }
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load live academic context & active tracks from backend
  useEffect(() => {
    if (getAuthToken()) {
      hodApi
        .getAcademicContext()
        .then((ctx) => {
          if (ctx) setAcademicContext(ctx);
        })
        .catch((err) => console.warn("Failed to load academic context:", err));

      hodApi
        .getTracks()
        .then((tracks) => {
          if (tracks && tracks.length > 0) {
            const active = tracks.filter((t) => t.isActive);
            if (active.length > 0) {
              setDepartmentTracks(active);
              setSelectedTrackId(active[0].id);
            }
          }
        })
        .catch((err) => console.warn("Failed to load tracks:", err));
    }
  }, []);

  // Department SAR status
  const cseDept = departments.find((d) => d.code === "CSE");
  const isSARLocked = cseDept?.hodSignOffStatus === "Attested & Locked";

  const deptCode = academicContext?.departmentCode || cseDept?.code || "CS";

  const defaultTrackTitleForSemester = (semNum: number): string => {
    switch (semNum) {
      case 1:
        return "First-Year Mini Project (Semester 1)";
      case 2:
        return "First-Year Mini Project (Semester 2)";
      case 3:
        return "Second-Year Mini Project (Semester 3)";
      case 4:
        return "Second-Year Mini Project (Semester 4)";
      case 5:
        return "Minor Project (Semester 5)";
      case 6:
        return "Minor Project (Semester 6)";
      case 7:
        return "Major Project Phase-I (Semester 7)";
      case 8:
        return "Major Project Phase-II (Semester 8)";
      default:
        return `Academic Project Track (Semester ${semNum})`;
    }
  };

  const defaultSubjectCodeForSemester = (dCode: string, semNum: number): string => {
    const prefix = dCode ? dCode.toUpperCase() : "CS";
    switch (semNum) {
      case 1:
        return `${prefix}-108`;
      case 2:
        return `${prefix}-208`;
      case 3:
        return `${prefix}-308`;
      case 4:
        return `${prefix}-408`;
      case 5:
        return `${prefix}-506`;
      case 6:
        return `${prefix}-606`;
      case 7:
        return `${prefix}-705`;
      case 8:
        return `${prefix}-805`;
      default:
        return `${prefix}-${semNum}01`;
    }
  };

  const defaultSubjectNameForSemester = (semNum: number): string => {
    switch (semNum) {
      case 1:
      case 2:
        return "First-Year Mini Project (2 Credits)";
      case 3:
      case 4:
        return "Second-Year Mini Project (2 Credits)";
      case 5:
        return "Minor Project Phase-I (3 Credits)";
      case 6:
        return "Minor Project (4 Credits)";
      case 7:
        return "Major Project Phase-I (4 Credits)";
      case 8:
        return "Major Project Phase-II (8 Credits)";
      default:
        return `Project Course (Semester ${semNum})`;
    }
  };

  const allSemesters = useMemo(() => {
    if (academicContext?.availableSemesters && academicContext.availableSemesters.length > 0) {
      return academicContext.availableSemesters.map((st) => ({
        id: st.id,
        semesterNumber: st.semesterNumber,
        semesterName: st.semesterName || `Semester ${st.semesterNumber}`,
        parity: st.parity,
        academicSessionLabel: st.academicSessionLabel || "AY 2025-26",
      }));
    }
    const totalSems = 8;
    const list: Array<{
      id: string;
      semesterNumber: number;
      semesterName: string;
      parity: "Odd" | "Even" | "Combined";
      academicSessionLabel?: string;
    }> = [];

    for (let s = 1; s <= totalSems; s++) {
      const existing = semesterTerms.find((st) => st.semesterNumber === s);
      if (existing) {
        list.push({
          id: existing.id,
          semesterNumber: existing.semesterNumber,
          semesterName: existing.semesterName || `Semester ${s}`,
          parity: existing.parity as any,
          academicSessionLabel: existing.academicSessionName || "AY 2025-26",
        });
      } else {
        list.push({
          id: `virtual-sem-${s}`,
          semesterNumber: s,
          semesterName: `Semester ${s}`,
          parity: s % 2 === 1 ? "Odd" : "Even",
          academicSessionLabel: "AY 2025-26",
        });
      }
    }
    return list.sort((a, b) => a.semesterNumber - b.semesterNumber);
  }, [academicContext, semesterTerms]);

  const allOfferings = useMemo(() => {
    if (academicContext?.availableOfferings && academicContext.availableOfferings.length > 0) {
      return academicContext.availableOfferings.map((so) => ({
        id: so.id,
        semesterTermId: so.semesterTermId,
        semesterNumber: so.semesterNumber || 6,
        subjectCode: so.subjectCode,
        subjectName: so.subjectName,
        subjectType: so.subjectType,
        credits: so.credits,
      }));
    }
    return subjectOfferings.map((so) => {
      const matchedTerm = semesterTerms.find((t) => t.id === so.semesterTermId);
      return {
        id: so.id,
        semesterTermId: so.semesterTermId,
        semesterNumber: so.semesterNumber || matchedTerm?.semesterNumber || 6,
        subjectCode: so.subjectCode,
        subjectName: so.subjectName,
        subjectType: so.subjectType,
        credits: so.credits,
      };
    });
  }, [academicContext, subjectOfferings, semesterTerms]);

  const currentSemesterOfferings = useMemo(() => {
    return allOfferings.filter(
      (so) =>
        so.semesterNumber === newTrackSemesterNum ||
        (newTrackSemesterTermId &&
          !newTrackSemesterTermId.startsWith("virtual-") &&
          newTrackSemesterTermId !== "00000000-0000-0000-0000-000000000000" &&
          so.semesterTermId === newTrackSemesterTermId)
    );
  }, [allOfferings, newTrackSemesterNum, newTrackSemesterTermId]);

  // Dynamic Department Track List for Pills
  const activeTrackList = useMemo(() => {
    if (departmentTracks.length > 0) {
      return departmentTracks.map((t, idx) => {
        const isMajor = t.name.toLowerCase().includes("major") || (t.semesterTermId && t.semesterTermId.includes("8"));
        const defaultTeams = isMajor ? 32 : (idx === 0 ? 24 : 16);
        const count = defaultTeams;
        return {
          id: t.id,
          name: t.name,
          academicYear: t.academicYear ? t.academicYear.replace("-", "–") : "2025–2026",
          participationMode: (t.participationMode as "Team" | "Individual") || "Team",
          teamCount: count,
          studentCount: t.participationMode === "Individual" ? count : count * 4,
          allowCrossBranchTeams: t.allowCrossBranchTeams,
        };
      });
    }

    return [
      {
        id: "track-minor-6",
        name: "Minor Project (Sem 6)",
        academicYear: "2025–2026",
        participationMode: "Team" as const,
        teamCount: 24,
        studentCount: 96,
        allowCrossBranchTeams: false,
      },
      {
        id: "track-major-8",
        name: "Major Project (Sem 8)",
        academicYear: "2025–2026",
        participationMode: "Team" as const,
        teamCount: 32,
        studentCount: 128,
        allowCrossBranchTeams: true,
      },
    ];
  }, [departmentTracks]);

  const selectedTrack = useMemo(() => {
    return activeTrackList.find((t) => t.id === selectedTrackId) || activeTrackList[0];
  }, [activeTrackList, selectedTrackId]);

  const activeCohort = selectedTrack.name.toLowerCase().includes("major") ? "major" : "minor";

  // Teams waiting for HOD sign-off
  const pendingHODTeams = teams.filter((t) => t.state === "PendingHOD");
  const allPendingApprovals = teams.filter(
    (t) => t.state === "PendingHOD" || t.state === "PendingCoordinator"
  );
  const pendingOverrides = exceptionAuditLogs.filter((e) => e.status === "PendingHOD");

  // Dynamic 80/20 CO-PO Attainment Calculation using courseExitSurveys
  const surveyCount = courseExitSurveys.length;
  const avgSurvey = React.useMemo(() => {
    if (surveyCount === 0) {
      return { po2: 90.0, po3: 92.0, po5: 90.0, po9: 94.0, po10: 95.0 };
    }
    const sum = courseExitSurveys.reduce(
      (acc, s) => ({
        po2: acc.po2 + s.ratings.po2,
        po3: acc.po3 + s.ratings.po3,
        po5: acc.po5 + s.ratings.po5,
        po9: acc.po9 + s.ratings.po9,
        po10: acc.po10 + s.ratings.po10,
      }),
      { po2: 0, po3: 0, po5: 0, po9: 0, po10: 0 }
    );
    return {
      po2: (sum.po2 / (surveyCount * 3)) * 100,
      po3: (sum.po3 / (surveyCount * 3)) * 100,
      po5: (sum.po5 / (surveyCount * 3)) * 100,
      po9: (sum.po9 / (surveyCount * 3)) * 100,
      po10: (sum.po10 / (surveyCount * 3)) * 100,
    };
  }, [courseExitSurveys, surveyCount]);

  const coAttainments = [
    {
      code: "CO1: Problem Formulation & Feasibility",
      pos: ["PO1", "PO2", "PO3", "PSO1"],
      direct: 84.2,
      indirect: Number(((avgSurvey.po2 + avgSurvey.po3) / 2).toFixed(1)),
    },
    {
      code: "CO2: Architecture & System Design",
      pos: ["PO2", "PO3", "PO5", "PSO2"],
      direct: 81.4,
      indirect: Number(((avgSurvey.po3 + avgSurvey.po5) / 2).toFixed(1)),
    },
    {
      code: "CO3: Prototype Implementation & Testing",
      pos: ["PO3", "PO4", "PO5", "PO9"],
      direct: 79.6,
      indirect: Number(((avgSurvey.po3 + avgSurvey.po5 + avgSurvey.po9) / 3).toFixed(1)),
    },
    {
      code: "CO4: Technical Viva, Ethics & Report",
      pos: ["PO7", "PO9", "PO10", "PSO1"],
      direct: 85.0,
      indirect: Number(((avgSurvey.po9 + avgSurvey.po10) / 2).toFixed(1)),
    },
  ].map((item) => ({
    ...item,
    blended: Number((0.8 * item.direct + 0.2 * item.indirect).toFixed(1)),
  }));

  const toggleSelectTeam = (id: string) => {
    if (selectedTeamIds.includes(id)) {
      setSelectedTeamIds(selectedTeamIds.filter((tId) => tId !== id));
    } else {
      setSelectedTeamIds([...selectedTeamIds, id]);
    }
  };

  const handleBulkSignOff = () => {
    if (selectedTeamIds.length === 0) return;
    bulkApproveProposals(selectedTeamIds);
    showToast(`Successfully endorsed and signed off ${selectedTeamIds.length} capstone proposals.`);
    setSelectedTeamIds([]);
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalTeam) return;
    rejectProposal(returnModalTeam.id, returnRemarks || "Returned for technical revision by HOD");
    showToast(`Team ${returnModalTeam.teamCode} returned to Project Coordinator with revision remarks.`);
    setReturnModalTeam(null);
    setReturnRemarks("");
  };

  const handleDownloadZip = async () => {
    setZipPackaging(true);
    try {
      if (getAuthToken()) {
        const blob = await hodApi.exportNbaDossierZip();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const dateStr = new Date().toISOString().split("T")[0];
        a.download = `Collabex_NBA_SAR_CSE_${dateStr}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const mockBlob = new Blob(
          ["NBA Criterion 2 & 3 Dossier Archive\nGenerated in Mock/Preview Mode\n"],
          { type: "application/zip" }
        );
        const url = window.URL.createObjectURL(mockBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Collabex_NBA_SAR_CSE_${new Date().toISOString().split("T")[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      setZipPackaging(false);
      setZipSuccess(true);
      showToast("NBA-Audit-Criterion-2-3-Dossier.zip prepared and exported.");
      setTimeout(() => {
        setZipSuccess(false);
        setShowSampleZipModal(false);
      }, 1500);
    } catch (err) {
      console.error("Failed to export NBA dossier zip:", err);
      setZipPackaging(false);
      showToast("Failed to download NBA zip dossier. Please try again.");
    }
  };

  const handleLockSAR = () => {
    lockDepartmentSAR("CSE");
    showToast("Department of CSE SAR Criterion 2 & 3 Dossier attested and locked.");
  };

  const handleAddFacultySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacultyForm.name.trim() || !newFacultyForm.email.trim()) return;

    addFaculty({
      name: newFacultyForm.name.trim(),
      email: newFacultyForm.email.trim(),
      designation: newFacultyForm.designation,
      isProjectCoordinator: false,
      maxTeams: Number(newFacultyForm.maxTeams) || 4,
    });

    showToast(`Faculty member ${newFacultyForm.name} added to department roster.`);
    setShowAddFacultyModal(false);
    setNewFacultyForm({
      name: "",
      email: "",
      designation: "Assistant Professor",
      maxTeams: 4,
    });
  };

  const handleSemesterChange = (selectedTermId: string) => {
    const chosen = allSemesters.find(
      (st) => st.id === selectedTermId || `sem-${st.semesterNumber}` === selectedTermId
    );
    const semNum = chosen ? chosen.semesterNumber : Number(selectedTermId.replace(/\D/g, "")) || 6;
    const termId =
      chosen?.id && !chosen.id.startsWith("virtual-") && chosen.id !== "00000000-0000-0000-0000-000000000000"
        ? chosen.id
        : "";

    setNewTrackSemesterNum(semNum);
    setNewTrackSemesterTermId(termId || selectedTermId);

    // Auto-update track title if untouched by user
    if (!trackTitleManuallyEdited) {
      setNewTrackName(defaultTrackTitleForSemester(semNum));
    }

    // Filter offerings for this newly selected semester
    const matchingOfferings = allOfferings.filter(
      (so) => so.semesterNumber === semNum || (termId && so.semesterTermId === termId)
    );

    if (matchingOfferings.length > 0) {
      setNewTrackSubjectOfferingId(matchingOfferings[0].id);
      setIsCustomOffering(false);
    } else {
      // 0 pre-seeded offerings (e.g. Semesters 1 or 2) -> auto-select custom
      setNewTrackSubjectOfferingId(CUSTOM_OFFERING_VALUE);
      setIsCustomOffering(true);
      setCustomSubjectCode(defaultSubjectCodeForSemester(deptCode, semNum));
      setCustomSubjectName(defaultSubjectNameForSemester(semNum));
      setCustomCredits(semNum >= 7 ? 4 : (semNum >= 5 ? 3 : 2));
    }
  };

  const handleOfferingChange = (offeringVal: string) => {
    setNewTrackSubjectOfferingId(offeringVal);
    if (offeringVal === CUSTOM_OFFERING_VALUE) {
      setIsCustomOffering(true);
      if (!customSubjectCode) {
        setCustomSubjectCode(defaultSubjectCodeForSemester(deptCode, newTrackSemesterNum));
      }
      if (!customSubjectName) {
        setCustomSubjectName(defaultSubjectNameForSemester(newTrackSemesterNum));
      }
    } else {
      setIsCustomOffering(false);
      const selected = allOfferings.find((o) => o.id === offeringVal);
      if (selected && !trackTitleManuallyEdited) {
        setNewTrackName(`${selected.subjectName} (Semester ${newTrackSemesterNum})`);
      }
    }
  };

  const handleLaunchTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLaunchingTrack(true);
    try {
      const isCustom = isCustomOffering || newTrackSubjectOfferingId === CUSTOM_OFFERING_VALUE;
      const finalCode = isCustom ? customSubjectCode.trim().toUpperCase() : undefined;
      const finalName = isCustom ? customSubjectName.trim() : undefined;
      const finalCredits = isCustom ? Number(customCredits) || 2 : undefined;

      const resolvedTermId =
        newTrackSemesterTermId &&
        !newTrackSemesterTermId.startsWith("virtual-") &&
        newTrackSemesterTermId !== "00000000-0000-0000-0000-000000000000"
          ? newTrackSemesterTermId
          : undefined;

      const resolvedOfferingId = isCustom ? undefined : newTrackSubjectOfferingId;

      // Synchronize in local store for mock preview
      let termIdForStore = resolvedTermId;
      if (!termIdForStore) {
        termIdForStore = `sem-cse-${newTrackSemesterNum}`;
        addSemesterTerm({
          departmentId: cseDept?.id || "dept-cse-01",
          departmentCode: cseDept?.code || "CSE",
          semesterNumber: newTrackSemesterNum,
          semesterName: `Semester ${newTrackSemesterNum}`,
          parity: newTrackSemesterNum % 2 === 1 ? "Odd" : "Even",
          isActive: true,
        });
      }

      let offeringIdForStore = resolvedOfferingId;
      if (isCustom && finalCode && finalName) {
        offeringIdForStore = `off-${finalCode.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
        addSubjectOffering({
          semesterTermId: termIdForStore,
          semesterNumber: newTrackSemesterNum,
          subjectCode: finalCode,
          subjectName: finalName,
          subjectType: newTrackSemesterNum >= 7 ? "MajorProject" : (newTrackSemesterNum >= 5 ? "MinorProject" : "Project"),
          credits: finalCredits || 2,
          internalMaxMarks: 60,
          externalMaxMarks: 40,
          isActive: true,
        });
      }

      // Update store cycle
      updateCycle({
        type: newTrackSemesterNum >= 7 ? "Major" : "Minor",
        semester: newTrackSemesterNum,
        proposalDeadline: newTrackProposalDeadline,
        participationMode: newTrackParticipationMode,
        enrolmentMode: newTrackEnrolmentMode,
        allowCrossBranchTeams: newTrackAllowCrossBranch,
        semesterTermId: termIdForStore,
        subjectOfferingId: offeringIdForStore,
        minTeamSize: newTrackParticipationMode === "Individual" ? 1 : 3,
        maxTeamSize: newTrackParticipationMode === "Individual" ? 1 : 4,
        isActive: true,
      });

      // API call if authenticated
      if (getAuthToken()) {
        const createdTrack = await hodApi.createTrack({
          name: newTrackName.trim(),
          academicYear: cycle.academicYear || "2025-2026",
          semesterTermId: resolvedTermId,
          semesterNumber: newTrackSemesterNum,
          subjectOfferingId: resolvedOfferingId,
          customSubjectCode: finalCode,
          customSubjectName: finalName,
          credits: finalCredits,
          participationMode: newTrackParticipationMode as any,
          enrolmentMode: newTrackEnrolmentMode as any,
          allowCrossBranchTeams: newTrackAllowCrossBranch,
          proposalDeadlineUtc: new Date(newTrackProposalDeadline).toISOString(),
        }).catch((err) => {
          console.warn("Backend track create sync optional:", err);
          return null;
        });

        if (createdTrack) {
          setDepartmentTracks((prev) => [createdTrack, ...prev.filter((p) => p.id !== createdTrack.id)]);
          setSelectedTrackId(createdTrack.id);
        }
      } else {
        const mockTrackId = `track-mock-${Date.now()}`;
        const newMockTrack: CollegeTrackDto = {
          id: mockTrackId,
          collegeId: "col-sistec-01",
          departmentId: cseDept?.id || "dept-cse-01",
          name: newTrackName.trim(),
          academicYear: "AY 2025–2026",
          participationMode: newTrackParticipationMode,
          enrolmentMode: newTrackEnrolmentMode,
          allowCrossBranchTeams: newTrackAllowCrossBranch,
          allowInterdisciplinaryTeams: true,
          isActive: true,
          guideWeightPct: 30,
          midTermWeightPct: 30,
          finalVivaWeightPct: 40,
          sharedProjectRubricPct: 60,
          individualStudentRubricPct: 40,
        };
        setDepartmentTracks((prev) => [newMockTrack, ...prev]);
        setSelectedTrackId(mockTrackId);
      }

      showToast(`Track "${newTrackName}" launched (${newTrackParticipationMode} Mode, ${newTrackEnrolmentMode} Enrolment)!`);
      setShowLaunchTrackModal(false);
    } catch (err) {
      console.error(err);
      showToast("Failed to launch academic track.");
    } finally {
      setIsLaunchingTrack(false);
    }
  };

  const openLaunchTrackModal = () => {
    setTrackTitleManuallyEdited(false);
    const defaultSem = activeCohort === "major" ? 7 : 6;
    const termForSem = allSemesters.find((st) => st.semesterNumber === defaultSem);
    if (termForSem) {
      handleSemesterChange(termForSem.id);
    } else {
      handleSemesterChange(`sem-cse-${defaultSem}`);
    }
    setShowLaunchTrackModal(true);
  };

  // Tab titles and metadata
  const tabConfigs: Record<
    string,
    { title: string; breadcrumb: string; label: string }
  > = {
    overview: {
      title: "Department Executive Overview",
      breadcrumb: "HOD Console • Computer Science & Engineering",
      label: "Overview",
    },
    approvals: {
      title: "HOD Approvals & Endorsements",
      breadcrumb: "HOD Console • Computer Science & Engineering",
      label: "Approvals Queue",
    },
    nba: {
      title: "NBA Criterion 2 & 3 Accreditation Dossier",
      breadcrumb: "HOD Console • Computer Science & Engineering",
      label: "NBA Criterion 2 & 3",
    },
    faculty: {
      title: "Department Faculty Roster & Authorities",
      breadcrumb: "HOD Console • Computer Science & Engineering",
      label: "Faculty Setup",
    },
  };

  const currentTabConfig = tabConfigs[activeTab] || tabConfigs.overview;

  useDashboardHeader({
    title: currentTabConfig.title,
    breadcrumb: currentTabConfig.breadcrumb,
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-[#111827] px-4 py-2.5 text-xs font-medium text-white shadow-xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 stroke-[1.75]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: EXECUTIVE OVERVIEW                                                 */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Executive Department Header & Dynamic Track Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                <h2 className="text-base font-bold font-heading text-[#0F172A] tracking-tight">
                  Department of Computer Science &amp; Engineering
                </h2>
                <Badge variant="neutral" size="sm">
                  AY 2025–2026
                </Badge>
                <Badge
                  variant={selectedTrack.participationMode === "Individual" ? "info" : "success"}
                  size="sm"
                  dot
                >
                  {selectedTrack.participationMode === "Individual"
                    ? "Individual Solo Track (1 Member)"
                    : "Team Track (3–4 Members)"}
                </Badge>
                {selectedTrack.allowCrossBranchTeams && (
                  <Badge variant="neutral" size="sm">
                    Cross-Branch Permitted
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[#64748B]">
                Head of Department: <span className="font-semibold text-[#0F172A]">Dr. Ravindra Kumar Sharma</span> • 420 Undergraduates • 34 Faculty Mentors
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Dynamic Track Switcher Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0] shrink-0 overflow-x-auto max-w-full">
                {activeTrackList.map((track) => {
                  const isSelected = track.id === selectedTrack.id;
                  const countLabel =
                    track.participationMode === "Individual"
                      ? `${track.teamCount} Students`
                      : `${track.teamCount} Teams`;

                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => setSelectedTrackId(track.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? "bg-white text-[#0F172A] shadow-xs"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      {track.name} ({countLabel})
                    </button>
                  );
                })}
              </div>

              {/* Launch Academic Track Button */}
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                onClick={openLaunchTrackModal}
              >
                Launch Track
              </Button>
            </div>
          </div>

          {/* 4 Unified Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                    {selectedTrack.name} Scope
                  </span>
                  <div className="text-xl font-bold font-heading text-[#0F172A] tabular-nums">
                    {selectedTrack.participationMode === "Individual"
                      ? `${selectedTrack.teamCount} Students`
                      : `${selectedTrack.teamCount} Teams`}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    {selectedTrack.participationMode === "Individual"
                      ? `${selectedTrack.studentCount} Solo Registrations`
                      : `${selectedTrack.studentCount} Students Enrolled`}
                  </span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <FileCheck2 className="h-4 w-4 stroke-[1.75]" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                    Academic Track
                  </span>
                  <div className="text-xl font-bold font-heading text-[#0F172A] tabular-nums truncate max-w-[170px]" title={selectedTrack.name}>
                    {selectedTrack.name}
                  </div>
                  <span className="text-[11px] text-slate-600 font-medium">
                    {selectedTrack.participationMode === "Individual" ? "Solo Project Track" : "Continuous Evaluation"}
                  </span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-4 w-4 stroke-[1.75]" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                    Pending HOD Endorsements
                  </span>
                  <div className="text-xl font-bold font-heading text-amber-700 tabular-nums">
                    {activeCohort === "minor" ? `${pendingHODTeams.length} Batch` : "2 Batches"}
                  </div>
                  <span className="text-[11px] text-amber-700 font-medium">
                    Awaiting HOD Sign-Off
                  </span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-4 w-4 stroke-[1.75]" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                    Guide Capacity Balance
                  </span>
                  <div className="text-xl font-bold font-heading text-emerald-700 tabular-nums">
                    {activeCohort === "minor" ? "100% Balanced" : "96% Balanced"}
                  </div>
                  <span className="text-[11px] text-slate-600">
                    {activeCohort === "minor" ? "Avg 2.4 teams / guide" : "Avg 3.2 teams / guide"}
                  </span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Users2 className="h-4 w-4 stroke-[1.75]" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Batch Lifecycle Funnel with Verified Stage Sum Math */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Department Project Lifecycle Funnel</CardTitle>
                <CardDescription>
                  State distribution of {activeCohort === "minor" ? "Minor (Sem 6)" : "Major (Sem 8)"} teams advancing from initial proposal to locked NBA attainment.
                </CardDescription>
              </div>
              <Badge variant="neutral" size="sm">
                Total: {activeCohort === "minor" ? "24 Teams (100% Accounted)" : "32 Teams (100% Accounted)"}
              </Badge>
            </CardHeader>
            <CardContent>
              {activeCohort === "minor" ? (
                /* Minor: 2 + 3 + 2 + 1 + 14 + 2 = 24 */
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">1. Draft</div>
                    <div className="text-xl font-bold font-heading text-[#0F172A] tabular-nums mt-1">2</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">8.3% of cohort</div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="text-[10px] text-amber-800 uppercase font-bold tracking-wider">2. Guide Review</div>
                    <div className="text-xl font-bold font-heading text-amber-900 tabular-nums mt-1">3</div>
                    <div className="text-[10px] text-amber-700 mt-0.5">12.5% of cohort</div>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="text-[10px] text-blue-800 uppercase font-bold tracking-wider">3. Coordinator</div>
                    <div className="text-xl font-bold font-heading text-blue-900 tabular-nums mt-1">2</div>
                    <div className="text-[10px] text-blue-700 mt-0.5">8.3% of cohort</div>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                    <div className="text-[10px] text-purple-800 uppercase font-bold tracking-wider">4. HOD Queue</div>
                    <div className="text-xl font-bold font-heading text-purple-900 tabular-nums mt-1">1</div>
                    <div className="text-[10px] text-purple-700 mt-0.5">4.2% of cohort</div>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider">5. Active Build</div>
                    <div className="text-xl font-bold font-heading text-emerald-900 tabular-nums mt-1">14</div>
                    <div className="text-[10px] text-emerald-700 mt-0.5">58.3% of cohort</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-100 border border-slate-300">
                    <div className="text-[10px] text-slate-800 uppercase font-bold tracking-wider">6. Completed</div>
                    <div className="text-xl font-bold font-heading text-slate-900 tabular-nums mt-1">2</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">8.3% of cohort</div>
                  </div>
                </div>
              ) : (
                /* Major: 3 + 4 + 3 + 2 + 18 + 2 = 32 */
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">1. Draft</div>
                    <div className="text-xl font-bold font-heading text-[#0F172A] tabular-nums mt-1">3</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">9.4% of cohort</div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="text-[10px] text-amber-800 uppercase font-bold tracking-wider">2. Guide Review</div>
                    <div className="text-xl font-bold font-heading text-amber-900 tabular-nums mt-1">4</div>
                    <div className="text-[10px] text-amber-700 mt-0.5">12.5% of cohort</div>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="text-[10px] text-blue-800 uppercase font-bold tracking-wider">3. Coordinator</div>
                    <div className="text-xl font-bold font-heading text-blue-900 tabular-nums mt-1">3</div>
                    <div className="text-[10px] text-blue-700 mt-0.5">9.4% of cohort</div>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                    <div className="text-[10px] text-purple-800 uppercase font-bold tracking-wider">4. HOD Queue</div>
                    <div className="text-xl font-bold font-heading text-purple-900 tabular-nums mt-1">2</div>
                    <div className="text-[10px] text-purple-700 mt-0.5">6.3% of cohort</div>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider">5. Active Build</div>
                    <div className="text-xl font-bold font-heading text-emerald-900 tabular-nums mt-1">18</div>
                    <div className="text-[10px] text-emerald-700 mt-0.5">56.3% of cohort</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-100 border border-slate-300">
                    <div className="text-[10px] text-slate-800 uppercase font-bold tracking-wider">6. Completed</div>
                    <div className="text-xl font-bold font-heading text-slate-900 tabular-nums mt-1">2</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">6.3% of cohort</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Guide Workload Distribution Table with Slim Emerald Utilization Bars */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Faculty Guide Workload Matrix</CardTitle>
                <CardDescription>
                  Faculty mentorship capacity allocation across Minor &amp; Major capstone projects.
                </CardDescription>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push("/hod/faculty")}
                leftIcon={<Users2 className="h-3.5 w-3.5 stroke-[1.75]" />}
              >
                Manage Faculty Roster
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Faculty Member</th>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Designation</th>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Assigned Teams</th>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Max Quota</th>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Role Authority</th>
                    <th className="py-2.5 px-4 text-right font-semibold text-[11px] uppercase tracking-[0.06em]">Capacity Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                  {facultyRoster.map((f) => {
                    const percentage = Math.min(100, Math.round((f.guidedCount / f.maxTeams) * 100));
                    return (
                      <tr key={f.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-[#0F172A]">{f.name}</td>
                        <td className="py-2.5 px-4 text-[#64748B]">{f.designation}</td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700">{f.guidedCount} Teams</td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500">{f.maxTeams} Teams</td>
                        <td className="py-2.5 px-4">
                          {f.isProjectCoordinator ? (
                            <Badge variant="warning" size="sm" dot>
                              Project Coordinator
                            </Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">
                              Base Faculty
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-primary rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="font-mono font-medium tabular-nums text-brand-primary text-xs w-9 text-right">
                              {percentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: APPROVALS QUEUE                                                    */}
      {/* ========================================================================= */}
      {activeTab === "approvals" && (
        <div className="space-y-4">
          {/* Sub-Queue Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex gap-1.5 p-1 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0] overflow-x-auto">
              <button
                type="button"
                onClick={() => setApprovalSubTab("allotments")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  approvalSubTab === "allotments"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Awaiting HOD Sign-Off ({pendingHODTeams.length})
              </button>
              <button
                type="button"
                onClick={() => setApprovalSubTab("proposals")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  approvalSubTab === "proposals"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Pipeline Overview ({allPendingApprovals.length})
              </button>
              <button
                type="button"
                onClick={() => setApprovalSubTab("unlocks")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  approvalSubTab === "unlocks"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Grade Unlock Requests ({unlockRejected ? "0" : "1"})
              </button>
              <button
                type="button"
                onClick={() => setApprovalSubTab("overrides")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  approvalSubTab === "overrides"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Exception Overrides ({pendingOverrides.length})
              </button>
              <button
                type="button"
                onClick={() => setApprovalSubTab("results")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  approvalSubTab === "results"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Semester Results
              </button>
            </div>

            {selectedTeamIds.length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in duration-150">
                <span className="text-xs font-semibold text-slate-700">
                  {selectedTeamIds.length} Teams Selected
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleBulkSignOff}
                  leftIcon={<Check className="h-3.5 w-3.5 stroke-[2]" />}
                >
                  Bulk Sign-Off Selected
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedTeamIds([])}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>

          {/* Allotment & Proposal Queue Table */}
          {approvalSubTab === "allotments" || approvalSubTab === "proposals" ? (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-500">
                    <tr>
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={
                            (approvalSubTab === "allotments" ? pendingHODTeams : allPendingApprovals).length > 0 &&
                            selectedTeamIds.length === (approvalSubTab === "allotments" ? pendingHODTeams : allPendingApprovals).length
                          }
                          onChange={(e) => {
                            const currentList = approvalSubTab === "allotments" ? pendingHODTeams : allPendingApprovals;
                            if (e.target.checked) {
                              setSelectedTeamIds(currentList.map((t) => t.id));
                            } else {
                              setSelectedTeamIds([]);
                            }
                          }}
                          className="rounded text-brand-primary accent-brand-primary cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Team Code</th>
                      <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Project Title</th>
                      <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Domain &amp; SDG</th>
                      <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Proposed Guide</th>
                      <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Current State</th>
                      <th className="py-3 px-4 text-right font-semibold text-[11px] uppercase tracking-[0.06em]">HOD Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                    {(approvalSubTab === "allotments" ? pendingHODTeams : allPendingApprovals).map(
                      (team) => (
                        <tr key={team.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedTeamIds.includes(team.id)}
                              onChange={() => toggleSelectTeam(team.id)}
                              className="rounded text-brand-primary accent-brand-primary cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-brand-primary">
                            {team.teamCode}
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-semibold text-[#0F172A] truncate">{team.title}</div>
                            <div className="text-[11px] text-[#64748B] truncate mt-0.5">{team.abstract}</div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="sdg" sdgNumber={team.sdgNumber} size="sm">
                              {team.domain}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {team.guideName || "Unassigned"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="warning" size="sm" dot>
                              {team.state}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setInspectingTeam(team)}
                                leftIcon={<Eye className="h-3.5 w-3.5 stroke-[1.75]" />}
                              >
                                Inspect
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setReturnModalTeam(team);
                                  setReturnRemarks("");
                                }}
                                className="text-amber-700 hover:bg-amber-50"
                              >
                                Return
                              </Button>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  approveProposal(team.id, "HOD");
                                  showToast(`Signed off proposal for team ${team.teamCode}.`);
                                }}
                                leftIcon={<Check className="h-3.5 w-3.5 stroke-[2]" />}
                              >
                                Sign-Off
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>

                {(approvalSubTab === "allotments" ? pendingHODTeams : allPendingApprovals).length ===
                  0 && (
                  <div className="p-8">
                    <EmptyState
                      title="No Pending Proposals"
                      description="All student capstone proposals have been reviewed and signed off by the HOD."
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ) : approvalSubTab === "unlocks" ? (
            /* Grade Unlock Requests Queue */
            <Card>
              <CardHeader>
                <CardTitle>Post-Lock Grade Correction Requests</CardTitle>
                <CardDescription>
                  Faculty evaluation appeals requiring HOD approval to adjust locked rubric scores.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!unlockRejected ? (
                  <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#0F172A]">
                          Team 2026-CS-MIN-01: Smart IoT Energy Monitoring for Labs
                        </span>
                        <Badge variant="warning" size="sm">
                          Mid-Term Viva Rubric
                        </Badge>
                      </div>
                      <p className="text-xs text-[#475569]">
                        Requested by: <span className="font-semibold text-slate-800">Prof. Priya Nair</span> • Reason:{" "}
                        <em className="text-slate-700">&ldquo;Hardware sensor code demo marks were transcribed as 13/15 instead of 15/15.&rdquo;</em>
                      </p>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Submission ID: req-unlock-8821 • Requested 4 hours ago
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          approveGradeUnlock("eval-01");
                          setUnlockRejected(true);
                          showToast("Rubric grade unlocked for Prof. Priya Nair.");
                        }}
                        leftIcon={<Unlock className="h-3.5 w-3.5 stroke-[1.75]" />}
                      >
                        Authorize Unlock
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          rejectGradeUnlock("eval-01");
                          setUnlockRejected(true);
                          showToast("Grade unlock request rejected.");
                        }}
                      >
                        Reject Request
                      </Button>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="No Active Grade Correction Requests"
                    description="All mid-term and final defense rubric marks are securely finalized."
                  />
                )}
              </CardContent>
            </Card>
          ) : approvalSubTab === "overrides" ? (
            /* Mid-Term Administrative Exception Overrides Queue */
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Mid-Term Administrative Exception Overrides</CardTitle>
                  <CardDescription>
                    Governance exception requests submitted by Project Coordinator (Prof. Priya Nair) requiring HOD sign-off.
                  </CardDescription>
                </div>
                <Badge variant={pendingOverrides.length > 0 ? "warning" : "neutral"} size="sm" dot={pendingOverrides.length > 0}>
                  {pendingOverrides.length} Pending Actions
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingOverrides.length === 0 ? (
                  <EmptyState
                    title="No Pending Exception Overrides"
                    description="All coordinator exception requests have been audited and resolved."
                  />
                ) : (
                  pendingOverrides.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-brand-primary">
                            {log.teamCode}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {log.description}
                          </span>
                          <Badge variant="neutral" size="sm">
                            {log.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-700">
                          <strong>Audit Reason:</strong> &ldquo;{log.reason}&rdquo;
                        </p>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Requested by: {log.requestedBy} • {new Date(log.requestedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            reviewExceptionOverride(log.id, "Approved");
                            showToast(`Override approved for ${log.teamCode}`);
                          }}
                          leftIcon={<Check className="h-3.5 w-3.5 stroke-[2]" />}
                        >
                          Endorse &amp; Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            reviewExceptionOverride(log.id, "Rejected", "Rejected by HOD");
                            showToast(`Override rejected for ${log.teamCode}`);
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : (
            /* Consolidated Results Sub-Tab */
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Consolidated Student Marksheet &amp; Letter Grades</CardTitle>
                  <CardDescription>
                    Cumulative internal assessments, continuous guide reviews, and external viva scores feeding NBA SAR Criterion 3.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => showToast("Exporting CSE consolidated marksheet as CSV...")}
                  leftIcon={<Download className="h-3.5 w-3.5 stroke-[1.75]" />}
                >
                  Export Marksheet CSV
                </Button>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-500">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">University USN</th>
                      <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Student Name</th>
                      <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Team Code</th>
                      <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Guide Score (/30)</th>
                      <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Defense (/50)</th>
                      <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Total (/100)</th>
                      <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Letter Grade</th>
                      <th className="py-2.5 px-4 text-right font-semibold text-[11px] uppercase tracking-[0.06em]">NBA Attainment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A] font-mono tabular-nums">
                    {[
                      { usn: "0176CS221045", name: "Shivansh Mehra", team: "2026-CS-MIN-01", guide: 28.5, viva: 44.5, total: 89.0, grade: "A+", nba: "Met (High)" },
                      { usn: "0176CS221002", name: "Aarav Sharma", team: "2026-CS-MIN-01", guide: 27.0, viva: 43.0, total: 86.0, grade: "A+", nba: "Met (High)" },
                      { usn: "0176CS221021", name: "Diya Patel", team: "2026-CS-MIN-01", guide: 26.5, viva: 42.0, total: 84.5, grade: "A", nba: "Met (Target)" },
                      { usn: "0176CS221038", name: "Rohan Gupta", team: "2026-CS-MIN-02", guide: 25.0, viva: 39.5, total: 79.0, grade: "B+", nba: "Met (Target)" },
                      { usn: "0176CS221049", name: "Sanya Saxena", team: "2026-CS-MIN-02", guide: 28.0, viva: 45.0, total: 91.0, grade: "O", nba: "Met (High)" },
                    ].map((row) => (
                      <tr key={row.usn} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-2.5 px-4 font-bold text-brand-primary">{row.usn}</td>
                        <td className="py-2.5 px-4 font-sans font-semibold text-[#0F172A]">{row.name}</td>
                        <td className="py-2.5 px-4 text-[#475569]">{row.team}</td>
                        <td className="py-2.5 px-4">{row.guide}</td>
                        <td className="py-2.5 px-4">{row.viva}</td>
                        <td className="py-2.5 px-4 font-bold text-[#0F172A]">{row.total}</td>
                        <td className="py-2.5 px-4 font-sans">
                          <Badge variant="neutral" size="sm">
                            {row.grade}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-right font-sans">
                          <Badge variant="success" size="sm" dot>
                            {row.nba}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: NBA CRITERION 2 & 3 DOSSIER                                        */}
      {/* ========================================================================= */}
      {activeTab === "nba" && (
        <div className="space-y-6">
          {/* Export Action & Attestation Status Card */}
          <div className="p-5 rounded-xl border border-brand-primary-border bg-brand-primary-tint flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-primary" />
                <h3 className="text-sm font-bold text-[#0F172A] font-heading">
                  NBA Accreditation Evidence Synthesis (SAR 2.2 &amp; 3.3)
                </h3>
                {isSARLocked ? (
                  <Badge variant="success" size="sm" dot>
                    Attested &amp; Locked
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm">
                    Pending HOD Attestation
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[#475569] max-w-2xl leading-relaxed">
                Direct evidence calculation of Course Outcomes (COs) mapped to Program Outcomes (PO1–PO12)
                and Program Specific Outcomes (PSOs). Generates the official audit sample package (3 Best, 3 Average, 3 Weak).
              </p>
              {isSARLocked && (
                <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1.5 pt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 stroke-[2]" />
                  <span>Dossier Attested by HOD Dr. Ravindra Kumar Sharma • Synchronized with College Admin Sign-Off Matrix</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {!isSARLocked && (
                <Button
                  size="md"
                  variant="secondary"
                  onClick={handleLockSAR}
                  leftIcon={<ShieldCheck className="h-4 w-4 text-emerald-700 stroke-[1.75]" />}
                  className="bg-white hover:bg-slate-50 border-emerald-200 text-emerald-800"
                >
                  Attest &amp; Lock Department SAR
                </Button>
              )}
              <Button
                size="md"
                variant="primary"
                onClick={() => setShowSampleZipModal(true)}
                leftIcon={<Download className="h-4 w-4 stroke-[1.75]" />}
              >
                Package 3 Best + 3 Avg + 3 Weak ZIP
              </Button>
            </div>
          </div>

          {/* Live CO-PO Attainment Matrix (80/20 AICTE/NBA Direct + Indirect Blend) */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Direct + Indirect CO–PO Attainment Matrix (80/20 AICTE/NBA Blend)</CardTitle>
                <CardDescription>
                  Blends continuous rubric evaluations (80% direct evidence) with longitudinal Course Exit Surveys (20% indirect student feedback).
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="neutral" size="sm">
                  {surveyCount} Survey{surveyCount === 1 ? "" : "s"} Collected
                </Badge>
                <Badge variant="success" size="sm" dot>
                  Blended Attainment: {(coAttainments.reduce((acc, c) => acc + c.blended, 0) / coAttainments.length).toFixed(1)}% (Target Met)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Course Outcome</th>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Mapped POs / PSOs</th>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Direct Rubrics (80%)</th>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Indirect Survey (20%)</th>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Blended Attainment</th>
                    <th className="py-2.5 px-4 text-right font-semibold text-[11px] uppercase tracking-[0.06em]">Accreditation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A] font-mono tabular-nums">
                  {coAttainments.map((co) => (
                    <tr key={co.code} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                        {co.code}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <div className="flex flex-wrap gap-1">
                          {co.pos.map((p) => (
                            <span key={p} className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">{co.direct}%</td>
                      <td className="py-3 px-4 font-bold text-slate-700">{co.indirect}%</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-brand-primary text-sm">{co.blended}%</span>
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        <Badge variant="success" size="sm" dot>
                          {co.blended >= 70 ? "Target Met (Level 3)" : "Sub-Target"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Multi-Year Department Project Archive Card */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Multi-Year Department Project Archive &amp; SAR Evidence</CardTitle>
                <CardDescription>
                  Search past Minor &amp; Major capstone batches with signed rubrics and university marksheets.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
                  <input
                    type="text"
                    placeholder="Search projects, stack..."
                    value={archiveSearch}
                    onChange={(e) => setArchiveSearch(e.target.value)}
                    className="h-8 pl-8 pr-2.5 text-xs rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <select
                  value={archiveBatch}
                  onChange={(e) => setArchiveBatch(e.target.value)}
                  className="h-8 text-xs rounded-lg border border-[#E2E8F0] bg-white px-2 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Batches</option>
                  <option value="2026">2026 (Minor Sem 6)</option>
                  <option value="2025">2025 (Major Sem 8)</option>
                  <option value="2024">2024 (Major Sem 8)</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Batch</th>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Team Code</th>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Project Title</th>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Faculty Guide</th>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Domain &amp; SDG</th>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Score</th>
                    <th className="py-2.5 px-4 text-right font-semibold text-[11px] uppercase tracking-[0.06em]">SAR Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                  {[
                    { batch: "2026 Minor", code: "2026-CS-MIN-01", title: "Smart IoT Energy Monitoring for Labs", guide: "Prof. S. K. Verma", domain: "IoT (SDG 7)", score: "89.0%", status: "Active Audit" },
                    { batch: "2025 Major", code: "2025-CS-MAJ-04", title: "Automated Solar Microgrid with MPPT Tracking", guide: "Prof. S. K. Verma", domain: "Energy (SDG 7)", score: "92.0%", status: "Best Project" },
                    { batch: "2025 Major", code: "2025-CS-MAJ-11", title: "Contrastive Learning Chest X-Ray Diagnostics", guide: "Dr. Amit Rawat", domain: "Health (SDG 3)", score: "88.5%", status: "IEEE Published" },
                    { batch: "2024 Major", code: "2024-CS-MAJ-08", title: "Warehouse AGV Robot with 2D LiDAR SLAM", guide: "Prof. Priya Nair", domain: "Robotics (SDG 9)", score: "88.0%", status: "Dossier Archived" },
                    { batch: "2024 Major", code: "2024-CS-MAJ-19", title: "Decentralized University Credential Verification", guide: "Dr. R. K. Sharma", domain: "Web3 (SDG 9)", score: "84.0%", status: "Dossier Archived" },
                  ]
                    .filter((item) => {
                      if (archiveBatch !== "ALL" && !item.batch.includes(archiveBatch)) return false;
                      if (archiveSearch && !item.title.toLowerCase().includes(archiveSearch.toLowerCase()) && !item.code.toLowerCase().includes(archiveSearch.toLowerCase())) return false;
                      return true;
                    })
                    .map((item) => (
                      <tr key={item.code} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#64748B]">{item.batch}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-brand-primary">{item.code}</td>
                        <td className="py-2.5 px-4 font-semibold max-w-xs truncate">{item.title}</td>
                        <td className="py-2.5 px-4 text-[#475569]">{item.guide}</td>
                        <td className="py-2.5 px-4 text-[#64748B]">{item.domain}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">{item.score}</td>
                        <td className="py-2.5 px-4 text-right">
                          <Badge variant="success" size="sm">
                            {item.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FACULTY SETUP & COORDINATOR TOGGLES                                 */}
      {/* ========================================================================= */}
      {activeTab === "faculty" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Department Faculty Roster &amp; Coordinator Authorities</CardTitle>
              <CardDescription>
                Assign project coordinator privileges, configure max team guiding capacity, and expand faculty rosters.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowAddFacultyModal(true)}
              leftIcon={<Plus className="h-3.5 w-3.5 stroke-[2]" />}
            >
              + Add Faculty Member
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Faculty Name</th>
                  <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Institutional Email</th>
                  <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Designation</th>
                  <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Max Team Capacity</th>
                  <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Project Coordinator Authority</th>
                  <th className="py-3 px-4 text-right font-semibold text-[11px] uppercase tracking-[0.06em]">Role Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                {facultyRoster.map((fac) => (
                  <tr key={fac.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#0F172A]">{fac.name}</td>
                    <td className="py-3 px-4 font-mono text-[#64748B]">{fac.email}</td>
                    <td className="py-3 px-4 text-[#475569]">{fac.designation}</td>
                    <td className="py-3 px-4">
                      {/* Inline Stepper for Max Teams */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateFacultyCapacity(fac.id, -1)}
                          disabled={fac.maxTeams <= 1}
                          className="h-6 w-6 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                        >
                          <Minus className="h-3 w-3 stroke-[2]" />
                        </button>
                        <span className="font-mono font-bold text-xs text-slate-800 w-16 text-center tabular-nums">
                          {fac.maxTeams} Teams
                        </span>
                        <button
                          type="button"
                          onClick={() => updateFacultyCapacity(fac.id, 1)}
                          disabled={fac.maxTeams >= 10}
                          className="h-6 w-6 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                        >
                          <Plus className="h-3 w-3 stroke-[2]" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {/* Interactive Switch Toggle */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleFacultyCoordinator(fac.id)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            fac.isProjectCoordinator ? "bg-brand-primary" : "bg-[#CBD5E1]"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              fac.isProjectCoordinator ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span className="text-[11px] font-medium text-[#475569]">
                          {fac.isProjectCoordinator ? "Coordinator (ON)" : "Guide Only"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {fac.isProjectCoordinator ? (
                        <Badge variant="warning" size="sm" dot>
                          Project Coordinator
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Base Faculty
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Inspect Team Slide-Over Drawer */}
      <SlideOverDrawer
        isOpen={!!inspectingTeam}
        onClose={() => setInspectingTeam(null)}
        title={inspectingTeam?.teamCode}
        subtitle="HOD Capstone Proposal Allotment Review"
        badge={
          inspectingTeam && (
            <Badge variant="warning" size="sm" dot>
              {inspectingTeam.state}
            </Badge>
          )
        }
        footer={
          inspectingTeam && (
            <div className="flex items-center justify-between w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReturnModalTeam(inspectingTeam);
                  setReturnRemarks("");
                  setInspectingTeam(null);
                }}
                className="text-amber-700 hover:bg-amber-50"
              >
                Return with Remarks
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  approveProposal(inspectingTeam.id, "HOD");
                  showToast(`Signed off allotment for ${inspectingTeam.teamCode}`);
                  setInspectingTeam(null);
                }}
                leftIcon={<Check className="h-3.5 w-3.5 stroke-[2]" />}
              >
                Sign Off Allotment
              </Button>
            </div>
          )
        }
      >
        {inspectingTeam && (
          <div className="space-y-5">
            <div>
              <h4 className="text-sm font-bold font-heading text-[#0F172A]">{inspectingTeam.title}</h4>
              <p className="text-xs text-[#475569] mt-1.5 leading-relaxed">
                {inspectingTeam.abstract}
              </p>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Project Domain:</span>
                <span className="font-semibold text-[#0F172A]">{inspectingTeam.domain}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">UN SDG Target:</span>
                <Badge variant="sdg" sdgNumber={inspectingTeam.sdgNumber} size="sm">
                  SDG {inspectingTeam.sdgNumber}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Proposed Faculty Mentor:</span>
                <span className="font-semibold text-brand-primary">{inspectingTeam.guideName}</span>
              </div>
            </div>

            {/* Endorsement Audit Notes */}
            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200/60 space-y-2 text-xs">
              <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 stroke-[2]" />
                <span>Faculty Guide Endorsement</span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                &ldquo;Feasibility and technical architecture reviewed. Sensor telemetry and embedded firmware verified feasible within laboratory quota.&rdquo;
              </p>
              <div className="text-[10px] text-slate-500 font-mono">
                Endorsed by {inspectingTeam.guideName} • AY 2025–26 Sem 6
              </div>
            </div>

            <div className="space-y-2.5">
              <h5 className="text-xs font-bold font-heading text-[#0F172A]">Enrolled Student Members:</h5>
              <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-lg bg-white">
                {inspectingTeam.members.map((m) => (
                  <div key={m.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                        <span>{m.name}</span>
                        {m.isLead && (
                          <Badge variant="neutral" size="sm">
                            Team Lead
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-[#64748B] mt-0.5">{m.roleDescription}</div>
                    </div>
                    <span className="font-mono text-xs tabular-nums text-[#475569] font-medium">
                      {m.enrollmentNumber}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* Return for Revision Modal */}
      {returnModalTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 stroke-[2]" />
                <h3 className="text-sm font-bold font-heading text-slate-900">
                  Return Proposal for Revision
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReturnModalTeam(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="mt-4 space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-700">Team Code:</span>
                <span className="ml-2 font-mono text-xs font-bold text-brand-primary">
                  {returnModalTeam.teamCode}
                </span>
                <p className="text-xs text-slate-600 mt-1 font-medium">{returnModalTeam.title}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  HOD Revision Remarks &amp; Action Items
                </label>
                <textarea
                  required
                  rows={4}
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  placeholder="e.g. Please refine the edge compute block diagram and detail the sensor data collection rubric before final sign-off."
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setReturnModalTeam(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="bg-amber-700 hover:bg-amber-800"
                >
                  Return to Coordinator
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NBA 3 Best + 3 Avg + 3 Weak ZIP Modal */}
      {showSampleZipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-brand-primary stroke-[1.75]" />
                <h3 className="text-sm font-bold font-heading text-slate-900">
                  NBA SAR Criterion 2.2 &amp; 3.3 Sample Portfolio Package
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSampleZipModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              In accordance with NBA Peer Team guidelines, this archive packages exactly 9 representative project dossiers across top, middle, and remedial tiers with complete evaluation rubrics and signed examiner marksheets.
            </p>

            <div className="mt-4 space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {/* 3 Best */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 stroke-[2]" />
                    3 Best Projects (Score &gt;= 85%)
                  </span>
                  <Badge variant="success" size="sm">Tier 1 • High Attainment</Badge>
                </div>
                <div className="space-y-1.5">
                  {[
                    { code: "2025-CS-MAJ-04", title: "Automated Solar Microgrid with MPPT Tracking", guide: "Prof. S. K. Verma", score: "92.0%", tag: "Best Project Award" },
                    { code: "2026-CS-MIN-01", title: "Smart IoT Energy Monitoring for Labs", guide: "Prof. Priya Nair", score: "89.0%", tag: "Smart Campus Pilot" },
                    { code: "2025-CS-MAJ-11", title: "Contrastive Learning Chest X-Ray Diagnostics", guide: "Dr. Amit Rawat", score: "88.5%", tag: "IEEE Published" },
                  ].map((p) => (
                    <div key={p.code} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-900">
                          <span className="font-mono text-brand-primary font-bold mr-1.5">{p.code}:</span>
                          {p.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Guide: {p.guide} • {p.tag}</div>
                      </div>
                      <span className="font-mono font-bold text-emerald-700">{p.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3 Average */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-500" />
                    3 Average Projects (Score 70% – 84%)
                  </span>
                  <Badge variant="neutral" size="sm">Tier 2 • Target Attainment</Badge>
                </div>
                <div className="space-y-1.5">
                  {[
                    { code: "2024-CS-MAJ-08", title: "Warehouse AGV Robot with 2D LiDAR SLAM", guide: "Prof. Priya Nair", score: "78.0%", tag: "Hardware Tested" },
                    { code: "2025-CS-MAJ-19", title: "Decentralized University Credential Verification", guide: "Dr. R. K. Sharma", score: "76.5%", tag: "Prototype Verified" },
                    { code: "2026-CS-MIN-02", title: "Distributed Log Analytics Engine", guide: "Dr. Manisha Sharma", score: "75.0%", tag: "Rubrics Met" },
                  ].map((p) => (
                    <div key={p.code} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-900">
                          <span className="font-mono text-brand-primary font-bold mr-1.5">{p.code}:</span>
                          {p.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Guide: {p.guide} • {p.tag}</div>
                      </div>
                      <span className="font-mono font-bold text-slate-800">{p.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3 Weak / Remedial */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3 text-amber-600 stroke-[2]" />
                    3 Weak / Remediated Projects (Score &lt; 70%)
                  </span>
                  <Badge variant="warning" size="sm">Tier 3 • Remediated</Badge>
                </div>
                <div className="space-y-1.5">
                  {[
                    { code: "2024-CS-MAJ-22", title: "Micro-Atmospheric Weather Station", guide: "Prof. S. K. Verma", score: "62.0%", tag: "Remedial Viva Log Attached" },
                    { code: "2025-CS-MAJ-27", title: "Campus Parking Slot Sensor Network", guide: "Prof. Priya Nair", score: "60.5%", tag: "Re-evaluated Prototype" },
                    { code: "2024-CS-MAJ-31", title: "Automated Library Book Sorter", guide: "Dr. Amit Rawat", score: "58.0%", tag: "Continuous Remediation Log" },
                  ].map((p) => (
                    <div key={p.code} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-900">
                          <span className="font-mono text-brand-primary font-bold mr-1.5">{p.code}:</span>
                          {p.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Guide: {p.guide} • {p.tag}</div>
                      </div>
                      <span className="font-mono font-bold text-amber-800">{p.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSampleZipModal(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={zipPackaging}
                onClick={handleDownloadZip}
                leftIcon={<Download className="h-3.5 w-3.5 stroke-[1.75]" />}
              >
                {zipSuccess ? "Downloaded NBA-Audit-Dossier.zip" : "Download Formatted NBA Sample Archive (.zip)"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Faculty Member Modal */}
      {showAddFacultyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users2 className="h-4 w-4 text-brand-primary stroke-[1.75]" />
                <h3 className="text-sm font-bold font-heading text-slate-900">
                  Add Faculty to CSE Department Roster
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddFacultyModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddFacultySubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Faculty Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Sneha Roy"
                  value={newFacultyForm.name}
                  onChange={(e) => setNewFacultyForm({ ...newFacultyForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sneha.roy@sistec.ac.in"
                  value={newFacultyForm.email}
                  onChange={(e) => setNewFacultyForm({ ...newFacultyForm, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation
                  </label>
                  <select
                    value={newFacultyForm.designation}
                    onChange={(e) => setNewFacultyForm({ ...newFacultyForm, designation: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:border-brand-primary cursor-pointer"
                  >
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Professor">Professor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Team Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={newFacultyForm.maxTeams}
                    onChange={(e) => setNewFacultyForm({ ...newFacultyForm, maxTeams: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddFacultyModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5 stroke-[2]" />}
                >
                  Add to Roster
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Launch Academic Track Modal */}
      <Modal
        isOpen={showLaunchTrackModal}
        onClose={() => setShowLaunchTrackModal(false)}
        title="Launch Academic Project Track"
        description="Configure semester offering, project course type, student team vs individual solo mode, and enrolment rules for this academic cohort."
        maxWidth="lg"
      >
        <form onSubmit={handleLaunchTrackSubmit} className="space-y-4 text-xs">
          {/* Track Title */}
          <Input
            label="Academic Track Title"
            value={newTrackName}
            onChange={(e) => {
              setNewTrackName(e.target.value);
              setTrackTitleManuallyEdited(true);
            }}
            placeholder="e.g. Minor Project (Semester 6)"
            required
          />

          {/* Academic Semester Term & Subject Offering Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Academic Semester Term"
              value={
                allSemesters.find(
                  (st) => st.id === newTrackSemesterTermId || st.semesterNumber === newTrackSemesterNum
                )?.id || newTrackSemesterTermId
              }
              onChange={(e) => handleSemesterChange(e.target.value)}
              options={allSemesters.map((st) => ({
                label: `Semester ${st.semesterNumber} (${st.parity} Sem • ${st.academicSessionLabel || "AY 2025-26"})`,
                value: st.id,
              }))}
            />

            <Select
              label="Curriculum Project Offering"
              value={isCustomOffering ? CUSTOM_OFFERING_VALUE : newTrackSubjectOfferingId}
              onChange={(e) => handleOfferingChange(e.target.value)}
              options={[
                ...currentSemesterOfferings.map((so) => ({
                  label: `${so.subjectCode} - ${so.subjectName} (${so.credits} Credits • ${so.subjectType || "Project"})`,
                  value: so.id,
                })),
                {
                  label: "+ Add Custom Subject / Project Offering",
                  value: CUSTOM_OFFERING_VALUE,
                },
              ]}
            />
          </div>

          {/* Inline Custom Subject Fields when + Add Custom Subject is active */}
          {isCustomOffering && (
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Custom Curriculum Offering (Semester {newTrackSemesterNum})</span>
                </div>
                <span className="text-[10px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full font-medium">
                  Auto-Creates Offering & Term
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Input
                    label="Subject Code"
                    value={customSubjectCode}
                    onChange={(e) => setCustomSubjectCode(e.target.value)}
                    placeholder={`e.g. ${deptCode}-${newTrackSemesterNum}08`}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label="Subject / Offering Name"
                    value={customSubjectName}
                    onChange={(e) => setCustomSubjectName(e.target.value)}
                    placeholder="e.g. First-Year Mini Project (2 Credits)"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Participation Mode: Team vs Individual */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-900">
              Participation Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setNewTrackParticipationMode("Team")}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                  newTrackParticipationMode === "Team"
                    ? "border-emerald-600 bg-emerald-50/50 shadow-2xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="pt-0.5 text-emerald-700">
                  {newTrackParticipationMode === "Team" ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">
                    Team Mode (Default)
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Students collaborate in groups of 3–4 members with designated Team Lead and shared repository.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setNewTrackParticipationMode("Individual")}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                  newTrackParticipationMode === "Individual"
                    ? "border-emerald-600 bg-emerald-50/50 shadow-2xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="pt-0.5 text-emerald-700">
                  {newTrackParticipationMode === "Individual" ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">
                    Individual Mode (Solo Project)
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    1 student per capstone project. Teammate invitations are cleanly hidden in student workspace.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Enrolment Mode */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-900">
              Student Enrolment Workflow
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  mode: "SelfJoin" as const,
                  title: "Self-Join",
                  desc: "Students form groups and invite peers by University Roll / USN.",
                },
                {
                  mode: "CoordinatorAllotted" as const,
                  title: "Coordinator-Allotted",
                  desc: "Project Coordinator pre-allots teams and assignments centrally.",
                },
                {
                  mode: "Hybrid" as const,
                  title: "Hybrid",
                  desc: "Students propose teams, finalized upon coordinator review.",
                },
              ].map((m) => {
                const isSelected = newTrackEnrolmentMode === m.mode;
                return (
                  <div
                    key={m.mode}
                    onClick={() => setNewTrackEnrolmentMode(m.mode)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer space-y-1 ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/60 shadow-2xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {isSelected ? (
                        <CheckSquare className="h-3.5 w-3.5 text-emerald-700" />
                      ) : (
                        <Square className="h-3.5 w-3.5 text-slate-400" />
                      )}
                      <span className="font-bold text-slate-900 text-xs">{m.title}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 leading-tight">{m.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cross Branch Teaming & Proposal Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div
              onClick={() => setNewTrackAllowCrossBranch(!newTrackAllowCrossBranch)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                newTrackAllowCrossBranch
                  ? "border-emerald-600 bg-emerald-50/50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="pt-0.5 text-emerald-700">
                {newTrackAllowCrossBranch ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 text-xs">
                  Allow Cross-Branch Teams
                </span>
                <p className="text-[10px] text-slate-600 leading-snug">
                  Permit students across CSE, IT, AIML, EC, ME to collaborate on interdisciplinary solutions.
                </p>
              </div>
            </div>

            <div>
              <Input
                type="date"
                label="Proposal Submission Deadline"
                value={newTrackProposalDeadline}
                onChange={(e) => setNewTrackProposalDeadline(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowLaunchTrackModal(false)}
              disabled={isLaunchingTrack}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isLaunchingTrack}
              leftIcon={
                isLaunchingTrack ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                )
              }
            >
              {isLaunchingTrack ? "Launching Track..." : "Launch Academic Track"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
