using System.IdentityModel.Tokens.Jwt;
using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using ProjectHub.Application.Common.Models;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
using ProjectHub.Infrastructure.Security;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class HodSecurityAndIsolationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public HodSecurityAndIsolationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private static string GenerateToken(Guid userId, Guid collegeId, Guid? departmentId, UserRole role, bool isCoordinator = false)
    {
        var secret = "ProjectHubSuperSecretDevKeyMinLength32CharactersRequired!";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new("sub", userId.ToString()),
            new("user_id", userId.ToString()),
            new(ClaimTypes.Email, "hod.cse@sistec.ac.in"),
            new(ClaimTypes.Role, role.ToString()),
            new("role", role.ToString()),
            new("college_id", collegeId.ToString()),
            new("is_coordinator", isCoordinator.ToString().ToLowerInvariant())
        };

        if (departmentId.HasValue)
        {
            claims.Add(new Claim("department_id", departmentId.Value.ToString()));
            claims.Add(new Claim("dept_id", departmentId.Value.ToString()));
        }

        var token = new JwtSecurityToken(
            issuer: "https://api.projecthub.local",
            audience: "https://app.projecthub.local",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<string> GetTokenForPersonaAsync(string role)
    {
        var email = role switch
        {
            "HOD" => "hod@sistec.ac.in",
            "Faculty" => "faculty@sistec.ac.in",
            "CollegeAdmin" => "collegeadmin@sistec.ac.in",
            _ => throw new ArgumentException($"Unknown persona role: {role}")
        };

        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = "Pass@1234"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        return auth!.Token;
    }

    [Fact]
    public async Task HodDashboard_And_AcademicContext_SucceedsForAuthorizedHod()
    {
        var token = await GetTokenForPersonaAsync("HOD");

        // 1. Dashboard
        var dashReq = new HttpRequestMessage(HttpMethod.Get, "/api/hod/dashboard");
        dashReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var dashRes = await _client.SendAsync(dashReq);
        Assert.Equal(HttpStatusCode.OK, dashRes.StatusCode);

        var dash = await dashRes.Content.ReadFromJsonAsync<HodDashboardDto>();
        Assert.NotNull(dash);
        Assert.Equal("CSE", dash.DepartmentCode);
        Assert.Equal(DbInitializer.CseDepartmentId, dash.DepartmentId);

        // 2. Academic Context
        var ctxReq = new HttpRequestMessage(HttpMethod.Get, "/api/hod/academic-context");
        ctxReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var ctxRes = await _client.SendAsync(ctxReq);
        Assert.Equal(HttpStatusCode.OK, ctxRes.StatusCode);

        var ctx = await ctxRes.Content.ReadFromJsonAsync<HodAcademicContextDto>();
        Assert.NotNull(ctx);
        Assert.Equal("CSE", ctx.DepartmentCode);
        Assert.NotEmpty(ctx.AvailableSemesters);
    }

    [Fact]
    public async Task HodFallbackResolution_Succeeds_WhenJwtDepartmentClaimOmitted()
    {
        // Token has role HOD and college_id, but department_id claim is intentionally omitted
        var tokenWithoutDeptClaim = GenerateToken(
            userId: DbInitializer.HodSharmaUserId,
            collegeId: DbInitializer.SistecTenantId,
            departmentId: null,
            role: UserRole.HOD
        );

        var req = new HttpRequestMessage(HttpMethod.Get, "/api/hod/dashboard");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenWithoutDeptClaim);

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var dash = await res.Content.ReadFromJsonAsync<HodDashboardDto>();
        Assert.NotNull(dash);
        Assert.Equal(DbInitializer.CseDepartmentId, dash.DepartmentId);
        Assert.Equal("CSE", dash.DepartmentCode);
    }

    [Fact]
    public async Task HodFallbackResolution_Rejects_WhenUserHasNoAppointedDepartment()
    {
        // Random unassigned user with role HOD and no department in DB
        var unassignedUserToken = GenerateToken(
            userId: Guid.NewGuid(),
            collegeId: DbInitializer.SistecTenantId,
            departmentId: null,
            role: UserRole.HOD
        );

        var req = new HttpRequestMessage(HttpMethod.Get, "/api/hod/dashboard");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", unassignedUserToken);

        var res = await _client.SendAsync(req);
        // Expecting Unauthorized (401) or Forbidden (403) or InternalServerError prevented
        Assert.True(res.StatusCode == HttpStatusCode.Unauthorized || res.StatusCode == HttpStatusCode.Forbidden || res.StatusCode == HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CrossDepartmentIsolation_CannotApproveProposalOfOtherDepartment()
    {
        var eceTeamId = Guid.NewGuid();

        // 1. Seed an ECE proposal under SISTec tenant
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var seedContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            seedContext.IsSuperAdmin = true;

            var eceTrack = await db.AcademicTracks.IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.CollegeId == DbInitializer.SistecTenantId && t.DepartmentId == DbInitializer.EceDepartmentId);

            if (eceTrack == null)
            {
                eceTrack = new AcademicTrack
                {
                    CollegeId = DbInitializer.SistecTenantId,
                    DepartmentId = DbInitializer.EceDepartmentId,
                    Name = "ECE Minor Track",
                    AcademicYear = "2026-2027",
                    IsActive = true
                };
                await db.AcademicTracks.AddAsync(eceTrack);
                await db.SaveChangesAsync();
            }

            var eceTeam = new ProjectTeam
            {
                Id = eceTeamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.EceDepartmentId,
                AcademicTrackId = eceTrack.Id,
                TeamCode = "2026-ECE-TEST-01",
                Title = "ECE Smart Embedded Systems",
                Abstract = "ECE Cross Department Boundary Test",
                Status = ProjectStatus.PendingHOD
            };

            await db.ProjectTeams.AddAsync(eceTeam);
            await db.SaveChangesAsync();
        }

        // 2. CSE HOD attempts to approve ECE proposal
        var cseHodToken = await GetTokenForPersonaAsync("HOD");
        var approveReq = new HttpRequestMessage(HttpMethod.Post, $"/api/hod/proposals/{eceTeamId}/approve");
        approveReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);

        var response = await _client.SendAsync(approveReq);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        // Also test the route alias /endorse
        var endorseReq = new HttpRequestMessage(HttpMethod.Post, $"/api/hod/proposals/{eceTeamId}/endorse");
        endorseReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);

        var endorseRes = await _client.SendAsync(endorseReq);
        Assert.Equal(HttpStatusCode.NotFound, endorseRes.StatusCode);
    }

    [Fact]
    public async Task CrossDepartmentIsolation_CannotToggleCoordinatorOfOtherDepartment()
    {
        var eceFacultyId = Guid.NewGuid();

        // 1. Seed an ECE Faculty
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var seedContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            seedContext.IsSuperAdmin = true;

            var eceFaculty = new UserAccount
            {
                Id = eceFacultyId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.EceDepartmentId,
                FullName = "Prof. ECE Tester",
                Email = "ece.faculty.test@sistec.ac.in",
                Role = UserRole.Faculty,
                IsActive = true
            };
            await db.Users.AddAsync(eceFaculty);
            await db.SaveChangesAsync();
        }

        // 2. CSE HOD attempts to toggle coordinator on ECE faculty
        var cseHodToken = await GetTokenForPersonaAsync("HOD");
        var toggleReq = new HttpRequestMessage(HttpMethod.Put, $"/api/hod/faculty/{eceFacultyId}/coordinator")
        {
            Content = JsonContent.Create(new ToggleCoordinatorRequest { IsProjectCoordinator = true })
        };
        toggleReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);

        var response = await _client.SendAsync(toggleReq);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ProposalContractParity_ApproveAndEndorseBothWork()
    {
        var cseTeamId = Guid.NewGuid();

        // 1. Seed candidate proposal under CSE
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var seedContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            seedContext.IsSuperAdmin = true;

            var cseTrack = await db.AcademicTracks.IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.CollegeId == DbInitializer.SistecTenantId && t.DepartmentId == DbInitializer.CseDepartmentId);

            var cseTeam = new ProjectTeam
            {
                Id = cseTeamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = cseTrack!.Id,
                TeamCode = "2026-CSE-ENDORSE-TEST",
                Title = "CSE Endorse Parity Test",
                Status = ProjectStatus.PendingHOD
            };
            await db.ProjectTeams.AddAsync(cseTeam);
            await db.SaveChangesAsync();
        }

        var cseHodToken = await GetTokenForPersonaAsync("HOD");

        // 2. Call /endorse route alias
        var req = new HttpRequestMessage(HttpMethod.Post, $"/api/hod/proposals/{cseTeamId}/endorse");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        // 3. Verify state transition in database
        using (var verifyScope = _factory.Services.CreateScope())
        {
            var db = verifyScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var updatedTeam = await db.ProjectTeams.IgnoreQueryFilters().FirstAsync(t => t.Id == cseTeamId);
            Assert.Equal(ProjectStatus.ActiveBuild, updatedTeam.Status);
            Assert.True(updatedTeam.IsRosterLocked);
        }
    }

    [Fact]
    public async Task ProposalContractParity_RejectAndReturnBothWorkWithRemarks()
    {
        var cseTeamId = Guid.NewGuid();

        // 1. Seed candidate proposal under CSE
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var seedContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            seedContext.IsSuperAdmin = true;

            var cseTrack = await db.AcademicTracks.IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.CollegeId == DbInitializer.SistecTenantId && t.DepartmentId == DbInitializer.CseDepartmentId);

            var cseTeam = new ProjectTeam
            {
                Id = cseTeamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = cseTrack!.Id,
                TeamCode = "2026-CSE-RETURN-TEST",
                Title = "CSE Return Parity Test",
                Status = ProjectStatus.PendingHOD,
                IsRosterLocked = true
            };
            await db.ProjectTeams.AddAsync(cseTeam);
            await db.SaveChangesAsync();
        }

        var cseHodToken = await GetTokenForPersonaAsync("HOD");

        // 2. Call /return route alias with remarks
        var returnReq = new HttpRequestMessage(HttpMethod.Post, $"/api/hod/proposals/{cseTeamId}/return")
        {
            Content = JsonContent.Create(new ReturnProposalRequest { Remarks = "Architecture lacks clarity. Revise diagram." })
        };
        returnReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);

        var res = await _client.SendAsync(returnReq);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        // 3. Verify state transition in database
        using (var verifyScope = _factory.Services.CreateScope())
        {
            var db = verifyScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var updatedTeam = await db.ProjectTeams.IgnoreQueryFilters().FirstAsync(t => t.Id == cseTeamId);
            Assert.Equal(ProjectStatus.Draft, updatedTeam.Status);
            Assert.False(updatedTeam.IsRosterLocked);
        }
    }

    [Fact]
    public async Task ExceptionContractParity_ApproveAndRejectBothWork()
    {
        var exceptionId = Guid.NewGuid();

        // 1. Seed exception audit log under CSE
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var seedContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            seedContext.IsSuperAdmin = true;

            var log = new ExceptionAuditLog
            {
                Id = exceptionId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                ActionType = ExceptionActionType.ReassignGuide,
                Reason = "Faculty mentor on extended research sabbatical.",
                RequestedByUserId = DbInitializer.FacultyNairUserId
            };
            await db.ExceptionAuditLogs.AddAsync(log);
            await db.SaveChangesAsync();
        }

        var cseHodToken = await GetTokenForPersonaAsync("HOD");

        // 2. Call /reject endpoint
        var rejectReq = new HttpRequestMessage(HttpMethod.Post, $"/api/hod/exceptions/{exceptionId}/reject")
        {
            Content = JsonContent.Create(new RejectExceptionRequest { Remarks = "Alternative co-guide should be assigned first." })
        };
        rejectReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);

        var res = await _client.SendAsync(rejectReq);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        // 3. Verify in database
        using (var verifyScope = _factory.Services.CreateScope())
        {
            var db = verifyScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var updatedLog = await db.ExceptionAuditLogs.IgnoreQueryFilters().FirstAsync(e => e.Id == exceptionId);
            Assert.Null(updatedLog.ApprovedByUserId);
            Assert.Null(updatedLog.ApprovedAtUtc);
            Assert.Contains("[REJECTED", updatedLog.Reason);
        }
    }

    [Fact]
    public async Task Hod_BulkApproveProposals_TransitionsAllCandidateTeamsAtomically()
    {
        var teamId1 = Guid.NewGuid();
        var teamId2 = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var seedContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            seedContext.IsSuperAdmin = true;

            var cseTrack = await db.AcademicTracks.IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.CollegeId == DbInitializer.SistecTenantId && t.DepartmentId == DbInitializer.CseDepartmentId);

            var t1 = new ProjectTeam
            {
                Id = teamId1,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = cseTrack!.Id,
                TeamCode = "2026-CSE-BULK-01",
                Title = "Bulk Proposal Test Alpha",
                Status = ProjectStatus.PendingHOD,
                IsRosterLocked = false
            };
            var t2 = new ProjectTeam
            {
                Id = teamId2,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = cseTrack.Id,
                TeamCode = "2026-CSE-BULK-02",
                Title = "Bulk Proposal Test Beta",
                Status = ProjectStatus.PendingHOD,
                IsRosterLocked = false
            };
            await db.ProjectTeams.AddRangeAsync(t1, t2);
            await db.SaveChangesAsync();
        }

        var cseHodToken = await GetTokenForPersonaAsync("HOD");
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/hod/proposals/bulk-approve")
        {
            Content = JsonContent.Create(new BulkApproveProposalsRequest
            {
                TeamIds = new List<Guid> { teamId1, teamId2 }
            })
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<BulkApproveProposalsResponse>();
        Assert.NotNull(body);
        Assert.True(body.Success);
        Assert.Equal(2, body.ApprovedCount);

        using (var verifyScope = _factory.Services.CreateScope())
        {
            var db = verifyScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var teams = await db.ProjectTeams.IgnoreQueryFilters().Where(t => t.Id == teamId1 || t.Id == teamId2).ToListAsync();
            Assert.All(teams, t =>
            {
                Assert.Equal(ProjectStatus.ActiveBuild, t.Status);
                Assert.True(t.IsRosterLocked);
            });

            var audit = await db.PlatformAuditLogs.IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Action == "HOD_BULK_PROPOSAL_APPROVAL" && a.TargetTenantId == DbInitializer.SistecTenantId);
            Assert.NotNull(audit);
        }
    }

    [Fact]
    public async Task Hod_GradeUnlock_ApproveUnlocksEvaluationRecord_AndLogsPlatformAudit()
    {
        var evalId = Guid.NewGuid();
        var teamId = Guid.NewGuid();
        var exceptionId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var seedContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            seedContext.IsSuperAdmin = true;

            var cseTrack = await db.AcademicTracks.IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.CollegeId == DbInitializer.SistecTenantId && t.DepartmentId == DbInitializer.CseDepartmentId);

            var team = new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = cseTrack!.Id,
                TeamCode = "2026-CSE-UNLOCK-01",
                Title = "Unlock Evaluation Team",
                Status = ProjectStatus.ActiveBuild
            };
            await db.ProjectTeams.AddAsync(team);

            var eval = new VivaEvaluation
            {
                Id = evalId,
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = teamId,
                EvaluatorUserId = DbInitializer.FacultyVermaUserId,
                CheckpointType = CheckpointType.FinalViva,
                SharedTotalScore = 42m,
                IsLocked = true,
                LockedAtUtc = DateTime.UtcNow.AddDays(-1)
            };
            await db.VivaEvaluations.AddAsync(eval);

            var exLog = new ExceptionAuditLog
            {
                Id = exceptionId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                ProjectTeamId = teamId,
                ActionType = ExceptionActionType.IndividualReVivaUnlock,
                Reason = "Student submitted medical documentation for re-evaluation.",
                RequestedByUserId = DbInitializer.FacultyVermaUserId,
                PreviousValueJson = $"{{\"evaluationId\": \"{evalId}\", \"checkpointType\": \"FinalViva\"}}"
            };
            await db.ExceptionAuditLogs.AddAsync(exLog);
            await db.SaveChangesAsync();
        }

        var cseHodToken = await GetTokenForPersonaAsync("HOD");

        // 1. Get Grade Unlocks list
        var listReq = new HttpRequestMessage(HttpMethod.Get, "/api/hod/grade-unlocks");
        listReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);
        var listRes = await _client.SendAsync(listReq);
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
        var list = await listRes.Content.ReadFromJsonAsync<List<GradeUnlockRequestDto>>();
        Assert.NotNull(list);
        Assert.Contains(list, x => x.Id == exceptionId && x.EvaluationId == evalId);

        // 2. Approve Grade Unlock
        var approveReq = new HttpRequestMessage(HttpMethod.Post, $"/api/hod/grade-unlocks/{exceptionId}/approve")
        {
            Content = JsonContent.Create(new ApproveGradeUnlockRequest { Remarks = "Approved medical dispensation" })
        };
        approveReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);
        var approveRes = await _client.SendAsync(approveReq);
        Assert.Equal(HttpStatusCode.OK, approveRes.StatusCode);

        // 3. Verify in DB
        using (var verifyScope = _factory.Services.CreateScope())
        {
            var db = verifyScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var updatedEval = await db.VivaEvaluations.IgnoreQueryFilters().FirstAsync(e => e.Id == evalId);
            Assert.False(updatedEval.IsLocked);
            Assert.Null(updatedEval.LockedAtUtc);

            var updatedLog = await db.ExceptionAuditLogs.IgnoreQueryFilters().FirstAsync(e => e.Id == exceptionId);
            Assert.NotNull(updatedLog.ApprovedByUserId);
            Assert.NotNull(updatedLog.ApprovedAtUtc);

            var audit = await db.PlatformAuditLogs.IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Action == "HOD_GRADE_UNLOCK_APPROVED" && a.TargetTenantId == DbInitializer.SistecTenantId);
            Assert.NotNull(audit);
        }
    }

    [Fact]
    public async Task Hod_GradeUnlock_RejectPreservesLock_AndLogsPlatformAudit()
    {
        var evalId = Guid.NewGuid();
        var teamId = Guid.NewGuid();
        var exceptionId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var seedContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            seedContext.IsSuperAdmin = true;

            var cseTrack = await db.AcademicTracks.IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.CollegeId == DbInitializer.SistecTenantId && t.DepartmentId == DbInitializer.CseDepartmentId);

            var team = new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = cseTrack!.Id,
                TeamCode = "2026-CSE-REJECT-01",
                Title = "Reject Evaluation Unlock Team",
                Status = ProjectStatus.ActiveBuild
            };
            await db.ProjectTeams.AddAsync(team);

            var eval = new VivaEvaluation
            {
                Id = evalId,
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = teamId,
                EvaluatorUserId = DbInitializer.FacultyVermaUserId,
                CheckpointType = CheckpointType.FinalViva,
                SharedTotalScore = 40m,
                IsLocked = true,
                LockedAtUtc = DateTime.UtcNow.AddDays(-2)
            };
            await db.VivaEvaluations.AddAsync(eval);

            var exLog = new ExceptionAuditLog
            {
                Id = exceptionId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                ProjectTeamId = teamId,
                ActionType = ExceptionActionType.IndividualReVivaUnlock,
                Reason = "Late score recalculation requested without proof.",
                RequestedByUserId = DbInitializer.FacultyVermaUserId,
                PreviousValueJson = $"{{\"evaluationId\": \"{evalId}\", \"checkpointType\": \"FinalViva\"}}"
            };
            await db.ExceptionAuditLogs.AddAsync(exLog);
            await db.SaveChangesAsync();
        }

        var cseHodToken = await GetTokenForPersonaAsync("HOD");

        var rejectReq = new HttpRequestMessage(HttpMethod.Post, $"/api/hod/grade-unlocks/{exceptionId}/reject")
        {
            Content = JsonContent.Create(new RejectGradeUnlockRequest { Remarks = "Insufficient grounds for grade recalculation." })
        };
        rejectReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);

        var rejectRes = await _client.SendAsync(rejectReq);
        Assert.Equal(HttpStatusCode.OK, rejectRes.StatusCode);

        using (var verifyScope = _factory.Services.CreateScope())
        {
            var db = verifyScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var updatedEval = await db.VivaEvaluations.IgnoreQueryFilters().FirstAsync(e => e.Id == evalId);
            Assert.True(updatedEval.IsLocked);

            var updatedLog = await db.ExceptionAuditLogs.IgnoreQueryFilters().FirstAsync(e => e.Id == exceptionId);
            Assert.Null(updatedLog.ApprovedByUserId);
            Assert.Contains("[REJECTED", updatedLog.Reason);

            var audit = await db.PlatformAuditLogs.IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Action == "HOD_GRADE_UNLOCK_REJECTED" && a.TargetTenantId == DbInitializer.SistecTenantId);
            Assert.NotNull(audit);
        }
    }

    [Fact]
    public async Task Hod_CreateFaculty_IsForbiddenForHod_EnforcesCollegeAdminBoundary()
    {
        var cseHodToken = await GetTokenForPersonaAsync("HOD");
        var email = $"faculty.test.{Guid.NewGuid().ToString("N")[..6]}@sistec.ac.in";

        var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/hod/faculty")
        {
            Content = JsonContent.Create(new CreateDepartmentFacultyRequest
            {
                FullName = "Dr. Ananya Roy",
                Email = email,
                Designation = "Associate Professor",
                MaxTeams = 5
            })
        };
        createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);

        var createRes = await _client.SendAsync(createReq);
        Assert.Equal(HttpStatusCode.Forbidden, createRes.StatusCode);
    }

    [Fact]
    public async Task Hod_AttestSar_FailsWhenProposalsPending_SucceedsWhenComplete()
    {
        var pendingTeamId = Guid.NewGuid();

        // 1. Seed a proposal in PendingHOD status to trigger completeness validation failure
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var seedContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            seedContext.IsSuperAdmin = true;

            // Ensure clean baseline: any pre-existing pending proposals in CSE are transitioned
            var existingPending = await db.ProjectTeams.IgnoreQueryFilters()
                .Where(t => t.CollegeId == DbInitializer.SistecTenantId && t.DepartmentId == DbInitializer.CseDepartmentId && t.Status == ProjectStatus.PendingHOD)
                .ToListAsync();
            foreach (var p in existingPending)
            {
                p.Status = ProjectStatus.ActiveBuild;
            }

            var cseTrack = await db.AcademicTracks.IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.CollegeId == DbInitializer.SistecTenantId && t.DepartmentId == DbInitializer.CseDepartmentId);

            var pendingTeam = new ProjectTeam
            {
                Id = pendingTeamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = cseTrack!.Id,
                TeamCode = "2026-CSE-PENDING-SAR",
                Title = "Pending SAR Proposal",
                Status = ProjectStatus.PendingHOD
            };
            await db.ProjectTeams.AddAsync(pendingTeam);
            await db.SaveChangesAsync();
        }

        var cseHodToken = await GetTokenForPersonaAsync("HOD");

        // 2. Attest SAR should fail because pending proposals exist
        var failReq = new HttpRequestMessage(HttpMethod.Post, "/api/hod/sar/attest");
        failReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);
        var failRes = await _client.SendAsync(failReq);
        Assert.Equal(HttpStatusCode.BadRequest, failRes.StatusCode);

        // 3. Approve the pending proposal to satisfy completeness
        var approveReq = new HttpRequestMessage(HttpMethod.Post, $"/api/hod/proposals/{pendingTeamId}/approve");
        approveReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);
        var approveRes = await _client.SendAsync(approveReq);
        Assert.Equal(HttpStatusCode.OK, approveRes.StatusCode);

        // 4. Now Attest SAR succeeds
        var attestReq = new HttpRequestMessage(HttpMethod.Post, "/api/hod/sar/attest");
        attestReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);
        var attestRes = await _client.SendAsync(attestReq);
        Assert.Equal(HttpStatusCode.OK, attestRes.StatusCode);

        var attestBody = await attestRes.Content.ReadFromJsonAsync<AttestSarResponse>();
        Assert.NotNull(attestBody);
        Assert.True(attestBody.Success);
        Assert.Equal("Attested", attestBody.Status);

        // 5. Verify in DB
        using (var verifyScope = _factory.Services.CreateScope())
        {
            var db = verifyScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var dept = await db.Departments.IgnoreQueryFilters().FirstAsync(d => d.Id == DbInitializer.CseDepartmentId);
            Assert.True(dept.IsSarAttested);
            Assert.NotNull(dept.SarAttestedAtUtc);

            var audit = await db.PlatformAuditLogs.IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Action == "HOD_SAR_ATTESTED" && a.TargetTenantId == DbInitializer.SistecTenantId);
            Assert.NotNull(audit);
        }
    }

    [Fact]
    public async Task Hod_GetResults_ReturnsComputedLetterGradesAndAttainment()
    {
        var cseHodToken = await GetTokenForPersonaAsync("HOD");

        var req = new HttpRequestMessage(HttpMethod.Get, "/api/hod/results");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var results = await res.Content.ReadFromJsonAsync<List<DepartmentStudentResultDto>>();
        Assert.NotNull(results);
        Assert.NotEmpty(results);

        var first = results.First();
        Assert.False(string.IsNullOrWhiteSpace(first.StudentName));
        Assert.False(string.IsNullOrWhiteSpace(first.LetterGrade));
        Assert.Contains(first.LetterGrade, new[] { "A+", "A", "B", "C", "F" });
        Assert.True(first.TotalMarks >= 0 && first.TotalMarks <= 100);
    }

    [Fact]
    public async Task MandatorySecurityScenario_03_ExpiredHod_IsRejected()
    {
        var expiredHodUserId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var seedContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            seedContext.IsSuperAdmin = true;

            var user = new UserAccount
            {
                Id = expiredHodUserId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                FullName = "Dr. Former HOD",
                Email = "former.hod@sistec.ac.in",
                Role = UserRole.HOD,
                IsActive = true
            };
            await db.Users.AddAsync(user);

            var pastAppt = new HodAppointmentHistory
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                HodUserId = expiredHodUserId,
                AppointedAtUtc = DateTime.UtcNow.AddYears(-2),
                RelievedAtUtc = DateTime.UtcNow.AddMonths(-2),
                IsCurrent = false,
                Remarks = "Relieved after tenure completion"
            };
            await db.HodAppointmentHistories.AddAsync(pastAppt);
            await db.SaveChangesAsync();
        }

        var expiredToken = GenerateToken(
            userId: expiredHodUserId,
            collegeId: DbInitializer.SistecTenantId,
            departmentId: DbInitializer.CseDepartmentId,
            role: UserRole.HOD
        );

        var req = new HttpRequestMessage(HttpMethod.Get, "/api/hod/dashboard");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", expiredToken);

        var res = await _client.SendAsync(req);
        Assert.True(res.StatusCode == HttpStatusCode.Unauthorized || res.StatusCode == HttpStatusCode.Forbidden || res.StatusCode == HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task MandatorySecurityScenario_05_HodCannotInvokeCollegeAdminEndpoint()
    {
        var cseHodToken = await GetTokenForPersonaAsync("HOD");

        // Attempt CollegeAdmin endpoints
        var settingsReq = new HttpRequestMessage(HttpMethod.Get, "/api/college/settings");
        settingsReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);
        var settingsRes = await _client.SendAsync(settingsReq);
        Assert.Equal(HttpStatusCode.Forbidden, settingsRes.StatusCode);

        var hodsReq = new HttpRequestMessage(HttpMethod.Get, "/api/college/hods");
        hodsReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);
        var hodsRes = await _client.SendAsync(hodsReq);
        Assert.Equal(HttpStatusCode.Forbidden, hodsRes.StatusCode);
    }

    [Fact]
    public async Task MandatorySecurityScenario_06_ProposalNotInPendingHOD_CannotBeApproved()
    {
        var draftTeamId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var seedContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            seedContext.IsSuperAdmin = true;

            var cseTrack = await db.AcademicTracks.IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.CollegeId == DbInitializer.SistecTenantId && t.DepartmentId == DbInitializer.CseDepartmentId);

            var draftTeam = new ProjectTeam
            {
                Id = draftTeamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = cseTrack!.Id,
                TeamCode = "2026-CSE-DRAFT-INV",
                Title = "Draft Proposal Invalid State Test",
                Status = ProjectStatus.Draft, // In Draft, NOT PendingHOD
                IsRosterLocked = false
            };
            await db.ProjectTeams.AddAsync(draftTeam);
            await db.SaveChangesAsync();
        }

        var cseHodToken = await GetTokenForPersonaAsync("HOD");

        var approveReq = new HttpRequestMessage(HttpMethod.Post, $"/api/hod/proposals/{draftTeamId}/approve");
        approveReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);

        var approveRes = await _client.SendAsync(approveReq);
        Assert.Equal(HttpStatusCode.BadRequest, approveRes.StatusCode);

        // Ensure team is still in Draft in DB
        using (var verifyScope = _factory.Services.CreateScope())
        {
            var db = verifyScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var team = await db.ProjectTeams.IgnoreQueryFilters().FirstAsync(t => t.Id == draftTeamId);
            Assert.Equal(ProjectStatus.Draft, team.Status);
            Assert.False(team.IsRosterLocked);
        }
    }

    [Fact]
    public async Task MandatorySecurityScenario_08_GuideReassignment_PreservesHistoryAndUpdatesTeam()
    {
        var teamId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var seedContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            seedContext.IsSuperAdmin = true;

            var cseTrack = await db.AcademicTracks.IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.CollegeId == DbInitializer.SistecTenantId && t.DepartmentId == DbInitializer.CseDepartmentId);

            var team = new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = cseTrack!.Id,
                TeamCode = "2026-CSE-REASSIGN-01",
                Title = "Guide Reassignment Audit Test",
                Status = ProjectStatus.ActiveBuild,
                GuideUserId = DbInitializer.FacultyVermaUserId // Initial guide
            };
            await db.ProjectTeams.AddAsync(team);
            await db.SaveChangesAsync();
        }

        var cseHodToken = await GetTokenForPersonaAsync("HOD");

        // Reassign guide to FacultyNair
        var assignReq = new HttpRequestMessage(HttpMethod.Post, $"/api/hod/projects/{teamId}/assign-guide")
        {
            Content = JsonContent.Create(new HodAssignGuideRequest
            {
                GuideUserId = DbInitializer.FacultyNairUserId,
                Reason = "Faculty Verma on sabbatical leave"
            })
        };
        assignReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);

        var assignRes = await _client.SendAsync(assignReq);
        Assert.Equal(HttpStatusCode.OK, assignRes.StatusCode);

        using (var verifyScope = _factory.Services.CreateScope())
        {
            var db = verifyScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var updatedTeam = await db.ProjectTeams.IgnoreQueryFilters().FirstAsync(t => t.Id == teamId);
            Assert.Equal(DbInitializer.FacultyNairUserId, updatedTeam.GuideUserId);

            // Verify ExceptionAuditLog was created preserving previous guide
            var exceptionLog = await db.ExceptionAuditLogs.IgnoreQueryFilters()
                .FirstOrDefaultAsync(e => e.ProjectTeamId == teamId && e.ActionType == ExceptionActionType.ReassignGuide);
            Assert.NotNull(exceptionLog);
            Assert.Contains(DbInitializer.FacultyVermaUserId.ToString(), exceptionLog.PreviousValueJson);
            Assert.Contains(DbInitializer.FacultyNairUserId.ToString(), exceptionLog.NewValueJson);
            Assert.Contains("sabbatical", exceptionLog.Reason);
            Assert.NotNull(exceptionLog.ApprovedAtUtc);

            // Verify PlatformAuditLog
            var platformAudit = await db.PlatformAuditLogs.IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Action == "HOD_GUIDE_REASSIGNED" && a.TargetTenantId == DbInitializer.SistecTenantId);
            Assert.NotNull(platformAudit);
        }
    }

    [Fact]
    public async Task MandatorySecurityScenario_09_ForgedDepartmentId_IsRejected()
    {
        // Token has HOD role for CSE, but attacker forges department_id = ECE
        var forgedToken = GenerateToken(
            userId: DbInitializer.HodSharmaUserId,
            collegeId: DbInitializer.SistecTenantId,
            departmentId: DbInitializer.EceDepartmentId,
            role: UserRole.HOD
        );

        var req = new HttpRequestMessage(HttpMethod.Get, "/api/hod/dashboard");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", forgedToken);

        var res = await _client.SendAsync(req);
        Assert.True(res.StatusCode == HttpStatusCode.Unauthorized || res.StatusCode == HttpStatusCode.Forbidden || res.StatusCode == HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Hod_GetProjects_ReturnsDepartmentProjectsWithFilters()
    {
        var cseHodToken = await GetTokenForPersonaAsync("HOD");

        // 1. Get all projects
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/hod/projects");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var projects = await res.Content.ReadFromJsonAsync<List<HodProjectDto>>();
        Assert.NotNull(projects);
        Assert.NotEmpty(projects);

        var p = projects.First();
        Assert.False(string.IsNullOrWhiteSpace(p.TeamCode));
        Assert.False(string.IsNullOrWhiteSpace(p.Title));

        // 2. Filter by status
        var filterReq = new HttpRequestMessage(HttpMethod.Get, "/api/hod/projects?status=ActiveBuild");
        filterReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);
        var filterRes = await _client.SendAsync(filterReq);
        Assert.Equal(HttpStatusCode.OK, filterRes.StatusCode);
        var activeProjects = await filterRes.Content.ReadFromJsonAsync<List<HodProjectDto>>();
        Assert.NotNull(activeProjects);
        Assert.All(activeProjects, pr => Assert.Equal(ProjectStatus.ActiveBuild, pr.Status));
    }

    [Fact]
    public async Task Hod_GetReportsSummary_ReturnsAccurateTotals()
    {
        var cseHodToken = await GetTokenForPersonaAsync("HOD");

        var req = new HttpRequestMessage(HttpMethod.Get, "/api/hod/reports/summary");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var summary = await res.Content.ReadFromJsonAsync<HodReportsSummaryDto>();
        Assert.NotNull(summary);
        Assert.Equal("CSE", summary.DepartmentCode);
        Assert.True(summary.TotalProjects > 0);
        Assert.True(summary.TotalFaculty > 0);
        Assert.NotNull(summary.TrackStats);
        Assert.NotNull(summary.DomainDistribution);
    }

    [Fact]
    public async Task HodExportNbaZip_WithActualEvaluations_ContainsCalculatedPercentages()
    {
        // 1. Seed actual evaluation in CSE department
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var seedContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            seedContext.IsSuperAdmin = true;

            var existingEval = await db.VivaEvaluations.IgnoreQueryFilters()
                .FirstOrDefaultAsync(v => v.CollegeId == DbInitializer.SistecTenantId && v.ProjectTeamId == DbInitializer.Team01Id);

            if (existingEval == null)
            {
                var eval = new VivaEvaluation
                {
                    CollegeId = DbInitializer.SistecTenantId,
                    ProjectTeamId = DbInitializer.Team01Id,
                    EvaluatorUserId = DbInitializer.FacultyVermaUserId,
                    CheckpointType = CheckpointType.FinalViva,
                    SharedTotalScore = 40m,
                    IsLocked = true,
                    IndividualScores = new List<IndividualStudentScore>
                    {
                        new()
                        {
                            CollegeId = DbInitializer.SistecTenantId,
                            StudentUserId = DbInitializer.StudentShivanshUserId,
                            FinalComputedStudentMark = 42m
                        }
                    }
                };
                await db.VivaEvaluations.AddAsync(eval);
                await db.SaveChangesAsync();
            }
        }

        var cseHodToken = await GetTokenForPersonaAsync("HOD");
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/hod/nba/export-zip");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cseHodToken);

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var bytes = await res.Content.ReadAsByteArrayAsync();
        using var stream = new MemoryStream(bytes);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);

        var matrixEntry = archive.GetEntry("00_NBA_CO_PO_Attainment_Matrix.csv");
        Assert.NotNull(matrixEntry);

        using var reader = new StreamReader(matrixEntry.Open());
        var matrixCsv = await reader.ReadToEndAsync();

        // Must NOT contain static fake fallback percentages
        Assert.DoesNotContain("84.2%,81.0%,83.56%", matrixCsv);
        // Must contain dynamically measured data status
        Assert.Contains("Measured from", matrixCsv);
        Assert.Contains("CO1,", matrixCsv);
    }

    [Fact]
    public async Task HodExportNbaZip_WithZeroEvaluations_ContainsExplicitEmptyStatus()
    {
        var eceDeptId = DbInitializer.EceDepartmentId;
        var eceHodUserId = Guid.NewGuid();

        // Setup ECE HOD with tenure and track but ZERO evaluations
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var seedContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            seedContext.IsSuperAdmin = true;

            var eceDept = await db.Departments.IgnoreQueryFilters().FirstAsync(d => d.Id == eceDeptId);
            eceDept.HodUserId = eceHodUserId;

            var hodUser = new UserAccount
            {
                Id = eceHodUserId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = eceDeptId,
                FullName = "Dr. ECE Zero Eval HOD",
                Email = $"hod.ece.zeroeval.{Guid.NewGuid().ToString("N")[..4]}@sistec.ac.in",
                Role = UserRole.HOD,
                PasswordHash = PasswordHelper.HashPassword("Pass@1234")
            };
            await db.Users.AddAsync(hodUser);

            var appointment = new HodAppointmentHistory
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = eceDeptId,
                HodUserId = eceHodUserId,
                AppointedAtUtc = DateTime.UtcNow.AddMonths(-3),
                IsCurrent = true
            };
            await db.HodAppointmentHistories.AddAsync(appointment);
            await db.SaveChangesAsync();
        }

        var eceHodToken = GenerateToken(eceHodUserId, DbInitializer.SistecTenantId, eceDeptId, UserRole.HOD);
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/hod/nba/export-zip");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", eceHodToken);

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var bytes = await res.Content.ReadAsByteArrayAsync();
        using var stream = new MemoryStream(bytes);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);

        var matrixEntry = archive.GetEntry("00_NBA_CO_PO_Attainment_Matrix.csv");
        Assert.NotNull(matrixEntry);

        using var reader = new StreamReader(matrixEntry.Open());
        var matrixCsv = await reader.ReadToEndAsync();

        // Must explicitly report No Evaluation Data / N/A, not fake numbers
        Assert.Contains("No Evaluation Data", matrixCsv);
        Assert.Contains("N/A,N/A,N/A", matrixCsv);
        Assert.DoesNotContain("84.2%,81.0%,83.56%", matrixCsv);
    }

    [Fact]
    public async Task HodExportNbaZip_WithZeroProjects_DoesNotGenerateSampleDossiers()
    {
        var meDeptId = DbInitializer.MeDepartmentId;
        var meHodUserId = Guid.NewGuid();

        // Setup ME HOD with zero projects in ME department
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var seedContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            seedContext.IsSuperAdmin = true;

            var meDept = await db.Departments.IgnoreQueryFilters().FirstAsync(d => d.Id == meDeptId);
            meDept.HodUserId = meHodUserId;

            var hodUser = new UserAccount
            {
                Id = meHodUserId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = meDeptId,
                FullName = "Dr. ME Zero Projects HOD",
                Email = $"hod.me.noprojects.{Guid.NewGuid().ToString("N")[..4]}@sistec.ac.in",
                Role = UserRole.HOD,
                PasswordHash = PasswordHelper.HashPassword("Pass@1234")
            };
            await db.Users.AddAsync(hodUser);

            var appointment = new HodAppointmentHistory
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = meDeptId,
                HodUserId = meHodUserId,
                AppointedAtUtc = DateTime.UtcNow.AddMonths(-1),
                IsCurrent = true
            };
            await db.HodAppointmentHistories.AddAsync(appointment);
            await db.SaveChangesAsync();
        }

        var meHodToken = GenerateToken(meHodUserId, DbInitializer.SistecTenantId, meDeptId, UserRole.HOD);
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/hod/nba/export-zip");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", meHodToken);

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var bytes = await res.Content.ReadAsByteArrayAsync();
        using var stream = new MemoryStream(bytes);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);

        // Verify that NO sample dossiers or mock 2026-CS-MIN-01 projects are generated
        var dossierEntries = archive.Entries.Where(e => e.FullName.StartsWith("02_Audit_Sample_Dossiers/")).ToList();
        Assert.Empty(dossierEntries);

        var marksheet = archive.GetEntry("01_RGPV_Consolidated_Marksheet.csv");
        Assert.NotNull(marksheet);
        using var reader = new StreamReader(marksheet.Open());
        var marksheetCsv = await reader.ReadToEndAsync();
        Assert.Contains("No registered project teams found for this department", marksheetCsv);
    }

    [Fact]
    public async Task HodExportNbaZip_WithProjectsButMissingEvaluations_ContainsPendingEvaluationStatus()
    {
        var civilDeptId = DbInitializer.CeDepartmentId;
        var civilHodUserId = Guid.NewGuid();
        var civilTeamId = Guid.NewGuid();

        // Setup Civil HOD with an active team but no evaluations
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var seedContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            seedContext.IsSuperAdmin = true;

            var civilDept = await db.Departments.IgnoreQueryFilters().FirstAsync(d => d.Id == civilDeptId);
            civilDept.HodUserId = civilHodUserId;

            var hodUser = new UserAccount
            {
                Id = civilHodUserId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = civilDeptId,
                FullName = "Dr. Civil HOD",
                Email = $"hod.civil.{Guid.NewGuid().ToString("N")[..4]}@sistec.ac.in",
                Role = UserRole.HOD,
                PasswordHash = PasswordHelper.HashPassword("Pass@1234")
            };
            await db.Users.AddAsync(hodUser);

            var appointment = new HodAppointmentHistory
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = civilDeptId,
                HodUserId = civilHodUserId,
                AppointedAtUtc = DateTime.UtcNow.AddMonths(-2),
                IsCurrent = true
            };
            await db.HodAppointmentHistories.AddAsync(appointment);

            var track = new AcademicTrack
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = civilDeptId,
                Name = "Civil Capstone Track",
                AcademicYear = "2025-2026",
                IsActive = true
            };
            await db.AcademicTracks.AddAsync(track);

            var team = new ProjectTeam
            {
                Id = civilTeamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = civilDeptId,
                AcademicTrackId = track.Id,
                TeamCode = "2026-CE-MIN-01",
                Title = "Earthquake Resilient Geopolymer Concrete",
                Status = ProjectStatus.ActiveBuild
            };
            await db.ProjectTeams.AddAsync(team);

            var member = new TeamMember
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = civilTeamId,
                UserId = civilHodUserId, // placeholder user
                IsTeamLead = true
            };
            await db.TeamMembers.AddAsync(member);

            await db.SaveChangesAsync();
        }

        var civilHodToken = GenerateToken(civilHodUserId, DbInitializer.SistecTenantId, civilDeptId, UserRole.HOD);
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/hod/nba/export-zip");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", civilHodToken);

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var bytes = await res.Content.ReadAsByteArrayAsync();
        using var stream = new MemoryStream(bytes);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);

        var matrixEntry = archive.GetEntry("00_NBA_CO_PO_Attainment_Matrix.csv");
        Assert.NotNull(matrixEntry);
        using var reader = new StreamReader(matrixEntry.Open());
        var matrixCsv = await reader.ReadToEndAsync();
        Assert.Contains("No Evaluation Data", matrixCsv);

        var marksheet = archive.GetEntry("01_RGPV_Consolidated_Marksheet.csv");
        Assert.NotNull(marksheet);
        using var msReader = new StreamReader(marksheet.Open());
        var marksheetCsv = await msReader.ReadToEndAsync();
        Assert.Contains("2026-CE-MIN-01", marksheetCsv);
        Assert.Contains("REMEDIAL", marksheetCsv);
    }

    [Fact]
    public async Task HodExportNbaZip_CrossDepartmentAndCrossTenant_EnforcesStrictIsolation()
    {
        // Token from other college tenant attempting to access SISTec export
        var rogueCollegeId = Guid.NewGuid();
        var rogueHodId = Guid.NewGuid();
        var rogueToken = GenerateToken(rogueHodId, rogueCollegeId, DbInitializer.CseDepartmentId, UserRole.HOD);

        var req = new HttpRequestMessage(HttpMethod.Get, "/api/hod/nba/export-zip");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", rogueToken);

        var res = await _client.SendAsync(req);
        // Cross-college/cross-department resolution fails with Forbidden (403)
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }
}
