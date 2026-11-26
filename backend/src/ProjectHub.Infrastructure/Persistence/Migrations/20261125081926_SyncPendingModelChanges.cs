using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SyncPendingModelChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                migrationBuilder.Sql(@"
                    ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""ConsolePreferencesJson"" text NULL;
                    ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""NotificationPreferencesJson"" text NULL;
                    ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""IsEmailVerified"" boolean NOT NULL DEFAULT true;
                    ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""IsPhoneVerified"" boolean NOT NULL DEFAULT false;
                    ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""MfaEnabled"" boolean NOT NULL DEFAULT false;
                    ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""MfaSecret"" text NULL;
                    ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""PasswordChangedAtUtc"" timestamp with time zone NULL;
                    ALTER TABLE ""UserAccounts"" ADD COLUMN IF NOT EXISTS ""PhoneNumber"" text NULL;
                ");
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
