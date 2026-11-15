"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  College,
  Department,
  Evaluation,
  GuideReviewStatusType,
  ProblemBankIdea,
  ProjectCycle,
  ProjectStateType,
  RoleType,
  Rubric,
  TaskItem,
  TaskStatusType,
  Team,
  TeamMember,
  UserPersona,
  WeeklyLog,
} from "./store-types";
import {
  initialCollege,
  initialCycle,
  initialDepartments,
  initialEvaluations,
  initialPersonas,
  initialProblemBank,
  initialRubrics,
  initialTeams,
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
    isProjectCoordinator: false,
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
    isProjectCoordinator: false,
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
  // Actions
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
  addDepartment: (name: string, code: string) => void;
  onboardCollege: (collegeData: Partial<College>) => void;
  updateCycle: (cycleData: Partial<ProjectCycle>) => void;
  updateTeamRepo: (teamId: string, githubUrl: string, jiraUrl: string) => void;
  inviteTeamMember: (teamId: string, enrollmentNumber: string, name?: string) => void;
  postProblemIdea: (idea: Omit<ProblemBankIdea, "id" | "taken">) => void;
  resetToDefaults: () => void;
}

const ProjectHubStoreContext = createContext<ProjectHubStoreContextType | null>(null);

const STORAGE_KEY = "projecthub_campus_store_v2";

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
  ]);

  // Actions
  const switchPersona = (role: RoleType) => {
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

  const addDepartment = (name: string, code: string) => {
    const newDept: Department = {
      id: `dept-${Date.now()}`,
      collegeId: college.id,
      name,
      code: code.toUpperCase(),
      studentCount: 120,
      facultyCount: 12,
    };
    setDepartments((prev) => [...prev, newDept]);
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
        onboardCollege,
        updateCycle,
        updateTeamRepo,
        inviteTeamMember,
        postProblemIdea,
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

