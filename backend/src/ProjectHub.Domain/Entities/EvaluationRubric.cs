using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Configurable evaluation rubric defining academic criteria, weightage, and scoring scale.
/// </summary>
public class EvaluationRubric : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid AcademicTrackId { get; set; }
    public string Title { get; set; } = string.Empty;
    public CheckpointType CheckpointType { get; set; } = CheckpointType.FinalViva;
    public decimal TotalMaxMarks { get; set; } = 50.0m;
    public bool IsActive { get; set; } = true;

    // Navigations
    public Department? Department { get; set; }
    public AcademicTrack? AcademicTrack { get; set; }
    public ICollection<EvaluationRubricCriterion> Criteria { get; set; } = new List<EvaluationRubricCriterion>();
}
