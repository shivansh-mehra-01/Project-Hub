using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Project execution milestone tracked and reviewed by officially allocated faculty guides.
/// </summary>
public class ProjectMilestone : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid ProjectTeamId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime TargetDateUtc { get; set; }
    public MilestoneStatus Status { get; set; } = MilestoneStatus.Pending;
    public int RequiredTaskCompletionPercentage { get; set; } = 0;

    public DateTime? SubmittedAtUtc { get; set; }
    public Guid? SubmittedByUserId { get; set; }
    public string? SubmissionEvidenceUrl { get; set; }

    public DateTime? ReviewedAtUtc { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public string? ReviewFeedback { get; set; }

    // Navigations
    public ProjectTeam? ProjectTeam { get; set; }
    public UserAccount? SubmittedByUser { get; set; }
    public UserAccount? ReviewedByUser { get; set; }
    public ICollection<MilestoneReviewHistory> ReviewHistories { get; set; } = new List<MilestoneReviewHistory>();
}
