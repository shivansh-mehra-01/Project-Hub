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
using ProjectHub.Infrastructure.Persistence;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class StudentPortfolioTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public StudentPortfolioTests(CustomWebApplicationFactory factory)
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

    private async Task<(Guid CollegeId, Guid DeptId, Guid TrackId, Guid GuideId, Guid StudentId, Guid PeerStudentId, Guid OtherCollegeId, Guid OtherStudentId)> SeedAsync()
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
            Name = $"Portfolio College {suffix}",
            TenantCode = $"PC{suffix[..6].ToUpper()}",
            SsoDomain = $"pc{suffix}.edu",
            LicenseTier = LicenseTier.Standard,
            MaxStudentSeats = 500,
            IsActive = true
        };
        var otherCollege = new CollegeTenant
        {
            Id = Guid.NewGuid(),
            Name = $"Other College {suffix}",
            TenantCode = $"OC{suffix[..6].ToUpper()}",
            SsoDomain = $"oc{suffix}.edu",
            LicenseTier = LicenseTier.Standard,
            MaxStudentSeats = 500,
            IsActive = true
        };
        db.CollegeTenants.AddRange(college, otherCollege);

        var program = new CourseProgram
        {
            Id = Guid.NewGuid(),
            CollegeId = college.Id,
            Name = "B.Tech",
            Code = $"BT{suffix[..4]}",
            TotalSemesters = 8,
            IsActive = true
        };
        var otherProgram = new CourseProgram
        {
            Id = Guid.NewGuid(),
            CollegeId = otherCollege.Id,
            Name = "B.Tech",
            Code = $"OB{suffix[..4]}",
            TotalSemesters = 8,
            IsActive = true
        };
        db.CoursePrograms.AddRange(program, otherProgram);

        var dept = new Department
        {
            Id = Guid.NewGuid(),
            CollegeId = college.Id,
            CourseProgramId = program.Id,
            Name = "Information Technology",
            Code = $"IT{suffix[..4].ToUpper()}"
        };
        var otherDept = new Department
        {
            Id = Guid.NewGuid(),
            CollegeId = otherCollege.Id,
            CourseProgramId = otherProgram.Id,
            Name = "Mechanical Engineering",
            Code = $"ME{suffix[..4].ToUpper()}"
        };
        db.Departments.AddRange(dept, otherDept);

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

        var sem5 = new SemesterTerm
        {
            Id = Guid.NewGuid(),
            CollegeId = college.Id,
            DepartmentId = dept.Id,
            AcademicSessionId = session.Id,
            SemesterNumber = 5,
            SemesterName = "Semester 5",
            Parity = SemesterParity.Odd,
            IsActive = true
        };
        db.SemesterTerms.Add(sem5);

        var track = new AcademicTrack
        {
            Id = Guid.NewGuid(),
            CollegeId = college.Id,
            DepartmentId = dept.Id,
            AcademicSessionId = session.Id,
            CourseProgramId = program.Id,
            SemesterTermId = sem5.Id,
            Name = "Minor 1",
            AcademicYear = "2026-2027",
            ParticipationMode = ParticipationMode.Team,
            MinTeamSize = 2,
            MaxTeamSize = 4,
            Status = AcademicTrackStatus.Open,
            RegistrationOpensUtc = DateTime.UtcNow.AddDays(-60),
            ProposalDeadlineUtc = DateTime.UtcNow.AddDays(30),
            IsActive = true
        };
        db.AcademicTracks.Add(track);

        var guide = new UserAccount
        {
            Id = Guid.NewGuid(),
            CollegeId = college.Id,
            DepartmentId = dept.Id,
            FullName = $"Prof. Guide {suffix}",
            Email = $"guide-{suffix}@pc.edu",
            EnrollmentOrEmployeeCode = $"FAC-{suffix}",
            Role = UserRole.Faculty,
            IsActive = true,
            IsActivated = true
        };
        var student = new UserAccount
        {
            Id = Guid.NewGuid(),
            CollegeId = college.Id,
            DepartmentId = dept.Id,
            FullName = $"Student Alpha {suffix}",
            Email = $"alpha-{suffix}@pc.edu",
            EnrollmentOrEmployeeCode = $"ENR-{suffix}-A",
            Role = UserRole.Student,
            IsActive = true,
            IsActivated = true
        };
        var peer = new UserAccount
        {
            Id = Guid.NewGuid(),
            CollegeId = college.Id,
            DepartmentId = dept.Id,
            FullName = $"Student Beta {suffix}",
            Email = $"beta-{suffix}@pc.edu",
            EnrollmentOrEmployeeCode = $"ENR-{suffix}-B",
            Role = UserRole.Student,
            IsActive = true,
            IsActivated = true
        };
        var otherStudent = new UserAccount
        {
            Id = Guid.NewGuid(),
            CollegeId = otherCollege.Id,
            DepartmentId = otherDept.Id,
            FullName = $"Student Gamma {suffix}",
            Email = $"gamma-{suffix}@oc.edu",
            EnrollmentOrEmployeeCode = $"ENR-{suffix}-C",
            Role = UserRole.Student,
            IsActive = true,
            IsActivated = true
        };
        db.Users.AddRange(guide, student, peer, otherStudent);

        await db.SaveChangesAsync();
        return (college.Id, dept.Id, track.Id, guide.Id, student.Id, peer.Id, otherCollege.Id, otherStudent.Id);
    }

    [Fact]
    public async Task GetStudentPortfolio_EmptyWhenNoCompletedOrVerifiedProjects()
    {
        var (collegeId, deptId, _, _, studentId, _, _, _) = await SeedAsync();

        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", GenerateToken(studentId, collegeId, deptId, UserRole.Student));

        var response = await _client.GetAsync("/api/student/portfolio/verified");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var dto = await response.Content.ReadFromJsonAsync<VerifiedStudentPortfolioDto>();
        Assert.NotNull(dto);
        Assert.Equal(studentId, dto!.StudentUserId);
        Assert.Equal("Information Technology", dto.DepartmentName);
        Assert.Empty(dto.Projects);
        Assert.Empty(dto.PendingVerificationProjects);
    }

    [Fact]
    public async Task GetStudentPortfolio_CompletedWithoutVerification_AppearsInPendingOnly()
    {
        var (collegeId, deptId, trackId, guideId, studentId, _, _, _) = await SeedAsync();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.IsTrustedSystemSeeder = true;

            var team = new ProjectTeam
            {
                Id = Guid.NewGuid(),
                CollegeId = collegeId,
                DepartmentId = deptId,
                AcademicTrackId = trackId,
                GuideUserId = guideId,
                TeamCode = "IT-2026-PEND",
                Title = "Campus Energy Analytics",
                Abstract = "Real-time campus meter telemetry.",
                Status = ProjectStatus.Completed,
                RepoUrl = "https://github.com/example/campus-energy"
            };
            db.ProjectTeams.Add(team);

            db.TeamMembers.Add(new TeamMember
            {
                Id = Guid.NewGuid(),
                CollegeId = collegeId,
                ProjectTeamId = team.Id,
                UserId = studentId,
                IsTeamLead = true,
                IsActive = true,
                ModuleResponsibility = "Backend Telemetry API"
            });

            // Also seed an unverified StudentAcademicRecord to verify it is NOT surfaced as verified
            db.StudentAcademicRecords.Add(new StudentAcademicRecord
            {
                Id = Guid.NewGuid(),
                CollegeId = collegeId,
                DepartmentId = deptId,
                AcademicTrackId = trackId,
                StudentUserId = studentId,
                ProjectTeamId = team.Id,
                ProjectClosureRecordId = Guid.NewGuid(),
                ProjectTitle = team.Title,
                TeamCode = team.TeamCode,
                AcademicYear = "2026-2027",
                TrackName = "Minor 1",
                DepartmentName = "Information Technology",
                StudentName = "Student Alpha",
                EnrollmentNumber = "ENR-PEND",
                RoleDescription = "Backend Telemetry API",
                IsVerified = false,
                VerificationHash = "unverified-hash"
            });

            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", GenerateToken(studentId, collegeId, deptId, UserRole.Student));

        var response = await _client.GetAsync("/api/student/portfolio/verified");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var dto = await response.Content.ReadFromJsonAsync<VerifiedStudentPortfolioDto>();
        Assert.NotNull(dto);
        Assert.Empty(dto!.Projects);
        Assert.Single(dto.PendingVerificationProjects);
        Assert.Equal("Campus Energy Analytics", dto.PendingVerificationProjects[0].ProjectTitle);
        Assert.Equal("Backend Telemetry API", dto.PendingVerificationProjects[0].RoleDescription);
    }

    [Fact]
    public async Task GetStudentPortfolio_VerifiedRecord_ReturnsRealDataAndEnforcesIsolation()
    {
        var (collegeId, deptId, trackId, guideId, studentId, peerId, otherCollegeId, otherStudentId) = await SeedAsync();
        Guid recordId;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.IsTrustedSystemSeeder = true;

            var team = new ProjectTeam
            {
                Id = Guid.NewGuid(),
                CollegeId = collegeId,
                DepartmentId = deptId,
                AcademicTrackId = trackId,
                GuideUserId = guideId,
                TeamCode = "IT-2026-VER",
                Title = "Autonomous Irrigation Controller",
                Abstract = "Soil moisture feedback loop.",
                Status = ProjectStatus.Archived
            };
            db.ProjectTeams.Add(team);

            db.TeamMembers.Add(new TeamMember
            {
                Id = Guid.NewGuid(),
                CollegeId = collegeId,
                ProjectTeamId = team.Id,
                UserId = studentId,
                IsTeamLead = true,
                IsActive = true,
                ModuleResponsibility = "Embedded Firmware Lead"
            });

            var record = new StudentAcademicRecord
            {
                Id = Guid.NewGuid(),
                CollegeId = collegeId,
                DepartmentId = deptId,
                AcademicTrackId = trackId,
                StudentUserId = studentId,
                ProjectTeamId = team.Id,
                ProjectClosureRecordId = Guid.NewGuid(),
                ProjectTitle = team.Title,
                ProjectAbstract = team.Abstract,
                TeamCode = team.TeamCode,
                AcademicYear = "2026-2027",
                TrackName = "Minor 1",
                DepartmentName = "Information Technology",
                CollegeName = "Portfolio College",
                StudentName = "Student Alpha",
                EnrollmentNumber = "ENR-A",
                RoleDescription = "Embedded Firmware Lead",
                IsTeamLead = true,
                GuideUserId = guideId,
                GuideName = "Prof. Guide",
                FinalOutcome = VivaOutcome.Pass,
                SharedTotalScore = 46.0m,
                SharedMaxScore = 50.0m,
                IndividualContributionScore = 45.0m,
                FinalComputedMark = 91.0m,
                VerificationHash = "sha256-verified-001",
                IsVerified = true,
                VerifiedAtUtc = DateTime.UtcNow
            };
            recordId = record.Id;
            db.StudentAcademicRecords.Add(record);

            await db.SaveChangesAsync();
        }

        // 1. Owner student sees verified project and not in pending
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", GenerateToken(studentId, collegeId, deptId, UserRole.Student));

        var ownerRes = await _client.GetAsync("/api/student/portfolio/verified");
        Assert.Equal(HttpStatusCode.OK, ownerRes.StatusCode);
        var ownerDto = await ownerRes.Content.ReadFromJsonAsync<VerifiedStudentPortfolioDto>();
        Assert.NotNull(ownerDto);
        Assert.Single(ownerDto!.Projects);
        Assert.Empty(ownerDto.PendingVerificationProjects);
        Assert.Equal("Autonomous Irrigation Controller", ownerDto.Projects[0].ProjectTitle);
        Assert.Equal("Embedded Firmware Lead", ownerDto.Projects[0].RoleDescription);
        Assert.Equal(91.0m, ownerDto.Projects[0].FinalComputedMark);
        Assert.Equal("sha256-verified-001", ownerDto.Projects[0].VerificationHash);

        // 2. Peer student in same college sees empty portfolio and gets 403 on owner's transcript
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", GenerateToken(peerId, collegeId, deptId, UserRole.Student));

        var peerRes = await _client.GetAsync("/api/student/portfolio/verified");
        Assert.Equal(HttpStatusCode.OK, peerRes.StatusCode);
        var peerDto = await peerRes.Content.ReadFromJsonAsync<VerifiedStudentPortfolioDto>();
        Assert.Empty(peerDto!.Projects);

        var peerTranscriptRes = await _client.GetAsync($"/api/student/records/{recordId}/transcript");
        Assert.Equal(HttpStatusCode.Forbidden, peerTranscriptRes.StatusCode);

        // 3. Student in another college gets 404 on owner's transcript
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", GenerateToken(otherStudentId, otherCollegeId, null, UserRole.Student));

        var crossTenantTranscriptRes = await _client.GetAsync($"/api/student/records/{recordId}/transcript");
        Assert.Equal(HttpStatusCode.NotFound, crossTenantTranscriptRes.StatusCode);
    }
}
