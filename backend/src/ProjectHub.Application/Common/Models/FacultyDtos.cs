using ProjectHub.Domain.Enums;

namespace ProjectHub.Application.Common.Models;

public record ActionQueueItemDto
{
    public Guid ItemId { get; init; }
    public string Type { get; init; } = string.Empty; // "LogVerification", "ProposalEndorsement", "VivaDefense"
    public Guid ProjectTeamId { get; init; }
    public string TeamCode { get; init; } = string.Empty;
    public string TeamTitle { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public DateTime SubmittedAtUtc { get; init; }
}

public record ActionQueueDto
{
    public int PendingLogsCount { get; init; }
    public int PendingProposalsCount { get; init; }
    public List<ActionQueueItemDto> Items { get; init; } = new();
}

public record VerifyLogRequest
{
    public string? Decision { get; init; } // "Approved", "NeedsRevision"
    public bool? IsApproved { get; init; }
    public string? Remarks { get; init; }
}

public record AssignedDefenseTeamMemberDto
{
    public Guid UserId { get; init; }
    public string FullName { get; init; } = string.Empty;
    public string EnrollmentCode { get; init; } = string.Empty;
    public bool IsTeamLead { get; init; }
    public string ModuleResponsibility { get; init; } = string.Empty;
}

public record AssignedDefenseTeamDto
{
    public Guid TeamId { get; init; }
    public string TeamCode { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Abstract { get; init; } = string.Empty;
    public string DomainTag { get; init; } = string.Empty;
    public Guid? GuideUserId { get; init; }
    public string? GuideName { get; init; }
    public bool IsGuideConflict { get; init; }
    public CheckpointType CheckpointType { get; init; } = CheckpointType.MidTermReview;
    public bool IsEvaluationLocked { get; init; }
    public DateTime? ScheduledAtUtc { get; init; }
    public string? RoomOrLink { get; init; }
    public List<AssignedDefenseTeamMemberDto> Members { get; init; } = new();
}

public record CreateProblemStatementRequest
{
    public Guid DepartmentId { get; init; }
    public Guid AcademicTrackId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Abstract { get; init; } = string.Empty;
    public string SdgCode { get; init; } = string.Empty;
    public string? PrerequisitesCsv { get; init; }
    public int MaxTeamCapacity { get; init; } = 4;
}

public record StudentScoreInput
{
    public Guid StudentUserId { get; init; }
    public decimal ModuleOwnershipScore { get; init; }
    public decimal VivaQaScore { get; init; }
    public decimal LogDisciplineScore { get; init; }
}

public record SubmitVivaEvaluationRequest
{
    public Guid ProjectTeamId { get; init; }
    public CheckpointType CheckpointType { get; init; }
    public string SharedRubricScoresJson { get; init; } = "{}";
    public decimal SharedTotalScore { get; init; }
    public string? GeneralRemarks { get; init; }
    public List<StudentScoreInput> StudentScores { get; init; } = new();
}
