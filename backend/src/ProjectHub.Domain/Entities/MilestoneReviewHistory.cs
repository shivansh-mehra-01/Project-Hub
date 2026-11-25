using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Historical audit record of faculty/guide milestone reviews.
/// </summary>
public class MilestoneReviewHistory : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid ProjectMilestoneId { get; set; }
    public Guid ReviewerUserId { get; set; }
    public MilestoneStatus ResultStatus { get; set; }
    public string Feedback { get; set; } = string.Empty;
    public DateTime ReviewedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigations
    public ProjectMilestone? ProjectMilestone { get; set; }
    public UserAccount? ReviewerUser { get; set; }
}
