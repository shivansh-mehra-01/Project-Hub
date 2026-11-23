using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Major criterion entry under an accreditation cycle (e.g. NBA Criterion 1 - 10).
/// </summary>
public class AccreditationCriterion : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid CycleId { get; set; }

    public string Code { get; set; } = string.Empty; // "Criterion 1", "Criterion 2", etc.
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal MaxMarks { get; set; }
    public decimal AttainedMarks { get; set; } = 0m;
    public decimal AttainmentPercentage { get; set; } = 0m;
    public int SortOrder { get; set; } = 1;
    public string Status { get; set; } = "InProgress"; // "NotStarted", "InProgress", "Complete"

    // Navigations
    public CollegeTenant? College { get; set; }
    public AccreditationCycle? Cycle { get; set; }
    public ICollection<AccreditationMetric> Metrics { get; set; } = new List<AccreditationMetric>();
}
