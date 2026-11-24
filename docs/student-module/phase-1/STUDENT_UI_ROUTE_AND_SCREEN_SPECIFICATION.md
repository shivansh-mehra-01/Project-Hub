# COLABEX — STUDENT MODULE
# DELIVERABLE 8: UI ROUTE & SCREEN SPECIFICATION
**Phase 1: Complete System Audit, Academic Lifecycle Discovery & Implementation Blueprint**
**Date:** November 24, 2026  
**Frontend Framework:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide Icons  
**Design Standard:** ProjectHub Enterprise Design System (AppShell, StepperGPS, EmptyState, Modal, SlideOverDrawer)  

---

## 1. STUDENT UI ROUTE INVENTORY

The following table details every primary route and sub-view allocated to the Student persona:

| Route Path | View Component | Status | Allowed Roles | Navigation Section | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/student` | `StudentWorkspaceView.tsx` | **PARTIALLY IMPLEMENTED** | `Student`, `TeamLead` | WORKSPACE | Main project workspace, sprint board, weekly logbook, capstone vault, and roster settings. |
| `/student/explore` | `StudentExploreView.tsx` | **PARTIALLY IMPLEMENTED** | `Student`, `TeamLead` | WORKSPACE | Problem bank exploration, classmate peer discovery, and historical project archive. |
| `/student/portfolio` | `StudentPortfolioView.tsx` | **PARTIALLY IMPLEMENTED** | `Student`, `TeamLead` | ACCOUNT | Degree project lineage, NBA exit survey, verified digital transcript, and public QR credential. |
| `/student/profile` | `StudentProfileView.tsx` | **PARTIALLY IMPLEMENTED** | `Student`, `TeamLead` | ACCOUNT | Institutional USN, college identity records, technical skill badges, and developer handles. |
| `/student?subtab=tasks` | Sub-view in Workspace | **VERIFIED** | `Student`, `TeamLead` | Workspace Tab | Interactive Kanban sprint task board (Todo, InProgress, InReview, Done). |
| `/student?subtab=logs` | Sub-view in Workspace | **VERIFIED** | `Student`, `TeamLead` | Workspace Tab | Weekly sprint logbook form, submission history, and faculty verification remarks. |
| `/student?subtab=vault` | Sub-view in Workspace | **VERIFIED** | `Student`, `TeamLead` | Workspace Tab | 4-slot Capstone Document Vault (Synopsis, MidTermPPT, Plagiarism, Thesis). |
| `/student?subtab=evaluations` | Sub-view in Workspace | **PARTIALLY IMPLEMENTED** | `Student`, `TeamLead` | Workspace Tab | Defense panel schedule, blended 60/40 evaluation matrix, and published rubric marks. |
| `/student?subtab=roster` | Sub-view in Workspace | **PARTIALLY IMPLEMENTED** | `Student`, `TeamLead` | Workspace Tab | Team members list, module responsibilities, Git repository link, and team settings. |

---

## 2. DETAILED SCREEN SPECIFICATIONS

### 2.1 Workspace / Dashboard Screen (`/student`)

```text
+---------------------------------------------------------------------------------------------------+
| Top Navigation: SISTec CSE • Minor Project (Semester 6, 2026-27)             [Notifications] [User] |
+---------------------------------------------------------------------------------------------------+
| [ StepperGPS: 1. Idea Draft -> 2. Guide Review -> 3. HOD Approval -> 4. Execution -> 5. Defense ] |
+---------------------------------------------------------------------------------------------------+
| Project Banner: "Smart IoT Energy Monitoring & Anomaly Detection" [Team: 2026-CS-MIN-01] [Active]  |
| Assigned Guide: Prof. S. K. Verma (sk.verma@sistec.ac.in) | GitHub: sistec-cse/iot-energy-monitor |
+---------------------------------------------------------------------------------------------------+
| Subtabs: [Sprint Tasks (3)] | [Weekly Logbook] | [Capstone Vault (4)] | [Defense & Marks] | [Roster] |
+---------------------------------------------------------------------------------------------------+
| (Selected Subtab Content Renders Here)                                                            |
+---------------------------------------------------------------------------------------------------+
```

- **Unallocated Student State (Missing Feature to Add in Phase 2):**
  If student has no active project team, the workspace displays a high-impact `EmptyState`:
  - Title: *"You are not currently enrolled in an active project"*
  - Description: *"Minor Project (CS-606) registration is currently open for Semester 6 students. Explore faculty problem statements, form a team, or submit an idea proposal."*
  - CTAs: `[Explore Problem Bank]` (navigates to `/student/explore`), `[Create New Team]` (opens team creation modal), `[Propose Project Idea]` (opens idea wizard).
- **Subtab 1: Sprint Tasks (`?subtab=tasks`):**
  - Displays 4 columns: Todo, In Progress, In Review, Done.
  - Action: `[+ New Task]` button opens `Modal` with fields `Title`, `CategoryTag`, `Assignee` (dropdown of team members), `DueDate`.
  - Calling API: `studentApi.createTask()`, `studentApi.updateTask()`.
- **Subtab 2: Weekly Logbook (`?subtab=logs`):**
  - Weekly log submission form: Week Number, Hours Logged, Git Commits, Accomplishments, Blockers.
  - History cards showing past weeks with badge: `Verified by Mentor` (green) or `Submitted (Pending)` (amber).
  - Calling API: `studentApi.submitLog()`.
- **Subtab 3: Capstone Vault (`?subtab=vault`):**
  - 4 predefined slots: Synopsis, Mid-Term PPT, Plagiarism Report, Final Thesis.
  - Slot status badges: `Missing` (grey), `Uploaded` (blue), `Verified` (green), `Returned` (red).
  - Actions: Drag-and-drop file upload, file download (`studentApi.downloadArtifactBlob()`).
- **Subtab 4: Defense & Evaluations (`?subtab=evaluations`):**
  - Defense schedule card: Panel date, time, venue, evaluators.
  - Published marksheet: 60% Shared Project Rubric + 40% Individual Student Assessment.
  - Empty state if uncertified: *"Evaluation marks will be published after departmental defense certification."*
- **Subtab 5: Team Roster & Settings (`?subtab=roster`):**
  - Member cards showing Name, USN, Leader badge, Module Responsibility.
  - Leader actions: Invite Peer modal, Link Repository modal, Transfer Leadership dropdown.

---

### 2.2 Explore & Peer Discovery Screen (`/student/explore`)
- **Filter Pills:**
  1. `Faculty Problem Bank (N)`: Lists research topics posted by department faculty.
  2. `Open Peers & Teams (N)`: Classmate directory for peer team matching.
  3. `Past Campus Projects (N)`: Searchable archive of best capstone projects from prior years.
- **Problem Bank Tab:**
  - Card grid: Title, Abstract, SDG Badge, Faculty Mentor, Capacity, Prerequisites.
  - Action: `[Request Topic]` CTA (active only if student has a team in `Draft` state).
- **Open Peers Tab (Missing Backend API in Phase 4):**
  - Card grid showing unallocated classmates: Full Name, USN, Technical Skills (tags), Domain Interests.
  - Leader Action: `[Invite to Team]` button dispatches invitation.
- **Past Projects Tab:**
  - SlideOverDrawer inspection: Abstract, system architecture notes, IEEE DOI link, GitHub repo link.

---

### 2.3 Academic Portfolio & Verified Transcript (`/student/portfolio`)
- **Header Profile Card:**
  - Full Name, USN, B.Tech Program, CGPA, Verified Institutional Badge.
  - Actions: `[Share Verified Transcript]` (copies public verification URL), `[View QR Credential]`.
- **NBA Course Exit Survey Banner:**
  - If uncompleted: High-visibility amber banner requiring 60-second survey completion.
  - Action: `[Complete Exit Survey (60s)]` opens rating modal evaluating 5 Program Outcomes (PO2, PO3, PO5, PO9, PO10).
- **Longitudinal Projects Timeline:**
  - Displays multi-year project lineage (e.g. Sem 6 Minor Project linked to Sem 7/8 Major Project Phase-I & II).
  - Statistics: Total Hours Logged, Git Commits, Verified Artifacts count.

---

### 2.4 Learner Academic Profile (`/student/profile`)
- **Card 1: Institutional Enrollment Identity (Locked):**
  - Read-only inputs: Student Full Name, University Roll / USN, Academic Branch, College Email, Engineering College.
  - Security note: *"To update university name or roll number, contact Department Coordinator or HOD office."*
- **Card 2: Technical Skills & Developer Handles:**
  - `TagMultiSelect`: TypeScript, Python, React, Next.js, C# / .NET, Docker, PyTorch, IoT.
  - Inputs: Personal GitHub username, Jira project key, Phone number.
  - Action: `[Save Profile Changes]` button.
