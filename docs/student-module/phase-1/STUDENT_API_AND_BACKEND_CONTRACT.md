# COLABEX — STUDENT MODULE
# DELIVERABLE 4: API & BACKEND CONTRACT SPECIFICATION
**Phase 1: Complete System Audit, Academic Lifecycle Discovery & Implementation Blueprint**
**Date:** November 24, 2026  
**Status:** Authoritative Backend Contract Baseline  
**Scope:** Inventory of Verified Existing APIs & Formal Specifications for All Proposed Student APIs  

---

## 1. INVENTORY OF VERIFIED EXISTING STUDENT-FACING APIS

Every endpoint below has been verified directly in `StudentController.cs` and `ArtifactsController.cs` within `backend/src/ProjectHub.Api/Controllers`:

### 1.1 `GET /api/student/workspace`
- **Controller:** `StudentController`
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.StudentOrLead)]`
- **Status:** **VERIFIED (Partial)**
- **Behavior:** Queries active `TeamMember` row for `_tenantContext.UserId`. If found, eager-loads `ProjectTeam`, `GuideUser`, `AcademicTrack`, `Members`, `Tasks`, `Artifacts`, and `WeeklyLogs`.
- **Response DTO:** `StudentWorkspaceDto` (HTTP 200 OK).
- **Limitation / Defect:** If student has no team, returns `HTTP 404 Not Found` with `{ message: "You are not currently enrolled in an active project team." }`. Does not support unallocated students.

### 1.2 `POST /api/student/tasks`
- **Controller:** `StudentController`
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.StudentOrLead)]`
- **Status:** **VERIFIED**
- **Request Body:** `CreateTaskRequest` (`Title`, `CategoryTag`, `AssignedToUserId`, `Status`, `DueDateUtc`).
- **Response DTO:** `SprintTaskDto` (HTTP 200 OK).
- **Persistence:** Creates record in `SprintTasks` stamped with `team.CollegeId` and `team.Id`.

### 1.3 `PUT /api/student/tasks/{taskId}`
- **Controller:** `StudentController`
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.StudentOrLead)]`
- **Status:** **VERIFIED**
- **Request Body:** `UpdateTaskRequest` (`Title`, `CategoryTag`, `AssignedToUserId`, `Status`, `DueDateUtc`).
- **Response:** HTTP 204 NoContent.
- **Security Check:** Verifies `task.ProjectTeamId == team.Id` (Anti-IDOR isolation).

### 1.4 `POST /api/student/logs`
- **Controller:** `StudentController`
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.StudentOrLead)]`
- **Status:** **VERIFIED**
- **Request Body:** `SubmitLogbookRequest` (`WeekNumber`, `AccomplishmentsSummary`, `BlockersSummary`, `HoursLogged`, `GitCommitCount`).
- **Response:** HTTP 200 OK `{ success = true, weekNumber, status = "SubmittedPendingVerification" }`.
- **Business Rule:** If log already exists for `(team.Id, studentId, WeekNumber)`, updates fields and resets `IsVerified = false`.

### 1.5 `POST /api/student/artifacts/{slot}/upload`
- **Controller:** `StudentController`
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.StudentOrLead)]`
- **Status:** **VERIFIED**
- **Consumes:** `multipart/form-data` (`IFormFile file`). Max 25 MB (`26_214_400` bytes).
- **Validation:** Only `.pdf`, `.ppt`, and `.pptx` extensions permitted. Permitted slots: `Synopsis`, `MidTermPPT`, `PlagiarismReport`, `FinalThesis`.
- **Persistence:** Streams file to disk vault via `IFileStorageService.SaveAsync()`, computes SHA-256 hash, updates/inserts `TeamArtifacts`. Resets `ReviewerNote = null`.
- **Response DTO:** `ArtifactSlotDto` (HTTP 200 OK).

### 1.6 `POST /api/student/artifacts`
- **Controller:** `StudentController`
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.StudentOrLead)]`
- **Status:** **VERIFIED**
- **Request Body:** `UploadArtifactRequest` (`SlotType`, `FileName`, `StorageKey`, `Sha256Checksum`, `FileSizeBytes`).
- **Response:** HTTP 200 OK `{ success = true, slot, status }`.

### 1.7 `GET /api/student/problem-bank`
- **Controller:** `StudentController`
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.StudentOrLead)]`
- **Status:** **VERIFIED**
- **Behavior:** Returns unallocated and non-deleted `ProblemBankStatements` ordered by `CreatedAtUtc` descending.
- **Response DTO:** `List<ProblemBankStatement>` (HTTP 200 OK).

### 1.8 `POST /api/student/continue-lineage`
- **Controller:** `StudentController`
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.StudentOrLead)]`
- **Status:** **VERIFIED**
- **Request Body:** `ContinueLineageRequest` (`TargetAcademicTrackId`, `NewTitle`, `NewAbstract`).
- **Behavior:** Copies team roster, preserves `ProjectLineageId`, and links `ParentProjectTeamId` into target academic track.
- **Response:** HTTP 200 OK `{ success, newTeamId, lineageId, parentTeamId, title }`.

### 1.9 `POST /api/student/exit-survey`
- **Controller:** `StudentController`
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.StudentOrLead)]`
- **Status:** **VERIFIED**
- **Request Body:** `SubmitExitSurveyRequest` (`Dictionary<string, int> PoRatings`).
- **Persistence:** Serializes ratings to `PoRatingsJson` in `CourseExitSurveys`.
- **Response:** HTTP 200 OK `{ success = true, submittedAtUtc }`.

### 1.10 `GET /api/student/portfolio`
- **Controller:** `StudentController`
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.StudentOrLead)]`
- **Status:** **VERIFIED**
- **Behavior:** Aggregates user profile, verified team artifacts, total hours logged, and commit count.
- **Response DTO:** `StudentPortfolioDto` (HTTP 200 OK).

### 1.11 `GET /api/artifacts/{artifactId}/download`
- **Controller:** `ArtifactsController`
- **Policy:** `[Authorize]`
- **Status:** **VERIFIED**
- **Security Check:** Authorizes SuperAdmin, CollegeAdmin, HOD of team's dept, assigned guide, active team members, and panel evaluators. Returns HTTP 403 Forbidden to unauthorized users.
- **Response:** Physical file binary stream with `Content-Disposition: attachment; filename="[name]"`.

---

## 2. FORMAL CONTRACT SPECIFICATIONS FOR PROPOSED MISSING APIS

The following endpoints are **PROPOSED** to fulfill all missing requirements identified in the RTM. They will be added across Phases 2 through 8 without altering existing frozen controllers:

### 2.1 `GET /api/student/dashboard` (Phase 2)
- **Controller:** `StudentController`
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.StudentOrLead)]`
- **Contract:**
  ```json
  // HTTP 200 OK
  {
    "studentId": "guid",
    "fullName": "Shivansh Mehra",
    "enrollmentNumber": "0176CS221045",
    "departmentName": "Computer Science & Engineering",
    "currentSemester": 6,
    "academicYear": "2026-2027",
    "hasActiveProject": true,
    "activeTeamId": "guid",
    "projectSummary": {
      "teamCode": "2026-CS-MIN-01",
      "title": "Smart IoT Energy Monitoring...",
      "status": "Active",
      "guideName": "Prof. S. K. Verma",
      "pendingTasksCount": 3,
      "overdueTasksCount": 0,
      "nextMilestoneTitle": "Mid-Term Viva Defense",
      "nextMilestoneDueDate": "2026-04-15T18:30:00Z"
    },
    "recentFeedback": [
      { "source": "WeeklyLog Week 4", "note": "Detailed firmware telemetry verified.", "date": "2026-03-20T10:00:00Z" }
    ],
    "unreadNotificationsCount": 2
  }
  ```
- **Unallocated State:** If student has no project, `hasActiveProject = false`, `projectSummary = null`, and `suggestedActions` provides quick links to explore topics or create a team.

### 2.2 `GET /api/student/profile` & `PUT /api/student/profile` (Phase 2)
- **Controller:** `StudentController`
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.StudentOrLead)]`
- **Contract:**
  - `GET`: Returns verified read-only academic fields (`FullName`, `EnrollmentCode`, `DepartmentName`, `AdmissionBatch`) and editable fields (`Skills`, `GitHubHandle`, `JiraKey`, `PhoneNumber`, `Bio`).
  - `PUT`: Accepts editable fields. Rejects any mutation of USN or Department. Updates `UserAccounts`.

### 2.3 `POST /api/student/ideas` & `POST /api/student/ideas/{id}/submit` (Phase 3)
- **Controller:** `StudentController`
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.StudentOrLead)]`
- **Contract:**
  - `POST /ideas`: Body `{ title, abstract, domainTag, sdgCode }`. Inserts `ProjectTeams` in `Draft` state. Runs trigram similarity check.
  - `POST /ideas/{id}/submit`: Transitions status from `Draft` to `PendingGuide`. Dispatches notification to guide. Locks roster against new joins.

### 2.4 `POST /api/student/check-similarity` (Phase 3)
- **Controller:** `StudentController`
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.StudentOrLead)]`
- **Request Body:** `{ "title": "string" }`
- **Response:**
  ```json
  {
    "similarityScorePct": 78.5,
    "isDuplicateWarning": true,
    "closestMatchingProjectTitle": "IoT Smart Energy Metering (2024-CS-MAJ-08)",
    "recommendation": "Title exhibits >65% lexical similarity with an archived project. Please refine problem scope."
  }
  ```

### 2.5 `GET /api/student/peers` (Phase 4)
- **Controller:** `StudentController`
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.StudentOrLead)]`
- **Query Params:** `?skill=Python&domain=IoT&search=Sharma`
- **Behavior:** Queries `UserAccounts` where `Role == Student`, `DepartmentId == caller.DepartmentId`, and user has no active team in current track. Masks confidential data (omits CGPA and phone).

### 2.6 `POST /api/student/teams/invitations` & `POST /api/student/invitations/{id}/accept` (Phase 4)
- **Controller:** `StudentController`
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.StudentOrLead)]`
- **Behavior:** Leader creates invitation for peer. Peer calls `/accept` inside a serialized transaction checking current team count < `track.MaxTeamSize`.

### 2.7 `GET /api/student/viva-schedule` (Phase 7)
- **Controller:** `StudentController`
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.StudentOrLead)]`
- **Behavior:** Queries `VivaPanels` matching student's team track and department. Returns defense date, time, venue/virtual meet link, and instructions.

### 2.8 `GET /api/student/evaluation` (Phase 7)
- **Controller:** `StudentController`
- **Policy:** `[Authorize(Policy = ProjectHubPolicies.StudentOrLead)]`
- **Security Guard:** Returns evaluation ONLY if `VivaEvaluation.IsCertified == true` or HOD has formally published results. Returns 403 Forbidden if results remain in draft/uncertified state.
