using ProjectHub.Core.Common;

namespace ProjectHub.Core.Entities;

/// <summary>
/// Student membership in a project team. Tracks the contextual TeamLead badge.
/// </summary>
public class TeamMember : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid TeamId { get; set; }
    public Guid UserId { get; set; }
    public bool IsLead { get; set; }
    public DateTime JoinedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigations
    public College? College { get; set; }
    public Team? Team { get; set; }
    public User? User { get; set; }
}

