using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Student academic semester enrollment record tracking program, branch, batch, and current semester.
/// Scoped by CollegeId tenant partition.
/// </summary>
public class StudentAcademicEnrollment : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid StudentUserId { get; set; }
    public Guid CourseProgramId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid CurrentSemesterTermId { get; set; }
    public string AdmissionBatch { get; set; } = "2023-2027";
    public AcademicStatus AcademicStatus { get; set; } = AcademicStatus.Active;

    // Navigations
    public CollegeTenant? College { get; set; }
    public UserAccount? StudentUser { get; set; }
    public CourseProgram? CourseProgram { get; set; }
    public Department? Department { get; set; }
    public SemesterTerm? CurrentSemesterTerm { get; set; }
}
