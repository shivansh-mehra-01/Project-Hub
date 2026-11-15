using ProjectHub.Core.Common;
using ProjectHub.Core.Enums;

namespace ProjectHub.Core.Entities;

/// <summary>
/// Milestone and sprint tasks within a team's workspace.
/// </summary>
public class TaskItem : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid TeamId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? AssigneeId { get; set; }
    public TaskItemStatus Status { get; set; } = TaskItemStatus.Todo;
    public DateTime? DueDateUtc { get; set; }

    // Navigations
    public College? College { get; set; }
    public Team? Team { get; set; }
    public User? Assignee { get; set; }
}

