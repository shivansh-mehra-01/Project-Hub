-- ==============================================================================
-- Project Hub: Production PostgreSQL 17 Multi-Tenant Row-Level Security (RLS)
-- Lock 2 of Double-Lock Architecture & Trigram Similarity Indexing
-- ==============================================================================

-- 1. Enable pg_trgm extension for fast project title similarity analysis
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fast project title similarity trigram GIN index
CREATE INDEX IF NOT EXISTS "IX_ProjectTeams_Title_Trgm" 
ON "ProjectTeams" USING gin ("Title" gin_trgm_ops);

-- ==============================================================================
-- 2. Row-Level Security (RLS) Helper Macro & Policies
-- Every campus entity table must have ENABLE and FORCE ROW LEVEL SECURITY enabled.
-- SuperAdmins bypass tenant filter if app.is_super_admin = 'true'.
-- Campus users are strictly isolated to their active app.current_tenant UUID.
-- ==============================================================================

-- 2.1 Departments
ALTER TABLE "Departments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Departments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "Departments";
CREATE POLICY tenant_isolation_policy ON "Departments"
    AS PERMISSIVE FOR ALL TO PUBLIC
    USING (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );

-- 2.2 UserAccounts
ALTER TABLE "UserAccounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserAccounts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "UserAccounts";
CREATE POLICY tenant_isolation_policy ON "UserAccounts"
    AS PERMISSIVE FOR ALL TO PUBLIC
    USING (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );

-- 2.3 AcademicTracks
ALTER TABLE "AcademicTracks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AcademicTracks" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "AcademicTracks";
CREATE POLICY tenant_isolation_policy ON "AcademicTracks"
    AS PERMISSIVE FOR ALL TO PUBLIC
    USING (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );

-- 2.4 CourseOutcomeDefinitions
ALTER TABLE "CourseOutcomeDefinitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseOutcomeDefinitions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "CourseOutcomeDefinitions";
CREATE POLICY tenant_isolation_policy ON "CourseOutcomeDefinitions"
    AS PERMISSIVE FOR ALL TO PUBLIC
    USING (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );

-- 2.5 ProblemBankStatements
ALTER TABLE "ProblemBankStatements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProblemBankStatements" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "ProblemBankStatements";
CREATE POLICY tenant_isolation_policy ON "ProblemBankStatements"
    AS PERMISSIVE FOR ALL TO PUBLIC
    USING (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );

-- 2.6 ProjectTeams
ALTER TABLE "ProjectTeams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectTeams" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "ProjectTeams";
CREATE POLICY tenant_isolation_policy ON "ProjectTeams"
    AS PERMISSIVE FOR ALL TO PUBLIC
    USING (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );

-- 2.7 TeamMembers
ALTER TABLE "TeamMembers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamMembers" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "TeamMembers";
CREATE POLICY tenant_isolation_policy ON "TeamMembers"
    AS PERMISSIVE FOR ALL TO PUBLIC
    USING (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );

-- 2.8 SprintTasks
ALTER TABLE "SprintTasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SprintTasks" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "SprintTasks";
CREATE POLICY tenant_isolation_policy ON "SprintTasks"
    AS PERMISSIVE FOR ALL TO PUBLIC
    USING (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );

-- 2.9 TeamArtifacts
ALTER TABLE "TeamArtifacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamArtifacts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "TeamArtifacts";
CREATE POLICY tenant_isolation_policy ON "TeamArtifacts"
    AS PERMISSIVE FOR ALL TO PUBLIC
    USING (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );

-- 2.10 WeeklyLogbooks
ALTER TABLE "WeeklyLogbooks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeeklyLogbooks" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "WeeklyLogbooks";
CREATE POLICY tenant_isolation_policy ON "WeeklyLogbooks"
    AS PERMISSIVE FOR ALL TO PUBLIC
    USING (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );

-- 2.11 VivaPanels
ALTER TABLE "VivaPanels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VivaPanels" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "VivaPanels";
CREATE POLICY tenant_isolation_policy ON "VivaPanels"
    AS PERMISSIVE FOR ALL TO PUBLIC
    USING (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );

-- 2.12 VivaPanelEvaluators
ALTER TABLE "VivaPanelEvaluators" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VivaPanelEvaluators" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "VivaPanelEvaluators";
CREATE POLICY tenant_isolation_policy ON "VivaPanelEvaluators"
    AS PERMISSIVE FOR ALL TO PUBLIC
    USING (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );

-- 2.13 VivaEvaluations
ALTER TABLE "VivaEvaluations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VivaEvaluations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "VivaEvaluations";
CREATE POLICY tenant_isolation_policy ON "VivaEvaluations"
    AS PERMISSIVE FOR ALL TO PUBLIC
    USING (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );

-- 2.14 IndividualStudentScores
ALTER TABLE "IndividualStudentScores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IndividualStudentScores" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "IndividualStudentScores";
CREATE POLICY tenant_isolation_policy ON "IndividualStudentScores"
    AS PERMISSIVE FOR ALL TO PUBLIC
    USING (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );

-- 2.15 CourseExitSurveys
ALTER TABLE "CourseExitSurveys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseExitSurveys" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "CourseExitSurveys";
CREATE POLICY tenant_isolation_policy ON "CourseExitSurveys"
    AS PERMISSIVE FOR ALL TO PUBLIC
    USING (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );

-- 2.16 ExceptionAuditLogs
ALTER TABLE "ExceptionAuditLogs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExceptionAuditLogs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "ExceptionAuditLogs";
CREATE POLICY tenant_isolation_policy ON "ExceptionAuditLogs"
    AS PERMISSIVE FOR ALL TO PUBLIC
    USING (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
        current_setting('app.is_super_admin', true) = 'true'
        OR "CollegeId" = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );
