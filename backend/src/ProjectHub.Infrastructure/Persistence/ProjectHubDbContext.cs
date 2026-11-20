using System.Linq.Expressions;
using System.Reflection;
using Microsoft.EntityFrameworkCore;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Common;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Entities.Master;
using ProjectHub.Infrastructure.Persistence.Extensions;

namespace ProjectHub.Infrastructure.Persistence;

/// <summary>
/// Production-grade EF Core 10 Multi-Tenant DbContext with Double-Lock Isolation,
/// automatic audit stamping, cross-tenant mutation defense, and xmin optimistic concurrency.
/// </summary>
public class ProjectHubDbContext : DbContext, IAppDbContext
{
    private readonly ITenantContext _tenantContext;

    public ProjectHubDbContext(
        DbContextOptions<ProjectHubDbContext> options,
        ITenantContext tenantContext) : base(options)
    {
        _tenantContext = tenantContext;
    }

    protected ProjectHubDbContext(
        DbContextOptions options,
        ITenantContext tenantContext) : base(options)
    {
        _tenantContext = tenantContext;
    }

    // Platform Root Entities
    public DbSet<CollegeTenant> CollegeTenants => Set<CollegeTenant>();
    public DbSet<MasterNbaOutcome> MasterNbaOutcomes => Set<MasterNbaOutcome>();
    public DbSet<MasterSdgCatalog> MasterSdgCatalogs => Set<MasterSdgCatalog>();
    public DbSet<PlatformAuditLog> PlatformAuditLogs => Set<PlatformAuditLog>();
    public DbSet<MasterUniversity> MasterUniversities => Set<MasterUniversity>();
    public DbSet<MasterCurriculumScheme> MasterCurriculumSchemes => Set<MasterCurriculumScheme>();
    public DbSet<MasterProgram> MasterPrograms => Set<MasterProgram>();
    public DbSet<MasterBranch> MasterBranches => Set<MasterBranch>();
    public DbSet<MasterSubjectTemplate> MasterSubjectTemplates => Set<MasterSubjectTemplate>();

    // Tenant-Isolated Campus Entities
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<UserAccount> Users => Set<UserAccount>();
    public DbSet<AcademicTrack> AcademicTracks => Set<AcademicTrack>();
    public DbSet<CourseOutcomeDefinition> CourseOutcomeDefinitions => Set<CourseOutcomeDefinition>();
    public DbSet<ProblemBankStatement> ProblemBankStatements => Set<ProblemBankStatement>();
    public DbSet<ProjectTeam> ProjectTeams => Set<ProjectTeam>();
    public DbSet<TeamMember> TeamMembers => Set<TeamMember>();
    public DbSet<SprintTask> SprintTasks => Set<SprintTask>();
    public DbSet<TeamArtifact> TeamArtifacts => Set<TeamArtifact>();
    public DbSet<WeeklyLogbook> WeeklyLogbooks => Set<WeeklyLogbook>();
    public DbSet<VivaPanel> VivaPanels => Set<VivaPanel>();
    public DbSet<VivaPanelEvaluator> VivaPanelEvaluators => Set<VivaPanelEvaluator>();
    public DbSet<VivaEvaluation> VivaEvaluations => Set<VivaEvaluation>();
    public DbSet<IndividualStudentScore> IndividualStudentScores => Set<IndividualStudentScore>();
    public DbSet<CourseExitSurvey> CourseExitSurveys => Set<CourseExitSurvey>();
    public DbSet<ExceptionAuditLog> ExceptionAuditLogs => Set<ExceptionAuditLog>();

    // Dynamic Multi-Level Academic Hierarchy Entities
    public DbSet<AcademicSession> AcademicSessions => Set<AcademicSession>();
    public DbSet<CourseProgram> CoursePrograms => Set<CourseProgram>();
    public DbSet<CurriculumScheme> CurriculumSchemes => Set<CurriculumScheme>();
    public DbSet<SemesterTerm> SemesterTerms => Set<SemesterTerm>();
    public DbSet<SubjectOffering> SubjectOfferings => Set<SubjectOffering>();
    public DbSet<StudentAcademicEnrollment> StudentAcademicEnrollments => Set<StudentAcademicEnrollment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply external IEntityTypeConfiguration mappings from this assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ProjectHubDbContext).Assembly);

        // Lock 1: Dynamic Multi-Tenant & Soft-Delete Global Query Filters via Reflection
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var clrType = entityType.ClrType;

            if (typeof(ITenantEntity).IsAssignableFrom(clrType) && typeof(BaseEntity).IsAssignableFrom(clrType))
            {
                var method = typeof(ProjectHubDbContext)
                    .GetMethod(nameof(ConfigureTenantAndSoftDeleteFilter), BindingFlags.NonPublic | BindingFlags.Instance)?
                    .MakeGenericMethod(clrType);

                method?.Invoke(this, new object[] { modelBuilder });
            }
            else if (typeof(BaseEntity).IsAssignableFrom(clrType))
            {
                var method = typeof(ProjectHubDbContext)
                    .GetMethod(nameof(ConfigureSoftDeleteFilter), BindingFlags.NonPublic | BindingFlags.Instance)?
                    .MakeGenericMethod(clrType);

                method?.Invoke(this, new object[] { modelBuilder });
            }
        }

        // Optimistic Concurrency via PostgreSQL xmin system column
        if (Database.IsNpgsql())
        {
            modelBuilder.Entity<ProjectTeam>().UseXminAsConcurrencyToken();
            modelBuilder.Entity<VivaEvaluation>().UseXminAsConcurrencyToken();
            modelBuilder.Entity<AcademicTrack>().UseXminAsConcurrencyToken();
            modelBuilder.Entity<Department>().UseXminAsConcurrencyToken();
        }
    }

    private void ConfigureTenantAndSoftDeleteFilter<TEntity>(ModelBuilder modelBuilder)
        where TEntity : BaseEntity, ITenantEntity
    {
        modelBuilder.Entity<TEntity>().HasQueryFilter(e =>
            !e.IsDeleted &&
            (_tenantContext.IsSuperAdmin || (Guid?)e.CollegeId == _tenantContext.CollegeId));
    }

    private void ConfigureSoftDeleteFilter<TEntity>(ModelBuilder modelBuilder)
        where TEntity : BaseEntity
    {
        modelBuilder.Entity<TEntity>().HasQueryFilter(e => !e.IsDeleted);
    }

    public override int SaveChanges()
    {
        ApplyAuditAndTenantStamping();
        return base.SaveChanges();
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ApplyAuditAndTenantStamping();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditAndTenantStamping();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        ApplyAuditAndTenantStamping();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    /// <summary>
    /// Automatic Audit and Tenant Stamping with cross-tenant write authorization guards.
    /// </summary>
    private void ApplyAuditAndTenantStamping()
    {
        var utcNow = DateTime.UtcNow;
        var currentUserId = _tenantContext.UserId;

        foreach (var entry in ChangeTracker.Entries().ToList())
        {
            // 1. Audit Stamping on BaseEntity
            if (entry.Entity is BaseEntity baseEntity)
            {
                if (entry.State == EntityState.Added)
                {
                    baseEntity.CreatedAtUtc = utcNow;
                    baseEntity.UpdatedAtUtc = utcNow;
                    if (!baseEntity.CreatedByUserId.HasValue && currentUserId.HasValue)
                    {
                        baseEntity.CreatedByUserId = currentUserId;
                    }
                }
                else if (entry.State == EntityState.Modified)
                {
                    baseEntity.UpdatedAtUtc = utcNow;
                }
                else if (entry.State == EntityState.Deleted)
                {
                    // Soft-delete pattern
                    entry.State = EntityState.Modified;
                    baseEntity.IsDeleted = true;
                    baseEntity.DeletedAtUtc = utcNow;
                    baseEntity.UpdatedAtUtc = utcNow;
                }
            }

            // 2. Strict Tenant Stamping and Cross-Tenant Mutation Guards on ITenantEntity
            if (entry.Entity is ITenantEntity tenantEntity)
            {
                if (entry.State == EntityState.Added)
                {
                    if (_tenantContext.IsSuperAdmin)
                    {
                        // SuperAdmin can explicitly set CollegeId or adopt active context
                        if (tenantEntity.CollegeId == Guid.Empty && _tenantContext.CollegeId.HasValue)
                        {
                            tenantEntity.CollegeId = _tenantContext.CollegeId.Value;
                        }
                    }
                    else
                    {
                        if (!_tenantContext.CollegeId.HasValue || _tenantContext.CollegeId.Value == Guid.Empty)
                        {
                            throw new UnauthorizedAccessException("Tenant Isolation Violation: Cannot persist tenant entity without an active campus tenant context.");
                        }

                        if (tenantEntity.CollegeId != Guid.Empty && tenantEntity.CollegeId != _tenantContext.CollegeId.Value)
                        {
                            throw new UnauthorizedAccessException(
                                $"Cross-Tenant Write Violation: Active tenant '{_tenantContext.CollegeId.Value}' cannot insert entities for tenant '{tenantEntity.CollegeId}'.");
                        }

                        tenantEntity.CollegeId = _tenantContext.CollegeId.Value;
                    }
                }
                else if (entry.State is EntityState.Modified or EntityState.Deleted)
                {
                    if (!_tenantContext.IsSuperAdmin)
                    {
                        if (!_tenantContext.CollegeId.HasValue || tenantEntity.CollegeId != _tenantContext.CollegeId.Value)
                        {
                            throw new UnauthorizedAccessException(
                                $"Cross-Tenant Mutation Violation: Current tenant cannot mutate records belonging to tenant '{tenantEntity.CollegeId}'.");
                        }

                        var collegeIdProp = entry.Property(nameof(ITenantEntity.CollegeId));
                        if (collegeIdProp.IsModified)
                        {
                            throw new UnauthorizedAccessException("Tenant Isolation Violation: The CollegeId partition key is immutable.");
                        }
                    }
                }
            }
        }
    }
}
