using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Project evaluation record containing shared team assessment criteria.
/// </summary>
public class VivaEvaluation : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid ProjectTeamId { get; set; }
    public Guid EvaluatorUserId { get; set; }
    public CheckpointType CheckpointType { get; set; } = CheckpointType.GuideContinuous;

    /// <summary>
    /// Stored as PostgreSQL jsonb for flexible rubric criterion breakdowns.
    /// </summary>
    public string SharedRubricScoresJson { get; set; } = "{}";

    public decimal SharedTotalScore { get; set; } = 0m;
    public string? GeneralRemarks { get; set; }
    public bool IsLocked { get; set; } = false;
    public DateTime? LockedAtUtc { get; set; }

    // Phase 9: Evaluation Lifecycle, Moderation & Publication
    public VivaOutcome Outcome { get; set; } = VivaOutcome.Pending;
    public bool IsPublished { get; set; } = false;
    public DateTime? PublishedAtUtc { get; set; }
    public Guid? PublishedByUserId { get; set; }
    public string? RubricSnapshotJson { get; set; }
    public string? ModerationRemarks { get; set; }
    public Guid? ModeratedByUserId { get; set; }
    public DateTime? ModeratedAtUtc { get; set; }

    // Navigations
    public ProjectTeam? ProjectTeam { get; set; }
    public UserAccount? EvaluatorUser { get; set; }
    public UserAccount? PublishedByUser { get; set; }
    public UserAccount? ModeratedByUser { get; set; }
    public ICollection<IndividualStudentScore> IndividualScores { get; set; } = new List<IndividualStudentScore>();
}
