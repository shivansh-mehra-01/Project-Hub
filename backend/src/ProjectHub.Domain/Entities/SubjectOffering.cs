using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Course/project offering for a specific semester term in a department.
/// Scoped by CollegeId tenant partition.
/// </summary>
public class SubjectOffering : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid SemesterTermId { get; set; }
    public Guid? CurriculumSchemeId { get; set; }
    public string SubjectCode { get; set; } = string.Empty; // "CS-606", "CS-705"
    public string SubjectName { get; set; } = string.Empty; // "Minor Project"
    public SubjectType SubjectType { get; set; } = SubjectType.MinorProject;
    public int Credits { get; set; } = 4;
    public int InternalMaxMarks { get; set; } = 60;
    public int ExternalMaxMarks { get; set; } = 40;
    public bool IsActive { get; set; } = true;

    // Navigations
    public CollegeTenant? College { get; set; }
    public SemesterTerm? SemesterTerm { get; set; }
    public CurriculumScheme? CurriculumScheme { get; set; }
    public ICollection<AcademicTrack> AcademicTracks { get; set; } = new List<AcademicTrack>();
}
