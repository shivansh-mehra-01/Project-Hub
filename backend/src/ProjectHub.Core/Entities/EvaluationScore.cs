using ProjectHub.Core.Common;

namespace ProjectHub.Core.Entities;

/// <summary>
/// Individual score awarded for a specific rubric criterion.
/// </summary>
public class EvaluationScore : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid EvaluationId { get; set; }
    public Guid CriterionId { get; set; }
    public Guid? StudentId { get; set; } // Nullable if scored at team level
    public decimal AwardedScore { get; set; }
    public string? Feedback { get; set; }

    // Navigations
    public College? College { get; set; }
    public Evaluation? Evaluation { get; set; }
    public RubricCriterion? Criterion { get; set; }
    public User? Student { get; set; }
}

