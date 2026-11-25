# COLABEX — STUDENT MODULE
# PHASE 5: OFFICIAL GUIDE ALLOCATION ARCHITECTURE AUDIT

**Date:** November 24, 2026  
**Module:** Student Module (Official Guide Allocation Lifecycle)  
**Phase:** 5 of 8  
**Working Branch:** `integration/super-admin-college-admin`  
**Current HEAD:** `983242cbcf5fa40cdd3807551d1c8ce971ad9eff`  
**Protected HOD Baseline:** `bd5bfc759cc9c46befa04e6ea8c26c84862acea4`  
**Audit Status:** COMPLETE — READ-ONLY ARCHITECTURAL EVIDENCE GATHERED  

---

## 1. EXECUTIVE SUMMARY & AUDIT OBJECTIVE

The objective of Phase 5 is to design and implement an end-to-end, authorization-enforced lifecycle for **Official Guide Allocation** in Colabex, strictly distinguishing between two fundamentally distinct concepts:
1. **Preferred Guide:** The faculty member requested by the student project team during team formation / project draft stages.
2. **Officially Allocated Guide:** The faculty member formally assigned and persisted through an authorized institutional action (Project Coordinator or Head of Department).

These two concepts have previously been conflated in early prototype code where a student submitting an idea draft populated `ProjectTeam.GuideUserId` directly. This audit provides the forensic baseline of the existing codebase, details existing institutional authorization contracts, uncovers schema conflicts, and defines the additive architecture required for Phase 5 without breaking existing frozen modules.

---

## 2. EXISTING ARCHITECTURE & WORKFLOW AUDIT

### 2.1 Student Project Lifecycle Progression
The project lifecycle progresses through discrete institutional stages:
```
Draft (Team Formation & Idea Conception)
  ↓ [Team Leader submits Preferred Guide Request]
Guide Preference Pending Institutional Allocation
  ↓ [Authorized Coordinator / HOD assigns official guide via ExceptionAuditLog]
Officially Allocated (team.GuideUserId = guide.Id, team.Status -> PendingGuide)
  ↓ [Team Leader submits Formal Proposal]
PendingGuide (Assigned Faculty Review & Endorsement)
  ↓ [Faculty Endorses]
PendingCoordinator (Coordinator Track & Department Review)
  ↓ [Coordinator Verifies]
PendingHOD (HOD Institutional Approval)
  ↓ [HOD Approves]
ActiveBuild (Sprints, Weekly Logbooks, Artifacts, Defenses)
```

### 2.2 Existing Institutional Allocation Contracts
An exhaustive audit of all controllers in `backend/src/ProjectHub.Api/Controllers` revealed that guide assignments are strictly managed by two authorized institutional actors:

#### A. Head of Department (`HodController.cs`) — PROTECTED / FROZEN
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.HodOnly)]`
- **Scope:** Hard-fenced to the HOD's college tenant and assigned department (`t.CollegeId == collegeId && t.DepartmentId == deptId`).
- **Endpoint:** `POST /api/hod/projects/{teamId}/assign-guide`
- **Payload:** `HodAssignGuideRequest { GuideUserId, Reason }`
- **Enforcement:**
  - Guide must belong to same college and department: `u.CollegeId == collegeId && u.DepartmentId == deptId`.
  - Guide role must be `UserRole.Faculty` or `UserRole.HOD`.
  - Guide must be active and not deleted (`u.IsActive && !u.IsDeleted`).
  - Workload check: `currentLoad < guide.MaxMentorTeams`.
  - Transitions `team.Status = ProjectStatus.PendingGuide` if currently in `Draft`.
  - Appends an immutable record to `ExceptionAuditLogs` (`ActionType = ExceptionActionType.ReassignGuide`).
  - Appends to `PlatformAuditLogs` (`HOD_GUIDE_ALLOCATED` or `HOD_GUIDE_REASSIGNED`).
- **Protection Rule:** `HodController.cs` diff against baseline `bd5bfc759cc9c46befa04e6ea8c26c84862acea4` is **0 bytes**. It cannot be modified.

#### B. Project Coordinator (`CoordinatorController.cs`) — PRESERVED
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.FacultyOrCoordinator)]`
- **Scope:** Validates appointed department via `ResolveCoordinatorDepartmentAsync()`.
- **Endpoint:** `POST /api/coordinator/teams/{teamId}/assign-guide`
- **Payload:** `AssignGuideRequest { GuideUserId }`
- **Enforcement:**
  - Cross-department check: Rejects faculty belonging to another department.
  - Workload check: `currentLoad < guide.MaxMentorTeams` (default capacity: 4 teams).
  - Persists `team.GuideUserId = guide.Id`.
  - Transitions `team.Status = ProjectStatus.PendingGuide` if currently in `Draft`.
  - Appends immutable audit to `ExceptionAuditLogs` and `PlatformAuditLogs`.
- **Existing Team Query:** `GET /api/coordinator/teams` queries all department teams and includes `GuideUserId` and `GuideUser.FullName`.

#### C. Faculty Mentor Review (`FacultyController.cs`) — FROZEN
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.FacultyOnly)]`
- **Supervision Rule:** `team.GuideUserId == facultyId`.
- **Worklist:** `GET /api/faculty/action-queue` and `GET /api/faculty/proposals` retrieve only teams where `t.GuideUserId == facultyId && t.Status == ProjectStatus.PendingGuide`.
- **Defense Protection:** `VivaPanelEvaluator.ValidateEvaluatorNotTeamGuide(evaluatorId, team.GuideUserId)` strictly forbids the assigned guide from serving as an external/panel defense evaluator for their guided team.

---

## 3. IDENTIFIED DATA-MODEL CONFLICT & ROOT CAUSE

### 3.1 The Conflation in `ProjectTeams.GuideUserId`
Inspection of `ProjectTeam.cs`:
```csharp
public Guid? GuideUserId { get; set; }
public UserAccount? GuideUser { get; set; }
```
- In institutional workflows (`HodController`, `CoordinatorController`, `FacultyController`, `ArtifactsController`, `VivaPanelEvaluator`), `GuideUserId` represents the **Officially Allocated Guide**.
- However, during Phase 3 early idea registration (`StudentController.CreateProjectIdea` and `UpdateProjectDraft`), `request.GuideUserId` was stored directly into `team.GuideUserId`.
- **The Defect:** If a student selected a guide in their draft idea, the system treated that selection as an immediate official allocation. This allowed students to self-allocate guides without institutional approval, bypassing workload checks, coordinator verification, and HOD governance.

### 3.2 The Architectural Solution: Explicit Field Separation
To permanently decouple preferences from institutional allocations, `ProjectTeam` requires dedicated persisted fields:
1. `PreferredGuideUserId` (Nullable Guid, foreign key to `UserAccount`): The faculty member selected by the student team.
2. `GuidePreferenceStatus` (Enum): Lifecycle state of the preference (`None = 0`, `Requested = 1`, `Allocated = 2`, `Rejected = 3`).
3. `GuidePreferenceSubmittedAtUtc` (Nullable DateTime): Timestamp when the team leader submitted or updated the preference.
4. `GuidePreferenceRemarks` (Nullable string, max 500 chars): Remarks or justification provided by the student team.
5. `GuideAllocatedAtUtc` (Nullable DateTime): Timestamp when an authorized institutional actor officially allocated the guide.
6. `GuideAllocatedByUserId` (Nullable Guid, foreign key to `UserAccount`): The institutional actor (Coordinator or HOD) who authorized the allocation.
7. `GuideAllocationRemarks` (Nullable string, max 500 chars): Official remarks or institutional allocation notes.
8. `GuideUserId` (Existing column): Retained strictly as the **Officially Allocated Guide**. Set only when institutional allocation or reassignment occurs.

---

## 4. GUIDE IDENTITY, ELIGIBILITY & WORKLOAD AUDIT

### 4.1 Faculty Identity & Data Minimization
Inspection of `UserAccount.cs`:
- Faculty records carry:
  - `Id` (Guid)
  - `FullName` (string)
  - `Email` (string)
  - `Designation` (`FacultyDesignation` enum: Professor, AssociateProfessor, AssistantProfessor, AdjunctFaculty, Lecturer)
  - `DepartmentId` (Guid)
  - `SkillsCsv` (string, comma-separated verified expertise)
  - `MaxMentorTeams` (int, default: 4)
  - `IsActive` (bool)
  - `Role` (`UserRole.Faculty` or `UserRole.HOD`)
- **Data Minimization Requirement:**
  Internal employee codes (`EnrollmentOrEmployeeCode`), phone numbers, MFA secrets, and password hashes must never be exposed in student-facing directories.

### 4.2 Eligibility Validation Rules
A faculty member is eligible for a team's guide preference ONLY IF:
1. `CollegeId` matches the team's college tenant.
2. `DepartmentId` matches the team's department.
3. `Role` is `Faculty` or `HOD`.
4. `IsActive == true` and `!IsDeleted`.
5. `currentLoad < guide.MaxMentorTeams` (guidance for preference; strictly enforced upon official allocation).

---

## 5. PROPOSED ADDITIVE ARCHITECTURE

### 5.1 Domain Layer
- Create `GuidePreferenceStatus` enum in `backend/src/ProjectHub.Domain/Enums/GuidePreferenceStatus.cs`:
  - `None = 0`
  - `Requested = 1`
  - `Allocated = 2`
  - `Rejected = 3`
- Add properties to `ProjectTeam.cs`:
  - `PreferredGuideUserId`
  - `PreferredGuideUser` navigation
  - `GuidePreferenceStatus`
  - `GuidePreferenceSubmittedAtUtc`
  - `GuidePreferenceRemarks`
  - `GuideAllocatedAtUtc`
  - `GuideAllocatedByUserId`
  - `GuideAllocatedByUser` navigation
  - `GuideAllocationRemarks`

### 5.2 Persistence & Migrations
- EF Core Configuration in `ProjectTeamConfiguration.cs`:
  - Foreign key for `PreferredGuideUserId` with `DeleteBehavior.Restrict`.
  - Foreign key for `GuideAllocatedByUserId` with `DeleteBehavior.Restrict`.
  - Migration: `20261124170000_AddGuidePreferenceLifecycleToProjectTeam.cs`.
  - Backward compatibility: Existing teams with `GuideUserId != null` default to `GuidePreferenceStatus.Allocated` and `PreferredGuideUserId = GuideUserId`.

### 5.3 Application DTOs
- `FacultyGuideDirectoryDto`: Returns public faculty profile (Id, FullName, Email, Designation, DepartmentCode, SkillsCsv, CurrentMentoredTeams, MaxMentorTeams, IsAvailable).
- `SubmitGuidePreferenceRequest`: `{ GuideUserId, Remarks }`.
- `StudentGuidePreferenceDto`: Full state for Student Workspace, including preferred guide, allocated guide, status, remarks, and immutable reassignment history from `ExceptionAuditLog`.
- `RejectGuideRequest`: `{ Reason }`.

### 5.4 Student API Endpoints (`StudentController.cs`)
1. `GET /api/student/faculty-guides`: Enhanced to include `SkillsCsv`, `CurrentMentoredTeams`, `MaxMentorTeams`, `IsAvailable`.
2. `POST /api/student/teams/guide-preference`:
   - Validates caller is active `IsTeamLead`.
   - Validates project status is `Draft` (or eligible proposal stage).
   - Validates team roster is not locked for evaluation.
   - Validates target faculty is active, eligible, and belongs to the same department.
   - Persists preference without setting `GuideUserId`.
   - Logs `PlatformAuditLog` (`STUDENT_GUIDE_PREFERENCE_SUBMITTED`).
3. `GET /api/student/teams/guide-preference`:
   - Returns complete preference, official allocation, and `ExceptionAuditLog` reassignment history.

### 5.5 Institutional API Endpoints (`CoordinatorController.cs`)
1. `POST /api/coordinator/teams/{teamId}/assign-guide`:
   - Updates existing endpoint to set `team.GuideUserId = guide.Id`, `team.GuidePreferenceStatus = GuidePreferenceStatus.Allocated`, `team.GuideAllocatedAtUtc = DateTime.UtcNow`, and `team.GuideAllocatedByUserId = _tenantContext.UserId`.
2. `POST /api/coordinator/teams/{teamId}/reject-guide-request`:
   - Authorized Coordinator rejects student guide request with mandatory reason.
   - Sets `team.GuidePreferenceStatus = GuidePreferenceStatus.Rejected`.
   - Sets `team.GuideAllocationRemarks = request.Reason`.
   - Leaves `team.GuideUserId = null`.
   - Appends to `PlatformAuditLogs` and `ExceptionAuditLogs`.

### 5.6 Frontend Integration (`StudentWorkspaceView.tsx`)
- Embed dedicated "Faculty Guide" card in Student Workspace:
  - Displays Preferred Guide (with status pill: "Requested", "Allocated", "Rejected").
  - Displays Officially Allocated Guide with verified designation and contact.
  - Displays institutional remarks or return reasons if rejected.
  - Interactive Modal for Team Lead to browse department faculty directory, view faculty expertise/skills, and submit/update preference.
  - Renders immutable Reassignment History timeline if reassigned by Coordinator/HOD.

---

## 6. BACKWARD-COMPATIBILITY & SAFETY RISK REGISTER

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Breaking Phase 3 proposal tests** | Medium | Existing Phase 3 tests that inspect `GuideUserId` will continue to function; legacy idea endpoints mirror preference into `PreferredGuideUserId`. |
| **Violating HOD frozen baseline** | Critical | `HodController.cs` is strictly frozen (diff remains 0 bytes). Institutional review is wired through authorized `CoordinatorController.cs`. |
| **Database migration data corruption** | High | Migration creates nullable columns with no destructive drops. Existing `GuideUserId` values are preserved. |
| **Cross-department faculty preference** | High | Backend query strictly filters by `student.DepartmentId == faculty.DepartmentId` and returns HTTP 400 if mismatched. |
| **Unauthorized preference mutation** | High | Backend verifies `team.Members.Any(m => m.UserId == callerId && m.IsTeamLead)`. Non-leads receive HTTP 403 Forbidden. |
| **Over-capacity guide assignment** | High | Backend rejects official allocation if `currentLoad >= guide.MaxMentorTeams`. |

---

## 7. AUDIT VERDICT

The existing architecture provides a clean, verifiable institutional authorization path. Decoupling `PreferredGuideUserId` from `GuideUserId` solves the semantic conflict cleanly while preserving 100% of existing contracts, tests, and frozen module boundaries.

**Proceed with Phase 5 implementation.**
