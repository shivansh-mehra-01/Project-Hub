using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTeamInvitations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TeamInvitations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollegeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectTeamId = table.Column<Guid>(type: "uuid", nullable: false),
                    InviterStudentId = table.Column<Guid>(type: "uuid", nullable: false),
                    InviteeStudentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Message = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    InvitedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RespondedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ResponseNotes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamInvitations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeamInvitations_CollegeTenants_CollegeId",
                        column: x => x.CollegeId,
                        principalTable: "CollegeTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TeamInvitations_ProjectTeams_ProjectTeamId",
                        column: x => x.ProjectTeamId,
                        principalTable: "ProjectTeams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TeamInvitations_UserAccounts_InviteeStudentId",
                        column: x => x.InviteeStudentId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TeamInvitations_UserAccounts_InviterStudentId",
                        column: x => x.InviterStudentId,
                        principalTable: "UserAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TeamInvitations_CollegeId_InviteeStudentId_Status",
                table: "TeamInvitations",
                columns: new[] { "CollegeId", "InviteeStudentId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_TeamInvitations_CollegeId_ProjectTeamId_InviteeStudentId",
                table: "TeamInvitations",
                columns: new[] { "CollegeId", "ProjectTeamId", "InviteeStudentId" },
                unique: true,
                filter: "\"Status\" = 'Pending' AND \"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_TeamInvitations_CollegeId_ProjectTeamId_Status",
                table: "TeamInvitations",
                columns: new[] { "CollegeId", "ProjectTeamId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_TeamInvitations_InviteeStudentId",
                table: "TeamInvitations",
                column: "InviteeStudentId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamInvitations_InviterStudentId",
                table: "TeamInvitations",
                column: "InviterStudentId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamInvitations_ProjectTeamId",
                table: "TeamInvitations",
                column: "ProjectTeamId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TeamInvitations");
        }
    }
}
