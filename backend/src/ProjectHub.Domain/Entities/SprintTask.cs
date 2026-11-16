using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Agile sprint task tracked within a team's build cycle.
/// </summary>
public class SprintTask : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid ProjectTeamId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string CategoryTag { get; set; } = string.Empty; // Hardware, Cloud, AI/ML, Frontend, etc.
    public Guid? AssignedToUserId { get; set; }
    public SprintTaskStatus Status { get; set; } = SprintTaskStatus.Todo;
    public DateTime? DueDateUtc { get; set; }

    // Navigations
    public ProjectTeam? ProjectTeam { get; set; }
    public UserAccount? AssignedToUser { get; set; }
}
