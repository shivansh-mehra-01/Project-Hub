using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Core project group entity within an academic department and track.
/// Includes project lineage linking Minor -> Major and Phase-I -> Phase-II cycles.
/// </summary>
public class ProjectTeam : BaseEntity, ITenantEntity
{
    private string _teamCode = string.Empty;

    public Guid CollegeId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid AcademicTrackId { get; set; }

    /// <summary>
    /// Lineage identifier shared across consecutive academic project phases (e.g., Minor to Major continuity).
    /// Defaults to own Id if this is the origin project.
    /// </summary>
    public Guid ProjectLineageId { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Self-referencing link to parent project team in the preceding phase.
    /// </summary>
    public Guid? ParentProjectTeamId { get; set; }

    public string TeamCode
    {
        get => _teamCode;
        set => _teamCode = value?.Trim().ToUpperInvariant() ?? string.Empty;
    }

    public string? TeamName { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Abstract { get; set; } = string.Empty;
    public string DomainTag { get; set; } = string.Empty;
    public string SdgCode { get; set; } = string.Empty;
    public string? RequiredSkillsCsv { get; set; }
    public bool IsPublished { get; set; } = false;
    public DateTime? PublishedAtUtc { get; set; }
    public ProjectStatus Status { get; set; } = ProjectStatus.Draft;
    public Guid? GuideUserId { get; set; }
    public Guid? PreferredGuideUserId { get; set; }
    public GuidePreferenceStatus GuidePreferenceStatus { get; set; } = GuidePreferenceStatus.None;
    public DateTime? GuidePreferenceSubmittedAtUtc { get; set; }
    public string? GuidePreferenceRemarks { get; set; }
    public DateTime? GuideAllocatedAtUtc { get; set; }
    public Guid? GuideAllocatedByUserId { get; set; }
    public string? GuideAllocationRemarks { get; set; }
    public string? RepoUrl { get; set; }
    public string? JiraBoardKey { get; set; }
    public int MissedLogStreak { get; set; } = 0;
    public bool IsRosterLocked { get; set; } = false;
    public decimal? SimilarityScorePct { get; set; }
    public string? SimilarProjectCode { get; set; }

    // Navigations
    public CollegeTenant? College { get; set; }
    public Department? Department { get; set; }
    public AcademicTrack? AcademicTrack { get; set; }
    public UserAccount? GuideUser { get; set; }
    public UserAccount? PreferredGuideUser { get; set; }
    public UserAccount? GuideAllocatedByUser { get; set; }
    public ProjectTeam? ParentProjectTeam { get; set; }
    public ICollection<ProjectTeam> ChildProjects { get; set; } = new List<ProjectTeam>();

    public ICollection<TeamMember> Members { get; set; } = new List<TeamMember>();
    public ICollection<TeamInvitation> Invitations { get; set; } = new List<TeamInvitation>();
    public ICollection<TeamJoinRequest> JoinRequests { get; set; } = new List<TeamJoinRequest>();
    public ICollection<SprintTask> Tasks { get; set; } = new List<SprintTask>();
    public ICollection<ProjectMilestone> Milestones { get; set; } = new List<ProjectMilestone>();
    public ICollection<ProjectReportSubmission> ReportSubmissions { get; set; } = new List<ProjectReportSubmission>();
    public ICollection<TeamArtifact> Artifacts { get; set; } = new List<TeamArtifact>();
    public ICollection<WeeklyLogbook> WeeklyLogs { get; set; } = new List<WeeklyLogbook>();
    public ICollection<VivaEvaluation> Evaluations { get; set; } = new List<VivaEvaluation>();
    public ICollection<ExceptionAuditLog> ExceptionLogs { get; set; } = new List<ExceptionAuditLog>();
    public ProjectClosureRecord? ClosureRecord { get; set; }
    public ICollection<StudentAcademicRecord> AcademicRecords { get; set; } = new List<StudentAcademicRecord>();
}
