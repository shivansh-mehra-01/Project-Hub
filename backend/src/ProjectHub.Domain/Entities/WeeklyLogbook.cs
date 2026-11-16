using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Mandatory Friday weekly progress log submitted individually by team members and verified by the guide.
/// </summary>
public class WeeklyLogbook : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid ProjectTeamId { get; set; }
    public Guid AuthorUserId { get; set; }
    public int WeekNumber { get; set; }
    public string AccomplishmentsSummary { get; set; } = string.Empty;
    public string? BlockersSummary { get; set; }
    public decimal HoursLogged { get; set; } = 0m;
    public int GitCommitCount { get; set; } = 0;
    public bool IsVerified { get; set; } = false;
    public Guid? VerifiedByUserId { get; set; }
    public DateTime? VerifiedAtUtc { get; set; }
    public string? MentorRemarks { get; set; }

    // Navigations
    public ProjectTeam? ProjectTeam { get; set; }
    public UserAccount? AuthorUser { get; set; }
    public UserAccount? VerifiedByUser { get; set; }
}
