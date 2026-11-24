# COLABEX — FACULTY / GUIDE PHASE 1.1
## Independent Backend Acceptance Audit & Workflow Contract Verification Report

**Auditor:** Principal SaaS Architect, Senior Backend Engineer, Application Security Auditor & Independent QA Lead  
**Working Branch:** `integration/super-admin-college-admin`  
**Protected Baseline:** Frozen HOD Module at commit `bd5bfc7`  
**Prior Implementation Report:** `FACULTY_GUIDE_PHASE_1_IMPLEMENTATION_REPORT.md`  
**Date of Audit:** November 23, 2026  
**Audit Scope:** Read-only independent verification of source code, database constraints, authorization policies, state-machine transitions, and automated test suite.

---

## 1. Executive Verdict

### **VERDICT: ACCEPTED WITH CONDITIONS**

The Phase 1 backend implementation successfully resolved the primary P0 security vulnerabilities documented in the original audit report:
1. **Coordinator Privilege Escalation:** Successfully closed; student role is strictly enforced on imports, and existing staff/admin accounts cannot be modified.
2. **Coordinator Department Scope:** Successfully enforced across all 7 coordinator endpoints, with real-time verification of active coordinator database status.
3. **Artifact Review Authorization:** Successfully restricted to assigned guides and authorized authorities; missing deliverable review is rejected.
4. **Artifact Download Authorization:** Restricted to authorized team members, assigned guides, panel evaluators, and institutional administrators.
5. **Locked Evaluation Overwrite Protection:** Direct duplicate submissions on locked evaluations are successfully rejected with `409 Conflict`.
6. **Automated Test Suite:** All 99 integration tests pass cleanly in 22 seconds with zero test regressions.

**CONDITIONS PRECEDENT TO CLOSING PHASE 1 & BEGINNING PHASE 2:**
While the initial security patches hold, this independent audit identified **two P0 security/concurrency gaps** and **four P1 academic workflow defects** that must be resolved before Phase 2 UI development can begin:
- **Condition 1 (P0):** Add a database-level filtered unique constraint on `VivaEvaluation(CollegeId, ProjectTeamId, CheckpointType)` where `!IsDeleted` to prevent race-condition duplicate inserts under concurrent submissions.
- **Condition 2 (P0):** Enforce in `FacultyController.SubmitVivaEvaluation` that the calling faculty member is an appointed evaluator on an active `VivaPanel` covering the target team's department and track (currently, any non-guide faculty in the institution can submit defense grades).
- **Condition 3 (P1):** Establish distinct business semantics, audit trails, and status transitions for `POST /api/faculty/proposals/{teamId}/reject` versus `return` (currently both endpoints map to the identical handler and silently transition the team to `Draft`).
- **Condition 4 (P1):** Replace scattered 2-line `team.Status = ProjectStatus.Completed` assignments in `SubmitVivaEvaluation` with a centralized completion guard that verifies required deliverables (`FinalThesis`, `PlagiarismReport`), milestone completion, and individual evaluation of all enrolled members.
- **Condition 5 (P1):** Restrict `GET /api/faculty/teams/{teamId}/artifacts` so that unassigned faculty cannot view private artifact metadata and reviewer notes across departments.
- **Condition 6 (P1):** Validate department alignment when HOD accounts exercise administrative overrides in `FacultyController` (`VerifyLog`, `EndorseProposal`, `ReturnProposal`, `ReviewArtifact`).

---

## 2. Git & Worktree Preservation Evidence

Inspection of Git status confirms that the working directory remains in compliance with strict worktree protection rules:

```powershell
git status --short; git branch --show-current; git rev-parse HEAD
```

**Output Verification:**
- **Branch:** `integration/super-admin-college-admin`
- **HEAD Commit:** `bd5bfc759cc9c46befa04e6ea8c26c84862acea4` (Matches frozen HOD commit baseline)
- **HOD Module Status:** 100% UNTOUCHED. No files in `backend/src/ProjectHub.Api/Controllers/HodController.cs`, `HodDtos.cs`, or HOD views were modified or staged.
- **Super Admin & College Admin Work:** All unstaged files and existing modifications were preserved without modification.
- **Destructive Operations:** Zero calls to `git reset`, `git checkout`, `git clean`, or `git restore`.
- **Commit Status:** Zero unauthorized commits created.

---

## 3. Detailed Audit Findings Grouped by Severity

```
+----------------------------------------------------------------------------------------------------+
|                                    AUDIT FINDINGS BY SEVERITY                                      |
+------+-------------------------------------------------------------+-------------------------------+
| ID   | Finding Title                                               | Impacted Component            |
+------+-------------------------------------------------------------+-------------------------------+
| P0-1 | Non-Unique Index Allows Concurrent Duplicate Evaluations    | VivaEvaluationConfiguration   |
| P0-2 | Unappointed Faculty Can Grade Defense Without VivaPanel     | FacultyController             |
| P1-1 | Proposal Reject Silently Acts as Return for Revision        | FacultyController             |
| P1-2 | Final Viva Completion Bypasses All Academic Preconditions   | FacultyController             |
| P1-3 | Team Artifacts Metadata Exposed to All College Faculty      | FacultyController             |
| P1-4 | HOD Overrides Lack Department Boundary Verification         | FacultyController             |
| P2-1 | Re-Evaluation Overwrites Prior Marks Without Historical Log | FacultyController             |
| P2-2 | Problem Statement Proposal Trusts Client DepartmentId       | FacultyController             |
| P3-1 | Missing Negative Cross-Tenant Integration Tests for Faculty | FacultySecurityAndWorkflowTests|
+------+-------------------------------------------------------------+-------------------------------+
```

---

### Finding P0-1: Non-Unique Index Allows Concurrent Duplicate Evaluations

- **Exact File:** `backend/src/ProjectHub.Infrastructure/Persistence/Configurations/VivaEvaluationConfiguration.cs`
- **Line Reference:** Line 28
- **Current Code:**
  ```csharp
  builder.HasIndex(ve => new { ve.CollegeId, ve.ProjectTeamId, ve.CheckpointType });
  ```
- **Vulnerability / Architectural Flaw:**
  The index is non-unique. While `FacultyController.SubmitVivaEvaluation` performs an application-level check (`var existingEval = await _context.VivaEvaluations.FirstOrDefaultAsync(...)`), this check is subject to a Time-of-Check to Time-of-Use (TOCTOU) race condition. If two HTTP requests arrive concurrently (e.g., dual evaluator submission or network retry before the first request commits), both queries find `existingEval == null`. Both requests proceed to `_context.VivaEvaluations.AddAsync(evaluation)` and commit. Because the database index lacks `.IsUnique()`, PostgreSQL will accept both inserts, corrupting the gradebook with duplicate evaluations for the same checkpoint.
- **Required Fix:**
  Add a filtered unique index:
  ```csharp
  builder.HasIndex(ve => new { ve.CollegeId, ve.ProjectTeamId, ve.CheckpointType })
      .IsUnique()
      .HasFilter("NOT \"IsDeleted\"");
  ```

---

### Finding P0-2: Unappointed Faculty Can Grade Defense Without VivaPanel Appointment

- **Exact File:** `backend/src/ProjectHub.Api/Controllers/FacultyController.cs`
- **Line Reference:** Lines 424–444 (`SubmitVivaEvaluation`)
- **Current Code:**
  ```csharp
  if (request.CheckpointType != CheckpointType.GuideContinuous)
  {
      try
      {
          ConflictOfInterestGuard.EnsureNoVivaGradingConflict(evaluatorId, team.GuideUserId);
      }
      catch (InvalidOperationException ex)
      {
          return BadRequest(new { message = ex.Message });
      }
  }
  ```
- **Vulnerability / Security Flaw:**
  While the conflict-of-interest check properly prevents the assigned guide from grading panel defenses, **there is no check verifying that `evaluatorId` was actually appointed to a `VivaPanel` for this team**.
  By contrast, `ArtifactsController.IsUserAuthorizedToDownloadAsync` (lines 58–64) explicitly queries `VivaPanelEvaluators` to verify panel appointment:
  ```csharp
  var isEvaluator = await _context.VivaPanelEvaluators
      .Include(e => e.VivaPanel)
      .AnyAsync(e => e.EvaluatorUserId == userId &&
                     e.VivaPanel != null &&
                     e.VivaPanel.DepartmentId == team.DepartmentId &&
                     e.VivaPanel.AcademicTrackId == team.AcademicTrackId &&
                     !e.IsDeleted && !e.VivaPanel.IsDeleted);
  ```
  In `FacultyController.SubmitVivaEvaluation`, any faculty member in the college who is not the team guide can construct a JSON payload with any `projectTeamId` and submit locked defense marks for any department.
- **Required Fix:**
  For checkpoints other than `GuideContinuous`, verify that `evaluatorId` belongs to an active `VivaPanel` covering `team.DepartmentId` and `team.AcademicTrackId`, or holds administrative HOD/Admin privileges in that department.

---

### Finding P1-1: Proposal Reject Silently Acts as Return for Revision

- **Exact File:** `backend/src/ProjectHub.Api/Controllers/FacultyController.cs`
- **Line Reference:** Lines 228–230 (`ReturnProposal`)
- **Current Code:**
  ```csharp
  [HttpPost("proposals/{teamId}/return")]
  [HttpPost("proposals/{teamId}/reject")]
  public async Task<IActionResult> ReturnProposal(Guid teamId, [FromBody] ReturnProposalRequest? request)
  {
      ...
      team.Status = ProjectStatus.Draft;
      team.IsRosterLocked = false;
      ...
      audit.Action = "FACULTY_PROPOSAL_RETURNED";
      excAudit.ActionType = ExceptionActionType.ReturnProposal;
      ...
  }
  ```
- **Business Logic & Workflow Defect:**
  Both endpoints route to the exact same handler and perform the identical status mutation (`ProjectStatus.Draft`) and audit logging (`ReturnProposal`).
  In academic SaaS workflows:
  1. **Return for Revision (`return`):** Proposal topic is acceptable but requires technical or scope amendments. Team remains intact, revises draft, and resubmits to guide.
  2. **Outright Rejection (`reject`):** Proposal is rejected due to plagiarism, infeasibility, violation of academic standards, or complete mismatch. The proposal cannot simply be resubmitted as-is.
  Currently, a faculty mentor clicking "Reject" generates an audit log claiming the proposal was "Returned" (`FACULTY_PROPOSAL_RETURNED`), leaving HOD and Coordinator dashboards unable to detect that a rejection took place.
- **Required Decision & Contract:**
  - If a rejected proposal requires formulating a new project from scratch, `team.Status` should transition to an explicit terminal state or `Archived`, or `team.Status` should transition to `Draft` but record an explicit `ExceptionActionType.RejectProposal` and `PlatformAuditLog` (`FACULTY_PROPOSAL_REJECTED`) with a flag requiring guide/coordinator re-endorsement before resubmission.

---

### Finding P1-2: Final Viva Completion Bypasses All Academic Preconditions

- **Exact File:** `backend/src/ProjectHub.Api/Controllers/FacultyController.cs`
- **Line Reference:** Lines 501–504 and Lines 576–579
- **Current Code:**
  ```csharp
  if (request.CheckpointType == CheckpointType.FinalViva)
  {
      team.Status = ProjectStatus.Completed;
  }
  ```
- **Academic Governance Flaw:**
  This is the sole location in the entire backend where projects are transitioned to `Completed`. It operates with zero academic preconditions:
  1. **Missing Final Thesis:** It does not check if `ArtifactSlotType.FinalThesis` or `PlagiarismReport` has been submitted or verified. A team with no uploaded report can be marked `Completed`.
  2. **Incomplete Student Roster:** It does not verify that `request.StudentScores` contains marks for all active team members. If a team has 4 members and the evaluator only grades 1 member, the project is marked `Completed`, leaving remaining students with no viva marks.
  3. **Missing Preceding Checkpoints:** It does not check whether `MidTermReview` or continuous evaluation took place.
  4. **No Centralized Policy:** Completion logic is an ad-hoc 2-line assignment inside a grading controller rather than a domain-driven completion service.
- **Recommended Completion Guard State Machine:**
  ```mermaid
  stateDiagram-v2
      [*] --> ReadyForViva: All Artifacts Verified & Tasks Completed
      ReadyForViva --> Evaluated: Final Viva Marks Submitted (All Members)
      Evaluated --> Completed: HOD Department Final Sign-Off / Marks Verified
      Evaluated --> GradeUnlocked: HOD Grade Unlock Exception
      GradeUnlocked --> Evaluated: Re-Evaluation Submitted
  ```

---

### Finding P1-3: Team Artifacts Metadata Exposed to All College Faculty

- **Exact File:** `backend/src/ProjectHub.Api/Controllers/FacultyController.cs`
- **Line Reference:** Lines 609–636 (`GetTeamArtifacts`)
- **Current Code:**
  ```csharp
  [HttpGet("teams/{teamId}/artifacts")]
  public async Task<ActionResult<List<ArtifactSlotDto>>> GetTeamArtifacts(Guid teamId)
  {
      var collegeId = _tenantContext.CollegeId!.Value;
      var team = await _context.ProjectTeams
          .Include(t => t.Artifacts)
          .FirstOrDefaultAsync(t => t.Id == teamId && t.CollegeId == collegeId && !t.IsDeleted);

      if (team == null) return NotFound(new { message = "Team not found." });
      ...
  }
  ```
- **Authorization Boundary Gap:**
  The endpoint only verifies tenant isolation (`team.CollegeId == collegeId`). Any faculty member across the entire institution (e.g., Mechanical Engineering) can call this endpoint with a CSE team ID and view the team's internal deliverable metadata, file names, internal storage keys, SHA-256 checksums, and private mentor notes.
- **Required Fix:**
  Enforce team association: Caller must be the assigned guide (`team.GuideUserId == facultyId`), an appointed panel evaluator, or an authorized HOD/Admin within the team's department.

---

### Finding P1-4: HOD Overrides Lack Department Boundary Verification

- **Exact File:** `backend/src/ProjectHub.Api/Controllers/FacultyController.cs`
- **Line Reference:** Lines 133, 188, 241, 650
- **Current Code:**
  ```csharp
  var caller = await ResolveCurrentUserAsync();
  var isHodOrAdmin = caller != null && (caller.Role == UserRole.HOD || caller.Role == UserRole.CollegeAdmin || caller.Role == UserRole.SuperAdmin);
  if (team.GuideUserId != facultyId && !isHodOrAdmin)
  {
      return StatusCode(StatusCodes.Status403Forbidden, ...);
  }
  ```
- **Department Boundary Gap:**
  If an HOD from Electrical Engineering (ECE) calls these FacultyController endpoints with a CSE team ID, `caller.Role == UserRole.HOD` evaluates to `true`. Because there is no check that `caller.DepartmentId == team.DepartmentId`, an ECE HOD can endorse proposals, return proposals, verify weekly logs, and review deliverables belonging to another department.
- **Required Fix:**
  Refine the check:
  ```csharp
  var isDepartmentAuthority = caller != null && (
      caller.Role == UserRole.CollegeAdmin || 
      caller.Role == UserRole.SuperAdmin || 
      (caller.Role == UserRole.HOD && caller.DepartmentId == team.DepartmentId));
  ```

---

### Finding P2-1: Re-Evaluation Overwrites Prior Marks Without Historical Log

- **Exact File:** `backend/src/ProjectHub.Api/Controllers/FacultyController.cs`
- **Line Reference:** Lines 484–499
- **Current Behavior:**
  When an evaluation is unlocked by HOD exception and revised marks are submitted, existing `IndividualStudentScore` records are removed and new ones inserted, while `existingEval` fields are updated in-place. The previous scores, rubric breakdown, and remarks are not archived into an audit snapshot or history table.
- **Remediation Recommendation:**
  Before modifying `existingEval`, capture a JSON snapshot of the existing scores and rubric into `PlatformAuditLog` or an `EvaluationRevisionHistory` entity.

---

### Finding P2-2: Problem Statement Proposal Trusts Client DepartmentId

- **Exact File:** `backend/src/ProjectHub.Api/Controllers/FacultyController.cs`
- **Line Reference:** Lines 319–330 (`CreateProblemBankStatement`)
- **Current Behavior:**
  `statement.DepartmentId = request.DepartmentId;` adopts client input without checking that the faculty member belongs to `request.DepartmentId`.
- **Remediation Recommendation:**
  Resolve department from `caller.DepartmentId` and reject mismatched client input.

---

### Finding P3-1: Missing Negative Cross-Tenant Integration Tests for Faculty

- **Impacted File:** `backend/tests/ProjectHub.IntegrationTests/FacultySecurityAndWorkflowTests.cs`
- **Gap:**
  All 21 tests execute against `SistecTenantId`. There is no negative test verifying that a JWT token from `BmsceTenantId` calling `POST /api/faculty/evaluations` or `POST /api/faculty/proposals/{teamId}/return` on a SISTec team is rejected with `404 Not Found` or `403 Forbidden`.

---

## 4. Test Quality & Verification Audit

### Automated Test Run Evidence

The test suite was re-run using `dotnet test` in non-destructive read-only mode:

```powershell
dotnet test backend/tests/ProjectHub.IntegrationTests/ProjectHub.IntegrationTests.csproj --no-build
```

**Execution Results:**
- **Status:** PASSED (Exit Code: 0)
- **Total Tests:** 99
- **Passed:** 99
- **Failed:** 0
- **Skipped:** 0
- **Duration:** 22.0 Seconds

### Analysis of the 21 Phase 1 Tests

| Test Name | DB Assertion Quality | Authorization Behavior Tested | Missing Boundary Coverage |
| :--- | :--- | :--- | :--- |
| `Coordinator_ImportRoster_CannotEscalateRoles_StrictlyForcesStudentRole` | Asserts DB `user.Role == UserRole.Student` | Prohibits role escalation | None |
| `Coordinator_ImportRoster_CannotOverwriteOrElevateExistingStaffOrAdminAccounts` | Asserts DB `hod.Role == UserRole.HOD` | Protects privileged staff | None |
| `Coordinator_AddSingleStudent_CrossDepartmentAttempt_IsForbidden` | Asserts HTTP 403 | Department boundary | None |
| `Coordinator_GetTeams_IsDepartmentScoped` | Asserts all DB `team.DepartmentId == Cse` | Query department scoping | None |
| `Coordinator_RevokedCoordinator_IsRejectedImmediately` | Asserts HTTP 403 on revoked user | Real-time revocation | None |
| `Artifact_Review_ByStudent_IsForbidden` | Asserts HTTP 403 | Role policy (`FacultyOrAbove`) | None |
| `Artifact_Review_ByUnassignedFaculty_IsForbidden` | Asserts HTTP 403 | Ownership check | None |
| `Artifact_Review_ByAssignedGuide_SucceedsAndRecordsAudit` | Asserts DB status & `PlatformAuditLog` | Guide approval flow | None |
| `Artifact_Review_MissingDeliverable_IsRejectedWithBadRequest` | Asserts HTTP 400 | Artifact state validation | None |
| `Artifact_Download_UnauthorizedStudent_IsForbidden` | Asserts HTTP 403 | Team membership | None |
| `Proposal_Endorse_ByAssignedGuide_SucceedsAndAdvancesStatus` | Asserts DB status & `PlatformAuditLog` | State transition flow | Invalid status transition |
| `Proposal_Endorse_ByNonGuide_IsForbidden` | Asserts HTTP 403 | Guide ownership | None |
| `Proposal_Return_ByAssignedGuide_SucceedsAndUnlocksRoster` | Asserts DB status, roster & `ExceptionAuditLog` | Return workflow | Distinct reject behavior |
| `Proposal_Return_WithoutMandatoryRemarks_IsRejectedWithBadRequest` | Asserts HTTP 400 on whitespace | Input validation | None |
| `WeeklyLog_Verify_Approved_ByAssignedGuide_Succeeds` | Asserts DB `IsVerified`, stamps & remarks | Approval workflow | None |
| `WeeklyLog_Verify_NeedsRevision_RequiresMandatoryRemarks` | Asserts HTTP 400 on empty remarks | Input validation | None |
| `WeeklyLog_Verify_NeedsRevision_WithRemarks_SucceedsAndKeepsUnverified` | Asserts DB `IsVerified = false` & remarks | Revision workflow | None |
| `VivaEvaluation_Submission_LocksEvaluation` | Asserts DB `IsLocked = true` & scores | Evaluation locking | Preceding checkpoints |
| `VivaEvaluation_DuplicateLockedSubmission_IsBlockedWith409Conflict` | Asserts HTTP 409 & error text | Immutability check | Concurrent race condition |
| `VivaEvaluation_UnlockedByHod_AllowsReEvaluationAndReLocks` | Asserts DB updated, re-locked, single record | Unlock & update flow | Score revision history |
| `VivaEvaluation_FinalViva_AdvancesTeamStatusToCompleted` | Asserts DB `team.Status == Completed` | Status advancement | Deliverable preconditions |

---

## 5. Phase 2 UI Implementation Blockers

The following items will cause runtime failures or architectural rework during Phase 2 frontend development if not addressed:

1. **Defense Grading Form Submissions:** The frontend Viva Grading form relies on scheduled defense discovery. Without P0-2 resolved, any logged-in faculty member could submit evaluations for any team, creating confusing UI states and audit breaches.
2. **Proposal Return vs Rejection UI:** The faculty proposal modal requires distinct "Request Revisions" and "Reject Proposal" buttons. Currently, both invoke endpoints that produce the identical response and status, preventing the UI from rendering a distinct rejected state.
3. **Artifact Review Drawer Data Leakage:** The Artifact Drawer opens via `GET /api/faculty/teams/{teamId}/artifacts`. Without P1-3 resolved, direct URL navigation allows any faculty member to inspect unassigned student deliverables.

---

## 6. Actionable Acceptance Plan for Phase 1 Closure

To transition from **ACCEPTED WITH CONDITIONS** to **FULLY ACCEPTED**:

```
+-----+----------+---------------------------------------------------------------------------------+
| Seq | Priority | Action Item                                                                     |
+-----+----------+---------------------------------------------------------------------------------+
| 1   | P0       | Add filtered unique index on VivaEvaluations(CollegeId, TeamId, CheckpointType) |
| 2   | P0       | Add VivaPanel appointment verification in FacultyController.SubmitVivaEvaluation|
| 3   | P1       | Split Return and Reject proposal semantics and add RejectProposal audit action  |
| 4   | P1       | Add deliverable & roster completeness check before marking Project Completed    |
| 5   | P1       | Restrict GET /api/faculty/teams/{teamId}/artifacts to assigned guide/evaluators  |
| 6   | P1       | Enforce HOD department alignment on FacultyController administrative overrides   |
| 7   | P2       | Add snapshotting of prior marks in PlatformAuditLog during re-evaluation        |
+-----+----------+---------------------------------------------------------------------------------+
```

---

*Report authored independently following read-only source inspection, database configuration audit, and test execution. No files were modified, committed, or deleted.*
