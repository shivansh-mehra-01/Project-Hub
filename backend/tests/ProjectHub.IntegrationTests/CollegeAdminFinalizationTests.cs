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
    public async Task Overview_Returns_AicteCadreCompliance_And_CohortCapacity()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var deptId = Guid.NewGuid();
        var progId = Guid.NewGuid();

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
                TenantCode = "SISTEC",
                SsoDomain = $"sistec-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 1000,
                StorageQuotaGb = 50,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.CollegeTenants.Add(college);

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

            var dept = new Department
            {
                Id = deptId,
                CollegeId = collegeId,
                CourseProgramId = progId,
                Code = "CSE",
                Name = "Computer Science and Engineering",
                IntakeQuota = 120,
            };
            db.Departments.Add(dept);

            // Add Faculty with Designations
            var prof = new UserAccount
            {
                Id = Guid.NewGuid(),
                CollegeId = collegeId,
                DepartmentId = deptId,
                FullName = "Dr. Professor One",
                Email = $"prof.{Guid.NewGuid():N}@sistec.ac.in",
                PasswordHash = "hash",
                Role = UserRole.Faculty,
                Designation = FacultyDesignation.Professor,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            var assocProf = new UserAccount
            {
                Id = Guid.NewGuid(),
                CollegeId = collegeId,
                DepartmentId = deptId,
                FullName = "Dr. Assoc Prof Two",
                Email = $"assoc.{Guid.NewGuid():N}@sistec.ac.in",
                PasswordHash = "hash",
                Role = UserRole.Faculty,
                Designation = FacultyDesignation.AssociateProfessor,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Users.AddRange(prof, assocProf);

            await db.SaveChangesAsync();
        }

        var token = GenerateToken(adminId, collegeId, UserRole.CollegeAdmin);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync("/api/college/overview");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var overview = await response.Content.ReadFromJsonAsync<CollegeOverviewDto>();
        Assert.NotNull(overview);
        Assert.NotNull(overview.ProgramAicteCompliance);
        Assert.True(overview.ProgramAicteCompliance.Count > 0);

        var ugCompliance = overview.ProgramAicteCompliance.FirstOrDefault(c => c.ProgramLevel == "UG Engineering");
        Assert.NotNull(ugCompliance);
        Assert.Equal(120, ugCompliance.SanctionedIntake);
        Assert.Equal("1:20", ugCompliance.RequiredRatio);
        Assert.Equal("NonCompliant", ugCompliance.CadreStatus);
        Assert.False(ugCompliance.IsCompliant);
        Assert.False(ugCompliance.IsSubstituted);
        Assert.Equal(0, ugCompliance.SubstitutedProfessorsCount);
        Assert.Null(ugCompliance.QualificationVerificationNotice);
        Assert.Equal(480, ugCompliance.TotalSanctionedStrength); // 120 intake * 4 years = 480
        Assert.Equal(24, ugCompliance.RequiredFaculty); // 480 / 20 = 24
        Assert.Equal(3, ugCompliance.RequiredProfessors); // 1:2:6 cadre: ceil(24 / 9) = 3
        Assert.Equal(1, ugCompliance.ActualProfessors);
        Assert.Equal(1, ugCompliance.ActualAssociateProfessors);

        // Cohort capacity: 120 intake * (8/2 = 4 years) = 480 total seat capacity
        Assert.NotNull(overview.CohortCapacity);
        Assert.Equal(480, overview.CohortCapacity.TotalSanctionedMultiCohortCapacity);
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
            StaffRows = new List<BulkStaffUploadRowDto>
            {
                new()
                {
                    FullName = "Prof. Alice Smith",
                    Email = email1,
                    Role = UserRole.Faculty,
                    Designation = FacultyDesignation.Professor,
                    DepartmentCode = "IT",
                    EmployeeCode = "EMP-001"
                },
                new()
                {
                    FullName = "Dr. Bob Jones",
                    Email = email2,
                    Role = UserRole.Faculty,
                    Designation = FacultyDesignation.AssociateProfessor,
                    DepartmentCode = "IT",
                    EmployeeCode = "EMP-002"
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

        // Send two rows: Row 1 is valid, Row 2 has an invalid email format (no @)
        var invalidPayload = new BulkStaffUploadRequest
        {
            StaffRows = new List<BulkStaffUploadRowDto>
            {
                new()
                {
                    FullName = "Valid Staff Person",
                    Email = $"valid.staff.{Guid.NewGuid():N}@sistec.ac.in",
                    Role = UserRole.Faculty,
                    Designation = FacultyDesignation.AssistantProfessor,
                    DepartmentCode = "CSE"
                },
                new()
                {
                    FullName = "Invalid Email Person",
                    Email = "invalid-email-without-at",
                    Role = UserRole.Faculty,
                    Designation = FacultyDesignation.Professor,
                    DepartmentCode = "CSE"
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
    public async Task AicteCompliance_MTech_Calculates_1To15_And_Cadre_Divisor3()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var progId = Guid.NewGuid();
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
                Name = "SISTec PG College",
                TenantCode = "SISTEC_PG",
                SsoDomain = $"sistec-pg-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 1000,
                StorageQuotaGb = 50,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.CollegeTenants.Add(college);

            // PG Engineering Program (M.Tech CSE)
            var program = new CourseProgram
            {
                Id = progId,
                CollegeId = collegeId,
                Code = "MTECH",
                Name = "Master of Technology in CSE",
                Level = AcademicProgramLevel.PG,
                TotalSemesters = 4,
                IsActive = true
            };
            db.CoursePrograms.Add(program);

            var dept = new Department
            {
                Id = deptId,
                CollegeId = collegeId,
                CourseProgramId = progId,
                Code = "MTECH_CSE",
                Name = "M.Tech Computer Science",
                IntakeQuota = 30 // 30 annual intake * 2 years = 60 students
            };
            db.Departments.Add(dept);

            var admin = new UserAccount
            {
                Id = adminId,
                CollegeId = collegeId,
                Email = $"admin.pg.{Guid.NewGuid():N}@sistec.ac.in",
                FullName = "Admin PG Test",
                Role = UserRole.CollegeAdmin,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Users.Add(admin);

            // Add PG Faculty with designations to satisfy 1:1:1 cadre
            // Total students = 60. FSR 1:15 => Required faculty = ceil(60 / 15) = 4.
            // Cadre 1:1:1 (divisor 3) with Annexure 5 apportionment => reqProf = 1, reqAssoc = 1, reqAsst = 2. Total = 4.
            db.Users.AddRange(
                new UserAccount
                {
                    Id = Guid.NewGuid(),
                    CollegeId = collegeId,
                    DepartmentId = deptId,
                    Email = $"prof1.{Guid.NewGuid():N}@sistec.ac.in",
                    FullName = "PG Prof 1",
                    Role = UserRole.Faculty,
                    Designation = FacultyDesignation.Professor,
                    IsActive = true
                },
                new UserAccount
                {
                    Id = Guid.NewGuid(),
                    CollegeId = collegeId,
                    DepartmentId = deptId,
                    Email = $"assoc1.{Guid.NewGuid():N}@sistec.ac.in",
                    FullName = "PG Assoc 1",
                    Role = UserRole.Faculty,
                    Designation = FacultyDesignation.AssociateProfessor,
                    IsActive = true
                },
                new UserAccount
                {
                    Id = Guid.NewGuid(),
                    CollegeId = collegeId,
                    DepartmentId = deptId,
                    Email = $"asst1.{Guid.NewGuid():N}@sistec.ac.in",
                    FullName = "PG Asst 1",
                    Role = UserRole.Faculty,
                    Designation = FacultyDesignation.AssistantProfessor,
                    IsActive = true
                },
                new UserAccount
                {
                    Id = Guid.NewGuid(),
                    CollegeId = collegeId,
                    DepartmentId = deptId,
                    Email = $"asst2.{Guid.NewGuid():N}@sistec.ac.in",
                    FullName = "PG Asst 2",
                    Role = UserRole.Faculty,
                    Designation = FacultyDesignation.AssistantProfessor,
                    IsActive = true
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

        var pgCompliance = overview.ProgramAicteCompliance.FirstOrDefault(p => p.ProgramCode == "MTECH");
        Assert.NotNull(pgCompliance);
        Assert.Equal("PG Engineering", pgCompliance.ProgramLevel);
        Assert.Equal(30, pgCompliance.SanctionedIntake);
        Assert.Equal(2, pgCompliance.ProgramDurationYears);
        Assert.Equal(60, pgCompliance.TotalSanctionedStrength);
        Assert.Equal("1:15", pgCompliance.RequiredRatio);
        Assert.Equal(4, pgCompliance.RequiredFaculty);
        Assert.Equal(4, pgCompliance.AvailableFaculty);
        Assert.Equal(1, pgCompliance.RequiredProfessors);
        Assert.Equal(1, pgCompliance.RequiredAssociateProfessors);
        Assert.Equal(2, pgCompliance.RequiredAssistantProfessors);
        Assert.Equal("Compliant", pgCompliance.CadreStatus);
        Assert.True(pgCompliance.IsCompliant);
        Assert.False(pgCompliance.IsSubstituted);
        Assert.Equal(0, pgCompliance.SubstitutedProfessorsCount);
        Assert.Null(pgCompliance.QualificationVerificationNotice);
    }

    [Fact]
    public async Task IntakeUtilization_DoesNotDuplicate_MultiSemester_Enrollments()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var deptId = Guid.NewGuid();
        var progId = Guid.NewGuid();
        var studentUserId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var college = new CollegeTenant
            {
                Id = collegeId,
                Name = "SISTec Distinct Intake College",
                TenantCode = "SISTEC_INTAKE",
                SsoDomain = $"sistec-intake-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 1000,
                StorageQuotaGb = 50,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.CollegeTenants.Add(college);

            var program = new CourseProgram
            {
                Id = progId,
                CollegeId = collegeId,
                Code = "ME",
                Name = "Mechanical Engineering Program",
                Level = AcademicProgramLevel.UG,
                TotalSemesters = 8,
                IsActive = true
            };
            db.CoursePrograms.Add(program);

            var dept = new Department
            {
                Id = deptId,
                CollegeId = collegeId,
                CourseProgramId = progId,
                Code = "MECH",
                Name = "Mechanical Engineering",
                IntakeQuota = 60
            };
            db.Departments.Add(dept);

            var admin = new UserAccount
            {
                Id = adminId,
                CollegeId = collegeId,
                Email = $"admin.intake.{Guid.NewGuid():N}@sistec.ac.in",
                FullName = "Admin Intake Test",
                Role = UserRole.CollegeAdmin,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Users.Add(admin);

            var student = new UserAccount
            {
                Id = studentUserId,
                CollegeId = collegeId,
                DepartmentId = deptId,
                Email = $"student.{Guid.NewGuid():N}@sistec.ac.in",
                FullName = "Multi Term Student",
                Role = UserRole.Student,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Users.Add(student);

            var session = new AcademicSession
            {
                Id = Guid.NewGuid(),
                CollegeId = collegeId,
                Label = "2026-2027",
                StartDate = DateTime.UtcNow.AddMonths(-2),
                EndDate = DateTime.UtcNow.AddMonths(10),
                IsActive = true
            };
            db.AcademicSessions.Add(session);

            var term1 = new SemesterTerm
            {
                Id = Guid.NewGuid(),
                CollegeId = collegeId,
                DepartmentId = deptId,
                AcademicSessionId = session.Id,
                SemesterNumber = 7,
                Parity = SemesterParity.Odd,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            var term2 = new SemesterTerm
            {
                Id = Guid.NewGuid(),
                CollegeId = collegeId,
                DepartmentId = deptId,
                AcademicSessionId = session.Id,
                SemesterNumber = 8,
                Parity = SemesterParity.Even,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.SemesterTerms.AddRange(term1, term2);

            // Same student has two enrollment records (one per semester)
            db.StudentAcademicEnrollments.AddRange(
                new StudentAcademicEnrollment
                {
                    Id = Guid.NewGuid(),
                    CollegeId = collegeId,
                    DepartmentId = deptId,
                    CourseProgramId = progId,
                    CurrentSemesterTermId = term1.Id,
                    StudentUserId = studentUserId,
                    AdmissionBatch = "2023-2027",
                    AcademicStatus = AcademicStatus.Active
                },
                new StudentAcademicEnrollment
                {
                    Id = Guid.NewGuid(),
                    CollegeId = collegeId,
                    DepartmentId = deptId,
                    CourseProgramId = progId,
                    CurrentSemesterTermId = term2.Id,
                    StudentUserId = studentUserId,
                    AdmissionBatch = "2023-2027",
                    AcademicStatus = AcademicStatus.Active
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

        // Crucial assertion: Despite 2 enrollment records, distinct enrolled students MUST be 1
        Assert.NotNull(overview.CohortCapacity);
        Assert.Equal(1, overview.CohortCapacity.TotalEnrolledStudents);
    }

    [Fact]
    public async Task AccreditationOverview_WhenFreshCollege_DoesNotFabricateSyntheticScores()
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
                Name = "SISTec Fresh Accreditation College",
                TenantCode = "SISTEC_ACCR",
                SsoDomain = $"sistec-accr-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 1000,
                StorageQuotaGb = 50,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.CollegeTenants.Add(college);

            var admin = new UserAccount
            {
                Id = adminId,
                CollegeId = collegeId,
                Email = $"admin.accr.{Guid.NewGuid():N}@sistec.ac.in",
                FullName = "Admin Accr Test",
                Role = UserRole.CollegeAdmin,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Users.Add(admin);

            await db.SaveChangesAsync();
        }

        var token = GenerateToken(adminId, collegeId, UserRole.CollegeAdmin);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync("/api/college/accreditation/overview");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var overview = await response.Content.ReadFromJsonAsync<AccreditationOverviewDto>();
        Assert.NotNull(overview);

        // Must NOT contain synthetic auto-seeded 68.4% cycle
        Assert.Empty(overview.Cycles);
        Assert.Equal(0, overview.AccreditationPrograms);
        Assert.Equal(0, overview.PendingReviews);
        Assert.Equal(0, overview.EvidenceDocuments);
    }

    [Fact]
    public async Task AicteCompliance_ProfessorSubstitution_AllowsAssociateProfessorToSubstitute()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var progId = Guid.NewGuid();
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
                Name = "Substitution Test College",
                TenantCode = "SUB_COL",
                SsoDomain = $"sub-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 500,
                StorageQuotaGb = 10,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.CollegeTenants.Add(college);

            var program = new CourseProgram
            {
                Id = progId,
                CollegeId = collegeId,
                Code = "MTECH_SUB",
                Name = "M.Tech Substitution Program",
                Level = AcademicProgramLevel.PG,
                TotalSemesters = 4,
                IsActive = true
            };
            db.CoursePrograms.Add(program);

            var dept = new Department
            {
                Id = deptId,
                CollegeId = collegeId,
                CourseProgramId = progId,
                Code = "MTECH_SUB_DEPT",
                Name = "M.Tech Dept",
                IntakeQuota = 30 // 30 * 2 = 60 students => 4 faculty needed (1 Prof, 1 Assoc, 2 Asst)
            };
            db.Departments.Add(dept);

            var admin = new UserAccount
            {
                Id = adminId,
                CollegeId = collegeId,
                Email = $"admin.sub.{Guid.NewGuid():N}@sub.ac.in",
                FullName = "Admin Sub",
                Role = UserRole.CollegeAdmin,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Users.Add(admin);

            // Staffing with 0 Professors, 2 Associate Professors (1 surplus), 2 Assistant Professors
            // Total = 4 faculty. Professor deficit of 1 covered by surplus Associate Professor per Annexure 5 Note.
            db.Users.AddRange(
                new UserAccount
                {
                    Id = Guid.NewGuid(),
                    CollegeId = collegeId,
                    DepartmentId = deptId,
                    Email = $"assoc1.{Guid.NewGuid():N}@sub.ac.in",
                    FullName = "Assoc Prof 1",
                    Role = UserRole.Faculty,
                    Designation = FacultyDesignation.AssociateProfessor,
                    IsActive = true
                },
                new UserAccount
                {
                    Id = Guid.NewGuid(),
                    CollegeId = collegeId,
                    DepartmentId = deptId,
                    Email = $"assoc2.{Guid.NewGuid():N}@sub.ac.in",
                    FullName = "Assoc Prof 2",
                    Role = UserRole.Faculty,
                    Designation = FacultyDesignation.AssociateProfessor,
                    IsActive = true
                },
                new UserAccount
                {
                    Id = Guid.NewGuid(),
                    CollegeId = collegeId,
                    DepartmentId = deptId,
                    Email = $"asst1.{Guid.NewGuid():N}@sub.ac.in",
                    FullName = "Asst Prof 1",
                    Role = UserRole.Faculty,
                    Designation = FacultyDesignation.AssistantProfessor,
                    IsActive = true
                },
                new UserAccount
                {
                    Id = Guid.NewGuid(),
                    CollegeId = collegeId,
                    DepartmentId = deptId,
                    Email = $"asst2.{Guid.NewGuid():N}@sub.ac.in",
                    FullName = "Asst Prof 2",
                    Role = UserRole.Faculty,
                    Designation = FacultyDesignation.AssistantProfessor,
                    IsActive = true
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

        var comp = overview.ProgramAicteCompliance.FirstOrDefault(p => p.ProgramCode == "MTECH_SUB");
        Assert.NotNull(comp);
        Assert.Equal(4, comp.RequiredFaculty);
        Assert.Equal(4, comp.AvailableFaculty);
        Assert.Equal(0, comp.ActualProfessors);
        Assert.Equal(2, comp.ActualAssociateProfessors);
        Assert.Equal("Compliant — subject to qualification verification", comp.CadreStatus);
        Assert.True(comp.IsCompliant);
        Assert.True(comp.IsSubstituted);
        Assert.Equal(1, comp.SubstitutedProfessorsCount);
        Assert.NotNull(comp.QualificationVerificationNotice);
        Assert.Contains("PhD", comp.QualificationVerificationNotice);
        Assert.Contains("Colabex does not independently validate", comp.QualificationVerificationNotice);
        Assert.Contains("substitution", comp.StatusMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AicteCompliance_ZeroIntakeDepartment_DoesNotFallbackTo120()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var progId = Guid.NewGuid();
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
                Name = "Zero Intake Test College",
                TenantCode = "ZERO_COL",
                SsoDomain = $"zero-{Guid.NewGuid():N}.ac.in",
                IsActive = true,
                MaxStudentSeats = 100,
                StorageQuotaGb = 5,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.CollegeTenants.Add(college);

            var program = new CourseProgram
            {
                Id = progId,
                CollegeId = collegeId,
                Code = "BTECH_NEW",
                Name = "B.Tech New Inactive",
                Level = AcademicProgramLevel.UG,
                TotalSemesters = 8,
                IsActive = true
            };
            db.CoursePrograms.Add(program);

            var dept = new Department
            {
                Id = deptId,
                CollegeId = collegeId,
                CourseProgramId = progId,
                Code = "DEPT_ZERO",
                Name = "Zero Intake Branch",
                IntakeQuota = 0 // Exactly zero intake
            };
            db.Departments.Add(dept);

            var admin = new UserAccount
            {
                Id = adminId,
                CollegeId = collegeId,
                Email = $"admin.zero.{Guid.NewGuid():N}@zero.ac.in",
                FullName = "Admin Zero",
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

        var comp = overview.ProgramAicteCompliance.FirstOrDefault(p => p.ProgramCode == "BTECH_NEW");
        Assert.NotNull(comp);
        Assert.Equal(0, comp.SanctionedIntake);
        Assert.Equal(0, comp.TotalSanctionedStrength);
        Assert.Equal(0, comp.RequiredFaculty);
        Assert.Equal("Compliant", comp.CadreStatus);
        Assert.Contains("Zero sanctioned intake", comp.StatusMessage);
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

        // 3. Bulk upload staff with SuperAdmin role must fail
        var bulkRes = await _client.PostAsJsonAsync("/api/college/users/bulk", new
        {
            staffRows = new[]
            {
                new
                {
                    fullName = "Bulk Escalated User",
                    email = $"bulk.malicious.{Guid.NewGuid():N}@sistec.ac.in",
                    role = UserRole.SuperAdmin
                }
            }
        });
        Assert.Equal(HttpStatusCode.BadRequest, bulkRes.StatusCode);
        var bulkBody = await bulkRes.Content.ReadAsStringAsync();
        Assert.Contains("SuperAdmin", bulkBody);
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
    public async Task HodManagement_CannotReassignCrossTenantUser_ReturnsConflict()
    {
        var collegeAId = Guid.NewGuid();
        var collegeBId = Guid.NewGuid();
        var adminAId = Guid.NewGuid();
        var deptAId = Guid.NewGuid();
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
                Id = Guid.NewGuid(),
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
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("another institution", body);
    }

    [Fact]
    public async Task AccreditationCycles_DerivesActualEvidenceAndPendingReviews_NotHardcoded()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var cycleId = Guid.NewGuid();
        var metricId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var college = new CollegeTenant
            {
                Id = collegeId,
                Name = "SISTec Accreditation Real Counts College",
                TenantCode = "SISTEC_ARC",
                SsoDomain = $"arc-{Guid.NewGuid():N}.ac.in",
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
                Email = $"admin.arc.{Guid.NewGuid():N}@sistec.ac.in",
                FullName = "Admin ARC",
                Role = UserRole.CollegeAdmin,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Users.Add(admin);

            var cycle = new AccreditationCycle
            {
                Id = cycleId,
                CollegeId = collegeId,
                FrameworkCode = "NBA",
                VersionLabel = "NBA Tier-II SAR Manual (Rev. 2025)",
                CycleName = "CSE 2026 NBA SAR",
                AcademicYear = "2026–2027",
                Level = "Program",
                Status = "DataCollection",
                StartDate = DateTime.UtcNow.AddMonths(-1),
                EndDate = DateTime.UtcNow.AddMonths(11),
                TargetScore = 1000m,
                AttainedScore = 0m,
                AttainmentPercentage = 0m,
                CreatedAtUtc = DateTime.UtcNow
            };
            db.AccreditationCycles.Add(cycle);

            // Add exactly 1 real evidence document in UnderReview status
            var evidence = new AccreditationEvidence
            {
                Id = Guid.NewGuid(),
                CollegeId = collegeId,
                CycleId = cycleId,
                MetricId = metricId,
                CriterionCode = "Criterion 1",
                MetricCode = "1.1",
                Title = "Real Persisted Evidence Document",
                Description = "Actual persisted file",
                StorageKey = "evidence/real_doc.pdf",
                FileName = "real_doc.pdf",
                FileSizeBytes = 1024,
                FileType = "application/pdf",
                UploadedByName = "Admin ARC",
                UploadedByRole = "College Admin",
                Status = "UnderReview",
                CreatedAtUtc = DateTime.UtcNow
            };
            db.AccreditationEvidences.Add(evidence);

            await db.SaveChangesAsync();
        }

        var token = GenerateToken(adminId, collegeId, UserRole.CollegeAdmin);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // 1. GetCycles must return EvidenceCount = 1 and PendingReviews = 1 (NOT 18 and 2)
        var cyclesRes = await _client.GetAsync("/api/college/accreditation/cycles");
        Assert.Equal(HttpStatusCode.OK, cyclesRes.StatusCode);
        var cycles = await cyclesRes.Content.ReadFromJsonAsync<List<AccreditationCycleDto>>();
        Assert.NotNull(cycles);
        var matched = Assert.Single(cycles, c => c.Id == cycleId);
        Assert.Equal(1, matched.EvidenceCount);
        Assert.Equal(1, matched.PendingReviews);

        // 2. GetCycle detail must also return EvidenceCount = 1 and PendingReviews = 1
        var cycleRes = await _client.GetAsync($"/api/college/accreditation/cycles/{cycleId}");
        Assert.Equal(HttpStatusCode.OK, cycleRes.StatusCode);
        var singleCycle = await cycleRes.Content.ReadFromJsonAsync<AccreditationCycleDto>();
        Assert.NotNull(singleCycle);
        Assert.Equal(1, singleCycle.EvidenceCount);
        Assert.Equal(1, singleCycle.PendingReviews);
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
}
