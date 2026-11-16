using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Association linking a student UserAccount to a ProjectTeam with individual module responsibility.
/// </summary>
public class TeamMember : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid ProjectTeamId { get; set; }
    public Guid UserId { get; set; }
    public bool IsTeamLead { get; set; } = false;
    public string ModuleResponsibility { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime JoinedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? RemovedAtUtc { get; set; }

    // Navigations
    public ProjectTeam? ProjectTeam { get; set; }
    public UserAccount? User { get; set; }
}
