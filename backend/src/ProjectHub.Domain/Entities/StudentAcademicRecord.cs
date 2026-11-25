using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Authoritative, immutable academic record for an individual student for a completed and closed capstone project.
/// Persisted permanently to prevent current-cycle data from overwriting historical academic achievements.
/// </summary>
public class StudentAcademicRecord : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid AcademicTrackId { get; set; }
    public Guid StudentUserId { get; set; }
    public Guid ProjectTeamId { get; set; }
    public Guid ProjectClosureRecordId { get; set; }

    public string ProjectTitle { get; set; } = string.Empty;
    public string ProjectAbstract { get; set; } = string.Empty;
    public string TeamCode { get; set; } = string.Empty;
    public string AcademicYear { get; set; } = string.Empty;
    public string TrackName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string CollegeName { get; set; } = string.Empty;

    public string StudentName { get; set; } = string.Empty;
    public string EnrollmentNumber { get; set; } = string.Empty;
    public string RoleDescription { get; set; } = string.Empty;
    public bool IsTeamLead { get; set; } = false;

    public Guid? GuideUserId { get; set; }
    public string GuideName { get; set; } = string.Empty;

    public VivaOutcome FinalOutcome { get; set; } = VivaOutcome.Pass;
    public decimal SharedTotalScore { get; set; } = 0m;
    public decimal SharedMaxScore { get; set; } = 0m;
    public decimal IndividualContributionScore { get; set; } = 0m;
    public decimal FinalComputedMark { get; set; } = 0m;

    /// <summary>
    /// Serialized JSON array of EvaluatorAssessmentCriterionScoreDto representing approved rubric marks.
    /// </summary>
    public string RubricCriteriaBreakdownJson { get; set; } = "[]";

    public string? VerifiedRepositoryUrl { get; set; }
    public string? VerifiedDemoUrl { get; set; }
    public string? FinalReportFileName { get; set; }
    public string? FinalReportChecksum { get; set; }

    /// <summary>
    /// Unique verification hash for external digital credential and QR code verification.
    /// </summary>
    public string VerificationHash { get; set; } = string.Empty;

    public bool IsVerified { get; set; } = true;
    public DateTime VerifiedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Student consent flag allowing this verified record to appear on their public portfolio transcript.
    /// </summary>
    public bool AllowPublicPortfolio { get; set; } = false;

    // Navigations
    public CollegeTenant? College { get; set; }
    public Department? Department { get; set; }
    public AcademicTrack? AcademicTrack { get; set; }
    public UserAccount? StudentUser { get; set; }
    public UserAccount? GuideUser { get; set; }
    public ProjectTeam? ProjectTeam { get; set; }
    public ProjectClosureRecord? ProjectClosureRecord { get; set; }
}
