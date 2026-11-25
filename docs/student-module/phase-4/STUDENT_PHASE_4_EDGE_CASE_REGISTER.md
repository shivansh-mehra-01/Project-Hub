# COLABEX — STUDENT MODULE
# PHASE 4: TEAM FORMATION, MEMBERSHIP & INVITATION LIFECYCLE
## Edge Case Register & Robustness Verification

**Project:** Colabex — Multi-College Academic Project Management SaaS  
**Module:** Student Module — Phase 4  
**Date:** November 24, 2026  
**Working Branch:** `integration/super-admin-college-admin`  
**Protected HOD Baseline:** `bd5bfc759cc9c46befa04e6ea8c26c84862acea4`  
**HEAD Commit:** `983242cbcf5fa40cdd3807551d1c8ce971ad9eff`  

---

## 1. OBJECTIVE

This document records the architectural analysis, mitigation strategy, failure modes, and automated verification evidence for all potential edge cases across the Team Formation and Invitation Lifecycle (Requirements `TEAM-001` through `TEAM-012`).

---

## 2. EDGE CASE REGISTER

### EC-01: Cross-Tenant Teammate Invitation Attempt
- **Scenario:** A student belonging to College A attempts to invite a student belonging to College B by passing their UUID or USN.
- **Risk:** Multi-tenant data leakage or illegal cross-institutional team formation.
- **Mitigation:**
  - `ICollegeTenantContext` strictly enforces `CollegeId` partition filtering on all database queries.
  - Queries for the invitee student evaluate `u.CollegeId == tenantContext.CollegeId`.
  - The lookup returns `null`, resulting in `404 Not Found` with message `"Student not found or not eligible for team invitation."`
- **Verification:** Verified by tenant isolation tests in `CrossTenantAndAuthorizationTests.cs`.

---

### EC-02: Cross-Department Teammate Invitation When Cross-Branch Is Disabled
- **Scenario:** A CSE student attempts to invite an ME student when the department's active `AcademicTrack` has `AllowCrossBranchTeams = false`.
- **Risk:** Academic rule violation and accreditation audit failure.
- **Mitigation:**
  - Endpoint resolves the active `AcademicTrack` for the cohort.
  - If `!academicTrack.AllowCrossBranchTeams && inviteeEnrollment.DepartmentId != callerEnrollment.DepartmentId`, request is rejected with `400 Bad Request` (`"Cross-branch team formation is disabled for this academic track."`).
- **Verification:** Verified by integration test logic in `StudentPhase4Tests.cs`.

---

### EC-03: Invitation of an Already-Allocated Student
- **Scenario:** A Team Leader attempts to invite a student who is already confirmed and enrolled in another project team.
- **Risk:** Dual-allocation of students, duplicate project submissions, and broken workload tracking.
- **Mitigation:**
  - `InviteTeammate` endpoint checks `inviteeEnrollment.TeamId != null`.
  - If already allocated, returns `400 Bad Request` with message `"Student is already allocated to a project team."`
- **Verification:** Verified by `StudentPhase4Tests.InviteTeammate_AlreadyAllocatedStudent_ReturnsBadRequest`.

---

### EC-04: Duplicate or Competing Pending Invitations for Same Student-Team Pair
- **Scenario:** A Team Leader clicks "Invite" multiple times rapidly or submits multiple invitations for the same peer.
- **Risk:** Duplicate database records and confusing notifications for the recipient.
- **Mitigation:**
  - **Database Unique Constraint:** `IX_TeamInvitations_CollegeId_ProjectTeamId_InviteeStudentId` filtered on `"Status" = 'Pending' AND "IsDeleted" = false`.
  - **Application Check:** Endpoint checks if any pending invitation exists for that pair and returns `409 Conflict` (`"A pending invitation has already been sent to this student."`).
- **Verification:** Verified by `StudentPhase4Tests.InviteTeammate_DuplicatePendingInvitation_ReturnsConflict`.

---

### EC-05: Auto-Cancellation of Competing Pending Invitations upon Acceptance
- **Scenario:** A student receives invitations from Team A, Team B, and Team C. The student accepts the invitation from Team A.
- **Risk:** Leaving dangling pending invitations from Team B and Team C that could be accepted later, creating invalid multi-team memberships.
- **Mitigation:**
  - In `AcceptInvitation`, inside an atomic transaction:
    1. Team A's invitation is updated to `InvitationStatus.Accepted`.
    2. Student is enrolled into Team A (`StudentAcademicEnrollment.TeamId = team.Id`).
    3. All other pending invitations where `InviteeStudentId == studentId` are automatically updated to `InvitationStatus.Cancelled` with remarks `"Auto-cancelled due to acceptance of team {team.Title}"`.
- **Verification:** Verified by `StudentPhase4Tests.AcceptInvitation_EnrollsStudent_AndAutoCancelsCompetingInvites`.

---

### EC-06: Team Over-Capacity / Exceeding Maximum Team Size
- **Scenario:** A team of 4 (maximum capacity) attempts to dispatch more invitations or accept incoming invitations.
- **Risk:** Unfair team advantage and violation of departmental project guidelines.
- **Mitigation:**
  - `InviteTeammate` checks `currentMemberCount >= maxTeamSize` and rejects with `400 Bad Request`.
  - `AcceptInvitation` re-evaluates `currentMemberCount >= maxTeamSize` at the exact moment of acceptance and rejects with `400 Bad Request` if capacity was reached in the interim.
- **Verification:** Verified by `StudentPhase4Tests.InviteTeammate_WhenTeamAtMaxCapacity_ReturnsBadRequest`.

---

### EC-07: Roster Modification After Proposal Submission (Roster Freezing)
- **Scenario:** A team submits their proposal for faculty review (`PendingGuide`). Afterward, the leader attempts to remove a teammate or invite a new one, or a member attempts to leave.
- **Risk:** Faculty reviews and signs off on a proposal whose team composition subsequently mutates.
- **Mitigation:**
  - Upon submission, `ProjectTeam.IsRosterLocked` is set to `true`.
  - Every mutating endpoint (`InviteTeammate`, `AcceptInvitation`, `TransferLeadership`, `LeaveTeam`, `RemoveMember`) checks:
    ```csharp
    if (team.IsRosterLocked || team.Status != ProjectStatus.Draft)
    {
        return BadRequest(new { message = "Team roster is locked and cannot be modified once proposal is submitted." });
    }
    ```
- **Verification:** Verified by `StudentPhase4Tests.RosterMutability_WhenProposalSubmitted_RejectsAllModifications` and Playwright Journey `J14`.

---

### EC-08: Non-Leader Member Removal Attempt
- **Scenario:** An ordinary team member attempts to remove another team member or the team leader by invoking `DELETE /api/student/teams/members/{id}`.
- **Risk:** Malicious or accidental expulsion of teammates by peers.
- **Mitigation:**
  - Endpoint verifies `team.CreatorUserId == currentUserId`.
  - If caller is not the leader, returns `403 Forbidden` (`"Only the team leader can remove team members."`).
- **Verification:** Verified by `StudentPhase4Tests.RemoveMember_ByNonLeader_ReturnsForbidden`.

---

### EC-09: Leadership Delegation to an External User or Non-Member
- **Scenario:** Team Leader attempts to pass leadership to a student ID who is not an enrolled member of the team.
- **Risk:** Team hijacking or orphan team states.
- **Mitigation:**
  - Endpoint validates that target user is an actively enrolled member of the same team:
    ```csharp
    var targetEnrollment = await _context.StudentAcademicEnrollments
        .FirstOrDefaultAsync(e => e.StudentUserId == request.NewLeaderStudentId && e.TeamId == team.Id);
    if (targetEnrollment == null)
    {
        return BadRequest(new { message = "Target student is not an enrolled member of this team." });
    }
    ```
- **Verification:** Verified by `StudentPhase4Tests.TransferLeadership_ToNonMember_ReturnsBadRequest`.

---

### EC-10: Voluntary Exit by Team Leader Without Transferring Leadership
- **Scenario:** Team Leader attempts to invoke `POST /api/student/teams/leave`.
- **Risk:** Leaving a team in a headless state without an assigned lead to manage proposals or invitations.
- **Mitigation:**
  - Endpoint checks if `callerUserId == team.CreatorUserId`.
  - Rejects with `400 Bad Request`: `"The team leader cannot leave the team. You must delegate leadership to another member before leaving, or delete the draft team."`
- **Verification:** Verified by `StudentPhase4Tests.LeaveTeam_ByLeader_ReturnsBadRequest`.

---

### EC-11: Inactive or Suspended Student Peer Discovery
- **Scenario:** A student on academic probation, suspension, or backlog pause appears in teammate discovery.
- **Risk:** Unviable team formations with students unable to participate in project evaluations.
- **Mitigation:**
  - Peer discovery queries filter `e.AcademicStatus == AcademicStatus.Active && e.Student.IsActive == true`.
  - Inactive/suspended students are omitted from eligible peer discovery.
- **Verification:** Verified by `StudentPhase4Tests.GetEligiblePeers_ReturnsOnlyUnallocatedSameDepartmentStudents`.

---

### EC-12: Institutional Data Minimization on Classmate Search
- **Scenario:** Malicious actor inspects network payloads on classmate discovery search to scrape private student data (CGPA, marks, mobile numbers, addresses).
- **Risk:** FERPA / Institutional data protection violation.
- **Mitigation:**
  - EF Core query uses strict DTO projection:
    ```csharp
    .Select(e => new EligiblePeerDto
    {
        StudentUserId = e.StudentUserId,
        FullName = e.Student.FullName,
        EnrollmentNumber = e.Student.EnrollmentOrEmployeeCode ?? "N/A",
        DepartmentName = e.Department.Name,
        DepartmentCode = e.Department.Code
    })
    ```
  - At no point are private profile fields included in the SQL `SELECT` statement.
- **Verification:** Verified by `StudentPhase4Tests.GetEligiblePeers_EnforcesDataMinimization_NoPrivateDataExposed`.

---

## 3. SUMMARY OF RESILIENCE

All 12 identified edge cases are rigorously guarded by database constraints, EF Core transaction boundaries, and controller validation predicates. No single edge case permits data corruption, illegal team assignment, or multi-tenant leakage.
