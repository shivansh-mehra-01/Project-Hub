export type UserRole = "SuperAdmin" | "CollegeAdmin" | "HOD" | "Faculty" | "Student";
export type RoleType = UserRole | "TeamLead";
export type FacultyDesignation = "Professor" | "AssociateProfessor" | "AssistantProfessor" | "AdjunctFaculty";
export type InstitutionalResponsibility = "None" | "Principal" | "CampusDirector" | "DeanAcademics" | "ControllerOfExaminations" | "IqacCoordinator" | "Registrar";

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
  | "IndividualReVivaUnlock"
  | "SingleStudentProvisioned";

export type SprintTaskStatus = "Todo" | "InProgress" | "Done" | "InReview" | "Blocked";

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
  affiliatingUniversity?: string;
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
  affiliatingUniversity?: string;
}

export interface CreateTenantResponse {
  tenant: CollegeTenantDto;
  adminEmail: string;
  devOtp?: string;
  message?: string;
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

export interface CreatePlatformAuditLogRequest {
  action: string;
  targetEntity: string;
  targetTenantId?: string;
  metadataJson?: string;
  ipAddress?: string;
}

export interface PlatformSessionDto {
  id: string;
  accountEmail: string;
  accountName: string;
  role: string;
  device: string;
  browser: string;
  ipAddress: string;
  loginTimeUtc: string;
  lastActiveTimeUtc: string;
  isCurrentSession: boolean;
}

export interface OverviewCourseHierarchyDto {
  courseId: string;
  code: string;
  name: string;
  branchCount: number;
  branches: string[];
}

export interface CollegeActivityItemDto {
  title: string;
  timeAgo: string;
  occurredAtUtc: string;
}

export interface CollegeNotificationItemDto {
  type: "success" | "info" | "warning";
  message: string;
  timeAgo: string;
  createdAtUtc: string;
}

// --- College DTOs ---
export interface AicteCadreComplianceDto {
  programLevel: string;
  programCode: string;
  sanctionedIntake: number;
  programDurationYears: number;
  totalSanctionedStrength: number;
  requiredFaculty: number;
  availableFaculty: number;
  requiredRatio: string;
  actualRatio: string;
  isCompliant: boolean;
  cadreStatus: "Compliant" | "Compliant — subject to qualification verification" | "NonCompliant" | "Insufficient Data";
  requiredProfessors: number;
  actualProfessors: number;
  requiredAssociateProfessors: number;
  actualAssociateProfessors: number;
  requiredAssistantProfessors: number;
  actualAssistantProfessors: number;
  statusMessage?: string;
  isSubstituted?: boolean;
  substitutedProfessorsCount?: number;
  qualificationVerificationNotice?: string;
}

export interface CohortEnrollmentCapacityDto {
  totalSanctionedMultiCohortCapacity: number;
  totalEnrolledStudents: number;
  utilizationPercentage: number;
  hasReliableEnrollmentRecords: boolean;
  statusMessage?: string;
}

export interface CollegeOverviewDto {
  collegeId: string;
  collegeName: string;
  tenantCode: string;
  adminName?: string;
  totalCourses?: number;
  totalBranches?: number;
  totalDepartments: number;
  totalStudents: number;
  totalFaculty: number;
  totalProjects: number;
  criterion3AttainmentPct: number;
  strictSsoEnforced: boolean;
  affiliatedUniversity?: string;
  collegeType?: string;
  establishedYear?: string;
  campusesSummary?: string;
  crestUrl?: string;
  currentSemesterLabel?: string;
  lastUpdatedUtc?: string;
  activeSession?: AcademicSessionDto;
  cohortCapacity?: CohortEnrollmentCapacityDto;
  programAicteCompliance?: AicteCadreComplianceDto[];
  sarDepartmentAttestationPct?: number;
  attestedDepartmentsCount?: number;
  totalDepartmentsForSar?: number;
  departmentSummaries?: DepartmentTrackSummaryDto[];
  academicStructure?: OverviewCourseHierarchyDto[];
  recentActivities?: CollegeActivityItemDto[];
  notifications?: CollegeNotificationItemDto[];
}

export interface DepartmentTrackSummaryDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  hodName?: string;
  intakeQuota: number;
  studentCount: number;
  facultyCount: number;
  criterion3AttainmentPct: number;
  trackStatus: string;
  activeTrackCount: number;
  activeTrackNames: string[];
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
  trackStatus?: string;
  activeTrackCount?: number;
}

export interface CreateDepartmentRequest {
  code: string;
  name: string;
  intakeQuota?: number;
  courseProgramId?: string;
}

export interface UpdateDepartmentRequest {
  name: string;
  code: string;
  intakeQuota?: number;
  courseProgramId?: string;
  isActive?: boolean;
}

export interface AppointHodRequest {
  hodUserId: string;
}

export interface CreateHodRequest {
  fullName: string;
  email: string;
  employeeCode?: string;
  departmentId: string;
  temporaryPassword?: string;
}

export interface HodManagementDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  courseProgramId?: string;
  courseProgramCode?: string;
  courseProgramName?: string;
  hodUserId?: string;
  hodName?: string;
  hodEmail?: string;
  employeeCode?: string;
  isActive: boolean;
  appointedAtUtc?: string;
}

export interface HodAssignmentHistoryDto {
  id: string;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  hodUserId: string;
  hodName: string;
  hodEmail: string;
  employeeCode: string;
  appointedAtUtc: string;
  appointedBy: string;
  isCurrent: boolean;
}

export interface CollegeStaffDto {
  id: string;
  fullName: string;
  email: string;
  role: RoleType;
  designation?: FacultyDesignation;
  delegatedResponsibility?: InstitutionalResponsibility;
  departmentId?: string;
  departmentCode?: string;
  departmentName?: string;
  employeeCode?: string;
  isActive: boolean;
  isActivated: boolean;
  createdAtUtc: string;
  lastLoginAtUtc?: string;
}

export interface CreateCollegeStaffRequest {
  fullName: string;
  email: string;
  role: RoleType;
  designation?: FacultyDesignation;
  delegatedResponsibility?: InstitutionalResponsibility;
  departmentId?: string;
  employeeCode?: string;
}

export interface UpdateCollegeStaffRequest {
  fullName?: string;
  role?: RoleType;
  designation?: FacultyDesignation;
  delegatedResponsibility?: InstitutionalResponsibility;
  departmentId?: string;
  employeeCode?: string;
}

export interface BulkStaffUploadRowDto {
  fullName: string;
  email: string;
  departmentCode?: string;
  employeeCode?: string;
  role: RoleType;
  designation?: FacultyDesignation;
}

export interface BulkStaffUploadRequest {
  staffRows: BulkStaffUploadRowDto[];
}

export interface BulkStaffUploadResultDto {
  totalSubmitted: number;
  successfullyCreated: number;
  failedCount: number;
  errors: string[];
}

export interface ExaminationTabulationRowDto {
  studentId: string;
  enrollmentNumber: string;
  studentName: string;
  departmentCode: string;
  teamNumber: string;
  projectTitle: string;
  guideScore: number;
  midTermScore: number;
  finalVivaScore: number;
  totalScore: number;
  grade: string;
  gradePoints: number;
  resultStatus: string;
  meetsNbaAttainmentThreshold: boolean;
}

export interface ExaminationTabulationRegisterDto {
  academicYear: string;
  trackName: string;
  guideWeightPct: number;
  midTermWeightPct: number;
  finalVivaWeightPct: number;
  isCertified: boolean;
  certifiedAtUtc?: string;
  certifiedBy?: string;
  certificationChecksum?: string;
  totalStudentsTabulated: number;
  totalPassed: number;
  totalFailed: number;
  averageTotalScore: number;
  rows: ExaminationTabulationRowDto[];
}

export interface CertifyExaminationRegisterRequest {
  remarks?: string;
}

export interface UpdateUserStatusRequest {
  isActive: boolean;
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
  affiliatedUniversity?: string;
  campusAddress?: string;
  campusesCsv?: string;
  nbaModuleEnabled?: boolean;
  githubIntegrationEnabled?: boolean;
  jiraIntegrationEnabled?: boolean;
  licenseTier?: string;
  maxStudentSeats?: number;
  enrolledStudentCount?: number;
  storageQuotaGb?: number;
  usedStorageGb?: number;
}

export interface UpdateCollegeSettingsRequest {
  name?: string;
  enforceStrictSso?: boolean;
  crestUrl?: string;
  principalSealUrl?: string;
  affiliatedUniversity?: string;
  campusAddress?: string;
  campusesCsv?: string;
  nbaModuleEnabled?: boolean;
  githubIntegrationEnabled?: boolean;
  jiraIntegrationEnabled?: boolean;
  ssoDomain?: string;
}

export interface SignOffComplianceRequest {
  remarks: string;
}

export interface InstitutionalDossierDto {
  collegeName: string;
  tenantCode: string;
  ssoDomain: string;
  affiliatedUniversity: string;
  academicYear: string;
  totalDepartments: number;
  totalStudents: number;
  totalFaculty: number;
  overallAttainmentPct: number;
  isAttested: boolean;
  attestedAtUtc?: string;
  attestedBy?: string;
  departments: DepartmentAttainmentSummaryDto[];
}

export interface DepartmentAttainmentSummaryDto {
  departmentCode: string;
  departmentName: string;
  hodName?: string;
  studentCount: number;
  attainmentPct: number;
  isSarAttested: boolean;
  sarAttestedAtUtc?: string;
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
  completedTeams: number;
  draftTeams: number;
  projectsWithoutGuide: number;
  pendingProposals: number;
  pendingGradeUnlocks: number;
  pendingExceptions: number;
  totalStudentsEnrolled: number;
  availableMentors: number;
  nbaDirectAttainmentPct?: number | null;
  nbaIndirectAttainmentPct?: number | null;
  nbaBlendedCriterion3Pct?: number | null;
  isSarAttested: boolean;
  sarAttestedAtUtc?: string;
}

export interface HodProjectMemberDto {
  userId: string;
  fullName: string;
  enrollmentNumber: string;
  isTeamLead: boolean;
  moduleResponsibility?: string;
}

export interface HodProjectDto {
  id: string;
  teamCode: string;
  title: string;
  abstract: string;
  domainTag: string;
  sdgCode: string;
  status: ProjectStatus;
  academicTrackId: string;
  academicTrackName?: string;
  guideUserId?: string;
  guideName?: string;
  memberCount: number;
  isRosterLocked: boolean;
  missedLogStreak: number;
  similarityScorePct?: number;
  repoUrl?: string;
  members: HodProjectMemberDto[];
  latestEvaluationScore?: number;
  latestEvaluationCheckpoint?: string;
  createdAtUtc: string;
}

export interface HodAssignGuideRequest {
  guideUserId: string;
  reason?: string;
}

export interface TrackReportStatDto {
  trackId: string;
  trackName: string;
  projectCount: number;
  studentCount: number;
  completedCount: number;
}

export interface DomainDistributionDto {
  domain: string;
  count: number;
}

export interface HodReportsSummaryDto {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  totalProjects: number;
  completedProjects: number;
  activeProjects: number;
  atRiskProjects: number;
  projectsWithoutGuide: number;
  totalStudents: number;
  totalFaculty: number;
  averageFacultyLoad: number;
  trackStats: TrackReportStatDto[];
  domainDistribution: DomainDistributionDto[];
}

export interface GradeUnlockRequestDto {
  id: string;
  evaluationId: string;
  teamId: string;
  teamCode: string;
  teamTitle: string;
  requestedByFacultyName: string;
  reason: string;
  checkpointType: string;
  requestedAtUtc: string;
}

export interface ApproveGradeUnlockRequest {
  remarks?: string;
}

export interface RejectGradeUnlockRequest {
  remarks?: string;
  reason?: string;
}

export interface DepartmentStudentResultDto {
  usn: string;
  studentName: string;
  teamCode: string;
  projectTitle: string;
  guideScore: number;
  midTermScore: number;
  externalVivaScore: number;
  totalMarks: number;
  letterGrade: string;
  nbaAttainmentStatus: string;
}

export interface AttestSarResponse {
  success: boolean;
  attestedAtUtc: string;
  attestedByName: string;
  status: string;
  message: string;
}

export interface CreateDepartmentTrackRequest {
  name?: string;
  academicYear?: string;
  academicSessionId?: string;
  courseProgramId?: string;
  semesterTermId?: string;
  semesterNumber?: number;
  subjectOfferingId?: string;
  customSubjectCode?: string;
  customSubjectName?: string;
  credits?: number;
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
  directAttainmentPct?: number | null;
  indirectAttainmentPct?: number | null;
  blendedAttainmentPct?: number | null;
  targetMet: boolean;
}

export interface NbaAttainmentReportDto {
  departmentId: string;
  academicYear: string;
  overallDirectPct?: number | null;
  overallIndirectPct?: number | null;
  overallBlendedPct?: number | null;
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

export interface AddSingleStudentRequest {
  fullName: string;
  enrollmentNumber: string;
  email: string;
  departmentId: string;
  semesterNumber: number;
  admissionBatch: string;
}

export interface SingleStudentProvisionedResponse {
  studentUserId: string;
  fullName: string;
  enrollmentNumber: string;
  email: string;
  message: string;
  devOtp?: string;
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
  decision?: "Approved" | "NeedsRevision";
  isApproved?: boolean;
  remarks?: string;
}

export interface ReturnProposalRequest {
  remarks: string;
  reason?: string;
}

export interface ReviewArtifactRequest {
  isApproved: boolean;
  reviewerNote?: string;
}

export interface AssignedDefenseTeamMemberDto {
  userId: string;
  fullName: string;
  enrollmentCode: string;
  isTeamLead: boolean;
  moduleResponsibility: string;
}

export interface AssignedDefenseTeamDto {
  teamId: string;
  teamCode: string;
  title: string;
  abstract: string;
  domainTag: string;
  guideUserId?: string;
  guideName?: string;
  isGuideConflict: boolean;
  checkpointType: CheckpointType;
  isEvaluationLocked: boolean;
  scheduledAtUtc?: string;
  roomOrLink?: string;
  members: AssignedDefenseTeamMemberDto[];
}

export interface ProblemBankStatement {
  id: string;
  collegeId: string;
  departmentId: string;
  academicTrackId: string;
  proposedByFacultyId: string;
  title: string;
  abstract: string;
  sdgCode: string;
  prerequisitesCsv?: string;
  maxTeamCapacity: number;
  isAllocated: boolean;
  allocatedTeamId?: string;
  createdAtUtc: string;
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
  projectTeamId?: string;
  title: string;
  categoryTag: string;
  assignedToUserId?: string;
  assigneeName?: string;
  status: SprintTaskStatus;
  dueDateUtc?: string;
  createdAtUtc?: string;
  isOverdue?: boolean;
}

export interface UpdateTaskStatusRequest {
  status: SprintTaskStatus;
}

export interface ProjectProgressDto {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  inReviewTasks: number;
  blockedTasks: number;
  completionPercentage: number;
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
  uploadedAtUtc?: string;
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
  preferredGuideUserId?: string;
  preferredGuideName?: string;
  guidePreferenceStatus?: GuidePreferenceStatus;
  guidePreferenceRemarks?: string;
  guideAllocationRemarks?: string;
  guideAllocatedAtUtc?: string;
  members: TeamMemberDto[];
  tasks: SprintTaskDto[];
  milestones?: ProjectMilestoneDto[];
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

// --- Phase 2: Student Identity, Profile & Dashboard DTOs ---

export interface StudentProfileDto {
  userId: string;
  fullName: string;
  enrollmentOrEmployeeCode: string;
  email: string;
  collegeId: string;
  collegeName: string;
  collegeCode: string;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  academicProgram: string;
  currentSemester: number;
  enrollmentStatus: string;
  academicSessionName: string;
  skills: string[];
  gitHubHandle?: string;
  jiraKey?: string;
  phoneNumber?: string;
  bio?: string;
  profileCompletionPercentage: number;
  isActive: boolean;
}

export interface UpdateStudentProfileRequest {
  skills?: string[];
  gitHubHandle?: string;
  jiraKey?: string;
  phoneNumber?: string;
  bio?: string;
}

export interface StudentIdentitySummaryDto {
  userId: string;
  fullName: string;
  usn: string;
  email: string;
  collegeId: string;
  collegeName: string;
  collegeCode: string;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  avatarUrl?: string;
}

export interface AcademicSessionSummaryDto {
  id: string;
  sessionName: string;
  termType: string;
  startDateUtc: string;
  endDateUtc: string;
  isActive: boolean;
  isOffseason: boolean;
}

export interface AcademicEnrollmentSummaryDto {
  id: string;
  program: string;
  semester: number;
  section?: string;
  status: string;
  enrolledAtUtc: string;
}

export interface DashboardProjectSummaryDto {
  teamId: string;
  teamCode: string;
  title: string;
  abstract: string;
  status: string;
  trackName: string;
  guideName?: string;
  guideEmail?: string;
  isLeader: boolean;
  memberCount: number;
  domainTag: string;
  sdgGoal?: string;
  githubRepoUrl?: string;
  isRosterLocked: boolean;
  missedLogStreak: number;
  proposalRemarks?: string;
  members: TeamMemberDto[];
  tasks: SprintTaskDto[];
  artifacts: ArtifactSlotDto[];
  weeklyLogs: WeeklyLogDto[];
}

export interface DashboardActionCapabilitiesDto {
  canCreateProject: boolean;
  canJoinTeam: boolean;
  canInviteMembers: boolean;
  canEditWorkspace: boolean;
  canSubmitArtifacts: boolean;
  canSubmitWeeklyLog: boolean;
}

export interface StudentDashboardDto {
  identity: StudentIdentitySummaryDto;
  activeSession?: AcademicSessionSummaryDto;
  activeEnrollment?: AcademicEnrollmentSummaryDto;
  allocationState: "Allocated" | "Unallocated" | "NoActiveEnrollment" | "Offseason" | "Archived";
  activeProject?: DashboardProjectSummaryDto;
  historicalTeams: DashboardProjectSummaryDto[];
  capabilities: DashboardActionCapabilitiesDto;
  profileCompletionPercentage: number;
  unreadNotificationsCount: number;
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

// --- Phase 3: Project Discovery, Problem Bank & Idea Registration DTOs ---

export interface ProblemBankStatementDto {
  id: string;
  title: string;
  abstract: string;
  sdgCode: string;
  prerequisites: string[];
  maxTeamCapacity: number;
  isAllocated: boolean;
  proposedByFacultyId: string;
  facultyName: string;
  departmentName: string;
  departmentCode: string;
  academicTrackName: string;
  createdAtUtc: string;
}

export interface ArchivedProjectSummaryDto {
  teamId: string;
  teamCode: string;
  title: string;
  abstract: string;
  domainTag: string;
  sdgCode: string;
  academicYear: string;
  trackName: string;
  guideName: string;
  repoUrl?: string;
  status: string;
  memberCount: number;
  similarityScorePct?: number;
}

export interface CreateProjectIdeaRequest {
  title: string;
  abstract: string;
  domainTag: string;
  sdgCode: string;
  guideUserId?: string;
  academicTrackId?: string;
  adoptedProblemBankId?: string;
}

export interface UpdateProjectIdeaRequest {
  title?: string;
  abstract?: string;
  domainTag?: string;
  sdgCode?: string;
  guideUserId?: string;
}

export interface CheckSimilarityRequest {
  title: string;
  abstract?: string;
  excludeTeamId?: string;
}

export interface SimilarityCheckResultDto {
  similarityScorePct: number;
  similarProjectCode?: string;
  similarProjectTitle?: string;
  isWarning: boolean;
  message: string;
}

export interface ProjectReviewTimelineItemDto {
  stage: string;
  action: string;
  remarks: string;
  reviewerName?: string;
  occurredAtUtc: string;
}

export interface ProjectIdeaDto {
  id: string;
  teamCode: string;
  title: string;
  abstract: string;
  domainTag: string;
  sdgCode: string;
  status: string;
  guideUserId?: string;
  guideName?: string;
  guideEmail?: string;
  isLeader: boolean;
  isRosterLocked: boolean;
  similarityScorePct?: number;
  similarProjectCode?: string;
  latestReviewRemarks?: string;
  latestReviewerName?: string;
  latestReviewedAtUtc?: string;
  createdAtUtc: string;
  members: TeamMemberDto[];
  reviewHistory: ProjectReviewTimelineItemDto[];
}

export interface SubmitProposalRequest {
  remarks?: string;
}

export interface FacultyGuideSummaryDto {
  id: string;
  fullName: string;
  email: string;
  employeeCode?: string;
  designation?: string;
  departmentCode?: string;
  skillsCsv?: string;
  currentMentoredTeams: number;
  maxMentorTeams: number;
  isAvailable: boolean;
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

export interface UpdateCourseProgramRequest {
  name: string;
  level: AcademicProgramLevel;
  totalSemesters: number;
  isActive?: boolean;
}

export interface AcademicSessionDto {
  id: string;
  collegeId: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  examCutoffDateUtc?: string;
  allowInterdisciplinaryTeams?: boolean;
}

export interface ConfigureAcademicSessionRequest {
  academicYear: string;
  examCutoffDateUtc?: string;
  allowInterdisciplinaryTeams?: boolean;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface CreateAcademicSessionRequest {
  label: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  examCutoffDateUtc?: string;
  allowInterdisciplinaryTeams?: boolean;
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
  semesterNumber?: number;
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

// --- Account Management DTOs ---
export interface NotificationPreferencesDto {
  criticalOutages: boolean;
  securityIncidents: boolean;
  collegeApplications: boolean;
  supportTickets: boolean;
  subscriptionExpiry: boolean;
  dailyDigest: boolean;
  emailChannel: boolean;
  smsChannel: boolean;
}

export interface ConsolePreferencesDto {
  dateFormat: "DD/MM/YYYY" | "YYYY-MM-DD";
  timezone: string;
  density: "compact" | "comfortable";
}

export interface AdminProfileDto {
  id: string;
  fullName: string;
  email: string;
  isEmailVerified: boolean;
  phoneNumber: string;
  isPhoneVerified: boolean;
  adminId: string;
  role: string;
  passwordChangedAtUtc: string;
  mfaEnabled: boolean;
  notificationPreferences: NotificationPreferencesDto;
  consolePreferences: ConsolePreferencesDto;
}

export interface UpdateAdminProfileRequest {
  fullName: string;
  phoneNumber?: string;
}

export interface RequestEmailChangeRequest {
  newEmail: string;
}

export interface VerifyEmailChangeRequest {
  newEmail: string;
  otp: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  revokeOtherSessions: boolean;
}

export interface ReauthenticateRequest {
  currentPassword: string;
}

export interface MfaMethodDto {
  id: string;
  name: string;
  type: string;
  isConfigured: boolean;
  isPrimary: boolean;
  description: string;
}

export interface MfaStatusDto {
  mfaStatus: string;
  isMandatory: boolean;
  explanation: string;
  methods: MfaMethodDto[];
  recoveryCodesConfigured: boolean;
}

export interface AccountSessionDto {
  id: string;
  device: string;
  browser: string;
  ipAddress: string;
  location: string;
  loginTimeUtc: string;
  lastActiveTimeUtc: string;
  isCurrentSession: boolean;
}

// --- Phase 4: Team Formation, Membership & Invitation DTOs ---

export interface EligiblePeerDto {
  studentId: string;
  fullName: string;
  enrollmentCode: string;
  departmentCode: string;
  departmentName: string;
  programName: string;
  currentSemester: number;
  skills: string[];
  bio?: string;
  gitHubHandle?: string;
  isInvited: boolean;
}

export interface CreateStudentTeamRequest {
  title: string;
  abstract: string;
  domainTag?: string;
  sdgCode?: string;
  academicTrackId?: string;
}

export interface SendTeamInvitationRequest {
  inviteeStudentId?: string;
  enrollmentCode?: string;
  message?: string;
}

export type InvitationStatus = "Pending" | "Accepted" | "Declined" | "Cancelled" | "Expired";

export interface TeamInvitationDto {
  id: string;
  projectTeamId: string;
  teamCode: string;
  projectTitle: string;
  inviterStudentId: string;
  inviterName: string;
  inviteeStudentId: string;
  inviteeName: string;
  inviteeEnrollmentCode: string;
  status: InvitationStatus;
  statusText: string;
  message?: string;
  invitedAtUtc: string;
  expiresAtUtc?: string;
  respondedAtUtc?: string;
  responseNotes?: string;
  currentTeamSize: number;
  maxTeamCapacity: number;
  isRosterLocked: boolean;
}

export interface RespondInvitationRequest {
  responseNotes?: string;
}

export interface TransferTeamLeadRequest {
  targetStudentId: string;
}

export interface StudentTeamRosterDto {
  teamId: string;
  teamCode: string;
  title: string;
  abstract: string;
  status: string;
  isRosterLocked: boolean;
  isCallerLead: boolean;
  minTeamSize: number;
  maxTeamSize: number;
  currentMemberCount: number;
  members: TeamMemberDto[];
  pendingInvitations: TeamInvitationDto[];
  guideUserId?: string;
  guideName?: string;
  preferredGuideUserId?: string;
  preferredGuideName?: string;
  guidePreferenceStatus?: GuidePreferenceStatus;
  guidePreferenceRemarks?: string;
  guideAllocationRemarks?: string;
  guideAllocatedAtUtc?: string;
}

// =========================================================================
// PHASE 5: OFFICIAL GUIDE ALLOCATION & PREFERENCE DTOs
// =========================================================================

export type GuidePreferenceStatus = "None" | "Requested" | "Allocated" | "Rejected";

export interface SubmitGuidePreferenceRequest {
  guideUserId: string;
  remarks?: string;
}

export interface GuideReassignmentHistoryItemDto {
  id: string;
  previousGuideId?: string;
  previousGuideName?: string;
  newGuideId: string;
  newGuideName: string;
  reason: string;
  approvedByName: string;
  approvedAtUtc: string;
}

export interface StudentGuidePreferenceDto {
  teamId: string;
  teamCode: string;
  projectTitle: string;
  status: ProjectStatus;
  isRosterLocked: boolean;
  isCallerLead: boolean;
  preferredGuideUserId?: string;
  preferredGuideName?: string;
  preferredGuideEmail?: string;
  preferredGuideDesignation?: string;
  preferredGuideDepartmentCode?: string;
  preferredGuideSkills?: string;
  guidePreferenceStatus: GuidePreferenceStatus;
  guidePreferenceSubmittedAtUtc?: string;
  guidePreferenceRemarks?: string;
  officiallyAllocatedGuideUserId?: string;
  officiallyAllocatedGuideName?: string;
  officiallyAllocatedGuideEmail?: string;
  officiallyAllocatedGuideDesignation?: string;
  officiallyAllocatedGuideDepartmentCode?: string;
  guideAllocatedAtUtc?: string;
  guideAllocatedByName?: string;
  guideAllocationRemarks?: string;
  isOfficialGuideAssigned: boolean;
  canModifyPreference: boolean;
  reassignmentHistory: GuideReassignmentHistoryItemDto[];
}

// =========================================================================
// PHASE 7: FACULTY SUPERVISION, PROJECT REVIEWS & MILESTONES DTOs
// =========================================================================

export type MilestoneStatus = "Pending" | "SubmittedForReview" | "Approved" | "RevisionRequested";

export interface MilestoneReviewHistoryDto {
  id: string;
  projectMilestoneId: string;
  reviewerUserId: string;
  reviewerName: string;
  resultStatus: MilestoneStatus;
  feedback: string;
  reviewedAtUtc: string;
}

export interface ProjectMilestoneDto {
  id: string;
  projectTeamId: string;
  title: string;
  description: string;
  targetDateUtc: string;
  status: MilestoneStatus;
  requiredTaskCompletionPercentage: number;
  submittedAtUtc?: string;
  submittedByUserId?: string;
  submittedByName?: string;
  submissionEvidenceUrl?: string;
  reviewedAtUtc?: string;
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewFeedback?: string;
  isOverdue: boolean;
  reviewHistories: MilestoneReviewHistoryDto[];
}

export interface CreateMilestoneRequest {
  title: string;
  description: string;
  targetDateUtc: string;
  requiredTaskCompletionPercentage?: number;
}

export interface UpdateMilestoneRequest {
  title: string;
  description: string;
  targetDateUtc: string;
  requiredTaskCompletionPercentage?: number;
}

export interface SubmitMilestoneRequest {
  submissionEvidenceUrl: string;
  submissionNotes?: string;
}

export interface ReviewMilestoneRequest {
  isApproved: boolean;
  feedback: string;
}

export interface SupervisedTeamSummaryDto {
  teamId: string;
  teamCode: string;
  title: string;
  trackName: string;
  departmentName: string;
  status: ProjectStatus;
  memberCount: number;
  teamLeadName?: string;
  guideAllocatedAtUtc?: string;
  completedTasksCount: number;
  totalTasksCount: number;
  completedMilestonesCount: number;
  totalMilestonesCount: number;
  pendingReviewsCount: number;
}

export interface SupervisionDashboardDto {
  supervisedTeamsCount: number;
  activeStudentsCount: number;
  pendingMilestoneReviewsCount: number;
  pendingArtifactReviewsCount: number;
  pendingWeeklyLogsCount: number;
  overdueTasksCount: number;
  teams: SupervisedTeamSummaryDto[];
}

export interface SupervisedTeamDetailDto {
  teamId: string;
  teamCode: string;
  title: string;
  abstract: string;
  domainTag: string;
  sdgCode: string;
  status: ProjectStatus;
  repoUrl?: string;
  jiraBoardKey?: string;
  missedLogStreak: number;
  guideAllocatedAtUtc?: string;
  guideAllocationRemarks?: string;
  members: TeamMemberDto[];
  tasks: SprintTaskDto[];
  milestones: ProjectMilestoneDto[];
  artifacts: ArtifactSlotDto[];
  weeklyLogs: WeeklyLogDto[];
}

// =========================================================================
// PHASE 8: PROJECT REPORTS, FINAL SUBMISSION & ACADEMIC DELIVERABLES
// =========================================================================

export type FinalSubmissionStatus =
  | 'Draft'
  | 'Submitted'
  | 'UnderReview'
  | 'RevisionRequested'
  | 'Resubmitted'
  | 'Accepted'
  | 'Locked';

export interface SubmissionReviewHistoryDto {
  id: string;
  projectReportSubmissionId: string;
  submissionVersion: number;
  reviewerUserId: string;
  reviewerName: string;
  resultStatus: FinalSubmissionStatus;
  feedback: string;
  reviewedAtUtc: string;
}

export interface SubmissionReadinessDto {
  hasAllocatedGuide: boolean;
  allocatedGuideName?: string;
  hasApprovedMilestones: boolean;
  approvedMilestonesCount: number;
  hasPendingMilestonesInReview: boolean;
  pendingMilestonesCount: number;
  hasRequiredAcademicFields: boolean;
  hasAttachedReport: boolean;
  isEligibleForSubmission: boolean;
  blockingReasons: string[];
}

export interface ProjectReportSubmissionDto {
  id: string;
  projectTeamId: string;
  versionNumber: number;
  status: FinalSubmissionStatus;
  projectTitle: string;
  abstract: string;
  problemStatement: string;
  methodology: string;
  implementationSummary: string;
  resultsAndConclusion: string;
  references: string;
  repositoryUrl?: string;
  demoUrl?: string;
  reportArtifactId?: string;
  reportFileName?: string;
  reportFileSizeBytes: number;
  reportSha256Checksum?: string;
  submittedAtUtc?: string;
  submittedByUserId?: string;
  submittedByName?: string;
  reviewedAtUtc?: string;
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewFeedback?: string;
  readiness?: SubmissionReadinessDto;
  reviewHistories: SubmissionReviewHistoryDto[];
}

export interface SaveSubmissionDraftRequest {
  projectTitle: string;
  abstract: string;
  problemStatement?: string;
  methodology?: string;
  implementationSummary?: string;
  resultsAndConclusion?: string;
  references?: string;
  repositoryUrl?: string;
  demoUrl?: string;
}

export interface AttachReportDeliverableRequest {
  reportArtifactId?: string;
  reportFileName?: string;
  reportFileSizeBytes?: number;
  reportSha256Checksum?: string;
}

export interface SubmitFinalReportRequest {
  submissionNotes?: string;
}

export interface ReviewFinalSubmissionRequest {
  isApproved: boolean;
  feedback: string;
}

// =========================================================================
// PHASE 9: EVALUATION, VIVA DEFENSE & ACADEMIC GRADING
// =========================================================================

export type VivaScheduleStatus =
  | 'Scheduled'
  | 'InProgress'
  | 'Completed'
  | 'Cancelled'
  | 'Rescheduled';

export type VivaOutcome =
  | 'Pending'
  | 'Pass'
  | 'Fail'
  | 'ReViva';

export type EvaluationStage =
  | 'ReadyForViva'
  | 'Scheduled'
  | 'EvaluationInProgress'
  | 'Evaluated'
  | 'Published';

export interface VivaScheduleDto {
  id: string;
  collegeId: string;
  departmentId: string;
  departmentName: string;
  academicTrackId: string;
  trackName: string;
  projectTeamId: string;
  teamCode: string;
  teamTitle: string;
  vivaPanelId?: string;
  panelName?: string;
  scheduledDateUtc: string;
  durationMinutes: number;
  venueOrLink: string;
  status: VivaScheduleStatus;
  candidateInstructions?: string;
  cancellationReason?: string;
  evaluatorNames: string[];
  scheduledByName?: string;
  scheduledAtUtc: string;
  rescheduledAtUtc?: string;
}

export interface EvaluatorAssessmentCriterionScoreDto {
  criterionCode: string;
  title: string;
  awardedMarks: number;
  maxMarks: number;
  remarks?: string;
}

export interface StudentIndividualScoreDto {
  studentUserId: string;
  studentName: string;
  enrollmentCode: string;
  moduleOwnershipScore: number;
  vivaQaScore: number;
  logDisciplineScore: number;
  individualTotalScore: number;
  finalComputedStudentMark: number;
}

export interface StudentVivaResultDto {
  teamId: string;
  teamCode: string;
  title: string;
  status: ProjectStatus;
  evaluationStage: EvaluationStage;
  schedule?: VivaScheduleDto;
  outcome: VivaOutcome;
  isPublished: boolean;
  publishedAtUtc?: string;
  sharedTotalScore?: number;
  sharedMaxScore?: number;
  criteriaScores: EvaluatorAssessmentCriterionScoreDto[];
  myIndividualScore?: StudentIndividualScoreDto;
  teamMembersScores: StudentIndividualScoreDto[];
  generalRemarks?: string;
  moderationRemarks?: string;
}

export interface AssignedDefenseSessionDto {
  teamId: string;
  teamCode: string;
  title: string;
  abstract: string;
  domainTag: string;
  guideUserId?: string;
  guideName?: string;
  isGuideConflict: boolean;
  status: ProjectStatus;
  evaluationStage: EvaluationStage;
  scheduledDateUtc?: string;
  durationMinutes?: number;
  venueOrLink?: string;
  hasEvaluation: boolean;
  isEvaluationLocked: boolean;
  sharedTotalScore?: number;
  outcome: VivaOutcome;
  isPublished: boolean;
  members: TeamMemberDto[];
}

export interface RubricCriterionDto {
  id: string;
  criterionCode: string;
  title: string;
  description: string;
  maxMarks: number;
  weightPercentage: number;
  displayOrder: number;
  nbaPoMapping?: string;
  bloomTaxonomyLevel?: string;
}

export interface EvaluationRubricDto {
  id: string;
  departmentId: string;
  academicTrackId: string;
  title: string;
  checkpointType: CheckpointType;
  totalMaxMarks: number;
  isActive: boolean;
  criteria: RubricCriterionDto[];
}

export interface SubmitEvaluatorAssessmentRequest {
  projectTeamId: string;
  checkpointType?: CheckpointType;
  criterionScores: EvaluatorAssessmentCriterionScoreDto[];
  generalRemarks: string;
  studentScores: {
    studentUserId: string;
    moduleOwnershipScore: number;
    vivaQaScore: number;
    logDisciplineScore: number;
  }[];
  isDraft?: boolean;
}

export interface PublishEvaluationRequest {
  outcome: VivaOutcome;
  remarks: string;
}

// =========================================================================
// PHASE 10: PROJECT CLOSURE, ACADEMIC RECORDS & VERIFIED PORTFOLIO TYPES
// =========================================================================

export type ProjectClosureStatus = "PendingClosure" | "Closed" | "Archived" | "Reopened";
export type PortfolioVisibility = "Private" | "Institutional" | "PublicWithConsent";

export interface StudentAcademicRecordSummaryDto {
  recordId: string;
  studentUserId: string;
  studentName: string;
  enrollmentNumber: string;
  roleDescription: string;
  finalComputedMark: number;
  verificationHash: string;
}

export interface ProjectClosureResultDto {
  closureRecordId: string;
  projectTeamId: string;
  teamCode: string;
  status: ProjectClosureStatus;
  closureCertificateHash: string;
  closedAtUtc: string;
  closedByName: string;
  closureRemarks: string;
  isArchived: boolean;
  academicRecordsGenerated: number;
  generatedStudentRecords: StudentAcademicRecordSummaryDto[];
}

export interface ClosureReadinessDto {
  projectTeamId: string;
  teamCode: string;
  title: string;
  status: ProjectStatus;
  canClose: boolean;
  blockingReasons: string[];
  evaluationPublished: boolean;
  evaluationOutcome?: VivaOutcome;
  finalReportAccepted: boolean;
  reportFileName?: string;
  individualScoresFinalized: boolean;
  totalMembersCount: number;
  scoredMembersCount: number;
  isClosed: boolean;
  existingClosure?: ProjectClosureResultDto;
}

export interface CloseProjectRequest {
  closureRemarks: string;
}

export interface ReopenProjectRequest {
  reason: string;
}

export interface StudentAcademicRecordDto {
  id: string;
  projectTeamId: string;
  projectTitle: string;
  projectAbstract: string;
  teamCode: string;
  academicYear: string;
  trackName: string;
  departmentName: string;
  collegeName: string;
  studentName: string;
  enrollmentNumber: string;
  roleDescription: string;
  isTeamLead: boolean;
  guideUserId?: string;
  guideName: string;
  finalOutcome: VivaOutcome;
  sharedTotalScore: number;
  sharedMaxScore: number;
  individualContributionScore: number;
  finalComputedMark: number;
  rubricCriteriaBreakdown: EvaluatorAssessmentCriterionScoreDto[];
  verifiedRepositoryUrl?: string;
  verifiedDemoUrl?: string;
  finalReportFileName?: string;
  finalReportChecksum?: string;
  verificationHash: string;
  isVerified: boolean;
  verifiedAtUtc: string;
  allowPublicPortfolio: boolean;
}

export interface VerifiedStudentPortfolioDto {
  studentUserId: string;
  studentName: string;
  enrollmentNumber: string;
  departmentName: string;
  collegeName: string;
  allowPublicPortfolio: boolean;
  publicPortfolioShareUrl: string;
  projects: StudentAcademicRecordDto[];
}

export interface UpdatePortfolioVisibilityRequest {
  allowPublicPortfolio: boolean;
}

export interface PublicPortfolioProjectDto {
  projectTitle: string;
  projectAbstract: string;
  trackName: string;
  academicYear: string;
  roleDescription: string;
  guideName: string;
  finalOutcome: VivaOutcome;
  finalScorePercentage?: number;
  verifiedRepositoryUrl?: string;
  verifiedDemoUrl?: string;
  verificationHash: string;
  verifiedAtUtc: string;
}

export interface PublicStudentPortfolioDto {
  studentName: string;
  enrollmentNumber: string;
  departmentName: string;
  collegeName: string;
  institutionalAttestation: string;
  verifiedProjects: PublicPortfolioProjectDto[];
}

