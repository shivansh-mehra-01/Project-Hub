using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ProjectHub.Application.Common.Models;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
using ProjectHub.Infrastructure.Security;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class HodFacultyFlowTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public HodFacultyFlowTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<string> LoginAndGetTokenAsync(HttpClient client, string email, string password = "Pass@1234")
    {
        var res = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = password
        });
        res.EnsureSuccessStatusCode();
        var auth = await res.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        return auth.Token;
    }

    [Fact]
    public async Task CompleteHodFacultyFlow_CsvImport_HodAssign_DepartmentIsolation_CoordinatorAndRevocation()
    {
        using var client = _factory.CreateClient();
        var adminToken = await LoginAndGetTokenAsync(client, "collegeadmin@sistec.ac.in");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        // 1. Ensure CSE and ECE departments exist in SISTEC
        var deptsRes = await client.GetAsync("/api/college/departments");
        deptsRes.EnsureSuccessStatusCode();
        var depts = await deptsRes.Content.ReadFromJsonAsync<List<DepartmentDto>>();
        Assert.NotNull(depts);
        var cse = depts.First(d => d.Code == "CSE");
        var ece = depts.FirstOrDefault(d => d.Code == "ECE");
        if (ece == null)
        {
            var progsRes = await client.GetAsync("/api/college/course-programs");
            var progs = await progsRes.Content.ReadFromJsonAsync<List<CourseProgramDto>>();
            var createEce = await client.PostAsJsonAsync("/api/college/departments", new
            {
                name = "Electronics & Communication",
                code = "ECE",
                intakeQuota = 60,
                courseProgramId = progs!.First().Id
            });
            createEce.EnsureSuccessStatusCode();
            ece = await createEce.Content.ReadFromJsonAsync<DepartmentDto>();
        }
        Assert.NotNull(ece);

        var suffix = Guid.NewGuid().ToString("N")[..6];
        var newHodEmail = $"newhod.{suffix}@sistec.ac.in";
        var cseFacEmail = $"csefac.{suffix}@sistec.ac.in";
        var eceFacEmail = $"ecefac.{suffix}@sistec.ac.in";

        // 2. College Admin imports valid faculty records via CSV bulk upload
        var bulkReq = new BulkStaffUploadRequest
        {
            CsvHeaders = new List<string> { "FullName", "Email", "DepartmentCode", "Designation" },
            StaffRows = new List<BulkStaffUploadRowDto>
            {
                new() { FullName = "Dr. New CSE HOD", Email = newHodEmail, DepartmentCode = "CSE", Designation = "Professor" },
                new() { FullName = "Prof. CSE Member", Email = cseFacEmail, DepartmentCode = "CSE", Designation = "AssociateProfessor" },
                new() { FullName = "Prof. ECE Member", Email = eceFacEmail, DepartmentCode = "ECE", Designation = "AssistantProfessor" },
            }
        };
        var bulkRes = await client.PostAsJsonAsync("/api/college/users/bulk", bulkReq);
        var bulkBody = await bulkRes.Content.ReadAsStringAsync();
        Assert.True(bulkRes.IsSuccessStatusCode, $"Bulk upload failed ({bulkRes.StatusCode}): {bulkBody}");
        var bulkResult = JsonSerializer.Deserialize<BulkStaffUploadResultDto>(bulkBody, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(bulkResult);
        Assert.Equal(3, bulkResult.SuccessfullyCreated);

        // Activate imported accounts for login checks and grab IDs
        Guid newHodId;
        Guid cseFacId;
        Guid eceFacId;
        Guid cseStudentId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var tc = scope.ServiceProvider.GetRequiredService<ITenantContext>();

            var hodUser = await db.Users.IgnoreQueryFilters().FirstAsync(u => u.Email == newHodEmail);
            var cseFac = await db.Users.IgnoreQueryFilters().FirstAsync(u => u.Email == cseFacEmail);
            var eceFac = await db.Users.IgnoreQueryFilters().FirstAsync(u => u.Email == eceFacEmail);
            var student = await db.Users.IgnoreQueryFilters().FirstAsync(u => u.Email == "student@sistec.ac.in");

            // Verify CSV import did NOT grant HOD or Coordinator
            Assert.Equal(UserRole.Faculty, hodUser.Role);
            Assert.False(hodUser.IsProjectCoordinator);
            Assert.Equal(cse.Id, cseFac.DepartmentId);
            Assert.Equal(ece.Id, eceFac.DepartmentId);

            tc.CollegeId = hodUser.CollegeId;
            hodUser.IsActivated = true;
            hodUser.PasswordHash = PasswordHelper.HashPassword("Pass@1234");
            cseFac.IsActivated = true;
            cseFac.PasswordHash = PasswordHelper.HashPassword("Pass@1234");
            await db.SaveChangesAsync();

            newHodId = hodUser.Id;
            cseFacId = cseFac.Id;
            eceFacId = eceFac.Id;
            cseStudentId = student.Id;
        }

        // 3. College Admin appoints newHodId as HOD of CSE (replacing existing if any)
        var appointRes = await client.PutAsJsonAsync($"/api/college/departments/{cse.Id}/hod", new
        {
            hodUserId = newHodId,
            confirmReplacement = true
        });
        Assert.Equal(HttpStatusCode.OK, appointRes.StatusCode);

        // 4. HOD logs in and receives correct department context
        var hodLoginRes = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = newHodEmail,
            Password = "Pass@1234"
        });
        Assert.Equal(HttpStatusCode.OK, hodLoginRes.StatusCode);
        var hodAuth = await hodLoginRes.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(hodAuth);
        Assert.Equal(UserRole.HOD, hodAuth.User.Role);
        Assert.Equal(cse.Id, hodAuth.User.DepartmentId);

        // 5. HOD retrieves CSE faculty/staff (sees CSE faculty, NOT ECE faculty)
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodAuth.Token);
        var hodFacRes = await client.GetAsync("/api/hod/faculty");
        Assert.Equal(HttpStatusCode.OK, hodFacRes.StatusCode);
        var hodFaculty = await hodFacRes.Content.ReadFromJsonAsync<List<FacultyWorkloadDto>>();
        Assert.NotNull(hodFaculty);
        Assert.Contains(hodFaculty, f => f.FacultyId == cseFacId);
        Assert.DoesNotContain(hodFaculty, f => f.FacultyId == eceFacId);

        // 6. HOD cannot toggle coordinator on ECE faculty (cross-dept -> 404) or CSE student (ineligible -> 400)
        var crossDeptCoord = await client.PutAsJsonAsync($"/api/hod/faculty/{eceFacId}/coordinator", new { isProjectCoordinator = true });
        Assert.Equal(HttpStatusCode.NotFound, crossDeptCoord.StatusCode);

        var studentCoord = await client.PutAsJsonAsync($"/api/hod/faculty/{cseStudentId}/coordinator", new { isProjectCoordinator = true });
        Assert.Equal(HttpStatusCode.BadRequest, studentCoord.StatusCode);

        // 7. HOD appoints eligible CSE faculty member as Coordinator
        var grantCoord = await client.PutAsJsonAsync($"/api/hod/faculty/{cseFacId}/coordinator", new { isProjectCoordinator = true });
        Assert.Equal(HttpStatusCode.NoContent, grantCoord.StatusCode);

        // Unauthorized user (regular Faculty) cannot access HOD-only endpoints
        var facToken = await LoginAndGetTokenAsync(client, cseFacEmail);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", facToken);
        var facToHod = await client.GetAsync("/api/hod/faculty");
        Assert.Equal(HttpStatusCode.Forbidden, facToHod.StatusCode);

        // 8. CSV re-import rejects protected HOD role and preserves Coordinator appointment on Faculty
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var reimportHodAttempt = await client.PostAsJsonAsync("/api/college/users/bulk", new BulkStaffUploadRequest
        {
            CsvHeaders = new List<string> { "FullName", "Email", "DepartmentCode", "Designation" },
            StaffRows = new List<BulkStaffUploadRowDto>
            {
                new() { FullName = "Dr. New CSE HOD", Email = newHodEmail, DepartmentCode = "CSE", Designation = "Professor" }
            }
        });
        Assert.Equal(HttpStatusCode.BadRequest, reimportHodAttempt.StatusCode);

        var reimportFac = await client.PostAsJsonAsync("/api/college/users/bulk", new BulkStaffUploadRequest
        {
            CsvHeaders = new List<string> { "FullName", "Email", "DepartmentCode", "Designation" },
            StaffRows = new List<BulkStaffUploadRowDto>
            {
                new() { FullName = "Prof. CSE Member Updated", Email = cseFacEmail, DepartmentCode = "CSE", Designation = "Professor" }
            }
        });
        Assert.Equal(HttpStatusCode.OK, reimportFac.StatusCode);

        using (var checkScope = _factory.Services.CreateScope())
        {
            var db = checkScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var updatedFac = await db.Users.IgnoreQueryFilters().AsNoTracking().FirstAsync(u => u.Id == cseFacId);
            Assert.True(updatedFac.IsProjectCoordinator);
        }

        // 9. Relieving HOD revokes stale sessions and blocks HOD access
        var relieveRes = await client.PostAsync($"/api/college/departments/{cse.Id}/relieve-hod", null);
        Assert.Equal(HttpStatusCode.OK, relieveRes.StatusCode);

        // Old HOD token is revoked (401)
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodAuth.Token);
        var staleHodCall = await client.GetAsync("/api/hod/faculty");
        Assert.Equal(HttpStatusCode.Unauthorized, staleHodCall.StatusCode);

        // Re-login as relieved user now has Faculty role (403 on HOD endpoints)
        var postRelieveToken = await LoginAndGetTokenAsync(client, newHodEmail);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", postRelieveToken);
        var demotedHodCall = await client.GetAsync("/api/hod/faculty");
        Assert.Equal(HttpStatusCode.Forbidden, demotedHodCall.StatusCode);
    }
}
