using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// 4-Slot Vault milestone deliverable: Synopsis, MidTermPPT, PlagiarismReport, FinalThesis.
/// </summary>
public class TeamArtifact : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid ProjectTeamId { get; set; }
    public ArtifactSlotType SlotType { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string StorageKey { get; set; } = string.Empty;
    public string Sha256Checksum { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; } = 0;
    public ArtifactStatus Status { get; set; } = ArtifactStatus.Missing;
    public Guid UploadedByUserId { get; set; }
    public Guid? VerifiedByUserId { get; set; }
    public string? ReviewerNote { get; set; }

    // Navigations
    public ProjectTeam? ProjectTeam { get; set; }
    public UserAccount? UploadedByUser { get; set; }
    public UserAccount? VerifiedByUser { get; set; }
}
