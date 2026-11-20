using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities.Master;

/// <summary>
/// Platform-level master university definition (e.g. RGPV, VTU, AKTU).
/// Managed by SuperAdmin and shared across all affiliated college tenants.
/// </summary>
public class MasterUniversity : BaseEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "RGPV"
    public string Name { get; set; } = string.Empty; // e.g. "Rajiv Gandhi Proudyogiki Vishwavidyalaya"
    public string State { get; set; } = string.Empty; // e.g. "Madhya Pradesh"
    public bool IsActive { get; set; } = true;

    // Navigations
    public ICollection<MasterCurriculumScheme> CurriculumSchemes { get; set; } = new List<MasterCurriculumScheme>();
    public ICollection<MasterProgram> Programs { get; set; } = new List<MasterProgram>();
}
