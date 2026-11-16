using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Global National Board of Accreditation (NBA) outcome definition (PO1–PO12).
/// Seeded and managed globally across all tenants for Criterion 2 & 3 compliance.
/// </summary>
public class MasterNbaOutcome : BaseEntity
{
    public string Code { get; set; } = string.Empty; // PO1 - PO12
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = "ProgramOutcome"; // ProgramOutcome | SustainabilityGoal
    public bool IsActive { get; set; } = true;
}
