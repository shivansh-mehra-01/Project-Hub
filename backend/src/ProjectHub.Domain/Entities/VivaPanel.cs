using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Scheduled viva defense examination panel.
/// </summary>
public class VivaPanel : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid AcademicTrackId { get; set; }
    public string PanelName { get; set; } = string.Empty;
    public DateTime ScheduledAtUtc { get; set; }
    public string RoomOrLink { get; set; } = string.Empty;

    // Navigations
    public Department? Department { get; set; }
    public AcademicTrack? AcademicTrack { get; set; }
    public ICollection<VivaPanelEvaluator> Evaluators { get; set; } = new List<VivaPanelEvaluator>();
}
