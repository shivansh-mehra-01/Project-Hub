using Microsoft.EntityFrameworkCore;
using ProjectHub.Application.Interfaces;
using ProjectHub.Core.Common;
using ProjectHub.Core.Entities;

namespace ProjectHub.Infrastructure.Data;

public class AppDbContext : DbContext, IAppDbContext
{
    private readonly ITenantContext _tenantContext;

    public AppDbContext(
        DbContextOptions<AppDbContext> options,
        ITenantContext tenantContext) : base(options)
    {
        _tenantContext = tenantContext;
    }

    public DbSet<College> Colleges => Set<College>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<User> Users => Set<User>();
    public DbSet<CollegeMembership> CollegeMemberships => Set<CollegeMembership>();
    public DbSet<ProjectCycle> ProjectCycles => Set<ProjectCycle>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<TeamMember> TeamMembers => Set<TeamMember>();
    public DbSet<TaskItem> TaskItems => Set<TaskItem>();
    public DbSet<WeeklyLog> WeeklyLogs => Set<WeeklyLog>();
    public DbSet<Rubric> Rubrics => Set<Rubric>();
    public DbSet<RubricCriterion> RubricCriteria => Set<RubricCriterion>();
    public DbSet<Evaluation> Evaluations => Set<Evaluation>();
    public DbSet<EvaluationScore> EvaluationScores => Set<EvaluationScore>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply Automatic Multi-Tenant Global Query Filters
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(ITenantEntity).IsAssignableFrom(entityType.ClrType))
            {
                var method = typeof(AppDbContext)
                    .GetMethod(nameof(ConfigureTenantFilter), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?
                    .MakeGenericMethod(entityType.ClrType);

                method?.Invoke(this, new object[] { modelBuilder });
            }
        }

        // Configure Indexes & Constraints
        modelBuilder.Entity<College>(builder =>
        {
            builder.HasIndex(c => c.Code).IsUnique();
            builder.HasIndex(c => c.Domain).IsUnique();
        });

        modelBuilder.Entity<Department>(builder =>
        {
            builder.HasIndex(d => new { d.CollegeId, d.Code }).IsUnique();
        });

        modelBuilder.Entity<User>(builder =>
        {
            builder.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<CollegeMembership>(builder =>
        {
            builder.HasIndex(m => new { m.CollegeId, m.UserId }).IsUnique();
            builder.HasIndex(m => new { m.CollegeId, m.EnrollmentNumber })
                   .HasFilter("\"EnrollmentNumber\" IS NOT NULL");
        });

        modelBuilder.Entity<Team>(builder =>
        {
            builder.HasIndex(t => new { t.CollegeId, t.TeamCode }).IsUnique();
        });

        modelBuilder.Entity<TeamMember>(builder =>
        {
            builder.HasIndex(tm => new { tm.CollegeId, tm.TeamId, tm.UserId }).IsUnique();
        });

        modelBuilder.Entity<Rubric>(builder =>
        {
            builder.Property(r => r.TotalMarks).HasPrecision(5, 2);
        });

        modelBuilder.Entity<RubricCriterion>(builder =>
        {
            builder.Property(rc => rc.MaxScore).HasPrecision(5, 2);
        });

        modelBuilder.Entity<EvaluationScore>(builder =>
        {
            builder.Property(es => es.AwardedScore).HasPrecision(5, 2);
        });

        modelBuilder.Entity<AuditLog>(builder =>
        {
            builder.HasIndex(a => new { a.CollegeId, a.TimestampUtc });
            builder.HasIndex(a => new { a.EntityName, a.EntityId });
        });
    }

    private void ConfigureTenantFilter<TEntity>(ModelBuilder modelBuilder) where TEntity : class, ITenantEntity
    {
        modelBuilder.Entity<TEntity>()
            .HasQueryFilter(e => !_tenantContext.CollegeId.HasValue || e.CollegeId == _tenantContext.CollegeId.Value);
    }
}

