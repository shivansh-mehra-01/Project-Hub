using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Platform-wide or tenant-targeted announcement created by SuperAdmin operators.
/// </summary>
public class PlatformAnnouncement : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = "Maintenance";
    public string Priority { get; set; } = "Normal";
    public string ShortDescription { get; set; } = string.Empty;
    public string FullMessage { get; set; } = string.Empty;
    public string TargetAudience { get; set; } = "All Colleges";
    public string TargetCollegeIdsJson { get; set; } = "[]";
    public string Status { get; set; } = "Draft";
    public DateTime? PublishDateUtc { get; set; }
    public DateTime? WithdrawnAtUtc { get; set; }
    public DateTime? ArchivedAtUtc { get; set; }
    public string? ArchiveReason { get; set; }
    public string CreatedByEmail { get; set; } = string.Empty;
    public string CreatedByName { get; set; } = string.Empty;
}
