# COLABEX — HOD MODULE IMPLEMENTATION CHANGELOG

**Project:** Colabex (Multi-tenant SaaS for Indian Engineering Colleges)  
**Module:** Head of Department (HOD) Academic & Project Governance  
**Date:** November 23, 2026  
**Status:** Implemented, Hardened & Verified  

---

## 1. Executive Summary

This changelog records the complete set of modifications, additions, and security hardenings implemented across the **Colabex** codebase for the HOD module. The objective was to transform the HOD interface and backend from a loose combination of synthetic mock data and coarse authorization checks into a production-grade academic governance system strictly scoped to the HOD's legitimate authority.

Key achievements:
- **Zero Synthetic Fallbacks:** Removed fabricated attainment metrics (82.4% / 78.6%) and synthetic dossier mark calculations. All figures are computed dynamically from actual verified database records.
- **Tenant & Tenure Enforcement:** Eliminated department ID forgery risks in `ResolveDepartmentIdAsync()` by strictly verifying that the authenticated user is the assigned HOD in `Department.HodUserId` and possesses active, un-relieved tenure in `HodAppointmentHistories`.
- **Precondition & Audit Integrity:** Fixed proposal approval state jumps; added immutable `PlatformAuditLog` and `ExceptionAuditLog` entries for all approvals, rejections, returns, and guide reassignments.
- **Resolved Exception Mutation Bug (`BUG-01`):** Approving a `ReassignGuide` exception now updates the target team's `GuideUserId` and records the transition history.
- **Clean Role Boundaries:** Removed College Admin faculty onboarding forms (`+ Add Faculty Member`) from the HOD UI. HOD retains mentor capacity configuration and coordinator toggles without usurping HR onboarding.
- **Full TypeScript & Next.js Type Safety:** Synchronized all client types and API wrappers with backend C# DTOs; Next.js 16 build passes with zero errors.

---

## 2. Backend Modifications

### A. Data Transfer Objects (`backend/src/ProjectHub.Application/Common/Models/HodDtos.cs`)

1. **`HodDashboardDto`**:
   - Added:
     - `projectsWithoutGuide: int`: Count of active teams where `GuideUserId == null`.
     - `pendingProposals: int`: Count of teams awaiting HOD approval (`Status == ProjectStatus.PendingHOD`).
     - `pendingGradeUnlocks: int`: Count of pending grade recalculation requests.
     - `pendingExceptions: int`: Count of pending exception overrides.
     - `completedTeams: int`: Count of finalized teams.
     - `draftTeams: int`: Count of student teams still drafting proposals.
     - `sarAttestedAtUtc: DateTime?`: Audit timestamp of department SAR attestation.
2. **`HodProjectDto` & `HodProjectMemberDto`**:
   - Created dedicated project governance DTOs with team code, domain tag, SDG code, track info, guide assignment, roster lock status, missed log streak, similarity score, member list with lead status and module responsibilities.
3. **`HodAssignGuideRequest`**:
   - Direct guide allocation and reassignment payload (`GuideUserId`, optional `Reason`).
4. **`GradeUnlockRequestDto`, `ApproveGradeUnlockRequest`, `RejectGradeUnlockRequest`**:
   - DTOs for reviewing and approving/rejecting faculty grade unlock requests with audit remarks.
5. **`DepartmentStudentResultDto`**:
   - Tabulation register DTO reflecting temporal score checkpoints (Guide Continuous 30%, Mid-Term Defense 30%, External Final Viva 40%), final percentage marks, letter grades, and NBA threshold attainment status.
6. **`HodReportsSummaryDto`, `TrackReportStatDto`, `DomainDistributionDto`**:
   - Statistical aggregation DTOs powering the HOD Reports dashboard.

---

### B. Controller & Endpoints (`backend/src/ProjectHub.Api/Controllers/HodController.cs`)

1. **`ResolveDepartmentIdAsync()` (Security Hardening):**
   - *Previous behavior:* If a `DepartmentId` was present in claims or query, it queried `_db.Departments.FirstOrDefaultAsync(d => d.Id == deptId && d.CollegeId == collegeId.Value)`. Any user with a valid college token and a known department ID could query department data.
   - *Hardened behavior:* Requires caller to be the active HOD:
     ```csharp
     var isAppointed = await _db.Departments
         .AnyAsync(d => d.Id == deptId && d.CollegeId == collegeId.Value && d.HodUserId == userId.Value);
     if (!isAppointed) return (null, Forbid("User is not the appointed HOD for this department."));

     var activeTenure = await _db.HodAppointmentHistories
         .AnyAsync(h => h.DepartmentId == deptId && h.HodUserId == userId.Value && h.IsCurrent && h.RelievedAtUtc == null);
     if (!activeTenure) return (null, Forbid("HOD tenure for this department has ended or is inactive."));
     ```
2. **`GetDashboard()` (`GET /api/hod/dashboard`):**
   - Eliminated hardcoded fallback percentages (`82.4m`, `78.6m`). If no evaluations exist, returns honest `0m` with `isSarAttested = false`.
   - Aggregated real actionable counts for `projectsWithoutGuide`, `pendingProposals`, `pendingGradeUnlocks`, and `pendingExceptions`.
3. **`GetProjects()` (`GET /api/hod/projects`):**
   - New endpoint supporting filtering by `status`, `trackId`, `search`, `hasGuide`, and `isAtRisk`. Returns members with roles and latest defense scores.
4. **`AssignGuide()` (`POST /api/hod/projects/{teamId}/assign-guide`):**
   - New endpoint allowing direct guide allocation or reassignment.
   - Validates guide existence, department affiliation, and mentor team capacity limits (`FacultyProfile.MaxTeams`).
   - If reassigning, creates an `ExceptionAuditLog` entry documenting previous guide ID, new guide ID, and mandatory reason.
   - Writes immutable `PlatformAuditLog` record (`Action = "ReassignGuide"` / `"AssignGuide"`).
5. **`ApproveProposal()` & `RejectProposal()` (`POST /api/hod/proposals/{teamId}/approve` & `reject`):**
   - Enforced strict state precondition: `team.Status == ProjectStatus.PendingHOD`.
   - Rejection requires `Remarks`.
   - Both actions write immutable `PlatformAuditLog` entries.
6. **`ApproveException()` (`POST /api/hod/exceptions/{id}/approve`):**
   - Fixed `BUG-01`: When approving a `ReassignGuide` exception, now updates `team.GuideUserId = record.TargetUserId.Value` and updates `team.UpdatedAtUtc`.
7. **`GetGradeUnlockRequests()`, `ApproveGradeUnlock()`, `RejectGradeUnlock()` (`/api/hod/grade-unlocks/*`):**
   - Enabled HOD governance over faculty evaluation unlock requests. Unlocking resets `EvaluationRecord.IsLocked = false` and increments `UnlockCount`.
8. **`GetDepartmentResults()` (`GET /api/hod/results`):**
   - Generates tabular consolidated grade register for all department students across 30/30/40 checkpoints with letter grading and NBA attainment status.
9. **`GetNbaAttainmentReport()` (`GET /api/hod/nba-attainment`):**
   - Computes PO1–PO12 direct attainment from actual evaluation records and indirect attainment from student exit surveys. Replaced synthetic offsets (`+1.6m`, `-0.6m`).
10. **`ExportNbaDossierZip()` (`GET /api/hod/export-dossier-zip`):**
    - Generates multi-file ZIP archive adhering strictly to audit file naming:
      - `00_NBA_CO_PO_Attainment_Matrix.csv`
      - `01_RGPV_Consolidated_Marksheet.csv`
      - `02_Audit_Sample_Dossiers/{teamCode}_Dossier.md`
11. **`GetReportsSummary()` (`GET /api/hod/reports-summary`):**
    - Aggregates real department project statistics, track breakdown, domain distribution, and faculty workload averages.

---

## 3. Database & Entity Interactions

No destructive schema migrations were performed. Existing database models and relationships were leveraged and respected:
- `Departments`: `HodUserId` matched against caller `User.Id`.
- `HodAppointmentHistories`: Verified active tenure (`IsCurrent == true && RelievedAtUtc == null`).
- `ProjectTeams`: Controlled status transitions (`Draft` → `PendingHOD` → `ActiveBuild` / `Rejected`). Mutated `GuideUserId` during allocation and exception approval.
- `FacultyProfiles`: Enforced `MaxTeams` capacity check during guide assignment.
- `ExceptionAuditLogs`: Recorded guide reassignments, timeline extensions, and roster modifications.
- `EvaluationRecords`: Managed `IsLocked` flag and `UnlockCount` during grade unlock approvals.
- `PlatformAuditLogs`: Recorded immutable audit entries for all governance actions with actor ID, college ID, and IP address.

---

## 4. Frontend Modifications

### A. TypeScript API Client (`web/src/lib/api/types.ts` & `hodApi.ts`)
- Added TypeScript types: `HodDashboardDto`, `HodProjectDto`, `HodProjectMemberDto`, `HodAssignGuideRequest`, `GradeUnlockRequestDto`, `ApproveGradeUnlockRequest`, `RejectGradeUnlockRequest`, `DepartmentStudentResultDto`, `HodReportsSummaryDto`, `TrackReportStatDto`, `DomainDistributionDto`, `AttestSarResponse`.
- Added API methods to `hodApi`:
  - `getProjects(params)`
  - `assignGuide(teamId, data)`
  - `getProposals()`
  - `approveProposal(teamId)`
  - `rejectProposal(teamId, remarks)`
  - `getGradeUnlocks()`
  - `approveGradeUnlock(id, remarks)`
  - `rejectGradeUnlock(id, reason)`
  - `getDepartmentResults()`
  - `getReportsSummary()`
  - `attestSar()`

### B. Route Configuration (`web/src/navigation/routeRegistry.ts`)
- Configured 6 primary HOD sidebar routes matching the product specification:
  1. Overview (`/hod`)
  2. Projects (`/hod/projects`)
  3. Faculty & Guides (`/hod/faculty`)
  4. Approvals Queue (`/hod/approvals`)
  5. Department Quality (`/hod/quality`, with `/hod/nba` aliased)
  6. Reports (`/hod/reports`)

### C. Dedicated HOD Feature Screens (`web/src/features/hod/HODView.tsx` & Pages)
- **`web/src/app/(dashboard)/hod/projects/page.tsx`**: Renders `HODView` initialized to `projects` tab.
- **`web/src/app/(dashboard)/hod/reports/page.tsx`**: Renders `HODView` initialized to `reports` tab.
- **`web/src/app/(dashboard)/hod/quality/page.tsx`**: Renders `HODView` initialized to `quality` tab.
- **`web/src/app/(dashboard)/hod/nba/page.tsx`**: Aliased to quality view.
- **`HODView.tsx`**:
  - Replaced hardcoded fallback state with dynamic API data loaded via `Promise.allSettled()`.
  - Added full search, filter, and guide assignment modal to Projects view.
  - Added Grade Unlock approvals with review remarks and approval modal.
  - Added Department Quality view displaying genuine PO attainment and SAR attestation status.
  - Added Tabulation Register reports view with direct CSV download.
  - Removed duplicate "+ Add Faculty Member" onboarding modal, preserving College Admin role boundaries.

---

## 5. Security & Isolation Hardening Summary

| Area | Vulnerability / Issue | Implemented Fix |
|---|---|---|
| **Department Resolution** | Any user with a valid token could query arbitrary department IDs within the college | Enforced `department.HodUserId == userId` AND active `HodAppointmentHistory` tenure |
| **Relieved HOD Access** | HOD whose tenure ended could continue performing governance actions | Verified `RelievedAtUtc == null && IsCurrent == true` |
| **College Admin Boundary** | HOD could theoretically invoke College Admin endpoints if role was loosely checked | Integration tests verified 403 Forbidden on all College Admin endpoints |
| **Proposal State Machine** | Proposals could be approved from `Draft` without coordinator review | Required `team.Status == ProjectStatus.PendingHOD` precondition |
| **Guide Assignment History** | Guide changes overwrote `GuideUserId` without audit history | Created `ExceptionAuditLog` and `PlatformAuditLog` capturing previous guide ID |
| **Exception Override Bug** | Approving `ReassignGuide` exception did not update team's `GuideUserId` | Fixed `ApproveException` to update `team.GuideUserId = record.TargetUserId.Value` |
| **Audit Logging** | Approvals and rejections had no immutable audit trail | Added `PlatformAuditLog` entries for all approval and rejection actions |

---

## 6. Verification Status

- **Backend Integration Tests:** `dotnet test backend/ProjectHub.slnx` — **73 Passed, 0 Failed, 0 Skipped**.
- **Frontend Typecheck & Build:** `npm --prefix web run build` — Verified.
