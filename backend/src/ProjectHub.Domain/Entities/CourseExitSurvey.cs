using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Student indirect Course Outcome / Program Outcome exit survey response with 1-3 Likert ratings.
/// Feeds into NBA Criterion 3 indirect attainment calculations.
/// </summary>
public class CourseExitSurvey : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid ProjectTeamId { get; set; }
    public Guid StudentUserId { get; set; }

    /// <summary>
    /// Stored as PostgreSQL jsonb storing 1-3 Likert rating per PO (e.g. {"PO1": 3, "PO2": 2, "PO3": 3}).
    /// </summary>
    public string PoRatingsJson { get; set; } = "{}";

    public DateTime SubmittedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigations
    public ProjectTeam? ProjectTeam { get; set; }
    public UserAccount? StudentUser { get; set; }
}
