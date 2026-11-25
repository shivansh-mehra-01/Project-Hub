using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Formal academic project report and final submission deliverables.
/// Tracked per team with full review iterations, readiness gating, and document integrity.
/// </summary>
public class ProjectReportSubmission : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid ProjectTeamId { get; set; }

    public int VersionNumber { get; set; } = 1;
    public FinalSubmissionStatus Status { get; set; } = FinalSubmissionStatus.Draft;

    // Academic Deliverables Content
    public string ProjectTitle { get; set; } = string.Empty;
    public string Abstract { get; set; } = string.Empty;
    public string ProblemStatement { get; set; } = string.Empty;
    public string Methodology { get; set; } = string.Empty;
    public string ImplementationSummary { get; set; } = string.Empty;
    public string ResultsAndConclusion { get; set; } = string.Empty;
    public string References { get; set; } = string.Empty;

    // Supporting Links & Code Repositories
    public string? RepositoryUrl { get; set; }
    public string? DemoUrl { get; set; }

    // Attached Final Report Document
    public Guid? ReportArtifactId { get; set; }
    public string? ReportStorageKey { get; set; }
    public string? ReportFileName { get; set; }
    public long ReportFileSizeBytes { get; set; }
    public string? ReportSha256Checksum { get; set; }

    // Submission Metadata
    public DateTime? SubmittedAtUtc { get; set; }
    public Guid? SubmittedByUserId { get; set; }

    // Faculty Review Metadata
    public DateTime? ReviewedAtUtc { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public string? ReviewFeedback { get; set; }

    // Navigations
    public ProjectTeam? ProjectTeam { get; set; }
    public TeamArtifact? ReportArtifact { get; set; }
    public UserAccount? SubmittedByUser { get; set; }
    public UserAccount? ReviewedByUser { get; set; }
    public ICollection<SubmissionReviewHistory> ReviewHistories { get; set; } = new List<SubmissionReviewHistory>();
}
