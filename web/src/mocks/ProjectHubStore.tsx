"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  ArtifactSlot,
  College,
  CourseExitSurvey,
  Department,
  Evaluation,
  ExceptionAuditLog,
  GuideReviewStatusType,
  IndividualEvaluation,
  PilotRequest,
  PlatformAuditLog,
  ProblemBankIdea,
  ProjectArtifact,
  ProjectCycle,
  ProjectStateType,
  RoleType,
  Rubric,
  TaskItem,
  TaskStatusType,
  Team,
  TeamMember,
  TenantCollege,
  UserPersona,
  WeeklyLog,
} from "./store-types";
import {
  initialAuditLogs,
  initialCollege,
  initialCourseExitSurveys,
  initialCycle,
  initialDepartments,
  initialEvaluations,
  initialExceptionAuditLogs,
  initialIndividualEvaluations,
  initialPersonas,
  initialPilotRequests,
  initialProblemBank,
  initialRubrics,
  initialTeams,
  initialTenants,
} from "./seed-data";

export interface FacultyRosterItem {
  id: string;
  name: string;
  email: string;
  designation: string;
  isProjectCoordinator: boolean;
  maxTeams: number;
  guidedCount: number;
}

export const initialFacultyRoster: FacultyRosterItem[] = [
  {
    id: "usr-fac-verma",
    name: "Prof. S. K. Verma",
    email: "sk.verma@sistec.ac.in",
    designation: "Associate Professor",
    isProjectCoordinator: true,
    maxTeams: 4,
    guidedCount: 2,
  },
  {
    id: "usr-fac-nair",
    name: "Prof. Priya Nair",
    email: "priya.nair@sistec.ac.in",
    designation: "Assistant Professor",
    isProjectCoordinator: true,
    maxTeams: 4,
    guidedCount: 2,
  },
  {
    id: "usr-fac-rawat",
    name: "Dr. Amit Rawat",
    email: "amit.rawat@sistec.ac.in",
    designation: "Professor",
    isProjectCoordinator: false,
    maxTeams: 5,
    guidedCount: 3,
  },
  {
    id: "usr-fac-sharma-f",
    name: "Dr. Manisha Sharma",
    email: "manisha.sharma@sistec.ac.in",
    designation: "Associate Professor",
    isProjectCoordinator: true,
    maxTeams: 4,
    guidedCount: 1,
  },
];

interface ProjectHubStoreContextType {
  currentPersona: UserPersona;
  college: College;
  departments: Department[];
  cycle: ProjectCycle;
  teams: Team[];
  evaluations: Evaluation[];
  rubrics: Rubric[];
  problemBank: ProblemBankIdea[];
  facultyRoster: FacultyRosterItem[];
  tenants: TenantCollege[];
  pilotRequests: PilotRequest[];
  auditLogs: PlatformAuditLog[];
  individualEvaluations: IndividualEvaluation[];
  exceptionAuditLogs: ExceptionAuditLog[];
  courseExitSurveys: CourseExitSurvey[];
  isAuthenticated: boolean;
  // Actions
  logout: () => void;
  login: (persona?: UserPersona) => void;
  switchPersona: (role: RoleType) => void;
  toggleFacultyCoordinator: (facultyId: string) => void;
  approveProposal: (teamId: string, role: RoleType) => void;
  rejectProposal: (teamId: string, remarks: string) => void;
  assignGuide: (teamId: string, guideId: string) => void;
  bulkApproveProposals: (teamIds: string[]) => void;
  updateTaskStatus: (taskId: string, newStatus: TaskStatusType) => void;
  createTask: (teamId: string, title: string, tag: string, assigneeName: string, dueDate: string) => void;
  submitWeeklyLog: (
    teamId: string,
    accomplishments: string,
    blockers: string,
    plannedNextWeek: string,
    hours: number
  ) => void;
  reviewWeeklyLog: (logId: string, status: GuideReviewStatusType, remarks: string) => void;
  submitEvaluationScores: (evalId: string, scores: Record<string, number>, feedback: string) => void;
  lockEvaluation: (evalId: string) => void;
  requestGradeUnlock: (evalId: string, reason: string) => void;
  approveGradeUnlock: (evalId: string) => void;
  rejectGradeUnlock: (evalId: string) => void;
  addDepartment: (name: string, code: string, hodName?: string, studentCount?: number, facultyCount?: number) => void;
  reassignHOD: (deptId: string, newHodName: string) => void;
  lockDepartmentSAR: (deptCode: string) => void;
  updateFacultyCapacity: (facultyId: string, delta: number) => void;
  addFaculty: (faculty: Omit<FacultyRosterItem, "id" | "guidedCount">) => void;
  onboardCollege: (collegeData: Partial<College>) => void;
  onboardTenant: (tenantData: Omit<TenantCollege, "id">) => void;
  updateTenant: (id: string, updates: Partial<TenantCollege>) => void;
  approvePilot: (reqId: string) => void;
  addAuditLog: (entry: Omit<PlatformAuditLog, "id" | "timestamp">) => void;
  updateCycle: (cycleData: Partial<ProjectCycle>) => void;
  updateTeamRepo: (teamId: string, githubUrl: string, jiraUrl: string) => void;
  inviteTeamMember: (teamId: string, enrollmentNumber: string, name?: string) => void;
  postProblemIdea: (idea: Omit<ProblemBankIdea, "id" | "taken">) => void;
  uploadArtifact: (teamId: string, slot: ArtifactSlot, fileName: string, fileSize: string, similarityScore?: number) => void;
  continueProjectToNextTrack: (teamId: string, nextTrack?: "Major Phase-I" | "Major Phase-II") => Team;
  saveIndividualEvaluations: (teamId: string, evaluations: IndividualEvaluation[]) => void;
  submitExceptionOverride: (override: Omit<ExceptionAuditLog, "id" | "requestedAt" | "status">) => void;
  reviewExceptionOverride: (overrideId: string, decision: "Approved" | "Rejected", remarks?: string) => void;
  submitCourseExitSurvey: (survey: Omit<CourseExitSurvey, "id" | "submittedAt">) => void;
  resetToDefaults: () => void;
}

const ProjectHubStoreContext = createContext<ProjectHubStoreContextType | null>(null);

const STORAGE_KEY = "projecthub_campus_store_v3";

export const ProjectHubStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPersona, setCurrentPersona] = useState<UserPersona>(initialPersonas.studentLead);
  const [college, setCollege] = useState<College>(initialCollege);
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [cycle, setCycle] = useState<ProjectCycle>(initialCycle);
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [evaluations, setEvaluations] = useState<Evaluation[]>(initialEvaluations);
  const [rubrics, setRubrics] = useState<Rubric[]>(initialRubrics);
  const [problemBank, setProblemBank] = useState<ProblemBankIdea[]>(initialProblemBank);
  const [facultyRoster, setFacultyRoster] = useState<FacultyRosterItem[]>(initialFacultyRoster);
  const [tenants, setTenants] = useState<TenantCollege[]>(initialTenants);
  const [pilotRequests, setPilotRequests] = useState<PilotRequest[]>(initialPilotRequests);
  const [auditLogs, setAuditLogs] = useState<PlatformAuditLog[]>(initialAuditLogs);
  const [individualEvaluations, setIndividualEvaluations] = useState<IndividualEvaluation[]>(initialIndividualEvaluations);
  const [exceptionAuditLogs, setExceptionAuditLogs] = useState<ExceptionAuditLog[]>(initialExceptionAuditLogs);
  const [courseExitSurveys, setCourseExitSurveys] = useState<CourseExitSurvey[]>(initialCourseExitSurveys);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.currentPersona) setCurrentPersona(parsed.currentPersona);
        if (parsed.college) setCollege(parsed.college);
        if (parsed.departments) setDepartments(parsed.departments);
        if (parsed.cycle) setCycle(parsed.cycle);
        if (parsed.teams) setTeams(parsed.teams);
        if (parsed.evaluations) setEvaluations(parsed.evaluations);
        if (parsed.rubrics) setRubrics(parsed.rubrics);
        if (parsed.problemBank) setProblemBank(parsed.problemBank);
        if (parsed.facultyRoster) setFacultyRoster(parsed.facultyRoster);
        if (parsed.tenants) setTenants(parsed.tenants);
        if (parsed.pilotRequests) setPilotRequests(parsed.pilotRequests);
        if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);
        if (parsed.individualEvaluations) setIndividualEvaluations(parsed.individualEvaluations);
        if (parsed.exceptionAuditLogs) setExceptionAuditLogs(parsed.exceptionAuditLogs);
        if (parsed.courseExitSurveys) setCourseExitSurveys(parsed.courseExitSurveys);
      }
    } catch (e) {
      console.warn("Could not load from localStorage, using fresh seed data.", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage when state updates
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          currentPersona,
          college,
          departments,
          cycle,
          teams,
          evaluations,
          rubrics,
          problemBank,
          facultyRoster,
          tenants,
          pilotRequests,
          auditLogs,
          individualEvaluations,
          exceptionAuditLogs,
          courseExitSurveys,
        })
      );
    } catch (e) {
      console.error("Failed to save state to localStorage", e);
    }
  }, [
    isLoaded,
    currentPersona,
    college,
    departments,
    cycle,
    teams,
    evaluations,
    rubrics,
    problemBank,
    facultyRoster,
    tenants,
    pilotRequests,
    auditLogs,
    individualEvaluations,
    exceptionAuditLogs,
    courseExitSurveys,
  ]);

  // Actions
  const logout = () => {
    setIsAuthenticated(false);
  };

  const login = (persona?: UserPersona) => {
    if (persona) setCurrentPersona(persona);
    setIsAuthenticated(true);
  };

  const switchPersona = (role: RoleType) => {
    setIsAuthenticated(true);
    let target = initialPersonas.studentLead;
    if (role === "SuperAdmin") target = initialPersonas.superAdmin;
    else if (role === "CollegeAdmin") target = initialPersonas.collegeAdmin;
    else if (role === "HOD") target = initialPersonas.hod;
    else if (role === "Faculty") {
      // Check if current faculty has coordinator flag from facultyRoster
      const verma = facultyRoster.find((f) => f.id === "usr-fac-verma");
      target = {
        ...initialPersonas.facultyGuide,
        isProjectCoordinator: verma?.isProjectCoordinator ?? false,
      };
    } else if (role === "Student") target = initialPersonas.studentMember;
    else if (role === "TeamLead") target = initialPersonas.studentLead;

    setCurrentPersona(target);
  };

  const toggleFacultyCoordinator = (facultyId: string) => {
    setFacultyRoster((prev) =>
      prev.map((f) =>
        f.id === facultyId ? { ...f, isProjectCoordinator: !f.isProjectCoordinator } : f
      )
    );

    // If current persona is this faculty, update it dynamically
    setCurrentPersona((prev) => {
      if (prev.id === facultyId || (prev.role === "Faculty" && facultyId === "usr-fac-verma")) {
        return {
          ...prev,
          isProjectCoordinator: !prev.isProjectCoordinator,
        };
      }
      return prev;
    });
  };

  const approveProposal = (teamId: string, role: RoleType) => {
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        let nextState: ProjectStateType = t.state;

        if (role === "Faculty" || t.state === "PendingGuide") {
          nextState = "PendingCoordinator";
        } else if (t.state === "PendingCoordinator") {
          nextState = "PendingHOD";
        } else if (role === "HOD" || t.state === "PendingHOD") {
          nextState = "Active";
        }

        return {
          ...t,
          state: nextState,
          health: "Healthy",
        };
      })
    );
  };

  const rejectProposal = (teamId: string, remarks: string) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, state: "Draft", health: "NeedsReview" } : t))
    );
  };

  const assignGuide = (teamId: string, guideId: string) => {
    const guide = facultyRoster.find((f) => f.id === guideId);
    setTeams((prev) =>
      prev.map((t) =>
        t.id === teamId
          ? {
              ...t,
              guideId,
              guideName: guide?.name ?? "Assigned Faculty",
              state: t.state === "Draft" ? "PendingGuide" : t.state,
            }
          : t
      )
    );
  };

  const bulkApproveProposals = (teamIds: string[]) => {
    setTeams((prev) =>
      prev.map((t) => (teamIds.includes(t.id) ? { ...t, state: "Active", health: "Healthy" } : t))
    );
  };

  const updateTaskStatus = (taskId: string, newStatus: TaskStatusType) => {
    setTeams((prev) =>
      prev.map((t) => ({
        ...t,
        tasks: t.tasks.map((tsk) => (tsk.id === taskId ? { ...tsk, status: newStatus } : tsk)),
      }))
    );
  };

  const createTask = (
    teamId: string,
    title: string,
    tag: string,
    assigneeName: string,
    dueDate: string
  ) => {
    const newTask: TaskItem = {
      id: `tsk-${Date.now()}`,
      teamId,
      title,
      tag: tag || "General",
      assigneeName: assigneeName || "Team Member",
      status: "Todo",
      dueDate: dueDate || "2026-04-15",
    };

    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, tasks: [...t.tasks, newTask] } : t))
    );
  };

  const submitWeeklyLog = (
    teamId: string,
    accomplishments: string,
    blockers: string,
    plannedNextWeek: string,
    hours: number
  ) => {
    const newLog: WeeklyLog = {
      id: `log-${Date.now()}`,
      teamId,
      studentId: currentPersona.id,
      studentName: currentPersona.name,
      weekNumber: 6,
      dateSubmitted: new Date().toISOString().split("T")[0],
      accomplishments,
      blockers,
      plannedNextWeek,
      guideStatus: "Pending",
      hoursSpent: hours || 12,
    };

    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, weeklyLogs: [newLog, ...t.weeklyLogs] } : t))
    );
  };

  const reviewWeeklyLog = (logId: string, status: GuideReviewStatusType, remarks: string) => {
    setTeams((prev) =>
      prev.map((t) => ({
        ...t,
        weeklyLogs: t.weeklyLogs.map((l) =>
          l.id === logId ? { ...l, guideStatus: status, guideRemarks: remarks } : l
        ),
      }))
    );
  };

  const submitEvaluationScores = (
    evalId: string,
    scores: Record<string, number>,
    feedback: string
  ) => {
    setEvaluations((prev) =>
      prev.map((ev) =>
        ev.id === evalId
          ? {
              ...ev,
              scores,
              generalFeedback: feedback,
              isFinalized: true,
              evaluatedAt: new Date().toISOString(),
            }
          : ev
      )
    );
  };

  const lockEvaluation = (evalId: string) => {
    setEvaluations((prev) =>
      prev.map((ev) => (ev.id === evalId ? { ...ev, isFinalized: true } : ev))
    );
  };

  const requestGradeUnlock = (evalId: string, reason: string) => {
    setEvaluations((prev) =>
      prev.map((ev) =>
        ev.id === evalId ? { ...ev, unlockedRequested: true, unlockReason: reason } : ev
      )
    );
  };

  const approveGradeUnlock = (evalId: string) => {
    setEvaluations((prev) =>
      prev.map((ev) =>
        ev.id === evalId
          ? { ...ev, isFinalized: false, unlockedRequested: false, unlockReason: undefined }
          : ev
      )
    );
  };

  const rejectGradeUnlock = (evalId: string) => {
    setEvaluations((prev) =>
      prev.map((ev) =>
        ev.id === evalId
          ? { ...ev, unlockedRequested: false, unlockReason: undefined }
          : ev
      )
    );
  };

  const updateCycle = (cycleData: Partial<ProjectCycle>) => {
    setCycle((prev) => ({
      ...prev,
      ...cycleData,
    }));
  };

  const updateTeamRepo = (teamId: string, githubUrl: string, jiraUrl: string) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, githubUrl, jiraUrl } : t))
    );
  };

  const inviteTeamMember = (teamId: string, enrollmentNumber: string, name?: string) => {
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        const newMember: TeamMember = {
          id: `mem-${Date.now()}`,
          userId: `usr-${Date.now()}`,
          name: name || `Student (${enrollmentNumber})`,
          enrollmentNumber,
          isLead: false,
          roleDescription: "Invited Contributor (Pending)",
        };
        return {
          ...t,
          members: [...t.members, newMember],
        };
      })
    );
  };

  const addDepartment = (
    name: string,
    code: string,
    hodName?: string,
    studentCount: number = 120,
    facultyCount: number = 12
  ) => {
    const newDept: Department = {
      id: `dept-${Date.now()}`,
      collegeId: college.id,
      name,
      code: code.toUpperCase(),
      studentCount,
      facultyCount,
      hodName: hodName || "Appointed HOD",
      criterion3Attainment: 80.0,
      hodSignOffStatus: "Pending Sign-Off",
    };
    setDepartments((prev) => [...prev, newDept]);
  };

  const reassignHOD = (deptId: string, newHodName: string) => {
    setDepartments((prev) =>
      prev.map((d) => (d.id === deptId ? { ...d, hodName: newHodName } : d))
    );
  };

  const lockDepartmentSAR = (deptCode: string) => {
    setDepartments((prev) =>
      prev.map((d) => (d.code === deptCode ? { ...d, hodSignOffStatus: "Attested & Locked" } : d))
    );
  };

  const updateFacultyCapacity = (facultyId: string, delta: number) => {
    setFacultyRoster((prev) =>
      prev.map((f) => {
        if (f.id === facultyId) {
          const newMax = Math.max(1, Math.min(10, f.maxTeams + delta));
          return { ...f, maxTeams: newMax };
        }
        return f;
      })
    );
  };

  const addFaculty = (facultyData: Omit<FacultyRosterItem, "id" | "guidedCount">) => {
    const newFaculty: FacultyRosterItem = {
      ...facultyData,
      id: `usr-fac-${Date.now()}`,
      guidedCount: 0,
    };
    setFacultyRoster((prev) => [...prev, newFaculty]);
  };

  const onboardCollege = (collegeData: Partial<College>) => {
    setCollege((prev) => ({
      ...prev,
      ...collegeData,
    }));
  };

  const postProblemIdea = (idea: Omit<ProblemBankIdea, "id" | "taken">) => {
    const newIdea: ProblemBankIdea = {
      ...idea,
      id: `pb-${Date.now()}`,
      taken: false,
    };
    setProblemBank((prev) => [newIdea, ...prev]);
  };

  const addAuditLog = (entry: Omit<PlatformAuditLog, "id" | "timestamp">) => {
    const newEntry: PlatformAuditLog = {
      ...entry,
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC",
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const onboardTenant = (tenantData: Omit<TenantCollege, "id">) => {
    const newTenant: TenantCollege = {
      ...tenantData,
      id: `col-${tenantData.code.toLowerCase()}-${Date.now()}`,
    };
    setTenants((prev) => [newTenant, ...prev]);
    addAuditLog({
      actor: "admin@projecthub.in (Dev Startup Admin)",
      action: "TENANT_PROVISIONED",
      targetTenant: `${newTenant.name} (${newTenant.code})`,
      ipRegion: "103.21.244.10 • ap-south-1",
      status: "SUCCESS",
      details: `Provisioned isolated partition tenant_${newTenant.code.toLowerCase()}_prod with ${newTenant.storageQuotaGb || 50} GB quota and plan ${newTenant.plan}`,
    });
  };

  const updateTenant = (id: string, updates: Partial<TenantCollege>) => {
    setTenants((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, ...updates };
        addAuditLog({
          actor: "admin@projecthub.in (Dev Startup Admin)",
          action: "TENANT_CONFIG_UPDATED",
          targetTenant: `${updated.name} (${updated.code})`,
          ipRegion: "103.21.244.10 • ap-south-1",
          status: "SUCCESS",
          details: `Updated tenant configuration: plan=${updated.plan}, status=${updated.status}, storageQuota=${updated.storageQuotaGb || 50}GB`,
        });
        return updated;
      })
    );
  };

  const approvePilot = (reqId: string) => {
    const req = pilotRequests.find((r) => r.id === reqId);
    if (!req) return;
    const provisionedCollege: TenantCollege = {
      id: `col-pilot-${Date.now()}`,
      name: req.collegeName,
      code: req.code,
      domain: req.deanEmail.split("@")[1] || "college.ac.in",
      plan: "Pilot",
      status: "Active",
      students: parseInt(req.intake.replace(/[^0-9]/g, "")) || 1000,
      departments: 4,
      storageQuotaGb: 25,
      storageUsedGb: 1.2,
      strictSsoEnforced: false,
      renewalDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      allocatedSeats: 1000,
    };
    setTenants((prev) => [provisionedCollege, ...prev]);
    setPilotRequests((prev) => prev.filter((r) => r.id !== reqId));
    addAuditLog({
      actor: "admin@projecthub.in (Dev Startup Admin)",
      action: "PILOT_APPROVED",
      targetTenant: `${req.collegeName} (${req.code})`,
      ipRegion: "103.21.244.10 • ap-south-1",
      status: "SUCCESS",
      details: `90-day evaluation trial issued for ${req.intake} (@${provisionedCollege.domain})`,
    });
  };

  const uploadArtifact = (
    teamId: string,
    slot: ArtifactSlot,
    fileName: string,
    fileSize: string,
    similarityScore?: number
  ) => {
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        const existing = t.artifacts || [];
        const now = new Date().toISOString().split("T")[0];
        const updated = existing.some((a) => a.slot === slot)
          ? existing.map((a) =>
              a.slot === slot
                ? {
                    ...a,
                    fileName,
                    fileSize,
                    uploadedAt: now,
                    status: "Approved" as const,
                    similarityScore: similarityScore ?? a.similarityScore,
                  }
                : a
            )
          : [
              ...existing,
              {
                slot,
                name:
                  slot === "Synopsis"
                    ? "Approved Project Synopsis"
                    : slot === "MidTermPPT"
                    ? "Mid-Term Review Presentation"
                    : slot === "PlagiarismReport"
                    ? "Turnitin Similarity & Originality Report"
                    : "Final Comprehensive Capstone Thesis",
                fileName,
                fileSize,
                uploadedAt: now,
                status: "Approved" as const,
                similarityScore,
              },
            ];
        return { ...t, artifacts: updated };
      })
    );
  };

  const continueProjectToNextTrack = (
    teamId: string,
    nextTrack: "Major Phase-I" | "Major Phase-II" = "Major Phase-I"
  ) => {
    const existingTeam = teams.find((t) => t.id === teamId) || teams[0];
    const lineageId = existingTeam.projectLineageId || `lin-${existingTeam.teamCode.toLowerCase()}`;
    const newTeamCode = existingTeam.teamCode.replace("MIN", nextTrack === "Major Phase-I" ? "MAJ-1" : "MAJ-2");
    const newTeam: Team = {
      ...existingTeam,
      id: `tm-${Date.now()}`,
      teamCode: newTeamCode,
      title: `${existingTeam.title} (${nextTrack})`,
      trackName: nextTrack,
      projectLineageId: lineageId,
      state: "Active",
      health: "Healthy",
      missedLogsCount: 0,
      artifacts: [
        {
          slot: "Synopsis",
          name: `${nextTrack} Preliminary Proposal`,
          status: "Pending",
        },
        {
          slot: "MidTermPPT",
          name: `${nextTrack} Defense Deck`,
          status: "Pending",
        },
        {
          slot: "PlagiarismReport",
          name: "Turnitin Originality Report",
          status: "Pending",
        },
        {
          slot: "FinalThesis",
          name: `${nextTrack} Complete Thesis`,
          status: "Pending",
        },
      ],
      tasks: [
        {
          id: `tsk-${Date.now()}-1`,
          teamId: `tm-${Date.now()}`,
          title: `Architect ${nextTrack} Phase Extensions & Scale Benchmark`,
          assigneeName: existingTeam.members.find((m) => m.isLead)?.name || "Lead",
          status: "Todo",
          dueDate: "2026-08-15",
          tag: "Architecture",
        },
      ],
      weeklyLogs: [],
    };
    setTeams((prev) => [newTeam, ...prev]);
    addAuditLog({
      actor: currentPersona.name,
      action: "TRACK_CONTINUITY_INITIATED",
      targetTenant: `Team ${newTeamCode} (${nextTrack})`,
      ipRegion: "Student Workspace",
      status: "SUCCESS",
      details: `Project carried forward from ${existingTeam.teamCode} under Lineage ID ${lineageId}`,
    });
    return newTeam;
  };

  const saveIndividualEvaluations = (teamId: string, evals: IndividualEvaluation[]) => {
    setIndividualEvaluations((prev) => {
      const filtered = prev.filter((e) => e.teamId !== teamId);
      return [...filtered, ...evals];
    });
  };

  const submitExceptionOverride = (override: Omit<ExceptionAuditLog, "id" | "requestedAt" | "status">) => {
    const newLog: ExceptionAuditLog = {
      ...override,
      id: `exc-${Date.now()}`,
      requestedAt: new Date().toISOString(),
      status: "PendingHOD",
    };
    setExceptionAuditLogs((prev) => [newLog, ...prev]);
    addAuditLog({
      actor: override.requestedBy,
      action: `EXCEPTION_${override.type.toUpperCase()}_REQUESTED`,
      targetTenant: `Team ${override.teamCode}`,
      ipRegion: "Coordinator Desk",
      status: "PENDING",
      details: `${override.description} — Reason: ${override.reason}`,
    });
  };

  const reviewExceptionOverride = (
    overrideId: string,
    decision: "Approved" | "Rejected",
    remarks?: string
  ) => {
    const target = exceptionAuditLogs.find((e) => e.id === overrideId);
    if (!target) return;
    const reviewedAt = new Date().toISOString();
    setExceptionAuditLogs((prev) =>
      prev.map((e) =>
        e.id === overrideId
          ? {
              ...e,
              status: decision,
              reviewedBy: "Dr. Ravindra Kumar Sharma (HOD)",
              reviewedAt,
            }
          : e
      )
    );
    if (decision === "Approved") {
      if (target.type === "ReassignGuide" && target.newGuideId) {
        assignGuide(target.teamId, target.newGuideId);
      } else if (target.type === "RemoveMember" && target.targetMemberUsn) {
        setTeams((prev) =>
          prev.map((t) =>
            t.id === target.teamId
              ? {
                  ...t,
                  members: t.members.filter((m) => m.enrollmentNumber !== target.targetMemberUsn),
                }
              : t
          )
        );
      }
    }
    addAuditLog({
      actor: "Dr. Ravindra Kumar Sharma (HOD)",
      action: `EXCEPTION_${target.type.toUpperCase()}_${decision.toUpperCase()}`,
      targetTenant: `Team ${target.teamCode}`,
      ipRegion: "HOD Approval Desk",
      status: decision === "Approved" ? "SUCCESS" : "FAILED",
      details: `${target.description} was ${decision.toLowerCase()} by HOD. Remarks: ${remarks || "None"}`,
    });
  };

  const submitCourseExitSurvey = (survey: Omit<CourseExitSurvey, "id" | "submittedAt">) => {
    const newSurvey: CourseExitSurvey = {
      ...survey,
      id: `surv-${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };
    setCourseExitSurveys((prev) => [
      newSurvey,
      ...prev.filter((s) => s.enrollmentNumber !== survey.enrollmentNumber),
    ]);
  };

  const resetToDefaults = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentPersona(initialPersonas.studentLead);
    setCollege(initialCollege);
    setDepartments(initialDepartments);
    setCycle(initialCycle);
    setTeams(initialTeams);
    setEvaluations(initialEvaluations);
    setRubrics(initialRubrics);
    setProblemBank(initialProblemBank);
    setFacultyRoster(initialFacultyRoster);
    setTenants(initialTenants);
    setPilotRequests(initialPilotRequests);
    setAuditLogs(initialAuditLogs);
    setIndividualEvaluations(initialIndividualEvaluations);
    setExceptionAuditLogs(initialExceptionAuditLogs);
    setCourseExitSurveys(initialCourseExitSurveys);
  };

  return (
    <ProjectHubStoreContext.Provider
      value={{
        currentPersona,
        college,
        departments,
        cycle,
        teams,
        evaluations,
        rubrics,
        problemBank,
        facultyRoster,
        tenants,
        pilotRequests,
        auditLogs,
        individualEvaluations,
        exceptionAuditLogs,
        courseExitSurveys,
        isAuthenticated,
        logout,
        login,
        switchPersona,
        toggleFacultyCoordinator,
        approveProposal,
        rejectProposal,
        assignGuide,
        bulkApproveProposals,
        updateTaskStatus,
        createTask,
        submitWeeklyLog,
        reviewWeeklyLog,
        submitEvaluationScores,
        lockEvaluation,
        requestGradeUnlock,
        approveGradeUnlock,
        rejectGradeUnlock,
        addDepartment,
        reassignHOD,
        lockDepartmentSAR,
        updateFacultyCapacity,
        addFaculty,
        onboardCollege,
        onboardTenant,
        updateTenant,
        approvePilot,
        addAuditLog,
        updateCycle,
        updateTeamRepo,
        inviteTeamMember,
        postProblemIdea,
        uploadArtifact,
        continueProjectToNextTrack,
        saveIndividualEvaluations,
        submitExceptionOverride,
        reviewExceptionOverride,
        submitCourseExitSurvey,
        resetToDefaults,
      }}
    >
      {children}
    </ProjectHubStoreContext.Provider>
  );
};

export const useProjectHubStore = () => {
  const context = useContext(ProjectHubStoreContext);
  if (!context) {
    throw new Error("useProjectHubStore must be used within a ProjectHubStoreProvider");
  }
  return context;
};

