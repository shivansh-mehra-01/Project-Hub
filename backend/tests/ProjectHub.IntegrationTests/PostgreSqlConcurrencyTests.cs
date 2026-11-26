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
    private readonly List<Guid> _cleanupUserIds = new();
    private readonly List<Guid> _cleanupTrackIds = new();

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
            Role = UserRole.HOD,
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

    [Fact]
    public async Task PostgreSql_ConcurrentInvitationAcceptance_EnforcesMaxCapacity_WithoutOverAllocation()
    {
        if (!_isPostgreSqlAvailable) return;

        // 1. Setup an academic track with MaxTeamSize = 3
        var track = new AcademicTrack
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            DepartmentId = CseDeptId,
            Name = $"CT-{Guid.NewGuid():N}"[..20],
            AcademicYear = "2026-2027",
            MinTeamSize = 2,
            MaxTeamSize = 3,
            IsActive = true
        };
        _context.AcademicTracks.Add(track);
        await _context.SaveChangesAsync();

        // 2. Setup team with 2 existing members (exactly 1 remaining slot out of 3)
        var team = new ProjectTeam
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            DepartmentId = CseDeptId,
            AcademicTrackId = track.Id,
            TeamCode = $"CONC-{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
            Title = "PostgreSQL Concurrent Invitation Test Team",
            Abstract = "Testing row-level lock and capacity serialization",
            DomainTag = "Concurrency Testing",
            Status = ProjectStatus.Draft,
            IsRosterLocked = false,
            IsDeleted = false
        };
        _context.ProjectTeams.Add(team);

        var m1UserId = Guid.NewGuid();
        var m2UserId = Guid.NewGuid();
        var inviteeAId = Guid.NewGuid();
        var inviteeBId = Guid.NewGuid();

        var users = new List<UserAccount>
        {
            new() { Id = m1UserId, CollegeId = SistecTenantId, DepartmentId = CseDeptId, FullName = "Member 1", Email = $"m1.{Guid.NewGuid():N}@sistec.ac.in", EnrollmentOrEmployeeCode = $"0176CS{Random.Shared.Next(100000, 999999)}", Role = UserRole.Student, IsActivated = true, IsActive = true },
            new() { Id = m2UserId, CollegeId = SistecTenantId, DepartmentId = CseDeptId, FullName = "Member 2", Email = $"m2.{Guid.NewGuid():N}@sistec.ac.in", EnrollmentOrEmployeeCode = $"0176CS{Random.Shared.Next(100000, 999999)}", Role = UserRole.Student, IsActivated = true, IsActive = true },
            new() { Id = inviteeAId, CollegeId = SistecTenantId, DepartmentId = CseDeptId, FullName = "Invitee A", Email = $"ia.{Guid.NewGuid():N}@sistec.ac.in", EnrollmentOrEmployeeCode = $"0176CS{Random.Shared.Next(100000, 999999)}", Role = UserRole.Student, IsActivated = true, IsActive = true },
            new() { Id = inviteeBId, CollegeId = SistecTenantId, DepartmentId = CseDeptId, FullName = "Invitee B", Email = $"ib.{Guid.NewGuid():N}@sistec.ac.in", EnrollmentOrEmployeeCode = $"0176CS{Random.Shared.Next(100000, 999999)}", Role = UserRole.Student, IsActivated = true, IsActive = true }
        };
        _context.Users.AddRange(users);
        _cleanupUserIds.AddRange(users.Select(u => u.Id));
        _cleanupTrackIds.Add(track.Id);

        var member1 = new TeamMember
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            ProjectTeamId = team.Id,
            UserId = m1UserId,
            IsTeamLead = true,
            IsActive = true
        };
        var member2 = new TeamMember
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            ProjectTeamId = team.Id,
            UserId = m2UserId,
            IsTeamLead = false,
            IsActive = true
        };
        _context.TeamMembers.AddRange(member1, member2);

        // 3. Setup 2 invitees with valid pending invitations
        var inviteA = new TeamInvitation
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            ProjectTeamId = team.Id,
            InviterStudentId = member1.UserId,
            InviteeStudentId = inviteeAId,
            Status = InvitationStatus.Pending,
            InvitedAtUtc = DateTime.UtcNow,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
        };
        var inviteB = new TeamInvitation
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            ProjectTeamId = team.Id,
            InviterStudentId = member1.UserId,
            InviteeStudentId = inviteeBId,
            Status = InvitationStatus.Pending,
            InvitedAtUtc = DateTime.UtcNow,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
        };
        _context.TeamInvitations.AddRange(inviteA, inviteB);
        await _context.SaveChangesAsync();
        _cleanupTeamIds.Add(team.Id);

        // 4. Simulate two simultaneous acceptance requests racing for the 1 remaining slot
        async Task<(bool Success, string Reason)> AttemptAcceptAsync(Guid inviteId, Guid studentId)
        {
            var options = new DbContextOptionsBuilder<ProjectHubDbContext>().UseNpgsql(ConnectionString).Options;
            var tenant = new TenantContext { CollegeId = SistecTenantId, IsSuperAdmin = true };
            using var db = new ProjectHubDbContext(options, tenant);

            await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted);
            try
            {
                // Exclusive row lock on ProjectTeam
                await db.Database.ExecuteSqlRawAsync(
                    "SELECT \"Id\" FROM \"ProjectTeams\" WHERE \"Id\" = {0} FOR UPDATE",
                    team.Id);

                var inv = await db.TeamInvitations.FirstOrDefaultAsync(i => i.Id == inviteId);
                if (inv == null || inv.Status != InvitationStatus.Pending)
                {
                    await tx.RollbackAsync();
                    return (false, "InvalidInvitation");
                }

                var currentMembers = await db.TeamMembers
                    .CountAsync(m => m.ProjectTeamId == team.Id && m.IsActive && !m.IsDeleted);

                var trk = await db.AcademicTracks.FirstOrDefaultAsync(t => t.Id == track.Id);
                var maxCap = trk?.MaxTeamSize ?? 4;

                if (currentMembers >= maxCap)
                {
                    await tx.RollbackAsync();
                    return (false, "CapacityReached");
                }

                db.TeamMembers.Add(new TeamMember
                {
                    CollegeId = SistecTenantId,
                    ProjectTeamId = team.Id,
                    UserId = studentId,
                    IsTeamLead = false,
                    IsActive = true
                });

                inv.Status = InvitationStatus.Accepted;
                inv.RespondedAtUtc = DateTime.UtcNow;

                await db.SaveChangesAsync();
                await tx.CommitAsync();
                return (true, "Accepted");
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return (false, ex.Message);
            }
        }

        var taskA = Task.Run(() => AttemptAcceptAsync(inviteA.Id, inviteeAId));
        var taskB = Task.Run(() => AttemptAcceptAsync(inviteB.Id, inviteeBId));

        var results = await Task.WhenAll(taskA, taskB);

        // Exactly one must succeed, and exactly one must be rejected due to capacity limit
        var successCount = results.Count(r => r.Success);
        var conflictCount = results.Count(r => !r.Success && r.Reason == "CapacityReached");

        Assert.Equal(1, successCount);
        Assert.Equal(1, conflictCount);

        // Verify PostgreSQL final count is strictly 3 (never 4)
        var finalMemberCount = await _context.TeamMembers
            .CountAsync(m => m.ProjectTeamId == team.Id && m.IsActive && !m.IsDeleted);
        Assert.Equal(3, finalMemberCount);

        // Verify invitation statuses in DB freshly
        using var verifyContext = new ProjectHubDbContext(
            new DbContextOptionsBuilder<ProjectHubDbContext>().UseNpgsql(ConnectionString).Options,
            new TenantContext { CollegeId = SistecTenantId, IsSuperAdmin = true });

        var updatedA = await verifyContext.TeamInvitations.AsNoTracking().FirstOrDefaultAsync(i => i.Id == inviteA.Id);
        var updatedB = await verifyContext.TeamInvitations.AsNoTracking().FirstOrDefaultAsync(i => i.Id == inviteB.Id);
        Assert.NotNull(updatedA);
        Assert.NotNull(updatedB);

        // Exactly one invitation accepted
        Assert.True(
            (updatedA.Status == InvitationStatus.Accepted && updatedB.Status == InvitationStatus.Pending) ||
            (updatedB.Status == InvitationStatus.Accepted && updatedA.Status == InvitationStatus.Pending),
            $"A status: {updatedA.Status}, B status: {updatedB.Status}");
    }

    [Fact]
    public async Task PostgreSql_OfficialGuideAllocation_PersistsAcrossFreshDbContext()
    {
        if (!_isPostgreSqlAvailable) return;

        var team = await CreateTestProjectTeamAsync();
        var faculty = new UserAccount
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            DepartmentId = CseDeptId,
            FullName = "Dr. Postgres Mentor",
            Email = $"pgmentor.{Guid.NewGuid():N}@sistec.ac.in",
            EnrollmentOrEmployeeCode = $"0176CS{Random.Shared.Next(100000, 999999)}",
            Role = UserRole.Faculty,
            IsActivated = true,
            IsActive = true
        };
        _context.Users.Add(faculty);
        await _context.SaveChangesAsync();
        _cleanupUserIds.Add(faculty.Id);

        // 1. Mutate team in PostgreSQL with Phase 5 fields
        team.PreferredGuideUserId = faculty.Id;
        team.GuidePreferenceStatus = GuidePreferenceStatus.Requested;
        team.GuidePreferenceSubmittedAtUtc = DateTime.UtcNow;
        team.GuidePreferenceRemarks = "Real PostgreSQL transaction test";
        await _context.SaveChangesAsync();

        // 2. Open brand new DbContext instance to verify physical PostgreSQL persistence
        var optionsBuilder = new DbContextOptionsBuilder<ProjectHubDbContext>();
        optionsBuilder.UseNpgsql(ConnectionString);
        var tenantContext = new TenantContext { CollegeId = SistecTenantId, IsSuperAdmin = true };
        using var freshContext = new ProjectHubDbContext(optionsBuilder.Options, tenantContext);

        var loaded = await freshContext.ProjectTeams
            .Include(t => t.PreferredGuideUser)
            .FirstOrDefaultAsync(t => t.Id == team.Id);

        Assert.NotNull(loaded);
        Assert.Equal(faculty.Id, loaded.PreferredGuideUserId);
        Assert.Equal(GuidePreferenceStatus.Requested, loaded.GuidePreferenceStatus);
        Assert.Equal("Real PostgreSQL transaction test", loaded.GuidePreferenceRemarks);
        Assert.Null(loaded.GuideUserId); // GuideUserId remains null
        Assert.NotNull(loaded.PreferredGuideUser);
        Assert.Equal("Dr. Postgres Mentor", loaded.PreferredGuideUser.FullName);
    }

    [Fact]
    public async Task PostgreSql_HodOfficialGuideAllocation_PersistsAndSynchronizesParityAcrossFreshDbContext()
    {
        if (!_isPostgreSqlAvailable) return;

        // 1. Arrange: Team in Draft with requested preferred guide
        var team = await CreateTestProjectTeamAsync();
        var facultyA = new UserAccount
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            DepartmentId = CseDeptId,
            FullName = "Dr. Student Preference",
            Email = $"pref.{Guid.NewGuid():N}@sistec.ac.in",
            EnrollmentOrEmployeeCode = $"EMP-A-{Guid.NewGuid():N}"[..12],
            Role = UserRole.Faculty,
            IsActive = true
        };
        var facultyB = new UserAccount
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            DepartmentId = CseDeptId,
            FullName = "Dr. HOD Assigned Guide",
            Email = $"assigned.{Guid.NewGuid():N}@sistec.ac.in",
            EnrollmentOrEmployeeCode = $"EMP-B-{Guid.NewGuid():N}"[..12],
            Role = UserRole.Faculty,
            IsActive = true
        };
        _context.Users.AddRange(facultyA, facultyB);
        _cleanupUserIds.Add(facultyA.Id);
        _cleanupUserIds.Add(facultyB.Id);

        team.PreferredGuideUserId = facultyA.Id;
        team.GuidePreferenceStatus = GuidePreferenceStatus.Requested;
        team.GuidePreferenceSubmittedAtUtc = DateTime.UtcNow;
        team.GuidePreferenceRemarks = "Student nomination prior to HOD review";
        await _context.SaveChangesAsync();

        // 2. Act: Simulate HOD assigning official guide via DbContext (same as HodController)
        team.GuideUserId = facultyB.Id;
        var excAudit = new ExceptionAuditLog
        {
            CollegeId = SistecTenantId,
            DepartmentId = CseDeptId,
            ProjectTeamId = team.Id,
            ActionType = ExceptionActionType.ReassignGuide,
            TargetUserId = facultyB.Id,
            Reason = "Allocated officially by HOD committee",
            RequestedByUserId = EvaluatorVermaId,
            ApprovedByUserId = EvaluatorVermaId,
            ApprovedAtUtc = DateTime.UtcNow
        };
        _context.ExceptionAuditLogs.Add(excAudit);
        await _context.SaveChangesAsync();

        // 3. Assert in fresh DbContext connecting to PostgreSQL
        var optionsBuilder = new DbContextOptionsBuilder<ProjectHubDbContext>();
        optionsBuilder.UseNpgsql(ConnectionString);
        var tenantContext = new TenantContext { CollegeId = SistecTenantId, IsSuperAdmin = true };
        using var freshContext = new ProjectHubDbContext(optionsBuilder.Options, tenantContext);

        var loaded = await freshContext.ProjectTeams
            .Include(t => t.GuideUser)
            .Include(t => t.PreferredGuideUser)
            .FirstOrDefaultAsync(t => t.Id == team.Id);

        Assert.NotNull(loaded);
        Assert.Equal(facultyB.Id, loaded.GuideUserId); // Official guide assigned
        Assert.Equal(facultyA.Id, loaded.PreferredGuideUserId); // Preferred guide preserved
        Assert.Equal(GuidePreferenceStatus.Allocated, loaded.GuidePreferenceStatus); // Automatically synchronized!
        Assert.NotNull(loaded.GuideAllocatedAtUtc);
        Assert.Equal("Allocated officially by HOD committee", loaded.GuideAllocationRemarks);

        // Verify ExceptionAuditLog in PostgreSQL
        var savedLog = await freshContext.ExceptionAuditLogs
            .FirstOrDefaultAsync(l => l.ProjectTeamId == team.Id && l.ActionType == ExceptionActionType.ReassignGuide);
        Assert.NotNull(savedLog);
        Assert.Equal("Allocated officially by HOD committee", savedLog.Reason);
    }

    [Fact]
    public async Task PostgreSql_ConcurrentGuideAllocation_EnforcesMaxCapacity_WithoutOverAllocation()
    {
        if (!_isPostgreSqlAvailable) return;

        // 1. Arrange: Faculty member with known MaxMentorTeams = 2
        var faculty = new UserAccount
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            DepartmentId = CseDeptId,
            FullName = "Dr. Concurrency Guide",
            Email = $"guide.conc.{Guid.NewGuid():N}@sistec.ac.in",
            EnrollmentOrEmployeeCode = $"EMP-G-{Guid.NewGuid():N}"[..12],
            Role = UserRole.Faculty,
            Designation = FacultyDesignation.Professor,
            MaxMentorTeams = 2,
            IsActivated = true,
            IsActive = true
        };
        _context.Users.Add(faculty);
        _cleanupUserIds.Add(faculty.Id);

        // 2. Pre-fill all but one available slot: Allocate 1 team (1 of 2 occupied)
        var preAllocatedTeam = new ProjectTeam
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            DepartmentId = CseDeptId,
            AcademicTrackId = MinorTrackId,
            TeamCode = $"OCC-{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
            Title = "Occupied Slot Team",
            Abstract = "Pre-allocated team occupying 1 of 2 mentor slots",
            DomainTag = "Concurrency Verification",
            Status = ProjectStatus.Draft,
            GuideUserId = faculty.Id,
            GuidePreferenceStatus = GuidePreferenceStatus.Allocated,
            GuideAllocatedAtUtc = DateTime.UtcNow,
            IsDeleted = false
        };
        _context.ProjectTeams.Add(preAllocatedTeam);
        _cleanupTeamIds.Add(preAllocatedTeam.Id);

        // 3. Create two competing candidate teams racing for the single remaining slot
        var candidateTeam1 = new ProjectTeam
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            DepartmentId = CseDeptId,
            AcademicTrackId = MinorTrackId,
            TeamCode = $"RACE1-{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
            Title = "Racing Candidate Team 1",
            Abstract = "Candidate team 1 competing for last mentorship slot",
            DomainTag = "Concurrency Verification",
            Status = ProjectStatus.Draft,
            PreferredGuideUserId = faculty.Id,
            GuidePreferenceStatus = GuidePreferenceStatus.Requested,
            GuideUserId = null,
            IsDeleted = false
        };
        var candidateTeam2 = new ProjectTeam
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            DepartmentId = CseDeptId,
            AcademicTrackId = MinorTrackId,
            TeamCode = $"RACE2-{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
            Title = "Racing Candidate Team 2",
            Abstract = "Candidate team 2 competing for last mentorship slot",
            DomainTag = "Concurrency Verification",
            Status = ProjectStatus.Draft,
            PreferredGuideUserId = faculty.Id,
            GuidePreferenceStatus = GuidePreferenceStatus.Requested,
            GuideUserId = null,
            IsDeleted = false
        };
        _context.ProjectTeams.AddRange(candidateTeam1, candidateTeam2);
        _cleanupTeamIds.Add(candidateTeam1.Id);
        _cleanupTeamIds.Add(candidateTeam2.Id);
        await _context.SaveChangesAsync();

        // 4. Concurrency worker simulating Coordinator allocation with PostgreSQL row locking
        async Task<(bool Success, string Reason)> AttemptAllocationAsync(Guid targetTeamId)
        {
            var options = new DbContextOptionsBuilder<ProjectHubDbContext>().UseNpgsql(ConnectionString).Options;
            var tenant = new TenantContext
            {
                CollegeId = SistecTenantId,
                UserId = faculty.Id,
                Role = UserRole.Faculty,
                IsProjectCoordinator = true
            };
            using var db = new ProjectHubDbContext(options, tenant);

            await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted);
            try
            {
                // Exclusive row lock on UserAccounts for the guide: serializes concurrent allocation attempts
                await db.Database.ExecuteSqlRawAsync(
                    "SELECT \"Id\" FROM \"UserAccounts\" WHERE \"Id\" = {0} FOR UPDATE",
                    faculty.Id);

                var guideUser = await db.Users.FirstOrDefaultAsync(u => u.Id == faculty.Id && !u.IsDeleted);
                if (guideUser == null)
                {
                    await tx.RollbackAsync();
                    return (false, "GuideNotFound");
                }

                var currentLoad = await db.ProjectTeams
                    .CountAsync(t => t.GuideUserId == faculty.Id && t.CollegeId == SistecTenantId && !t.IsDeleted && t.Status != ProjectStatus.Archived && t.Id != targetTeamId);

                if (currentLoad >= guideUser.MaxMentorTeams)
                {
                    await tx.RollbackAsync();
                    return (false, "CapacityExceeded");
                }

                var teamToAssign = await db.ProjectTeams.FirstOrDefaultAsync(t => t.Id == targetTeamId && !t.IsDeleted);
                if (teamToAssign == null)
                {
                    await tx.RollbackAsync();
                    return (false, "TeamNotFound");
                }

                teamToAssign.GuideUserId = faculty.Id;
                teamToAssign.GuidePreferenceStatus = GuidePreferenceStatus.Allocated;
                teamToAssign.GuideAllocatedAtUtc = DateTime.UtcNow;
                teamToAssign.GuideAllocatedByUserId = tenant.UserId;
                teamToAssign.GuideAllocationRemarks = "Allocated concurrently under row-lock test";

                var auditLog = new ExceptionAuditLog
                {
                    CollegeId = SistecTenantId,
                    DepartmentId = CseDeptId,
                    ProjectTeamId = targetTeamId,
                    ActionType = ExceptionActionType.ReassignGuide,
                    TargetUserId = faculty.Id,
                    Reason = "Allocated concurrently under row-lock test",
                    PreviousValueJson = "{}",
                    NewValueJson = System.Text.Json.JsonSerializer.Serialize(new { guideUserId = faculty.Id }),
                    RequestedByUserId = tenant.UserId!.Value,
                    ApprovedByUserId = tenant.UserId,
                    ApprovedAtUtc = DateTime.UtcNow
                };
                await db.ExceptionAuditLogs.AddAsync(auditLog);

                await db.SaveChangesAsync();
                await tx.CommitAsync();
                return (true, "Allocated");
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return (false, ex.Message);
            }
        }

        // 5. Act: Launch simultaneous allocation requests racing for the single available slot
        var task1 = Task.Run(() => AttemptAllocationAsync(candidateTeam1.Id));
        var task2 = Task.Run(() => AttemptAllocationAsync(candidateTeam2.Id));

        var results = await Task.WhenAll(task1, task2);

        // 6. Assert: Exactly one must succeed, exactly one must be rejected due to capacity limit
        var successCount = results.Count(r => r.Success);
        var conflictCount = results.Count(r => !r.Success && r.Reason == "CapacityExceeded");

        Assert.Equal(1, successCount);
        Assert.Equal(1, conflictCount);

        // 7. Verify physical persistence in fresh DbContext: exactly 2 teams allocated, capacity never exceeded
        var verifyOptions = new DbContextOptionsBuilder<ProjectHubDbContext>().UseNpgsql(ConnectionString).Options;
        var verifyTenant = new TenantContext { CollegeId = SistecTenantId, IsSuperAdmin = true };
        using var verifyDb = new ProjectHubDbContext(verifyOptions, verifyTenant);

        var finalAllocatedCount = await verifyDb.ProjectTeams
            .CountAsync(t => t.GuideUserId == faculty.Id && !t.IsDeleted);
        Assert.Equal(2, finalAllocatedCount); // Exactly MaxMentorTeams = 2, NEVER 3!

        // 8. Verify correct rollback: rejected team retained GuideUserId = null and Requested preference
        var team1Fresh = await verifyDb.ProjectTeams.FindAsync(candidateTeam1.Id);
        var team2Fresh = await verifyDb.ProjectTeams.FindAsync(candidateTeam2.Id);
        Assert.NotNull(team1Fresh);
        Assert.NotNull(team2Fresh);

        var allocatedTeam = team1Fresh.GuideUserId == faculty.Id ? team1Fresh : team2Fresh;
        var rejectedTeam = team1Fresh.GuideUserId == null ? team1Fresh : team2Fresh;

        Assert.Equal(GuidePreferenceStatus.Allocated, allocatedTeam.GuidePreferenceStatus);
        Assert.NotNull(allocatedTeam.GuideAllocatedAtUtc);
        Assert.NotNull(allocatedTeam.GuideAllocatedByUserId);

        Assert.Null(rejectedTeam.GuideUserId);
        Assert.Equal(GuidePreferenceStatus.Requested, rejectedTeam.GuidePreferenceStatus);
        Assert.Null(rejectedTeam.GuideAllocatedAtUtc);
        Assert.Null(rejectedTeam.GuideAllocatedByUserId);
    }

    [Fact]
    public async Task PostgreSql_HodAndCoordinator_ShareCapacityLock_PreventingOverAllocation()
    {
        if (!_isPostgreSqlAvailable) return;

        // 1. Arrange: Faculty member with known MaxMentorTeams = 2
        var faculty = new UserAccount
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            DepartmentId = CseDeptId,
            FullName = "Dr. CrossPath Mentor",
            Email = $"crosspath.mentor.{Guid.NewGuid():N}@sistec.ac.in",
            EnrollmentOrEmployeeCode = $"EMP-CP-{Guid.NewGuid():N}"[..12],
            Role = UserRole.Faculty,
            Designation = FacultyDesignation.AssociateProfessor,
            MaxMentorTeams = 2,
            IsActivated = true,
            IsActive = true
        };
        _context.Users.Add(faculty);
        _cleanupUserIds.Add(faculty.Id);

        // Pre-fill 1 slot: 1 of 2 occupied
        var preAllocatedTeam = new ProjectTeam
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            DepartmentId = CseDeptId,
            AcademicTrackId = MinorTrackId,
            TeamCode = $"CP-OCC-{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
            Title = "CrossPath Pre-allocated Team",
            Abstract = "Pre-allocated team occupying 1 of 2 slots",
            DomainTag = "Concurrency Verification",
            Status = ProjectStatus.Draft,
            GuideUserId = faculty.Id,
            GuidePreferenceStatus = GuidePreferenceStatus.Allocated,
            GuideAllocatedAtUtc = DateTime.UtcNow,
            IsDeleted = false
        };
        _context.ProjectTeams.Add(preAllocatedTeam);
        _cleanupTeamIds.Add(preAllocatedTeam.Id);

        // Two racing candidate teams
        var hodTeam = new ProjectTeam
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            DepartmentId = CseDeptId,
            AcademicTrackId = MinorTrackId,
            TeamCode = $"HOD-{Guid.NewGuid():N}"[..16].ToUpperInvariant(),
            Title = "HOD Race Candidate Team",
            Abstract = "HOD allocating this team",
            DomainTag = "Concurrency Verification",
            Status = ProjectStatus.Draft,
            PreferredGuideUserId = faculty.Id,
            GuidePreferenceStatus = GuidePreferenceStatus.Requested,
            GuideUserId = null,
            IsDeleted = false
        };
        var coordTeam = new ProjectTeam
        {
            Id = Guid.NewGuid(),
            CollegeId = SistecTenantId,
            DepartmentId = CseDeptId,
            AcademicTrackId = MinorTrackId,
            TeamCode = $"CRD-{Guid.NewGuid():N}"[..16].ToUpperInvariant(),
            Title = "Coordinator Race Candidate Team",
            Abstract = "Coordinator allocating this team",
            DomainTag = "Concurrency Verification",
            Status = ProjectStatus.Draft,
            PreferredGuideUserId = faculty.Id,
            GuidePreferenceStatus = GuidePreferenceStatus.Requested,
            GuideUserId = null,
            IsDeleted = false
        };
        _context.ProjectTeams.AddRange(hodTeam, coordTeam);
        _cleanupTeamIds.Add(hodTeam.Id);
        _cleanupTeamIds.Add(coordTeam.Id);

        await _context.SaveChangesAsync();

        // 2. Define concurrent allocation actions for HOD and Coordinator
        async Task<(bool Success, string Reason)> AttemptHodAllocationAsync()
        {
            var options = new DbContextOptionsBuilder<ProjectHubDbContext>().UseNpgsql(ConnectionString).Options;
            var tenant = new TenantContext
            {
                CollegeId = SistecTenantId,
                DepartmentId = CseDeptId,
                UserId = EvaluatorVermaId,
                Role = UserRole.HOD
            };
            using var db = new ProjectHubDbContext(options, tenant);

            try
            {
                var target = await db.ProjectTeams.FirstAsync(t => t.Id == hodTeam.Id);
                target.GuideUserId = faculty.Id;
                await db.SaveChangesAsync();
                return (true, "HodSuccess");
            }
            catch (Exception ex)
            {
                return (false, ex.InnerException?.Message ?? ex.Message);
            }
        }

        async Task<(bool Success, string Reason)> AttemptCoordAllocationAsync()
        {
            var options = new DbContextOptionsBuilder<ProjectHubDbContext>().UseNpgsql(ConnectionString).Options;
            var tenant = new TenantContext
            {
                CollegeId = SistecTenantId,
                DepartmentId = CseDeptId,
                UserId = EvaluatorVermaId,
                Role = UserRole.Faculty,
                IsProjectCoordinator = true
            };
            using var db = new ProjectHubDbContext(options, tenant);

            try
            {
                var target = await db.ProjectTeams.FirstAsync(t => t.Id == coordTeam.Id);
                target.GuideUserId = faculty.Id;
                await db.SaveChangesAsync();
                return (true, "CoordSuccess");
            }
            catch (Exception ex)
            {
                return (false, ex.InnerException?.Message ?? ex.Message);
            }
        }

        // 3. Act: Race HOD vs Coordinator for the single remaining slot
        var taskHod = Task.Run(AttemptHodAllocationAsync);
        var taskCoord = Task.Run(AttemptCoordAllocationAsync);

        var results = await Task.WhenAll(taskHod, taskCoord);

        // 4. Assert: Exactly one path succeeds, exactly one is rejected with capacity limit
        var successCount = results.Count(r => r.Success);
        var failureCount = results.Count(r => !r.Success);

        Assert.Equal(1, successCount);
        Assert.Equal(1, failureCount);
        Assert.Contains(results, r => !r.Success && r.Reason.Contains("maximum mentorship capacity"));

        // 5. Verify database integrity
        var verifyOptions = new DbContextOptionsBuilder<ProjectHubDbContext>().UseNpgsql(ConnectionString).Options;
        var verifyTenant = new TenantContext { CollegeId = SistecTenantId, IsSuperAdmin = true };
        using var verifyDb = new ProjectHubDbContext(verifyOptions, verifyTenant);

        var totalAllocated = await verifyDb.ProjectTeams.CountAsync(t => t.GuideUserId == faculty.Id && !t.IsDeleted);
        Assert.Equal(2, totalAllocated); // MaxMentorTeams was 2, exactly 2 allocated, NEVER 3!
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

                if (_cleanupTrackIds.Count > 0)
                {
                    var tracks = _context.AcademicTracks
                        .IgnoreQueryFilters()
                        .Where(t => _cleanupTrackIds.Contains(t.Id))
                        .ToList();
                    _context.AcademicTracks.RemoveRange(tracks);
                    _context.SaveChanges();
                }

                if (_cleanupUserIds.Count > 0)
                {
                    var users = _context.Users
                        .IgnoreQueryFilters()
                        .Where(u => _cleanupUserIds.Contains(u.Id))
                        .ToList();
                    _context.Users.RemoveRange(users);
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

    [Fact]
    public async Task PostgreSql_DepartmentXminConcurrencyToken_BlocksStaleConcurrentHodUpdate()
    {
        if (!_isPostgreSqlAvailable) return;

        var deptId = Guid.NewGuid();
        var fac1Id = Guid.NewGuid();
        var fac2Id = Guid.NewGuid();

        var optionsBuilder = new DbContextOptionsBuilder<ProjectHubDbContext>();
        optionsBuilder.UseNpgsql(ConnectionString);
        var adminTenant = new TenantContext
        {
            CollegeId = SistecTenantId,
            Role = UserRole.CollegeAdmin,
            IsSuperAdmin = true
        };

        try
        {
            await using (var setupCtx = new ProjectHubDbContext(optionsBuilder.Options, adminTenant))
            {
                setupCtx.Departments.Add(new Department
                {
                    Id = deptId,
                    CollegeId = SistecTenantId,
                    Code = $"PG{Guid.NewGuid():N}"[..8].ToUpperInvariant(),
                    Name = "PG Concurrency Test Dept",
                    IntakeQuota = 60,
                    IsDeleted = false,
                    CreatedAtUtc = DateTime.UtcNow
                });
                setupCtx.Users.AddRange(
                    new UserAccount
                    {
                        Id = fac1Id,
                        CollegeId = SistecTenantId,
                        DepartmentId = deptId,
                        FullName = "PG Faculty 1",
                        Email = $"pg.fac1.{Guid.NewGuid():N}@sistec.ac.in",
                        EnrollmentOrEmployeeCode = $"PG1-{Guid.NewGuid():N}"[..12],
                        Role = UserRole.Faculty,
                        IsActive = true,
                        CreatedAtUtc = DateTime.UtcNow
                    },
                    new UserAccount
                    {
                        Id = fac2Id,
                        CollegeId = SistecTenantId,
                        DepartmentId = deptId,
                        FullName = "PG Faculty 2",
                        Email = $"pg.fac2.{Guid.NewGuid():N}@sistec.ac.in",
                        EnrollmentOrEmployeeCode = $"PG2-{Guid.NewGuid():N}"[..12],
                        Role = UserRole.Faculty,
                        IsActive = true,
                        CreatedAtUtc = DateTime.UtcNow
                    });
                await setupCtx.SaveChangesAsync();
            }

            await using var ctx1 = new ProjectHubDbContext(optionsBuilder.Options, adminTenant);
            await using var ctx2 = new ProjectHubDbContext(optionsBuilder.Options, adminTenant);

            var dept1 = await ctx1.Departments.FirstAsync(d => d.Id == deptId);
            var dept2 = await ctx2.Departments.FirstAsync(d => d.Id == deptId);

            dept1.HodUserId = fac1Id;
            await ctx1.SaveChangesAsync();

            dept2.HodUserId = fac2Id;
            await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => ctx2.SaveChangesAsync());
        }
        finally
        {
            await using var cleanupCtx = new ProjectHubDbContext(optionsBuilder.Options, adminTenant);
            var dept = await cleanupCtx.Departments.IgnoreQueryFilters().FirstOrDefaultAsync(d => d.Id == deptId);
            if (dept != null) cleanupCtx.Departments.Remove(dept);
            var users = await cleanupCtx.Users.IgnoreQueryFilters().Where(u => u.Id == fac1Id || u.Id == fac2Id).ToListAsync();
            if (users.Count > 0) cleanupCtx.Users.RemoveRange(users);
            await cleanupCtx.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task PostgreSql_DepartmentXminConcurrencyToken_BlocksStaleConcurrentHodRelief()
    {
        if (!_isPostgreSqlAvailable) return;

        var deptId = Guid.NewGuid();
        var hodId = Guid.NewGuid();

        var optionsBuilder = new DbContextOptionsBuilder<ProjectHubDbContext>();
        optionsBuilder.UseNpgsql(ConnectionString);
        var adminTenant = new TenantContext
        {
            CollegeId = SistecTenantId,
            Role = UserRole.CollegeAdmin,
            IsSuperAdmin = true
        };

        try
        {
            await using (var setupCtx = new ProjectHubDbContext(optionsBuilder.Options, adminTenant))
            {
                setupCtx.Departments.Add(new Department
                {
                    Id = deptId,
                    CollegeId = SistecTenantId,
                    Code = $"PG{Guid.NewGuid():N}"[..8].ToUpperInvariant(),
                    Name = "PG Concurrent Relief Dept",
                    IntakeQuota = 60,
                    IsDeleted = false,
                    CreatedAtUtc = DateTime.UtcNow
                });
                setupCtx.Users.Add(new UserAccount
                {
                    Id = hodId,
                    CollegeId = SistecTenantId,
                    DepartmentId = deptId,
                    FullName = "PG Concurrent HOD",
                    Email = $"pg.hod.{Guid.NewGuid():N}@sistec.ac.in",
                    EnrollmentOrEmployeeCode = $"PGH-{Guid.NewGuid():N}"[..12],
                    Role = UserRole.HOD,
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow
                });
                await setupCtx.SaveChangesAsync();

                var seededDept = await setupCtx.Departments.FirstAsync(d => d.Id == deptId);
                seededDept.HodUserId = hodId;
                await setupCtx.SaveChangesAsync();
            }

            await using var ctx1 = new ProjectHubDbContext(optionsBuilder.Options, adminTenant);
            await using var ctx2 = new ProjectHubDbContext(optionsBuilder.Options, adminTenant);

            var dept1 = await ctx1.Departments.FirstAsync(d => d.Id == deptId);
            var dept2 = await ctx2.Departments.FirstAsync(d => d.Id == deptId);

            dept1.HodUserId = null;
            await ctx1.SaveChangesAsync();

            dept2.HodUserId = null;
            await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => ctx2.SaveChangesAsync());
        }
        finally
        {
            await using var cleanupCtx = new ProjectHubDbContext(optionsBuilder.Options, adminTenant);
            var dept = await cleanupCtx.Departments.IgnoreQueryFilters().FirstOrDefaultAsync(d => d.Id == deptId);
            if (dept != null) cleanupCtx.Departments.Remove(dept);
            var users = await cleanupCtx.Users.IgnoreQueryFilters().Where(u => u.Id == hodId).ToListAsync();
            if (users.Count > 0) cleanupCtx.Users.RemoveRange(users);
            await cleanupCtx.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task PostgreSql_UniqueIndex_BlocksDuplicateActiveStudentNumber()
    {
        if (!_isPostgreSqlAvailable) return;

        var student1Id = Guid.NewGuid();
        var student2Id = Guid.NewGuid();
        var studentNumber = $"STU{Guid.NewGuid():N}"[..12].ToUpperInvariant();

        var optionsBuilder = new DbContextOptionsBuilder<ProjectHubDbContext>();
        optionsBuilder.UseNpgsql(ConnectionString);
        var adminTenant = new TenantContext
        {
            CollegeId = SistecTenantId,
            Role = UserRole.CollegeAdmin,
            IsSuperAdmin = true
        };

        try
        {
            await using var setupCtx = new ProjectHubDbContext(optionsBuilder.Options, adminTenant);
            setupCtx.Users.Add(new UserAccount
            {
                Id = student1Id,
                CollegeId = SistecTenantId,
                DepartmentId = CseDeptId,
                FullName = "PG Student One",
                Email = $"pg.student1.{Guid.NewGuid():N}@sistec.ac.in",
                EnrollmentOrEmployeeCode = studentNumber,
                Role = UserRole.Student,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
            await setupCtx.SaveChangesAsync();

            setupCtx.Users.Add(new UserAccount
            {
                Id = student2Id,
                CollegeId = SistecTenantId,
                DepartmentId = CseDeptId,
                FullName = "PG Student Two",
                Email = $"pg.student2.{Guid.NewGuid():N}@sistec.ac.in",
                EnrollmentOrEmployeeCode = studentNumber,
                Role = UserRole.Student,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });

            var ex = await Assert.ThrowsAsync<DbUpdateException>(() => setupCtx.SaveChangesAsync());
            var pgEx = Assert.IsType<PostgresException>(ex.InnerException);
            Assert.Equal("23505", pgEx.SqlState);
        }
        finally
        {
            await using var cleanupCtx = new ProjectHubDbContext(optionsBuilder.Options, adminTenant);
            var users = await cleanupCtx.Users.IgnoreQueryFilters().Where(u => u.Id == student1Id || u.Id == student2Id).ToListAsync();
            if (users.Count > 0) cleanupCtx.Users.RemoveRange(users);
            await cleanupCtx.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task PostgreSql_SerializableTransaction_PreventsConcurrentDeactivationOfLastTwoCollegeAdmins()
    {
        if (!_isPostgreSqlAvailable) return;

        var collegeId = Guid.NewGuid();
        var admin1Id = Guid.NewGuid();
        var admin2Id = Guid.NewGuid();

        var optionsBuilder = new DbContextOptionsBuilder<ProjectHubDbContext>();
        optionsBuilder.UseNpgsql(ConnectionString);
        var adminTenant = new TenantContext
        {
            CollegeId = collegeId,
            Role = UserRole.CollegeAdmin,
            IsSuperAdmin = true
        };

        try
        {
            await using (var setupCtx = new ProjectHubDbContext(optionsBuilder.Options, adminTenant))
            {
                setupCtx.CollegeTenants.Add(new CollegeTenant
                {
                    Id = collegeId,
                    Name = "PG Last Admin Concurrency",
                    TenantCode = $"PGLA_{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
                    SsoDomain = $"pgla-{Guid.NewGuid():N}.ac.in",
                    IsActive = true,
                    MaxStudentSeats = 500,
                    StorageQuotaGb = 20,
                    CreatedAtUtc = DateTime.UtcNow
                });
                setupCtx.Users.AddRange(
                    new UserAccount
                    {
                        Id = admin1Id,
                        CollegeId = collegeId,
                        FullName = "PG Admin 1",
                        Email = $"pg.admin1.{Guid.NewGuid():N}@pgla.ac.in",
                        EnrollmentOrEmployeeCode = $"PGA1-{Guid.NewGuid():N}"[..12],
                        Role = UserRole.CollegeAdmin,
                        IsActive = true,
                        CreatedAtUtc = DateTime.UtcNow
                    },
                    new UserAccount
                    {
                        Id = admin2Id,
                        CollegeId = collegeId,
                        FullName = "PG Admin 2",
                        Email = $"pg.admin2.{Guid.NewGuid():N}@pgla.ac.in",
                        EnrollmentOrEmployeeCode = $"PGA2-{Guid.NewGuid():N}"[..12],
                        Role = UserRole.CollegeAdmin,
                        IsActive = true,
                        CreatedAtUtc = DateTime.UtcNow
                    });
                await setupCtx.SaveChangesAsync();
            }

            async Task<bool> TryDeactivateAdminAsync(Guid targetAdminId)
            {
                await using var ctx = new ProjectHubDbContext(optionsBuilder.Options, adminTenant);
                await using var tx = await ctx.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
                try
                {
                    var hasOtherActiveAdmin = await ctx.Users.AnyAsync(u =>
                        u.CollegeId == collegeId &&
                        !u.IsDeleted &&
                        u.IsActive &&
                        u.Role == UserRole.CollegeAdmin &&
                        u.Id != targetAdminId);
                    if (!hasOtherActiveAdmin)
                    {
                        await tx.RollbackAsync();
                        return false;
                    }

                    var target = await ctx.Users.FirstAsync(u => u.Id == targetAdminId);
                    target.IsActive = false;
                    await ctx.SaveChangesAsync();
                    await tx.CommitAsync();
                    return true;
                }
                catch (PostgresException ex) when (ex.SqlState == "40001")
                {
                    return false;
                }
                catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg && pg.SqlState == "40001")
                {
                    return false;
                }
            }

            var results = await Task.WhenAll(
                TryDeactivateAdminAsync(admin1Id),
                TryDeactivateAdminAsync(admin2Id));

            // At least one must be blocked or rolled back; never both deactivated
            Assert.True(results.Count(r => r) <= 1);

            await using var verifyCtx = new ProjectHubDbContext(optionsBuilder.Options, adminTenant);
            var remainingActiveAdmins = await verifyCtx.Users.CountAsync(u =>
                u.CollegeId == collegeId &&
                !u.IsDeleted &&
                u.IsActive &&
                u.Role == UserRole.CollegeAdmin);
            Assert.True(remainingActiveAdmins >= 1);
        }
        finally
        {
            await using var cleanupCtx = new ProjectHubDbContext(optionsBuilder.Options, adminTenant);
            var users = await cleanupCtx.Users.IgnoreQueryFilters().Where(u => u.CollegeId == collegeId).ToListAsync();
            if (users.Count > 0) cleanupCtx.Users.RemoveRange(users);
            var college = await cleanupCtx.CollegeTenants.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Id == collegeId);
            if (college != null) cleanupCtx.CollegeTenants.Remove(college);
            await cleanupCtx.SaveChangesAsync();
        }
    }
}
