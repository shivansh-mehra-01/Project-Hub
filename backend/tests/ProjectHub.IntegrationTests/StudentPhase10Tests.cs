using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
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

public class StudentPhase10Tests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public StudentPhase10Tests(CustomWebApplicationFactory factory)
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

    private async Task<(Guid StudentId, string Token, string EnrollmentNo)> CreateStudentAsync(
        string emailSuffix,
        Guid? collegeId = null,
        Guid? departmentId = null)
    {
        var cid = collegeId ?? DbInitializer.SistecTenantId;
        var did = departmentId ?? DbInitializer.CseDepartmentId;
        var studentId = Guid.NewGuid();
        var enrollmentNo = $"0176CS{Random.Shared.Next(100000, 999999)}";

        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

        var user = new UserAccount
        {
            Id = studentId,
            CollegeId = cid,
            DepartmentId = did,
            FullName = $"Student {emailSuffix}",
            Email = $"student.{emailSuffix.ToLowerInvariant()}.{Guid.NewGuid():N}@sistec.ac.in",
            EnrollmentOrEmployeeCode = enrollmentNo,
            Role = UserRole.Student,
            IsActivated = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        await db.Users.AddAsync(user);
        await db.SaveChangesAsync();

        var token = GenerateToken(studentId, cid, did, UserRole.Student);
        return (studentId, token, enrollmentNo);
    }

    private async Task<(Guid FacultyId, string Token)> CreateFacultyAsync(
        string name,
        Guid? collegeId = null,
        Guid? departmentId = null,
        UserRole role = UserRole.Faculty,
        bool isCoordinator = false)
    {
        var cid = collegeId ?? DbInitializer.SistecTenantId;
        var did = departmentId ?? DbInitializer.CseDepartmentId;
        var facultyId = Guid.NewGuid();

        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

        var user = new UserAccount
        {
            Id = facultyId,
            CollegeId = cid,
            DepartmentId = did,
            FullName = name,
            Email = $"faculty.{facultyId:N}@sistec.ac.in",
            EnrollmentOrEmployeeCode = $"FAC{Random.Shared.Next(1000, 9999)}",
            Role = role,
            IsActivated = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        await db.Users.AddAsync(user);
        await db.SaveChangesAsync();

        var token = GenerateToken(facultyId, cid, did, role, isCoordinator);
        return (facultyId, token);
    }

    private async Task<(ProjectTeam Team, UserAccount Lead, UserAccount Member, UserAccount Guide)> SeedReadyProjectAsync(
        bool withPublishedEvaluation = true,
        bool withAcceptedReport = true,
        bool withAllIndividualScores = true,
        VivaOutcome vivaOutcome = VivaOutcome.Pass)
    {
        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

        var collegeId = DbInitializer.SistecTenantId;
        var deptId = DbInitializer.CseDepartmentId;

        var leadId = Guid.NewGuid();
        var lead = new UserAccount
        {
            Id = leadId,
            CollegeId = collegeId,
            DepartmentId = deptId,
            FullName = "Shivansh Mehra Lead P10",
            Email = $"lead.p10.{leadId:N}@sistec.ac.in",
            EnrollmentOrEmployeeCode = $"0176CS{Random.Shared.Next(100000, 999999)}",
            Role = UserRole.Student,
            IsActivated = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        var memberId = Guid.NewGuid();
        var member = new UserAccount
        {
            Id = memberId,
            CollegeId = collegeId,
            DepartmentId = deptId,
            FullName = "Aarav Sharma Member P10",
            Email = $"member.p10.{memberId:N}@sistec.ac.in",
            EnrollmentOrEmployeeCode = $"0176CS{Random.Shared.Next(100000, 999999)}",
            Role = UserRole.Student,
            IsActivated = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        var guideId = Guid.NewGuid();
        var guide = new UserAccount
        {
            Id = guideId,
            CollegeId = collegeId,
            DepartmentId = deptId,
            FullName = "Prof. S. K. Verma",
            Email = $"guide.p10.{guideId:N}@sistec.ac.in",
            EnrollmentOrEmployeeCode = $"FAC{Random.Shared.Next(1000, 9999)}",
            Role = UserRole.Faculty,
            IsActivated = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        await db.Users.AddRangeAsync(lead, member, guide);

        var track = await db.AcademicTracks.FirstOrDefaultAsync(t => t.CollegeId == collegeId && t.DepartmentId == deptId);
        var trackId = track?.Id ?? Guid.NewGuid();

        var team = new ProjectTeam
        {
            CollegeId = collegeId,
            DepartmentId = deptId,
            AcademicTrackId = trackId,
            TeamCode = $"2026-CS-P10-{Random.Shared.Next(10, 99)}",
            Title = "Edge-Accelerated Microgrid Anomaly Detection & Autonomous Telemetry",
            Abstract = "High-throughput telemetry and edge inference architecture for resilient distributed microgrid infrastructure.",
            DomainTag = "IoT & Clean Energy",
            SdgCode = "SDG 7",
            Status = ProjectStatus.ReadyForViva,
            GuideUserId = guideId,
            GuideAllocatedAtUtc = DateTime.UtcNow,
            GuideAllocationRemarks = "Formally allocated by HOD"
        };
        await db.ProjectTeams.AddAsync(team);

        var teamLeadMember = new TeamMember
        {
            CollegeId = collegeId,
            ProjectTeamId = team.Id,
            UserId = leadId,
            IsTeamLead = true,
            ModuleResponsibility = "Edge Hardware Architecture & ML Pipeline",
            JoinedAtUtc = DateTime.UtcNow
        };

        var teammate = new TeamMember
        {
            CollegeId = collegeId,
            ProjectTeamId = team.Id,
            UserId = memberId,
            IsTeamLead = false,
            ModuleResponsibility = "Cloud Broker & Dashboard Visualization",
            JoinedAtUtc = DateTime.UtcNow
        };

        await db.TeamMembers.AddRangeAsync(teamLeadMember, teammate);

        // Seed Final Report Submission if requested
        if (withAcceptedReport)
        {
            var report = new ProjectReportSubmission
            {
                CollegeId = collegeId,
                ProjectTeamId = team.Id,
                SubmittedByUserId = leadId,
                ProjectTitle = team.Title,
                Abstract = team.Abstract,
                RepositoryUrl = "https://github.com/sistec/microgrid-telemetry-p10",
                DemoUrl = "https://microgrid.sistec.ac.in",
                ReportFileName = "SISTec_CSE_FinalReport_2026_P10.pdf",
                ReportSha256Checksum = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                Status = FinalSubmissionStatus.Accepted,
                ReviewedByUserId = guideId,
                ReviewFeedback = "Excellent capstone report and verified demo deployment.",
                ReviewedAtUtc = DateTime.UtcNow,
                SubmittedAtUtc = DateTime.UtcNow.AddDays(-2)
            };
            await db.ProjectReportSubmissions.AddAsync(report);
        }

        // Seed Viva Evaluation if requested
        if (withPublishedEvaluation)
        {
            var evaluation = new VivaEvaluation
            {
                CollegeId = collegeId,
                ProjectTeamId = team.Id,
                EvaluatorUserId = guideId,
                CheckpointType = CheckpointType.FinalViva,
                SharedTotalScore = 88m,
                IsLocked = true,
                IsPublished = true,
                Outcome = vivaOutcome,
                PublishedAtUtc = DateTime.UtcNow,
                ModerationRemarks = "Defense completed with high distinction.",
                SharedRubricScoresJson = JsonSerializer.Serialize(new[]
                {
                    new EvaluatorAssessmentCriterionScoreDto
                    {
                        CriterionCode = "TECH",
                        Title = "Technical Implementation",
                        AwardedMarks = 45,
                        MaxMarks = 50
                    },
                    new EvaluatorAssessmentCriterionScoreDto
                    {
                        CriterionCode = "VIVA",
                        Title = "Viva Defense & Q&A",
                        AwardedMarks = 43,
                        MaxMarks = 50
                    }
                })
            };

            if (withAllIndividualScores)
            {
                var indScoreLead = new IndividualStudentScore
                {
                    CollegeId = collegeId,
                    StudentUserId = leadId,
                    ModuleOwnershipScore = 10m,
                    VivaQaScore = 10m,
                    LogDisciplineScore = 10m
                };
                indScoreLead.ComputeFinalMark(evaluation.SharedTotalScore);

                var indScoreMember = new IndividualStudentScore
                {
                    CollegeId = collegeId,
                    StudentUserId = memberId,
                    ModuleOwnershipScore = 9m,
                    VivaQaScore = 9m,
                    LogDisciplineScore = 9m
                };
                indScoreMember.ComputeFinalMark(evaluation.SharedTotalScore);

                evaluation.IndividualScores = new List<IndividualStudentScore> { indScoreLead, indScoreMember };
            }

            await db.VivaEvaluations.AddAsync(evaluation);
        }

        await db.SaveChangesAsync();

        return (team, lead, member, guide);
    }

    [Fact]
    public async Task GetClosureReadiness_ReturnsCorrectEligibilityGates()
    {
        // 1. Ready project with all prerequisites
        var (readyTeam, _, _, _) = await SeedReadyProjectAsync();
        var (hodId, hodToken) = await CreateFacultyAsync("Prof. HOD Readiness", readyTeam.CollegeId, readyTeam.DepartmentId, UserRole.HOD);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);
        var readinessResp = await _client.GetAsync($"/api/closure/teams/{readyTeam.Id}/readiness");
        Assert.Equal(HttpStatusCode.OK, readinessResp.StatusCode);

        var readiness = await readinessResp.Content.ReadFromJsonAsync<ClosureReadinessDto>();
        Assert.NotNull(readiness);
        Assert.True(readiness.CanClose);
        Assert.True(readiness.EvaluationPublished);
        Assert.True(readiness.FinalReportAccepted);
        Assert.True(readiness.IndividualScoresFinalized);
        Assert.Equal(VivaOutcome.Pass, readiness.EvaluationOutcome);
        Assert.Equal(2, readiness.TotalMembersCount);
        Assert.Equal(2, readiness.ScoredMembersCount);
        Assert.False(readiness.IsClosed);

        // 2. Unready project (missing accepted report and evaluation)
        var (unreadyTeam, _, _, _) = await SeedReadyProjectAsync(withPublishedEvaluation: false, withAcceptedReport: false);
        var unreadyResp = await _client.GetAsync($"/api/closure/teams/{unreadyTeam.Id}/readiness");
        Assert.Equal(HttpStatusCode.OK, unreadyResp.StatusCode);

        var unready = await unreadyResp.Content.ReadFromJsonAsync<ClosureReadinessDto>();
        Assert.NotNull(unready);
        Assert.False(unready.CanClose);
        Assert.False(unready.EvaluationPublished);
        Assert.False(unready.FinalReportAccepted);
    }

    [Fact]
    public async Task ProjectCannotClose_BeforeEvaluationPublication_ReturnsBadRequest()
    {
        var (team, _, _, _) = await SeedReadyProjectAsync(withPublishedEvaluation: false);
        var (hodId, hodToken) = await CreateFacultyAsync("Prof. HOD Unpublished", team.CollegeId, team.DepartmentId, UserRole.HOD);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);
        var closeResp = await _client.PostAsJsonAsync($"/api/closure/teams/{team.Id}/close", new CloseProjectRequest
        {
            ClosureRemarks = "Premature formal closure attempt"
        });

        Assert.Equal(HttpStatusCode.BadRequest, closeResp.StatusCode);
        var err = await closeResp.Content.ReadAsStringAsync();
        Assert.Contains("viva defense evaluation must be published", err);
    }

    [Fact]
    public async Task ProjectCannotClose_WithMissingOrUnacceptedFinalReport_ReturnsBadRequest()
    {
        var (team, _, _, _) = await SeedReadyProjectAsync(withAcceptedReport: false);
        var (hodId, hodToken) = await CreateFacultyAsync("Prof. HOD NoReport", team.CollegeId, team.DepartmentId, UserRole.HOD);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);
        var closeResp = await _client.PostAsJsonAsync($"/api/closure/teams/{team.Id}/close", new CloseProjectRequest
        {
            ClosureRemarks = "Attempt to close without accepted report"
        });

        Assert.Equal(HttpStatusCode.BadRequest, closeResp.StatusCode);
        var err = await closeResp.Content.ReadAsStringAsync();
        Assert.Contains("report submission must be formally accepted", err);
    }

    [Fact]
    public async Task ProjectCannotClose_WithMissingIndividualScores_ReturnsBadRequest()
    {
        var (team, _, _, _) = await SeedReadyProjectAsync(withAllIndividualScores: false);
        var (hodId, hodToken) = await CreateFacultyAsync("Prof. HOD IncompleteScores", team.CollegeId, team.DepartmentId, UserRole.HOD);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);
        var closeResp = await _client.PostAsJsonAsync($"/api/closure/teams/{team.Id}/close", new CloseProjectRequest
        {
            ClosureRemarks = "Attempt to close with missing member scores"
        });

        Assert.Equal(HttpStatusCode.BadRequest, closeResp.StatusCode);
        var err = await closeResp.Content.ReadAsStringAsync();
        Assert.Contains("Individual contribution marks must be finalized", err);
    }

    [Fact]
    public async Task NonHod_CannotCloseProject_ReturnsForbidden()
    {
        var (team, lead, _, guide) = await SeedReadyProjectAsync();

        // 1. Student attempt
        var studentToken = GenerateToken(lead.Id, team.CollegeId, team.DepartmentId, UserRole.Student);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);
        var studentClose = await _client.PostAsJsonAsync($"/api/closure/teams/{team.Id}/close", new CloseProjectRequest
        {
            ClosureRemarks = "Student unauthorized closure attempt"
        });
        Assert.Equal(HttpStatusCode.Forbidden, studentClose.StatusCode);

        // 2. Faculty / Guide attempt
        var guideToken = GenerateToken(guide.Id, team.CollegeId, team.DepartmentId, UserRole.Faculty);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", guideToken);
        var guideClose = await _client.PostAsJsonAsync($"/api/closure/teams/{team.Id}/close", new CloseProjectRequest
        {
            ClosureRemarks = "Guide unauthorized closure attempt"
        });
        Assert.Equal(HttpStatusCode.Forbidden, guideClose.StatusCode);

        // 3. SuperAdmin attempt (boundary rule: institutional closure is reserved for department academic leadership)
        var superAdminToken = GenerateToken(Guid.NewGuid(), team.CollegeId, null, UserRole.SuperAdmin);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", superAdminToken);
        var superAdminClose = await _client.PostAsJsonAsync($"/api/closure/teams/{team.Id}/close", new CloseProjectRequest
        {
            ClosureRemarks = "SuperAdmin intrusion into academic closure"
        });
        Assert.Equal(HttpStatusCode.Forbidden, superAdminClose.StatusCode);
    }

    [Fact]
    public async Task CrossDepartmentHOD_CannotCloseOrReopenProject_ReturnsForbidden()
    {
        var (team, _, _, _) = await SeedReadyProjectAsync();
        var otherDeptId = Guid.NewGuid();
        var (otherHodId, otherHodToken) = await CreateFacultyAsync("Prof. Other Dept HOD", team.CollegeId, otherDeptId, UserRole.HOD);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", otherHodToken);

        // Cross-department close attempt
        var closeResp = await _client.PostAsJsonAsync($"/api/closure/teams/{team.Id}/close", new CloseProjectRequest
        {
            ClosureRemarks = "Cross-department close attempt"
        });
        Assert.Equal(HttpStatusCode.Forbidden, closeResp.StatusCode);

        // Cross-department reopen attempt
        var reopenResp = await _client.PostAsJsonAsync($"/api/closure/teams/{team.Id}/reopen", new ReopenProjectRequest
        {
            Reason = "Valid reason but from wrong department HOD"
        });
        Assert.Equal(HttpStatusCode.Forbidden, reopenResp.StatusCode);
    }

    [Fact]
    public async Task CompleteFormalClosureFlow_GeneratesImmutableRecordsAndArchivesTeam()
    {
        var (team, lead, member, guide) = await SeedReadyProjectAsync();
        var (hodId, hodToken) = await CreateFacultyAsync("Prof. Authorized HOD P10", team.CollegeId, team.DepartmentId, UserRole.HOD);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);

        // 1. Execute formal closure
        var closeResp = await _client.PostAsJsonAsync($"/api/closure/teams/{team.Id}/close", new CloseProjectRequest
        {
            ClosureRemarks = "Formally closed by HOD with distinction following successful viva defense."
        });

        Assert.Equal(HttpStatusCode.OK, closeResp.StatusCode);
        var closeRawJson = await closeResp.Content.ReadAsStringAsync();
        using (var doc = JsonDocument.Parse(closeRawJson))
        {
            Assert.Equal("Closed", doc.RootElement.GetProperty("status").GetString());
            Assert.True(doc.RootElement.TryGetProperty("closureCertificateHash", out _));
            Assert.False(doc.RootElement.TryGetProperty("certificateVerificationHash", out _));
        }

        var result = JsonSerializer.Deserialize<ProjectClosureResultDto>(closeRawJson, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        Assert.NotNull(result);
        Assert.Equal(ProjectClosureStatus.Closed, result.Status);
        Assert.True(result.IsArchived);
        Assert.False(string.IsNullOrWhiteSpace(result.ClosureCertificateHash));
        Assert.Equal(64, result.ClosureCertificateHash.Length); // SHA-256 hex string length
        Assert.Equal(2, result.AcademicRecordsGenerated);

        // 2. Verify Database State
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var dbTeam = await db.ProjectTeams.FirstAsync(t => t.Id == team.Id);
            Assert.Equal(ProjectStatus.Archived, dbTeam.Status);

            var closureRecord = await db.ProjectClosureRecords.FirstOrDefaultAsync(c => c.ProjectTeamId == team.Id);
            Assert.NotNull(closureRecord);
            Assert.Equal(ProjectClosureStatus.Closed, closureRecord.Status);
            Assert.Equal(hodId, closureRecord.ClosedByUserId);
            Assert.Equal(result.ClosureCertificateHash, closureRecord.ClosureCertificateHash);

            var academicRecords = await db.StudentAcademicRecords
                .Where(r => r.ProjectTeamId == team.Id)
                .OrderBy(r => r.IsTeamLead ? 0 : 1)
                .ToListAsync();

            Assert.Equal(2, academicRecords.Count);

            var leadRecord = academicRecords[0];
            Assert.Equal(lead.Id, leadRecord.StudentUserId);
            Assert.True(leadRecord.IsTeamLead);
            Assert.Equal("Shivansh Mehra Lead P10", leadRecord.StudentName);
            Assert.Equal(VivaOutcome.Pass, leadRecord.FinalOutcome);
            Assert.Equal("https://github.com/sistec/microgrid-telemetry-p10", leadRecord.VerifiedRepositoryUrl);
            Assert.Equal("https://microgrid.sistec.ac.in", leadRecord.VerifiedDemoUrl);
            Assert.False(string.IsNullOrWhiteSpace(leadRecord.VerificationHash));
            Assert.Equal(64, leadRecord.VerificationHash.Length);
            Assert.NotEqual(result.ClosureCertificateHash, leadRecord.VerificationHash);
            Assert.Equal(
                result.GeneratedStudentRecords.First(r => r.StudentUserId == lead.Id).VerificationHash,
                leadRecord.VerificationHash);
            Assert.False(leadRecord.AllowPublicPortfolio); // Default private

            var memberRecord = academicRecords[1];
            Assert.Equal(member.Id, memberRecord.StudentUserId);
            Assert.False(memberRecord.IsTeamLead);
            Assert.Equal("Aarav Sharma Member P10", memberRecord.StudentName);

            // Verify PlatformAuditLog was written
            var auditLog = await db.PlatformAuditLogs.FirstOrDefaultAsync(l =>
                l.Action == "PROJECT_FORMALLY_CLOSED" && l.TargetEntity == "ProjectTeam");
            Assert.NotNull(auditLog);
            Assert.Equal(hodId, auditLog.ActorUserId);
        }

        // 3. Verify Idempotent Closure Call returns existing record without error or duplicates
        var idempotentResp = await _client.PostAsJsonAsync($"/api/closure/teams/{team.Id}/close", new CloseProjectRequest
        {
            ClosureRemarks = "Repeated closure call"
        });
        Assert.Equal(HttpStatusCode.OK, idempotentResp.StatusCode);
        var idempotentResult = await idempotentResp.Content.ReadFromJsonAsync<ProjectClosureResultDto>();
        Assert.NotNull(idempotentResult);
        Assert.Equal(result.ClosureRecordId, idempotentResult.ClosureRecordId);
        Assert.Equal(result.ClosureCertificateHash, idempotentResult.ClosureCertificateHash);

        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var recordsCount = await db.StudentAcademicRecords.CountAsync(r => r.ProjectTeamId == team.Id);
            Assert.Equal(2, recordsCount); // Exactly 2 records, no duplicates
        }
    }

    [Fact]
    public async Task StudentPortfolio_StudentCanViewOwnVerifiedRecords_CannotMutate()
    {
        var (team, lead, _, _) = await SeedReadyProjectAsync();
        var (hodId, hodToken) = await CreateFacultyAsync("Prof. HOD Portfolio", team.CollegeId, team.DepartmentId, UserRole.HOD);

        // HOD closes project
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);
        var closeResp = await _client.PostAsJsonAsync($"/api/closure/teams/{team.Id}/close", new CloseProjectRequest
        {
            ClosureRemarks = "Formally closed."
        });
        Assert.Equal(HttpStatusCode.OK, closeResp.StatusCode);

        // Student authenticates
        var studentToken = GenerateToken(lead.Id, team.CollegeId, team.DepartmentId, UserRole.Student);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);

        // Student requests verified portfolio
        var portResp = await _client.GetAsync("/api/student/portfolio/verified");
        Assert.Equal(HttpStatusCode.OK, portResp.StatusCode);

        var portfolio = await portResp.Content.ReadFromJsonAsync<VerifiedStudentPortfolioDto>();
        Assert.NotNull(portfolio);
        Assert.Equal(lead.Id, portfolio.StudentUserId);
        Assert.Equal(lead.EnrollmentOrEmployeeCode, portfolio.EnrollmentNumber);
        Assert.False(portfolio.AllowPublicPortfolio);
        Assert.Single(portfolio.Projects);

        var proj = portfolio.Projects[0];
        Assert.Equal(team.Title, proj.ProjectTitle);
        Assert.Equal("Prof. S. K. Verma", proj.GuideName);
        Assert.Equal(VivaOutcome.Pass, proj.FinalOutcome);
        Assert.True(proj.IsVerified);
        Assert.Equal(64, proj.VerificationHash.Length);

        // Transcript endpoint check
        var transcriptResp = await _client.GetAsync($"/api/student/records/{proj.Id}/transcript");
        Assert.Equal(HttpStatusCode.OK, transcriptResp.StatusCode);
        var transcript = await transcriptResp.Content.ReadFromJsonAsync<StudentAcademicRecordDto>();
        Assert.NotNull(transcript);
        Assert.Equal(proj.Id, transcript.Id);
    }

    [Fact]
    public async Task PublicPortfolio_EnforcesStudentConsent()
    {
        var (team, lead, _, _) = await SeedReadyProjectAsync();
        var (hodId, hodToken) = await CreateFacultyAsync("Prof. HOD PublicCheck", team.CollegeId, team.DepartmentId, UserRole.HOD);

        // Close project
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);
        var closeResp = await _client.PostAsJsonAsync($"/api/closure/teams/{team.Id}/close", new CloseProjectRequest
        {
            ClosureRemarks = "Closed."
        });
        Assert.Equal(HttpStatusCode.OK, closeResp.StatusCode);

        // 1. Anonymous visitor checks public portfolio while AllowPublicPortfolio == false (404 anti-enumeration)
        _client.DefaultRequestHeaders.Authorization = null; // Unauthenticated
        var deniedResp = await _client.GetAsync($"/api/student/portfolio/{lead.EnrollmentOrEmployeeCode}/public");
        Assert.Equal(HttpStatusCode.NotFound, deniedResp.StatusCode);

        // 2. Student enables public sharing
        var studentToken = GenerateToken(lead.Id, team.CollegeId, team.DepartmentId, UserRole.Student);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);
        var updateResp = await _client.PutAsJsonAsync("/api/student/portfolio/visibility", new UpdatePortfolioVisibilityRequest
        {
            AllowPublicPortfolio = true
        });
        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);

        // 3. Anonymous visitor checks public portfolio now
        _client.DefaultRequestHeaders.Authorization = null; // Unauthenticated
        var allowedResp = await _client.GetAsync($"/api/student/portfolio/{lead.EnrollmentOrEmployeeCode}/public");
        Assert.Equal(HttpStatusCode.OK, allowedResp.StatusCode);

        var publicPortfolio = await allowedResp.Content.ReadFromJsonAsync<PublicStudentPortfolioDto>();
        Assert.NotNull(publicPortfolio);
        Assert.Equal(lead.FullName, publicPortfolio.StudentName);
        Assert.Equal(lead.EnrollmentOrEmployeeCode, publicPortfolio.EnrollmentNumber);
        Assert.Contains("Sagar Institute of Science and Technology", publicPortfolio.InstitutionalAttestation);
        Assert.Single(publicPortfolio.VerifiedProjects);

        var pubProj = publicPortfolio.VerifiedProjects[0];
        Assert.Equal(team.Title, pubProj.ProjectTitle);
        Assert.Equal("Prof. S. K. Verma", pubProj.GuideName);
        Assert.Equal(VivaOutcome.Pass, pubProj.FinalOutcome);
        Assert.NotNull(pubProj.FinalScorePercentage);
        Assert.Equal(64, pubProj.VerificationHash.Length);

        // Ensure private internal fields (like database IDs or moderation remarks) are not in DTO
        var rawJson = await allowedResp.Content.ReadAsStringAsync();
        Assert.False(rawJson.Contains("moderatorRemarks", StringComparison.OrdinalIgnoreCase));
        Assert.False(rawJson.Contains(hodId.ToString(), StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task ReopeningWorkflow_HODReopensWithReason_ResetsToCompleted()
    {
        var (team, _, _, _) = await SeedReadyProjectAsync();
        var (hodId, hodToken) = await CreateFacultyAsync("Prof. HOD Reopen", team.CollegeId, team.DepartmentId, UserRole.HOD);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);

        // 1. Close project first
        var closeResp = await _client.PostAsJsonAsync($"/api/closure/teams/{team.Id}/close", new CloseProjectRequest
        {
            ClosureRemarks = "Initial closure."
        });
        Assert.Equal(HttpStatusCode.OK, closeResp.StatusCode);

        // 2. Attempt reopen with short / empty reason -> 400 BadRequest
        var shortReasonResp = await _client.PostAsJsonAsync($"/api/closure/teams/{team.Id}/reopen", new ReopenProjectRequest
        {
            Reason = "Too short"
        });
        Assert.Equal(HttpStatusCode.BadRequest, shortReasonResp.StatusCode);

        // 3. Legitimate reopening with valid reason >= 10 chars
        var reopenResp = await _client.PostAsJsonAsync($"/api/closure/teams/{team.Id}/reopen", new ReopenProjectRequest
        {
            Reason = "Reopening to allow submission of supplementary IEEE conference appendix."
        });
        Assert.Equal(HttpStatusCode.OK, reopenResp.StatusCode);

        var reopenResult = await reopenResp.Content.ReadFromJsonAsync<ProjectClosureResultDto>();
        Assert.NotNull(reopenResult);
        Assert.Equal(ProjectClosureStatus.Reopened, reopenResult.Status);
        Assert.False(reopenResult.IsArchived);

        // 4. Verify in DB: Team status is Completed, ExceptionAuditLog recorded
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var dbTeam = await db.ProjectTeams.FirstAsync(t => t.Id == team.Id);
            Assert.Equal(ProjectStatus.Completed, dbTeam.Status);

            var exceptionLog = await db.ExceptionAuditLogs.FirstOrDefaultAsync(e => e.ProjectTeamId == team.Id);
            Assert.NotNull(exceptionLog);
            Assert.Equal(ExceptionActionType.ReopenProject, exceptionLog.ActionType);
            Assert.Equal(hodId, exceptionLog.ApprovedByUserId);
            Assert.Contains("IEEE conference appendix", exceptionLog.Reason);
        }
    }

    [Fact]
    public async Task PublicPortfolio_MissingEnrollmentReturns404_AndSoftDeletedTeamHandledSafely()
    {
        // 1. Missing enrollment -> 404 NotFound
        _client.DefaultRequestHeaders.Authorization = null;
        var missingResp = await _client.GetAsync("/api/student/portfolio/NONEXISTENT999999/public");
        Assert.Equal(HttpStatusCode.NotFound, missingResp.StatusCode);

        // 2. Consent enabled with soft-deleted ProjectTeam -> 200 OK without NullReferenceException
        var (team, lead, _, _) = await SeedReadyProjectAsync();
        var (_, hodToken) = await CreateFacultyAsync("Prof. HOD NullTeam", team.CollegeId, team.DepartmentId, UserRole.HOD);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);
        var closeResp = await _client.PostAsJsonAsync($"/api/closure/teams/{team.Id}/close", new CloseProjectRequest
        {
            ClosureRemarks = "Closed before team archival cleanup."
        });
        Assert.Equal(HttpStatusCode.OK, closeResp.StatusCode);

        var studentToken = GenerateToken(lead.Id, team.CollegeId, team.DepartmentId, UserRole.Student);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);
        var visResp = await _client.PutAsJsonAsync("/api/student/portfolio/visibility", new UpdatePortfolioVisibilityRequest
        {
            AllowPublicPortfolio = true
        });
        Assert.Equal(HttpStatusCode.OK, visResp.StatusCode);

        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var dbTeam = await db.ProjectTeams.FirstAsync(t => t.Id == team.Id);
            dbTeam.IsDeleted = true;
            await db.SaveChangesAsync();
        }

        _client.DefaultRequestHeaders.Authorization = null;
        var publicResp = await _client.GetAsync($"/api/student/portfolio/{lead.EnrollmentOrEmployeeCode}/public");
        Assert.Equal(HttpStatusCode.OK, publicResp.StatusCode);
        var dto = await publicResp.Content.ReadFromJsonAsync<PublicStudentPortfolioDto>();
        Assert.NotNull(dto);
        Assert.Single(dto.VerifiedProjects);
    }
}
