using ProjectHub.Core.Common;
using ProjectHub.Core.Enums;

namespace ProjectHub.Core.Entities;

/// <summary>
/// Evaluation rubric mapped to academic project milestones.
/// </summary>
public class Rubric : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid CycleId { get; set; }
    public string Title { get; set; } = string.Empty;
    public EvaluationStage Stage { get; set; }
    public decimal TotalMarks { get; set; }

    // Navigations
    public College? College { get; set; }
    public ProjectCycle? Cycle { get; set; }
    public ICollection<RubricCriterion> Criteria { get; set; } = new List<RubricCriterion>();
    public ICollection<Evaluation> Evaluations { get; set; } = new List<Evaluation>();
}

