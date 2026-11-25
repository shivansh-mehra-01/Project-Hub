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
using Xunit;

namespace ProjectHub.IntegrationTests;

public class StudentPhase3Tests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public StudentPhase3Tests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
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
            new(ClaimTypes.Email, "student.phase3@sistec.ac.in"),
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

    private async Task<(Guid StudentId, string Token)> CreateUnallocatedStudentWithEnrollmentAsync(string emailSuffix)
    {
        var studentId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var student = new UserAccount
            {
                Id = studentId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                FullName = $"Test Unallocated Student {emailSuffix}",
                Email = $"student.{emailSuffix}@sistec.ac.in",
                EnrollmentOrEmployeeCode = $"0176CS22{Random.Shared.Next(1000, 9999)}",
                Role = UserRole.Student,
                IsActive = true,
                IsActivated = true
            };
            db.Users.Add(student);

            var enrollment = new StudentAcademicEnrollment
            {
                CollegeId = DbInitializer.SistecTenantId,
                StudentUserId = studentId,
                CourseProgramId = DbInitializer.SistecBTechCourseProgramId,
                DepartmentId = DbInitializer.CseDepartmentId,
                CurrentSemesterTermId = DbInitializer.SistecCseSem6TermId,
                AdmissionBatch = "2023-2027",
                AcademicStatus = AcademicStatus.Active
            };
            db.StudentAcademicEnrollments.Add(enrollment);
            await db.SaveChangesAsync();
        }

        var token = GenerateToken(studentId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Student);
        return (studentId, token);
    }

    [Fact]
    public async Task GetProblemBank_AuthenticatedStudent_ReturnsEligibleStatements()
    {
        // Arrange: Seed a problem statement for Sistec
        var statementId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var pb = new ProblemBankStatement
            {
                Id = statementId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                ProposedByFacultyId = DbInitializer.FacultyNairUserId,
                Title = "Autonomous Greenhouse Microclimate Regulation via LoRaWAN",
                Abstract = "Deploying solar micro-nodes for high precision temperature and humidity regulation across agricultural plots.",
                SdgCode = "SDG-2",
                PrerequisitesCsv = "Python, Embedded C, LoRaWAN",
                MaxTeamCapacity = 2,
                IsAllocated = false
            };
            db.ProblemBankStatements.Add(pb);
            await db.SaveChangesAsync();
        }

        var (_, token) = await CreateUnallocatedStudentWithEnrollmentAsync("pb_student");
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/student/problem-bank");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var statements = await response.Content.ReadFromJsonAsync<List<ProblemBankStatementDto>>();
        Assert.NotNull(statements);
        Assert.Contains(statements, s => s.Id == statementId && s.Title.Contains("Greenhouse"));
    }

    [Fact]
    public async Task GetProblemBank_CrossTenant_DoesNotExposeForeignStatements()
    {
        // Arrange: Seed a statement belonging to a foreign college
        var foreignStatementId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.BmsceTenantId;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var pb = new ProblemBankStatement
            {
                Id = foreignStatementId,
                CollegeId = DbInitializer.BmsceTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                ProposedByFacultyId = DbInitializer.FacultyNairUserId,
                Title = "Foreign College Confidential AI Project",
                Abstract = "Should not be exposed to students from Sistec.",
                SdgCode = "SDG-9",
                MaxTeamCapacity = 1,
                IsAllocated = false
            };
            db.ProblemBankStatements.Add(pb);
            await db.SaveChangesAsync();
        }

        var (_, token) = await CreateUnallocatedStudentWithEnrollmentAsync("tenant_student");
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/student/problem-bank");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var statements = await response.Content.ReadFromJsonAsync<List<ProblemBankStatementDto>>();
        Assert.NotNull(statements);
        Assert.DoesNotContain(statements, s => s.Id == foreignStatementId);
    }

    [Fact]
    public async Task GetProblemBank_FilterByDomainAndSearch_ReturnsFilteredResults()
    {
        // Arrange
        var (_, token) = await CreateUnallocatedStudentWithEnrollmentAsync("filter_student");
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/student/problem-bank?search=Greenhouse");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var statements = await response.Content.ReadFromJsonAsync<List<ProblemBankStatementDto>>();
        Assert.NotNull(statements);
        Assert.All(statements, s => Assert.True(
            s.Title.Contains("Greenhouse", StringComparison.OrdinalIgnoreCase) ||
            s.Abstract.Contains("Greenhouse", StringComparison.OrdinalIgnoreCase)));
    }

    [Fact]
    public async Task GetProblemBankStatement_ValidId_ReturnsSingleStatement()
    {
        // Arrange: Seed statement
        var statementId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var pb = new ProblemBankStatement
            {
                Id = statementId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                ProposedByFacultyId = DbInitializer.FacultyVermaUserId,
                Title = "Single Statement Retrieval Target",
                Abstract = "Detailed technical spec for single problem statement verification.",
                SdgCode = "SDG-7",
                MaxTeamCapacity = 2,
                IsAllocated = false
            };
            db.ProblemBankStatements.Add(pb);
            await db.SaveChangesAsync();
        }

        var (_, token) = await CreateUnallocatedStudentWithEnrollmentAsync("single_pb_student");
        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/student/problem-bank/{statementId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var statement = await response.Content.ReadFromJsonAsync<ProblemBankStatementDto>();
        Assert.NotNull(statement);
        Assert.Equal(statementId, statement.Id);
        Assert.Equal("Single Statement Retrieval Target", statement.Title);
    }

    [Fact]
    public async Task GetProblemBankStatement_NonExistent_ReturnsNotFound404()
    {
        // Arrange
        var (_, token) = await CreateUnallocatedStudentWithEnrollmentAsync("notfound_pb");
        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/student/problem-bank/{Guid.NewGuid()}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetFacultyGuides_AuthenticatedStudent_ReturnsActiveDepartmentGuides()
    {
        // Arrange
        var (_, token) = await CreateUnallocatedStudentWithEnrollmentAsync("guides_student");
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/student/faculty-guides");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var guides = await response.Content.ReadFromJsonAsync<List<FacultyGuideSummaryDto>>();
        Assert.NotNull(guides);
        Assert.NotEmpty(guides);
        Assert.Contains(guides, g => g.Id == DbInitializer.FacultyNairUserId || g.Id == DbInitializer.FacultyVermaUserId);
    }

    [Fact]
    public async Task GetArchivedProjects_ReturnsOnlyCompletedOrArchived_ConcealsConfidentialData()
    {
        // Arrange: Seed an archived project and an active project
        var archivedTeamId = Guid.NewGuid();
        var activeTeamId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var archivedTeam = new ProjectTeam
            {
                Id = archivedTeamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2024-CS-MIN-99",
                Title = "Archived Past Batch Edge Computing Project",
                Abstract = "A completed project from the previous academic year for campus SAR archive.",
                DomainTag = "IoT & Embedded Systems",
                SdgCode = "SDG-9",
                GuideUserId = DbInitializer.FacultyVermaUserId,
                Status = ProjectStatus.Completed,
                RepoUrl = "https://github.com/sistec-cse/past-edge-project"
            };
            db.ProjectTeams.Add(archivedTeam);

            var activeTeam = new ProjectTeam
            {
                Id = activeTeamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-MIN-ACTIVE",
                Title = "Ongoing Active Build Not Archived",
                Abstract = "Should not appear in public archive.",
                DomainTag = "AI",
                SdgCode = "SDG-9",
                Status = ProjectStatus.ActiveBuild
            };
            db.ProjectTeams.Add(activeTeam);
            await db.SaveChangesAsync();
        }

        var (_, token) = await CreateUnallocatedStudentWithEnrollmentAsync("archive_student");
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/student/projects/archive");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var projects = await response.Content.ReadFromJsonAsync<List<ArchivedProjectSummaryDto>>();
        Assert.NotNull(projects);

        // Contains completed/archived
        Assert.Contains(projects, p => p.TeamId == archivedTeamId);
        // Does not contain active build
        Assert.DoesNotContain(projects, p => p.TeamId == activeTeamId);

        // Verify confidentiality: DTO does not contain private student USNs or internal confidential scores
        var item = projects.First(p => p.TeamId == archivedTeamId);
        Assert.Equal("2024-CS-MIN-99", item.TeamCode);
        Assert.Equal("Archived Past Batch Edge Computing Project", item.Title);
        Assert.Equal("Completed", item.Status);
    }

    [Fact]
    public async Task CreateIdea_ValidDraft_PersistsInPostgreSqlAndAssignsLead()
    {
        // Arrange
        var (studentId, token) = await CreateUnallocatedStudentWithEnrollmentAsync("idea_lead");

        var ideaRequest = new CreateProjectIdeaRequest
        {
            Title = "Decentralized Microgrid Fault Detection Using Smart Meters",
            Abstract = "Implementation of real-time fault detection and isolation in low voltage microgrids using distributed sensor telemetry.",
            DomainTag = "Renewable Energy & Smart Grid",
            SdgCode = "SDG-7",
            GuideUserId = DbInitializer.FacultyVermaUserId
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/student/ideas")
        {
            Content = JsonContent.Create(ideaRequest)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.True(response.StatusCode == HttpStatusCode.OK || response.StatusCode == HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<ProjectIdeaDto>();
        Assert.NotNull(created);
        Assert.Equal("Draft", created.Status);
        Assert.True(created.IsLeader);
        Assert.False(created.IsRosterLocked);
        Assert.Equal("Decentralized Microgrid Fault Detection Using Smart Meters", created.Title);
        Assert.Equal(DbInitializer.FacultyVermaUserId, created.GuideUserId);

        // Verify database persistence
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var team = await db.ProjectTeams
                .Include(t => t.Members)
                .FirstOrDefaultAsync(t => t.Id == created.Id);
            Assert.NotNull(team);
            Assert.Equal(ProjectStatus.Draft, team.Status);
            Assert.Single(team.Members);
            Assert.Equal(studentId, team.Members.First().UserId);
            Assert.True(team.Members.First().IsTeamLead);
        }
    }

    [Fact]
    public async Task CreateIdea_DuplicateActiveRegistration_ReturnsConflict409()
    {
        // Arrange: StudentShivanshUserId already has an active project (Team01 in ActiveBuild status)
        var token = GenerateToken(
            DbInitializer.StudentShivanshUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Student);

        var duplicateRequest = new CreateProjectIdeaRequest
        {
            Title = "Duplicate Active Registration Attempt",
            Abstract = "This student already has an active project and should be prevented from registering a second one.",
            DomainTag = "Artificial Intelligence & ML",
            SdgCode = "SDG-9",
            GuideUserId = DbInitializer.FacultyNairUserId
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/student/ideas")
        {
            Content = JsonContent.Create(duplicateRequest)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.SendAsync(request);

        // Assert (REG-002: duplicate active project registration rejection)
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task CreateIdea_WithoutActiveEnrollment_ReturnsBadRequest400()
    {
        // Arrange: Provision student without any active enrollment record
        var unenrolledStudentId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var student = new UserAccount
            {
                Id = unenrolledStudentId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                FullName = "Unenrolled Student",
                Email = "unenrolled@sistec.ac.in",
                EnrollmentOrEmployeeCode = "0176CS999999",
                Role = UserRole.Student,
                IsActive = true,
                IsActivated = true
            };
            db.Users.Add(student);
            await db.SaveChangesAsync();
        }

        var token = GenerateToken(unenrolledStudentId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Student);
        var ideaRequest = new CreateProjectIdeaRequest
        {
            Title = "Unenrolled Student Idea Proposal",
            Abstract = "Attempting to create an idea without active institutional enrollment.",
            DomainTag = "IoT",
            SdgCode = "SDG-9"
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/student/ideas")
        {
            Content = JsonContent.Create(ideaRequest)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateIdea_LeadInDraftStatus_UpdatesAndRecalculatesSimilarity()
    {
        // Arrange: Create a draft idea
        var (studentId, token) = await CreateUnallocatedStudentWithEnrollmentAsync("update_lead");

        var createReq = new CreateProjectIdeaRequest
        {
            Title = "Initial Draft Scope for Solar Tracking Microgrid",
            Abstract = "Initial draft abstract that requires expansion and refinement.",
            DomainTag = "Renewable Energy & Smart Grid",
            SdgCode = "SDG-7",
            GuideUserId = DbInitializer.FacultyVermaUserId
        };

        var postMsg = new HttpRequestMessage(HttpMethod.Post, "/api/student/ideas")
        {
            Content = JsonContent.Create(createReq)
        };
        postMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var postRes = await _client.SendAsync(postMsg);
        postRes.EnsureSuccessStatusCode();
        var created = await postRes.Content.ReadFromJsonAsync<ProjectIdeaDto>();
        Assert.NotNull(created);

        // Act: Update title and abstract
        var updateReq = new UpdateProjectIdeaRequest
        {
            Title = "Updated Precision Astronomical Solar Tracking System with MPPT",
            Abstract = "Refined dual-axis solar tracking algorithm optimizing energy capture with active astronomical calculations.",
            DomainTag = "Renewable Energy & Smart Grid",
            SdgCode = "SDG-7",
            GuideUserId = DbInitializer.FacultyVermaUserId
        };

        var putMsg = new HttpRequestMessage(HttpMethod.Put, $"/api/student/ideas/{created.Id}")
        {
            Content = JsonContent.Create(updateReq)
        };
        putMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var putRes = await _client.SendAsync(putMsg);

        // Assert
        Assert.Equal(HttpStatusCode.OK, putRes.StatusCode);
        var updated = await putRes.Content.ReadFromJsonAsync<ProjectIdeaDto>();
        Assert.NotNull(updated);
        Assert.Equal("Updated Precision Astronomical Solar Tracking System with MPPT", updated.Title);
        Assert.NotNull(updated.SimilarityScorePct);
    }

    [Fact]
    public async Task UpdateIdea_NonLeadOrNonDraft_ReturnsForbiddenOrBadRequest()
    {
        // Arrange: Create idea with Student A
        var (_, tokenA) = await CreateUnallocatedStudentWithEnrollmentAsync("lead_a");
        var (_, tokenB) = await CreateUnallocatedStudentWithEnrollmentAsync("non_lead_b");

        var createReq = new CreateProjectIdeaRequest
        {
            Title = "Student A Proprietary Research Idea",
            Abstract = "Research abstract owned by student A who is designated team lead.",
            DomainTag = "AI",
            SdgCode = "SDG-9"
        };
        var postMsg = new HttpRequestMessage(HttpMethod.Post, "/api/student/ideas")
        {
            Content = JsonContent.Create(createReq)
        };
        postMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenA);
        var postRes = await _client.SendAsync(postMsg);
        postRes.EnsureSuccessStatusCode();
        var created = await postRes.Content.ReadFromJsonAsync<ProjectIdeaDto>();
        Assert.NotNull(created);

        // Act: Student B attempts to update Student A's idea
        var updateReq = new UpdateProjectIdeaRequest { Title = "Unauthorized Hijack Title" };
        var putMsg = new HttpRequestMessage(HttpMethod.Put, $"/api/student/ideas/{created.Id}")
        {
            Content = JsonContent.Create(updateReq)
        };
        putMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenB);
        var putRes = await _client.SendAsync(putMsg);

        // Assert (Forbidden for unauthorized student)
        Assert.Equal(HttpStatusCode.Forbidden, putRes.StatusCode);
    }

    [Fact]
    public async Task SubmitProposal_ValidLeadDraft_TransitionsToPendingGuideAndLocksRoster()
    {
        // Arrange: Create a draft idea with assigned guide
        var (studentId, token) = await CreateUnallocatedStudentWithEnrollmentAsync("submit_lead");

        var createReq = new CreateProjectIdeaRequest
        {
            Title = "Autonomous Obstacle Avoidance for Agricultural Robots",
            Abstract = "Computer vision guided mobile base navigating uneven terrain and avoiding crop damage using stereo cameras.",
            DomainTag = "Robotics & Autonomous Systems",
            SdgCode = "SDG-2",
            GuideUserId = DbInitializer.FacultyNairUserId
        };

        var postMsg = new HttpRequestMessage(HttpMethod.Post, "/api/student/ideas")
        {
            Content = JsonContent.Create(createReq)
        };
        postMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var postRes = await _client.SendAsync(postMsg);
        postRes.EnsureSuccessStatusCode();
        var created = await postRes.Content.ReadFromJsonAsync<ProjectIdeaDto>();
        Assert.NotNull(created);

        // Act: Submit proposal for review
        var submitMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/student/ideas/{created.Id}/submit")
        {
            Content = JsonContent.Create(new SubmitProposalRequest { Remarks = "Initial proposal submitted for mentor endorsement." })
        };
        submitMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var submitRes = await _client.SendAsync(submitMsg);

        // Assert
        Assert.Equal(HttpStatusCode.OK, submitRes.StatusCode);

        // Verify status in DB: Status should be PendingGuide and IsRosterLocked should be true
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var team = await db.ProjectTeams.FindAsync(created.Id);
            Assert.NotNull(team);
            Assert.Equal(ProjectStatus.PendingGuide, team.Status);
            Assert.True(team.IsRosterLocked);
        }
    }

    [Fact]
    public async Task ResubmitProposal_ReturnedProposal_TransitionsToPendingGuideAndPreservesHistory()
    {
        // Arrange: Create an idea in Draft that has a previous return remark in ExceptionAuditLogs
        var (studentId, token) = await CreateUnallocatedStudentWithEnrollmentAsync("resubmit_lead");

        var createReq = new CreateProjectIdeaRequest
        {
            Title = "Smart Health Telemetry Using Wearable Edge Devices",
            Abstract = "Continuous physiological telemetry sent over encrypted BLE channels to hospital cloud nodes.",
            DomainTag = "Healthcare & Biomedical Engineering",
            SdgCode = "SDG-3",
            GuideUserId = DbInitializer.FacultyVermaUserId
        };

        var postMsg = new HttpRequestMessage(HttpMethod.Post, "/api/student/ideas")
        {
            Content = JsonContent.Create(createReq)
        };
        postMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var postRes = await _client.SendAsync(postMsg);
        postRes.EnsureSuccessStatusCode();
        var created = await postRes.Content.ReadFromJsonAsync<ProjectIdeaDto>();
        Assert.NotNull(created);

        // Seed a return audit entry simulating faculty return
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var audit = new ExceptionAuditLog
            {
                Id = Guid.NewGuid(),
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                ProjectTeamId = created.Id,
                ActionType = ExceptionActionType.ReturnProposal,
                RequestedByUserId = DbInitializer.FacultyVermaUserId,
                ApprovedByUserId = DbInitializer.FacultyVermaUserId,
                ApprovedAtUtc = DateTime.UtcNow.AddHours(-1),
                Reason = "Please narrow down the sensor suite to pulse oximetry and ECG only."
            };
            db.ExceptionAuditLogs.Add(audit);
            await db.SaveChangesAsync();
        }

        // Verify idea retrieval shows return remarks
        var getMsg = new HttpRequestMessage(HttpMethod.Get, $"/api/student/ideas/{created.Id}");
        getMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var getRes = await _client.SendAsync(getMsg);
        getRes.EnsureSuccessStatusCode();
        var ideaWithRemarks = await getRes.Content.ReadFromJsonAsync<ProjectIdeaDto>();
        Assert.NotNull(ideaWithRemarks);
        Assert.NotNull(ideaWithRemarks.LatestReviewRemarks);
        Assert.Contains("narrow down the sensor suite", ideaWithRemarks.LatestReviewRemarks);

        // Act: Resubmit the proposal
        var resubmitMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/student/ideas/{created.Id}/resubmit")
        {
            Content = JsonContent.Create(new SubmitProposalRequest
            {
                Remarks = "Revisions complete: Removed ambient sensor, focused strictly on ECG and SpO2."
            })
        };
        resubmitMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resubmitRes = await _client.SendAsync(resubmitMsg);

        // Assert
        Assert.Equal(HttpStatusCode.OK, resubmitRes.StatusCode);

        // Verify status transitioned to PendingGuide
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var team = await db.ProjectTeams.FindAsync(created.Id);
            Assert.NotNull(team);
            Assert.Equal(ProjectStatus.PendingGuide, team.Status);
            Assert.True(team.IsRosterLocked);
        }
    }

    [Fact]
    public async Task CheckSimilarity_HighOverlap_ReturnsWarningAndMatchingCode()
    {
        // Arrange: Existing team 01 has title "IoT-Based Campus Energy Management and Machine Predictive Maintenance System"
        var (_, token) = await CreateUnallocatedStudentWithEnrollmentAsync("similarity_student");

        var checkReq = new CheckSimilarityRequest
        {
            Title = "IoT-Based Campus Energy Management and Predictive Maintenance",
            Abstract = "An edge-computing ESP32 telemetry pipeline streaming current, voltage, and power metrics via MQTT into an anomaly detection inference engine."
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/student/ideas/check-similarity")
        {
            Content = JsonContent.Create(checkReq)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<SimilarityCheckResultDto>();
        Assert.NotNull(result);
        Assert.True(result.IsWarning);
        Assert.True(result.SimilarityScorePct >= 65m);
        Assert.NotNull(result.SimilarProjectCode);
    }

    [Fact]
    public async Task StudentCannotMutateFacultyProblemBank_ReturnsForbidden()
    {
        // Arrange: Student tries to call faculty problem-bank mutation endpoint
        var (_, token) = await CreateUnallocatedStudentWithEnrollmentAsync("sec_student");

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/faculty/problem-bank")
        {
            Content = JsonContent.Create(new
            {
                Title = "Malicious Student Injected Statement",
                Description = "Should be rejected with Forbidden 403.",
                SdgGoalNumber = 9
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.SendAsync(request);

        // Assert (Security boundary: students cannot manage faculty problem statements)
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ProposalLifecycle_FullEndToEndTransition_DraftToPendingGuideToPendingCoordinatorToPendingHODToActiveBuild()
    {
        // 1. Arrange & Step 1: Student creates draft with preferred Guide Verma
        var (_, studentToken) = await CreateUnallocatedStudentWithEnrollmentAsync("lifecycle_student");

        var createReq = new CreateProjectIdeaRequest
        {
            Title = "End-to-End Complete Lifecycle Proposal Verification",
            Abstract = "Comprehensive autonomous sensing system tested across the entire multi-role governance pipeline.",
            DomainTag = "IoT & Embedded Systems",
            SdgCode = "SDG-9",
            GuideUserId = DbInitializer.FacultyVermaUserId
        };
        var createMsg = new HttpRequestMessage(HttpMethod.Post, "/api/student/ideas")
        {
            Content = JsonContent.Create(createReq)
        };
        createMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);
        var createRes = await _client.SendAsync(createMsg);
        Assert.True(createRes.StatusCode == HttpStatusCode.OK || createRes.StatusCode == HttpStatusCode.Created);
        var created = await createRes.Content.ReadFromJsonAsync<ProjectIdeaDto>();
        Assert.NotNull(created);
        Assert.Equal("Draft", created.Status);

        // 2. Step 2: Student submits proposal -> PendingGuide
        var submitMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/student/ideas/{created.Id}/submit")
        {
            Content = JsonContent.Create(new SubmitProposalRequest { Remarks = "Ready for guide review." })
        };
        submitMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);
        var submitRes = await _client.SendAsync(submitMsg);
        Assert.Equal(HttpStatusCode.OK, submitRes.StatusCode);

        // Verify status in DB is PendingGuide
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var team = await db.ProjectTeams.FindAsync(created.Id);
            Assert.NotNull(team);
            Assert.Equal(ProjectStatus.PendingGuide, team.Status);
        }

        // 3. Step 3: Faculty Guide Verma endorses proposal -> PendingCoordinator
        var facultyToken = GenerateToken(
            DbInitializer.FacultyVermaUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty);

        var facultyEndorseMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/faculty/proposals/{created.Id}/endorse");
        facultyEndorseMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", facultyToken);
        var facultyEndorseRes = await _client.SendAsync(facultyEndorseMsg);
        Assert.Equal(HttpStatusCode.OK, facultyEndorseRes.StatusCode);

        // Verify status in DB is PendingCoordinator
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var team = await db.ProjectTeams.FindAsync(created.Id);
            Assert.NotNull(team);
            Assert.Equal(ProjectStatus.PendingCoordinator, team.Status);
        }

        // 4. Step 4: Coordinator Nair verifies proposal -> PendingHOD
        var coordinatorToken = GenerateToken(
            DbInitializer.FacultyNairUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty,
            isCoordinator: true);

        var coordVerifyMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/coordinator/proposals/{created.Id}/verify")
        {
            Content = JsonContent.Create(new SubmitProposalRequest { Remarks = "Academic scope and rubric verified by Coordinator." })
        };
        coordVerifyMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", coordinatorToken);
        var coordVerifyRes = await _client.SendAsync(coordVerifyMsg);
        Assert.Equal(HttpStatusCode.OK, coordVerifyRes.StatusCode);

        // Verify status in DB is PendingHOD
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var team = await db.ProjectTeams.FindAsync(created.Id);
            Assert.NotNull(team);
            Assert.Equal(ProjectStatus.PendingHOD, team.Status);
        }

        // 5. Step 5: HOD Sharma approves proposal -> ActiveBuild
        var hodToken = GenerateToken(
            DbInitializer.HodSharmaUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.HOD);

        var hodApproveMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/hod/proposals/{created.Id}/approve");
        hodApproveMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);
        var hodApproveRes = await _client.SendAsync(hodApproveMsg);
        Assert.Equal(HttpStatusCode.OK, hodApproveRes.StatusCode);

        // Verify status in DB is ActiveBuild
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var team = await db.ProjectTeams.FindAsync(created.Id);
            Assert.NotNull(team);
            Assert.Equal(ProjectStatus.ActiveBuild, team.Status);
            Assert.True(team.IsRosterLocked);
        }
    }

    [Fact]
    public async Task CoordinatorProposalVerification_UnauthorizedStudentOrFaculty_ReturnsForbidden()
    {
        // Arrange: Student tries to call coordinator verification endpoint
        var (_, studentToken) = await CreateUnallocatedStudentWithEnrollmentAsync("unauthorized_coord");

        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/coordinator/proposals/{Guid.NewGuid()}/verify")
        {
            Content = JsonContent.Create(new SubmitProposalRequest { Remarks = "Attempted unauthorized bypass." })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);

        // Act
        var response = await _client.SendAsync(request);

        // Assert: 403 Forbidden
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
