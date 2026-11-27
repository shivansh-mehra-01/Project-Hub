using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Join request sent by an eligible student to a published project team during team formation.
/// </summary>
public class TeamJoinRequest : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid ProjectTeamId { get; set; }
    public Guid StudentUserId { get; set; }

    public string DesiredRole { get; set; } = string.Empty;
    public string? Message { get; set; }
    public JoinRequestStatus Status { get; set; } = JoinRequestStatus.Pending;

    public Guid? RespondedByUserId { get; set; }
    public DateTime? RespondedAtUtc { get; set; }
    public string? ResponseNotes { get; set; }

    // Navigations
    public CollegeTenant? College { get; set; }
    public ProjectTeam? ProjectTeam { get; set; }
    public UserAccount? StudentUser { get; set; }
    public UserAccount? RespondedByUser { get; set; }
}
