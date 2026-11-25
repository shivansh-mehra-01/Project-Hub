using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Specific scheduled defense session for a project team.
/// Records venue/virtual link, time slot, associated panel, and cancellation/rescheduling history.
/// </summary>
public class TeamVivaDefenseSchedule : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid AcademicTrackId { get; set; }
    public Guid ProjectTeamId { get; set; }
    public Guid? VivaPanelId { get; set; }

    public DateTime ScheduledDateUtc { get; set; }
    public int DurationMinutes { get; set; } = 30;
    public string VenueOrLink { get; set; } = string.Empty;
    public VivaScheduleStatus Status { get; set; } = VivaScheduleStatus.Scheduled;

    public string? CandidateInstructions { get; set; }
    public string? CancellationReason { get; set; }

    public Guid ScheduledByUserId { get; set; }
    public DateTime ScheduledAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? RescheduledAtUtc { get; set; }

    // Navigations
    public ProjectTeam? ProjectTeam { get; set; }
    public VivaPanel? VivaPanel { get; set; }
    public UserAccount? ScheduledByUser { get; set; }
}
