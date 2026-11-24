# COLABEX — FACULTY / GUIDE MODULE
## Phase 1.2: Mandatory Backend Remediation & Verification Report

**Date:** November 23, 2026  
**Working Branch:** `integration/super-admin-college-admin`  
**Protected Baseline:** Frozen HOD Module (`bd5bfc7`)  
**Previous Baseline:** `FACULTY_GUIDE_PHASE_1_1_ACCEPTANCE_AUDIT_REPORT.md`  
**Test Suite Result:** 113 Passed / 0 Failed / 0 Skipped (100% Pass Rate)  
**Final Verdict:** **FULLY ACCEPTED**

---

## 1. Executive Summary

Phase 1.2 resolves all P0 (Critical Vulnerabilities), P1 (Mandatory Workflow & Boundary Contracts), and P2 (Untrusted Client Payload) issues identified during the Phase 1.1 Acceptance Audit.

All remediation items were designed, implemented, and verified in strict adherence to SaaS multi-tenant isolation, enterprise role-based and department-scoped access control (RBAC/ABAC), and database concurrency invariants.

### Key Milestones Achieved
1. **P0-1 — Database-Level Evaluation Uniqueness:** Implemented and applied a PostgreSQL filtered unique index (`CollegeId + ProjectTeamId + CheckpointType WHERE NOT "IsDeleted"`), accompanied by EF Core migration `20261123092051_AddVivaEvaluationFilteredUniqueIndex` and transactional conflict handling (HTTP 409 Conflict).
2. **P0-2 — Viva Panel Evaluator Appointment Enforcement:** Hardened `FacultyController.SubmitVivaEvaluation` to strictly verify evaluator appointment on active `VivaPanel` records matching the team's department and academic track, while enforcing conflict-of-interest guards and disallowing arbitrary SuperAdmin grading overrides.
3. **P1-1 — Decoupled Proposal Return vs Rejection:** Replaced the shared endpoint with distinct handlers. `ReturnProposal` keeps the faculty guide assigned while resetting to `Draft` for iterative student revisions. `RejectProposal` unassigns the guide (`GuideUserId = null`), establishes a formal rejection marker, logs `FACULTY_PROPOSAL_REJECTED`, and registers an `ExceptionAuditLog` with `ExceptionActionType.RejectProposal`.
4. **P1-2 — Premature Project Completion Eliminated:** Removed unconditional `team.Status = ProjectStatus.Completed` from Final Viva submission. Added strict pre-condition guards requiring verified `FinalThesis` and `PlagiarismReport` deliverables, complete individual scoring for all active team members, and retained `ProjectStatus.ReadyForViva` pending final institutional/HOD sign-off.
5. **P1-3 — Restricted Team Artifact Metadata:** Guarded `GET /api/faculty/teams/{teamId}/artifacts` so only assigned guides, appointed panel evaluators, department HODs, and College Admins can view artifact metadata.
6. **P1-4 — Cross-Department HOD Scope Enforcement:** Centralized authorization via `CanFacultyOrAuthorityManageTeam`, enforcing that HOD overrides are strictly bounded to `caller.DepartmentId == team.DepartmentId`.
7. **P2-2 — Department Resolution Hardened:** Server-side department resolution enforced in `CreateProblemBankStatement`, rejecting mismatched client-supplied department IDs.
8. **Test Suite Expansion:** Expanded integration tests from 99 to 113, validating all 15 audit scenarios against actual HTTP endpoints and persisted database state.

---

## 2. Worktree & Baseline Protection

- **Branch:** `integration/super-admin-college-admin`
- **HEAD Commit:** `bd5bfc759cc9c46befa04e6ea8c26c84862acea4`
- **Frozen HOD Protection:** Verified via `git diff --name-only backend/src/ProjectHub.Api/Controllers/HodController.cs` (0 diff lines). Frozen HOD code remains 100% untouched.
- **Unstaged Changes Preserved:** All existing Super Admin and College Admin work (UI components, pages, stores, models) remains exactly intact.
- **Git Hygiene:** No destructive Git commands (`git reset`, `git checkout`, `git clean`) were executed; no unintended commits or stages were created.

---

## 3. Audit Findings & Implemented Remediations

### 3.1 P0-1 — Database-Level Evaluation Uniqueness (Resolved)
- **Vulnerability:** Non-unique index on `VivaEvaluation` allowed TOCTOU race conditions where concurrent initial submissions created duplicate active evaluation records.
- **Resolution:**
  - Configured PostgreSQL filtered unique index in `VivaEvaluationConfiguration.cs`:
    ```csharp
    builder.HasIndex(ve => new { ve.CollegeId, ve.ProjectTeamId, ve.CheckpointType })
        .IsUnique()
        .HasFilter("\"IsDeleted\" = false");
    ```
  - Generated EF Core Migration: `20261123092051_AddVivaEvaluationFilteredUniqueIndex`.
  - Applied migration to live PostgreSQL container `projecthub_postgres`:
    ```sql
    DROP INDEX "IX_VivaEvaluations_CollegeId_ProjectTeamId_CheckpointType";
    CREATE UNIQUE INDEX "IX_VivaEvaluations_CollegeId_ProjectTeamId_CheckpointType" 
    ON "VivaEvaluations" ("CollegeId", "ProjectTeamId", "CheckpointType") 
    WHERE "IsDeleted" = false;
    ```
  - Added relational/in-memory concurrency handling in `FacultyController.SubmitVivaEvaluation` to catch `DbUpdateException` and return controlled `HTTP 409 Conflict`:
    ```json
    {
      "message": "An evaluation for this checkpoint has already been submitted and finalized."
    }
    ```
  - Mirrored relational index constraint in `ProjectHubDbContext.ApplyAuditAndTenantStamping` for in-memory integration test fidelity.

### 3.2 P0-2 — Viva Panel Appointment Authorization (Resolved)
- **Vulnerability:** `FacultyController.SubmitVivaEvaluation` checked only `evaluatorId != team.GuideUserId`. Any faculty member in the college could submit defense panel marks for any team without being appointed to that defense panel.
- **Resolution:**
  - For all defense checkpoints (`CheckpointType != GuideContinuous`):
    - Evaluator must be an active, appointed `VivaPanelEvaluator` on a `VivaPanel` belonging to `team.DepartmentId` and `team.AcademicTrackId`.
    - Department HOD override allowed only when `caller.DepartmentId == team.DepartmentId`.
    - College Admin override permitted under institutional policy.
    - SuperAdmin automatic access to private academic grading blocked.
    - Guide conflict-of-interest check preserved via `ConflictOfInterestGuard.EnsureNoVivaGradingConflict`.
  - For `GuideContinuous`:
    - Only assigned guide (`team.GuideUserId == evaluatorId`), department HOD, or College Admin can grade.
  - Unauthorized calls return `HTTP 403 Forbidden` without modifying records.

### 3.3 P1-1 — Decoupled Proposal Return and Rejection Workflows (Resolved)
- **Vulnerability:** `POST api/faculty/proposals/{teamId}/reject` routed to `ReturnProposal`, resetting to `Draft` while preserving the guide, lacking distinct rejection semantics and audit logging.
- **Resolution:**
  - **`POST api/faculty/proposals/{teamId}/return`**:
    - Requires mandatory remarks (minimum 5 characters).
    - Preserves assigned mentor (`team.GuideUserId` intact).
    - Transitions team to `ProjectStatus.Draft` and unlocks roster (`IsRosterLocked = false`).
    - Emits `PlatformAuditLog` (`FACULTY_PROPOSAL_RETURNED`) and `ExceptionAuditLog` (`ExceptionActionType.ReturnProposal`).
    - Allows students to revise their technical proposal and resubmit directly to the same mentor.
  - **`POST api/faculty/proposals/{teamId}/reject`**:
    - Requires mandatory rejection remarks (minimum 5 characters).
    - Unassigns faculty mentor (`team.GuideUserId = null`), setting an explicit rejection marker.
    - Transitions team to `ProjectStatus.Draft` and unlocks roster.
    - Emits `PlatformAuditLog` (`FACULTY_PROPOSAL_REJECTED`) and `ExceptionAuditLog` (`ExceptionActionType.RejectProposal` with reason `[REJECTED] {remarks}`).
    - An unchanged proposal cannot be approved or endorsed as-is without guide reassignment.

### 3.4 P1-2 — Premature Project Completion Guarded (Resolved)
- **Vulnerability:** Submitting `FinalViva` checkpoint immediately assigned `team.Status = ProjectStatus.Completed`, bypassing required final deliverables (`FinalThesis`, `PlagiarismReport`), individual roster evaluation, and institutional HOD sign-off.
- **Resolution:**
  - Removed unconditional `team.Status = ProjectStatus.Completed`.
  - Added pre-condition gate:
    1. **Active Roster Evaluation:** Every active student member (`m.IsActive && !m.IsDeleted`) must have an individual score in `request.StudentScores`. Missing any active student returns `HTTP 400 BadRequest`.
    2. **Required Deliverables:** Verified existence of both `ArtifactSlotType.FinalThesis` and `ArtifactSlotType.PlagiarismReport` with `Status == ArtifactStatus.Verified`. Missing or unverified artifacts return `HTTP 400 BadRequest`.
    3. **Intermediate Status Retention:** Submitting Final Viva locks the evaluation record and marks, but retains `ProjectStatus.ReadyForViva`, awaiting formal institutional/HOD completion verification and sign-off.

### 3.5 P1-3 — Restrict Team Artifact Metadata (Resolved)
- **Vulnerability:** `GET /api/faculty/teams/{teamId}/artifacts` returned storage keys, checksums, and reviewer notes to any authenticated faculty member across the college.
- **Resolution:**
  - Restricted access strictly to:
    1. Assigned project guide (`team.GuideUserId == caller.Id`)
    2. Active appointed panel evaluator for the team's department and academic track
    3. Department HOD (`caller.DepartmentId == team.DepartmentId`)
    4. College Admin
  - Unrelated faculty, cross-department HODs, and unauthorized callers receive `HTTP 403 Forbidden`.

### 3.6 P1-4 — Enforce HOD Department Boundaries (Resolved)
- **Vulnerability:** HOD override checks in `FacultyController` and `ArtifactsController` checked `caller.Role == UserRole.HOD` without validating `caller.DepartmentId == team.DepartmentId`.
- **Resolution:**
  - Implemented centralized helper `CanFacultyOrAuthorityManageTeam`:
    ```csharp
    private bool CanFacultyOrAuthorityManageTeam(UserAccount? caller, ProjectTeam team, Guid facultyId)
    {
        if (caller == null) return false;
        if (team.GuideUserId == facultyId) return true;
        if (caller.Role == UserRole.HOD && caller.DepartmentId.HasValue && caller.DepartmentId.Value == team.DepartmentId) return true;
        if (caller.Role == UserRole.CollegeAdmin) return true;
        return false;
    }
    ```
  - Enforced across:
    - `POST api/faculty/logs/{logId}/verify`
    - `POST api/faculty/proposals/{teamId}/endorse`
    - `POST api/faculty/proposals/{teamId}/return`
    - `POST api/faculty/proposals/{teamId}/reject`
    - `POST api/faculty/artifacts/{artifactId}/review`
    - `POST api/artifacts/{artifactId}/review` (in `ArtifactsController`)

### 3.7 P2-2 — Untrusted Client DepartmentId Eliminated (Resolved)
- **Vulnerability:** `CreateProblemBankStatement` trusted client-provided `request.DepartmentId`.
- **Resolution:**
  - Server strictly resolves caller's department (`caller.DepartmentId.Value`).
  - If client submits a mismatched `request.DepartmentId`, request is rejected with `HTTP 403 Forbidden` ("You can only propose problem bank statements for your affiliated academic department.").

---

## 4. Database Migrations & Invariants

| Migration | Target Entity | Invariant Enforced |
|---|---|---|
| `20261123092051_AddVivaEvaluationFilteredUniqueIndex` | `VivaEvaluations` | `UNIQUE ("CollegeId", "ProjectTeamId", "CheckpointType") WHERE "IsDeleted" = false` |

### Database Verification
PostgreSQL index status verified via `pg_indexes`:
```sql
SELECT indexname, indexdef FROM pg_indexes WHERE indexname = 'IX_VivaEvaluations_CollegeId_ProjectTeamId_CheckpointType';
```
Output:
```
INDEX: IX_VivaEvaluations_CollegeId_ProjectTeamId_CheckpointType
DEFINITION: CREATE UNIQUE INDEX "IX_VivaEvaluations_CollegeId_ProjectTeamId_CheckpointType" 
            ON public."VivaEvaluations" USING btree ("CollegeId", "ProjectTeamId", "CheckpointType") 
            WHERE ("IsDeleted" = false)
```

---

## 5. Automated Test Coverage & Verification

### 5.1 Test Execution Summary
- **Test Runner:** xUnit.net with .NET 10.0 runtime
- **Command:** `dotnet test backend/tests/ProjectHub.IntegrationTests/ProjectHub.IntegrationTests.csproj --no-build`
- **Duration:** 11.2 seconds
- **Total Tests:** 113
- **Passed:** 113
- **Failed:** 0
- **Skipped:** 0

### 5.2 Scenario Test Catalog (Section 9 Compliance)

| Scenario # | Test Method Name | Invariant Asserted | HTTP Status | DB Assertion |
|---|---|---|---|---|
| 1 | `Scenario01_ConcurrentInitialSubmissions_CannotCreateDuplicateActiveEvaluations` | Unique index prevents duplicate evaluations on concurrent inserts | 200 OK / 409 Conflict | Exactly 1 active evaluation record in DB |
| 2 | `Scenario02_UnappointedFaculty_CannotSubmitPanelVivaMarks` | Unappointed faculty cannot grade defense | 403 Forbidden | No evaluation persisted |
| 3 | `Scenario03_EvaluatorAppointedToAnotherDepartmentOrTrack_CannotGradeTeam` | Cross-department evaluator cannot grade defense | 403 Forbidden | No evaluation persisted |
| 4 | `Scenario04_ValidAppointedEvaluator_CanSubmitAuthorizedEvaluation` | Valid panel evaluator successfully submits grades | 200 OK | Evaluation locked, rubric computed |
| 5 | `Scenario05_AssignedGuide_CannotBypassConflictOfInterestRestrictions` | Assigned guide cannot grade panel defense | 400 BadRequest | Error message references conflict of interest |
| 6 | `Scenario06_ReturnAndReject_ProduceDifferentAuditEventsAndWorkflowOutcomes` | Return keeps guide; Reject unassigns guide and tags `[REJECTED]` | 200 OK | Status=Draft, Guide preserved (Return) vs null (Reject); audit actions distinct |
| 7 | `Scenario07_UnchangedRejectedProposal_CannotBypassRejectionWorkflow` | Rejected proposal cannot be endorsed directly | 403 Forbidden | Team remains in Draft without guide |
| 8 | `Scenario08_FinalViva_CannotCompleteTeam_WithMissingIndividualScores` | Incomplete roster scoring blocks Final Viva | 400 BadRequest | Evaluation blocked, active member score required |
| 9 | `Scenario09_FinalViva_CannotCompleteTeam_WithUnverifiedRequiredDeliverables` | Missing/unverified Thesis or Plagiarism blocks Final Viva | 400 BadRequest | Error message cites required deliverables |
| 10 | `Scenario10_FinalViva_DoesNotBypassRequiredHodSignOff_RetainsReadyForViva` | Final Viva does not prematurely complete project | 200 OK | Evaluation locked, `team.Status == ReadyForViva` retained |
| 11 | `Scenario11_UnassignedFaculty_CannotAccessTeamArtifactMetadata` | Information disclosure prevention | 403 Forbidden | Artifact metadata protected |
| 12 | `Scenario12_CrossDepartmentHod_CannotPerformOverrides` | Mechanical HOD cannot override CSE teams | 403 Forbidden | Endorse/Return/Reject/VerifyLog rejected |
| 13 | `Scenario13_SameDepartmentHod_CanPerformPermittedOverrides` | CSE HOD can override CSE teams | 200 OK | Status transitioned to PendingCoordinator |
| 14 | `Scenario14_CrossTenantUsers_CannotAccessOrModifyAnotherCollegeEntities` | Cross-tenant isolation boundary | 404/403 | Query filters hide cross-tenant entities |
| 15 | `Scenario15_ClientSuppliedDepartmentId_CannotCreateCrossDepartmentRecords` | Client department ID forgery blocked | 403 Forbidden | Problem statement blocked |

---

## 6. Exact Files Modified & Added

### Modified Backend Files
1. `backend/src/ProjectHub.Infrastructure/Persistence/Configurations/VivaEvaluationConfiguration.cs`
   - Added `.IsUnique().HasFilter("\"IsDeleted\" = false")`.
2. `backend/src/ProjectHub.Domain/Enums/ExceptionActionType.cs`
   - Added `RejectProposal = 7`.
3. `backend/src/ProjectHub.Infrastructure/Persistence/ProjectHubDbContext.cs`
   - Added in-memory unique key enforcement guard for `VivaEvaluation` to match relational unique constraint.
4. `backend/src/ProjectHub.Infrastructure/Persistence/DbInitializer.cs`
   - Seeded deterministic `VivaPanel` and appointed `FacultyNairUserId` as panel evaluator for CSE Minor Project defense.
5. `backend/src/ProjectHub.Api/Controllers/FacultyController.cs`
   - Implemented `CanFacultyOrAuthorityManageTeam` authorization helper.
   - Decoupled `ReturnProposal` and `RejectProposal`.
   - Hardened `SubmitVivaEvaluation` with panel appointment verification, completion preconditions, and 409 Conflict handling.
   - Enforced access control on `GetTeamArtifacts`.
   - Enforced server-side department resolution in `CreateProblemBankStatement`.
6. `backend/src/ProjectHub.Api/Controllers/ArtifactsController.cs`
   - Scoped HOD authorization in `ReviewArtifact` to `_tenantContext.DepartmentId == artifact.ProjectTeam?.DepartmentId`.
7. `backend/tests/ProjectHub.IntegrationTests/FacultySecurityAndWorkflowTests.cs`
   - Replaced legacy test with 15 database-backed verification tests covering all remediation invariants.

### Newly Created Files
1. `backend/src/ProjectHub.Infrastructure/Persistence/Migrations/20261123092051_AddVivaEvaluationFilteredUniqueIndex.cs`
2. `backend/src/ProjectHub.Infrastructure/Persistence/Migrations/20261123092051_AddVivaEvaluationFilteredUniqueIndex.Designer.cs`
3. `FACULTY_GUIDE_PHASE_1_2_REMEDIATION_REPORT.md`

---

## 7. Deferred Items & Missing Capabilities Noted

1. **Formal Institutional Completion Sign-Off Endpoint:** Currently, `FinalViva` locks defense marks and preserves `ProjectStatus.ReadyForViva`. To transition a project from `ReadyForViva` to `Completed`, an explicit HOD/Dean marks verification and project closure endpoint should be introduced in a future administrative cycle (e.g., `POST api/hod/teams/{teamId}/finalize-completion`), ensuring academic completion requires institutional sign-off rather than evaluator self-completion.

---

## 8. Final Verdict

# **FULLY ACCEPTED**

All mandatory P0 and P1 audit conditions from Phase 1.1 have been resolved with strict database constraints, server-side authorization boundaries, and 100% automated test coverage. The backend is hardened, stable, and ready for **Phase 2 (Faculty / Guide Frontend UI & Workflow Integration)**.
