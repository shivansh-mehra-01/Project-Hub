using ProjectHub.Core.Common;
using ProjectHub.Core.Enums;

namespace ProjectHub.Core.Entities;

/// <summary>
/// Academic project team. Progresses through the lifecycle state machine.
/// </summary>
public class Team : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid CycleId { get; set; }
    public Guid DepartmentId { get; set; }
    public string TeamCode { get; set; } = string.Empty; // e.g. "2026-CS-MAJ-01"
    public string Title { get; set; } = string.Empty;
    public string Abstract { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;
    public Guid? GuideUserId { get; set; }
    public ProjectState State { get; set; } = ProjectState.Draft;
    public string? GitHubRepoUrl { get; set; }
    public string? JiraProjectUrl { get; set; }
    public bool IsRosterLocked { get; set; }

    // Navigations
    public College? College { get; set; }
    public ProjectCycle? Cycle { get; set; }
    public Department? Department { get; set; }
    public User? GuideUser { get; set; }
    public ICollection<TeamMember> Members { get; set; } = new List<TeamMember>();
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
    public ICollection<WeeklyLog> WeeklyLogs { get; set; } = new List<WeeklyLog>();
    public ICollection<Evaluation> Evaluations { get; set; } = new List<Evaluation>();
}

