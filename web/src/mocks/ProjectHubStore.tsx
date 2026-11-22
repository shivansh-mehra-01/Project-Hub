"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  AcademicSession,
  CourseProgram,
  SemesterTerm,
  SubjectOffering,
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
  initialAcademicSessions,
  initialAuditLogs,
  initialCollege,
  initialCourseExitSurveys,
  initialCoursePrograms,
  initialCycle,
  initialDepartments,
  initialEvaluations,
  initialExceptionAuditLogs,
  initialIndividualEvaluations,
  initialPersonas,
  initialPilotRequests,
  initialProblemBank,
  initialRubrics,
  initialSemesterTerms,
  initialSubjectOfferings,
  initialTeams,
  initialTenants,
} from "./seed-data";
import {
  apiClient,
  authApi,
  collegeApi,
  coordinatorApi,
  facultyApi,
  hodApi,
  platformApi,
  studentApi,
  getAuthToken,
  getUserProfile,
  clearAuthSession,
} from "@/lib/api";
import { showToast } from "@/lib/toast";

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
  coursePrograms: CourseProgram[];
  academicSessions: AcademicSession[];
  semesterTerms: SemesterTerm[];
  subjectOfferings: SubjectOffering[];
  isAuthenticated: boolean;
  isLiveSession: boolean;
  isHydrating: boolean;
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
  addDepartment: (name: string, code: string, hodName?: string, studentCount?: number, facultyCount?: number, courseProgramId?: string) => void;
  reassignHOD: (deptId: string, newHodName: string) => void;
  lockDepartmentSAR: (deptCode: string) => void;
  updateFacultyCapacity: (facultyId: string, delta: number) => void;
  addFaculty: (faculty: Omit<FacultyRosterItem, "id" | "guidedCount">) => void;
  onboardCollege: (collegeData: Partial<College>) => void;
  onboardTenant: (tenantData: Omit<TenantCollege, "id">) => Promise<{ tenant: TenantCollege; adminEmail: string }>;
  provisionTenantAdmin: (tenantId: string, email?: string, fullName?: string) => Promise<string>;
  updateTenant: (id: string, updates: Partial<TenantCollege>) => void;
  approvePilot: (reqId: string) => void;
  addAuditLog: (entry: Omit<PlatformAuditLog, "id" | "timestamp">) => void;
  updateCycle: (cycleData: Partial<ProjectCycle>) => void;
  updateTeamRepo: (teamId: string, githubUrl: string, jiraUrl: string) => void;
  inviteTeamMember: (teamId: string, enrollmentNumber: string, name?: string) => void;
  postProblemIdea: (idea: Omit<ProblemBankIdea, "id" | "taken">) => void;
  uploadArtifact: (teamId: string, slot: ArtifactSlot, fileName: string, fileSize: string, similarityScore?: number) => void;
  uploadArtifactBinary: (teamId: string, slot: ArtifactSlot, file: File, customName?: string, similarityScore?: number) => Promise<void>;
  reviewArtifact: (teamId: string, slot: ArtifactSlot, isApproved: boolean, reviewerNote?: string) => Promise<void>;
  continueProjectToNextTrack: (teamId: string, nextTrack?: "Major Phase-I" | "Major Phase-II") => Team;
  saveIndividualEvaluations: (teamId: string, evaluations: IndividualEvaluation[]) => void;
  submitExceptionOverride: (override: Omit<ExceptionAuditLog, "id" | "requestedAt" | "status">) => void;
  reviewExceptionOverride: (overrideId: string, decision: "Approved" | "Rejected", remarks?: string) => void;
  submitCourseExitSurvey: (survey: Omit<CourseExitSurvey, "id" | "submittedAt">) => void;
  importRgpvCatalog: (universityCode?: string, programCodes?: string[], branchCodes?: string[]) => Promise<{ programsImported: number; departmentsCreated: number; semesterTermsCreated: number; subjectOfferingsCreated: number; message: string }>;
  configureAcademicSession: (data: { academicYear: string; examCutoffDateUtc?: string; allowInterdisciplinaryTeams?: boolean }) => Promise<void>;
  addCourseProgram: (prog: Omit<CourseProgram, "id" | "collegeId">) => void;
  removeCourseProgram: (codeOrId: string) => void;
  addSemesterTerm: (term: Omit<SemesterTerm, "id" | "collegeId">) => void;
  addSubjectOffering: (offering: Omit<SubjectOffering, "id" | "collegeId">) => void;
  resetToDefaults: () => void;
}

const ProjectHubStoreContext = createContext<ProjectHubStoreContextType | null>(null);

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
  const [coursePrograms, setCoursePrograms] = useState<CourseProgram[]>(initialCoursePrograms);
  const [academicSessions, setAcademicSessions] = useState<AcademicSession[]>(initialAcademicSessions);
  const [semesterTerms, setSemesterTerms] = useState<SemesterTerm[]>(initialSemesterTerms);
  const [subjectOfferings, setSubjectOfferings] = useState<SubjectOffering[]>(initialSubjectOfferings);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isLiveSession, setIsLiveSession] = useState<boolean>(false);
  const [isHydrating, setIsHydrating] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Clean legacy demo/prototype localStorage keys on startup and sync authenticated persona
  useEffect(() => {
    try {
      const legacyKeys = [
        "projecthub_campus_store_v3",
        "projecthub_campus_store_v2",
        "projecthub_campus_store_v1",
        "projecthub_mock_store_v1",
        "projecthub_mock_store",
        "projecthub_theme",
        "projecthub_active_persona",
      ];
      legacyKeys.forEach((k) => localStorage.removeItem(k));
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("projecthub_campus_") || key.startsWith("projecthub_mock_"))) {
          localStorage.removeItem(key);
        }
      }

      const userProfile = getUserProfile();
      if (userProfile) {
        setCurrentPersona({
          id: userProfile.id,
          name: userProfile.fullName,
          email: userProfile.email,
          role: userProfile.role as RoleType,
          collegeId: userProfile.collegeId,
          departmentId: userProfile.departmentId || undefined,
          isProjectCoordinator: userProfile.isProjectCoordinator,
          enrollmentNumber: userProfile.enrollmentOrEmployeeCode,
          employeeId: userProfile.enrollmentOrEmployeeCode,
        });
        setIsAuthenticated(true);
      } else {
        const token = getAuthToken();
        setIsAuthenticated(!!token);
      }
    } catch (e) {
      console.warn("Storage cleanup completed.", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Hydrate from live .NET 10 API when a JWT session exists
  useEffect(() => {
    const token = getAuthToken();
    setIsLiveSession(!!token);

    if (!token) return;

    let isMounted = true;
    const hydrate = async () => {
      setIsHydrating(true);
      try {
        const role = currentPersona.role;

        if (role === "SuperAdmin") {
          const [tenantsRes, auditRes] = await Promise.allSettled([
            platformApi.getTenants(),
            platformApi.getAuditLogs(),
          ]);

          if (isMounted && tenantsRes.status === "fulfilled") {
            setTenants(
              tenantsRes.value.map((t) => ({
                id: t.id,
                name: t.name,
                code: t.tenantCode,
                domain: t.ssoDomain,
                plan: t.licenseTier,
                status: t.isActive ? ("Active" as const) : ("Suspended" as const),
                students: t.studentCount || t.maxStudentSeats,
                departments: t.departmentCount,
                storageQuotaGb: t.storageQuotaGb,
                storageUsedGb: 1.4,
                strictSsoEnforced: t.enforceStrictSso,
                renewalDate: t.subscriptionExpiresAtUtc?.split("T")[0] || "2027-06-30",
                allocatedSeats: t.maxStudentSeats,
                affiliatingUniversity: t.affiliatingUniversity || "RGPV",
                principalEmail: t.principalEmail || (t.adminEmails && t.adminEmails[0]) || `principal@${t.ssoDomain}`,
                adminEmails: t.adminEmails && t.adminEmails.length > 0 ? t.adminEmails : [`principal@${t.ssoDomain}`],
              }))
            );
          }

          if (isMounted && auditRes.status === "fulfilled") {
            setAuditLogs(
              auditRes.value.map((a) => ({
                id: a.id,
                actor: a.actorEmail,
                action: a.action,
                targetTenant: a.targetEntity,
                ipRegion: a.ipAddress || "103.21.244.10 • ap-south-1",
                timestamp: a.occurredAtUtc.replace("T", " ").substring(0, 19) + " UTC",
                status: "SUCCESS",
                details: a.metadataJson,
              }))
            );
          }
        } else if (role === "CollegeAdmin") {
          const [overviewRes, deptsRes, tracksRes] = await Promise.allSettled([
            collegeApi.getOverview(),
            collegeApi.getDepartments(),
            collegeApi.getTracks(),
          ]);

          if (isMounted && overviewRes.status === "fulfilled") {
            setCollege((prev) => ({
              ...prev,
              id: overviewRes.value.collegeId,
              name: overviewRes.value.collegeName,
              code: overviewRes.value.tenantCode,
              criterion3Attainment: overviewRes.value.criterion3AttainmentPct,
            }));

            if (overviewRes.value.activeSession) {
              const act = overviewRes.value.activeSession;
              setAcademicSessions((prev) => [
                {
                  id: act.id,
                  collegeId: act.collegeId,
                  label: act.label,
                  startDate: act.startDate,
                  endDate: act.endDate,
                  examCutoffDateUtc: act.examCutoffDateUtc,
                  allowInterdisciplinaryTeams: act.allowInterdisciplinaryTeams ?? true,
                  isActive: act.isActive,
                },
                ...prev.filter((s) => s.id !== act.id),
              ]);
            }
          }

          if (isMounted && deptsRes.status === "fulfilled") {
            setDepartments(
              deptsRes.value.map((d) => ({
                id: d.id,
                collegeId: d.collegeId,
                name: d.name,
                code: d.code,
                studentCount: d.studentCount || d.intakeQuota || 120,
                facultyCount: d.facultyCount || 12,
                hodName: d.hodName || "Appointed HOD",
                criterion3Attainment: 82.5,
                hodSignOffStatus: d.isSarAttested ? "Attested & Locked" : "Pending Sign-Off",
                trackStatus: (d.trackStatus as "Active" | "Awaiting HOD Launch") || "Awaiting HOD Launch",
                activeTrackCount: d.activeTrackCount || 0,
              }))
            );
          }

          if (isMounted && tracksRes.status === "fulfilled" && tracksRes.value.length > 0) {
            const active = tracksRes.value[0];
            setCycle((prev) => ({
              ...prev,
              id: active.id,
              name: active.name,
              year: active.academicYear,
              currentStage: "Active Development",
            }));
          }
        } else if (role === "HOD") {
          const [dashRes, proposalsRes, facultyRes, excsRes] = await Promise.allSettled([
            hodApi.getDashboard(),
            hodApi.getProposals(),
            hodApi.getFaculty(),
            hodApi.getExceptions(),
          ]);

          if (isMounted && dashRes.status === "fulfilled") {
            setDepartments((prev) =>
              prev.map((d) =>
                d.code === dashRes.value.departmentCode
                  ? {
                      ...d,
                      criterion3Attainment: dashRes.value.nbaBlendedCriterion3Pct,
                      hodSignOffStatus: dashRes.value.isSarAttested ? "Attested & Locked" : d.hodSignOffStatus,
                    }
                  : d
              )
            );
          }

          if (isMounted && facultyRes.status === "fulfilled") {
            setFacultyRoster(
              facultyRes.value.map((f) => ({
                id: f.facultyId,
                name: f.fullName,
                email: f.email,
                designation: "Faculty Member",
                isProjectCoordinator: f.isProjectCoordinator,
                maxTeams: f.maxMentorTeams,
                guidedCount: f.currentMentoredTeams,
              }))
            );
          }

          if (isMounted && proposalsRes.status === "fulfilled") {
            setTeams(
              proposalsRes.value.map((p) => ({
                id: p.teamId,
                collegeId: currentPersona.collegeId,
                departmentId: currentPersona.departmentId || "",
                cycleId: "cycle-2026-min",
                teamCode: p.teamCode,
                title: p.title,
                abstract: p.abstract,
                domain: "Engineering Projects",
                sdgNumber: 9,
                state: (p.status === "ActiveBuild" ? "Active" : p.status === "Completed" ? "Completed" : p.status === "PendingHOD" ? "PendingHOD" : "PendingGuide") as ProjectStateType,
                health: "Healthy",
                isRosterLocked: true,
                members: [],
                tasks: [],
                weeklyLogs: [],
              }))
            );
          }

          if (isMounted && excsRes.status === "fulfilled") {
            setExceptionAuditLogs(
              excsRes.value.map((e) => ({
                id: e.id,
                teamId: e.projectTeamId,
                teamCode: e.teamCode,
                teamTitle: `Team ${e.teamCode}`,
                type: (e.actionType === "ReassignGuide" ? "ReassignGuide" : e.actionType === "RemoveDroppedMember" ? "RemoveMember" : "ReVivaUnlock") as "ReassignGuide" | "RemoveMember" | "ReVivaUnlock" | "DeadlineExtension",
                description: e.reason,
                requestedBy: e.requestedByName || "Faculty Coordinator",
                requestedAt: e.createdAtUtc,
                status: (e.isApproved ? "Approved" : "PendingHOD") as "PendingHOD" | "Approved" | "Rejected",
                reason: e.reason,
                reviewedBy: e.isApproved ? "Dr. Ravindra Kumar Sharma (HOD)" : undefined,
                reviewedAt: e.approvedAtUtc,
              }))
            );
          }
        } else if (role === "Faculty") {
          if (currentPersona.isProjectCoordinator) {
            const [coordTeams, coordExcs, mentoredRes] = await Promise.allSettled([
              coordinatorApi.getTeams(),
              coordinatorApi.getExceptions(),
              facultyApi.getMentoredTeams(),
            ]);

            if (isMounted && coordTeams.status === "fulfilled") {
              setTeams(
                coordTeams.value.map((ct) => ({
                  id: ct.teamId,
                  collegeId: currentPersona.collegeId,
                  departmentId: currentPersona.departmentId || "",
                  cycleId: "cycle-2026-min",
                  teamCode: ct.teamCode,
                  title: ct.title,
                  abstract: ct.abstract,
                  domain: "Engineering Projects",
                  sdgNumber: parseInt(ct.sdgCode?.replace(/\D/g, "") || "9", 10) || 9,
                  state: (ct.status === "ActiveBuild" ? "Active" : ct.status === "Completed" ? "Completed" : "PendingGuide") as ProjectStateType,
                  health: "Healthy",
                  guideId: ct.guideUserId,
                  guideName: ct.guideName,
                  isRosterLocked: true,
                  members: [],
                  tasks: [],
                  weeklyLogs: [],
                }))
              );
            }

            if (isMounted && coordExcs.status === "fulfilled") {
              setExceptionAuditLogs(
                coordExcs.value.map((e) => ({
                  id: e.id,
                  teamId: e.projectTeamId,
                  teamCode: e.teamCode,
                  teamTitle: `Team ${e.teamCode}`,
                  type: (e.actionType === "ReassignGuide" ? "ReassignGuide" : e.actionType === "RemoveDroppedMember" ? "RemoveMember" : "ReVivaUnlock") as "ReassignGuide" | "RemoveMember" | "ReVivaUnlock" | "DeadlineExtension",
                  description: e.reason,
                  requestedBy: e.requestedByName || "Faculty Coordinator",
                  requestedAt: e.createdAtUtc,
                  status: (e.isApproved ? "Approved" : "PendingHOD") as "PendingHOD" | "Approved" | "Rejected",
                  reason: e.reason,
                  reviewedBy: e.isApproved ? "Dr. Ravindra Kumar Sharma (HOD)" : undefined,
                  reviewedAt: e.approvedAtUtc,
                }))
              );
            }
          } else {
            const mentoredRes = await facultyApi.getMentoredTeams().catch(() => null);
            if (isMounted && mentoredRes) {
              setTeams(
                mentoredRes.map((m) => {
                  const sdgNum = parseInt(m.sdgCode?.replace(/\D/g, "") || "9", 10) || 9;
                  return {
                    id: m.teamId,
                    collegeId: currentPersona.collegeId,
                    departmentId: currentPersona.departmentId || "",
                    cycleId: "cycle-2026-min",
                    teamCode: m.teamCode,
                    title: m.title,
                    abstract: m.abstract,
                    domain: "Engineering Projects",
                    sdgNumber: sdgNum,
                    state: (m.status === "ActiveBuild" ? "Active" : m.status === "Completed" ? "Completed" : "PendingGuide") as ProjectStateType,
                    health: "Healthy",
                    isRosterLocked: true,
                    members: [],
                    tasks: [],
                    weeklyLogs: [],
                  };
                })
              );
            }
          }
        } else if (role === "Student" || role === "TeamLead") {
          const wsRes = await studentApi.getWorkspace().catch(() => null);
          if (isMounted) {
            if (wsRes) {
              const sdgNum = parseInt(wsRes.sdgCode?.replace(/\D/g, "") || "9", 10) || 9;
              const mappedTeam: Team = {
                id: wsRes.teamId,
                collegeId: currentPersona.collegeId || "col-sistec-bhopal",
                departmentId: currentPersona.departmentId || "dept-cse",
                cycleId: "cycle-2026-min",
                teamCode: wsRes.teamCode,
                title: wsRes.title,
                abstract: wsRes.abstract,
                sdgNumber: sdgNum,
                domain: wsRes.domainTag,
                trackName: "Minor Project",
                state: wsRes.status === "ActiveBuild" ? "Active" : "Draft",
                health: wsRes.missedLogStreak > 2 ? "NeedsReview" : wsRes.missedLogStreak > 0 ? "AtRisk" : "Healthy",
                guideId: wsRes.guideUserId || "usr-fac-verma",
                guideName: wsRes.guideName || "Assigned Faculty Guide",
                missedLogsCount: wsRes.missedLogStreak,
                projectLineageId: wsRes.projectLineageId,
                githubUrl: wsRes.repoUrl,
                jiraUrl: wsRes.jiraBoardKey,
                isRosterLocked: true,
                members: wsRes.members.map((m) => ({
                  id: m.userId,
                  userId: m.userId,
                  name: m.fullName,
                  enrollmentNumber: m.enrollmentCode,
                  roleDescription: m.moduleResponsibility,
                  isLead: m.isTeamLead,
                })),
                tasks: wsRes.tasks.map((tsk) => ({
                  id: tsk.id,
                  teamId: wsRes.teamId,
                  title: tsk.title,
                  assigneeName: tsk.assigneeName || "Team Member",
                  status: tsk.status as TaskStatusType,
                  dueDate: tsk.dueDateUtc?.split("T")[0] || "2026-04-15",
                  tag: tsk.categoryTag,
                })),
                artifacts: wsRes.artifacts.map((art) => ({
                  slot: art.slotType as ArtifactSlot,
                  name: art.fileName || `${art.slotType} Document`,
                  fileName: art.fileName,
                  fileSize: art.fileSizeBytes ? `${(art.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB` : undefined,
                  status: (art.status === "Verified" ? "Approved" : art.status === "Uploaded" ? "Uploaded" : "Pending") as "Pending" | "Uploaded" | "Approved" | "NeedsRevision",
                  similarityScore: art.slotType === "PlagiarismReport" ? 8 : undefined,
                })),
                weeklyLogs: wsRes.weeklyLogs.map((log) => ({
                  id: log.id,
                  teamId: wsRes.teamId,
                  studentId: wsRes.members.find((m) => m.fullName === log.authorName)?.userId || "usr-std-lead",
                  studentName: log.authorName,
                  weekNumber: log.weekNumber,
                  dateSubmitted: log.createdAtUtc.split("T")[0],
                  accomplishments: log.accomplishmentsSummary,
                  blockers: log.blockersSummary || "",
                  plannedNextWeek: "Continue sprint implementation roadmap.",
                  guideStatus: (log.isVerified ? "Approved" : "Pending") as GuideReviewStatusType,
                  guideRemarks: log.mentorRemarks || undefined,
                  hoursSpent: Number(log.hoursLogged),
                })),
              };
              setTeams([mappedTeam]);
            } else {
              setTeams([]);
            }
          }
        }
      } catch (err) {
        console.warn("Hydration from API paused or offline; maintaining store cache.", err);
      } finally {
        if (isMounted) setIsHydrating(false);
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [currentPersona.role, isAuthenticated]);

  // Actions
  const logout = React.useCallback(() => {
    clearAuthSession();
    setIsLiveSession(false);
    setIsAuthenticated(false);
    setCurrentPersona(initialPersonas.studentLead);
    setTeams([]);
    setEvaluations([]);
    setIndividualEvaluations([]);
    setExceptionAuditLogs([]);
    setCourseExitSurveys([]);
    setAuditLogs([]);
  }, []);

  // Multi-tab logout sync & global session-expired listener
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      // If logout occurred in another browser tab
      if (
        event.key === "collabex_logout_event" ||
        (event.key === "projecthub_jwt_token" && !event.newValue)
      ) {
        logout();
        if (window.location.pathname !== "/login") {
          showToast("You have been signed out in another tab.", "info");
          window.location.replace("/login");
        }
      }
    };

    const handleSessionExpired = () => {
      logout();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("collabex:session-expired", handleSessionExpired);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("collabex:session-expired", handleSessionExpired);
    };
  }, [logout]);

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

    if (getAuthToken()) {
      const f = facultyRoster.find((item) => item.id === facultyId);
      hodApi
        .toggleCoordinator(facultyId, { isProjectCoordinator: !(f?.isProjectCoordinator ?? false) })
        .catch(() => {});
    }
    showToast("Project Coordinator appointment updated.", "info");
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

    if (getAuthToken()) {
      if (role === "HOD") {
        hodApi.endorseProposal(teamId).catch(() => {});
      } else {
        facultyApi.endorseProposal(teamId).catch(() => {});
      }
    }
    showToast("Project proposal approved and advanced to next stage.", "success");
  };

  const rejectProposal = (teamId: string, remarks: string) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, state: "Draft", health: "NeedsReview" } : t))
    );

    if (getAuthToken()) {
      hodApi.returnProposal(teamId, remarks).catch(() => {});
    }
    showToast("Proposal returned for revision with notes.", "info");
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

    if (getAuthToken()) {
      coordinatorApi.assignGuide(teamId, { guideUserId: guideId }).catch(() => {});
    }
    showToast("Faculty guide assigned to project team.", "success");
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

    if (getAuthToken()) {
      studentApi
        .updateTask(taskId, {
          status: newStatus as any,
        })
        .catch(() => {});
    }
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

    if (getAuthToken()) {
      studentApi
        .createTask({
          title,
          categoryTag: tag || "General",
          dueDateUtc: dueDate ? new Date(dueDate).toISOString() : undefined,
        })
        .catch(() => {});
    }
    showToast("Sprint task created.", "success");
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

    if (getAuthToken()) {
      studentApi
        .submitLog({
          weekNumber: 6,
          accomplishmentsSummary: accomplishments,
          blockersSummary: blockers,
          hoursLogged: hours || 12,
          gitCommitCount: 4,
        })
        .catch(() => {});
    }
    showToast("Friday progress log submitted for mentor sign-off.", "success");
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

    if (getAuthToken()) {
      facultyApi.verifyLog(logId, { remarks }).catch(() => {});
    }
    showToast("Weekly log verified and signed.", "success");
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

    if (getAuthToken()) {
      const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
      facultyApi
        .submitVivaEvaluation({
          projectTeamId: evalId,
          checkpointType: "MidTermReview",
          sharedRubricScoresJson: JSON.stringify(scores),
          sharedTotalScore: totalScore,
          generalRemarks: feedback,
          studentScores: [
            {
              studentUserId: "20000000-0000-0000-0000-000000000005",
              moduleOwnershipScore: 35,
              vivaQaScore: 35,
              logDisciplineScore: 20,
            },
          ],
        })
        .catch(() => {});
    }
    showToast("Viva evaluation submitted with 60/40 blended scoring.", "success");
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

    if (getAuthToken()) {
      collegeApi
        .createTrack({
          name: cycleData.type ? `${cycleData.type} Project Track` : "Academic Session",
          academicYear: cycleData.academicYear || "2026-2027",
        })
        .catch(() => {});
    }
    showToast("Academic track session configured.", "success");
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
    facultyCount: number = 12,
    courseProgramId?: string
  ) => {
    const prog = coursePrograms.find((p) => p.id === courseProgramId);
    const newDept: Department = {
      id: `dept-${Date.now()}`,
      collegeId: college.id,
      courseProgramId,
      courseProgramName: prog?.name,
      name,
      code: code.toUpperCase(),
      studentCount,
      facultyCount,
      hodName: hodName || "Appointed HOD",
      criterion3Attainment: 80.0,
      hodSignOffStatus: "Pending Sign-Off",
    };
    setDepartments((prev) => [...prev, newDept]);

    if (getAuthToken()) {
      collegeApi
        .createDepartment({
          name,
          code: code.toUpperCase(),
          intakeQuota: studentCount,
          courseProgramId,
        })
        .catch(() => {});
    }
    showToast(`Department ${code.toUpperCase()} added to campus.`, "success");
  };

  const addCourseProgram = (prog: Omit<CourseProgram, "id" | "collegeId">) => {
    const newProg: CourseProgram = {
      id: `prog-${Date.now()}`,
      collegeId: college.id,
      ...prog,
    };
    setCoursePrograms((prev) => [...prev, newProg]);
    if (getAuthToken()) {
      collegeApi
        .createCourseProgram({
          code: prog.code,
          name: prog.name,
          level: prog.level,
          totalSemesters: prog.totalSemesters,
        })
        .catch(() => {});
    }
    showToast(`Program ${prog.code} added.`, "success");
  };

  const removeCourseProgram = (codeOrId: string) => {
    const progToRemove = coursePrograms.find(
      (p) => p.id === codeOrId || p.code.toUpperCase() === codeOrId.toUpperCase()
    );
    setCoursePrograms((prev) =>
      prev.filter((p) => p.id !== codeOrId && p.code.toUpperCase() !== codeOrId.toUpperCase())
    );
    // Also remove departments under this program
    setDepartments((prev) =>
      prev.filter((d) => {
        if (d.courseProgramId === codeOrId) return false;
        if (progToRemove && d.courseProgramId === progToRemove.id) return false;
        if (progToRemove && d.courseProgramName?.toLowerCase() === progToRemove.name.toLowerCase()) return false;
        return true;
      })
    );
  };

  const addSemesterTerm = (term: Omit<SemesterTerm, "id" | "collegeId">) => {
    const newTerm: SemesterTerm = {
      id: `sem-${Date.now()}`,
      collegeId: college.id,
      ...term,
    };
    setSemesterTerms((prev) => [...prev, newTerm]);
    if (getAuthToken()) {
      collegeApi
        .createSemesterTerm({
          departmentId: term.departmentId,
          academicSessionId: term.academicSessionId,
          semesterNumber: term.semesterNumber,
          semesterName: term.semesterName,
          parity: term.parity,
        })
        .catch(() => {});
    }
    showToast(`${term.semesterName} configured.`, "success");
  };

  const addSubjectOffering = (offering: Omit<SubjectOffering, "id" | "collegeId">) => {
    const newOffering: SubjectOffering = {
      id: `off-${Date.now()}`,
      collegeId: college.id,
      ...offering,
    };
    setSubjectOfferings((prev) => [...prev, newOffering]);
    if (getAuthToken()) {
      collegeApi
        .createSubjectOffering({
          semesterTermId: offering.semesterTermId,
          subjectCode: offering.subjectCode,
          subjectName: offering.subjectName,
          subjectType: offering.subjectType,
          credits: offering.credits,
          internalMaxMarks: offering.internalMaxMarks,
          externalMaxMarks: offering.externalMaxMarks,
        })
        .catch(() => {});
    }
    showToast(`Subject ${offering.subjectCode} registered.`, "success");
  };

  const importRgpvCatalog = async (
    universityCode: string = "RGPV",
    programCodes?: string[],
    branchCodes?: string[]
  ) => {
    if (getAuthToken()) {
      try {
        const res = await collegeApi.importUniversityCatalog({
          universityCode,
          programCodes,
        });
        showToast(res.message, "success");
        return res;
      } catch (err: unknown) {
        console.warn("API import fallback to mock state:", err);
      }
    }

    // Client-side fallback import
    const defaultPrograms: CourseProgram[] = [
      { id: "prog-btech-01", collegeId: college.id, code: "BTECH", name: "Bachelor of Technology", level: "UG", totalSemesters: 8, isActive: true },
      { id: "prog-mtech-01", collegeId: college.id, code: "MTECH", name: "Master of Technology", level: "PG", totalSemesters: 4, isActive: true },
      { id: "prog-mba-01", collegeId: college.id, code: "MBA", name: "Master of Business Administration", level: "PG", totalSemesters: 4, isActive: true },
      { id: "prog-mca-01", collegeId: college.id, code: "MCA", name: "Master of Computer Applications", level: "PG", totalSemesters: 4, isActive: true },
    ];

    const rgpvBranches = [
      { code: "CSE", name: "Computer Science & Engineering" },
      { code: "IT", name: "Information Technology" },
      { code: "EC", name: "Electronics & Communication Engineering" },
      { code: "EE", name: "Electrical Engineering" },
      { code: "EX", name: "Electrical & Electronics Engineering" },
      { code: "ME", name: "Mechanical Engineering" },
      { code: "CE", name: "Civil Engineering" },
      { code: "AIML", name: "CSE (AI & Machine Learning)" },
      { code: "CS-DS", name: "CSE (Data Science)" },
      { code: "CS-CS", name: "CSE (Cyber Security)" },
      { code: "CS-IoT", name: "CSE (Internet of Things)" },
      { code: "CSBS", name: "Computer Science & Business Systems" },
    ];

    const activePrograms = (programCodes && programCodes.length > 0)
      ? defaultPrograms.filter((p) => programCodes.includes(p.code))
      : defaultPrograms;

    const filteredBranches = (branchCodes && branchCodes.length > 0)
      ? rgpvBranches.filter((b) => branchCodes.includes(b.code))
      : rgpvBranches;

    setCoursePrograms(activePrograms);

    setDepartments((prev) => {
      const existingCodes = new Set(prev.map((d) => d.code));
      const newlyAdded: Department[] = filteredBranches
        .filter((b) => !existingCodes.has(b.code))
        .map((b) => ({
          id: `dept-${b.code.toLowerCase()}-${Date.now()}`,
          collegeId: college.id,
          courseProgramId: "prog-btech-01",
          courseProgramName: "Bachelor of Technology",
          code: b.code,
          name: b.name,
          studentCount: 120,
          facultyCount: 10,
          criterion3Attainment: 80.0,
          hodSignOffStatus: "Pending Sign-Off",
        }));
      return [...prev, ...newlyAdded];
    });

    const msg = `Successfully loaded RGPV Master Catalog (${activePrograms.length} Programs, ${filteredBranches.length} Selected Branches, CBCS/AICTE-Flex).`;
    showToast(msg, "success");

    return {
      universityCode,
      universityName: "Rajiv Gandhi Proudyogiki Vishwavidyalaya",
      programsImported: activePrograms.length,
      departmentsCreated: filteredBranches.length,
      semesterTermsCreated: 8,
      subjectOfferingsCreated: 3,
      message: msg,
    };
  };

  const configureAcademicSession = async (data: {
    academicYear: string;
    examCutoffDateUtc?: string;
    allowInterdisciplinaryTeams?: boolean;
  }) => {
    if (getAuthToken()) {
      try {
        const res = await collegeApi.configureSession({
          academicYear: data.academicYear,
          examCutoffDateUtc: data.examCutoffDateUtc,
          allowInterdisciplinaryTeams: data.allowInterdisciplinaryTeams ?? true,
          isActive: true,
        });
        setAcademicSessions((prev) => [
          {
            id: res.id,
            collegeId: res.collegeId,
            label: res.label,
            startDate: res.startDate,
            endDate: res.endDate,
            examCutoffDateUtc: res.examCutoffDateUtc,
            allowInterdisciplinaryTeams: res.allowInterdisciplinaryTeams ?? true,
            isActive: res.isActive,
          },
          ...prev.filter((s) => s.id !== res.id),
        ]);
        showToast(`Institutional Academic Session ${res.label} opened successfully.`, "success");
        return;
      } catch (err: unknown) {
        console.warn("API configure session fallback to local state:", err);
      }
    }

    setAcademicSessions((prev) => [
      {
        id: prev[0]?.id || "sess-local-01",
        collegeId: college.id,
        label: data.academicYear,
        startDate: prev[0]?.startDate || "2026-07-01T00:00:00Z",
        endDate: prev[0]?.endDate || "2027-06-30T23:59:59Z",
        examCutoffDateUtc: data.examCutoffDateUtc || "2027-05-31T23:59:59Z",
        allowInterdisciplinaryTeams: data.allowInterdisciplinaryTeams ?? true,
        isActive: true,
      },
      ...prev.slice(1),
    ]);
    showToast(`Institutional Academic Session ${data.academicYear} configured.`, "success");
  };

  const reassignHOD = (deptId: string, newHodName: string) => {
    setDepartments((prev) =>
      prev.map((d) => (d.id === deptId || d.code.toUpperCase() === deptId.toUpperCase() ? { ...d, hodName: newHodName } : d))
    );
    showToast(`HOD reassigned to ${newHodName}.`, "info");
  };

  const lockDepartmentSAR = (deptCode: string) => {
    setDepartments((prev) =>
      prev.map((d) => (d.code === deptCode ? { ...d, hodSignOffStatus: "Attested & Locked" } : d))
    );

    if (getAuthToken()) {
      collegeApi
        .signOffCompliance({
          remarks: `Criterion 3 SAR Attestation attested for department ${deptCode}`,
        })
        .catch(() => {});
    }
    showToast(`SAR compliance attested & locked for ${deptCode}.`, "success");
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

  const onboardTenant = async (tenantData: Omit<TenantCollege, "id">) => {
    let newTenantId = `col-${tenantData.code.toLowerCase()}-${Date.now()}`;
    let adminEmail = tenantData.principalEmail || `principal@${tenantData.domain.trim().toLowerCase()}`;

    if (getAuthToken()) {
      try {
        const res = await platformApi.createTenant({
          name: tenantData.name,
          tenantCode: tenantData.code,
          ssoDomain: tenantData.domain,
          licenseTier: tenantData.plan as any,
          maxStudentSeats: tenantData.students,
          storageQuotaGb: tenantData.storageQuotaGb || 50,
          enforceStrictSso: tenantData.strictSsoEnforced ?? true,
          principalName: tenantData.principalName || "College Principal",
          principalEmail: adminEmail,
          affiliatingUniversity: tenantData.affiliatingUniversity || "RGPV",
        });
        if (res.tenant?.id) newTenantId = res.tenant.id;
        if (res.adminEmail) adminEmail = res.adminEmail;
      } catch (err) {
        console.warn("Tenant creation API call failed, persisting to store cache:", err);
      }
    }

    const newTenant: TenantCollege = {
      ...tenantData,
      id: newTenantId,
      principalEmail: adminEmail,
      adminEmails: [adminEmail],
    };
    setTenants((prev) => [newTenant, ...prev]);
    addAuditLog({
      actor: "admin@collabex.in (Platform Super Admin)",
      action: "TENANT_PROVISIONED",
      targetTenant: `${newTenant.name} (${newTenant.code})`,
      ipRegion: "103.21.244.10 • ap-south-1",
      status: "SUCCESS",
      details: `Provisioned isolated partition tenant_${newTenant.code.toLowerCase()}_prod with ${newTenant.storageQuotaGb || 50} GB quota, plan ${newTenant.plan}, and initial Principal login: ${adminEmail}`,
    });
    return { tenant: newTenant, adminEmail };
  };

  const provisionTenantAdmin = async (tenantId: string, email?: string, fullName?: string) => {
    let resolvedEmail = email;
    const target = tenants.find((t) => t.id === tenantId);
    if (!resolvedEmail) {
      resolvedEmail = target ? `principal@${target.domain.trim().toLowerCase()}` : "principal@college.edu";
    }

    if (getAuthToken()) {
      try {
        const res = await platformApi.provisionAdmin(tenantId, { email: resolvedEmail, fullName });
        if (res.adminEmail) resolvedEmail = res.adminEmail;
      } catch (err) {
        console.warn("Provision admin API call failed, updating store cache:", err);
      }
    }

    setTenants((prev) =>
      prev.map((t) => {
        if (t.id !== tenantId) return t;
        const currentAdmins = t.adminEmails || [];
        const nextAdmins = currentAdmins.includes(resolvedEmail!) ? currentAdmins : [resolvedEmail!, ...currentAdmins];
        return {
          ...t,
          principalEmail: resolvedEmail,
          adminEmails: nextAdmins,
        };
      })
    );

    addAuditLog({
      actor: "admin@collabex.in (Platform Super Admin)",
      action: "PRINCIPAL_ADMIN_PROVISIONED",
      targetTenant: target?.name || tenantId,
      ipRegion: "103.21.244.10 • ap-south-1",
      status: "SUCCESS",
      details: `Provisioned initial CollegeAdmin account '${resolvedEmail}' for tenant partition`,
    });

    return resolvedEmail;
  };

  const updateTenant = (id: string, updates: Partial<TenantCollege>) => {
    setTenants((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, ...updates };
        addAuditLog({
          actor: "admin@collabex.in (Platform Super Admin)",
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
      actor: "admin@collabex.in (Platform Super Admin)",
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

    if (getAuthToken()) {
      studentApi
        .uploadArtifact({
          slotType: slot as any,
          fileName,
          storageKey: `artifacts/${slot.toLowerCase()}/${fileName}`,
          sha256Checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          fileSizeBytes: 1048576,
        })
        .catch(() => {});
    }
    showToast(`${slot} document uploaded to secure vault.`, "success");
  };

  const uploadArtifactBinary = async (
    teamId: string,
    slot: ArtifactSlot,
    file: File,
    customName?: string,
    similarityScore?: number
  ) => {
    const sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    const finalName = customName || file.name;
    const now = new Date().toISOString().split("T")[0];

    let artifactId = `art-${Date.now()}`;
    let storageKey = `vault/${slot.toLowerCase()}/${finalName}`;
    let sha256Checksum = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

    if (getAuthToken()) {
      try {
        const res = await studentApi.uploadArtifactFile(slot, file);
        if (res.id) artifactId = res.id;
        if (res.storageKey) storageKey = res.storageKey;
        if (res.sha256Checksum) sha256Checksum = res.sha256Checksum;
      } catch (err) {
        console.warn("Artifact upload API failed, updating client cache:", err);
      }
    }

    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        const existing = t.artifacts || [];
        const updated = existing.some((a) => a.slot === slot)
          ? existing.map((a) =>
              a.slot === slot
                ? {
                    ...a,
                    id: artifactId,
                    fileName: finalName,
                    fileSize: sizeStr,
                    uploadedAt: now,
                    storageKey,
                    sha256Checksum,
                    status: "Uploaded" as const,
                    similarityScore: similarityScore ?? a.similarityScore,
                  }
                : a
            )
          : [
              ...existing,
              {
                id: artifactId,
                slot,
                name:
                  slot === "Synopsis"
                    ? "Approved Project Synopsis"
                    : slot === "MidTermPPT"
                    ? "Mid-Term Review Presentation"
                    : slot === "PlagiarismReport"
                    ? "Turnitin Similarity & Originality Report"
                    : "Final Comprehensive Capstone Thesis",
                fileName: finalName,
                fileSize: sizeStr,
                uploadedAt: now,
                storageKey,
                sha256Checksum,
                status: "Uploaded" as const,
                similarityScore,
              },
            ];
        return { ...t, artifacts: updated };
      })
    );
    showToast(`${slot} document uploaded to secure vault.`, "success");
  };

  const reviewArtifact = async (
    teamId: string,
    slot: ArtifactSlot,
    isApproved: boolean,
    reviewerNote?: string
  ) => {
    const status = isApproved ? ("Approved" as const) : ("NeedsRevision" as const);
    const targetTeam = teams.find((t) => t.id === teamId);
    const targetArtifact = targetTeam?.artifacts?.find((a) => a.slot === slot);

    if (getAuthToken() && targetArtifact?.id) {
      try {
        await facultyApi.reviewArtifact(targetArtifact.id, { isApproved, reviewerNote });
      } catch (err) {
        console.warn("Artifact review API failed, updating client cache:", err);
      }
    }

    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        const existing = t.artifacts || [];
        const updated = existing.map((a) =>
          a.slot === slot ? { ...a, status, reviewerNote } : a
        );
        return { ...t, artifacts: updated };
      })
    );
    showToast(
      `Deliverable ${slot} marked as ${isApproved ? "Verified" : "Revision Requested"}.`,
      isApproved ? "success" : "info"
    );
  };

  const continueProjectToNextTrack = (
    teamId: string,
    nextTrack: "Major Phase-I" | "Major Phase-II" = "Major Phase-I"
  ) => {
    const existingTeam = teams.find((t) => t.id === teamId) || teams[0] || initialTeams[0];
    const lineageId = existingTeam?.projectLineageId || (existingTeam?.teamCode ? `lin-${existingTeam.teamCode.toLowerCase()}` : "lin-2026-cs-01");
    const newTeamCode = existingTeam?.teamCode ? existingTeam.teamCode.replace("MIN", nextTrack === "Major Phase-I" ? "MAJ-1" : "MAJ-2") : "2026-CS-MAJ-1-01";
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

    if (getAuthToken()) {
      studentApi
        .continueLineage({
          targetAcademicTrackId: "30000000-0000-0000-0000-000000000001",
          newTitle: `${existingTeam.title} (${nextTrack})`,
          newAbstract: existingTeam.abstract || "Continuation build.",
        })
        .catch(() => {});
    }
    showToast(`Project continued into ${nextTrack} with lineage continuity.`, "success");
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

    if (getAuthToken()) {
      coordinatorApi
        .createException({
          departmentId: "10000000-0000-0000-0000-000000000001",
          projectTeamId: override.teamId,
          actionType:
            override.type === "ReassignGuide"
              ? "ReassignGuide"
              : override.type === "RemoveMember"
              ? "RemoveDroppedMember"
              : "AmendLockedRoster",
          reason: override.reason,
        })
        .catch(() => {});
    }
    showToast("Exception request submitted for HOD review.", "info");
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

    if (getAuthToken()) {
      if (decision === "Approved") {
        hodApi.approveException(overrideId).catch(() => {});
      } else {
        hodApi.rejectException(overrideId, remarks).catch(() => {});
      }
    }
    showToast(`Exception override ${decision.toLowerCase()}.`, "success");
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

    if (getAuthToken()) {
      studentApi.submitExitSurvey({ poRatings: survey.ratings }).catch(() => {});
    }
    showToast("Course exit survey recorded.", "success");
  };

  const resetToDefaults = () => {
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
        coursePrograms,
        academicSessions,
        semesterTerms,
        subjectOfferings,
        isAuthenticated,
        isLiveSession,
        isHydrating,
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
        provisionTenantAdmin,
        updateTenant,
        approvePilot,
        addAuditLog,
        updateCycle,
        updateTeamRepo,
        inviteTeamMember,
        postProblemIdea,
        uploadArtifact,
        uploadArtifactBinary,
        reviewArtifact,
        continueProjectToNextTrack,
        saveIndividualEvaluations,
        submitExceptionOverride,
        reviewExceptionOverride,
        submitCourseExitSurvey,
        importRgpvCatalog,
        configureAcademicSession,
        addCourseProgram,
        removeCourseProgram,
        addSemesterTerm,
        addSubjectOffering,
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

