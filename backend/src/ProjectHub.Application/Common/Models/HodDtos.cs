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
    public int CompletedTeams { get; init; }
    public int DraftTeams { get; init; }
    public int ProjectsWithoutGuide { get; init; }
    public int PendingProposals { get; init; }
    public int PendingGradeUnlocks { get; init; }
    public int PendingExceptions { get; init; }
    public int TotalStudentsEnrolled { get; init; }
    public int AvailableMentors { get; init; }
    public DateTime? EvaluationCutoffDateUtc { get; init; }
}

public record UpdateDepartmentEvaluationCutoffRequest
{
    public DateTime? EvaluationCutoffDateUtc { get; init; }
}

public record CreateDepartmentTrackRequest
{
    public string Name { get; init; } = "Minor Project";
    public string? ProjectType { get; init; }
    public string? Description { get; init; }
    public string AcademicYear { get; init; } = "2025-2026";
    public bool LaunchImmediately { get; init; } = true;
    public int MinTeamSize { get; init; } = 2;
    public int MaxTeamSize { get; init; } = 4;
    public Guid? AcademicSessionId { get; init; }
    public Guid? CourseProgramId { get; init; }
    public Guid? SemesterTermId { get; init; }
    public int? SemesterNumber { get; init; }
    public Guid? SubjectOfferingId { get; init; }
    public string? CustomSubjectCode { get; init; }
    public string? CustomSubjectName { get; init; }
    public int? Credits { get; init; }
    public Guid? CurriculumSchemeId { get; init; }
    public Guid? CoordinatorUserId { get; init; }
    public ParticipationMode ParticipationMode { get; init; } = ParticipationMode.Team;
    public EnrolmentMode EnrolmentMode { get; init; } = EnrolmentMode.SelfJoin;
    public bool AllowCrossBranchTeams { get; init; } = false;
    public bool AllowInterdisciplinaryTeams { get; init; } = false;
    public DateTime? RegistrationOpensUtc { get; init; }
    public DateTime? ProposalDeadlineUtc { get; init; }
    public DateTime? FinalSubmissionDeadlineUtc { get; init; }
    public int GuideWeightPct { get; init; } = 30;
    public int MidTermWeightPct { get; init; } = 30;
    public int FinalVivaWeightPct { get; init; } = 40;
    public int SharedProjectRubricPct { get; init; } = 60;
    public int IndividualStudentRubricPct { get; init; } = 40;
}

public record UpdateDepartmentTrackRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public ParticipationMode ParticipationMode { get; init; } = ParticipationMode.Team;
    public EnrolmentMode EnrolmentMode { get; init; } = EnrolmentMode.SelfJoin;
    public bool AllowCrossBranchTeams { get; init; } = false;
    public bool AllowInterdisciplinaryTeams { get; init; } = false;
    public int MinTeamSize { get; init; } = 2;
    public int MaxTeamSize { get; init; } = 4;
    public DateTime? ProposalDeadlineUtc { get; init; }
    public DateTime? FinalSubmissionDeadlineUtc { get; init; }
    public int GuideWeightPct { get; init; } = 30;
    public int MidTermWeightPct { get; init; } = 30;
    public int FinalVivaWeightPct { get; init; } = 40;
    public int SharedProjectRubricPct { get; init; } = 60;
    public int IndividualStudentRubricPct { get; init; } = 40;
}

public record SemesterBatchMappingDto
{
    public int SemesterNumber { get; init; }
    public string AdmissionBatch { get; init; } = string.Empty;
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
    public List<SemesterBatchMappingDto> SemesterBatches { get; init; } = new();
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

public record HodProjectMemberDto
{
    public Guid UserId { get; init; }
    public string FullName { get; init; } = string.Empty;
    public string EnrollmentNumber { get; init; } = string.Empty;
    public bool IsTeamLead { get; init; }
    public string? ModuleResponsibility { get; init; }
}

public record HodProjectDto
{
    public Guid Id { get; init; }
    public string TeamCode { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Abstract { get; init; } = string.Empty;
    public string DomainTag { get; init; } = string.Empty;
    public string SdgCode { get; init; } = string.Empty;
    public ProjectStatus Status { get; init; }
    public Guid AcademicTrackId { get; init; }
    public string? AcademicTrackName { get; init; }
    public Guid? GuideUserId { get; init; }
    public string? GuideName { get; init; }
    public int MemberCount { get; init; }
    public bool IsRosterLocked { get; init; }
    public int MissedLogStreak { get; init; }
    public decimal? SimilarityScorePct { get; init; }
    public string? RepoUrl { get; init; }
    public List<HodProjectMemberDto> Members { get; init; } = new();
    public decimal? LatestEvaluationScore { get; init; }
    public string? LatestEvaluationCheckpoint { get; init; }
    public DateTime CreatedAtUtc { get; init; }
}

public record HodAssignGuideRequest
{
    public Guid GuideUserId { get; init; }
    public string? Reason { get; init; }
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

public record ReturnProposalRequest
{
    public string? Remarks { get; init; }
    public string? Reason { get; init; }
}

public record RejectExceptionRequest
{
    public string? Remarks { get; init; }
    public string? Reason { get; init; }
}

public record BulkApproveProposalsRequest
{
    public List<Guid> TeamIds { get; init; } = new();
}

public record BulkApproveProposalsResponse
{
    public bool Success { get; init; }
    public int ApprovedCount { get; init; }
    public List<Guid> TeamIds { get; init; } = new();
    public string Message { get; init; } = string.Empty;
}

public record GradeUnlockRequestDto
{
    public Guid Id { get; init; }
    public Guid EvaluationId { get; init; }
    public Guid TeamId { get; init; }
    public string TeamCode { get; init; } = string.Empty;
    public string TeamTitle { get; init; } = string.Empty;
    public string RequestedByFacultyName { get; init; } = string.Empty;
    public string Reason { get; init; } = string.Empty;
    public string CheckpointType { get; init; } = string.Empty;
    public DateTime RequestedAtUtc { get; init; }
}

public record ApproveGradeUnlockRequest
{
    public string? Remarks { get; init; }
}

public record RejectGradeUnlockRequest
{
    public string? Remarks { get; init; }
    public string? Reason { get; init; }
}

public record CreateDepartmentFacultyRequest
{
    public string FullName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Designation { get; init; } = "Assistant Professor";
    public int MaxTeams { get; init; } = 4;
}

public record DepartmentStudentResultDto
{
    public string Usn { get; init; } = string.Empty;
    public string StudentName { get; init; } = string.Empty;
    public string TeamCode { get; init; } = string.Empty;
    public string ProjectTitle { get; init; } = string.Empty;
    public decimal GuideScore { get; init; }
    public decimal MidTermScore { get; init; }
    public decimal ExternalVivaScore { get; init; }
    public decimal TotalMarks { get; init; }
    public string LetterGrade { get; init; } = string.Empty;
}

public record HodReportsSummaryDto
{
    public Guid DepartmentId { get; init; }
    public string DepartmentName { get; init; } = string.Empty;
    public string DepartmentCode { get; init; } = string.Empty;
    public int TotalProjects { get; init; }
    public int CompletedProjects { get; init; }
    public int ActiveProjects { get; init; }
    public int AtRiskProjects { get; init; }
    public int ProjectsWithoutGuide { get; init; }
    public int TotalStudents { get; init; }
    public int TotalFaculty { get; init; }
    public decimal AverageFacultyLoad { get; init; }
    public List<TrackReportStatDto> TrackStats { get; init; } = new();
    public List<DomainDistributionDto> DomainDistribution { get; init; } = new();
}

public record TrackReportStatDto
{
    public Guid TrackId { get; init; }
    public string TrackName { get; init; } = string.Empty;
    public int ProjectCount { get; init; }
    public int StudentCount { get; init; }
    public int CompletedCount { get; init; }
}

public record DomainDistributionDto
{
    public string Domain { get; init; } = string.Empty;
    public int Count { get; init; }
}

public record HodDepartmentStudentDto
{
    public Guid Id { get; init; }
    public string FullName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string StudentNumber { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public bool IsActivated { get; init; }
    public string? ProgramName { get; init; }
    public int? CurrentSemesterNumber { get; init; }
    public string? CurrentSemesterName { get; init; }
    public string AcademicStatus { get; init; } = "Not Enrolled";
    public string? AdmissionBatch { get; init; }
    public string? ActiveTeamCode { get; init; }
    public string? ActiveTeamTitle { get; init; }
}

public record UpdateStudentSemesterRequest
{
    public int SemesterNumber { get; init; }
    public AcademicStatus AcademicStatus { get; init; } = AcademicStatus.Active;
    public string? AdmissionBatch { get; init; }
}

public record BulkEnrollStudentsRequest
{
    public List<Guid> StudentIds { get; init; } = new();
    public int SemesterNumber { get; init; }
    public AcademicStatus AcademicStatus { get; init; } = AcademicStatus.Active;
}
