using ProjectHub.Core.Common;

namespace ProjectHub.Core.Entities;

/// <summary>
/// Root tenant entity representing an engineering institution.
/// </summary>
public class College : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public string SubscriptionPlan { get; set; } = "Pilot";
    public DateTime? SubscriptionExpiresAtUtc { get; set; }

    // Navigation collections
    public ICollection<Department> Departments { get; set; } = new List<Department>();
    public ICollection<CollegeMembership> Memberships { get; set; } = new List<CollegeMembership>();
    public ICollection<ProjectCycle> Cycles { get; set; } = new List<ProjectCycle>();
    public ICollection<Team> Teams { get; set; } = new List<Team>();
}

