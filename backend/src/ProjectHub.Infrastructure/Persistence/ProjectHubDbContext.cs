using System.Linq.Expressions;
using System.Reflection;
using Microsoft.EntityFrameworkCore;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Common;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Entities.Master;
using ProjectHub.Domain.Enums;
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
    public DbSet<MasterSdgCatalog> MasterSdgCatalogs => Set<MasterSdgCatalog>();
    public DbSet<PlatformAuditLog> PlatformAuditLogs => Set<PlatformAuditLog>();
    public DbSet<PlatformAnnouncement> PlatformAnnouncements => Set<PlatformAnnouncement>();
    public DbSet<EmailOutboxMessage> EmailOutboxMessages => Set<EmailOutboxMessage>();
    public DbSet<SupportTicket> SupportTickets => Set<SupportTicket>();
    public DbSet<SupportTicketMessage> SupportTicketMessages => Set<SupportTicketMessage>();
    public DbSet<MasterUniversity> MasterUniversities => Set<MasterUniversity>();
    public DbSet<MasterCurriculumScheme> MasterCurriculumSchemes => Set<MasterCurriculumScheme>();
    public DbSet<MasterProgram> MasterPrograms => Set<MasterProgram>();
    public DbSet<MasterBranch> MasterBranches => Set<MasterBranch>();
    public DbSet<MasterSubjectTemplate> MasterSubjectTemplates => Set<MasterSubjectTemplate>();

    // Tenant-Isolated Campus Entities
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<UserAccount> Users => Set<UserAccount>();
    public DbSet<AcademicTrack> AcademicTracks => Set<AcademicTrack>();
    public DbSet<ProblemBankStatement> ProblemBankStatements => Set<ProblemBankStatement>();
    public DbSet<ProjectTeam> ProjectTeams => Set<ProjectTeam>();
    public DbSet<TeamMember> TeamMembers => Set<TeamMember>();
    public DbSet<TeamInvitation> TeamInvitations => Set<TeamInvitation>();
    public DbSet<SprintTask> SprintTasks => Set<SprintTask>();
    public DbSet<ProjectMilestone> ProjectMilestones => Set<ProjectMilestone>();
    public DbSet<MilestoneReviewHistory> MilestoneReviewHistories => Set<MilestoneReviewHistory>();
    public DbSet<ProjectReportSubmission> ProjectReportSubmissions => Set<ProjectReportSubmission>();
    public DbSet<SubmissionReviewHistory> SubmissionReviewHistories => Set<SubmissionReviewHistory>();
    public DbSet<TeamArtifact> TeamArtifacts => Set<TeamArtifact>();
    public DbSet<WeeklyLogbook> WeeklyLogbooks => Set<WeeklyLogbook>();
    public DbSet<VivaPanel> VivaPanels => Set<VivaPanel>();
    public DbSet<VivaPanelEvaluator> VivaPanelEvaluators => Set<VivaPanelEvaluator>();
    public DbSet<VivaEvaluation> VivaEvaluations => Set<VivaEvaluation>();
    public DbSet<IndividualStudentScore> IndividualStudentScores => Set<IndividualStudentScore>();
    public DbSet<TeamVivaDefenseSchedule> TeamVivaDefenseSchedules => Set<TeamVivaDefenseSchedule>();
    public DbSet<EvaluationRubric> EvaluationRubrics => Set<EvaluationRubric>();
    public DbSet<EvaluationRubricCriterion> EvaluationRubricCriteria => Set<EvaluationRubricCriterion>();
    public DbSet<ExceptionAuditLog> ExceptionAuditLogs => Set<ExceptionAuditLog>();
    public DbSet<ProjectClosureRecord> ProjectClosureRecords => Set<ProjectClosureRecord>();
    public DbSet<StudentAcademicRecord> StudentAcademicRecords => Set<StudentAcademicRecord>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<RefreshTokenRecord> RefreshTokenRecords => Set<RefreshTokenRecord>();

    // Dynamic Multi-Level Academic Hierarchy Entities
    public DbSet<AcademicSession> AcademicSessions => Set<AcademicSession>();
    public DbSet<CourseProgram> CoursePrograms => Set<CourseProgram>();
    public DbSet<CurriculumScheme> CurriculumSchemes => Set<CurriculumScheme>();
    public DbSet<SemesterTerm> SemesterTerms => Set<SemesterTerm>();
    public DbSet<SubjectOffering> SubjectOfferings => Set<SubjectOffering>();
    public DbSet<StudentAcademicEnrollment> StudentAcademicEnrollments => Set<StudentAcademicEnrollment>();

    // College Admin Phase 2 Persistence Entities
    public DbSet<CollegeCampus> CollegeCampuses => Set<CollegeCampus>();
    public DbSet<HodAppointmentHistory> HodAppointmentHistories => Set<HodAppointmentHistory>();

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
            modelBuilder.Entity<ProjectMilestone>().UseXminAsConcurrencyToken();
            modelBuilder.Entity<ProjectReportSubmission>().UseXminAsConcurrencyToken();
            modelBuilder.Entity<TeamInvitation>().UseXminAsConcurrencyToken();
            modelBuilder.Entity<VivaEvaluation>().UseXminAsConcurrencyToken();
            modelBuilder.Entity<TeamVivaDefenseSchedule>().UseXminAsConcurrencyToken();
            modelBuilder.Entity<AcademicTrack>().UseXminAsConcurrencyToken();
            modelBuilder.Entity<Department>().UseXminAsConcurrencyToken();
            modelBuilder.Entity<ProjectClosureRecord>().UseXminAsConcurrencyToken();
            modelBuilder.Entity<StudentAcademicRecord>().UseXminAsConcurrencyToken();
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

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditAndTenantStamping();
        return await SaveChangesInternalAsync(() => base.SaveChangesAsync(cancellationToken), cancellationToken);
    }

    public override async Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        ApplyAuditAndTenantStamping();
        return await SaveChangesInternalAsync(() => base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken), cancellationToken);
    }

    private async Task<int> SaveChangesInternalAsync(Func<Task<int>> saveFunc, CancellationToken cancellationToken)
    {
        if (!Database.IsNpgsql())
        {
            return await saveFunc();
        }

        var teamsWithGuideAssigned = ChangeTracker.Entries<ProjectTeam>()
            .Where(e => (e.State == EntityState.Added || e.Property(t => t.GuideUserId).IsModified) && e.Entity.GuideUserId.HasValue)
            .ToList();

        if (teamsWithGuideAssigned.Count == 0)
        {
            return await saveFunc();
        }

        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? localTx = null;
        if (Database.CurrentTransaction == null)
        {
            localTx = await Database.BeginTransactionAsync(cancellationToken);
        }

        try
        {
            foreach (var entry in teamsWithGuideAssigned)
            {
                var gId = entry.Entity.GuideUserId!.Value;
                await Database.ExecuteSqlInterpolatedAsync($"SELECT \"Id\" FROM \"UserAccounts\" WHERE \"Id\" = {gId} FOR UPDATE;", cancellationToken);
                var gUser = await Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == gId, cancellationToken);
                if (gUser != null)
                {
                    var count = await ProjectTeams.CountAsync(t => t.GuideUserId == gId && t.CollegeId == gUser.CollegeId && !t.IsDeleted && t.Status != ProjectStatus.Archived && t.Id != entry.Entity.Id, cancellationToken);
                    if (count >= gUser.MaxMentorTeams)
                    {
                        throw new InvalidOperationException($"Faculty member '{gUser.FullName}' has reached maximum mentorship capacity of {gUser.MaxMentorTeams} teams.");
                    }
                }
            }

            var result = await saveFunc();
            if (localTx != null)
            {
                await localTx.CommitAsync(cancellationToken);
            }
            return result;
        }
        catch
        {
            if (localTx != null)
            {
                await localTx.RollbackAsync(cancellationToken);
            }
            throw;
        }
        finally
        {
            if (localTx != null)
            {
                await localTx.DisposeAsync();
            }
        }
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
            // 0. Audit Log Immutability Protection: Direct modification or deletion is strictly forbidden
            if (entry.Entity is PlatformAuditLog)
            {
                if (entry.State is EntityState.Modified or EntityState.Deleted)
                {
                    throw new InvalidOperationException(
                        $"Audit Log Immutability Violation: Audit log entities of type '{entry.Entity.GetType().Name}' are append-only and cannot be modified or deleted.");
                }
                continue;
            }

            if (entry.Entity is ExceptionAuditLog)
            {
                if (entry.State == EntityState.Deleted)
                {
                    throw new InvalidOperationException(
                        $"Audit Log Immutability Violation: ExceptionAuditLog entities cannot be deleted.");
                }
            }

            // Phase 5 / 5.1 / 5.2 Parity Hook: Maintain lifecycle synchronization for ProjectTeam.GuideUserId across ALL authorized write paths (including frozen HOD operations)
            if (entry.Entity is ProjectTeam projectTeam)
            {
                var guideProp = entry.Property(nameof(ProjectTeam.GuideUserId));
                var guideModified = entry.State == EntityState.Added || guideProp.IsModified;

                if (guideModified && projectTeam.GuideUserId.HasValue)
                {
                    // Strict Authorization Gate (Phase 5.2 / Preflight): Only authorized institutional authorities (HOD, Coordinator) or explicit system seeder can trigger official allocation
                    var isAuthorizedAuthority = _tenantContext.IsTrustedSystemSeeder ||
                                                _tenantContext.Role == UserRole.HOD ||
                                                (_tenantContext.Role == UserRole.Faculty && _tenantContext.IsProjectCoordinator);

                    if (isAuthorizedAuthority)
                    {
                        // 1. Maintain lifecycle parity: An authorized official guide assignment always implies Allocated status
                        projectTeam.GuidePreferenceStatus = GuidePreferenceStatus.Allocated;

                        // 2. Populate allocation timestamp if not already set
                        if (!projectTeam.GuideAllocatedAtUtc.HasValue)
                        {
                            projectTeam.GuideAllocatedAtUtc = utcNow;
                        }

                        // 3. Populate allocating authority if not already set
                        if (!projectTeam.GuideAllocatedByUserId.HasValue && currentUserId.HasValue)
                        {
                            projectTeam.GuideAllocatedByUserId = currentUserId;
                        }

                        // 4. Populate allocation remarks if not already set
                        if (string.IsNullOrWhiteSpace(projectTeam.GuideAllocationRemarks))
                        {
                            var relatedLog = ChangeTracker.Entries<ExceptionAuditLog>()
                                .FirstOrDefault(e => e.Entity.ProjectTeamId == projectTeam.Id && e.Entity.ActionType == ExceptionActionType.ReassignGuide)?.Entity;

                            projectTeam.GuideAllocationRemarks = !string.IsNullOrWhiteSpace(relatedLog?.Reason)
                                ? relatedLog.Reason
                                : "Officially allocated by Department Authority";
                        }
                    }
                    else
                    {
                        // Unauthorized caller (e.g. Student write): Cannot trigger official allocation or stamp student as allocating authority!
                        if (projectTeam.GuidePreferenceStatus == GuidePreferenceStatus.Allocated)
                        {
                            projectTeam.GuidePreferenceStatus = projectTeam.PreferredGuideUserId.HasValue
                                ? GuidePreferenceStatus.Requested
                                : GuidePreferenceStatus.None;
                        }
                        projectTeam.GuideAllocatedAtUtc = null;
                        projectTeam.GuideAllocatedByUserId = null;
                        projectTeam.GuideAllocationRemarks = null;
                    }
                }
                else if (guideModified && !projectTeam.GuideUserId.HasValue && entry.State == EntityState.Modified)
                {
                    // Guide deallocated or proposal rejected by faculty
                    if (projectTeam.GuidePreferenceStatus == GuidePreferenceStatus.Allocated)
                    {
                        projectTeam.GuidePreferenceStatus = projectTeam.PreferredGuideUserId.HasValue
                            ? GuidePreferenceStatus.Requested
                            : GuidePreferenceStatus.None;
                    }
                    projectTeam.GuideAllocatedAtUtc = null;
                    projectTeam.GuideAllocatedByUserId = null;
                    projectTeam.GuideAllocationRemarks = null;
                }
            }

            // In-Memory Database Guard: Mirror relational filtered unique index IX_VivaEvaluations_CollegeId_ProjectTeamId_CheckpointType
            if (entry.Entity is VivaEvaluation vivaEval && entry.State == EntityState.Added && !vivaEval.IsDeleted)
            {
                if (Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory")
                {
                    var hasConflict = VivaEvaluations.Local.Any(v => v != vivaEval && v.CollegeId == vivaEval.CollegeId && v.ProjectTeamId == vivaEval.ProjectTeamId && v.CheckpointType == vivaEval.CheckpointType && !v.IsDeleted) ||
                                      VivaEvaluations.Any(v => v.Id != vivaEval.Id && v.CollegeId == vivaEval.CollegeId && v.ProjectTeamId == vivaEval.ProjectTeamId && v.CheckpointType == vivaEval.CheckpointType && !v.IsDeleted);
                    if (hasConflict)
                    {
                        throw new DbUpdateException("Duplicate unique key violation: IX_VivaEvaluations_CollegeId_ProjectTeamId_CheckpointType");
                    }
                }
            }

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
                        if (collegeIdProp.IsModified && !Equals(collegeIdProp.OriginalValue, collegeIdProp.CurrentValue))
                        {
                            throw new UnauthorizedAccessException("Tenant Isolation Violation: The CollegeId partition key is immutable.");
                        }
                    }
                }
            }
        }
    }
}
