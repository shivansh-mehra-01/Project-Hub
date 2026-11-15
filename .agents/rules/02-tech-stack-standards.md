# Tech Stack Standards & Architectural Principles

## 1. Monorepo & Backend Architecture (.NET 10 LTS)

### Architecture Layout:
The backend is structured strictly following Clean Architecture with Vertical Slice capability:
```
backend/
├── ProjectHub.sln
└── src/
    ├── ProjectHub.Core/             # Pure Domain: Entities, Enums, Domain Events, Base Interfaces
    ├── ProjectHub.Application/      # Business Logic: CQRS, DTOs, Validation, Service Interfaces
    ├── ProjectHub.Infrastructure/   # Data Access: EF Core AppDbContext, Dapper, Redis, Interceptors
    ├── ProjectHub.Api/              # Delivery: Controllers/Endpoints, Middleware, Auth Policies, OpenAPI
    └── tests/
        └── ProjectHub.IntegrationTests/ # Integration & Architecture Tests
```

### Core Backend Directives:
- **Framework:** .NET 10 LTS (C# 13).
- **Database & ORM:** PostgreSQL 17 via `Npgsql.EntityFrameworkCore.PostgreSQL`.
  - **Mandatory Global Query Filters:** Every entity implementing `ITenantEntity` must be automatically filtered by `CollegeId` in `AppDbContext.OnModelCreating`.
  - **Aggregations:** Use `Dapper` for complex read-only NBA attainment matrices and cross-department analytics.
  - **Audit Logging:** EF Core SaveChanges Interceptor captures all mutations (EntityName, EntityId, Action, ChangedBy, ChangesJson, CollegeId, TimestampUtc) into an immutable `AuditLogs` table.
- **Tenant Context Resolution:**
  - Resolved via `TenantResolutionMiddleware`.
  - Authenticated endpoints MUST extract `college_id` exclusively from verified JWT claims.
  - Unauthenticated pre-login endpoints (e.g., email verification/domain lookup) may accept the `X-College-Id` header fallback.
- **Serialization:**
  - Global `JsonStringEnumConverter` registered in `Program.cs` so all C# enums serialize as string names across API contracts and OpenAPI schemas.
- **Key Libraries:**
  - `FluentValidation`: Declarative request validation pipelines.
  - `Serilog`: Structured JSON logging with tenant and user correlation.
  - `Hangfire`: Reliable background jobs and recurring report compilation backed by PostgreSQL.
  - `QuestPDF`: Deterministic vector PDF generation for NBA criterion dossiers and completion certificates.
  - `ClosedXML`: Student roster and marksheet Excel generation/imports.
  - `CsvHelper`: Bulk student and faculty roster onboarding parsing.
  - `Microsoft.AspNetCore.OpenApi` + `Scalar.AspNetCore`: First-class OpenAPI 3.0 spec generation at `/openapi/v1.json` and interactive docs at `/scalar/v1`.
  - `HybridCache`: Two-level L1 in-memory / L2 Redis caching for tenant configuration and rubrics.

---

## 2. Frontend Web Standards (Next.js & TypeScript)

### Core Frontend Directives:
- **Framework:** Next.js (App Router, React 19, TypeScript strict mode).
- **Styling:** Tailwind CSS + shadcn/ui component patterns.
- **Data Fetching & State:**
  - `@tanstack/react-query`: Server state synchronization, caching, and optimistic updates.
  - `@tanstack/react-table`: High-performance data grids for rosters, team allocations, and rubric matrices.
- **Type-Safe API Contract:**
  - `Orval` configured in `orval.config.ts` targeting `http://localhost:5000/openapi/v1.json`.
  - Generates strongly typed TypeScript interfaces and React Query hooks directly into `src/lib/api/generated/`.
- **Icons:** `lucide-react` used consistently across all components.

---

## 3. Security & Multi-Tenant Isolation
- Never bypass `ITenantEntity.CollegeId` filters.
- All authorization checks utilize ASP.NET Core Policy-Based Authorization:
  - `SuperAdminOnly`
  - `CollegeAdminOnly`
  - `HODOnly`
  - `CoordinatorOnly`
  - `FacultyOnly`
  - `StudentOnly`
- Password hashing using Argon2id or ASP.NET Core Identity PasswordHasher.

