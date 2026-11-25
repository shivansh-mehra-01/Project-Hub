using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGuidePreferenceLifecycleToProjectTeam : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "GuideAllocatedAtUtc",
                table: "ProjectTeams",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "GuideAllocatedByUserId",
                table: "ProjectTeams",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GuideAllocationRemarks",
                table: "ProjectTeams",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GuidePreferenceRemarks",
                table: "ProjectTeams",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GuidePreferenceStatus",
                table: "ProjectTeams",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "GuidePreferenceSubmittedAtUtc",
                table: "ProjectTeams",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PreferredGuideUserId",
                table: "ProjectTeams",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTeams_GuideAllocatedByUserId",
                table: "ProjectTeams",
                column: "GuideAllocatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTeams_PreferredGuideUserId",
                table: "ProjectTeams",
                column: "PreferredGuideUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectTeams_UserAccounts_GuideAllocatedByUserId",
                table: "ProjectTeams",
                column: "GuideAllocatedByUserId",
                principalTable: "UserAccounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectTeams_UserAccounts_PreferredGuideUserId",
                table: "ProjectTeams",
                column: "PreferredGuideUserId",
                principalTable: "UserAccounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProjectTeams_UserAccounts_GuideAllocatedByUserId",
                table: "ProjectTeams");

            migrationBuilder.DropForeignKey(
                name: "FK_ProjectTeams_UserAccounts_PreferredGuideUserId",
                table: "ProjectTeams");

            migrationBuilder.DropIndex(
                name: "IX_ProjectTeams_GuideAllocatedByUserId",
                table: "ProjectTeams");

            migrationBuilder.DropIndex(
                name: "IX_ProjectTeams_PreferredGuideUserId",
                table: "ProjectTeams");

            migrationBuilder.DropColumn(
                name: "GuideAllocatedAtUtc",
                table: "ProjectTeams");

            migrationBuilder.DropColumn(
                name: "GuideAllocatedByUserId",
                table: "ProjectTeams");

            migrationBuilder.DropColumn(
                name: "GuideAllocationRemarks",
                table: "ProjectTeams");

            migrationBuilder.DropColumn(
                name: "GuidePreferenceRemarks",
                table: "ProjectTeams");

            migrationBuilder.DropColumn(
                name: "GuidePreferenceStatus",
                table: "ProjectTeams");

            migrationBuilder.DropColumn(
                name: "GuidePreferenceSubmittedAtUtc",
                table: "ProjectTeams");

            migrationBuilder.DropColumn(
                name: "PreferredGuideUserId",
                table: "ProjectTeams");
        }
    }
}
