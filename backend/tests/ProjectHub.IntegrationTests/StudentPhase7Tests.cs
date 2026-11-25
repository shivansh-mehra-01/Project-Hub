using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using ProjectHub.Application.Common.Models;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class StudentPhase7Tests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public StudentPhase7Tests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private IServiceScope CreateTenantScope()
    {
        var scope = _factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        tenantContext.IsSuperAdmin = true;
        tenantContext.CollegeId = DbInitializer.SistecTenantId;
        return scope;
    }

    private static string GenerateToken(
        Guid userId,
        Guid collegeId,
        Guid? departmentId,
        UserRole role,
        bool isCoordinator = false)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("ProjectHubSuperSecretDevKeyMinLength32CharactersRequired!"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new("sub", userId.ToString()),
            new("user_id", userId.ToString()),
            new(ClaimTypes.Email, $"user.{userId:N}@sistec.ac.in"),
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

    private async Task<(Guid StudentId, string Token)> CreateStudentAsync(
        string emailSuffix,
        Guid? collegeId = null,
        Guid? departmentId = null)
    {
        var cid = collegeId ?? DbInitializer.SistecTenantId;
        var did = departmentId ?? DbInitializer.CseDepartmentId;
        var studentId = Guid.NewGuid();

        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

        var user = new UserAccount
        {
            Id = studentId,
            CollegeId = cid,
            DepartmentId = did,
            FullName = $"Student {emailSuffix}",
            Email = $"student.{emailSuffix.ToLowerInvariant()}.{Guid.NewGuid():N}@sistec.ac.in",
            EnrollmentOrEmployeeCode = $"0176CS{Random.Shared.Next(100000, 999999)}",
            Role = UserRole.Student,
            IsActivated = true,
            IsActive = true
        };

        await db.Users.AddAsync(user);
        await db.SaveChangesAsync();

        var token = GenerateToken(studentId, cid, did, UserRole.Student);
        return (studentId, token);
    }

    private async Task<(Guid FacultyId, string Token)> CreateFacultyAsync(
        string emailSuffix,
        Guid? collegeId = null,
        Guid? departmentId = null,
        UserRole role = UserRole.Faculty)
    {
        var cid = collegeId ?? DbInitializer.SistecTenantId;
        var did = departmentId ?? DbInitializer.CseDepartmentId;
        var facultyId = Guid.NewGuid();

        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

        var user = new UserAccount
        {
            Id = facultyId,
            CollegeId = cid,
            DepartmentId = did,
            FullName = $"Prof. {emailSuffix}",
            Email = $"faculty.{emailSuffix.ToLowerInvariant()}.{Guid.NewGuid():N}@sistec.ac.in",
            EnrollmentOrEmployeeCode = $"FAC{Random.Shared.Next(1000, 9999)}",
            Role = role,
            IsActivated = true,
            IsActive = true
        };

        await db.Users.AddAsync(user);
        await db.SaveChangesAsync();

        var token = GenerateToken(facultyId, cid, did, role);
        return (facultyId, token);
    }

    private async Task<(ProjectTeam Team, (Guid LeadId, string LeadToken) Lead, (Guid MemberId, string MemberToken) Member1)> SetupTeamWithLeadAsync(string prefix, Guid? officialGuideId = null, Guid? preferredGuideId = null)
    {
        var lead = await CreateStudentAsync($"{prefix}Lead");
        var m1 = await CreateStudentAsync($"{prefix}M1");

        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

        var team = new ProjectTeam
        {
            Id = Guid.NewGuid(),
            CollegeId = DbInitializer.SistecTenantId,
            DepartmentId = DbInitializer.CseDepartmentId,
            AcademicTrackId = DbInitializer.MinorTrackId,
            TeamCode = $"P7-{Guid.NewGuid():N}"[..10].ToUpperInvariant(),
            Title = $"{prefix} Milestone Review Team",
            Abstract = "Automated test team for Phase 7 faculty supervision and milestone review",
            DomainTag = "Cloud Infrastructure",
            Status = ProjectStatus.ActiveBuild,
            GuideUserId = officialGuideId,
            PreferredGuideUserId = preferredGuideId,
            GuidePreferenceStatus = preferredGuideId.HasValue ? GuidePreferenceStatus.Requested : GuidePreferenceStatus.None,
            GuideAllocatedAtUtc = officialGuideId.HasValue ? DateTime.UtcNow : null,
            IsDeleted = false
        };

        var tmLead = new TeamMember
        {
            Id = Guid.NewGuid(),
            CollegeId = DbInitializer.SistecTenantId,
            ProjectTeamId = team.Id,
            UserId = lead.StudentId,
            IsTeamLead = true,
            IsActive = true,
            ModuleResponsibility = "Lead Architect"
        };

        var tmM1 = new TeamMember
        {
            Id = Guid.NewGuid(),
            CollegeId = DbInitializer.SistecTenantId,
            ProjectTeamId = team.Id,
            UserId = m1.StudentId,
            IsTeamLead = false,
            IsActive = true,
            ModuleResponsibility = "Core Module"
        };

        db.ProjectTeams.Add(team);
        db.TeamMembers.AddRange(tmLead, tmM1);
        await db.SaveChangesAsync();

        return (team, lead, m1);
    }

    [Fact]
    public async Task StudentCannotReviewOrApproveMilestone_ReturnsForbidden()
    {
        var (guide, _) = await CreateFacultyAsync("OfficialGuide1");
        var (team, lead, _) = await SetupTeamWithLeadAsync("SecGate1", officialGuideId: guide);

        // Lead creates milestone
        using var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/student/workspace/milestones")
        {
            Content = JsonContent.Create(new CreateMilestoneRequest
            {
                Title = "Architecture Specification",
                Description = "System architecture diagram and data flow specification.",
                TargetDateUtc = DateTime.UtcNow.AddDays(14),
                RequiredTaskCompletionPercentage = 0
            })
        };
        createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var createResp = await _client.SendAsync(createReq);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = await createResp.Content.ReadFromJsonAsync<ProjectMilestoneDto>();
        Assert.NotNull(created);

        // Student tries to call faculty supervision review endpoint
        using var reviewReq = new HttpRequestMessage(HttpMethod.Post, $"/api/faculty/supervision/milestones/{created.Id}/review")
        {
            Content = JsonContent.Create(new ReviewMilestoneRequest
            {
                IsApproved = true,
                Feedback = "Self approval by student lead"
            })
        };
        reviewReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var reviewResp = await _client.SendAsync(reviewReq);

        // Must be 403 Forbidden due to ProjectHubPolicies.FacultyOrAbove
        Assert.Equal(HttpStatusCode.Forbidden, reviewResp.StatusCode);
    }

    [Fact]
    public async Task OfficialGuide_CanAccessSupervisionDashboard_AndTeamDetail()
    {
        var (guide, guideToken) = await CreateFacultyAsync("SupervisingFaculty");
        var (team, _, _) = await SetupTeamWithLeadAsync("SupTeam1", officialGuideId: guide);

        // 1. Dashboard
        using var dashReq = new HttpRequestMessage(HttpMethod.Get, "/api/faculty/supervision/dashboard");
        dashReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", guideToken);
        var dashResp = await _client.SendAsync(dashReq);
        Assert.Equal(HttpStatusCode.OK, dashResp.StatusCode);

        var dash = await dashResp.Content.ReadFromJsonAsync<SupervisionDashboardDto>();
        Assert.NotNull(dash);
        Assert.True(dash.SupervisedTeamsCount >= 1);
        Assert.Contains(dash.Teams, t => t.TeamId == team.Id);

        // 2. Team Detail
        using var detailReq = new HttpRequestMessage(HttpMethod.Get, $"/api/faculty/supervision/teams/{team.Id}");
        detailReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", guideToken);
        var detailResp = await _client.SendAsync(detailReq);
        Assert.Equal(HttpStatusCode.OK, detailResp.StatusCode);

        var detail = await detailResp.Content.ReadFromJsonAsync<SupervisedTeamDetailDto>();
        Assert.NotNull(detail);
        Assert.Equal(team.Id, detail.TeamId);
        Assert.Equal(2, detail.Members.Count);
    }

    [Fact]
    public async Task PreferredOnlyFaculty_CannotAccessSupervisionDetail_ReturnsForbidden()
    {
        var (preferredGuide, prefToken) = await CreateFacultyAsync("PreferredOnlyFac");
        var (team, _, _) = await SetupTeamWithLeadAsync("PrefOnly1", officialGuideId: null, preferredGuideId: preferredGuide);

        // Preferred faculty attempts to access team detail under official supervision
        using var detailReq = new HttpRequestMessage(HttpMethod.Get, $"/api/faculty/supervision/teams/{team.Id}");
        detailReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", prefToken);
        var detailResp = await _client.SendAsync(detailReq);

        // Must be 403 Forbidden because caller is NOT the officially allocated guide
        Assert.Equal(HttpStatusCode.Forbidden, detailResp.StatusCode);
    }

    [Fact]
    public async Task StudentLead_CanCreateMilestone_AndMemberCannotCreate_ReturnsForbidden()
    {
        var (guide, _) = await CreateFacultyAsync("GuideForCreateTest");
        var (_, lead, member) = await SetupTeamWithLeadAsync("MilestoneAuth", officialGuideId: guide);

        // Non-lead member tries to create milestone
        using var memReq = new HttpRequestMessage(HttpMethod.Post, "/api/student/workspace/milestones")
        {
            Content = JsonContent.Create(new CreateMilestoneRequest
            {
                Title = "Unauthorized Milestone",
                Description = "Created by standard contributor member",
                TargetDateUtc = DateTime.UtcNow.AddDays(7)
            })
        };
        memReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", member.MemberToken);
        var memResp = await _client.SendAsync(memReq);
        Assert.Equal(HttpStatusCode.Forbidden, memResp.StatusCode);

        // Lead creates milestone
        using var leadReq = new HttpRequestMessage(HttpMethod.Post, "/api/student/workspace/milestones")
        {
            Content = JsonContent.Create(new CreateMilestoneRequest
            {
                Title = "Authorized Milestone",
                Description = "Created by designated Team Lead",
                TargetDateUtc = DateTime.UtcNow.AddDays(7)
            })
        };
        leadReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var leadResp = await _client.SendAsync(leadReq);
        Assert.Equal(HttpStatusCode.Created, leadResp.StatusCode);

        var milestone = await leadResp.Content.ReadFromJsonAsync<ProjectMilestoneDto>();
        Assert.NotNull(milestone);
        Assert.Equal("Authorized Milestone", milestone.Title);
        Assert.Equal(MilestoneStatus.Pending, milestone.Status);
    }

    [Fact]
    public async Task MilestoneSubmission_BeforeOfficialGuideAllocated_ReturnsBadRequest()
    {
        // Team has NO official guide allocated
        var (_, lead, _) = await SetupTeamWithLeadAsync("NoGuideSub", officialGuideId: null);

        // Create milestone
        using var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/student/workspace/milestones")
        {
            Content = JsonContent.Create(new CreateMilestoneRequest
            {
                Title = "Early Milestone",
                Description = "Attempting submission before guide allocation",
                TargetDateUtc = DateTime.UtcNow.AddDays(10)
            })
        };
        createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var createResp = await _client.SendAsync(createReq);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = await createResp.Content.ReadFromJsonAsync<ProjectMilestoneDto>();
        Assert.NotNull(created);

        // Attempt submission
        using var submitReq = new HttpRequestMessage(HttpMethod.Post, $"/api/student/workspace/milestones/{created.Id}/submit")
        {
            Content = JsonContent.Create(new SubmitMilestoneRequest
            {
                SubmissionEvidenceUrl = "https://github.com/projecthub/early-check"
            })
        };
        submitReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var submitResp = await _client.SendAsync(submitReq);

        // Must reject because no official guide is allocated to review it
        Assert.Equal(HttpStatusCode.BadRequest, submitResp.StatusCode);
    }

    [Fact]
    public async Task FullMilestoneLifecycle_Submit_RevisionRequested_Resubmit_Approved_AndReviewHistory()
    {
        var (guide, guideToken) = await CreateFacultyAsync("ReviewLifecycleGuide");
        var (team, lead, _) = await SetupTeamWithLeadAsync("FullLifecycle", officialGuideId: guide);

        // 1. Lead creates milestone
        using var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/student/workspace/milestones")
        {
            Content = JsonContent.Create(new CreateMilestoneRequest
            {
                Title = "Sprint 1 Architecture Sign-off",
                Description = "Deliver core DB schemas and architecture diagram",
                TargetDateUtc = DateTime.UtcNow.AddDays(7),
                RequiredTaskCompletionPercentage = 0
            })
        };
        createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var createResp = await _client.SendAsync(createReq);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var milestone = await createResp.Content.ReadFromJsonAsync<ProjectMilestoneDto>();
        Assert.NotNull(milestone);

        // 2. Lead submits for review
        using var sub1Req = new HttpRequestMessage(HttpMethod.Post, $"/api/student/workspace/milestones/{milestone.Id}/submit")
        {
            Content = JsonContent.Create(new SubmitMilestoneRequest
            {
                SubmissionEvidenceUrl = "https://github.com/projecthub/sprint-1-pr/42",
                SubmissionNotes = "First iteration submitted for mentor evaluation."
            })
        };
        sub1Req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var sub1Resp = await _client.SendAsync(sub1Req);
        Assert.Equal(HttpStatusCode.OK, sub1Resp.StatusCode);

        // 3. Official Guide reviews and requests revision
        using var rev1Req = new HttpRequestMessage(HttpMethod.Post, $"/api/faculty/supervision/milestones/{milestone.Id}/review")
        {
            Content = JsonContent.Create(new ReviewMilestoneRequest
            {
                IsApproved = false,
                Feedback = "ER diagram lacks cardinality markers on ProjectTeam to TeamMember."
            })
        };
        rev1Req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", guideToken);
        var rev1Resp = await _client.SendAsync(rev1Req);
        Assert.Equal(HttpStatusCode.OK, rev1Resp.StatusCode);
        var rev1Result = await rev1Resp.Content.ReadFromJsonAsync<ProjectMilestoneDto>();
        Assert.NotNull(rev1Result);
        Assert.Equal(MilestoneStatus.RevisionRequested, rev1Result.Status);
        Assert.Single(rev1Result.ReviewHistories);
        Assert.Equal("ER diagram lacks cardinality markers on ProjectTeam to TeamMember.", rev1Result.ReviewHistories[0].Feedback);

        // 4. Lead updates milestone and resubmits
        using var updateReq = new HttpRequestMessage(HttpMethod.Put, $"/api/student/workspace/milestones/{milestone.Id}")
        {
            Content = JsonContent.Create(new UpdateMilestoneRequest
            {
                Title = "Sprint 1 Architecture Sign-off (Revised)",
                Description = "Deliver updated DB schemas with complete cardinality notation",
                TargetDateUtc = DateTime.UtcNow.AddDays(9),
                RequiredTaskCompletionPercentage = 0
            })
        };
        updateReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var updateResp = await _client.SendAsync(updateReq);
        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);

        using var sub2Req = new HttpRequestMessage(HttpMethod.Post, $"/api/student/workspace/milestones/{milestone.Id}/submit")
        {
            Content = JsonContent.Create(new SubmitMilestoneRequest
            {
                SubmissionEvidenceUrl = "https://github.com/projecthub/sprint-1-pr/42-revised",
                SubmissionNotes = "Fixed cardinality notation per mentor remarks."
            })
        };
        sub2Req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var sub2Resp = await _client.SendAsync(sub2Req);
        Assert.Equal(HttpStatusCode.OK, sub2Resp.StatusCode);

        // 5. Official Guide reviews and approves
        using var rev2Req = new HttpRequestMessage(HttpMethod.Post, $"/api/faculty/supervision/milestones/{milestone.Id}/review")
        {
            Content = JsonContent.Create(new ReviewMilestoneRequest
            {
                IsApproved = true,
                Feedback = "Cardinality verified. System architecture approved for implementation."
            })
        };
        rev2Req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", guideToken);
        var rev2Resp = await _client.SendAsync(rev2Req);
        Assert.Equal(HttpStatusCode.OK, rev2Resp.StatusCode);
        var rev2Result = await rev2Resp.Content.ReadFromJsonAsync<ProjectMilestoneDto>();
        Assert.NotNull(rev2Result);
        Assert.Equal(MilestoneStatus.Approved, rev2Result.Status);
        Assert.Equal(2, rev2Result.ReviewHistories.Count);

        // 6. Verification: Lead cannot resubmit already approved milestone
        using var sub3Req = new HttpRequestMessage(HttpMethod.Post, $"/api/student/workspace/milestones/{milestone.Id}/submit")
        {
            Content = JsonContent.Create(new SubmitMilestoneRequest
            {
                SubmissionEvidenceUrl = "https://github.com/projecthub/should-fail"
            })
        };
        sub3Req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var sub3Resp = await _client.SendAsync(sub3Req);
        Assert.Equal(HttpStatusCode.BadRequest, sub3Resp.StatusCode);

        // 7. Verification: Get history endpoint returns both iterations
        using var histReq = new HttpRequestMessage(HttpMethod.Get, $"/api/student/workspace/milestones/{milestone.Id}/history");
        histReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var histResp = await _client.SendAsync(histReq);
        Assert.Equal(HttpStatusCode.OK, histResp.StatusCode);
        var histories = await histResp.Content.ReadFromJsonAsync<List<MilestoneReviewHistoryDto>>();
        Assert.NotNull(histories);
        Assert.Equal(2, histories.Count);
        Assert.Equal(MilestoneStatus.Approved, histories[0].ResultStatus);
        Assert.Equal(MilestoneStatus.RevisionRequested, histories[1].ResultStatus);
    }

    [Fact]
    public async Task TaskCompletionGate_BlocksSubmissionIfCompletionBelowThreshold()
    {
        var (guide, _) = await CreateFacultyAsync("GateGuide");
        var (team, lead, _) = await SetupTeamWithLeadAsync("GateTest", officialGuideId: guide);

        // Add 2 sprint tasks to the team (0 done)
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var t1 = new SprintTask
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                Title = "Task 1",
                CategoryTag = "Backend",
                Status = SprintTaskStatus.Todo
            };
            var t2 = new SprintTask
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                Title = "Task 2",
                CategoryTag = "Frontend",
                Status = SprintTaskStatus.Todo
            };
            db.SprintTasks.AddRange(t1, t2);
            await db.SaveChangesAsync();
        }

        // Create milestone requiring 50% task completion
        using var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/student/workspace/milestones")
        {
            Content = JsonContent.Create(new CreateMilestoneRequest
            {
                Title = "Gate Enforcement Milestone",
                Description = "Requires half of sprint tasks to be completed before review",
                TargetDateUtc = DateTime.UtcNow.AddDays(7),
                RequiredTaskCompletionPercentage = 50
            })
        };
        createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var createResp = await _client.SendAsync(createReq);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var milestone = await createResp.Content.ReadFromJsonAsync<ProjectMilestoneDto>();
        Assert.NotNull(milestone);

        // Attempt submit at 0% completion -> should fail
        using var subFailReq = new HttpRequestMessage(HttpMethod.Post, $"/api/student/workspace/milestones/{milestone.Id}/submit")
        {
            Content = JsonContent.Create(new SubmitMilestoneRequest
            {
                SubmissionEvidenceUrl = "https://github.com/projecthub/incomplete-work"
            })
        };
        subFailReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var subFailResp = await _client.SendAsync(subFailReq);
        Assert.Equal(HttpStatusCode.BadRequest, subFailResp.StatusCode);

        // Complete 1 of the 2 tasks (50% completion)
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var task = await db.SprintTasks.FirstAsync(t => t.ProjectTeamId == team.Id);
            task.Status = SprintTaskStatus.Done;
            await db.SaveChangesAsync();
        }

        // Attempt submit again at 50% -> should succeed
        using var subPassReq = new HttpRequestMessage(HttpMethod.Post, $"/api/student/workspace/milestones/{milestone.Id}/submit")
        {
            Content = JsonContent.Create(new SubmitMilestoneRequest
            {
                SubmissionEvidenceUrl = "https://github.com/projecthub/50pct-completed-work"
            })
        };
        subPassReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var subPassResp = await _client.SendAsync(subPassReq);
        Assert.Equal(HttpStatusCode.OK, subPassResp.StatusCode);
    }

    [Fact]
    public async Task Workspace_GetWorkspace_IncludesMilestones()
    {
        var (guide, _) = await CreateFacultyAsync("WorkspaceGuide");
        var (team, lead, _) = await SetupTeamWithLeadAsync("WorkspaceMilestones", officialGuideId: guide);

        // Create milestone
        using var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/student/workspace/milestones")
        {
            Content = JsonContent.Create(new CreateMilestoneRequest
            {
                Title = "Workspace Embedded Milestone",
                Description = "Verifying presence in StudentWorkspaceDto",
                TargetDateUtc = DateTime.UtcNow.AddDays(14)
            })
        };
        createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var createResp = await _client.SendAsync(createReq);
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);

        // Get full workspace
        using var wsReq = new HttpRequestMessage(HttpMethod.Get, "/api/student/workspace");
        wsReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var wsResp = await _client.SendAsync(wsReq);
        Assert.Equal(HttpStatusCode.OK, wsResp.StatusCode);

        var ws = await wsResp.Content.ReadFromJsonAsync<StudentWorkspaceDto>();
        Assert.NotNull(ws);
        Assert.Contains(ws.Milestones, m => m.Title == "Workspace Embedded Milestone");
    }

    [Fact]
    public async Task CrossTenantIsolation_FacultyCannotAccessTeamInAnotherCollege()
    {
        var (guide, _) = await CreateFacultyAsync("SistecGuide", collegeId: DbInitializer.SistecTenantId);
        var (team, _, _) = await SetupTeamWithLeadAsync("SistecTeam", officialGuideId: guide);

        // Faculty from BMSCE college
        var (bmsceFaculty, bmsceToken) = await CreateFacultyAsync("BmsceFaculty", collegeId: DbInitializer.BmsceTenantId);

        using var crossReq = new HttpRequestMessage(HttpMethod.Get, $"/api/faculty/supervision/teams/{team.Id}");
        crossReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bmsceToken);
        var crossResp = await _client.SendAsync(crossReq);

        // Tenant query filter / authorization prevents cross-college access
        Assert.True(crossResp.StatusCode == HttpStatusCode.NotFound || crossResp.StatusCode == HttpStatusCode.Forbidden);
    }
}
