using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Operational academic semester within a department and academic session.
/// Scoped by CollegeId tenant partition.
/// </summary>
public class SemesterTerm : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid? AcademicSessionId { get; set; }
    public int SemesterNumber { get; set; } = 6;
    public string SemesterName { get; set; } = "Semester 6";
    public SemesterParity Parity { get; set; } = SemesterParity.Even;
    public bool IsActive { get; set; } = true;

    // Navigations
    public CollegeTenant? College { get; set; }
    public Department? Department { get; set; }
    public AcademicSession? AcademicSession { get; set; }
    public ICollection<SubjectOffering> SubjectOfferings { get; set; } = new List<SubjectOffering>();
    public ICollection<AcademicTrack> AcademicTracks { get; set; } = new List<AcademicTrack>();
}
