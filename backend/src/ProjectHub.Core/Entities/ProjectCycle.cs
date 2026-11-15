using ProjectHub.Core.Common;
using ProjectHub.Core.Enums;

namespace ProjectHub.Core.Entities;

/// <summary>
/// Academic project cycle (Minor or Major) for a specific academic year and department.
/// </summary>
public class ProjectCycle : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid DepartmentId { get; set; }
    public string AcademicYear { get; set; } = string.Empty; // e.g. "2025-2026"
    public CycleType Type { get; set; }
    public int Semester { get; set; } // 5, 6, 7, or 8
    public DateTime ProposalDeadlineUtc { get; set; }
    public bool IsActive { get; set; } = true;
    public int MinTeamSize { get; set; } = 2;
    public int MaxTeamSize { get; set; } = 4;

    // Navigations
    public College? College { get; set; }
    public Department? Department { get; set; }
    public ICollection<Team> Teams { get; set; } = new List<Team>();
    public ICollection<Rubric> Rubrics { get; set; } = new List<Rubric>();
}

