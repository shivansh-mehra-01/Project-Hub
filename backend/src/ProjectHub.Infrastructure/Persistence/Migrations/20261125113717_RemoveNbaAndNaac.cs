using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveNbaAndNaac : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AccreditationActivityLogs");

            migrationBuilder.DropTable(
                name: "AccreditationEvidences");

            migrationBuilder.DropTable(
                name: "CourseExitSurveys");

            migrationBuilder.DropTable(
                name: "CourseOutcomeDefinitions");

            migrationBuilder.DropTable(
                name: "MasterNbaOutcomes");

            migrationBuilder.DropTable(
                name: "AccreditationMetrics");

            migrationBuilder.DropTable(
                name: "AccreditationCriteria");

            migrationBuilder.DropTable(
                name: "AccreditationCycles");

            migrationBuilder.DropColumn(
                name: "NbaPoMapping",
                table: "EvaluationRubricCriteria");

            migrationBuilder.DropColumn(
                name: "IsSarAttested",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "SarAttestedAtUtc",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "SarAttestedByUserId",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "NbaModuleEnabled",
                table: "CollegeTenants");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NbaPoMapping",
                table: "EvaluationRubricCriteria",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsSarAttested",
                table: "Departments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "SarAttestedAtUtc",
                table: "Departments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SarAttestedByUserId",
                table: "Departments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "NbaModuleEnabled",
                table: "CollegeTenants",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateTable(
                name: "AccreditationCycles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    CourseProgramId = table.Column<Guid>(type: "uuid", nullable: true),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    AcademicYear = table.Column<string>(type: "text", nullable: false),
                    AttainedScore = table.Column<decimal>(type: "numeric", nullable: false),
                    AttainmentPercentage = table.Column<decimal>(type: "numeric", nullable: false),
                    AttestationRemarks = table.Column<string>(type: "text", nullable: true),
                    AttestedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AttestedByName = table.Column<string>(type: "text", nullable: true),
                    AttestedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CycleName = table.Column<string>(type: "text", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FrameworkCode = table.Column<string>(type: "text", nullable: false),
                    IsAttested = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    Level = table.Column<string>(type: "text", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    TargetScore = table.Column<decimal>(type: "numeric", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    VersionLabel = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccreditationCycles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AccreditationCycles_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AccreditationCycles_CoursePrograms_CourseProgramId",
                        column: x => x.CourseProgramId,
                        principalTable: "CoursePrograms",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AccreditationCycles_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CourseExitSurveys",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectTeamId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    PoRatingsJson = table.Column<string>(type: "jsonb", nullable: false),
                    SubmittedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourseExitSurveys", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CourseExitSurveys_ProjectTeams_ProjectTeamId",
                        column: x => x.ProjectTeamId,
                        principalTable: "ProjectTeams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CourseExitSurveys_UserAccounts_StudentUserId",
                        column: x => x.StudentUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CourseOutcomeDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicTrackId = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    CoCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    MappedPoCodesCsv = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TargetThresholdPct = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourseOutcomeDefinitions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CourseOutcomeDefinitions_AcademicTracks_AcademicTrackId",
                        column: x => x.AcademicTrackId,
                        principalTable: "AcademicTracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CourseOutcomeDefinitions_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CourseOutcomeDefinitions_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MasterNbaOutcomes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    Title = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterNbaOutcomes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AccreditationActivityLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    CycleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Action = table.Column<string>(type: "text", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Details = table.Column<string>(type: "text", nullable: false),
                    EntityTitle = table.Column<string>(type: "text", nullable: false),
                    EntityType = table.Column<string>(type: "text", nullable: false),
                    IpAddress = table.Column<string>(type: "text", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    OccurredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PerformedByName = table.Column<string>(type: "text", nullable: false),
                    PerformedByRole = table.Column<string>(type: "text", nullable: false),
                    PerformedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccreditationActivityLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AccreditationActivityLogs_AccreditationCycles_CycleId",
                        column: x => x.CycleId,
                        principalTable: "AccreditationCycles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AccreditationActivityLogs_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AccreditationCriteria",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    CycleId = table.Column<Guid>(type: "uuid", nullable: false),
                    AttainedMarks = table.Column<decimal>(type: "numeric", nullable: false),
                    AttainmentPercentage = table.Column<decimal>(type: "numeric", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    MaxMarks = table.Column<decimal>(type: "numeric", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccreditationCriteria", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AccreditationCriteria_AccreditationCycles_CycleId",
                        column: x => x.CycleId,
                        principalTable: "AccreditationCycles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AccreditationCriteria_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AccreditationMetrics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedHodUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    CriterionId = table.Column<Guid>(type: "uuid", nullable: false),
                    AttainedMarks = table.Column<decimal>(type: "numeric", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    MaxMarks = table.Column<decimal>(type: "numeric", nullable: false),
                    MetricCode = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccreditationMetrics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AccreditationMetrics_AccreditationCriteria_CriterionId",
                        column: x => x.CriterionId,
                        principalTable: "AccreditationCriteria",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AccreditationMetrics_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AccreditationMetrics_UserAccounts_AssignedHodUserId",
                        column: x => x.AssignedHodUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "AccreditationEvidences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    CycleId = table.Column<Guid>(type: "uuid", nullable: false),
                    MetricId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CriterionCode = table.Column<string>(type: "text", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    FileName = table.Column<string>(type: "text", nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    FileType = table.Column<string>(type: "text", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    MetricCode = table.Column<string>(type: "text", nullable: false),
                    ReviewNote = table.Column<string>(type: "text", nullable: true),
                    ReviewedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReviewedByName = table.Column<string>(type: "text", nullable: true),
                    ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    StorageKey = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UploadedByName = table.Column<string>(type: "text", nullable: false),
                    UploadedByRole = table.Column<string>(type: "text", nullable: false),
                    UploadedByUserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccreditationEvidences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AccreditationEvidences_AccreditationCycles_CycleId",
                        column: x => x.CycleId,
                        principalTable: "AccreditationCycles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AccreditationEvidences_AccreditationMetrics_MetricId",
                        column: x => x.MetricId,
                        principalTable: "AccreditationMetrics",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AccreditationEvidences_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AccreditationActivityLogs_CollegeId",
                table: "AccreditationActivityLogs",
                column: "CollegeId");

            migrationBuilder.CreateIndex(
                name: "IX_AccreditationActivityLogs_CycleId",
                table: "AccreditationActivityLogs",
                column: "CycleId");

            migrationBuilder.CreateIndex(
                name: "IX_AccreditationCriteria_CollegeId",
                table: "AccreditationCriteria",
                column: "CollegeId");

            migrationBuilder.CreateIndex(
                name: "IX_AccreditationCriteria_CycleId",
                table: "AccreditationCriteria",
                column: "CycleId");

            migrationBuilder.CreateIndex(
                name: "IX_AccreditationCycles_CollegeId",
                table: "AccreditationCycles",
                column: "CollegeId");

            migrationBuilder.CreateIndex(
                name: "IX_AccreditationCycles_CourseProgramId",
                table: "AccreditationCycles",
                column: "CourseProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_AccreditationCycles_DepartmentId",
                table: "AccreditationCycles",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_AccreditationEvidences_CollegeId",
                table: "AccreditationEvidences",
                column: "CollegeId");

            migrationBuilder.CreateIndex(
                name: "IX_AccreditationEvidences_CycleId",
                table: "AccreditationEvidences",
                column: "CycleId");

            migrationBuilder.CreateIndex(
                name: "IX_AccreditationEvidences_MetricId",
                table: "AccreditationEvidences",
                column: "MetricId");

            migrationBuilder.CreateIndex(
                name: "IX_AccreditationMetrics_AssignedHodUserId",
                table: "AccreditationMetrics",
                column: "AssignedHodUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AccreditationMetrics_CollegeId",
                table: "AccreditationMetrics",
                column: "CollegeId");

            migrationBuilder.CreateIndex(
                name: "IX_AccreditationMetrics_CriterionId",
                table: "AccreditationMetrics",
                column: "CriterionId");

            migrationBuilder.CreateIndex(
                name: "IX_CourseExitSurveys_CollegeId_ProjectTeamId_StudentUserId",
                table: "CourseExitSurveys",
                columns: new[] { "CollegeId", "ProjectTeamId", "StudentUserId" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_CourseExitSurveys_ProjectTeamId",
                table: "CourseExitSurveys",
                column: "ProjectTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_CourseExitSurveys_StudentUserId",
                table: "CourseExitSurveys",
                column: "StudentUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CourseOutcomeDefinitions_AcademicTrackId",
                table: "CourseOutcomeDefinitions",
                column: "AcademicTrackId");

            migrationBuilder.CreateIndex(
                name: "IX_CourseOutcomeDefinitions_CollegeId_DepartmentId_AcademicTra~",
                table: "CourseOutcomeDefinitions",
                columns: new[] { "CollegeId", "DepartmentId", "AcademicTrackId", "CoCode" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_CourseOutcomeDefinitions_DepartmentId",
                table: "CourseOutcomeDefinitions",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterNbaOutcomes_Code",
                table: "MasterNbaOutcomes",
                column: "Code",
                unique: true,
                filter: "\"IsDeleted\" = false");
        }
    }
}
