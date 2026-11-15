using Microsoft.EntityFrameworkCore;
using ProjectHub.Core.Entities;

namespace ProjectHub.Application.Interfaces;

/// <summary>
/// Application database abstraction for DbContext operations.
/// </summary>
public interface IAppDbContext
{
    DbSet<College> Colleges { get; }
    DbSet<Department> Departments { get; }
    DbSet<User> Users { get; }
    DbSet<CollegeMembership> CollegeMemberships { get; }
    DbSet<ProjectCycle> ProjectCycles { get; }
    DbSet<Team> Teams { get; }
    DbSet<TeamMember> TeamMembers { get; }
    DbSet<TaskItem> TaskItems { get; }
    DbSet<WeeklyLog> WeeklyLogs { get; }
    DbSet<Rubric> Rubrics { get; }
    DbSet<RubricCriterion> RubricCriteria { get; }
    DbSet<Evaluation> Evaluations { get; }
    DbSet<EvaluationScore> EvaluationScores { get; }
    DbSet<AuditLog> AuditLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

