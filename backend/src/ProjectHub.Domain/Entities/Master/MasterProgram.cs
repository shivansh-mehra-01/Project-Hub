using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities.Master;

/// <summary>
/// Platform-level master academic program (e.g. BTECH, MTECH, MCA, MBA, BPHARM, BARCH, MPHARM, DIPLOMA).
/// </summary>
public class MasterProgram : BaseEntity
{
    public Guid UniversityId { get; set; }
    public AcademicProgramLevel Level { get; set; } = AcademicProgramLevel.UG;
    public string Code { get; set; } = string.Empty; // "BTECH", "MTECH", "MCA", "MBA", "BPHARM", "BARCH", "MPHARM", "DIPLOMA"
    public string Name { get; set; } = string.Empty;
    public int DurationYears { get; set; } = 4;
    public int TotalSemesters { get; set; } = 8;
    public bool IsActive { get; set; } = true;

    // Navigations
    public MasterUniversity? University { get; set; }
    public ICollection<MasterBranch> Branches { get; set; } = new List<MasterBranch>();
}
