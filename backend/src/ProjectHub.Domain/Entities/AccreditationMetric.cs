using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Sub-criterion or measurable metric under an accreditation criterion (e.g., 2.1, 3.2).
/// </summary>
public class AccreditationMetric : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid CriterionId { get; set; }

    public string MetricCode { get; set; } = string.Empty; // e.g. "1.1", "2.2"
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal MaxMarks { get; set; }
    public decimal AttainedMarks { get; set; } = 0m;
    public Guid? AssignedHodUserId { get; set; }
    public string Status { get; set; } = "InProgress"; // "Pending", "UnderReview", "Approved"

    // Navigations
    public CollegeTenant? College { get; set; }
    public AccreditationCriterion? Criterion { get; set; }
    public UserAccount? AssignedHodUser { get; set; }
    public ICollection<AccreditationEvidence> EvidenceItems { get; set; } = new List<AccreditationEvidence>();
}
