using Microsoft.EntityFrameworkCore;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;

namespace ProjectHub.Infrastructure.Security;

/// <summary>
/// One-time secure SuperAdmin bootstrapper.
/// Reads credentials from environment variables (COLABEX_BOOTSTRAP_EMAIL, COLABEX_BOOTSTRAP_PASSWORD)
/// and permanently refuses execution once any SuperAdmin account exists.
/// </summary>
public static class SuperAdminBootstrapper
{
    public const string PlatformTenantCode = "PLATFORM";

    public static async Task<(bool Success, string Message)> BootstrapAsync(
        ProjectHubDbContext db,
        ITenantContext tenantContext,
        string? email,
        string? password,
        string? fullName = null,
        CancellationToken cancellationToken = default)
    {
        var existingSuperAdmin = await db.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Role == UserRole.SuperAdmin && !u.IsDeleted, cancellationToken);

        if (existingSuperAdmin)
        {
            return (false, "Bootstrap refused: A SuperAdmin account already exists. One-time bootstrap is permanently closed.");
        }

        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            return (false, "Bootstrap failed: Valid COLABEX_BOOTSTRAP_EMAIL is required.");
        }

        var passwordError = PasswordPolicyValidator.Validate(password);
        if (passwordError != null)
        {
            return (false, $"Bootstrap failed: {passwordError}");
        }

        var cleanEmail = email.Trim().ToLowerInvariant();
        var cleanName = string.IsNullOrWhiteSpace(fullName) ? "Platform SuperAdmin" : fullName.Trim();

        var originalSuperAdmin = tenantContext.IsSuperAdmin;
        tenantContext.IsSuperAdmin = true;

        try
        {
            var platformTenant = await db.CollegeTenants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.TenantCode == PlatformTenantCode && !t.IsDeleted, cancellationToken);

            if (platformTenant == null)
            {
                platformTenant = new CollegeTenant
                {
                    Id = Guid.NewGuid(),
                    Name = "Colabex Platform Administration",
                    TenantCode = PlatformTenantCode,
                    SsoDomain = "platform.internal",
                    LicenseTier = LicenseTier.Enterprise,
                    MaxStudentSeats = 0,
                    StorageQuotaGb = 0,
                    IsActive = true
                };
                await db.CollegeTenants.AddAsync(platformTenant, cancellationToken);
                await db.SaveChangesAsync(cancellationToken);
            }

            var superAdmin = new UserAccount
            {
                Id = Guid.NewGuid(),
                CollegeId = platformTenant.Id,
                DepartmentId = null,
                FullName = cleanName,
                Email = cleanEmail,
                EnrollmentOrEmployeeCode = "PLATFORM-ROOT-001",
                Role = UserRole.SuperAdmin,
                PasswordHash = PasswordHelper.HashPassword(password!),
                PasswordChangedAtUtc = DateTime.UtcNow,
                IsActivated = true,
                IsActive = true,
                IsEmailVerified = true,
                MfaEnabled = false,
                SecurityStamp = Guid.NewGuid().ToString("N")
            };

            await db.Users.AddAsync(superAdmin, cancellationToken);
            await db.SaveChangesAsync(cancellationToken);

            return (true, $"Initial SuperAdmin account created for '{cleanEmail}'. Sign in and enroll TOTP MFA immediately.");
        }
        finally
        {
            tenantContext.IsSuperAdmin = originalSuperAdmin;
        }
    }
}
