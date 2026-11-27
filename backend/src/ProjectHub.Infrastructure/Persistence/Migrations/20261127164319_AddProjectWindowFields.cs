using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectWindowFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CoordinatorUserId",
                table: "AcademicTracks",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RegistrationOpensUtc",
                table: "AcademicTracks",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AcademicTracks_CoordinatorUserId",
                table: "AcademicTracks",
                column: "CoordinatorUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_AcademicTracks_UserAccounts_CoordinatorUserId",
                table: "AcademicTracks",
                column: "CoordinatorUserId",
                principalTable: "UserAccounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AcademicTracks_UserAccounts_CoordinatorUserId",
                table: "AcademicTracks");

            migrationBuilder.DropIndex(
                name: "IX_AcademicTracks_CoordinatorUserId",
                table: "AcademicTracks");

            migrationBuilder.DropColumn(
                name: "CoordinatorUserId",
                table: "AcademicTracks");

            migrationBuilder.DropColumn(
                name: "RegistrationOpensUtc",
                table: "AcademicTracks");
        }
    }
}
