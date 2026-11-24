# COLABEX — FACULTY / GUIDE MODULE
## Phase 1 Implementation Report: Backend Security Hardening & Core Workflow Contracts

**Author:** Principal Backend Engineer & Application Security Architect  
**Branch:** `integration/super-admin-college-admin`  
**Protected Baseline:** HOD Module frozen at commit `bd5bfc7`  
**Date:** November 23, 2026  
**Status:** COMPLETE & VERIFIED (99/99 Integration Tests Passing)

---

### Executive Summary

Phase 1 of the Faculty / Guide module development has successfully delivered production-grade security hardening, authorization guardrails, and core academic workflow contracts for the Colabex multi-tenant academic project management platform.

Prior to this implementation, the codebase contained critical privilege escalation vectors and authorization gaps identified during the read-only audit. Most notably, Project Coordinators could elevate student records to `SuperAdmin` or `CollegeAdmin` via CSV roster imports, unassigned students could review deliverables, evaluators could overwrite locked grades without HOD exception approvals, and guides lacked backend contracts to return proposals or request weekly log revisions with mandatory remarks.

All identified vulnerabilities and workflow gaps have been eliminated without modifying the frozen HOD module (commit `bd5bfc7`) or disturbing unstaged Super Admin and College Admin work. 21 new automated integration tests were authored, bringing the suite to 99/99 passing tests with 0 regressions.

---

### Initial Baseline & Verified Audit Findings

Before introducing any changes, the audit findings in `FACULTY_GUIDE_MODULE_AUDIT_REPORT.md` were cross-checked directly against source code and active database configurations:

| Audit Finding | Target File & Method | Pre-Implementation State | Verification Outcome | Action Taken |
| :--- | :--- | :--- | :--- | :--- |
| **P0 Privilege Escalation** | `CoordinatorController.ImportRoster` | Line 159 assigned `existing.Role = row.Role;` directly from client CSV payload. Allowed arbitrary role assignment. | **CONFIRMED CRITICAL** | Strictly forced `UserRole.Student` on new users. Prohibited modification of existing non-student accounts (`HOD`, `CollegeAdmin`, `Faculty`, `SuperAdmin`). |
| **P0 Missing Review Guard** | `ArtifactsController.ReviewArtifact` | Endpoint had bare `[Authorize]`, allowing any student to review and approve their own deliverables. | **CONFIRMED CRITICAL** | Added `[Authorize(Policy = ProjectHubPolicies.FacultyOrAbove)]`. Enforced reviewer must be assigned guide or authorized HOD/Admin. |
| **P0 Evaluation Overwrites** | `FacultyController.SubmitVivaEvaluation` | Subsequent submissions silently created conflicting evaluation records, bypassing grade finalization. | **CONFIRMED CRITICAL** | Enforced 409 Conflict if locked. Added support for updating existing evaluation when unlocked by HOD exception with atomic transaction. |
| **P1 Department Leakage** | `CoordinatorController` (All endpoints) | Trusted client-provided `DepartmentId` without verifying coordinator appointment department. | **CONFIRMED HIGH** | Implemented `ResolveCoordinatorDepartmentAsync()`. Enforced server-side department scoping across all 7 coordinator endpoints. |
| **P1 Revoked Coordinators** | `CoordinatorController` | Relied solely on JWT `is_coordinator` token claim without checking active database appointment. | **CONFIRMED HIGH** | Added DB verification of active `IsProjectCoordinator` flag; revoked coordinators receive immediate 403 Forbidden. |
| **P1 Missing Proposal Return** | `FacultyController` | Only `EndorseProposal` existed. No endpoint to return proposal to students with technical remarks. | **CONFIRMED HIGH** | Implemented `POST api/faculty/proposals/{teamId}/return` and `/reject` transitioning `PendingGuide -> Draft` with mandatory remarks. |
| **P1 Missing Log Revisions** | `FacultyController.VerifyLog` | Unconditionally set `IsVerified = true`. No support for requesting log revisions. | **CONFIRMED HIGH** | Added `Decision` parameter supporting `"NeedsRevision"` with mandatory mentor remarks and preserving unverified status. |

---

### Files Changed & Architecture Rationale

All edits were confined to non-frozen backend components:

1. **`backend/src/ProjectHub.Domain/Enums/ExceptionActionType.cs`**:
   - Added `ReturnProposal = 6` to the governance exception action enum.
   - Enables append-only audit tracking in `ExceptionAuditLog` when faculty mentors return proposals for technical revision.

2. **`backend/src/ProjectHub.Application/Common/Models/FacultyDtos.cs`**:
   - Extended `VerifyLogRequest` with `Decision` (`"Approved"` / `"NeedsRevision"`), nullable `IsApproved`, and `Remarks`.
   - Added `AssignedDefenseTeamDto` and `AssignedDefenseTeamMemberDto` for evaluator defense panel discovery.

3. **`backend/src/ProjectHub.Api/Controllers/CoordinatorController.cs`**:
   - Implemented `ResolveCoordinatorDepartmentAsync()`: Resolves coordinator department from institutional user record and enforces active DB status (`IsProjectCoordinator == true`).
   - Hardened `AddSingleStudent`: Enforces department isolation, role `Student`, and audits to `ExceptionAuditLog`. Added `[HttpPost("students")]` alias.
   - Hardened `ImportRoster`: Strictly forces `UserRole.Student` on new users; rejects role overrides; protects existing non-student accounts (`HOD`, `CollegeAdmin`, `SuperAdmin`, `Faculty`); validates department scope; adds row-level warnings. Added `[HttpPost("import-roster")]` alias.
   - Hardened `GetTeams`: Department-scoped query preventing cross-department visibility.
   - Hardened `AssignGuide`: Enforces department scoping on target team and appointed faculty mentor; validates mentor capacity; records `ExceptionAuditLog` and `PlatformAuditLog`.
   - Hardened `GetPanels` & `SchedulePanel`: Department-scoped; validates evaluators belong to institution and hold `Faculty` or `HOD` roles.
   - Hardened `RequestException`: Restricts exception requests to coordinator's assigned department.
   - Hardened `ExportMarksheet`: Scoped to coordinator department; removed synthetic mock student fallback rows.
   - Replaced all invalid `Forbid(string)` calls with standard `StatusCode(StatusCodes.Status403Forbidden, new { message = ... })`.

4. **`backend/src/ProjectHub.Api/Controllers/ArtifactsController.cs`**:
   - Added `IsUserAuthorizedToDownloadAsync()`: Restricts deliverable downloads strictly to project team members, assigned project guide, appointed panel evaluators, HOD, and institutional admins.
   - Secured `DownloadArtifact` and `DownloadArtifactBySlot` using `IsUserAuthorizedToDownloadAsync()`.
   - Added `[Authorize(Policy = ProjectHubPolicies.FacultyOrAbove)]` to `ReviewArtifact`.
   - Verified reviewer is the assigned guide for the team (or HOD/Admin) and rejected review of `ArtifactStatus.Missing` deliverables.

5. **`backend/src/ProjectHub.Api/Controllers/FacultyController.cs`**:
   - Added `ResolveCurrentUserAsync()` helper for tenant and user resolution.
   - Hardened `ReviewArtifact`: Verified deliverable is not `Missing`, reviewer is assigned guide (or HOD/Admin), and recorded `FACULTY_ARTIFACT_REVIEWED` audit event.
   - Implemented Proposal Return & Reject: `POST api/faculty/proposals/{teamId}/return` and `/reject`:
     - Validates caller is appointed guide (`team.GuideUserId == facultyId`).
     - Validates `team.Status == ProjectStatus.PendingGuide`.
     - Enforces mandatory remarks (minimum 5 characters).
     - Transitions status `PendingGuide -> Draft` and unlocks team roster (`IsRosterLocked = false`).
     - Logs to `PlatformAuditLog` (`FACULTY_PROPOSAL_RETURNED`) and `ExceptionAuditLog` (`ReturnProposal`).
   - Hardened Proposal Endorse: `POST api/faculty/proposals/{teamId}/endorse`:
     - Validates guide appointment and `PendingGuide` status.
     - Transitions to `PendingCoordinator`.
     - Logs to `PlatformAuditLog` (`FACULTY_PROPOSAL_ENDORSED`).
   - Hardened Weekly Log Verification: `POST api/faculty/logs/{logId}/verify`:
     - Validates caller is assigned guide.
     - Supports `Decision = "NeedsRevision"` (or `IsApproved = false`): requires mandatory remarks, keeps `IsVerified = false`, stamps `VerifiedByUserId`, `VerifiedAtUtc`, and `MentorRemarks`.
     - Supports `Decision = "Approved"`: marks `IsVerified = true`, stamps reviewer and remarks.
   - Implemented Defense Teams Discovery: `GET api/faculty/defense-teams` and `api/faculty/evaluations/assigned`:
     - Returns scheduled viva panel teams for the evaluator, with member breakdown, `IsGuideConflict`, and `IsEvaluationLocked` flags.
   - Protected Evaluation Immutability: `POST api/faculty/evaluations`:
     - Enforces `ConflictOfInterestGuard.EnsureNoVivaGradingConflict(evaluatorId, team.GuideUserId)` on panel defenses.
     - Checks evaluator eligibility.
     - Returns `409 Conflict` if evaluation checkpoint is already locked ("This evaluation checkpoint is locked and finalized. Modifying locked marks requires an approved Grade Unlock Exception from the Head of Department (HOD).").
     - If unlocked by HOD exception (`IsLocked == false`), updates existing evaluation and student scores atomically within database transaction and re-locks (`IsLocked = true`, `LockedAtUtc = DateTime.UtcNow`).
     - Advances `team.Status = ProjectStatus.Completed` upon final viva submission.

6. **`backend/src/ProjectHub.Infrastructure/Persistence/ProjectHubDbContext.cs`**:
   - Refined `CollegeId` immutability check: `if (collegeIdProp.IsModified && !Equals(collegeIdProp.OriginalValue, collegeIdProp.CurrentValue))`.
   - Prevents false-positive tenant isolation exceptions when EF Core soft-delete transitions (`EntityState.Deleted -> EntityState.Modified`) mark properties modified without changing partition keys.

7. **`backend/tests/ProjectHub.IntegrationTests/FacultySecurityAndWorkflowTests.cs`**:
   - Authored 21 new automated integration tests covering all Phase 1 security policies and workflow state machines.

---

### Security Hardening Detail

```
+--------------------------------------------------------------------------------------------------+
|                                    SECURITY BOUNDARY AUDIT                                       |
+--------------------------------------------------------------------------------------------------+
| 1. Coordinator Roster Import:                                                                    |
|    - Student Provisioning   ==> ALWAYS UserRole.Student (Forced server-side)                     |
|    - Role Elevation Bypass  ==> REJECTED with row-level warning log                              |
|    - Staff/Admin Accounts   ==> IMMUTABLE (Coordinator cannot alter HOD/Faculty/Admin accounts) |
|    - Department Boundary    ==> RESTRICTED (Cannot provision students outside appointed dept)    |
|                                                                                                  |
| 2. Artifact Access Control:                                                                      |
|    - Deliverable Downloads  ==> Team Members, Assigned Guide, Panel Evaluators, HOD/Admin ONLY   |
|    - Unauthorized Downloads ==> 403 Forbidden                                                    |
|    - Deliverable Reviews    ==> FacultyOrAbove Policy + Assigned Guide ONLY                      |
|    - Unsubmitted Artifacts  ==> 400 Bad Request (Cannot review ArtifactStatus.Missing)           |
|                                                                                                  |
| 3. Evaluation Finalization & Immutability:                                                       |
|    - Locked Evaluations     ==> 409 Conflict on overwrite attempt                                |
|    - Grade Revision Path    ==> Requires HOD Grade Unlock Exception                              |
|    - Unlocked Re-Evaluation ==> Atomic transaction update; re-locks upon submission              |
|    - Conflict-of-Interest   ==> Guide CANNOT grade own team on Viva Panel (400 Bad Request)      |
+--------------------------------------------------------------------------------------------------+
```

---

### API Contract Reference

| Endpoint | Method | Policy / Auth | Key Request Fields | Response Status & Structure |
| :--- | :--- | :--- | :--- | :--- |
| `/api/faculty/proposals/{teamId}/endorse` | `POST` | `FacultyOrAbove` (Guide) | None | `200 OK` `{ success: true, teamId, status: "PendingCoordinator" }` |
| `/api/faculty/proposals/{teamId}/return` | `POST` | `FacultyOrAbove` (Guide) | `Remarks` (min 5 chars) | `200 OK` `{ success: true, teamId, status: "Draft", remarks }` |
| `/api/faculty/proposals/{teamId}/reject` | `POST` | `FacultyOrAbove` (Guide) | `Remarks` (min 5 chars) | `200 OK` `{ success: true, teamId, status: "Draft", remarks }` |
| `/api/faculty/logs/{logId}/verify` | `POST` | `FacultyOrAbove` (Guide) | `Decision` ("Approved"/"NeedsRevision"), `Remarks` | `200 OK` `{ success: true, logId, isVerified, status, mentorRemarks }` |
| `/api/faculty/artifacts/{artifactId}/review` | `POST` | `FacultyOrAbove` (Guide) | `IsApproved` (bool), `ReviewerNote` | `200 OK` `{ success: true, artifactId, status, reviewerNote }` |
| `/api/faculty/defense-teams` | `GET` | `FacultyOrAbove` (Evaluator) | Query params (optional) | `200 OK` `List<AssignedDefenseTeamDto>` |
| `/api/faculty/evaluations` | `POST` | `FacultyOrAbove` (Evaluator) | `ProjectTeamId`, `CheckpointType`, `StudentScores` | `200 OK` (initial/unlocked) or `409 Conflict` (locked) |
| `/api/artifacts/{artifactId}/download` | `GET` | `[Authorize]` (Team/Guide/Panel) | None | `200 OK` (File) or `403 Forbidden` |
| `/api/coordinator/import-roster` | `POST` | `FacultyOrAbove` + Coordinator | `DepartmentId`, `Rows` | `200 OK` `RosterImportResultDto` `{ InsertedCount, Warnings }` |
| `/api/coordinator/roster/student` | `POST` | `FacultyOrAbove` + Coordinator | `DepartmentId`, `FullName`, `Email` | `200 OK` or `403 Forbidden` (cross-dept) |

---

### Test Suite Verification

The integration test suite was executed against .NET 10 LTS:

```powershell
dotnet test backend/tests/ProjectHub.IntegrationTests/ProjectHub.IntegrationTests.csproj
```

**Results:**
- **Total Tests:** 99
- **Passed:** 99
- **Failed:** 0
- **Skipped:** 0
- **Duration:** 6.0 Seconds

#### Summary of 21 New Faculty & Security Tests:

1. `Coordinator_ImportRoster_CannotEscalateRoles_StrictlyForcesStudentRole` — Verified role elevation to SuperAdmin is blocked and forced to Student with warning.
2. `Coordinator_ImportRoster_CannotOverwriteOrElevateExistingStaffOrAdminAccounts` — Verified HOD Sharma account role is preserved when targeted by CSV import.
3. `Coordinator_AddSingleStudent_CrossDepartmentAttempt_IsForbidden` — Verified cross-department student provisioning returns 403 Forbidden.
4. `Coordinator_GetTeams_IsDepartmentScoped` — Verified teams listing is scoped strictly to coordinator's department.
5. `Coordinator_RevokedCoordinator_IsRejectedImmediately` — Verified coordinator token with DB `IsProjectCoordinator = false` receives 403 Forbidden.
6. `Artifact_Review_ByStudent_IsForbidden` — Verified student cannot access deliverable review endpoint.
7. `Artifact_Review_ByUnassignedFaculty_IsForbidden` — Verified faculty who is not the assigned guide receives 403 Forbidden.
8. `Artifact_Review_ByAssignedGuide_SucceedsAndRecordsAudit` — Verified assigned guide approves deliverable, transitions status to Verified, and records audit.
9. `Artifact_Review_MissingDeliverable_IsRejectedWithBadRequest` — Verified reviewing a missing deliverable returns 400 Bad Request.
10. `Artifact_Download_UnauthorizedStudent_IsForbidden` — Verified non-team student receives 403 Forbidden on artifact download.
11. `Proposal_Endorse_ByAssignedGuide_SucceedsAndAdvancesStatus` — Verified guide endorsement advances status from PendingGuide to PendingCoordinator.
12. `Proposal_Endorse_ByNonGuide_IsForbidden` — Verified non-guide faculty endorsement returns 403 Forbidden.
13. `Proposal_Return_ByAssignedGuide_SucceedsAndUnlocksRoster` — Verified guide return resets status to Draft, unlocks roster, and creates ExceptionAuditLog.
14. `Proposal_Return_WithoutMandatoryRemarks_IsRejectedWithBadRequest` — Verified return without remarks returns 400 Bad Request.
15. `WeeklyLog_Verify_Approved_ByAssignedGuide_Succeeds` — Verified guide approval sets `IsVerified = true`, stamps mentor identity and timestamp.
16. `WeeklyLog_Verify_NeedsRevision_RequiresMandatoryRemarks` — Verified revision request without remarks returns 400 Bad Request.
17. `WeeklyLog_Verify_NeedsRevision_WithRemarks_SucceedsAndKeepsUnverified` — Verified revision request stores remarks and keeps `IsVerified = false`.
18. `VivaEvaluation_Submission_LocksEvaluation` — Verified initial evaluation locks record with timestamp and calculates individual student scores.
19. `VivaEvaluation_DuplicateLockedSubmission_IsBlockedWith409Conflict` — Verified overwrite attempt on locked evaluation returns 409 Conflict.
20. `VivaEvaluation_UnlockedByHod_AllowsReEvaluationAndReLocks` — Verified unlocked evaluation allows atomic update and re-locking without duplicates.
21. `VivaEvaluation_FinalViva_AdvancesTeamStatusToCompleted` — Verified submitting final viva evaluation advances team status to Completed.

---

### Acceptance Criteria Verification Table

| Objective | Criteria | Status | Verification Evidence |
| :--- | :--- | :--- | :--- |
| **1. Privilege Escalation** | CSV import cannot assign or alter privileged roles. Existing accounts protected. | **PASSED** | `Coordinator_ImportRoster_CannotEscalateRoles_StrictlyForcesStudentRole` & `Coordinator_ImportRoster_CannotOverwriteOrElevateExistingStaffOrAdminAccounts` |
| **2. Artifact Review Auth** | Only assigned guide (or HOD/Admin) can review. Missing deliverables rejected. | **PASSED** | `Artifact_Review_ByStudent_IsForbidden`, `Artifact_Review_ByUnassignedFaculty_IsForbidden`, `Artifact_Review_ByAssignedGuide_SucceedsAndRecordsAudit` |
| **3. Artifact Download Auth** | Team members, assigned guide, appointed panel evaluators only. | **PASSED** | `Artifact_Download_UnauthorizedStudent_IsForbidden` & `IsUserAuthorizedToDownloadAsync()` checks |
| **4. Coordinator Dept Scope** | All operations restricted to coordinator's appointed department. | **PASSED** | `Coordinator_AddSingleStudent_CrossDepartmentAttempt_IsForbidden` & `Coordinator_GetTeams_IsDepartmentScoped` |
| **5. Revocation Enforcement** | Revoked coordinator rejected even if JWT claim is present. | **PASSED** | `Coordinator_RevokedCoordinator_IsRejectedImmediately` |
| **6. Evaluation Lock Immutability** | Locked evaluations return 409 Conflict. Unlocked evaluations updated atomically. | **PASSED** | `VivaEvaluation_DuplicateLockedSubmission_IsBlockedWith409Conflict` & `VivaEvaluation_UnlockedByHod_AllowsReEvaluationAndReLocks` |
| **7. Conflict of Interest** | Assigned guide cannot evaluate own team during panel/external defenses. | **PASSED** | `ConflictOfInterestVivaTests.SubmitVivaEvaluation_GuideGradingOwnMentoredTeam_IsBlockedWithBadRequest` |
| **8. Proposal Return Workflow** | Guide can return proposal to Draft with mandatory remarks and unlock roster. | **PASSED** | `Proposal_Return_ByAssignedGuide_SucceedsAndUnlocksRoster` & `Proposal_Return_WithoutMandatoryRemarks_IsRejectedWithBadRequest` |
| **9. Proposal Endorse Workflow** | Guide can endorse proposal advancing to PendingCoordinator. | **PASSED** | `Proposal_Endorse_ByAssignedGuide_SucceedsAndAdvancesStatus` & `Proposal_Endorse_ByNonGuide_IsForbidden` |
| **10. Weekly Log Review** | Support for Approved and NeedsRevision with mandatory remarks. | **PASSED** | `WeeklyLog_Verify_Approved_ByAssignedGuide_Succeeds` & `WeeklyLog_Verify_NeedsRevision_WithRemarks_SucceedsAndKeepsUnverified` |
| **11. Worktree Preservation** | HOD module frozen at commit `bd5bfc7`. Unstaged Super Admin & College Admin work preserved. | **PASSED** | `git status` verification confirms zero destructive operations and exact baseline continuity. |

---

### Recommendations for Phase 2 (Faculty / Guide UI & Workflow Integration)

With backend contracts and security controls fully hardened and verified, Phase 2 can proceed with frontend integration:

1. **Faculty Action Queue UI**:
   - Connect the Friday log verification drawer to `POST /api/faculty/logs/{logId}/verify`, providing explicit "Approve" vs "Request Revision" action buttons and a mandatory remarks input.
   - Connect proposal endorsement and return modals to `POST /api/faculty/proposals/{teamId}/endorse` and `/return`.

2. **Artifact Review Drawer**:
   - Wire `POST /api/faculty/artifacts/{artifactId}/review` with inline PDF/PPT deliverable preview and verified status indicators.

3. **Viva Defense Grading UI**:
   - Connect the faculty defense evaluation tab to `GET /api/faculty/defense-teams` for defense schedule discovery.
   - Wire rubric scoring to `POST /api/faculty/evaluations`, displaying locked status indicators and clear guidance if an HOD Grade Unlock Exception is needed.
