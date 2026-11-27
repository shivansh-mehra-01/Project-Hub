# Colabex / Project Hub — Production Deployment Guide

## 1. Architecture & Network Topology

```
Browser (HTTPS)
   │
   ▼
Edge Reverse Proxy (Nginx / Caddy — TLS termination)
   │  OVERWRITES X-Forwarded-For = $remote_addr
   ▼
Next.js 16 BFF (internal port 3000 — NOT exposed to internet)
   │  Forwards X-Forwarded-For + X-Forwarded-Proto to API
   ▼
ASP.NET Core 10 API (internal port 5000 — NOT exposed to internet)
   │
   ├── PostgreSQL 17 (RLS enforced via colabex_rls_app)
   └── Redis 7 (Session revocation cache)
```

### Forwarded Headers (`X-Forwarded-For`) Rules
- **The API's direct TCP peer is the Next.js BFF server**, NOT the edge proxy.
- Configure `ForwardedHeaders:KnownProxies` (Next.js server IP) or `ForwardedHeaders:KnownNetworks` (Docker bridge subnet, e.g. `172.16.0.0/12`) on the API. Do **not** put only the edge proxy IP here.
- The edge proxy **must overwrite** (not append to) `X-Forwarded-For` (`proxy_set_header X-Forwarded-For $remote_addr;` in Nginx), and **Next.js must not be exposed directly to the internet**; otherwise clients could spoof `X-Forwarded-For`.

---

## 2. Required Environment Variables

### Backend API (`ASPNETCORE_ENVIRONMENT=Production` is mandatory)

| Variable | Description | Example / Notes |
| --- | --- | --- |
| `ASPNETCORE_ENVIRONMENT` | Runtime environment | `Production` (mandatory; never `Development`) |
| `ConnectionStrings__DefaultConnection` | Runtime PostgreSQL DSN (`colabex_rls_app`) | `Host=postgres;Port=5432;Database=projecthub_db;Username=colabex_rls_app;Password=<runtime_pw>` |
| `ConnectionStrings__Migrations` | Migration-only PostgreSQL DSN (`colabex_migrator`) | `Host=postgres;Port=5432;Database=projecthub_db;Username=colabex_migrator;Password=<migrator_pw>` |
| `Redis__ConnectionString` | Redis 7 connection string | `redis:6379,password=<redis_pw>` |
| `Jwt__Secret` | HS256 signing key (min 32 chars, CSPRNG) | `<random-64-char-secret>` |
| `Jwt__Issuer` | JWT issuer URI | `https://api.yourdomain.edu` |
| `Jwt__Audience` | JWT audience URI | `https://app.yourdomain.edu` |
| `DataProtection__KeysPath` | Persistent directory for DataProtection keys | `/app/App_Data/dpkeys` |
| `Frontend__BaseUrl` | Public HTTPS origin for activation/reset links | `https://app.yourdomain.edu` |
| `Cors__AllowedOrigins__0` | Allowed frontend origin | `https://app.yourdomain.edu` |
| `ForwardedHeaders__KnownNetworks__0` | Trusted Next.js BFF subnet (CIDR) | `172.16.0.0/12` (or `KnownProxies__0`) |
| `Email__Provider` | Email provider | `Smtp` |
| `Email__SmtpHost` / `SmtpPort` | SMTP relay host & port | `smtp.yourdomain.edu` / `587` |
| `Email__SmtpUser` / `SmtpPassword` | SMTP credentials | Set via secret manager |
| `Email__FromAddress` | Sender address | `noreply@yourdomain.edu` |

### Frontend BFF (`web`)

| Variable | Description | Example |
| --- | --- | --- |
| `NODE_ENV` | Node runtime mode | `production` |
| `BACKEND_API_URL` | Internal API base URL | `http://api:5000` |
| `NEXT_PUBLIC_API_URL` | Fallback API URL | `http://api:5000` |

---

## 3. PostgreSQL Least-Privilege Roles & Migrations

Production does **not** auto-migrate on startup, and the API fails fast in non-Development environments if the runtime DB user has `SUPERUSER` or `BYPASSRLS`.

1. **Create roles (once, as PostgreSQL superuser):**
   Edit placeholders in `backend/deploy/sql/create_app_role.sql` and run it against your PostgreSQL database:
   ```bash
   psql -U postgres -d projecthub_db -f backend/deploy/sql/create_app_role.sql
   ```
   This creates:
   - `colabex_migrator`: schema owner used **only** for migrations and bootstrap.
   - `colabex_rls_app`: runtime role (`NOSUPERUSER NOBYPASSRLS`) with `SELECT, INSERT, UPDATE, DELETE` and sequence `USAGE, SELECT`.

2. **Apply EF Core migrations before starting the API:**
   ```bash
   ConnectionStrings__Migrations="Host=...;Username=colabex_migrator;Password=..." \
   dotnet run --project backend/src/ProjectHub.Api -- migrate
   ```

3. **Bootstrap the first SuperAdmin (once):**
   ```bash
   ConnectionStrings__Migrations="Host=...;Username=colabex_migrator;Password=..." \
   COLABEX_BOOTSTRAP_EMAIL="superadmin@yourdomain.edu" \
   COLABEX_BOOTSTRAP_PASSWORD="<strong-unique-password>" \
   COLABEX_BOOTSTRAP_NAME="Platform SuperAdmin" \
   dotnet run --project backend/src/ProjectHub.Api -- bootstrap-superadmin
   ```
   Sign in immediately and enroll TOTP MFA.

---

## 4. Verify with Restricted DB Role (`colabex_rls_app`)

Before opening traffic to users, verify the live stack against `colabex_rls_app`:
1. Confirm API startup succeeds (proving `rolsuper = false` and `rolbypassrls = false`).
2. Confirm `GET /api/health` returns `200 OK`.
3. Sign in as SuperAdmin and verify `/platform/dashboard` and `/platform/colleges` load.
4. Trigger a password-reset OTP (`POST /api/auth/request-password-otp`) and confirm `EmailOutboxWorker` claims and delivers the queued message without RLS permission errors.
5. Re-run `dotnet run --project backend/src/ProjectHub.Api -- migrate` using `ConnectionStrings__Migrations` (`colabex_migrator`) and verify zero errors.

---

## 5. Persistent Volumes & Backups

Mount persistent storage for:
- **Capstone Document Vault:** `/app/App_Data/vault` (student PDF/PPT/PPTX submissions).
- **ASP.NET DataProtection Keys:** `/app/App_Data/dpkeys` (`DataProtection:KeysPath`).
  > **Warning:** Losing DataProtection keys invalidates encrypted MFA secrets and outbox payloads.

### Backup Plan
- **PostgreSQL:** Schedule daily `pg_dump -Fc` backups + WAL archiving to off-host encrypted storage, and test restores monthly.
- **Vault & DataProtection Volumes:** Snapshot `/app/App_Data/vault` and `/app/App_Data/dpkeys` on the same daily cadence as `pg_dump`.

---

## 6. Secret Rotation Checklist

- [ ] **JWT Secret (`Jwt__Secret`):** Rotate during a planned maintenance window (invalidates active access tokens; users re-authenticate).
- [ ] **DB Passwords (`colabex_rls_app`, `colabex_migrator`):** Update in PostgreSQL (`ALTER ROLE ... WITH PASSWORD ...`), update secret store, and restart API.
- [ ] **SMTP Password (`Email__SmtpPassword`):** Update secret store and restart API.
- [ ] **Bootstrap Password (`COLABEX_BOOTSTRAP_PASSWORD`):** Unset/remove from environment after initial SuperAdmin creation.
