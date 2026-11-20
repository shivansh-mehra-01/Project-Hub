using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities.Master;

/// <summary>
/// Platform-level master curriculum scheme (e.g. RGPV-CBCS, RGPV-AICTE-FLEX, RGPV-PCI, RGPV-DIPLOMA).
/// </summary>
public class MasterCurriculumScheme : BaseEntity
{
    public Guid UniversityId { get; set; }
    public string Code { get; set; } = string.Empty; // "RGPV-CBCS", "RGPV-AICTE-FLEX", "RGPV-PCI", "RGPV-DIPLOMA"
    public string Name { get; set; } = string.Empty;
    public int EffectiveFromYear { get; set; } = 2022;
    public bool IsActive { get; set; } = true;

    // Navigations
    public MasterUniversity? University { get; set; }
    public ICollection<MasterSubjectTemplate> SubjectTemplates { get; set; } = new List<MasterSubjectTemplate>();
}
