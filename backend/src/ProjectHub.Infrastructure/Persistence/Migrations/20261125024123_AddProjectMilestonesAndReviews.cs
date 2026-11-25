using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectMilestonesAndReviews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProjectMilestones",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectTeamId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    TargetDateUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    RequiredTaskCompletionPercentage = table.Column<int>(type: "integer", nullable: false),
                    SubmittedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SubmittedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    SubmissionEvidenceUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
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
                    table.PrimaryKey("PK_ProjectMilestones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectMilestones_ProjectTeams_ProjectTeamId",
                        column: x => x.ProjectTeamId,
                        principalTable: "ProjectTeams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectMilestones_UserAccounts_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ProjectMilestones_UserAccounts_SubmittedByUserId",
                        column: x => x.SubmittedByUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "MilestoneReviewHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectMilestoneId = table.Column<Guid>(type: "uuid", nullable: false),
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
                    table.PrimaryKey("PK_MilestoneReviewHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MilestoneReviewHistories_ProjectMilestones_ProjectMilestone~",
                        column: x => x.ProjectMilestoneId,
                        principalTable: "ProjectMilestones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MilestoneReviewHistories_UserAccounts_ReviewerUserId",
                        column: x => x.ReviewerUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MilestoneReviewHistories_CollegeId_ProjectMilestoneId",
                table: "MilestoneReviewHistories",
                columns: new[] { "CollegeId", "ProjectMilestoneId" });

            migrationBuilder.CreateIndex(
                name: "IX_MilestoneReviewHistories_ProjectMilestoneId",
                table: "MilestoneReviewHistories",
                column: "ProjectMilestoneId");

            migrationBuilder.CreateIndex(
                name: "IX_MilestoneReviewHistories_ReviewerUserId",
                table: "MilestoneReviewHistories",
                column: "ReviewerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMilestones_CollegeId_ProjectTeamId_Status",
                table: "ProjectMilestones",
                columns: new[] { "CollegeId", "ProjectTeamId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMilestones_ProjectTeamId",
                table: "ProjectMilestones",
                column: "ProjectTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMilestones_ReviewedByUserId",
                table: "ProjectMilestones",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMilestones_SubmittedByUserId",
                table: "ProjectMilestones",
                column: "SubmittedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MilestoneReviewHistories");

            migrationBuilder.DropTable(
                name: "ProjectMilestones");
        }
    }
}
