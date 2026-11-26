using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUserAccountProfileFieldsAndUserSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" ADD COLUMN IF NOT EXISTS \"DigitalSignatureUrl\" text;");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" ADD COLUMN IF NOT EXISTS \"LastLoginAtUtc\" timestamp with time zone;");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" ADD COLUMN IF NOT EXISTS \"PhoneNumber\" text;");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" ADD COLUMN IF NOT EXISTS \"IsPhoneVerified\" boolean NOT NULL DEFAULT FALSE;");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" ADD COLUMN IF NOT EXISTS \"IsEmailVerified\" boolean NOT NULL DEFAULT TRUE;");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" ADD COLUMN IF NOT EXISTS \"PasswordChangedAtUtc\" timestamp with time zone;");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" ADD COLUMN IF NOT EXISTS \"MfaEnabled\" boolean NOT NULL DEFAULT TRUE;");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" ADD COLUMN IF NOT EXISTS \"MfaSecret\" text;");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" ADD COLUMN IF NOT EXISTS \"NotificationPreferencesJson\" text;");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" ADD COLUMN IF NOT EXISTS \"ConsolePreferencesJson\" text;");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""UserSessions"" (
    ""Id"" character varying(64) NOT NULL,
    ""UserId"" uuid NOT NULL,
    ""AccountName"" character varying(150) NOT NULL,
    ""AccountEmail"" character varying(256) NOT NULL,
    ""Role"" character varying(50) NOT NULL,
    ""Device"" character varying(150),
    ""Browser"" character varying(100),
    ""Location"" character varying(150),
    ""IpAddress"" character varying(50),
    ""LoginTimeUtc"" timestamp with time zone NOT NULL,
    ""LastActiveTimeUtc"" timestamp with time zone NOT NULL,
    ""IsRevoked"" boolean NOT NULL,
    ""RevokedAtUtc"" timestamp with time zone,
    ""TokenHash"" text,
    CONSTRAINT ""PK_UserSessions"" PRIMARY KEY (""Id"")
);
CREATE INDEX IF NOT EXISTS ""IX_UserSessions_UserId"" ON ""UserSessions"" (""UserId"");
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS \"UserSessions\";");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" DROP COLUMN IF EXISTS \"DigitalSignatureUrl\";");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" DROP COLUMN IF EXISTS \"LastLoginAtUtc\";");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" DROP COLUMN IF EXISTS \"PhoneNumber\";");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" DROP COLUMN IF EXISTS \"IsPhoneVerified\";");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" DROP COLUMN IF EXISTS \"IsEmailVerified\";");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" DROP COLUMN IF EXISTS \"PasswordChangedAtUtc\";");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" DROP COLUMN IF EXISTS \"MfaEnabled\";");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" DROP COLUMN IF EXISTS \"MfaSecret\";");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" DROP COLUMN IF EXISTS \"NotificationPreferencesJson\";");
            migrationBuilder.Sql("ALTER TABLE \"UserAccounts\" DROP COLUMN IF EXISTS \"ConsolePreferencesJson\";");
        }
    }
}
