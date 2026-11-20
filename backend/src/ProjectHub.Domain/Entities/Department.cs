using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Academic department/branch operating within a campus tenant partition.
/// Linked to an optional CourseProgram (allowing e.g. CSE under B.Tech and CSE under M.Tech).
/// </summary>
public class Department : BaseEntity, ITenantEntity
{
    private string _code = string.Empty;

    public Guid CollegeId { get; set; }
    public Guid? CourseProgramId { get; set; }
    
    /// <summary>
    /// Department code (e.g. CSE, ECE, ME, CE).
    /// </summary>
    public string Code
    {
        get => _code;
        set => _code = value?.Trim().ToUpperInvariant() ?? string.Empty;
    }

    public string Name { get; set; } = string.Empty;
    public Guid? HodUserId { get; set; }
    public int IntakeQuota { get; set; } = 120;
    public bool IsSarAttested { get; set; } = false;
    public DateTime? SarAttestedAtUtc { get; set; }
    public Guid? SarAttestedByUserId { get; set; }

    // Navigations
    public CollegeTenant? College { get; set; }
    public CourseProgram? CourseProgram { get; set; }
    public UserAccount? HodUser { get; set; }
    public ICollection<UserAccount> Users { get; set; } = new List<UserAccount>();
    public ICollection<ProjectTeam> Teams { get; set; } = new List<ProjectTeam>();
    public ICollection<CourseOutcomeDefinition> CourseOutcomes { get; set; } = new List<CourseOutcomeDefinition>();
    public ICollection<SemesterTerm> SemesterTerms { get; set; } = new List<SemesterTerm>();
    public ICollection<StudentAcademicEnrollment> StudentEnrollments { get; set; } = new List<StudentAcademicEnrollment>();
}
