using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Immutable append-only audit record for governance exception overrides (e.g. guide reassignments, roster amendments).
/// </summary>
public class ExceptionAuditLog : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid ProjectTeamId { get; set; }
    public ExceptionActionType ActionType { get; set; }
    public Guid? TargetUserId { get; set; }
    public string PreviousValueJson { get; set; } = "{}";
    public string NewValueJson { get; set; } = "{}";
    public string Reason { get; set; } = string.Empty;
    public Guid RequestedByUserId { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }

    // Navigations
    public ProjectTeam? ProjectTeam { get; set; }
    public UserAccount? RequestedByUser { get; set; }
    public UserAccount? ApprovedByUser { get; set; }
    public UserAccount? TargetUser { get; set; }
}
