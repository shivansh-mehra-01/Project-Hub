using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Campus-level curriculum scheme adopted for a CourseProgram (e.g. RGPV-AICTE-FLEX 2022).
/// Scoped by CollegeId tenant partition.
/// </summary>
public class CurriculumScheme : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid CourseProgramId { get; set; }
    public string SchemeCode { get; set; } = string.Empty; // "RGPV-CBCS", "RGPV-AICTE-FLEX"
    public string SchemeVersion { get; set; } = "2022";
    public int EffectiveAdmissionYear { get; set; } = 2022;
    public bool IsActive { get; set; } = true;

    // Navigations
    public CollegeTenant? College { get; set; }
    public CourseProgram? CourseProgram { get; set; }
    public ICollection<SubjectOffering> SubjectOfferings { get; set; } = new List<SubjectOffering>();
}
