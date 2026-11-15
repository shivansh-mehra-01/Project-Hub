using ProjectHub.Core.Common;

namespace ProjectHub.Core.Entities;

/// <summary>
/// Individual rubric criterion with direct NBA Program Outcome (PO) and Bloom's Taxonomy mapping.
/// </summary>
public class RubricCriterion : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid RubricId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal MaxScore { get; set; }
    public string NbaCriterionCode { get; set; } = string.Empty; // e.g. "PO3", "PO4", "PSO1"
    public string BloomsTaxonomyLevel { get; set; } = "L3_Apply";

    // Navigations
    public College? College { get; set; }
    public Rubric? Rubric { get; set; }
    public ICollection<EvaluationScore> Scores { get; set; } = new List<EvaluationScore>();
}

