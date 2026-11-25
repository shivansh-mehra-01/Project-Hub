using System.ComponentModel.DataAnnotations;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Application.Common.Models;

// =========================================================================
// PHASE 10: PROJECT CLOSURE, ACADEMIC RECORDS & VERIFIED PORTFOLIO DTOs
// =========================================================================

public record ClosureReadinessDto
{
    public Guid ProjectTeamId { get; init; }
    public string TeamCode { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public ProjectStatus Status { get; init; }
    public bool CanClose { get; init; }
    public List<string> BlockingReasons { get; init; } = new();

    public bool EvaluationPublished { get; init; }
    public VivaOutcome? EvaluationOutcome { get; init; }

    public bool FinalReportAccepted { get; init; }
    public string? ReportFileName { get; init; }

    public bool IndividualScoresFinalized { get; init; }
    public int TotalMembersCount { get; init; }
    public int ScoredMembersCount { get; init; }

    public bool IsClosed { get; init; }
    public ProjectClosureResultDto? ExistingClosure { get; init; }
}

public record CloseProjectRequest
{
    [Required]
    [MinLength(5, ErrorMessage = "Closure remarks must be at least 5 characters.")]
    [MaxLength(2000, ErrorMessage = "Closure remarks cannot exceed 2000 characters.")]
    public string ClosureRemarks { get; init; } = string.Empty;
}

public record ReopenProjectRequest
{
    [Required]
    [MinLength(10, ErrorMessage = "Reopening reason must be at least 10 characters.")]
    [MaxLength(1000, ErrorMessage = "Reopening reason cannot exceed 1000 characters.")]
    public string Reason { get; init; } = string.Empty;
}

public record StudentAcademicRecordSummaryDto
{
    public Guid RecordId { get; init; }
    public Guid StudentUserId { get; init; }
    public string StudentName { get; init; } = string.Empty;
    public string EnrollmentNumber { get; init; } = string.Empty;
    public string RoleDescription { get; init; } = string.Empty;
    public decimal FinalComputedMark { get; init; }
    public string VerificationHash { get; init; } = string.Empty;
}

public record ProjectClosureResultDto
{
    public Guid ClosureRecordId { get; init; }
    public Guid ProjectTeamId { get; init; }
    public string TeamCode { get; init; } = string.Empty;
    public ProjectClosureStatus Status { get; init; }
    public string ClosureCertificateHash { get; init; } = string.Empty;
    public DateTime ClosedAtUtc { get; init; }
    public string ClosedByName { get; init; } = string.Empty;
    public string ClosureRemarks { get; init; } = string.Empty;
    public bool IsArchived { get; init; }
    public int AcademicRecordsGenerated { get; init; }
    public List<StudentAcademicRecordSummaryDto> GeneratedStudentRecords { get; init; } = new();
}

public record StudentAcademicRecordDto
{
    public Guid Id { get; init; }
    public Guid ProjectTeamId { get; init; }
    public string ProjectTitle { get; init; } = string.Empty;
    public string ProjectAbstract { get; init; } = string.Empty;
    public string TeamCode { get; init; } = string.Empty;
    public string AcademicYear { get; init; } = string.Empty;
    public string TrackName { get; init; } = string.Empty;
    public string DepartmentName { get; init; } = string.Empty;
    public string CollegeName { get; init; } = string.Empty;
    public string StudentName { get; init; } = string.Empty;
    public string EnrollmentNumber { get; init; } = string.Empty;
    public string RoleDescription { get; init; } = string.Empty;
    public bool IsTeamLead { get; init; }
    public Guid? GuideUserId { get; init; }
    public string GuideName { get; init; } = string.Empty;
    public VivaOutcome FinalOutcome { get; init; }
    public decimal SharedTotalScore { get; init; }
    public decimal SharedMaxScore { get; init; }
    public decimal IndividualContributionScore { get; init; }
    public decimal FinalComputedMark { get; init; }
    public List<EvaluatorAssessmentCriterionScoreDto> RubricCriteriaBreakdown { get; init; } = new();
    public string? VerifiedRepositoryUrl { get; init; }
    public string? VerifiedDemoUrl { get; init; }
    public string? FinalReportFileName { get; init; }
    public string? FinalReportChecksum { get; init; }
    public string VerificationHash { get; init; } = string.Empty;
    public bool IsVerified { get; init; }
    public DateTime VerifiedAtUtc { get; init; }
    public bool AllowPublicPortfolio { get; init; }
}

public record VerifiedStudentPortfolioDto
{
    public Guid StudentUserId { get; init; }
    public string StudentName { get; init; } = string.Empty;
    public string EnrollmentNumber { get; init; } = string.Empty;
    public string DepartmentName { get; init; } = string.Empty;
    public string CollegeName { get; init; } = string.Empty;
    public bool AllowPublicPortfolio { get; init; }
    public string PublicPortfolioShareUrl { get; init; } = string.Empty;
    public List<StudentAcademicRecordDto> Projects { get; init; } = new();
}

public record UpdatePortfolioVisibilityRequest
{
    public bool AllowPublicPortfolio { get; init; }
}

public record PublicPortfolioProjectDto
{
    public string ProjectTitle { get; init; } = string.Empty;
    public string ProjectAbstract { get; init; } = string.Empty;
    public string TrackName { get; init; } = string.Empty;
    public string AcademicYear { get; init; } = string.Empty;
    public string RoleDescription { get; init; } = string.Empty;
    public string GuideName { get; init; } = string.Empty;
    public VivaOutcome FinalOutcome { get; init; }
    public decimal? FinalScorePercentage { get; init; }
    public string? VerifiedRepositoryUrl { get; init; }
    public string? VerifiedDemoUrl { get; init; }
    public string VerificationHash { get; init; } = string.Empty;
    public DateTime VerifiedAtUtc { get; init; }
}

public record PublicStudentPortfolioDto
{
    public string StudentName { get; init; } = string.Empty;
    public string EnrollmentNumber { get; init; } = string.Empty;
    public string DepartmentName { get; init; } = string.Empty;
    public string CollegeName { get; init; } = string.Empty;
    public string InstitutionalAttestation { get; init; } = string.Empty;
    public List<PublicPortfolioProjectDto> VerifiedProjects { get; init; } = new();
}
