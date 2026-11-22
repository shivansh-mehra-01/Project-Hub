using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Persistent audit history of Head of Department (HOD) appointments and reassignments.
/// </summary>
public class HodAppointmentHistory : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid HodUserId { get; set; }
    public Guid? AppointedByUserId { get; set; }
    public string AppointedByName { get; set; } = string.Empty;
    public DateTime AppointedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? RelievedAtUtc { get; set; }
    public bool IsCurrent { get; set; } = true;
    public string? Remarks { get; set; }

    // Navigations
    public CollegeTenant? College { get; set; }
    public Department? Department { get; set; }
    public UserAccount? HodUser { get; set; }
}
