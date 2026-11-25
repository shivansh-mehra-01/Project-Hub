using System.ComponentModel.DataAnnotations;
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
    public Guid? ProjectTeamId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string CategoryTag { get; init; } = string.Empty;
    public Guid? AssignedToUserId { get; init; }
    public string? AssigneeName { get; init; }
    public SprintTaskStatus Status { get; init; }
    public DateTime? DueDateUtc { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    public bool IsOverdue { get; init; }
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
    public Guid? PreferredGuideUserId { get; init; }
    public string? PreferredGuideName { get; init; }
    public GuidePreferenceStatus GuidePreferenceStatus { get; init; } = GuidePreferenceStatus.None;
    public string? GuidePreferenceRemarks { get; init; }
    public string? GuideAllocationRemarks { get; init; }
    public DateTime? GuideAllocatedAtUtc { get; init; }
    public string? RepoUrl { get; init; }
    public string? JiraBoardKey { get; init; }
    public bool IsRosterLocked { get; init; }
    public int MissedLogStreak { get; init; }
    public Guid ProjectLineageId { get; init; }
    public ParticipationMode ParticipationMode { get; init; } = ParticipationMode.Team;
    public EnrolmentMode EnrolmentMode { get; init; } = EnrolmentMode.SelfJoin;
    public bool AllowCrossBranchTeams { get; init; } = false;
    public List<TeamMemberDto> Members { get; init; } = new();
    public List<SprintTaskDto> Tasks { get; init; } = new();
    public List<ProjectMilestoneDto> Milestones { get; init; } = new();
    public List<ArtifactSlotDto> Artifacts { get; init; } = new();
    public List<WeeklyLogDto> WeeklyLogs { get; init; } = new();
}

public record CreateTaskRequest
{
    [Required]
    [MinLength(3)]
    [MaxLength(250)]
    public string Title { get; init; } = string.Empty;
    public string CategoryTag { get; init; } = string.Empty;
    public Guid? AssignedToUserId { get; init; }
    public SprintTaskStatus Status { get; init; } = SprintTaskStatus.Todo;
    public DateTime? DueDateUtc { get; init; }
}

public record UpdateTaskRequest
{
    [MinLength(3)]
    [MaxLength(250)]
    public string? Title { get; init; }
    public string? CategoryTag { get; init; }
    public Guid? AssignedToUserId { get; init; }
    public SprintTaskStatus? Status { get; init; }
    public DateTime? DueDateUtc { get; init; }
}

public record UpdateTaskStatusRequest
{
    public SprintTaskStatus Status { get; init; }
}

public record ProjectProgressDto
{
    public int TotalTasks { get; init; }
    public int CompletedTasks { get; init; }
    public int InProgressTasks { get; init; }
    public int TodoTasks { get; init; }
    public int InReviewTasks { get; init; }
    public int BlockedTasks { get; init; }
    public decimal CompletionPercentage { get; init; }
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

public record StudentProfileDto
{
    public Guid StudentId { get; init; }
    public string FullName { get; init; } = string.Empty;
    public string EnrollmentCode { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string CollegeName { get; init; } = string.Empty;
    public string DepartmentName { get; init; } = string.Empty;
    public string ProgramName { get; init; } = string.Empty;
    public string AdmissionBatch { get; init; } = string.Empty;
    public int CurrentSemester { get; init; }
    public string SemesterName { get; init; } = string.Empty;
    public string AcademicStatus { get; init; } = string.Empty;
    public List<string> Skills { get; init; } = new();
    public string? GitHubHandle { get; init; }
    public string? JiraKey { get; init; }
    public string? PhoneNumber { get; init; }
    public string? Bio { get; init; }
    public int ProfileCompletionPercentage { get; init; }
}

public record UpdateStudentProfileRequest
{
    public List<string>? Skills { get; init; }
    public string? GitHubHandle { get; init; }
    public string? JiraKey { get; init; }
    public string? PhoneNumber { get; init; }
    public string? Bio { get; init; }
}

public record StudentIdentitySummaryDto
{
    public Guid StudentId { get; init; }
    public string FullName { get; init; } = string.Empty;
    public string EnrollmentCode { get; init; } = string.Empty;
    public string Usn => EnrollmentCode;
    public string CollegeCode { get; init; } = "SISTEC";
    public string DepartmentCode { get; init; } = "CSE";
    public string Email { get; init; } = string.Empty;
    public string CollegeName { get; init; } = string.Empty;
    public string DepartmentName { get; init; } = string.Empty;
}

public record AcademicSessionSummaryDto
{
    public Guid SessionId { get; init; }
    public string SessionLabel { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public bool IsOffseason { get; init; }
    public DateTime StartDate { get; init; }
    public DateTime EndDate { get; init; }
    public DateTime? ExamCutoffDateUtc { get; init; }
}

public record AcademicEnrollmentSummaryDto
{
    public Guid EnrollmentId { get; init; }
    public string ProgramName { get; init; } = string.Empty;
    public string Program => ProgramName;
    public string DepartmentName { get; init; } = string.Empty;
    public int CurrentSemester { get; init; }
    public int Semester => CurrentSemester;
    public string SemesterName { get; init; } = string.Empty;
    public string AdmissionBatch { get; init; } = string.Empty;
    public string AcademicStatus { get; init; } = string.Empty;
}

public record DashboardProjectSummaryDto
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
    public string? GuideEmail { get; init; }
    public Guid? PreferredGuideUserId { get; init; }
    public string? PreferredGuideName { get; init; }
    public GuidePreferenceStatus GuidePreferenceStatus { get; init; } = GuidePreferenceStatus.None;
    public string? GuidePreferenceRemarks { get; init; }
    public string? GuideAllocationRemarks { get; init; }
    public bool IsTeamLead { get; init; }
    public bool IsRosterLocked { get; init; }
    public string? RepoUrl { get; init; }
    public string? JiraBoardKey { get; init; }
    public List<TeamMemberDto> Members { get; init; } = new();
    public int PendingTasksCount { get; init; }
    public int CompletedTasksCount { get; init; }
    public SprintTaskDto? NextUpcomingTask { get; init; }
    public string RecentLogbookStatus { get; init; } = "Missing";
    public int MissedLogStreak { get; init; }
    public List<ArtifactSlotDto> Artifacts { get; init; } = new();
    public string? ProposalRemarks { get; init; }
}

public record DashboardActionCapabilitiesDto
{
    public bool CanProposeProject { get; init; }
    public bool CanFormTeam { get; init; }
    public bool CanSubmitTasks { get; init; }
    public bool CanSubmitLogs { get; init; }
    public bool CanUploadArtifacts { get; init; }
    public bool CanViewEvaluations { get; init; }
}

public record StudentDashboardDto
{
    public StudentIdentitySummaryDto Student { get; init; } = new();
    public StudentIdentitySummaryDto Identity => Student;
    public AcademicSessionSummaryDto? AcademicSession { get; init; }
    public AcademicSessionSummaryDto? ActiveSession => AcademicSession;
    public AcademicEnrollmentSummaryDto? Enrollment { get; init; }
    public AcademicEnrollmentSummaryDto? ActiveEnrollment => Enrollment;
    public string AllocationState { get; init; } = string.Empty;
    public bool HasActiveProject { get; init; }
    public DashboardProjectSummaryDto? ActiveProject { get; init; }
    public List<DashboardProjectSummaryDto> HistoricalProjects { get; init; } = new();
    public List<DashboardProjectSummaryDto> HistoricalTeams => HistoricalProjects;
    public DashboardActionCapabilitiesDto Capabilities { get; init; } = new();
    public int ProfileCompletionPercentage { get; init; } = 75;
}

// =========================================================================
// PHASE 3: PROJECT DISCOVERY, PROBLEM BANK & IDEA REGISTRATION DTOs
// =========================================================================

public record ProblemBankStatementDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Abstract { get; init; } = string.Empty;
    public string SdgCode { get; init; } = string.Empty;
    public List<string> Prerequisites { get; init; } = new();
    public int MaxTeamCapacity { get; init; } = 4;
    public bool IsAllocated { get; init; }
    public Guid ProposedByFacultyId { get; init; }
    public string FacultyName { get; init; } = string.Empty;
    public string DepartmentName { get; init; } = string.Empty;
    public string DepartmentCode { get; init; } = string.Empty;
    public string AcademicTrackName { get; init; } = string.Empty;
    public DateTime CreatedAtUtc { get; init; }
}

public record ArchivedProjectSummaryDto
{
    public Guid TeamId { get; init; }
    public string TeamCode { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Abstract { get; init; } = string.Empty;
    public string DomainTag { get; init; } = string.Empty;
    public string SdgCode { get; init; } = string.Empty;
    public string AcademicYear { get; init; } = string.Empty;
    public string TrackName { get; init; } = string.Empty;
    public string GuideName { get; init; } = string.Empty;
    public string? RepoUrl { get; init; }
    public string Status { get; init; } = string.Empty;
    public int MemberCount { get; init; }
    public decimal? SimilarityScorePct { get; init; }
}

public record CreateProjectIdeaRequest
{
    public string Title { get; init; } = string.Empty;
    public string Abstract { get; init; } = string.Empty;
    public string DomainTag { get; init; } = string.Empty;
    public string SdgCode { get; init; } = string.Empty;
    public Guid? GuideUserId { get; init; }
    public Guid? AcademicTrackId { get; init; }
    public Guid? AdoptedProblemBankId { get; init; }
}

public record UpdateProjectIdeaRequest
{
    public string? Title { get; init; }
    public string? Abstract { get; init; }
    public string? DomainTag { get; init; }
    public string? SdgCode { get; init; }
    public Guid? GuideUserId { get; init; }
}

public record CheckSimilarityRequest
{
    public string Title { get; init; } = string.Empty;
    public string? Abstract { get; init; }
    public Guid? ExcludeTeamId { get; init; }
}

public record SimilarityCheckResultDto
{
    public decimal SimilarityScorePct { get; init; }
    public string? SimilarProjectCode { get; init; }
    public string? SimilarProjectTitle { get; init; }
    public bool IsWarning { get; init; }
    public string Message { get; init; } = string.Empty;
}

public record ProjectReviewTimelineItemDto
{
    public string Stage { get; init; } = string.Empty;
    public string Action { get; init; } = string.Empty;
    public string Remarks { get; init; } = string.Empty;
    public string? ReviewerName { get; init; }
    public DateTime OccurredAtUtc { get; init; }
}

public record ProjectIdeaDto
{
    public Guid Id { get; init; }
    public string TeamCode { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Abstract { get; init; } = string.Empty;
    public string DomainTag { get; init; } = string.Empty;
    public string SdgCode { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public Guid? GuideUserId { get; init; }
    public string? GuideName { get; init; }
    public string? GuideEmail { get; init; }
    public bool IsLeader { get; init; }
    public bool IsRosterLocked { get; init; }
    public decimal? SimilarityScorePct { get; init; }
    public string? SimilarProjectCode { get; init; }
    public string? LatestReviewRemarks { get; init; }
    public string? LatestReviewerName { get; init; }
    public DateTime? LatestReviewedAtUtc { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    public List<TeamMemberDto> Members { get; init; } = new();
    public List<ProjectReviewTimelineItemDto> ReviewHistory { get; init; } = new();
}

public record SubmitProposalRequest
{
    public string? Remarks { get; init; }
}

// =========================================================================
// PHASE 4: TEAM FORMATION, MEMBERSHIP & INVITATION DTOs
// =========================================================================

public record EligiblePeerDto
{
    public Guid StudentId { get; init; }
    public string FullName { get; init; } = string.Empty;
    public string EnrollmentCode { get; init; } = string.Empty;
    public string DepartmentCode { get; init; } = string.Empty;
    public string DepartmentName { get; init; } = string.Empty;
    public string ProgramName { get; init; } = string.Empty;
    public int CurrentSemester { get; init; }
    public List<string> Skills { get; init; } = new();
    public string? Bio { get; init; }
    public string? GitHubHandle { get; init; }
    public bool IsInvited { get; init; }
}

public record CreateStudentTeamRequest
{
    public string Title { get; init; } = string.Empty;
    public string Abstract { get; init; } = string.Empty;
    public string? DomainTag { get; init; }
    public string? SdgCode { get; init; }
    public Guid? AcademicTrackId { get; init; }
}

public record SendTeamInvitationRequest
{
    public Guid? InviteeStudentId { get; init; }
    public string? EnrollmentCode { get; init; }
    public string? Message { get; init; }
}

public record TeamInvitationDto
{
    public Guid Id { get; init; }
    public Guid ProjectTeamId { get; init; }
    public string TeamCode { get; init; } = string.Empty;
    public string ProjectTitle { get; init; } = string.Empty;
    public Guid InviterStudentId { get; init; }
    public string InviterName { get; init; } = string.Empty;
    public Guid InviteeStudentId { get; init; }
    public string InviteeName { get; init; } = string.Empty;
    public string InviteeEnrollmentCode { get; init; } = string.Empty;
    public ProjectHub.Domain.Enums.InvitationStatus Status { get; init; }
    public string StatusText => Status.ToString();
    public string? Message { get; init; }
    public DateTime InvitedAtUtc { get; init; }
    public DateTime? ExpiresAtUtc { get; init; }
    public DateTime? RespondedAtUtc { get; init; }
    public string? ResponseNotes { get; init; }
    public int CurrentTeamSize { get; init; }
    public int MaxTeamCapacity { get; init; } = 4;
    public bool IsRosterLocked { get; init; }
}

public record RespondInvitationRequest
{
    public string? ResponseNotes { get; init; }
}

public record TransferTeamLeadRequest
{
    public Guid TargetStudentId { get; init; }
}

public record StudentTeamRosterDto
{
    public Guid TeamId { get; init; }
    public string TeamCode { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Abstract { get; init; } = string.Empty;
    public ProjectHub.Domain.Enums.ProjectStatus Status { get; init; }
    public bool IsRosterLocked { get; init; }
    public bool IsCallerLead { get; init; }
    public int MinTeamSize { get; init; } = 2;
    public int MaxTeamSize { get; init; } = 4;
    public int CurrentMemberCount => Members.Count;
    public List<TeamMemberDto> Members { get; init; } = new();
    public List<TeamInvitationDto> PendingInvitations { get; init; } = new();

    // Phase 5: Guide Details
    public Guid? GuideUserId { get; init; }
    public string? GuideName { get; init; }
    public Guid? PreferredGuideUserId { get; init; }
    public string? PreferredGuideName { get; init; }
    public GuidePreferenceStatus GuidePreferenceStatus { get; init; } = GuidePreferenceStatus.None;
    public string? GuidePreferenceRemarks { get; init; }
    public string? GuideAllocationRemarks { get; init; }
    public DateTime? GuideAllocatedAtUtc { get; init; }
}

public record FacultyGuideSummaryDto
{
    public Guid Id { get; init; }
    public string FullName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string? EmployeeCode { get; init; }
    public string? Designation { get; init; }
    public string? DepartmentCode { get; init; }
    public string? SkillsCsv { get; init; }
    public int CurrentMentoredTeams { get; init; }
    public int MaxMentorTeams { get; init; } = 4;
    public bool IsAvailable => CurrentMentoredTeams < MaxMentorTeams;
}

// =========================================================================
// PHASE 5: OFFICIAL GUIDE ALLOCATION & PREFERENCE DTOs
// =========================================================================

public record SubmitGuidePreferenceRequest
{
    [Required]
    public Guid GuideUserId { get; init; }

    [StringLength(500, ErrorMessage = "Remarks cannot exceed 500 characters.")]
    public string? Remarks { get; init; }
}

public record GuideReassignmentHistoryItemDto
{
    public Guid Id { get; init; }
    public Guid? PreviousGuideId { get; init; }
    public string? PreviousGuideName { get; init; }
    public Guid NewGuideId { get; init; }
    public string NewGuideName { get; init; } = string.Empty;
    public string Reason { get; init; } = string.Empty;
    public string ApprovedByName { get; init; } = string.Empty;
    public DateTime ApprovedAtUtc { get; init; }
}

public record StudentGuidePreferenceDto
{
    public Guid TeamId { get; init; }
    public string TeamCode { get; init; } = string.Empty;
    public string ProjectTitle { get; init; } = string.Empty;
    public ProjectHub.Domain.Enums.ProjectStatus Status { get; init; }
    public bool IsRosterLocked { get; init; }
    public bool IsCallerLead { get; init; }

    // Preferred Guide
    public Guid? PreferredGuideUserId { get; init; }
    public string? PreferredGuideName { get; init; }
    public string? PreferredGuideEmail { get; init; }
    public string? PreferredGuideDesignation { get; init; }
    public string? PreferredGuideDepartmentCode { get; init; }
    public string? PreferredGuideSkills { get; init; }
    public GuidePreferenceStatus GuidePreferenceStatus { get; init; } = GuidePreferenceStatus.None;
    public DateTime? GuidePreferenceSubmittedAtUtc { get; init; }
    public string? GuidePreferenceRemarks { get; init; }

    // Officially Allocated Guide
    public Guid? OfficiallyAllocatedGuideUserId { get; init; }
    public string? OfficiallyAllocatedGuideName { get; init; }
    public string? OfficiallyAllocatedGuideEmail { get; init; }
    public string? OfficiallyAllocatedGuideDesignation { get; init; }
    public string? OfficiallyAllocatedGuideDepartmentCode { get; init; }
    public DateTime? GuideAllocatedAtUtc { get; init; }
    public string? GuideAllocatedByName { get; init; }
    public string? GuideAllocationRemarks { get; init; }

    public bool IsOfficialGuideAssigned => OfficiallyAllocatedGuideUserId.HasValue;
    public bool CanModifyPreference { get; init; }
    public List<GuideReassignmentHistoryItemDto> ReassignmentHistory { get; init; } = new();
}

public record RejectGuidePreferenceRequest
{
    [Required]
    [StringLength(500, MinimumLength = 5, ErrorMessage = "Rejection reason must be between 5 and 500 characters.")]
    public string Reason { get; init; } = string.Empty;
}
