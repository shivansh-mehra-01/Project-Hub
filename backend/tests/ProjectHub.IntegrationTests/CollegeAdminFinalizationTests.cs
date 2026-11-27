using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using ProjectHub.Api.Controllers;
using ProjectHub.Application.Common.Models;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
using ProjectHub.Infrastructure.Security;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class CollegeAdminFinalizationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public CollegeAdminFinalizationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private static string GenerateToken(Guid userId, Guid collegeId, UserRole role)
    {
        var secret = "ProjectHubSuperSecretDevKeyMinLength32CharactersRequired!";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new("sub", userId.ToString()),
            new("user_id", userId.ToString()),
            new(ClaimTypes.Email, "college.admin@sistec.ac.in"),
            new(ClaimTypes.Role, role.ToString()),
            new("role", role.ToString()),
            new("college_id", collegeId.ToString()),
        };

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
    public async Task Overview_ReturnsRealOperationalKpis_ExcludesInactiveUsers_AndIsolatesTenant()
    {
        var collegeId = Guid.NewGuid();
        var otherCollegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var deptCseId = Guid.NewGuid();
        var deptEceId = Guid.NewGuid();
        var progId = Guid.NewGuid();
        var hodUserId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var college = new CollegeTenant
            {
                Id = collegeId,
                Name = "SISTec Test College",
                TenantCode = $"SISTEC_{Guid.NewGuid():N}"[..12],
                SsoDomain = $"sistec-{Guid.NewGuid():N}.ac.in",
                AffiliatingUniversity = "RGPV, Bhopal",
                CampusAddress = "Bhopal, MP",
                CampusesCsv = "Main Campus",
                IsActive = true,
                MaxStudentSeats = 1000,
                StorageQuotaGb = 50,
                CreatedAtUtc = DateTime.UtcNow
            };
            var otherCollege = new CollegeTenant
            {
                Id = otherCollegeId,
                Name = "Other Secret College",
                TenantCode = $"OTHER_{Guid.NewGuid():N}"[..12],
                SsoDomain = $"other-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.CollegeTenants.AddRange(college, otherCollege);

            var session = new AcademicSession
            {
                CollegeId = collegeId,
                Label = "2026-2027",
                StartDate = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2027, 6, 30, 23, 59, 59, DateTimeKind.Utc),
                IsActive = true
            };
            db.AcademicSessions.Add(session);

            var program = new CourseProgram
            {
                Id = progId,
                CollegeId = collegeId,
                Code = "BTECH",
                Name = "Bachelor of Technology",
                Level = AcademicProgramLevel.UG,
                TotalSemesters = 8,
                IsActive = true
            };
            db.CoursePrograms.Add(program);

            var deptCse = new Department
            {
                Id = deptCseId,
                CollegeId = collegeId,
                CourseProgramId = progId,
                Code = "CSE",
                Name = "Computer Science and Engineering",
                HodUserId = hodUserId,
                IntakeQuota = 120,
            };
            var deptEce = new Department
            {
                Id = deptEceId,
                CollegeId = collegeId,
                CourseProgramId = progId,
                Code = "ECE",
                Name = "Electronics Engineering",
                IntakeQuota = 60,
            };
            db.Departments.AddRange(deptCse, deptEce);

            db.SemesterTerms.Add(new SemesterTerm
            {
                CollegeId = collegeId,
                DepartmentId = deptCseId,
                AcademicSessionId = session.Id,
                SemesterNumber = 6,
                SemesterName = "Semester 6",
                Parity = SemesterParity.Even,
                IsActive = true
            });

            db.Users.AddRange(
                new UserAccount
                {
                    Id = hodUserId,
                    CollegeId = collegeId,
                    DepartmentId = deptCseId,
                    FullName = "Dr. Active HOD",
                    Email = $"hod.{Guid.NewGuid():N}@sistec.ac.in",
                    PasswordHash = "hash",
                    Role = UserRole.HOD,
                    Designation = FacultyDesignation.Professor,
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow
                },
                new UserAccount
                {
                    Id = Guid.NewGuid(),
                    CollegeId = collegeId,
                    DepartmentId = deptCseId,
                    FullName = "Prof. Inactive Faculty",
                    Email = $"inactive.fac.{Guid.NewGuid():N}@sistec.ac.in",
                    PasswordHash = "hash",
                    Role = UserRole.Faculty,
                    IsActive = false,
                    CreatedAtUtc = DateTime.UtcNow
                },
                new UserAccount
                {
                    Id = Guid.NewGuid(),
                    CollegeId = collegeId,
                    DepartmentId = deptCseId,
                    FullName = "Active Student",
                    Email = $"student.{Guid.NewGuid():N}@sistec.ac.in",
                    PasswordHash = "hash",
                    Role = UserRole.Student,
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow
                },
                new UserAccount
                {
                    Id = Guid.NewGuid(),
                    CollegeId = collegeId,
                    DepartmentId = deptCseId,
                    FullName = "Inactive Student",
                    Email = $"inactive.student.{Guid.NewGuid():N}@sistec.ac.in",
                    PasswordHash = "hash",
                    Role = UserRole.Student,
                    IsActive = false,
                    CreatedAtUtc = DateTime.UtcNow
                },
                new UserAccount
                {
                    Id = Guid.NewGuid(),
                    CollegeId = otherCollegeId,
                    FullName = "Other Tenant Student",
                    Email = $"other.student.{Guid.NewGuid():N}@other.ac.in",
                    PasswordHash = "hash",
                    Role = UserRole.Student,
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow
                }
            );

            db.PlatformAuditLogs.AddRange(
                new PlatformAuditLog
                {
                    ActorEmail = "admin@sistec.ac.in",
                    Action = "APPOINT_HOD",
                    TargetTenantId = collegeId,
                    TargetEntity = "CSE",
                    OccurredAtUtc = DateTime.UtcNow
                },
                new PlatformAuditLog
                {
                    ActorEmail = "secret@other.ac.in",
                    Action = "APPOINT_HOD",
                    TargetTenantId = otherCollegeId,
                    TargetEntity = "OTHER_SECRET_DEPT",
                    OccurredAtUtc = DateTime.UtcNow
                }
            );

            await db.SaveChangesAsync();
        }

        var token = GenerateToken(adminId, collegeId, UserRole.CollegeAdmin);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync("/api/college/overview");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var overview = await response.Content.ReadFromJsonAsync<CollegeOverviewDto>();
        Assert.NotNull(overview);
        Assert.Equal(1, overview.TotalStudents);
        Assert.Equal(1, overview.TotalFaculty);
        Assert.Equal(2, overview.TotalDepartments);
        Assert.Equal(1, overview.AppointedHodsCount);
        Assert.Equal(1, overview.VacantDepartmentsCount);
        Assert.Equal("2026-2027", overview.ActiveSession?.Label);
        Assert.Equal("Semester 6", overview.CurrentSemesterLabel);
        Assert.Equal("RGPV, Bhopal", overview.AffiliatedUniversity);
        Assert.Equal("Bhopal, MP", overview.CampusAddress);
        Assert.Equal("1 Campus", overview.CampusesSummary);

        // Operational action item for vacant ECE department
        Assert.Contains(overview.OperationalActionItems, a => a.Key == "hod-vacancies" && a.Count == 1);

        // Tenant-isolated audit trail
        Assert.Single(overview.RecentActivities);
        Assert.Equal("admin@sistec.ac.in", overview.RecentActivities[0].Actor);
        Assert.DoesNotContain(overview.RecentActivities, a => a.TargetEntity == "OTHER_SECRET_DEPT");
    }

    [Fact]
    public async Task ResetStaffPassword_Enforces_ZeroAdminOtp_And_SetsSecureHash()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var user = new UserAccount
            {
                Id = targetUserId,
                CollegeId = collegeId,
                FullName = "Faculty Member",
                Email = $"faculty.{Guid.NewGuid():N}@sistec.ac.in",
                PasswordHash = "old_hash",
                Role = UserRole.Faculty,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        var token = GenerateToken(adminId, collegeId, UserRole.CollegeAdmin);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.PostAsync($"/api/college/users/{targetUserId}/reset-password", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadFromJsonAsync<ResetPasswordResponseDto>();
        Assert.NotNull(result);
        Assert.True(result.EmailDispatched);
        Assert.True(result.ExpiresAtUtc > DateTime.UtcNow);
        Assert.True(result.ExpiresAtUtc <= DateTime.UtcNow.AddMinutes(16));

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var updatedUser = await db.Users.FindAsync(targetUserId);
            Assert.NotNull(updatedUser);
            Assert.NotNull(updatedUser.PasswordResetOtpHashed);
            Assert.NotNull(updatedUser.PasswordResetOtpExpiresAtUtc);
        }
    }

    [Fact]
    public async Task BulkUploadStaff_CreatesStaff_WithDesignations_Transactionally()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var deptId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var dept = new Department
            {
                Id = deptId,
                CollegeId = collegeId,
                Code = "IT",
                Name = "Information Technology",
                IntakeQuota = 60,
            };
            db.Departments.Add(dept);
            await db.SaveChangesAsync();
        }

        var token = GenerateToken(adminId, collegeId, UserRole.CollegeAdmin);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var email1 = $"prof.{Guid.NewGuid():N}@sistec.ac.in";
        var email2 = $"assoc.{Guid.NewGuid():N}@sistec.ac.in";

        var payload = new BulkStaffUploadRequest
        {
            CsvHeaders = new List<string> { "FullName", "Email", "DepartmentCode", "Designation" },
            StaffRows = new List<BulkStaffUploadRowDto>
            {
                new()
                {
                    FullName = "Prof. Alice Smith",
                    Email = email1,
                    DepartmentCode = "IT",
                    Designation = "Professor"
                },
                new()
                {
                    FullName = "Dr. Bob Jones",
                    Email = email2,
                    DepartmentCode = "IT",
                    Designation = "AssociateProfessor"
                }
            }
        };

        var response = await _client.PostAsJsonAsync("/api/college/users/bulk", payload);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadFromJsonAsync<BulkStaffUploadResultDto>();
        Assert.NotNull(result);
        Assert.Equal(2, result.TotalSubmitted);
        Assert.Equal(2, result.SuccessfullyCreated);
        Assert.Equal(0, result.FailedCount);

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var user1 = await db.Users.FirstOrDefaultAsync(u => u.Email == email1.ToLowerInvariant());
            var user2 = await db.Users.FirstOrDefaultAsync(u => u.Email == email2.ToLowerInvariant());

            Assert.NotNull(user1);
            Assert.Equal(FacultyDesignation.Professor, user1.Designation);
            Assert.Equal(collegeId, user1.CollegeId);

            Assert.NotNull(user2);
            Assert.Equal(FacultyDesignation.AssociateProfessor, user2.Designation);
            Assert.Equal(collegeId, user2.CollegeId);
        }
    }

    [Fact]
    public async Task TabulationRegister_LoadsContinuousWeights_And_CertifiesWithAuditTrail()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var deptId = Guid.NewGuid();
        var trackId = Guid.NewGuid();
        var teamId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var dept = new Department
            {
                Id = deptId,
                CollegeId = collegeId,
                Code = "MECH",
                Name = "Mechanical Engineering",
                IntakeQuota = 60,
            };
            db.Departments.Add(dept);

            var track = new AcademicTrack
            {
                Id = trackId,
                CollegeId = collegeId,
                DepartmentId = deptId,
                Name = "Major Capstone 2026",
                AcademicYear = "2026-2027",
                GuideWeightPct = 30,
                MidTermWeightPct = 30,
                FinalVivaWeightPct = 40,
                IsActive = true
            };
            db.AcademicTracks.Add(track);

            var team = new ProjectTeam
            {
                Id = teamId,
                CollegeId = collegeId,
                DepartmentId = deptId,
                AcademicTrackId = trackId,
                TeamCode = "MECH-01",
                Title = "Solar Powered Hybrid Engine",
                Status = ProjectStatus.Completed
            };
            db.ProjectTeams.Add(team);

            var student = new UserAccount
            {
                Id = studentId,
                CollegeId = collegeId,
                DepartmentId = deptId,
                FullName = "Rahul Sharma",
                Email = $"student.{Guid.NewGuid():N}@sistec.ac.in",
                PasswordHash = "hash",
                Role = UserRole.Student,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Users.Add(student);

            var member = new TeamMember
            {
                CollegeId = collegeId,
                ProjectTeamId = teamId,
                UserId = studentId,
                IsTeamLead = true,
                JoinedAtUtc = DateTime.UtcNow
            };
            db.TeamMembers.Add(member);

            // Add Evaluation
            var eval = new VivaEvaluation
            {
                Id = Guid.NewGuid(),
                CollegeId = collegeId,
                ProjectTeamId = teamId,
                EvaluatorUserId = adminId,
                CheckpointType = CheckpointType.FinalViva,
                SharedRubricScoresJson = "{}",
                SharedTotalScore = 85,
                IndividualScores = new List<IndividualStudentScore>
                {
                    new()
                    {
                        Id = Guid.NewGuid(),
                        StudentUserId = studentId,
                        IndividualTotalScore = 88
                    }
                }
            };
            db.VivaEvaluations.Add(eval);

            await db.SaveChangesAsync();
        }

        var token = GenerateToken(adminId, collegeId, UserRole.CollegeAdmin);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // 1. Fetch Register
        var response = await _client.GetAsync("/api/college/results");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var reg = await response.Content.ReadFromJsonAsync<ExaminationTabulationRegisterDto>();
        Assert.NotNull(reg);
        Assert.Equal(30, reg.GuideWeightPct);
        Assert.Equal(30, reg.MidTermWeightPct);
        Assert.Equal(40, reg.FinalVivaWeightPct);
        Assert.True(reg.Rows.Count > 0);

        var studentRow = reg.Rows.FirstOrDefault(r => r.StudentName == "Rahul Sharma");
        Assert.NotNull(studentRow);
        Assert.Equal("A", studentRow.Grade);
        Assert.Equal(9, studentRow.GradePoints);
        Assert.Equal(25.9m, studentRow.GuideScore);
        Assert.Equal(25.8m, studentRow.MidTermScore);
        Assert.Equal(34.6m, studentRow.FinalVivaScore);
        Assert.Equal(86.3m, studentRow.TotalScore);
        Assert.InRange(studentRow.TotalScore, 0m, 100m);
        Assert.True(studentRow.GuideScore <= reg.GuideWeightPct);
        Assert.True(studentRow.MidTermScore <= reg.MidTermWeightPct);
        Assert.True(studentRow.FinalVivaScore <= reg.FinalVivaWeightPct);

        // 2. Certify Register
        var certifyPayload = new CertifyExaminationRegisterRequest
        {
            Remarks = "Officially certified for university tabulation submission."
        };

        var certifyResponse = await _client.PostAsJsonAsync("/api/college/results/certify", certifyPayload);
        Assert.Equal(HttpStatusCode.OK, certifyResponse.StatusCode);

        // Verify PlatformAuditLog was created with SHA256 checksum
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var auditLog = await db.PlatformAuditLogs
                .Where(a => a.Action == "CERTIFY_EXAMINATION_REGISTER" && a.TargetTenantId == collegeId)
                .OrderByDescending(a => a.OccurredAtUtc)
                .FirstOrDefaultAsync();

            Assert.NotNull(auditLog);
            Assert.Contains("Checksum", auditLog.MetadataJson ?? "");
        }
    }

    [Fact]
    public async Task BulkUploadStaff_WhenRowInvalid_RollsBackAllRowsAndPersistsZero()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var deptId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var college = new CollegeTenant
            {
                Id = collegeId,
                Name = "SISTec Test College Rollback",
                TenantCode = "SISTEC_RB",
                SsoDomain = $"sistec-rb-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 1000,
                StorageQuotaGb = 50,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.CollegeTenants.Add(college);

            var dept = new Department
            {
                Id = deptId,
                CollegeId = collegeId,
                Code = "CSE",
                Name = "Computer Science",
                IntakeQuota = 120
            };
            db.Departments.Add(dept);

            var admin = new UserAccount
            {
                Id = adminId,
                CollegeId = collegeId,
                Email = $"admin.rb.{Guid.NewGuid():N}@sistec.ac.in",
                FullName = "Admin Rollback Test",
                Role = UserRole.CollegeAdmin,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Users.Add(admin);

            await db.SaveChangesAsync();
        }

        var token = GenerateToken(adminId, collegeId, UserRole.CollegeAdmin);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var invalidPayload = new BulkStaffUploadRequest
        {
            CsvHeaders = new List<string> { "FullName", "Email", "DepartmentCode", "Designation" },
            StaffRows = new List<BulkStaffUploadRowDto>
            {
                new()
                {
                    FullName = "Valid Staff Person",
                    Email = $"valid.staff.{Guid.NewGuid():N}@sistec.ac.in",
                    DepartmentCode = "CSE",
                    Designation = "AssistantProfessor"
                },
                new()
                {
                    FullName = "Invalid Email Person",
                    Email = "invalid-email-without-at",
                    DepartmentCode = "CSE",
                    Designation = "Professor"
                }
            }
        };

        var response = await _client.PostAsJsonAsync("/api/college/users/bulk", invalidPayload);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        // Verify atomic rollback: Valid Staff Person was NOT persisted in database
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var createdUsers = await db.Users.Where(u => u.CollegeId == collegeId && u.Id != adminId).ToListAsync();
            Assert.Empty(createdUsers);
        }
    }

    [Fact]
    public async Task Overview_ZeroDataAndEmptyConfiguration_ReturnsNullSessionAndActionItems()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "Fresh Unconfigured College",
                TenantCode = $"FRESH_{Guid.NewGuid():N}"[..12],
                SsoDomain = $"fresh-{Guid.NewGuid():N}.ac.in",
                AffiliatingUniversity = null,
                CampusAddress = null,
                CampusesCsv = null,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminId, collegeId, UserRole.CollegeAdmin));
        var response = await _client.GetAsync("/api/college/overview");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var overview = await response.Content.ReadFromJsonAsync<CollegeOverviewDto>();
        Assert.NotNull(overview);
        Assert.Null(overview.ActiveSession);
        Assert.Null(overview.CurrentSemesterLabel);
        Assert.Null(overview.AffiliatedUniversity);
        Assert.Null(overview.CampusAddress);
        Assert.Null(overview.CampusesSummary);
        Assert.Equal(0, overview.TotalStudents);
        Assert.Equal(0, overview.TotalFaculty);
        Assert.Equal(0, overview.TotalDepartments);
        Assert.Equal(0, overview.AppointedHodsCount);
        Assert.Equal(0, overview.VacantDepartmentsCount);
        Assert.Contains(overview.OperationalActionItems, a => a.Key == "missing-academic-session");
        Assert.Contains(overview.OperationalActionItems, a => a.Key == "incomplete-academic-structure");
        Assert.Contains(overview.OperationalActionItems, a => a.Key == "incomplete-institution-profile");
    }

    [Fact]
    public async Task Overview_AllConfiguredAndHodsAppointed_ReturnsEmptyActionItems()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var progId = Guid.NewGuid();
        var deptId = Guid.NewGuid();
        var hodId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "Configured College",
                TenantCode = $"CONF_{Guid.NewGuid():N}"[..12],
                SsoDomain = $"conf-{Guid.NewGuid():N}.ac.in",
                AffiliatingUniversity = "RGPV",
                CampusAddress = "Campus Road",
                CampusesCsv = "Main Campus",
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.AcademicSessions.Add(new AcademicSession
            {
                CollegeId = collegeId,
                Label = "2026-2027",
                StartDate = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2027, 6, 30, 23, 59, 59, DateTimeKind.Utc),
                IsActive = true
            });
            db.CoursePrograms.Add(new CourseProgram
            {
                Id = progId,
                CollegeId = collegeId,
                Code = "BTECH",
                Name = "B.Tech",
                Level = AcademicProgramLevel.UG,
                TotalSemesters = 8,
                IsActive = true
            });
            db.Departments.Add(new Department
            {
                Id = deptId,
                CollegeId = collegeId,
                CourseProgramId = progId,
                Code = "CSE",
                Name = "Computer Science",
                HodUserId = hodId,
                IntakeQuota = 120
            });
            db.Users.Add(new UserAccount
            {
                Id = hodId,
                CollegeId = collegeId,
                DepartmentId = deptId,
                FullName = "Dr. Configured HOD",
                Email = $"hod.{Guid.NewGuid():N}@conf.ac.in",
                Role = UserRole.HOD,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminId, collegeId, UserRole.CollegeAdmin));
        var response = await _client.GetAsync("/api/college/overview");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var overview = await response.Content.ReadFromJsonAsync<CollegeOverviewDto>();
        Assert.NotNull(overview);
        Assert.Empty(overview.OperationalActionItems);
        Assert.Equal(1, overview.AppointedHodsCount);
        Assert.Equal(0, overview.VacantDepartmentsCount);
    }

    [Fact]
    public async Task Auth_PasswordResetOtp_Max5Attempts_EnforcesLockout()
    {
        var collegeId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        var email = $"locked.user.{Guid.NewGuid():N}@test.ac.in";
        var rawOtp = "123456";

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var college = new CollegeTenant
            {
                Id = collegeId,
                Name = "Lockout College",
                TenantCode = "LOCK_COL",
                SsoDomain = $"lock-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 100,
                StorageQuotaGb = 5,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.CollegeTenants.Add(college);

            var user = new UserAccount
            {
                Id = targetUserId,
                CollegeId = collegeId,
                Email = email,
                FullName = "Lockout Candidate",
                Role = UserRole.Faculty,
                IsActive = true,
                PasswordResetOtpHashed = PasswordHelper.HashPassword(rawOtp),
                PasswordResetOtpExpiresAtUtc = DateTime.UtcNow.AddMinutes(15),
                PasswordResetOtpAttempts = 0,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        // Send 4 wrong attempts - each should return 400 Bad Request with remaining attempts
        for (int i = 1; i <= 4; i++)
        {
            var wrongResponse = await _client.PostAsJsonAsync("/api/auth/reset-password", new
            {
                email = email,
                otp = "000000",
                newPassword = "NewStrongPassword123!"
            });
            Assert.Equal(HttpStatusCode.BadRequest, wrongResponse.StatusCode);
        }

        // 5th wrong attempt should trigger lockout
        var fifthResponse = await _client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            email = email,
            otp = "000000",
            newPassword = "NewStrongPassword123!"
        });
        Assert.Equal(HttpStatusCode.BadRequest, fifthResponse.StatusCode);
        var fifthBody = await fifthResponse.Content.ReadAsStringAsync();
        Assert.Contains("Maximum verification attempts exceeded", fifthBody);

        // Even with the CORRECT OTP on 6th attempt, it must be rejected because OTP was invalidated
        var sixthResponse = await _client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            email = email,
            otp = rawOtp,
            newPassword = "NewStrongPassword123!"
        });
        Assert.Equal(HttpStatusCode.BadRequest, sixthResponse.StatusCode);
    }

    [Fact]
    public async Task Auth_PasswordResetOtp_ExpiresIn15Minutes_RejectsStaleOtp()
    {
        var collegeId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        var email = $"stale.user.{Guid.NewGuid():N}@test.ac.in";
        var rawOtp = "654321";

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var college = new CollegeTenant
            {
                Id = collegeId,
                Name = "Stale College",
                TenantCode = "STALE_COL",
                SsoDomain = $"stale-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 100,
                StorageQuotaGb = 5,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.CollegeTenants.Add(college);

            var user = new UserAccount
            {
                Id = targetUserId,
                CollegeId = collegeId,
                Email = email,
                FullName = "Stale Candidate",
                Role = UserRole.Faculty,
                IsActive = true,
                PasswordResetOtpHashed = PasswordHelper.HashPassword(rawOtp),
                // Expired 1 minute ago
                PasswordResetOtpExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1),
                PasswordResetOtpAttempts = 0,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        var response = await _client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            email = email,
            otp = rawOtp,
            newPassword = "NewStrongPassword123!"
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("expired", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Auth_RequestPasswordOtp_AntiEnumeration_ReturnsGenericSuccess()
    {
        var nonExistentEmail = $"unregistered.{Guid.NewGuid():N}@unknown.ac.in";

        var response = await _client.PostAsJsonAsync("/api/auth/request-password-otp", new
        {
            email = nonExistentEmail
        });

        // Anti-enumeration: must return 200 OK
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RequestPasswordOtpResponse>();
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Contains("verification code has been dispatched", result.Message);
        Assert.Null(result.DevOtp);
    }

    [Fact]
    public async Task StaffManagement_CannotAssignSuperAdminRole_ReturnsBadRequest()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var staffId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var college = new CollegeTenant
            {
                Id = collegeId,
                Name = "SISTec SuperAdmin Guard College",
                TenantCode = "SISTEC_SAG",
                SsoDomain = $"sag-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.CollegeTenants.Add(college);

            var admin = new UserAccount
            {
                Id = adminId,
                CollegeId = collegeId,
                Email = $"admin.sag.{Guid.NewGuid():N}@sistec.ac.in",
                FullName = "Admin SAG Test",
                Role = UserRole.CollegeAdmin,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Users.Add(admin);

            var staff = new UserAccount
            {
                Id = staffId,
                CollegeId = collegeId,
                Email = $"staff.sag.{Guid.NewGuid():N}@sistec.ac.in",
                FullName = "Staff SAG Test",
                Role = UserRole.Faculty,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Users.Add(staff);

            await db.SaveChangesAsync();
        }

        var token = GenerateToken(adminId, collegeId, UserRole.CollegeAdmin);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // 1. Create staff with SuperAdmin role must fail
        var createRes = await _client.PostAsJsonAsync("/api/college/users", new
        {
            fullName = "Malicious Escalated User",
            email = $"malicious.{Guid.NewGuid():N}@sistec.ac.in",
            role = UserRole.SuperAdmin
        });
        Assert.Equal(HttpStatusCode.BadRequest, createRes.StatusCode);
        var createBody = await createRes.Content.ReadAsStringAsync();
        Assert.Contains("SuperAdmin", createBody);

        // 2. Update staff with SuperAdmin role must fail
        var updateRes = await _client.PutAsJsonAsync($"/api/college/users/{staffId}", new
        {
            role = UserRole.SuperAdmin
        });
        Assert.Equal(HttpStatusCode.BadRequest, updateRes.StatusCode);
        var updateBody = await updateRes.Content.ReadAsStringAsync();
        Assert.Contains("SuperAdmin", updateBody);

        // 3. Bulk upload staff with legacy Role header must fail
        var bulkRes = await _client.PostAsJsonAsync("/api/college/users/bulk", new
        {
            csvHeaders = new[] { "FullName", "Email", "Role", "DepartmentCode", "Designation" },
            staffRows = new[]
            {
                new
                {
                    fullName = "Bulk Escalated User",
                    email = $"bulk.malicious.{Guid.NewGuid():N}@sistec.ac.in",
                    departmentCode = "CSE",
                    designation = "Professor"
                }
            }
        });
        Assert.Equal(HttpStatusCode.BadRequest, bulkRes.StatusCode);
        var bulkBody = await bulkRes.Content.ReadAsStringAsync();
        Assert.Contains("Legacy header 'Role'", bulkBody);
    }

    [Fact]
    public async Task BulkUploadStaff_RejectsLegacyRoleHeader_WithoutPersistingAnyRows()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var deptId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "CSV Role Guard College",
                TenantCode = $"CRG_{Guid.NewGuid():N}"[..12],
                SsoDomain = $"crg-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.Departments.Add(new Department
            {
                Id = deptId,
                CollegeId = collegeId,
                Code = "CSE",
                Name = "Computer Science",
                IntakeQuota = 120,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.Users.Add(new UserAccount
            {
                Id = adminId,
                CollegeId = collegeId,
                Email = $"admin.{Guid.NewGuid():N}@crg.ac.in",
                FullName = "Admin",
                Role = UserRole.CollegeAdmin,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminId, collegeId, UserRole.CollegeAdmin));
        var bulkRes = await _client.PostAsJsonAsync("/api/college/users/bulk", new
        {
            csvHeaders = new[] { "FullName", "Email", "Role", "DepartmentCode", "Designation" },
            staffRows = new[]
            {
                new
                {
                    fullName = "Valid Faculty",
                    email = $"valid.{Guid.NewGuid():N}@crg.ac.in",
                    departmentCode = "CSE",
                    designation = "Professor"
                }
            }
        });

        Assert.Equal(HttpStatusCode.BadRequest, bulkRes.StatusCode);
        var body = await bulkRes.Content.ReadAsStringAsync();
        Assert.Contains("HOD appointments must be performed via Department Leadership", body);

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var created = await db.Users.Where(u => u.CollegeId == collegeId && u.Id != adminId).ToListAsync();
            Assert.Empty(created);
        }
    }

    [Fact]
    public async Task BulkUploadStaff_UpdatesExistingSameTenantFaculty_PreservesIdAndCredentials_AndRecordsAudit()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var deptCseId = Guid.NewGuid();
        var deptEceId = Guid.NewGuid();
        var existingFacultyId = Guid.NewGuid();
        var ssoDomain = $"ruc-{Guid.NewGuid():N}.ac.in";
        var existingEmail = $"faculty.{Guid.NewGuid():N}@{ssoDomain}";
        var newEmail = $"new.faculty.{Guid.NewGuid():N}@{ssoDomain}";

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "Roster Update College",
                TenantCode = $"RUC_{Guid.NewGuid():N}"[..12],
                SsoDomain = ssoDomain,
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.Departments.AddRange(
                new Department { Id = deptCseId, CollegeId = collegeId, Code = "CSE", Name = "Computer Science", IntakeQuota = 120, CreatedAtUtc = DateTime.UtcNow },
                new Department { Id = deptEceId, CollegeId = collegeId, Code = "ECE", Name = "Electronics", IntakeQuota = 60, CreatedAtUtc = DateTime.UtcNow }
            );
            db.Users.AddRange(
                new UserAccount { Id = adminId, CollegeId = collegeId, Email = $"admin.{Guid.NewGuid():N}@ruc.ac.in", FullName = "Admin", Role = UserRole.CollegeAdmin, IsActive = true, CreatedAtUtc = DateTime.UtcNow },
                new UserAccount
                {
                    Id = existingFacultyId,
                    CollegeId = collegeId,
                    DepartmentId = deptCseId,
                    Email = existingEmail,
                    FullName = "Old Name",
                    EnrollmentOrEmployeeCode = "EMP-KEEP-01",
                    PasswordHash = "KEEP_HASH",
                    Role = UserRole.Faculty,
                    Designation = FacultyDesignation.AssistantProfessor,
                    IsActive = true,
                    IsActivated = true,
                    CreatedAtUtc = DateTime.UtcNow
                }
            );
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminId, collegeId, UserRole.CollegeAdmin));
        var payload = new BulkStaffUploadRequest
        {
            CsvHeaders = new List<string> { "FullName", "Email", "DepartmentCode", "Designation" },
            StaffRows = new List<BulkStaffUploadRowDto>
            {
                new() { FullName = "Dr. Updated Name", Email = $"  {existingEmail.ToUpperInvariant()} ", DepartmentCode = "ECE", Designation = "AssociateProfessor" },
                new() { FullName = "Prof. Brand New", Email = newEmail, DepartmentCode = "CSE", Designation = "Professor" }
            }
        };

        var res = await _client.PostAsJsonAsync("/api/college/users/bulk", payload);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var result = await res.Content.ReadFromJsonAsync<BulkStaffUploadResultDto>();
        Assert.NotNull(result);
        Assert.Equal(1, result.SuccessfullyCreated);
        Assert.Equal(1, result.SuccessfullyUpdated);
        Assert.Equal(0, result.FailedCount);

        // Repeat identical import: must remain idempotent with 0 new duplicates
        var repeatRes = await _client.PostAsJsonAsync("/api/college/users/bulk", payload);
        Assert.Equal(HttpStatusCode.OK, repeatRes.StatusCode);
        var repeatResult = await repeatRes.Content.ReadFromJsonAsync<BulkStaffUploadResultDto>();
        Assert.NotNull(repeatResult);
        Assert.Equal(0, repeatResult.SuccessfullyCreated);
        Assert.Equal(2, repeatResult.SuccessfullyUpdated);

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var updated = await db.Users.FirstAsync(u => u.Id == existingFacultyId);
            Assert.Equal("Dr. Updated Name", updated.FullName);
            Assert.Equal(deptEceId, updated.DepartmentId);
            Assert.Equal(FacultyDesignation.AssociateProfessor, updated.Designation);
            Assert.Equal(UserRole.Faculty, updated.Role);
            Assert.Equal("EMP-KEEP-01", updated.EnrollmentOrEmployeeCode);
            Assert.Equal("KEEP_HASH", updated.PasswordHash);

            var matchingCount = await db.Users.CountAsync(u => u.CollegeId == collegeId && u.Email == newEmail);
            Assert.Equal(1, matchingCount);

            var hodHistoryCount = await db.HodAppointmentHistories.CountAsync(h => h.CollegeId == collegeId);
            Assert.Equal(0, hodHistoryCount);

            var auditCount = await db.PlatformAuditLogs.CountAsync(a => a.TargetTenantId == collegeId && a.Action == "BULK_ROSTER_IMPORT");
            Assert.Equal(2, auditCount);
        }
    }

    [Fact]
    public async Task BulkUploadStaff_RejectsProtectedRoles_CrossTenantEmails_AndInvalidInputs()
    {
        var collegeAId = Guid.NewGuid();
        var collegeBId = Guid.NewGuid();
        var adminAId = Guid.NewGuid();
        var deptAId = Guid.NewGuid();
        var hodEmail = $"hod.{Guid.NewGuid():N}@colA.ac.in";
        var crossTenantEmail = $"fac.{Guid.NewGuid():N}@colB.ac.in";

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            db.CollegeTenants.AddRange(
                new CollegeTenant { Id = collegeAId, Name = "College A", TenantCode = $"CA_{Guid.NewGuid():N}"[..12], SsoDomain = $"ca-{Guid.NewGuid():N}.ac.in", EnforceStrictSso = false, IsActive = true, MaxStudentSeats = 500, StorageQuotaGb = 20, CreatedAtUtc = DateTime.UtcNow },
                new CollegeTenant { Id = collegeBId, Name = "College B Secret", TenantCode = $"CB_{Guid.NewGuid():N}"[..12], SsoDomain = $"cb-{Guid.NewGuid():N}.ac.in", EnforceStrictSso = false, IsActive = true, MaxStudentSeats = 500, StorageQuotaGb = 20, CreatedAtUtc = DateTime.UtcNow }
            );
            db.Departments.Add(new Department { Id = deptAId, CollegeId = collegeAId, Code = "CSE", Name = "Computer Science", IntakeQuota = 120, CreatedAtUtc = DateTime.UtcNow });
            db.Users.AddRange(
                new UserAccount { Id = adminAId, CollegeId = collegeAId, Email = $"admin.{Guid.NewGuid():N}@colA.ac.in", FullName = "Admin A", Role = UserRole.CollegeAdmin, IsActive = true, CreatedAtUtc = DateTime.UtcNow },
                new UserAccount { Id = Guid.NewGuid(), CollegeId = collegeAId, DepartmentId = deptAId, Email = hodEmail, FullName = "Protected HOD", Role = UserRole.HOD, IsActive = true, CreatedAtUtc = DateTime.UtcNow },
                new UserAccount { Id = Guid.NewGuid(), CollegeId = collegeBId, Email = crossTenantEmail, FullName = "Other Tenant User", Role = UserRole.Faculty, IsActive = true, CreatedAtUtc = DateTime.UtcNow }
            );
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminAId, collegeAId, UserRole.CollegeAdmin));
        var res = await _client.PostAsJsonAsync("/api/college/users/bulk", new BulkStaffUploadRequest
        {
            CsvHeaders = new List<string> { "FullName", "Email", "DepartmentCode", "Designation" },
            StaffRows = new List<BulkStaffUploadRowDto>
            {
                new() { FullName = "Overwrite HOD", Email = hodEmail, DepartmentCode = "CSE", Designation = "Professor" },
                new() { FullName = "Steal Cross Tenant", Email = crossTenantEmail, DepartmentCode = "CSE", Designation = "Professor" },
                new() { FullName = "Bad Desig", Email = $"bad.{Guid.NewGuid():N}@colA.ac.in", DepartmentCode = "CSE", Designation = "InvalidTitle" },
                new() { FullName = "Bad Dept", Email = $"nodept.{Guid.NewGuid():N}@colA.ac.in", DepartmentCode = "NOPE", Designation = "Professor" }
            }
        });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var body = await res.Content.ReadAsStringAsync();
        Assert.DoesNotContain("College B Secret", body);
        Assert.Contains("protected or incompatible role", body);
        Assert.Contains("conflicts with an existing platform account", body);
    }

    [Fact]
    public async Task StaffManagement_CannotDeactivateDemoteOrDelete_LastActiveCollegeAdmin()
    {
        var collegeId = Guid.NewGuid();
        var admin1Id = Guid.NewGuid();
        var admin2Id = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "Last Admin Guard College",
                TenantCode = $"LAG_{Guid.NewGuid():N}"[..12],
                SsoDomain = $"lag-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.Users.AddRange(
                new UserAccount
                {
                    Id = admin1Id,
                    CollegeId = collegeId,
                    Email = $"admin1.{Guid.NewGuid():N}@lag.ac.in",
                    FullName = "Admin One",
                    Role = UserRole.CollegeAdmin,
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow
                },
                new UserAccount
                {
                    Id = admin2Id,
                    CollegeId = collegeId,
                    Email = $"admin2.{Guid.NewGuid():N}@lag.ac.in",
                    FullName = "Admin Two",
                    Role = UserRole.CollegeAdmin,
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow
                });
            await db.SaveChangesAsync();
        }

        // Admin 1 can deactivate Admin 2 when 2 active CollegeAdmins exist
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(admin1Id, collegeId, UserRole.CollegeAdmin));
        var deactivateSecondRes = await _client.PutAsJsonAsync($"/api/college/users/{admin2Id}/status", new { isActive = false });
        Assert.Equal(HttpStatusCode.OK, deactivateSecondRes.StatusCode);

        // Now Admin 1 is the last active CollegeAdmin: demoting Admin 1 via PUT /users/{id} must fail
        var demoteLastRes = await _client.PutAsJsonAsync($"/api/college/users/{admin1Id}", new
        {
            fullName = "Admin One",
            role = UserRole.Faculty
        });
        Assert.Equal(HttpStatusCode.BadRequest, demoteLastRes.StatusCode);
        var demoteBody = await demoteLastRes.Content.ReadAsStringAsync();
        Assert.Contains("last active College Admin", demoteBody);

        // Self-deactivation and self-deletion remain blocked; also verify via a second caller identity
        var otherCallerToken = GenerateToken(Guid.NewGuid(), collegeId, UserRole.CollegeAdmin);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", otherCallerToken);

        var deactivateLastRes = await _client.PutAsJsonAsync($"/api/college/users/{admin1Id}/status", new { isActive = false });
        Assert.Equal(HttpStatusCode.BadRequest, deactivateLastRes.StatusCode);
        Assert.Contains("last active College Admin", await deactivateLastRes.Content.ReadAsStringAsync());

        var deleteLastRes = await _client.DeleteAsync($"/api/college/users/{admin1Id}");
        Assert.Equal(HttpStatusCode.BadRequest, deleteLastRes.StatusCode);
        Assert.Contains("last active College Admin", await deleteLastRes.Content.ReadAsStringAsync());

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var admin1 = await db.Users.FirstAsync(u => u.Id == admin1Id);
            Assert.True(admin1.IsActive);
            Assert.False(admin1.IsDeleted);
            Assert.Equal(UserRole.CollegeAdmin, admin1.Role);
        }
    }

    [Fact]
    public async Task StaffManagement_CannotDeleteSelf_ReturnsBadRequest()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var college = new CollegeTenant
            {
                Id = collegeId,
                Name = "SISTec Self Delete College",
                TenantCode = "SISTEC_SD",
                SsoDomain = $"sd-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.CollegeTenants.Add(college);

            var admin = new UserAccount
            {
                Id = adminId,
                CollegeId = collegeId,
                Email = $"admin.sd.{Guid.NewGuid():N}@sistec.ac.in",
                FullName = "Admin SD Test",
                Role = UserRole.CollegeAdmin,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Users.Add(admin);
            await db.SaveChangesAsync();
        }

        var token = GenerateToken(adminId, collegeId, UserRole.CollegeAdmin);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.DeleteAsync($"/api/college/users/{adminId}");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("delete their own active account", body);
    }

    [Fact]
    public async Task HodManagement_CannotAppointCrossTenantFaculty_ReturnsNotFound()
    {
        var collegeAId = Guid.NewGuid();
        var collegeBId = Guid.NewGuid();
        var adminAId = Guid.NewGuid();
        var deptAId = Guid.NewGuid();
        var facultyBId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var collegeA = new CollegeTenant
            {
                Id = collegeAId,
                Name = "SISTec College A",
                TenantCode = "SISTEC_A",
                SsoDomain = $"a-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            };
            var collegeB = new CollegeTenant
            {
                Id = collegeBId,
                Name = "SISTec College B",
                TenantCode = "SISTEC_B",
                SsoDomain = $"b-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.CollegeTenants.AddRange(collegeA, collegeB);

            var adminA = new UserAccount
            {
                Id = adminAId,
                CollegeId = collegeAId,
                Email = $"admin.a.{Guid.NewGuid():N}@sistec.ac.in",
                FullName = "Admin A",
                Role = UserRole.CollegeAdmin,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            var deptA = new Department
            {
                Id = deptAId,
                CollegeId = collegeAId,
                Code = "CSE",
                Name = "Computer Science",
                IntakeQuota = 120,
                CreatedAtUtc = DateTime.UtcNow
            };
            var facultyB = new UserAccount
            {
                Id = facultyBId,
                CollegeId = collegeBId,
                Email = $"faculty.b.{Guid.NewGuid():N}@othercollege.ac.in",
                FullName = "Faculty B",
                Role = UserRole.Faculty,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Users.AddRange(adminA, facultyB);
            db.Departments.Add(deptA);

            await db.SaveChangesAsync();
        }

        var token = GenerateToken(adminAId, collegeAId, UserRole.CollegeAdmin);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.PutAsJsonAsync($"/api/college/departments/{deptAId}/appoint-hod", new
        {
            hodUserId = facultyBId
        });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task AppointHod_Succeeds_ForValidDepartmentFaculty_AndRecordsHistory()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var deptId = Guid.NewGuid();
        var facultyId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "Appoint Success College",
                TenantCode = $"ASC_{Guid.NewGuid():N}"[..12],
                SsoDomain = $"asc-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.Departments.Add(new Department
            {
                Id = deptId,
                CollegeId = collegeId,
                Code = "CSE",
                Name = "Computer Science",
                IntakeQuota = 120,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.Users.AddRange(
                new UserAccount
                {
                    Id = adminId,
                    CollegeId = collegeId,
                    Email = $"admin.{Guid.NewGuid():N}@asc.ac.in",
                    FullName = "Principal Admin",
                    Role = UserRole.CollegeAdmin,
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow
                },
                new UserAccount
                {
                    Id = facultyId,
                    CollegeId = collegeId,
                    DepartmentId = deptId,
                    Email = $"fac.{Guid.NewGuid():N}@asc.ac.in",
                    FullName = "Dr. Eligible Faculty",
                    Role = UserRole.Faculty,
                    Designation = FacultyDesignation.Professor,
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow
                });
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminId, collegeId, UserRole.CollegeAdmin));
        var response = await _client.PutAsJsonAsync($"/api/college/departments/{deptId}/appoint-hod", new
        {
            hodUserId = facultyId
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var dept = await db.Departments.FirstAsync(d => d.Id == deptId);
            var user = await db.Users.FirstAsync(u => u.Id == facultyId);
            var history = await db.HodAppointmentHistories.FirstOrDefaultAsync(h => h.DepartmentId == deptId && h.HodUserId == facultyId && h.IsCurrent);

            Assert.Equal(facultyId, dept.HodUserId);
            Assert.Equal(UserRole.HOD, user.Role);
            Assert.NotNull(history);
        }
    }

    [Fact]
    public async Task AppointHod_RejectsUnauthorizedRole_ReturnsForbidden()
    {
        var collegeId = Guid.NewGuid();
        var facultyId = Guid.NewGuid();
        var deptId = Guid.NewGuid();

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(facultyId, collegeId, UserRole.Faculty));
        var response = await _client.PutAsJsonAsync($"/api/college/departments/{deptId}/appoint-hod", new
        {
            hodUserId = facultyId
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AppointHod_RejectsCrossDepartmentAndIneligibleCandidates_ReturnsBadRequest()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var deptAId = Guid.NewGuid();
        var deptBId = Guid.NewGuid();
        var otherDeptFacultyId = Guid.NewGuid();
        var inactiveFacultyId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "Eligibility Test College",
                TenantCode = $"ETC_{Guid.NewGuid():N}"[..12],
                SsoDomain = $"etc-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.Departments.AddRange(
                new Department { Id = deptAId, CollegeId = collegeId, Code = "CSE", Name = "Computer Science", IntakeQuota = 120, CreatedAtUtc = DateTime.UtcNow },
                new Department { Id = deptBId, CollegeId = collegeId, Code = "ECE", Name = "Electronics", IntakeQuota = 60, CreatedAtUtc = DateTime.UtcNow }
            );
            db.Users.AddRange(
                new UserAccount { Id = adminId, CollegeId = collegeId, Email = $"admin.{Guid.NewGuid():N}@etc.ac.in", FullName = "Admin", Role = UserRole.CollegeAdmin, IsActive = true, CreatedAtUtc = DateTime.UtcNow },
                new UserAccount { Id = otherDeptFacultyId, CollegeId = collegeId, DepartmentId = deptBId, Email = $"other.{Guid.NewGuid():N}@etc.ac.in", FullName = "Other Dept Faculty", Role = UserRole.Faculty, IsActive = true, CreatedAtUtc = DateTime.UtcNow },
                new UserAccount { Id = inactiveFacultyId, CollegeId = collegeId, DepartmentId = deptAId, Email = $"inactive.{Guid.NewGuid():N}@etc.ac.in", FullName = "Inactive Faculty", Role = UserRole.Faculty, IsActive = false, CreatedAtUtc = DateTime.UtcNow },
                new UserAccount { Id = studentId, CollegeId = collegeId, DepartmentId = deptAId, Email = $"student.{Guid.NewGuid():N}@etc.ac.in", FullName = "Student User", Role = UserRole.Student, IsActive = true, CreatedAtUtc = DateTime.UtcNow }
            );
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminId, collegeId, UserRole.CollegeAdmin));

        var crossDeptRes = await _client.PutAsJsonAsync($"/api/college/departments/{deptAId}/appoint-hod", new { hodUserId = otherDeptFacultyId });
        Assert.Equal(HttpStatusCode.BadRequest, crossDeptRes.StatusCode);

        var inactiveRes = await _client.PutAsJsonAsync($"/api/college/departments/{deptAId}/appoint-hod", new { hodUserId = inactiveFacultyId });
        Assert.Equal(HttpStatusCode.BadRequest, inactiveRes.StatusCode);

        var studentRes = await _client.PutAsJsonAsync($"/api/college/departments/{deptAId}/appoint-hod", new { hodUserId = studentId });
        Assert.Equal(HttpStatusCode.BadRequest, studentRes.StatusCode);
    }

    [Fact]
    public async Task AppointHod_ExistingHod_RequiresExplicitConfirmation_BeforeReplacing()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var deptId = Guid.NewGuid();
        var firstHodId = Guid.NewGuid();
        var secondHodId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "Replacement Guard College",
                TenantCode = $"RGC_{Guid.NewGuid():N}"[..12],
                SsoDomain = $"rgc-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.Users.AddRange(
                new UserAccount { Id = adminId, CollegeId = collegeId, Email = $"admin.{Guid.NewGuid():N}@rgc.ac.in", FullName = "Admin", Role = UserRole.CollegeAdmin, IsActive = true, CreatedAtUtc = DateTime.UtcNow },
                new UserAccount { Id = firstHodId, CollegeId = collegeId, DepartmentId = deptId, Email = $"hod1.{Guid.NewGuid():N}@rgc.ac.in", FullName = "Dr. First HOD", Role = UserRole.HOD, IsActive = true, CreatedAtUtc = DateTime.UtcNow },
                new UserAccount { Id = secondHodId, CollegeId = collegeId, DepartmentId = deptId, Email = $"fac2.{Guid.NewGuid():N}@rgc.ac.in", FullName = "Dr. Second Candidate", Role = UserRole.Faculty, IsActive = true, CreatedAtUtc = DateTime.UtcNow }
            );
            db.Departments.Add(new Department
            {
                Id = deptId,
                CollegeId = collegeId,
                Code = "CSE",
                Name = "Computer Science",
                HodUserId = firstHodId,
                IntakeQuota = 120,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.HodAppointmentHistories.Add(new HodAppointmentHistory
            {
                CollegeId = collegeId,
                DepartmentId = deptId,
                HodUserId = firstHodId,
                AppointedAtUtc = DateTime.UtcNow.AddDays(-10),
                IsCurrent = true,
                Remarks = "Initial HOD"
            });
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminId, collegeId, UserRole.CollegeAdmin));

        // Without confirmation -> 409 Conflict, existing HOD preserved
        var unconfirmedRes = await _client.PutAsJsonAsync($"/api/college/departments/{deptId}/appoint-hod", new
        {
            hodUserId = secondHodId,
            confirmReplacement = false
        });
        Assert.Equal(HttpStatusCode.Conflict, unconfirmedRes.StatusCode);

        // With explicit confirmation -> 200 OK, previous HOD relieved and demoted, new HOD active
        var confirmedRes = await _client.PutAsJsonAsync($"/api/college/departments/{deptId}/appoint-hod", new
        {
            hodUserId = secondHodId,
            confirmReplacement = true
        });
        Assert.Equal(HttpStatusCode.OK, confirmedRes.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var dept = await db.Departments.FirstAsync(d => d.Id == deptId);
            var prevHod = await db.Users.FirstAsync(u => u.Id == firstHodId);
            var nextHod = await db.Users.FirstAsync(u => u.Id == secondHodId);
            var prevHistory = await db.HodAppointmentHistories.FirstAsync(h => h.DepartmentId == deptId && h.HodUserId == firstHodId);
            var nextHistory = await db.HodAppointmentHistories.FirstAsync(h => h.DepartmentId == deptId && h.HodUserId == secondHodId);

            Assert.Equal(secondHodId, dept.HodUserId);
            Assert.Equal(UserRole.Faculty, prevHod.Role);
            Assert.Equal(UserRole.HOD, nextHod.Role);
            Assert.False(prevHistory.IsCurrent);
            Assert.NotNull(prevHistory.RelievedAtUtc);
            Assert.True(nextHistory.IsCurrent);
        }
    }

    [Fact]
    public async Task LegacyCreateHodRoute_IsRemoved_AndCannotReassignCrossTenantUser()
    {
        var collegeAId = Guid.NewGuid();
        var collegeBId = Guid.NewGuid();
        var adminAId = Guid.NewGuid();
        var deptAId = Guid.NewGuid();
        var userBId = Guid.NewGuid();
        var userBEmail = $"user.b.{Guid.NewGuid():N}@othercollege.ac.in";

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var collegeA = new CollegeTenant
            {
                Id = collegeAId,
                Name = "SISTec College A Reassign",
                TenantCode = "SISTEC_AR",
                SsoDomain = $"ar-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            };
            var collegeB = new CollegeTenant
            {
                Id = collegeBId,
                Name = "SISTec College B Reassign",
                TenantCode = "SISTEC_BR",
                SsoDomain = $"br-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.CollegeTenants.AddRange(collegeA, collegeB);

            var adminA = new UserAccount
            {
                Id = adminAId,
                CollegeId = collegeAId,
                Email = $"admin.ar.{Guid.NewGuid():N}@sistec.ac.in",
                FullName = "Admin AR",
                Role = UserRole.CollegeAdmin,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            var deptA = new Department
            {
                Id = deptAId,
                CollegeId = collegeAId,
                Code = "IT",
                Name = "Information Technology",
                IntakeQuota = 60,
                CreatedAtUtc = DateTime.UtcNow
            };
            var userB = new UserAccount
            {
                Id = userBId,
                CollegeId = collegeBId,
                Email = userBEmail,
                FullName = "User B",
                Role = UserRole.Faculty,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Users.AddRange(adminA, userB);
            db.Departments.Add(deptA);

            await db.SaveChangesAsync();
        }

        var token = GenerateToken(adminAId, collegeAId, UserRole.CollegeAdmin);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.PostAsJsonAsync("/api/college/hods/create", new
        {
            departmentId = deptAId,
            fullName = "Attempted Hijack",
            email = userBEmail
        });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var target = await db.Users.FirstAsync(u => u.Id == userBId);
            Assert.Equal(collegeBId, target.CollegeId);
            Assert.Equal(UserRole.Faculty, target.Role);

            var dept = await db.Departments.FirstAsync(d => d.Id == deptAId);
            Assert.Null(dept.HodUserId);
            Assert.Equal(0, await db.HodAppointmentHistories.CountAsync(h => h.DepartmentId == deptAId));
            Assert.Equal(0, await db.PlatformAuditLogs.CountAsync(a => a.TargetTenantId == collegeAId && a.Action == "APPOINT_HOD"));
        }
    }

    [Fact]
    public async Task LegacyCreateHodRoute_IsRemoved_AndCannotPromoteSameTenantFaculty()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var deptId = Guid.NewGuid();
        var facultyId = Guid.NewGuid();
        var facultyEmail = $"legacy.faculty.{Guid.NewGuid():N}@sistec.ac.in";
        var initialStamp = Guid.NewGuid().ToString("N");

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "Legacy Route College",
                TenantCode = $"LRC_{Guid.NewGuid():N}"[..12],
                SsoDomain = $"lrc-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.Departments.Add(new Department
            {
                Id = deptId,
                CollegeId = collegeId,
                Code = "CSE",
                Name = "Computer Science",
                IntakeQuota = 60,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.Users.AddRange(
                new UserAccount { Id = adminId, CollegeId = collegeId, Email = $"admin.{Guid.NewGuid():N}@sistec.ac.in", FullName = "Admin", Role = UserRole.CollegeAdmin, IsActive = true, CreatedAtUtc = DateTime.UtcNow },
                new UserAccount
                {
                    Id = facultyId,
                    CollegeId = collegeId,
                    DepartmentId = deptId,
                    Email = facultyEmail,
                    FullName = "Faculty Member",
                    Role = UserRole.Faculty,
                    SecurityStamp = initialStamp,
                    IsActive = true,
                    IsActivated = true,
                    CreatedAtUtc = DateTime.UtcNow
                }
            );
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminId, collegeId, UserRole.CollegeAdmin));
        var response = await _client.PostAsJsonAsync("/api/college/hods/create", new
        {
            departmentId = deptId,
            fullName = "Legacy HOD",
            email = facultyEmail,
            employeeCode = "EMP-LEGACY",
            temporaryPassword = "ShouldNeverBeUsed!1"
        });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var faculty = await db.Users.FirstAsync(u => u.Id == facultyId);
            Assert.Equal(UserRole.Faculty, faculty.Role);
            Assert.Equal(initialStamp, faculty.SecurityStamp);
            Assert.Equal("Faculty Member", faculty.FullName);

            var dept = await db.Departments.FirstAsync(d => d.Id == deptId);
            Assert.Null(dept.HodUserId);
            Assert.Equal(0, await db.HodAppointmentHistories.CountAsync(h => h.DepartmentId == deptId));
            Assert.Equal(0, await db.PlatformAuditLogs.CountAsync(a => a.TargetTenantId == collegeId && a.Action == "APPOINT_HOD"));
        }
    }

    [Fact]
    public async Task Overview_WhenNoAuditLogs_ReturnsEmptyRecentActivities()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var college = new CollegeTenant
            {
                Id = collegeId,
                Name = "SISTec Empty Activities College",
                TenantCode = "SISTEC_EA",
                SsoDomain = $"ea-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.CollegeTenants.Add(college);

            var admin = new UserAccount
            {
                Id = adminId,
                CollegeId = collegeId,
                Email = $"admin.ea.{Guid.NewGuid():N}@sistec.ac.in",
                FullName = "Admin EA",
                Role = UserRole.CollegeAdmin,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Users.Add(admin);
            await db.SaveChangesAsync();
        }

        var token = GenerateToken(adminId, collegeId, UserRole.CollegeAdmin);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync("/api/college/overview");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var overview = await response.Content.ReadFromJsonAsync<CollegeOverviewDto>();
        Assert.NotNull(overview);
        // Must NOT contain the 3 fake fallback items
        Assert.Empty(overview.RecentActivities);
    }

    [Fact]
    public async Task BulkUploadStaff_RejectsPlaceholderAndNonInstitutionalDomains_Atomically()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var deptId = Guid.NewGuid();
        var ssoDomain = $"inst-{Guid.NewGuid():N}.ac.in";

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "Domain Policy College",
                TenantCode = $"DPC_{Guid.NewGuid():N}"[..12],
                SsoDomain = ssoDomain,
                EnforceStrictSso = true,
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.Departments.Add(new Department
            {
                Id = deptId,
                CollegeId = collegeId,
                Code = "CSE",
                Name = "Computer Science",
                IntakeQuota = 120,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.Users.Add(new UserAccount
            {
                Id = adminId,
                CollegeId = collegeId,
                Email = $"admin.{Guid.NewGuid():N}@{ssoDomain}",
                FullName = "Domain Admin",
                Role = UserRole.CollegeAdmin,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminId, collegeId, UserRole.CollegeAdmin));

        var invalidRes = await _client.PostAsJsonAsync("/api/college/users/bulk", new BulkStaffUploadRequest
        {
            CsvHeaders = new List<string> { "FullName", "Email", "DepartmentCode", "Designation" },
            StaffRows = new List<BulkStaffUploadRowDto>
            {
                new() { FullName = "Dr. Asha Verma", Email = "asha.verma@college.example.edu", DepartmentCode = "CSE", Designation = "Professor" },
                new() { FullName = "Dr. Priya Sharma", Email = "priya.sharma@example.com", DepartmentCode = "CSE", Designation = "AssociateProfessor" },
                new() { FullName = "Prof. Arjun Mehta", Email = "arjun.mehta@gmail.com", DepartmentCode = "CSE", Designation = "AssistantProfessor" },
                new() { FullName = "Dr. Valid Faculty", Email = $"valid.{Guid.NewGuid():N}@{ssoDomain}", DepartmentCode = "CSE", Designation = "Professor" },
            }
        });

        Assert.Equal(HttpStatusCode.BadRequest, invalidRes.StatusCode);
        var invalidResult = await invalidRes.Content.ReadFromJsonAsync<BulkStaffUploadResultDto>();
        Assert.NotNull(invalidResult);
        Assert.Equal(2, invalidResult.Errors.Count);
        Assert.Contains(invalidResult.Errors, e => e.Contains("Row 1:") && e.Contains("Placeholder domain"));
        Assert.Contains(invalidResult.Errors, e => e.Contains("Row 2:") && e.Contains("Placeholder domain"));

        // Atomic rollback: even valid rows must NOT be persisted when placeholder rows fail
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var facultyCount = await db.Users.CountAsync(u => u.CollegeId == collegeId && u.Role == UserRole.Faculty);
            Assert.Equal(0, facultyCount);
        }

        // Personal email + institutional domain + subdomain all succeed when approved in roster
        var validRes = await _client.PostAsJsonAsync("/api/college/users/bulk", new BulkStaffUploadRequest
        {
            CsvHeaders = new List<string> { "FullName", "Email", "DepartmentCode", "Designation" },
            StaffRows = new List<BulkStaffUploadRowDto>
            {
                new() { FullName = "Dr. Asha Verma", Email = $"asha.verma.{Guid.NewGuid():N}@{ssoDomain}", DepartmentCode = "CSE", Designation = "Professor" },
                new() { FullName = "Dr. Priya Sharma", Email = $"priya.sharma.{Guid.NewGuid():N}@gmail.com", DepartmentCode = "CSE", Designation = "AssociateProfessor" },
            }
        });

        Assert.Equal(HttpStatusCode.OK, validRes.StatusCode);
        var validResult = await validRes.Content.ReadFromJsonAsync<BulkStaffUploadResultDto>();
        Assert.NotNull(validResult);
        Assert.Equal(2, validResult.SuccessfullyCreated);
        Assert.Equal(0, validResult.FailedCount);
    }

    [Fact]
    public async Task RosterSignup_And_Activation_SupportsPersonalEmail_EnforcesTenantAndTokenSecurity_AndLogsIn()
    {
        var collegeAId = Guid.NewGuid();
        var collegeBId = Guid.NewGuid();
        var deptAId = Guid.NewGuid();
        var studentEmail = $"student.{Guid.NewGuid():N}@gmail.com";
        var facultyEmail = $"faculty.{Guid.NewGuid():N}@gmail.com";
        var collegeBUserEmail = $"other.{Guid.NewGuid():N}@gmail.com";
        var studentCode = $"0176CS{Guid.NewGuid():N}"[..12].ToUpperInvariant();
        var facultyCode = $"FAC-{Guid.NewGuid():N}"[..10].ToUpperInvariant();
        var collegeBCode = $"CB-{Guid.NewGuid():N}"[..10].ToUpperInvariant();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            db.CollegeTenants.AddRange(
                new CollegeTenant { Id = collegeAId, Name = "Onboarding College A", TenantCode = $"ONBA_{Guid.NewGuid():N}"[..12], SsoDomain = $"onba-{Guid.NewGuid():N}.ac.in", EnforceStrictSso = true, IsActive = true, CreatedAtUtc = DateTime.UtcNow },
                new CollegeTenant { Id = collegeBId, Name = "Onboarding College B", TenantCode = $"ONBB_{Guid.NewGuid():N}"[..12], SsoDomain = $"onbb-{Guid.NewGuid():N}.ac.in", EnforceStrictSso = true, IsActive = true, CreatedAtUtc = DateTime.UtcNow }
            );
            db.Departments.Add(new Department { Id = deptAId, CollegeId = collegeAId, Code = "CSE", Name = "CSE", IntakeQuota = 120 });
            db.Users.AddRange(
                new UserAccount
                {
                    CollegeId = collegeAId,
                    DepartmentId = deptAId,
                    FullName = "Personal Email Student",
                    Email = studentEmail,
                    EnrollmentOrEmployeeCode = studentCode,
                    Role = UserRole.Student,
                    IsActive = true,
                    IsActivated = false,
                    IsEmailVerified = false,
                    CreatedAtUtc = DateTime.UtcNow
                },
                new UserAccount
                {
                    CollegeId = collegeAId,
                    DepartmentId = deptAId,
                    FullName = "Personal Email Faculty",
                    Email = facultyEmail,
                    EnrollmentOrEmployeeCode = facultyCode,
                    Role = UserRole.Faculty,
                    IsActive = true,
                    IsActivated = false,
                    IsEmailVerified = false,
                    CreatedAtUtc = DateTime.UtcNow
                },
                new UserAccount
                {
                    CollegeId = collegeBId,
                    FullName = "College B Student",
                    Email = collegeBUserEmail,
                    EnrollmentOrEmployeeCode = collegeBCode,
                    Role = UserRole.Student,
                    IsActive = true,
                    IsActivated = false,
                    CreatedAtUtc = DateTime.UtcNow
                }
            );
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = null;

        // 1. Public college list returns active colleges
        var collegesRes = await _client.GetAsync("/api/auth/colleges");
        Assert.Equal(HttpStatusCode.OK, collegesRes.StatusCode);

        // 2. Mismatched email + College ID is rejected
        var mismatchRes = await _client.PostAsJsonAsync("/api/auth/roster-signup", new RosterSignupRequest
        {
            CollegeId = collegeAId,
            CollegeUserId = studentCode,
            Email = facultyEmail
        });
        Assert.Equal(HttpStatusCode.BadRequest, mismatchRes.StatusCode);

        // 3. Cross-college record cannot be used for College A
        var crossTenantRes = await _client.PostAsJsonAsync("/api/auth/roster-signup", new RosterSignupRequest
        {
            CollegeId = collegeAId,
            CollegeUserId = collegeBCode,
            Email = collegeBUserEmail
        });
        Assert.Equal(HttpStatusCode.BadRequest, crossTenantRes.StatusCode);

        // 4. Valid student with personal @gmail.com email succeeds
        var studentSignupRes = await _client.PostAsJsonAsync("/api/auth/roster-signup", new RosterSignupRequest
        {
            CollegeId = collegeAId,
            CollegeUserId = studentCode.ToLowerInvariant(),
            Email = $"  {studentEmail.ToUpperInvariant()} "
        });
        Assert.Equal(HttpStatusCode.OK, studentSignupRes.StatusCode);

        // 5. Valid faculty with personal @gmail.com email succeeds
        var facultySignupRes = await _client.PostAsJsonAsync("/api/auth/roster-signup", new RosterSignupRequest
        {
            CollegeId = collegeAId,
            CollegeUserId = facultyCode,
            Email = facultyEmail
        });
        Assert.Equal(HttpStatusCode.OK, facultySignupRes.StatusCode);

        // 6. Expired activation token is rejected, then valid token activates once and cannot be replayed
        const string validToken = "RosterActivationToken_1234567890";
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var student = await db.Users.FirstAsync(u => u.Email == studentEmail);
            Assert.False(student.IsActivated);
            Assert.NotNull(student.ActivationTokenHashed);

            student.ActivationTokenExpiresAtUtc = DateTime.UtcNow.AddMinutes(-5);
            student.ActivationTokenHashed = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(validToken)));
            await db.SaveChangesAsync();
        }

        var expiredRes = await _client.PostAsJsonAsync("/api/auth/activate", new ActivateAccountRequest
        {
            Email = studentEmail,
            Token = validToken,
            NewPassword = "StrongPassword#2026"
        });
        Assert.Equal(HttpStatusCode.BadRequest, expiredRes.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var student = await db.Users.FirstAsync(u => u.Email == studentEmail);
            student.ActivationTokenExpiresAtUtc = DateTime.UtcNow.AddHours(24);
            await db.SaveChangesAsync();
        }

        var activateRes = await _client.PostAsJsonAsync("/api/auth/activate", new ActivateAccountRequest
        {
            Email = studentEmail,
            Token = validToken,
            NewPassword = "StrongPassword#2026"
        });
        Assert.Equal(HttpStatusCode.OK, activateRes.StatusCode);
        var auth = await activateRes.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        Assert.Equal(UserRole.Student, auth.User.Role);
        Assert.Equal(collegeAId, auth.User.CollegeId);

        // 7. Token replay and re-signup of activated account are rejected
        var replayRes = await _client.PostAsJsonAsync("/api/auth/activate", new ActivateAccountRequest
        {
            Email = studentEmail,
            Token = validToken,
            NewPassword = "AnotherPassword#2026"
        });
        Assert.Equal(HttpStatusCode.Conflict, replayRes.StatusCode);

        var reactivateRes = await _client.PostAsJsonAsync("/api/auth/roster-signup", new RosterSignupRequest
        {
            CollegeId = collegeAId,
            CollegeUserId = studentCode,
            Email = studentEmail
        });
        Assert.Equal(HttpStatusCode.Conflict, reactivateRes.StatusCode);

        // 8. Activated user can log in with their new password
        var loginRes = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = studentEmail,
            Password = "StrongPassword#2026"
        });
        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);
    }

    [Fact]
    public async Task Settings_GetAndUpdate_PersistsRealValues_AuditsChanges_AndExcludesInactiveStudents()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "Initial Settings College",
                TenantCode = $"SET_{Guid.NewGuid():N}"[..12],
                SsoDomain = $"set-{Guid.NewGuid():N}.ac.in",
                AffiliatingUniversity = null,
                CampusAddress = null,
                LicenseTier = LicenseTier.Standard,
                MaxStudentSeats = 600,
                StorageQuotaGb = 40,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.Users.AddRange(
                new UserAccount { Id = adminId, CollegeId = collegeId, Email = $"admin.{Guid.NewGuid():N}@set.ac.in", FullName = "Admin", Role = UserRole.CollegeAdmin, IsActive = true, CreatedAtUtc = DateTime.UtcNow },
                new UserAccount { CollegeId = collegeId, Email = $"s1.{Guid.NewGuid():N}@gmail.com", FullName = "Active S1", Role = UserRole.Student, IsActive = true, CreatedAtUtc = DateTime.UtcNow },
                new UserAccount { CollegeId = collegeId, Email = $"s2.{Guid.NewGuid():N}@gmail.com", FullName = "Inactive S2", Role = UserRole.Student, IsActive = false, CreatedAtUtc = DateTime.UtcNow }
            );
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminId, collegeId, UserRole.CollegeAdmin));

        // 1. GET returns real values (null when unconfigured, active student count = 1)
        var getRes = await _client.GetAsync("/api/college/settings");
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);
        var initial = await getRes.Content.ReadFromJsonAsync<CollegeSettingsDto>();
        Assert.NotNull(initial);
        Assert.Null(initial.AffiliatedUniversity);
        Assert.Null(initial.CampusAddress);
        Assert.Equal(1, initial.EnrolledStudentCount);
        Assert.Equal(600, initial.MaxStudentSeats);
        Assert.Equal(40, initial.StorageQuotaGb);

        // 2. PUT updates and returns persisted values
        var putRes = await _client.PutAsJsonAsync("/api/college/settings", new UpdateCollegeSettingsRequest
        {
            Name = "Updated Settings College",
            AffiliatedUniversity = "RGPV, Bhopal",
            CampusAddress = "Main Academic Block, Bhopal"
        });
        Assert.Equal(HttpStatusCode.OK, putRes.StatusCode);
        var updated = await putRes.Content.ReadFromJsonAsync<CollegeSettingsDto>();
        Assert.NotNull(updated);
        Assert.Equal("Updated Settings College", updated.Name);
        Assert.Equal("RGPV, Bhopal", updated.AffiliatedUniversity);
        Assert.Equal("Main Academic Block, Bhopal", updated.CampusAddress);

        // 3. GET active session is read-only (returns 404 when unconfigured, never auto-creates)
        var noSessionRes = await _client.GetAsync("/api/college/sessions/active");
        Assert.Equal(HttpStatusCode.NotFound, noSessionRes.StatusCode);

        // 4. Invalid session dates rejected, valid session persisted
        var badSessionRes = await _client.PostAsJsonAsync("/api/college/sessions", new ConfigureAcademicSessionRequest
        {
            AcademicYear = "2026-2027",
            StartDate = new DateTime(2027, 6, 30, 0, 0, 0, DateTimeKind.Utc),
            EndDate = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc),
            IsActive = true
        });
        Assert.Equal(HttpStatusCode.BadRequest, badSessionRes.StatusCode);

        var goodSessionRes = await _client.PostAsJsonAsync("/api/college/sessions", new ConfigureAcademicSessionRequest
        {
            AcademicYear = "2026-2027",
            StartDate = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc),
            EndDate = new DateTime(2027, 6, 30, 23, 59, 59, DateTimeKind.Utc),
            IsActive = true
        });
        Assert.Equal(HttpStatusCode.OK, goodSessionRes.StatusCode);
    }

    [Fact]
    public async Task Settings_LogoUploadAndDelete_ValidatesMagicBytes_AndIsolatesTenants()
    {
        var collegeAId = Guid.NewGuid();
        var collegeBId = Guid.NewGuid();
        var adminAId = Guid.NewGuid();
        var adminBId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            db.CollegeTenants.AddRange(
                new CollegeTenant { Id = collegeAId, Name = "Logo College A", TenantCode = $"LGA_{Guid.NewGuid():N}"[..12], SsoDomain = $"lga-{Guid.NewGuid():N}.ac.in", IsActive = true, CreatedAtUtc = DateTime.UtcNow },
                new CollegeTenant { Id = collegeBId, Name = "Logo College B", TenantCode = $"LGB_{Guid.NewGuid():N}"[..12], SsoDomain = $"lgb-{Guid.NewGuid():N}.ac.in", IsActive = true, CreatedAtUtc = DateTime.UtcNow }
            );
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminAId, collegeAId, UserRole.CollegeAdmin));

        // 1. Reject unsafe non-image payload disguised as .png
        using (var badForm = new MultipartFormDataContent())
        {
            var fakeBytes = System.Text.Encoding.UTF8.GetBytes("<svg><script>alert(1)</script></svg>");
            badForm.Add(new ByteArrayContent(fakeBytes), "file", "logo.png");
            var badRes = await _client.PostAsync("/api/college/settings/logo", badForm);
            Assert.Equal(HttpStatusCode.BadRequest, badRes.StatusCode);
        }

        // 2. Valid 1x1 PNG uploads and persists CrestUrl
        byte[] validPng = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");
        using (var goodForm = new MultipartFormDataContent())
        {
            goodForm.Add(new ByteArrayContent(validPng), "file", "crest.png");
            var uploadRes = await _client.PostAsync("/api/college/settings/logo", goodForm);
            Assert.Equal(HttpStatusCode.OK, uploadRes.StatusCode);
            var settings = await uploadRes.Content.ReadFromJsonAsync<CollegeSettingsDto>();
            Assert.NotNull(settings);
            Assert.StartsWith("/api/proxy/api/college/logo?v=", settings.CrestUrl);
        }

        // 3. College A can fetch its logo; College B does not see College A's logo
        var logoARes = await _client.GetAsync("/api/college/logo");
        Assert.Equal(HttpStatusCode.OK, logoARes.StatusCode);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminBId, collegeBId, UserRole.CollegeAdmin));
        var logoBRes = await _client.GetAsync("/api/college/logo");
        Assert.Equal(HttpStatusCode.NotFound, logoBRes.StatusCode);

        // 4. College A deletes its logo
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminAId, collegeAId, UserRole.CollegeAdmin));
        var delRes = await _client.DeleteAsync("/api/college/settings/logo");
        Assert.Equal(HttpStatusCode.OK, delRes.StatusCode);
        var afterDel = await delRes.Content.ReadFromJsonAsync<CollegeSettingsDto>();
        Assert.Null(afterDel?.CrestUrl);
    }

    [Fact]
    public async Task HodEvaluationCutoff_EnforcesHodOwnership_AndPersistsPerDepartment()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var hodId = Guid.NewGuid();
        var deptId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "Cutoff Ownership College",
                TenantCode = $"CUT_{Guid.NewGuid():N}"[..12],
                SsoDomain = $"cut-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.AcademicSessions.Add(new AcademicSession
            {
                CollegeId = collegeId,
                Label = "2026-2027",
                StartDate = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2027, 6, 30, 23, 59, 59, DateTimeKind.Utc),
                IsActive = true
            });
            db.Departments.Add(new Department
            {
                Id = deptId,
                CollegeId = collegeId,
                Code = "CSE",
                Name = "Computer Science",
                HodUserId = hodId
            });
            db.Users.Add(new UserAccount
            {
                Id = hodId,
                CollegeId = collegeId,
                DepartmentId = deptId,
                Email = $"hod.{Guid.NewGuid():N}@cut.ac.in",
                FullName = "HOD User",
                Role = UserRole.HOD,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        // 1. CollegeAdmin cannot configure HOD's department evaluation cutoff
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminId, collegeId, UserRole.CollegeAdmin));
        var adminAttempt = await _client.PutAsJsonAsync("/api/hod/department-settings/evaluation-cutoff", new UpdateDepartmentEvaluationCutoffRequest
        {
            EvaluationCutoffDateUtc = new DateTime(2027, 4, 15, 23, 59, 59, DateTimeKind.Utc)
        });
        Assert.Equal(HttpStatusCode.Forbidden, adminAttempt.StatusCode);

        // 2. Authorized HOD rejects out-of-session cutoff, persists valid cutoff
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(hodId, collegeId, UserRole.HOD));
        var outOfRange = await _client.PutAsJsonAsync("/api/hod/department-settings/evaluation-cutoff", new UpdateDepartmentEvaluationCutoffRequest
        {
            EvaluationCutoffDateUtc = new DateTime(2028, 1, 15, 23, 59, 59, DateTimeKind.Utc)
        });
        Assert.Equal(HttpStatusCode.BadRequest, outOfRange.StatusCode);

        var cutoff = new DateTime(2027, 5, 10, 23, 59, 59, DateTimeKind.Utc);
        var validRes = await _client.PutAsJsonAsync("/api/hod/department-settings/evaluation-cutoff", new UpdateDepartmentEvaluationCutoffRequest
        {
            EvaluationCutoffDateUtc = cutoff
        });
        Assert.Equal(HttpStatusCode.OK, validRes.StatusCode);
        var dash = await validRes.Content.ReadFromJsonAsync<HodDashboardDto>();
        Assert.NotNull(dash);
        Assert.Equal(cutoff.Date, dash.EvaluationCutoffDateUtc?.Date);
    }

    [Fact]
    public async Task SuperAdminOnboarding_And_CollegeAdminDataConsistency_EndToEnd()
    {
        var superAdminId = Guid.NewGuid();
        var tenantCode = $"CONS_{Guid.NewGuid():N}"[..12].ToUpperInvariant();
        var ssoDomain = $"cons-{Guid.NewGuid():N}.edu.in";
        var principalEmail = $"principal.{Guid.NewGuid():N}@{ssoDomain}";

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(superAdminId, Guid.Empty, UserRole.SuperAdmin));
        var createRes = await _client.PostAsJsonAsync("/api/platform/tenants", new CreateTenantRequest
        {
            Name = "Consistently Onboarded Institute",
            TenantCode = tenantCode,
            SsoDomain = ssoDomain,
            AffiliatingUniversity = "Autonomous Technical University",
            CampusAddress = "42 Innovation Way, Pune 411001",
            LicenseTier = LicenseTier.Standard,
            MaxStudentSeats = 800,
            StorageQuotaGb = 75,
            PrincipalName = "Dr. Real Principal",
            PrincipalEmail = principalEmail
        });
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var created = await createRes.Content.ReadFromJsonAsync<CreateTenantResponse>();
        Assert.NotNull(created);
        Assert.Equal("Autonomous Technical University", created.Tenant.AffiliatingUniversity);
        Assert.Equal("42 Innovation Way, Pune 411001", created.Tenant.CampusAddress);

        Guid principalId;
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var principal = await db.Users.FirstAsync(u => u.Email == principalEmail);
            principalId = principal.Id;
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(principalId, created.Tenant.Id, UserRole.CollegeAdmin));

        // 1. Personal profile matches authenticated admin
        var meRes = await _client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, meRes.StatusCode);
        var me = await meRes.Content.ReadFromJsonAsync<UserProfileDto>();
        Assert.NotNull(me);
        Assert.Equal("Dr. Real Principal", me.FullName);
        Assert.Equal(principalEmail, me.Email);
        Assert.Equal("Consistently Onboarded Institute", me.CollegeName);

        // 2. College Overview & Settings show exact onboarded values (no RGPV/Bhopal leakage)
        var ovRes = await _client.GetAsync("/api/college/overview");
        Assert.Equal(HttpStatusCode.OK, ovRes.StatusCode);
        var ov = await ovRes.Content.ReadFromJsonAsync<CollegeOverviewDto>();
        Assert.NotNull(ov);
        Assert.Equal("Consistently Onboarded Institute", ov.CollegeName);
        Assert.Equal("Autonomous Technical University", ov.AffiliatedUniversity);
        Assert.Equal("42 Innovation Way, Pune 411001", ov.CampusAddress);

        var setRes = await _client.GetAsync("/api/college/settings");
        Assert.Equal(HttpStatusCode.OK, setRes.StatusCode);
        var settings = await setRes.Content.ReadFromJsonAsync<CollegeSettingsDto>();
        Assert.NotNull(settings);
        Assert.Equal(LicenseTier.Standard, settings.LicenseTier);
        Assert.Equal(800, settings.MaxStudentSeats);
        Assert.Equal(75, settings.StorageQuotaGb);
        Assert.Equal("42 Innovation Way, Pune 411001", settings.CampusAddress);
    }

    [Fact]
    public async Task CollegeAdmin_StudentsCsv_FacultyCsv_And_HodAppointmentLifecycle_EnforcesRolesAndIsolation()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var progId = Guid.NewGuid();
        var deptCseId = Guid.NewGuid();
        var deptEceId = Guid.NewGuid();
        var fac1Email = $"fac1.{Guid.NewGuid():N}@gmail.com";
        var fac2Email = $"fac2.{Guid.NewGuid():N}@gmail.com";
        var stuEmail = $"stu1.{Guid.NewGuid():N}@gmail.com";
        var stuNum = $"0176CS{Guid.NewGuid():N}"[..12].ToUpperInvariant();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "CSV Lifecycle College",
                TenantCode = $"CLC_{Guid.NewGuid():N}"[..12],
                SsoDomain = $"clc-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.CoursePrograms.Add(new CourseProgram
            {
                Id = progId,
                CollegeId = collegeId,
                Code = "BTECH",
                Name = "B.Tech",
                Level = AcademicProgramLevel.UG,
                TotalSemesters = 8,
                IsActive = true
            });
            db.Departments.AddRange(
                new Department { Id = deptCseId, CollegeId = collegeId, CourseProgramId = progId, Code = "CSE", Name = "Computer Science", IntakeQuota = 120 },
                new Department { Id = deptEceId, CollegeId = collegeId, CourseProgramId = progId, Code = "ECE", Name = "Electronics", IntakeQuota = 60 }
            );
            db.Users.Add(new UserAccount
            {
                Id = adminId,
                CollegeId = collegeId,
                Email = $"admin.{Guid.NewGuid():N}@clc.ac.in",
                FullName = "Admin CLC",
                Role = UserRole.CollegeAdmin,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminId, collegeId, UserRole.CollegeAdmin));

        // 1. Students.csv rejects security-sensitive Role column, previews cleanly, then imports valid student with personal email
        var badStuRes = await _client.PostAsJsonAsync("/api/college/students/bulk", new BulkStudentUploadRequest
        {
            CsvHeaders = new List<string> { "StudentName", "Email", "StudentNumber", "DepartmentCode", "Role" },
            StudentRows = new List<BulkStudentUploadRowDto>
            {
                new() { StudentName = "Bad Role", Email = stuEmail, StudentNumber = stuNum, DepartmentCode = "CSE" }
            }
        });
        Assert.Equal(HttpStatusCode.BadRequest, badStuRes.StatusCode);

        var stuPreviewRes = await _client.PostAsJsonAsync("/api/college/students/bulk/preview", new BulkStudentUploadRequest
        {
            CsvHeaders = new List<string> { "StudentName", "Email", "StudentNumber", "DepartmentCode", "Program", "AdmissionYear", "CurrentSemester" },
            StudentRows = new List<BulkStudentUploadRowDto>
            {
                new() { StudentName = "Aarav Student", Email = stuEmail, StudentNumber = stuNum, DepartmentCode = "CSE", Program = "BTECH", AdmissionYear = "2023", CurrentSemester = 6 }
            }
        });
        Assert.Equal(HttpStatusCode.OK, stuPreviewRes.StatusCode);
        var stuPreview = await stuPreviewRes.Content.ReadFromJsonAsync<RosterImportPreviewDto>();
        Assert.NotNull(stuPreview);
        Assert.Equal(1, stuPreview.CreateCount);
        Assert.Equal(0, stuPreview.InvalidCount);

        var stuRes = await _client.PostAsJsonAsync("/api/college/students/bulk", new BulkStudentUploadRequest
        {
            CsvHeaders = new List<string> { "StudentName", "Email", "StudentNumber", "DepartmentCode", "Program", "AdmissionYear", "CurrentSemester" },
            StudentRows = new List<BulkStudentUploadRowDto>
            {
                new() { StudentName = "Aarav Student", Email = stuEmail, StudentNumber = stuNum, DepartmentCode = "CSE", Program = "BTECH", AdmissionYear = "2023", CurrentSemester = 6 }
            }
        });
        Assert.Equal(HttpStatusCode.OK, stuRes.StatusCode);

        // 2. Faculty.csv rejects CollegeId security column, previews cleanly, then imports 2 faculty members
        var badFacRes = await _client.PostAsJsonAsync("/api/college/users/bulk", new BulkStaffUploadRequest
        {
            CsvHeaders = new List<string> { "FullName", "Email", "CollegeId", "DepartmentCode", "Designation" },
            StaffRows = new List<BulkStaffUploadRowDto>
            {
                new() { FullName = "Dr. Fac One", Email = fac1Email, DepartmentCode = "CSE", Designation = "Professor" }
            }
        });
        Assert.Equal(HttpStatusCode.BadRequest, badFacRes.StatusCode);

        var facPreviewRes = await _client.PostAsJsonAsync("/api/college/users/bulk/preview", new BulkStaffUploadRequest
        {
            CsvHeaders = new List<string> { "FullName", "Email", "DepartmentCode", "Designation" },
            StaffRows = new List<BulkStaffUploadRowDto>
            {
                new() { FullName = "Dr. Fac One", Email = fac1Email, DepartmentCode = "CSE", Designation = "Professor" },
                new() { FullName = "Dr. Fac Two", Email = fac2Email, DepartmentCode = "ECE", Designation = "Lecturer" }
            }
        });
        Assert.Equal(HttpStatusCode.OK, facPreviewRes.StatusCode);
        var facPreview = await facPreviewRes.Content.ReadFromJsonAsync<RosterImportPreviewDto>();
        Assert.NotNull(facPreview);
        Assert.Equal(2, facPreview.CreateCount);

        var facRes = await _client.PostAsJsonAsync("/api/college/users/bulk", new BulkStaffUploadRequest
        {
            CsvHeaders = new List<string> { "FullName", "Email", "DepartmentCode", "Designation" },
            StaffRows = new List<BulkStaffUploadRowDto>
            {
                new() { FullName = "Dr. Fac One", Email = fac1Email, DepartmentCode = "CSE", Designation = "Professor" },
                new() { FullName = "Dr. Fac Two", Email = fac2Email, DepartmentCode = "ECE", Designation = "Lecturer" }
            }
        });
        Assert.Equal(HttpStatusCode.OK, facRes.StatusCode);

        // 3. Dedicated HOD appointment & relieve lifecycle preserves the same Faculty account
        Guid fac1Id;
        string initialSecurityStamp;
        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var fac1 = await db.Users.FirstAsync(u => u.CollegeId == collegeId && u.Email == fac1Email);
            fac1Id = fac1.Id;
            initialSecurityStamp = fac1.SecurityStamp;
        }

        var appointRes = await _client.PutAsJsonAsync($"/api/college/departments/{deptCseId}/appoint-hod", new AppointHodRequest
        {
            HodUserId = fac1Id,
            ConfirmReplacement = false
        });
        Assert.Equal(HttpStatusCode.OK, appointRes.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var fac1Users = await db.Users.Where(u => u.CollegeId == collegeId && u.Email == fac1Email).ToListAsync();
            Assert.Single(fac1Users);
            Assert.Equal(UserRole.HOD, fac1Users[0].Role);
            Assert.NotEqual(initialSecurityStamp, fac1Users[0].SecurityStamp);
            var cse = await db.Departments.FirstAsync(d => d.Id == deptCseId);
            Assert.Equal(fac1Id, cse.HodUserId);
        }

        // 4. Relieve HOD appointment reverts role back to Faculty while keeping account active
        var relieveRes = await _client.PostAsync($"/api/college/departments/{deptCseId}/relieve-hod", null);
        Assert.Equal(HttpStatusCode.OK, relieveRes.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var fac1 = await db.Users.FirstAsync(u => u.Id == fac1Id);
            Assert.Equal(UserRole.Faculty, fac1.Role);
            Assert.True(fac1.IsActive);
            var cse = await db.Departments.FirstAsync(d => d.Id == deptCseId);
            Assert.Null(cse.HodUserId);
            var history = await db.HodAppointmentHistories.FirstAsync(h => h.DepartmentId == deptCseId && h.HodUserId == fac1Id);
            Assert.False(history.IsCurrent);
            Assert.NotNull(history.RelievedAtUtc);
        }

        // 5. Roster import history endpoint returns both Faculty and Students imports
        var historyRes = await _client.GetAsync("/api/college/roster-imports/history");
        Assert.Equal(HttpStatusCode.OK, historyRes.StatusCode);
        var importHistory = await historyRes.Content.ReadFromJsonAsync<List<RosterImportHistoryDto>>();
        Assert.NotNull(importHistory);
        Assert.Contains(importHistory, h => h.ImportType == "Faculty" && h.CreatedCount == 2);
        Assert.Contains(importHistory, h => h.ImportType == "Students" && h.CreatedCount == 1);
    }

    [Fact]
    public async Task DepartmentIntakeQuota_EnforcesSanctionedSeatsOnStudentCsvImport()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var progId = Guid.NewGuid();
        var deptId = Guid.NewGuid();
        var tenantCode = $"IQ{Guid.NewGuid():N}".Substring(0, 8).ToUpperInvariant();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "Quota Test Institute",
                TenantCode = tenantCode,
                SsoDomain = $"{tenantCode.ToLowerInvariant()}.edu.in",
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.Users.Add(new UserAccount
            {
                Id = adminId,
                CollegeId = collegeId,
                FullName = "Quota Admin",
                Email = $"admin.{tenantCode.ToLowerInvariant()}@gmail.com",
                Role = UserRole.CollegeAdmin,
                IsActive = true,
                IsActivated = true,
                IsEmailVerified = true
            });
            db.CoursePrograms.Add(new CourseProgram
            {
                Id = progId,
                CollegeId = collegeId,
                Level = AcademicProgramLevel.UG,
                Code = "BTECH",
                Name = "Bachelor of Technology",
                TotalSemesters = 8,
                IsActive = true
            });
            db.Departments.Add(new Department
            {
                Id = deptId,
                CollegeId = collegeId,
                CourseProgramId = progId,
                Code = "AIML",
                Name = "AI & ML",
                IntakeQuota = 1
            });
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminId, collegeId, UserRole.CollegeAdmin));

        // 1. Attempting to import 2 students into a 1-seat department is rejected
        var overQuotaRes = await _client.PostAsJsonAsync("/api/college/students/bulk", new BulkStudentUploadRequest
        {
            CsvHeaders = new List<string> { "StudentName", "Email", "StudentNumber", "DepartmentCode" },
            StudentRows = new List<BulkStudentUploadRowDto>
            {
                new() { StudentName = "Student One", Email = $"s1.{tenantCode.ToLowerInvariant()}@gmail.com", StudentNumber = $"{tenantCode}001", DepartmentCode = "AIML" },
                new() { StudentName = "Student Two", Email = $"s2.{tenantCode.ToLowerInvariant()}@gmail.com", StudentNumber = $"{tenantCode}002", DepartmentCode = "AIML" }
            }
        });
        Assert.Equal(HttpStatusCode.BadRequest, overQuotaRes.StatusCode);
        var overQuotaBody = await overQuotaRes.Content.ReadFromJsonAsync<BulkStudentUploadResultDto>();
        Assert.NotNull(overQuotaBody);
        Assert.Contains(overQuotaBody.Errors, e => e.Contains("sanctioned intake quota", StringComparison.OrdinalIgnoreCase));

        // 2. Importing 1 student within quota succeeds, and GetDepartments returns real StudentCount=1, IntakeQuota=1
        var okRes = await _client.PostAsJsonAsync("/api/college/students/bulk", new BulkStudentUploadRequest
        {
            CsvHeaders = new List<string> { "StudentName", "Email", "StudentNumber", "DepartmentCode" },
            StudentRows = new List<BulkStudentUploadRowDto>
            {
                new() { StudentName = "Student One", Email = $"s1.{tenantCode.ToLowerInvariant()}@gmail.com", StudentNumber = $"{tenantCode}001", DepartmentCode = "AIML" }
            }
        });
        Assert.Equal(HttpStatusCode.OK, okRes.StatusCode);

        var depts = await _client.GetFromJsonAsync<List<DepartmentDto>>("/api/college/departments");
        Assert.NotNull(depts);
        var aiml = Assert.Single(depts, d => d.Code == "AIML");
        Assert.Equal(1, aiml.IntakeQuota);
        Assert.Equal(1, aiml.StudentCount);
    }

    [Fact]
    public async Task BulkUploadStaff_EnforcesCanonicalEmailHeader_AndRejectsLegacyAliases_InPreviewAndCommit()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var deptId = Guid.NewGuid();
        var ssoDomain = $"canon-{Guid.NewGuid():N}.ac.in";

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "Canonical Header College",
                TenantCode = $"CHC_{Guid.NewGuid():N}"[..12],
                SsoDomain = ssoDomain,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.Departments.Add(new Department
            {
                Id = deptId,
                CollegeId = collegeId,
                Code = "CSE",
                Name = "Computer Science",
                IntakeQuota = 120,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.Users.Add(new UserAccount
            {
                Id = adminId,
                CollegeId = collegeId,
                Email = $"admin.{Guid.NewGuid():N}@{ssoDomain}",
                FullName = "Admin CHC",
                Role = UserRole.CollegeAdmin,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminId, collegeId, UserRole.CollegeAdmin));

        // Legacy OfficialEmail and RegisteredEmail headers must be rejected in preview and commit
        foreach (var legacyCol in new[] { "OfficialEmail", "RegisteredEmail" })
        {
            var legacyPreview = await _client.PostAsJsonAsync("/api/college/users/bulk/preview", new BulkStaffUploadRequest
            {
                CsvHeaders = new List<string> { "FullName", legacyCol, "DepartmentCode", "Designation" },
                StaffRows = new List<BulkStaffUploadRowDto>
                {
                    new() { FullName = "Dr. Legacy", Email = $"legacy.{Guid.NewGuid():N}@gmail.com", DepartmentCode = "CSE", Designation = "Professor" }
                }
            });
            Assert.Equal(HttpStatusCode.OK, legacyPreview.StatusCode);
            var previewBody = await legacyPreview.Content.ReadFromJsonAsync<RosterImportPreviewDto>();
            Assert.NotNull(previewBody);
            Assert.NotEmpty(previewBody.HeaderErrors);

            var legacyCommit = await _client.PostAsJsonAsync("/api/college/users/bulk", new BulkStaffUploadRequest
            {
                CsvHeaders = new List<string> { "FullName", legacyCol, "DepartmentCode", "Designation" },
                StaffRows = new List<BulkStaffUploadRowDto>
                {
                    new() { FullName = "Dr. Legacy", Email = $"legacy.{Guid.NewGuid():N}@gmail.com", DepartmentCode = "CSE", Designation = "Professor" }
                }
            });
            Assert.Equal(HttpStatusCode.BadRequest, legacyCommit.StatusCode);
        }

        // Canonical FullName,Email,DepartmentCode,Designation succeeds in both preview and commit
        var canonicalReq = new BulkStaffUploadRequest
        {
            CsvHeaders = new List<string> { "FullName", "Email", "DepartmentCode", "Designation" },
            StaffRows = new List<BulkStaffUploadRowDto>
            {
                new() { FullName = "Dr. Personal Email", Email = $"prof.{Guid.NewGuid():N}@gmail.com", DepartmentCode = "CSE", Designation = "Professor" },
                new() { FullName = "Dr. Institutional Email", Email = $"inst.{Guid.NewGuid():N}@{ssoDomain}", DepartmentCode = "CSE", Designation = "Lecturer" }
            }
        };

        var canonPreviewRes = await _client.PostAsJsonAsync("/api/college/users/bulk/preview", canonicalReq);
        Assert.Equal(HttpStatusCode.OK, canonPreviewRes.StatusCode);
        var canonPreview = await canonPreviewRes.Content.ReadFromJsonAsync<RosterImportPreviewDto>();
        Assert.NotNull(canonPreview);
        Assert.Empty(canonPreview.HeaderErrors);
        Assert.Equal(2, canonPreview.CreateCount);
        Assert.Equal(0, canonPreview.InvalidCount);

        var canonCommitRes = await _client.PostAsJsonAsync("/api/college/users/bulk", canonicalReq);
        Assert.Equal(HttpStatusCode.OK, canonCommitRes.StatusCode);
        var canonCommit = await canonCommitRes.Content.ReadFromJsonAsync<BulkStaffUploadResultDto>();
        Assert.NotNull(canonCommit);
        Assert.Equal(2, canonCommit.SuccessfullyCreated);
        Assert.Equal(0, canonCommit.FailedCount);
    }


    [Fact]
    public async Task PreviewBulkUploadStaff_DoesNotDirtyTrackedEntities_OrPersistChanges()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var facultyId = Guid.NewGuid();
        var oldDeptId = Guid.NewGuid();
        var newDeptId = Guid.NewGuid();
        var email = $"preview.faculty.{Guid.NewGuid():N}@sistec.ac.in";
        var originalName = "Original Faculty";
        var originalStamp = Guid.NewGuid().ToString("N");

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "Preview Staff College",
                TenantCode = $"PSC_{Guid.NewGuid():N}"[..12],
                SsoDomain = $"psc-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.Departments.AddRange(
                new Department { Id = oldDeptId, CollegeId = collegeId, Code = "CSE", Name = "Computer Science", IntakeQuota = 60, CreatedAtUtc = DateTime.UtcNow },
                new Department { Id = newDeptId, CollegeId = collegeId, Code = "ECE", Name = "Electronics", IntakeQuota = 60, CreatedAtUtc = DateTime.UtcNow }
            );
            db.Users.AddRange(
                new UserAccount { Id = adminId, CollegeId = collegeId, Email = $"admin.{Guid.NewGuid():N}@sistec.ac.in", FullName = "Admin", Role = UserRole.CollegeAdmin, IsActive = true, CreatedAtUtc = DateTime.UtcNow },
                new UserAccount
                {
                    Id = facultyId,
                    CollegeId = collegeId,
                    DepartmentId = oldDeptId,
                    Email = email,
                    FullName = originalName,
                    EnrollmentOrEmployeeCode = "EMP-PREVIEW",
                    PasswordHash = "KEEP_HASH",
                    Role = UserRole.Faculty,
                    Designation = FacultyDesignation.Lecturer,
                    SecurityStamp = originalStamp,
                    IsActive = true,
                    IsActivated = true,
                    CreatedAtUtc = DateTime.UtcNow
                }
            );
            await db.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var tenant = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenant.IsSuperAdmin = true;
            tenant.CollegeId = collegeId;
            tenant.Role = UserRole.CollegeAdmin;

            var controller = new CollegeController(
                db,
                tenant,
                scope.ServiceProvider.GetRequiredService<IEmailSender>(),
                scope.ServiceProvider.GetRequiredService<IWebHostEnvironment>(),
                scope.ServiceProvider.GetRequiredService<ILogger<CollegeController>>());

            var action = await controller.PreviewBulkUploadStaff(new BulkStaffUploadRequest
            {
                CsvHeaders = new List<string> { "FullName", "Email", "DepartmentCode", "Designation" },
                StaffRows = new List<BulkStaffUploadRowDto>
                {
                    new() { FullName = "Preview Only Name", Email = $"  {email.ToUpperInvariant()} ", DepartmentCode = "ECE", Designation = "Professor" }
                }
            });
            var ok = Assert.IsType<OkObjectResult>(action.Result);
            var preview = Assert.IsType<RosterImportPreviewDto>(ok.Value);
            Assert.Equal(1, preview.UpdateCount);
            Assert.Equal(0, preview.CreateCount);

            Assert.DoesNotContain(db.ChangeTracker.Entries<UserAccount>(), e => e.State == EntityState.Modified);
            await db.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var faculty = await db.Users.FirstAsync(u => u.Id == facultyId);
            Assert.Equal(originalName, faculty.FullName);
            Assert.Equal(oldDeptId, faculty.DepartmentId);
            Assert.Equal(FacultyDesignation.Lecturer, faculty.Designation);
            Assert.Equal(originalStamp, faculty.SecurityStamp);
            Assert.Equal("KEEP_HASH", faculty.PasswordHash);
            Assert.Equal(0, await db.PlatformAuditLogs.CountAsync(a => a.TargetTenantId == collegeId && (a.Action == "BULK_ROSTER_IMPORT" || a.Action == "BULK_STUDENT_ROSTER_IMPORT")));
        }
    }

    [Fact]
    public async Task PreviewBulkUploadStudents_DoesNotDirtyTrackedEntities_OrPersistChanges()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var studentId = Guid.NewGuid();
        var oldDeptId = Guid.NewGuid();
        var newDeptId = Guid.NewGuid();
        var programId = Guid.NewGuid();
        var termId = Guid.NewGuid();
        var enrollmentId = Guid.NewGuid();
        var email = $"preview.student.{Guid.NewGuid():N}@sistec.ac.in";
        var studentNumber = $"PREVIEW{Guid.NewGuid():N}"[..12].ToUpperInvariant();
        var originalName = "Original Student";
        var originalStamp = Guid.NewGuid().ToString("N");

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "Preview Student College",
                TenantCode = $"PSDC_{Guid.NewGuid():N}"[..12],
                SsoDomain = $"psdc-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.CoursePrograms.Add(new CourseProgram
            {
                Id = programId,
                CollegeId = collegeId,
                Code = "BTECH",
                Name = "B.Tech",
                Level = AcademicProgramLevel.UG,
                TotalSemesters = 8,
                IsActive = true
            });
            db.Departments.AddRange(
                new Department { Id = oldDeptId, CollegeId = collegeId, CourseProgramId = programId, Code = "CSE", Name = "Computer Science", IntakeQuota = 120, CreatedAtUtc = DateTime.UtcNow },
                new Department { Id = newDeptId, CollegeId = collegeId, CourseProgramId = programId, Code = "ECE", Name = "Electronics", IntakeQuota = 60, CreatedAtUtc = DateTime.UtcNow }
            );
            db.SemesterTerms.Add(new SemesterTerm
            {
                Id = termId,
                CollegeId = collegeId,
                DepartmentId = oldDeptId,
                SemesterNumber = 5,
                SemesterName = "Semester 5",
                IsActive = true
            });
            db.Users.AddRange(
                new UserAccount { Id = adminId, CollegeId = collegeId, Email = $"admin.{Guid.NewGuid():N}@sistec.ac.in", FullName = "Admin", Role = UserRole.CollegeAdmin, IsActive = true, CreatedAtUtc = DateTime.UtcNow },
                new UserAccount
                {
                    Id = studentId,
                    CollegeId = collegeId,
                    DepartmentId = oldDeptId,
                    Email = email,
                    FullName = originalName,
                    EnrollmentOrEmployeeCode = studentNumber,
                    PasswordHash = "KEEP_HASH",
                    Role = UserRole.Student,
                    SecurityStamp = originalStamp,
                    IsActive = true,
                    IsActivated = true,
                    CreatedAtUtc = DateTime.UtcNow
                }
            );
            db.StudentAcademicEnrollments.Add(new StudentAcademicEnrollment
            {
                Id = enrollmentId,
                CollegeId = collegeId,
                StudentUserId = studentId,
                CourseProgramId = programId,
                DepartmentId = oldDeptId,
                CurrentSemesterTermId = termId,
                AdmissionBatch = "2023",
                AcademicStatus = AcademicStatus.Active
            });
            await db.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var tenant = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenant.IsSuperAdmin = true;
            tenant.CollegeId = collegeId;
            tenant.Role = UserRole.CollegeAdmin;

            var controller = new CollegeController(
                db,
                tenant,
                scope.ServiceProvider.GetRequiredService<IEmailSender>(),
                scope.ServiceProvider.GetRequiredService<IWebHostEnvironment>(),
                scope.ServiceProvider.GetRequiredService<ILogger<CollegeController>>());

            var action = await controller.PreviewBulkUploadStudents(new BulkStudentUploadRequest
            {
                CsvHeaders = new List<string> { "StudentName", "Email", "StudentNumber", "DepartmentCode", "Program", "AdmissionYear", "CurrentSemester" },
                StudentRows = new List<BulkStudentUploadRowDto>
                {
                    new() { StudentName = "Preview Only Name", Email = $"  {email.ToUpperInvariant()} ", StudentNumber = studentNumber, DepartmentCode = "ECE", Program = "BTECH", AdmissionYear = "2024", CurrentSemester = 6 }
                }
            });
            var ok = Assert.IsType<OkObjectResult>(action.Result);
            var preview = Assert.IsType<RosterImportPreviewDto>(ok.Value);
            Assert.Equal(1, preview.UpdateCount);
            Assert.Equal(0, preview.CreateCount);

            Assert.DoesNotContain(db.ChangeTracker.Entries<UserAccount>(), e => e.State == EntityState.Modified);
            await db.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var student = await db.Users.FirstAsync(u => u.Id == studentId);
            Assert.Equal(originalName, student.FullName);
            Assert.Equal(oldDeptId, student.DepartmentId);
            Assert.Equal(studentNumber, student.EnrollmentOrEmployeeCode);
            Assert.Equal(originalStamp, student.SecurityStamp);
            Assert.Equal("KEEP_HASH", student.PasswordHash);

            var enrollment = await db.StudentAcademicEnrollments.FirstAsync(e => e.Id == enrollmentId);
            Assert.Equal(termId, enrollment.CurrentSemesterTermId);
            Assert.Equal("2023", enrollment.AdmissionBatch);
            Assert.Equal(0, await db.PlatformAuditLogs.CountAsync(a => a.TargetTenantId == collegeId && (a.Action == "BULK_ROSTER_IMPORT" || a.Action == "BULK_STUDENT_ROSTER_IMPORT")));
        }
    }

    [Fact]
    public async Task BulkUploadStudents_InvalidRow_PreventsAnyPersistence()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var deptId = Guid.NewGuid();
        var programId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "Student Atomic College",
                TenantCode = $"SAC_{Guid.NewGuid():N}"[..12],
                SsoDomain = $"sac-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.CoursePrograms.Add(new CourseProgram
            {
                Id = programId,
                CollegeId = collegeId,
                Code = "BTECH",
                Name = "B.Tech",
                Level = AcademicProgramLevel.UG,
                TotalSemesters = 8,
                IsActive = true
            });
            db.Departments.Add(new Department { Id = deptId, CollegeId = collegeId, CourseProgramId = programId, Code = "CSE", Name = "Computer Science", IntakeQuota = 120, CreatedAtUtc = DateTime.UtcNow });
            db.Users.Add(new UserAccount { Id = adminId, CollegeId = collegeId, Email = $"admin.{Guid.NewGuid():N}@sac.ac.in", FullName = "Admin", Role = UserRole.CollegeAdmin, IsActive = true, CreatedAtUtc = DateTime.UtcNow });
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminId, collegeId, UserRole.CollegeAdmin));
        var response = await _client.PostAsJsonAsync("/api/college/students/bulk", new BulkStudentUploadRequest
        {
            CsvHeaders = new List<string> { "StudentName", "Email", "StudentNumber", "DepartmentCode", "Program", "AdmissionYear", "CurrentSemester" },
            StudentRows = new List<BulkStudentUploadRowDto>
            {
                new() { StudentName = "Valid Student", Email = $"valid.{Guid.NewGuid():N}@sistec.ac.in", StudentNumber = $"VALID{Guid.NewGuid():N}"[..12].ToUpperInvariant(), DepartmentCode = "CSE", Program = "BTECH", AdmissionYear = "2023", CurrentSemester = 5 },
                new() { StudentName = "Invalid Student", Email = "not-an-email", StudentNumber = $"INVAL{Guid.NewGuid():N}"[..12].ToUpperInvariant(), DepartmentCode = "CSE", Program = "BTECH", AdmissionYear = "2023", CurrentSemester = 5 }
            }
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            Assert.Equal(1, await db.Users.CountAsync(u => u.CollegeId == collegeId));
            Assert.Equal(0, await db.StudentAcademicEnrollments.CountAsync(e => e.CollegeId == collegeId));
            Assert.Equal(0, await db.PlatformAuditLogs.CountAsync(a => a.TargetTenantId == collegeId && a.Action == "BULK_STUDENT_ROSTER_IMPORT"));
        }
    }

    [Fact]
    public async Task BulkUploadStudents_ReimportIsIdempotent_AndPreservesEnrollmentProgression()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var studentId = Guid.NewGuid();
        var oldDeptId = Guid.NewGuid();
        var newDeptId = Guid.NewGuid();
        var programId = Guid.NewGuid();
        var termId = Guid.NewGuid();
        var enrollmentId = Guid.NewGuid();
        var email = $"reimport.student.{Guid.NewGuid():N}@sistec.ac.in";
        var studentNumber = $"REIMPORT{Guid.NewGuid():N}"[..12].ToUpperInvariant();
        var originalStamp = Guid.NewGuid().ToString("N");

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "Reimport College",
                TenantCode = $"RIC_{Guid.NewGuid():N}"[..12],
                SsoDomain = $"ric-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.CoursePrograms.Add(new CourseProgram
            {
                Id = programId,
                CollegeId = collegeId,
                Code = "BTECH",
                Name = "B.Tech",
                Level = AcademicProgramLevel.UG,
                TotalSemesters = 8,
                IsActive = true
            });
            db.Departments.AddRange(
                new Department { Id = oldDeptId, CollegeId = collegeId, CourseProgramId = programId, Code = "CSE", Name = "Computer Science", IntakeQuota = 120, CreatedAtUtc = DateTime.UtcNow },
                new Department { Id = newDeptId, CollegeId = collegeId, CourseProgramId = programId, Code = "ECE", Name = "Electronics", IntakeQuota = 60, CreatedAtUtc = DateTime.UtcNow }
            );
            db.SemesterTerms.Add(new SemesterTerm
            {
                Id = termId,
                CollegeId = collegeId,
                DepartmentId = oldDeptId,
                SemesterNumber = 5,
                SemesterName = "Semester 5",
                IsActive = true
            });
            db.Users.AddRange(
                new UserAccount { Id = adminId, CollegeId = collegeId, Email = $"admin.{Guid.NewGuid():N}@ric.ac.in", FullName = "Admin", Role = UserRole.CollegeAdmin, IsActive = true, CreatedAtUtc = DateTime.UtcNow },
                new UserAccount
                {
                    Id = studentId,
                    CollegeId = collegeId,
                    DepartmentId = oldDeptId,
                    Email = email,
                    FullName = "Original Student",
                    EnrollmentOrEmployeeCode = studentNumber,
                    PasswordHash = "KEEP_HASH",
                    Role = UserRole.Student,
                    SecurityStamp = originalStamp,
                    IsActive = true,
                    IsActivated = true,
                    CreatedAtUtc = DateTime.UtcNow
                }
            );
            db.StudentAcademicEnrollments.Add(new StudentAcademicEnrollment
            {
                Id = enrollmentId,
                CollegeId = collegeId,
                StudentUserId = studentId,
                CourseProgramId = programId,
                DepartmentId = oldDeptId,
                CurrentSemesterTermId = termId,
                AdmissionBatch = "2023",
                AcademicStatus = AcademicStatus.Active
            });
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminId, collegeId, UserRole.CollegeAdmin));
        var payload = new BulkStudentUploadRequest
        {
            CsvHeaders = new List<string> { "StudentName", "Email", "StudentNumber", "DepartmentCode", "Program", "AdmissionYear", "CurrentSemester" },
            StudentRows = new List<BulkStudentUploadRowDto>
            {
                new() { StudentName = "Updated Student", Email = $"  {email.ToUpperInvariant()} ", StudentNumber = studentNumber, DepartmentCode = "ECE", Program = "BTECH", AdmissionYear = "2023", CurrentSemester = 5 }
            }
        };

        for (var attempt = 1; attempt <= 2; attempt++)
        {
            var response = await _client.PostAsJsonAsync("/api/college/students/bulk", payload);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<BulkStudentUploadResultDto>();
            Assert.NotNull(result);
            Assert.Equal(0, result.SuccessfullyCreated);
            Assert.Equal(attempt == 1 ? 1 : 0, result.SuccessfullyUpdated);
            Assert.Equal(0, result.FailedCount);
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var student = await db.Users.FirstAsync(u => u.Id == studentId);
            Assert.Equal("Updated Student", student.FullName);
            Assert.Equal(newDeptId, student.DepartmentId);
            Assert.Equal(UserRole.Student, student.Role);
            Assert.Equal(studentNumber, student.EnrollmentOrEmployeeCode);
            Assert.Equal(originalStamp, student.SecurityStamp);
            Assert.Equal("KEEP_HASH", student.PasswordHash);

            Assert.Equal(1, await db.StudentAcademicEnrollments.CountAsync(e => e.CollegeId == collegeId));
            var enrollment = await db.StudentAcademicEnrollments.FirstAsync(e => e.Id == enrollmentId);
            Assert.Equal(termId, enrollment.CurrentSemesterTermId);
            Assert.Equal("2023", enrollment.AdmissionBatch);
            Assert.Equal(2, await db.PlatformAuditLogs.CountAsync(a => a.TargetTenantId == collegeId && a.Action == "BULK_STUDENT_ROSTER_IMPORT"));
        }
    }

    [Fact]
    public async Task RelieveHod_SecondCall_ReturnsBadRequest_AndKeepsHistoryConsistent()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var deptId = Guid.NewGuid();
        var hodId = Guid.NewGuid();
        var stamp = Guid.NewGuid().ToString("N");

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.CollegeTenants.Add(new CollegeTenant
            {
                Id = collegeId,
                Name = "Relieve College",
                TenantCode = $"RLC_{Guid.NewGuid():N}"[..12],
                SsoDomain = $"rlc-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 20,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.Departments.Add(new Department { Id = deptId, CollegeId = collegeId, Code = "CSE", Name = "Computer Science", IntakeQuota = 60, HodUserId = hodId, CreatedAtUtc = DateTime.UtcNow });
            db.Users.AddRange(
                new UserAccount { Id = adminId, CollegeId = collegeId, Email = $"admin.{Guid.NewGuid():N}@rlc.ac.in", FullName = "Admin", Role = UserRole.CollegeAdmin, IsActive = true, CreatedAtUtc = DateTime.UtcNow },
                new UserAccount { Id = hodId, CollegeId = collegeId, DepartmentId = deptId, Email = $"hod.{Guid.NewGuid():N}@rlc.ac.in", FullName = "HOD", Role = UserRole.HOD, SecurityStamp = stamp, IsActive = true, CreatedAtUtc = DateTime.UtcNow }
            );
            db.HodAppointmentHistories.Add(new HodAppointmentHistory
            {
                CollegeId = collegeId,
                DepartmentId = deptId,
                HodUserId = hodId,
                AppointedByName = "Admin",
                AppointedAtUtc = DateTime.UtcNow,
                IsCurrent = true
            });
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateToken(adminId, collegeId, UserRole.CollegeAdmin));
        var first = await _client.PostAsync($"/api/college/departments/{deptId}/relieve-hod", null);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var second = await _client.PostAsync($"/api/college/departments/{deptId}/relieve-hod", null);
        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var dept = await db.Departments.FirstAsync(d => d.Id == deptId);
            Assert.Null(dept.HodUserId);
            var hod = await db.Users.FirstAsync(u => u.Id == hodId);
            Assert.Equal(UserRole.Faculty, hod.Role);
            Assert.NotEqual(stamp, hod.SecurityStamp);
            Assert.Equal(1, await db.HodAppointmentHistories.CountAsync(h => h.DepartmentId == deptId));
            Assert.False(await db.HodAppointmentHistories.AnyAsync(h => h.DepartmentId == deptId && h.IsCurrent));
            Assert.Equal(1, await db.PlatformAuditLogs.CountAsync(a => a.TargetTenantId == collegeId && a.Action == "RELIEVE_HOD"));
        }
    }

}
