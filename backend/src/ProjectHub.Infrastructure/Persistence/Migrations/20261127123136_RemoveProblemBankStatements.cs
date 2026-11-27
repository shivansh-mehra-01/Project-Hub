using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveProblemBankStatements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProblemBankStatements");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProblemBankStatements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicTrackId = table.Column<Guid>(type: "uuid", nullable: false),
                    AllocatedTeamId = table.Column<Guid>(type: "uuid", nullable: true),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProposedByFacultyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Abstract = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsAllocated = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    MaxTeamCapacity = table.Column<int>(type: "integer", nullable: false),
                    PrerequisitesCsv = table.Column<string>(type: "text", nullable: true),
                    SdgCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProblemBankStatements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProblemBankStatements_AcademicTracks_AcademicTrackId",
                        column: x => x.AcademicTrackId,
                        principalTable: "AcademicTracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProblemBankStatements_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProblemBankStatements_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProblemBankStatements_ProjectTeams_AllocatedTeamId",
                        column: x => x.AllocatedTeamId,
                        principalTable: "ProjectTeams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ProblemBankStatements_UserAccounts_ProposedByFacultyId",
                        column: x => x.ProposedByFacultyId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProblemBankStatements_AcademicTrackId",
                table: "ProblemBankStatements",
                column: "AcademicTrackId");

            migrationBuilder.CreateIndex(
                name: "IX_ProblemBankStatements_AllocatedTeamId",
                table: "ProblemBankStatements",
                column: "AllocatedTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_ProblemBankStatements_CollegeId_DepartmentId_AcademicTrackId",
                table: "ProblemBankStatements",
                columns: new[] { "CollegeId", "DepartmentId", "AcademicTrackId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProblemBankStatements_DepartmentId",
                table: "ProblemBankStatements",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ProblemBankStatements_ProposedByFacultyId",
                table: "ProblemBankStatements",
                column: "ProposedByFacultyId");
        }
    }
}
