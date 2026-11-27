using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAcademicTrackLifecycleStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "AcademicTracks",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "AcademicTracks",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Open");

            migrationBuilder.CreateIndex(
                name: "IX_AcademicTracks_CollegeId_DepartmentId_Status",
                table: "AcademicTracks",
                columns: new[] { "CollegeId", "DepartmentId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AcademicTracks_CollegeId_DepartmentId_Status",
                table: "AcademicTracks");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "AcademicTracks");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "AcademicTracks");
        }
    }
}
