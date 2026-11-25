using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Invitation dispatched from a project team leader to an eligible student peer.
/// Tracks lifecycle: Pending -> Accepted | Declined | Cancelled | Expired.
/// </summary>
public class TeamInvitation : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid ProjectTeamId { get; set; }
    public Guid InviterStudentId { get; set; }
    public Guid InviteeStudentId { get; set; }

    public InvitationStatus Status { get; set; } = InvitationStatus.Pending;
    public string? Message { get; set; }

    public DateTime InvitedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAtUtc { get; set; }
    public DateTime? RespondedAtUtc { get; set; }
    public string? ResponseNotes { get; set; }

    // Navigations
    public CollegeTenant? College { get; set; }
    public ProjectTeam? ProjectTeam { get; set; }
    public UserAccount? InviterStudent { get; set; }
    public UserAccount? InviteeStudent { get; set; }
}
