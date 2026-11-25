using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectClosureAndAcademicRecords : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProjectClosureRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicTrackId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectTeamId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClosedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClosedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ClosureCertificateHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ClosureRemarks = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    IsArchived = table.Column<bool>(type: "boolean", nullable: false),
                    ArchivedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsReopened = table.Column<bool>(type: "boolean", nullable: false),
                    ReopenedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReopenedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReopeningReason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectClosureRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectClosureRecords_AcademicTracks_AcademicTrackId",
                        column: x => x.AcademicTrackId,
                        principalTable: "AcademicTracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectClosureRecords_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectClosureRecords_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectClosureRecords_ProjectTeams_ProjectTeamId",
                        column: x => x.ProjectTeamId,
                        principalTable: "ProjectTeams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectClosureRecords_UserAccounts_ClosedByUserId",
                        column: x => x.ClosedByUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProjectClosureRecords_UserAccounts_ReopenedByUserId",
                        column: x => x.ReopenedByUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StudentAcademicRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicTrackId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectTeamId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectClosureRecordId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectTitle = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    ProjectAbstract = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    TeamCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AcademicYear = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TrackName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DepartmentName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    CollegeName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    StudentName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    EnrollmentNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    RoleDescription = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    IsTeamLead = table.Column<bool>(type: "boolean", nullable: false),
                    GuideUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    GuideName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    FinalOutcome = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    SharedTotalScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    SharedMaxScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    IndividualContributionScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    FinalComputedMark = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    RubricCriteriaBreakdownJson = table.Column<string>(type: "text", nullable: false),
                    VerifiedRepositoryUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    VerifiedDemoUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    FinalReportFileName = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    FinalReportChecksum = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    VerificationHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    IsVerified = table.Column<bool>(type: "boolean", nullable: false),
                    VerifiedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AllowPublicPortfolio = table.Column<bool>(type: "boolean", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudentAcademicRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudentAcademicRecords_AcademicTracks_AcademicTrackId",
                        column: x => x.AcademicTrackId,
                        principalTable: "AcademicTracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StudentAcademicRecords_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StudentAcademicRecords_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StudentAcademicRecords_ProjectClosureRecords_ProjectClosure~",
                        column: x => x.ProjectClosureRecordId,
                        principalTable: "ProjectClosureRecords",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StudentAcademicRecords_ProjectTeams_ProjectTeamId",
                        column: x => x.ProjectTeamId,
                        principalTable: "ProjectTeams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StudentAcademicRecords_UserAccounts_GuideUserId",
                        column: x => x.GuideUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentAcademicRecords_UserAccounts_StudentUserId",
                        column: x => x.StudentUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectClosureRecords_AcademicTrackId",
                table: "ProjectClosureRecords",
                column: "AcademicTrackId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectClosureRecords_ClosedByUserId",
                table: "ProjectClosureRecords",
                column: "ClosedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectClosureRecords_CollegeId_DepartmentId_AcademicTrackId",
                table: "ProjectClosureRecords",
                columns: new[] { "CollegeId", "DepartmentId", "AcademicTrackId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectClosureRecords_CollegeId_ProjectTeamId",
                table: "ProjectClosureRecords",
                columns: new[] { "CollegeId", "ProjectTeamId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectClosureRecords_DepartmentId",
                table: "ProjectClosureRecords",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectClosureRecords_ProjectTeamId",
                table: "ProjectClosureRecords",
                column: "ProjectTeamId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectClosureRecords_ReopenedByUserId",
                table: "ProjectClosureRecords",
                column: "ReopenedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentAcademicRecords_AcademicTrackId",
                table: "StudentAcademicRecords",
                column: "AcademicTrackId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentAcademicRecords_CollegeId_EnrollmentNumber",
                table: "StudentAcademicRecords",
                columns: new[] { "CollegeId", "EnrollmentNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_StudentAcademicRecords_CollegeId_ProjectTeamId_StudentUserId",
                table: "StudentAcademicRecords",
                columns: new[] { "CollegeId", "ProjectTeamId", "StudentUserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StudentAcademicRecords_CollegeId_StudentUserId",
                table: "StudentAcademicRecords",
                columns: new[] { "CollegeId", "StudentUserId" });

            migrationBuilder.CreateIndex(
                name: "IX_StudentAcademicRecords_DepartmentId",
                table: "StudentAcademicRecords",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentAcademicRecords_GuideUserId",
                table: "StudentAcademicRecords",
                column: "GuideUserId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentAcademicRecords_ProjectClosureRecordId",
                table: "StudentAcademicRecords",
                column: "ProjectClosureRecordId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentAcademicRecords_ProjectTeamId",
                table: "StudentAcademicRecords",
                column: "ProjectTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentAcademicRecords_StudentUserId",
                table: "StudentAcademicRecords",
                column: "StudentUserId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentAcademicRecords_VerificationHash",
                table: "StudentAcademicRecords",
                column: "VerificationHash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StudentAcademicRecords");

            migrationBuilder.DropTable(
                name: "ProjectClosureRecords");
        }
    }
}
