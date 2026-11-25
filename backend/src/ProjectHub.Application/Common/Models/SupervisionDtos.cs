using System.ComponentModel.DataAnnotations;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Application.Common.Models;

// =========================================================================
// PHASE 7: FACULTY SUPERVISION, PROJECT REVIEWS & MILESTONE WORKFLOW DTOs
// =========================================================================

public record MilestoneReviewHistoryDto
{
    public Guid Id { get; init; }
    public Guid ProjectMilestoneId { get; init; }
    public Guid ReviewerUserId { get; init; }
    public string ReviewerName { get; init; } = string.Empty;
    public MilestoneStatus ResultStatus { get; init; }
    public string Feedback { get; init; } = string.Empty;
    public DateTime ReviewedAtUtc { get; init; }
}

public record ProjectMilestoneDto
{
    public Guid Id { get; init; }
    public Guid ProjectTeamId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public DateTime TargetDateUtc { get; init; }
    public MilestoneStatus Status { get; init; }
    public int RequiredTaskCompletionPercentage { get; init; }
    public DateTime? SubmittedAtUtc { get; init; }
    public Guid? SubmittedByUserId { get; init; }
    public string? SubmittedByName { get; init; }
    public string? SubmissionEvidenceUrl { get; init; }
    public DateTime? ReviewedAtUtc { get; init; }
    public Guid? ReviewedByUserId { get; init; }
    public string? ReviewedByName { get; init; }
    public string? ReviewFeedback { get; init; }
    public bool IsOverdue { get; init; }
    public List<MilestoneReviewHistoryDto> ReviewHistories { get; init; } = new();
}

public record CreateMilestoneRequest
{
    [Required]
    [MinLength(3, ErrorMessage = "Title must be at least 3 characters.")]
    [MaxLength(250, ErrorMessage = "Title cannot exceed 250 characters.")]
    public string Title { get; init; } = string.Empty;

    [Required]
    [MinLength(5, ErrorMessage = "Description must be at least 5 characters.")]
    [MaxLength(2000, ErrorMessage = "Description cannot exceed 2000 characters.")]
    public string Description { get; init; } = string.Empty;

    [Required]
    public DateTime TargetDateUtc { get; init; }

    [Range(0, 100, ErrorMessage = "Required task completion percentage must be between 0 and 100.")]
    public int RequiredTaskCompletionPercentage { get; init; } = 0;
}

public record UpdateMilestoneRequest
{
    [Required]
    [MinLength(3, ErrorMessage = "Title must be at least 3 characters.")]
    [MaxLength(250, ErrorMessage = "Title cannot exceed 250 characters.")]
    public string Title { get; init; } = string.Empty;

    [Required]
    [MinLength(5, ErrorMessage = "Description must be at least 5 characters.")]
    [MaxLength(2000, ErrorMessage = "Description cannot exceed 2000 characters.")]
    public string Description { get; init; } = string.Empty;

    [Required]
    public DateTime TargetDateUtc { get; init; }

    [Range(0, 100, ErrorMessage = "Required task completion percentage must be between 0 and 100.")]
    public int RequiredTaskCompletionPercentage { get; init; } = 0;
}

public record SubmitMilestoneRequest
{
    [Required]
    [MinLength(5, ErrorMessage = "Submission evidence URL or note must be at least 5 characters.")]
    [MaxLength(1000, ErrorMessage = "Submission evidence cannot exceed 1000 characters.")]
    public string SubmissionEvidenceUrl { get; init; } = string.Empty;

    [MaxLength(1000, ErrorMessage = "Submission notes cannot exceed 1000 characters.")]
    public string? SubmissionNotes { get; init; }
}

public record ReviewMilestoneRequest
{
    [Required]
    public bool IsApproved { get; init; }

    [Required]
    [MinLength(5, ErrorMessage = "Review feedback must be at least 5 characters.")]
    [MaxLength(2000, ErrorMessage = "Review feedback cannot exceed 2000 characters.")]
    public string Feedback { get; init; } = string.Empty;
}

public record SupervisionVerifyLogRequest
{
    [Required]
    public bool IsVerified { get; init; }

    [MaxLength(500, ErrorMessage = "Mentor remarks cannot exceed 500 characters.")]
    public string? MentorRemarks { get; init; }
}

public record SupervisedTeamSummaryDto
{
    public Guid TeamId { get; init; }
    public string TeamCode { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string TrackName { get; init; } = string.Empty;
    public string DepartmentName { get; init; } = string.Empty;
    public ProjectStatus Status { get; init; }
    public int MemberCount { get; init; }
    public string? TeamLeadName { get; init; }
    public DateTime? GuideAllocatedAtUtc { get; init; }
    public int CompletedTasksCount { get; init; }
    public int TotalTasksCount { get; init; }
    public int CompletedMilestonesCount { get; init; }
    public int TotalMilestonesCount { get; init; }
    public int PendingReviewsCount { get; init; }
}

public record SupervisionDashboardDto
{
    public int SupervisedTeamsCount { get; init; }
    public int ActiveStudentsCount { get; init; }
    public int PendingMilestoneReviewsCount { get; init; }
    public int PendingArtifactReviewsCount { get; init; }
    public int PendingWeeklyLogsCount { get; init; }
    public int OverdueTasksCount { get; init; }
    public List<SupervisedTeamSummaryDto> Teams { get; init; } = new();
}

public record SupervisedTeamDetailDto
{
    public Guid TeamId { get; init; }
    public string TeamCode { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Abstract { get; init; } = string.Empty;
    public string DomainTag { get; init; } = string.Empty;
    public string SdgCode { get; init; } = string.Empty;
    public ProjectStatus Status { get; init; }
    public string? RepoUrl { get; init; }
    public string? JiraBoardKey { get; init; }
    public int MissedLogStreak { get; init; }
    public DateTime? GuideAllocatedAtUtc { get; init; }
    public string? GuideAllocationRemarks { get; init; }
    public List<TeamMemberDto> Members { get; init; } = new();
    public List<SprintTaskDto> Tasks { get; init; } = new();
    public List<ProjectMilestoneDto> Milestones { get; init; } = new();
    public List<ArtifactSlotDto> Artifacts { get; init; } = new();
    public List<WeeklyLogDto> WeeklyLogs { get; init; } = new();
}

// =========================================================================
// PHASE 8: PROJECT REPORTS, FINAL SUBMISSION & ACADEMIC DELIVERABLES DTOs
// =========================================================================

public record SubmissionReviewHistoryDto
{
    public Guid Id { get; init; }
    public Guid ProjectReportSubmissionId { get; init; }
    public int SubmissionVersion { get; init; }
    public Guid ReviewerUserId { get; init; }
    public string ReviewerName { get; init; } = string.Empty;
    public FinalSubmissionStatus ResultStatus { get; init; }
    public string Feedback { get; init; } = string.Empty;
    public DateTime ReviewedAtUtc { get; init; }
}

public record SubmissionReadinessDto
{
    public bool HasAllocatedGuide { get; init; }
    public string? AllocatedGuideName { get; init; }
    public bool HasApprovedMilestones { get; init; }
    public int ApprovedMilestonesCount { get; init; }
    public bool HasPendingMilestonesInReview { get; init; }
    public int PendingMilestonesCount { get; init; }
    public bool HasRequiredAcademicFields { get; init; }
    public bool HasAttachedReport { get; init; }
    public bool IsEligibleForSubmission { get; init; }
    public List<string> BlockingReasons { get; init; } = new();
}

public record ProjectReportSubmissionDto
{
    public Guid Id { get; init; }
    public Guid ProjectTeamId { get; init; }
    public int VersionNumber { get; init; }
    public FinalSubmissionStatus Status { get; init; }
    public string ProjectTitle { get; init; } = string.Empty;
    public string Abstract { get; init; } = string.Empty;
    public string ProblemStatement { get; init; } = string.Empty;
    public string Methodology { get; init; } = string.Empty;
    public string ImplementationSummary { get; init; } = string.Empty;
    public string ResultsAndConclusion { get; init; } = string.Empty;
    public string References { get; init; } = string.Empty;
    public string? RepositoryUrl { get; init; }
    public string? DemoUrl { get; init; }
    public Guid? ReportArtifactId { get; init; }
    public string? ReportFileName { get; init; }
    public long ReportFileSizeBytes { get; init; }
    public string? ReportSha256Checksum { get; init; }
    public DateTime? SubmittedAtUtc { get; init; }
    public Guid? SubmittedByUserId { get; init; }
    public string? SubmittedByName { get; init; }
    public DateTime? ReviewedAtUtc { get; init; }
    public Guid? ReviewedByUserId { get; init; }
    public string? ReviewedByName { get; init; }
    public string? ReviewFeedback { get; init; }
    public SubmissionReadinessDto? Readiness { get; init; }
    public List<SubmissionReviewHistoryDto> ReviewHistories { get; init; } = new();
}

public record SaveSubmissionDraftRequest
{
    [Required]
    [MinLength(3, ErrorMessage = "Project title must be at least 3 characters.")]
    [MaxLength(250, ErrorMessage = "Project title cannot exceed 250 characters.")]
    public string ProjectTitle { get; init; } = string.Empty;

    [Required]
    [MinLength(20, ErrorMessage = "Abstract must be at least 20 characters.")]
    [MaxLength(4000, ErrorMessage = "Abstract cannot exceed 4000 characters.")]
    public string Abstract { get; init; } = string.Empty;

    [MaxLength(4000, ErrorMessage = "Problem statement cannot exceed 4000 characters.")]
    public string ProblemStatement { get; init; } = string.Empty;

    [MaxLength(4000, ErrorMessage = "Methodology cannot exceed 4000 characters.")]
    public string Methodology { get; init; } = string.Empty;

    [MaxLength(4000, ErrorMessage = "Implementation summary cannot exceed 4000 characters.")]
    public string ImplementationSummary { get; init; } = string.Empty;

    [MaxLength(4000, ErrorMessage = "Results and conclusion cannot exceed 4000 characters.")]
    public string ResultsAndConclusion { get; init; } = string.Empty;

    [MaxLength(4000, ErrorMessage = "References cannot exceed 4000 characters.")]
    public string References { get; init; } = string.Empty;

    [MaxLength(1000, ErrorMessage = "Repository URL cannot exceed 1000 characters.")]
    public string? RepositoryUrl { get; init; }

    [MaxLength(1000, ErrorMessage = "Demo URL cannot exceed 1000 characters.")]
    public string? DemoUrl { get; init; }
}

public record AttachReportDeliverableRequest
{
    public Guid? ReportArtifactId { get; init; }
    [MaxLength(255)]
    public string? ReportFileName { get; init; }
    public long ReportFileSizeBytes { get; init; }
    [MaxLength(64)]
    public string? ReportSha256Checksum { get; init; }
}

public record SubmitFinalReportRequest
{
    [MaxLength(1000, ErrorMessage = "Submission notes cannot exceed 1000 characters.")]
    public string? SubmissionNotes { get; init; }
}

public record ReviewFinalSubmissionRequest
{
    [Required]
    public bool IsApproved { get; init; }

    [Required]
    [MinLength(5, ErrorMessage = "Review feedback must be at least 5 characters.")]
    [MaxLength(2000, ErrorMessage = "Review feedback cannot exceed 2000 characters.")]
    public string Feedback { get; init; } = string.Empty;
}
