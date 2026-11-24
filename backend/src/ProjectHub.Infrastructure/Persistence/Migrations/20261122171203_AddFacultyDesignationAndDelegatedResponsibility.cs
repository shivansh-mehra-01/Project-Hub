using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFacultyDesignationAndDelegatedResponsibility : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" ADD COLUMN IF NOT EXISTS \"DelegatedResponsibility\" integer NOT NULL DEFAULT 0;");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" ADD COLUMN IF NOT EXISTS \"Designation\" integer;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DelegatedResponsibility",
                table: "UserAccounts");

            migrationBuilder.DropColumn(
                name: "Designation",
                table: "UserAccounts");
        }
    }
}
