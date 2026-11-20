export type UserRole = "SuperAdmin" | "CollegeAdmin" | "HOD" | "Faculty" | "Student";

export type AcademicProgramLevel = "UG" | "PG" | "Diploma" | "Research";
export type ParticipationMode = "Team" | "Individual";
export type EnrolmentMode = "SelfJoin" | "CoordinatorAllotted" | "Hybrid";
export type SemesterParity = "Odd" | "Even" | "Combined";
export type SubjectType = "Project" | "MinorProject" | "MajorProject" | "Dissertation" | "Internship" | "Seminar";

export type LicenseTier = "Pilot" | "Standard" | "Enterprise";

export type ProjectStatus =
  | "Draft"
  | "PendingGuide"
  | "PendingCoordinator"
  | "PendingHOD"
  | "ActiveBuild"
  | "AtRisk"
  | "ReadyForViva"
  | "Completed"
  | "Archived";

export type ArtifactSlotType = "Synopsis" | "MidTermPPT" | "PlagiarismReport" | "FinalThesis";

export type ArtifactStatus = "Missing" | "Uploaded" | "Verified" | "RevisionRequested";

export type CheckpointType = "GuideContinuous" | "MidTermReview" | "FinalViva";

export type ExceptionActionType =
  | "ReassignGuide"
  | "RemoveDroppedMember"
  | "AmendLockedRoster"
  | "IndividualReVivaUnlock";

export type SprintTaskStatus = "Todo" | "InProgress" | "Done";

// --- Auth DTOs ---
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RequestPasswordOtpRequest {
  email: string;
}

export interface RequestPasswordOtpResponse {
  message: string;
  devOtp?: string;
  expiresAtUtc: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface UserProfileDto {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isProjectCoordinator: boolean;
  collegeId: string;
  collegeName?: string;
  departmentId?: string;
  departmentName?: string;
  enrollmentOrEmployeeCode: string;
  gitHubHandle?: string;
  jiraKey?: string;
}

export interface AuthResponse {
  token: string;
  expiresAtUtc: string;
  user: UserProfileDto;
}

// --- Platform DTOs ---
export interface CollegeTenantDto {
  id: string;
  name: string;
  tenantCode: string;
  ssoDomain: string;
  licenseTier: LicenseTier;
  maxStudentSeats: number;
  storageQuotaGb: number;
  isActive: boolean;
  enforceStrictSso: boolean;
  crestUrl?: string;
  subscriptionExpiresAtUtc?: string;
  departmentCount: number;
  studentCount: number;
  principalEmail?: string;
  adminEmails?: string[];
}

export interface CreateTenantRequest {
  name: string;
  tenantCode: string;
  ssoDomain: string;
  licenseTier?: LicenseTier;
  maxStudentSeats?: number;
  storageQuotaGb?: number;
  enforceStrictSso?: boolean;
  crestUrl?: string;
  subscriptionExpiresAtUtc?: string;
  principalName?: string;
  principalEmail?: string;
}

export interface CreateTenantResponse {
  tenant: CollegeTenantDto;
  adminEmail: string;
}

export interface ProvisionAdminResponse {
  success: boolean;
  adminEmail: string;
  message: string;
}

export interface UpdateTenantRequest {
  name?: string;
  licenseTier?: LicenseTier;
  maxStudentSeats?: number;
  storageQuotaGb?: number;
  isActive?: boolean;
  enforceStrictSso?: boolean;
  crestUrl?: string;
  subscriptionExpiresAtUtc?: string;
}

export interface MasterOutcomeDto {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  isActive: boolean;
}

export interface MasterSdgDto {
  id: string;
  sdgNumber: number;
  code: string;
  title: string;
  description: string;
  isActive: boolean;
}

export interface PlatformAuditLogDto {
  id: string;
  actorUserId?: string;
  actorEmail: string;
  action: string;
  targetTenantId?: string;
  targetEntity: string;
  metadataJson: string;
  ipAddress?: string;
  occurredAtUtc: string;
}

// --- College DTOs ---
export interface CollegeOverviewDto {
  collegeId: string;
  collegeName: string;
  tenantCode: string;
  totalDepartments: number;
  totalStudents: number;
  totalFaculty: number;
  totalProjects: number;
  criterion3AttainmentPct: number;
  strictSsoEnforced: boolean;
}

export interface DepartmentDto {
  id: string;
  collegeId: string;
  courseProgramId?: string;
  courseProgramCode?: string;
  courseProgramName?: string;
  code: string;
  name: string;
  hodUserId?: string;
  hodName?: string;
  intakeQuota: number;
  studentCount: number;
  facultyCount: number;
  isSarAttested: boolean;
  sarAttestedAtUtc?: string;
}

export interface CreateDepartmentRequest {
  code: string;
  name: string;
  intakeQuota?: number;
  courseProgramId?: string;
}

export interface AppointHodRequest {
  hodUserId: string;
}

export interface CollegeTrackDto {
  id: string;
  collegeId: string;
  departmentId?: string;
  departmentCode?: string;
  academicSessionId?: string;
  courseProgramId?: string;
  semesterTermId?: string;
  subjectOfferingId?: string;
  curriculumSchemeId?: string;
  participationMode?: ParticipationMode;
  enrolmentMode?: EnrolmentMode;
  allowCrossBranchTeams?: boolean;
  name: string;
  academicYear: string;
  allowInterdisciplinaryTeams: boolean;
  isActive: boolean;
  proposalDeadlineUtc?: string;
  finalSubmissionDeadlineUtc?: string;
  guideWeightPct: number;
  midTermWeightPct: number;
  finalVivaWeightPct: number;
  sharedProjectRubricPct: number;
  individualStudentRubricPct: number;
}

export interface CreateCollegeTrackRequest {
  name: string;
  academicYear?: string;
  academicSessionId?: string;
  courseProgramId?: string;
  semesterTermId?: string;
  subjectOfferingId?: string;
  curriculumSchemeId?: string;
  participationMode?: ParticipationMode;
  enrolmentMode?: EnrolmentMode;
  allowCrossBranchTeams?: boolean;
  allowInterdisciplinaryTeams?: boolean;
  proposalDeadlineUtc?: string;
  finalSubmissionDeadlineUtc?: string;
  guideWeightPct?: number;
  midTermWeightPct?: number;
  finalVivaWeightPct?: number;
  sharedProjectRubricPct?: number;
  individualStudentRubricPct?: number;
}

export interface CollegeSettingsDto {
  id: string;
  name: string;
  tenantCode: string;
  ssoDomain: string;
  enforceStrictSso: boolean;
  crestUrl?: string;
  principalSealUrl?: string;
  storageQuotaGb: number;
}

export interface UpdateCollegeSettingsRequest {
  name?: string;
  enforceStrictSso?: boolean;
  crestUrl?: string;
  principalSealUrl?: string;
}

export interface SignOffComplianceRequest {
  remarks: string;
}

// --- HOD DTOs ---
export interface HodDashboardDto {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  totalTeams: number;
  activeBuildTeams: number;
  atRiskTeams: number;
  readyForVivaTeams: number;
  totalStudentsEnrolled: number;
  availableMentors: number;
  nbaDirectAttainmentPct: number;
  nbaIndirectAttainmentPct: number;
  nbaBlendedCriterion3Pct: number;
  isSarAttested: boolean;
}

export interface CreateDepartmentTrackRequest {
  name?: string;
  academicYear?: string;
  academicSessionId?: string;
  courseProgramId?: string;
  semesterTermId?: string;
  subjectOfferingId?: string;
  curriculumSchemeId?: string;
  participationMode?: ParticipationMode;
  enrolmentMode?: EnrolmentMode;
  allowCrossBranchTeams?: boolean;
  allowInterdisciplinaryTeams?: boolean;
  proposalDeadlineUtc?: string;
  finalSubmissionDeadlineUtc?: string;
  guideWeightPct?: number;
  midTermWeightPct?: number;
  finalVivaWeightPct?: number;
  sharedProjectRubricPct?: number;
  individualStudentRubricPct?: number;
}

export interface ProjectProposalDto {
  teamId: string;
  teamCode: string;
  title: string;
  abstract: string;
  domainTag: string;
  sdgCode: string;
  status: ProjectStatus;
  guideUserId?: string;
  guideName?: string;
  memberCount: number;
  similarityScorePct?: number;
  similarProjectCode?: string;
}

export interface FacultyWorkloadDto {
  facultyId: string;
  fullName: string;
  email: string;
  employeeCode: string;
  isProjectCoordinator: boolean;
  currentMentoredTeams: number;
  maxMentorTeams: number;
  skillsCsv?: string;
}

export interface ToggleCoordinatorRequest {
  isProjectCoordinator: boolean;
}

export interface UpdateMentorCapRequest {
  maxMentorTeams: number;
}

export interface PoAttainmentScoreDto {
  poCode: string;
  title: string;
  directAttainmentPct: number;
  indirectAttainmentPct: number;
  blendedAttainmentPct: number;
  targetMet: boolean;
}

export interface NbaAttainmentReportDto {
  departmentId: string;
  academicYear: string;
  overallDirectPct: number;
  overallIndirectPct: number;
  overallBlendedPct: number;
  poBreakdown: PoAttainmentScoreDto[];
}

export interface ExceptionAuditLogDto {
  id: string;
  projectTeamId: string;
  teamCode: string;
  actionType: ExceptionActionType;
  reason: string;
  previousValueJson: string;
  newValueJson: string;
  requestedByUserId: string;
  requestedByName?: string;
  createdAtUtc: string;
  isApproved: boolean;
  approvedAtUtc?: string;
}

// --- Coordinator DTOs ---
export interface RosterRowInput {
  fullName: string;
  email: string;
  enrollmentOrEmployeeCode: string;
  role?: UserRole;
  skillsCsv?: string;
  gitHubHandle?: string;
}

export interface RosterImportRequest {
  departmentId: string;
  rows: RosterRowInput[];
}

export interface RosterImportResultDto {
  totalProcessed: number;
  insertedCount: number;
  updatedCount: number;
  warnings: string[];
}

export interface AssignGuideRequest {
  guideUserId: string;
}

export interface ScheduleVivaPanelRequest {
  departmentId: string;
  academicTrackId: string;
  panelName: string;
  scheduledAtUtc: string;
  roomOrLink: string;
  evaluatorUserIds: string[];
}

export interface VivaPanelDto {
  id: string;
  panelName: string;
  scheduledAtUtc: string;
  roomOrLink: string;
  evaluatorNames: string[];
}

export interface CreateExceptionRequest {
  departmentId: string;
  projectTeamId: string;
  actionType: ExceptionActionType;
  targetUserId?: string;
  reason: string;
  previousValueJson?: string;
  newValueJson?: string;
}

// --- Faculty DTOs ---
export interface ActionQueueItemDto {
  itemId: string;
  type: string;
  projectTeamId: string;
  teamCode: string;
  teamTitle: string;
  description: string;
  submittedAtUtc: string;
}

export interface ActionQueueDto {
  pendingLogsCount: number;
  pendingProposalsCount: number;
  items: ActionQueueItemDto[];
}

export interface VerifyLogRequest {
  remarks?: string;
}

export interface CreateProblemStatementRequest {
  departmentId: string;
  academicTrackId: string;
  title: string;
  abstract: string;
  sdgCode: string;
  prerequisitesCsv?: string;
  maxTeamCapacity?: number;
}

export interface StudentScoreInput {
  studentUserId: string;
  moduleOwnershipScore: number;
  vivaQaScore: number;
  logDisciplineScore: number;
}

export interface SubmitVivaEvaluationRequest {
  projectTeamId: string;
  checkpointType: CheckpointType;
  sharedRubricScoresJson: string;
  sharedTotalScore: number;
  generalRemarks?: string;
  studentScores: StudentScoreInput[];
}

// --- Student DTOs ---
export interface TeamMemberDto {
  userId: string;
  fullName: string;
  enrollmentCode: string;
  isTeamLead: boolean;
  moduleResponsibility: string;
}

export interface SprintTaskDto {
  id: string;
  title: string;
  categoryTag: string;
  assignedToUserId?: string;
  assigneeName?: string;
  status: SprintTaskStatus;
  dueDateUtc?: string;
}

export interface ArtifactSlotDto {
  id?: string;
  slotType: ArtifactSlotType;
  fileName?: string;
  storageKey?: string;
  sha256Checksum?: string;
  fileSizeBytes: number;
  status: ArtifactStatus;
  reviewerNote?: string;
}

export interface WeeklyLogDto {
  id: string;
  authorUserId: string;
  authorName: string;
  weekNumber: number;
  accomplishmentsSummary: string;
  blockersSummary?: string;
  hoursLogged: number;
  gitCommitCount: number;
  isVerified: boolean;
  mentorRemarks?: string;
  createdAtUtc: string;
}

export interface StudentWorkspaceDto {
  teamId: string;
  teamCode: string;
  title: string;
  abstract: string;
  domainTag: string;
  sdgCode: string;
  status: ProjectStatus;
  guideUserId?: string;
  guideName?: string;
  repoUrl?: string;
  jiraBoardKey?: string;
  isRosterLocked: boolean;
  missedLogStreak: number;
  projectLineageId: string;
  participationMode?: ParticipationMode;
  enrolmentMode?: EnrolmentMode;
  allowCrossBranchTeams?: boolean;
  members: TeamMemberDto[];
  tasks: SprintTaskDto[];
  artifacts: ArtifactSlotDto[];
  weeklyLogs: WeeklyLogDto[];
}

export interface CreateTaskRequest {
  title: string;
  categoryTag: string;
  assignedToUserId?: string;
  status?: SprintTaskStatus;
  dueDateUtc?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  categoryTag?: string;
  assignedToUserId?: string;
  status?: SprintTaskStatus;
  dueDateUtc?: string;
}

export interface SubmitLogbookRequest {
  weekNumber: number;
  accomplishmentsSummary: string;
  blockersSummary?: string;
  hoursLogged: number;
  gitCommitCount: number;
}

export interface UploadArtifactRequest {
  slotType: ArtifactSlotType;
  fileName: string;
  storageKey: string;
  sha256Checksum: string;
  fileSizeBytes: number;
}

export interface ContinueLineageRequest {
  targetAcademicTrackId: string;
  newTitle: string;
  newAbstract: string;
}

export interface SubmitExitSurveyRequest {
  poRatings: Record<string, number>;
}

export interface StudentPortfolioDto {
  studentId: string;
  fullName: string;
  enrollmentCode: string;
  collegeName: string;
  departmentName: string;
  projectTitle: string;
  teamCode: string;
  moduleResponsibility: string;
  domainTag: string;
  sdgCode: string;
  repoUrl?: string;
  totalHoursLogged: number;
  totalCommits: number;
  verifiedArtifacts: ArtifactSlotDto[];
}

// --- RGPV Master Catalog & Dynamic Multi-Level Academic Hierarchy DTOs ---

export interface ImportUniversityCatalogRequest {
  universityCode?: string;
  programCodes?: string[];
}

export interface ImportCatalogResultDto {
  universityCode: string;
  universityName: string;
  programsImported: number;
  departmentsCreated: number;
  semesterTermsCreated: number;
  subjectOfferingsCreated: number;
  message: string;
}

export interface CourseProgramDto {
  id: string;
  collegeId: string;
  masterProgramId?: string;
  level: AcademicProgramLevel;
  code: string;
  name: string;
  totalSemesters: number;
  isActive: boolean;
  departmentCount: number;
}

export interface CreateCourseProgramRequest {
  code: string;
  name: string;
  level: AcademicProgramLevel;
  totalSemesters?: number;
  masterProgramId?: string;
}

export interface AcademicSessionDto {
  id: string;
  collegeId: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface CreateAcademicSessionRequest {
  label: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export interface SemesterTermDto {
  id: string;
  collegeId: string;
  departmentId: string;
  departmentCode?: string;
  departmentName?: string;
  academicSessionId?: string;
  academicSessionLabel?: string;
  semesterNumber: number;
  semesterName: string;
  parity: SemesterParity;
  isActive: boolean;
  subjectOfferingCount: number;
}

export interface CreateSemesterTermRequest {
  departmentId: string;
  academicSessionId?: string;
  semesterNumber: number;
  semesterName?: string;
  parity?: SemesterParity;
}

export interface SubjectOfferingDto {
  id: string;
  collegeId: string;
  semesterTermId: string;
  semesterTermName?: string;
  curriculumSchemeId?: string;
  curriculumSchemeCode?: string;
  subjectCode: string;
  subjectName: string;
  subjectType: SubjectType;
  credits: number;
  internalMaxMarks: number;
  externalMaxMarks: number;
  isActive: boolean;
}

export interface CreateSubjectOfferingRequest {
  semesterTermId: string;
  curriculumSchemeId?: string;
  subjectCode: string;
  subjectName: string;
  subjectType?: SubjectType;
  credits?: number;
  internalMaxMarks?: number;
  externalMaxMarks?: number;
}

export interface HierarchyOfferingNodeDto {
  id: string;
  subjectCode: string;
  subjectName: string;
  subjectType: SubjectType;
  credits: number;
  internalMaxMarks: number;
  externalMaxMarks: number;
}

export interface HierarchySemesterNodeDto {
  id: string;
  semesterNumber: number;
  semesterName: string;
  parity: SemesterParity;
  offerings: HierarchyOfferingNodeDto[];
}

export interface HierarchyDepartmentNodeDto {
  id: string;
  code: string;
  name: string;
  hodName?: string;
  studentCount: number;
  semesters: HierarchySemesterNodeDto[];
}

export interface HierarchyProgramNodeDto {
  id: string;
  code: string;
  name: string;
  level: AcademicProgramLevel;
  totalSemesters: number;
  departments: HierarchyDepartmentNodeDto[];
}

export interface AcademicHierarchyTreeDto {
  programs: HierarchyProgramNodeDto[];
}

export interface MasterProgramSummaryDto {
  id: string;
  code: string;
  name: string;
  level: AcademicProgramLevel;
  durationYears: number;
  totalSemesters: number;
  branchCount: number;
  branches: string[];
}

export interface MasterCatalogOverviewDto {
  universityId: string;
  universityCode: string;
  universityName: string;
  state: string;
  programs: MasterProgramSummaryDto[];
  schemes: string[];
}

export interface HodAcademicContextDto {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  courseProgramId?: string;
  courseProgramName?: string;
  availableSessions: AcademicSessionDto[];
  availableSemesters: SemesterTermDto[];
  availableOfferings: SubjectOfferingDto[];
}
