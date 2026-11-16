/**
 * TypeScript Data Models matching .NET 10 Entities and DTOs
 */

export type RoleType =
  | "SuperAdmin"
  | "CollegeAdmin"
  | "HOD"
  | "Faculty"
  | "Student"
  | "TeamLead";

export type ProjectStateType =
  | "Draft"
  | "PendingGuide"
  | "PendingCoordinator"
  | "PendingHOD"
  | "Active"
  | "Completed";

export type TaskStatusType = "Todo" | "InProgress" | "InReview" | "Done";

export type GuideReviewStatusType = "Pending" | "Approved" | "NeedsRevision";

export interface UserPersona {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  departmentId?: string;
  collegeId: string;
  isProjectCoordinator?: boolean;
  enrollmentNumber?: string;
  employeeId?: string;
  avatarUrl?: string;
}

export interface College {
  id: string;
  name: string;
  code: string;
  domain: string;
  logoUrl?: string;
  isActive: boolean;
  subscriptionPlan: "Pilot" | "Standard" | "Enterprise";
  expiresAt: string;
  studentCount: number;
}

export interface Department {
  id: string;
  collegeId: string;
  name: string;
  code: string;
  hodUserId?: string;
  hodName?: string;
  studentCount: number;
  facultyCount: number;
  criterion3Attainment?: number;
  hodSignOffStatus?: "Attested & Locked" | "Pending Sign-Off";
}

export interface ProjectCycle {
  id: string;
  collegeId: string;
  departmentId: string;
  academicYear: string;
  type: "Minor" | "Major";
  semester: number;
  proposalDeadline: string;
  isActive: boolean;
  minTeamSize: number;
  maxTeamSize: number;
}

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  enrollmentNumber: string;
  isLead: boolean;
  roleDescription: string;
}

export interface TaskItem {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  assigneeName: string;
  assigneeId?: string;
  status: TaskStatusType;
  dueDate: string;
  tag: string;
}

export interface WeeklyLog {
  id: string;
  teamId: string;
  studentId: string;
  studentName: string;
  weekNumber: number;
  dateSubmitted: string;
  accomplishments: string;
  blockers?: string;
  plannedNextWeek: string;
  guideStatus: GuideReviewStatusType;
  guideRemarks?: string;
  hoursSpent: number;
}

export type ArtifactSlot = "Synopsis" | "MidTermPPT" | "PlagiarismReport" | "FinalThesis";

export interface ProjectArtifact {
  slot: ArtifactSlot;
  name: string;
  fileName?: string;
  fileSize?: string;
  uploadedAt?: string;
  status: "Pending" | "Uploaded" | "Approved" | "NeedsRevision";
  similarityScore?: number;
}

export interface Team {
  id: string;
  collegeId: string;
  departmentId: string;
  cycleId: string;
  teamCode: string; // e.g. "2026-CS-MIN-01"
  title: string;
  abstract: string;
  domain: string;
  sdgNumber: number;
  guideId?: string;
  guideName?: string;
  state: ProjectStateType;
  githubUrl?: string;
  jiraUrl?: string;
  isRosterLocked: boolean;
  members: TeamMember[];
  tasks: TaskItem[];
  weeklyLogs: WeeklyLog[];
  scoreTotal?: number;
  health: "Healthy" | "AtRisk" | "NeedsReview";
  trackName?: "Minor Project" | "Major Phase-I" | "Major Phase-II";
  projectLineageId?: string;
  artifacts?: ProjectArtifact[];
  missedLogsCount?: number;
}

export type ProjectTeam = Team;

export interface RubricCriterion {
  id: string;
  rubricId: string;
  name: string;
  description: string;
  maxScore: number;
  nbaCriterionCode: string; // PO3, PO4, PSO1
  bloomsTaxonomy: string; // L3_Apply, L5_Evaluate, L6_Create
}

export interface Rubric {
  id: string;
  cycleId: string;
  title: string;
  stage: "ProposalReview" | "MidTermReview" | "FinalViva";
  totalMarks: number;
  criteria: RubricCriterion[];
}

export interface EvaluationScore {
  criterionId: string;
  score: number;
  feedback?: string;
}

export interface Evaluation {
  id: string;
  teamId: string;
  teamCode: string;
  teamTitle: string;
  rubricId: string;
  evaluatorId: string;
  evaluatorName: string;
  isFinalized: boolean;
  scores: Record<string, number>; // criterionId -> score
  generalFeedback?: string;
  evaluatedAt: string;
  unlockedRequested?: boolean;
  unlockReason?: string;
}

export interface ProblemBankIdea {
  id: string;
  title: string;
  abstract: string;
  domain: string;
  facultyName: string;
  facultyId: string;
  sdgNumber: number;
  prerequisites: string[];
  capacity: number;
  taken: boolean;
}

export interface TenantCollege {
  id: string;
  name: string;
  code: string;
  domain: string;
  plan: "Enterprise" | "Standard" | "Pilot";
  status: "Active" | "Suspended";
  students: number;
  departments: number;
  storageQuotaGb?: number;
  storageUsedGb?: number;
  strictSsoEnforced?: boolean;
  renewalDate?: string;
  allocatedSeats?: number;
}

export interface PilotRequest {
  id: string;
  collegeName: string;
  code: string;
  deanName: string;
  deanEmail: string;
  requestedAt: string;
  intake: string;
  aisheCode: string;
  requestedCycle: string;
}

export interface PlatformAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  targetTenant: string;
  ipRegion: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  details: string;
}

export interface IndividualEvaluation {
  id: string;
  teamId: string;
  teamCode: string;
  enrollmentNumber: string;
  studentName: string;
  moduleOwnership: number; // max 15 (40% sub-component)
  vivaScore: number;       // max 15 (40% sub-component)
  logDiscipline: number;   // max 10 (40% sub-component)
  individualTotal: number; // sum of moduleOwnership + vivaScore + logDiscipline (max 40)
  sharedTeamScore: number; // shared team rubric score (max 60)
  finalTotalScore: number; // sum of individualTotal + sharedTeamScore (max 100)
  verifiedLogsCount: number;
  verifiedCommitsCount: number;
  remarks?: string;
  isFinalized: boolean;
}

export interface ExceptionAuditLog {
  id: string;
  teamId: string;
  teamCode: string;
  teamTitle: string;
  type: "ReassignGuide" | "RemoveMember" | "ReVivaUnlock" | "DeadlineExtension";
  description: string;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: "PendingHOD" | "Approved" | "Rejected";
  reviewedBy?: string;
  reviewedAt?: string;
  targetMemberUsn?: string;
  targetMemberName?: string;
  newGuideId?: string;
  newGuideName?: string;
}

export interface CourseExitSurvey {
  id: string;
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  teamId: string;
  ratings: {
    po2: number; // 1-3 Problem Analysis
    po3: number; // 1-3 Design & Development
    po5: number; // 1-3 Modern Tools Usage
    po9: number; // 1-3 Individual & Team Work
    po10: number; // 1-3 Communication & Defense
  };
  feedback?: string;
  submittedAt: string;
}


