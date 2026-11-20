using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Campus-level academic session (e.g. "2026-27", "2025-26").
/// Scoped by CollegeId tenant partition.
/// </summary>
public class AcademicSession : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public string Label { get; set; } = string.Empty; // "2026-27"
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime EndDate { get; set; } = DateTime.UtcNow.AddYears(1);
    public bool IsActive { get; set; } = true;

    // Navigations
    public CollegeTenant? College { get; set; }
    public ICollection<SemesterTerm> SemesterTerms { get; set; } = new List<SemesterTerm>();
    public ICollection<AcademicTrack> AcademicTracks { get; set; } = new List<AcademicTrack>();
}
