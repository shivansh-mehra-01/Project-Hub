using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddVivaEvaluationFilteredUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_VivaEvaluations_CollegeId_ProjectTeamId_CheckpointType",
                table: "VivaEvaluations");

            migrationBuilder.CreateIndex(
                name: "IX_VivaEvaluations_CollegeId_ProjectTeamId_CheckpointType",
                table: "VivaEvaluations",
                columns: new[] { "CollegeId", "ProjectTeamId", "CheckpointType" },
                unique: true,
                filter: "\"IsDeleted\" = false");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_VivaEvaluations_CollegeId_ProjectTeamId_CheckpointType",
                table: "VivaEvaluations");

            migrationBuilder.CreateIndex(
                name: "IX_VivaEvaluations_CollegeId_ProjectTeamId_CheckpointType",
                table: "VivaEvaluations",
                columns: new[] { "CollegeId", "ProjectTeamId", "CheckpointType" });
        }
    }
}
