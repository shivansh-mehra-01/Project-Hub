using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAffiliatingUniversityToCollegeTenant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "ProjectTeamId",
                table: "ExceptionAuditLogs",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.Sql("ALTER TABLE \"CollegeTenants\" ADD COLUMN IF NOT EXISTS \"AffiliatingUniversity\" character varying(150) DEFAULT 'RGPV';");
            migrationBuilder.Sql("ALTER TABLE \"AcademicSessions\" ADD COLUMN IF NOT EXISTS \"AllowInterdisciplinaryTeams\" boolean NOT NULL DEFAULT FALSE;");
            migrationBuilder.Sql("ALTER TABLE \"AcademicSessions\" ADD COLUMN IF NOT EXISTS \"ExamCutoffDateUtc\" timestamp with time zone NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AffiliatingUniversity",
                table: "CollegeTenants");

            migrationBuilder.DropColumn(
                name: "AllowInterdisciplinaryTeams",
                table: "AcademicSessions");

            migrationBuilder.DropColumn(
                name: "ExamCutoffDateUtc",
                table: "AcademicSessions");

            migrationBuilder.AlterColumn<Guid>(
                name: "ProjectTeamId",
                table: "ExceptionAuditLogs",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
