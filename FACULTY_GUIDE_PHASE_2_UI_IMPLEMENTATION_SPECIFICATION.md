# COLABEX — FACULTY / GUIDE MODULE
# PHASE 2.1: COMPLETE UI IMPLEMENTATION SPECIFICATION & ARCHITECTURAL BLUEPRINT

**Date:** November 23, 2026  
**Author Roles:** Principal SaaS Architect, Senior Frontend Architect, ASP.NET Core Backend Architect, Database Architect, Application Security Auditor and Independent QA Lead  
**Working Branch:** `integration/super-admin-college-admin`  
**Protected HOD Baseline:** Commit `bd5bfc759cc9c46befa04e6ea8c26c84862acea4`  
**Backend Baseline:** 113 / 113 Passing Integration Tests (`FacultySecurityAndWorkflowTests.cs`)  
**Target:** Single Source of Truth for Faculty / Guide Phase 3 Frontend Implementation  

---

## 1. ARCHITECTURAL BLUEPRINT & TARGET FRONTEND STRUCTURE

### 1.1 Deconstruction of the Monolithic `FacultyView.tsx`

The existing 1,540-line `FacultyView.tsx` component is an unmaintainable monolith that combines seven distinct domain screens, sixteen `useState` hooks, and hardcoded mock arrays. In Phase 3, this monolith will be decommissioned and replaced by a **modular, domain-driven view architecture** adhering strictly to Colabex design principles:

```text
web/src/
├── app/(dashboard)/
│   └── faculty/
│       ├── page.tsx                               # Route /faculty (Dashboard & Priority Action Queue)
│       ├── teams/
│       │   ├── page.tsx                           # Route /faculty/teams (Mentored Teams Directory)
│       │   └── [teamId]/
│       │       └── page.tsx                       # Route /faculty/teams/[teamId] (Dedicated Team Workspace)
│       ├── proposals/
│       │   └── page.tsx                           # Route /faculty/proposals (Proposal Review Queue)
│       ├── logs/
│       │   └── page.tsx                           # Route /faculty/logs (Weekly Progress Logs Sign-Off)
│       ├── deliverables/
│       │   └── page.tsx                           # Route /faculty/deliverables (Capstone Vault Reviews)
│       ├── evaluations/
│       │   └── page.tsx                           # Route /faculty/evaluations (Viva Defense Rubric & Scoring)
│       └── problem-bank/
│           └── page.tsx                           # Route /faculty/problem-bank (Campus Research Bank)
└── features/
    └── faculty/
        ├── components/                            # Reusable domain components
        │   ├── FacultyStatCard.tsx                # Metric indicator with real live values
        │   ├── ActionQueueTable.tsx               # Standardized priority tasks table
        │   ├── MentoredTeamCard.tsx               # Guided team card with status & repository link
        │   ├── RubricScoringGrid.tsx              # 60% shared project criteria scoring grid
        │   ├── IndividualStudentScoringTable.tsx  # 40% student breakdown (Module /15, Viva /15, Log /10)
        │   ├── DeliverableVaultTable.tsx          # 4-slot official deliverables table
        │   ├── WeeklyLogInspectionDrawer.tsx      # Slide-over drawer for log review & remarks
        │   ├── ProposalReviewDrawer.tsx           # Slide-over drawer for proposal dossier inspection
        │   ├── ProposalDecisionModal.tsx          # Endorse / Return / Reject confirmation modal
        │   └── ProblemStatementModal.tsx          # Propose problem bank statement modal
        ├── hooks/                                 # Custom query and mutation hooks
        │   ├── useFacultyActionQueue.ts           # Hook for action queue & live badges
        │   ├── useMentoredTeams.ts                # Hook for faculty's guided project teams
        │   ├── useTeamWorkspace.ts                # Hook for team deep-link workspace & artifacts
        │   ├── useDefenseEvaluations.ts           # Hook for appointed viva defense teams
        │   └── useProblemBank.ts                  # Hook for department problem statements
        └── views/                                 # Clean, single-responsibility view components
            ├── FacultyDashboardView.tsx           # Action Queue & Mentorship KPIs (/faculty)
            ├── FacultyTeamsView.tsx               # Mentored Teams Directory (/faculty/teams)
            ├── FacultyTeamWorkspaceView.tsx       # Dedicated Project Workspace (/faculty/teams/[teamId])
            ├── FacultyProposalsView.tsx           # Dedicated Proposal Review Queue (/faculty/proposals)
            ├── FacultyWeeklyLogsView.tsx          # Weekly Progress Logs Sign-off (/faculty/logs)
            ├── FacultyDeliverablesView.tsx        # 4-Slot Vault Review & Download (/faculty/deliverables)
            ├── FacultyEvaluationsView.tsx         # Viva Defense Rubric & Scoring Matrix (/faculty/evaluations)
            └── FacultyProblemBankView.tsx         # Problem Statement Directory & Form (/faculty/problem-bank)
```

---

## 2. NAVIGATION HIERARCHY, SIDEBAR & BREADCRUMBS

### 2.1 Fixed Left Sidebar Navigation Hierarchy

The sidebar organizes faculty workflows into a logical academic lifecycle without redundant tab bars:

| # | Sidebar Label | Route Destination | Lucide Icon | Live Badge Key | Role Authorization | Scope & Purpose |
|---|---|---|---|---|---|---|
| **1** | **Dashboard** | `/faculty` | `LayoutDashboard` | `pendingFacultyCount` | `Faculty` | Action queue, urgent approvals, approaching deadlines, and mentorship KPIs. |
| **2** | **My Teams** | `/faculty/teams` | `Users2` | — | `Faculty` | Portfolio of guided project teams, status badges, repository links, and member counts. |
| **3** | **Proposals** | `/faculty/proposals` | `FileText` | `pendingProposalsCount` | `Faculty` | Incoming project proposals requiring guide review, endorsement, return, or rejection. |
| **4** | **Weekly Logs** | `/faculty/logs` | `Calendar` | `pendingLogsCount` | `Faculty` | Friday engineering diary check-ins awaiting guide verification and remarks. |
| **5** | **Deliverables** | `/faculty/deliverables` | `FileCheck2` | `pendingArtifactsCount` | `Faculty` | 4-slot capstone document vault (Synopsis, Midterm PPT, Plagiarism Report, Final Thesis). |
| **6** | **Viva Evaluations** | `/faculty/evaluations` | `GraduationCap` | `pendingDefenseCount` | `Faculty` | Appointed defense panel grading, 60/40 blended rubrics, and individual student scoring. |
| **7** | **Problem Bank** | `/faculty/problem-bank` | `Compass` | — | `Faculty` | Propose department engineering challenges, map UN SDGs, and view team allocations. |
| **8** | **Coordinator Console** | `/coordinator` | `Briefcase` | `pendingCoordinatorCount` | `Faculty` (`coordinatorOnly`) | Department cycle administration: roster import, guide allocation, panel scheduling. |

### 2.2 Breadcrumb & Header Title Resolution
- **Breadcrumb Group:** `Mentorship & Evaluation Console`
- **Dynamic Breadcrumb Title:** Resolved dynamically from the authenticated user's `tenantContext`:
  `{CollegeName} • {DepartmentCode}` (e.g. `SISTec Bhopal • CSE`).
  *Hardcoded `"SISTec CSE"` and `"CSE Minor Project — Semester 6 (2026)"` in `routeRegistry.ts` are permanently eliminated.*
- **Live Badge Counters:**
  - `pendingFacultyCount = ActionQueueDto.PendingLogsCount + ActionQueueDto.PendingProposalsCount`
  - `pendingProposalsCount = ActionQueueDto.PendingProposalsCount`
  - `pendingLogsCount = ActionQueueDto.PendingLogsCount`

---

## 3. SCREEN-BY-SCREEN SPECIFICATIONS (9 SCREENS)

### 3.1 Screen 1: Faculty Dashboard & Priority Action Queue (`/faculty`)
- **Route:** `/faculty`
- **Component:** `FacultyDashboardView`
- **Role Access:** `Faculty`, `HOD`, `CollegeAdmin`
- **Sidebar Position:** Order 1 (`Dashboard`, Icon: `LayoutDashboard`, Badge: `pendingFacultyCount`)
- **Key Sections:**
  1. **Header Context Bar:** Institutional title, dynamic department subtitle, Quick Action button (`+ Post Idea to Problem Bank`).
  2. **Executive KPI Ribbon (4 Metric Cards):**
     - *Mentored Teams:* Count of guided teams from `GET /api/faculty/mentored-teams`.
     - *Pending Weekly Logs:* Friday check-ins awaiting verification from `ActionQueueDto.PendingLogsCount`.
     - *Pending Proposals:* New proposals awaiting endorsement from `ActionQueueDto.PendingProposalsCount`.
     - *Defense Panels Assigned:* Count of defense teams from `GET /api/faculty/defense-teams`.
  3. **Priority Action Queue Table:**
     - Lists actionable items sorted chronologically by `SubmittedAtUtc`.
     - Columns: `Type` (Badge: "Logbook Sign-off" or "Proposal Endorsement"), `Team Code`, `Project Title`, `Description`, `Submitted Date`, `Action Trigger`.
     - Direct Action Triggers:
       - Clicking "Verify" on a log opens `WeeklyLogInspectionDrawer`.
       - Clicking "Review" on a proposal opens `ProposalReviewDrawer`.
- **API Mapping:**
  - `GET /api/faculty/action-queue` -> Returns `ActionQueueDto`.
  - `GET /api/faculty/mentored-teams` -> Returns `List<ProjectProposalDto>`.
  - `POST /api/faculty/logs/{logId}/verify` -> Signs student logbook.
  - `POST /api/faculty/proposals/{teamId}/endorse` -> Advances proposal to Coordinator.
- **States:**
  - *Loading:* 4 metric skeleton cards + 5-row table skeleton.
  - *Empty:* `EmptyState` displaying "Action Queue Clear" ("All student proposals and weekly logs have been reviewed.").
  - *Error:* Error banner with retry button.

### 3.2 Screen 2: Mentored Teams Directory (`/faculty/teams`)
- **Route:** `/faculty/teams`
- **Component:** `FacultyTeamsView`
- **Role Access:** `Faculty`, `HOD`, `CollegeAdmin`
- **Sidebar Position:** Order 2 (`My Teams`, Icon: `Users2`)
- **Key Sections:**
  1. **Filter & Search Bar:** Search by Team Code, Project Title; Status filter (`All`, `ActiveBuild`, `PendingGuide`, `ReadyForViva`, `AtRisk`).
  2. **Teams Grid / Card View:**
     - `TeamCode` badge (e.g. `2026-CS-MIN-01`) + Project Status badge.
     - Health Badge: `At Risk` if `team.Status == ProjectStatus.AtRisk`.
     - Project Title & Abstract snippet.
     - Enrolled Student count (`MemberCount`).
     - Connected Repository link (`RepoUrl` rendered as external anchor).
     - Footer: `Open Workspace →` button navigating to `/faculty/teams/[teamId]`.
- **API Mapping:**
  - `GET /api/faculty/mentored-teams` -> Returns `List<ProjectProposalDto>`.
- **Documented Limitations:**
  - *No GitHub Commit Telemetry:* The backend has no GitHub polling or webhook infrastructure. Commit counts are removed.
  - *Sprint Tasks Progress:* Not available in `ProjectProposalDto`; card focuses on status, team code, and member count.

### 3.3 Screen 3: Dedicated Team Workspace (`/faculty/teams/[teamId]`)
- **Route:** `/faculty/teams/[teamId]`
- **Component:** `FacultyTeamWorkspaceView`
- **Role Access:** Assigned Guide, Department HOD, College Admin. (Unassigned faculty blocked with 403 Forbidden).
- **Navigation:** Deep-link accessible; includes breadcrumbs `My Teams / {TeamCode}`.
- **Sub-Tabs:**
  1. **Overview Tab:**
     - Abstract, domain tag, target UN SDG badge.
     - Repository link (`RepoUrl`) and similarity score advisory (`SimilarityScorePct`).
     - Team member count.
  2. **Proposal Dossier Tab:**
     - Complete project formulation dossier.
     - Decision actions (Endorse / Return / Reject) if status is `PendingGuide`.
  3. **Weekly Logs Tab:**
     - Displays pending logs for this team present in the Action Queue.
     - Direct sign-off triggers.
     - *Limitation Note:* Historical archive (Weeks 1–12 completed logs) is pending backend archive endpoint support.
  4. **Deliverables Vault Tab:**
     - Official 4-slot capstone table (Synopsis, MidTermPPT, PlagiarismReport, FinalThesis).
     - Status badges (`Missing`, `Uploaded`, `Verified`, `RevisionRequested`).
     - Direct actions: `Download File` (authentic binary PDF streaming) and `Verify / Request Revision`.
- **API Mapping:**
  - `GET /api/faculty/teams/{teamId}/artifacts` -> Fetches 4-slot deliverables.
  - `GET /api/artifacts/{id}/download` -> Streams authentic PDF blob.
  - `POST /api/faculty/artifacts/{id}/review` -> Attests deliverable.
  - `POST /api/faculty/proposals/{teamId}/endorse`, `return`, `reject` -> Proposal decisions.
- **States:**
  - *Forbidden (403):* Renders `<ForbiddenState>`: "You are not authorized to view this project team's workspace."

### 3.4 Screen 4: Proposal Reviews (`/faculty/proposals`)
- **Route:** `/faculty/proposals`
- **Component:** `FacultyProposalsView`
- **Role Access:** `Faculty`, `HOD`, `CollegeAdmin`
- **Sidebar Position:** Order 3 (`Proposals`, Icon: `FileText`, Badge: `pendingProposalsCount`)
- **Key Sections:**
  1. **Status Filter:** `Pending Guide Endorsement`, `Draft / Returned`, `Pending Coordinator`, `Approved / ActiveBuild`.
  2. **Proposal Cards / Table:**
     - Team Code, Title, Abstract, SDG Code, Member Count, Similarity Advisory.
     - Action Buttons:
       - `Inspect Dossier` -> Opens proposal details drawer.
       - `Endorse Proposal` -> Advances status to `PendingCoordinator`.
       - `Return for Revision` -> Prompts mandatory remarks ($\ge 5$ chars); resets team to `Draft`, unlocks roster, preserves guide.
       - `Reject Proposal` -> Prompts mandatory justification ($\ge 5$ chars); resets team to `Draft`, unlocks roster, revokes guide (`GuideUserId = null`).
- **API Mapping:**
  - `POST /api/faculty/proposals/{teamId}/endorse`
  - `POST /api/faculty/proposals/{teamId}/return`
  - `POST /api/faculty/proposals/{teamId}/reject`

### 3.5 Screen 5: Weekly Progress Logs (`/faculty/logs`)
- **Route:** `/faculty/logs`
- **Component:** `FacultyWeeklyLogsView`
- **Role Access:** `Faculty`, `HOD`, `CollegeAdmin`
- **Sidebar Position:** Order 4 (`Weekly Logs`, Icon: `Calendar`, Badge: `pendingLogsCount`)
- **Key Sections:**
  1. **Weekly Sign-Off Queue Table:**
     - Columns: `Week #`, `Team Code`, `Project Title`, `Description`, `Submitted Date`, `Action Trigger`.
  2. **Weekly Log Review Drawer (`WeeklyLogInspectionDrawer`):**
     - Full description and student accomplishments.
     - Guide Feedback textarea: mandatory if requesting revision, optional if approving.
     - Actions: `Verify & Sign Logbook` (Primary) vs `Request Revision` (Amber).
- **API Mapping:**
  - `GET /api/faculty/action-queue` -> Fetches pending logs.
  - `POST /api/faculty/logs/{logId}/verify` -> Submits verification decision with payload:
    `{ decision: "Approved" | "NeedsRevision", remarks: "..." }`.

### 3.6 Screen 6: Capstone Deliverables Review (`/faculty/deliverables`)
- **Route:** `/faculty/deliverables`
- **Component:** `FacultyDeliverablesView`
- **Role Access:** `Faculty`, `HOD`, `CollegeAdmin`
- **Sidebar Position:** Order 5 (`Deliverables`, Icon: `FileCheck2`, Badge: `pendingArtifactsCount`)
- **Key Sections:**
  1. **Deliverables Table (Aggregated across guided teams):**
     - Columns: `Team Code`, `Project Title`, `Slot Type`, `File Name`, `File Size`, `SHA-256 Checksum`, `Status Badge`, `Actions`.
  2. **Direct Actions:**
     - `Download File` -> Calls `GET /api/artifacts/{id}/download` via `apiClient.getBlob()` and triggers native browser save with real filename.
     - `Verify & Attest` -> Calls `POST /api/faculty/artifacts/{id}/review` with `{ isApproved: true }`.
     - `Request Revision` -> Opens modal prompting revision remarks; calls `POST .../review` with `{ isApproved: false, reviewerNote: "..." }`.
- **API Mapping:**
  - `GET /api/faculty/teams/{teamId}/artifacts`
  - `GET /api/artifacts/{id}/download`
  - `POST /api/faculty/artifacts/{id}/review`

### 3.7 Screen 7: Live Viva Defense & Evaluation (`/faculty/evaluations`)
- **Route:** `/faculty/evaluations`
- **Component:** `FacultyEvaluationsView`
- **Role Access:** Appointed Viva Evaluators, Department HOD, College Admin.
- **Sidebar Position:** Order 6 (`Viva Evaluations`, Icon: `GraduationCap`, Badge: `pendingDefenseCount`)
- **Key Sections:**
  1. **Defense Team Selector & Conflict-of-Interest Safeguard:**
     - Team selector dropdown populated from `GET /api/faculty/defense-teams`.
     - **Conflict of Interest Alert:**
       - If `team.IsGuideConflict == true`: Displays amber alert banner (*"Conflict of Interest Safeguard: You are the assigned Faculty Guide for this team. Evaluation scoring is restricted to independent panel evaluators."*). All score inputs and submit buttons are **strictly disabled**.
       - If `team.IsGuideConflict == false`: Displays emerald badge (*"Conflict-of-Interest Verified (Independent Evaluator)"*).
  2. **Final Viva Prerequisite Gate (when Checkpoint is `FinalViva`):**
     - Checks deliverable verification: Both `FinalThesis` and `PlagiarismReport` must be `Verified`.
     - If unverified, displays blocking warning: *"Final Viva evaluation requires verified Final Thesis and Plagiarism Report deliverables."* Submissions disabled.
  3. **Shared Project Rubric Grid (60% Weight):**
     - Evaluates project criteria (CO1–CO4 Course Outcomes):
       - Problem Formulation & Literature Review (CO1): Max 10 marks
       - Engineering Methodology & Architecture (CO2): Max 15 marks
       - Prototype Implementation & Testing (CO3): Max 15 marks
       - Viva Q&A, Presentation & Defense (CO4): Max 10 marks
     - Shared Total Score display (e.g. `45.0 / 50 raw -> 54.0 / 60 scaled`).
  4. **Individual Student Assessment Matrix (40% Weight):**
     - Student roster table where **every active student member** receives distinct individual scores:
       - `ModuleOwnershipScore` (Max 15 marks)
       - `VivaQaScore` (Max 15 marks)
       - `LogDisciplineScore` (Max 10 marks)
     - Live calculation per student:
       `Final Mark = (SharedTotalScore * 60%) + (IndividualTotalScore * 40%)`
  5. **Submission & Institutional Completion Boundary:**
     - Textarea: `Panel Evaluator Remarks`.
     - Button: `Submit & Lock Panel Marks` (Requires confirmation modal).
     - Once submitted, evaluation is marked `isLocked = true`. Inputs become read-only.
     - Displays informational notice: *"Viva evaluation marks locked and recorded. Institutional completion sign-off is pending department administration."*
- **API Mapping:**
  - `GET /api/faculty/defense-teams` -> Fetches assigned defense teams.
  - `POST /api/faculty/evaluations` -> Submits evaluation marks.

### 3.8 Screen 8: Campus Problem Bank (`/faculty/problem-bank`)
- **Route:** `/faculty/problem-bank`
- **Component:** `FacultyProblemBankView`
- **Role Access:** `Faculty`, `HOD`, `CollegeAdmin`
- **Sidebar Position:** Order 7 (`Problem Bank`, Icon: `Compass`)
- **Key Sections:**
  1. **Header & Propose Button:** `+ Propose New Problem Statement` (opens modal).
  2. **My Proposed Statements Table:**
     - Title, Abstract, Domain Tag, Target UN SDG badge, Prerequisites, Capacity, Allocation Badge (`Available` vs `Allocated to Team`).
  3. **Propose Statement Modal (`ProblemStatementModal`):**
     - Form: Title, Abstract / Technical Synopsis, Domain dropdown, Target SDG dropdown, Prerequisites CSV, Max Team Capacity (default 4).
     - *Department is resolved server-side from caller's account.*
- **API Mapping:**
  - `GET /api/faculty/problem-bank` -> Fetches statements.
  - `POST /api/faculty/problem-bank` -> Submits statement.

### 3.9 Screen 9: Coordinator Console (`/coordinator`)
- **Route:** `/coordinator`
- **Component:** `CoordinatorView`
- **Role Access:** `Faculty` with `isProjectCoordinator == true`, `HOD`, `CollegeAdmin`. (Hidden from regular faculty).
- **Sidebar Position:** Order 8 (`Coordinator Console`, Icon: `Briefcase`, Conditional).
- **Sub-Tabs:**
  1. **Student Roster Management:** Bulk CSV student import (`POST /api/coordinator/roster/import`) and single student provisioning (`POST /api/coordinator/roster/student`). Dispatches activation OTP.
  2. **Guide Allocation:** Balance mentorship quotas; assign/reassign faculty guides (`POST /api/coordinator/teams/{id}/assign-guide`).
  3. **Viva Panel Scheduling:** Schedule panels, book venues/links, and assign faculty evaluators (`POST /api/coordinator/panels`; `GET /api/coordinator/panels`).
  4. **Marksheet Export:** Generate official university tabulation register CSV (`GET /api/coordinator/export-marksheet?trackId=...`).
  5. **Governance Exceptions:** Submit exception request to HOD (`POST /api/coordinator/exceptions`).
- **Documented Correction:** Phantom endpoint `GET /api/coordinator/exceptions` is removed from `coordinatorApi.ts`.

---

## 4. API SERVICE LAYER CONTRACTS & TYPES

### 4.1 TypeScript Definitions (`web/src/lib/api/types.ts`)

```typescript
// --- FACULTY & VIVA EVALUATION TYPES ---

export type CheckpointType = "GuideContinuous" | "MidTermReview" | "FinalViva";
export type ArtifactSlotType = "Synopsis" | "MidTermPPT" | "PlagiarismReport" | "FinalThesis";
export type ArtifactStatus = "Missing" | "Uploaded" | "Verified" | "RevisionRequested";
export type ProjectStatus = "Draft" | "PendingGuide" | "PendingCoordinator" | "PendingHOD" | "ActiveBuild" | "ReadyForViva" | "Completed" | "AtRisk" | "Archived" | "Rejected";

export interface ActionQueueItemDto {
  itemId: string;
  type: "LogVerification" | "ProposalEndorsement" | "VivaDefense";
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

export interface CreateProblemStatementRequest {
  departmentId?: string;
  academicTrackId: string;
  title: string;
  abstract: string;
  sdgCode: string;
  prerequisitesCsv?: string;
  maxTeamCapacity: number;
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
```

### 4.2 Faculty API Service (`web/src/lib/api/facultyApi.ts`)

```typescript
import { apiClient } from "./client";
import {
  ActionQueueDto,
  ProjectProposalDto,
  VerifyLogRequest,
  ReturnProposalRequest,
  ArtifactSlotDto,
  ReviewArtifactRequest,
  AssignedDefenseTeamDto,
  SubmitVivaEvaluationRequest,
  ProblemBankStatement,
  CreateProblemStatementRequest
} from "./types";

export const facultyApi = {
  // Action Queue & Mentored Teams
  getActionQueue: () => apiClient.get<ActionQueueDto>("/api/faculty/action-queue"),
  getMentoredTeams: () => apiClient.get<ProjectProposalDto[]>("/api/faculty/mentored-teams"),

  // Proposal Decisions
  endorseProposal: (teamId: string) =>
    apiClient.post<{ success: boolean; teamId: string; status: string }>(`/api/faculty/proposals/${teamId}/endorse`),
  returnProposal: (teamId: string, data: ReturnProposalRequest) =>
    apiClient.post<{ success: boolean; teamId: string; status: string; isReturned: boolean; remarks: string }>(`/api/faculty/proposals/${teamId}/return`, data),
  rejectProposal: (teamId: string, data: ReturnProposalRequest) =>
    apiClient.post<{ success: boolean; teamId: string; status: string; isRejected: boolean; remarks: string }>(`/api/faculty/proposals/${teamId}/reject`, data),

  // Weekly Progress Logs
  verifyLog: (logId: string, data: VerifyLogRequest) =>
    apiClient.post<{ success: boolean; logId: string; isVerified: boolean; status: string; mentorRemarks?: string }>(`/api/faculty/logs/${logId}/verify`, data),

  // Deliverables Vault
  getTeamArtifacts: (teamId: string) =>
    apiClient.get<ArtifactSlotDto[]>(`/api/faculty/teams/${teamId}/artifacts`),
  downloadArtifact: (artifactId: string) =>
    apiClient.getBlob(`/api/artifacts/${artifactId}/download`),
  reviewArtifact: (artifactId: string, data: ReviewArtifactRequest) =>
    apiClient.post<{ success: boolean; artifactId: string; status: string; reviewerNote?: string }>(`/api/faculty/artifacts/${artifactId}/review`, data),

  // Viva Defense Evaluations
  getAssignedDefenseTeams: () =>
    apiClient.get<AssignedDefenseTeamDto[]>("/api/faculty/defense-teams"),
  submitVivaEvaluation: (data: SubmitVivaEvaluationRequest) =>
    apiClient.post<{ success: boolean; evaluationId: string; isLocked: boolean; individualScoresCount: number; isUpdated: boolean }>("/api/faculty/evaluations", data),

  // Problem Bank
  getProblemBank: () =>
    apiClient.get<ProblemBankStatement[]>("/api/faculty/problem-bank"),
  createProblemStatement: (data: CreateProblemStatementRequest) =>
    apiClient.post<ProblemBankStatement>("/api/faculty/problem-bank", data),
};
```

---

## 5. DESIGN SYSTEM & REUSABLE UI PATTERNS

The Faculty / Guide module adheres strictly to the Colabex Design System:
- **Brand Palette:** Emerald Green (`#065F46` / `#047857` / `#10B981`) as primary accent; Slate (`#0F172A` / `#1E293B`) for neutral structure; Amber (`#B45309`) for warnings/at-risk; Rose (`#BE123C`) for rejections/conflicts.
- **Card Containers:** Standard `<Card>` and `<CardHeader>` from `web/src/design-system/components/Card.tsx`.
- **Status Indicators:** Standard `<Badge>` with `dot` indicator (`Draft` -> neutral, `PendingGuide` -> warning, `ActiveBuild`/`Verified` -> success, `AtRisk`/`Rejected` -> danger, `ReadyForViva` -> info).
- **Interactive Drawers:** Standard `<SlideOverDrawer>` from `web/src/design-system/components/SlideOverDrawer.tsx` for log and proposal inspections.
- **Confirmation Modals:** Standard `<Modal>` from `web/src/design-system/components/Modal.tsx` for destructive or high-gravity operations (Reject Proposal, Return with Remarks, Submit & Lock Marks).

---

## 6. EXPLICITLY UNSUPPORTED FEATURES & DOCUMENTED BOUNDARIES

To prevent spec drift and misleading UI claims, the following capabilities are explicitly classified as unsupported:

1. **GitHub Commit Telemetry:** Colabex does NOT integrate with GitHub APIs or poll repository commit logs. `ProjectTeam.RepoUrl` is rendered as an external hyperlink. Fake commit metrics ("48 commits") are strictly prohibited.
2. **Faculty Sprint Task Board Management:** `SprintTasks` are created and managed by students in `StudentController.cs`. There are no faculty task endpoints. Faculty view will present sprint progress as read-only or omit task mutation.
3. **Historical 12-Week Logbook Archive:** `GET /api/faculty/teams/{teamId}/logs` does not exist on the backend. Screen 5 operates as an actionable verification queue.
4. **Coordinator Exception Audit Query:** `GET /api/coordinator/exceptions` does not exist on the backend. Removed from `coordinatorApi.ts`.
5. **Institutional Final Completion:** Submitting Final Viva marks locks evaluation records and retains project status at `ReadyForViva`. Final graduation/completion certification requires subsequent HOD/Admin institutional sign-off.
