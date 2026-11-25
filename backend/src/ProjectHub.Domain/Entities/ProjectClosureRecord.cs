using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Formal institutional project closure and archival record.
/// Generated upon authorized completion approval by Department HOD or Academic Coordinator.
/// </summary>
public class ProjectClosureRecord : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid AcademicTrackId { get; set; }
    public Guid ProjectTeamId { get; set; }
    public Guid ClosedByUserId { get; set; }
    public DateTime ClosedAtUtc { get; set; } = DateTime.UtcNow;

    public ProjectClosureStatus Status { get; set; } = ProjectClosureStatus.Closed;

    /// <summary>
    /// Cryptographic SHA-256 hash sealing the project title, team members, final report checksum, and published marks.
    /// </summary>
    public string ClosureCertificateHash { get; set; } = string.Empty;

    public string ClosureRemarks { get; set; } = string.Empty;

    public bool IsArchived { get; set; } = true;
    public DateTime? ArchivedAtUtc { get; set; } = DateTime.UtcNow;

    public bool IsReopened { get; set; } = false;
    public DateTime? ReopenedAtUtc { get; set; }
    public Guid? ReopenedByUserId { get; set; }
    public string? ReopeningReason { get; set; }

    // Navigations
    public CollegeTenant? College { get; set; }
    public Department? Department { get; set; }
    public AcademicTrack? AcademicTrack { get; set; }
    public ProjectTeam? ProjectTeam { get; set; }
    public UserAccount? ClosedByUser { get; set; }
    public UserAccount? ReopenedByUser { get; set; }

    public ICollection<StudentAcademicRecord> AcademicRecords { get; set; } = new List<StudentAcademicRecord>();
}
