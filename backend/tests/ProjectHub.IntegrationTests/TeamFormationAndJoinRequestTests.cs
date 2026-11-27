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

public class TeamFormationAndJoinRequestTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public TeamFormationAndJoinRequestTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private static string GenerateToken(Guid userId, Guid collegeId, Guid? departmentId, UserRole role)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("ProjectHubSuperSecretDevKeyMinLength32CharactersRequired!"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new("college_id", collegeId.ToString()),
            new(ClaimTypes.Role, role.ToString()),
            new("role", role.ToString())
        };
        if (departmentId.HasValue)
        {
            claims.Add(new Claim("department_id", departmentId.Value.ToString()));
        }

        var token = new JwtSecurityToken(
            issuer: "https://api.projecthub.local",
            audience: "https://app.projecthub.local",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<(Guid CollegeId, Guid DeptAId, Guid DeptBId, Guid TrackId, Guid LeadId, Guid Peer1Id, Guid Peer2Id, Guid DeptBStudentId)> SeedAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        tenantContext.IsSuperAdmin = true;
        tenantContext.IsTrustedSystemSeeder = true;

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var college = new CollegeTenant
        {
            Id = Guid.NewGuid(),
            Name = $"TeamTest {suffix}",
            TenantCode = $"TT{suffix[..6].ToUpper()}",
            SsoDomain = $"tt{suffix}.edu",
            LicenseTier = LicenseTier.Standard,
            MaxStudentSeats = 500,
            IsActive = true
        };
        tenantContext.CollegeId = college.Id;
        db.CollegeTenants.Add(college);

        var program = new CourseProgram
        {
            Id = Guid.NewGuid(),
            CollegeId = college.Id,
            Name = "B.Tech",
            Code = $"BT{suffix[..4]}",
            TotalSemesters = 8,
            IsActive = true
        };
        db.CoursePrograms.Add(program);

        var deptA = new Department { Id = Guid.NewGuid(), CollegeId = college.Id, CourseProgramId = program.Id, Code = "CSE", Name = "Computer Science" };
        var deptB = new Department { Id = Guid.NewGuid(), CollegeId = college.Id, CourseProgramId = program.Id, Code = "ECE", Name = "Electronics" };
        db.Departments.AddRange(deptA, deptB);

        var session = new AcademicSession
        {
            Id = Guid.NewGuid(),
            CollegeId = college.Id,
            Label = "2026-27",
            StartDate = DateTime.UtcNow.AddMonths(-2),
            EndDate = DateTime.UtcNow.AddMonths(10),
            IsActive = true
        };
        db.AcademicSessions.Add(session);

        var sem6A = new SemesterTerm { Id = Guid.NewGuid(), CollegeId = college.Id, DepartmentId = deptA.Id, AcademicSessionId = session.Id, SemesterNumber = 6, SemesterName = "Semester 6", Parity = SemesterParity.Even, IsActive = true };
        var sem6B = new SemesterTerm { Id = Guid.NewGuid(), CollegeId = college.Id, DepartmentId = deptB.Id, AcademicSessionId = session.Id, SemesterNumber = 6, SemesterName = "Semester 6", Parity = SemesterParity.Even, IsActive = true };
        db.SemesterTerms.AddRange(sem6A, sem6B);

        var track = new AcademicTrack
        {
            Id = Guid.NewGuid(),
            CollegeId = college.Id,
            DepartmentId = deptA.Id,
            AcademicSessionId = session.Id,
            CourseProgramId = program.Id,
            SemesterTermId = sem6A.Id,
            Name = "Minor 2 — 6th Semester",
            AcademicYear = "2026-27",
            ParticipationMode = ParticipationMode.Team,
            MinTeamSize = 2,
            MaxTeamSize = 2,
            Status = AcademicTrackStatus.Open,
            IsActive = true,
            RegistrationOpensUtc = DateTime.UtcNow.AddDays(-1),
            ProposalDeadlineUtc = DateTime.UtcNow.AddDays(30)
        };
        db.AcademicTracks.Add(track);

        var lead = new UserAccount { Id = Guid.NewGuid(), CollegeId = college.Id, DepartmentId = deptA.Id, FullName = "Lead Student", Email = $"lead.{suffix}@tt.edu", EnrollmentOrEmployeeCode = $"CS1{suffix[..4]}", Role = UserRole.Student, SkillsCsv = "Python,AI/ML", IsActive = true, IsActivated = true };
        var peer1 = new UserAccount { Id = Guid.NewGuid(), CollegeId = college.Id, DepartmentId = deptA.Id, FullName = "Peer One", Email = $"p1.{suffix}@tt.edu", EnrollmentOrEmployeeCode = $"CS2{suffix[..4]}", Role = UserRole.Student, SkillsCsv = "React,TypeScript", IsActive = true, IsActivated = true };
        var peer2 = new UserAccount { Id = Guid.NewGuid(), CollegeId = college.Id, DepartmentId = deptA.Id, FullName = "Peer Two", Email = $"p2.{suffix}@tt.edu", EnrollmentOrEmployeeCode = $"CS3{suffix[..4]}", Role = UserRole.Student, SkillsCsv = "Docker,Go", IsActive = true, IsActivated = true };
        var otherDept = new UserAccount { Id = Guid.NewGuid(), CollegeId = college.Id, DepartmentId = deptB.Id, FullName = "ECE Student", Email = $"ece.{suffix}@tt.edu", EnrollmentOrEmployeeCode = $"EC1{suffix[..4]}", Role = UserRole.Student, SkillsCsv = "Embedded", IsActive = true, IsActivated = true };
        db.Users.AddRange(lead, peer1, peer2, otherDept);

        db.StudentAcademicEnrollments.AddRange(
            new StudentAcademicEnrollment { CollegeId = college.Id, StudentUserId = lead.Id, CourseProgramId = program.Id, DepartmentId = deptA.Id, CurrentSemesterTermId = sem6A.Id, AcademicStatus = AcademicStatus.Active },
            new StudentAcademicEnrollment { CollegeId = college.Id, StudentUserId = peer1.Id, CourseProgramId = program.Id, DepartmentId = deptA.Id, CurrentSemesterTermId = sem6A.Id, AcademicStatus = AcademicStatus.Active },
            new StudentAcademicEnrollment { CollegeId = college.Id, StudentUserId = peer2.Id, CourseProgramId = program.Id, DepartmentId = deptA.Id, CurrentSemesterTermId = sem6A.Id, AcademicStatus = AcademicStatus.Active },
            new StudentAcademicEnrollment { CollegeId = college.Id, StudentUserId = otherDept.Id, CourseProgramId = program.Id, DepartmentId = deptB.Id, CurrentSemesterTermId = sem6B.Id, AcademicStatus = AcademicStatus.Active }
        );

        await db.SaveChangesAsync();
        return (college.Id, deptA.Id, deptB.Id, track.Id, lead.Id, peer1.Id, peer2.Id, otherDept.Id);
    }

    [Fact]
    public async Task TeamPublish_Explore_JoinRequestLifecycle_And_Guards_WorkEndToEnd()
    {
        var fx = await SeedAsync();
        var leadToken = GenerateToken(fx.LeadId, fx.CollegeId, fx.DeptAId, UserRole.Student);
        var p1Token = GenerateToken(fx.Peer1Id, fx.CollegeId, fx.DeptAId, UserRole.Student);
        var p2Token = GenerateToken(fx.Peer2Id, fx.CollegeId, fx.DeptAId, UserRole.Student);
        var eceToken = GenerateToken(fx.DeptBStudentId, fx.CollegeId, fx.DeptBId, UserRole.Student);

        // 1. Lead creates Draft team (not published yet)
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var createResp = await _client.PostAsJsonAsync("/api/student/teams", new CreateStudentTeamRequest
        {
            AcademicTrackId = fx.TrackId,
            TeamName = "Neural Grid",
            Title = "Campus Smart Energy Predictor",
            Abstract = "Forecasting campus power consumption with ML time-series models.",
            DomainTag = "AI/ML",
            CreatorRole = "AI/ML Lead",
            RequiredSkillsCsv = "React,TypeScript",
            PublishImmediately = false
        });
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);
        var draftTeam = await createResp.Content.ReadFromJsonAsync<StudentTeamRosterDto>();
        Assert.NotNull(draftTeam);
        Assert.False(draftTeam!.IsPublished);

        // 2. Draft team is NOT visible in Explore Teams
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", p1Token);
        var exploreBefore = await _client.GetFromJsonAsync<List<PublishedTeamSummaryDto>>("/api/student/teams/explore");
        Assert.DoesNotContain(exploreBefore!, t => t.TeamId == draftTeam.TeamId);

        // 3. Non-lead cannot publish
        var unauthPub = await _client.PostAsJsonAsync("/api/student/teams/current/publish", new { });
        Assert.Equal(HttpStatusCode.NotFound, unauthPub.StatusCode);

        // 4. Lead publishes team
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var pubResp = await _client.PostAsJsonAsync("/api/student/teams/current/publish", new { });
        Assert.Equal(HttpStatusCode.OK, pubResp.StatusCode);
        var published = await pubResp.Content.ReadFromJsonAsync<StudentTeamRosterDto>();
        Assert.True(published!.IsPublished);

        // 5. Eligible Peer1 sees published team in Explore Teams with profile skills
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", p1Token);
        var exploreAfter = await _client.GetFromJsonAsync<List<PublishedTeamSummaryDto>>("/api/student/teams/explore");
        var listed = exploreAfter!.FirstOrDefault(t => t.TeamId == draftTeam.TeamId);
        Assert.NotNull(listed);
        Assert.Equal("Neural Grid", listed!.TeamName);
        Assert.Contains("React", listed.RequiredSkills);
        Assert.Contains("AI/ML", listed.Members[0].Skills);

        // 6. Cross-department student cannot join
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", eceToken);
        var crossDeptReq = await _client.PostAsJsonAsync($"/api/student/teams/{draftTeam.TeamId}/join-requests", new CreateJoinRequestDto { DesiredRole = "Frontend" });
        Assert.Equal(HttpStatusCode.Forbidden, crossDeptReq.StatusCode);

        // 7. Peer1 sends join request, duplicate is rejected (409), Peer1 cancels, then re-sends
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", p1Token);
        var reqResp = await _client.PostAsJsonAsync($"/api/student/teams/{draftTeam.TeamId}/join-requests", new CreateJoinRequestDto { DesiredRole = "Frontend Developer", Message = "I know React and TypeScript" });
        Assert.Equal(HttpStatusCode.OK, reqResp.StatusCode);
        var reqDto = await reqResp.Content.ReadFromJsonAsync<TeamJoinRequestDto>();
        Assert.Contains("React", reqDto!.StudentSkills);

        var dupResp = await _client.PostAsJsonAsync($"/api/student/teams/{draftTeam.TeamId}/join-requests", new CreateJoinRequestDto { DesiredRole = "Frontend Developer" });
        Assert.Equal(HttpStatusCode.Conflict, dupResp.StatusCode);

        var cancelResp = await _client.PostAsJsonAsync($"/api/student/join-requests/{reqDto.Id}/cancel", new { });
        Assert.Equal(HttpStatusCode.OK, cancelResp.StatusCode);

        var reReqResp = await _client.PostAsJsonAsync($"/api/student/teams/{draftTeam.TeamId}/join-requests", new CreateJoinRequestDto { DesiredRole = "Frontend Developer" });
        Assert.Equal(HttpStatusCode.OK, reReqResp.StatusCode);
        var reReqDto = await reReqResp.Content.ReadFromJsonAsync<TeamJoinRequestDto>();

        // 8. Peer2 also sends a join request
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", p2Token);
        var p2ReqResp = await _client.PostAsJsonAsync($"/api/student/teams/{draftTeam.TeamId}/join-requests", new CreateJoinRequestDto { DesiredRole = "DevOps" });
        Assert.Equal(HttpStatusCode.OK, p2ReqResp.StatusCode);
        var p2ReqDto = await p2ReqResp.Content.ReadFromJsonAsync<TeamJoinRequestDto>();

        // 9. Lead accepts Peer1 -> team reaches MaxTeamSize (2); Peer2's request cannot be accepted (capacity reached)
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var acceptResp = await _client.PostAsJsonAsync($"/api/student/teams/join-requests/{reReqDto!.Id}/accept", new RespondJoinRequestDto());
        Assert.Equal(HttpStatusCode.OK, acceptResp.StatusCode);
        var rosterAfterAccept = await acceptResp.Content.ReadFromJsonAsync<StudentTeamRosterDto>();
        Assert.Equal(2, rosterAfterAccept!.CurrentMemberCount);

        var overCapResp = await _client.PostAsJsonAsync($"/api/student/teams/join-requests/{p2ReqDto!.Id}/accept", new RespondJoinRequestDto());
        Assert.Equal(HttpStatusCode.BadRequest, overCapResp.StatusCode);

        // 10. Lead rejects Peer2's request cleanly
        var rejectResp = await _client.PostAsJsonAsync($"/api/student/teams/join-requests/{p2ReqDto.Id}/reject", new RespondJoinRequestDto { Notes = "Team is now full" });
        Assert.Equal(HttpStatusCode.OK, rejectResp.StatusCode);
    }
}
