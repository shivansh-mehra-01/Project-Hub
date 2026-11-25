# COLABEX — STUDENT MODULE
# PHASE 5: OFFICIAL GUIDE ALLOCATION
## Limitations & Architectural Boundary Register

**Project:** Colabex — Multi-College Academic Project Management SaaS  
**Module:** Student Module — Phase 5  
**Date:** November 24, 2026  
**Working Branch:** `integration/super-admin-college-admin`  
**Protected HOD Baseline:** `bd5bfc759cc9c46befa04e6ea8c26c84862acea4`  
**HEAD Commit:** `983242cbcf5fa40cdd3807551d1c8ce971ad9eff`  

---

## 1. PURPOSE OF THIS REGISTER

This document establishes the official architectural boundaries, operational constraints, frozen module invariants, and deliberate scope limitations for Phase 5 (Official Guide Allocation) of the Colabex Student Module.

All software engineers, auditors, and future phase implementations must adhere to the invariants defined in this register.

---

## 2. ARCHITECTURAL INVARIANTS & CONSTRAINTS

### 2.1 Complete Separation of Preferred Guide vs. Officially Allocated Guide
- **Invariant:** `ProjectTeam.GuideUserId` is strictly reserved for the **Officially Allocated Guide**.
- **Rule:** Under no circumstance may a student endpoint, frontend component, or background service assign `ProjectTeam.GuideUserId`.
- **Enforcement:** `POST /api/student/teams/guide-preference` sets only `PreferredGuideUserId`, `GuidePreferenceStatus = Requested`, `GuidePreferenceSubmittedAtUtc`, and `GuidePreferenceRemarks`. It is architecturally impossible for a student team to self-allocate or confirm their own guide.

### 2.2 Institutional Allocation Authorization
- **Invariant:** Only an authorized Head of Department (`HodController.AssignGuide`) or Academic Coordinator (`CoordinatorController.AssignGuide`) has the authority to bind `ProjectTeam.GuideUserId`.
- **Rule:** The allocating user must belong to the exact same college tenant and academic department as the student team. Cross-department or cross-college allocations are rejected with `400 Bad Request`.

### 2.3 Guide Preference State Machine
The lifecycle follows a deterministic 4-state finite state machine:
```
           [ Team Created ]
                  │
                  ▼
                None
                  │
                  │ Student submits preference
                  ▼
              Requested
              ┌───┴───┐
              │       │
Coordinator   │       │ Coordinator
assigns guide │       │ rejects request
              ▼       ▼
          Allocated  Rejected
                      │
                      │ Student resubmits
                      └─────────────► Requested
```
- **Rule 1:** A team may submit a preference only while in `Draft` stage and while `GuideUserId == null`.
- **Rule 2:** Once an official guide is allocated (`Allocated`), student preference submission is locked.
- **Rule 3:** If a request is rejected (`Rejected`), the student team leader can review coordinator remarks and submit a revised preference back to `Requested`.

### 2.4 Immutable Reassignment Audit History
- **Invariant:** Whenever an official guide is assigned, reassigned, or rejected, an immutable log entry is generated in `ExceptionAuditLogs`.
- **Fields Logged:** `CollegeId`, `UserId` (Authorizing official), `ActionType = "ReassignGuide"`, `TargetEntityId = team.Id`, and structured JSON/text remarks detailing `PreviousGuideId`, `NewGuideId`, and administrative rationale.
- **Client Visibility:** Students view this audit history in `StudentGuidePreferenceDto.ReassignmentHistory` in read-only format.

---

## 3. FROZEN MODULES & PROTECTED BOUNDARIES

The following modules remain permanently frozen and were not modified during Phase 5:

1. **`HodController.cs` (Protected Baseline `bd5bfc759cc9c46befa04e6ea8c26c84862acea4`):**
   - Must remain byte-for-byte identical.
   - Any HOD-related allocation continues to use the existing `AssignGuide` action without modification.
2. **`FacultyController.cs`:**
   - Frozen. Faculty review and proposal endorsement workflows are preserved as established in Phase 3.
3. **`CollegeController.cs` (College Admin):**
   - Frozen. Institutional configuration and department management endpoints remain untouched.
4. **`PlatformAdminController.cs` (Super Admin):**
   - Frozen. Platform-wide operations remain untouched.

---

## 4. OBSERVED LIMITATIONS & FUTURE CONSIDERATIONS

### 4.1 Faculty Mentorship Capacity Enforcement (Advisory vs. Hard Block)
- **Current Behavior:** In Phase 5, faculty mentorship capacity (`CurrentMentoredTeams` vs `MaxMentorTeams`) is surfaced as live advisory data in `GET /api/student/faculty-guides` and displayed in the frontend modal. The coordinator may exercise academic discretion to assign a faculty member slightly over quota if departmental circumstances dictate.
- **Future Scope:** If an institution requires a strict database-level hard block on coordinator assignments beyond `MaxMentorTeams`, an academic track policy flag (`EnforceStrictFacultyCap`) can be introduced in a future governance phase.

### 4.2 Multi-Guide / Co-Guide Support
- **Current Behavior:** The Colabex schema supports a single Primary Guide (`GuideUserId`) and single Preferred Guide (`PreferredGuideUserId`).
- **Future Scope:** Co-guide or inter-disciplinary industry mentor models can be introduced by creating an optional `ProjectTeamCoGuide` junction entity in a future advanced curriculum phase without breaking the primary guide invariants established here.

### 4.3 Phase 6 Scope Boundary
- **Boundary:** Phase 5 covers exclusively guide preference nomination, review, official allocation, rejection feedback, and reassignment audit trails.
- **Phase 6 Scope (Project Execution & Task Management):** Sprint planning, weekly work logs, task assignments, milestone deliverables, git commit tracking, and evaluation submissions belong exclusively to Phase 6 and subsequent phases. Phase 6 implementation must NOT begin without explicit user authorization.

---

## 5. SUMMARY REGISTER

| Register ID | Dimension | Current Invariant | Mitigation / Enforcement |
| :--- | :--- | :--- | :--- |
| **REG-501** | Student Allocation Privilege | Students can NEVER assign official guides. | Enforced by API authorization, domain model separation, and tests. |
| **REG-502** | Department Isolation | Faculty and team must belong to same department. | Enforced in `StudentController` and `CoordinatorController`. |
| **REG-503** | Roster Freezing vs Guide State | Guide allocation does not unfreeze locked team rosters. | Roster freezing rules established in Phase 4 remain intact. |
| **REG-504** | Audit Trail Permanence | Reassignment history is immutable in `ExceptionAuditLogs`. | No update/delete endpoints exist for audit logs. |
| **REG-505** | Baseline Protection | Zero byte diff against protected HOD baseline. | Continuous preflight diff checks before and after execution. |
