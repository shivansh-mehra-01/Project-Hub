using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDepartmentScopeToAcademicTrack : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AcademicTracks_CollegeId_AcademicYear_Name",
                table: "AcademicTracks");

            migrationBuilder.AddColumn<bool>(
                name: "AllowInterdisciplinaryTeams",
                table: "AcademicTracks",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "DepartmentId",
                table: "AcademicTracks",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AcademicTracks_CollegeId_DepartmentId_AcademicYear_Name",
                table: "AcademicTracks",
                columns: new[] { "CollegeId", "DepartmentId", "AcademicYear", "Name" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_AcademicTracks_DepartmentId",
                table: "AcademicTracks",
                column: "DepartmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_AcademicTracks_Departments_DepartmentId",
                table: "AcademicTracks",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AcademicTracks_Departments_DepartmentId",
                table: "AcademicTracks");

            migrationBuilder.DropIndex(
                name: "IX_AcademicTracks_CollegeId_DepartmentId_AcademicYear_Name",
                table: "AcademicTracks");

            migrationBuilder.DropIndex(
                name: "IX_AcademicTracks_DepartmentId",
                table: "AcademicTracks");

            migrationBuilder.DropColumn(
                name: "AllowInterdisciplinaryTeams",
                table: "AcademicTracks");

            migrationBuilder.DropColumn(
                name: "DepartmentId",
                table: "AcademicTracks");

            migrationBuilder.CreateIndex(
                name: "IX_AcademicTracks_CollegeId_AcademicYear_Name",
                table: "AcademicTracks",
                columns: new[] { "CollegeId", "AcademicYear", "Name" },
                unique: true,
                filter: "\"IsDeleted\" = false");
        }
    }
}
