using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Platform-level immutable append-only audit trail capturing administrative tenant lifecycle events.
/// </summary>
public class PlatformAuditLog : BaseEntity
{
    public Guid? ActorUserId { get; set; }
    public string ActorEmail { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public Guid? TargetTenantId { get; set; }
    public string TargetEntity { get; set; } = string.Empty;
    public string MetadataJson { get; set; } = "{}";
    public string? IpAddress { get; set; }
    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
}
