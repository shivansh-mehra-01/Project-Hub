using ProjectHub.Domain.Enums;

namespace ProjectHub.Application.Common.Models;

public record TeamMemberDto
{
    public Guid UserId { get; init; }
    public string FullName { get; init; } = string.Empty;
    public string EnrollmentCode { get; init; } = string.Empty;
    public bool IsTeamLead { get; init; }
    public string ModuleResponsibility { get; init; } = string.Empty;
}

public record SprintTaskDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string CategoryTag { get; init; } = string.Empty;
    public Guid? AssignedToUserId { get; init; }
    public string? AssigneeName { get; init; }
    public SprintTaskStatus Status { get; init; }
    public DateTime? DueDateUtc { get; init; }
}

public record ArtifactSlotDto
{
    public Guid? Id { get; init; }
    public ArtifactSlotType SlotType { get; init; }
    public string? FileName { get; init; }
    public string? StorageKey { get; init; }
    public string? Sha256Checksum { get; init; }
    public long FileSizeBytes { get; init; }
    public ArtifactStatus Status { get; init; }
    public string? ReviewerNote { get; init; }
}

public record WeeklyLogDto
{
    public Guid Id { get; init; }
    public Guid AuthorUserId { get; init; }
    public string AuthorName { get; init; } = string.Empty;
    public int WeekNumber { get; init; }
    public string AccomplishmentsSummary { get; init; } = string.Empty;
    public string? BlockersSummary { get; init; }
    public decimal HoursLogged { get; init; }
    public int GitCommitCount { get; init; }
    public bool IsVerified { get; init; }
    public string? MentorRemarks { get; init; }
    public DateTime CreatedAtUtc { get; init; }
}

public record StudentWorkspaceDto
{
    public Guid TeamId { get; init; }
    public string TeamCode { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Abstract { get; init; } = string.Empty;
    public string DomainTag { get; init; } = string.Empty;
    public string SdgCode { get; init; } = string.Empty;
    public ProjectStatus Status { get; init; }
    public Guid? GuideUserId { get; init; }
    public string? GuideName { get; init; }
    public string? RepoUrl { get; init; }
    public string? JiraBoardKey { get; init; }
    public bool IsRosterLocked { get; init; }
    public int MissedLogStreak { get; init; }
    public Guid ProjectLineageId { get; init; }
    public List<TeamMemberDto> Members { get; init; } = new();
    public List<SprintTaskDto> Tasks { get; init; } = new();
    public List<ArtifactSlotDto> Artifacts { get; init; } = new();
    public List<WeeklyLogDto> WeeklyLogs { get; init; } = new();
}

public record CreateTaskRequest
{
    public string Title { get; init; } = string.Empty;
    public string CategoryTag { get; init; } = string.Empty;
    public Guid? AssignedToUserId { get; init; }
    public SprintTaskStatus Status { get; init; } = SprintTaskStatus.Todo;
    public DateTime? DueDateUtc { get; init; }
}

public record UpdateTaskRequest
{
    public string? Title { get; init; }
    public string? CategoryTag { get; init; }
    public Guid? AssignedToUserId { get; init; }
    public SprintTaskStatus? Status { get; init; }
    public DateTime? DueDateUtc { get; init; }
}

public record SubmitLogbookRequest
{
    public int WeekNumber { get; init; }
    public string AccomplishmentsSummary { get; init; } = string.Empty;
    public string? BlockersSummary { get; init; }
    public decimal HoursLogged { get; init; }
    public int GitCommitCount { get; init; }
}

public record UploadArtifactRequest
{
    public ArtifactSlotType SlotType { get; init; }
    public string FileName { get; init; } = string.Empty;
    public string StorageKey { get; init; } = string.Empty;
    public string Sha256Checksum { get; init; } = string.Empty;
    public long FileSizeBytes { get; init; }
}

public record ContinueLineageRequest
{
    public Guid TargetAcademicTrackId { get; init; }
    public string NewTitle { get; init; } = string.Empty;
    public string NewAbstract { get; init; } = string.Empty;
}

public record SubmitExitSurveyRequest
{
    public Dictionary<string, int> PoRatings { get; init; } = new();
}

public record StudentPortfolioDto
{
    public Guid StudentId { get; init; }
    public string FullName { get; init; } = string.Empty;
    public string EnrollmentCode { get; init; } = string.Empty;
    public string CollegeName { get; init; } = string.Empty;
    public string DepartmentName { get; init; } = string.Empty;
    public string ProjectTitle { get; init; } = string.Empty;
    public string TeamCode { get; init; } = string.Empty;
    public string ModuleResponsibility { get; init; } = string.Empty;
    public string DomainTag { get; init; } = string.Empty;
    public string SdgCode { get; init; } = string.Empty;
    public string? RepoUrl { get; init; }
    public decimal TotalHoursLogged { get; init; }
    public int TotalCommits { get; init; }
    public List<ArtifactSlotDto> VerifiedArtifacts { get; init; } = new();
}
