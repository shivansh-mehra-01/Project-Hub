// =========================================================================
// ACCREDITATION & COMPLIANCE MODULE TYPES
// =========================================================================

export type AccreditationLevel = "Institution" | "Program";
export type AccreditationStatus = "Draft" | "Setup" | "Active" | "UnderReview" | "Completed" | "Expired";
export type CycleStatus = "Planning" | "DataCollection" | "SelfAssessment" | "PeerReview" | "Completed" | "Archived";
export type EvidenceStatus = "Draft" | "Uploaded" | "UnderReview" | "Approved" | "Rejected" | "Archived";
export type ReviewStatus = "Pending" | "InProgress" | "Approved" | "Returned" | "Escalated";
export type ScoringMethod = "Marks" | "Weightage" | "Grade" | "Binary" | "Scale";
export type FrameworkCode = "NBA" | "NAAC" | "ABET" | "NIRF" | "Custom";

// --- Framework & Version ---
export interface AccreditationFrameworkDto {
  id: string;
  code: FrameworkCode;
  name: string;
  description: string;
  level: AccreditationLevel;
  logoUrl?: string;
  isActive: boolean;
  versionsCount: number;
  createdAtUtc: string;
}

export interface FrameworkVersionDto {
  id: string;
  frameworkId: string;
  frameworkCode: FrameworkCode;
  versionLabel: string;
  effectiveFromYear: number;
  effectiveToYear?: number;
  isLatest: boolean;
  isLocked: boolean;
  criteriaCount: number;
  metricsCount: number;
  createdAtUtc: string;
}

// --- Accreditation Cycle ---
export interface AccreditationCycleDto {
  id: string;
  collegeId: string;
  frameworkId: string;
  frameworkCode: FrameworkCode;
  frameworkName: string;
  versionId: string;
  versionLabel: string;
  level: AccreditationLevel;
  programId?: string;
  programName?: string;
  departmentId?: string;
  departmentCode?: string;
  cycleName: string;
  academicYear: string;
  status: CycleStatus;
  startDate: string;
  endDate?: string;
  overallScore?: number;
  overallGrade?: string;
  completionPct: number;
  pendingReviews: number;
  evidenceCount: number;
  isAttested?: boolean;
  attestedAtUtc?: string;
  attestedByName?: string;
  attestationRemarks?: string;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface CreateCycleRequest {
  frameworkId: string;
  versionId: string;
  cycleName: string;
  academicYear: string;
  programId?: string;
  departmentId?: string;
  startDate: string;
  endDate?: string;
}

// --- Criteria & Metrics ---
export interface CriterionDto {
  id: string;
  versionId: string;
  code: string;
  title: string;
  description: string;
  weightPct: number;
  parentCriterionId?: string;
  sortOrder: number;
  metricsCount: number;
  subCriteriaCount: number;
  completionPct: number;
}

export interface MetricDto {
  id: string;
  criterionId: string;
  criterionCode: string;
  code: string;
  title: string;
  description: string;
  scoringMethod: ScoringMethod;
  maxScore: number;
  currentScore?: number;
  targetScore?: number;
  weightPct: number;
  evidenceRequired: boolean;
  evidenceCount: number;
  status: "NotStarted" | "InProgress" | "Submitted" | "Verified";
  sortOrder: number;
}

// --- Program Mapping ---
export interface ProgramMappingDto {
  id: string;
  cycleId: string;
  programId: string;
  programCode: string;
  programName: string;
  programLevel: string;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  hodName?: string;
  isEligible: boolean;
  mappingStatus: "Unmapped" | "Mapped" | "Verified";
  criteriaCompletionPct: number;
  evidenceCount: number;
  pendingReviews: number;
  lastUpdatedUtc?: string;
}

// --- Evidence & Documents ---
export interface EvidenceDocumentDto {
  id: string;
  cycleId: string;
  metricId: string;
  metricCode: string;
  criterionCode: string;
  title: string;
  description?: string;
  fileType: string;
  fileName: string;
  fileSizeBytes: number;
  storageKey: string;
  uploadedByName: string;
  uploadedByRole: string;
  uploadedAtUtc: string;
  status: EvidenceStatus;
  reviewNote?: string;
  reviewedByName?: string;
  reviewedAtUtc?: string;
  tags: string[];
}

export interface UploadEvidenceRequest {
  cycleId: string;
  metricId: string;
  title: string;
  description?: string;
  fileName: string;
  fileSizeBytes: number;
  storageKey: string;
  tags?: string[];
}

// --- Reviews & Approvals ---
export interface ReviewRecordDto {
  id: string;
  cycleId: string;
  entityType: "Evidence" | "Metric" | "Criterion" | "Cycle";
  entityId: string;
  entityTitle: string;
  criterionCode?: string;
  metricCode?: string;
  status: ReviewStatus;
  assignedToName: string;
  assignedToRole: string;
  submittedByName: string;
  submittedAtUtc: string;
  reviewedAtUtc?: string;
  remarks?: string;
  priority: "Low" | "Medium" | "High" | "Critical";
}

export interface SubmitReviewRequest {
  status: ReviewStatus;
  remarks: string;
}

// --- Reports ---
export interface AccreditationReportDto {
  cycleId: string;
  cycleName: string;
  frameworkCode: FrameworkCode;
  versionLabel: string;
  academicYear: string;
  level: AccreditationLevel;
  programName?: string;
  overallScore: number;
  overallGrade: string;
  totalCriteria: number;
  completedCriteria: number;
  totalMetrics: number;
  completedMetrics: number;
  totalEvidence: number;
  approvedEvidence: number;
  pendingReviews: number;
  criteriaBreakdown: CriteriaScoreDto[];
  generatedAtUtc: string;
}

export interface CriteriaScoreDto {
  criterionCode: string;
  criterionTitle: string;
  weightPct: number;
  achievedScore: number;
  maxScore: number;
  completionPct: number;
  metricsCompleted: number;
  metricsTotal: number;
}

// --- Activity Log ---
export interface AccreditationActivityDto {
  id: string;
  cycleId: string;
  action: string;
  entityType: string;
  entityTitle: string;
  performedByName: string;
  performedByRole: string;
  performedAtUtc: string;
  details?: string;
  ipAddress?: string;
}

// --- Overview Summary ---
export interface AccreditationOverviewDto {
  activeFrameworks: number;
  accreditationPrograms: number;
  pendingReviews: number;
  evidenceDocuments: number;
  cycles: AccreditationCycleDto[];
  recentActivities: AccreditationActivityDto[];
  frameworkSummaries: FrameworkSummaryDto[];
}

export interface FrameworkSummaryDto {
  frameworkId: string;
  frameworkCode: FrameworkCode;
  frameworkName: string;
  level: AccreditationLevel;
  activeCyclesCount: number;
  programsConfigured: number;
  currentStatus: AccreditationStatus;
  latestVersionLabel: string;
  overallCompletionPct: number;
}
