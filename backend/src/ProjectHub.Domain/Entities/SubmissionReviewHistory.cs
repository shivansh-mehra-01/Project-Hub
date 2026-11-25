using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Historical record of faculty reviews, revisions, and feedback iterations on final project submissions.
/// </summary>
public class SubmissionReviewHistory : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid ProjectReportSubmissionId { get; set; }
    public int SubmissionVersion { get; set; }
    public Guid ReviewerUserId { get; set; }
    public FinalSubmissionStatus ResultStatus { get; set; }
    public string Feedback { get; set; } = string.Empty;
    public DateTime ReviewedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigations
    public ProjectReportSubmission? ProjectReportSubmission { get; set; }
    public UserAccount? ReviewerUser { get; set; }
}
