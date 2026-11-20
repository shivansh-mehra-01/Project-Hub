using ProjectHub.Domain.Enums;

namespace ProjectHub.Application.Common.Models;

public record HodDashboardDto
{
    public Guid DepartmentId { get; init; }
    public string DepartmentName { get; init; } = string.Empty;
    public string DepartmentCode { get; init; } = string.Empty;
    public int TotalTeams { get; init; }
    public int ActiveBuildTeams { get; init; }
    public int AtRiskTeams { get; init; }
    public int ReadyForVivaTeams { get; init; }
    public int TotalStudentsEnrolled { get; init; }
    public int AvailableMentors { get; init; }
    public decimal NbaDirectAttainmentPct { get; init; }
    public decimal NbaIndirectAttainmentPct { get; init; }
    public decimal NbaBlendedCriterion3Pct { get; init; }
    public bool IsSarAttested { get; init; }
}

public record CreateDepartmentTrackRequest
{
    public string Name { get; init; } = "Minor Project";
    public string AcademicYear { get; init; } = "2025-2026";
    public Guid? AcademicSessionId { get; init; }
    public Guid? CourseProgramId { get; init; }
    public Guid? SemesterTermId { get; init; }
    public int? SemesterNumber { get; init; }
    public Guid? SubjectOfferingId { get; init; }
    public string? CustomSubjectCode { get; init; }
    public string? CustomSubjectName { get; init; }
    public int? Credits { get; init; }
    public Guid? CurriculumSchemeId { get; init; }
    public ParticipationMode ParticipationMode { get; init; } = ParticipationMode.Team;
    public EnrolmentMode EnrolmentMode { get; init; } = EnrolmentMode.SelfJoin;
    public bool AllowCrossBranchTeams { get; init; } = false;
    public bool AllowInterdisciplinaryTeams { get; init; } = false;
    public DateTime? ProposalDeadlineUtc { get; init; }
    public DateTime? FinalSubmissionDeadlineUtc { get; init; }
    public int GuideWeightPct { get; init; } = 30;
    public int MidTermWeightPct { get; init; } = 30;
    public int FinalVivaWeightPct { get; init; } = 40;
    public int SharedProjectRubricPct { get; init; } = 60;
    public int IndividualStudentRubricPct { get; init; } = 40;
}

public record HodAcademicContextDto
{
    public Guid DepartmentId { get; init; }
    public string DepartmentName { get; init; } = string.Empty;
    public string DepartmentCode { get; init; } = string.Empty;
    public Guid? CourseProgramId { get; init; }
    public string? CourseProgramName { get; init; }
    public List<AcademicSessionDto> AvailableSessions { get; init; } = new();
    public List<SemesterTermDto> AvailableSemesters { get; init; } = new();
    public List<SubjectOfferingDto> AvailableOfferings { get; init; } = new();
}

public record ProjectProposalDto
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
    public int MemberCount { get; init; }
    public decimal? SimilarityScorePct { get; init; }
    public string? SimilarProjectCode { get; init; }
}

public record FacultyWorkloadDto
{
    public Guid FacultyId { get; init; }
    public string FullName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string EmployeeCode { get; init; } = string.Empty;
    public bool IsProjectCoordinator { get; init; }
    public int CurrentMentoredTeams { get; init; }
    public int MaxMentorTeams { get; init; }
    public string? SkillsCsv { get; init; }
}

public record ToggleCoordinatorRequest
{
    public bool IsProjectCoordinator { get; init; }
}

public record UpdateMentorCapRequest
{
    public int MaxMentorTeams { get; init; } = 4;
}

public record PoAttainmentScoreDto
{
    public string PoCode { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public decimal DirectAttainmentPct { get; init; }
    public decimal IndirectAttainmentPct { get; init; }
    public decimal BlendedAttainmentPct { get; init; } // 80% Direct + 20% Indirect
    public bool TargetMet { get; init; }
}

public record NbaAttainmentReportDto
{
    public Guid DepartmentId { get; init; }
    public string AcademicYear { get; init; } = string.Empty;
    public decimal OverallDirectPct { get; init; }
    public decimal OverallIndirectPct { get; init; }
    public decimal OverallBlendedPct { get; init; } // 80% direct + 20% indirect
    public List<PoAttainmentScoreDto> PoBreakdown { get; init; } = new();
}

public record ExceptionAuditLogDto
{
    public Guid Id { get; init; }
    public Guid ProjectTeamId { get; init; }
    public string TeamCode { get; init; } = string.Empty;
    public ExceptionActionType ActionType { get; init; }
    public string Reason { get; init; } = string.Empty;
    public string PreviousValueJson { get; init; } = "{}";
    public string NewValueJson { get; init; } = "{}";
    public Guid RequestedByUserId { get; init; }
    public string? RequestedByName { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    public bool IsApproved { get; init; }
    public DateTime? ApprovedAtUtc { get; init; }
}
