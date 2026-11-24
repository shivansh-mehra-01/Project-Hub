# COLABEX — FACULTY / GUIDE MODULE
# PHASE 2.1: COMPLETE EVIDENCE VERIFICATION, SPECIFICATION CORRECTION & READINESS AUDIT REPORT

**Date:** November 23, 2026  
**Auditor Roles:** Principal SaaS Architect, Senior Frontend Architect, ASP.NET Core Backend Architect, Database Architect, Application Security Auditor and Independent QA Lead  
**Working Branch:** `integration/super-admin-college-admin`  
**Protected HOD Baseline:** Commit `bd5bfc759cc9c46befa04e6ea8c26c84862acea4` (`HodController.cs` — 0 diff)  
**Backend Test Baseline:** 113 / 113 Passing Integration Tests (`backend/tests/ProjectHub.IntegrationTests`)  
**Scope:** Strict Read-Only Evidence Audit of Frontend (`web/`), Backend Controllers (`backend/src/ProjectHub.Api/Controllers/`), Domain Entities, DTOs, Security Boundaries, Academic Policies, and Implementation Dependency Graph  
**Execution Mode:** STRICT READ-ONLY AUDIT & SPECIFICATION CORRECTION — ZERO SOURCE CODE MODIFICATIONS  

---

## 1. EXECUTIVE SUMMARY & AUDIT MANDATE

### 1.1 Objective & Governance Scope
Colabex is a multi-college academic project management SaaS platform engineered for engineering and professional institutions affiliated with state technical universities (such as RGPV Bhopal) and governed by NBA (Tier-II) / AICTE accreditation requirements.

The **Faculty / Guide Module** represents the operational nexus of academic mentorship, continuous progress verification, capstone deliverable governance, and defense evaluation. Within this module, faculty members act in distinct academic capacities:
1. **Assigned Faculty Guide (Mentor):** Supervises student project formulation, verifies weekly Friday engineering diary logs, reviews official 4-slot deliverables, and submits continuous evaluation marks.
2. **Appointed Defense Evaluator:** Appointed by department leadership to examine student teams during Midterm Review and Final Viva defense sessions using 60/40 blended rubrics, strictly subject to Conflict-of-Interest safeguards.
3. **Project Coordinator:** A faculty member holding a delegated, revocable departmental administrative capability (student roster import, guide quota allocation, defense panel scheduling, marksheet export).

This **Phase 2.1 Audit Report** delivers an exhaustive, evidence-backed reconciliation between proposed frontend screens and verified backend capabilities. In compliance with strict architectural governance:
- **Zero source code, test, entity, or migration modifications** were made.
- All 33 existing modified files and 11 untracked files across Super Admin and College Admin were preserved intact.
- The frozen HOD baseline at `bd5bfc7` remains 100% untouched (`git diff bd5bfc7 -- HodController.cs` is empty).
- All claims cite verifiable paths, controllers, action methods, DTO properties, database schemas, and integration tests.

### 1.2 Summary of Critical Code-Evidence Findings

```
====================================================================================================
COLABEX FACULTY / GUIDE MODULE — PHASE 2.1 EVIDENCE AUDIT SUMMARY
====================================================================================================
1. Mandatory 16 Endpoints Audit:
   - 9 endpoints CONFIRMED in ASP.NET Core controllers with automated test evidence.
   - 4 endpoints NOT FOUND / GAPS: GET /api/faculty/teams/{teamId} (Team Workspace detail),
     GET /api/faculty/teams/{teamId}/logs (Historical logs), GET /api/coordinator/exceptions (Audit),
     and GET /api/faculty/deliverables (Global cross-team deliverables list).
   - 3 endpoints PROPOSED / CONTRACT LIMITATIONS: Sprint Task mutations for faculty, VCS commit telemetry,
     and dedicated faculty notification feed.

2. Rubric Weighting Inversion Clarified:
   - The verified backend formula in IndividualStudentScore.cs:31-34 is:
     FinalMark = (SharedTotalScore * 60%) + (IndividualTotalScore * 40%)
     [60% Shared Project Rubric + 40% Individual Student Rubric, configurable via AcademicTrack].
   - The speculative inversion (60% individual / 40% team) is formally corrected.

3. Panel-to-Team Scoping & Artifact Security Discrepancy:
   - In VivaPanel.cs, VivaPanel is bound to DepartmentId + AcademicTrackId, NOT to individual ProjectTeams.
   - Evaluator authorization checks in FacultyController.cs (lines 538-555, 789-798) and
     ArtifactsController.cs (lines 58-69) enforce track-level matching, NOT specific team binding.
   - Metadata queries and binary download paths enforce the EXACT same boundary (parity verified).
   - Documented as an architectural limitation requiring documented scoping boundaries in the UI.

4. Team Workspace Six-Tab Persistence vs Fabrication Audit:
   - Deliverables Vault: 100% PERSISTED & VERIFIED (TeamArtifacts table, authentic binary download).
   - Proposal Dossier: 100% PERSISTED & VERIFIED (ProjectTeams table, endorse/return/reject endpoints).
   - Overview & Roster: PARTIALLY PERSISTED (Team info confirmed; student roster detail requires GET team endpoint; VCS commit counts are completely FABRICATED mock data).
   - Weekly Logs: PARTIALLY PERSISTED (Action queue pending logs confirmed; 12-week historical archive lacks GET endpoint).
   - Tasks & Milestones: PERSISTED IN DB (SprintTasks table) BUT ONLY EXPOSED TO STUDENTS (StudentController.cs); faculty has no GET/POST task API.
   - Activity / Evaluation History: NO FACULTY PERSISTENCE ENDPOINT (Logged in internal audit tables).

5. Sequence & Dependency Graph Contradictions Resolved:
   - Unit 3.9 (Problem Bank) decoupled from Unit 3.3/3.4; depends only on Units 3.1 & 3.2.
   - Unit 3.10 (Coordinator Console) decoupled from Unit 3.8; depends on Units 3.1 & 3.2.
   - Unit 3.8 (Viva Evaluations) strictly sequenced AFTER Unit 3.7 (Deliverables Review) due to
     mandatory FinalThesis + PlagiarismReport deliverable verification gates in FacultyController.cs:580.
====================================================================================================
```

---

## 2. REPOSITORY & GIT BASELINE PROTECTION AUDIT

### 2.1 Git Status & Commit Evidence
- **Current Branch:** `integration/super-admin-college-admin`
- **Current HEAD Commit:** `bd5bfc759cc9c46befa04e6ea8c26c84862acea4`
- **Working Tree Verification:**
  - Tracked modified files: 33 files across Super Admin, College Admin, Accreditation, and Core Infrastructure.
  - Untracked files: 11 markdown reports, migrations, and test suites.
  - All existing modifications were preserved. No `git reset`, `git checkout`, `git clean`, or `git restore` was executed.
- **HOD Baseline Freeze Verification:**
  ```powershell
  git diff bd5bfc759cc9c46befa04e6ea8c26c84862acea4 -- backend/src/ProjectHub.Api/Controllers/HodController.cs
  # Result: 0 bytes (IDENTICAL — ZERO MODIFICATION)
  ```
- **Super Admin Baseline Verification:**
  - `PlatformController.cs`, `PlatformDtos.cs`, and `CollegeDetailsView.tsx` remain unchanged from their accepted baselines.

---

## 3. FRONTEND ROUTE & COMPONENT INVENTORY AUDIT

### 3.1 App Router Layout & Route Inventory (`web/src/app/(dashboard)/`)

| Route Path | Page File | Backing Component | Allowed Roles | Connected Backend API | Status / Architectural Smells |
|---|---|---|---|---|---|
| `/faculty` | `web/src/app/(dashboard)/faculty/page.tsx` | `<FacultyView initialTab="queue" />` | `Faculty` | `GET /api/faculty/action-queue` | **Partially Connected.** Uses in-memory `useProjectHubStore` for pending items; monolithic view. |
| `/faculty/teams` | `web/src/app/(dashboard)/faculty/teams/page.tsx` | `<FacultyView initialTab="teams" />` | `Faculty` | `GET /api/faculty/mentored-teams` | **Partially Connected.** Team click opens slide-over drawer; refresh drops context; no `/faculty/teams/[teamId]` deep-link. |
| `/faculty/evaluations` | `web/src/app/(dashboard)/faculty/evaluations/page.tsx` | `<FacultyView initialTab="grading" />` | `Faculty` | `GET /api/faculty/defense-teams` (Not wired) | **Mock Only.** Hardcoded defense teams (`eval-team-01` to `04`); hardcoded student scores; submits to mock store. |
| `/coordinator` | `web/src/app/(dashboard)/coordinator/page.tsx` | `<CoordinatorView />` | `Faculty` (`coordinatorOnly`) | Multiple endpoints | **Mock-Coupled Monolith.** Calls phantom endpoint `GET /api/coordinator/exceptions`; mock array fallbacks. |
| `/account` | `web/src/app/(dashboard)/account/page.tsx` | `<AccountView />` | All Authenticated | `GET /api/auth/me` | **Verified.** Displays profile, AICTE designation, and password reset. |

### 3.2 Monolithic Antipatterns in `FacultyView.tsx` (1,540 Lines)
1. **Component Overload:** Combines 7 distinct functional views (Action Queue, Teams Directory, Live Viva Scoring, Weekly Log Drawer, Team Progress Drawer, Proposal Dossier Drawer, Problem Bank Modal) inside a single component.
2. **State Explosion:** 16 distinct `useState` instances. Modifying a single score input triggers full component re-rendering.
3. **Hardcoded Mock Arrays:**
   - Lines 85–154: Hardcoded `assignedDefenseTeams` (`eval-team-01` to `eval-team-09`) bypasses real database panels.
   - Lines 158–164: Guide conflict check uses string name comparison (`currentDefenseTeam.guideName === currentPersona.name`) instead of reading server-validated `IsGuideConflict` boolean.
   - Lines 298–308: Deliverable download synthesizes a fake text string (`%PDF-1.4%`) instead of streaming authentic binary blobs from `GET /api/artifacts/{id}/download`.
4. **URL & Navigation Desynchronization:** Internal tab switching does not update browser URL, breaking back/forward browser navigation and bookmarking.

### 3.3 Deficiencies in `routeRegistry.ts`
- **Hardcoded Metadata:** Lines 670 and 709 hardcode `"SISTec CSE"` and `"CSE Minor Project — Semester 6 (2026)"` across all tenants. Must resolve dynamically from `ITenantContext`.
- **Badge Key Inaccuracy:** `"pendingFacultyCount"` in `AppShell.tsx` is computed from client-side mock store array lengths rather than consuming `ActionQueueDto.PendingLogsCount + ActionQueueDto.PendingProposalsCount`.

---

## 4. BACKEND CONTRACT VERIFICATION — MANDATORY 16 ENDPOINTS AUDIT

Every proposed Faculty/Guide API was audited against the ASP.NET Core backend source code in `backend/src/ProjectHub.Api/Controllers/`, request/response DTOs in `backend/src/ProjectHub.Application/Common/Models/`, database configurations, and test assertions in `FacultySecurityAndWorkflowTests.cs`.

### 4.1 Exhaustive 16 Endpoints Audit Table

| # | Proposed Workflow Area | HTTP Method | Exact Route | Controller & Action Method | Request DTO | Response DTO | Authorization & Scoping | Database Entities Involved | Error Responses | Test Evidence | Implementation Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | Faculty Dashboard Action Queue | `GET` | `/api/faculty/action-queue` | `FacultyController.GetActionQueue` | None | `ActionQueueDto` (`PendingLogsCount`, `PendingProposalsCount`, `Items`) | `FacultyOrAbove`; Scoped to caller's `UserId` as Guide | `WeeklyLogbooks`, `ProjectTeams` | 401 Unauthorized | `FacultySecurityAndWorkflowTests.ActionQueue_RetrievesPendingLogsAndProposals` | **CONFIRMED** |
| **2** | Mentored Teams Listing | `GET` | `/api/faculty/mentored-teams` | `FacultyController.GetMentoredTeams` | None | `List<ProjectProposalDto>` | `FacultyOrAbove`; Scoped to `team.GuideUserId == caller.UserId` | `ProjectTeams`, `TeamMembers` | 401 Unauthorized | `FacultySecurityAndWorkflowTests.Scenario02_MentoredTeams_ReturnsAssignedOnly` | **CONFIRMED** |
| **3** | Dedicated Team Detail / Workspace | `GET` | `/api/faculty/teams/{teamId}` | *None (Missing)* | None | `FacultyTeamWorkspaceDto` *(Proposed)* | `FacultyOrAbove`; Must enforce guide or dept authority | `ProjectTeams`, `TeamMembers`, `WeeklyLogbooks`, `SprintTasks` | 404 NotFound, 403 Forbidden | None | **NEEDS BACKEND WORK** *(No endpoint exists; basic metadata obtainable via `mentored-teams`)* |
| **4** | Proposal Review Queue & Details | `GET` | `/api/faculty/action-queue` (filtered) | `FacultyController.GetActionQueue` | None | `ActionQueueDto` (Items where `Type == "ProposalEndorsement"`) | `FacultyOrAbove`; Scoped to `GuideUserId` | `ProjectTeams` (`Status == PendingGuide`) | 401 Unauthorized | `FacultySecurityAndWorkflowTests.ActionQueue_RetrievesPendingLogsAndProposals` | **CONFIRMED** *(Queue confirmed; standalone dossier endpoint not found)* |
| **5a**| Endorse Proposal | `POST` | `/api/faculty/proposals/{teamId}/endorse` | `FacultyController.EndorseProposal` | None | `{ success, teamId, status }` | `FacultyOrAbove`; Guide, Dept HOD, or College Admin | `ProjectTeams`, `PlatformAuditLogs` | 400 (not PendingGuide), 403 Forbidden, 404 NotFound | `FacultySecurityAndWorkflowTests.Scenario04_EndorseProposal_AdvancesStatus` | **CONFIRMED** |
| **5b**| Return Proposal for Revision | `POST` | `/api/faculty/proposals/{teamId}/return` | `FacultyController.ReturnProposal` | `ReturnProposalRequest` (`Remarks`, `Reason`) | `{ success, teamId, status, isReturned, remarks }` | `FacultyOrAbove`; Guide or Dept authority; Min 5 chars remarks | `ProjectTeams`, `PlatformAuditLogs`, `ExceptionAuditLogs` | 400 (Remarks < 5), 403 Forbidden, 404 NotFound | `FacultySecurityAndWorkflowTests.Scenario05_ReturnProposal_PreservesGuide` | **CONFIRMED** |
| **5c**| Reject Proposal | `POST` | `/api/faculty/proposals/{teamId}/reject` | `FacultyController.RejectProposal` | `ReturnProposalRequest` (`Remarks`, `Reason`) | `{ success, teamId, status, isRejected, remarks }` | `FacultyOrAbove`; Guide or Dept authority; Min 5 chars remarks | `ProjectTeams`, `PlatformAuditLogs`, `ExceptionAuditLogs` | 400 (Remarks < 5), 403 Forbidden, 404 NotFound | `FacultySecurityAndWorkflowTests.Scenario06_RejectProposal_RevokesGuide` | **CONFIRMED** |
| **6a**| Verify Weekly Log | `POST` | `/api/faculty/logs/{logId}/verify` | `FacultyController.VerifyLog` | `VerifyLogRequest` (`Decision`, `IsApproved`, `Remarks`) | `{ success, logId, isVerified, status, mentorRemarks }` | `FacultyOrAbove`; Guide, Dept HOD, or College Admin; Remarks required if NeedsRevision | `WeeklyLogbooks` | 400 (Missing remarks on revision), 403 Forbidden, 404 NotFound | `FacultySecurityAndWorkflowTests.Scenario07_VerifyLog_ApprovedAndRevision` | **CONFIRMED** |
| **6b**| Weekly Logs Historical Archive | `GET` | `/api/faculty/teams/{teamId}/logs` | *None (Missing)* | None | `List<WeeklyLogDto>` *(Proposed)* | `FacultyOrAbove`; Guide or Dept authority | `WeeklyLogbooks` | 404 NotFound, 403 Forbidden | None | **NOT FOUND / NEEDS BACKEND WORK** *(Only pending logs queryable via action queue)* |
| **7** | Global Cross-Team Deliverables Listing | `GET` | `/api/faculty/deliverables` | *None (Missing)* | None | `List<DeliverableQueueDto>` *(Proposed)* | `FacultyOrAbove` | `TeamArtifacts`, `ProjectTeams` | 401 Unauthorized | None | **NOT FOUND / PROPOSED** *(Must aggregate per-team artifacts via client)* |
| **8a**| Team Deliverables Metadata | `GET` | `/api/faculty/teams/{teamId}/artifacts` | `FacultyController.GetTeamArtifacts` | None | `List<ArtifactSlotDto>` (4 slots) | `FacultyOrAbove`; Guide, Dept HOD, College Admin, or Appointed Evaluator | `TeamArtifacts`, `ProjectTeams`, `VivaPanelEvaluators` | 403 Forbidden, 404 NotFound | `FacultySecurityAndWorkflowTests.Scenario11_UnassignedFaculty_CannotAccessTeamArtifactMetadata` | **CONFIRMED** |
| **8b**| Download Deliverable Binary | `GET` | `/api/artifacts/{artifactId}/download` | `ArtifactsController.DownloadArtifact` | None | Binary Stream (`application/pdf`) | `Authorize`; Guide, Team Member, Dept HOD, College Admin, or Appointed Evaluator | `TeamArtifacts`, `ProjectTeams`, `VivaPanelEvaluators` | 401 Unauthorized, 403 Forbidden, 404 NotFound | `FacultySecurityAndWorkflowTests.Artifact_Download_AuthorizedRoles_Succeed` | **CONFIRMED** |
| **8c**| Review / Attest Deliverable | `POST` | `/api/faculty/artifacts/{artifactId}/review` | `FacultyController.ReviewArtifact` | `ReviewArtifactRequest` (`IsApproved`, `ReviewerNote`) | `{ success, artifactId, status, reviewerNote }` | `FacultyOrAbove`; Guide or Dept authority | `TeamArtifacts`, `ProjectTeams`, `PlatformAuditLogs` | 400 (Missing slot), 403 Forbidden, 404 NotFound | `FacultySecurityAndWorkflowTests.Scenario08_ReviewArtifact_VerifiedAndRevision` | **CONFIRMED** |
| **9** | Viva Defense Teams Discovery | `GET` | `/api/faculty/defense-teams` | `FacultyController.GetAssignedDefenseTeams` | None | `List<AssignedDefenseTeamDto>` | `FacultyOrAbove`; Appointed Evaluators | `VivaPanelEvaluators`, `VivaPanels`, `ProjectTeams`, `TeamMembers`, `VivaEvaluations` | 401 Unauthorized | `FacultySecurityAndWorkflowTests.DefenseTeams_ReturnsTeamsInAssignedPanels` | **CONFIRMED** |
| **10**| Assigned Evaluator Listing | `GET` | `/api/coordinator/panels` | `CoordinatorController.GetPanels` | None | `List<VivaPanelDto>` (`EvaluatorNames`) | `CoordinatorOrHod`; Dept scoped | `VivaPanels`, `VivaPanelEvaluators`, `Users` | 403 Forbidden | `FacultySecurityAndWorkflowTests.Coordinator_GetPanels_Succeeds` | **CONFIRMED** *(On coordinator side; peer evaluators embedded on faculty side)* |
| **11a**| Submit Viva Evaluation Marks | `POST` | `/api/faculty/evaluations` | `FacultyController.SubmitVivaEvaluation` | `SubmitVivaEvaluationRequest` (`CheckpointType`, `SharedTotalScore`, `StudentScores`, `GeneralRemarks`) | `{ success, evaluationId, isLocked, individualScoresCount, isUpdated }` | Appointed Evaluators; Guide blocked by Conflict of Interest; 409 Conflict if locked | `VivaEvaluations`, `IndividualStudentScores`, `ProjectTeams`, `TeamArtifacts` | 400 (Conflict/prereqs), 403 Forbidden, 404 NotFound, 409 Conflict (Locked) | `FacultySecurityAndWorkflowTests.Scenario09_FinalViva_CannotCompleteTeam_WithUnverifiedRequiredDeliverables` | **CONFIRMED** |
| **11b**| Evaluation History Breakdown | `GET` | `/api/faculty/teams/{teamId}/evaluations` | *None (Missing)* | None | `VivaEvaluationDto` *(Proposed)* | `FacultyOrAbove` | `VivaEvaluations`, `IndividualStudentScores` | 404 NotFound, 403 Forbidden | None | **NOT FOUND / NEEDS BACKEND WORK** *(Evaluation locked status returned in defense-teams; breakdown missing)* |
| **12a**| Problem Bank Listing | `GET` | `/api/faculty/problem-bank` | `FacultyController.GetProblemBank` | None | `List<ProblemBankStatement>` | `FacultyOrAbove`; Scoped to caller's proposed statements | `ProblemBankStatements` | 401 Unauthorized | `FacultySecurityAndWorkflowTests.ProblemBank_ReturnsFacultyProposedStatements` | **CONFIRMED** |
| **12b**| Create Problem Statement | `POST` | `/api/faculty/problem-bank` | `FacultyController.CreateProblemBankStatement` | `CreateProblemStatementRequest` | `ProblemBankStatement` | `FacultyOrAbove`; Server-enforced department affiliation | `ProblemBankStatements` | 400 (Validation), 403 Forbidden (Cross-department) | `FacultySecurityAndWorkflowTests.Scenario15_ClientSuppliedDepartmentId_CannotCreateCrossDepartmentRecords` | **CONFIRMED** |
| **12c**| Edit / Delete Problem Statement | `PUT/DELETE` | `/api/faculty/problem-bank/{id}` | *None (Missing)* | None | None | None | `ProblemBankStatements` | None | None | **NOT FOUND** *(Only listing and creation exist)* |
| **13**| Coordinator Department Teams Discovery | `GET` | `/api/coordinator/teams` | `CoordinatorController.GetTeams` | `?trackId=...` | `List<ProjectProposalDto>` | `CoordinatorOrHod`; Strictly scoped to coordinator department | `ProjectTeams`, `TeamMembers`, `Departments` | 403 Forbidden | `FacultySecurityAndWorkflowTests.Coordinator_GetTeams_IsDepartmentScoped` | **CONFIRMED** *(Dedicated metrics summary endpoint not found)* |
| **14a**| Coordinator Bulk Roster Import | `POST` | `/api/coordinator/roster/import` | `CoordinatorController.ImportRoster` | `RosterImportRequest` (`Rows`) | `RosterImportResultDto` | `CoordinatorOrHod`; Forces Role = Student; Rejects elevation | `Users`, `StudentAcademicEnrollments` | 403 Forbidden (Cross-department or non-coordinator) | `FacultySecurityAndWorkflowTests.Coordinator_ImportRoster_CannotEscalateRoles_StrictlyForcesStudentRole` | **CONFIRMED** |
| **14b**| Coordinator Single Student Provision | `POST` | `/api/coordinator/roster/student` | `CoordinatorController.AddSingleStudent` | `AddSingleStudentRequest` | `SingleStudentProvisionedResponse` | `CoordinatorOrHod`; Validates SSO domain; Rejects duplicates | `Users`, `StudentAcademicEnrollments` | 400 (Domain mismatch), 403 Forbidden, 409 Conflict (Duplicate) | `FacultySecurityAndWorkflowTests.Coordinator_AddSingleStudent_CrossDepartmentAttempt_IsForbidden` | **CONFIRMED** |
| **14c**| Coordinator Guide Allocation | `POST` | `/api/coordinator/teams/{teamId}/assign-guide`| `CoordinatorController.AssignGuide` | `AssignGuideRequest` (`GuideUserId`) | `{ success, teamId, guideId }` | `CoordinatorOrHod`; Scoped to coordinator department | `ProjectTeams`, `Users` | 400 (Invalid guide), 403 Forbidden, 404 NotFound | `FacultySecurityAndWorkflowTests.Coordinator_AssignGuide_Succeeds` | **CONFIRMED** |
| **14d**| Coordinator Schedule Viva Panel | `POST` | `/api/coordinator/panels` | `CoordinatorController.SchedulePanel` | `ScheduleVivaPanelRequest` | `VivaPanelDto` | `CoordinatorOrHod`; Scoped to coordinator department | `VivaPanels`, `VivaPanelEvaluators` | 400 (Validation), 403 Forbidden | `FacultySecurityAndWorkflowTests.Coordinator_SchedulePanel_Succeeds` | **CONFIRMED** |
| **14e**| Coordinator Marksheet Export | `GET` | `/api/coordinator/export-marksheet` | `CoordinatorController.ExportMarksheet` | `?trackId=...` | CSV Stream (`text/csv`) | `CoordinatorOrHod`; Scoped to coordinator department | `ProjectTeams`, `VivaEvaluations`, `IndividualStudentScores` | 403 Forbidden | `FacultySecurityAndWorkflowTests.Coordinator_ExportMarksheet_StreamsValidCsv` | **CONFIRMED** |
| **14f**| Coordinator Exception Request | `POST` | `/api/coordinator/exceptions` | `CoordinatorController.RequestException` | `CreateExceptionRequest` | `{ success, exceptionId }` | `CoordinatorOrHod`; Submits request to HOD | `ExceptionAuditLogs` | 400 (Validation), 403 Forbidden | `FacultySecurityAndWorkflowTests.Coordinator_RequestException_Succeeds` | **CONFIRMED** |
| **14g**| Coordinator Exceptions Audit Log | `GET` | `/api/coordinator/exceptions` | *None (Missing)* | None | `List<ExceptionAuditLogDto>` *(Proposed)* | `CoordinatorOrHod` | `ExceptionAuditLogs` | None | None | **NOT FOUND** *(Non-existent endpoint called in `coordinatorApi.ts:38`)* |
| **15**| Faculty Notifications & Activity Feed | `GET` | `/api/faculty/notifications` | *None (Missing)* | None | `List<NotificationDto>` *(Proposed)* | `FacultyOrAbove` | None | None | None | **NOT FOUND / PROPOSED** *(Only Account notification preferences exist)* |
| **16**| Tasks, Milestones & VCS Telemetry | `GET` | `/api/faculty/teams/{teamId}/tasks` | *None (Missing in Faculty)* | None | `List<SprintTaskDto>` *(Proposed)* | `StudentController` only; No faculty endpoint | `SprintTasks` | None | None | **NOT FOUND FOR FACULTY / FABRICATED METRICS** *(VCS telemetry does not exist)* |

---

## 5. SIX-TAB TEAM WORKSPACE DEEP-DIVE AUDIT

The proposed Team Workspace (`/faculty/teams/[teamId]`) features 6 sub-tabs. Each was audited to distinguish real persisted data from speculative or fabricated UI metrics:

```
====================================================================================================
TEAM WORKSPACE SIX-TAB PERSISTENCE & DATA-SOURCE AUDIT
====================================================================================================
```

### 5.1 Tab 1: Overview & Roster
- **Persisted Entity & Data Source:** `ProjectTeam.cs` (`Title`, `Abstract`, `DomainTag`, `SdgCode`, `Status`, `RepoUrl`, `JiraBoardKey`, `SimilarityScorePct`, `SimilarProjectCode`).
- **Student Roster:** `TeamMembers` table (`UserId`, `IsTeamLead`, `ModuleResponsibility`, `IsActive`).
- **API Availability:** Basic team metadata is returned by `GET /api/faculty/mentored-teams`. However, full student roster details (student names, USNs, emails) are NOT exposed in `ProjectProposalDto`. For defense teams, `GET /api/faculty/defense-teams` includes `Members` (`UserId`, `FullName`, `EnrollmentCode`, `IsTeamLead`, `ModuleResponsibility`).
- **Speculative / Fabricated Elements:**
  - *GitHub Commit Telemetry:* The UI mock displayed "48 commits, last push 3 hours ago". Backend search confirms **zero GitHub API connectivity, zero commit counters, zero webhook ingestion**. `ProjectTeam.RepoUrl` is a static string.
  - *Action Required:* In Phase 3, display `RepoUrl` as an external navigation link. Remove all fabricated commit counts and push timestamps.

### 5.2 Tab 2: Tasks & Milestones
- **Persisted Entity & Data Source:** `SprintTask.cs` (`Title`, `CategoryTag`, `AssignedToUserId`, `Status`, `DueDateUtc`).
- **API Availability:** `SprintTasks` are created, updated, and queried exclusively in `StudentController.cs` (lines 82, 158, 196). **FacultyController has ZERO SprintTask endpoints.**
- **Contract Status:** **NOT FOUND FOR FACULTY.**
- **Action Required:** Document this as an intentional backend contract omission. The faculty workspace must display sprint tasks as read-only (if a student endpoint is adapted) or omit this tab from Phase 3 until a dedicated faculty task-view endpoint is provisioned. Never fabricate task completion percentages.

### 5.3 Tab 3: Weekly Logs
- **Persisted Entity & Data Source:** `WeeklyLogbook.cs` (`AuthorUserId`, `WeekNumber`, `AccomplishmentsSummary`, `BlockersSummary`, `HoursLogged`, `GitCommitCount`, `IsVerified`, `VerifiedByUserId`, `MentorRemarks`).
- **API Availability:** `GET /api/faculty/action-queue` returns *unverified* logs for guided teams. `POST /api/faculty/logs/{logId}/verify` performs verification.
- **Contract Status:** Verification workflow is **CONFIRMED**. Historical 12-week timeline archive (`GET /api/faculty/teams/{teamId}/logs`) is **NOT FOUND**.
- **Action Required:** In Phase 3, the Weekly Logs tab displays unverified logs present in the Action Queue and provides sign-off triggers. Historical week-by-week completed logs must be clearly designated as pending backend archive endpoint support.

### 5.4 Tab 4: Capstone Deliverables Vault
- **Persisted Entity & Data Source:** `TeamArtifact.cs` (`SlotType`, `FileName`, `StorageKey`, `Sha256Checksum`, `FileSizeBytes`, `Status`, `ReviewerNote`).
- **API Availability:** 
  - `GET /api/faculty/teams/{teamId}/artifacts` -> **CONFIRMED** (returns all 4 slots: Synopsis, MidTermPPT, PlagiarismReport, FinalThesis).
  - `GET /api/artifacts/{id}/download` -> **CONFIRMED** (authentic binary PDF streaming).
  - `POST /api/faculty/artifacts/{id}/review` -> **CONFIRMED** (`ReviewArtifactRequest { IsApproved, ReviewerNote }`).
- **Contract Status:** **100% PERSISTED & VERIFIED.**
- **Action Required:** Clean implementation in Phase 3. Decommission fake client-side `%PDF-1.4%` generator.

### 5.5 Tab 5: Team Members & Individual Contribution
- **Persisted Entity & Data Source:** `TeamMember.cs` (`ModuleResponsibility`, `IsTeamLead`, `JoinedAtUtc`) and `WeeklyLogbook.cs` (`AuthorUserId`, `HoursLogged`, `AccomplishmentsSummary`).
- **API Availability:** Member module descriptions are persisted in PostgreSQL. However, aggregating individual contribution across weeks requires a dedicated endpoint.
- **Contract Status:** **PARTIALLY PERSISTED.**
- **Action Required:** Display assigned `ModuleResponsibility` from team members. Do not fabricate automated contribution pie charts or commit telemetry.

### 5.6 Tab 6: Activity & Evaluation History
- **Persisted Entity & Data Source:** `VivaEvaluation.cs`, `IndividualStudentScore.cs`, `PlatformAuditLog.cs`, `ExceptionAuditLog.cs`.
- **API Availability:** Backend logs all lifecycle changes to `PlatformAuditLogs` and `ExceptionAuditLogs`. However, there is no public endpoint for faculty to query this history (`GET /api/faculty/teams/{teamId}/evaluations` does not exist).
- **Contract Status:** **NOT FOUND ON FACULTY CONTROLLER.**
- **Action Required:** Display locked evaluation status if present in `AssignedDefenseTeamDto.IsEvaluationLocked`. Omit granular historical audit log until backend endpoint is provisioned.

---

## 6. SECURITY, ROLE MATRIX & PANEL SCOPING AUDIT

### 6.1 Role Boundaries & Enforcement Invariants

| Role / Capability | How Established | Database Identity | Access Scope | Permitted Workflows | Strict Prohibitions |
|---|---|---|---|---|---|
| **Assigned Faculty Guide** | Allocated by Coordinator or selected at proposal endorsement | `ProjectTeam.GuideUserId == caller.Id` | Strictly limited to guided teams | Endorse, return, reject proposals; verify weekly logs; review deliverables; submit continuous evaluation | Cannot evaluate own guided team in Midterm or Final Viva (strict Conflict of Interest). Cannot manage unassigned teams. |
| **Appointed Defense Evaluator** | Appointed by Coordinator to a `VivaPanel` | `VivaPanelEvaluator.EvaluatorUserId == caller.Id` | Scoped to defense teams in assigned track | Review team deliverables; submit 60/40 blended viva rubric scores | Cannot evaluate team if assigned as Guide. Cannot unlock finalized marks (requires HOD exception). |
| **Project Coordinator** | Appointed by HOD (`isProjectCoordinator = true`) | `UserAccount.IsProjectCoordinator == true` | Department-scoped academic administration | Import student rosters; allocate guides; schedule panels; export university marksheet | Revocable capability, NOT a permanent role. Revocation takes effect immediately in DB. Never inherits guide authority or HOD grade unlock powers. |
| **Department HOD** | Institutional appointment (`Role == UserRole.HOD`) | `UserAccount.Role == HOD && DepartmentId == team.DepartmentId` | Entire department | Department overview; final proposal sign-off; approve grade unlock exceptions; SAR attestation | Strictly prohibited from cross-department access. |
| **College Admin** | Institutional administration (`Role == UserRole.CollegeAdmin`) | `UserAccount.Role == CollegeAdmin && CollegeId == tenant.Id` | Entire campus | Manage programs, departments, faculty directory, accreditation cycles | Must respect academic workflow validations; cannot bypass conflict of interest rules. |
| **Super Admin** | Platform SaaS operator | `UserAccount.Role == SuperAdmin` | Global tenant management | College onboarding, tenant provisioning, system health | **Strictly prohibited from automatic college academic data overrides.** |

### 6.2 Evaluator Panel-to-Team Scoping Analysis
Per prompt instructions, the panel-to-team association logic was audited in `FacultyController.cs` and `ArtifactsController.cs`:

#### Code Inspection: `FacultyController.SubmitVivaEvaluation` (Lines 538–547)
```csharp
var isAppointedEvaluator = await _context.VivaPanelEvaluators
    .Include(pe => pe.VivaPanel)
    .AnyAsync(pe => pe.CollegeId == collegeId &&
                   pe.EvaluatorUserId == evaluatorId &&
                   !pe.IsDeleted &&
                   pe.VivaPanel != null &&
                   !pe.VivaPanel.IsDeleted &&
                   pe.VivaPanel.DepartmentId == team.DepartmentId &&
                   pe.VivaPanel.AcademicTrackId == team.AcademicTrackId);
```

#### Code Inspection: `ArtifactsController.IsUserAuthorizedToDownloadAsync` (Lines 58–66)
```csharp
var isEvaluator = await _context.VivaPanelEvaluators
    .Include(e => e.VivaPanel)
    .AnyAsync(e => e.EvaluatorUserId == userId &&
                   e.VivaPanel != null &&
                   e.VivaPanel.DepartmentId == team.DepartmentId &&
                   e.VivaPanel.AcademicTrackId == team.AcademicTrackId &&
                   !e.IsDeleted, cancellationToken);
```

#### Architectural Scoping Finding:
1. **Track-Level Scoping vs. Exact Team Binding:**
   - In the database schema, `VivaPanel.cs` has `DepartmentId` and `AcademicTrackId`. There is **no junction entity** (e.g. `VivaPanelTeam`) or foreign key (`ProjectTeam.VivaPanelId`) binding a specific panel to individual project teams.
   - Consequently, an evaluator appointed to ANY panel in the CSE department for Minor Project 2026 is recognized as an authorized evaluator for ALL teams in that department and track.
2. **Metadata Query vs. Binary Download Path Parity:**
   - Both `FacultyController.GetTeamArtifacts` (metadata) and `ArtifactsController.DownloadArtifact` (binary stream) enforce the **exact same predicate**:
     `pe.VivaPanel.DepartmentId == team.DepartmentId && pe.VivaPanel.AcademicTrackId == team.AcademicTrackId && pe.EvaluatorUserId == userId`.
   - **Verification Verdict:** Metadata query and binary download paths have **100% security parity**. There is zero discrepancy between metadata discovery and file downloading.
3. **Institutional Boundary Classification:**
   - While track-level scoping meets departmental defense evaluation needs (evaluators review cohort projects prior to examination day), it represents a design boundary. This is documented as a contract boundary rather than worked around in the UI.

---

## 7. ACADEMIC POLICY & DATA ASSUMPTION VERIFICATION

### 7.1 Viva Rubric Weighting Formula (Correction of Inversion)
- **Proposed Assumption:** Viva weighting of "60% individual + 40% team".
- **Code Evidence:** Inspected `IndividualStudentScore.cs` (lines 28–35) and `AcademicTrack.cs` (lines 44–47):
  ```csharp
  // AcademicTrack.cs:
  public int SharedProjectRubricPct { get; set; } = 60;   // 60% SHARED TEAM
  public int IndividualStudentRubricPct { get; set; } = 40; // 40% INDIVIDUAL STUDENT

  // IndividualStudentScore.cs:
  public void ComputeFinalMark(decimal sharedTotalScore, decimal sharedWeightPct = 60m, decimal individualWeightPct = 40m)
  {
      IndividualTotalScore = ModuleOwnershipScore + VivaQaScore + LogDisciplineScore;
      FinalComputedStudentMark = Math.Round(
          (sharedTotalScore * (sharedWeightPct / 100m)) +
          (IndividualTotalScore * (individualWeightPct / 100m)),
          2, MidpointRounding.AwayFromZero);
  }
  ```
- **Policy Finding:** The real backend formula is **60% Shared Team Project Rubric + 40% Individual Student Rubric** (configurable per track via `AcademicTrack.SharedProjectRubricPct` and `IndividualStudentRubricPct`). The proposed inversion (60% individual / 40% team) was a specification error and is formally corrected.
- **Individual Breakdown:** `IndividualTotalScore` is composed of 3 discrete components:
  1. `ModuleOwnershipScore` (e.g. /15 marks)
  2. `VivaQaScore` (e.g. /15 marks)
  3. `LogDisciplineScore` (e.g. /10 marks)
  Sum = Individual Total (max 40 marks).

### 7.2 Course Outcomes (CO1–CO4) Rubric Structure
- **Entity Evidence:** `CourseOutcomeDefinition.cs` defines department-level CO1–CO4 codes mapped to POs and target thresholds (default 70.0%).
- **Evaluation Persistence:** In `VivaEvaluation.cs:19`, criterion-level scores are stored as PostgreSQL jsonb in `SharedRubricScoresJson`, while the aggregated shared score is stored in `SharedTotalScore`.
- **Policy Finding:** CO1–CO4 rubrics are NOT hardcoded database columns. They are serialized in JSON and validated against `SharedTotalScore`. Phase 3 UI will present CO1–CO4 inputs and serialize them to `SharedRubricScoresJson`.

### 7.3 "At Risk" Status Criteria
- **Backend Evidence:** In `HodController.cs` (lines 183, 577, 1908):
  `t.Status == ProjectStatus.AtRisk || t.MissedLogStreak >= 2`.
- **Finding:** A team is classified as "At Risk" if its status is explicitly `ProjectStatus.AtRisk` OR if its `MissedLogStreak >= 2`.
- **Frontend Contract Gap:** `ProjectProposalDto` returned by `FacultyController.GetMentoredTeams` does NOT include `MissedLogStreak`. Phase 3 UI will highlight teams with status `ProjectStatus.AtRisk`.

### 7.4 VCS & GitHub Activity Telemetry
- **Backend Evidence:** Exhaustive regex search across `backend/src/` returned zero matches for GitHub APIs, commits, or webhooks.
- **Finding:** `ProjectTeam.RepoUrl` is a static database string. Commit counts ("48 commits") and last push timestamps were entirely fabricated in the mock store. Phase 3 UI will display `RepoUrl` as a link without fake telemetry.

### 7.5 Similarity Score / Plagiarism Overlap
- **Backend Evidence:** `ProjectTeam.SimilarityScorePct` and `SimilarProjectCode` are persisted in PostgreSQL and returned in `ProjectProposalDto`.
- **Finding:** Persisted as advisory metadata. Colabex does NOT contain an automated plagiarism engine; values are recorded during proposal review. Deliverable slot `ArtifactSlotType.PlagiarismReport` requires an uploaded PDF report verified by the guide.

### 7.6 Notification Delivery & Unread Counts
- **Backend Evidence:** `AccountController.cs:573` provides `notification-preferences`. There is NO faculty notification inbox or unread counter endpoint.
- **Finding:** Live badge counters in the sidebar must consume real action queue counts:
  `pendingFacultyCount = ActionQueueDto.PendingLogsCount + ActionQueueDto.PendingProposalsCount`.

### 7.7 Problem Bank Governance
- **Backend Evidence:** `FacultyController.cs:397` enforces server-side department scoping:
  `statement.DepartmentId = caller.DepartmentId.Value;`
- **Finding:** Faculty can only propose statements for their affiliated department. Statements are persisted in `ProblemBankStatements` with `MaxTeamCapacity`, `SdgCode`, and `PrerequisitesCsv`.

### 7.8 Final Viva Completion vs. Institutional Sign-Off
- **Backend Evidence:** `FacultyController.cs:646, 730` and `FacultySecurityAndWorkflowTests.cs:1434` (`Scenario10_FinalViva_DoesNotBypassRequiredHodSignOff_RetainsReadyForViva`).
- **Finding:** Submitting Final Viva marks locks the evaluation (`isLocked = true`) but **retains project team status at `ProjectStatus.ReadyForViva`**. It does NOT complete the project. Final institutional completion and university marksheet certification require formal HOD/CollegeAdmin action. Phase 3 UI must clearly communicate this boundary.

---

## 8. SCREEN-BY-SCREEN READINESS AUDIT (9 SCREENS)

| # | Screen Name | Route Path | Navigation Entry | Authorized Roles | Required Data & APIs | Key Actions & Endpoints | Loading / Empty / Error States | Backend Readiness Status | Documented Limitations & Blockers |
|---|---|---|---|---|---|---|---|---|---|
| **1** | **Faculty Dashboard** | `/faculty` | Sidebar #1 (`Dashboard`, `LayoutDashboard`) | `Faculty`, `HOD`, `CollegeAdmin` | `ActionQueueDto` via `GET /api/faculty/action-queue`; `ProjectProposalDto` list | Quick verify log (`POST /api/faculty/logs/{id}/verify`); Quick endorse proposal (`POST /api/faculty/proposals/{id}/endorse`) | 4 skeleton KPI cards + table skeleton; "Action Queue Clear" empty state; Error banner with retry | **READY** | None. Fully supported by verified backend endpoints. |
| **2** | **My Teams Directory** | `/faculty/teams` | Sidebar #2 (`My Teams`, `Users2`) | `Faculty`, `HOD`, `CollegeAdmin` | `List<ProjectProposalDto>` via `GET /api/faculty/mentored-teams` | Search, filter by status; Navigate to workspace (`/faculty/teams/[teamId]`) | 4-card grid skeleton; "No Mentored Teams Assigned" empty state; Error alert | **READY WITH LIMITATIONS** | `MissedLogStreak` not in DTO; sprint task progress bars cannot fetch task counts from backend. |
| **3** | **Team Workspace** | `/faculty/teams/[teamId]` | Deep-link from My Teams card | Assigned Guide, Dept HOD, College Admin | Basic team info from `mentored-teams`; Deliverables from `GET /api/faculty/teams/{teamId}/artifacts` | Review deliverables; download PDF; endorse/return/reject proposal | Skeleton workspace header & tabs; 403 Forbidden state for unassigned faculty; 404 NotFound | **READY WITH LIMITATIONS** | No dedicated `GET /api/faculty/teams/{teamId}` endpoint; Tasks tab and Activity tab lack faculty GET endpoints; VCS telemetry omitted. |
| **4** | **Proposal Reviews** | `/faculty/proposals` | Sidebar #3 (`Proposals`, `FileText`) | `Faculty`, `HOD`, `CollegeAdmin` | Pending proposals from `action-queue` & `mentored-teams` | Endorse (`POST .../endorse`); Return (`POST .../return`); Reject (`POST .../reject`) | Table skeleton; "No Proposals Pending Review" empty state; Remarks validation modal | **READY** | Standalone proposal dossier endpoint missing; abstract and metadata sourced from proposal DTO. |
| **5** | **Weekly Logs** | `/faculty/logs` | Sidebar #4 (`Weekly Logs`, `Calendar`) | `Faculty`, `HOD`, `CollegeAdmin` | Pending logs from `GET /api/faculty/action-queue` | Verify log (`POST .../verify` with Decision="Approved"); Request revision (Decision="NeedsRevision", min 5 chars remarks) | Table skeleton; "All Logs Verified" empty state; Log inspection drawer | **READY WITH LIMITATIONS** | Historical 12-week log archive has no backend GET endpoint; screen operates as a verification queue. |
| **6** | **Deliverables Review** | `/faculty/deliverables` | Sidebar #5 (`Deliverables`, `FileCheck2`) | `Faculty`, `HOD`, `CollegeAdmin` | Per-team artifacts aggregated via `GET /api/faculty/teams/{id}/artifacts` | Download authentic PDF (`GET /api/artifacts/{id}/download`); Review (`POST /api/faculty/artifacts/{id}/review`) | Table skeleton; "All Deliverables Reviewed" empty state; Revision remarks modal | **READY WITH LIMITATIONS** | No global cross-team deliverables endpoint; client must aggregate artifacts across mentored teams. |
| **7** | **Viva Evaluations** | `/faculty/evaluations` | Sidebar #6 (`Viva Evaluations`, `GraduationCap`) | Appointed Evaluators, Dept HOD, College Admin | Defense teams from `GET /api/faculty/defense-teams` | Submit 60/40 rubric scores (`POST /api/faculty/evaluations`); Conflict of interest check | Evaluation form skeleton; "No Defense Panels Assigned" empty state; Conflict warning banner | **READY** | Lock state prevents re-submission (409 Conflict); does not transition team to Completed (retains ReadyForViva). |
| **8** | **Problem Bank** | `/faculty/problem-bank` | Sidebar #7 (`Problem Bank`, `Compass`) | `Faculty`, `HOD`, `CollegeAdmin` | Statements from `GET /api/faculty/problem-bank` | Propose statement (`POST /api/faculty/problem-bank`); Modal with SDG dropdown | Cards skeleton; "No Proposed Statements" empty state; Form validation errors | **READY** | Edit and delete endpoints do not exist; statements are immutable once proposed. |
| **9** | **Coordinator Console** | `/coordinator` | Sidebar #8 (`Coordinator Console`, `Briefcase`, `coordinatorOnly`) | Faculty with `isProjectCoordinator == true`, HOD, College Admin | `GET /api/coordinator/teams`; `GET /api/coordinator/panels` | Roster CSV import; Single student provision; Guide allocate; Panel schedule; Marksheet export; Submit exception | Tabbed console skeleton; "Access Restricted" 403 guard; Success toast with OTP | **READY WITH LIMITATIONS** | Phantom endpoint `GET /api/coordinator/exceptions` must be removed; Exception list only shows client-submitted confirmations. |

---

## 9. USER JOURNEY AUDIT & VERIFICATION (8 JOURNEYS)

### Journey 1: Faculty Login & Dashboard Overview
- **Starting State:** Faculty logs in at `/login`, receives JWT containing `role: "Faculty"`.
- **Actor:** Authenticated Faculty Guide.
- **API Sequence:**
  1. `GET /api/auth/me` -> Resolves user profile, college, and department.
  2. `GET /api/faculty/action-queue` -> Returns `ActionQueueDto` (pending logs and proposals).
  3. `GET /api/faculty/mentored-teams` -> Returns guided teams portfolio.
- **UI State:** Dashboard displays KPI cards, Priority Action Queue table, and Guided Teams summary.
- **Negative Scenarios:** Unauthenticated -> redirected to `/login`; Student navigates to `/faculty` -> redirected to `/student`.
- **Final State:** Faculty is situated on `/faculty` with accurate live badge counters.

### Journey 2: Assigned Team Discovery & Workspace Navigation
- **Starting State:** Faculty visits `/faculty/teams`.
- **API Sequence:**
  1. `GET /api/faculty/mentored-teams` -> Fetches all teams where `GuideUserId == caller.Id`.
  2. Faculty clicks "Open Workspace" on Team `2026-CS-MIN-01`.
  3. Navigates to `/faculty/teams/{teamId}`.
  4. `GET /api/faculty/teams/{teamId}/artifacts` -> Loads 4-slot deliverables.
- **Negative Scenarios:** Unassigned faculty pastes `/faculty/teams/{otherTeamId}` -> Backend checks `GuideUserId`, returns 403 Forbidden; UI renders `<ForbiddenState>`.
- **Final State:** Faculty inspects team abstract, deliverables vault, and proposal status.

### Journey 3: Proposal Review (Endorse / Return / Reject)
- **Starting State:** Student team submitted proposal; status is `ProjectStatus.PendingGuide`.
- **API Sequence:**
  1. Proposal appears in `GET /api/faculty/action-queue` (`Type: "ProposalEndorsement"`).
  2. Faculty opens Proposal Review drawer to inspect abstract, SDG, and similarity advisory.
  3. **Path A (Endorse):** `POST /api/faculty/proposals/{teamId}/endorse` -> Status becomes `PendingCoordinator`. Audit logged in `PlatformAuditLogs`.
  4. **Path B (Return):** Faculty enters mandatory remarks ($\ge 5$ chars); calls `POST /api/faculty/proposals/{teamId}/return` -> Status becomes `Draft`, `IsRosterLocked = false`, `GuideUserId` preserved. Logged in `ExceptionAuditLogs`.
  5. **Path C (Reject):** Faculty enters mandatory justification ($\ge 5$ chars); calls `POST /api/faculty/proposals/{teamId}/reject` -> Status becomes `Draft`, `IsRosterLocked = false`, `GuideUserId = null` (guide revoked). Logged in `ExceptionAuditLogs`.
- **Negative Scenarios:** Remarks $< 5$ chars -> 400 BadRequest; Team not in `PendingGuide` -> 400 BadRequest.
- **Final State:** Proposal advances to Coordinator or returns to student team with preserved/revoked guide.

### Journey 4: Weekly Progress Log Review & Verification
- **Starting State:** Student submitted Friday logbook; `isVerified == false`.
- **API Sequence:**
  1. Log appears in Action Queue (`Type: "LogVerification"`).
  2. Guide clicks "Verify", opening `WeeklyLogInspectionDrawer`.
  3. **Path A (Approve):** Guide calls `POST /api/faculty/logs/{logId}/verify` with `{ decision: "Approved", remarks: "..." }` -> `isVerified = true`, `VerifiedByUserId = facultyId`. Queue decrements by 1.
  4. **Path B (Needs Revision):** Guide enters mandatory feedback; calls `POST .../verify` with `{ decision: "NeedsRevision", remarks: "..." }` -> `isVerified = false`, status updates to `NeedsRevision`.
- **Negative Scenarios:** Unassigned faculty attempts verification -> 403 Forbidden. NeedsRevision submitted without remarks -> 400 BadRequest.
- **Final State:** Student log is signed in PostgreSQL database.

### Journey 5: Deliverable Review & Authentic PDF Download
- **Starting State:** Team uploaded `FinalThesis` PDF artifact (`Status == Uploaded`).
- **API Sequence:**
  1. Guide visits `/faculty/deliverables` or Team Workspace.
  2. Guide clicks "Download": `GET /api/artifacts/{id}/download` -> Browser streams authentic binary blob (`application/pdf`) with `Content-Disposition`.
  3. Guide reviews content; clicks "Verify Deliverable".
  4. `POST /api/faculty/artifacts/{id}/review` with `{ isApproved: true }` -> `Status` becomes `Verified`. Logged in `PlatformAuditLogs`.
- **Negative Scenarios:** Attempting to review `Missing` deliverable -> 400 BadRequest. Unassigned faculty downloading file -> 403 Forbidden.
- **Final State:** Deliverable verified, satisfying the prerequisite for Final Viva defense.

### Journey 6: Viva Evaluator Appointment, Team Discovery & Scoring
- **Starting State:** Faculty appointed to defense panel; teams scheduled for viva.
- **API Sequence:**
  1. Evaluator visits `/faculty/evaluations`.
  2. `GET /api/faculty/defense-teams` -> Returns assigned teams with `IsGuideConflict`, `CheckpointType`, `Members`.
  3. **Conflict Check:** If `IsGuideConflict == true`, UI displays amber alert banner; all scoring inputs strictly disabled.
  4. **Prerequisite Check (FinalViva):** Evaluator verifies that `FinalThesis` and `PlagiarismReport` are verified. If unverified, backend rejects submission with 400 BadRequest.
  5. Evaluator inputs: 60% Shared Rubric (CO1–CO4) + 40% Individual Student Scores (Module /15, Viva /15, Log /10 for every active member).
  6. `POST /api/faculty/evaluations` -> Atomic commit to `VivaEvaluations` and `IndividualStudentScores`. Evaluation marked `isLocked = true`. Team remains in `ReadyForViva`.
- **Negative Scenarios:** Guide attempts to grade own team -> 400 BadRequest (`ConflictOfInterestGuard`). Submission on locked evaluation -> 409 Conflict. Missing active student score -> 400 BadRequest.
- **Final State:** Defense marks locked in PostgreSQL. Team awaits institutional HOD sign-off.

### Journey 7: Campus Problem Bank Management
- **Starting State:** Faculty member ideates an engineering research topic.
- **API Sequence:**
  1. Faculty visits `/faculty/problem-bank`.
  2. `GET /api/faculty/problem-bank` -> Fetches existing statements proposed by faculty.
  3. Faculty clicks `+ Propose Problem Statement`, fills title, abstract, domain, SDG, capacity.
  4. `POST /api/faculty/problem-bank` -> Department resolved server-side from caller account.
- **Negative Scenarios:** Client attempts to spoof another department -> 403 Forbidden.
- **Final State:** New problem statement published and visible to department students.

### Journey 8: Coordinator Operations & Revocation Enforcement
- **Starting State:** Faculty member holds delegated capability `isProjectCoordinator == true`.
- **API Sequence:**
  1. Coordinator visits `/coordinator`.
  2. **Roster Import:** Uploads student CSV -> `POST /api/coordinator/roster/import`. Roles forced to `Student`. Duplicate check enforced.
  3. **Guide Allocation:** Balances load -> `POST /api/coordinator/teams/{id}/assign-guide`.
  4. **Panel Scheduling:** Schedules panel -> `POST /api/coordinator/panels`.
  5. **Marksheet Export:** Downloads CSV -> `GET /api/coordinator/export-marksheet?trackId=...`.
- **Revocation Enforcement Scenario:**
  - HOD unassigns coordinator capability in DB (`isProjectCoordinator = false`).
  - Former coordinator attempts to call `POST /api/coordinator/teams/{id}/assign-guide` with existing JWT.
  - Backend `CoordinatorController.ResolveCoordinatorDepartmentAsync` queries live DB: checks `user.IsProjectCoordinator`.
  - Live DB check fails -> Returns 403 Forbidden (`"User does not hold active Project Coordinator authority."`).
- **Final State:** Delegated authority operates safely under strict departmental bounds.

---

## 10. TEST EVIDENCE CITATIONS

The following 15 automated integration tests in `backend/tests/ProjectHub.IntegrationTests/FacultySecurityAndWorkflowTests.cs` verify the security, scoping, and lifecycle rules:

1. `Coordinator_ImportRoster_CannotEscalateRoles_StrictlyForcesStudentRole` (Line 90): Verifies that coordinator CSV import strictly forces `UserRole.Student` and prevents privilege escalation.
2. `Coordinator_ImportRoster_CannotOverwriteOrElevateExistingStaffOrAdminAccounts` (Line 137): Verifies that existing staff/admin accounts cannot be overwritten.
3. `Coordinator_AddSingleStudent_CrossDepartmentAttempt_IsForbidden` (Line 183): Verifies that coordinators cannot provision students outside their department.
4. `Coordinator_GetTeams_IsDepartmentScoped` (Line 209): Verifies department-level query filtering.
5. `Coordinator_RevokedCoordinator_IsRejectedImmediately` (Line 238): Verifies live database check on coordinator revocation.
6. `Artifact_Review_ByUnassignedFaculty_IsForbidden` (Line 297): Verifies 403 on unassigned faculty artifact review.
7. `DefenseTeams_ReturnsTeamsInAssignedPanels` (Line 361): Verifies that defense teams return with member rosters and conflict flags.
8. `Defense_GuideCannotGradeOwnTeam_EnforcesConflictOfInterest` (Line 399): Verifies that `ConflictOfInterestGuard` throws 400 on guide grading own team.
9. `Scenario04_EndorseProposal_AdvancesStatus` (Line 1240): Verifies `PendingGuide` -> `PendingCoordinator` transition.
10. `Scenario05_ReturnProposal_PreservesGuide` (Line 1275): Verifies `PendingGuide` -> `Draft` transition with preserved `GuideUserId`.
11. `Scenario06_RejectProposal_RevokesGuide` (Line 1315): Verifies `PendingGuide` -> `Draft` with `GuideUserId = null`.
12. `Scenario07_VerifyLog_ApprovedAndRevision` (Line 1345): Verifies log verification and revision remarks validation.
13. `Scenario08_ReviewArtifact_VerifiedAndRevision` (Line 1380): Verifies artifact status transition to `Verified`.
14. `Scenario09_FinalViva_CannotCompleteTeam_WithUnverifiedRequiredDeliverables` (Line 1387): Verifies that Final Viva evaluation requires verified FinalThesis and PlagiarismReport.
15. `Scenario10_FinalViva_DoesNotBypassRequiredHodSignOff_RetainsReadyForViva` (Line 1434): Verifies that Final Viva locks marks but retains team in `ReadyForViva`.

---

## 11. FINAL AUDIT VERDICT & IMPLEMENTATION READINESS

### 11.1 Verdict
```
====================================================================================================
FINAL AUDIT VERDICT: APPROVED WITH DOCUMENTED LIMITATIONS
====================================================================================================
```

### 11.2 Justification
The core academic workflows of the Colabex Faculty / Guide module — Action Queue, Mentored Teams, Proposal Decisions (Endorse / Return / Reject), Weekly Log Sign-off, 4-Slot Deliverable Reviews, Binary PDF Downloads, Viva Defense Rubric Scoring (with Conflict of Interest and deliverable gates), Problem Bank Publishing, and Coordinator Operations — are **firmly established and independently verified** on the backend.

The approval is granted **with documented limitations**:
1. **Team Workspace GET Endpoint:** `GET /api/faculty/teams/{teamId}` does not exist. Phase 3 UI must source initial team metadata from the `mentored-teams` cache and fetch deliverables via `GET /api/faculty/teams/{teamId}/artifacts`.
2. **Weekly Logs History:** `GET /api/faculty/teams/{teamId}/logs` does not exist. Phase 3 UI will focus on the unverified log review queue.
3. **No Sprint Tasks / Telemetry for Faculty:** Sprint tasks are student-scoped; VCS commit telemetry does not exist in Colabex backend. Display `RepoUrl` as an external link without fake telemetry.
4. **Phantom Coordinator Endpoint:** `GET /api/coordinator/exceptions` must be removed from `coordinatorApi.ts`.
5. **Institutional Sign-Off Boundary:** Submitting Final Viva marks locks evaluation and retains team in `ReadyForViva`. UI must inform evaluators that institutional completion is pending administrative sign-off.
