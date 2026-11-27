-- Colabex / Project Hub — PostgreSQL Least-Privilege Role Setup
-- Run this script as a PostgreSQL superuser ONCE before running EF Core migrations.
-- Replace placeholder passwords before executing in staging or production.

-- 1. Migration / schema-owner role (used ONLY by `dotnet run -- migrate` and `bootstrap-superadmin`)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'colabex_migrator') THEN
        CREATE ROLE colabex_migrator WITH
            LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            INHERIT
            NOREPLICATION
            PASSWORD 'CHANGE_ME_MIGRATOR_PASSWORD';
    END IF;
END
$$;

-- 2. Runtime application role (used by the API server via ConnectionStrings:DefaultConnection)
-- Strictly NOSUPERUSER and NOBYPASSRLS so PostgreSQL Row-Level Security (RLS) is always enforced.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'colabex_rls_app') THEN
        CREATE ROLE colabex_rls_app WITH
            LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            INHERIT
            NOREPLICATION
            NOBYPASSRLS
            PASSWORD 'CHANGE_ME_RUNTIME_PASSWORD';
    END IF;
END
$$;

-- 3. Database & schema ownership / usage
GRANT CONNECT ON DATABASE projecthub_db TO colabex_migrator, colabex_rls_app;
GRANT USAGE, CREATE ON SCHEMA public TO colabex_migrator;
GRANT USAGE ON SCHEMA public TO colabex_rls_app;

-- 4. Grant runtime DML privileges on existing objects
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO colabex_rls_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO colabex_rls_app;

-- 5. Ensure future tables/sequences created by colabex_migrator automatically grant runtime privileges
ALTER DEFAULT PRIVILEGES FOR ROLE colabex_migrator IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO colabex_rls_app;

ALTER DEFAULT PRIVILEGES FOR ROLE colabex_migrator IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO colabex_rls_app;
