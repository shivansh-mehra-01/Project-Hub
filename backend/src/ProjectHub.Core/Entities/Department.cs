using ProjectHub.Core.Common;

namespace ProjectHub.Core.Entities;

/// <summary>
/// Academic branch/department within a college (e.g. CSE, ECE).
/// </summary>
public class Department : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public Guid? HodUserId { get; set; }

    // Navigations
    public College? College { get; set; }
    public User? HodUser { get; set; }
    public ICollection<CollegeMembership> Memberships { get; set; } = new List<CollegeMembership>();
    public ICollection<ProjectCycle> Cycles { get; set; } = new List<ProjectCycle>();
    public ICollection<Team> Teams { get; set; } = new List<Team>();
}

