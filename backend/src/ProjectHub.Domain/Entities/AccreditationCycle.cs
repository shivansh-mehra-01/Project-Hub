using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Institutional or program-level accreditation cycle (e.g., NBA Tier-II SAR 2026, NAAC RAF 2024).
/// </summary>
public class AccreditationCycle : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid? CourseProgramId { get; set; }
    public Guid? DepartmentId { get; set; }

    /// <summary>
    /// Accreditation framework code: "NBA" or "NAAC".
    /// </summary>
    public string FrameworkCode { get; set; } = "NBA";

    public string VersionLabel { get; set; } = "NBA Tier-II SAR Manual (Rev. 2025)";
    public string CycleName { get; set; } = string.Empty;
    public string AcademicYear { get; set; } = "2026–2027";
    public string Level { get; set; } = "Program"; // "Program" or "Institution"

    /// <summary>
    /// Status: "Planning", "DataCollection", "UnderReview", "Submitted", "Accredited".
    /// </summary>
    public string Status { get; set; } = "DataCollection";

    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime EndDate { get; set; } = DateTime.UtcNow.AddMonths(12);

    public decimal TargetScore { get; set; } = 1000m;
    public decimal AttainedScore { get; set; } = 0m;
    public decimal AttainmentPercentage { get; set; } = 0m;

    public bool IsAttested { get; set; } = false;
    public DateTime? AttestedAtUtc { get; set; }
    public Guid? AttestedByUserId { get; set; }
    public string? AttestedByName { get; set; }
    public string? AttestationRemarks { get; set; }

    // Navigations
    public CollegeTenant? College { get; set; }
    public CourseProgram? CourseProgram { get; set; }
    public Department? Department { get; set; }
    public ICollection<AccreditationCriterion> Criteria { get; set; } = new List<AccreditationCriterion>();
    public ICollection<AccreditationEvidence> EvidenceItems { get; set; } = new List<AccreditationEvidence>();
    public ICollection<AccreditationActivityLog> ActivityLogs { get; set; } = new List<AccreditationActivityLog>();
}
