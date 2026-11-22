using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRgpvMasterAndAcademicHierarchy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Departments_CollegeId_Code",
                table: "Departments");

            migrationBuilder.AddColumn<Guid>(
                name: "CourseProgramId",
                table: "Departments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AcademicSessionId",
                table: "AcademicTracks",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "AllowCrossBranchTeams",
                table: "AcademicTracks",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "CourseProgramId",
                table: "AcademicTracks",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CurriculumSchemeId",
                table: "AcademicTracks",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnrolmentMode",
                table: "AcademicTracks",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ParticipationMode",
                table: "AcademicTracks",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "SemesterTermId",
                table: "AcademicTracks",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SubjectOfferingId",
                table: "AcademicTracks",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AcademicSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Label = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ExamCutoffDateUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AllowInterdisciplinaryTeams = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AcademicSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AcademicSessions_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MasterUniversities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Name = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    State = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterUniversities", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SemesterTerms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicSessionId = table.Column<Guid>(type: "uuid", nullable: true),
                    SemesterNumber = table.Column<int>(type: "integer", nullable: false),
                    SemesterName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Parity = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SemesterTerms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SemesterTerms_AcademicSessions_AcademicSessionId",
                        column: x => x.AcademicSessionId,
                        principalTable: "AcademicSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SemesterTerms_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SemesterTerms_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterCurriculumSchemes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UniversityId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    EffectiveFromYear = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterCurriculumSchemes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterCurriculumSchemes_MasterUniversities_UniversityId",
                        column: x => x.UniversityId,
                        principalTable: "MasterUniversities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterPrograms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UniversityId = table.Column<Guid>(type: "uuid", nullable: false),
                    Level = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    DurationYears = table.Column<int>(type: "integer", nullable: false),
                    TotalSemesters = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterPrograms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterPrograms_MasterUniversities_UniversityId",
                        column: x => x.UniversityId,
                        principalTable: "MasterUniversities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CoursePrograms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    MasterProgramId = table.Column<Guid>(type: "uuid", nullable: true),
                    Level = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    TotalSemesters = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoursePrograms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CoursePrograms_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CoursePrograms_MasterPrograms_MasterProgramId",
                        column: x => x.MasterProgramId,
                        principalTable: "MasterPrograms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "MasterBranches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MasterProgramId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
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
                    table.PrimaryKey("PK_MasterBranches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterBranches_MasterPrograms_MasterProgramId",
                        column: x => x.MasterProgramId,
                        principalTable: "MasterPrograms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CurriculumSchemes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    CourseProgramId = table.Column<Guid>(type: "uuid", nullable: false),
                    SchemeCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SchemeVersion = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    EffectiveAdmissionYear = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CurriculumSchemes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CurriculumSchemes_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CurriculumSchemes_CoursePrograms_CourseProgramId",
                        column: x => x.CourseProgramId,
                        principalTable: "CoursePrograms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StudentAcademicEnrollments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CourseProgramId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrentSemesterTermId = table.Column<Guid>(type: "uuid", nullable: false),
                    AdmissionBatch = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AcademicStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudentAcademicEnrollments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudentAcademicEnrollments_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentAcademicEnrollments_CoursePrograms_CourseProgramId",
                        column: x => x.CourseProgramId,
                        principalTable: "CoursePrograms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentAcademicEnrollments_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentAcademicEnrollments_SemesterTerms_CurrentSemesterTer~",
                        column: x => x.CurrentSemesterTermId,
                        principalTable: "SemesterTerms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentAcademicEnrollments_UserAccounts_StudentUserId",
                        column: x => x.StudentUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MasterSubjectTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MasterBranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    SchemeId = table.Column<Guid>(type: "uuid", nullable: true),
                    SemesterNumber = table.Column<int>(type: "integer", nullable: false),
                    SubjectCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SubjectName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SubjectType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DefaultParticipationMode = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    DefaultMinTeamSize = table.Column<int>(type: "integer", nullable: false),
                    DefaultMaxTeamSize = table.Column<int>(type: "integer", nullable: false),
                    MaxInternalMarks = table.Column<int>(type: "integer", nullable: false),
                    MaxExternalMarks = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterSubjectTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MasterSubjectTemplates_MasterBranches_MasterBranchId",
                        column: x => x.MasterBranchId,
                        principalTable: "MasterBranches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MasterSubjectTemplates_MasterCurriculumSchemes_SchemeId",
                        column: x => x.SchemeId,
                        principalTable: "MasterCurriculumSchemes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "SubjectOfferings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    SemesterTermId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurriculumSchemeId = table.Column<Guid>(type: "uuid", nullable: true),
                    SubjectCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SubjectName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SubjectType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Credits = table.Column<int>(type: "integer", nullable: false),
                    InternalMaxMarks = table.Column<int>(type: "integer", nullable: false),
                    ExternalMaxMarks = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubjectOfferings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SubjectOfferings_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SubjectOfferings_CurriculumSchemes_CurriculumSchemeId",
                        column: x => x.CurriculumSchemeId,
                        principalTable: "CurriculumSchemes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SubjectOfferings_SemesterTerms_SemesterTermId",
                        column: x => x.SemesterTermId,
                        principalTable: "SemesterTerms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Departments_CollegeId_CourseProgramId_Code",
                table: "Departments",
                columns: new[] { "CollegeId", "CourseProgramId", "Code" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_Departments_CourseProgramId",
                table: "Departments",
                column: "CourseProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_AcademicTracks_AcademicSessionId",
                table: "AcademicTracks",
                column: "AcademicSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_AcademicTracks_CourseProgramId",
                table: "AcademicTracks",
                column: "CourseProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_AcademicTracks_CurriculumSchemeId",
                table: "AcademicTracks",
                column: "CurriculumSchemeId");

            migrationBuilder.CreateIndex(
                name: "IX_AcademicTracks_SemesterTermId",
                table: "AcademicTracks",
                column: "SemesterTermId");

            migrationBuilder.CreateIndex(
                name: "IX_AcademicTracks_SubjectOfferingId",
                table: "AcademicTracks",
                column: "SubjectOfferingId");

            migrationBuilder.CreateIndex(
                name: "IX_AcademicSessions_CollegeId_Label",
                table: "AcademicSessions",
                columns: new[] { "CollegeId", "Label" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_CoursePrograms_CollegeId_Code",
                table: "CoursePrograms",
                columns: new[] { "CollegeId", "Code" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_CoursePrograms_MasterProgramId",
                table: "CoursePrograms",
                column: "MasterProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_CurriculumSchemes_CollegeId_CourseProgramId_SchemeCode",
                table: "CurriculumSchemes",
                columns: new[] { "CollegeId", "CourseProgramId", "SchemeCode" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_CurriculumSchemes_CourseProgramId",
                table: "CurriculumSchemes",
                column: "CourseProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterBranches_MasterProgramId_Code",
                table: "MasterBranches",
                columns: new[] { "MasterProgramId", "Code" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_MasterCurriculumSchemes_UniversityId_Code",
                table: "MasterCurriculumSchemes",
                columns: new[] { "UniversityId", "Code" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_MasterPrograms_UniversityId_Code",
                table: "MasterPrograms",
                columns: new[] { "UniversityId", "Code" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSubjectTemplates_MasterBranchId_SemesterNumber_Subjec~",
                table: "MasterSubjectTemplates",
                columns: new[] { "MasterBranchId", "SemesterNumber", "SubjectCode" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_MasterSubjectTemplates_SchemeId",
                table: "MasterSubjectTemplates",
                column: "SchemeId");

            migrationBuilder.CreateIndex(
                name: "IX_MasterUniversities_Code",
                table: "MasterUniversities",
                column: "Code",
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_SemesterTerms_AcademicSessionId",
                table: "SemesterTerms",
                column: "AcademicSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_SemesterTerms_CollegeId_DepartmentId_AcademicSessionId_Seme~",
                table: "SemesterTerms",
                columns: new[] { "CollegeId", "DepartmentId", "AcademicSessionId", "SemesterNumber" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_SemesterTerms_DepartmentId",
                table: "SemesterTerms",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentAcademicEnrollments_CollegeId_StudentUserId_CurrentS~",
                table: "StudentAcademicEnrollments",
                columns: new[] { "CollegeId", "StudentUserId", "CurrentSemesterTermId" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_StudentAcademicEnrollments_CourseProgramId",
                table: "StudentAcademicEnrollments",
                column: "CourseProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentAcademicEnrollments_CurrentSemesterTermId",
                table: "StudentAcademicEnrollments",
                column: "CurrentSemesterTermId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentAcademicEnrollments_DepartmentId",
                table: "StudentAcademicEnrollments",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentAcademicEnrollments_StudentUserId",
                table: "StudentAcademicEnrollments",
                column: "StudentUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SubjectOfferings_CollegeId_SemesterTermId_SubjectCode",
                table: "SubjectOfferings",
                columns: new[] { "CollegeId", "SemesterTermId", "SubjectCode" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_SubjectOfferings_CurriculumSchemeId",
                table: "SubjectOfferings",
                column: "CurriculumSchemeId");

            migrationBuilder.CreateIndex(
                name: "IX_SubjectOfferings_SemesterTermId",
                table: "SubjectOfferings",
                column: "SemesterTermId");

            migrationBuilder.AddForeignKey(
                name: "FK_AcademicTracks_AcademicSessions_AcademicSessionId",
                table: "AcademicTracks",
                column: "AcademicSessionId",
                principalTable: "AcademicSessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_AcademicTracks_CoursePrograms_CourseProgramId",
                table: "AcademicTracks",
                column: "CourseProgramId",
                principalTable: "CoursePrograms",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_AcademicTracks_CurriculumSchemes_CurriculumSchemeId",
                table: "AcademicTracks",
                column: "CurriculumSchemeId",
                principalTable: "CurriculumSchemes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_AcademicTracks_SemesterTerms_SemesterTermId",
                table: "AcademicTracks",
                column: "SemesterTermId",
                principalTable: "SemesterTerms",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_AcademicTracks_SubjectOfferings_SubjectOfferingId",
                table: "AcademicTracks",
                column: "SubjectOfferingId",
                principalTable: "SubjectOfferings",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Departments_CoursePrograms_CourseProgramId",
                table: "Departments",
                column: "CourseProgramId",
                principalTable: "CoursePrograms",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Apply PostgreSQL Engine-Level Row-Level Security (RLS) to new ITenantEntity tables
            if (migrationBuilder.ActiveProvider == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                var tenantTables = new[]
                {
                    "AcademicSessions",
                    "CoursePrograms",
                    "CurriculumSchemes",
                    "SemesterTerms",
                    "SubjectOfferings",
                    "StudentAcademicEnrollments"
                };

                foreach (var table in tenantTables)
                {
                    migrationBuilder.Sql($@"
                        ALTER TABLE ""{table}"" ENABLE ROW LEVEL SECURITY;
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_policies WHERE tablename = '{table}' AND policyname = 'tenant_isolation_policy'
                            ) THEN
                                CREATE POLICY tenant_isolation_policy ON ""{table}""
                                FOR ALL
                                USING (
                                    current_setting('app.is_super_admin', true) = 'true'
                                    OR ""CollegeId""::text = current_setting('app.current_tenant', true)
                                );
                            END IF;
                        END $$;
                    ");
                }
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AcademicTracks_AcademicSessions_AcademicSessionId",
                table: "AcademicTracks");

            migrationBuilder.DropForeignKey(
                name: "FK_AcademicTracks_CoursePrograms_CourseProgramId",
                table: "AcademicTracks");

            migrationBuilder.DropForeignKey(
                name: "FK_AcademicTracks_CurriculumSchemes_CurriculumSchemeId",
                table: "AcademicTracks");

            migrationBuilder.DropForeignKey(
                name: "FK_AcademicTracks_SemesterTerms_SemesterTermId",
                table: "AcademicTracks");

            migrationBuilder.DropForeignKey(
                name: "FK_AcademicTracks_SubjectOfferings_SubjectOfferingId",
                table: "AcademicTracks");

            migrationBuilder.DropForeignKey(
                name: "FK_Departments_CoursePrograms_CourseProgramId",
                table: "Departments");

            migrationBuilder.DropTable(
                name: "MasterSubjectTemplates");

            migrationBuilder.DropTable(
                name: "StudentAcademicEnrollments");

            migrationBuilder.DropTable(
                name: "SubjectOfferings");

            migrationBuilder.DropTable(
                name: "MasterBranches");

            migrationBuilder.DropTable(
                name: "MasterCurriculumSchemes");

            migrationBuilder.DropTable(
                name: "CurriculumSchemes");

            migrationBuilder.DropTable(
                name: "SemesterTerms");

            migrationBuilder.DropTable(
                name: "CoursePrograms");

            migrationBuilder.DropTable(
                name: "AcademicSessions");

            migrationBuilder.DropTable(
                name: "MasterPrograms");

            migrationBuilder.DropTable(
                name: "MasterUniversities");

            migrationBuilder.DropIndex(
                name: "IX_Departments_CollegeId_CourseProgramId_Code",
                table: "Departments");

            migrationBuilder.DropIndex(
                name: "IX_Departments_CourseProgramId",
                table: "Departments");

            migrationBuilder.DropIndex(
                name: "IX_AcademicTracks_AcademicSessionId",
                table: "AcademicTracks");

            migrationBuilder.DropIndex(
                name: "IX_AcademicTracks_CourseProgramId",
                table: "AcademicTracks");

            migrationBuilder.DropIndex(
                name: "IX_AcademicTracks_CurriculumSchemeId",
                table: "AcademicTracks");

            migrationBuilder.DropIndex(
                name: "IX_AcademicTracks_SemesterTermId",
                table: "AcademicTracks");

            migrationBuilder.DropIndex(
                name: "IX_AcademicTracks_SubjectOfferingId",
                table: "AcademicTracks");

            migrationBuilder.DropColumn(
                name: "CourseProgramId",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "AcademicSessionId",
                table: "AcademicTracks");

            migrationBuilder.DropColumn(
                name: "AllowCrossBranchTeams",
                table: "AcademicTracks");

            migrationBuilder.DropColumn(
                name: "CourseProgramId",
                table: "AcademicTracks");

            migrationBuilder.DropColumn(
                name: "CurriculumSchemeId",
                table: "AcademicTracks");

            migrationBuilder.DropColumn(
                name: "EnrolmentMode",
                table: "AcademicTracks");

            migrationBuilder.DropColumn(
                name: "ParticipationMode",
                table: "AcademicTracks");

            migrationBuilder.DropColumn(
                name: "SemesterTermId",
                table: "AcademicTracks");

            migrationBuilder.DropColumn(
                name: "SubjectOfferingId",
                table: "AcademicTracks");

            migrationBuilder.CreateIndex(
                name: "IX_Departments_CollegeId_Code",
                table: "Departments",
                columns: new[] { "CollegeId", "Code" },
                unique: true,
                filter: "\"IsDeleted\" = false");
        }
    }
}
