# Collabex (Project Hub)

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

## ⚡ 1-Command Instant Full-Stack Launcher (Recommended)

Boot the entire stack (**PostgreSQL 17** + **.NET 10 Backend API** + **Next.js 16 Frontend**) with zero friction, automated port cleanup, database health polling, and dependency checks:

```powershell
# From the repository root (PowerShell):
.\start.ps1

# Or using npm:
npm run dev
```

What `start.ps1` handles automatically:
1. **Prerequisites & Port Cleanup:** Verifies Docker, .NET SDK, and npm; cleanly frees ports `5000` and `3000` from any stale background processes.
2. **PostgreSQL 17 Auto-Provisioning:** Detects Docker Desktop, spins up or attaches to the PostgreSQL 17 container (`projecthub_postgres` / `projecthub-db`), and polls until port `5432` accepts connections.
3. **Frontend Dependencies & Env Setup:** Automatically checks `web/node_modules` (installs if missing) and creates `web/.env.local` from `web/.env.example`.
4. **Backend Boot & Health Check:** Launches .NET 10 API on `http://localhost:5000` in a dedicated labeled console and polls `/api/health` before booting the frontend.
5. **Frontend Launch & Summary Banner:** Launches Next.js on `http://localhost:3000` in a dedicated labeled console and prints a consolidated terminal dashboard with demo credentials.

---

## 🚀 Manual Step-by-Step Setup Guide

### 1. Clone & Configure Environment

```bash
# Clone the repository
git clone https://github.com/your-org/collabex.git
cd collabex

# Configure root environment
cp .env.example .env

# Configure frontend environment
cp web/.env.example web/.env.local
```

*(On Windows PowerShell, use `Copy-Item .env.example .env` and `Copy-Item web/.env.example web/.env.local`)*

---

### 2. Start Infrastructure (PostgreSQL 17 & Redis 7)

```bash
docker compose up -d
```

Verify that the containers are healthy:
```bash
docker compose ps
```

---

### 3. Start Backend API (.NET 10)

```bash
cd backend
dotnet restore
dotnet run --project src/ProjectHub.Api
```

- **API Base URL:** `http://localhost:5000`
- **Interactive Scalar Docs:** `http://localhost:5000/scalar/v1`
- **OpenAPI JSON Spec:** `http://localhost:5000/openapi/v1.json`
- **Health Check:** `http://localhost:5000/api/health`

The database schema and initial master data (RGPV programs, college tenants, departments, sample teams, and users) seed automatically on initial startup.

To execute the backend integration tests:
```bash
dotnet test ProjectHub.slnx
```

---

### 4. Start Frontend Application (Next.js)

In a new terminal window:
```bash
cd web
npm install
npm run dev
```

- **Web Application URL:** `http://localhost:3000`
- **Login Route:** `http://localhost:3000/login`

To verify a production build:
```bash
npm run build
```

---

## 🔑 Pre-Seeded Development Credentials

The database is seeded with ready-to-test accounts across all roles (default password: `Pass@1234`):

| Role | Name | Email | Default Password | Primary Workspace Route |
|---|---|---|---|---|
| **SuperAdmin** | Platform Ops Admin | `superadmin@collabex.in` | `Pass@1234` | `/admin` |
| **CollegeAdmin** | Dr. Keshvendra Choudhary (Principal) | `collegeadmin@sistec.ac.in` | `Pass@1234` | `/college` |
| **HOD (CSE)** | Dr. Ravindra Kumar Sharma | `hod@sistec.ac.in` | `Pass@1234` | `/hod` |
| **Coordinator** | Prof. Priya Nair | `coordinator@sistec.ac.in` | `Pass@1234` | `/coordinator` |
| **Faculty Guide** | Prof. S. K. Verma | `faculty@sistec.ac.in` | `Pass@1234` | `/faculty` |
| **Student (Team Lead)** | Shivansh Mehra | `student@sistec.ac.in` | `Pass@1234` | `/student` |
| **Student (Member)** | Aarav Sharma | `student2@sistec.ac.in` | `Pass@1234` | `/student` |

---

## 📁 Repository Structure

```
collabex/
├── .agents/                               # Engineering guides and architectural rules
├── docs/                                  # Platform requirements and database schema
├── docker-compose.yml                     # PostgreSQL 17 + Redis 7 local stack
├── .env.example                           # Root environment template
├── .gitignore                             # Clean monorepo exclusion rules
├── package.json                           # Root scripts (npm run dev launcher)
├── start.ps1                              # Zero-friction full-stack local launcher
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
