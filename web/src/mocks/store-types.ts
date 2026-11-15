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
}

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


