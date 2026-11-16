using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Platform-scoped root tenant entity representing an engineering institution.
/// Managed exclusively by platform SuperAdmins.
/// </summary>
public class CollegeTenant : BaseEntity
{
    private string _tenantCode = string.Empty;
    private string _ssoDomain = string.Empty;

    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Unique institutional code in uppercase (e.g., SISTEC, BMSCE, RVCE).
    /// </summary>
    public string TenantCode
    {
        get => _tenantCode;
        set => _tenantCode = value?.Trim().ToUpperInvariant() ?? string.Empty;
    }

    /// <summary>
    /// Unique institutional SSO email domain in lowercase (e.g., sistec.ac.in).
    /// </summary>
    public string SsoDomain
    {
        get => _ssoDomain;
        set => _ssoDomain = value?.Trim().ToLowerInvariant() ?? string.Empty;
    }

    public LicenseTier LicenseTier { get; set; } = LicenseTier.Pilot;
    public int MaxStudentSeats { get; set; } = 500;
    public int StorageQuotaGb { get; set; } = 50;
    public bool IsActive { get; set; } = true;
    public bool EnforceStrictSso { get; set; } = true;
    public string? CrestUrl { get; set; }
    public string? PrincipalSealUrl { get; set; }
    public DateTime? SubscriptionExpiresAtUtc { get; set; }

    // Navigations
    public ICollection<Department> Departments { get; set; } = new List<Department>();
    public ICollection<UserAccount> Users { get; set; } = new List<UserAccount>();
    public ICollection<AcademicTrack> AcademicTracks { get; set; } = new List<AcademicTrack>();
    public ICollection<ProjectTeam> Teams { get; set; } = new List<ProjectTeam>();
}
