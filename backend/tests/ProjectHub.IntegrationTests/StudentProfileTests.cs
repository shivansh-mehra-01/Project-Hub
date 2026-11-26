using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using ProjectHub.Application.Common.Models;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Data;
using ProjectHub.Infrastructure.Persistence;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class StudentProfileTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public StudentProfileTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private static string GenerateToken(Guid userId, Guid collegeId, Guid? departmentId, UserRole role)
    {
        var secret = "ProjectHubSuperSecretDevKeyMinLength32CharactersRequired!";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new("sub", userId.ToString()),
            new("user_id", userId.ToString()),
            new(ClaimTypes.Role, role.ToString()),
            new("role", role.ToString()),
            new("college_id", collegeId.ToString()),
        };
        if (departmentId.HasValue)
        {
            claims.Add(new Claim("department_id", departmentId.Value.ToString()));
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

    [Fact]
    public async Task GetProfile_WithoutEnrollment_ReturnsCollegeAndDeptCodes_WithoutFabricatedDefaults()
    {
        var studentId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.Users.Add(new UserAccount
            {
                Id = studentId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                FullName = "Unenrolled Student",
                Email = $"unenrolled.{Guid.NewGuid():N}@sistec.ac.in",
                EnrollmentOrEmployeeCode = "0176CS229001",
                Role = UserRole.Student,
                IsActive = true,
                IsActivated = true
            });
            await db.SaveChangesAsync();
        }

        var token = GenerateToken(studentId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Student);
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/student/profile");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var profile = await resp.Content.ReadFromJsonAsync<StudentProfileDto>();
        Assert.NotNull(profile);
        Assert.Equal("SISTEC", profile.CollegeCode);
        Assert.Equal("CSE", profile.DepartmentCode);
        Assert.Equal("0176CS229001", profile.EnrollmentCode);
        Assert.Equal(string.Empty, profile.ProgramName);
        Assert.Equal(0, profile.CurrentSemester);
        Assert.Equal("Not Enrolled", profile.AcademicStatus);
        Assert.Equal(20, profile.ProfileCompletionPercentage);
    }

    [Fact]
    public async Task UpdateProfile_NormalizesGitHubUrl_ClearsFields_RejectsCommaInSkills_AndIgnoresInstitutionalMassAssignment()
    {
        var studentId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.Users.Add(new UserAccount
            {
                Id = studentId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                FullName = "Immutable Name",
                Email = $"norm.{Guid.NewGuid():N}@sistec.ac.in",
                EnrollmentOrEmployeeCode = "0176CS229002",
                Role = UserRole.Student,
                IsActive = true,
                IsActivated = true
            });
            await db.SaveChangesAsync();
        }

        var token = GenerateToken(studentId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Student);

        // 1. Comma in skill tag -> 400 Bad Request
        var badSkillReq = new HttpRequestMessage(HttpMethod.Put, "/api/student/profile")
        {
            Content = JsonContent.Create(new UpdateStudentProfileRequest { Skills = new List<string> { "C, C++" } })
        };
        badSkillReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.SendAsync(badSkillReq)).StatusCode);

        // 2. GitHub URL normalization + structured SocialLinks + mass-assignment attempt on FullName/EnrollmentCode
        var updatePayload = new
        {
            fullName = "Hacked Name",
            enrollmentCode = "HACKED999",
            skills = new[] { "TypeScript", "typescript", "PostgreSQL" },
            socialLinks = new[]
            {
                new { id = "l1", platform = "GitHub", label = "GitHub", url = "https://github.com/octocat/" },
                new { id = "l2", platform = "Other", label = "Kaggle", url = "https://kaggle.com/octocat" }
            },
            phoneNumber = "+91 98765 43210",
            bio = "Building reliable systems."
        };
        var putReq = new HttpRequestMessage(HttpMethod.Put, "/api/student/profile")
        {
            Content = JsonContent.Create(updatePayload)
        };
        putReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var putResp = await _client.SendAsync(putReq);
        Assert.Equal(HttpStatusCode.OK, putResp.StatusCode);

        var updated = await putResp.Content.ReadFromJsonAsync<StudentProfileDto>();
        Assert.NotNull(updated);
        Assert.Equal("Immutable Name", updated.FullName);
        Assert.Equal("0176CS229002", updated.EnrollmentCode);
        Assert.Equal("octocat", updated.GitHubHandle);
        Assert.Equal(2, updated.SocialLinks.Count);
        Assert.Equal(2, updated.Skills.Count);
        Assert.Equal(80, updated.ProfileCompletionPercentage);

        // 2b. Reject unsafe URL scheme (javascript:) and duplicate URLs
        var unsafeReq = new HttpRequestMessage(HttpMethod.Put, "/api/student/profile")
        {
            Content = JsonContent.Create(new UpdateStudentProfileRequest
            {
                SocialLinks = new List<StudentSocialLinkDto>
                {
                    new() { Platform = "Portfolio", Url = "javascript:alert(1)" }
                }
            })
        };
        unsafeReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.SendAsync(unsafeReq)).StatusCode);

        var dupReq = new HttpRequestMessage(HttpMethod.Put, "/api/student/profile")
        {
            Content = JsonContent.Create(new UpdateStudentProfileRequest
            {
                SocialLinks = new List<StudentSocialLinkDto>
                {
                    new() { Platform = "GitHub", Url = "https://github.com/octocat" },
                    new() { Platform = "Portfolio", Url = "https://github.com/octocat/" }
                }
            })
        };
        dupReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.SendAsync(dupReq)).StatusCode);

        // 3. Clearing optional fields with empty string/array reduces completion back to 20%
        var clearReq = new HttpRequestMessage(HttpMethod.Put, "/api/student/profile")
        {
            Content = JsonContent.Create(new UpdateStudentProfileRequest
            {
                Skills = new List<string>(),
                SocialLinks = new List<StudentSocialLinkDto>(),
                PhoneNumber = "",
                Bio = ""
            })
        };
        clearReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var clearResp = await _client.SendAsync(clearReq);
        Assert.Equal(HttpStatusCode.OK, clearResp.StatusCode);

        var cleared = await clearResp.Content.ReadFromJsonAsync<StudentProfileDto>();
        Assert.NotNull(cleared);
        Assert.Null(cleared.GitHubHandle);
        Assert.Empty(cleared.SocialLinks);
        Assert.Null(cleared.PhoneNumber);
        Assert.Null(cleared.Bio);
        Assert.Empty(cleared.Skills);
        Assert.Equal(20, cleared.ProfileCompletionPercentage);
    }

    [Fact]
    public async Task ProfileEndpoints_RejectNonStudentRoles()
    {
        var facultyToken = GenerateToken(Guid.NewGuid(), DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Faculty);
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/student/profile");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", facultyToken);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task GetProfile_WithDetainedEnrollment_ReturnsDetainedStatus_AndExcludesActiveEnrollmentCompletion()
    {
        var studentId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = DbInitializer.SistecTenantId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.Users.Add(new UserAccount
            {
                Id = studentId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                FullName = "Detained Student",
                Email = $"detained.{Guid.NewGuid():N}@sistec.ac.in",
                EnrollmentOrEmployeeCode = "0176CS229002",
                Role = UserRole.Student,
                IsActive = true,
                IsActivated = true
            });
            var semTerm = db.SemesterTerms.FirstOrDefault(s => s.CollegeId == DbInitializer.SistecTenantId && s.SemesterNumber == 6);
            if (semTerm == null)
            {
                var session = db.AcademicSessions.First(s => s.CollegeId == DbInitializer.SistecTenantId);
                semTerm = new SemesterTerm
                {
                    Id = Guid.NewGuid(),
                    CollegeId = DbInitializer.SistecTenantId,
                    DepartmentId = DbInitializer.CseDepartmentId,
                    AcademicSessionId = session.Id,
                    SemesterNumber = 6,
                    SemesterName = "Semester 6",
                    IsActive = true
                };
                db.SemesterTerms.Add(semTerm);
            }
            db.StudentAcademicEnrollments.Add(new StudentAcademicEnrollment
            {
                Id = Guid.NewGuid(),
                CollegeId = DbInitializer.SistecTenantId,
                StudentUserId = studentId,
                CourseProgramId = DbInitializer.SistecBTechCourseProgramId,
                DepartmentId = DbInitializer.CseDepartmentId,
                CurrentSemesterTermId = semTerm.Id,
                AdmissionBatch = "2023-2027",
                AcademicStatus = AcademicStatus.Detained
            });
            await db.SaveChangesAsync();
        }

        var token = GenerateToken(studentId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Student);
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/student/profile");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resp = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var profile = await resp.Content.ReadFromJsonAsync<StudentProfileDto>();
        Assert.NotNull(profile);
        Assert.Equal("Detained", profile.AcademicStatus);
        Assert.Equal("Bachelor of Technology", profile.ProgramName);
        Assert.Equal(6, profile.CurrentSemester);
        // 20% identity only; Detained enrollment must NOT grant the 20% active enrollment bonus
        Assert.Equal(20, profile.ProfileCompletionPercentage);
    }
}
