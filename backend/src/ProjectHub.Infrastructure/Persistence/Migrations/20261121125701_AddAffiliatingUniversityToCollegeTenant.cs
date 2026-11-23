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

            migrationBuilder.AddColumn<string>(
                name: "AffiliatingUniversity",
                table: "CollegeTenants",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true,
                defaultValue: "RGPV");

            migrationBuilder.AddColumn<bool>(
                name: "AllowInterdisciplinaryTeams",
                table: "AcademicSessions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExamCutoffDateUtc",
                table: "AcademicSessions",
                type: "timestamp with time zone",
                nullable: true);
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
