using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProductionAuthAndFullRls : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                migrationBuilder.Sql(@"
                    CREATE TABLE IF NOT EXISTS ""UserSessions"" (
                        ""Id"" character varying(64) NOT NULL,
                        ""UserId"" uuid NOT NULL,
                        ""AccountEmail"" character varying(256) NOT NULL,
                        ""AccountName"" character varying(150) NOT NULL,
                        ""Role"" character varying(50) NOT NULL,
                        ""Device"" character varying(150) NOT NULL,
                        ""Browser"" character varying(100) NOT NULL,
                        ""IpAddress"" character varying(50) NOT NULL,
                        ""Location"" character varying(150) NOT NULL,
                        ""LoginTimeUtc"" timestamp with time zone NOT NULL,
                        ""LastActiveTimeUtc"" timestamp with time zone NOT NULL,
                        ""IsRevoked"" boolean NOT NULL,
                        ""RevokedAtUtc"" timestamp with time zone NULL,
                        ""TokenHash"" text NULL,
                        CONSTRAINT ""PK_UserSessions"" PRIMARY KEY (""Id"")
                    );
                ");
            }

            migrationBuilder.AddColumn<Guid>(
                name: "CollegeId",
                table: "UserSessions",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiresAtUtc",
                table: "UserSessions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "RevocationReason",
                table: "UserSessions",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TokenFamilyId",
                table: "UserSessions",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "AccessFailedCount",
                table: "UserAccounts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "ActivationTokenExpiresAtUtc",
                table: "UserAccounts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ActivationTokenHashed",
                table: "UserAccounts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EmailChangeOtpAttempts",
                table: "UserAccounts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "EmailChangeOtpExpiresAtUtc",
                table: "UserAccounts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmailChangeOtpHashed",
                table: "UserAccounts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LockoutEndUtc",
                table: "UserAccounts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MfaRecoveryCodesJson",
                table: "UserAccounts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PendingEmail",
                table: "UserAccounts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SecurityStamp",
                table: "UserAccounts",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "RefreshTokenRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenFamilyId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UsedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReplacedByTokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    RevokedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RevocationReason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokenRecords", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserSessions_TokenFamilyId",
                table: "UserSessions",
                column: "TokenFamilyId");

            migrationBuilder.CreateIndex(
                name: "IX_UserSessions_UserId",
                table: "UserSessions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokenRecords_SessionId",
                table: "RefreshTokenRecords",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokenRecords_TokenFamilyId",
                table: "RefreshTokenRecords",
                column: "TokenFamilyId");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokenRecords_TokenHash",
                table: "RefreshTokenRecords",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokenRecords_UserId",
                table: "RefreshTokenRecords",
                column: "UserId");

            if (migrationBuilder.ActiveProvider == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                var authLookupTables = new[]
                {
                    "UserAccounts",
                    "UserSessions",
                    "RefreshTokenRecords"
                };

                foreach (var table in authLookupTables)
                {
                    migrationBuilder.Sql($@"
                        ALTER TABLE ""{table}"" ENABLE ROW LEVEL SECURITY;
                        ALTER TABLE ""{table}"" FORCE ROW LEVEL SECURITY;
                        DROP POLICY IF EXISTS tenant_isolation_policy ON ""{table}"";
                        CREATE POLICY tenant_isolation_policy ON ""{table}""
                        FOR ALL
                        USING (
                            current_setting('app.is_super_admin', true) = 'true'
                            OR current_setting('app.auth_lookup', true) = 'true'
                            OR ""CollegeId""::text = current_setting('app.current_tenant', true)
                        )
                        WITH CHECK (
                            current_setting('app.is_super_admin', true) = 'true'
                            OR current_setting('app.auth_lookup', true) = 'true'
                            OR ""CollegeId""::text = current_setting('app.current_tenant', true)
                        );
                    ");
                }

                migrationBuilder.Sql(@"
                    ALTER TABLE ""StudentAcademicRecords"" ENABLE ROW LEVEL SECURITY;
                    ALTER TABLE ""StudentAcademicRecords"" FORCE ROW LEVEL SECURITY;
                    DROP POLICY IF EXISTS tenant_isolation_policy ON ""StudentAcademicRecords"";
                    CREATE POLICY tenant_isolation_policy ON ""StudentAcademicRecords""
                    FOR ALL
                    USING (
                        current_setting('app.is_super_admin', true) = 'true'
                        OR ""CollegeId""::text = current_setting('app.current_tenant', true)
                        OR (""AllowPublicPortfolio"" = true AND ""IsVerified"" = true)
                    )
                    WITH CHECK (
                        current_setting('app.is_super_admin', true) = 'true'
                        OR ""CollegeId""::text = current_setting('app.current_tenant', true)
                    );
                ");

                var standardTenantTables = new[]
                {
                    "AcademicSessions", "AcademicTracks", "AccreditationActivityLogs", "AccreditationCriteria",
                    "AccreditationCycles", "AccreditationEvidences", "AccreditationMetrics", "CollegeCampuses",
                    "CourseExitSurveys", "CourseOutcomeDefinitions", "CoursePrograms", "CurriculumSchemes",
                    "Departments", "EvaluationRubrics", "EvaluationRubricCriteria", "ExceptionAuditLogs",
                    "HodAppointmentHistories", "IndividualStudentScores", "MilestoneReviewHistories",
                    "ProblemBankStatements", "ProjectClosureRecords", "ProjectMilestones",
                    "ProjectReportSubmissions", "ProjectTeams", "SemesterTerms", "SprintTasks",
                    "StudentAcademicEnrollments", "SubjectOfferings", "SubmissionReviewHistories",
                    "TeamArtifacts", "TeamInvitations", "TeamMembers", "TeamVivaDefenseSchedules",
                    "VivaEvaluations", "VivaPanels", "VivaPanelEvaluators", "WeeklyLogbooks"
                };

                foreach (var table in standardTenantTables)
                {
                    migrationBuilder.Sql($@"
                        ALTER TABLE ""{table}"" ENABLE ROW LEVEL SECURITY;
                        ALTER TABLE ""{table}"" FORCE ROW LEVEL SECURITY;
                        DROP POLICY IF EXISTS tenant_isolation_policy ON ""{table}"";
                        CREATE POLICY tenant_isolation_policy ON ""{table}""
                        FOR ALL
                        USING (
                            current_setting('app.is_super_admin', true) = 'true'
                            OR ""CollegeId""::text = current_setting('app.current_tenant', true)
                        )
                        WITH CHECK (
                            current_setting('app.is_super_admin', true) = 'true'
                            OR ""CollegeId""::text = current_setting('app.current_tenant', true)
                        );
                    ");
                }
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RefreshTokenRecords");

            migrationBuilder.DropIndex(
                name: "IX_UserSessions_TokenFamilyId",
                table: "UserSessions");

            migrationBuilder.DropIndex(
                name: "IX_UserSessions_UserId",
                table: "UserSessions");

            migrationBuilder.DropColumn(
                name: "CollegeId",
                table: "UserSessions");

            migrationBuilder.DropColumn(
                name: "ExpiresAtUtc",
                table: "UserSessions");

            migrationBuilder.DropColumn(
                name: "RevocationReason",
                table: "UserSessions");

            migrationBuilder.DropColumn(
                name: "TokenFamilyId",
                table: "UserSessions");

            migrationBuilder.DropColumn(
                name: "AccessFailedCount",
                table: "UserAccounts");

            migrationBuilder.DropColumn(
                name: "ActivationTokenExpiresAtUtc",
                table: "UserAccounts");

            migrationBuilder.DropColumn(
                name: "ActivationTokenHashed",
                table: "UserAccounts");

            migrationBuilder.DropColumn(
                name: "EmailChangeOtpAttempts",
                table: "UserAccounts");

            migrationBuilder.DropColumn(
                name: "EmailChangeOtpExpiresAtUtc",
                table: "UserAccounts");

            migrationBuilder.DropColumn(
                name: "EmailChangeOtpHashed",
                table: "UserAccounts");

            migrationBuilder.DropColumn(
                name: "LockoutEndUtc",
                table: "UserAccounts");

            migrationBuilder.DropColumn(
                name: "MfaRecoveryCodesJson",
                table: "UserAccounts");

            migrationBuilder.DropColumn(
                name: "PendingEmail",
                table: "UserAccounts");

            migrationBuilder.DropColumn(
                name: "SecurityStamp",
                table: "UserAccounts");
        }
    }
}
