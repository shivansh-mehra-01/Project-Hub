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

public class StudentPhase2Tests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public StudentPhase2Tests(CustomWebApplicationFactory factory)
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
            new(ClaimTypes.Email, "student.test@sistec.ac.in"),
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

    private async Task<string> GetTokenForStudentAsync(string email = "student@sistec.ac.in")
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = "Pass@1234"
        });

        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        return auth.Token;
    }

    [Fact]
    public async Task GetDashboard_AllocatedStudent_ReturnsAllocatedStateAndRealData()
    {
        // Act
        var token = await GetTokenForStudentAsync("student@sistec.ac.in");
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/student/dashboard");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dashboard = await response.Content.ReadFromJsonAsync<StudentDashboardDto>();
        Assert.NotNull(dashboard);

        // Identity
        Assert.Equal("Shivansh Mehra", dashboard.Student.FullName);
        Assert.Equal("0176CS221045", dashboard.Student.EnrollmentCode);
        Assert.Contains("SISTec", dashboard.Student.CollegeName);
        Assert.Contains("Computer Science", dashboard.Student.DepartmentName);

        // Active project
        Assert.True(dashboard.HasActiveProject);
        Assert.Equal("ActiveBuild", dashboard.AllocationState);
        Assert.NotNull(dashboard.ActiveProject);
        Assert.Equal("2026-CS-MIN-01", dashboard.ActiveProject.TeamCode);
        Assert.True(dashboard.ActiveProject.IsTeamLead);
        Assert.NotEmpty(dashboard.ActiveProject.Members);
        Assert.Equal(4, dashboard.ActiveProject.Artifacts.Count);

        // Capabilities
        Assert.True(dashboard.Capabilities.CanSubmitLogs);
        Assert.True(dashboard.Capabilities.CanSubmitTasks);
        Assert.False(dashboard.Capabilities.CanFormTeam); // Already has project
    }

    [Fact]
    public async Task GetDashboard_UnallocatedStudent_ReturnsUnallocatedState()
    {
        // Arrange: Create a fresh unallocated student with an active enrollment in CSE
        var unallocatedStudentId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var user = new UserAccount
            {
                Id = unallocatedStudentId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                FullName = "Unallocated Test Student",
                Email = "unallocated.test@sistec.ac.in",
                EnrollmentOrEmployeeCode = "0176CS221999",
                Role = UserRole.Student,
                IsActive = true,
                IsActivated = true
            };
            db.Users.Add(user);

            var enrollment = new StudentAcademicEnrollment
            {
                CollegeId = DbInitializer.SistecTenantId,
                StudentUserId = unallocatedStudentId,
                CourseProgramId = DbInitializer.SistecBTechCourseProgramId,
                DepartmentId = DbInitializer.CseDepartmentId,
                CurrentSemesterTermId = DbInitializer.SistecCseSem6TermId,
                AdmissionBatch = "2023-2027",
                AcademicStatus = AcademicStatus.Active
            };
            db.StudentAcademicEnrollments.Add(enrollment);
            await db.SaveChangesAsync();
        }

        var token = GenerateToken(unallocatedStudentId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Student);

        // Act
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/student/dashboard");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dashboard = await response.Content.ReadFromJsonAsync<StudentDashboardDto>();
        Assert.NotNull(dashboard);
        Assert.False(dashboard.HasActiveProject);
        Assert.Equal("Unallocated", dashboard.AllocationState);
        Assert.Null(dashboard.ActiveProject);
        Assert.True(dashboard.Capabilities.CanFormTeam);
        Assert.True(dashboard.Capabilities.CanProposeProject);
    }

    [Fact]
    public async Task GetDashboard_StudentWithoutEnrollment_ReturnsNoActiveEnrollmentState()
    {
        // Arrange: Student with no enrollment record
        var unenrolledStudentId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var user = new UserAccount
            {
                Id = unenrolledStudentId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                FullName = "Unenrolled Student",
                Email = "unenrolled.student@sistec.ac.in",
                EnrollmentOrEmployeeCode = "0176CS221888",
                Role = UserRole.Student,
                IsActive = true,
                IsActivated = true
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        var token = GenerateToken(unenrolledStudentId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Student);

        // Act
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/student/dashboard");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dashboard = await response.Content.ReadFromJsonAsync<StudentDashboardDto>();
        Assert.NotNull(dashboard);
        Assert.Equal("NoActiveEnrollment", dashboard.AllocationState);
        Assert.Null(dashboard.Enrollment);
        Assert.False(dashboard.Capabilities.CanFormTeam);
    }

    [Fact]
    public async Task GetDashboard_Unauthenticated_ReturnsUnauthorized401()
    {
        // Act: No bearer token
        var response = await _client.GetAsync("/api/student/dashboard");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetDashboard_NonStudentRole_ReturnsForbidden403()
    {
        // Arrange: Token with HOD role
        var hodToken = GenerateToken(Guid.NewGuid(), DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.HOD);
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/student/dashboard");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetProfile_AuthenticatedStudent_ReturnsRealProfile()
    {
        // Act
        var token = await GetTokenForStudentAsync("student@sistec.ac.in");
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/student/profile");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<StudentProfileDto>();
        Assert.NotNull(profile);
        Assert.Equal("Shivansh Mehra", profile.FullName);
        Assert.Equal("0176CS221045", profile.EnrollmentCode);
        Assert.Equal("student@sistec.ac.in", profile.Email);
        Assert.Contains("SISTec", profile.CollegeName);
        Assert.Contains("Computer Science", profile.DepartmentName);
        Assert.Equal(6, profile.CurrentSemester);
        Assert.True(profile.ProfileCompletionPercentage >= 40);
    }

    [Fact]
    public async Task UpdateProfile_PermittedFields_SavesToDatabaseAndReturnsUpdatedProfile()
    {
        // Arrange: Create dedicated test student
        var studentId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var user = new UserAccount
            {
                Id = studentId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                FullName = "Profile Test Student",
                Email = "profile.test@sistec.ac.in",
                EnrollmentOrEmployeeCode = "0176CS221777",
                Role = UserRole.Student,
                IsActive = true,
                IsActivated = true
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        var token = GenerateToken(studentId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Student);

        var updateReq = new UpdateStudentProfileRequest
        {
            Skills = new List<string> { "TypeScript", "React", "ASP.NET Core", "PostgreSQL" },
            GitHubHandle = "student-coder-2026",
            JiraKey = "CAPSTONE-777",
            PhoneNumber = "+91 98260 99887",
            Bio = "Passionate about IoT and distributed backend architecture."
        };

        var request = new HttpRequestMessage(HttpMethod.Put, "/api/student/profile")
        {
            Content = JsonContent.Create(updateReq)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.SendAsync(request);

        // Assert HTTP response
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<StudentProfileDto>();
        Assert.NotNull(updated);
        Assert.Equal("student-coder-2026", updated.GitHubHandle);
        Assert.Equal("CAPSTONE-777", updated.JiraKey);
        Assert.Equal("+91 98260 99887", updated.PhoneNumber);
        Assert.Equal("Passionate about IoT and distributed backend architecture.", updated.Bio);
        Assert.Contains("TypeScript", updated.Skills);
        Assert.Contains("PostgreSQL", updated.Skills);
        Assert.Equal(100, updated.ProfileCompletionPercentage);

        // Assert direct database persistence
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var persisted = await db.Users.FindAsync(studentId);
            Assert.NotNull(persisted);
            Assert.Equal("student-coder-2026", persisted.GitHubHandle);
            Assert.Equal("CAPSTONE-777", persisted.JiraKey);
            Assert.Equal("+91 98260 99887", persisted.PhoneNumber);
            Assert.Contains("TypeScript,React", persisted.SkillsCsv);
            Assert.Contains("distributed backend architecture", persisted.ConsolePreferencesJson);
        }
    }

    [Fact]
    public async Task UpdateProfile_InvalidPhoneNumber_ReturnsBadRequest400()
    {
        var token = await GetTokenForStudentAsync("student@sistec.ac.in");
        var request = new HttpRequestMessage(HttpMethod.Put, "/api/student/profile")
        {
            Content = JsonContent.Create(new UpdateStudentProfileRequest
            {
                PhoneNumber = "invalid-phone-letters"
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateProfile_InvalidGitHubHandle_ReturnsBadRequest400()
    {
        var token = await GetTokenForStudentAsync("student@sistec.ac.in");
        var request = new HttpRequestMessage(HttpMethod.Put, "/api/student/profile")
        {
            Content = JsonContent.Create(new UpdateStudentProfileRequest
            {
                GitHubHandle = "invalid handle with spaces!"
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task InactiveStudent_ReturnsUnauthorized401()
    {
        // Arrange: Deactivate student
        var deactivatedStudentId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var user = new UserAccount
            {
                Id = deactivatedStudentId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                FullName = "Deactivated Student",
                Email = "deactivated.student@sistec.ac.in",
                EnrollmentOrEmployeeCode = "0176CS221666",
                Role = UserRole.Student,
                IsActive = false // INACTIVE
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        var token = GenerateToken(deactivatedStudentId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Student);
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/student/dashboard");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
