using ProjectHub.Domain.Common;
using ProjectHub.Domain.Entities.Master;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// College-specific degree program (e.g. B.Tech, M.Tech, MCA, MBA).
/// Scoped by CollegeId and optionally linked to a MasterProgram template.
/// </summary>
public class CourseProgram : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid? MasterProgramId { get; set; }
    public AcademicProgramLevel Level { get; set; } = AcademicProgramLevel.UG;
    public string Code { get; set; } = string.Empty; // "BTECH", "MTECH", "MCA", "MBA"
    public string Name { get; set; } = string.Empty;
    public int TotalSemesters { get; set; } = 8;
    public bool IsActive { get; set; } = true;

    // Navigations
    public CollegeTenant? College { get; set; }
    public MasterProgram? MasterProgram { get; set; }
    public ICollection<Department> Departments { get; set; } = new List<Department>();
    public ICollection<CurriculumScheme> CurriculumSchemes { get; set; } = new List<CurriculumScheme>();
    public ICollection<AcademicTrack> AcademicTracks { get; set; } = new List<AcademicTrack>();
}
