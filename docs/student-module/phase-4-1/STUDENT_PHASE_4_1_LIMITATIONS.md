# COLABEX — STUDENT MODULE
# PHASE 4.1: ARCHITECTURAL LIMITATIONS & DEFERRED BEHAVIOR REGISTER

**Project:** Colabex — Multi-College Academic Project Management SaaS  
**Module:** Student Module — Phase 4.1  
**Date:** November 24, 2026  
**Working Branch:** `integration/super-admin-college-admin`  
**HEAD Commit:** `983242cbcf5fa40cdd3807551d1c8ce971ad9eff`  

---

## 1. PURPOSE

This document records all confirmed architectural limitations, operational trade-offs, deferred features, and production-readiness considerations identified during Phase 4 and Phase 4.1 verification.

---

## 2. REGISTERED LIMITATIONS & OPERATIONAL TRADEOFFS

### LIM-01: Lazy Invitation Expiry Evaluation (No Autonomous Background Worker)
- **Current Behavior:**
  Invitation expiration (7-day duration defined by `ExpiresAtUtc`) is evaluated lazily when an invitation is queried (`GET /api/student/invitations`, `GET /api/student/teams/invitations`) or when an acceptance is attempted (`POST /api/student/invitations/{id}/accept`).
- **Operational Implication:**
  An expired invitation remains in `InvitationStatus.Pending` in the database until the student visits their workspace or attempts acceptance, at which point it transitions to `InvitationStatus.Expired`.
- **Recommended Future Phase Enhancement:**
  In Phase 6/System Hardening, introduce an `IHostedService` or scheduled background worker (`TeamInvitationExpiryWorker`) that periodically executes `UPDATE "TeamInvitations" SET "Status" = 'Expired' WHERE "Status" = 'Pending' AND "ExpiresAtUtc" < NOW()`.

---

### LIM-02: Grandfathering Policy for Retroactive Academic Track Capacity Reductions
- **Current Behavior:**
  `AcademicTrack.MaxTeamSize` dynamically sets team capacity for team formation and invitations. If an institutional administrator lowers `MaxTeamSize` (e.g., from 4 to 3) while an existing team already has 4 active members:
  - The backend does NOT automatically expel or remove the 4th member from the existing team.
  - The team remains at 4 members.
  - Further invitation dispatches and acceptances are blocked because `activeMemberCount (4) >= maxCapacity (3)`.
- **Rationale & Academic Soundness:**
  Automatically ejecting enrolled students upon track parameter changes would cause academic disruption and broken workload distribution. Grandfathering pre-existing team rosters until faculty or coordinator intervention is the standard institutional pattern.

---

### LIM-03: Multi-Node Scalability & Distributed Locking Strategy
- **Current Behavior:**
  Concurrency protection uses a hybrid architecture:
  1. `SemaphoreSlim` in-process lock keyed by `TeamId` for thread serialization within a single web node and in-memory test environments.
  2. PostgreSQL row-level exclusive lock (`SELECT "Id" FROM "ProjectTeams" WHERE "Id" = @id FOR UPDATE`) wrapped inside an explicit database transaction for multi-node deployments.
- **Operational Implication:**
  In horizontal multi-replica deployments (e.g. Kubernetes cluster), concurrency serialization relies entirely on PostgreSQL's row-level lock. For cloud deployments using connection pooling (such as PgBouncer in transaction pooling mode), `SELECT ... FOR UPDATE` within explicit transactions is fully supported and recommended.

---

### LIM-04: Non-Mutating Historical Creator Attribution
- **Current Behavior:**
  `BaseEntity.CreatedByUserId` records the initial creator of a team. Leadership delegation updates `TeamMember.IsTeamLead` and logs an audit trail event `TEAM_LEADER_TRANSFERRED`.
- **Operational Implication:**
  If a student creates a draft team and subsequently leaves the team (after transferring leadership to another member), the team entity retains `CreatedByUserId = formerCreatorId`. The new leader possesses 100% of the operational rights to manage the roster and submit proposals. This distinction is intentional to preserve cryptographic audit trails.

---

### LIM-05: Absence of Automated Email/SMS Notification Dispatch on Invitation
- **Current Behavior:**
  Dispatched invitations are visible in real-time within the student portal workspace under "Incoming Team Invitations" and can be discovered via USN. Out-of-band communication (email/SMS/push notifications) is not yet integrated.
- **Scope Boundary:**
  Out-of-band notification channels (SendGrid/Twilio/FCM) are scheduled for Phase 7 (Institutional Notifications & Integrations).

---

## 3. PRODUCTION READINESS ASSESSMENT

None of the above limitations cause data corruption, race conditions, over-capacity breaches, or cross-tenant leakage. All core academic invariants (capacity bounds, single-team enrollment, roster freezing on submission, and creator attribution) are strictly enforced at the database level.
