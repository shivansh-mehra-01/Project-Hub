# Project Hub

> **Production-grade, multi-tenant B2B SaaS platform for engineering colleges to manage academic Minor & Major projects and automate NBA Criterion 2 & 3 compliance.**

---

## 🏛️ System Architecture

- **Backend:** `.NET 10 LTS` (`ASP.NET Core Web API`, C# 13) structured with Clean Architecture (`Core`, `Application`, `Infrastructure`, `Api`, and `IntegrationTests`).
- **Database & Cache:** `PostgreSQL 17` + `EF Core 10` (`Npgsql`) with automatic multi-tenant **Global Query Filters** (`CollegeId`), `Dapper` for high-throughput attainment queries, and `Redis 7` for caching.
- **API Spec & Docs:** Native `Microsoft.AspNetCore.OpenApi` + `Scalar.AspNetCore` at `http://localhost:5000/scalar/v1` and `/openapi/v1.json`.
- **Frontend:** `Next.js` (App Router, React 19, TypeScript) + `Tailwind CSS` + `TanStack Table` + `TanStack Query`.
- **Type-Safe API Bridge:** `Orval` code generation syncing .NET OpenAPI specs to typed TypeScript React Query hooks.
- **UI Aesthetics:** Structured B2B Minimalism (Slate 50 `#F8FAFC`, Indigo 600 `#4F46E5`, Slate 200 `#E2E8F0`) with `Inter` UI typography and `JetBrains Mono` numerical styling.

---

## 📋 Prerequisites

- **.NET SDK:** `10.0+`
- **Node.js:** `20+` (LTS) or `24+`
- **Docker & Docker Compose:** Installed and running

---

## 🚀 Quickstart Guide

### 1. Start Infrastructure (PostgreSQL & Redis)

```bash
# Copy environment variables template
cp .env.example .env

# Spin up Postgres 17 and Redis 7 containers
docker compose up -d
```

Verify containers are healthy:
```bash
docker compose ps
```

---

### 2. Start Backend API (.NET 10)

```bash
cd backend
dotnet restore
dotnet run --project src/ProjectHub.Api
```

- API Base URL: `http://localhost:5000`
- Interactive API Documentation (Scalar): `http://localhost:5000/scalar/v1`
- OpenAPI JSON Specification: `http://localhost:5000/openapi/v1.json`
- Health Endpoint: `http://localhost:5000/api/health`

Run backend tests:
```bash
cd backend
dotnet test
```

---

### 3. Start Frontend Web Application (Next.js)

```bash
cd web
npm install
npm run dev
```

- Web App URL: `http://localhost:3000`

To re-generate typed TypeScript API hooks using Orval against the running .NET API:
```bash
cd web
npm run generate:api
```

---

## 📁 Repository Structure

```
ProjectHub/
├── .agents/
│   └── rules/
│       ├── 01-product-architecture.md  # 6-Role hierarchy, scope, tenant isolation
│       ├── 02-tech-stack-standards.md  # .NET 10, EF Core, Next.js, Scalar, Orval
│       └── 03-ui-design-system.md      # Tokens, typography, B2B minimalism
├── docs/
│   ├── PRODUCT_ARCHITECTURE.md         # Matrix, navigation shells, state machine
│   └── DATABASE_SCHEMA.md              # Relational tables, columns, indexes, ERD
├── backend/
│   ├── ProjectHub.sln
│   ├── src/
│   │   ├── ProjectHub.Core/            # Entities, enums, interfaces (ITenantEntity)
│   │   ├── ProjectHub.Application/     # Services, DTOs, ITenantContext
│   │   ├── ProjectHub.Infrastructure/  # AppDbContext, query filters, audit interceptor
│   │   └── ProjectHub.Api/             # Middleware, Scalar, JWT policies, /api/health
│   └── tests/
│       └── ProjectHub.IntegrationTests/# Integration test suites
├── web/
│   ├── src/
│   │   ├── app/                        # Next.js App Router (Health status landing)
│   │   ├── components/                 # UI components and shells
│   │   └── lib/                        # API client, TanStack Query provider
│   ├── orval.config.ts                 # Orval OpenAPI client configuration
│   └── tailwind.config.ts              # Token-configured Tailwind setup
├── docker-compose.yml                  # Postgres 17 + Redis 7 setup
├── .env.example                        # Environment template
└── README.md
```

---

## 🔐 Multi-Tenant Security Model

1. **Strict College Isolation:** All database tables belonging to tenants implement `ITenantEntity` with `Guid CollegeId`.
2. **Global Query Filters:** Automatically applied in EF Core 10 `OnModelCreating`, preventing cross-tenant data leakage.
3. **Tenant Resolution:**
   - Unauthenticated pre-login endpoints accept `X-College-Id` header.
   - All authenticated endpoints strictly enforce `college_id` extracted from the verified JWT claim.
4. **Immutable Audit Trail:** All database modifications are intercepted by `AuditSaveChangesInterceptor` and recorded into `AuditLogs`.

