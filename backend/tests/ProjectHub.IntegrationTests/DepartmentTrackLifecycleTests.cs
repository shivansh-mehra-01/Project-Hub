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

public class DepartmentTrackLifecycleTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public DepartmentTrackLifecycleTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private static string GenerateToken(Guid userId, Guid collegeId, Guid? departmentId, UserRole role, string email = "user@test.edu")
    {
        var secret = "ProjectHubSuperSecretDevKeyMinLength32CharactersRequired!";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new("sub", userId.ToString()),
            new("user_id", userId.ToString()),
            new(ClaimTypes.Email, email),
            new(ClaimTypes.Role, role.ToString()),
            new("role", role.ToString()),
            new("college_id", collegeId.ToString()),
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
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<(Guid CollegeId, Guid DeptAId, Guid DeptBId, Guid HodAId, Guid HodBId, Guid CollegeAdminId, Guid FacultyId, Guid StudentAId, Guid StudentBId, Guid SessionId, Guid SemesterId)> SeedFixtureAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        tenantContext.IsTrustedSystemSeeder = true;
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

        var college = new CollegeTenant
        {
            TenantCode = $"TRK-{Guid.NewGuid().ToString("N")[..6].ToUpper()}",
            Name = "Track Lifecycle College",
            SsoDomain = "tracktest.edu",
            IsActive = true
        };
        tenantContext.CollegeId = college.Id;
        await db.CollegeTenants.AddAsync(college);

        var program = new CourseProgram
        {
            CollegeId = college.Id,
            Code = "BTECH",
            Name = "B.Tech",
            TotalSemesters = 8,
            IsActive = true
        };
        await db.CoursePrograms.AddAsync(program);

        var deptA = new Department { CollegeId = college.Id, CourseProgramId = program.Id, Code = "CSE", Name = "Computer Science" };
        var deptB = new Department { CollegeId = college.Id, CourseProgramId = program.Id, Code = "ECE", Name = "Electronics" };
        await db.Departments.AddRangeAsync(deptA, deptB);

        var session = new AcademicSession
        {
            CollegeId = college.Id,
            Label = "2025-26",
            StartDate = DateTime.UtcNow.AddMonths(-2),
            EndDate = DateTime.UtcNow.AddMonths(8),
            IsActive = true
        };
        await db.AcademicSessions.AddAsync(session);

        var semester = new SemesterTerm
        {
            CollegeId = college.Id,
            DepartmentId = deptA.Id,
            AcademicSessionId = session.Id,
            SemesterNumber = 6,
            SemesterName = "Semester 6",
            Parity = SemesterParity.Even,
            IsActive = true
        };
        await db.SemesterTerms.AddAsync(semester);

        var collegeAdmin = new UserAccount
        {
            CollegeId = college.Id,
            FullName = "College Admin",
            Email = $"admin.{Guid.NewGuid():N}@tracktest.edu",
            EnrollmentOrEmployeeCode = $"ADM-{Guid.NewGuid():N}"[..12],
            Role = UserRole.CollegeAdmin,
            IsActive = true,
            PasswordHash = "unused"
        };
        var hodA = new UserAccount
        {
            CollegeId = college.Id,
            DepartmentId = deptA.Id,
            FullName = "HOD CSE",
            Email = $"hod.cse.{Guid.NewGuid():N}@tracktest.edu",
            EnrollmentOrEmployeeCode = $"HODA-{Guid.NewGuid():N}"[..12],
            Role = UserRole.HOD,
            IsActive = true,
            PasswordHash = "unused"
        };
        var hodB = new UserAccount
        {
            CollegeId = college.Id,
            DepartmentId = deptB.Id,
            FullName = "HOD ECE",
            Email = $"hod.ece.{Guid.NewGuid():N}@tracktest.edu",
            EnrollmentOrEmployeeCode = $"HODB-{Guid.NewGuid():N}"[..12],
            Role = UserRole.HOD,
            IsActive = true,
            PasswordHash = "unused"
        };
        var faculty = new UserAccount
        {
            CollegeId = college.Id,
            DepartmentId = deptA.Id,
            FullName = "Faculty Member",
            Email = $"fac.{Guid.NewGuid():N}@tracktest.edu",
            EnrollmentOrEmployeeCode = $"FAC-{Guid.NewGuid():N}"[..12],
            Role = UserRole.Faculty,
            IsActive = true,
            PasswordHash = "unused"
        };
        var studentA = new UserAccount
        {
            CollegeId = college.Id,
            DepartmentId = deptA.Id,
            FullName = "Student Alpha",
            Email = $"stuA.{Guid.NewGuid():N}@tracktest.edu",
            EnrollmentOrEmployeeCode = $"STUA-{Guid.NewGuid():N}"[..12],
            Role = UserRole.Student,
            IsActive = true,
            PasswordHash = "unused"
        };
        var studentB = new UserAccount
        {
            CollegeId = college.Id,
            DepartmentId = deptA.Id,
            FullName = "Student Beta",
            Email = $"stuB.{Guid.NewGuid():N}@tracktest.edu",
            EnrollmentOrEmployeeCode = $"STUB-{Guid.NewGuid():N}"[..12],
            Role = UserRole.Student,
            IsActive = true,
            PasswordHash = "unused"
        };
        await db.Users.AddRangeAsync(collegeAdmin, hodA, hodB, faculty, studentA, studentB);

        await db.StudentAcademicEnrollments.AddRangeAsync(
            new StudentAcademicEnrollment
            {
                CollegeId = college.Id,
                StudentUserId = studentA.Id,
                CourseProgramId = program.Id,
                DepartmentId = deptA.Id,
                CurrentSemesterTermId = semester.Id,
                AcademicStatus = AcademicStatus.Active
            },
            new StudentAcademicEnrollment
            {
                CollegeId = college.Id,
                StudentUserId = studentB.Id,
                CourseProgramId = program.Id,
                DepartmentId = deptA.Id,
                CurrentSemesterTermId = semester.Id,
                AcademicStatus = AcademicStatus.Active
            });

        await db.SaveChangesAsync();

        return (college.Id, deptA.Id, deptB.Id, hodA.Id, hodB.Id, collegeAdmin.Id, faculty.Id, studentA.Id, studentB.Id, session.Id, semester.Id);
    }

    [Fact]
    public async Task CollegeAdmin_CannotCreateDepartmentTrack_Returns403()
    {
        var fx = await SeedFixtureAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer",
            GenerateToken(fx.CollegeAdminId, fx.CollegeId, null, UserRole.CollegeAdmin));

        var resp = await _client.PostAsJsonAsync("/api/college/tracks", new CreateCollegeTrackRequest
        {
            Name = "Unauthorized College Track",
            AcademicYear = "2025-26"
        });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task NonHodRoles_CannotCreateHodTrack_Returns403()
    {
        var fx = await SeedFixtureAsync();

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer",
            GenerateToken(fx.FacultyId, fx.CollegeId, fx.DeptAId, UserRole.Faculty));
        var facResp = await _client.PostAsJsonAsync("/api/hod/tracks", new CreateDepartmentTrackRequest
        {
            Name = "Faculty Track",
            AcademicYear = "2025-26"
        });
        Assert.Equal(HttpStatusCode.Forbidden, facResp.StatusCode);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer",
            GenerateToken(fx.StudentAId, fx.CollegeId, fx.DeptAId, UserRole.Student));
        var stuResp = await _client.PostAsJsonAsync("/api/hod/tracks", new CreateDepartmentTrackRequest
        {
            Name = "Student Track",
            AcademicYear = "2025-26"
        });
        Assert.Equal(HttpStatusCode.Forbidden, stuResp.StatusCode);
    }

    [Fact]
    public async Task Hod_TrackLifecycle_DraftLaunchPauseResumeClose_And_StudentVisibility_WorksEndToEnd()
    {
        var fx = await SeedFixtureAsync();
        var hodAToken = GenerateToken(fx.HodAId, fx.CollegeId, fx.DeptAId, UserRole.HOD);
        var hodBToken = GenerateToken(fx.HodBId, fx.CollegeId, fx.DeptBId, UserRole.HOD);
        var stuToken = GenerateToken(fx.StudentAId, fx.CollegeId, fx.DeptAId, UserRole.Student);

        // 1. HOD creates Draft track
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodAToken);
        var createResp = await _client.PostAsJsonAsync("/api/hod/tracks", new CreateDepartmentTrackRequest
        {
            Name = "Minor Project Sem 6",
            Description = "Department minor project",
            AcademicYear = "2025-26",
            AcademicSessionId = fx.SessionId,
            SemesterTermId = fx.SemesterId,
            ParticipationMode = ParticipationMode.Team,
            MinTeamSize = 2,
            MaxTeamSize = 4,
            LaunchImmediately = false
        });
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);
        var created = await createResp.Content.ReadFromJsonAsync<CollegeTrackDto>();
        Assert.NotNull(created);
        Assert.Equal(AcademicTrackStatus.Draft, created!.Status);
        Assert.False(created.IsActive);

        // 2. Student cannot see Draft track or create a team on it
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", stuToken);
        var availWhileDraft = await _client.GetFromJsonAsync<List<CollegeTrackDto>>("/api/student/tracks");
        Assert.DoesNotContain(availWhileDraft!, t => t.Id == created.Id);

        var teamDraftResp = await _client.PostAsJsonAsync("/api/student/teams", new CreateStudentTeamRequest
        {
            AcademicTrackId = created.Id,
            Title = "Should Fail Draft",
            Abstract = "Not launched yet"
        });
        Assert.Equal(HttpStatusCode.BadRequest, teamDraftResp.StatusCode);

        // 3. Cross-department HOD cannot launch/pause/close Dept A's track
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodBToken);
        var crossDeptResp = await _client.PostAsync($"/api/hod/tracks/{created.Id}/launch", null);
        Assert.Equal(HttpStatusCode.NotFound, crossDeptResp.StatusCode);

        // 4. HOD launches track -> Student discovers it
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodAToken);
        var launchResp = await _client.PostAsync($"/api/hod/tracks/{created.Id}/launch", null);
        Assert.Equal(HttpStatusCode.OK, launchResp.StatusCode);
        var launched = await launchResp.Content.ReadFromJsonAsync<CollegeTrackDto>();
        Assert.Equal(AcademicTrackStatus.Open, launched!.Status);
        Assert.True(launched.IsActive);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", stuToken);
        var availWhileOpen = await _client.GetFromJsonAsync<List<CollegeTrackDto>>("/api/student/tracks");
        Assert.Contains(availWhileOpen!, t => t.Id == created.Id);

        // 5. HOD pauses -> Student blocked; HOD resumes -> Open; HOD closes -> Closed
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodAToken);
        var pauseResp = await _client.PostAsync($"/api/hod/tracks/{created.Id}/pause", null);
        Assert.Equal(HttpStatusCode.OK, pauseResp.StatusCode);
        Assert.Equal(AcademicTrackStatus.Paused, (await pauseResp.Content.ReadFromJsonAsync<CollegeTrackDto>())!.Status);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", stuToken);
        var teamPausedResp = await _client.PostAsJsonAsync("/api/student/teams", new CreateStudentTeamRequest
        {
            AcademicTrackId = created.Id,
            Title = "Should Fail Paused",
            Abstract = "Paused track"
        });
        Assert.Equal(HttpStatusCode.BadRequest, teamPausedResp.StatusCode);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodAToken);
        var resumeResp = await _client.PostAsync($"/api/hod/tracks/{created.Id}/resume", null);
        Assert.Equal(HttpStatusCode.OK, resumeResp.StatusCode);
        Assert.Equal(AcademicTrackStatus.Open, (await resumeResp.Content.ReadFromJsonAsync<CollegeTrackDto>())!.Status);

        var closeResp = await _client.PostAsync($"/api/hod/tracks/{created.Id}/close", null);
        Assert.Equal(HttpStatusCode.OK, closeResp.StatusCode);
        var closed = await closeResp.Content.ReadFromJsonAsync<CollegeTrackDto>();
        Assert.Equal(AcademicTrackStatus.Closed, closed!.Status);
        Assert.False(closed.IsActive);
    }

    [Fact]
    public async Task Student_IndividualTrack_AllowsSoloProject_And_BlocksTeammateInvitation()
    {
        var fx = await SeedFixtureAsync();
        var hodToken = GenerateToken(fx.HodAId, fx.CollegeId, fx.DeptAId, UserRole.HOD);
        var stuToken = GenerateToken(fx.StudentAId, fx.CollegeId, fx.DeptAId, UserRole.Student);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);
        var trackResp = await _client.PostAsJsonAsync("/api/hod/tracks", new CreateDepartmentTrackRequest
        {
            Name = "Individual Honors Project",
            AcademicYear = "2025-26",
            AcademicSessionId = fx.SessionId,
            SemesterTermId = fx.SemesterId,
            ParticipationMode = ParticipationMode.Individual,
            MinTeamSize = 2, // Should be forced to 1
            MaxTeamSize = 4, // Should be forced to 1
            LaunchImmediately = true
        });
        Assert.Equal(HttpStatusCode.OK, trackResp.StatusCode);
        var track = await trackResp.Content.ReadFromJsonAsync<CollegeTrackDto>();
        Assert.Equal(1, track!.MinTeamSize);
        Assert.Equal(1, track.MaxTeamSize);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", stuToken);
        var createProjectResp = await _client.PostAsJsonAsync("/api/student/teams", new CreateStudentTeamRequest
        {
            AcademicTrackId = track.Id,
            Title = "Solo Research Project",
            Abstract = "Individual capstone research"
        });
        Assert.Equal(HttpStatusCode.OK, createProjectResp.StatusCode);
        var roster = await createProjectResp.Content.ReadFromJsonAsync<StudentTeamRosterDto>();
        Assert.Equal(1, roster!.MaxTeamSize);

        var inviteResp = await _client.PostAsJsonAsync("/api/student/teams/invitations", new SendTeamInvitationRequest
        {
            InviteeStudentId = fx.StudentBId
        });
        Assert.Equal(HttpStatusCode.Conflict, inviteResp.StatusCode);
    }

    [Fact]
    public async Task Student_CannotCreateTeam_WhenProposalDeadlineHasPassed()
    {
        var fx = await SeedFixtureAsync();
        var hodToken = GenerateToken(fx.HodAId, fx.CollegeId, fx.DeptAId, UserRole.HOD);
        var stuToken = GenerateToken(fx.StudentAId, fx.CollegeId, fx.DeptAId, UserRole.Student);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);
        var trackResp = await _client.PostAsJsonAsync("/api/hod/tracks", new CreateDepartmentTrackRequest
        {
            Name = "Expired Cutoff Track",
            AcademicYear = "2025-26",
            AcademicSessionId = fx.SessionId,
            SemesterTermId = fx.SemesterId,
            ProposalDeadlineUtc = DateTime.UtcNow.AddDays(-1),
            FinalSubmissionDeadlineUtc = DateTime.UtcNow.AddDays(30),
            LaunchImmediately = true
        });
        Assert.Equal(HttpStatusCode.OK, trackResp.StatusCode);
        var track = await trackResp.Content.ReadFromJsonAsync<CollegeTrackDto>();

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", stuToken);
        var createResp = await _client.PostAsJsonAsync("/api/student/teams", new CreateStudentTeamRequest
        {
            AcademicTrackId = track!.Id,
            Title = "Late Project",
            Abstract = "After deadline"
        });
        Assert.Equal(HttpStatusCode.BadRequest, createResp.StatusCode);
    }

    [Fact]
    public async Task Hod_CanEnrollDepartmentStudents_And_CreateSem1Track_ForFirstSemStudent()
    {
        var fx = await SeedFixtureAsync();
        var hodToken = GenerateToken(fx.HodAId, fx.CollegeId, fx.DeptAId, UserRole.HOD);
        var stuToken = GenerateToken(fx.StudentAId, fx.CollegeId, fx.DeptAId, UserRole.Student);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);

        // 1. HOD creates a Semester 1 track even though Semester 1 doesn't exist yet (SemesterTermId = null, SemesterNumber = 1)
        var trackResp = await _client.PostAsJsonAsync("/api/hod/tracks", new CreateDepartmentTrackRequest
        {
            Name = "First Sem Mini Project",
            AcademicYear = "2026-27",
            AcademicSessionId = fx.SessionId,
            SemesterTermId = Guid.Empty,
            SemesterNumber = 1,
            LaunchImmediately = true
        });
        Assert.Equal(HttpStatusCode.OK, trackResp.StatusCode);
        var track = await trackResp.Content.ReadFromJsonAsync<CollegeTrackDto>();
        Assert.NotNull(track);
        Assert.Equal(1, track!.SemesterNumber);

        // 2. HOD lists department students and updates StudentA to Semester 1
        var listResp = await _client.GetAsync("/api/hod/students");
        Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);
        var students = await listResp.Content.ReadFromJsonAsync<List<HodDepartmentStudentDto>>();
        Assert.Contains(students!, s => s.Id == fx.StudentAId);

        var enrollResp = await _client.PutAsJsonAsync($"/api/hod/students/{fx.StudentAId}/enrollment", new UpdateStudentSemesterRequest
        {
            SemesterNumber = 1,
            AcademicStatus = AcademicStatus.Active
        });
        Assert.Equal(HttpStatusCode.OK, enrollResp.StatusCode);
        var updatedStudent = await enrollResp.Content.ReadFromJsonAsync<HodDepartmentStudentDto>();
        Assert.Equal(1, updatedStudent!.CurrentSemesterNumber);
        Assert.Equal("Active", updatedStudent.AcademicStatus);

        // 3. StudentA now discovers the Semester 1 track
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", stuToken);
        var stuTracksResp = await _client.GetAsync("/api/student/tracks");
        Assert.Equal(HttpStatusCode.OK, stuTracksResp.StatusCode);
        var stuTracks = await stuTracksResp.Content.ReadFromJsonAsync<List<CollegeTrackDto>>();
        Assert.Contains(stuTracks!, t => t.Id == track.Id && t.SemesterNumber == 1);
    }

    [Fact]
    public async Task Hod_StartProjectWindow_ValidatesCompatibilityDates_AndDoesNotGrantExtraCoordinatorRole()
    {
        var fx = await SeedFixtureAsync();
        var hodToken = GenerateToken(fx.HodAId, fx.CollegeId, fx.DeptAId, UserRole.HOD);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);

        // 1. Incompatible ProjectType + Semester (Minor 1 in 7th sem) -> 400 BadRequest
        var badTypeResp = await _client.PostAsJsonAsync("/api/hod/tracks", new CreateDepartmentTrackRequest
        {
            Name = "Minor 1 — 7th Semester",
            ProjectType = "Minor 1",
            AcademicYear = "2025-26",
            AcademicSessionId = fx.SessionId,
            SemesterNumber = 7,
            RegistrationOpensUtc = DateTime.UtcNow.Date,
            ProposalDeadlineUtc = DateTime.UtcNow.Date.AddDays(14),
            LaunchImmediately = true
        });
        Assert.Equal(HttpStatusCode.BadRequest, badTypeResp.StatusCode);

        // 2. Registration deadline <= opening date -> 400 BadRequest
        var badDateResp = await _client.PostAsJsonAsync("/api/hod/tracks", new CreateDepartmentTrackRequest
        {
            Name = "Minor 1 — 5th Semester",
            ProjectType = "Minor 1",
            AcademicYear = "2025-26",
            AcademicSessionId = fx.SessionId,
            SemesterNumber = 5,
            RegistrationOpensUtc = DateTime.UtcNow.Date.AddDays(10),
            ProposalDeadlineUtc = DateTime.UtcNow.Date.AddDays(5),
            LaunchImmediately = true
        });
        Assert.Equal(HttpStatusCode.BadRequest, badDateResp.StatusCode);

        // 3. Valid window with CoordinatorUserId -> 200 OK, and Faculty.IsProjectCoordinator stays false
        var okResp = await _client.PostAsJsonAsync("/api/hod/tracks", new CreateDepartmentTrackRequest
        {
            Name = "Minor 1 — 5th Semester",
            ProjectType = "Minor 1",
            Description = "Submit synopsis and form teams of 2-4.",
            AcademicYear = "2025-26",
            AcademicSessionId = fx.SessionId,
            SemesterNumber = 5,
            MinTeamSize = 2,
            MaxTeamSize = 4,
            RegistrationOpensUtc = DateTime.UtcNow.Date,
            ProposalDeadlineUtc = DateTime.UtcNow.Date.AddDays(14),
            CoordinatorUserId = fx.FacultyId,
            LaunchImmediately = true
        });
        Assert.Equal(HttpStatusCode.OK, okResp.StatusCode);
        var created = await okResp.Content.ReadFromJsonAsync<CollegeTrackDto>();
        Assert.NotNull(created);
        Assert.Equal(fx.FacultyId, created!.CoordinatorUserId);
        Assert.NotNull(created.RegistrationOpensUtc);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var facultyUser = await db.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == fx.FacultyId);
        Assert.False(facultyUser.IsProjectCoordinator);
    }
}
