using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Immutable audit log trail for accreditation cycle events, reviews, and evidence submissions.
/// </summary>
public class AccreditationActivityLog : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid CycleId { get; set; }

    public string Action { get; set; } = string.Empty; // e.g. "CYCLE_CREATED", "EVIDENCE_UPLOADED", "EVIDENCE_REVIEWED", "CYCLE_ATTESTED"
    public string EntityType { get; set; } = "Evidence";
    public string EntityTitle { get; set; } = string.Empty;

    public Guid? PerformedByUserId { get; set; }
    public string PerformedByName { get; set; } = string.Empty;
    public string PerformedByRole { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;

    // Navigation
    public CollegeTenant? College { get; set; }
    public AccreditationCycle? Cycle { get; set; }
}
