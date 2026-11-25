using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEvaluationVivaDefenseWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPublished",
                table: "VivaEvaluations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ModeratedAtUtc",
                table: "VivaEvaluations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ModeratedByUserId",
                table: "VivaEvaluations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ModerationRemarks",
                table: "VivaEvaluations",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Outcome",
                table: "VivaEvaluations",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAtUtc",
                table: "VivaEvaluations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PublishedByUserId",
                table: "VivaEvaluations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RubricSnapshotJson",
                table: "VivaEvaluations",
                type: "jsonb",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "EvaluationRubrics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicTrackId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CheckpointType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TotalMaxMarks = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EvaluationRubrics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EvaluationRubrics_AcademicTracks_AcademicTrackId",
                        column: x => x.AcademicTrackId,
                        principalTable: "AcademicTracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EvaluationRubrics_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TeamVivaDefenseSchedules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicTrackId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectTeamId = table.Column<Guid>(type: "uuid", nullable: false),
                    VivaPanelId = table.Column<Guid>(type: "uuid", nullable: true),
                    ScheduledDateUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DurationMinutes = table.Column<int>(type: "integer", nullable: false),
                    VenueOrLink = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    CandidateInstructions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CancellationReason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ScheduledByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ScheduledAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RescheduledAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamVivaDefenseSchedules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeamVivaDefenseSchedules_ProjectTeams_ProjectTeamId",
                        column: x => x.ProjectTeamId,
                        principalTable: "ProjectTeams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TeamVivaDefenseSchedules_UserAccounts_ScheduledByUserId",
                        column: x => x.ScheduledByUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TeamVivaDefenseSchedules_VivaPanels_VivaPanelId",
                        column: x => x.VivaPanelId,
                        principalTable: "VivaPanels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "EvaluationRubricCriteria",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    EvaluationRubricId = table.Column<Guid>(type: "uuid", nullable: false),
                    CriterionCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    MaxMarks = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    WeightPercentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    NbaPoMapping = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    BloomTaxonomyLevel = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EvaluationRubricCriteria", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EvaluationRubricCriteria_EvaluationRubrics_EvaluationRubric~",
                        column: x => x.EvaluationRubricId,
                        principalTable: "EvaluationRubrics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VivaEvaluations_ModeratedByUserId",
                table: "VivaEvaluations",
                column: "ModeratedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_VivaEvaluations_PublishedByUserId",
                table: "VivaEvaluations",
                column: "PublishedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_EvaluationRubricCriteria_CollegeId_EvaluationRubricId",
                table: "EvaluationRubricCriteria",
                columns: new[] { "CollegeId", "EvaluationRubricId" });

            migrationBuilder.CreateIndex(
                name: "IX_EvaluationRubricCriteria_EvaluationRubricId",
                table: "EvaluationRubricCriteria",
                column: "EvaluationRubricId");

            migrationBuilder.CreateIndex(
                name: "IX_EvaluationRubrics_AcademicTrackId",
                table: "EvaluationRubrics",
                column: "AcademicTrackId");

            migrationBuilder.CreateIndex(
                name: "IX_EvaluationRubrics_CollegeId_DepartmentId_AcademicTrackId_Ch~",
                table: "EvaluationRubrics",
                columns: new[] { "CollegeId", "DepartmentId", "AcademicTrackId", "CheckpointType" });

            migrationBuilder.CreateIndex(
                name: "IX_EvaluationRubrics_DepartmentId",
                table: "EvaluationRubrics",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamVivaDefenseSchedules_CollegeId_DepartmentId_AcademicTra~",
                table: "TeamVivaDefenseSchedules",
                columns: new[] { "CollegeId", "DepartmentId", "AcademicTrackId" });

            migrationBuilder.CreateIndex(
                name: "IX_TeamVivaDefenseSchedules_CollegeId_ProjectTeamId",
                table: "TeamVivaDefenseSchedules",
                columns: new[] { "CollegeId", "ProjectTeamId" });

            migrationBuilder.CreateIndex(
                name: "IX_TeamVivaDefenseSchedules_ProjectTeamId",
                table: "TeamVivaDefenseSchedules",
                column: "ProjectTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamVivaDefenseSchedules_ScheduledByUserId",
                table: "TeamVivaDefenseSchedules",
                column: "ScheduledByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamVivaDefenseSchedules_VivaPanelId",
                table: "TeamVivaDefenseSchedules",
                column: "VivaPanelId");

            migrationBuilder.AddForeignKey(
                name: "FK_VivaEvaluations_UserAccounts_ModeratedByUserId",
                table: "VivaEvaluations",
                column: "ModeratedByUserId",
                principalTable: "UserAccounts",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_VivaEvaluations_UserAccounts_PublishedByUserId",
                table: "VivaEvaluations",
                column: "PublishedByUserId",
                principalTable: "UserAccounts",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_VivaEvaluations_UserAccounts_ModeratedByUserId",
                table: "VivaEvaluations");

            migrationBuilder.DropForeignKey(
                name: "FK_VivaEvaluations_UserAccounts_PublishedByUserId",
                table: "VivaEvaluations");

            migrationBuilder.DropTable(
                name: "EvaluationRubricCriteria");

            migrationBuilder.DropTable(
                name: "TeamVivaDefenseSchedules");

            migrationBuilder.DropTable(
                name: "EvaluationRubrics");

            migrationBuilder.DropIndex(
                name: "IX_VivaEvaluations_ModeratedByUserId",
                table: "VivaEvaluations");

            migrationBuilder.DropIndex(
                name: "IX_VivaEvaluations_PublishedByUserId",
                table: "VivaEvaluations");

            migrationBuilder.DropColumn(
                name: "IsPublished",
                table: "VivaEvaluations");

            migrationBuilder.DropColumn(
                name: "ModeratedAtUtc",
                table: "VivaEvaluations");

            migrationBuilder.DropColumn(
                name: "ModeratedByUserId",
                table: "VivaEvaluations");

            migrationBuilder.DropColumn(
                name: "ModerationRemarks",
                table: "VivaEvaluations");

            migrationBuilder.DropColumn(
                name: "Outcome",
                table: "VivaEvaluations");

            migrationBuilder.DropColumn(
                name: "PublishedAtUtc",
                table: "VivaEvaluations");

            migrationBuilder.DropColumn(
                name: "PublishedByUserId",
                table: "VivaEvaluations");

            migrationBuilder.DropColumn(
                name: "RubricSnapshotJson",
                table: "VivaEvaluations");
        }
    }
}
