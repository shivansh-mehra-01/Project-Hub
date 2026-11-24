# COLABEX — STUDENT MODULE
# DELIVERABLE 3: ACADEMIC LIFECYCLE & STATE MACHINES
**Phase 1: Complete System Audit, Academic Lifecycle Discovery & Implementation Blueprint**
**Date:** November 24, 2026  
**Scope:** Formal State Machine Specifications for All Student Domain Lifecycles  

---

## 1. COMPREHENSIVE ACADEMIC LIFECYCLE OVERVIEW

In the Colabex ecosystem, an engineering student's journey spans from institutional onboarding through multi-semester capstone engineering, evaluation, and permanent credential archival.

```mermaid
flowchart TD
    A["1. Institutional Onboarding\n(USN, College & Dept Bound)"] --> B["2. Academic Track Enrollment\n(Semester & Subject Offering)"]
    B --> C["3. Project Discovery & Peer Search\n(Problem Bank, Skills, Interests)"]
    C --> D["4. Team Formation & Roster Lock\n(Invite Peers, Capacity Min 2/Max 4)"]
    D --> E["5. Proposal & Guide Endorsement\n(Draft, Similarity Check, Faculty Review)"]
    E --> F["6. HOD Department Approval\n(Formal Academic Track Initiation)"]
    F --> G["7. Project Execution & Sprint Tracking\n(Tasks, Weekly Friday Logs, Artifacts)"]
    G --> H["8. Capstone Vault Submissions\n(Synopsis, MidTermPPT, Plagiarism, Thesis)"]
    H --> I["9. Viva Defense & Panel Evaluation\n(Blended 60/40 Rubric, Certified Marks)"]
    I --> J["10. NBA Exit Survey & Attainment\n(Criterion 3 Attestation)"]
    J --> K["11. Multi-Track Lineage or Degree Archival\n(Minor -> Major Project Continuation)"]
```

---

## 2. INDIVIDUAL STATE MACHINES

### 2.1 Student Account Lifecycle State Machine
Governs student institutional identity in `UserAccounts`:

```mermaid
stateDiagram-v2
    [*] --> Provisioned: College Admin / Coordinator Roster Import
    Provisioned --> FirstLoginPending: Initial Account Activation
    FirstLoginPending --> Active: Password Reset OTP Verified
    Active --> Active: Update Profile (Skills, Handles, Phone)
    Active --> Suspended: Administrative Action / Disciplinary Hold
    Suspended --> Active: Administrative Reinstatement
    Active --> Graduated: Degree Completion / Cycle Closure
    Graduated --> Archived: Permanent Record Archival
```

- **States:** `Provisioned`, `FirstLoginPending`, `Active`, `Suspended`, `Graduated`, `Archived`.
- **Verified Existing Implementation:** `UserAccounts.IsActive`, `UserAccounts.IsActivated`, `AuthController.cs`.
- **Proposed Future States:** `FirstLoginPending`, `Graduated`, `Archived`.

---

### 2.2 Project Idea & Proposal Lifecycle State Machine
Governs team proposal creation, revision, and academic endorsement:

```mermaid
stateDiagram-v2
    [*] --> Draft: Student Creates Idea Draft
    Draft --> Draft: Edit Title, Abstract, Domain, SDG
    Draft --> PendingGuide: Team Lead Submits Proposal
    PendingGuide --> ReturnedForRevision: Faculty Guide Requests Corrections
    ReturnedForRevision --> PendingGuide: Team Resubmits Revised Proposal
    PendingGuide --> PendingHOD: Faculty Guide Endorses Proposal
    PendingGuide --> Rejected: Faculty Guide Rejects Proposal
    PendingHOD --> Approved: Department HOD Approves
    PendingHOD --> ReturnedForRevision: HOD Returns for Revision
    PendingHOD --> Rejected: HOD Rejects Proposal
    Approved --> Active: Academic Track Kickoff
    Rejected --> [*]: Terminal Rejection (Roster Unlocked)
```

- **Current Repository Status:**
  - `ProjectStatus` enum values: `Draft`, `PendingGuide`, `PendingHOD`, `Approved`, `Active`, `NeedsRevision`, `Rejected`, `Completed`.
  - `FacultyController.cs` implements `proposals/{id}/endorse`, `return`, `reject`.
  - `HodController.cs` implements `proposals/{id}/approve`, `reject`, `return`.
  - **GAP:** Student proposal submission (`Draft` -> `PendingGuide`) and resubmission are missing from `StudentController.cs` (Phase 3 task).

---

### 2.3 Team Formation & Invitation Lifecycle State Machine
Governs collaborative student team assembly:

```mermaid
stateDiagram-v2
    [*] --> TeamCreated: Student Initializes Team (Leader)
    TeamCreated --> MemberInvited: Leader Dispatches Invite to Peer
    MemberInvited --> MemberJoined: Peer Accepts Invitation (Capacity Checked)
    MemberInvited --> InviteDeclined: Peer Declines Invitation
    MemberInvited --> InviteCancelled: Leader Revokes Invitation
    MemberInvited --> InviteExpired: 7-Day Window Elapses
    MemberJoined --> MemberExited: Member Leaves (Permitted only in Draft)
    MemberJoined --> RosterLocked: Proposal Submitted to Guide
    RosterLocked --> ActiveExecution: Project Approved
```

- **Invariants & Transition Rules:**
  - **Min Team Size:** 2 (for team-mode tracks).
  - **Max Team Size:** 4.
  - **Locking Invariant:** Once proposal moves to `PendingGuide`, `IsRosterLocked = true`. No invitations, joins, or exits permitted.
  - **Concurrency Invariant:** Database transaction with row-level locks guarantees that two peers accepting simultaneously cannot exceed capacity.

---

### 2.4 Weekly Sprint Logbook Lifecycle State Machine
Governs continuous evaluation and Friday discipline tracking:

```mermaid
stateDiagram-v2
    [*] --> LogDrafted: Student Inputs Accomplishments & Hours
    LogDrafted --> Submitted: Student Submits Week Log
    Submitted --> Verified: Assigned Guide Signs Off
    Submitted --> NeedsRevision: Guide Requests Details / Corrections
    NeedsRevision --> Submitted: Student Updates Log (Resets Verification)
    Verified --> Submitted: Student Modifies Verified Log (Auto-Resets Flag)
    Verified --> LockedForSAR: Semester Grading Lock / SAR Attestation
```

- **Verified Existing Implementation:**
  - `StudentController.cs` (`SubmitLogbook`): Submits or updates logbook; line 225 explicitly sets `existing.IsVerified = false;`.
  - `FacultyController.cs` (`VerifyLog`): Mentor signs off with remarks and timestamp.

---

### 2.5 Capstone Vault Deliverable Lifecycle State Machine
Governs artifact uploads across the 4 standard slots (`Synopsis`, `MidTermPPT`, `PlagiarismReport`, `FinalThesis`):

```mermaid
stateDiagram-v2
    [*] --> Missing: Track Initialized
    Missing --> Uploaded: Student Uploads Binary (PDF/PPT <= 25MB)
    Uploaded --> Uploaded: Student Replaces File (Generates New Hash)
    Uploaded --> InReview: Faculty Downloads for Inspection
    InReview --> Verified: Faculty Approves Artifact
    InReview --> ReturnedForRevision: Faculty Returns Artifact with Remarks
    ReturnedForRevision --> Uploaded: Student Re-uploads Corrected File
    Verified --> Locked: HOD Examination Sign-off
```

- **Verified Existing Implementation:**
  - `ArtifactSlotType` (4 slots), `ArtifactStatus` (`Missing`, `Uploaded`, `InReview`, `Verified`, `Returned`, `Rejected`).
  - `StudentController.cs` (`UploadArtifactBinary`): Enforces size and extension, computes SHA-256, resets `ReviewerNote = null`.
  - `FacultyController.cs` (`ReviewArtifact`): Sets status and reviewer notes.

---

### 2.6 Viva Defense & Examination Evaluation State Machine
Governs final academic grading:

```mermaid
stateDiagram-v2
    [*] --> Scheduled: Coordinator Assigns Viva Panel & Track
    Scheduled --> DefenseConducted: Student Team Appears for Defense
    DefenseConducted --> EvaluationDrafted: Evaluators Record 60/40 Rubric
    EvaluationDrafted --> EvaluationCertified: Panel Finalizes Marks
    EvaluationCertified --> PublishedToStudents: HOD Signs Off / Results Published
    PublishedToStudents --> LockedForNBA: Exam Cutoff Reached / SAR Attestation
```

- **Confidentiality Rule:** Students can view evaluation marks ONLY after state transitions to `PublishedToStudents`.
- **Existing Implementation:** Evaluator submission in `FacultyController.cs`, marksheet certification in `CollegeController.cs`.
- **GAP:** Student-facing `GET /api/student/evaluation` endpoint is missing (Phase 7 task).
