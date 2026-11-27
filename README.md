# Colabex (Project Hub)

> **Enterprise multi-tenant academic project & capstone management platform for engineering colleges, automating project lifecycle tracking and NBA Criterion 2 & 3 accreditation compliance.**

---

## 🏛️ System Architecture

- **Backend:** `.NET 10 LTS` (`ASP.NET Core Web API`, C# 13) adhering to Clean Architecture (`Domain`, `Application`, `Infrastructure`, `Api`, and `IntegrationTests`).
- **Database & Cache:** `PostgreSQL 17` + `EF Core 10` (`Npgsql`) with automatic tenant Row-Level Security via **Global Query Filters** (`CollegeId`), Dapper for high-speed NBA attainment queries, and `Redis 7` for caching.
- **File Storage:** Local disk storage service with SHA-256 binary validation under `App_Data/vault/{collegeId}/{teamId}/{slot}/` (S3/R2 cloud-ready).
- **API Spec & Interactive Docs:** Native `Microsoft.AspNetCore.OpenApi` + `Scalar.AspNetCore` accessible at `http://localhost:5000/scalar/v1`.
- **Frontend:** `Next.js 16` (App Router, React 19, TypeScript) + `Tailwind CSS 4` + `Lucide Icons`.
- **Design System:** Deep Charcoal Slate (`#111827`) + Deep Forest Emerald (`#047857`) with `Plus Jakarta Sans` headings, `Inter` body, and `JetBrains Mono` tabular data.

---

## 📋 Prerequisites

Ensure the following tools are installed on your machine:
- **.NET SDK:** `10.0+`
- **Node.js:** `20+` (LTS) or `22+`
- **Docker & Docker Compose:** Installed and running

---

## 🚀 Local Development Workflow (Separate Terminals)

Backend and frontend run independently in separate terminals, with PostgreSQL 17 and Redis 7 running in Docker.

### 1. Configure Environment

```bash
# Clone the repository
git clone https://github.com/your-org/colabex.git
cd colabex

# Configure root environment
cp .env.example .env

# Configure frontend environment
cp web/.env.example web/.env.local
```

*(On Windows PowerShell, use `Copy-Item .env.example .env` and `Copy-Item web/.env.example web/.env.local`)*

---

### 2. Start Infrastructure (PostgreSQL 17 & Redis 7)

Docker must be running before starting the backend API.

From the repository root:
```bash
docker compose up -d postgres redis
```

Verify that the containers are running and healthy:
```bash
docker compose ps
```

---

### 3. Start Backend API (.NET 10)

From the repository root:
```bash
dotnet run --project backend/src/ProjectHub.Api --launch-profile http
```

- **Backend URL:** `http://localhost:5000`
- **Interactive Scalar Docs:** `http://localhost:5000/scalar/v1`
- **OpenAPI JSON Spec:** `http://localhost:5000/openapi/v1.json`
- **Health Check:** `http://localhost:5000/api/health`

In `Development`, the API automatically applies pending EF Core migrations and seeds master reference catalogs on startup (zero demo tenants or users are seeded).

#### First-Time SuperAdmin Bootstrap

On a fresh database, bootstrap the initial SuperAdmin account explicitly from the repository root:
```powershell
$env:COLABEX_BOOTSTRAP_EMAIL = "admin@yourdomain.edu"
$env:COLABEX_BOOTSTRAP_PASSWORD = "<strong-password>"
$env:COLABEX_BOOTSTRAP_NAME = "Platform SuperAdmin"
dotnet run --project backend/src/ProjectHub.Api -- bootstrap-superadmin
```

To execute the backend integration tests:
```bash
dotnet test backend/ProjectHub.slnx
```

---

### 4. Start Frontend Application (Next.js)

In a separate terminal from the repository root:
```bash
npm --prefix web install
npm --prefix web run dev
```

- **Frontend URL:** `http://localhost:3000`
- **Login Route:** `http://localhost:3000/login`

To verify a production build:
```bash
npm --prefix web run build
```

For production deployment (least-privilege PostgreSQL roles, Dockerfiles, reverse-proxy `X-Forwarded-For` configuration, and backups), see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## 📁 Repository Structure

```
colabex/
├── .agents/                               # Engineering guides and architectural rules
├── docs/                                  # Platform requirements and database schema
├── docker-compose.yml                     # PostgreSQL 17 + Redis 7 local stack
├── .env.example                           # Root environment template
├── .gitignore                             # Clean monorepo exclusion rules
├── package.json                           # Root build and test scripts
├── backend/
│   ├── ProjectHub.slnx                    # .NET 10 solution file
│   ├── src/
│   │   ├── ProjectHub.Domain/             # Entities, enums, value objects
│   │   ├── ProjectHub.Application/        # DTOs, service interfaces, validators
│   │   ├── ProjectHub.Infrastructure/     # EF Core 10 DbContext, migrations, disk vault
│   │   └── ProjectHub.Api/                # Minimal APIs, controllers, Scalar OpenAPI
│   └── tests/
│       └── ProjectHub.IntegrationTests/   # xUnit + TestServer integration test suite
└── web/
    ├── .env.example                       # Frontend environment template
    ├── package.json                       # Next.js 16 dependencies
    └── src/
        ├── app/                           # App Router pages and route groups
        ├── design-system/                 # Emerald/Charcoal tokens, cards, shell, dialogs
        ├── features/                      # Role-scoped workspaces (Student, Guide, HOD, etc.)
        └── lib/                           # Typed API clients, state store, auth tokens
```

---

## 🛡️ Multi-Tenant Security & Isolation

1. **Row-Level Security (RLS):** All tenant-specific entities implement `ITenantEntity` with `Guid CollegeId`, automatically scoped via EF Core 10 Global Query Filters.
2. **Strict JWT Claim Enforcement:** Every authenticated request verifies the `college_id` claim in the bearer token.
3. **Capstone Document Vault:** Uploaded files (`.pdf`, `.ppt`, `.pptx` $\le$ 25 MB) are streamed, SHA-256 hashed, and isolated per college and team under `App_Data/vault/{collegeId}/{teamId}/{slot}/`.

---

## 📋 Faculty Roster CSV Import Contract

College Admins import faculty rosters via `POST /api/college/users/bulk` (and the **Import Faculty Roster (CSV)** modal in `/college/users`) using UTF-8 CSV with the exact 4-column header:

```csv
FullName,OfficialEmail,DepartmentCode,Designation
```

- **Supported `Designation` values:** `Professor`, `AssociateProfessor`, `AssistantProfessor`, `AdjunctFaculty`
- **Limits:** Up to 1 MB per file and 500 rows per upload; RFC 4180 quoted commas and escaped quotes (`""`) are supported.
- **Identity & Update Policy:** `OfficialEmail` (trimmed, lowercased) is matched within the authenticated college tenant. New emails create `Faculty` accounts and dispatch activation emails; existing same-tenant `Faculty` accounts update `FullName`, `DepartmentId`, and `Designation` while preserving `Id`, `Role`, `EmployeeCode`, and credentials. Cross-tenant emails and protected/incompatible roles (`HOD`, `CollegeAdmin`, `SuperAdmin`, `Student`) are rejected.
- **Atomic Preview & Validation:** Legacy `Role` headers, duplicate/missing headers, duplicate emails in file, invalid designations, or unknown department codes are rejected before persistence (all-or-nothing transaction).
- **HOD Separation:** Roster import never appoints HODs or modifies `HodAppointmentHistories`. HOD appointments must be performed separately through **Department Leadership** (`/college/hods`).
