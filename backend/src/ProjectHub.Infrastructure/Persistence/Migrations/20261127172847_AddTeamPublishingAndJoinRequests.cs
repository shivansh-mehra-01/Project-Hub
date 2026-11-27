using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTeamPublishingAndJoinRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPublished",
                table: "ProjectTeams",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAtUtc",
                table: "ProjectTeams",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RequiredSkillsCsv",
                table: "ProjectTeams",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TeamName",
                table: "ProjectTeams",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TeamJoinRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectTeamId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    DesiredRole = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Message = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    RespondedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    RespondedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ResponseNotes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamJoinRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeamJoinRequests_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TeamJoinRequests_ProjectTeams_ProjectTeamId",
                        column: x => x.ProjectTeamId,
                        principalTable: "ProjectTeams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TeamJoinRequests_UserAccounts_RespondedByUserId",
                        column: x => x.RespondedByUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_TeamJoinRequests_UserAccounts_StudentUserId",
                        column: x => x.StudentUserId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TeamJoinRequests_CollegeId_StudentUserId_Status",
                table: "TeamJoinRequests",
                columns: new[] { "CollegeId", "StudentUserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_TeamJoinRequests_ProjectTeamId_StudentUserId",
                table: "TeamJoinRequests",
                columns: new[] { "ProjectTeamId", "StudentUserId" },
                unique: true,
                filter: "\"Status\" = 'Pending' AND \"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_TeamJoinRequests_RespondedByUserId",
                table: "TeamJoinRequests",
                column: "RespondedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamJoinRequests_StudentUserId",
                table: "TeamJoinRequests",
                column: "StudentUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TeamJoinRequests");

            migrationBuilder.DropColumn(
                name: "IsPublished",
                table: "ProjectTeams");

            migrationBuilder.DropColumn(
                name: "PublishedAtUtc",
                table: "ProjectTeams");

            migrationBuilder.DropColumn(
                name: "RequiredSkillsCsv",
                table: "ProjectTeams");

            migrationBuilder.DropColumn(
                name: "TeamName",
                table: "ProjectTeams");
        }
    }
}
