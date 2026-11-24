using System.Net;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
using ProjectHub.Infrastructure.Services;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class PostgreSqlConcurrencyTests : IDisposable
{
    private const string ConnectionString = "Host=localhost;Port=5432;Database=projecthub_db;Username=postgres;Password=postgres;Include Error Detail=true";
    private readonly ProjectHubDbContext _context;
    private readonly bool _isPostgreSqlAvailable;
    private readonly List<Guid> _cleanupEvaluationIds = new();
    private readonly List<Guid> _cleanupTeamIds = new();

    private static readonly Guid SistecTenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid CseDeptId = Guid.Parse("10000000-0000-0000-0000-000000000001");
    private static readonly Guid MinorTrackId = Guid.Parse("30000000-0000-0000-0000-000000000001");
    private static readonly Guid EvaluatorVermaId = Guid.Parse("20000000-0000-0000-0000-000000000004");

    public PostgreSqlConcurrencyTests()
    {
        var optionsBuilder = new DbContextOptionsBuilder<ProjectHubDbContext>();
        optionsBuilder.UseNpgsql(ConnectionString);

        var tenantContext = new TenantContext
        {
            CollegeId = SistecTenantId,
            IsSuperAdmin = true
        };

        _context = new ProjectHubDbContext(optionsBuilder.Options, tenantContext);

        try
        {
            _isPostgreSqlAvailable = _context.Database.CanConnect();
        }
        catch
        {
            _isPostgreSqlAvailable = false;
        }
    }

    private async Task<ProjectTeam> CreateTestProjectTeamAsync()
    {
        var team = new ProjectTeam
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            DepartmentId = CseDeptId,
            AcademicTrackId = MinorTrackId,
            TeamCode = $"TEST-{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
            Title = "PostgreSQL Concurrency Test Team",
            Abstract = "Automated test team for PostgreSQL concurrency and unique index verification",
            DomainTag = "Security Testing",
            Status = ProjectStatus.ReadyForViva,
            IsDeleted = false
        };
        _context.ProjectTeams.Add(team);
        await _context.SaveChangesAsync();
        _cleanupTeamIds.Add(team.Id);
        return team;
    }

    [Fact]
    public async Task PostgreSql_UniqueIndex_PhysicallyBlocksDuplicateActiveEvaluations()
    {
        if (!_isPostgreSqlAvailable) return;

        var team = await CreateTestProjectTeamAsync();
        var teamId = team.Id;

        var eval1 = new VivaEvaluation
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            ProjectTeamId = teamId,
            EvaluatorUserId = EvaluatorVermaId,
            CheckpointType = CheckpointType.MidTermReview,
            SharedRubricScoresJson = "{}",
            SharedTotalScore = 80m,
            IsLocked = true,
            LockedAtUtc = DateTime.UtcNow,
            IsDeleted = false
        };

        _context.VivaEvaluations.Add(eval1);
        await _context.SaveChangesAsync();
        _cleanupEvaluationIds.Add(eval1.Id);

        // Attempt second concurrent/duplicate insert with identical (CollegeId, ProjectTeamId, CheckpointType)
        var eval2 = new VivaEvaluation
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            ProjectTeamId = teamId,
            EvaluatorUserId = EvaluatorVermaId,
            CheckpointType = CheckpointType.MidTermReview,
            SharedRubricScoresJson = "{}",
            SharedTotalScore = 85m,
            IsLocked = true,
            LockedAtUtc = DateTime.UtcNow,
            IsDeleted = false
        };

        _context.VivaEvaluations.Add(eval2);

        var ex = await Assert.ThrowsAsync<DbUpdateException>(() => _context.SaveChangesAsync());
        Assert.NotNull(ex.InnerException);
        Assert.IsType<PostgresException>(ex.InnerException);
        var pgEx = (PostgresException)ex.InnerException;
        Assert.Equal("23505", pgEx.SqlState); // unique_violation
        Assert.Contains("IX_VivaEvaluations_CollegeId_ProjectTeamId_CheckpointType", pgEx.ConstraintName);

        // Ensure database only contains 1 active evaluation
        var activeCount = await _context.VivaEvaluations
            .CountAsync(e => e.ProjectTeamId == teamId && e.CheckpointType == CheckpointType.MidTermReview && !e.IsDeleted);
        Assert.Equal(1, activeCount);
    }

    [Fact]
    public async Task PostgreSql_PartialFilter_AllowsReEvaluationWhenPreviousIsSoftDeleted()
    {
        if (!_isPostgreSqlAvailable) return;

        var team = await CreateTestProjectTeamAsync();
        var teamId = team.Id;

        // 1. Soft-deleted evaluation
        var deletedEval = new VivaEvaluation
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            ProjectTeamId = teamId,
            EvaluatorUserId = EvaluatorVermaId,
            CheckpointType = CheckpointType.MidTermReview,
            SharedRubricScoresJson = "{}",
            SharedTotalScore = 70m,
            IsLocked = true,
            LockedAtUtc = DateTime.UtcNow,
            IsDeleted = true,
            DeletedAtUtc = DateTime.UtcNow
        };

        _context.VivaEvaluations.Add(deletedEval);
        await _context.SaveChangesAsync();
        _cleanupEvaluationIds.Add(deletedEval.Id);

        // 2. Active evaluation for same team and checkpoint: Partial index WHERE ("IsDeleted" = false) MUST ALLOW
        var activeEval = new VivaEvaluation
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            ProjectTeamId = teamId,
            EvaluatorUserId = EvaluatorVermaId,
            CheckpointType = CheckpointType.MidTermReview,
            SharedRubricScoresJson = "{}",
            SharedTotalScore = 88m,
            IsLocked = true,
            LockedAtUtc = DateTime.UtcNow,
            IsDeleted = false
        };

        _context.VivaEvaluations.Add(activeEval);
        var saved = await _context.SaveChangesAsync();
        Assert.True(saved > 0);
        _cleanupEvaluationIds.Add(activeEval.Id);

        // Verify both exist in PostgreSQL (one deleted, one active)
        var totalInDb = await _context.VivaEvaluations
            .IgnoreQueryFilters()
            .CountAsync(e => e.ProjectTeamId == teamId && e.CheckpointType == CheckpointType.MidTermReview);
        Assert.Equal(2, totalInDb);
    }

    [Fact]
    public async Task PostgreSql_ConcurrentTasks_OnlyOneActiveEvaluationCommitted()
    {
        if (!_isPostgreSqlAvailable) return;

        var team = await CreateTestProjectTeamAsync();
        var teamId = team.Id;

        var task1 = Task.Run(async () =>
        {
            var options = new DbContextOptionsBuilder<ProjectHubDbContext>().UseNpgsql(ConnectionString).Options;
            var tenant = new TenantContext { CollegeId = SistecTenantId, IsSuperAdmin = true };
            using var db = new ProjectHubDbContext(options, tenant);
            var eval = new VivaEvaluation
            {
                Id = Guid.NewGuid(),
                CollegeId = SistecTenantId,
                ProjectTeamId = teamId,
                CheckpointType = CheckpointType.FinalViva,
                EvaluatorUserId = EvaluatorVermaId,
                SharedTotalScore = 80m,
                IsLocked = true,
                LockedAtUtc = DateTime.UtcNow
            };
            db.VivaEvaluations.Add(eval);
            try
            {
                await db.SaveChangesAsync();
                return (Success: true, eval.Id);
            }
            catch (DbUpdateException)
            {
                return (Success: false, eval.Id);
            }
        });

        var task2 = Task.Run(async () =>
        {
            var options = new DbContextOptionsBuilder<ProjectHubDbContext>().UseNpgsql(ConnectionString).Options;
            var tenant = new TenantContext { CollegeId = SistecTenantId, IsSuperAdmin = true };
            using var db = new ProjectHubDbContext(options, tenant);
            var eval = new VivaEvaluation
            {
                Id = Guid.NewGuid(),
                CollegeId = SistecTenantId,
                ProjectTeamId = teamId,
                CheckpointType = CheckpointType.FinalViva,
                EvaluatorUserId = EvaluatorVermaId,
                SharedTotalScore = 85m,
                IsLocked = true,
                LockedAtUtc = DateTime.UtcNow
            };
            db.VivaEvaluations.Add(eval);
            try
            {
                await db.SaveChangesAsync();
                return (Success: true, eval.Id);
            }
            catch (DbUpdateException)
            {
                return (Success: false, eval.Id);
            }
        });

        var results = await Task.WhenAll(task1, task2);
        var successCount = results.Count(r => r.Success);
        var failCount = results.Count(r => !r.Success);

        Assert.Equal(1, successCount);
        Assert.Equal(1, failCount);

        foreach (var r in results)
        {
            _cleanupEvaluationIds.Add(r.Id);
        }

        var activeCount = await _context.VivaEvaluations
            .CountAsync(e => e.ProjectTeamId == teamId && e.CheckpointType == CheckpointType.FinalViva && !e.IsDeleted);
        Assert.Equal(1, activeCount);
    }

    public void Dispose()
    {
        if (_isPostgreSqlAvailable)
        {
            try
            {
                if (_cleanupEvaluationIds.Count > 0)
                {
                    var evals = _context.VivaEvaluations
                        .IgnoreQueryFilters()
                        .Where(e => _cleanupEvaluationIds.Contains(e.Id))
                        .ToList();
                    _context.VivaEvaluations.RemoveRange(evals);
                    _context.SaveChanges();
                }

                if (_cleanupTeamIds.Count > 0)
                {
                    var teams = _context.ProjectTeams
                        .IgnoreQueryFilters()
                        .Where(t => _cleanupTeamIds.Contains(t.Id))
                        .ToList();
                    _context.ProjectTeams.RemoveRange(teams);
                    _context.SaveChanges();
                }
            }
            catch
            {
                // Best effort cleanup
            }
        }
        _context.Dispose();
    }
}
