# COLABEX — STUDENT MODULE
# DELIVERABLE 10: TEST & ACCEPTANCE PLAN
**Phase 1: Complete System Audit, Academic Lifecycle Discovery & Implementation Blueprint**
**Date:** November 24, 2026  
**Testing Frameworks:** xUnit, Microsoft.AspNetCore.Mvc.Testing, Entity Framework Core In-Memory, Playwright Test  
**Scope:** Automated Verification Blueprint Covering Unit, Integration, Concurrency, Security, and 36 E2E Journeys  

---

## 1. TESTING ARCHITECTURE & STRATEGY

The verification strategy for the Student Module follows the test pyramid:
1. **Unit Tests:** Domain entity invariants, validation rules, formula calculations (contribution metrics, similarity scores).
2. **Integration Tests:** ASP.NET Core `WebApplicationFactory` tests asserting HTTP status codes, authorization policies, Double-Lock tenant isolation, and transactional database rollbacks.
3. **Concurrency Tests:** Multi-threaded stress tests verifying PostgreSQL row locks, team capacity integrity, and `xmin` optimistic concurrency tokens.
4. **End-to-End (E2E) Journeys:** 36 comprehensive user journeys executed via Playwright covering all student states.

---

## 2. AUTOMATED TEST SUITE MATRICES

### 2.1 Backend Integration & Security Test Matrix
- `StudentAuthTests`: Validates student credential login, OTP request rate limiting (10 req/min), OTP single-use, and inactive account lockout.
- `StudentProfileSecurityTests`: Confirms that non-super-admin students receive 403 on `/api/account/profile`, but successfully read/update skills on `/api/student/profile`.
- `StudentWorkspaceIsolationTests`: Confirms that calling `/api/student/workspace` returns only the caller's team and that cross-team task updates are rejected with 404/403.
- `StudentVaultUploadTests`: Enforces 25 MB ceiling, rejects `.exe`/`.zip` binaries, confirms SHA-256 generation, and validates that replacing an artifact resets status to `Uploaded`.
- `StudentEvaluationConfidentialityTests`: Verifies that querying `/api/student/evaluation` returns 403 Forbidden while evaluation is in draft/uncertified state and returns marks once certified.

### 2.2 Concurrency Test Matrix
- `TeamCapacityRaceConditionTests`: 10 parallel threads simulate simultaneous acceptance of invitations when only 1 slot remains. Exactly 1 request succeeds; 9 receive HTTP 400 with capacity warning. Zero over-allocation allowed.
- `OptimisticConcurrencyTaskUpdateTests`: Simulates conflicting updates to the same `SprintTask` from multiple tabs; confirms `DbUpdateConcurrencyException` is handled gracefully.

---

## 3. THE 36 CANONICAL END-TO-END JOURNEY SCENARIOS

| Journey # | Scenario Title | Primary Actor | Preconditions | Triggering Action | Expected API & DB Result | Expected UI State | Failure / Negative Case |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **J01** | Student Login & First-Time Onboarding | Student | Account provisioned by coordinator with temporary password | Login via `/login` -> prompts password setup via OTP | `POST /api/auth/reset-password-with-otp` updates `PasswordHash` | First-login onboarding banner renders; redirects to workspace | Invalid OTP returns 400 Bad Request; replaying used OTP fails |
| **J02** | Profile Completion | Student | Logged in as student | Enters skills, bio, GitHub handle, and clicks Save | `PUT /api/student/profile` updates `UserAccounts.SkillsCsv` | Toast: "Profile Saved!"; completion bar increases | Attempt to mutate USN returns 400 Bad Request |
| **J03** | Student with No Active Project | Student | Newly enrolled student with no team | Navigates to `/student` | `GET /api/student/dashboard` returns `hasActiveProject = false` | Friendly EmptyState renders with "Create Team" and "Explore Topics" CTAs | Legacy workspace 404 is caught and handled gracefully |
| **J04** | Project Discovery | Student | Unallocated or exploring student | Visits `/student/explore` | `GET /api/student/problem-bank` returns unallocated statements | Card grid displays research topics with SDG badges and mentors | Inactive academic session hides application buttons |
| **J05** | Idea Creation & Draft | Student | Student in `Draft` state | Submits proposal form in "New Project" modal | `POST /api/student/ideas` inserts `ProjectTeams` in `Draft` state | Project banner updates to Draft status; StepperGPS step 1 active | Missing required abstract throws 400 Bad Request |
| **J06** | Idea Submission & Faculty Review | Team Lead | Team proposal draft ready | Team lead clicks "Submit Proposal to Guide" | `POST /api/student/ideas/{id}/submit` updates status to `PendingGuide` | StepperGPS advances to "Guide Review"; proposal form locked | Regular non-lead member attempting submit receives 403 Forbidden |
| **J07** | Idea Revision & Resubmission | Team Lead | Guide returns proposal with remarks | Lead updates proposal based on remarks and clicks Resubmit | `POST /api/student/ideas/{id}/resubmit` clears remarks, status `PendingGuide` | Banner updates: "Proposal Resubmitted (Pending Guide Review)" | Resubmitting without editing required fields fails validation |
| **J08** | Individual Project Registration | Student | Student enrolled in track with `ParticipationMode.Individual` | Registers individual thesis topic | `POST /api/student/ideas` creates solo team; sets max team size = 1 | Workspace shows solo student badge; team invite options disabled | Solo registration on team-mandatory track is rejected |
| **J09** | Team Project Registration | Student | Student in team-mode track | Registers team topic with 2+ members | Backend creates `ProjectTeams` with min size 2, max size 4 | Roster tab displays team members with leader crown | Registering with fewer than minimum required members fails |
| **J10** | Teammate Peer Search | Student | Looking for teammates | Searches peers by skill "Python" in Explore view | `GET /api/student/peers?skill=Python` returns unallocated peers | Classmate cards render showing skills and contact tags | Searching across restricted departments returns empty list |
| **J11** | Create Team Roster | Student | Student with no team | Clicks "Create Team" and names team | `POST /api/student/teams` creates team; sets creator as leader | Workspace roster tab renders with creator crowned Team Lead | Duplicate team code generation throws database collision retry |
| **J12** | Invitation Acceptance & Rejection | Student | Student receives team invitation | Peer clicks "Accept" on invitation card | `POST /api/student/invitations/{id}/accept` adds user to `TeamMembers` | Peer's workspace instantly switches to active team view | Accepting invitation after slot is filled returns 400 Bad Request |
| **J13** | Join Request Lifecycle | Student | Student requests to join open team | Clicks "Request to Join" on team card | Creates pending join request in `TeamInvitations` | Leader receives notification; can approve or decline | Requesting to join a locked team returns 400 Bad Request |
| **J14** | Team Capacity Enforcement | Team Lead | Team already has 4 members | Lead attempts to invite a 5th student | Backend asserts `memberCount < 4`; throws 400 | UI disables invite button; shows "Team at Max Capacity (4/4)" | Directly posting API bypass throws HTTP 400 validation error |
| **J15** | Team Leader Operations | Team Lead | Active team lead | Lead designates teammate as new leader | `PUT /api/student/teams/leader` updates `TeamMembers.IsTeamLead` | Crown icon moves to new leader; caller controls downgrade | Designating non-member throws 404 NotFound |
| **J16** | Team Verification & Roster Lock | System | Team submits project proposal | Proposal state moves to `PendingGuide` | Database sets `ProjectTeams.IsRosterLocked = true` | Lock icon appears on roster; "Add Member" buttons disappear | Modifying team membership while locked returns 403 Forbidden |
| **J17** | Guide Allocation Visibility | Student | Coordinator assigns guide to team | Coordinator calls `POST /api/coordinator/teams/{id}/assign-guide` | `ProjectTeams.GuideUserId` updated in DB | Guide card in workspace updates showing faculty name & email | Unallocated team displays "Guide Allocation in Progress" banner |
| **J18** | Project Initiation | Student | HOD approves proposal | HOD calls `POST /api/hod/proposals/{id}/approve` | Project status transitions to `Approved` -> `Active` | StepperGPS advances to "Active Execution"; sprint tasks unlocked | Student attempting execution actions before approval receives 403 |
| **J19** | Task Creation & Assignment | Student | Active project workspace | Creates sprint task "Design Firmware" assigned to self | `POST /api/student/tasks` inserts `SprintTasks` | New card appears in Todo column of Kanban board | Assigning task to student outside team throws 400 Bad Request |
| **J20** | Task Completion | Student | Task in InProgress column | Drags task to Done or changes status dropdown | `PUT /api/student/tasks/{id}` updates status to `Done` | Task card moves to Done column with completed checkmark | Updating task belonging to another team returns 404/403 |
| **J21** | Milestone Tracking | Student | Active project execution | Inspects upcoming deadlines in workspace | `GET /api/student/milestones` returns academic track milestones | Milestone StepperGPS displays due dates and countdown badges | Overdue milestone renders with red urgency badge |
| **J22** | Weekly Log Submission | Student | Friday sprint interval | Submits accomplishments, blockers, and 14 hours | `POST /api/student/logs` inserts/updates `WeeklyLogbooks` | History log card renders with "Submitted (Pending Verification)" | Negative hours or empty accomplishments rejected by validator |
| **J23** | Weekly Log Revision | Student | Student edits verified log | Submits correction to Week 3 accomplishments | `POST /api/student/logs` updates text; resets `IsVerified = false` | Status badge resets from green "Verified" to amber "Submitted" | Tampering with mentor remarks field is stripped by DTO |
| **J24** | Faculty Feedback Visibility | Student | Guide verifies log with remarks | Guide calls `POST /api/faculty/logs/{id}/verify` | `WeeklyLogbooks.MentorRemarks` stamped with remarks | Log card renders mentor remark block with faculty name | Inactive guide comments are sanitized and displayed cleanly |
| **J25** | Deliverable Upload (Vault) | Student | Synopsis deadline approaching | Uploads 5 MB PDF into Synopsis slot | `POST /api/student/artifacts/Synopsis/upload` saves file | Synopsis slot changes from `Missing` to `Uploaded` with SHA-256 | Uploading `.exe` file is rejected with 400 Bad Request |
| **J26** | Deliverable Replacement | Student | Synopsis uploaded, not verified | Student re-uploads revised PDF before review | Overwrites file stream, generates new SHA-256, resets note | Toast: "Deliverable Replaced"; timestamp updates | Replacing deliverable after faculty lock returns 403 Forbidden |
| **J27** | Submission & Revision | Student | Guide returns deliverable for revision | Guide calls `review` with status `Returned` | `TeamArtifacts.Status` set to `Returned`; note displayed | Slot badge turns red "Returned for Revision"; re-upload enabled | Re-uploading clears previous reviewer note and resets status |
| **J28** | Final Project Submission | Team Lead | End of semester submission deadline | Lead clicks "Submit Final Capstone Package" | `POST /api/student/submit-final` sets team status to `Submitted` | Vault locks all slots against further editing; shows "Locked" | Attempting re-upload after final submission returns 403 Forbidden |
| **J29** | Viva Schedule Visibility | Student | Defense panel scheduled by coordinator | Coordinator calls `POST /api/coordinator/panels` | `VivaPanels` row created for track | Workspace shows Defense Schedule card: Date, Time, Venue, Link | Team in unapproved status hides defense schedule card |
| **J30** | Evaluation Publication | Student | Exam results certified by College Admin | Admin calls `POST /api/college/results/certify` | `VivaEvaluation.IsCertified = true` | "Evaluations & Defense" tab renders 60/40 blended marksheet | Student querying evaluation before certification receives 403 |
| **J31** | Notification Lifecycle | Student | Guide signs log or invites received | Event triggered in backend | Inserts record into `StudentNotifications` | Notification bell badge count increments; clicking navigates | Marking all read updates `IsRead = true` in DB |
| **J32** | Academic History & Lineage | Student | Minor Project completed; continues to Major | Calls `POST /api/student/continue-lineage` | Clones team roster into Major track with matching `LineageId` | Portfolio renders multi-semester degree capstone timeline | Continuing lineage into nonexistent track returns 400 Bad Request |
| **J33** | Suspended Account Behavior | Student | Student suspended during semester | College Admin sets `UserAccounts.IsActive = false` | Next API call returns 401 Unauthorized | App shell redirects to `/login` with lockout modal | Session cookie / JWT revoked immediately |
| **J34** | Direct Unauthorized URL Access | Student | Student manually types `/hod/approvals` in URL | `RouteGuard.tsx` checks allowed roles against JWT | Route guard prevents page load; redirects to `/student` | Immediate redirect with warning toast: "Access Denied" | Backend API also asserts `[Authorize(Policy = HodOnly)]` -> 403 |
| **J35** | Cross-Tenant Isolation | Student | Malicious student attempts to query College B team | Injects foreign `TeamId` in workspace or artifact URL | PostgreSQL RLS + EF Core query filter rejects query | Returns 404 NotFound / 403 Forbidden without leaking existence | Database asserts zero cross-tenant row exposure |
| **J36** | Academic Cycle Closure | Student | Academic year concludes | Session marked inactive | All project artifacts and marks set to immutable read-only | Workspace shows archived banner; portfolio remains downloadable | Mutating archived tasks or logs returns 403 Forbidden |

---

## 4. ACCEPTANCE GATES & SIGNOFF CRITERIA

A Student Module phase can be approved only when:
1. 100% of the journeys allocated to that phase pass automated verification.
2. Zero console or React hydration errors occur on client navigation.
3. Every API response enforces tenant and object ownership.
4. All existing 122 baseline regression tests remain completely green.
