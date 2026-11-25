using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectFinalReportSubmissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProjectReportSubmissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectTeamId = table.Column<Guid>(type: "uuid", nullable: false),
                    VersionNumber = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ProjectTitle = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    Abstract = table.Column<string>(type: "character varying(3000)", maxLength: 3000, nullable: false),
                    ProblemStatement = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Methodology = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ImplementationSummary = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ResultsAndConclusion = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    References = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    RepositoryUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DemoUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ReportArtifactId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReportStorageKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ReportFileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    ReportFileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    ReportSha256Checksum = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    SubmittedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SubmittedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewFeedback = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectReportSubmissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectReportSubmissions_ProjectTeams_ProjectTeamId",
                        column: x => x.ProjectTeamId,
                        principalTable: "ProjectTeams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectReportSubmissions_TeamArtifacts_ReportArtifactId",
                        column: x => x.ReportArtifactId,
                        principalTable: "TeamArtifacts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ProjectReportSubmissions_UserAccounts_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ProjectReportSubmissions_UserAccounts_SubmittedByUserId",
                        column: x => x.SubmittedByUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "SubmissionReviewHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectReportSubmissionId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubmissionVersion = table.Column<int>(type: "integer", nullable: false),
                    ReviewerUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ResultStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Feedback = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ReviewedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubmissionReviewHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SubmissionReviewHistories_ProjectReportSubmissions_ProjectR~",
                        column: x => x.ProjectReportSubmissionId,
                        principalTable: "ProjectReportSubmissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SubmissionReviewHistories_UserAccounts_ReviewerUserId",
                        column: x => x.ReviewerUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectReportSubmissions_CollegeId_ProjectTeamId_Status",
                table: "ProjectReportSubmissions",
                columns: new[] { "CollegeId", "ProjectTeamId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectReportSubmissions_ProjectTeamId",
                table: "ProjectReportSubmissions",
                column: "ProjectTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectReportSubmissions_ReportArtifactId",
                table: "ProjectReportSubmissions",
                column: "ReportArtifactId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectReportSubmissions_ReviewedByUserId",
                table: "ProjectReportSubmissions",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectReportSubmissions_SubmittedByUserId",
                table: "ProjectReportSubmissions",
                column: "SubmittedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SubmissionReviewHistories_CollegeId_ProjectReportSubmission~",
                table: "SubmissionReviewHistories",
                columns: new[] { "CollegeId", "ProjectReportSubmissionId" });

            migrationBuilder.CreateIndex(
                name: "IX_SubmissionReviewHistories_ProjectReportSubmissionId",
                table: "SubmissionReviewHistories",
                column: "ProjectReportSubmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_SubmissionReviewHistories_ReviewerUserId",
                table: "SubmissionReviewHistories",
                column: "ReviewerUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SubmissionReviewHistories");

            migrationBuilder.DropTable(
                name: "ProjectReportSubmissions");
        }
    }
}
