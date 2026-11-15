using ProjectHub.Core.Common;
using ProjectHub.Core.Enums;

namespace ProjectHub.Core.Entities;

/// <summary>
/// Weekly project log submitted by students and reviewed by Faculty Guides.
/// </summary>
public class WeeklyLog : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid TeamId { get; set; }
    public Guid StudentId { get; set; }
    public int WeekNumber { get; set; }
    public string Accomplishments { get; set; } = string.Empty;
    public string? Blockers { get; set; }
    public string PlannedNextWeek { get; set; } = string.Empty;
    public GuideReviewStatus GuideStatus { get; set; } = GuideReviewStatus.Pending;
    public string? GuideRemarks { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }

    // Navigations
    public College? College { get; set; }
    public Team? Team { get; set; }
    public User? Student { get; set; }
}

