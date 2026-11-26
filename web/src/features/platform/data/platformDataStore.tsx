"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { platformApi } from "@/lib/api/platformApi";
import { authApi } from "@/lib/api/authApi";
import { getUserProfile } from "@/lib/api";
import {
  HealthDetailsDto,
  PlatformAnnouncementDto,
  PlatformSecuritySummaryDto,
  SupportTicketDto,
} from "@/lib/api/types";
import { showToast } from "@/lib/toast";

// =============================================================================
// 1. INSTITUTIONS & TENANTS TYPES
// =============================================================================
export interface CollegeTenantRecord {
  id: string;
  name: string;
  shortName: string;
  code: string;
  collegeType?: string;
  university: string;
  tenantId: string;
  domain: string;
  subscriptionPlan: "Enterprise" | "Standard" | "Pilot";
  totalStudents: number;
  totalFaculty: number;
  departmentsCount: number;
  status: "Active" | "Pending Verification" | "Onboarding" | "Suspended" | "Archived";
  registrationDate: string;
  renewalDate: string;
  databaseAllocation: string;
  storageQuotaGb: number;
  storageUsedGb: number;
  region: string;
  isolationStatus: "RLS Enforced" | "Dedicated Schema" | "Pending Configuration";
  tenantHealth: "Healthy" | "Warning" | "Degraded";
  principalName: string;
  principalEmail: string;
  principalIsActive?: boolean | null;
  principalIsActivated?: boolean | null;
  principalIsEmailVerified?: boolean | null;
  principalHasPendingInvitation?: boolean | null;
  principalLastLoginAtUtc?: string | null;
  contactPhone: string;
  principalDesignation?: string;
  adminAccountStatus?: "Active" | "Suspended";
  lastAdminLogin?: string;
  address: string;
  city: string;
  state: string;
  country?: string;
  pinCode: string;
  affiliationNumber: string;
  establishmentYear: number;
  website: string;
  enabledModules: string[];
  strictSsoEnforced: boolean;
  maxStudentSeats?: number;
  activeProjectsCount?: number;
  lastActivity?: string;
  adminInvitationStatus?: string;
  adminInvitationDate?: string;
  provisioningHistory: {
    stage: string;
    timestamp: string;
    status: "Completed" | "Pending" | "Failed";
    details: string;
  }[];
}

export type ApplicationStatus =
  | "Under Review"
  | "Approved"
  | "Rejected"
  | "Provisioning"
  | "Provisioning Failed"
  | "Active";

export interface ApplicationDocument {
  id: string;
  name: string;
  type: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  status: "Verified" | "Pending Review" | "Missing" | "Needs Correction";
  correctionRemarks?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  fileUrl?: string;
}

export interface ChecklistAuditDetail {
  status: "Pending" | "Verified" | "Needs Correction";
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
}

export type ChecklistKey = "institutionIdentity" | "universityAffiliation" | "applicantAuthorization" | "supportingDocuments";

export interface ApplicationChecklist {
  institutionIdentity: boolean;
  universityAffiliation: boolean;
  applicantAuthorization: boolean;
  supportingDocuments: boolean;
  details?: Partial<Record<ChecklistKey, ChecklistAuditDetail>>;
}

export interface OnboardingRequestRecord {
  id: string;
  applicationId: string;
  institutionName: string;
  collegeCode: string;
  shortName: string;
  collegeType: string;
  university: string;
  website?: string;
  domain?: string;
  country: string;
  state: string;
  city: string;
  pinCode?: string;
  address?: string;
  applicantName: string;
  applicantDesignation: string;
  officialEmail: string;
  phone: string;
  estimatedStudents: number;
  submissionDate: string;
  verificationStatus: "Verified" | "Pending Verification" | "Action Required";
  reviewStatus: ApplicationStatus;
  notes?: string;
  documents?: ApplicationDocument[];
  checklist?: ApplicationChecklist;
  decisionDate?: string;
  decisionBy?: string;
  rejectionReason?: string;
  rejectionExplanation?: string;
  provisioningError?: string;
}

// =============================================================================
// 2. ACADEMIC MASTER DATA TYPES
// =============================================================================
export interface UniversityRecord {
  id: string;
  name: string;
  code: string;
  website: string;
  state: string;
  universityType: "State Technical" | "Central" | "Deemed / Autonomous" | "Private";
  status: "Active" | "Inactive";
  affiliatedCollegesCount: number;
  establishedYear: number;
  chancellorOrHead: string;
  isOfficialUniversity: boolean;
}

export interface AcademicRegulationRecord {
  id: string;
  name: string;
  code: string;
  university: string;
  applicablePrograms: string[];
  effectiveAcademicYear: string;
  applicableBatches?: string;
  duration?: string;
  status: "Published" | "Under Review" | "Draft" | "Deprecated" | "Archived";
  version: string;
  gradingScheme: "10-Point Absolute" | "10-Point Relative (CBCS)" | "Percentage Scale";
  minPassingMarksTheory: number;
  minPassingMarksPractical: number;
  totalProjectCredits?: number;
  lastUpdated?: string;
  projectStages?: {
    stage: string;
    semester: number;
    credits: number;
    evaluationMode: string;
  }[];
  evaluationGuidelines?: string;
}

export interface AcademicProgramRecord {
  id: string;
  name: string;
  code: string;
  degreeType: "UG" | "PG" | "Diploma" | "Doctoral";
  durationYears: number;
  totalSemesters: number;
  applicableRegulations: string[];
  status: "Active" | "Draft" | "Archived";
  branchesCount: number;
}

export interface AcademicBranchRecord {
  id: string;
  name: string;
  code: string;
  programCode: string;
  departmentCode: string;
  durationYears: number;
  status: "Active" | "Inactive";
  intakeSeats: number;
}

export interface DepartmentMasterRecord {
  id: string;
  name: string;
  code: string;
  applicableBranches: string[];
  status: "Active" | "Inactive";
  description: string;
}

export interface SubjectMasterRecord {
  id: string;
  name: string;
  code: string;
  type: "Project (Minor)" | "Project (Major Phase-I)" | "Project (Major Phase-II)" | "Core Theory" | "Practical Lab" | "Seminar";
  credits: number;
  semester: number;
  program: string;
  branch: string;
  regulation: string;
  university?: string;
  projectType?: "Minor Project" | "Major Project Phase-I" | "Major Project Phase-II";
  evaluationMode?: string;
  teachingScheme: "L-T-P: 0-0-4" | "L-T-P: 0-0-8" | "L-T-P: 3-1-0" | "L-T-P: 0-0-2" | string;
  classification: "Project" | "Theory" | "Practical";
  internalMax: number;
  externalMax: number;
}

export interface AcademicYearRecord {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  applicableRegulations: string[];
  status: "Current Active" | "Upcoming" | "Archived";
}

export interface EvaluationSchemeRecord {
  id: string;
  name: string;
  projectType: "Minor Project" | "Major Project Phase-I" | "Major Project Phase-II";
  guideWeightage: number; // e.g. 40
  vivaWeightage: number;  // e.g. 60
  totalMarks: number;     // e.g. 100
  rubricComponents: {
    name: string;
    maxScore: number;
    criterionCode: string;
    bloomsLevel: string;
  }[];
}

export interface NbaProgramOutcomeRecord {
  code: string;
  title: string;
  bloomsTaxonomy: string;
  description: string;
  levels: {
    l0: string;
    l1: string;
    l2: string;
    l3: string;
  };
}

export interface UnSdgRecord {
  num: number;
  name: string;
  description: string;
  officialReference: string;
  color: string;
  isActive: boolean;
}

export interface TemplateVersionRecord {
  id: string;
  templateName: string;
  version: string;
  status: "Published" | "Review" | "Draft" | "Deprecated";
  effectiveDate: string;
  changeDescription: string;
  impactedInstitutionsCount: number;
  author: string;
}

// =============================================================================
// 3. SUBSCRIPTIONS & BILLING TYPES
// =============================================================================
export interface SubscriptionPlanRecord {
  id: string;
  name: string;
  code: string;
  description: string;
  billingCycle: "Annual" | "Semester" | "Trial (90 Days)" | string;
  priceINR: number;
  userLimit: number;
  facultyLimit?: number;
  storageLimitGb: number;
  modulesAvailable: string[];
  supportLevel: "Standard 8x5" | "Priority 24x7" | "Dedicated SLA Manager" | string;
  trialDurationDays: number;
  status: "Active" | "Inactive" | "Legacy" | "Hidden";
}

export interface CollegeSubscriptionRecord {
  id: string;
  institutionId: string;
  institutionName: string;
  collegeCode: string;
  planName: string;
  planId?: string;
  startDate: string;
  renewalDate: string;
  amountINR: number;
  billingCycle: "Annual" | "90-Day Pilot" | "Semester" | "Multi-Year" | string;
  status: "Active" | "Expiring Soon" | "Past Due" | "Trial" | "Expired" | "Suspended" | "Cancelled";
  autoRenew: boolean;
  seatUtilization: {
    used: number;
    allocated: number;
    facultyUsed?: number;
    facultyAllocated?: number;
  };
  storageQuotaGb?: number;
  storageUsedGb?: number;
  gstin?: string;
  taxType?: "Intra-State (CGST + SGST)" | "Inter-State (IGST)" | "Exempt";
  outstandingAmountINR?: number;
  notes?: string;
  history?: {
    timestamp: string;
    action: string;
    details: string;
    performedBy: string;
  }[];
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  institutionId?: string;
  institutionName: string;
  collegeCode?: string;
  invoiceDate: string;
  dueDate: string;
  taxableAmountINR: number;
  taxRate?: number;
  taxType?: "CGST_SGST" | "IGST" | "EXEMPT";
  cgstAmountINR?: number;
  sgstAmountINR?: number;
  igstAmountINR?: number;
  gstAmountINR: number;
  totalAmountINR: number;
  paidAmountINR?: number;
  paymentStatus: "Paid" | "Pending" | "Overdue" | "Failed" | "Partially Paid" | "Void";
  pdfUrl?: string;
  gstin: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  paymentRef?: string;
  paymentMethod?: string;
  paymentDate?: string;
  notes?: string;
}

export interface PaymentTransactionRecord {
  id: string;
  transactionRef: string;
  institutionName: string;
  gateway: "Razorpay" | "Bank Transfer (NEFT/RTGS)" | "Stripe";
  amountINR: number;
  paymentDate: string;
  status: "Success" | "Failed" | "Refunded" | "Processing";
  failureReason?: string;
  gatewayOrderId: string;
}

export interface RefundRecord {
  id: string;
  originalTransactionRef: string;
  institutionName: string;
  refundAmountINR: number;
  reason: string;
  requestedBy: string;
  requestDate: string;
  approvalStatus: "Approved" | "Under Review" | "Rejected";
  processingStatus: "Processed" | "Pending Gateway" | "Failed";
}

export interface DiscountCouponRecord {
  id: string;
  code: string;
  discountType: "Percentage" | "Flat INR";
  discountValue: number;
  validFrom: string;
  validUntil: string;
  usageCount: number;
  maxUsageLimit: number;
  applicablePlans: string[];
  status: "Active" | "Expired" | "Disabled";
}

// =============================================================================
// 4. PLATFORM USERS & GOVERNANCE TYPES (PRIVILEGED ACCESS MANAGEMENT)
// =============================================================================
export type PrivilegedPermissionCategory =
  | "Platform Configuration"
  | "Billing & Commercial Operations"
  | "College Tenant Operations";

export interface PrivilegedPermissionRecord {
  id: string;
  category: PrivilegedPermissionCategory;
  key: string;
  label: string;
  description: string;
  granted: boolean;
  grantedBy?: string;
  grantedDate?: string;
  reason?: string;
  approvalRecord?: string;
}

export interface SecurityActivityRecord {
  id: string;
  timestamp: string;
  event: string;
  ipAddress: string;
  location?: string;
  status: "Success" | "Failed" | "Warning";
  details?: string;
}

export interface SecurityApprovalRequestRecord {
  id: string;
  requestId: string; // e.g. REQ-SEC-402
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  permissionKey: string;
  permissionLabel: string;
  category: PrivilegedPermissionCategory;
  reason: string;
  requestedAt: string;
  status: "Pending Dual Approval" | "Approved" | "Rejected";
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface PlatformAdminUserRecord {
  id: string;
  name: string;
  email: string;
  adminId: string;
  platformRole: "Super Admin" | "Support Operator";
  status: "Active" | "Suspended" | "Pending Invitation";
  mfaStatus: "Enforced & Active" | "Pending Setup" | "Grace Period";
  createdAt: string;
  lastLogin: string;
  lastAuthTimestamp: string;
  ipAddress: string;
  activeSessionsCount: number;
  mfaDetails: {
    type: "FIDO2 / WebAuthn Hardware Key";
    keyModel: string;
    keyId: string;
    enrolledAt: string;
    backupCodesRemaining: number;
    recoveryStatus: "Healthy" | "Recovery In Progress" | "None";
  };
  permissions: PrivilegedPermissionRecord[];
  securityActivity: SecurityActivityRecord[];
  assignedSupportTeams?: string[];
  workloadTicketsCount?: number;
  sensitiveSafeguards?: {
    canPublishMasterData: boolean;
    canAuthorizeBilling: boolean;
    canManageTenants: boolean;
  };
}

export interface RolePermissionRecord {
  roleId: string;
  roleName: string;
  description: string;
  userCount: number;
  permissions: {
    category: "Tenants" | "Academic" | "Billing" | "Configuration" | "Integrations" | "System" | "Security" | "Audit";
    actions: ("View" | "Create" | "Edit" | "Delete" | "Publish" | "Execute")[];
  }[];
}

export interface UserInvitationRecord {
  id: string;
  email: string;
  fullName: string;
  assignedRole: string;
  sentAt: string;
  expiresAt: string;
  status: "Pending" | "Accepted" | "Expired" | "Revoked";
}

export interface AccountActivityRecord {
  id: string;
  timestamp: string;
  userName: string;
  email: string;
  action: "Login Success" | "Failed Login" | "Role Modified" | "MFA Configured" | "Session Terminated" | "Password Reset";
  ipAddress: string;
  device: string;
  status: "Success" | "Alert" | "Blocked";
}

// =============================================================================
// 5. PLATFORM CONFIGURATION & INTEGRATIONS TYPES
// =============================================================================
export interface PlatformModuleRecord {
  key: string;
  name: string;
  description: string;
  category: "Academic Core" | "Evaluations" | "Integrations" | "Analytics" | "Compliance";
  version: string;
  isEnabled: boolean;
  dependencies: string[];
}

export interface FeatureFlagRecord {
  id: string;
  name: string;
  key: string;
  description: string;
  targetInstitutions: "All Institutions" | "Pilot Colleges Only" | "Selected Enterprise" | "Internal Testing";
  rolloutPercentage: number;
  environment: "Production" | "Staging" | "Development";
  isEnabled: boolean;
  lastUpdated: string;
}

export interface IntegrationConnectorRecord {
  id: string;
  name: string;
  category: "Authentication" | "Google Workspace" | "Microsoft 365" | "Email / SMTP" | "SMS Gateway" | "Payment Gateway" | "Cloud Storage" | "Monitoring";
  status: "Connected" | "Disconnected" | "Degraded" | "Configuration Required";
  provider: string;
  healthLatencyMs: number;
  lastSyncTimestamp: string;
  details: string;
  endpointUrl?: string;
  activeScopes: string[];
}

export interface ApiClientRecord {
  id: string;
  clientName: string;
  clientId: string;
  maskedSecret: string;
  authorizedScopes: string[];
  createdAt: string;
  expiresAt: string;
  rateLimitPerMin: number;
  lastUsedAt: string;
  status: "Active" | "Revoked" | "Expired";
}

export interface WebhookEndpointRecord {
  id: string;
  name: string;
  url: string;
  eventSubscriptions: string[];
  retryPolicy: "Exponential Backoff (3 retries)" | "Immediate (1 retry)" | "Strict (5 retries)";
  deliveryStatus: "Active" | "Failing" | "Paused";
  lastDeliveryStatus: "200 OK" | "500 Server Error" | "408 Timeout";
  lastDeliveryAt: string;
}

// =============================================================================
// 6. SYSTEM HEALTH & MONITORING TYPES
// =============================================================================
export type CoreServiceCategory =
  | "Backend API"
  | "Database"
  | "Cache"
  | "Background Workers"
  | "File Storage"
  | "Transactional Email"
  | "Payment Gateway"
  | string;

export type CoreServiceStatus = "Healthy" | "Degraded" | "Down" | "Unknown" | "Outage" | "Not Configured";

export interface ServiceHealthRecord {
  id?: string;
  serviceName: string;
  category: CoreServiceCategory;
  status: CoreServiceStatus;
  latencyMs: number;
  uptime90d: number;
  endpointOrInstance?: string;
  lastChecked: string;
  details: string;
  responseTrend?: string;
  recentFailures?: string;
  relatedIncidents?: string;
  affectedColleges?: string;
}

export interface PlatformAlertRecord {
  id: string;
  title: string;
  affectedService: string;
  severity: "Critical" | "Warning" | "Informational";
  startTime: string;
  currentStatus: "Investigating" | "Identified" | "Monitoring" | "Resolved";
  impact: string;
  resolutionDetails?: string;
}

export interface PlatformIncidentRecord {
  id: string;
  title: string;
  affectedService: string;
  startTime: string;
  recoveryTime: string;
  duration: string;
  date?: string;
  impact: string;
  resolutionSummary?: string;
  rootCause: string;
  status: "Resolved";
}

export interface PlatformBackupStatusRecord {
  lastBackupTime: string;
  backupStatus: "Healthy" | "Warning" | "Failed";
  backupSize: string;
  retentionPolicy: string;
  lastRestoreTestTime: string;
  restoreVerificationStatus: "Integrity Pass — 100% Data Parity Verified" | "Verification Failed" | "Pending Test";
  restoreDrillFrequency: string;
  activeAlertsCount: number;
}

export interface BackgroundJobRecord {
  id: string;
  jobName: string;
  queue: "default" | "nba-exports" | "scheduled-reports" | "notifications" | "dead-letter";
  status: "Completed" | "Processing" | "Pending" | "Failed" | "Retrying";
  targetTenant: string;
  executionDurationMs: number;
  startedAt: string;
  retryCount: number;
  errorMessage?: string;
}

export interface IncidentRecord {
  id: string;
  title: string;
  severity: "Critical (P1)" | "Major (P2)" | "Moderate (P3)" | "Minor (P4)";
  status: "Resolved" | "Investigating" | "Monitoring" | "Identified";
  affectedServices: string[];
  affectedInstitutions: string[];
  assignedEngineer: string;
  startedAt: string;
  resolvedAt?: string;
  rootCause?: string;
  resolutionSummary?: string;
}

// =============================================================================
// 7. SUPPORT CENTER & ANNOUNCEMENTS TYPES
// =============================================================================
export type TicketPriority = "Urgent" | "High" | "Normal" | "Medium" | "Low";
export type TicketStatus = "Open" | "In Progress" | "Waiting for College" | "Resolved" | "Closed" | "Escalated";

export interface SupportTicketRecord {
  id: string;
  ticketNumber: string;
  subject: string;
  institutionName: string;
  collegeCode?: string;
  requesterName: string;
  requesterEmail: string;
  requesterDesignation?: string;
  category:
    | "Login Issues"
    | "Academic Configuration"
    | "Project Management"
    | "Evaluation Issues"
    | "Billing"
    | "Technical Issues"
    | "Storage Quota"
    | "Authentication & SSO"
    | "Billing & Invoices";
  priority: TicketPriority;
  status: TicketStatus;
  assignedAgent: string;
  createdAt: string;
  updatedAt: string;
  slaBreachRemainingHours?: number;
  description?: string;
  attachments?: { name: string; size: string; type?: string }[];
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  conversation: {
    id: string;
    sender: string;
    isStaff: boolean;
    timestamp: string;
    message: string;
    isInternalNote?: boolean;
  }[];
}

export type PlatformServiceStatus = "Operational" | "Degraded" | "Down" | "Not Configured";

export interface PlatformServiceRecord {
  id: string;
  name: string;
  serviceType: "email" | "payment" | "storage" | "sms";
  provider: string;
  purpose: string;
  status: PlatformServiceStatus;
  lastHealthCheck: string;
  latencyMs: number;
  recentIncident: string | null;
  uptime30d: number;
  supportsTest: boolean;
}

export type AnnouncementCategory =
  | "Maintenance"
  | "Service Incident"
  | "Feature Update"
  | "Security Advisory"
  | "General Notice"
  | "Product Update"
  | "Academic Deadline"
  | "Billing Notice";

export type AnnouncementPriority = "Low" | "Normal" | "High" | "Urgent" | "Medium" | "Critical";

export type AnnouncementAudience =
  | "All Colleges"
  | "Selected Colleges"
  | "Active Colleges"
  | "All Institutions"
  | "Selected Institutions"
  | "Operational Institutions"
  | "Platform Administrators";

export interface AnnouncementAuditLogEntry {
  id: string;
  action: "Created" | "Published" | "Scheduled" | "Updated" | "Withdrawn";
  performedBy: string;
  timestamp: string;
  details?: string;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  shortDescription?: string;
  fullMessage: string;
  targetAudience: AnnouncementAudience;
  targetCollegeIds?: string[];
  deliveryChannels?: string[];
  sendInApp?: boolean;
  sendEmail?: boolean;
  publishDate: string;
  scheduledFor?: string;
  expiryDate?: string;
  status: "Published" | "Scheduled" | "Draft" | "Archived" | "Expired" | "Withdrawn";
  requiresAcknowledgement?: boolean;
  readCount: number;
  deliveredCount?: number;
  authorName?: string;
  createdAt?: string;
  updatedAt?: string;
  withdrawnAt?: string;
  withdrawnBy?: string;
  withdrawalReason?: string;
  auditLog?: AnnouncementAuditLogEntry[];
}

// =============================================================================
// 8. SECURITY & ACCESS TYPES
// =============================================================================
export interface ActiveSessionRecord {
  id: string;
  accountEmail: string;
  accountName: string;
  role: string;
  device: string;
  browser: string;
  ipAddress: string;
  location: string;
  loginTime: string;
  lastActiveTime: string;
  status: "Active" | "Idle" | "Terminated";
}

export interface SecurityIncidentRecord {
  id: string;
  incidentType: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Warning" | "Informational";
  affectedAccount: string;
  institution: string;
  detectedAt: string;
  status: "Under Investigation" | "Mitigated" | "False Positive" | "Rate-Limited (15m)" | "Blocked" | "Enforced" | string;
  investigator: string;
  details: string;
}

export interface PlatformAuditLogItem {
  id: string;
  timestamp: string;
  user: string;
  userEmail: string;
  actor?: string;
  action: string;
  category:
    | "Authentication"
    | "Administrator Management"
    | "College Management"
    | "Platform Management"
    | "Subscription Management";
  affectedResource: string;
  result: "Success" | "Failure";
  status?: "Success" | "Failure";
  ipAddress: string;
  details: string;
  metadataJson?: string;
  changes?: {
    before?: string;
    after?: string;
  };
}

export interface EmergencyAccessRequestRecord {
  id: string;
  requesterName: string;
  requesterEmail: string;
  targetInstitution: string;
  requestedScope: "Read-Only Database Schema" | "Storage Bucket Inspection" | "Audit Trail Extraction";
  justification: string;
  status: "Approved" | "Pending Approval" | "Revoked" | "Expired";
  approvedBy?: string;
  validUntil: string;
}

// =============================================================================
// SEED DATA: REALISTIC INDIAN INSTITUTIONS & RGPV ECOSYSTEM
// =============================================================================
const INITIAL_COLLEGES: CollegeTenantRecord[] = [
  {
    id: "col-sistec-01",
    name: "Sagar Institute of Science and Technology (SISTec)",
    shortName: "SISTec Bhopal",
    code: "SISTEC",
    university: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
    tenantId: "tenant_sistec_prod",
    domain: "sistec.ac.in",
    subscriptionPlan: "Enterprise",
    totalStudents: 1420,
    totalFaculty: 86,
    departmentsCount: 5,
    status: "Active",
    registrationDate: "2024-06-15",
    renewalDate: "2027-06-30",
    databaseAllocation: "Dedicated Schema (RLS Enforced)",
    storageQuotaGb: 100,
    storageUsedGb: 28.4,
    region: "AWS ap-south-1 (Mumbai)",
    isolationStatus: "RLS Enforced",
    tenantHealth: "Healthy",
    principalName: "Dr. Keshvendra Choudhary",
    principalEmail: "principal@sistec.ac.in",
    contactPhone: "+91 755 427 4200",
    address: "Opposite International Airport, Gandhi Nagar",
    city: "Bhopal",
    state: "Madhya Pradesh",
    pinCode: "462036",
    affiliationNumber: "RGPV/AFF/2024/098",
    establishmentYear: 2007,
    website: "https://www.sistec.ac.in",
    enabledModules: ["Project Tracks", "Rubric Evaluation", "NBA Attainment (SAR)", "VCS Git Integration", "Continuous Logbook"],
    strictSsoEnforced: true,
    provisioningHistory: [
      { stage: "Schema Creation", timestamp: "2024-06-15 10:12:00", status: "Completed", details: "Schema tenant_sistec_prod provisioned on PostgreSQL 17." },
      { stage: "S3 Storage Allocation", timestamp: "2024-06-15 10:12:30", status: "Completed", details: "Bucket prefix /collabex-tenants/sistec initialized." },
      { stage: "Admin Account Setup", timestamp: "2024-06-15 10:13:00", status: "Completed", details: "Principal credentials dispatched to principal@sistec.ac.in." },
    ],
  },
  {
    id: "col-lnct-02",
    name: "Lakshmi Narain College of Technology (LNCT)",
    shortName: "LNCT Bhopal",
    code: "LNCT",
    university: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
    tenantId: "tenant_lnct_prod",
    domain: "lnct.ac.in",
    subscriptionPlan: "Enterprise",
    totalStudents: 2850,
    totalFaculty: 142,
    departmentsCount: 7,
    status: "Active",
    registrationDate: "2024-08-10",
    renewalDate: "2027-08-10",
    databaseAllocation: "Dedicated Schema (RLS Enforced)",
    storageQuotaGb: 250,
    storageUsedGb: 82.1,
    region: "AWS ap-south-1 (Mumbai)",
    isolationStatus: "RLS Enforced",
    tenantHealth: "Healthy",
    principalName: "Dr. Ashok Rai",
    principalEmail: "principal@lnct.ac.in",
    contactPhone: "+91 755 618 5300",
    address: "Kalchuri Nagar, Raisen Road",
    city: "Bhopal",
    state: "Madhya Pradesh",
    pinCode: "462022",
    affiliationNumber: "RGPV/AFF/2024/114",
    establishmentYear: 1994,
    website: "https://www.lnct.ac.in",
    enabledModules: ["Project Tracks", "Rubric Evaluation", "NBA Attainment (SAR)", "VCS Git Integration"],
    strictSsoEnforced: true,
    provisioningHistory: [
      { stage: "Schema Creation", timestamp: "2024-08-10 14:05:00", status: "Completed", details: "Schema tenant_lnct_prod provisioned on PostgreSQL 17." },
      { stage: "Storage Partition", timestamp: "2024-08-10 14:06:10", status: "Completed", details: "Allocated 250 GB bucket quota." },
    ],
  },
  {
    id: "col-medicaps-03",
    name: "Medi-Caps University / Engineering Institute",
    shortName: "Medi-Caps Indore",
    code: "MEDICAPS",
    university: "State Technical / Autonomous",
    tenantId: "tenant_medicaps_prod",
    domain: "medicaps.ac.in",
    subscriptionPlan: "Standard",
    totalStudents: 1980,
    totalFaculty: 98,
    departmentsCount: 6,
    status: "Active",
    registrationDate: "2025-01-18",
    renewalDate: "2027-01-18",
    databaseAllocation: "Dedicated Schema (RLS Enforced)",
    storageQuotaGb: 100,
    storageUsedGb: 34.6,
    region: "AWS ap-south-1 (Mumbai)",
    isolationStatus: "RLS Enforced",
    tenantHealth: "Healthy",
    principalName: "Dr. D. K. Panda",
    principalEmail: "principal@medicaps.ac.in",
    contactPhone: "+91 731 311 1150",
    address: "A.B. Road, Pigdamber, Rau",
    city: "Indore",
    state: "Madhya Pradesh",
    pinCode: "453331",
    affiliationNumber: "MP-PRV/2015/042",
    establishmentYear: 2000,
    website: "https://www.medicaps.ac.in",
    enabledModules: ["Project Tracks", "Rubric Evaluation", "NBA Attainment (SAR)"],
    strictSsoEnforced: false,
    provisioningHistory: [
      { stage: "Provisioning", timestamp: "2025-01-18 09:30:00", status: "Completed", details: "Active standard tenant partition." },
    ],
  },
  {
    id: "col-uit-04",
    name: "UIT-RGPV (University Institute of Technology)",
    shortName: "UIT RGPV",
    code: "UITRGPV",
    university: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
    tenantId: "tenant_uitrgpv_prod",
    domain: "uitrgpv.ac.in",
    subscriptionPlan: "Pilot",
    totalStudents: 1250,
    totalFaculty: 72,
    departmentsCount: 6,
    status: "Active",
    registrationDate: "2025-09-01",
    renewalDate: "2026-12-01",
    databaseAllocation: "Dedicated Schema (RLS Enforced)",
    storageQuotaGb: 50,
    storageUsedGb: 11.2,
    region: "AWS ap-south-1 (Mumbai)",
    isolationStatus: "RLS Enforced",
    tenantHealth: "Healthy",
    principalName: "Dr. Sudhir Singh Bhadauria",
    principalEmail: "director@uitrgpv.ac.in",
    contactPhone: "+91 755 267 8812",
    address: "RGPV Campus, Airport Bypass Road, Gandhi Nagar",
    city: "Bhopal",
    state: "Madhya Pradesh",
    pinCode: "462033",
    affiliationNumber: "RGPV/CONSTITUENT/001",
    establishmentYear: 1986,
    website: "https://www.uitrgpv.ac.in",
    enabledModules: ["Project Tracks", "Rubric Evaluation", "NBA Attainment (SAR)"],
    strictSsoEnforced: true,
    provisioningHistory: [
      { stage: "Pilot License", timestamp: "2025-09-01 11:00:00", status: "Completed", details: "90-Day evaluation partition." },
    ],
  },
  {
    id: "col-ips-05",
    name: "IPS Academy Institute of Engineering & Science",
    shortName: "IPS Indore",
    code: "IPSACAD",
    university: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
    tenantId: "tenant_ipsacad_prod",
    domain: "ipsacademy.org",
    subscriptionPlan: "Standard",
    totalStudents: 1640,
    totalFaculty: 84,
    departmentsCount: 5,
    status: "Pending Verification",
    registrationDate: "2026-02-10",
    renewalDate: "2027-02-10",
    databaseAllocation: "Allocated (Pending Verification)",
    storageQuotaGb: 50,
    storageUsedGb: 0.1,
    region: "AWS ap-south-1 (Mumbai)",
    isolationStatus: "Pending Configuration",
    tenantHealth: "Warning",
    principalName: "Dr. Archana Keerti",
    principalEmail: "director.ies@ipsacademy.org",
    contactPhone: "+91 731 401 4601",
    address: "Knowledge Village, Rajendra Nagar, A.B. Road",
    city: "Indore",
    state: "Madhya Pradesh",
    pinCode: "452012",
    affiliationNumber: "RGPV/AFF/2025/182",
    establishmentYear: 1999,
    website: "https://www.ipsacademy.org",
    enabledModules: ["Project Tracks", "Rubric Evaluation"],
    strictSsoEnforced: false,
    provisioningHistory: [
      { stage: "Verification", timestamp: "2026-02-10 16:20:00", status: "Pending", details: "Awaiting domain DNS TXT record attestation." },
    ],
  },
];

const INITIAL_ONBOARDING_REQUESTS: OnboardingRequestRecord[] = [
  {
    id: "req-01",
    applicationId: "APP-2026-001",
    institutionName: "Acropolis Institute of Technology and Research",
    collegeCode: "AITR",
    shortName: "AITR Indore",
    collegeType: "Engineering College",
    university: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
    website: "https://acropolis.in",
    domain: "acropolis.in",
    country: "India",
    state: "Madhya Pradesh",
    city: "Indore",
    pinCode: "452016",
    address: "Bypass Road, Manglia Square, Indore, Madhya Pradesh 453771",
    applicantName: "Dr. S. C. Sharma",
    applicantDesignation: "Director Academics",
    officialEmail: "director@acropolis.in",
    phone: "+91 731 473 0000",
    estimatedStudents: 2200,
    submissionDate: "2026-11-14",
    verificationStatus: "Pending Verification",
    reviewStatus: "Under Review",
    notes: "Requires integration with Microsoft 365 Azure AD tenant.",
    documents: [
      { id: "doc-01", name: "AICTE Extension of Approval (EoA) 2026–2027", type: "AICTE Approval Letter", fileName: "AICTE_EoA_2026_27_AITR.pdf", fileSize: "2.4 MB", uploadedAt: "2026-11-14", status: "Verified" },
      { id: "doc-02", name: "RGPV University Affiliation Order", type: "University Affiliation Certificate", fileName: "RGPV_Affiliation_Order_AITR_2026.pdf", fileSize: "1.8 MB", uploadedAt: "2026-11-14", status: "Pending Review" },
      { id: "doc-03", name: "Director Appointment & Board Authorization", type: "Principal Appointment Order", fileName: "Board_Resolution_Director_Appointment.pdf", fileSize: "940 KB", uploadedAt: "2026-11-14", status: "Verified" },
      { id: "doc-04", name: "Institutional Trust PAN & GSTIN Certificate", type: "Institutional PAN/GSTIN", fileName: "AITR_PAN_GSTIN_Certificate.pdf", fileSize: "520 KB", uploadedAt: "2026-11-14", status: "Verified" },
    ],
    checklist: {
      institutionIdentity: true,
      universityAffiliation: false,
      applicantAuthorization: true,
      supportingDocuments: false,
      details: {
        institutionIdentity: {
          status: "Verified",
          verifiedBy: "Super Admin",
          verifiedAt: "2026-11-15 11:20",
          notes: "AICTE Permanent Institute ID: 1-4296541 confirmed against national approval portal.",
        },
        universityAffiliation: {
          status: "Pending",
          notes: "Awaiting verification of 2026–27 annual affiliation order against university gazette.",
        },
        applicantAuthorization: {
          status: "Verified",
          verifiedBy: "Super Admin",
          verifiedAt: "2026-11-15 11:35",
          notes: "Director appointment resolution signed by Governing Body Chairman.",
        },
        supportingDocuments: {
          status: "Pending",
          notes: "Affiliation certificate doc-02 pending review in Document Viewer.",
        },
      },
    },
  },
  {
    id: "req-02",
    applicationId: "APP-2026-002",
    institutionName: "Oriental Institute of Science and Technology",
    collegeCode: "OIST",
    shortName: "OIST Bhopal",
    collegeType: "Engineering College",
    university: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
    website: "https://oriental.ac.in",
    domain: "oriental.ac.in",
    country: "India",
    state: "Madhya Pradesh",
    city: "Bhopal",
    pinCode: "462021",
    address: "Oriental Campus, Raisen Road, Bhopal, Madhya Pradesh 462021",
    applicantName: "Dr. K. G. Sudhakar",
    applicantDesignation: "Principal",
    officialEmail: "principal@oriental.ac.in",
    phone: "+91 755 252 9015",
    estimatedStudents: 1800,
    submissionDate: "2026-11-18",
    verificationStatus: "Verified",
    reviewStatus: "Approved",
    notes: "Requested 90-day pilot trial for CSE & ECE branches. Verification documents certified.",
    documents: [
      { id: "doc-21", name: "AICTE EoA Approval Letter 2026–27", type: "AICTE Approval Letter", fileName: "AICTE_EoA_OIST_Bhopal.pdf", fileSize: "2.1 MB", uploadedAt: "2026-11-18", status: "Verified" },
      { id: "doc-22", name: "RGPV Affiliation Notification Order", type: "University Affiliation Certificate", fileName: "RGPV_Affiliation_OIST_2026.pdf", fileSize: "1.5 MB", uploadedAt: "2026-11-18", status: "Verified" },
      { id: "doc-23", name: "Principal Authorization Order", type: "Principal Appointment Order", fileName: "Principal_Appointment_Letter.pdf", fileSize: "780 KB", uploadedAt: "2026-11-18", status: "Verified" },
      { id: "doc-24", name: "Institutional GST Registration Certificate", type: "Institutional PAN/GSTIN", fileName: "OIST_GST_Certificate.pdf", fileSize: "610 KB", uploadedAt: "2026-11-18", status: "Verified" },
    ],
    checklist: {
      institutionIdentity: true,
      universityAffiliation: true,
      applicantAuthorization: true,
      supportingDocuments: true,
    },
    decisionDate: "2026-11-20",
    decisionBy: "Dev Startup Admin",
  },
  {
    id: "req-03",
    applicationId: "APP-2026-003",
    institutionName: "Madhav Institute of Technology and Science (MITS)",
    collegeCode: "MITS",
    shortName: "MITS Gwalior",
    collegeType: "Deemed / Autonomous Institution",
    university: "Deemed / Autonomous (RGPV Affiliated)",
    website: "https://mitsgwalior.in",
    domain: "mitsgwalior.in",
    country: "India",
    state: "Madhya Pradesh",
    city: "Gwalior",
    pinCode: "474005",
    address: "Race Course Road, Gola ka Mandir, Gwalior, Madhya Pradesh 474005",
    applicantName: "Dr. R. K. Pandit",
    applicantDesignation: "Director",
    officialEmail: "director@mitsgwalior.in",
    phone: "+91 751 240 9300",
    estimatedStudents: 3100,
    submissionDate: "2026-11-20",
    verificationStatus: "Verified",
    reviewStatus: "Provisioning",
    notes: "Autonomous AICTE CBCS curriculum schema requested. Schema provisioning worker in progress.",
    documents: [
      { id: "doc-31", name: "UGC Autonomous Notification Letter", type: "AICTE Approval Letter", fileName: "UGC_Autonomous_Grant_MITS.pdf", fileSize: "3.2 MB", uploadedAt: "2026-11-20", status: "Verified" },
      { id: "doc-32", name: "RGPV Autonomous Affiliation Endorsement", type: "University Affiliation Certificate", fileName: "RGPV_Autonomous_Affiliation.pdf", fileSize: "2.0 MB", uploadedAt: "2026-11-20", status: "Verified" },
      { id: "doc-33", name: "Director Board Resolution", type: "Principal Appointment Order", fileName: "Board_Resolution_MITS.pdf", fileSize: "820 KB", uploadedAt: "2026-11-20", status: "Verified" },
    ],
    checklist: {
      institutionIdentity: true,
      universityAffiliation: true,
      applicantAuthorization: true,
      supportingDocuments: true,
    },
    decisionDate: "2026-11-21",
    decisionBy: "Dev Startup Admin",
  },
  {
    id: "req-04",
    applicationId: "APP-2026-004",
    institutionName: "Rewa Engineering College",
    collegeCode: "REC-REWA",
    shortName: "REC Rewa",
    collegeType: "Government Engineering College",
    university: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
    website: "https://rewaengg.ac.in",
    domain: "rewaengg.ac.in",
    country: "India",
    state: "Madhya Pradesh",
    city: "Rewa",
    pinCode: "486002",
    address: "University Road, Rewa, Madhya Pradesh 486002",
    applicantName: "Dr. B. K. Agrawal",
    applicantDesignation: "Principal",
    officialEmail: "principal@rewaengg.ac.in",
    phone: "+91 7662 252 045",
    estimatedStudents: 1200,
    submissionDate: "2026-11-10",
    verificationStatus: "Action Required",
    reviewStatus: "Provisioning Failed",
    provisioningError: "PostgreSQL dedicated schema allocation worker timed out after 3 retries (Deadlock on tenant lock file). Retry provisioning to resume.",
    notes: "Government engineering college onboarding. Schema creation failed on step 2.",
    documents: [
      { id: "doc-41", name: "MP Technical Education Dept Approval", type: "AICTE Approval Letter", fileName: "MP_DTE_Government_Order.pdf", fileSize: "1.9 MB", uploadedAt: "2026-11-10", status: "Verified" },
      { id: "doc-42", name: "RGPV Government College Affiliation", type: "University Affiliation Certificate", fileName: "RGPV_REC_Affiliation.pdf", fileSize: "1.3 MB", uploadedAt: "2026-11-10", status: "Verified" },
      { id: "doc-43", name: "Gazette Principal Notification", type: "Principal Appointment Order", fileName: "Govt_Gazette_Principal_Appointment.pdf", fileSize: "1.1 MB", uploadedAt: "2026-11-10", status: "Verified" },
    ],
    checklist: {
      institutionIdentity: true,
      universityAffiliation: true,
      applicantAuthorization: true,
      supportingDocuments: true,
    },
    decisionDate: "2026-11-12",
    decisionBy: "Dev Startup Admin",
  },
  {
    id: "req-05",
    applicationId: "APP-2026-005",
    institutionName: "Global Institute of Science and Management",
    collegeCode: "GISM",
    shortName: "GISM Jabalpur",
    collegeType: "Private Technical Institution",
    university: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
    website: "https://gism.edu.in",
    domain: "gism.edu.in",
    country: "India",
    state: "Madhya Pradesh",
    city: "Jabalpur",
    pinCode: "482003",
    address: "Bhedaghat Road, Jabalpur, Madhya Pradesh 482003",
    applicantName: "Er. Neeraj Verma",
    applicantDesignation: "Academic Coordinator",
    officialEmail: "coordinator.neeraj@gmail.com",
    phone: "+91 761 240 5500",
    estimatedStudents: 850,
    submissionDate: "2026-11-05",
    verificationStatus: "Action Required",
    reviewStatus: "Rejected",
    decisionDate: "2026-11-08",
    decisionBy: "Dev Startup Admin",
    rejectionReason: "Unauthorized applicant signatory & non-institutional email domain",
    rejectionExplanation: "Application submitted using a personal @gmail.com address without authorizing board resolution or principal seal. Applicant does not hold statutory institutional signatory authority.",
    notes: "Applicant advised to resubmit with principal's official domain email and valid appointment order.",
    documents: [
      { id: "doc-51", name: "Draft AICTE Syllabus Overview", type: "AICTE Approval Letter", fileName: "Draft_Syllabus_GISM.pdf", fileSize: "890 KB", uploadedAt: "2026-11-05", status: "Pending Review" },
      { id: "doc-52", name: "Affiliation Letter (Missing)", type: "University Affiliation Certificate", fileName: "Missing", fileSize: "0 KB", uploadedAt: "2026-11-05", status: "Missing" },
    ],
    checklist: {
      institutionIdentity: false,
      universityAffiliation: false,
      applicantAuthorization: false,
      supportingDocuments: false,
    },
  },
];

const INITIAL_UNIVERSITIES: UniversityRecord[] = [
  {
    id: "univ-rgpv-01",
    name: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
    code: "RGPV",
    website: "https://www.rgpv.ac.in",
    state: "Madhya Pradesh",
    universityType: "State Technical",
    status: "Active",
    affiliatedCollegesCount: 218,
    establishedYear: 1998,
    chancellorOrHead: "Prof. Sunil Kumar Gupta (Vice Chancellor)",
    isOfficialUniversity: true,
  },
  {
    id: "univ-aktu-02",
    name: "Dr. A.P.J. Abdul Kalam Technical University (AKTU)",
    code: "AKTU",
    website: "https://www.aktu.ac.in",
    state: "Uttar Pradesh",
    universityType: "State Technical",
    status: "Active",
    affiliatedCollegesCount: 450,
    establishedYear: 2000,
    chancellorOrHead: "Prof. J. P. Pandey (Vice Chancellor)",
    isOfficialUniversity: false,
  },
  {
    id: "univ-vtu-03",
    name: "Visvesvaraya Technological University (VTU)",
    code: "VTU",
    website: "https://www.vtu.ac.in",
    state: "Karnataka",
    universityType: "State Technical",
    status: "Active",
    affiliatedCollegesCount: 220,
    establishedYear: 1998,
    chancellorOrHead: "Prof. S. Vidyashankar (Vice Chancellor)",
    isOfficialUniversity: false,
  },
];

const INITIAL_REGULATIONS: AcademicRegulationRecord[] = [
  {
    id: "reg-rgpv-flex-2022",
    name: "RGPV AICTE Flexible CBCS Ordinance 2022",
    code: "RGPV-AICTE-FLEX-2022",
    university: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
    applicablePrograms: ["B.Tech"],
    effectiveAcademicYear: "2022–2023",
    applicableBatches: "2022–2026, 2023–2027, 2024–2028",
    duration: "4 Years / 8 Semesters",
    status: "Published",
    version: "v3.2",
    gradingScheme: "10-Point Absolute",
    minPassingMarksTheory: 35,
    minPassingMarksPractical: 50,
    totalProjectCredits: 12,
    lastUpdated: "12 Aug 2026",
    projectStages: [
      { stage: "Minor Project", semester: 6, credits: 2, evaluationMode: "Internal Guide 40% / Viva 60%" },
      { stage: "Major Project Phase-I", semester: 7, credits: 4, evaluationMode: "Internal Guide 40% / Viva 60%" },
      { stage: "Major Project Phase-II", semester: 8, credits: 6, evaluationMode: "Internal Guide 60% / External Viva 140M" },
    ],
    evaluationGuidelines: "Blended 40/60 assessment model with continuous logbook discipline, synopsis defense, and external university viva with working software/hardware demonstration.",
  },
  {
    id: "reg-rgpv-cbcs-2018",
    name: "RGPV Choice Based Credit System (CBCS) 2018",
    code: "RGPV-CBCS-2018",
    university: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
    applicablePrograms: ["B.Tech", "B.E."],
    effectiveAcademicYear: "2018–2019",
    applicableBatches: "2018–2022, 2019–2023, 2020–2024, 2021–2025",
    duration: "4 Years / 8 Semesters",
    status: "Published",
    version: "v2.0",
    gradingScheme: "10-Point Absolute",
    minPassingMarksTheory: 35,
    minPassingMarksPractical: 50,
    totalProjectCredits: 10,
    lastUpdated: "15 Jan 2024",
    projectStages: [
      { stage: "Minor Project", semester: 6, credits: 2, evaluationMode: "Internal Guide 40% / External 60%" },
      { stage: "Major Project", semester: 8, credits: 8, evaluationMode: "Internal Guide 50% / External Viva 150M" },
    ],
    evaluationGuidelines: "Standard end-semester university evaluation with departmental presentation and submitted hardbound dissertation.",
  },
  {
    id: "reg-rgpv-mtech-2023",
    name: "RGPV M.Tech Modular CBCS Ordinance 2023",
    code: "RGPV-MTECH-CBCS-2023",
    university: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
    applicablePrograms: ["M.Tech"],
    effectiveAcademicYear: "2023–2024",
    applicableBatches: "2023–2025, 2024–2026, 2025–2027",
    duration: "2 Years / 4 Semesters",
    status: "Published",
    version: "v1.4",
    gradingScheme: "10-Point Relative (CBCS)",
    minPassingMarksTheory: 40,
    minPassingMarksPractical: 50,
    totalProjectCredits: 20,
    lastUpdated: "04 Jun 2025",
    projectStages: [
      { stage: "Dissertation Phase-I", semester: 3, credits: 8, evaluationMode: "Internal DRC 100M / External Viva 100M" },
      { stage: "Dissertation Phase-II", semester: 4, credits: 12, evaluationMode: "Internal Guide 100M / University Board 200M" },
    ],
    evaluationGuidelines: "Mandatory peer-reviewed publication in Scopus/UGC CARE indexed journal, comprehensive literature survey, and external defense before University Board.",
  },
  {
    id: "reg-rgpv-nep-draft",
    name: "RGPV NEP-2020 Aligned Engineering Curriculum (Draft)",
    code: "RGPV-NEP-2026-DRAFT",
    university: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
    applicablePrograms: ["B.Tech"],
    effectiveAcademicYear: "2026–2027",
    applicableBatches: "2026–2030 (Proposed)",
    duration: "4 Years / 8 Semesters",
    status: "Draft",
    version: "v1.0-draft",
    gradingScheme: "10-Point Relative (CBCS)",
    minPassingMarksTheory: 40,
    minPassingMarksPractical: 50,
    totalProjectCredits: 16,
    lastUpdated: "18 Oct 2026",
    projectStages: [
      { stage: "Industry Mini Project / Internship", semester: 5, credits: 2, evaluationMode: "Industry Mentor + Guide" },
      { stage: "Capstone Minor Project", semester: 6, credits: 4, evaluationMode: "Continuous Rubric Review" },
      { stage: "Capstone Major Project", semester: 7, credits: 10, evaluationMode: "Open-Source Benchmark / Prototype Defense" },
    ],
    evaluationGuidelines: "Industry mentor co-evaluation, patent disclosure or working open-source benchmark, and outcome demonstration.",
  },
  {
    id: "reg-rgpv-gs-2010",
    name: "RGPV Grading System (GS) Ordinance 2010 (Legacy)",
    code: "RGPV-GS-2010",
    university: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
    applicablePrograms: ["B.E."],
    effectiveAcademicYear: "2010–2011",
    applicableBatches: "2010–2017 (Historical)",
    duration: "4 Years / 8 Semesters",
    status: "Archived",
    version: "v1.0",
    gradingScheme: "10-Point Absolute",
    minPassingMarksTheory: 35,
    minPassingMarksPractical: 50,
    totalProjectCredits: 8,
    lastUpdated: "30 Jun 2018",
    projectStages: [
      { stage: "Major Project", semester: 8, credits: 8, evaluationMode: "External University Viva 150M" },
    ],
    evaluationGuidelines: "Historical scheme with university external examiner viva-voce and hardbound project documentation submission.",
  },
];

const INITIAL_PROGRAMS: AcademicProgramRecord[] = [
  { id: "prog-btech", name: "Bachelor of Technology", code: "B.Tech", degreeType: "UG", durationYears: 4, totalSemesters: 8, applicableRegulations: ["RGPV-AICTE-FLEX-2022", "RGPV-NEP-2026-DRAFT"], status: "Active", branchesCount: 9 },
  { id: "prog-mtech", name: "Master of Technology", code: "M.Tech", degreeType: "PG", durationYears: 2, totalSemesters: 4, applicableRegulations: ["RGPV-MTECH-CBCS-2023"], status: "Active", branchesCount: 4 },
  { id: "prog-mca", name: "Master of Computer Applications", code: "MCA", degreeType: "PG", durationYears: 2, totalSemesters: 4, applicableRegulations: ["RGPV-AICTE-FLEX-2022"], status: "Active", branchesCount: 1 },
  { id: "prog-be", name: "Bachelor of Engineering (Legacy)", code: "B.E.", degreeType: "UG", durationYears: 4, totalSemesters: 8, applicableRegulations: ["RGPV-CBCS-2018", "RGPV-GS-2010"], status: "Archived", branchesCount: 6 },
];

const INITIAL_BRANCHES: AcademicBranchRecord[] = [
  // B.Tech Branches
  { id: "br-cse", name: "Computer Science and Engineering", code: "CSE", programCode: "B.Tech", departmentCode: "DEPT-CSE", durationYears: 4, status: "Active", intakeSeats: 180 },
  { id: "br-aiml", name: "CSE (Artificial Intelligence & Machine Learning)", code: "AIML", programCode: "B.Tech", departmentCode: "DEPT-CSE", durationYears: 4, status: "Active", intakeSeats: 120 },
  { id: "br-aids", name: "Artificial Intelligence & Data Science", code: "AIDS", programCode: "B.Tech", departmentCode: "DEPT-CSE", durationYears: 4, status: "Active", intakeSeats: 60 },
  { id: "br-it", name: "Information Technology", code: "IT", programCode: "B.Tech", departmentCode: "DEPT-IT", durationYears: 4, status: "Active", intakeSeats: 60 },
  { id: "br-ece", name: "Electronics and Communication Engineering", code: "ECE", programCode: "B.Tech", departmentCode: "DEPT-ECE", durationYears: 4, status: "Active", intakeSeats: 120 },
  { id: "br-ex", name: "Electrical & Electronics Engineering", code: "EX", programCode: "B.Tech", departmentCode: "DEPT-EE", durationYears: 4, status: "Active", intakeSeats: 60 },
  { id: "br-ee", name: "Electrical Engineering", code: "EE", programCode: "B.Tech", departmentCode: "DEPT-EE", durationYears: 4, status: "Active", intakeSeats: 60 },
  { id: "br-me", name: "Mechanical Engineering", code: "ME", programCode: "B.Tech", departmentCode: "DEPT-ME", durationYears: 4, status: "Active", intakeSeats: 60 },
  { id: "br-ce", name: "Civil Engineering", code: "CE", programCode: "B.Tech", departmentCode: "DEPT-CE", durationYears: 4, status: "Active", intakeSeats: 60 },

  // M.Tech Branches
  { id: "br-mtech-cse", name: "Computer Science and Engineering (PG)", code: "CSE-PG", programCode: "M.Tech", departmentCode: "DEPT-CSE", durationYears: 2, status: "Active", intakeSeats: 18 },
  { id: "br-mtech-vlsi", name: "VLSI Design & Embedded Systems", code: "VLSI-PG", programCode: "M.Tech", departmentCode: "DEPT-ECE", durationYears: 2, status: "Active", intakeSeats: 18 },
  { id: "br-mtech-the", name: "Thermal Engineering", code: "THE-PG", programCode: "M.Tech", departmentCode: "DEPT-ME", durationYears: 2, status: "Active", intakeSeats: 18 },
  { id: "br-mtech-str", name: "Structural Engineering", code: "STR-PG", programCode: "M.Tech", departmentCode: "DEPT-CE", durationYears: 2, status: "Active", intakeSeats: 18 },

  // MCA Branches
  { id: "br-mca-gen", name: "Master of Computer Applications", code: "MCA-GEN", programCode: "MCA", departmentCode: "DEPT-CSE", durationYears: 2, status: "Active", intakeSeats: 60 },
];

const INITIAL_DEPARTMENTS: DepartmentMasterRecord[] = [
  { id: "d-cse", name: "Department of Computer Science & Engineering", code: "DEPT-CSE", applicableBranches: ["CSE", "AIML"], status: "Active", description: "Standard institutional department for computing programs." },
  { id: "d-it", name: "Department of Information Technology", code: "DEPT-IT", applicableBranches: ["IT"], status: "Active", description: "Information systems, networking and cyber security." },
  { id: "d-ece", name: "Department of Electronics & Communication Engineering", code: "DEPT-ECE", applicableBranches: ["ECE"], status: "Active", description: "VLSI, embedded systems and signal processing." },
  { id: "d-me", name: "Department of Mechanical Engineering", code: "DEPT-ME", applicableBranches: ["ME"], status: "Active", description: "Thermodynamics, robotics, design and manufacturing." },
  { id: "d-ce", name: "Department of Civil Engineering", code: "DEPT-CE", applicableBranches: ["CE"], status: "Active", description: "Structural analysis, geotechnical and environmental engineering." },
  { id: "d-ee", name: "Department of Electrical Engineering", code: "DEPT-EE", applicableBranches: ["EE"], status: "Active", description: "Power systems, renewable energy and electrical machinery." },
];

const INITIAL_SUBJECTS: SubjectMasterRecord[] = [
  { id: "sub-cse-606", name: "Minor Project (Semester 6)", code: "CS-606", type: "Project (Minor)", credits: 2, semester: 6, program: "B.Tech", branch: "CSE", regulation: "RGPV-AICTE-FLEX-2022", teachingScheme: "L-T-P: 0-0-4", classification: "Project", internalMax: 40, externalMax: 60 },
  { id: "sub-cse-705", name: "Major Project Phase-I (Semester 7)", code: "CS-705", type: "Project (Major Phase-I)", credits: 4, semester: 7, program: "B.Tech", branch: "CSE", regulation: "RGPV-AICTE-FLEX-2022", teachingScheme: "L-T-P: 0-0-8", classification: "Project", internalMax: 40, externalMax: 60 },
  { id: "sub-cse-803", name: "Major Project Phase-II (Semester 8)", code: "CS-803", type: "Project (Major Phase-II)", credits: 6, semester: 8, program: "B.Tech", branch: "CSE", regulation: "RGPV-AICTE-FLEX-2022", teachingScheme: "L-T-P: 0-0-12" as any, classification: "Project", internalMax: 60, externalMax: 140 },
  { id: "sub-ece-606", name: "Minor Project (Semester 6)", code: "EC-606", type: "Project (Minor)", credits: 2, semester: 6, program: "B.Tech", branch: "ECE", regulation: "RGPV-AICTE-FLEX-2022", teachingScheme: "L-T-P: 0-0-4", classification: "Project", internalMax: 40, externalMax: 60 },
  { id: "sub-me-606", name: "Minor Project (Semester 6)", code: "ME-606", type: "Project (Minor)", credits: 2, semester: 6, program: "B.Tech", branch: "ME", regulation: "RGPV-AICTE-FLEX-2022", teachingScheme: "L-T-P: 0-0-4", classification: "Project", internalMax: 40, externalMax: 60 },
];

const INITIAL_ACADEMIC_YEARS: AcademicYearRecord[] = [
  { id: "ay-2026-27", label: "2026–2027", startDate: "2026-07-01", endDate: "2027-06-30", applicableRegulations: ["RGPV-AICTE-FLEX-2022"], status: "Current Active" },
  { id: "ay-2025-26", label: "2025–2026", startDate: "2025-07-01", endDate: "2026-06-30", applicableRegulations: ["RGPV-AICTE-FLEX-2022"], status: "Archived" },
  { id: "ay-2027-28", label: "2027–2028", startDate: "2027-07-01", endDate: "2028-06-30", applicableRegulations: ["RGPV-AICTE-FLEX-2022", "AUTONOMOUS-AICTE-2024"], status: "Upcoming" },
];

const INITIAL_EXAM_SCHEMES: EvaluationSchemeRecord[] = [
  {
    id: "eval-min-rgpv",
    name: "RGPV Minor Project Scheme (60/40 Split)",
    projectType: "Minor Project",
    guideWeightage: 40,
    vivaWeightage: 60,
    totalMarks: 100,
    rubricComponents: [
      { name: "Continuous Guide Progress & Logbook Discipline", maxScore: 20, criterionCode: "PO9", bloomsLevel: "L3_Apply" },
      { name: "Synopsis, Problem Definition & Literature Survey", maxScore: 20, criterionCode: "PO2", bloomsLevel: "L4_Analyze" },
      { name: "System Architecture, Design & Modular Implementation", maxScore: 30, criterionCode: "PO3", bloomsLevel: "L5_Evaluate" },
      { name: "Viva Defense, Demonstration & Answering Queries", maxScore: 30, criterionCode: "PO10", bloomsLevel: "L3_Apply" },
    ],
  },
  {
    id: "eval-maj-rgpv",
    name: "RGPV Major Project Phase-II Scheme (70/30 Split)",
    projectType: "Major Project Phase-II",
    guideWeightage: 60,
    vivaWeightage: 140,
    totalMarks: 200,
    rubricComponents: [
      { name: "Guide Continuous Mentorship & Friday Logbooks", maxScore: 60, criterionCode: "PO9", bloomsLevel: "L3_Apply" },
      { name: "Research Depth, Empirical Testing & Tool Usage", maxScore: 50, criterionCode: "PO5", bloomsLevel: "L4_Analyze" },
      { name: "Final Dissertation / Technical Documentation (IEEE)", maxScore: 40, criterionCode: "PO10", bloomsLevel: "L3_Apply" },
      { name: "External University Viva & Working Prototype", maxScore: 50, criterionCode: "PO3", bloomsLevel: "L5_Evaluate" },
    ],
  },
];

const INITIAL_NBA_POS: NbaProgramOutcomeRecord[] = [
  { code: "PO1", title: "Engineering Knowledge", bloomsTaxonomy: "L3_Apply", description: "Apply knowledge of mathematics, science, engineering fundamentals to computational models.", levels: { l0: "Inability to apply foundational concepts.", l1: "Applies basic models with frequent mentor intervention.", l2: "Accurately applies engineering principles to solution architecture.", l3: "Demonstrates advanced mastery with optimization proofs." } },
  { code: "PO2", title: "Problem Analysis", bloomsTaxonomy: "L4_Analyze", description: "Identify, formulate, review literature, and analyze complex problems reaching substantiated conclusions.", levels: { l0: "Vague problem formulation without empirical basis.", l1: "Basic literature review citing standard textbooks.", l2: "Thorough survey of IEEE/ACM literature with formal bounds.", l3: "State-of-the-art benchmarking with ablation study." } },
  { code: "PO3", title: "Design/Development of Solutions", bloomsTaxonomy: "L5_Evaluate", description: "Design solutions for complex problems meeting specified public health, safety, and societal needs.", levels: { l0: "Trivial design lacking modularity and error resilience.", l1: "Standard monolithic architecture with basic CRUD.", l2: "High-cohesion, low-coupling microservice or layered architecture.", l3: "Production-grade fault-tolerant distributed system." } },
  { code: "PO4", title: "Conduct Investigations of Complex Problems", bloomsTaxonomy: "L4_Analyze", description: "Use research methods including design of experiments, analysis and synthesis of information.", levels: { l0: "No systematic experimental protocol.", l1: "Preliminary tests on synthetic local data.", l2: "Controlled experiments with quantitative statistical analysis.", l3: "Multi-factor ANOVA validation on live testbeds." } },
  { code: "PO5", title: "Modern Tool Usage", bloomsTaxonomy: "L3_Apply", description: "Create, select, and apply modern IT tools including modeling and containerization.", levels: { l0: "Manual scripts without version control.", l1: "Git repository with sporadic commits.", l2: "Standard CI/CD pipeline, Docker, automated testing.", l3: "Full GitOps workflow with IaC and distributed tracing." } },
  { code: "PO6", title: "The Engineer and Society", bloomsTaxonomy: "L3_Apply", description: "Assess societal, health, safety, legal and cultural issues and consequent responsibilities.", levels: { l0: "No consideration of societal impact.", l1: "Surface-level recognition in introductory chapter.", l2: "Concrete risk mitigation for end-user safety & accessibility.", l3: "Validated deployment with measurable public benefit." } },
  { code: "PO7", title: "Environment and Sustainability", bloomsTaxonomy: "L2_Understand", description: "Understand the impact of engineering solutions in societal and environmental contexts (UN SDGs). levels", levels: { l0: "Energy-wasteful compute loops without justification.", l1: "Mentions SDGs as abstract appendix item.", l2: "Directly maps architecture to explicit UN SDG targets.", l3: "Green software engineering with provable watt-hour savings." } },
  { code: "PO8", title: "Ethics", bloomsTaxonomy: "L3_Apply", description: "Apply ethical principles and commit to professional ethics and responsibilities of engineering practice.", levels: { l0: "Plagiarism > 30% or unauthorized data scraping.", l1: "Plagiarism < 15% with basic attribution.", l2: "Strict DPDP Act / GDPR privacy compliance and signed consent.", l3: "Exemplary ethical rigor, algorithmic bias mitigation." } },
  { code: "PO9", title: "Individual and Team Work", bloomsTaxonomy: "L3_Apply", description: "Function effectively as an individual, and as a member or leader in diverse multidisciplinary teams.", levels: { l0: "Single member commits 90%+ with severe discord.", l1: "Uneven task distribution with delayed guide reviews.", l2: "Equitable task allocations tracked via Kanban boards.", l3: "Exemplary collaborative velocity and peer code reviews." } },
  { code: "PO10", title: "Communication", bloomsTaxonomy: "L3_Apply", description: "Communicate effectively on complex engineering activities with engineering community and society.", levels: { l0: "Unstructured defense; unable to articulate architecture.", l1: "Standard slide deck with generic diagrams.", l2: "Crisp technical presentation and IEEE-formatted report.", l3: "Publishable manuscript prepared; articulate defense." } },
  { code: "PO11", title: "Project Management and Finance", bloomsTaxonomy: "L3_Apply", description: "Demonstrate knowledge and understanding of engineering and management principles (Gantt, budgets).", levels: { l0: "No sprint schedule; major deadlines missed.", l1: "Basic Gantt chart created with reactive adjustments.", l2: "Agile sprint cadence, cloud budget forecasting.", l3: "Commercialization roadmap with ROI and burn-rate modeling." } },
  { code: "PO12", title: "Life-long Learning", bloomsTaxonomy: "L2_Understand", description: "Recognize the need for, and have the preparation to engage in independent and lifelong learning.", levels: { l0: "Refuses to adapt when libraries deprecate.", l1: "Learns API docs when instructed directly by guide.", l2: "Independently masters unfamiliar modern cloud SDKs.", l3: "Synthesizes preprint literature and contributes to OSS." } },
];

const INITIAL_UN_SDGS: UnSdgRecord[] = [
  { num: 1, name: "No Poverty", description: "End poverty in all its forms everywhere.", officialReference: "UN SDG Target 1.4", color: "bg-red-600", isActive: true },
  { num: 2, name: "Zero Hunger", description: "End hunger, achieve food security and improved nutrition.", officialReference: "UN SDG Target 2.1", color: "bg-amber-600", isActive: true },
  { num: 3, name: "Good Health and Well-Being", description: "Ensure healthy lives and promote well-being for all at all ages.", officialReference: "UN SDG Target 3.8", color: "bg-emerald-600", isActive: true },
  { num: 4, name: "Quality Education", description: "Ensure inclusive and equitable quality education and promote lifelong learning.", officialReference: "UN SDG Target 4.3", color: "bg-rose-700", isActive: true },
  { num: 5, name: "Gender Equality", description: "Achieve gender equality and empower all women and girls.", officialReference: "UN SDG Target 5.5", color: "bg-orange-600", isActive: true },
  { num: 6, name: "Clean Water and Sanitation", description: "Ensure availability and sustainable management of water and sanitation for all.", officialReference: "UN SDG Target 6.3", color: "bg-cyan-600", isActive: true },
  { num: 7, name: "Affordable and Clean Energy", description: "Ensure access to affordable, reliable, sustainable and modern energy.", officialReference: "UN SDG Target 7.2", color: "bg-yellow-500", isActive: true },
  { num: 8, name: "Decent Work and Economic Growth", description: "Promote sustained, inclusive and sustainable economic growth.", officialReference: "UN SDG Target 8.2", color: "bg-red-800", isActive: true },
  { num: 9, name: "Industry, Innovation and Infrastructure", description: "Build resilient infrastructure, promote inclusive and sustainable industrialization.", officialReference: "UN SDG Target 9.5", color: "bg-orange-500", isActive: true },
  { num: 10, name: "Reduced Inequalities", description: "Reduce inequality within and among countries.", officialReference: "UN SDG Target 10.2", color: "bg-pink-600", isActive: true },
  { num: 11, name: "Sustainable Cities and Communities", description: "Make cities and human settlements inclusive, safe, resilient and sustainable.", officialReference: "UN SDG Target 11.2", color: "bg-amber-500", isActive: true },
  { num: 12, name: "Responsible Consumption and Production", description: "Ensure sustainable consumption and production patterns.", officialReference: "UN SDG Target 12.5", color: "bg-yellow-600", isActive: true },
  { num: 13, name: "Climate Action", description: "Take urgent action to combat climate change and its impacts.", officialReference: "UN SDG Target 13.3", color: "bg-emerald-700", isActive: true },
  { num: 14, name: "Life Below Water", description: "Conserve and sustainably use oceans, seas and marine resources.", officialReference: "UN SDG Target 14.1", color: "bg-blue-600", isActive: true },
  { num: 15, name: "Life on Land", description: "Protect, restore and promote sustainable use of terrestrial ecosystems.", officialReference: "UN SDG Target 15.5", color: "bg-lime-600", isActive: true },
  { num: 16, name: "Peace, Justice and Strong Institutions", description: "Promote peaceful and inclusive societies for sustainable development.", officialReference: "UN SDG Target 16.6", color: "bg-blue-800", isActive: true },
  { num: 17, name: "Partnerships for the Goals", description: "Strengthen the means of implementation and revitalize global partnership.", officialReference: "UN SDG Target 17.16", color: "bg-indigo-900", isActive: true },
];

const INITIAL_TEMPLATE_VERSIONS: TemplateVersionRecord[] = [
  { id: "ver-01", templateName: "RGPV-AICTE-FLEX-2022 Minor Rubric", version: "v3.2", status: "Published", effectiveDate: "2024-07-01", changeDescription: "Realigned 40% Continuous / 60% External viva scoring weights per RGPV notification.", impactedInstitutionsCount: 4, author: "academic.curator@collabex.in" },
  { id: "ver-02", templateName: "SAR Criterion 3.3 CO-PO Matrix Scheme", version: "v2.1", status: "Published", effectiveDate: "2024-08-15", changeDescription: "Added direct/indirect 80:20 blended calculation standard.", impactedInstitutionsCount: 5, author: "academic.curator@collabex.in" },
  { id: "ver-03", templateName: "Autonomous CBCS Relative Rubric Scheme", version: "v1.0-draft", status: "Review", effectiveDate: "2025-01-01", changeDescription: "Initial schema for autonomous institutions with customized grade cutoffs.", impactedInstitutionsCount: 1, author: "admin@collabex.in" },
];

// =============================================================================
// SUBSCRIPTIONS & FINANCIAL SEED
// =============================================================================
const INITIAL_PLANS: SubscriptionPlanRecord[] = [
  {
    id: "plan-pilot",
    name: "Institutional Pilot",
    code: "PILOT",
    description: "90-day institutional trial for departmental evaluation & accreditation demo.",
    billingCycle: "Trial (90 Days)",
    priceINR: 0,
    userLimit: 1000,
    facultyLimit: 50,
    storageLimitGb: 50,
    modulesAvailable: ["Project Tracks", "Rubric Scoring", "Basic SAR Export"],
    supportLevel: "Standard 8x5",
    trialDurationDays: 90,
    status: "Active",
  },
  {
    id: "plan-standard",
    name: "Standard Academic",
    code: "STANDARD",
    description: "Comprehensive annual project governance for independent engineering colleges.",
    billingCycle: "Annual",
    priceINR: 240000,
    userLimit: 2500,
    facultyLimit: 150,
    storageLimitGb: 100,
    modulesAvailable: ["Project Tracks", "Rubric Scoring", "Continuous Logbook", "SAR Exporter", "VCS Git Sync"],
    supportLevel: "Standard 8x5",
    trialDurationDays: 30,
    status: "Active",
  },
  {
    id: "plan-enterprise",
    name: "Enterprise Multi-Campus",
    code: "ENTERPRISE",
    description: "Unlimited students, multi-campus partitioning, automated SCIM & digital seal attestation.",
    billingCycle: "Annual",
    priceINR: 480000,
    userLimit: 10000,
    facultyLimit: 500,
    storageLimitGb: 250,
    modulesAvailable: ["All Platform Modules", "Dedicated Schema", "Automated SCIM Directory", "Cryptographic Signatures", "Custom SLA"],
    supportLevel: "Dedicated SLA Manager",
    trialDurationDays: 0,
    status: "Active",
  },
];

const INITIAL_COLLEGE_SUBSCRIPTIONS: CollegeSubscriptionRecord[] = [
  {
    id: "sub-01",
    institutionId: "col-sistec-01",
    institutionName: "Sagar Institute of Science and Technology (SISTec)",
    collegeCode: "SISTEC",
    planName: "Enterprise Multi-Campus",
    planId: "plan-enterprise",
    startDate: "2024-06-15",
    renewalDate: "2027-06-30",
    amountINR: 480000,
    billingCycle: "Annual",
    status: "Active",
    autoRenew: true,
    seatUtilization: { used: 1420, allocated: 3000, facultyUsed: 86, facultyAllocated: 200 },
    storageQuotaGb: 100,
    storageUsedGb: 28.4,
    gstin: "23AAGCS2341P1ZB",
    taxType: "Intra-State (CGST + SGST)",
    history: [
      { timestamp: "2024-06-15 10:12:00", action: "Contract Initialized", details: "Signed 3-year multi-campus enterprise agreement.", performedBy: "Super Admin" },
    ],
  },
  {
    id: "sub-02",
    institutionId: "col-lnct-02",
    institutionName: "Lakshmi Narain College of Technology (LNCT)",
    collegeCode: "LNCT",
    planName: "Enterprise Multi-Campus",
    planId: "plan-enterprise",
    startDate: "2024-08-10",
    renewalDate: "2027-08-10",
    amountINR: 480000,
    billingCycle: "Annual",
    status: "Active",
    autoRenew: true,
    seatUtilization: { used: 2850, allocated: 5000, facultyUsed: 142, facultyAllocated: 300 },
    storageQuotaGb: 250,
    storageUsedGb: 82.1,
    gstin: "23AABCL4512Q1ZX",
    taxType: "Intra-State (CGST + SGST)",
  },
  {
    id: "sub-03",
    institutionId: "col-medicaps-03",
    institutionName: "Medi-Caps University",
    collegeCode: "MEDICAPS",
    planName: "Standard Academic",
    planId: "plan-standard",
    startDate: "2025-01-18",
    renewalDate: "2027-01-18",
    amountINR: 240000,
    billingCycle: "Annual",
    status: "Active",
    autoRenew: true,
    seatUtilization: { used: 1980, allocated: 2500, facultyUsed: 110, facultyAllocated: 150 },
    storageQuotaGb: 100,
    storageUsedGb: 41.6,
    gstin: "23AABCM9981K1ZW",
    taxType: "Intra-State (CGST + SGST)",
  },
  {
    id: "sub-04",
    institutionId: "col-uit-04",
    institutionName: "UIT-RGPV",
    collegeCode: "UITRGPV",
    planName: "Institutional Pilot",
    planId: "plan-pilot",
    startDate: "2026-09-01",
    renewalDate: "2026-12-01",
    amountINR: 0,
    billingCycle: "90-Day Pilot",
    status: "Trial",
    autoRenew: false,
    seatUtilization: { used: 1250, allocated: 1500, facultyUsed: 65, facultyAllocated: 100 },
    storageQuotaGb: 50,
    storageUsedGb: 12.0,
    gstin: "23AABCT7712L1ZQ",
    taxType: "Intra-State (CGST + SGST)",
  },
  {
    id: "sub-05",
    institutionId: "col-rewa-05",
    institutionName: "Rewa Engineering College (REC)",
    collegeCode: "REC",
    planName: "Standard Academic",
    planId: "plan-standard",
    startDate: "2025-12-15",
    renewalDate: "2026-12-15",
    amountINR: 240000,
    billingCycle: "Annual",
    status: "Active",
    autoRenew: true,
    seatUtilization: { used: 1120, allocated: 2500, facultyUsed: 58, facultyAllocated: 150 },
    storageQuotaGb: 100,
    storageUsedGb: 18.2,
    gstin: "23AABCR8814K1ZV",
    taxType: "Intra-State (CGST + SGST)",
  },
  {
    id: "sub-06",
    institutionId: "col-jec-06",
    institutionName: "Jabalpur Engineering College (JEC)",
    collegeCode: "JEC",
    planName: "Standard Academic",
    planId: "plan-standard",
    startDate: "2024-11-01",
    renewalDate: "2026-11-01",
    amountINR: 240000,
    billingCycle: "Annual",
    status: "Suspended",
    autoRenew: false,
    seatUtilization: { used: 1600, allocated: 2500, facultyUsed: 75, facultyAllocated: 150 },
    storageQuotaGb: 100,
    storageUsedGb: 35.0,
    gstin: "23AABCJ1102P1ZM",
    taxType: "Intra-State (CGST + SGST)",
    notes: "Suspended per administrative compliance order.",
  },
  {
    id: "sub-07",
    institutionId: "col-sati-07",
    institutionName: "Samrat Ashok Technological Institute (SATI)",
    collegeCode: "SATI",
    planName: "Standard Academic",
    planId: "plan-standard",
    startDate: "2024-07-01",
    renewalDate: "2026-07-01",
    amountINR: 240000,
    billingCycle: "Annual",
    status: "Expired",
    autoRenew: false,
    seatUtilization: { used: 1850, allocated: 2500, facultyUsed: 80, facultyAllocated: 150 },
    storageQuotaGb: 100,
    storageUsedGb: 49.0,
    gstin: "23AABCS5590D1Z9",
    taxType: "Intra-State (CGST + SGST)",
    notes: "Contract expired July 2026; renewal pending approval.",
  },
];

const INITIAL_INVOICES: InvoiceRecord[] = [
  {
    id: "inv-2025-001",
    invoiceNumber: "COLAB-2025-089",
    institutionId: "col-sistec-01",
    institutionName: "Sagar Institute of Science and Technology (SISTec)",
    collegeCode: "SISTEC",
    invoiceDate: "2025-06-15",
    dueDate: "2025-07-15",
    taxableAmountINR: 406780,
    taxRate: 18,
    taxType: "CGST_SGST",
    cgstAmountINR: 36610,
    sgstAmountINR: 36610,
    igstAmountINR: 0,
    gstAmountINR: 73220,
    totalAmountINR: 480000,
    paidAmountINR: 480000,
    paymentStatus: "Paid",
    gstin: "23AAGCS2341P1ZB",
    billingPeriodStart: "2025-06-15",
    billingPeriodEnd: "2026-06-14",
    paymentRef: "TXN_RZP_99182371",
    paymentMethod: "Razorpay (Corporate NetBanking)",
    paymentDate: "2025-06-16",
    notes: "Annual license payment verified.",
  },
  {
    id: "inv-2025-002",
    invoiceNumber: "COLAB-2025-104",
    institutionId: "col-lnct-02",
    institutionName: "Lakshmi Narain College of Technology (LNCT)",
    collegeCode: "LNCT",
    invoiceDate: "2025-08-10",
    dueDate: "2025-09-10",
    taxableAmountINR: 406780,
    taxRate: 18,
    taxType: "CGST_SGST",
    cgstAmountINR: 36610,
    sgstAmountINR: 36610,
    igstAmountINR: 0,
    gstAmountINR: 73220,
    totalAmountINR: 480000,
    paidAmountINR: 480000,
    paymentStatus: "Paid",
    gstin: "23AABCL4512Q1ZX",
    billingPeriodStart: "2025-08-10",
    billingPeriodEnd: "2026-08-09",
    paymentRef: "NEFT_HDFC_202508119",
    paymentMethod: "Bank Transfer (NEFT)",
    paymentDate: "2025-08-11",
    notes: "Offline NEFT confirmed via bank reconciliation.",
  },
  {
    id: "inv-2026-001",
    invoiceNumber: "COLAB-2026-012",
    institutionId: "col-medicaps-03",
    institutionName: "Medi-Caps University",
    collegeCode: "MEDICAPS",
    invoiceDate: "2026-01-18",
    dueDate: "2026-02-18",
    taxableAmountINR: 203390,
    taxRate: 18,
    taxType: "CGST_SGST",
    cgstAmountINR: 18305,
    sgstAmountINR: 18305,
    igstAmountINR: 0,
    gstAmountINR: 36610,
    totalAmountINR: 240000,
    paidAmountINR: 240000,
    paymentStatus: "Paid",
    gstin: "23AABCM9981K1ZW",
    billingPeriodStart: "2026-01-18",
    billingPeriodEnd: "2027-01-17",
    paymentRef: "TXN_RZP_11209384",
    paymentMethod: "Razorpay (UPI / NetBanking)",
    paymentDate: "2026-01-19",
  },
  {
    id: "inv-2026-002",
    invoiceNumber: "COLAB-2026-045",
    institutionId: "col-rewa-05",
    institutionName: "Rewa Engineering College (REC)",
    collegeCode: "REC",
    invoiceDate: "2026-11-15",
    dueDate: "2026-12-15",
    taxableAmountINR: 203390,
    taxRate: 18,
    taxType: "CGST_SGST",
    cgstAmountINR: 18305,
    sgstAmountINR: 18305,
    igstAmountINR: 0,
    gstAmountINR: 36610,
    totalAmountINR: 240000,
    paymentStatus: "Pending",
    gstin: "23AABCR8814K1ZV",
    billingPeriodStart: "2026-12-15",
    billingPeriodEnd: "2027-12-14",
    notes: "Renewal invoice dispatched to institutional principal.",
  },
  {
    id: "inv-2026-003",
    invoiceNumber: "COLAB-2026-068",
    institutionId: "col-sati-07",
    institutionName: "Samrat Ashok Technological Institute (SATI)",
    collegeCode: "SATI",
    invoiceDate: "2026-06-15",
    dueDate: "2026-07-15",
    taxableAmountINR: 203390,
    taxRate: 18,
    taxType: "CGST_SGST",
    cgstAmountINR: 18305,
    sgstAmountINR: 18305,
    igstAmountINR: 0,
    gstAmountINR: 36610,
    totalAmountINR: 240000,
    paymentStatus: "Overdue",
    gstin: "23AABCS5590D1Z9",
    billingPeriodStart: "2026-07-01",
    billingPeriodEnd: "2027-06-30",
    notes: "Overdue notice sent. Follow-up with finance officer.",
  },
];

const INITIAL_PAYMENTS: PaymentTransactionRecord[] = [
  { id: "pay-01", transactionRef: "TXN_RZP_99182371", institutionName: "Sagar Institute of Science and Technology (SISTec)", gateway: "Razorpay", amountINR: 480000, paymentDate: "2025-06-16 11:24:10", status: "Success", gatewayOrderId: "order_M671H98KLL" },
  { id: "pay-02", transactionRef: "NEFT_HDFC_202508119", institutionName: "Lakshmi Narain College of Technology (LNCT)", gateway: "Bank Transfer (NEFT/RTGS)", amountINR: 480000, paymentDate: "2025-08-11 15:42:00", status: "Success", gatewayOrderId: "neft_manual_ver_88" },
  { id: "pay-03", transactionRef: "TXN_RZP_11209384", institutionName: "Medi-Caps University", gateway: "Razorpay", amountINR: 240000, paymentDate: "2026-01-19 14:10:02", status: "Success", gatewayOrderId: "order_N882K19JXX" },
];

// =============================================================================
// PLATFORM USERS & GOVERNANCE SEED (PRIVILEGED ACCESS MANAGEMENT)
// =============================================================================
export const STANDARD_PERMISSIONS_DEF = [
  {
    category: "Platform Configuration" as const,
    key: "modify_platform_settings",
    label: "Modify Platform Settings",
    description: "Update platform environment variables, system timeouts, security headers, and operational configurations.",
  },
  {
    category: "Platform Configuration" as const,
    key: "manage_integrations",
    label: "Manage Integrations & Connectors",
    description: "Configure third-party service gateways, webhooks, DigiLocker, Razorpay, and academic verification connectors.",
  },
  {
    category: "Platform Configuration" as const,
    key: "manage_feature_flags",
    label: "Manage Feature Flags",
    description: "Toggle experimental platform capabilities, AI evaluation engines, and gradual cohort rollouts.",
  },
  {
    category: "Billing & Commercial Operations" as const,
    key: "manage_subscription_plans",
    label: "Manage Subscription Plans",
    description: "Create, edit, toggle, or adjust pricing, quotas, and terms for institutional subscription tiers.",
  },
  {
    category: "Billing & Commercial Operations" as const,
    key: "authorize_contract_extensions",
    label: "Authorize Contract Extensions",
    description: "Grant custom contract extensions, pilot grace periods, and institutional billing exemptions.",
  },
  {
    category: "Billing & Commercial Operations" as const,
    key: "approve_refunds_billing_adjustments",
    label: "Approve Refunds & Billing Adjustments",
    description: "Authorize credit notes, tax invoice adjustments, offline reconciliations, and payment reversals.",
  },
  {
    category: "College Tenant Operations" as const,
    key: "provision_college_tenants",
    label: "Provision College Tenants",
    description: "Allocate tenant database partitions, institutional subdomains, and RLS schema isolation.",
  },
  {
    category: "College Tenant Operations" as const,
    key: "activate_deactivate_tenants",
    label: "Activate / Deactivate Tenants",
    description: "Transition institutional tenants between active operational states and scheduled maintenance.",
  },
  {
    category: "College Tenant Operations" as const,
    key: "suspend_reactivate_college_access",
    label: "Suspend / Reactivate College Access",
    description: "Enforce administrative suspension for compliance or non-payment, or restore full tenant access.",
  },
];

const INITIAL_ADMIN_USERS: PlatformAdminUserRecord[] = [
  {
    id: "usr-adm-01",
    name: "Dev Startup Admin",
    email: "admin@collabex.in",
    adminId: "ADM-001",
    platformRole: "Super Admin",
    status: "Active",
    mfaStatus: "Enforced & Active",
    createdAt: "2025-06-01 09:00:00",
    lastLogin: "2026-11-21 15:42:19",
    lastAuthTimestamp: "2026-11-21 15:42:19",
    ipAddress: "103.21.244.10",
    activeSessionsCount: 2,
    mfaDetails: {
      type: "FIDO2 / WebAuthn Hardware Key",
      keyModel: "YubiKey 5C NFC (Firmware 5.4.3)",
      keyId: "YK-982103",
      enrolledAt: "2025-06-02 10:15:00",
      backupCodesRemaining: 5,
      recoveryStatus: "Healthy",
    },
    permissions: STANDARD_PERMISSIONS_DEF.map((def, idx) => ({
      id: `perm-adm1-${idx}`,
      category: def.category,
      key: def.key,
      label: def.label,
      description: def.description,
      granted: true,
      grantedBy: "Aditi Trivedi (ADM-002)",
      grantedDate: "2025-06-05",
      reason: "Platform Founding Root Administrator",
      approvalRecord: "REQ-SEC-101 (Approved)",
    })),
    securityActivity: [
      { id: "act-101", timestamp: "2026-11-21 15:42:19", event: "FIDO2 WebAuthn Hardware Token Verified", ipAddress: "103.21.244.10", status: "Success", details: "Authenticator: YubiKey 5C NFC. Touch user-presence confirmed." },
      { id: "act-102", timestamp: "2026-11-21 14:10:05", event: "College Tenant Provisioned: UIT-RGPV", ipAddress: "103.21.244.10", status: "Success", details: "Allocated dedicated schema partition and verified RLS boundary." },
      { id: "act-103", timestamp: "2026-11-20 11:30:22", event: "Subscription Plan Updated: Standard Academic", ipAddress: "103.21.244.10", status: "Success", details: "Commercial plan parameters synchronized across billing ledger." },
      { id: "act-104", timestamp: "2026-11-18 09:12:44", event: "Hardware Key Attestation Refreshed", ipAddress: "103.21.244.10", status: "Success", details: "FIDO2 signature renewed without exceptions." },
    ],
    sensitiveSafeguards: { canPublishMasterData: true, canAuthorizeBilling: true, canManageTenants: true },
  },
  {
    id: "usr-adm-02",
    name: "Aditi Trivedi",
    email: "aditi.security@collabex.in",
    adminId: "ADM-002",
    platformRole: "Super Admin",
    status: "Active",
    mfaStatus: "Enforced & Active",
    createdAt: "2025-07-15 11:20:00",
    lastLogin: "2026-11-21 11:15:00",
    lastAuthTimestamp: "2026-11-21 11:15:00",
    ipAddress: "103.21.244.12",
    activeSessionsCount: 1,
    mfaDetails: {
      type: "FIDO2 / WebAuthn Hardware Key",
      keyModel: "Feitian BioPass FIDO2 (K27)",
      keyId: "FT-551029",
      enrolledAt: "2025-07-16 09:40:00",
      backupCodesRemaining: 6,
      recoveryStatus: "Healthy",
    },
    permissions: STANDARD_PERMISSIONS_DEF.map((def, idx) => {
      const isGranted = def.key !== "approve_refunds_billing_adjustments" && def.key !== "authorize_contract_extensions";
      return {
        id: `perm-adm2-${idx}`,
        category: def.category,
        key: def.key,
        label: def.label,
        description: def.description,
        granted: isGranted,
        grantedBy: isGranted ? "Dev Startup Admin (ADM-001)" : undefined,
        grantedDate: isGranted ? "2025-07-18" : undefined,
        reason: isGranted ? "Platform Security Governance & Audit Officer" : undefined,
        approvalRecord: isGranted ? "REQ-SEC-109 (Approved)" : undefined,
      };
    }),
    securityActivity: [
      { id: "act-201", timestamp: "2026-11-21 11:15:00", event: "Hardware FIDO2 Authentication Successful", ipAddress: "103.21.244.12", status: "Success", details: "Authenticator: Feitian BioPass FIDO2. Biometric presence confirmed." },
      { id: "act-202", timestamp: "2026-11-21 10:45:12", event: "Dual-Authorization Review: Approved Tenant Migration", ipAddress: "103.21.244.12", status: "Success", details: "Approved secondary signature for SISTec migration request REQ-SEC-399." },
      { id: "act-203", timestamp: "2026-11-19 16:20:30", event: "Audit Trail Signature Verification Completed", ipAddress: "103.21.244.12", status: "Success", details: "Cross-checked SHA-256 tamper-evident integrity hashes." },
    ],
    sensitiveSafeguards: { canPublishMasterData: true, canAuthorizeBilling: false, canManageTenants: true },
  },
  {
    id: "usr-adm-03",
    name: "Rohit Saxena",
    email: "rohit.support@collabex.in",
    adminId: "ADM-003",
    platformRole: "Super Admin",
    status: "Active",
    mfaStatus: "Grace Period",
    createdAt: "2025-09-01 14:00:00",
    lastLogin: "2026-11-21 14:02:44",
    lastAuthTimestamp: "2026-11-21 14:02:44",
    ipAddress: "157.34.120.8",
    activeSessionsCount: 1,
    mfaDetails: {
      type: "FIDO2 / WebAuthn Hardware Key",
      keyModel: "YubiKey 5 NFC (Grace Period: 18h Remaining)",
      keyId: "YK-PENDING-44",
      enrolledAt: "Pending Registration",
      backupCodesRemaining: 0,
      recoveryStatus: "Healthy",
    },
    permissions: STANDARD_PERMISSIONS_DEF.map((def, idx) => {
      const isGranted = def.category === "College Tenant Operations";
      return {
        id: `perm-adm3-${idx}`,
        category: def.category,
        key: def.key,
        label: def.label,
        description: def.description,
        granted: isGranted,
        grantedBy: isGranted ? "Dev Startup Admin (ADM-001)" : undefined,
        grantedDate: isGranted ? "2025-09-05" : undefined,
        reason: isGranted ? "Assigned College Tenant Onboarding Operations" : undefined,
        approvalRecord: isGranted ? "REQ-SEC-202 (Approved)" : undefined,
      };
    }),
    securityActivity: [
      { id: "act-301", timestamp: "2026-11-21 14:02:44", event: "Temporary Session Authenticated (Grace Period Active)", ipAddress: "157.34.120.8", status: "Warning", details: "Hardware token registration grace period active (18 hours remaining)." },
      { id: "act-302", timestamp: "2026-11-21 13:50:11", event: "Privileged Access Requested: Modify Platform Settings", ipAddress: "157.34.120.8", status: "Success", details: "Submitted REQ-SEC-402 for dual-approval queue." },
      { id: "act-303", timestamp: "2026-11-20 17:15:00", event: "Tenant Status Inspection: SISTec-Bhopal", ipAddress: "157.34.120.8", status: "Success", details: "Verified institution database schema health." },
    ],
    sensitiveSafeguards: { canPublishMasterData: false, canAuthorizeBilling: false, canManageTenants: true },
  },
  {
    id: "usr-adm-04",
    name: "Dr. Meenakshi Rao",
    email: "meenakshi.curator@collabex.in",
    adminId: "ADM-004",
    platformRole: "Super Admin",
    status: "Active",
    mfaStatus: "Enforced & Active",
    createdAt: "2025-10-10 16:30:00",
    lastLogin: "2026-11-20 18:30:12",
    lastAuthTimestamp: "2026-11-20 18:30:12",
    ipAddress: "103.21.244.15",
    activeSessionsCount: 1,
    mfaDetails: {
      type: "FIDO2 / WebAuthn Hardware Key",
      keyModel: "YubiKey Security Key NFC",
      keyId: "YK-882190",
      enrolledAt: "2025-10-12 11:00:00",
      backupCodesRemaining: 4,
      recoveryStatus: "Healthy",
    },
    permissions: STANDARD_PERMISSIONS_DEF.map((def, idx) => {
      const isGranted = def.key === "modify_platform_settings" || def.key === "manage_feature_flags";
      return {
        id: `perm-adm4-${idx}`,
        category: def.category,
        key: def.key,
        label: def.label,
        description: def.description,
        granted: isGranted,
        grantedBy: isGranted ? "Aditi Trivedi (ADM-002)" : undefined,
        grantedDate: isGranted ? "2025-10-15" : undefined,
        reason: isGranted ? "Platform Curriculum & Academic Evaluation Lead" : undefined,
        approvalRecord: isGranted ? "REQ-SEC-280 (Approved)" : undefined,
      };
    }),
    securityActivity: [
      { id: "act-401", timestamp: "2026-11-20 18:30:12", event: "Hardware FIDO2 Authentication Successful", ipAddress: "103.21.244.15", status: "Success", details: "Authenticator: YubiKey Security Key NFC. Touch confirmed." },
      { id: "act-402", timestamp: "2026-11-19 14:22:00", event: "Feature Flag Inspection: AI Evaluation v2", ipAddress: "103.21.244.15", status: "Success", details: "Reviewed feature toggle parameters." },
    ],
    sensitiveSafeguards: { canPublishMasterData: true, canAuthorizeBilling: false, canManageTenants: false },
  },
];

const INITIAL_SECURITY_APPROVALS: SecurityApprovalRequestRecord[] = [
  {
    id: "sec-req-01",
    requestId: "REQ-SEC-402",
    requesterId: "usr-adm-03",
    requesterName: "Rohit Saxena",
    requesterEmail: "rohit.support@collabex.in",
    permissionKey: "modify_platform_settings",
    permissionLabel: "Modify Platform Settings",
    category: "Platform Configuration",
    reason: "Required to configure scheduled maintenance window banner and database connection pool parameters during upcoming RGPV semester exams.",
    requestedAt: "2026-11-21 13:50:11",
    status: "Pending Dual Approval",
  },
];

const INITIAL_ROLES: RolePermissionRecord[] = [
  { roleId: "role-super-admin", roleName: "Super Admin", description: "Unrestricted platform-wide governance, tenant management, and emergency intervention.", userCount: 2, permissions: [
    { category: "Tenants", actions: ["View", "Create", "Edit", "Delete", "Publish", "Execute"] },
    { category: "Academic", actions: ["View", "Create", "Edit", "Delete", "Publish", "Execute"] },
    { category: "Billing", actions: ["View", "Create", "Edit", "Delete", "Execute"] },
    { category: "Configuration", actions: ["View", "Create", "Edit", "Delete", "Execute"] },
    { category: "Integrations", actions: ["View", "Create", "Edit", "Delete", "Execute"] },
    { category: "System", actions: ["View", "Create", "Edit", "Delete", "Execute"] },
    { category: "Security", actions: ["View", "Create", "Edit", "Delete", "Execute"] },
    { category: "Audit", actions: ["View", "Execute"] },
  ]},
  { roleId: "role-sec-officer", roleName: "Security Officer", description: "Security monitoring, audit log surveillance, and emergency break-glass governance.", userCount: 1, permissions: [
    { category: "Security", actions: ["View", "Edit", "Execute"] },
    { category: "Audit", actions: ["View", "Execute"] },
    { category: "Tenants", actions: ["View"] },
    { category: "System", actions: ["View"] },
  ]},
  { roleId: "role-support-eng", roleName: "Support Engineer", description: "Institution support, ticket triage, diagnostic logs, and onboarding assistance.", userCount: 1, permissions: [
    { category: "Tenants", actions: ["View"] },
    { category: "Academic", actions: ["View"] },
    { category: "System", actions: ["View"] },
  ]},
  { roleId: "role-academic-curator", roleName: "Academic Curator", description: "RGPV & AICTE syllabus authoring, rubric criteria refinement, and outcome mapping.", userCount: 1, permissions: [
    { category: "Academic", actions: ["View", "Create", "Edit", "Publish"] },
    { category: "Tenants", actions: ["View"] },
  ]},
];

// =============================================================================
// PLATFORM CONFIGURATION & INTEGRATIONS SEED
// =============================================================================
const INITIAL_MODULES: PlatformModuleRecord[] = [
  { key: "mod-tracks", name: "Capstone & Minor Project Tracks", description: "Phase-I and Phase-II project cycles, semester term bindings, and registration workflows.", category: "Academic Core", version: "v2.4.0", isEnabled: true, dependencies: [] },
  { key: "mod-rubrics", name: "Blended 60/40 Rubric Viva Scoring", description: "Synchronous viva defense scoring matrix with individual vs shared grade distribution.", category: "Evaluations", version: "v2.1.2", isEnabled: true, dependencies: ["mod-tracks"] },
  { key: "mod-nba-sar", name: "NBA Criterion 2 & 3 Attainment Engine", description: "Direct + Indirect 80/20 CO-PO attainment calculation and automated SAR documentation.", category: "Compliance", version: "v3.0.1", isEnabled: true, dependencies: ["mod-rubrics"] },
  { key: "mod-logbooks", name: "Friday Weekly Logbook Sweeper", description: "Enforces weekly engineering diaries, milestone check-ins, and guide sign-off queues.", category: "Academic Core", version: "v1.8.0", isEnabled: true, dependencies: ["mod-tracks"] },
  { key: "mod-git-sync", name: "VCS Git Repository Telemetry", description: "Tracks GitHub / GitLab commit frequency, branch hygiene, and engineering contributions.", category: "Integrations", version: "v1.2.0", isEnabled: true, dependencies: ["mod-tracks"] },
  { key: "mod-scim-directory", name: "Automated SCIM Directory Provisioning", description: "Syncs student enrollments and faculty rosters directly from institutional IdP.", category: "Integrations", version: "v1.0.4", isEnabled: true, dependencies: [] },
];

const INITIAL_FEATURE_FLAGS: FeatureFlagRecord[] = [
  { id: "ff-01", name: "AICTE 2024 CBCS Relative Rubric Mode", key: "ff_aicte_relative_rubrics", description: "Enables relative bell-curve percentile scaling for autonomous college tenants.", targetInstitutions: "Pilot Colleges Only", rolloutPercentage: 25, environment: "Production", isEnabled: true, lastUpdated: "2026-11-10" },
  { id: "ff-02", name: "Direct Digilocker Academic Credential Sync", key: "ff_digilocker_export", description: "Generates verifiable digital degree project credentials with cryptographic QR.", targetInstitutions: "Selected Enterprise", rolloutPercentage: 50, environment: "Production", isEnabled: true, lastUpdated: "2026-11-15" },
  { id: "ff-03", name: "Heuristic Guide-Student Auto-Matcher V2", key: "ff_guide_matcher_v2", description: "Multi-objective constraint solver balancing faculty quotas and research domains.", targetInstitutions: "All Institutions", rolloutPercentage: 100, environment: "Production", isEnabled: true, lastUpdated: "2026-11-01" },
  { id: "ff-04", name: "Realtime WebSocket Live Defense Grading", key: "ff_realtime_viva_socket", description: "Realtime synchronized grade compilation across multi-examiner viva panels.", targetInstitutions: "Internal Testing", rolloutPercentage: 0, environment: "Staging", isEnabled: false, lastUpdated: "2026-10-25" },
];

const INITIAL_PLATFORM_SERVICES: PlatformServiceRecord[] = [
  {
    id: "srv-email",
    name: "Transactional Email",
    serviceType: "email",
    provider: "AWS SES (ap-south-1)",
    purpose: "System notifications, onboarding invitations, and security token delivery",
    status: "Operational",
    lastHealthCheck: "2 minutes ago",
    latencyMs: 24,
    recentIncident: null,
    uptime30d: 99.99,
    supportsTest: true,
  },
  {
    id: "srv-payment",
    name: "Payment Gateway",
    serviceType: "payment",
    provider: "Razorpay Enterprise Gateway",
    purpose: "Institutional subscription billing, automated GST invoicing, and payment webhooks",
    status: "Operational",
    lastHealthCheck: "5 minutes ago",
    latencyMs: 78,
    recentIncident: null,
    uptime30d: 99.95,
    supportsTest: true,
  },
  {
    id: "srv-storage",
    name: "Central File Storage",
    serviceType: "storage",
    provider: "AWS S3 Cloud Vault (ap-south-1)",
    purpose: "Encrypted storage for student project documents, synopsis PDFs, and institutional dossiers",
    status: "Operational",
    lastHealthCheck: "1 minute ago",
    latencyMs: 19,
    recentIncident: null,
    uptime30d: 100.0,
    supportsTest: true,
  },
  {
    id: "srv-sms",
    name: "SMS Gateway",
    serviceType: "sms",
    provider: "Fast2SMS India (DLT Registered)",
    purpose: "Emergency campus broadcast alerts and critical security verification fallback",
    status: "Operational",
    lastHealthCheck: "15 minutes ago",
    latencyMs: 110,
    recentIncident: "Minor provider queue delay on Nov 14 (Resolved in 12m)",
    uptime30d: 99.85,
    supportsTest: true,
  },
];

const INITIAL_INTEGRATIONS: IntegrationConnectorRecord[] = [
  { id: "int-01", name: "Google Workspace Directory Sync", category: "Google Workspace", status: "Connected", provider: "Google Cloud Platform", healthLatencyMs: 42, lastSyncTimestamp: "2026-11-21 15:00:00", details: "OAuth 2.0 & Admin SDK Directory Sync for @sistec.ac.in, @lnct.ac.in", activeScopes: ["https://www.googleapis.com/auth/admin.directory.user.readonly", "email", "profile"] },
  { id: "int-02", name: "Microsoft 365 / Azure Active Directory", category: "Microsoft 365", status: "Connected", provider: "Microsoft Entra ID", healthLatencyMs: 68, lastSyncTimestamp: "2026-11-21 14:30:00", details: "Graph API SAML 2.0 SSO and SCIM Directory Provisioning", activeScopes: ["User.Read.All", "Directory.Read.All"] },
  { id: "int-03", name: "Amazon SES Transactional Email", category: "Email / SMTP", status: "Connected", provider: "AWS SES (ap-south-1)", healthLatencyMs: 18, lastSyncTimestamp: "2026-11-21 15:35:10", details: "DKIM, SPF & DMARC authenticated; 99.4% delivery rate past 30 days", activeScopes: ["ses:SendRawEmail", "ses:SendEmail"] },
  { id: "int-04", name: "Razorpay Enterprise Payment Gateway", category: "Payment Gateway", status: "Connected", provider: "Razorpay India", healthLatencyMs: 84, lastSyncTimestamp: "2026-11-21 15:40:00", details: "Handles institutional license renewals, GST invoices & UPI/NEFT reconciliation", activeScopes: ["payments:read", "invoices:write", "refunds:write"] },
  { id: "int-05", name: "Amazon S3 Vault Storage", category: "Cloud Storage", status: "Connected", provider: "AWS S3 Multi-Region", healthLatencyMs: 22, lastSyncTimestamp: "2026-11-21 15:42:00", details: "Stores encrypted project synopses, presentations, and final thesis PDFs with SHA-256 validation", activeScopes: ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"] },
  { id: "int-06", name: "SMS Gateway (Fast2SMS / DLT)", category: "SMS Gateway", status: "Connected", provider: "Fast2SMS India (DLT Registered)", healthLatencyMs: 110, lastSyncTimestamp: "2026-11-21 12:00:00", details: "Dispatches 24-hr OTP authentication codes to authorized deans and evaluators", activeScopes: ["dlt:send_otp"] },
];

// =============================================================================
// SYSTEM HEALTH & MONITORING SEED
// =============================================================================
const INITIAL_SERVICES: ServiceHealthRecord[] = [
  {
    serviceName: "Backend API",
    category: "Backend API",
    status: "Healthy",
    latencyMs: 16,
    uptime90d: 99.99,
    lastChecked: "Just now",
    details: "Core REST API gateway handling authenticated student and faculty portal endpoints.",
  },
  {
    serviceName: "Database",
    category: "Database",
    status: "Healthy",
    latencyMs: 2.4,
    uptime90d: 99.98,
    lastChecked: "Just now",
    details: "Primary relational database storing project repositories, teams, and academic schemas.",
  },
  {
    serviceName: "Authentication",
    category: "Authentication",
    status: "Healthy",
    latencyMs: 12,
    uptime90d: 100.0,
    lastChecked: "Just now",
    details: "Central identity provider, SAML SSO assertions, and token issuance service.",
  },
  {
    serviceName: "File Storage",
    category: "File Storage",
    status: "Not Configured",
    latencyMs: 0,
    uptime90d: 0,
    lastChecked: "Local disk fallback active",
    details: "Central secure object repository. Local disk fallback active; external S3 file vault not configured.",
  },
  {
    serviceName: "Background Workers",
    category: "Background Workers",
    status: "Not Configured",
    latencyMs: 0,
    uptime90d: 0,
    lastChecked: "In-process execution active",
    details: "In-process task execution active. Dedicated distributed worker cluster not configured.",
  },
  {
    serviceName: "Email Service",
    category: "Email Service",
    status: "Not Configured",
    latencyMs: 0,
    uptime90d: 0,
    lastChecked: "Console logger active",
    details: "Development mock logger active. Production transactional SMTP gateway not configured.",
  },
];

const INITIAL_ALERTS: PlatformAlertRecord[] = [];

const INITIAL_INCIDENTS_HISTORY: PlatformIncidentRecord[] = [
  {
    id: "inc-01",
    title: "Email Gateway Transient Rate Limit Delays",
    affectedService: "Email Service",
    startTime: "2026-11-08 14:10:00 IST",
    recoveryTime: "2026-11-08 14:22:00 IST",
    duration: "12 minutes",
    date: "Nov 08, 2026",
    impact: "Outbound project submission notifications queued temporarily during peak evaluation hour.",
    resolutionSummary: "Upstream dispatch throttle resolved; all queued notification emails delivered.",
    rootCause: "Transient gateway queue backlog.",
    status: "Resolved",
  },
  {
    id: "inc-02",
    title: "Scheduled Database Minor Maintenance Window",
    affectedService: "Database",
    startTime: "2026-10-28 02:00:00 IST",
    recoveryTime: "2026-10-28 02:18:00 IST",
    duration: "18 minutes",
    date: "Oct 28, 2026",
    impact: "Platform entered scheduled read-only maintenance mode. Zero capstone data loss.",
    resolutionSummary: "Database engine security patch applied successfully; all connections restored.",
    rootCause: "Scheduled multi-AZ database engine security patch application.",
    status: "Resolved",
  },
];

const INITIAL_BACKUP_STATUS: PlatformBackupStatusRecord = {
  lastBackupTime: "Today at 04:00 AM IST (2026-11-22 04:00:00)",
  backupStatus: "Healthy",
  backupSize: "42.8 GB",
  retentionPolicy: "30 daily snapshots + 12 monthly immutable archives",
  lastRestoreTestTime: "2026-11-15 03:30 AM IST (7 days ago)",
  restoreVerificationStatus: "Integrity Pass — 100% Data Parity Verified",
  restoreDrillFrequency: "Weekly automated sandbox restoration & checksum test",
  activeAlertsCount: 0,
};

const INITIAL_BACKGROUND_JOBS: BackgroundJobRecord[] = [
  { id: "job-zip-901", jobName: "NBA Criterion 2 & 3 Dossier ZIP Exporter", queue: "nba-exports", status: "Completed", targetTenant: "SISTEC (Dept CSE)", executionDurationMs: 3200, startedAt: "2026-11-21 14:30:10", retryCount: 0 },
  { id: "job-rls-scan-88", jobName: "Nightly Cross-Tenant RLS Boundary Scan", queue: "default", status: "Completed", targetTenant: "All Active Schemas", executionDurationMs: 1400, startedAt: "2026-11-21 02:00:00", retryCount: 0 },
  { id: "job-log-sweep-42", jobName: "Friday Logbook Weekly Deadline Enforcer", queue: "notifications", status: "Completed", targetTenant: "LNCT (Dept CSE)", executionDurationMs: 820, startedAt: "2026-11-20 23:59:59", retryCount: 0 },
  { id: "job-backup-snap-01", jobName: "Automated PostgreSQL Snapshot & Integrity Verification", queue: "default", status: "Completed", targetTenant: "Primary RDS Cluster", executionDurationMs: 8400, startedAt: "2026-11-21 04:00:00", retryCount: 0 },
  { id: "job-rpt-sched-19", jobName: "Monthly Platform Institutional Utilization Digest", queue: "scheduled-reports", status: "Completed", targetTenant: "All Institutional Principals", executionDurationMs: 4100, startedAt: "2026-11-01 06:00:00", retryCount: 0 },
];

// =============================================================================
// SUPPORT TICKETS & ANNOUNCEMENTS SEED
// =============================================================================
const INITIAL_SUPPORT_TICKETS: SupportTicketRecord[] = [
  {
    id: "tkt-01",
    ticketNumber: "TCK-2026-049",
    subject: "HOD unable to sign off CSE guide allotments for Semester 6",
    institutionName: "Sagar Institute of Science and Technology (SISTec)",
    collegeCode: "SISTEC",
    requesterName: "Dr. Anupam Shukla",
    requesterEmail: "hod.cse@sistec.ac.in",
    requesterDesignation: "HOD - Computer Science & Engineering",
    category: "Academic Configuration",
    priority: "High",
    status: "In Progress",
    assignedAgent: "Rohit Saxena",
    createdAt: "2026-11-21 10:15:00",
    updatedAt: "2026-11-21 14:10:00",
    slaBreachRemainingHours: 4,
    description: "When clicking Bulk Endorse on the allotment queue, the system returned a validation error mentioning unmapped faculty guide quotas in Department CSE.",
    attachments: [
      { name: "allotment_validation_error.png", size: "340 KB" },
    ],
    conversation: [
      { id: "c1", sender: "Dr. Anupam Shukla", isStaff: false, timestamp: "2026-11-21 10:15:00", message: "When clicking Bulk Endorse on the allotment queue, the system returned a validation error mentioning unmapped faculty guide quotas." },
      { id: "c2", sender: "Rohit Saxena", isStaff: true, timestamp: "2026-11-21 11:20:00", message: "Hello Dr. Shukla, checking the department faculty roster table. Two appointed guides had guide quota set to 0 in your college configuration." },
      { id: "c3", sender: "Rohit Saxena", isStaff: true, timestamp: "2026-11-21 11:22:00", message: "Internal Note: Investigated database record in college quota table. Guide quota constraint verified. Waiting on college admin confirmation.", isInternalNote: true },
      { id: "c4", sender: "Rohit Saxena", isStaff: true, timestamp: "2026-11-21 14:10:00", message: "The faculty quotas have been refreshed in your college admin panel. Please verify and confirm if you can submit the endorsement now." },
    ],
  },
  {
    id: "tkt-02",
    ticketNumber: "TCK-2026-050",
    subject: "Request for additional 50 GB project file storage quota",
    institutionName: "Lakshmi Narain College of Technology (LNCT)",
    collegeCode: "LNCT",
    requesterName: "Prof. Rajesh K. Sharma",
    requesterEmail: "project.coordinator@lnct.ac.in",
    requesterDesignation: "Project Coordinator (Dept CSE)",
    category: "Storage Quota",
    priority: "Normal",
    status: "Open",
    assignedAgent: "Unassigned",
    createdAt: "2026-11-21 15:30:00",
    updatedAt: "2026-11-21 15:30:00",
    slaBreachRemainingHours: 24,
    description: "Our B.Tech Major Project final submissions include high-resolution simulation videos and datasets. We are nearing our 100 GB cap and request an extension to 150 GB under our institutional license.",
    attachments: [
      { name: "department_storage_usage.pdf", size: "1.2 MB" },
    ],
    conversation: [
      { id: "c1", sender: "Prof. Rajesh K. Sharma", isStaff: false, timestamp: "2026-11-21 15:30:00", message: "Our B.Tech Major Project final submissions include high-resolution simulation videos and datasets. We are nearing our 100 GB cap and request an extension to 150 GB under our institutional license." },
      { id: "c2", sender: "Dev Startup Admin", isStaff: true, timestamp: "2026-11-21 15:35:00", message: "Internal Note: LNCT is currently on the Standard Academic plan. Storage quota increases require updating the subscription plan or applying a custom add-on in the Subscriptions & Billing module.", isInternalNote: true },
    ],
  },
  {
    id: "tkt-03",
    ticketNumber: "TCK-2026-048",
    subject: "Faculty authentication failing after college domain change",
    institutionName: "Medi-Caps University",
    collegeCode: "MEDICAPS",
    requesterName: "Pawan Patidar",
    requesterEmail: "admin@medicaps.ac.in",
    requesterDesignation: "Systems & Network Administrator",
    category: "Authentication & SSO",
    priority: "Urgent",
    status: "In Progress",
    assignedAgent: "Aditi Trivedi",
    createdAt: "2026-11-20 16:40:00",
    updatedAt: "2026-11-21 09:15:00",
    slaBreachRemainingHours: 2,
    description: "We recently migrated our primary institutional domain. Faculty attempting to log in are receiving an invalid SAML recipient assertion error.",
    attachments: [
      { name: "saml_assertion_error.txt", size: "12 KB" },
    ],
    conversation: [
      { id: "c1", sender: "Pawan Patidar", isStaff: false, timestamp: "2026-11-20 16:40:00", message: "We recently migrated our primary institutional domain. Faculty attempting to log in are receiving an invalid SAML recipient assertion error." },
      { id: "c2", sender: "Aditi Trivedi", isStaff: true, timestamp: "2026-11-20 17:10:00", message: "We have reviewed the SAML callback URL registered for your college tenant. The Entity ID still references your previous domain." },
      { id: "c3", sender: "Aditi Trivedi", isStaff: true, timestamp: "2026-11-20 17:15:00", message: "Internal Note: Verified domain DNS TXT record. Updated tenant assertion endpoint in college settings.", isInternalNote: true },
      { id: "c4", sender: "Aditi Trivedi", isStaff: true, timestamp: "2026-11-21 09:15:00", message: "We have refreshed the assertion consumer service (ACS) endpoint. Please run a test login from an incognito window." },
    ],
  },
  {
    id: "tkt-04",
    ticketNumber: "TCK-2026-045",
    subject: "Discrepancy in GST Tax Invoice #INV-2026-004 billing address",
    institutionName: "Sagar Institute of Science and Technology (SISTec)",
    collegeCode: "SISTEC",
    requesterName: "Finance Officer",
    requesterEmail: "accounts@sistec.ac.in",
    requesterDesignation: "Accounts & Finance Lead",
    category: "Billing & Invoices",
    priority: "Low",
    status: "Resolved",
    assignedAgent: "Dev Startup Admin",
    createdAt: "2026-11-18 11:00:00",
    updatedAt: "2026-11-19 14:00:00",
    slaBreachRemainingHours: 0,
    description: "Invoice INV-2026-004 contains our registered Gandhi Nagar campus address instead of our billing headquarters GSTIN address.",
    resolutionNotes: "Updated institutional billing profile in tenant schema. Cancelled INV-2026-004 and reissued amended GST Tax Invoice INV-2026-004-R1 with correct headquarters GSTIN.",
    resolvedAt: "2026-11-19 14:00:00",
    resolvedBy: "Dev Startup Admin",
    conversation: [
      { id: "c1", sender: "Finance Officer", isStaff: false, timestamp: "2026-11-18 11:00:00", message: "Invoice INV-2026-004 contains our registered Gandhi Nagar campus address instead of our billing headquarters GSTIN address." },
      { id: "c2", sender: "Dev Startup Admin", isStaff: true, timestamp: "2026-11-19 14:00:00", message: "We have updated the billing address profile in your college subscription and reissued the amended Tax Invoice INV-2026-004-R1. The revised PDF is now available in your portal." },
    ],
  },
  {
    id: "tkt-05",
    ticketNumber: "TCK-2026-042",
    subject: "SSO domain verification for @medicaps.ac.in completed",
    institutionName: "Medi-Caps University",
    requesterName: "Pawan Patidar",
    requesterEmail: "it.admin@medicaps.ac.in",
    category: "Authentication & SSO",
    priority: "Low",
    status: "Resolved",
    assignedAgent: "Rohit Saxena",
    createdAt: "2026-11-19 09:30:00",
    updatedAt: "2026-11-20 16:00:00",
    slaBreachRemainingHours: 0,
    description: "We added the TXT record to our DNS server. Please verify and enable strict SSO for our faculty accounts.",
    resolutionNotes: "Domain DNS verification passed. Configured SAML 2.0 Identity Provider federation and enabled strict SSO login enforcement.",
    resolvedAt: "2026-11-20 16:00:00",
    resolvedBy: "Rohit Saxena",
    conversation: [
      { id: "c1", sender: "Pawan Patidar", isStaff: false, timestamp: "2026-11-19 09:30:00", message: "We added the TXT record to our DNS server. Please verify and enable strict SSO." },
      { id: "c2", sender: "Rohit Saxena", isStaff: true, timestamp: "2026-11-20 15:45:00", message: "DNS query verified. Strict SSO enabled for medicaps.ac.in." },
    ],
  },
];

const INITIAL_ANNOUNCEMENTS: AnnouncementRecord[] = [
  {
    id: "ann-01",
    title: "Upcoming Infrastructure Maintenance",
    category: "Maintenance",
    priority: "High",
    shortDescription: "30-minute scheduled maintenance window on Sunday, Nov 22, 2026 at 02:00 AM IST.",
    fullMessage: "The central Colabex platform will undergo automated multi-AZ database engine minor upgrades on Sunday, Nov 22, 2026 at 02:00 AM IST. During this 30-minute window, the API may briefly respond with HTTP 503 Maintenance Mode. No student capstone project data will be affected.",
    targetAudience: "All Colleges",
    deliveryChannels: ["In-App Notification"],
    sendInApp: true,
    sendEmail: false,
    publishDate: "2026-11-22 09:00:00",
    expiryDate: "2026-11-30 23:59:59",
    status: "Published",
    requiresAcknowledgement: false,
    readCount: 148,
    deliveredCount: 152,
    authorName: "Dev Startup Admin (ADM-001)",
    createdAt: "2026-11-22 08:30:00",
    auditLog: [
      {
        id: "audit-01",
        action: "Created",
        performedBy: "Dev Startup Admin (ADM-001)",
        timestamp: "2026-11-22 08:30:00",
        details: "Platform maintenance announcement draft prepared.",
      },
      {
        id: "audit-02",
        action: "Published",
        performedBy: "Dev Startup Admin (ADM-001)",
        timestamp: "2026-11-22 09:00:00",
        details: "Published platform-wide to all affiliated engineering colleges.",
      },
    ],
  },
  {
    id: "ann-02",
    title: "Platform Version 2.4 Release",
    category: "Feature Update",
    priority: "Normal",
    shortDescription: "Synchronized grading rubrics for internal and external project viva panels.",
    fullMessage: "Colabex V2.4 introduces synchronized grading rubrics for internal and external examiners. College administrators and department HODs can now customize outcome-based assessment criteria directly within the department settings.",
    targetAudience: "Active Colleges",
    deliveryChannels: ["In-App Notification"],
    sendInApp: true,
    sendEmail: false,
    publishDate: "2026-11-20 14:00:00",
    expiryDate: "2026-12-18 23:59:59",
    status: "Published",
    requiresAcknowledgement: false,
    readCount: 284,
    deliveredCount: 310,
    authorName: "Aditi Trivedi (ADM-002)",
    createdAt: "2026-11-20 13:45:00",
    auditLog: [
      {
        id: "audit-03",
        action: "Published",
        performedBy: "Aditi Trivedi (ADM-002)",
        timestamp: "2026-11-20 14:00:00",
        details: "Broadcasted feature update to active colleges.",
      },
    ],
  },
  {
    id: "ann-03",
    title: "Security Advisory",
    category: "Security Advisory",
    priority: "Urgent",
    shortDescription: "Mandatory FIDO2 hardware passkey enforcement for platform administrators.",
    fullMessage: "In compliance with platform Privileged Access Management guidelines, all platform Super Administrators must register a hardware FIDO2 / WebAuthn security key. SMS and Email OTP fallbacks have been deprecated.",
    targetAudience: "All Colleges",
    deliveryChannels: ["In-App Notification"],
    sendInApp: true,
    sendEmail: false,
    publishDate: "2026-11-18 09:30:00",
    expiryDate: "2027-01-15 23:59:59",
    status: "Published",
    requiresAcknowledgement: false,
    readCount: 92,
    deliveredCount: 110,
    authorName: "Aditi Trivedi (ADM-002)",
    createdAt: "2026-11-18 09:00:00",
    auditLog: [
      {
        id: "audit-04",
        action: "Published",
        performedBy: "Aditi Trivedi (ADM-002)",
        timestamp: "2026-11-18 09:30:00",
        details: "Urgent security advisory issued to all platform college administrators.",
      },
    ],
  },
  {
    id: "ann-04",
    title: "Payment Gateway Maintenance",
    category: "Maintenance",
    priority: "Low",
    shortDescription: "Batch reconciliation for institutional licenses on Nov 25.",
    fullMessage: "Razorpay webhook reconciliation for institutional annual licenses will run in batch mode between 01:00 AM and 01:30 AM IST on Nov 25.",
    targetAudience: "Selected Colleges",
    targetCollegeIds: ["SISTEC", "LNCT"],
    deliveryChannels: ["In-App Notification"],
    sendInApp: true,
    sendEmail: false,
    publishDate: "2026-11-25 01:00:00",
    scheduledFor: "2026-11-25 01:00:00",
    expiryDate: "2026-11-26 23:59:59",
    status: "Scheduled",
    requiresAcknowledgement: false,
    readCount: 0,
    deliveredCount: 0,
    authorName: "Dev Startup Admin (ADM-001)",
    createdAt: "2026-11-21 16:00:00",
    auditLog: [
      {
        id: "audit-05",
        action: "Scheduled",
        performedBy: "Dev Startup Admin (ADM-001)",
        timestamp: "2026-11-21 16:00:00",
        details: "Scheduled for automated publication on 2026-11-25 01:00:00.",
      },
    ],
  },
  {
    id: "ann-05",
    title: "Winter Semester Project Archival Policy",
    category: "General Notice",
    priority: "Normal",
    shortDescription: "Draft guidance for institutional coordinators regarding capstone report archival.",
    fullMessage: "Draft guidance for institutional coordinators regarding capstone report archival and repository retention policies. This draft outlines storage lifecycles and PDF compliance requirements.",
    targetAudience: "All Colleges",
    deliveryChannels: ["In-App Notification"],
    sendInApp: true,
    sendEmail: false,
    publishDate: "—",
    expiryDate: "2027-02-28 23:59:59",
    status: "Draft",
    requiresAcknowledgement: false,
    readCount: 0,
    deliveredCount: 0,
    authorName: "Dev Startup Admin (ADM-001)",
    createdAt: "2026-11-21 17:30:00",
    auditLog: [
      {
        id: "audit-06",
        action: "Created",
        performedBy: "Dev Startup Admin (ADM-001)",
        timestamp: "2026-11-21 17:30:00",
        details: "Draft announcement saved.",
      },
    ],
  },
];

const INITIAL_SESSIONS: ActiveSessionRecord[] = [
  { id: "sess-01", accountEmail: "admin@collabex.in", accountName: "Dev Startup Admin", role: "Super Admin", device: "Desktop (Windows 11)", browser: "Chrome 131.0", ipAddress: "103.21.244.10", location: "Bhopal, Madhya Pradesh", loginTime: "2026-11-21 15:42:19", lastActiveTime: "Just now", status: "Active" },
  { id: "sess-02", accountEmail: "aditi.security@collabex.in", accountName: "Aditi Trivedi", role: "Security Officer", device: "MacBook Pro (macOS 15)", browser: "Safari 18.1", ipAddress: "103.21.244.12", location: "Bhopal, Madhya Pradesh", loginTime: "2026-11-21 11:15:00", lastActiveTime: "25 mins ago", status: "Active" },
  { id: "sess-03", accountEmail: "rohit.support@collabex.in", accountName: "Rohit Saxena", role: "Support Engineer", device: "Laptop (Ubuntu 24.04)", browser: "Firefox 132.0", ipAddress: "157.34.120.8", location: "Indore, Madhya Pradesh", loginTime: "2026-11-21 14:02:44", lastActiveTime: "10 mins ago", status: "Active" },
];

const INITIAL_SECURITY_INCIDENTS: SecurityIncidentRecord[] = [
  {
    id: "sec-01",
    incidentType: "Repeated Failed Login Lockout",
    severity: "Warning",
    affectedAccount: "principal@ipsacademy.org",
    institution: "IPS Academy",
    detectedAt: "2026-11-20 22:14:00",
    status: "Rate-Limited (15m)",
    investigator: "Aditi Trivedi",
    details: "5 consecutive incorrect password submissions from 117.200.14.8 triggered automated 15-minute IP rate-limit lockout.",
  },
  {
    id: "sec-02",
    incidentType: "Unauthorized Cross-Tenant API Probe",
    severity: "Critical",
    affectedAccount: "Unauthenticated Client",
    institution: "Platform Gateway",
    detectedAt: "2026-11-19 16:22:00",
    status: "Blocked",
    investigator: "Platform Bot",
    details: "Direct attempt to query internal tenant schema partition rejected by SuperAdmin authorization filter.",
  },
  {
    id: "sec-03",
    incidentType: "Privileged MFA Policy Enforced",
    severity: "Informational",
    affectedAccount: "aditi.security@collabex.in",
    institution: "Platform Security",
    detectedAt: "2026-11-18 09:12:00",
    status: "Enforced",
    investigator: "Aditi Trivedi",
    details: "FIDO2 WebAuthn hardware security key enrolled and enforced for administrative governance access.",
  },
];

const INITIAL_AUDIT_LOGS: PlatformAuditLogItem[] = [
  {
    id: "aud-901",
    timestamp: "2026-11-21 15:42:19",
    user: "Dev Startup Admin",
    userEmail: "admin@collabex.in",
    action: "Admin Login Success",
    category: "Authentication",
    affectedResource: "Session: sess-01 (Chrome 131 / Win11)",
    result: "Success",
    ipAddress: "103.21.244.10",
    details: "FIDO2 hardware security key WebAuthn verified. Privileged administrative session established.",
    metadataJson: JSON.stringify({ mfaMethod: "FIDO2_Hardware", browser: "Chrome 131.0", clientOs: "Windows 11", sessionExpiry: "8 hours" }, null, 2),
  },
  {
    id: "aud-902",
    timestamp: "2026-11-21 14:30:10",
    user: "Dev Startup Admin",
    userEmail: "admin@collabex.in",
    action: "College Application Approved",
    category: "College Management",
    affectedResource: "IES College of Technology (IES-BPL)",
    result: "Success",
    ipAddress: "103.21.244.10",
    details: "Approved institutional onboarding application APP-2026-003 and queued tenant provisioning.",
    metadataJson: JSON.stringify({ applicationId: "APP-2026-003", institution: "IES College of Technology", approvedBy: "admin@collabex.in" }, null, 2),
    changes: {
      before: "Review Status: Under Review",
      after: "Review Status: Approved (Provisioning Queued)",
    },
  },
  {
    id: "aud-903",
    timestamp: "2026-11-21 12:14:00",
    user: "Aditi Trivedi",
    userEmail: "aditi.security@collabex.in",
    action: "Platform Policy Updated",
    category: "Platform Management",
    affectedResource: "Tenant Governance Policy",
    result: "Success",
    ipAddress: "103.21.244.12",
    details: "Updated tenant security policy.",
    metadataJson: JSON.stringify({ version: "v2.4" }, null, 2),
  },
  {
    id: "aud-904",
    timestamp: "2026-11-20 22:14:00",
    user: "Unknown Client",
    userEmail: "principal@ipsacademy.org",
    action: "Failed Login Attempts Rate-Limited",
    category: "Authentication",
    affectedResource: "Account: principal@ipsacademy.org",
    result: "Failure",
    ipAddress: "117.200.14.8",
    details: "5 consecutive incorrect password submissions triggered automated 15-minute IP rate-limit lockout.",
    metadataJson: JSON.stringify({ failedAttempts: 5, actionTaken: "15min_temporary_ip_lockout", endpoint: "/api/auth/login" }, null, 2),
  },
  {
    id: "aud-905",
    timestamp: "2026-11-20 18:00:00",
    user: "Dev Startup Admin",
    userEmail: "admin@collabex.in",
    action: "Subscription Plan Renewed",
    category: "Subscription Management",
    affectedResource: "SISTec Bhopal (INV-2026-001)",
    result: "Success",
    ipAddress: "103.21.244.10",
    details: "Annual Enterprise Academic subscription renewed for academic year 2026–2027.",
    metadataJson: JSON.stringify({ invoiceNumber: "INV-2026-001", amountInr: 566400, planTier: "Enterprise Academic", validity: "2026-07-01 to 2027-06-30" }, null, 2),
    changes: {
      before: "Subscription Expiry: 2026-06-30",
      after: "Subscription Expiry: 2027-06-30",
    },
  },
  {
    id: "aud-906",
    timestamp: "2026-11-20 14:00:00",
    user: "Dev Startup Admin",
    userEmail: "admin@collabex.in",
    action: "Platform Announcement Published",
    category: "Platform Management",
    affectedResource: "Announcement: ann-01 (Upcoming Maintenance)",
    result: "Success",
    ipAddress: "103.21.244.10",
    details: 'Broadcasted maintenance notice: "Upcoming Infrastructure Maintenance" across all affiliated colleges.',
    metadataJson: JSON.stringify({ announcementId: "ann-01", targetAudience: "All Colleges", priority: "High" }, null, 2),
  },
  {
    id: "aud-907",
    timestamp: "2026-11-19 16:30:00",
    user: "Dev Startup Admin",
    userEmail: "admin@collabex.in",
    action: "College Tenant Activated",
    category: "College Management",
    affectedResource: "University Institute of Technology, RGPV",
    result: "Success",
    ipAddress: "103.21.244.10",
    details: "Tenant partition tenant_uit_rgpv_prod activated with 1,800 licensed student capacity.",
    metadataJson: JSON.stringify({ tenantCode: "UIT-RGPV", studentSeats: 1800, databasePartition: "Dedicated Schema" }, null, 2),
    changes: {
      before: "Tenant Status: Provisioning",
      after: "Tenant Status: Active",
    },
  },
  {
    id: "aud-908",
    timestamp: "2026-11-18 09:12:00",
    user: "Aditi Trivedi",
    userEmail: "aditi.security@collabex.in",
    action: "Super Admin Security Settings Updated",
    category: "Administrator Management",
    affectedResource: "Security Policy: Privileged MFA Enforcement",
    result: "Success",
    ipAddress: "103.21.244.12",
    details: "Enrolled FIDO2 WebAuthn hardware key (Feitian BioPass K27) for privileged administrator authentication.",
    metadataJson: JSON.stringify({ tokenType: "FIDO2_WebAuthn", tokenId: "FT-551029", backupCodesRemaining: 6 }, null, 2),
  },
  {
    id: "aud-909",
    timestamp: "2026-11-17 11:45:00",
    user: "Dev Startup Admin",
    userEmail: "admin@collabex.in",
    action: "Admin Session Revoked",
    category: "Authentication",
    affectedResource: "Session: sess-old-09 (Rohit Saxena)",
    result: "Success",
    ipAddress: "103.21.244.10",
    details: "Revoked stale workstation session for Support Engineer Rohit Saxena after 48h idle period.",
    metadataJson: JSON.stringify({ revokedSessionId: "sess-old-09", revokedUser: "rohit.support@collabex.in" }, null, 2),
  },
];

// =============================================================================
// PLATFORM STORE CONTEXT & PROVIDER
// =============================================================================
interface PlatformDataContextType {
  // Institutions
  colleges: CollegeTenantRecord[];
  onboardingRequests: OnboardingRequestRecord[];
  onboardCollege: (collegeData: Partial<CollegeTenantRecord>) => Promise<CollegeTenantRecord>;
  updateCollege: (id: string, updates: Partial<CollegeTenantRecord>) => void;
  approveOnboardingRequest: (requestId: string) => void;
  provisionOnboardingRequest: (requestId: string) => Promise<void>;
  rejectOnboardingRequest: (requestId: string, reason?: string) => void;
  approveApplication: (requestId: string) => Promise<void>;
  rejectApplication: (requestId: string, reason: string, explanation?: string) => void;
  retryProvisioning: (requestId: string) => Promise<void>;
  updateApplicationChecklist: (requestId: string, checklist: Partial<ApplicationChecklist>) => void;
  updateApplicationChecklistItem: (
    requestId: string,
    key: "institutionIdentity" | "universityAffiliation" | "applicantAuthorization" | "supportingDocuments",
    status: "Pending" | "Verified" | "Needs Correction",
    notes?: string
  ) => void;
  updateApplicationDocumentStatus: (
    requestId: string,
    docId: string,
    status: "Verified" | "Pending Review" | "Missing" | "Needs Correction",
    remarks?: string
  ) => void;
  sendCollegeAdminRecoveryOtp: (collegeId: string) => void;
  suspendCollege: (collegeId: string, reason: string, actor?: string) => Promise<void>;
  reactivateCollege: (collegeId: string, reason: string, actor?: string) => Promise<void>;
  resendAdminInvitation: (collegeId: string) => Promise<void>;
  replacePrimaryAdmin: (
    collegeId: string,
    data: { fullName: string; email: string; designation: string; phone: string; reason: string }
  ) => Promise<void>;
  // Academic
  universities: UniversityRecord[];
  regulations: AcademicRegulationRecord[];
  programs: AcademicProgramRecord[];
  branches: AcademicBranchRecord[];
  departments: DepartmentMasterRecord[];
  subjects: SubjectMasterRecord[];
  academicYears: AcademicYearRecord[];
  examSchemes: EvaluationSchemeRecord[];
  nbaPos: NbaProgramOutcomeRecord[];
  unSdgs: UnSdgRecord[];
  templateVersions: TemplateVersionRecord[];
  addUniversity: (univ: Partial<UniversityRecord>) => void;
  addRegulation: (reg: Partial<AcademicRegulationRecord>) => void;
  addProgram: (prog: Partial<AcademicProgramRecord>) => void;
  addBranch: (branch: Partial<AcademicBranchRecord>) => void;
  addSubject: (subj: Partial<SubjectMasterRecord>) => void;
  toggleBranchStatus: (id: string) => void;
  linkCollegeToUniversity: (collegeId: string, universityNameOrCode: string) => void;
  publishTemplate: (templateId: string) => void;
  toggleSdg: (num: number) => void;
  updateRegulation: (id: string, updates: Partial<AcademicRegulationRecord>) => void;
  updateProgram: (id: string, updates: Partial<AcademicProgramRecord>) => void;
  updateBranch: (id: string, updates: Partial<AcademicBranchRecord>) => void;
  updateNbaPo: (code: string, updates: Partial<NbaProgramOutcomeRecord>) => void;
  updateUnSdg: (num: number, updates: Partial<UnSdgRecord>) => void;
  // Subscriptions & Plans
  plans: SubscriptionPlanRecord[];
  collegeSubscriptions: CollegeSubscriptionRecord[];
  invoices: InvoiceRecord[];
  payments: PaymentTransactionRecord[];
  refunds: RefundRecord[];
  discountCoupons: DiscountCouponRecord[];
  updateCollegePlan: (subscriptionId: string, newPlanName: string, extendDays: number) => void;
  createSubscriptionPlan: (plan: Omit<SubscriptionPlanRecord, "id">) => void;
  updateSubscriptionPlan: (id: string, updates: Partial<SubscriptionPlanRecord>) => void;
  deleteSubscriptionPlan: (id: string) => { success: boolean; message: string };
  togglePlanStatus: (id: string) => void;
  updateCollegeSubscription: (id: string, updates: Partial<CollegeSubscriptionRecord>) => void;
  changeSubscriptionPlan: (subscriptionId: string, newPlanId: string, newBillingCycle?: string) => void;
  extendSubscriptionValidity: (subscriptionId: string, days: number, newRenewalDate?: string) => void;
  renewSubscription: (subscriptionId: string, durationMonths?: number) => void;
  convertTrialToPaid: (subscriptionId: string, newPlanId: string, billingCycle?: string) => void;
  toggleSubscriptionStatus: (subscriptionId: string, status: "Active" | "Suspended" | "Cancelled") => void;
  cancelSubscription: (subscriptionId: string, reason?: string) => void;
  createInvoice: (inv: Omit<InvoiceRecord, "id" | "invoiceNumber">) => InvoiceRecord;
  recordInvoicePayment: (invoiceId: string, paymentData: { amount: number; paymentRef: string; paymentMethod: string; paymentDate: string; notes?: string }) => void;
  updateInvoiceStatus: (invoiceId: string, status: InvoiceRecord["paymentStatus"]) => void;
  // Users & Roles (PAM Architecture)
  adminUsers: PlatformAdminUserRecord[];
  roles: RolePermissionRecord[];
  securityApprovals: SecurityApprovalRequestRecord[];
  inviteAdminUser: (email: string, name: string, role?: string) => Promise<void>;
  updateAdminUser: (id: string, updates: Partial<PlatformAdminUserRecord>) => Promise<void>;
  revokeAdminUser: (id: string) => void;
  revokeAdminSessions: (id: string) => Promise<void>;
  initiateMfaRecovery: (id: string) => void;
  toggleAdminPermission: (adminId: string, permissionKey: string, granted: boolean, reason?: string, grantedBy?: string) => void;
  requestSecurityApproval: (adminId: string, permissionKey: string, reason: string) => void;
  reviewSecurityApproval: (requestId: string, decision: "Approved" | "Rejected", reviewerAdminId: string, notes?: string) => void;
  // Config & Integrations
  modules: PlatformModuleRecord[];
  featureFlags: FeatureFlagRecord[];
  toggleModule: (key: string) => void;
  toggleFeatureFlag: (id: string) => void;
  integrations: IntegrationConnectorRecord[];
  testIntegration: (id: string) => Promise<{ latency: number; status: string }>;
  // System Health
  healthDetails: HealthDetailsDto | null;
  refreshHealthDetails: () => Promise<void>;
  securitySummary: PlatformSecuritySummaryDto | null;
  isLoadingPlatformData: boolean;
  services: ServiceHealthRecord[];
  alerts: PlatformAlertRecord[];
  incidents: PlatformIncidentRecord[];
  backupStatus: PlatformBackupStatusRecord;
  backgroundJobs: BackgroundJobRecord[];
  retryBackgroundJob: (id: string) => void;
  // Support & Announcements
  tickets: SupportTicketRecord[];
  platformServices: PlatformServiceRecord[];
  testPlatformService: (id: string) => Promise<{ latency: number; status: string }>;
  announcements: AnnouncementRecord[];
  addAnnouncement: (ann: Partial<AnnouncementRecord>) => Promise<boolean>;
  updateAnnouncement: (id: string, updates: Partial<AnnouncementRecord>) => Promise<boolean>;
  deleteAnnouncement: (id: string) => Promise<void>;
  publishAnnouncementNow: (id: string) => Promise<void>;
  withdrawAnnouncement: (id: string, reason?: string) => Promise<void>;
  archiveAnnouncement: (id: string, reason?: string) => Promise<void>;
  createSupportTicket: (data: { collegeId?: string; institutionName?: string; subject: string; description: string; category?: string; priority?: string }) => Promise<void>;
  replySupportTicket: (ticketId: string, message: string, isInternal?: boolean) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: SupportTicketRecord["status"], resolutionNotes?: string) => Promise<void>;
  updateTicketPriority: (ticketId: string, priority: SupportTicketRecord["priority"]) => Promise<void>;
  assignSupportTicket: (ticketId: string, agentName: string) => Promise<void>;
  resolveSupportTicket: (ticketId: string, resolutionNotes: string) => Promise<void>;
  closeSupportTicket: (ticketId: string) => Promise<void>;
  getTicketsForCollege: (collegeCode: string) => SupportTicketRecord[];
  // Security
  activeSessions: ActiveSessionRecord[];
  terminateSession: (sessionId: string) => void;
  securityIncidents: SecurityIncidentRecord[];
  auditLogs: PlatformAuditLogItem[];
  addAuditLog: (entry: Omit<PlatformAuditLogItem, "id" | "timestamp">) => void;
  failedLoginAttemptsCount: number;
  // Stats
  getPlatformStats: () => {
    totalColleges: number;
    activeColleges: number;
    totalStudents: number;
    totalFaculty: number;
    totalPlatformUsers: number;
    activeProjects: number;
    monthlyRecurringRevenue: number;
    pendingOnboardingRequests: number;
  };
}

const PlatformDataContext = createContext<PlatformDataContextType | null>(null);

export const PlatformDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colleges, setColleges] = useState<CollegeTenantRecord[]>([]);
  const [onboardingRequests, setOnboardingRequests] = useState<OnboardingRequestRecord[]>([]);
  const [universities, setUniversities] = useState<UniversityRecord[]>(INITIAL_UNIVERSITIES);
  const [regulations, setRegulations] = useState<AcademicRegulationRecord[]>(INITIAL_REGULATIONS);
  const [programs, setPrograms] = useState<AcademicProgramRecord[]>(INITIAL_PROGRAMS);
  const [branches, setBranches] = useState<AcademicBranchRecord[]>(INITIAL_BRANCHES);
  const [departments] = useState<DepartmentMasterRecord[]>(INITIAL_DEPARTMENTS);
  const [subjects, setSubjects] = useState<SubjectMasterRecord[]>(INITIAL_SUBJECTS);
  const [academicYears] = useState<AcademicYearRecord[]>(INITIAL_ACADEMIC_YEARS);
  const [examSchemes] = useState<EvaluationSchemeRecord[]>(INITIAL_EXAM_SCHEMES);
  const [nbaPos, setNbaPos] = useState<NbaProgramOutcomeRecord[]>(INITIAL_NBA_POS);
  const [unSdgs, setUnSdgs] = useState<UnSdgRecord[]>(INITIAL_UN_SDGS);
  const [templateVersions, setTemplateVersions] = useState<TemplateVersionRecord[]>(INITIAL_TEMPLATE_VERSIONS);
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>(INITIAL_PLANS);
  const [collegeSubscriptions, setCollegeSubscriptions] = useState<CollegeSubscriptionRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [payments] = useState<PaymentTransactionRecord[]>([]);
  const [refunds] = useState<RefundRecord[]>([]);
  const [discountCoupons] = useState<DiscountCouponRecord[]>([
    { id: "c-rgpv10", code: "RGPV-PILOT-2026", discountType: "Percentage", discountValue: 100, validFrom: "2026-01-01", validUntil: "2027-12-31", usageCount: 4, maxUsageLimit: 50, applicablePlans: ["Pilot License"], status: "Active" },
  ]);
  const [adminUsers, setAdminUsers] = useState<PlatformAdminUserRecord[]>([]);
  const [securityApprovals, setSecurityApprovals] = useState<SecurityApprovalRequestRecord[]>(INITIAL_SECURITY_APPROVALS);
  const [roles] = useState<RolePermissionRecord[]>(INITIAL_ROLES);
  const [modules, setModules] = useState<PlatformModuleRecord[]>(INITIAL_MODULES);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagRecord[]>(INITIAL_FEATURE_FLAGS);
  const [integrations] = useState<IntegrationConnectorRecord[]>(INITIAL_INTEGRATIONS);
  const [healthDetails, setHealthDetails] = useState<HealthDetailsDto | null>(null);
  const [securitySummary, setSecuritySummary] = useState<PlatformSecuritySummaryDto | null>(null);
  const [isLoadingPlatformData, setIsLoadingPlatformData] = useState<boolean>(true);
  const [services, setServices] = useState<ServiceHealthRecord[]>([]);
  const [alerts, setAlerts] = useState<PlatformAlertRecord[]>([]);
  const [incidents, setIncidents] = useState<PlatformIncidentRecord[]>([]);
  const [backupStatus, setBackupStatus] = useState<PlatformBackupStatusRecord>(INITIAL_BACKUP_STATUS);
  const [backgroundJobs, setBackgroundJobs] = useState<BackgroundJobRecord[]>([]);
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [platformServices, setPlatformServices] = useState<PlatformServiceRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSessionRecord[]>([]);
  const [securityIncidents, setSecurityIncidents] = useState<SecurityIncidentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<PlatformAuditLogItem[]>([]);

  const addAuditLog = (entry: any) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const formattedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const newLog: PlatformAuditLogItem = {
      id: `aud-${Date.now().toString().slice(-4)}`,
      timestamp: formattedDate,
      user: entry.user || entry.actor || "Dev Startup Admin",
      userEmail: entry.userEmail || "admin@collabex.in",
      action: entry.action || "PLATFORM_EVENT",
      category: entry.category || "Platform Management",
      affectedResource: entry.affectedResource || "Platform Resource",
      result: entry.result || (entry.status as any) || "Success",
      ipAddress: entry.ipAddress || "127.0.0.1",
      details: entry.details || "",
      metadataJson: entry.metadataJson || "{}",
      changes: entry.changes,
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    const currentUser = getUserProfile();
    if (currentUser?.role === "SuperAdmin") {
      platformApi.createAuditLog({
        action: newLog.action,
        targetEntity: newLog.affectedResource,
        metadataJson: newLog.metadataJson || "{}",
        ipAddress: newLog.ipAddress,
      }).catch(() => {});
    }
  };

  const failedLoginAttemptsCount = securitySummary?.failedLoginsLast24h ?? 0;

  const mapAnnouncementDto = (a: PlatformAnnouncementDto): AnnouncementRecord => ({
    id: a.id,
    title: a.title,
    category: (a.category as AnnouncementCategory) || "Maintenance",
    priority: (a.priority as AnnouncementPriority) || "Normal",
    shortDescription: a.shortDescription,
    fullMessage: a.fullMessage,
    targetAudience: (a.targetAudience as AnnouncementAudience) || "All Colleges",
    targetCollegeIds: a.targetCollegeIds || [],
    publishDate: a.publishDateUtc ? a.publishDateUtc.replace("T", " ").slice(0, 19) : "—",
    status: (a.status as AnnouncementRecord["status"]) || "Draft",
    readCount: 0,
    authorName: a.createdByName || a.createdByEmail || "Super Admin",
    createdAt: a.createdAtUtc ? a.createdAtUtc.replace("T", " ").slice(0, 19) : "",
    updatedAt: a.updatedAtUtc ? a.updatedAtUtc.replace("T", " ").slice(0, 19) : undefined,
    withdrawnAt: a.withdrawnAtUtc ? a.withdrawnAtUtc.replace("T", " ").slice(0, 19) : undefined,
  });

  const mapTicketDto = (t: SupportTicketDto): SupportTicketRecord => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    institutionName: t.institutionName,
    collegeCode: "",
    subject: t.subject,
    description: t.description,
    category: (t.category as SupportTicketRecord["category"]) || "Technical Issues",
    priority: (t.priority as SupportTicketRecord["priority"]) || "Medium",
    status: (t.status as SupportTicketRecord["status"]) || "Open",
    requesterName: t.reportedByName || t.reportedByEmail,
    requesterEmail: t.reportedByEmail,
    assignedAgent: t.assignedToName || "Unassigned",
    createdAt: t.createdAtUtc ? t.createdAtUtc.replace("T", " ").slice(0, 19) : "",
    updatedAt: t.updatedAtUtc ? t.updatedAtUtc.replace("T", " ").slice(0, 19) : (t.createdAtUtc ? t.createdAtUtc.replace("T", " ").slice(0, 19) : ""),
    resolvedAt: t.resolvedAtUtc ? t.resolvedAtUtc.replace("T", " ").slice(0, 19) : undefined,
    resolutionNotes: t.resolutionNotes || undefined,
    conversation: (t.messages || []).map((m) => ({
      id: m.id,
      sender: m.senderName || m.senderEmail,
      isStaff: m.senderRole === "SuperAdmin",
      timestamp: m.sentAtUtc ? m.sentAtUtc.replace("T", " ").slice(0, 19) : "",
      message: m.message,
      isInternalNote: m.isInternalNote,
    })),
  });

  const mapAuditLogDto = (log: any): PlatformAuditLogItem => {
    let parsed: Record<string, any> = {};
    try {
      if (log.metadataJson) parsed = JSON.parse(log.metadataJson);
    } catch {
      parsed = {};
    }
    const validCategories = ["Authentication", "Administrator Management", "College Management", "Platform Management", "Subscription Management"];
    const cat = validCategories.includes(parsed.category) ? parsed.category : "Platform Management";
    const res = parsed.result === "Failure" ? "Failure" : "Success";
    return {
      id: log.id,
      timestamp: log.occurredAtUtc ? log.occurredAtUtc.replace("T", " ").slice(0, 19) : new Date().toISOString().replace("T", " ").slice(0, 19),
      user: parsed.actorName || log.actorEmail?.split("@")[0] || "Super Admin",
      userEmail: log.actorEmail || "system@collabex.in",
      action: log.action || "PLATFORM_EVENT",
      category: cat,
      affectedResource: log.targetEntity || "Platform Resource",
      result: res,
      ipAddress: log.ipAddress || "127.0.0.1",
      details: parsed.details || `${log.action} on ${log.targetEntity}`,
      metadataJson: log.metadataJson || "{}",
    };
  };

  const applyHealthDetails = useCallback((health: HealthDetailsDto) => {
    setHealthDetails(health);
    const normalizeStatus = (s?: string): ServiceHealthRecord["status"] => {
      if (s === "Healthy") return "Healthy";
      if (s === "Degraded") return "Degraded";
      if (s === "Unavailable") return "Down";
      return "Unknown";
    };
    setServices([
      {
        serviceName: "Backend API",
        category: "Backend API",
        endpointOrInstance: "/api/health",
        status: health.status === "Unavailable" ? "Degraded" : "Healthy",
        latencyMs: 0,
        uptime90d: 100,
        lastChecked: health.timestampUtc,
        details: `${health.environment} • v${health.version} • Uptime ${Math.floor((health.uptimeSeconds || 0) / 60)}m`,
      },
      {
        serviceName: "PostgreSQL Database",
        category: "Database",
        endpointOrInstance: health.database?.provider || "PostgreSQL",
        status: normalizeStatus(health.database?.status),
        latencyMs: health.database?.latencyMs ?? 0,
        uptime90d: health.database?.status === "Healthy" ? 100 : 0,
        lastChecked: health.timestampUtc,
        details: health.database?.details || "PostgreSQL connectivity probe",
      },
      {
        serviceName: "Redis Cache",
        category: "Cache",
        endpointOrInstance: health.redis?.engine || "Redis",
        status: normalizeStatus(health.redis?.status),
        latencyMs: health.redis?.latencyMs ?? 0,
        uptime90d: health.redis?.status === "Healthy" ? 100 : 0,
        lastChecked: health.timestampUtc,
        details: health.redis?.details || "Redis PING probe",
      },
      {
        serviceName: "Authentication",
        category: "Authentication",
        endpointOrInstance: "JWT + Session Store",
        status: health.database?.status === "Unavailable" ? "Degraded" : "Healthy",
        latencyMs: health.database?.latencyMs ?? 0,
        uptime90d: 100,
        lastChecked: health.timestampUtc,
        details: `${health.telemetry?.activeSessionsCount ?? 0} active session(s)`,
      },
      {
        serviceName: "File Vault Storage",
        category: "File Storage",
        endpointOrInstance: health.storage?.provider || "Application Storage",
        status: normalizeStatus(health.storage?.status),
        latencyMs: 0,
        uptime90d: health.storage?.status === "Healthy" ? 100 : 0,
        lastChecked: health.timestampUtc,
        details: health.storage?.details || "Disk availability probe",
      },
      {
        serviceName: "Email Delivery Service",
        category: "Email Service",
        endpointOrInstance: health.email?.provider || "Email",
        status: normalizeStatus(health.email?.status),
        latencyMs: 0,
        uptime90d: health.email?.status === "Healthy" ? 100 : 0,
        lastChecked: health.timestampUtc,
        details: health.email?.details || "Email provider configuration",
      },
    ]);
  }, []);

  const refreshHealthDetails = useCallback(async () => {
    try {
      const health = await platformApi.getHealthDetails();
      applyHealthDetails(health);
    } catch {
      // Keep last known health state if unreachable
    }
  }, [applyHealthDetails]);

  // Sync with real backend API if available on mount (SuperAdmin only)
  useEffect(() => {
    async function loadBackendData() {
      let user = getUserProfile();
      if (!user) {
        try {
          const sess = await authApi.session();
          if (sess.authenticated && sess.user) {
            user = sess.user;
          }
        } catch {
          return;
        }
      }
      if (!user || user.role !== "SuperAdmin") {
        return;
      }

      try {
        const backendTenants = await platformApi.getTenants();
        if (Array.isArray(backendTenants)) {
          setColleges(
            backendTenants.map((bt) => ({
              id: bt.id,
              name: bt.name,
              shortName: bt.name.split(" ")[0] || bt.name,
              code: bt.tenantCode,
              collegeType: bt.collegeType || "Engineering College",
              university: bt.affiliatingUniversity || "RGPV",
              tenantId: bt.id,
              domain: bt.ssoDomain,
              subscriptionPlan: (bt.licenseTier as any) || "Standard",
              totalStudents: bt.studentCount || 0,
              totalFaculty: bt.facultyCount || 0,
              departmentsCount: bt.departmentCount || 0,
              activeProjectsCount: bt.activeProjectsCount || 0,
              status: bt.isActive ? "Active" : "Suspended",
              registrationDate: bt.createdAtUtc ? bt.createdAtUtc.split("T")[0] : new Date().toISOString().split("T")[0],
              renewalDate: bt.subscriptionExpiresAtUtc?.split("T")[0] || "",
              databaseAllocation: "RLS Enforced",
              storageQuotaGb: bt.storageQuotaGb || 50,
              storageUsedGb: 0,
              region: "ap-south-1",
              isolationStatus: "RLS Enforced",
              tenantHealth: bt.isActive ? "Healthy" : "Degraded",
              principalName: bt.principalName || "",
              principalEmail: bt.principalEmail || "",
              principalIsActive: bt.principalIsActive ?? null,
              principalIsActivated: bt.principalIsActivated ?? null,
              principalIsEmailVerified: bt.principalIsEmailVerified ?? null,
              principalHasPendingInvitation: bt.principalHasPendingInvitation ?? null,
              principalLastLoginAtUtc: bt.principalLastLoginAtUtc ?? null,
              contactPhone: "",
              address: bt.campusAddress || "Institutional Campus",
              city: bt.city || "",
              state: bt.state || "",
              country: bt.country || "",
              pinCode: "",
              affiliationNumber: "",
              establishmentYear: new Date().getFullYear(),
              website: `https://${bt.ssoDomain}`,
              enabledModules: ["Project Tracks", "Rubric Evaluation"],
              strictSsoEnforced: bt.enforceStrictSso,
              maxStudentSeats: bt.maxStudentSeats,
              lastActivity: bt.lastActivityAtUtc || undefined,
              provisioningHistory: [
                { stage: "Provisioning", timestamp: bt.createdAtUtc || new Date().toISOString(), status: "Completed", details: `Provisioned with tenant UUID ${bt.id}.` },
              ],
            }))
          );
        }
        // Load real Platform Administrators from backend
        try {
          const backendAdmins = await platformApi.getAdministrators();
          if (Array.isArray(backendAdmins)) {
            setAdminUsers(
              backendAdmins.map((a) => ({
                id: a.id,
                name: a.fullName,
                email: a.email,
                adminId: a.adminId,
                platformRole: (a.platformRole as any) || "Super Admin",
                status: (a.status as any) || "Active",
                mfaStatus: (a.mfaStatus as any) || "Enrollment Required",
                createdAt: a.createdAtUtc ? a.createdAtUtc.slice(0, 19).replace("T", " ") : "",
                lastLogin: a.lastLoginAtUtc ? a.lastLoginAtUtc.slice(0, 19).replace("T", " ") : "Never",
                lastAuthTimestamp: a.lastLoginAtUtc ? a.lastLoginAtUtc.slice(0, 19).replace("T", " ") : "Never",
                ipAddress: "—",
                activeSessionsCount: a.activeSessionsCount ?? 0,
                mfaDetails: {
                  type: "FIDO2 / WebAuthn Hardware Key",
                  keyModel: a.mfaEnabled ? "Configured" : "Enrollment Required",
                  keyId: a.mfaEnabled ? "TOTP_ACTIVE" : "PENDING_REGISTRATION",
                  enrolledAt: a.mfaEnabled ? "Enrolled" : "Pending Setup",
                  backupCodesRemaining: 0,
                  recoveryStatus: "Healthy",
                },
                permissions: STANDARD_PERMISSIONS_DEF.map((def, idx) => ({
                  id: `perm-${a.id}-${idx}`,
                  category: def.category,
                  key: def.key,
                  label: def.label,
                  description: def.description,
                  granted: true,
                })),
                securityActivity: [],
                sensitiveSafeguards: { canPublishMasterData: true, canAuthorizeBilling: true, canManageTenants: true },
              }))
            );
          }
        } catch {
          // Ignore if non-SuperAdmin or unavailable
        }
        // Load live audit logs
        try {
          const backendAuditLogs = await platformApi.getAuditLogs(200);
          if (Array.isArray(backendAuditLogs)) {
            setAuditLogs(backendAuditLogs.map(mapAuditLogDto));
          }
        } catch {
          // Keep empty on error
        }

        // Load live active sessions
        try {
          const backendSessions = await platformApi.getSessions();
          if (Array.isArray(backendSessions)) {
            setActiveSessions(
              backendSessions.map((s) => ({
                id: s.id,
                accountName: s.accountName || s.accountEmail?.split("@")[0] || "Platform User",
                accountEmail: s.accountEmail || "",
                role: s.role || "SuperAdmin",
                device: s.device || "Desktop Workstation",
                browser: s.browser || "Browser",
                ipAddress: s.ipAddress || "127.0.0.1",
                location: "Verified Session",
                loginTime: s.loginTimeUtc ? s.loginTimeUtc.replace("T", " ").slice(0, 19) : "—",
                lastActiveTime: s.lastActiveTimeUtc ? s.lastActiveTimeUtc.replace("T", " ").slice(0, 19) : "—",
                status: "Active" as const,
              }))
            );
          }
        } catch {
          // Keep empty on error
        }

        // Load live system health, security summary, announcements, and support tickets
        await Promise.all([
          platformApi.getHealthDetails().then(applyHealthDetails).catch(() => {}),
          platformApi.getSecuritySummary().then((summary) => {
            setSecuritySummary(summary);
            setSecurityIncidents(
              (summary.recentSecurityEvents || []).map((ev) => ({
                id: ev.id,
                incidentType: ev.action,
                severity: ev.action.includes("Failed") || ev.action.includes("Suspended") ? "High" : "Informational",
                affectedAccount: ev.actorEmail || ev.targetEntity,
                institution: "Platform",
                detectedAt: ev.occurredAtUtc ? ev.occurredAtUtc.replace("T", " ").slice(0, 19) : "",
                status: ev.action.includes("Revoked") ? "Enforced" : "Logged",
                investigator: "System",
                details: ev.targetEntity,
              }))
            );
          }).catch(() => {}),
          platformApi.getAnnouncements().then((items) => setAnnouncements(items.map(mapAnnouncementDto))).catch(() => {}),
          platformApi.getTickets().then((items) => setTickets(items.map(mapTicketDto))).catch(() => {}),
        ]);
      } catch {
        // Backend not reachable
      } finally {
        setIsLoadingPlatformData(false);
      }
    }
    loadBackendData();
  }, [applyHealthDetails]);

  const onboardCollege = async (data: Partial<CollegeTenantRecord>): Promise<CollegeTenantRecord> => {
    const code = (data.code || "NEW").toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    const domain = (data.domain || "college.ac.in").toLowerCase().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
    const newCollege: CollegeTenantRecord = {
      id: `col-${code.toLowerCase()}-${Date.now().toString().slice(-4)}`,
      name: data.name || "New Engineering College",
      shortName: data.shortName || code,
      code,
      university: data.university || "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
      tenantId: `tenant_${code.toLowerCase()}_prod`,
      domain,
      subscriptionPlan: data.subscriptionPlan || "Standard",
      totalStudents: data.totalStudents || 1500,
      totalFaculty: data.totalFaculty || 75,
      departmentsCount: data.departmentsCount || 4,
      status: "Active",
      registrationDate: new Date().toISOString().split("T")[0],
      renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      databaseAllocation: "Dedicated Schema (RLS Enforced)",
      storageQuotaGb: data.storageQuotaGb || 50,
      storageUsedGb: 0.1,
      region: "AWS ap-south-1 (Mumbai)",
      isolationStatus: "RLS Enforced",
      tenantHealth: "Healthy",
      principalName: data.principalName || "College Principal",
      principalEmail: data.principalEmail || `principal@${domain}`,
      contactPhone: data.contactPhone || "+91 755 000 0000",
      address: data.address || "Campus Address",
      city: data.city || "Bhopal",
      state: data.state || "Madhya Pradesh",
      pinCode: data.pinCode || "462001",
      affiliationNumber: data.affiliationNumber || `RGPV/AFF/${code}/2026`,
      establishmentYear: data.establishmentYear || 2010,
      website: data.website || `https://${domain}`,
      enabledModules: data.enabledModules || ["Project Tracks", "Rubric Evaluation", "NBA Attainment (SAR)"],
      strictSsoEnforced: data.strictSsoEnforced ?? true,
      provisioningHistory: [
        { stage: "Schema Creation", timestamp: new Date().toISOString(), status: "Completed", details: `PostgreSQL 17 schema tenant_${code.toLowerCase()}_prod created.` },
        { stage: "S3 Storage Allocation", timestamp: new Date().toISOString(), status: "Completed", details: `Allocated ${data.storageQuotaGb || 50} GB storage vault.` },
        { stage: "Admin Account Setup", timestamp: new Date().toISOString(), status: "Completed", details: `Invitation & activation OTP dispatched to ${data.principalEmail || `principal@${domain}`}.` },
      ],
    };

    let finalCollege = newCollege;
    setColleges((prev) => {
      const existingIdx = prev.findIndex(
        (c) =>
          (data.id && c.id === data.id) ||
          c.code.toUpperCase() === code ||
          c.name.toLowerCase() === (data.name || "").toLowerCase()
      );
      if (existingIdx !== -1) {
        finalCollege = {
          ...prev[existingIdx],
          ...newCollege,
          id: prev[existingIdx].id,
          status: "Active",
        };
        const updated = [...prev];
        updated[existingIdx] = finalCollege;
        return updated;
      }
      return [newCollege, ...prev];
    });

    // Also update or add to active subscriptions
    setCollegeSubscriptions((prev) => {
      const existingIdx = prev.findIndex((s) => s.collegeCode === finalCollege.code || s.institutionId === finalCollege.id);
      const subItem = {
        id: `sub-${finalCollege.id}`,
        institutionId: finalCollege.id,
        institutionName: finalCollege.name,
        collegeCode: finalCollege.code,
        planName: `${finalCollege.subscriptionPlan} Academic`,
        startDate: finalCollege.registrationDate,
        renewalDate: finalCollege.renewalDate,
        amountINR: finalCollege.subscriptionPlan === "Enterprise" ? 480000 : finalCollege.subscriptionPlan === "Pilot" ? 0 : 240000,
        billingCycle: finalCollege.subscriptionPlan === "Pilot" ? ("90-Day Pilot" as const) : ("Annual" as const),
        status: finalCollege.subscriptionPlan === "Pilot" ? ("Trial" as const) : ("Active" as const),
        autoRenew: true,
        seatUtilization: { used: finalCollege.totalStudents, allocated: finalCollege.totalStudents + 500 },
      };
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], ...subItem, id: updated[existingIdx].id };
        return updated;
      }
      return [subItem, ...prev];
    });

    // Persist to backend API
    const res = await platformApi.createTenant({
      name: newCollege.name,
      tenantCode: data.code?.trim() ? newCollege.code : undefined,
      ssoDomain: data.domain?.trim() ? newCollege.domain : undefined,
      licenseTier: newCollege.subscriptionPlan,
      maxStudentSeats: newCollege.totalStudents,
      storageQuotaGb: newCollege.storageQuotaGb,
      enforceStrictSso: newCollege.strictSsoEnforced,
      principalName: newCollege.principalName,
      principalEmail: newCollege.principalEmail,
      collegeType: data.collegeType,
      affiliatingUniversity: newCollege.university,
      country: data.country,
      state: newCollege.state,
      city: newCollege.city,
      campusAddress: data.address,
    });

    const createdDto = res.tenant;
    const syncedCollege: CollegeTenantRecord = {
      ...newCollege,
      id: createdDto.id,
      tenantId: createdDto.id,
      code: createdDto.tenantCode,
      name: createdDto.name,
      domain: createdDto.ssoDomain,
      collegeType: createdDto.collegeType || data.collegeType,
      university: createdDto.affiliatingUniversity || newCollege.university,
      country: createdDto.country || data.country,
      state: createdDto.state || newCollege.state,
      city: createdDto.city || newCollege.city,
      address: createdDto.campusAddress || newCollege.address,
      status: createdDto.isActive ? "Active" : "Suspended",
      totalStudents: createdDto.studentCount || 0,
      totalFaculty: createdDto.facultyCount || 0,
      departmentsCount: createdDto.departmentCount || 0,
      activeProjectsCount: createdDto.activeProjectsCount || 0,
    };

    setColleges((prev) => [syncedCollege, ...prev.filter((c) => c.id !== newCollege.id && c.id !== syncedCollege.id)]);
    return syncedCollege;
  };

  const updateCollege = (id: string, updates: Partial<CollegeTenantRecord>) => {
    setColleges((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    platformApi.updateTenant(id, {
      name: updates.name,
      licenseTier: updates.subscriptionPlan,
      maxStudentSeats: updates.maxStudentSeats ?? updates.totalStudents,
      storageQuotaGb: updates.storageQuotaGb,
      isActive: updates.status ? updates.status === "Active" : undefined,
      enforceStrictSso: updates.strictSsoEnforced,
      affiliatingUniversity: updates.university,
      campusAddress: updates.address,
    }).then(() => {
      showToast("College tenant details updated successfully.", "success");
    }).catch((err: any) => {
      showToast(err?.message || "Failed to persist college tenant updates.", "error");
    });
  };

  const approveOnboardingRequest = (requestId: string) => {
    setOnboardingRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, reviewStatus: "Approved" as const, verificationStatus: "Verified" as const }
          : r
      )
    );
    const req = onboardingRequests.find((r) => r.id === requestId);
    showToast(`Application for ${req?.institutionName || "college"} approved! Ready for tenant schema provisioning.`, "success");
  };

  const provisionOnboardingRequest = async (requestId: string) => {
    const req = onboardingRequests.find((r) => r.id === requestId);
    if (!req) return;

    await onboardCollege({
      name: req.institutionName,
      shortName: req.shortName,
      code: req.shortName.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 8),
      university: req.university,
      domain: req.officialEmail.split("@")[1] || "college.ac.in",
      totalStudents: req.estimatedStudents,
      principalName: req.applicantName,
      principalEmail: req.officialEmail,
      contactPhone: req.phone,
      state: req.state,
      subscriptionPlan: "Standard",
    });

    setOnboardingRequests((prev) => prev.filter((r) => r.id !== requestId));
    showToast(`PostgreSQL 17 tenant schema & College Admin account provisioned for ${req.institutionName}!`, "success");
  };

  const rejectOnboardingRequest = (requestId: string, reason?: string) => {
    setOnboardingRequests((prev) => prev.filter((r) => r.id !== requestId));
    showToast(`Onboarding request rejected${reason ? `: ${reason}` : ""}.`, "info");
  };

  const approveApplication = async (requestId: string) => {
    const req = onboardingRequests.find((r) => r.id === requestId);
    if (!req) return;

    // Immediately mark request as Approved
    setOnboardingRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              reviewStatus: "Approved" as const,
              verificationStatus: "Verified" as const,
              decisionDate: new Date().toISOString().split("T")[0],
              decisionBy: "Dev Startup Admin",
            }
          : r
      )
    );

    // Onboard or update existing college
    await onboardCollege({
      name: req.institutionName,
      shortName: req.shortName || req.collegeCode,
      code: (req.collegeCode || req.shortName || "NEW").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 10),
      university: req.university,
      domain: req.domain || req.officialEmail.split("@")[1] || "college.ac.in",
      website: req.website || `https://${req.domain || "college.ac.in"}`,
      totalStudents: req.estimatedStudents || 1500,
      principalName: req.applicantName,
      principalEmail: req.officialEmail,
      contactPhone: req.phone,
      city: req.city || "Bhopal",
      state: req.state || "Madhya Pradesh",
      address: req.address || `${req.city}, ${req.state}`,
      pinCode: req.pinCode || "462001",
      subscriptionPlan: "Standard",
    });

    showToast(`Application for ${req.institutionName} approved. Record updated.`, "success");
  };

  const rejectApplication = (requestId: string, reason: string, explanation?: string) => {
    setOnboardingRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              reviewStatus: "Rejected" as const,
              verificationStatus: "Action Required" as const,
              decisionDate: new Date().toISOString().split("T")[0],
              decisionBy: "Dev Startup Admin",
              rejectionReason: reason,
              rejectionExplanation: explanation,
            }
          : r
      )
    );
    showToast("Application rejected. Decision and reason recorded in institutional history.", "info");
  };

  const retryProvisioning = async (requestId: string) => {
    const req = onboardingRequests.find((r) => r.id === requestId);
    if (!req) return;

    setOnboardingRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, reviewStatus: "Provisioning" as const, provisioningError: undefined }
          : r
      )
    );

    showToast(`Retrying schema allocation for ${req.institutionName}...`, "info");

    setTimeout(async () => {
      await onboardCollege({
        name: req.institutionName,
        shortName: req.shortName || req.collegeCode,
        code: (req.collegeCode || req.shortName || "REC").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 10),
        university: req.university,
        domain: req.domain || req.officialEmail.split("@")[1] || "college.ac.in",
        website: req.website || `https://${req.domain || "college.ac.in"}`,
        totalStudents: req.estimatedStudents || 1200,
        principalName: req.applicantName,
        principalEmail: req.officialEmail,
        contactPhone: req.phone,
        city: req.city || "Rewa",
        state: req.state || "Madhya Pradesh",
        address: req.address || `${req.city}, ${req.state}`,
        pinCode: req.pinCode || "486002",
        subscriptionPlan: "Standard",
      });

      setOnboardingRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, reviewStatus: "Approved" as const, verificationStatus: "Verified" as const }
            : r
        )
      );

      showToast(`Provisioning retry succeeded! ${req.institutionName} is now active.`, "success");
    }, 1400);
  };

  const updateApplicationChecklist = (requestId: string, checklist: Partial<ApplicationChecklist>) => {
    setOnboardingRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          const updated = {
            ...(r.checklist || {
              institutionIdentity: false,
              universityAffiliation: false,
              applicantAuthorization: false,
              supportingDocuments: false,
            }),
            ...checklist,
          };
          return { ...r, checklist: updated };
        }
        return r;
      })
    );
  };

  const updateApplicationDocumentStatus = (
    requestId: string,
    docId: string,
    status: "Verified" | "Pending Review" | "Missing" | "Needs Correction",
    remarks?: string
  ) => {
    setOnboardingRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId && r.documents) {
          const updatedDocs = r.documents.map((d) =>
            d.id === docId
              ? {
                  ...d,
                  status,
                  correctionRemarks: remarks,
                  verifiedAt: status === "Verified" ? new Date().toISOString().replace("T", " ").slice(0, 16) : undefined,
                  verifiedBy: status === "Verified" ? "Super Admin" : undefined,
                }
              : d
          );
          return { ...r, documents: updatedDocs };
        }
        return r;
      })
    );
    showToast(`Document status updated to ${status}.`, "info");
  };

  const updateApplicationChecklistItem = (
    requestId: string,
    key: "institutionIdentity" | "universityAffiliation" | "applicantAuthorization" | "supportingDocuments",
    status: "Pending" | "Verified" | "Needs Correction",
    notes?: string
  ) => {
    setOnboardingRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          const currentChecklist = r.checklist || {
            institutionIdentity: false,
            universityAffiliation: false,
            applicantAuthorization: false,
            supportingDocuments: false,
          };
          const currentDetails = currentChecklist.details || {};
          const isVerified = status === "Verified";

          const updatedChecklist: ApplicationChecklist = {
            ...currentChecklist,
            [key]: isVerified,
            details: {
              ...currentDetails,
              [key]: {
                status,
                notes: notes !== undefined ? notes : currentDetails[key]?.notes,
                verifiedBy: isVerified ? "Super Admin" : undefined,
                verifiedAt: isVerified ? new Date().toISOString().replace("T", " ").slice(0, 16) : undefined,
              },
            },
          };
          return { ...r, checklist: updatedChecklist };
        }
        return r;
      })
    );
    showToast(`Verification check for ${key} marked as ${status}.`, "info");
  };

  const sendCollegeAdminRecoveryOtp = (collegeId: string) => {
    const col = colleges.find((c) => c.id === collegeId);
    if (!col) return;
    showToast(`Password recovery OTP successfully dispatched to ${col.principalEmail} (${col.principalName}).`, "success");
  };

  const suspendCollege = async (collegeId: string, _reason: string) => {
    const target = colleges.find((c) => c.id === collegeId || c.code.toLowerCase() === collegeId.toLowerCase());
    if (!target) return;

    await platformApi.updateTenant(target.id, { isActive: false });
    setColleges((prev) =>
      prev.map((c) => (c.id === target.id ? { ...c, status: "Suspended", adminAccountStatus: "Suspended" } : c))
    );
    showToast(`${target.name} access has been suspended.`, "warning");
  };

  const reactivateCollege = async (collegeId: string, _reason: string) => {
    const target = colleges.find((c) => c.id === collegeId || c.code.toLowerCase() === collegeId.toLowerCase());
    if (!target) return;

    await platformApi.updateTenant(target.id, { isActive: true });
    setColleges((prev) =>
      prev.map((c) => (c.id === target.id ? { ...c, status: "Active", adminAccountStatus: "Active" } : c))
    );
    showToast(`${target.name} access has been reactivated.`, "success");
  };

  const resendAdminInvitation = async (collegeId: string) => {
    const target = colleges.find((c) => c.id === collegeId || c.code.toLowerCase() === collegeId.toLowerCase());
    if (!target || !target.principalEmail) return;

    await platformApi.provisionAdmin(target.id, {
      fullName: target.principalName || undefined,
      email: target.principalEmail,
      replaceExisting: false,
    });
    setColleges((prev) =>
      prev.map((c) =>
        c.id === target.id
          ? {
              ...c,
              principalIsActivated: false,
              principalIsEmailVerified: false,
              principalHasPendingInvitation: true,
              adminInvitationStatus: "Sent",
            }
          : c
      )
    );
    showToast(`Activation invitation re-sent to ${target.principalEmail}.`, "success");
  };

  const replacePrimaryAdmin = async (
    collegeId: string,
    newAdmin: { fullName: string; email: string; designation: string; phone: string; reason: string }
  ) => {
    const target = colleges.find((c) => c.id === collegeId || c.code.toLowerCase() === collegeId.toLowerCase());
    if (!target) return;

    await platformApi.provisionAdmin(target.id, {
      fullName: newAdmin.fullName,
      email: newAdmin.email,
      replaceExisting: true,
      reason: newAdmin.reason,
    });

    setColleges((prev) =>
      prev.map((c) =>
        c.id === target.id
          ? {
              ...c,
              principalName: newAdmin.fullName,
              principalEmail: newAdmin.email.toLowerCase(),
              principalIsActive: true,
              principalIsActivated: false,
              principalIsEmailVerified: false,
              principalHasPendingInvitation: true,
              principalLastLoginAtUtc: null,
            }
          : c
      )
    );
    showToast(`Primary administrator replaced. Activation link dispatched to ${newAdmin.email}.`, "success");
  };

  const addUniversity = (univ: Partial<UniversityRecord>) => {
    const newUniv: UniversityRecord = {
      id: `univ-${Date.now()}`,
      name: univ.name || "State University",
      code: (univ.code || "UNIV").toUpperCase(),
      website: univ.website || "https://univ.ac.in",
      state: univ.state || "Madhya Pradesh",
      universityType: univ.universityType || "State Technical",
      status: "Active",
      affiliatedCollegesCount: 0,
      establishedYear: univ.establishedYear || 2000,
      chancellorOrHead: univ.chancellorOrHead || "Vice Chancellor",
      isOfficialUniversity: false,
    };
    setUniversities((prev) => [...prev, newUniv]);
    showToast(`University ${newUniv.name} added to master catalog.`, "success");
  };

  const addRegulation = (reg: Partial<AcademicRegulationRecord>) => {
    const newReg: AcademicRegulationRecord = {
      id: `reg-${Date.now()}`,
      name: reg.name || "Academic Regulation Scheme",
      code: reg.code || `REG-${Date.now().toString().slice(-4)}`,
      university: reg.university || "RGPV",
      applicablePrograms: reg.applicablePrograms || ["B.Tech"],
      effectiveAcademicYear: reg.effectiveAcademicYear || "2026–2027",
      status: "Draft",
      version: "v1.0-draft",
      gradingScheme: reg.gradingScheme || "10-Point Absolute",
      minPassingMarksTheory: reg.minPassingMarksTheory || 35,
      minPassingMarksPractical: reg.minPassingMarksPractical || 50,
    };
    setRegulations((prev) => [...prev, newReg]);
    showToast(`Regulation ${newReg.code} created.`, "success");
  };

  const addSubject = (subj: Partial<SubjectMasterRecord>) => {
    const newSubj: SubjectMasterRecord = {
      id: `sub-${Date.now()}`,
      name: subj.name || "Capstone Project Offering",
      code: subj.code || "CS-699",
      type: subj.type || "Project (Minor)",
      credits: subj.credits || 2,
      semester: subj.semester || 6,
      program: subj.program || "B.Tech",
      branch: subj.branch || "CSE",
      regulation: subj.regulation || "RGPV-AICTE-FLEX-2022",
      teachingScheme: subj.teachingScheme || "L-T-P: 0-0-4",
      classification: "Project",
      internalMax: subj.internalMax || 40,
      externalMax: subj.externalMax || 60,
    };
    setSubjects((prev) => [...prev, newSubj]);
    showToast(`Master subject ${newSubj.code} (${newSubj.name}) added.`, "success");
  };

  const addProgram = (prog: Partial<AcademicProgramRecord>) => {
    const newProg: AcademicProgramRecord = {
      id: `prog-${Date.now()}`,
      name: prog.name || "Bachelor of Technology",
      code: (prog.code || "B.TECH").toUpperCase(),
      degreeType: prog.degreeType || "UG",
      durationYears: prog.durationYears || 4,
      totalSemesters: prog.totalSemesters || 8,
      applicableRegulations: prog.applicableRegulations || ["RGPV-AICTE-FLEX-2022"],
      status: "Active",
      branchesCount: 0,
    };
    setPrograms((prev) => [...prev, newProg]);
    showToast(`Degree Program ${newProg.code} (${newProg.name}) created.`, "success");
  };

  const addBranch = (branch: Partial<AcademicBranchRecord>) => {
    const newBranch: AcademicBranchRecord = {
      id: `branch-${Date.now()}`,
      name: branch.name || "Engineering Branch",
      code: (branch.code || "BR").toUpperCase(),
      programCode: (branch.programCode || "B.Tech").toUpperCase(),
      departmentCode: (branch.departmentCode || branch.code || "ENG").toUpperCase(),
      durationYears: branch.durationYears || 4,
      status: "Active",
      intakeSeats: branch.intakeSeats || 60,
    };
    setBranches((prev) => [...prev, newBranch]);
    showToast(`Branch ${newBranch.code} added to ${newBranch.programCode}.`, "success");
  };

  const linkCollegeToUniversity = (collegeId: string, universityNameOrCode: string) => {
    setColleges((prev) =>
      prev.map((c) => (c.id === collegeId ? { ...c, university: universityNameOrCode } : c))
    );
    showToast(`College tenant successfully linked to ${universityNameOrCode}.`, "success");
  };

  const publishTemplate = (templateId: string) => {
    setTemplateVersions((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, status: "Published" as const } : t))
    );
    showToast(`Academic template version published and locked. Active cohorts preserved.`, "success");
  };

  const toggleSdg = (num: number) => {
    setUnSdgs((prev) => prev.map((s) => (s.num === num ? { ...s, isActive: !s.isActive } : s)));
  };

  const updateRegulation = (id: string, updates: Partial<AcademicRegulationRecord>) => {
    setRegulations((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, ...updates, lastUpdated: new Date().toISOString().split("T")[0] } : r
      )
    );
    showToast("Academic regulation scheme updated successfully.", "success");
  };

  const updateProgram = (id: string, updates: Partial<AcademicProgramRecord>) => {
    setPrograms((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    showToast("Degree program updated successfully.", "success");
  };

  const updateBranch = (id: string, updates: Partial<AcademicBranchRecord>) => {
    setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    showToast("Engineering branch updated successfully.", "success");
  };

  const toggleBranchStatus = (id: string) => {
    setBranches((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const nextStatus = b.status === "Active" ? "Inactive" : "Active";
          addAuditLog({
            action: "BRANCH_STATUS_TOGGLED",
            actor: "Dev Startup Admin",
            affectedResource: `Branch: ${b.code} (${b.name})`,
            metadataJson: JSON.stringify({ branchId: b.id, previousStatus: b.status, newStatus: nextStatus }),
            details: `Standard branch ${b.code} status set to ${nextStatus}.`,
            status: "Success",
            category: "Platform Management",
          });
          return { ...b, status: nextStatus };
        }
        return b;
      })
    );
    showToast("Branch status updated.", "success");
  };

  const updateNbaPo = (code: string, updates: Partial<NbaProgramOutcomeRecord>) => {
    setNbaPos((prev) => prev.map((p) => (p.code === code ? { ...p, ...updates } : p)));
    showToast(`NBA Program Outcome ${code} updated.`, "success");
  };

  const updateUnSdg = (num: number, updates: Partial<UnSdgRecord>) => {
    setUnSdgs((prev) => prev.map((s) => (s.num === num ? { ...s, ...updates } : s)));
    showToast(`UN SDG ${num} updated.`, "success");
  };

  const updateCollegePlan = (subscriptionId: string, newPlanName: string, extendDays: number) => {
    setCollegeSubscriptions((prev) =>
      prev.map((s) => {
        if (s.id === subscriptionId) {
          const current = new Date(s.renewalDate);
          const newDate = new Date(current.getTime() + extendDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          return {
            ...s,
            planName: newPlanName,
            renewalDate: newDate,
          };
        }
        return s;
      })
    );
    showToast("Subscription contract updated successfully.", "success");
  };

  const createSubscriptionPlan = (planData: Omit<SubscriptionPlanRecord, "id">) => {
    const newPlan: SubscriptionPlanRecord = {
      ...planData,
      id: `plan-${Date.now().toString().slice(-6)}`,
    };
    setPlans((prev) => [...prev, newPlan]);
    showToast(`Subscription plan "${newPlan.name}" created successfully.`, "success");
  };

  const updateSubscriptionPlan = (id: string, updates: Partial<SubscriptionPlanRecord>) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    showToast("Plan configuration saved. Active college agreements remain unchanged.", "success");
  };

  const deleteSubscriptionPlan = (id: string): { success: boolean; message: string } => {
    const plan = plans.find((p) => p.id === id);
    if (!plan) return { success: false, message: "Plan not found." };
    const activeCount = collegeSubscriptions.filter(
      (s) => s.planName.toLowerCase() === plan.name.toLowerCase() && s.status !== "Cancelled"
    ).length;
    if (activeCount > 0) {
      const msg = `Cannot delete "${plan.name}" because ${activeCount} active college subscription(s) depend on it.`;
      showToast(msg, "error");
      return { success: false, message: msg };
    }
    setPlans((prev) => prev.filter((p) => p.id !== id));
    showToast(`Plan "${plan.name}" removed from catalog.`, "info");
    return { success: true, message: `Plan deleted.` };
  };

  const togglePlanStatus = (id: string) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: p.status === "Active" ? "Inactive" : "Active" } : p))
    );
    showToast("Plan availability status updated.", "info");
  };

  const updateCollegeSubscription = (id: string, updates: Partial<CollegeSubscriptionRecord>) => {
    setCollegeSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    showToast("College subscription updated.", "success");
  };

  const changeSubscriptionPlan = (subscriptionId: string, newPlanId: string, newBillingCycle?: string) => {
    const plan = plans.find((p) => p.id === newPlanId);
    if (!plan) return;
    setCollegeSubscriptions((prev) =>
      prev.map((s) => {
        if (s.id === subscriptionId) {
          const prevPlanName = s.planName;
          const updated = {
            ...s,
            planName: plan.name,
            planId: plan.id,
            amountINR: plan.priceINR,
            billingCycle: newBillingCycle || plan.billingCycle || s.billingCycle,
            status: plan.priceINR === 0 ? ("Trial" as const) : ("Active" as const),
            seatUtilization: {
              ...s.seatUtilization,
              allocated: plan.userLimit || s.seatUtilization.allocated,
              facultyAllocated: plan.facultyLimit || 150,
            },
            storageQuotaGb: plan.storageLimitGb || 100,
            history: [
              {
                timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
                action: "Plan Changed",
                details: `Contract changed from ${prevPlanName} to ${plan.name} at ₹${plan.priceINR.toLocaleString("en-IN")}/${newBillingCycle || plan.billingCycle}.`,
                performedBy: "Super Admin",
              },
              ...(s.history || []),
            ],
          };
          updateCollege(s.institutionId, {
            subscriptionPlan: plan.name.includes("Enterprise")
              ? "Enterprise"
              : plan.name.includes("Standard")
              ? "Standard"
              : "Pilot",
            storageQuotaGb: plan.storageLimitGb,
          });
          return updated;
        }
        return s;
      })
    );
    showToast(`Subscription plan updated to ${plan.name} and entitlements synced.`, "success");
  };

  const extendSubscriptionValidity = (subscriptionId: string, days: number, newRenewalDate?: string) => {
    setCollegeSubscriptions((prev) =>
      prev.map((s) => {
        if (s.id === subscriptionId) {
          let targetDateStr = newRenewalDate;
          if (!targetDateStr) {
            const base = new Date(s.renewalDate).getTime() > Date.now() ? new Date(s.renewalDate) : new Date();
            targetDateStr = new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          }
          const updated = {
            ...s,
            renewalDate: targetDateStr,
            status: (s.status === "Expired" || s.status === "Expiring Soon" ? "Active" : s.status) as any,
            history: [
              {
                timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
                action: "Validity Extended",
                details: `Extended by ${days} days until ${targetDateStr}.`,
                performedBy: "Super Admin",
              },
              ...(s.history || []),
            ],
          };
          updateCollege(s.institutionId, { renewalDate: targetDateStr });
          return updated;
        }
        return s;
      })
    );
    showToast(`Subscription extended successfully.`, "success");
  };

  const renewSubscription = (subscriptionId: string, durationMonths = 12) => {
    setCollegeSubscriptions((prev) =>
      prev.map((s) => {
        if (s.id === subscriptionId) {
          const base = new Date(s.renewalDate).getTime() > Date.now() ? new Date(s.renewalDate) : new Date();
          const nextRenewal = new Date(base.setMonth(base.getMonth() + durationMonths)).toISOString().split("T")[0];
          const updated = {
            ...s,
            renewalDate: nextRenewal,
            status: "Active" as const,
            history: [
              {
                timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
                action: "Contract Renewed",
                details: `Renewed for ${durationMonths} months until ${nextRenewal}.`,
                performedBy: "Super Admin",
              },
              ...(s.history || []),
            ],
          };
          updateCollege(s.institutionId, { renewalDate: nextRenewal, status: "Active" });
          return updated;
        }
        return s;
      })
    );
    showToast("Subscription contract renewed successfully.", "success");
  };

  const convertTrialToPaid = (subscriptionId: string, newPlanId: string, billingCycle = "Annual") => {
    const plan = plans.find((p) => p.id === newPlanId);
    if (!plan) return;
    const sub = collegeSubscriptions.find((s) => s.id === subscriptionId);
    if (!sub) return;

    const renewalDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setCollegeSubscriptions((prev) =>
      prev.map((s) => {
        if (s.id === subscriptionId) {
          return {
            ...s,
            planName: plan.name,
            planId: plan.id,
            amountINR: plan.priceINR,
            billingCycle,
            status: "Active" as const,
            startDate: new Date().toISOString().split("T")[0],
            renewalDate,
            seatUtilization: {
              ...s.seatUtilization,
              allocated: plan.userLimit,
              facultyAllocated: plan.facultyLimit || 150,
            },
            storageQuotaGb: plan.storageLimitGb,
            history: [
              {
                timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
                action: "Converted to Paid",
                details: `Converted from Trial to ${plan.name} at ₹${plan.priceINR.toLocaleString("en-IN")}/yr.`,
                performedBy: "Super Admin",
              },
              ...(s.history || []),
            ],
          };
        }
        return s;
      })
    );

    updateCollege(sub.institutionId, {
      subscriptionPlan: plan.name.includes("Enterprise") ? "Enterprise" : "Standard",
      storageQuotaGb: plan.storageLimitGb,
      renewalDate,
    });

    const taxable = Math.round(plan.priceINR / 1.18);
    const gst = plan.priceINR - taxable;
    createInvoice({
      institutionId: sub.institutionId,
      institutionName: sub.institutionName,
      collegeCode: sub.collegeCode,
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      taxableAmountINR: taxable,
      taxRate: 18,
      taxType: "CGST_SGST",
      cgstAmountINR: Math.round(gst / 2),
      sgstAmountINR: Math.round(gst / 2),
      igstAmountINR: 0,
      gstAmountINR: gst,
      totalAmountINR: plan.priceINR,
      paymentStatus: "Pending",
      gstin: sub.gstin || "23AAGCS2341P1ZB",
      billingPeriodStart: new Date().toISOString().split("T")[0],
      billingPeriodEnd: renewalDate,
      notes: `Initial commercial license invoice upon conversion to ${plan.name}.`,
    });

    showToast(`Converted ${sub.institutionName} to paid ${plan.name}. Invoice generated.`, "success");
  };

  const toggleSubscriptionStatus = (subscriptionId: string, status: "Active" | "Suspended" | "Cancelled") => {
    const sub = collegeSubscriptions.find((s) => s.id === subscriptionId);
    if (!sub) return;
    setCollegeSubscriptions((prev) =>
      prev.map((s) =>
        s.id === subscriptionId
          ? {
              ...s,
              status,
              history: [
                {
                  timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
                  action: `Status Set to ${status}`,
                  details: `Subscription status updated to ${status}.`,
                  performedBy: "Super Admin",
                },
                ...(s.history || []),
              ],
            }
          : s
      )
    );
    updateCollege(sub.institutionId, {
      status: status === "Active" ? "Active" : status === "Suspended" ? "Suspended" : "Archived",
    });
    showToast(`Subscription status for ${sub.institutionName} updated to ${status}.`, status === "Active" ? "success" : "warning");
  };

  const cancelSubscription = (subscriptionId: string, reason?: string) => {
    const sub = collegeSubscriptions.find((s) => s.id === subscriptionId);
    if (!sub) return;
    setCollegeSubscriptions((prev) =>
      prev.map((s) =>
        s.id === subscriptionId
          ? {
              ...s,
              status: "Cancelled" as const,
              autoRenew: false,
              history: [
                {
                  timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
                  action: "Subscription Cancelled",
                  details: `Cancelled by Super Admin. ${reason ? `Reason: ${reason}` : ""}`,
                  performedBy: "Super Admin",
                },
                ...(s.history || []),
              ],
            }
          : s
      )
    );
    showToast(`Subscription for ${sub.institutionName} has been cancelled.`, "warning");
  };

  const createInvoice = (invData: Omit<InvoiceRecord, "id" | "invoiceNumber">): InvoiceRecord => {
    const year = new Date().getFullYear();
    const num = invoices.length + 1;
    const formattedNum = `COLAB-${year}-${String(num).padStart(3, "0")}`;
    const newInvoice: InvoiceRecord = {
      ...invData,
      id: `inv-${year}-${String(num).padStart(3, "0")}`,
      invoiceNumber: formattedNum,
    };
    setInvoices((prev) => [newInvoice, ...prev]);
    showToast(`Tax Invoice ${formattedNum} generated successfully.`, "success");
    return newInvoice;
  };

  const recordInvoicePayment = (
    invoiceId: string,
    paymentData: { amount: number; paymentRef: string; paymentMethod: string; paymentDate: string; notes?: string }
  ) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          const isFull = paymentData.amount >= inv.totalAmountINR;
          return {
            ...inv,
            paymentStatus: isFull ? "Paid" : "Partially Paid",
            paidAmountINR: (inv.paidAmountINR || 0) + paymentData.amount,
            paymentRef: paymentData.paymentRef,
            paymentMethod: paymentData.paymentMethod,
            paymentDate: paymentData.paymentDate,
            notes: paymentData.notes ? `${inv.notes ? `${inv.notes}; ` : ""}${paymentData.notes}` : inv.notes,
          };
        }
        return inv;
      })
    );
    showToast(`Payment of ₹${paymentData.amount.toLocaleString("en-IN")} recorded for invoice.`, "success");
  };

  const updateInvoiceStatus = (invoiceId: string, status: InvoiceRecord["paymentStatus"]) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? { ...inv, paymentStatus: status } : inv)));
    showToast(`Invoice status updated to ${status}.`, "info");
  };

  const inviteAdminUser = async (email: string, name: string, role?: string) => {
    const created = await platformApi.inviteAdministrator({
      fullName: name,
      email,
      platformRole: role,
    });
    const newUser: PlatformAdminUserRecord = {
      id: created.id,
      name: created.fullName,
      email: created.email,
      adminId: created.adminId,
      platformRole: (created.platformRole as any) || "Super Admin",
      status: (created.status as any) || "Pending Invitation",
      mfaStatus: (created.mfaStatus as any) || "Enrollment Required",
      createdAt: created.createdAtUtc ? created.createdAtUtc.slice(0, 19).replace("T", " ") : "",
      lastLogin: "Never",
      lastAuthTimestamp: "Never",
      ipAddress: "—",
      activeSessionsCount: 0,
      mfaDetails: {
        type: "FIDO2 / WebAuthn Hardware Key",
        keyModel: "Enrollment Required",
        keyId: "PENDING_REGISTRATION",
        enrolledAt: "Pending Initial Login",
        backupCodesRemaining: 0,
        recoveryStatus: "Healthy",
      },
      permissions: STANDARD_PERMISSIONS_DEF.map((def, idx) => ({
        id: `perm-${created.id}-${idx}`,
        category: def.category,
        key: def.key,
        label: def.label,
        description: def.description,
        granted: true,
      })),
      securityActivity: [],
      sensitiveSafeguards: { canPublishMasterData: true, canAuthorizeBilling: true, canManageTenants: true },
    };
    setAdminUsers((prev) => [...prev, newUser]);
    showToast(`Invitation dispatched to ${created.email}.`, "success");
  };

  const updateAdminUser = async (id: string, updates: Partial<PlatformAdminUserRecord>) => {
    if (updates.status === "Active" || updates.status === "Suspended") {
      const isActive = updates.status === "Active";
      await platformApi.updateAdministratorStatus(id, isActive);
      setAdminUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? { ...u, status: updates.status!, activeSessionsCount: isActive ? u.activeSessionsCount : 0 }
            : u
        )
      );
      showToast(`Operator status updated to ${updates.status}.`, isActive ? "success" : "warning");
      return;
    }
    setAdminUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
  };

  const revokeAdminUser = (id: string) => {
    const activeCount = adminUsers.filter((u) => u.status === "Active").length;
    const target = adminUsers.find((u) => u.id === id);
    if (target?.status === "Active" && activeCount <= 1) {
      showToast("PAM Safeguard: Cannot revoke or suspend the sole active Super Admin account.", "error");
      return;
    }
    const newStatus = target?.status === "Active" ? "Suspended" : "Active";
    setAdminUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const newActivity: SecurityActivityRecord = {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
          event: newStatus === "Active" ? "Super Admin Access Reactivated" : "Super Admin Access Suspended",
          ipAddress: "103.21.244.10",
          status: newStatus === "Active" ? "Success" : "Warning",
          details: newStatus === "Active" ? "Platform access restored with existing permissions." : "Platform administrative credentials suspended.",
        };
        return {
          ...u,
          status: newStatus,
          activeSessionsCount: newStatus === "Suspended" ? 0 : u.activeSessionsCount,
          securityActivity: [newActivity, ...(u.securityActivity || [])],
        };
      })
    );
    showToast(target?.status === "Active" ? "Super Admin access has been revoked and all sessions terminated." : "Super Admin access reactivated.", "warning");
  };

  const revokeAdminSessions = async (id: string) => {
    await platformApi.revokeAdministratorSessions(id);
    setAdminUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, activeSessionsCount: 0 } : u))
    );
    showToast("All active sessions and cryptographic tokens invalidated immediately.", "warning");
  };

  const initiateMfaRecovery = (id: string) => {
    setAdminUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const newActivity: SecurityActivityRecord = {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
          event: "MFA Break-Glass Recovery Initiated",
          ipAddress: "103.21.244.10",
          status: "Warning",
          details: "Hardware key lost recovery protocol triggered. Break-glass emergency verification underway.",
        };
        return {
          ...u,
          mfaDetails: {
            ...u.mfaDetails,
            recoveryStatus: "Recovery In Progress",
          },
          securityActivity: [newActivity, ...(u.securityActivity || [])],
        };
      })
    );
    showToast("MFA break-glass recovery protocol initiated. Platform security team notified.", "warning");
  };

  const toggleAdminPermission = (adminId: string, permissionKey: string, granted: boolean, reason?: string, grantedBy?: string) => {
    setAdminUsers((prev) =>
      prev.map((u) => {
        if (u.id !== adminId) return u;
        const updatedPermissions = u.permissions.map((p) => {
          if (p.key !== permissionKey) return p;
          return {
            ...p,
            granted,
            grantedBy: granted ? (grantedBy || "Dev Startup Admin (ADM-001)") : undefined,
            grantedDate: granted ? new Date().toISOString().slice(0, 10) : undefined,
            reason: granted ? (reason || "Direct administrative assignment") : undefined,
            approvalRecord: granted ? `PAM-DIR-${Math.floor(100 + Math.random() * 900)}` : undefined,
          };
        });
        const permDef = STANDARD_PERMISSIONS_DEF.find((d) => d.key === permissionKey);
        const newActivity: SecurityActivityRecord = {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
          event: granted ? `Permission Granted: ${permDef?.label || permissionKey}` : `Permission Revoked: ${permDef?.label || permissionKey}`,
          ipAddress: "103.21.244.10",
          status: granted ? "Success" : "Warning",
          details: granted ? `Granted by ${grantedBy || "Dev Startup Admin"}. Reason: ${reason || "Admin update"}` : "Privilege revoked.",
        };
        return {
          ...u,
          permissions: updatedPermissions,
          securityActivity: [newActivity, ...(u.securityActivity || [])],
        };
      })
    );
    showToast(`Permission ${granted ? "granted" : "revoked"} successfully.`, granted ? "success" : "info");
  };

  const requestSecurityApproval = (adminId: string, permissionKey: string, reason: string) => {
    const admin = adminUsers.find((u) => u.id === adminId);
    if (!admin) return;
    const permDef = STANDARD_PERMISSIONS_DEF.find((d) => d.key === permissionKey);
    if (!permDef) return;

    const newReqId = `REQ-SEC-${Math.floor(400 + Math.random() * 500)}`;
    const newReq: SecurityApprovalRequestRecord = {
      id: `sec-req-${Date.now()}`,
      requestId: newReqId,
      requesterId: admin.id,
      requesterName: admin.name,
      requesterEmail: admin.email,
      permissionKey,
      permissionLabel: permDef.label,
      category: permDef.category,
      reason,
      requestedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      status: "Pending Dual Approval",
    };

    setSecurityApprovals((prev) => [newReq, ...prev]);

    const newActivity: SecurityActivityRecord = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      event: `Privileged Access Requested: ${permDef.label}`,
      ipAddress: admin.ipAddress || "103.21.244.10",
      status: "Success",
      details: `Request ${newReqId} submitted for dual authorization. Justification: ${reason}`,
    };
    setAdminUsers((prev) =>
      prev.map((u) => (u.id === adminId ? { ...u, securityActivity: [newActivity, ...(u.securityActivity || [])] } : u))
    );

    showToast(`Dual-authorization request ${newReqId} submitted. Awaiting secondary Super Admin review.`, "info");
  };

  const reviewSecurityApproval = (requestId: string, decision: "Approved" | "Rejected", reviewerAdminId: string, notes?: string) => {
    const req = securityApprovals.find((r) => r.id === requestId);
    if (!req) return;

    if (req.requesterId === reviewerAdminId) {
      showToast("PAM Violation: Prevention of self-approval is strictly enforced. Another Super Admin must review.", "error");
      return;
    }

    const reviewer = adminUsers.find((u) => u.id === reviewerAdminId);
    const reviewerLabel = reviewer ? `${reviewer.name} (${reviewer.adminId})` : "Super Admin";

    setSecurityApprovals((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: decision === "Approved" ? "Approved" : "Rejected",
              reviewedBy: reviewerLabel,
              reviewedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
              reviewNotes: notes,
            }
          : r
      )
    );

    if (decision === "Approved") {
      setAdminUsers((prev) =>
        prev.map((u) => {
          if (u.id !== req.requesterId) return u;
          const updatedPerms = u.permissions.map((p) => {
            if (p.key !== req.permissionKey) return p;
            return {
              ...p,
              granted: true,
              grantedBy: reviewerLabel,
              grantedDate: new Date().toISOString().slice(0, 10),
              reason: req.reason,
              approvalRecord: `${req.requestId} (Dual-Authorized)`,
            };
          });
          const newAct: SecurityActivityRecord = {
            id: `act-${Date.now()}`,
            timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
            event: `Privileged Access Granted: ${req.permissionLabel}`,
            ipAddress: "103.21.244.10",
            status: "Success",
            details: `Dual-authorization approved by ${reviewerLabel}. Request: ${req.requestId}`,
          };
          return {
            ...u,
            permissions: updatedPerms,
            securityActivity: [newAct, ...(u.securityActivity || [])],
          };
        })
      );
    } else {
      setAdminUsers((prev) =>
        prev.map((u) => {
          if (u.id !== req.requesterId) return u;
          const newAct: SecurityActivityRecord = {
            id: `act-${Date.now()}`,
            timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
            event: `Privileged Access Request Rejected: ${req.permissionLabel}`,
            ipAddress: "103.21.244.10",
            status: "Warning",
            details: `Rejected by ${reviewerLabel}. Reason: ${notes || "No notes provided"}`,
          };
          return {
            ...u,
            securityActivity: [newAct, ...(u.securityActivity || [])],
          };
        })
      );
    }

    showToast(
      decision === "Approved"
        ? `Dual-authorization approved for ${req.requesterName}. Privilege granted.`
        : `Dual-authorization request ${req.requestId} rejected.`,
      decision === "Approved" ? "success" : "warning"
    );
  };

  const toggleModule = (key: string) => {
    setModules((prev) => prev.map((m) => (m.key === key ? { ...m, isEnabled: !m.isEnabled } : m)));
    showToast("Platform module configuration updated.", "info");
  };

  const toggleFeatureFlag = (id: string) => {
    setFeatureFlags((prev) => prev.map((f) => (f.id === id ? { ...f, isEnabled: !f.isEnabled } : f)));
    showToast("Feature flag toggled and propagated across platform cluster.", "info");
  };

  const testIntegration = async (id: string) => {
    await new Promise((r) => setTimeout(r, 600));
    return { latency: Math.floor(Math.random() * 30 + 15), status: "200 OK — Healthy" };
  };

  const retryBackgroundJob = (id: string) => {
    setBackgroundJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: "Processing", retryCount: j.retryCount + 1 } : j))
    );
    showToast(`Background job ${id} requeued to Hangfire worker pool.`, "info");
    setTimeout(() => {
      setBackgroundJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: "Completed" } : j)));
      showToast(`Background job ${id} completed successfully.`, "success");
    }, 1200);
  };

  const testPlatformService = async (id: string): Promise<{ latency: number; status: string }> => {
    await new Promise((r) => setTimeout(r, 450));
    const randomLatency = Math.floor(Math.random() * 25 + 15);
    setPlatformServices((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              lastHealthCheck: "Just now",
              latencyMs: randomLatency,
              status: "Operational",
            }
          : s
      )
    );
    showToast(`Health check successful. Latency: ${randomLatency}ms (Status: Operational)`, "success");
    return { latency: randomLatency, status: "Operational" };
  };

  const addAnnouncement = async (ann: Partial<AnnouncementRecord>): Promise<boolean> => {
    try {
      const created = await platformApi.createAnnouncement({
        title: ann.title || "Platform Announcement",
        category: ann.category || "Maintenance",
        priority: ann.priority || "Normal",
        shortDescription: ann.shortDescription,
        fullMessage: ann.fullMessage || "",
        targetAudience: ann.targetAudience || "All Colleges",
        targetCollegeIds: ann.targetCollegeIds || [],
        status: ann.status === "Draft" ? "Draft" : "Published",
      });
      setAnnouncements((prev) => [mapAnnouncementDto(created), ...prev]);
      showToast(
        created.status === "Draft"
          ? "Announcement saved as draft."
          : "Announcement published to colleges.",
        "success"
      );
      return true;
    } catch (err: any) {
      showToast(err?.message || "Failed to create announcement.", "error");
      return false;
    }
  };

  const updateAnnouncement = async (id: string, updates: Partial<AnnouncementRecord>): Promise<boolean> => {
    const existing = announcements.find((a) => a.id === id);
    if (!existing) return false;
    try {
      const updated = await platformApi.updateAnnouncement(id, {
        title: updates.title ?? existing.title,
        category: (updates.category ?? existing.category) || "Maintenance",
        priority: (updates.priority ?? existing.priority) || "Normal",
        shortDescription: updates.shortDescription ?? existing.shortDescription,
        fullMessage: updates.fullMessage ?? existing.fullMessage,
        targetAudience: (updates.targetAudience ?? existing.targetAudience) || "All Colleges",
        targetCollegeIds: updates.targetCollegeIds ?? existing.targetCollegeIds ?? [],
        status: updates.status ?? existing.status,
      });
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? mapAnnouncementDto(updated) : a)));
      showToast("Announcement updated successfully.", "success");
      return true;
    } catch (err: any) {
      showToast(err?.message || "Failed to update announcement.", "error");
      return false;
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await platformApi.deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showToast("Announcement removed from platform registry.", "info");
    } catch (err: any) {
      showToast(err?.message || "Failed to delete announcement.", "error");
    }
  };

  const publishAnnouncementNow = async (id: string) => {
    try {
      const updated = await platformApi.publishAnnouncement(id);
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? mapAnnouncementDto(updated) : a)));
      showToast("Announcement published immediately to targeted colleges.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to publish announcement.", "error");
    }
  };

  const withdrawAnnouncement = async (id: string) => {
    try {
      const updated = await platformApi.withdrawAnnouncement(id);
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? mapAnnouncementDto(updated) : a)));
      showToast("Announcement withdrawn. Live college visibility revoked.", "info");
    } catch (err: any) {
      showToast(err?.message || "Failed to withdraw announcement.", "error");
    }
  };

  const archiveAnnouncement = async (id: string, reason?: string) => {
    try {
      const updated = await platformApi.archiveAnnouncement(id, reason);
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? mapAnnouncementDto(updated) : a)));
      showToast("Announcement archived.", "info");
    } catch (err: any) {
      showToast(err?.message || "Failed to archive announcement.", "error");
    }
  };

  const createSupportTicket = async (data: {
    collegeId?: string;
    institutionName?: string;
    subject: string;
    description: string;
    category?: string;
    priority?: string;
  }) => {
    try {
      const created = await platformApi.createTicket(data);
      setTickets((prev) => [mapTicketDto(created), ...prev]);
      showToast(`Support ticket ${created.ticketNumber} created.`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to create support ticket.", "error");
    }
  };

  const replySupportTicket = async (ticketId: string, message: string, isInternal = false) => {
    try {
      const updated = await platformApi.replyTicket(ticketId, message, isInternal);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? mapTicketDto(updated) : t)));
      showToast(isInternal ? "Internal administrator note recorded." : "Ticket response sent to institution.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to send ticket reply.", "error");
    }
  };

  const updateTicketStatus = async (
    ticketId: string,
    status: SupportTicketRecord["status"]
  ) => {
    try {
      const updated = await platformApi.updateTicketStatus(ticketId, status);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? mapTicketDto(updated) : t)));
      showToast(`Ticket status updated to ${status}.`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to update ticket status.", "error");
    }
  };

  const resolveSupportTicket = async (ticketId: string, resolutionNotes: string) => {
    try {
      const updated = await platformApi.resolveTicket(ticketId, resolutionNotes);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? mapTicketDto(updated) : t)));
      showToast("Ticket resolved and resolution notes recorded.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to resolve ticket.", "error");
    }
  };

  const closeSupportTicket = async (ticketId: string) => {
    try {
      const updated = await platformApi.closeTicket(ticketId);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? mapTicketDto(updated) : t)));
      showToast("Ticket closed.", "info");
    } catch (err: any) {
      showToast(err?.message || "Failed to close ticket.", "error");
    }
  };

  const getTicketsForCollege = (collegeCode: string) => {
    return tickets.filter((t) => t.collegeCode === collegeCode);
  };

  const updateTicketPriority = async (ticketId: string, priority: SupportTicketRecord["priority"]) => {
    try {
      const updated = await platformApi.updateTicketPriority(ticketId, priority);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? mapTicketDto(updated) : t)));
      showToast(`Ticket priority changed to ${priority}.`, "info");
    } catch (err: any) {
      showToast(err?.message || "Failed to update ticket priority.", "error");
    }
  };

  const assignSupportTicket = async (ticketId: string, agentName: string) => {
    try {
      const updated = await platformApi.assignTicket(ticketId, agentName);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? mapTicketDto(updated) : t)));
      showToast(`Ticket assigned to ${agentName}.`, "info");
    } catch (err: any) {
      showToast(err?.message || "Failed to assign ticket.", "error");
    }
  };

  const terminateSession = async (sessionId: string) => {
    try {
      await platformApi.revokeSession(sessionId);
      setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
      const [backendLogs, summary] = await Promise.all([
        platformApi.getAuditLogs(200).catch(() => null),
        platformApi.getSecuritySummary().catch(() => null),
      ]);
      if (Array.isArray(backendLogs)) setAuditLogs(backendLogs.map(mapAuditLogDto));
      if (summary) setSecuritySummary(summary);
      showToast("Active administrative session revoked immediately.", "warning");
    } catch (err: any) {
      showToast(err?.message || "Failed to revoke session.", "error");
    }
  };

  const getPlatformStats = () => {
    const totalStudents = colleges.reduce((sum, c) => sum + c.totalStudents, 0);
    const totalFaculty = colleges.reduce((sum, c) => sum + c.totalFaculty, 0);
    const activeProjects = Math.round(totalStudents / 3.8); // 3.8 students per capstone team average
    const mrr = Math.round(
      collegeSubscriptions
        .filter((s) => s.status === "Active")
        .reduce((sum, s) => sum + s.amountINR / 12, 0)
    );

    return {
      totalColleges: colleges.length,
      activeColleges: colleges.filter((c) => c.status === "Active").length,
      totalStudents,
      totalFaculty,
      totalPlatformUsers: totalStudents + totalFaculty + adminUsers.length,
      activeProjects,
      monthlyRecurringRevenue: mrr,
      pendingOnboardingRequests: onboardingRequests.length,
    };
  };

  return (
    <PlatformDataContext.Provider
      value={{
        colleges,
        onboardingRequests,
        onboardCollege,
        updateCollege,
        approveOnboardingRequest,
        provisionOnboardingRequest,
        rejectOnboardingRequest,
        approveApplication,
        rejectApplication,
        retryProvisioning,
        updateApplicationChecklist,
        updateApplicationChecklistItem,
        updateApplicationDocumentStatus,
        sendCollegeAdminRecoveryOtp,
        suspendCollege,
        reactivateCollege,
        resendAdminInvitation,
        replacePrimaryAdmin,
        universities,
        regulations,
        programs,
        branches,
        departments,
        subjects,
        academicYears,
        examSchemes,
        nbaPos,
        unSdgs,
        templateVersions,
        addUniversity,
        addRegulation,
        addProgram,
        addBranch,
        addSubject,
        toggleBranchStatus,
        linkCollegeToUniversity,
        publishTemplate,
        toggleSdg,
        updateRegulation,
        updateProgram,
        updateBranch,
        updateNbaPo,
        updateUnSdg,
        plans,
        collegeSubscriptions,
        invoices,
        payments,
        refunds,
        discountCoupons,
        updateCollegePlan,
        createSubscriptionPlan,
        updateSubscriptionPlan,
        deleteSubscriptionPlan,
        togglePlanStatus,
        updateCollegeSubscription,
        changeSubscriptionPlan,
        extendSubscriptionValidity,
        renewSubscription,
        convertTrialToPaid,
        toggleSubscriptionStatus,
        cancelSubscription,
        createInvoice,
        recordInvoicePayment,
        updateInvoiceStatus,
        adminUsers,
        roles,
        securityApprovals,
        inviteAdminUser,
        updateAdminUser,
        revokeAdminUser,
        revokeAdminSessions,
        initiateMfaRecovery,
        toggleAdminPermission,
        requestSecurityApproval,
        reviewSecurityApproval,
        modules,
        featureFlags,
        toggleModule,
        toggleFeatureFlag,
        integrations,
        testIntegration,
        healthDetails,
        refreshHealthDetails,
        securitySummary,
        isLoadingPlatformData,
        services,
        alerts,
        incidents,
        backupStatus,
        backgroundJobs,
        retryBackgroundJob,
        tickets,
        platformServices,
        testPlatformService,
        announcements,
        addAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
        publishAnnouncementNow,
        withdrawAnnouncement,
        archiveAnnouncement,
        createSupportTicket,
        replySupportTicket,
        updateTicketStatus,
        updateTicketPriority,
        assignSupportTicket,
        resolveSupportTicket,
        closeSupportTicket,
        getTicketsForCollege,
        activeSessions,
        terminateSession,
        securityIncidents,
        auditLogs,
        addAuditLog,
        failedLoginAttemptsCount,
        getPlatformStats,
      }}
    >
      {children}
    </PlatformDataContext.Provider>
  );
};

export const usePlatformData = (): PlatformDataContextType => {
  const ctx = useContext(PlatformDataContext);
  if (!ctx) {
    throw new Error("usePlatformData must be used within a PlatformDataProvider");
  }
  return ctx;
};
