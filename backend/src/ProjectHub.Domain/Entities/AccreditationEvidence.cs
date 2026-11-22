using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Institutional or departmental documentary proof uploaded to substantiate an accreditation metric.
/// </summary>
public class AccreditationEvidence : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid CycleId { get; set; }
    public Guid? MetricId { get; set; }

    public string CriterionCode { get; set; } = "Criterion 1";
    public string MetricCode { get; set; } = "1.1";
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>
    /// Storage key / relative URI pointing to the document in secure storage.
    /// </summary>
    public string StorageKey { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string FileType { get; set; } = "application/pdf";

    public Guid UploadedByUserId { get; set; }
    public string UploadedByName { get; set; } = string.Empty;
    public string UploadedByRole { get; set; } = "College Admin";

    /// <summary>
    /// Verification status: "Draft", "UnderReview", "Approved", "Rejected".
    /// </summary>
    public string Status { get; set; } = "UnderReview";
    public string? ReviewNote { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public string? ReviewedByName { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }

    // Navigations
    public CollegeTenant? College { get; set; }
    public AccreditationCycle? Cycle { get; set; }
    public AccreditationMetric? Metric { get; set; }
}
