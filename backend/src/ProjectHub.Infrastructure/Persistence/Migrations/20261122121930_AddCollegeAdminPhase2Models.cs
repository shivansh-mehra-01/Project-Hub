using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCollegeAdminPhase2Models : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CampusAddress",
                table: "CollegeTenants",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true,
                defaultValue: "Airport Road, Gandhi Nagar, Bhopal, MP 462036");

            migrationBuilder.AddColumn<string>(
                name: "CampusesCsv",
                table: "CollegeTenants",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true,
                defaultValue: "Main Campus (Bhopal), Extension Center");

            migrationBuilder.AddColumn<bool>(
                name: "GithubIntegrationEnabled",
                table: "CollegeTenants",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "JiraIntegrationEnabled",
                table: "CollegeTenants",
                type: "boolean",
                nullable: false,
                defaultValue: true);

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
                    FrameworkCode = table.Column<string>(type: "text", nullable: false),
                    VersionLabel = table.Column<string>(type: "text", nullable: false),
                    CycleName = table.Column<string>(type: "text", nullable: false),
                    AcademicYear = table.Column<string>(type: "text", nullable: false),
                    Level = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TargetScore = table.Column<decimal>(type: "numeric", nullable: false),
                    AttainedScore = table.Column<decimal>(type: "numeric", nullable: false),
                    AttainmentPercentage = table.Column<decimal>(type: "numeric", nullable: false),
                    IsAttested = table.Column<bool>(type: "boolean", nullable: false),
                    AttestedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AttestedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    AttestedByName = table.Column<string>(type: "text", nullable: true),
                    AttestationRemarks = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
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
                name: "CollegeCampuses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    CampusCode = table.Column<string>(type: "text", nullable: true),
                    Address = table.Column<string>(type: "text", nullable: true),
                    City = table.Column<string>(type: "text", nullable: true),
                    State = table.Column<string>(type: "text", nullable: true),
                    Pincode = table.Column<string>(type: "text", nullable: true),
                    IsMainCampus = table.Column<bool>(type: "boolean", nullable: false),
                    ContactEmail = table.Column<string>(type: "text", nullable: true),
                    ContactPhone = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CollegeCampuses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CollegeCampuses_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HodAppointmentHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    HodUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AppointedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    AppointedByName = table.Column<string>(type: "text", nullable: false),
                    AppointedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RelievedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsCurrent = table.Column<bool>(type: "boolean", nullable: false),
                    Remarks = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HodAppointmentHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HodAppointmentHistories_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HodAppointmentHistories_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HodAppointmentHistories_UserAccounts_HodUserId",
                        column: x => x.HodUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AccreditationActivityLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    CycleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Action = table.Column<string>(type: "text", nullable: false),
                    EntityType = table.Column<string>(type: "text", nullable: false),
                    EntityTitle = table.Column<string>(type: "text", nullable: false),
                    PerformedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    PerformedByName = table.Column<string>(type: "text", nullable: false),
                    PerformedByRole = table.Column<string>(type: "text", nullable: false),
                    Details = table.Column<string>(type: "text", nullable: false),
                    IpAddress = table.Column<string>(type: "text", nullable: true),
                    OccurredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
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
                    Code = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    MaxMarks = table.Column<decimal>(type: "numeric", nullable: false),
                    AttainedMarks = table.Column<decimal>(type: "numeric", nullable: false),
                    AttainmentPercentage = table.Column<decimal>(type: "numeric", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
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
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    CriterionId = table.Column<Guid>(type: "uuid", nullable: false),
                    MetricCode = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    MaxMarks = table.Column<decimal>(type: "numeric", nullable: false),
                    AttainedMarks = table.Column<decimal>(type: "numeric", nullable: false),
                    AssignedHodUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
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
                    CriterionCode = table.Column<string>(type: "text", nullable: false),
                    MetricCode = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    StorageKey = table.Column<string>(type: "text", nullable: false),
                    FileName = table.Column<string>(type: "text", nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    FileType = table.Column<string>(type: "text", nullable: false),
                    UploadedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    UploadedByName = table.Column<string>(type: "text", nullable: false),
                    UploadedByRole = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ReviewNote = table.Column<string>(type: "text", nullable: true),
                    ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewedByName = table.Column<string>(type: "text", nullable: true),
                    ReviewedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
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
                name: "IX_CollegeCampuses_CollegeId",
                table: "CollegeCampuses",
                column: "CollegeId");

            migrationBuilder.CreateIndex(
                name: "IX_HodAppointmentHistories_CollegeId",
                table: "HodAppointmentHistories",
                column: "CollegeId");

            migrationBuilder.CreateIndex(
                name: "IX_HodAppointmentHistories_DepartmentId",
                table: "HodAppointmentHistories",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_HodAppointmentHistories_HodUserId",
                table: "HodAppointmentHistories",
                column: "HodUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AccreditationActivityLogs");

            migrationBuilder.DropTable(
                name: "AccreditationEvidences");

            migrationBuilder.DropTable(
                name: "CollegeCampuses");

            migrationBuilder.DropTable(
                name: "HodAppointmentHistories");

            migrationBuilder.DropTable(
                name: "AccreditationMetrics");

            migrationBuilder.DropTable(
                name: "AccreditationCriteria");

            migrationBuilder.DropTable(
                name: "AccreditationCycles");

            migrationBuilder.DropColumn(
                name: "CampusAddress",
                table: "CollegeTenants");

            migrationBuilder.DropColumn(
                name: "CampusesCsv",
                table: "CollegeTenants");

            migrationBuilder.DropColumn(
                name: "GithubIntegrationEnabled",
                table: "CollegeTenants");

            migrationBuilder.DropColumn(
                name: "JiraIntegrationEnabled",
                table: "CollegeTenants");

            migrationBuilder.DropColumn(
                name: "NbaModuleEnabled",
                table: "CollegeTenants");
        }
    }
}
