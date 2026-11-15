using ProjectHub.Core.Common;

namespace ProjectHub.Core.Entities;

/// <summary>
/// Evaluation panel grading session for a team.
/// </summary>
public class Evaluation : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid TeamId { get; set; }
    public Guid RubricId { get; set; }
    public Guid EvaluatorUserId { get; set; }
    public bool IsFinalized { get; set; }
    public DateTime EvaluatedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigations
    public College? College { get; set; }
    public Team? Team { get; set; }
    public Rubric? Rubric { get; set; }
    public User? EvaluatorUser { get; set; }
    public ICollection<EvaluationScore> Scores { get; set; } = new List<EvaluationScore>();
}

