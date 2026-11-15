# Product Architecture & Domain Boundaries

## 1. Domain Scope & Non-Goals
Project Hub is a purpose-built B2B SaaS platform for engineering colleges to manage academic Minor & Major projects and automate National Board of Accreditation (NBA) Criterion 2 & 3 compliance.

### Strict Scope Enforcements:
- **Project Scope:** Minor Projects (Year 3 / Semester 5-6) and Major Projects (Year 4 / Semester 7-8) **ONLY**.
- **Non-Goals / Exclusions:**
  - Strictly **NO** mini-projects, hobby projects, or hackathons.
  - Strictly **NO** external / off-campus viva evaluators or guest accounts. All evaluators are internal verified faculty members.
  - Strictly **NO** cross-college user mixing, cross-tenant projects, or cross-tenant collaboration.
  - Strictly **NO** public self-signup or guest self-registration.

---

## 2. Multi-Tenancy Architecture
- Every college is a completely isolated tenant identified by an immutable `CollegeId` (UUID/Guid).
- Every tenant-scoped entity in the database MUST implement `ITenantEntity` with a non-nullable `CollegeId`.
- Every database query MUST apply a Global Query Filter scoped to the current tenant's `CollegeId`.
- Data leakage across tenants is considered a Severity 0 security violation.

---

## 3. Exact 6-Role Hierarchy

The platform strictly enforces the following 6-role hierarchy:

```
SuperAdmin (Platform Level)
  │
CollegeAdmin (Institutional Level: Principal / Dean / IT Head)
  │
HOD (Department Executive Level)
  │
Faculty (Base Teacher Role) ──[HOD Toggle]──> ProjectCoordinator (Batch Ops Authority)
  ├── Guide (Assigned to teams)
  └── Evaluator (Scheduled on viva/review panels)
  │
Student (Base Learner: Workspace, Explore, Portfolio, Profile)
  └── TeamLead (Contextual badge: Project invites, roster lock, proposal submission, GitHub/Jira links)
```

### Role Specifications:
1. **`SuperAdmin` (Platform Startup Team):**
   - Provisions college tenants, pilot licenses, and subscriptions.
   - Manages global NBA outcome templates and UN Sustainable Development Goals (SDG) mappings.
   - **Zero Access:** Strictly zero access to student marks, internal submissions, or grade sheets.

2. **`CollegeAdmin` (Principal / Dean / IT Head):**
   - Creates academic branches/departments and appoints Department `HOD`s.
   - Configures college branding (logo, colors) and SSO domain routing (Google Workspace / Microsoft 365).
   - Views high-level cross-department analytics and accreditation compliance summaries.

3. **`HOD` (Department Executive):**
   - Toggles `ProjectCoordinator` authority ON/OFF on departmental faculty members.
   - Signs off final project proposals, team allotments, and guide assignments.
   - Approves post-lock grade unlock requests.
   - Generates and exports digitally signed NBA Criterion 2 & 3 compliance dossiers.

4. **`Faculty` (Base Teacher Role):**
   - Base instructor role within a department.
   - Automatically acts as `Guide` for assigned student teams (reviews logs, approves weekly milestones).
   - Automatically gains `Evaluator` grading capability when scheduled on a review panel or viva defense.
   - Gains the privileged `Batch Ops` tab **only** when granted `ProjectCoordinator = true` by their HOD.

5. **`Student` (Base Learner):**
   - Enrolled student belonging to a single department and college.
   - Possesses exactly 4 permanent navigation tabs: `Workspace`, `Explore`, `Portfolio`, and `Profile`.

6. **`TeamLead` (Contextual Project-Level Badge):**
   - A contextual badge applied to one student per project team.
   - Unlocks management controls inside that team's `Workspace`: sending teammate invites, locking the team roster, submitting proposals, and configuring GitHub/Jira repository links.

---

## 4. Unified Authentication & Onboarding
- **Single Login Screen:** All users authenticate via a single unified login portal using Email/Password or institutional Google/Microsoft OAuth2 SSO.
- **Roster Activation Flow:** Users are pre-registered in bulk via CSV imports by the CollegeAdmin or Coordinator.
- **First-Time Activation:** On first sign-in, unactivated users verify credentials, set their permanent password, and complete a streamlined onboarding wizard before entering their role dashboard.

