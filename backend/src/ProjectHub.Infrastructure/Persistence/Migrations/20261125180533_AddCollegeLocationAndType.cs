using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCollegeLocationAndType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "CollegeTenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CollegeType",
                table: "CollegeTenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Country",
                table: "CollegeTenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "State",
                table: "CollegeTenants",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "City",
                table: "CollegeTenants");

            migrationBuilder.DropColumn(
                name: "CollegeType",
                table: "CollegeTenants");

            migrationBuilder.DropColumn(
                name: "Country",
                table: "CollegeTenants");

            migrationBuilder.DropColumn(
                name: "State",
                table: "CollegeTenants");
        }
    }
}
