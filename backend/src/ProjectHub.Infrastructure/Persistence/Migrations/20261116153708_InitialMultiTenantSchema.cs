using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialMultiTenantSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CollegeTenants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    TenantCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SsoDomain = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    LicenseTier = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    MaxStudentSeats = table.Column<int>(type: "integer", nullable: false),
                    StorageQuotaGb = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    EnforceStrictSso = table.Column<bool>(type: "boolean", nullable: false),
                    CrestUrl = table.Column<string>(type: "text", nullable: true),
                    PrincipalSealUrl = table.Column<string>(type: "text", nullable: true),
                    SubscriptionExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CollegeTenants", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterNbaOutcomes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterNbaOutcomes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterSdgCatalogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SdgNumber = table.Column<int>(type: "integer", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterSdgCatalogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlatformAuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ActorEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TargetTenantId = table.Column<Guid>(type: "uuid", nullable: true),
                    TargetEntity = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    MetadataJson = table.Column<string>(type: "jsonb", nullable: false),
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
                    table.PrimaryKey("PK_PlatformAuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AcademicTracks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AcademicYear = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ProposalDeadlineUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FinalSubmissionDeadlineUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    GuideWeightPct = table.Column<int>(type: "integer", nullable: false),
                    MidTermWeightPct = table.Column<int>(type: "integer", nullable: false),
                    FinalVivaWeightPct = table.Column<int>(type: "integer", nullable: false),
                    SharedProjectRubricPct = table.Column<int>(type: "integer", nullable: false),
                    IndividualStudentRubricPct = table.Column<int>(type: "integer", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AcademicTracks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AcademicTracks_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CourseExitSurveys",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectTeamId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PoRatingsJson = table.Column<string>(type: "jsonb", nullable: false),
                    SubmittedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourseExitSurveys", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CourseOutcomeDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicTrackId = table.Column<Guid>(type: "uuid", nullable: false),
                    CoCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    MappedPoCodesCsv = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TargetThresholdPct = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
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
                });

            migrationBuilder.CreateTable(
                name: "Departments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    HodUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IntakeQuota = table.Column<int>(type: "integer", nullable: false),
                    IsSarAttested = table.Column<bool>(type: "boolean", nullable: false),
                    SarAttestedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SarAttestedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Departments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Departments_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserAccounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    FullName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    EnrollmentOrEmployeeCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsProjectCoordinator = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    MaxMentorTeams = table.Column<int>(type: "integer", nullable: false),
                    GitHubHandle = table.Column<string>(type: "text", nullable: true),
                    JiraKey = table.Column<string>(type: "text", nullable: true),
                    SkillsCsv = table.Column<string>(type: "text", nullable: true),
                    DigitalSignatureUrl = table.Column<string>(type: "text", nullable: true),
                    LastLoginAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserAccounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserAccounts_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserAccounts_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "VivaPanels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicTrackId = table.Column<Guid>(type: "uuid", nullable: false),
                    PanelName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    ScheduledAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RoomOrLink = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VivaPanels", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VivaPanels_AcademicTracks_AcademicTrackId",
                        column: x => x.AcademicTrackId,
                        principalTable: "AcademicTracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VivaPanels_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProjectTeams",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicTrackId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectLineageId = table.Column<Guid>(type: "uuid", nullable: false),
                    ParentProjectTeamId = table.Column<Guid>(type: "uuid", nullable: true),
                    TeamCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Abstract = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    DomainTag = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SdgCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    GuideUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    RepoUrl = table.Column<string>(type: "text", nullable: true),
                    JiraBoardKey = table.Column<string>(type: "text", nullable: true),
                    MissedLogStreak = table.Column<int>(type: "integer", nullable: false),
                    IsRosterLocked = table.Column<bool>(type: "boolean", nullable: false),
                    SimilarityScorePct = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    SimilarProjectCode = table.Column<string>(type: "text", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectTeams", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectTeams_AcademicTracks_AcademicTrackId",
                        column: x => x.AcademicTrackId,
                        principalTable: "AcademicTracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProjectTeams_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProjectTeams_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProjectTeams_ProjectTeams_ParentProjectTeamId",
                        column: x => x.ParentProjectTeamId,
                        principalTable: "ProjectTeams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ProjectTeams_UserAccounts_GuideUserId",
                        column: x => x.GuideUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "VivaPanelEvaluators",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    VivaPanelId = table.Column<Guid>(type: "uuid", nullable: false),
                    EvaluatorUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VivaPanelEvaluators", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VivaPanelEvaluators_UserAccounts_EvaluatorUserId",
                        column: x => x.EvaluatorUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VivaPanelEvaluators_VivaPanels_VivaPanelId",
                        column: x => x.VivaPanelId,
                        principalTable: "VivaPanels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ExceptionAuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectTeamId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActionType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TargetUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    PreviousValueJson = table.Column<string>(type: "jsonb", nullable: false),
                    NewValueJson = table.Column<string>(type: "jsonb", nullable: false),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    RequestedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ApprovedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExceptionAuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExceptionAuditLogs_ProjectTeams_ProjectTeamId",
                        column: x => x.ProjectTeamId,
                        principalTable: "ProjectTeams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExceptionAuditLogs_UserAccounts_ApprovedByUserId",
                        column: x => x.ApprovedByUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ExceptionAuditLogs_UserAccounts_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ExceptionAuditLogs_UserAccounts_TargetUserId",
                        column: x => x.TargetUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "ProblemBankStatements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicTrackId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProposedByFacultyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Abstract = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    SdgCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PrerequisitesCsv = table.Column<string>(type: "text", nullable: true),
                    MaxTeamCapacity = table.Column<int>(type: "integer", nullable: false),
                    IsAllocated = table.Column<bool>(type: "boolean", nullable: false),
                    AllocatedTeamId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
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

            migrationBuilder.CreateTable(
                name: "SprintTasks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectTeamId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    CategoryTag = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AssignedToUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DueDateUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SprintTasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SprintTasks_ProjectTeams_ProjectTeamId",
                        column: x => x.ProjectTeamId,
                        principalTable: "ProjectTeams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SprintTasks_UserAccounts_AssignedToUserId",
                        column: x => x.AssignedToUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "TeamArtifacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectTeamId = table.Column<Guid>(type: "uuid", nullable: false),
                    SlotType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    FileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    StorageKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Sha256Checksum = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    UploadedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    VerifiedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewerNote = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamArtifacts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeamArtifacts_ProjectTeams_ProjectTeamId",
                        column: x => x.ProjectTeamId,
                        principalTable: "ProjectTeams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TeamArtifacts_UserAccounts_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TeamArtifacts_UserAccounts_VerifiedByUserId",
                        column: x => x.VerifiedByUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "TeamMembers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectTeamId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsTeamLead = table.Column<bool>(type: "boolean", nullable: false),
                    ModuleResponsibility = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    JoinedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RemovedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamMembers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeamMembers_ProjectTeams_ProjectTeamId",
                        column: x => x.ProjectTeamId,
                        principalTable: "ProjectTeams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TeamMembers_UserAccounts_UserId",
                        column: x => x.UserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VivaEvaluations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectTeamId = table.Column<Guid>(type: "uuid", nullable: false),
                    EvaluatorUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CheckpointType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SharedRubricScoresJson = table.Column<string>(type: "jsonb", nullable: false),
                    SharedTotalScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    GeneralRemarks = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    IsLocked = table.Column<bool>(type: "boolean", nullable: false),
                    LockedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VivaEvaluations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VivaEvaluations_ProjectTeams_ProjectTeamId",
                        column: x => x.ProjectTeamId,
                        principalTable: "ProjectTeams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VivaEvaluations_UserAccounts_EvaluatorUserId",
                        column: x => x.EvaluatorUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WeeklyLogbooks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectTeamId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    WeekNumber = table.Column<int>(type: "integer", nullable: false),
                    AccomplishmentsSummary = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    BlockersSummary = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    HoursLogged = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    GitCommitCount = table.Column<int>(type: "integer", nullable: false),
                    IsVerified = table.Column<bool>(type: "boolean", nullable: false),
                    VerifiedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    VerifiedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MentorRemarks = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeeklyLogbooks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WeeklyLogbooks_ProjectTeams_ProjectTeamId",
                        column: x => x.ProjectTeamId,
                        principalTable: "ProjectTeams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WeeklyLogbooks_UserAccounts_AuthorUserId",
                        column: x => x.AuthorUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WeeklyLogbooks_UserAccounts_VerifiedByUserId",
                        column: x => x.VerifiedByUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "IndividualStudentScores",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    VivaEvaluationId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ModuleOwnershipScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    VivaQaScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    LogDisciplineScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    IndividualTotalScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    FinalComputedStudentMark = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IndividualStudentScores", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IndividualStudentScores_UserAccounts_StudentUserId",
                        column: x => x.StudentUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IndividualStudentScores_VivaEvaluations_VivaEvaluationId",
                        column: x => x.VivaEvaluationId,
                        principalTable: "VivaEvaluations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AcademicTracks_CollegeId_AcademicYear_Name",
                table: "AcademicTracks",
                columns: new[] { "CollegeId", "AcademicYear", "Name" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_CollegeTenants_SsoDomain",
                table: "CollegeTenants",
                column: "SsoDomain",
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_CollegeTenants_TenantCode",
                table: "CollegeTenants",
                column: "TenantCode",
                unique: true,
                filter: "\"IsDeleted\" = false");

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
                name: "IX_Departments_CollegeId_Code",
                table: "Departments",
                columns: new[] { "CollegeId", "Code" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_Departments_HodUserId",
                table: "Departments",
                column: "HodUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ExceptionAuditLogs_ApprovedByUserId",
                table: "ExceptionAuditLogs",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ExceptionAuditLogs_CollegeId_DepartmentId_ProjectTeamId_Act~",
                table: "ExceptionAuditLogs",
                columns: new[] { "CollegeId", "DepartmentId", "ProjectTeamId", "ActionType" });

            migrationBuilder.CreateIndex(
                name: "IX_ExceptionAuditLogs_ProjectTeamId",
                table: "ExceptionAuditLogs",
                column: "ProjectTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_ExceptionAuditLogs_RequestedByUserId",
                table: "ExceptionAuditLogs",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ExceptionAuditLogs_TargetUserId",
                table: "ExceptionAuditLogs",
                column: "TargetUserId");

            migrationBuilder.CreateIndex(
                name: "IX_IndividualStudentScores_CollegeId_VivaEvaluationId_StudentU~",
                table: "IndividualStudentScores",
                columns: new[] { "CollegeId", "VivaEvaluationId", "StudentUserId" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_IndividualStudentScores_StudentUserId",
                table: "IndividualStudentScores",
                column: "StudentUserId");

            migrationBuilder.CreateIndex(
                name: "IX_IndividualStudentScores_VivaEvaluationId",
                table: "IndividualStudentScores",
                column: "VivaEvaluationId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterNbaOutcomes_Code",
                table: "MasterNbaOutcomes",
                column: "Code",
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSdgCatalogs_Code",
                table: "MasterSdgCatalogs",
                column: "Code",
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSdgCatalogs_SdgNumber",
                table: "MasterSdgCatalogs",
                column: "SdgNumber",
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_PlatformAuditLogs_OccurredAtUtc",
                table: "PlatformAuditLogs",
                column: "OccurredAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_PlatformAuditLogs_TargetTenantId",
                table: "PlatformAuditLogs",
                column: "TargetTenantId");

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

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTeams_AcademicTrackId",
                table: "ProjectTeams",
                column: "AcademicTrackId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTeams_CollegeId_AcademicTrackId_TeamCode",
                table: "ProjectTeams",
                columns: new[] { "CollegeId", "AcademicTrackId", "TeamCode" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTeams_CollegeId_DepartmentId_AcademicTrackId_Status",
                table: "ProjectTeams",
                columns: new[] { "CollegeId", "DepartmentId", "AcademicTrackId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTeams_CollegeId_ProjectLineageId",
                table: "ProjectTeams",
                columns: new[] { "CollegeId", "ProjectLineageId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTeams_DepartmentId",
                table: "ProjectTeams",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTeams_GuideUserId",
                table: "ProjectTeams",
                column: "GuideUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTeams_ParentProjectTeamId",
                table: "ProjectTeams",
                column: "ParentProjectTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_SprintTasks_AssignedToUserId",
                table: "SprintTasks",
                column: "AssignedToUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SprintTasks_CollegeId_ProjectTeamId_Status",
                table: "SprintTasks",
                columns: new[] { "CollegeId", "ProjectTeamId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_SprintTasks_ProjectTeamId",
                table: "SprintTasks",
                column: "ProjectTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamArtifacts_CollegeId_ProjectTeamId_SlotType",
                table: "TeamArtifacts",
                columns: new[] { "CollegeId", "ProjectTeamId", "SlotType" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_TeamArtifacts_ProjectTeamId",
                table: "TeamArtifacts",
                column: "ProjectTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamArtifacts_UploadedByUserId",
                table: "TeamArtifacts",
                column: "UploadedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamArtifacts_VerifiedByUserId",
                table: "TeamArtifacts",
                column: "VerifiedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamMembers_CollegeId_ProjectTeamId_UserId",
                table: "TeamMembers",
                columns: new[] { "CollegeId", "ProjectTeamId", "UserId" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_TeamMembers_ProjectTeamId",
                table: "TeamMembers",
                column: "ProjectTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamMembers_UserId",
                table: "TeamMembers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserAccounts_CollegeId_Email",
                table: "UserAccounts",
                columns: new[] { "CollegeId", "Email" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_UserAccounts_CollegeId_EnrollmentOrEmployeeCode",
                table: "UserAccounts",
                columns: new[] { "CollegeId", "EnrollmentOrEmployeeCode" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_UserAccounts_DepartmentId",
                table: "UserAccounts",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_VivaEvaluations_CollegeId_ProjectTeamId_CheckpointType",
                table: "VivaEvaluations",
                columns: new[] { "CollegeId", "ProjectTeamId", "CheckpointType" });

            migrationBuilder.CreateIndex(
                name: "IX_VivaEvaluations_EvaluatorUserId",
                table: "VivaEvaluations",
                column: "EvaluatorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_VivaEvaluations_ProjectTeamId",
                table: "VivaEvaluations",
                column: "ProjectTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_VivaPanelEvaluators_CollegeId_VivaPanelId_EvaluatorUserId",
                table: "VivaPanelEvaluators",
                columns: new[] { "CollegeId", "VivaPanelId", "EvaluatorUserId" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_VivaPanelEvaluators_EvaluatorUserId",
                table: "VivaPanelEvaluators",
                column: "EvaluatorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_VivaPanelEvaluators_VivaPanelId",
                table: "VivaPanelEvaluators",
                column: "VivaPanelId");

            migrationBuilder.CreateIndex(
                name: "IX_VivaPanels_AcademicTrackId",
                table: "VivaPanels",
                column: "AcademicTrackId");

            migrationBuilder.CreateIndex(
                name: "IX_VivaPanels_CollegeId_DepartmentId_AcademicTrackId",
                table: "VivaPanels",
                columns: new[] { "CollegeId", "DepartmentId", "AcademicTrackId" });

            migrationBuilder.CreateIndex(
                name: "IX_VivaPanels_DepartmentId",
                table: "VivaPanels",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyLogbooks_AuthorUserId",
                table: "WeeklyLogbooks",
                column: "AuthorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyLogbooks_CollegeId_ProjectTeamId_AuthorUserId_WeekNum~",
                table: "WeeklyLogbooks",
                columns: new[] { "CollegeId", "ProjectTeamId", "AuthorUserId", "WeekNumber" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyLogbooks_ProjectTeamId",
                table: "WeeklyLogbooks",
                column: "ProjectTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyLogbooks_VerifiedByUserId",
                table: "WeeklyLogbooks",
                column: "VerifiedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_CourseExitSurveys_ProjectTeams_ProjectTeamId",
                table: "CourseExitSurveys",
                column: "ProjectTeamId",
                principalTable: "ProjectTeams",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CourseExitSurveys_UserAccounts_StudentUserId",
                table: "CourseExitSurveys",
                column: "StudentUserId",
                principalTable: "UserAccounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_CourseOutcomeDefinitions_Departments_DepartmentId",
                table: "CourseOutcomeDefinitions",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Departments_UserAccounts_HodUserId",
                table: "Departments",
                column: "HodUserId",
                principalTable: "UserAccounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Departments_CollegeTenants_CollegeId",
                table: "Departments");

            migrationBuilder.DropForeignKey(
                name: "FK_UserAccounts_CollegeTenants_CollegeId",
                table: "UserAccounts");

            migrationBuilder.DropForeignKey(
                name: "FK_Departments_UserAccounts_HodUserId",
                table: "Departments");

            migrationBuilder.DropTable(
                name: "CourseExitSurveys");

            migrationBuilder.DropTable(
                name: "CourseOutcomeDefinitions");

            migrationBuilder.DropTable(
                name: "ExceptionAuditLogs");

            migrationBuilder.DropTable(
                name: "IndividualStudentScores");

            migrationBuilder.DropTable(
                name: "MasterNbaOutcomes");

            migrationBuilder.DropTable(
                name: "MasterSdgCatalogs");

            migrationBuilder.DropTable(
                name: "PlatformAuditLogs");

            migrationBuilder.DropTable(
                name: "ProblemBankStatements");

            migrationBuilder.DropTable(
                name: "SprintTasks");

            migrationBuilder.DropTable(
                name: "TeamArtifacts");

            migrationBuilder.DropTable(
                name: "TeamMembers");

            migrationBuilder.DropTable(
                name: "VivaPanelEvaluators");

            migrationBuilder.DropTable(
                name: "WeeklyLogbooks");

            migrationBuilder.DropTable(
                name: "VivaEvaluations");

            migrationBuilder.DropTable(
                name: "VivaPanels");

            migrationBuilder.DropTable(
                name: "ProjectTeams");

            migrationBuilder.DropTable(
                name: "AcademicTracks");

            migrationBuilder.DropTable(
                name: "CollegeTenants");

            migrationBuilder.DropTable(
                name: "UserAccounts");

            migrationBuilder.DropTable(
                name: "Departments");
        }
    }
}
