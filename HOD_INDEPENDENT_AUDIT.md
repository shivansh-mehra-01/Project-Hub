# COLABEX — HOD INDEPENDENT AUDIT

**Target:** Colabex Head of Department (HOD) Module  
**Scope:** Architecture, Security, Role Boundaries, Workflows, APIs, and Frontend Implementation  
**Auditor:** Principal SaaS Product Architect, Database Architect & Independent QA Lead  
**Audit Date:** November 2026  

---

## 1. AUDIT CLASSIFICATION MATRIX

| Finding ID | Severity | Category | Description | Status |
|---|---|---|---|---|
| **SEC-01** | **Critical** | Security / RBAC | Unvalidated `DepartmentId` in `ResolveDepartmentIdAsync` enables cross-department takeover | Action Required |
| **SEC-02** | **Critical** | Security / RBAC | Relieved or inactive HOD appointments not checked against `HodAppointmentHistories` | Action Required |
| **SEC-03** | **High** | Business / Integrity | `ApproveProposal` does not check `Status == PendingHOD`, allowing invalid state jumps | Action Required |
| **SEC-04** | **High** | Audit / Governance | Single proposal approve/reject actions lack `PlatformAuditLog` entries | Action Required |
| **BUG-01** | **High** | Workflow / Bug | `ApproveException` for `ReassignGuide` marks record approved but never updates team guide | Action Required |
| **DATA-01** | **High** | Data Integrity | Hardcoded synthetic metrics in `GetDashboard` and `GetNbaAttainmentReport` | Action Required |
| **DATA-02** | **Medium** | Data Integrity | Hardcoded sample definitions and fake students in `ExportNbaDossierZip` | Action Required |
| **ROLE-01** | **Medium** | Role Duplication | `CreateFaculty` in HOD module duplicates College Admin HR/Staff Onboarding | Action Required |
| **UI-01** | **High** | Integration / UI | Frontend `HODView.tsx` reads from mock store rather than live backend APIs | Action Required |
| **UI-02** | **Medium** | UX / Quality | Lifecycle funnel and marksheet table contain hardcoded static mock numbers | Action Required |
| **FEAT-01** | **High** | Missing Capability | No dedicated department Projects overview endpoint (`/api/hod/projects`) | Action Required |
| **FEAT-02** | **Medium** | Missing Capability | HOD cannot directly allocate or reassign guides with audit reason | Action Required |
| **FEAT-03** | **Medium** | Missing Capability | Missing department-scoped Reports module with CSV export | Action Required |

---

## 2. DETAILED AUDIT FINDINGS

### Finding SEC-01: Critical Department Isolation Bypass in `ResolveDepartmentIdAsync`
- **File Path:** `backend/src/ProjectHub.Api/Controllers/HodController.cs` (lines 44–78)
- **Existing Implementation:**
  ```csharp
  if (_tenantContext.DepartmentId.HasValue && _tenantContext.DepartmentId.Value != Guid.Empty)
  {
      var deptExists = await _context.Departments
          .AnyAsync(d => d.Id == _tenantContext.DepartmentId.Value && d.CollegeId == collegeId.Value && !d.IsDeleted);
      if (deptExists)
      {
          return _tenantContext.DepartmentId.Value;
      }
  }
  ```
- **Actual Issue:** The resolver accepts any `DepartmentId` passed in the tenant context or JWT token as long as the department exists within the college. It fails to verify that the authenticated caller (`userId`) is appointed as the HOD of that specific department.
- **Business Impact:** Any authenticated HOD in a college could forge the `department_id` claim or header to read and manipulate data (proposals, grades, faculty) of another department in the same college.
- **Recommended Change:** Validate that the authenticated user is currently appointed to the target department (`d.HodUserId == userId.Value` or active appointment). If the supplied `DepartmentId` does not match the caller's appointed department, throw `UnauthorizedAccessException`.
- **Dependencies:** `ProjectHubDbContext`, `ITenantContext`.
- **Tests Required:** `HodSecurityAndIsolationTests.Hod_ForgedDepartmentId_IsRejected`.
- **Database Migration Required:** No.

---

### Finding SEC-02: Expired or Inactive HOD Tenure Not Enforced
- **File Path:** `backend/src/ProjectHub.Api/Controllers/HodController.cs` (lines 62–77)
- **Existing Implementation:**
  The fallback query checked:
  ```csharp
  d.HodUserId == userId.Value || d.Users.Any(u => u.Id == userId.Value && u.Role == UserRole.HOD && !u.IsDeleted)
  ```
- **Actual Issue:** If a faculty member was formerly an HOD, their user record may still have `Role == UserRole.HOD` or retain an association with the department even after the College Admin appointed a successor in `HodAppointmentHistory` (`IsCurrent = false`, `RelievedAtUtc = DateTime.UtcNow`).
- **Business Impact:** Relieved HODs could continue authorizing actions, signing off proposals, or modifying rubric scores after their administrative tenure concluded.
- **Recommended Change:** Query `HodAppointmentHistories` to ensure that an appointment exists for `userId` and `departmentId`, that `IsCurrent == true`, and `RelievedAtUtc == null`. If `department.HodUserId != userId`, reject access.
- **Dependencies:** `HodAppointmentHistory` table.
- **Tests Required:** `HodSecurityAndIsolationTests.ExpiredHod_AttemptsAction_IsRejected`.
- **Database Migration Required:** No.

---

### Finding SEC-03: Missing Pre-State Validation in Proposal Decisions
- **File Path:** `backend/src/ProjectHub.Api/Controllers/HodController.cs` (lines 543–574)
- **Existing Implementation:**
  ```csharp
  var team = await _context.ProjectTeams.FirstOrDefaultAsync(t => t.Id == teamId && t.CollegeId == collegeId && t.DepartmentId == deptId && !t.IsDeleted);
  if (team == null) return NotFound(new { message = "Proposal not found in department." });

  team.Status = ProjectStatus.ActiveBuild;
  team.IsRosterLocked = true;
  ```
- **Actual Issue:** `ApproveProposal` and `RejectProposal` did not check `team.Status == ProjectStatus.PendingHOD`. A proposal in `Draft`, `Archived`, or `Completed` could be directly manipulated into `ActiveBuild`.
- **Business Impact:** Bypasses student submission and faculty guide/coordinator review stages; previously rejected proposals could be forced into active build without proper resubmission.
- **Recommended Change:** Require `team.Status == ProjectStatus.PendingHOD`. If not in `PendingHOD`, return `BadRequest` ("Only proposals in PendingHOD status can be approved or returned.").
- **Dependencies:** `ProjectTeam.Status`.
- **Tests Required:** `HodSecurityAndIsolationTests.ApproveProposal_NonPendingHOD_Fails`.
- **Database Migration Required:** No.

---

### Finding SEC-04: Missing Audit Logging on Single Proposal Decisions
- **File Path:** `backend/src/ProjectHub.Api/Controllers/HodController.cs` (lines 543–574)
- **Existing Implementation:**
  `BulkApproveProposals` recorded an entry in `PlatformAuditLogs`, but `ApproveProposal` and `RejectProposal` (single endpoints) made no audit log entries.
- **Actual Issue:** Important governance decisions approving or rejecting capstone projects lacked an immutable audit trail.
- **Business Impact:** Violates institutional auditability requirements; disputes over who approved or returned a project cannot be proven.
- **Recommended Change:** Add `PlatformAuditLog` creation in both `ApproveProposal` and `RejectProposal` capturing `ActorUserId`, `Action`, `TargetTenantId`, `TargetEntity`, and metadata (previous status, new status, remarks).
- **Dependencies:** `PlatformAuditLog`.
- **Tests Required:** Integration tests asserting `PlatformAuditLogs` entries after single approval/rejection.
- **Database Migration Required:** No.

---

### Finding BUG-01: Approved Guide Reassignment Does Not Mutate Team Guide
- **File Path:** `backend/src/ProjectHub.Api/Controllers/HodController.cs` (lines 1104–1116)
- **Existing Implementation:**
  ```csharp
  record.ApprovedByUserId = _tenantContext.UserId;
  record.ApprovedAtUtc = DateTime.UtcNow;
  await _context.SaveChangesAsync();
  ```
- **Actual Issue:** When an HOD approved an exception for `ActionType == ExceptionActionType.ReassignGuide`, the code updated `record.ApprovedByUserId`, but never updated `team.GuideUserId` to the new guide!
- **Business Impact:** Coordinator exception requests to reassign guides appeared "Approved" in the audit log, but the project team remained permanently assigned to the old guide.
- **Recommended Change:** When `record.ActionType == ExceptionActionType.ReassignGuide`:
  1. Load the corresponding `ProjectTeam`.
  2. Parse the new guide ID from `record.TargetUserId` or `record.NewValueJson`.
  3. Validate new guide eligibility and capacity.
  4. Preserve old guide in `record.PreviousValueJson`.
  5. Update `team.GuideUserId = newGuideId`.
  6. Emit `PlatformAuditLog` for `HOD_GUIDE_REASSIGNMENT_EXECUTED`.
- **Dependencies:** `ProjectTeam`, `UserAccount`, `ExceptionAuditLog`.
- **Tests Required:** `HodSecurityAndIsolationTests.ApproveException_ReassignGuide_UpdatesTeamGuideUserId`.
- **Database Migration Required:** No.

---

### Finding DATA-01: Hardcoded Synthetic Metrics in Dashboard and NBA Attainment
- **File Path:** `backend/src/ProjectHub.Api/Controllers/HodController.cs` (lines 102–146, lines 795–855)
- **Existing Implementation:**
  `directPct = 82.4m`, `indirectPct = 78.6m`, and `CreatePoScore("PO1", ..., baseDirect + 1.6m)`.
- **Actual Issue:** When real evaluations were absent or incomplete, the controller fabricated synthetic numbers by adding arbitrary offsets (+1.6%, -0.6%, etc.) to hardcoded percentages.
- **Business Impact:** Violates product principles: "No fake metrics, synthetic data or hardcoded business values. Show honest empty states when data is unavailable."
- **Recommended Change:** If no evaluations or exit surveys exist for the department, return `0` / honest empty state (`DirectAttainmentPct = 0`, `IndirectAttainmentPct = 0`, `BlendedAttainmentPct = 0`). Map real outcomes dynamically from `CourseOutcomeDefinitions` and `MasterNbaOutcomes` without synthetic offsets.
- **Dependencies:** `CourseOutcomeDefinition`, `MasterNbaOutcome`.
- **Tests Required:** `HodSecurityAndIsolationTests.Dashboard_WithNoEvaluations_ReturnsZeroAttainment`.
- **Database Migration Required:** No.

---

### Finding DATA-02: Hardcoded Sample Dossier in `ExportNbaDossierZip`
- **File Path:** `backend/src/ProjectHub.Api/Controllers/HodController.cs` (lines 906–917)
- **Existing Implementation:**
  A static array `sampleDefinitions` with 9 hardcoded student names ("Shivansh Patel", "Pooja Sharma", etc.) was packaged into the exported ZIP dossier.
- **Actual Issue:** Department projects stored in PostgreSQL were ignored; the exporter generated synthetic CSV scorecards using invented names and scores.
- **Business Impact:** Exported SAR dossier was invalid for institutional accreditation audits because it contained fabricated student names not enrolled in the college.
- **Recommended Change:** Query actual department teams (`dbTeams`) from `_context.ProjectTeams`, along with their real enrolled members (`t.Members`), real evaluation scores (`t.Evaluations`), and real vault artifacts (`t.Artifacts`). Categorize actual projects into performance tiers based on real scores.
- **Dependencies:** `ProjectTeam`, `TeamMember`, `VivaEvaluation`, `TeamArtifact`.
- **Tests Required:** `HodSecurityAndIsolationTests.ExportNbaDossierZip_ExportsRealDepartmentTeams`.
- **Database Migration Required:** No.

---

### Finding ROLE-01: Duplicate Staff Onboarding in HOD Module
- **File Path:** `backend/src/ProjectHub.Api/Controllers/HodController.cs` (lines 671–750) and `web/src/features/hod/HODView.tsx` (lines 1709–1712, 2109–2209)
- **Existing Implementation:**
  `[HttpPost("faculty")] CreateFaculty` allowed HOD to provision faculty accounts, generate employee codes, and assign temporary passwords.
- **Actual Issue:** Duplicates College Admin's institutional staff directory (`/college/users` and `/api/college/users`). HOD is not an HR administrator responsible for institutional employment onboarding.
- **Business Impact:** Creates dual onboarding paths and potential synchronization issues between department and college administration.
- **Recommended Change:** Remove the "+ Add Faculty Member" button and modal from the HOD frontend. Retain the backend endpoint for backward compatibility with integration tests, but deprecate its use in the UI.
- **Dependencies:** `web/src/features/hod/HODView.tsx`.
- **Tests Required:** Verify College Admin retains exclusive user onboarding in UI.
- **Database Migration Required:** No.

---

### Finding UI-01 & UI-02: Frontend Client-Side Mock Store Dependency & Hardcoded Funnel
- **File Path:** `web/src/features/hod/HODView.tsx`
- **Existing Implementation:**
  - `HODView.tsx` imported and read from `useProjectHubStore` for teams, faculty, proposals, overrides, and exit surveys.
  - Lifecycle funnel numbers (`2, 3, 2, 1, 14, 2`) were static hardcoded JSX numbers.
  - Consolidated marksheet sub-tab rendered a 5-item static array.
- **Actual Issue:** Real backend endpoints (`/api/hod/dashboard`, `/api/hod/proposals`, `/api/hod/faculty`, `/api/hod/exceptions`, `/api/hod/results`) were bypassed on page load.
- **Business Impact:** When an authorized HOD logs in, they see synthetic Zustand store data rather than their department's actual projects and faculty.
- **Recommended Change:** Wire `HODView.tsx` to fetch real data from `hodApi` on mount with loading and error states. Compute lifecycle funnel stages dynamically from real department project teams.
- **Dependencies:** `hodApi`, `web/src/features/hod/HODView.tsx`.
- **Tests Required:** Frontend build check and live data binding verification.
- **Database Migration Required:** No.

---

### Finding FEAT-01: Missing Department Projects Governance View & API
- **File Path:** `backend/src/ProjectHub.Api/Controllers/HodController.cs` and `web/src/app/(dashboard)/hod/`
- **Existing Implementation:**
  The only team retrieval endpoint was `GetProposals()`, which returned teams strictly in `PendingHOD` status. There was no endpoint or screen for HOD to monitor all department projects across the lifecycle (`ActiveBuild`, `AtRisk`, `ReadyForViva`, `Completed`, etc.).
- **Actual Issue:** Violates Core Area B: "View department projects. View project teams and assigned guides. Identify projects without guides. Monitor milestones and project progress. Identify delayed or at-risk projects."
- **Business Impact:** HOD could not oversee active projects, could not identify teams without guides, and could not intervene on at-risk teams.
- **Recommended Change:**
  1. Add `[HttpGet("projects")]` to `HodController.cs` with filters for `status`, `trackId`, `search`, `hasGuide`, and `isAtRisk`.
  2. Add `/hod/projects` route and dedicated Projects tab in `HODView.tsx` with filterable table, search, guide assignment status, and project details drawer.
- **Dependencies:** `ProjectTeam`, `AcademicTrack`, `UserAccount`.
- **Tests Required:** `HodSecurityAndIsolationTests.Hod_GetProjects_ReturnsDepartmentProjectsWithFilters`.
- **Database Migration Required:** No.

---

### Finding FEAT-02: Missing Direct Guide Allocation & Reassignment for HOD
- **File Path:** `backend/src/ProjectHub.Api/Controllers/HodController.cs`
- **Existing Implementation:**
  Only `CoordinatorController` had `[HttpPost("teams/{teamId}/assign-guide")]`. HOD had no direct endpoint to allocate or reassign guides within policy.
- **Actual Issue:** Violates Core Area C: "Allocate or reassign guides when authorized. Preserve previous guide assignment and review history. Reassignment must have an appropriate reason and audit record."
- **Business Impact:** HOD had no mechanism to reassign guides when faculty left on sabbatical or when workload imbalances arose, except by waiting for a coordinator exception request.
- **Recommended Change:** Add `[HttpPost("projects/{teamId}/assign-guide")]` to `HodController.cs`:
  - Validates department and college scope.
  - Validates faculty capacity (`currentLoad < guide.MaxMentorTeams`).
  - Records an `ExceptionAuditLog` capturing previous guide, new guide, mandatory reason, and HOD actor.
  - Updates `team.GuideUserId = guideId`.
  - Logs `PlatformAuditLog` (`HOD_GUIDE_ASSIGNED`).
- **Dependencies:** `ProjectTeam`, `UserAccount`, `ExceptionAuditLog`, `PlatformAuditLog`.
- **Tests Required:** `HodSecurityAndIsolationTests.Hod_AssignGuide_PreservesHistoryAndUpdatesTeam`.
- **Database Migration Required:** No.

---

### Finding FEAT-03: Missing Department Reports View & Summary API
- **File Path:** `backend/src/ProjectHub.Api/Controllers/HodController.cs` and `web/src/app/(dashboard)/hod/`
- **Existing Implementation:**
  No unified reports overview endpoint. Only raw marksheet CSV was partially available.
- **Actual Issue:** Violates Core Area F: "Generate reliable department-level reports. Project status and completion. Faculty workload and guide allocation. Student project participation."
- **Recommended Change:** Add `/hod/reports` screen and `/api/hod/reports/summary` endpoint returning comprehensive department analytics (completion rate, workload balance, project distribution by domain and track) and permission-controlled audit-logged CSV exports.
- **Dependencies:** `ProjectTeam`, `UserAccount`, `AcademicTrack`.
- **Tests Required:** `HodSecurityAndIsolationTests.Hod_GetReportsSummary_ReturnsAccurateTotals`.
- **Database Migration Required:** No.

---

## 3. INVESTIGATION: THE EVALUATION STRUCTURE (30/30/40 VS 60/40)

The prompt instructed an investigation of the previously unresolved relationship between 30/30/40 and 60/40 evaluation structures.

### Findings from Domain Codebase:
1. **30 / 30 / 40 represents the Continuous Evaluation Timeline Checkpoints across the semester:**
   - **30% Guide Continuous Assessment:** Internal mentor weekly evaluation and logbook sign-off (`CheckpointType.GuideContinuous`).
   - **30% Mid-Term Architecture Defense:** Mid-semester departmental review committee defense (`CheckpointType.MidTermReview`).
   - **40% Final External University Viva Voce:** End-semester defense with external university examiner (`CheckpointType.FinalViva`).
   - Defined in `AcademicTrack`: `GuideWeightPct + MidTermWeightPct + FinalVivaWeightPct == 100`.

2. **60 / 40 represents the Rubric Score Distribution within an individual defense session:**
   - **60% Shared Project Team Score:** Group prototype execution, architecture design, and technical thesis report.
   - **40% Individual Student Contribution:** Individual module ownership, viva Q&A mastery, and logbook discipline.
   - Defined in `AcademicTrack`: `SharedProjectRubricPct + IndividualStudentRubricPct == 100`.
   - Executed in `IndividualStudentScore.ComputeFinalMark()`:
     $$\text{FinalMark} = (\text{SharedScore} \times 0.60) + (\text{IndividualScore} \times 0.40)$$

**Resolution:** The two structures are complementary and operate at different layers:
- **30/30/40** is the **temporal progression weight** across 3 academic milestones.
- **60/40** is the **rubric assessment breakdown** within each evaluation checkpoint.
No policy conflict exists; both formulas are preserved and mathematically validated by domain entity constraints in `AcademicTrack.ValidateWeights()`.
