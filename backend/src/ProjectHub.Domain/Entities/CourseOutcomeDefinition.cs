using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Course Outcome (CO1–CO4) mapping to POs and setting attainment thresholds for NBA compliance.
/// </summary>
public class CourseOutcomeDefinition : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid AcademicTrackId { get; set; }
    public string CoCode { get; set; } = string.Empty; // CO1 - CO4
    public string Description { get; set; } = string.Empty;
    public string MappedPoCodesCsv { get; set; } = string.Empty; // e.g. "PO1,PO2,PO3,PO5"
    public decimal TargetThresholdPct { get; set; } = 70.0m;

    // Navigations
    public CollegeTenant? College { get; set; }
    public Department? Department { get; set; }
    public AcademicTrack? AcademicTrack { get; set; }
}
