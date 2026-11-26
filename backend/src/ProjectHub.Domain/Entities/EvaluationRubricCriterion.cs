using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Atomic criterion within an academic evaluation rubric (e.g. System Design, Hardware Prototype, Viva Q&A).
/// </summary>
public class EvaluationRubricCriterion : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid EvaluationRubricId { get; set; }
    public string CriterionCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal MaxMarks { get; set; }
    public decimal WeightPercentage { get; set; }
    public int DisplayOrder { get; set; }
    public string? BloomTaxonomyLevel { get; set; }

    // Navigations
    public EvaluationRubric? EvaluationRubric { get; set; }
}
