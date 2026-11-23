using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Normalized campus location belonging to an institutional college tenant.
/// Supports multi-campus structures (main campus, extension centers, satellite branches).
/// </summary>
public class CollegeCampus : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? CampusCode { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; } = "Bhopal";
    public string? State { get; set; } = "Madhya Pradesh";
    public string? Pincode { get; set; }
    public bool IsMainCampus { get; set; } = true;
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }

    // Navigation
    public CollegeTenant? College { get; set; }
}
