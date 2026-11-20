using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities.Master;

/// <summary>
/// Platform-level master academic branch/discipline (e.g. CSE, IT, EC, AIML, CS-DS, PHARM, FIN, etc.).
/// </summary>
public class MasterBranch : BaseEntity
{
    public Guid MasterProgramId { get; set; }
    public string Code { get; set; } = string.Empty; // "CSE", "AIML", "ME", etc.
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "Core"; // Core, Emerging, Pharmacy, Management, ComputerApplications
    public bool IsActive { get; set; } = true;

    // Navigations
    public MasterProgram? MasterProgram { get; set; }
    public ICollection<MasterSubjectTemplate> SubjectTemplates { get; set; } = new List<MasterSubjectTemplate>();
}
