using ProjectHub.Domain.Enums;

namespace ProjectHub.Application.Common.Models;

public record RosterRowInput
{
    public string FullName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string EnrollmentOrEmployeeCode { get; init; } = string.Empty;
    public UserRole Role { get; init; } = UserRole.Student;
    public string? SkillsCsv { get; init; }
    public string? GitHubHandle { get; init; }
}

public record RosterImportRequest
{
    public Guid DepartmentId { get; init; }
    public List<RosterRowInput> Rows { get; init; } = new();
}

public record RosterImportResultDto
{
    public int TotalProcessed { get; init; }
    public int InsertedCount { get; init; }
    public int UpdatedCount { get; init; }
    public List<string> Warnings { get; init; } = new();
}

public record AssignGuideRequest
{
    public Guid GuideUserId { get; init; }
}

public record ScheduleVivaPanelRequest
{
    public Guid DepartmentId { get; init; }
    public Guid AcademicTrackId { get; init; }
    public string PanelName { get; init; } = string.Empty;
    public DateTime ScheduledAtUtc { get; init; }
    public string RoomOrLink { get; init; } = string.Empty;
    public List<Guid> EvaluatorUserIds { get; init; } = new();
}

public record VivaPanelDto
{
    public Guid Id { get; init; }
    public string PanelName { get; init; } = string.Empty;
    public DateTime ScheduledAtUtc { get; init; }
    public string RoomOrLink { get; init; } = string.Empty;
    public List<string> EvaluatorNames { get; init; } = new();
}

public record CreateExceptionRequest
{
    public Guid DepartmentId { get; init; }
    public Guid ProjectTeamId { get; init; }
    public ExceptionActionType ActionType { get; init; }
    public Guid? TargetUserId { get; init; }
    public string Reason { get; init; } = string.Empty;
    public string PreviousValueJson { get; init; } = "{}";
    public string NewValueJson { get; init; } = "{}";
}
