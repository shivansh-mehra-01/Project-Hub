# COLABEX — PHASE A: COMPLETE END-TO-END AUTHENTICATION & AUTHORIZATION SECURITY AUDIT

**Audit Date:** 2026-11-25  
**Scope:** Backend (`ASP.NET Core / .NET 10`, `EF Core`, `PostgreSQL`), Frontend (`Next.js`, `React`, `TypeScript`), Configuration, and Test Suites  
**Mode:** Strictly Read-Only Audit & Production Architecture Design (No source, schema, config, or test files modified)

---

## 1. Repository State and HEAD

- **Current Branch:** `integration/super-admin-college-admin` (tracking `origin/integration/super-admin-college-admin`)
- **HEAD Commit:** `983242c` — `feat: complete college-admin, faculty-guide, accreditation modules, E2E security hardening, and test suites`
- **Working Tree:** Dirty (uncommitted modifications and untracked files across `backend/src/ProjectHub.Api`, `ProjectHub.Application`, `ProjectHub.Domain`, `ProjectHub.Infrastructure`, `backend/tests/ProjectHub.IntegrationTests`, and `web/src/features/student`, `web/src/lib/api`).
- **Solution Structure (`backend/ProjectHub.slnx`):**
  - `backend/src/ProjectHub.Api/ProjectHub.Api.csproj`
  - `backend/src/ProjectHub.Application/ProjectHub.Application.csproj`
  - `backend/src/ProjectHub.Domain/ProjectHub.Domain.csproj`
  - `backend/src/ProjectHub.Infrastructure/ProjectHub.Infrastructure.csproj`
  - `backend/tests/ProjectHub.IntegrationTests/ProjectHub.IntegrationTests.csproj`
  - **Note:** An unreferenced duplicate folder `backend/src/ProjectHub.WebApi/` exists on disk outside `ProjectHub.slnx`.

---

## 2. Authentication Architecture Currently Implemented

| Component | Status | Implementation Summary |
| :--- | :--- | :--- |
| **Identity Store** | **Partially implemented** | Custom `UserAccount` entity (`ProjectHub.Domain/Entities/UserAccount.cs`) in `ProjectHubDbContext.Users` rather than ASP.NET Core Identity. |
| **Password Hashing** | **Verified implementation** | `PasswordHelper` (`ProjectHub.Infrastructure/Security/PasswordHelper.cs`) uses PBKDF2-SHA256 (`Rfc2898DeriveBytes.Pbkdf2`), 16-byte random salt, 32-byte key, 100,000 iterations, and `CryptographicOperations.FixedTimeEquals`. |
| **Token Issuance** | **Unsafe** | `JwtTokenService` (`ProjectHub.Infrastructure/Security/JwtTokenService.cs`) issues HMAC-SHA256 (`HS256`) JWTs with a **7-day expiration** (`DateTime.UtcNow.AddDays(7)`), ignoring `Jwt:ExpiryMinutes` (`1440`) in `appsettings.json`, and falls back to a hardcoded dev signing key if `Jwt:Secret` is absent. |
| **Refresh Tokens** | **Missing** | No refresh token entity, endpoint, rotation, or reuse detection exists. |
| **Session Tracking & Logout** | **Unsafe / Partially implemented** | `UserSession` (`ProjectHub.Domain/Entities/UserSession.cs`) exists, but `AuthController.Login` does **not** create a `UserSession`. `AccountController` hardcodes `"sess-cur-01"` for `GetMySessions`/`Logout`/`RevokeOtherSessions`, and JWT Bearer validation never checks `UserSessions` or token revocation. |
| **MFA / Recovery Codes** | **Unsafe (Mocked)** | `AccountController.GetMfaStatus` returns hardcoded `MfaStatus = "Enabled"` and `IsConfigured = true`. `AccountController.RegenerateRecoveryCodes` generates 10 codes and logs an audit entry without hashing or persisting them; `AuthController.Login` never enforces MFA. |
| **Email Delivery** | **Missing (Logging Stub)** | `LoggingEmailSender` (`ProjectHub.Infrastructure/Services/LoggingEmailSender.cs`) is registered as `IEmailSender` and logs OTPs in plaintext to the console/Serilog sink instead of sending real emails. |
| **Tenant Resolution** | **Verified / Partially Unsafe** | `TenantResolutionMiddleware` (`ProjectHub.Api/Middleware/TenantResolutionMiddleware.cs`) populates `ITenantContext` from JWT claims for authenticated requests, but falls back to `X-College-Id` header for unauthenticated requests. |

---

## 3. Exact Authentication & Account Endpoint Inventory

### `AuthController` (`backend/src/ProjectHub.Api/Controllers/AuthController.cs`, `[Route("api/[controller]")]`)
- `POST /api/auth/login` (`Login`) — `[AllowAnonymous]`. Normalizes legacy demo aliases (`NormalizeEmail`), verifies active & activated `UserAccount` via `PasswordHelper.VerifyPassword`, issues 7-day JWT. No rate limiting, no lockout.
- `POST /api/auth/request-password-otp` (`RequestPasswordOtp`) — `[AllowAnonymous]`, `[EnableRateLimiting("PasswordResetLimit")]`. 30s cooldown, 6-digit CSPRNG OTP hashed into `PasswordResetOtpHashed` (15m TTL). Returns `devOtp` in response body when `IsDevelopment()` is true.
- `POST /api/auth/reset-password` (`ResetPassword`) — `[AllowAnonymous]`, `[EnableRateLimiting("PasswordResetLimit")]`. Enforces 5-attempt lockout, min 8-char password (no complexity rules), sets `IsActivated = true` & `IsActive = true`, returns 7-day JWT. Returns `404 NotFound` on unknown email (enumeration leak).

### `AccountController` (`backend/src/ProjectHub.Api/Controllers/AccountController.cs`, `[Authorize(Policy = ProjectHubPolicies.SuperAdminOnly)]`)
- `GET /api/account/profile` (`GetProfile`)
- `PUT /api/account/profile` (`UpdateProfile`)
- `POST /api/account/request-email-change` (`RequestEmailChange`) — Reuses `PasswordResetOtpHashed` without binding the target `NewEmail`; returns `devOtp` in Development.
- `POST /api/account/verify-email-change` (`VerifyEmailChange`) — No attempt counter/lockout; does not verify `NewEmail` matches the address the OTP was sent to.
- `POST /api/account/change-password` (`ChangePassword`) — Enforces 12-char complexity (`ValidatePasswordComplexity`), revokes `UserSessions` except `"sess-cur-01"` (does not invalidate active JWTs).
- `GET /api/account/mfa/status` (`GetMfaStatus`) — Hardcoded mock response.
- `POST /api/account/mfa/regenerate-recovery-codes` (`RegenerateRecoveryCodes`) — Generates codes without storing hashes.
- `GET /api/account/sessions` (`GetMySessions`), `POST /api/account/sessions/{id}/revoke` (`RevokeSession`), `POST /api/account/sessions/revoke-others` (`RevokeOtherSessions`), `POST /api/account/logout` (`Logout`) — Operates on `UserSessions` with hardcoded `"sess-cur-01"` fallback; does not revoke JWTs.
- `PUT /api/account/notification-preferences`, `PUT /api/account/console-preferences`.

### Other Account Provisioning Endpoints
- `POST /api/college/users` (`CollegeController.CreateStaffUser`) — Creates staff with random temp password, `IsActivated = true`, `PasswordChangedAtUtc = null`, returns `TemporaryPassword = null` without sending email/OTP.
- `POST /api/college/users/{id}/reset-password` (`CollegeController.ResetStaffPassword`) — Generates 6-digit OTP on `UserAccount`.
- `PUT /api/college/users/{id}/status` (`CollegeController.UpdateUserStatus`) — Toggles `IsActive`, does not revoke existing JWTs.
- `CoordinatorController` (`backend/src/ProjectHub.Api/Controllers/CoordinatorController.cs`) — Enforces college domain matching (`SsoDomain`) and duplicate `(CollegeId, Email)` / `(CollegeId, EnrollmentOrEmployeeCode)` checks on student onboarding.

---

## 4. Account and Password-Storage Findings

- **Hashing:** `PasswordHelper` uses PBKDF2-SHA256 with 100,000 iterations, 16-byte random salt, and constant-time comparison (`Verified implementation`).
- **Password Policy Inconsistency (`Unsafe`):** `AccountController.ChangePassword` requires 12 chars + upper/lower/digit/symbol, whereas `AuthController.ResetPassword` only checks `request.NewPassword.Length < 8` (allowing `"12345678"`).
- **Email Uniqueness vs Multi-Tenancy (`Partially implemented`):** `UserAccountConfiguration` defines unique filtered indexes on `(CollegeId, Email)` and `(CollegeId, EnrollmentOrEmployeeCode)` where `"IsDeleted" = false`. However, `AuthController.Login` queries `Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted)` without `CollegeId`, meaning if the same email exists in two colleges, login behavior is non-deterministic.
- **Unverified/Disabled Account Checks (`Verified` at login, `Missing` post-login):** `Login` checks `!user.IsActive` and `!user.IsActivated`, but `ResetPassword` unconditionally sets `user.IsActive = true`! A disabled user (`IsActive = false`) can call `request-password-otp` + `reset-password` to **re-enable their own deactivated account**.

---

## 5. Demo Credential and Seed-Account Findings

- **Hardcoded Demo Password (`Unsafe`):** `DbInitializer.SeedPersonasAsync` (`backend/src/ProjectHub.Infrastructure/Persistence/DbInitializer.cs:714, 1085`) hashes a single hardcoded demo password for all seeded personas (`SuperAdmin`, `CollegeAdmin`, `HOD`, `Coordinator`, `Faculty`, `Student`). *(Actual credential omitted per audit rules.)*
- **Console Credential Table (`Unsafe`):** `DbInitializer.PrintSeededAccountsTable()` prints the seeded role/email table and default password to stdout in Development.
- **Production Seeding Gate (`Verified implementation`):** `Program.cs:211` gates `DbInitializer.SeedAsync(..., isDevelopment: true)` behind `if (app.Environment.IsDevelopment())`.
- **Legacy Alias Mapping (`Unsafe`):** `AuthController.NormalizeEmail` silently rewrites 8 hardcoded `@collabex.in` / `@sistec.ac.in` emails to seeded demo emails in all environments, including Production.
- **Frontend Demo Leakage (`Unsafe`):** `web/src/features/platform-admin/SuperAdminView.tsx:1322` still displays the hardcoded demo password string in UI helper text. `web/src/app/page.tsx` and `web/src/app/onboarding/page.tsx` expose `switchPersona(...)` buttons that bypass login in the client-side store.

---

## 6. Token / Session Security Findings

- **Signing Algorithm & Key Fallback (`Unsafe`):** `HS256` with `Jwt:Secret` in `appsettings.json` and a hardcoded fallback string in both `Program.cs:46` and `JwtTokenService.cs:26`. If `Jwt:Secret` is omitted in production, the app silently signs and validates tokens with the public dev key.
- **Token Lifetime & Revocation (`Unsafe`):** 7-day access token lifetime (`AddDays(7)`) with **zero revocation** (no `jti` blocklist, no `SecurityStamp` / `PasswordChangedAtUtc` check, no `IsActive` re-check). Changing password, revoking sessions, or deactivating a user leaves existing JWTs valid for up to 7 days.
- **Stale Claims (`Unsafe`):** `role`, `is_coordinator`, `college_id`, `department_id` are embedded in the 7-day JWT. When `HodController.ToggleCoordinator` changes `IsProjectCoordinator`, the user's permissions do not update until re-login.
- **Transport & Validation (`Partially implemented`):** `options.RequireHttpsMetadata = false` is hardcoded in `Program.cs:53` without checking `IsDevelopment()`. `ValidateIssuer`, `ValidateAudience`, `ValidateLifetime`, and `ValidateIssuerSigningKey` are `true` (`ClockSkew = 1 min`).

---

## 7. Role and Permission Matrix

| Policy (`ProjectHubPolicies.cs`) | Permitted Claims / Roles | Controllers / Endpoints Using Policy | Notes |
| :--- | :--- | :--- | :--- |
| `SuperAdminOnly` | `SuperAdmin` or `is_super_admin=true` | `AccountController`, `PlatformController` | Platform-level operations. |
| `CollegeAdminOnly` | `CollegeAdmin` **or `SuperAdmin`** | `CollegeController`, `AccreditationController`, `HodController.CreateFaculty` | `SuperAdmin` has implicit override. |
| `HodOnly` | `HOD` | `HodController` (except `CreateFaculty`) | Department-scoped in controller logic. |
| `CoordinatorOrHod` | `HOD`, `Faculty` + `is_coordinator=true`, **or `SuperAdmin`** | `CoordinatorController` | `SuperAdmin` has implicit override. |
| `FacultyOrAbove` | `Faculty`, `HOD`, **or `SuperAdmin`** | `FacultyController`, `SupervisionController`, `ArtifactsController.ReviewArtifact`, `ClosureController` (2 actions), `EvaluationController` (8 actions) | `SuperAdmin` has implicit override; `CollegeAdmin` is excluded. |
| `StudentOrLead` | `Student` | `StudentController` (except `GetPublicStudentPortfolio`) | Team-lead checks are performed in controller logic. |
| `[Authorize]` (Authenticated any role) | Any valid JWT | `ArtifactsController` (downloads), `ClosureController.GetClosureReadiness`, `EvaluationController` (student-accessible reads) | Per-action role/ownership checks inside methods. |
| `[AllowAnonymous]` | Unauthenticated | `AuthController` (3 actions), `StudentController.GetPublicStudentPortfolio`, `HealthEndpoints` (`/api/health` has no `.RequireAuthorization()`) | `GetPublicStudentPortfolio` uses `IgnoreQueryFilters()`. |

---

## 8. Endpoint-Level Authorization Findings

- **Missing `[Authorize]` / Anonymous Exposure:**
  - `HealthEndpoints.MapHealthEndpoints` (`GET /api/health`) is anonymous and exposes `Environment`, `Version`, `Database.Provider`, `Redis.Engine`, and `Tenant.CollegeId`.
  - `StudentController.GetPublicStudentPortfolio` (`GET /api/student/portfolio/{enrollmentNumber}/public`) is `[AllowAnonymous]` and uses `.IgnoreQueryFilters()`. Because `EnrollmentOrEmployeeCode` is only unique *per college*, two colleges with the same enrollment number will have their records merged into a single public response.
- **Unbounded `SuperAdmin` Academic Access:** `ProjectHubPolicies` grants `SuperAdmin` access to `CollegeAdminOnly`, `CoordinatorOrHod`, and `FacultyOrAbove`, while `ClosureController.GetClosureReadiness` explicitly blocks `SuperAdmin` (`403`). Moreover, `DbInitializer` assigns `SuperAdmin` a `CollegeId` of `SistecTenantId`, and `ProjectHubDbContext` disables tenant query filters whenever `_tenantContext.IsSuperAdmin == true`.
- **Fallback Email in `AccountController`:** `GetCurrentEmail()` falls back to `"admin@collabex.in"` if email claims are missing, instead of failing closed.

---

## 9. Tenant-Isolation Findings

- **EF Core Global Query Filters (`Verified implementation`):** `ProjectHubDbContext.ConfigureTenantAndSoftDeleteFilter<TEntity>` enforces `!e.IsDeleted && (_tenantContext.IsSuperAdmin || (Guid?)e.CollegeId == _tenantContext.CollegeId)` on all `ITenantEntity` types.
- **SaveChanges Cross-Tenant Guard (`Verified implementation`):** `ProjectHubDbContext.ApplyAuditAndTenantStamping` blocks non-SuperAdmin inserts/updates/deletes with mismatched `CollegeId` (`UnauthorizedAccessException` -> `403` in `Program.cs` middleware) and prevents mutating `CollegeId`.
- **PostgreSQL Row-Level Security (`Partially implemented / Incomplete`):**
  - `TenantRlsConnectionInterceptor` sets `app.current_tenant` and `app.is_super_admin` via string interpolation on `ConnectionOpened` and `TransactionStarted`.
  - **Critical Gap:** Only **6 tables** (`AcademicSessions`, `CoursePrograms`, `CurriculumSchemes`, `SemesterTerms`, `SubjectOfferings`, `StudentAcademicEnrollments`) have `ENABLE ROW LEVEL SECURITY` in migration `20261120061650_AddRgpvMasterAndAcademicHierarchy.cs`. Core tables (`UserAccounts`, `ProjectTeams`, `Departments`, `TeamMembers`, `TeamArtifacts`, `WeeklyLogbooks`, `VivaEvaluations`, `AccreditationCycles`, `UserSessions`, etc.) have **no RLS**.
  - **Owner Bypass Risk:** Migrations do not apply `FORCE ROW LEVEL SECURITY`, so if the application connects as the table owner (`postgres` in `appsettings.json`), PostgreSQL bypasses RLS entirely.
- **Unauthenticated `X-College-Id` Fallback (`Unsafe`):** `TenantResolutionMiddleware` accepts `X-College-Id` on unauthenticated requests. While currently benign for `AuthController` (which uses `IgnoreQueryFilters()`), any future anonymous endpoint relying on `_tenantContext.CollegeId` could be spoofed.

---

## 10. Frontend Authentication Findings

- **Token Storage in `localStorage` & `sessionStorage` (`Unsafe`):** `web/src/lib/api/apiClient.ts` (`setAuthSession`) stores `projecthub_jwt_token` and `projecthub_user_profile` in both `localStorage` and `sessionStorage`, making the 7-day JWT readable by any XSS payload.
- **Client-Side Mock Persona & Bypass (`Unsafe`):**
  - `web/src/app/page.tsx` (`handleLaunchRole`) and `web/src/app/onboarding/page.tsx` call `switchPersona(...)` in `ProjectHubStore`, setting `isAuthenticated = true` in React state without a backend JWT. (`RouteGuard.tsx` does check `getAuthToken()`, which mitigates direct dashboard access without a token, but `ProjectHubStore` still contains mock `initialPersonas` and `switchPersona` logic.)
  - `web/src/app/login/page.tsx:89` calls `toggleFacultyCoordinator("usr-fac-verma")` (a hardcoded mock ID) when a coordinator logs in.
  - `web/src/app/login/page.tsx:198` auto-populates `otpCode` from `res.devOtp` when returned by the backend.
- **No Security Headers / Next.js Middleware (`Missing`):** `web/next.config.ts` has no CSP, `X-Frame-Options`, `X-Content-Type-Options`, or `Referrer-Policy` headers, and there is no `web/src/middleware.ts` for server-side route protection.
- **401 / 403 Handling (`Verified implementation`):** `apiClient.ts` clears storage, dispatches `collabex:session-expired`, and redirects via `window.location.replace("/login")` on `401`, and shows an error toast on `403`.

---

## 11. Production Configuration Findings

- **Hardcoded Secrets in `appsettings.json` (`Unsafe`):** Both `appsettings.json` and `appsettings.Development.json` contain a placeholder `Jwt:Secret`, default `postgres` DB password, `Include Error Detail=true`, and `AllowedHosts: "*"`.
- **No Startup Secret Validation (`Missing`):** `Program.cs` does not fail fast if `Jwt:Secret`, `ConnectionStrings:DefaultConnection`, or SMTP/email credentials are missing or equal to dev defaults in Production.
- **Missing Production Email Provider (`Missing`):** `LoggingEmailSender` is unconditionally registered in `ProjectHub.Infrastructure/DependencyInjection.cs:23`, meaning Production deployments would log OTPs to stdout instead of emailing users.
- **Missing HSTS / HTTPS Redirection (`Missing`):** `Program.cs` does not call `app.UseHsts()` or `app.UseHttpsRedirection()` in non-development environments, and `options.RequireHttpsMetadata = false` is hardcoded.
- **Verbose SQL Logging (`Unsafe`):** `appsettings.json` sets `Microsoft.EntityFrameworkCore.Database.Command: "Information"` and `Include Error Detail=true` in the connection string.

---

## 12. Existing Test Coverage and Execution Results

**Executed Command (non-destructive, against InMemory EF Core via `CustomWebApplicationFactory`):**
```powershell
dotnet test backend/ProjectHub.slnx --filter "FullyQualifiedName~AuthEndpointTests|FullyQualifiedName~CrossTenantAndAuthorizationTests|FullyQualifiedName~TenantIsolationTests|FullyQualifiedName~HodSecurityAndIsolationTests|FullyQualifiedName~FacultySecurityAndWorkflowTests" --no-restore
```
**Observed Result:** `Passed! - Failed: 0, Passed: 89, Skipped: 0, Total: 89, Duration: 21 s`

| Test Area | Coverage Status | Evidence / Gaps |
| :--- | :--- | :--- |
| Successful login & invalid credentials | **Verified** | `AuthEndpointTests` (Student, Faculty, HOD, invalid password). |
| Unactivated account login | **Verified** | `AuthEndpointTests.Login_UnactivatedAccount_ReturnsBadRequestWithActivationPrompt`. |
| OTP request, anti-enumeration, cooldown, single-use reset | **Verified** | `AuthEndpointTests` (5 tests). |
| Role restrictions & header spoofing (`X-College-Id`) | **Verified** | `CrossTenantAndAuthorizationTests`, `HodSecurityAndIsolationTests`, `FacultySecurityAndWorkflowTests`. |
| EF Core global query filter & `SaveChanges` cross-tenant guard | **Verified** | `TenantIsolationTests`. |
| Disabled account login & OTP reactivation bypass | **Missing** | No test verifies `IsActive == false` blocked on `ResetPassword`. |
| Token expiration, tampering, revocation, stale claims | **Missing** | No tests for expired/tampered JWTs or post-revocation/post-deactivation rejection. |
| Refresh-token rotation | **Missing** | Feature does not exist. |
| PostgreSQL RLS enforcement | **Unable to verify** | `CustomWebApplicationFactory` uses `UseInMemoryDatabase`, bypassing Npgsql RLS and `TenantRlsConnectionInterceptor`. |

---

## 13. Prioritized Security Findings

### Critical

- **AUTH-CRIT-01: Hardcoded JWT Signing Key Fallback & Committed Secret**
  - **Actual behavior:** `Program.cs:46` and `JwtTokenService.cs:26` fall back to a hardcoded string if `Jwt:Secret` is unset, and `appsettings.json` commits that same key.
  - **Why it is risky:** Anyone with repository access can forge valid `SuperAdmin` JWTs for any tenant if production configuration omits `Jwt:Secret`.
  - **Evidence:** `backend/src/ProjectHub.Api/Program.cs:46`, `backend/src/ProjectHub.Infrastructure/Security/JwtTokenService.cs:26`, `backend/src/ProjectHub.Api/appsettings.json:9`.
  - **Recommended remediation:** Remove all fallback strings, require `Jwt:Secret` (or asymmetric RSA/ECDSA key) from environment/KeyVault at startup, and throw `InvalidOperationException` on boot in non-Development if missing or weak.
  - **Blocks production:** **Yes**

- **AUTH-CRIT-02: Disabled Accounts Can Self-Reactivate via Password Reset**
  - **Actual behavior:** `AuthController.ResetPassword` (`AuthController.cs:286-287`) sets `user.IsActive = true` without checking whether `user.IsActive` was `false`.
  - **Why it is risky:** A suspended/terminated user or expelled student can regain full access by requesting a password reset OTP.
  - **Evidence:** `backend/src/ProjectHub.Api/Controllers/AuthController.cs:230-294`.
  - **Recommended remediation:** Reject `RequestPasswordOtp` and `ResetPassword` when `!user.IsActive` (while preserving anti-enumeration on `RequestPasswordOtp`).
  - **Blocks production:** **Yes**

- **AUTH-CRIT-03: No Production Email Provider — OTPs Logged in Plaintext**
  - **Actual behavior:** `LoggingEmailSender` is unconditionally registered for all environments and logs 6-digit OTPs to console/Serilog.
  - **Why it is risky:** Users cannot receive OTPs in production, and any log aggregator/operator gains credential-reset codes for all accounts including `SuperAdmin`.
  - **Evidence:** `backend/src/ProjectHub.Infrastructure/DependencyInjection.cs:23`, `backend/src/ProjectHub.Infrastructure/Services/LoggingEmailSender.cs:18-23`, `backend/src/ProjectHub.Api/Controllers/AuthController.cs:186,194`.
  - **Recommended remediation:** Implement an SMTP / transactional email provider (`IEmailSender`) for Production, redact OTPs from all logs, and restrict `LoggingEmailSender` + `devOtp` strictly to `IsDevelopment()`.
  - **Blocks production:** **Yes**

- **AUTH-CRIT-04: Stateless 7-Day JWTs Cannot Be Revoked & Ignore Account Deactivation**
  - **Actual behavior:** Access tokens are valid for 7 days (`AddDays(7)`), `UserSessions` are mocked (`"sess-cur-01"`), and `JwtBearerEvents` never validates session state, `IsActive`, or `PasswordChangedAtUtc`.
  - **Why it is risky:** Logout, session revocation, password change, and user deactivation do not terminate active sessions; stolen tokens remain valid for up to 7 days.
  - **Evidence:** `backend/src/ProjectHub.Infrastructure/Security/JwtTokenService.cs:33`, `backend/src/ProjectHub.Api/Controllers/AccountController.cs:318,473,662`.
  - **Recommended remediation:** Reduce access token TTL to 10–15 minutes, implement persisted refresh tokens with rotation & reuse detection, and validate `SecurityStamp` / session revocation (backed by Redis cache).
  - **Blocks production:** **Yes**

### High

- **AUTH-HIGH-01: JWT Stored in `localStorage` & `sessionStorage` (XSS Token Theft)**
  - **Actual behavior:** `setAuthSession` writes `projecthub_jwt_token` to `localStorage` and `sessionStorage`.
  - **Why it is risky:** Any XSS vulnerability allows immediate exfiltration of 7-day bearer tokens.
  - **Evidence:** `web/src/lib/api/apiClient.ts:30-54`, `web/src/app/login/page.tsx:144,237`.
  - **Recommended remediation:** Use a Next.js BFF or backend-issued `HttpOnly`, `Secure`, `SameSite=Lax` cookies for web sessions; keep tokens out of Web Storage.
  - **Blocks production:** **Yes**

- **AUTH-HIGH-02: Login Brute-Force Protection & Account Lockout Missing**
  - **Actual behavior:** `AuthController.Login` has no `[EnableRateLimiting]` and no failed-attempt lockout counter.
  - **Why it is risky:** Attackers can perform unlimited credential stuffing and password brute-forcing.
  - **Evidence:** `backend/src/ProjectHub.Api/Controllers/AuthController.cs:66-121`, `backend/src/ProjectHub.Api/Program.cs:75-88`.
  - **Recommended remediation:** Add IP + email rate limiting on `/api/auth/login` and progressive account lockout (`AccessFailedCount` / `LockoutEndUtc`).
  - **Blocks production:** **Yes**

- **AUTH-HIGH-03: Incomplete PostgreSQL Row-Level Security (RLS) Coverage**
  - **Actual behavior:** Only 6 academic hierarchy tables have RLS enabled; `UserAccounts`, `ProjectTeams`, `Departments`, `TeamArtifacts`, `VivaEvaluations`, `AccreditationCycles`, etc., have no RLS, and `FORCE ROW LEVEL SECURITY` is not set.
  - **Why it is risky:** Any raw SQL query, misconfigured EF query using `IgnoreQueryFilters()`, or DB connection as table owner bypasses tenant isolation.
  - **Evidence:** `backend/src/ProjectHub.Infrastructure/Persistence/Migrations/20261120061650_AddRgpvMasterAndAcademicHierarchy.cs:676-705`.
  - **Recommended remediation:** Enable and `FORCE ROW LEVEL SECURITY` on all `ITenantEntity` tables, and connect using a non-superuser, non-owner application DB role.
  - **Blocks production:** **Yes**

- **AUTH-HIGH-04: Mocked MFA & Recovery Codes for `SuperAdmin`**
  - **Actual behavior:** `AccountController` reports MFA as enabled/configured while `UserAccount.MfaSecret` is unused, recovery codes are not stored, and `Login` never prompts for MFA.
  - **Why it is risky:** `SuperAdmin` has cross-tenant read/write access protected only by a single password factor.
  - **Evidence:** `backend/src/ProjectHub.Api/Controllers/AccountController.cs:89,361-450`.
  - **Recommended remediation:** Implement real TOTP (RFC 6238) / WebAuthn MFA verification on login and hashed single-use recovery codes, mandatory for `SuperAdmin` and `CollegeAdmin`.
  - **Blocks production:** **Yes**

- **AUTH-HIGH-05: Unbounded `SuperAdmin` Access to Tenant Academic Data**
  - **Actual behavior:** `ProjectHubPolicies` grants `SuperAdmin` access to `CollegeAdminOnly`, `CoordinatorOrHod`, and `FacultyOrAbove`, while `SuperAdmin` is seeded with `CollegeId = SistecTenantId` and bypasses EF query filters.
  - **Why it is risky:** Violates least privilege and leaks private institutional academic data to platform operators without explicit consent/impersonation audit.
  - **Evidence:** `backend/src/ProjectHub.Api/Authorization/ProjectHubPolicies.cs:31-64`, `backend/src/ProjectHub.Infrastructure/Persistence/DbInitializer.cs:721`.
  - **Recommended remediation:** Remove `SuperAdmin` from academic/college policies; introduce explicit, audited support-access/break-glass policies if needed.
  - **Blocks production:** **Yes**

- **AUTH-HIGH-06: Email-Change OTP Not Bound to Target Email & Lacks Lockout**
  - **Actual behavior:** `AccountController.RequestEmailChange` hashes OTP into `PasswordResetOtpHashed` without storing `NewEmail`, and `VerifyEmailChange` has no attempt limit.
  - **Why it is risky:** Unlimited OTP guessing and potential target-email substitution.
  - **Evidence:** `backend/src/ProjectHub.Api/Controllers/AccountController.cs:159-269`.
  - **Recommended remediation:** Store `PendingEmail` + attempt counter alongside hashed token/OTP with max-5-attempt invalidation.
  - **Blocks production:** **Yes**

### Medium

- **AUTH-MED-01: User Enumeration via `ResetPassword` 404 & `Login` Distinct Errors**
  - **Actual behavior:** `ResetPassword` returns `404 NotFound` for unknown emails; `Login` returns `400 BadRequest` for unactivated accounts vs `401` for invalid credentials.
  - **Evidence:** `backend/src/ProjectHub.Api/Controllers/AuthController.cs:90-93,236-239`.
  - **Recommended remediation:** Return uniform generic responses on `ResetPassword` and avoid leaking account existence/state to unauthenticated callers.
  - **Blocks production:** **No** (recommended before launch)

- **AUTH-MED-02: Weak Password Policy on `ResetPassword` & Demo Aliases in Production**
  - **Actual behavior:** `ResetPassword` allows any 8-char password (e.g. `"12345678"`); `NormalizeEmail` rewrites legacy demo emails in Production.
  - **Evidence:** `backend/src/ProjectHub.Api/Controllers/AuthController.cs:43-58,222`.
  - **Recommended remediation:** Enforce unified 12-char complexity policy across all password-setting endpoints and remove `NormalizeEmail` demo aliases.
  - **Blocks production:** **No**

- **AUTH-MED-03: Public Portfolio Endpoint Queries Across All Tenants by Enrollment Code**
  - **Actual behavior:** `StudentController.GetPublicStudentPortfolio` is `[AllowAnonymous]` and uses `IgnoreQueryFilters()` filtering only on `EnrollmentNumber`.
  - **Evidence:** `backend/src/ProjectHub.Api/Controllers/StudentController.cs:4507-4520`.
  - **Recommended remediation:** Scope public portfolio lookup by `(collegeCode, enrollmentNumber)` or an opaque public portfolio slug/ID.
  - **Blocks production:** **No**

- **AUTH-MED-04: Missing HTTPS Enforcement, `RequireHttpsMetadata`, and Security Headers**
  - **Actual behavior:** `RequireHttpsMetadata = false` is hardcoded; no `UseHsts()`, `UseHttpsRedirection()`, or Next.js CSP/security headers.
  - **Evidence:** `backend/src/ProjectHub.Api/Program.cs:53`, `web/next.config.ts`.
  - **Recommended remediation:** Enable `RequireHttpsMetadata = !env.IsDevelopment()`, `UseHsts()`, `UseHttpsRedirection()`, and strict CSP/security headers in `next.config.ts`.
  - **Blocks production:** **Yes** (for internet-facing deployment)

- **AUTH-MED-05: Stale Role / Coordinator Claims & Unchecked `College.IsActive` on Login**
  - **Actual behavior:** `Login` does not check `user.College.IsActive` (unlike `RequestPasswordOtp`), and `ToggleCoordinator` leaves stale `is_coordinator` claims in active JWTs.
  - **Evidence:** `backend/src/ProjectHub.Api/Controllers/AuthController.cs:85`, `backend/src/ProjectHub.Api/Controllers/HodController.cs:938`.
  - **Recommended remediation:** Reject login when `user.College?.IsActive == false` (except `SuperAdmin`), and use short-lived access tokens + claim/security-stamp refresh.
  - **Blocks production:** **No**

### Low

- **AUTH-LOW-01: Anonymous `/api/health` Leaks Infrastructure Metadata**
  - **Actual behavior:** Returns environment name, DB provider, Redis engine, and `Tenant.CollegeId` without authentication.
  - **Evidence:** `backend/src/ProjectHub.Api/Endpoints/HealthEndpoints.cs:12-61`.
  - **Recommended remediation:** Return minimal `{ status: "Healthy" }` publicly and gate detailed diagnostics behind `SuperAdminOnly`.
  - **Blocks production:** **No**

- **AUTH-LOW-02: Frontend Mock Persona Helper Text & `ProjectHubStore` Mock Artifacts**
  - **Actual behavior:** `SuperAdminView.tsx:1322` mentions the demo password; `page.tsx` and `onboarding/page.tsx` call `switchPersona`.
  - **Evidence:** `web/src/features/platform-admin/SuperAdminView.tsx:1322`, `web/src/app/page.tsx:55`, `web/src/app/onboarding/page.tsx:20`.
  - **Recommended remediation:** Remove demo credential text and legacy `switchPersona` bypasses from production builds.
  - **Blocks production:** **No**

---

## 14. Recommended Production Architecture for Colabex

1. **Identity Foundation — ASP.NET Core Identity (Custom-Adapted to `UserAccount` or `IdentityUser<Guid>`):**
   - Retain `UserAccount` (or migrate to `IdentityUser<Guid>` with custom tenant/academic columns) paired with `UserManager`-grade security primitives: `SecurityStamp` (rotated on password change, role/coordinator change, deactivation), `AccessFailedCount` + `LockoutEndUtc`, and `PasswordHasher<UserAccount>` (PBKDF2-SHA256 / Argon2id).
   - Keep `UserAccount` partitioned by `CollegeId` (except `SuperAdmin` with nullable `CollegeId`), enforcing global email uniqueness or tenant-scoped login with college resolution.

2. **Dual-Client Authentication Strategy (Next.js Web + Future React Native Mobile):**
   - **Next.js Web (BFF / HttpOnly Cookie Pattern):** Issue short-lived access tokens (10–15 min) + opaque refresh tokens stored in `HttpOnly`, `Secure`, `SameSite=Lax` cookies (via Next.js Route Handlers or ASP.NET Core auth endpoints with CSRF double-submit / `SameSite=Lax` + `Origin` validation). Zero tokens in `localStorage` or `sessionStorage`.
   - **Future React Native Mobile:** Support OAuth2 Authorization Code + PKCE / Bearer access token + rotating refresh token stored in OS SecureStore/Keychain.

3. **Refresh Token Rotation, Reuse Detection & Real `UserSessions`:**
   - Persist `UserSession` on login with `RefreshTokenHash` (SHA-256), `TokenFamilyId`, `ExpiresAtUtc`, `RevokedAtUtc`, `UserAgent`, `IpAddress`.
   - On `/api/auth/refresh`, rotate the refresh token. If a previously rotated token is replayed, immediately revoke the entire `TokenFamilyId` and audit-log a security incident.
   - Cache revoked `SecurityStamp` / `SessionId` in **Redis** (already configured in `appsettings.json`!) so `JwtBearerEvents.OnTokenValidated` can reject deactivated/logged-out users in O(1) without hitting PostgreSQL on every request.

4. **OIDC / Institutional SSO Readiness (Google Workspace & Microsoft Entra ID):**
   - Add `ExternalLogins` (`Provider`, `ProviderKey`, `UserId`) and `CollegeTenant.SsoConfigJson` (OIDC Authority, ClientId, AllowedDomains).
   - Map verified OIDC `email` + `hd`/`tid` claims to pre-provisioned `UserAccount` records in the matching `CollegeTenant` (never auto-create unprovisioned users).

5. **Role, Tenant, Department & Resource Authorization:**
   - Remove `SuperAdmin` from `CollegeAdminOnly`, `CoordinatorOrHod`, and `FacultyOrAbove` policies.
   - Replace `X-College-Id` unauthenticated fallback in `TenantResolutionMiddleware` with explicit route/query parameters on public discovery endpoints only.
   - Enable and `FORCE ROW LEVEL SECURITY` on **all** `ITenantEntity` tables in PostgreSQL using a non-owner DB role.

6. **Account Provisioning (CollegeAdmin CSV & Staff Directory) & Email Verification:**
   - Provisioned students/staff start with `IsActivated = false`, `PasswordHash = null`, and receive a single-use cryptographic activation link/token (256-bit random token, SHA-256 hashed in DB, 24h TTL) via a real `IEmailSender` (SMTP/SES/Resend).
   - Duplicate `(CollegeId, Email)` and `(CollegeId, EnrollmentOrEmployeeCode)` rejected with `409 Conflict`.

7. **Mandatory MFA for Privileged Roles & Audit Logging:**
   - Enforce TOTP (RFC 6238) + hashed single-use recovery codes for `SuperAdmin` and `CollegeAdmin` at login (`MfaChallengeToken` -> `/api/auth/mfa/verify`).
   - Log all auth events (login success/failure, lockout, OTP request, password reset, MFA enrollment, session revocation) to `PlatformAuditLogs` with IP, User-Agent, and redacted payloads.

---

## 15. Proposed Implementation Phases

- **Phase B — Foundation & Configuration Hardening:** Remove hardcoded JWT secret fallbacks, add startup secret validation, implement real `IEmailSender`, enforce unified password complexity, fix `ResetPassword` reactivation bug, remove `NormalizeEmail` demo aliases, and gate `devOtp`/console tables strictly to Development.
- **Phase C — Session, Refresh Token Rotation & Redis Revocation:** Implement real `UserSessions`, short-lived JWTs (15m), rotating refresh tokens with reuse detection, `SecurityStamp` validation via Redis, login rate limiting + lockout, and `AccountController` MFA + email-change fixes.
- **Phase D — Authorization, RLS & Tenant Hardening:** Remove `SuperAdmin` overrides from academic policies, apply `ENABLE` + `FORCE ROW LEVEL SECURITY` to all `ITenantEntity` tables, remove unauthenticated `X-College-Id` fallback, scope public portfolio by college.
- **Phase E — Next.js BFF Cookie Auth & Frontend Cleanup:** Migrate `apiClient.ts` from `localStorage`/`sessionStorage` to `HttpOnly` cookies, add Next.js `middleware.ts` + security headers in `next.config.ts`, remove `switchPersona` mock bypasses and demo credential text.
- **Phase F — OIDC/SSO, MFA Enforcement & Security Test Suite:** Add TOTP MFA challenge flow, OIDC institutional SSO, and PostgreSQL-backed integration tests for token expiry, tampering, revocation, lockout, and RLS isolation.

---

## 16. Safe Migration Plan for Existing Demo & Manually Created Accounts

1. **Preserve Existing Data:** Do not delete `UserAccounts` or break existing Student/Faculty/HOD/CollegeAdmin relationships.
2. **Flag Legacy Demo Accounts:** Add `RequiresPasswordReset` / `MustChangePassword` (`PasswordChangedAtUtc == null`) and invalidate any account still using the known demo password hash in Staging/Production by setting `PasswordHash = null`, `IsActivated = false`, and `SecurityStamp = NewGuid()`.
3. **Production Seed Guard:** Ensure `DbInitializer.SeedPersonasAsync` never runs in Production; instead, bootstrap the initial `SuperAdmin` via a one-time CLI/environment-seeded setup with a mandatory password change + TOTP enrollment on first login.
4. **Gradual Rollout:** Notify existing institutional users via `IEmailSender` to complete account activation via the new token/OTP flow.

---

## 17. Risks and Compatibility Considerations

- **Integration Tests (`CustomWebApplicationFactory`):** Existing 89 tests use `UseInMemoryDatabase` and login with demo emails/passwords; Phase B/C must update test helpers (`GetTokenForPersonaAsync`) without breaking Student Module / Faculty / HOD / CollegeAdmin test suites.
- **Frontend E2E Tests (`web/tests/e2e/*.spec.ts`):** Playwright tests that inspect `localStorage` or log in via `/login` will need alignment when migrating to `HttpOnly` cookies.
- **Future React Native Client:** Keeping `/api/auth/token` (Bearer + Refresh) alongside web `HttpOnly` cookies ensures mobile compatibility without weakening browser XSS posture.

---

## 18. Explicit List of Files Requiring Modification in Future Implementation

- **Backend API:**
  - `backend/src/ProjectHub.Api/Program.cs`
  - `backend/src/ProjectHub.Api/Controllers/AuthController.cs`
  - `backend/src/ProjectHub.Api/Controllers/AccountController.cs`
  - `backend/src/ProjectHub.Api/Controllers/CollegeController.cs`
  - `backend/src/ProjectHub.Api/Controllers/CoordinatorController.cs`
  - `backend/src/ProjectHub.Api/Controllers/StudentController.cs`
  - `backend/src/ProjectHub.Api/Authorization/ProjectHubPolicies.cs`
  - `backend/src/ProjectHub.Api/Middleware/TenantResolutionMiddleware.cs`
  - `backend/src/ProjectHub.Api/Endpoints/HealthEndpoints.cs`
  - `backend/src/ProjectHub.Api/appsettings.json` & `appsettings.Development.json`
- **Backend Domain / Application / Infrastructure:**
  - `backend/src/ProjectHub.Domain/Entities/UserAccount.cs`
  - `backend/src/ProjectHub.Domain/Entities/UserSession.cs`
  - `backend/src/ProjectHub.Application/Common/Models/AuthDtos.cs`
  - `backend/src/ProjectHub.Infrastructure/DependencyInjection.cs`
  - `backend/src/ProjectHub.Infrastructure/Security/JwtTokenService.cs`
  - `backend/src/ProjectHub.Infrastructure/Services/LoggingEmailSender.cs` (+ new SMTP/Email sender)
  - `backend/src/ProjectHub.Infrastructure/Persistence/DbInitializer.cs`
  - `backend/src/ProjectHub.Infrastructure/Persistence/ProjectHubDbContext.cs`
  - New EF Core Migration for `UserAccount`/`UserSession` fields & full PostgreSQL `FORCE ROW LEVEL SECURITY`
- **Frontend (`web/`):**
  - `web/next.config.ts`
  - `web/src/middleware.ts` (new)
  - `web/src/lib/api/apiClient.ts`
  - `web/src/lib/api/authApi.ts`
  - `web/src/app/login/page.tsx`
  - `web/src/app/page.tsx` & `web/src/app/onboarding/page.tsx`
  - `web/src/mocks/ProjectHubStore.tsx`
  - `web/src/navigation/RouteGuard.tsx`
  - `web/src/features/platform-admin/SuperAdminView.tsx`
