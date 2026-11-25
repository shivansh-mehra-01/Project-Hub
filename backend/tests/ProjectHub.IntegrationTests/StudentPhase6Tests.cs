using System.IdentityModel.Tokens.Jwt;
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
using ProjectHub.Infrastructure.Services;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class StudentPhase6Tests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public StudentPhase6Tests(CustomWebApplicationFactory factory)
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

    private async Task<(ProjectTeam Team, (Guid LeadId, string LeadToken) Lead, (Guid MemberId, string MemberToken) Member1, (Guid MemberId, string MemberToken) Member2)> SetupTeamWithMembersAsync(string prefix)
    {
        var lead = await CreateStudentAsync($"{prefix}Lead");
        var m1 = await CreateStudentAsync($"{prefix}M1");
        var m2 = await CreateStudentAsync($"{prefix}M2");

        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

        var team = new ProjectTeam
        {
            Id = Guid.NewGuid(),
            CollegeId = DbInitializer.SistecTenantId,
            DepartmentId = DbInitializer.CseDepartmentId,
            AcademicTrackId = DbInitializer.MinorTrackId,
            TeamCode = $"P6-{Guid.NewGuid():N}"[..10].ToUpperInvariant(),
            Title = $"{prefix} Execution Test Team",
            Abstract = "Automated test team for Phase 6 task management verification",
            DomainTag = "IoT Systems",
            Status = ProjectStatus.ActiveBuild,
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
            ModuleResponsibility = "Lead & Systems Architecture"
        };

        var tmM1 = new TeamMember
        {
            Id = Guid.NewGuid(),
            CollegeId = DbInitializer.SistecTenantId,
            ProjectTeamId = team.Id,
            UserId = m1.StudentId,
            IsTeamLead = false,
            IsActive = true,
            ModuleResponsibility = "Backend & API Engine"
        };

        var tmM2 = new TeamMember
        {
            Id = Guid.NewGuid(),
            CollegeId = DbInitializer.SistecTenantId,
            ProjectTeamId = team.Id,
            UserId = m2.StudentId,
            IsTeamLead = false,
            IsActive = true,
            ModuleResponsibility = "Hardware Interface"
        };

        db.ProjectTeams.Add(team);
        db.TeamMembers.AddRange(tmLead, tmM1, tmM2);
        await db.SaveChangesAsync();

        return (team, lead, m1, m2);
    }

    [Fact]
    public async Task Workspace_GetTasks_ReturnsTasks_WithAssigneeAndProgress()
    {
        var (team, lead, m1, _) = await SetupTeamWithMembersAsync("GetTasks");

        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var task1 = new SprintTask
            {
                Id = Guid.NewGuid(),
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                Title = "Setup CI/CD Pipeline",
                CategoryTag = "DevOps",
                AssignedToUserId = lead.LeadId,
                Status = SprintTaskStatus.Done,
                DueDateUtc = DateTime.UtcNow.AddDays(2)
            };
            var task2 = new SprintTask
            {
                Id = Guid.NewGuid(),
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                Title = "Integrate Sensors via I2C",
                CategoryTag = "Hardware",
                AssignedToUserId = m1.MemberId,
                Status = SprintTaskStatus.InProgress,
                DueDateUtc = DateTime.UtcNow.AddDays(-1) // Overdue
            };
            db.SprintTasks.AddRange(task1, task2);
            await db.SaveChangesAsync();
        }

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/student/workspace/tasks");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var tasks = await response.Content.ReadFromJsonAsync<List<SprintTaskDto>>();
        Assert.NotNull(tasks);
        Assert.True(tasks.Count >= 2);

        var sensorTask = tasks.FirstOrDefault(t => t.Title == "Integrate Sensors via I2C");
        Assert.NotNull(sensorTask);
        Assert.True(sensorTask.IsOverdue);
        Assert.Contains("M1", sensorTask.AssigneeName);
    }

    [Fact]
    public async Task Workspace_GetProgress_ComputesCorrectMetrics_AndPercentage()
    {
        var (team, lead, _, _) = await SetupTeamWithMembersAsync("Progress");

        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.SprintTasks.AddRange(
                new SprintTask { Id = Guid.NewGuid(), CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = team.Id, Title = "Task 1", CategoryTag = "HW", Status = SprintTaskStatus.Done },
                new SprintTask { Id = Guid.NewGuid(), CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = team.Id, Title = "Task 2", CategoryTag = "HW", Status = SprintTaskStatus.Done },
                new SprintTask { Id = Guid.NewGuid(), CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = team.Id, Title = "Task 3", CategoryTag = "HW", Status = SprintTaskStatus.InProgress },
                new SprintTask { Id = Guid.NewGuid(), CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = team.Id, Title = "Task 4", CategoryTag = "HW", Status = SprintTaskStatus.Todo }
            );
            await db.SaveChangesAsync();
        }

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/student/workspace/progress");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var progress = await response.Content.ReadFromJsonAsync<ProjectProgressDto>();
        Assert.NotNull(progress);
        Assert.Equal(4, progress.TotalTasks);
        Assert.Equal(2, progress.CompletedTasks);
        Assert.Equal(1, progress.InProgressTasks);
        Assert.Equal(1, progress.TodoTasks);
        Assert.Equal(50.0m, progress.CompletionPercentage);
    }

    [Fact]
    public async Task Workspace_CreateTask_AsTeamLead_Succeeds_AndLogsPlatformAudit()
    {
        var (team, lead, m1, _) = await SetupTeamWithMembersAsync("CreateLead");

        var createReq = new CreateTaskRequest
        {
            Title = "Develop Edge Anomaly Detection Filter",
            CategoryTag = "ML / AI",
            AssignedToUserId = m1.MemberId,
            DueDateUtc = DateTime.UtcNow.AddDays(7)
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/student/workspace/tasks")
        {
            Content = JsonContent.Create(createReq)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<SprintTaskDto>();
        Assert.NotNull(created);
        Assert.Equal("Develop Edge Anomaly Detection Filter", created.Title);
        Assert.Equal("ML / AI", created.CategoryTag);
        Assert.Equal(m1.MemberId, created.AssignedToUserId);
        Assert.Equal(SprintTaskStatus.Todo, created.Status);

        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

        var taskInDb = await db.SprintTasks.FirstOrDefaultAsync(t => t.Id == created.Id);
        Assert.NotNull(taskInDb);
        Assert.Equal(team.Id, taskInDb.ProjectTeamId);

        var auditLog = await db.PlatformAuditLogs
            .FirstOrDefaultAsync(a => a.Action == "STUDENT_TASK_CREATED" && a.TargetTenantId == DbInitializer.SistecTenantId && a.ActorUserId == lead.LeadId);
        Assert.NotNull(auditLog);
        Assert.Contains(created.Id.ToString(), auditLog.MetadataJson);
    }

    [Fact]
    public async Task Workspace_CreateTask_AsNonLeadMember_Returns403Forbidden()
    {
        var (_, _, m1, _) = await SetupTeamWithMembersAsync("NonLeadCreate");

        var createReq = new CreateTaskRequest
        {
            Title = "Unauthorized Task Attempt",
            CategoryTag = "Testing"
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/student/workspace/tasks")
        {
            Content = JsonContent.Create(createReq)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", m1.MemberToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("a")]
    [InlineData("ab")]
    public async Task Workspace_CreateTask_WithInvalidTitle_Returns400BadRequest(string invalidTitle)
    {
        var (_, lead, _, _) = await SetupTeamWithMembersAsync("InvalidTitle");

        var createReq = new CreateTaskRequest
        {
            Title = invalidTitle,
            CategoryTag = "Testing"
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/student/workspace/tasks")
        {
            Content = JsonContent.Create(createReq)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Workspace_CreateTask_AssignToNonTeamMember_Returns400BadRequest()
    {
        var (_, lead, _, _) = await SetupTeamWithMembersAsync("InvalidAssignee");
        var stranger = await CreateStudentAsync("Stranger");

        var createReq = new CreateTaskRequest
        {
            Title = "Valid Task Title Here",
            CategoryTag = "Testing",
            AssignedToUserId = stranger.StudentId
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/student/workspace/tasks")
        {
            Content = JsonContent.Create(createReq)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("active member of the project team", body);
    }

    [Fact]
    public async Task Workspace_UpdateTask_AsTeamLead_Succeeds_AndLogsPlatformAudit()
    {
        var (team, lead, m1, m2) = await SetupTeamWithMembersAsync("UpdateLead");

        Guid taskId;
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var task = new SprintTask
            {
                Id = Guid.NewGuid(),
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                Title = "Original Title",
                CategoryTag = "OriginalCategory",
                AssignedToUserId = m1.MemberId,
                Status = SprintTaskStatus.Todo
            };
            db.SprintTasks.Add(task);
            await db.SaveChangesAsync();
            taskId = task.Id;
        }

        var updateReq = new UpdateTaskRequest
        {
            Title = "Updated Title for Verification",
            CategoryTag = "Cloud & Backend",
            AssignedToUserId = m2.MemberId,
            DueDateUtc = DateTime.UtcNow.AddDays(14)
        };

        var request = new HttpRequestMessage(HttpMethod.Put, $"/api/student/workspace/tasks/{taskId}")
        {
            Content = JsonContent.Create(updateReq)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var updated = await db.SprintTasks.FirstAsync(t => t.Id == taskId);
            Assert.Equal("Updated Title for Verification", updated.Title);
            Assert.Equal("Cloud & Backend", updated.CategoryTag);
            Assert.Equal(m2.MemberId, updated.AssignedToUserId);

            var auditLog = await db.PlatformAuditLogs
                .FirstOrDefaultAsync(a => a.Action == "STUDENT_TASK_UPDATED" && a.ActorUserId == lead.LeadId);
            Assert.NotNull(auditLog);
            Assert.Contains(taskId.ToString(), auditLog.MetadataJson);
        }
    }

    [Fact]
    public async Task Workspace_UpdateTask_AsNonLead_Returns403Forbidden()
    {
        var (team, _, m1, _) = await SetupTeamWithMembersAsync("NonLeadUpdate");

        Guid taskId;
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var task = new SprintTask
            {
                Id = Guid.NewGuid(),
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                Title = "Task to be Protected",
                CategoryTag = "Security"
            };
            db.SprintTasks.Add(task);
            await db.SaveChangesAsync();
            taskId = task.Id;
        }

        var updateReq = new UpdateTaskRequest { Title = "Rogue Update" };
        var request = new HttpRequestMessage(HttpMethod.Put, $"/api/student/workspace/tasks/{taskId}")
        {
            Content = JsonContent.Create(updateReq)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", m1.MemberToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Workspace_UpdateTaskStatus_AsAssignedMember_Succeeds()
    {
        var (team, _, m1, _) = await SetupTeamWithMembersAsync("StatusAssigned");

        Guid taskId;
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var task = new SprintTask
            {
                Id = Guid.NewGuid(),
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                Title = "Implement Data Validation",
                CategoryTag = "Backend",
                AssignedToUserId = m1.MemberId,
                Status = SprintTaskStatus.Todo
            };
            db.SprintTasks.Add(task);
            await db.SaveChangesAsync();
            taskId = task.Id;
        }

        var patchReq = new UpdateTaskStatusRequest { Status = SprintTaskStatus.InProgress };
        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/student/workspace/tasks/{taskId}/status")
        {
            Content = JsonContent.Create(patchReq)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", m1.MemberToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var updated = await db.SprintTasks.FirstAsync(t => t.Id == taskId);
            Assert.Equal(SprintTaskStatus.InProgress, updated.Status);

            var auditLog = await db.PlatformAuditLogs
                .FirstOrDefaultAsync(a => a.Action == "STUDENT_TASK_STATUS_CHANGED" && a.ActorUserId == m1.MemberId);
            Assert.NotNull(auditLog);
        }
    }

    [Fact]
    public async Task Workspace_UpdateTaskStatus_AsUnassignedNonLeadMember_Returns403Forbidden()
    {
        var (team, _, m1, m2) = await SetupTeamWithMembersAsync("StatusUnassigned");

        Guid taskId;
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var task = new SprintTask
            {
                Id = Guid.NewGuid(),
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                Title = "M1 Task",
                CategoryTag = "Backend",
                AssignedToUserId = m1.MemberId,
                Status = SprintTaskStatus.Todo
            };
            db.SprintTasks.Add(task);
            await db.SaveChangesAsync();
            taskId = task.Id;
        }

        // M2 attempts to update status of M1's task
        var patchReq = new UpdateTaskStatusRequest { Status = SprintTaskStatus.Done };
        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/student/workspace/tasks/{taskId}/status")
        {
            Content = JsonContent.Create(patchReq)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", m2.MemberToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Workspace_DeleteTask_AsTeamLead_SoftDeletesIncompleteTask()
    {
        var (team, lead, _, _) = await SetupTeamWithMembersAsync("DeleteLead");

        Guid taskId;
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var task = new SprintTask
            {
                Id = Guid.NewGuid(),
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                Title = "Temporary Task To Delete",
                CategoryTag = "Scratch",
                Status = SprintTaskStatus.Todo
            };
            db.SprintTasks.Add(task);
            await db.SaveChangesAsync();
            taskId = task.Id;
        }

        var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/student/workspace/tasks/{taskId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var deletedTask = await db.SprintTasks.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == taskId);
            Assert.NotNull(deletedTask);
            Assert.True(deletedTask.IsDeleted);

            var auditLog = await db.PlatformAuditLogs
                .FirstOrDefaultAsync(a => a.Action == "STUDENT_TASK_DELETED" && a.ActorUserId == lead.LeadId);
            Assert.NotNull(auditLog);
        }
    }

    [Fact]
    public async Task Workspace_DeleteTask_WhenTaskAlreadyDone_Returns400BadRequest()
    {
        var (team, lead, _, _) = await SetupTeamWithMembersAsync("DeleteDone");

        Guid taskId;
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var task = new SprintTask
            {
                Id = Guid.NewGuid(),
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                Title = "Completed Milestone Deliverable",
                CategoryTag = "Milestone",
                Status = SprintTaskStatus.Done
            };
            db.SprintTasks.Add(task);
            await db.SaveChangesAsync();
            taskId = task.Id;
        }

        var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/student/workspace/tasks/{taskId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Completed tasks cannot be deleted", body);

        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var preserved = await db.SprintTasks.FirstOrDefaultAsync(t => t.Id == taskId);
            Assert.NotNull(preserved);
            Assert.False(preserved.IsDeleted);
        }
    }

    [Fact]
    public async Task Workspace_DeleteTask_AsNonLead_Returns403Forbidden()
    {
        var (team, _, m1, _) = await SetupTeamWithMembersAsync("DeleteNonLead");

        Guid taskId;
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var task = new SprintTask
            {
                Id = Guid.NewGuid(),
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                Title = "Protected Task",
                CategoryTag = "Security",
                Status = SprintTaskStatus.Todo
            };
            db.SprintTasks.Add(task);
            await db.SaveChangesAsync();
            taskId = task.Id;
        }

        var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/student/workspace/tasks/{taskId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", m1.MemberToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Workspace_Tasks_BelongingToAnotherTeam_ReturnsNotFound()
    {
        var (team1, _, _, _) = await SetupTeamWithMembersAsync("Team1");
        var (_, lead2, _, _) = await SetupTeamWithMembersAsync("Team2");

        Guid taskId;
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var task = new SprintTask
            {
                Id = Guid.NewGuid(),
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team1.Id,
                Title = "Team 1 Secret Task",
                CategoryTag = "Security"
            };
            db.SprintTasks.Add(task);
            await db.SaveChangesAsync();
            taskId = task.Id;
        }

        // Lead of Team 2 attempts to manipulate Team 1's task
        var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/student/workspace/tasks/{taskId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead2.LeadToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Workspace_TaskLifecycle_DeterministicallyUpdatesProgressPercentage()
    {
        var (team, lead, m1, _) = await SetupTeamWithMembersAsync("LifecycleProgress");

        Guid t1, t2, t3, t4;
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var task1 = new SprintTask { Id = Guid.NewGuid(), CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = team.Id, Title = "Step 1", CategoryTag = "HW", Status = SprintTaskStatus.Todo, AssignedToUserId = m1.MemberId };
            var task2 = new SprintTask { Id = Guid.NewGuid(), CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = team.Id, Title = "Step 2", CategoryTag = "HW", Status = SprintTaskStatus.Todo, AssignedToUserId = m1.MemberId };
            var task3 = new SprintTask { Id = Guid.NewGuid(), CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = team.Id, Title = "Step 3", CategoryTag = "HW", Status = SprintTaskStatus.Todo, AssignedToUserId = lead.LeadId };
            var task4 = new SprintTask { Id = Guid.NewGuid(), CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = team.Id, Title = "Step 4", CategoryTag = "HW", Status = SprintTaskStatus.Todo, AssignedToUserId = lead.LeadId };
            db.SprintTasks.AddRange(task1, task2, task3, task4);
            await db.SaveChangesAsync();
            t1 = task1.Id;
            t2 = task2.Id;
            t3 = task3.Id;
            t4 = task4.Id;
        }

        // 1. Initial: 0 of 4 -> 0.0%
        var req1 = new HttpRequestMessage(HttpMethod.Get, "/api/student/workspace/progress");
        req1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var res1 = await _client.SendAsync(req1);
        var prog1 = await res1.Content.ReadFromJsonAsync<ProjectProgressDto>();
        Assert.Equal(0.0m, prog1!.CompletionPercentage);

        // 2. Member 1 completes Task 1 -> 1 of 4 -> 25.0%
        var patchReq1 = new HttpRequestMessage(HttpMethod.Patch, $"/api/student/workspace/tasks/{t1}/status")
        {
            Content = JsonContent.Create(new UpdateTaskStatusRequest { Status = SprintTaskStatus.Done })
        };
        patchReq1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", m1.MemberToken);
        var patchRes1 = await _client.SendAsync(patchReq1);
        Assert.Equal(HttpStatusCode.OK, patchRes1.StatusCode);

        var req2 = new HttpRequestMessage(HttpMethod.Get, "/api/student/workspace/progress");
        req2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var res2 = await _client.SendAsync(req2);
        var prog2 = await res2.Content.ReadFromJsonAsync<ProjectProgressDto>();
        Assert.Equal(25.0m, prog2!.CompletionPercentage);

        // 3. Lead completes Task 3 -> 2 of 4 -> 50.0%
        var patchReq2 = new HttpRequestMessage(HttpMethod.Patch, $"/api/student/workspace/tasks/{t3}/status")
        {
            Content = JsonContent.Create(new UpdateTaskStatusRequest { Status = SprintTaskStatus.Done })
        };
        patchReq2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var patchRes2 = await _client.SendAsync(patchReq2);
        Assert.Equal(HttpStatusCode.OK, patchRes2.StatusCode);

        var req3 = new HttpRequestMessage(HttpMethod.Get, "/api/student/workspace/progress");
        req3.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var res3 = await _client.SendAsync(req3);
        var prog3 = await res3.Content.ReadFromJsonAsync<ProjectProgressDto>();
        Assert.Equal(50.0m, prog3!.CompletionPercentage);

        // 4. Lead deletes incomplete Task 4 -> 2 of 3 -> 66.7%
        var delReq = new HttpRequestMessage(HttpMethod.Delete, $"/api/student/workspace/tasks/{t4}");
        delReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var delRes = await _client.SendAsync(delReq);
        Assert.Equal(HttpStatusCode.NoContent, delRes.StatusCode);

        var req4 = new HttpRequestMessage(HttpMethod.Get, "/api/student/workspace/progress");
        req4.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead.LeadToken);
        var res4 = await _client.SendAsync(req4);
        var prog4 = await res4.Content.ReadFromJsonAsync<ProjectProgressDto>();
        Assert.Equal(3, prog4!.TotalTasks);
        Assert.Equal(2, prog4.CompletedTasks);
        Assert.Equal(66.7m, prog4.CompletionPercentage);
    }
}
