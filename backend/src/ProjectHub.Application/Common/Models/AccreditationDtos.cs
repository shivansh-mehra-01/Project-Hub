namespace ProjectHub.Application.Common.Models;

public class AccreditationOverviewDto
{
    public int ActiveFrameworks { get; set; }
    public int AccreditationPrograms { get; set; }
    public int PendingReviews { get; set; }
    public int EvidenceDocuments { get; set; }
    public List<AccreditationCycleDto> Cycles { get; set; } = new();
    public List<AccreditationActivityDto> RecentActivities { get; set; } = new();
    public List<FrameworkSummaryDto> FrameworkSummaries { get; set; } = new();
}

public class FrameworkSummaryDto
{
    public string FrameworkId { get; set; } = string.Empty;
    public string FrameworkCode { get; set; } = "NBA";
    public string FrameworkName { get; set; } = string.Empty;
    public string Level { get; set; } = "Program";
    public int ActiveCyclesCount { get; set; }
    public int ProgramsConfigured { get; set; }
    public string CurrentStatus { get; set; } = "Active";
    public string LatestVersionLabel { get; set; } = string.Empty;
    public decimal OverallCompletionPct { get; set; }
}

public class AccreditationFrameworkDto
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = "NBA";
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Level { get; set; } = "Program";
    public string? LogoUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public int VersionsCount { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class FrameworkVersionDto
{
    public string Id { get; set; } = string.Empty;
    public string FrameworkId { get; set; } = string.Empty;
    public string FrameworkCode { get; set; } = "NBA";
    public string VersionLabel { get; set; } = string.Empty;
    public int EffectiveFromYear { get; set; }
    public int? EffectiveToYear { get; set; }
    public bool IsLatest { get; set; }
    public bool IsLocked { get; set; }
    public int CriteriaCount { get; set; }
    public int MetricsCount { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class AccreditationCycleDto
{
    public Guid Id { get; set; }
    public Guid CollegeId { get; set; }
    public string FrameworkId { get; set; } = "fw-nba";
    public string FrameworkCode { get; set; } = "NBA";
    public string FrameworkName { get; set; } = "National Board of Accreditation";
    public string VersionId { get; set; } = "ver-nba-2025";
    public string VersionLabel { get; set; } = "NBA Tier-II SAR Manual (Rev. 2025)";
    public string Level { get; set; } = "Program";
    public Guid? ProgramId { get; set; }
    public string? ProgramName { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentCode { get; set; }
    public string CycleName { get; set; } = string.Empty;
    public string AcademicYear { get; set; } = "2026–2027";
    public string Status { get; set; } = "DataCollection";
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public decimal? OverallScore { get; set; }
    public string? OverallGrade { get; set; }
    public decimal CompletionPct { get; set; }
    public int PendingReviews { get; set; }
    public int EvidenceCount { get; set; }
    public bool IsAttested { get; set; }
    public DateTime? AttestedAtUtc { get; set; }
    public string? AttestedByName { get; set; }
    public string? AttestationRemarks { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public class CreateCycleRequest
{
    public string FrameworkId { get; set; } = "fw-nba";
    public string VersionId { get; set; } = "ver-nba-2025";
    public string CycleName { get; set; } = string.Empty;
    public string AcademicYear { get; set; } = "2026–2027";
    public Guid? ProgramId { get; set; }
    public Guid? DepartmentId { get; set; }
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime? EndDate { get; set; }
}

public class UpdateCycleStatusRequest
{
    public string Status { get; set; } = "DataCollection";
}

public class ProgramMappingDto
{
    public string Id { get; set; } = string.Empty;
    public Guid CycleId { get; set; }
    public Guid ProgramId { get; set; }
    public string ProgramCode { get; set; } = string.Empty;
    public string ProgramName { get; set; } = string.Empty;
    public string ProgramLevel { get; set; } = "UG";
    public Guid DepartmentId { get; set; }
    public string DepartmentCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string? HodName { get; set; }
    public bool IsEligible { get; set; } = true;
    public string MappingStatus { get; set; } = "Mapped"; // "Unmapped", "Mapped", "Verified"
    public decimal CriteriaCompletionPct { get; set; }
    public int EvidenceCount { get; set; }
    public int PendingReviews { get; set; }
    public DateTime? LastUpdatedUtc { get; set; }
}

public class MapProgramRequest
{
    public Guid ProgramId { get; set; }
}

public class CriterionDto
{
    public Guid Id { get; set; }
    public string VersionId { get; set; } = "ver-nba-2025";
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal WeightPct { get; set; }
    public string? ParentCriterionId { get; set; }
    public int SortOrder { get; set; }
    public int MetricsCount { get; set; }
    public int SubCriteriaCount { get; set; }
    public decimal CompletionPct { get; set; }
    public decimal MaxMarks { get; set; }
    public decimal AttainedMarks { get; set; }
    public string Status { get; set; } = "InProgress";
}

public class MetricDto
{
    public Guid Id { get; set; }
    public Guid CriterionId { get; set; }
    public string CriterionCode { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ScoringMethod { get; set; } = "Marks";
    public decimal MaxScore { get; set; }
    public decimal? CurrentScore { get; set; }
    public decimal? TargetScore { get; set; }
    public decimal WeightPct { get; set; }
    public bool EvidenceRequired { get; set; } = true;
    public int EvidenceCount { get; set; }
    public string Status { get; set; } = "InProgress";
    public int SortOrder { get; set; }
}

public class UpdateMetricScoreRequest
{
    public decimal Score { get; set; }
}

public class EvidenceDocumentDto
{
    public Guid Id { get; set; }
    public Guid CycleId { get; set; }
    public Guid? MetricId { get; set; }
    public string MetricCode { get; set; } = string.Empty;
    public string CriterionCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string FileType { get; set; } = "application/pdf";
    public string FileName { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string StorageKey { get; set; } = string.Empty;
    public string UploadedByName { get; set; } = string.Empty;
    public string UploadedByRole { get; set; } = "College Admin";
    public DateTime UploadedAtUtc { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "UnderReview";
    public string? ReviewNote { get; set; }
    public string? ReviewedByName { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
    public List<string> Tags { get; set; } = new();
}

public class UploadEvidenceRequest
{
    public Guid CycleId { get; set; }
    public Guid MetricId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string StorageKey { get; set; } = string.Empty;
    public List<string>? Tags { get; set; }
}

public class UpdateEvidenceStatusRequest
{
    public string Status { get; set; } = "Approved";
    public string? ReviewNote { get; set; }
}

public class ReviewRecordDto
{
    public Guid Id { get; set; }
    public Guid CycleId { get; set; }
    public string EntityType { get; set; } = "Evidence";
    public Guid EntityId { get; set; }
    public string EntityTitle { get; set; } = string.Empty;
    public string? CriterionCode { get; set; }
    public string? MetricCode { get; set; }
    public string Status { get; set; } = "Pending";
    public string AssignedToName { get; set; } = string.Empty;
    public string AssignedToRole { get; set; } = "HOD";
    public string SubmittedByName { get; set; } = string.Empty;
    public DateTime SubmittedAtUtc { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
    public string? Remarks { get; set; }
    public string Priority { get; set; } = "Medium";
}

public class SubmitReviewRequest
{
    public string Status { get; set; } = "Approved";
    public string Remarks { get; set; } = string.Empty;
}

public class AccreditationReportDto
{
    public Guid CycleId { get; set; }
    public string CycleName { get; set; } = string.Empty;
    public string FrameworkCode { get; set; } = "NBA";
    public string VersionLabel { get; set; } = string.Empty;
    public string AcademicYear { get; set; } = "2026–2027";
    public string Level { get; set; } = "Program";
    public string? ProgramName { get; set; }
    public decimal OverallScore { get; set; }
    public string OverallGrade { get; set; } = string.Empty;
    public int TotalCriteria { get; set; }
    public int CompletedCriteria { get; set; }
    public int TotalMetrics { get; set; }
    public int CompletedMetrics { get; set; }
    public int TotalEvidence { get; set; }
    public int ApprovedEvidence { get; set; }
    public int PendingReviews { get; set; }
    public List<CriteriaScoreDto> CriteriaBreakdown { get; set; } = new();
    public DateTime GeneratedAtUtc { get; set; } = DateTime.UtcNow;
}

public class CriteriaScoreDto
{
    public string CriterionCode { get; set; } = string.Empty;
    public string CriterionTitle { get; set; } = string.Empty;
    public decimal WeightPct { get; set; }
    public decimal AchievedScore { get; set; }
    public decimal MaxScore { get; set; }
    public decimal CompletionPct { get; set; }
    public int MetricsCompleted { get; set; }
    public int MetricsTotal { get; set; }
}

public class AccreditationActivityDto
{
    public Guid Id { get; set; }
    public Guid CycleId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityTitle { get; set; } = string.Empty;
    public string PerformedByName { get; set; } = string.Empty;
    public string PerformedByRole { get; set; } = string.Empty;
    public DateTime PerformedAtUtc { get; set; }
    public string? Details { get; set; }
    public string? IpAddress { get; set; }
}

public class AttestCycleRequest
{
    public string Remarks { get; set; } = string.Empty;
}
