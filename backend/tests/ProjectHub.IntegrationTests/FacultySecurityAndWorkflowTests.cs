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
using ProjectHub.Api.Controllers;
using ProjectHub.Application.Common.Models;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class FacultySecurityAndWorkflowTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public FacultySecurityAndWorkflowTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private static string GenerateToken(Guid userId, Guid collegeId, Guid? departmentId, UserRole role, bool isCoordinator = false)
    {
        var secret = "ProjectHubSuperSecretDevKeyMinLength32CharactersRequired!";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new("sub", userId.ToString()),
            new("user_id", userId.ToString()),
            new(ClaimTypes.Email, "faculty.test@sistec.ac.in"),
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

    private HttpClient CreateAuthenticatedClient(Guid userId, Guid collegeId, Guid? departmentId, UserRole role, bool isCoordinator = false)
    {
        var client = _factory.CreateClient();
        var token = GenerateToken(userId, collegeId, departmentId, role, isCoordinator);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private (ProjectHubDbContext db, ITenantContext tenantContext, IServiceScope scope) CreateTestDbContext()
    {
        var scope = _factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        tenantContext.IsSuperAdmin = true;
        tenantContext.CollegeId = DbInitializer.SistecTenantId;
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        return (db, tenantContext, scope);
    }

    // =========================================================================
    // STEP 2 & 4: COORDINATOR PRIVILEGE ESCALATION & DEPARTMENT SCOPING
    // =========================================================================

    [Fact]
    public async Task Coordinator_ImportRoster_CannotEscalateRoles_StrictlyForcesStudentRole()
    {
        // Arrange: FacultyNair is the active CSE coordinator at SISTec
        var client = CreateAuthenticatedClient(
            DbInitializer.FacultyNairUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty,
            isCoordinator: true);

        var targetEmail = $"escalation_test_{Guid.NewGuid():N}@sistec.ac.in";
        var payload = new RosterImportRequest
        {
            DepartmentId = DbInitializer.CseDepartmentId,
            Rows = new List<RosterRowInput>
            {
                new()
                {
                    FullName = "Malicious Escalated User",
                    Email = targetEmail,
                    EnrollmentOrEmployeeCode = $"SEC-{Guid.NewGuid():N}".Substring(0, 15).ToUpperInvariant(),
                    Role = UserRole.SuperAdmin // Attempt privilege escalation!
                }
            }
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/coordinator/import-roster", payload);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RosterImportResultDto>();
        Assert.NotNull(result);
        Assert.True(result.Warnings.Any(w => w.Contains("privilege") || w.Contains("Student")),
            "Import result should include warning about prohibited role escalation.");

        // Verify in DB that the created account has Role == Student, NEVER SuperAdmin
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == targetEmail);
            Assert.NotNull(user);
            Assert.Equal(UserRole.Student, user.Role);
        }
    }

    [Fact]
    public async Task Coordinator_ImportRoster_CannotOverwriteOrElevateExistingStaffOrAdminAccounts()
    {
        // Arrange: Coordinator attempts to overwrite existing HOD Sharma account
        var client = CreateAuthenticatedClient(
            DbInitializer.FacultyNairUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty,
            isCoordinator: true);

        var payload = new RosterImportRequest
        {
            DepartmentId = DbInitializer.CseDepartmentId,
            Rows = new List<RosterRowInput>
            {
                new()
                {
                    FullName = "HOD Overwrite Attempt",
                    Email = "hod@sistec.ac.in",
                    EnrollmentOrEmployeeCode = "EMP-CSE-001",
                    Role = UserRole.Student
                }
            }
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/coordinator/import-roster", payload);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RosterImportResultDto>();
        Assert.NotNull(result);
        Assert.True(result.Warnings.Any(w => w.Contains("privileged persona") || w.Contains("strictly prohibited")),
            "Import should produce warning when targeting staff/admin accounts.");

        // Verify HOD account role was NOT altered
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            var hod = await db.Users.FirstOrDefaultAsync(u => u.Id == DbInitializer.HodSharmaUserId);
            Assert.NotNull(hod);
            Assert.Equal(UserRole.HOD, hod.Role);
        }
    }

    [Fact]
    public async Task Coordinator_AddSingleStudent_CrossDepartmentAttempt_IsForbidden()
    {
        // Arrange: CSE coordinator tries to provision student directly into ECE
        var client = CreateAuthenticatedClient(
            DbInitializer.FacultyNairUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty,
            isCoordinator: true);

        var payload = new AddSingleStudentRequest
        {
            DepartmentId = DbInitializer.EceDepartmentId, // Target cross-department!
            FullName = "Cross Dept Student",
            Email = $"cross_dept_{Guid.NewGuid():N}@sistec.ac.in",
            EnrollmentNumber = "0187CS221999"
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/coordinator/roster/student", payload);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Coordinator_GetTeams_IsDepartmentScoped()
    {
        // Arrange
        var client = CreateAuthenticatedClient(
            DbInitializer.FacultyNairUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty,
            isCoordinator: true);

        // Act
        var response = await client.GetAsync("/api/coordinator/teams");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var teams = await response.Content.ReadFromJsonAsync<List<ProjectProposalDto>>();
        Assert.NotNull(teams);
        Assert.NotEmpty(teams);

        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            var teamIds = teams.Select(t => t.TeamId).ToList();
            var dbTeams = await db.ProjectTeams.Where(t => teamIds.Contains(t.Id)).ToListAsync();
            Assert.All(dbTeams, t => Assert.Equal(DbInitializer.CseDepartmentId, t.DepartmentId));
        }
    }

    [Fact]
    public async Task Coordinator_RevokedCoordinator_IsRejectedImmediately()
    {
        // Arrange: User with is_coordinator claim in token, but DB has IsProjectCoordinator = false
        var revokedUserId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.Users.Add(new UserAccount
            {
                Id = revokedUserId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                Email = $"revoked_{Guid.NewGuid():N}@sistec.ac.in",
                FullName = "Revoked Coordinator",
                EnrollmentOrEmployeeCode = "EMP-REVOKED",
                Role = UserRole.Faculty,
                IsProjectCoordinator = false // Revoked in DB!
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(
            revokedUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty,
            isCoordinator: true); // Token still says coordinator

        // Act
        var response = await client.GetAsync("/api/coordinator/teams");

        // Assert: Controller checks DB active status and rejects revoked coordinator
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // =========================================================================
    // STEP 3: ARTIFACT REVIEW & DOWNLOAD AUTHORIZATION
    // =========================================================================

    [Fact]
    public async Task Artifact_Review_ByStudent_IsForbidden()
    {
        // Arrange: Student tries to review artifact
        var client = CreateAuthenticatedClient(
            DbInitializer.StudentShivanshUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Student);

        var payload = new ReviewArtifactRequest { IsApproved = true, ReviewerNote = "Self review attempt" };

        // Act
        var response = await client.PostAsJsonAsync($"/api/faculty/artifacts/{Guid.NewGuid()}/review", payload);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Artifact_Review_ByUnassignedFaculty_IsForbidden()
    {
        // Arrange: Create a dedicated team and artifact where Verma is guide
        var teamId = Guid.NewGuid();
        var artifactId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.ProjectTeams.Add(new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-UNASSIGNED-ART",
                Title = "Unassigned Artifact Test Team",
                Abstract = "Valid test abstract.",
                Status = ProjectStatus.ActiveBuild,
                GuideUserId = DbInitializer.FacultyVermaUserId
            });
            db.TeamArtifacts.Add(new TeamArtifact
            {
                Id = artifactId,
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = teamId,
                SlotType = ArtifactSlotType.MidTermPPT,
                FileName = "test_ppt.pptx",
                StorageKey = "artifacts/test_ppt.pptx",
                Status = ArtifactStatus.Uploaded
            });
            await db.SaveChangesAsync();
        }

        // FacultyNair is NOT the guide of this team
        var client = CreateAuthenticatedClient(
            DbInitializer.FacultyNairUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty);

        var payload = new ReviewArtifactRequest { IsApproved = true, ReviewerNote = "Unassigned review" };

        // Act
        var response = await client.PostAsJsonAsync($"/api/faculty/artifacts/{artifactId}/review", payload);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Artifact_Review_ByAssignedGuide_SucceedsAndRecordsAudit()
    {
        // Arrange: Create dedicated team and uploaded artifact
        var teamId = Guid.NewGuid();
        var artifactId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.ProjectTeams.Add(new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-ASSIGNED-ART",
                Title = "Assigned Artifact Review Team",
                Abstract = "Valid test abstract.",
                Status = ProjectStatus.ActiveBuild,
                GuideUserId = DbInitializer.FacultyVermaUserId
            });
            db.TeamArtifacts.Add(new TeamArtifact
            {
                Id = artifactId,
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = teamId,
                SlotType = ArtifactSlotType.MidTermPPT,
                FileName = "test_midterm.pptx",
                StorageKey = "artifacts/test_midterm.pptx",
                Status = ArtifactStatus.Uploaded
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(
            DbInitializer.FacultyVermaUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty);

        var note = "PPT slides meet all technical standards and rubric checkpoints.";
        var payload = new ReviewArtifactRequest { IsApproved = true, ReviewerNote = note };

        // Act
        var response = await client.PostAsJsonAsync($"/api/faculty/artifacts/{artifactId}/review", payload);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var (verifyDb, _, verifyScope) = CreateTestDbContext();
        using (verifyScope)
        {
            var updated = await verifyDb.TeamArtifacts.FindAsync(artifactId);
            Assert.NotNull(updated);
            Assert.Equal(ArtifactStatus.Verified, updated.Status);
            Assert.Equal(DbInitializer.FacultyVermaUserId, updated.VerifiedByUserId);
            Assert.Equal(note, updated.ReviewerNote);

            // Verify PlatformAuditLog was created
            var audit = await verifyDb.PlatformAuditLogs
                .OrderByDescending(a => a.OccurredAtUtc)
                .FirstOrDefaultAsync(a => a.Action == "FACULTY_ARTIFACT_REVIEWED");
            Assert.NotNull(audit);
            Assert.Contains(artifactId.ToString(), audit.MetadataJson);
        }
    }

    [Fact]
    public async Task Artifact_Review_MissingDeliverable_IsRejectedWithBadRequest()
    {
        // Arrange: Create missing artifact
        var teamId = Guid.NewGuid();
        var missingArtifactId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.ProjectTeams.Add(new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-MISSING-ART",
                Title = "Missing Deliverable Team",
                Abstract = "Valid test abstract.",
                Status = ProjectStatus.ActiveBuild,
                GuideUserId = DbInitializer.FacultyVermaUserId
            });
            db.TeamArtifacts.Add(new TeamArtifact
            {
                Id = missingArtifactId,
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = teamId,
                SlotType = ArtifactSlotType.FinalThesis,
                FileName = string.Empty,
                StorageKey = string.Empty,
                Status = ArtifactStatus.Missing
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(
            DbInitializer.FacultyVermaUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty);

        var payload = new ReviewArtifactRequest { IsApproved = true, ReviewerNote = "Premature review" };

        // Act
        var response = await client.PostAsJsonAsync($"/api/faculty/artifacts/{missingArtifactId}/review", payload);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var err = await response.Content.ReadAsStringAsync();
        Assert.Contains("Cannot review", err);
    }

    [Fact]
    public async Task Artifact_Download_UnauthorizedStudent_IsForbidden()
    {
        // Arrange: StudentRohan is NOT a member of Team01
        Guid artifactId;
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            var artifact = await db.TeamArtifacts.FirstOrDefaultAsync(a => a.ProjectTeamId == DbInitializer.Team01Id && a.SlotType == ArtifactSlotType.Synopsis);
            Assert.NotNull(artifact);
            artifactId = artifact.Id;
        }

        var client = CreateAuthenticatedClient(
            DbInitializer.StudentRohanUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Student);

        // Act
        var response = await client.GetAsync($"/api/artifacts/{artifactId}/download");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // =========================================================================
    // STEP 5: PROPOSAL RETURN & ENDORSE WORKFLOWS
    // =========================================================================

    [Fact]
    public async Task Proposal_Endorse_ByAssignedGuide_SucceedsAndAdvancesStatus()
    {
        // Arrange: Create a project in PendingGuide status
        var teamId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.ProjectTeams.Add(new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-ENDORSE-TEST",
                Title = "Proposal Endorse Test Team",
                Abstract = "Valid test abstract for endorsement verification.",
                Status = ProjectStatus.PendingGuide,
                GuideUserId = DbInitializer.FacultyVermaUserId,
                IsRosterLocked = true
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(
            DbInitializer.FacultyVermaUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty);

        // Act
        var response = await client.PostAsync($"/api/faculty/proposals/{teamId}/endorse", null);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var (verifyDb, _, verifyScope) = CreateTestDbContext();
        using (verifyScope)
        {
            var team = await verifyDb.ProjectTeams.FindAsync(teamId);
            Assert.NotNull(team);
            Assert.Equal(ProjectStatus.PendingCoordinator, team.Status);

            var audit = await verifyDb.PlatformAuditLogs
                .OrderByDescending(a => a.OccurredAtUtc)
                .FirstOrDefaultAsync(a => a.Action == "FACULTY_PROPOSAL_ENDORSED");
            Assert.NotNull(audit);
            Assert.Contains(teamId.ToString(), audit.MetadataJson);
        }
    }

    [Fact]
    public async Task Proposal_Endorse_ByNonGuide_IsForbidden()
    {
        // Arrange: Team assigned to FacultyVerma
        var teamId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.ProjectTeams.Add(new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-FORBID-TEST",
                Title = "Proposal Non-Guide Test Team",
                Abstract = "Valid test abstract.",
                Status = ProjectStatus.PendingGuide,
                GuideUserId = DbInitializer.FacultyVermaUserId
            });
            await db.SaveChangesAsync();
        }

        // FacultyNair attempts to endorse
        var client = CreateAuthenticatedClient(
            DbInitializer.FacultyNairUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty);

        // Act
        var response = await client.PostAsync($"/api/faculty/proposals/{teamId}/endorse", null);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Proposal_Return_ByAssignedGuide_SucceedsAndUnlocksRoster()
    {
        // Arrange: Team in PendingGuide with locked roster
        var teamId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.ProjectTeams.Add(new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-RETURN-TEST",
                Title = "Proposal Return Test Team",
                Abstract = "Valid test abstract before return.",
                Status = ProjectStatus.PendingGuide,
                GuideUserId = DbInitializer.FacultyVermaUserId,
                IsRosterLocked = true
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(
            DbInitializer.FacultyVermaUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty);

        var remarks = "Abstract lacks clear mathematical formulation of problem statement. Please revise methodology.";
        var payload = new ReturnProposalRequest { Remarks = remarks };

        // Act
        var response = await client.PostAsJsonAsync($"/api/faculty/proposals/{teamId}/return", payload);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var (verifyDb, _, verifyScope) = CreateTestDbContext();
        using (verifyScope)
        {
            var team = await verifyDb.ProjectTeams.FindAsync(teamId);
            Assert.NotNull(team);
            Assert.Equal(ProjectStatus.Draft, team.Status);
            Assert.False(team.IsRosterLocked, "Returning proposal must unlock student team roster.");

            // Verify ExceptionAuditLog
            var excAudit = await verifyDb.ExceptionAuditLogs
                .OrderByDescending(a => a.CreatedAtUtc)
                .FirstOrDefaultAsync(a => a.ActionType == ExceptionActionType.ReturnProposal && a.ProjectTeamId == teamId);
            Assert.NotNull(excAudit);
            Assert.Equal(remarks, excAudit.Reason);
            Assert.Equal(DbInitializer.FacultyVermaUserId, excAudit.RequestedByUserId);
        }
    }

    [Fact]
    public async Task Proposal_Return_WithoutMandatoryRemarks_IsRejectedWithBadRequest()
    {
        var teamId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.ProjectTeams.Add(new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-NOREMARKS-TEST",
                Title = "Proposal No Remarks Team",
                Abstract = "Valid abstract.",
                Status = ProjectStatus.PendingGuide,
                GuideUserId = DbInitializer.FacultyVermaUserId
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(
            DbInitializer.FacultyVermaUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty);

        var payload = new ReturnProposalRequest { Remarks = "   " };

        // Act
        var response = await client.PostAsJsonAsync($"/api/faculty/proposals/{teamId}/return", payload);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // =========================================================================
    // STEP 6: WEEKLY LOG VERIFICATION & REVISION WORKFLOWS
    // =========================================================================

    [Fact]
    public async Task WeeklyLog_Verify_Approved_ByAssignedGuide_Succeeds()
    {
        // Arrange: Create weekly log on Team01
        var logId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.WeeklyLogbooks.Add(new WeeklyLogbook
            {
                Id = logId,
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = DbInitializer.Team01Id,
                AuthorUserId = DbInitializer.StudentShivanshUserId,
                WeekNumber = 8,
                AccomplishmentsSummary = "Completed hardware soldering and connected sensor network.",
                HoursLogged = 12m,
                IsVerified = false
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(
            DbInitializer.FacultyVermaUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty);

        var payload = new VerifyLogRequest
        {
            Decision = "Approved",
            Remarks = "Good work on circuit testing."
        };

        // Act
        var response = await client.PostAsJsonAsync($"/api/faculty/logs/{logId}/verify", payload);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var (verifyDb, _, verifyScope) = CreateTestDbContext();
        using (verifyScope)
        {
            var log = await verifyDb.WeeklyLogbooks.FindAsync(logId);
            Assert.NotNull(log);
            Assert.True(log.IsVerified);
            Assert.Equal(DbInitializer.FacultyVermaUserId, log.VerifiedByUserId);
            Assert.NotNull(log.VerifiedAtUtc);
            Assert.Equal("Good work on circuit testing.", log.MentorRemarks);
        }
    }

    [Fact]
    public async Task WeeklyLog_Verify_NeedsRevision_RequiresMandatoryRemarks()
    {
        var logId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.WeeklyLogbooks.Add(new WeeklyLogbook
            {
                Id = logId,
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = DbInitializer.Team01Id,
                AuthorUserId = DbInitializer.StudentShivanshUserId,
                WeekNumber = 9,
                AccomplishmentsSummary = "Short summary.",
                HoursLogged = 2m,
                IsVerified = false
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(
            DbInitializer.FacultyVermaUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty);

        // Attempt revision request without remarks
        var payload = new VerifyLogRequest
        {
            Decision = "NeedsRevision",
            Remarks = ""
        };

        // Act
        var response = await client.PostAsJsonAsync($"/api/faculty/logs/{logId}/verify", payload);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task WeeklyLog_Verify_NeedsRevision_WithRemarks_SucceedsAndKeepsUnverified()
    {
        var logId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.WeeklyLogbooks.Add(new WeeklyLogbook
            {
                Id = logId,
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = DbInitializer.Team01Id,
                AuthorUserId = DbInitializer.StudentShivanshUserId,
                WeekNumber = 10,
                AccomplishmentsSummary = "Wrote initial tests.",
                HoursLogged = 4m,
                IsVerified = false
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(
            DbInitializer.FacultyVermaUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty);

        var remarks = "Please specify git commit hashes and expand on test coverage results.";
        var payload = new VerifyLogRequest
        {
            Decision = "NeedsRevision",
            Remarks = remarks
        };

        // Act
        var response = await client.PostAsJsonAsync($"/api/faculty/logs/{logId}/verify", payload);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var (verifyDb, _, verifyScope) = CreateTestDbContext();
        using (verifyScope)
        {
            var log = await verifyDb.WeeklyLogbooks.FindAsync(logId);
            Assert.NotNull(log);
            Assert.False(log.IsVerified, "Log requiring revision must remain unverified.");
            Assert.Equal(remarks, log.MentorRemarks);
            Assert.Equal(DbInitializer.FacultyVermaUserId, log.VerifiedByUserId);
        }
    }

    // =========================================================================
    // STEP 7: EVALUATION LOCK & IMMUTABILITY PROTECTION
    // =========================================================================

    [Fact]
    public async Task VivaEvaluation_Submission_LocksEvaluation()
    {
        // Arrange: Create a new team for defense evaluation
        var teamId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.ProjectTeams.Add(new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-VIVA-TEST",
                Title = "Viva Evaluation Test Team",
                Abstract = "Valid abstract.",
                Status = ProjectStatus.ActiveBuild,
                GuideUserId = DbInitializer.FacultyVermaUserId // Guide is Verma
            });
            await db.SaveChangesAsync();
        }

        // Evaluator is FacultyNair (independent evaluator, not the guide)
        var client = CreateAuthenticatedClient(
            DbInitializer.FacultyNairUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty);

        var payload = new SubmitVivaEvaluationRequest
        {
            ProjectTeamId = teamId,
            CheckpointType = CheckpointType.MidTermReview,
            SharedTotalScore = 48m,
            GeneralRemarks = "Strong technical architecture and prototype.",
            StudentScores = new List<StudentScoreInput>
            {
                new()
                {
                    StudentUserId = DbInitializer.StudentShivanshUserId,
                    ModuleOwnershipScore = 18m,
                    VivaQaScore = 17m,
                    LogDisciplineScore = 5m
                }
            }
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/faculty/evaluations", payload);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var (verifyDb, _, verifyScope) = CreateTestDbContext();
        using (verifyScope)
        {
            var eval = await verifyDb.VivaEvaluations
                .Include(e => e.IndividualScores)
                .FirstOrDefaultAsync(e => e.ProjectTeamId == teamId && e.CheckpointType == CheckpointType.MidTermReview);
            Assert.NotNull(eval);
            Assert.True(eval.IsLocked, "Submitted evaluation must be locked.");
            Assert.NotNull(eval.LockedAtUtc);
            Assert.NotEmpty(eval.IndividualScores);
        }
    }

    [Fact]
    public async Task VivaEvaluation_DuplicateLockedSubmission_IsBlockedWith409Conflict()
    {
        // Arrange: Create team with existing LOCKED evaluation
        var teamId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.ProjectTeams.Add(new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-LOCK-TEST",
                Title = "Locked Viva Team",
                Abstract = "Valid abstract.",
                Status = ProjectStatus.ActiveBuild,
                GuideUserId = DbInitializer.FacultyVermaUserId
            });
            db.VivaEvaluations.Add(new VivaEvaluation
            {
                Id = Guid.NewGuid(),
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = teamId,
                EvaluatorUserId = DbInitializer.FacultyNairUserId,
                CheckpointType = CheckpointType.MidTermReview,
                SharedTotalScore = 45m,
                IsLocked = true, // LOCKED!
                LockedAtUtc = DateTime.UtcNow.AddDays(-1)
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(
            DbInitializer.FacultyNairUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty);

        var payload = new SubmitVivaEvaluationRequest
        {
            ProjectTeamId = teamId,
            CheckpointType = CheckpointType.MidTermReview,
            SharedTotalScore = 50m,
            GeneralRemarks = "Overriding locked evaluation attempt."
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/faculty/evaluations", payload);

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var err = await response.Content.ReadAsStringAsync();
        Assert.Contains("locked and finalized", err);
        Assert.Contains("Grade Unlock Exception", err);
    }

    [Fact]
    public async Task VivaEvaluation_UnlockedByHod_AllowsReEvaluationAndReLocks()
    {
        // Arrange: Evaluation was unlocked by HOD (IsLocked == false)
        var teamId = Guid.NewGuid();
        var evalId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.ProjectTeams.Add(new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-UNLOCK-TEST",
                Title = "Unlocked Re-Evaluation Team",
                Abstract = "Valid abstract.",
                Status = ProjectStatus.ActiveBuild,
                GuideUserId = DbInitializer.FacultyVermaUserId
            });
            db.VivaEvaluations.Add(new VivaEvaluation
            {
                Id = evalId,
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = teamId,
                EvaluatorUserId = DbInitializer.FacultyNairUserId,
                CheckpointType = CheckpointType.MidTermReview,
                SharedTotalScore = 35m,
                IsLocked = false, // HOD UNLOCKED!
                LockedAtUtc = null
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(
            DbInitializer.FacultyNairUserId,
            DbInitializer.SistecTenantId,
            DbInitializer.CseDepartmentId,
            UserRole.Faculty);

        var payload = new SubmitVivaEvaluationRequest
        {
            ProjectTeamId = teamId,
            CheckpointType = CheckpointType.MidTermReview,
            SharedTotalScore = 46m,
            GeneralRemarks = "Re-evaluation conducted after HOD unlock exception.",
            StudentScores = new List<StudentScoreInput>
            {
                new()
                {
                    StudentUserId = DbInitializer.StudentShivanshUserId,
                    ModuleOwnershipScore = 19m,
                    VivaQaScore = 18m,
                    LogDisciplineScore = 5m
                }
            }
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/faculty/evaluations", payload);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var (verifyDb, _, verifyScope) = CreateTestDbContext();
        using (verifyScope)
        {
            var eval = await verifyDb.VivaEvaluations.FindAsync(evalId);
            Assert.NotNull(eval);
            Assert.True(eval.IsLocked, "Re-evaluation submission must re-lock the record.");
            Assert.NotNull(eval.LockedAtUtc);
            Assert.Equal(46m, eval.SharedTotalScore);

            // Verify only ONE evaluation exists (no duplicate records)
            var totalEvals = await verifyDb.VivaEvaluations
                .CountAsync(e => e.ProjectTeamId == teamId && e.CheckpointType == CheckpointType.MidTermReview);
            Assert.Equal(1, totalEvals);
        }
    }

    // =========================================================================
    // MANDATORY PHASE 1.2 REMEDIATION & VERIFICATION TESTS (SCENARIOS 1 - 15)
    // =========================================================================

    [Fact]
    public async Task Scenario01_ConcurrentInitialSubmissions_CannotCreateDuplicateActiveEvaluations()
    {
        var teamId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.ProjectTeams.Add(new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-CONCURRENCY",
                Title = "Concurrency Evaluation Team",
                Status = ProjectStatus.ActiveBuild,
                GuideUserId = DbInitializer.FacultyVermaUserId
            });
            await db.SaveChangesAsync();
        }

        var client1 = CreateAuthenticatedClient(DbInitializer.FacultyNairUserId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Faculty);
        var client2 = CreateAuthenticatedClient(DbInitializer.FacultyNairUserId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Faculty);

        var payload1 = new SubmitVivaEvaluationRequest
        {
            ProjectTeamId = teamId,
            CheckpointType = CheckpointType.MidTermReview,
            SharedTotalScore = 50m,
            GeneralRemarks = "Submission A"
        };
        var payload2 = new SubmitVivaEvaluationRequest
        {
            ProjectTeamId = teamId,
            CheckpointType = CheckpointType.MidTermReview,
            SharedTotalScore = 52m,
            GeneralRemarks = "Submission B"
        };

        // Act: Concurrent initial submissions
        var task1 = client1.PostAsJsonAsync("/api/faculty/evaluations", payload1);
        var task2 = client2.PostAsJsonAsync("/api/faculty/evaluations", payload2);
        var responses = await Task.WhenAll(task1, task2);

        // Assert: One succeeds, the other is rejected with Conflict (409)
        var statusCodes = responses.Select(r => r.StatusCode).ToList();
        Assert.Contains(HttpStatusCode.OK, statusCodes);

        var (verifyDb, _, verifyScope) = CreateTestDbContext();
        using (verifyScope)
        {
            if (string.Equals(verifyDb.Database.ProviderName, "Microsoft.EntityFrameworkCore.InMemory", StringComparison.OrdinalIgnoreCase))
            {
                // Note: InMemory EF Core provider does not enforce relational filtered unique indexes or concurrency transactions.
                // Concurrency and Conflict (409) are verified against real PostgreSQL in PostgreSqlConcurrencyTests.
                return;
            }

            Assert.Contains(HttpStatusCode.Conflict, statusCodes);

            var activeEvals = await verifyDb.VivaEvaluations
                .Where(e => e.ProjectTeamId == teamId && e.CheckpointType == CheckpointType.MidTermReview && !e.IsDeleted)
                .ToListAsync();
            Assert.Single(activeEvals);
        }
    }

    [Fact]
    public async Task Scenario02_UnappointedFaculty_CannotSubmitPanelVivaMarks()
    {
        var unappointedFacultyId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.Users.Add(new UserAccount
            {
                Id = unappointedFacultyId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                Email = $"unappointed_{Guid.NewGuid():N}@sistec.ac.in",
                FullName = "Prof. Unappointed",
                Role = UserRole.Faculty
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(unappointedFacultyId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Faculty);
        var payload = new SubmitVivaEvaluationRequest
        {
            ProjectTeamId = DbInitializer.Team01Id,
            CheckpointType = CheckpointType.MidTermReview,
            SharedTotalScore = 45m
        };

        var response = await client.PostAsJsonAsync("/api/faculty/evaluations", payload);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Scenario03_EvaluatorAppointedToAnotherDepartmentOrTrack_CannotGradeTeam()
    {
        var otherDeptEvaluatorId = Guid.NewGuid();
        var ecePanelId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.Users.Add(new UserAccount
            {
                Id = otherDeptEvaluatorId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.EceDepartmentId,
                Email = $"ece_eval_{Guid.NewGuid():N}@sistec.ac.in",
                FullName = "Prof. ECE Evaluator",
                Role = UserRole.Faculty
            });
            db.VivaPanels.Add(new VivaPanel
            {
                Id = ecePanelId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.EceDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                PanelName = "ECE Defense Panel",
                ScheduledAtUtc = DateTime.UtcNow.AddDays(3),
                RoomOrLink = "ECE Hall"
            });
            db.VivaPanelEvaluators.Add(new VivaPanelEvaluator
            {
                Id = Guid.NewGuid(),
                CollegeId = DbInitializer.SistecTenantId,
                VivaPanelId = ecePanelId,
                EvaluatorUserId = otherDeptEvaluatorId
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(otherDeptEvaluatorId, DbInitializer.SistecTenantId, DbInitializer.EceDepartmentId, UserRole.Faculty);
        var payload = new SubmitVivaEvaluationRequest
        {
            ProjectTeamId = DbInitializer.Team01Id, // CSE team
            CheckpointType = CheckpointType.MidTermReview,
            SharedTotalScore = 40m
        };

        var response = await client.PostAsJsonAsync("/api/faculty/evaluations", payload);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Scenario04_ValidAppointedEvaluator_CanSubmitAuthorizedEvaluation()
    {
        var teamId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.ProjectTeams.Add(new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-AUTH-EVAL",
                Title = "Authorized Evaluation Team",
                Status = ProjectStatus.ActiveBuild,
                GuideUserId = DbInitializer.FacultyVermaUserId
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(DbInitializer.FacultyNairUserId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Faculty);
        var payload = new SubmitVivaEvaluationRequest
        {
            ProjectTeamId = teamId,
            CheckpointType = CheckpointType.MidTermReview,
            SharedTotalScore = 54m,
            GeneralRemarks = "Exemplary architecture."
        };

        var response = await client.PostAsJsonAsync("/api/faculty/evaluations", payload);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var (verifyDb, _, verifyScope) = CreateTestDbContext();
        using (verifyScope)
        {
            var eval = await verifyDb.VivaEvaluations.FirstOrDefaultAsync(e => e.ProjectTeamId == teamId && e.CheckpointType == CheckpointType.MidTermReview);
            Assert.NotNull(eval);
            Assert.True(eval.IsLocked);
            Assert.Equal(54m, eval.SharedTotalScore);
        }
    }

    [Fact]
    public async Task Scenario05_AssignedGuide_CannotBypassConflictOfInterestRestrictions()
    {
        var client = CreateAuthenticatedClient(DbInitializer.FacultyVermaUserId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Faculty);
        var payload = new SubmitVivaEvaluationRequest
        {
            ProjectTeamId = DbInitializer.Team01Id, // Guide is Verma
            CheckpointType = CheckpointType.MidTermReview,
            SharedTotalScore = 60m
        };

        var response = await client.PostAsJsonAsync("/api/faculty/evaluations", payload);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("guide", content, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Scenario06_ReturnAndReject_ProduceDifferentAuditEventsAndWorkflowOutcomes()
    {
        var teamReturnId = Guid.NewGuid();
        var teamRejectId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.ProjectTeams.Add(new ProjectTeam
            {
                Id = teamReturnId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-RET-TEST",
                Title = "Return Proposal Team",
                Status = ProjectStatus.PendingGuide,
                GuideUserId = DbInitializer.FacultyVermaUserId
            });
            db.ProjectTeams.Add(new ProjectTeam
            {
                Id = teamRejectId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-REJ-TEST",
                Title = "Reject Proposal Team",
                Status = ProjectStatus.PendingGuide,
                GuideUserId = DbInitializer.FacultyVermaUserId
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(DbInitializer.FacultyVermaUserId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Faculty);

        // 1. Return proposal
        var returnRes = await client.PostAsJsonAsync($"/api/faculty/proposals/{teamReturnId}/return", new ReturnProposalRequest { Remarks = "Technical scope needs clarification" });
        Assert.Equal(HttpStatusCode.OK, returnRes.StatusCode);

        // 2. Reject proposal
        var rejectRes = await client.PostAsJsonAsync($"/api/faculty/proposals/{teamRejectId}/reject", new ReturnProposalRequest { Remarks = "Proposal topic strictly not feasible with department hardware" });
        Assert.Equal(HttpStatusCode.OK, rejectRes.StatusCode);

        var (verifyDb, _, verifyScope) = CreateTestDbContext();
        using (verifyScope)
        {
            var returnedTeam = await verifyDb.ProjectTeams.FindAsync(teamReturnId);
            Assert.NotNull(returnedTeam);
            Assert.Equal(ProjectStatus.Draft, returnedTeam.Status);
            Assert.Equal(DbInitializer.FacultyVermaUserId, returnedTeam.GuideUserId); // Preserved for revision

            var rejectedTeam = await verifyDb.ProjectTeams.FindAsync(teamRejectId);
            Assert.NotNull(rejectedTeam);
            Assert.Equal(ProjectStatus.Draft, rejectedTeam.Status);
            Assert.Null(rejectedTeam.GuideUserId); // Guide unassigned upon rejection

            var returnAudit = await verifyDb.PlatformAuditLogs.FirstOrDefaultAsync(a => a.Action == "FACULTY_PROPOSAL_RETURNED" && a.MetadataJson.Contains(teamReturnId.ToString()));
            Assert.NotNull(returnAudit);

            var rejectAudit = await verifyDb.PlatformAuditLogs.FirstOrDefaultAsync(a => a.Action == "FACULTY_PROPOSAL_REJECTED" && a.MetadataJson.Contains(teamRejectId.ToString()));
            Assert.NotNull(rejectAudit);

            var returnExc = await verifyDb.ExceptionAuditLogs.FirstOrDefaultAsync(e => e.ProjectTeamId == teamReturnId && e.ActionType == ExceptionActionType.ReturnProposal);
            Assert.NotNull(returnExc);

            var rejectExc = await verifyDb.ExceptionAuditLogs.FirstOrDefaultAsync(e => e.ProjectTeamId == teamRejectId && e.ActionType == ExceptionActionType.RejectProposal);
            Assert.NotNull(rejectExc);
            Assert.StartsWith("[REJECTED]", rejectExc.Reason);
        }
    }

    [Fact]
    public async Task Scenario07_UnchangedRejectedProposal_CannotBypassRejectionWorkflow()
    {
        var teamId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.ProjectTeams.Add(new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-REJ-BYPASS",
                Title = "Bypass Attempt Team",
                Status = ProjectStatus.PendingGuide,
                GuideUserId = DbInitializer.FacultyVermaUserId
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(DbInitializer.FacultyVermaUserId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Faculty);
        var rejectRes = await client.PostAsJsonAsync($"/api/faculty/proposals/{teamId}/reject", new ReturnProposalRequest { Remarks = "Topic rejected by faculty guide" });
        Assert.Equal(HttpStatusCode.OK, rejectRes.StatusCode);

        // Attempting to endorse the unchanged rejected proposal directly without re-submitting and re-assigning guide
        var endorseRes = await client.PostAsJsonAsync($"/api/faculty/proposals/{teamId}/endorse", new { });
        Assert.Equal(HttpStatusCode.Forbidden, endorseRes.StatusCode);
    }

    [Fact]
    public async Task Scenario08_FinalViva_CannotCompleteTeam_WithMissingIndividualScores()
    {
        var teamId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            var team = new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-VIVA-MISS-SCORE",
                Title = "Missing Score Team",
                Status = ProjectStatus.ReadyForViva,
                GuideUserId = DbInitializer.FacultyVermaUserId
            };
            db.ProjectTeams.Add(team);

            db.TeamMembers.Add(new TeamMember { Id = Guid.NewGuid(), CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = teamId, UserId = DbInitializer.StudentShivanshUserId, IsActive = true });
            db.TeamMembers.Add(new TeamMember { Id = Guid.NewGuid(), CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = teamId, UserId = DbInitializer.StudentAaravUserId, IsActive = true });

            db.TeamArtifacts.Add(new TeamArtifact { Id = Guid.NewGuid(), CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = teamId, SlotType = ArtifactSlotType.FinalThesis, Status = ArtifactStatus.Verified });
            db.TeamArtifacts.Add(new TeamArtifact { Id = Guid.NewGuid(), CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = teamId, SlotType = ArtifactSlotType.PlagiarismReport, Status = ArtifactStatus.Verified });

            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(DbInitializer.FacultyNairUserId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Faculty);
        var payload = new SubmitVivaEvaluationRequest
        {
            ProjectTeamId = teamId,
            CheckpointType = CheckpointType.FinalViva,
            SharedTotalScore = 55m,
            StudentScores = new List<StudentScoreInput>
            {
                new() { StudentUserId = DbInitializer.StudentShivanshUserId, ModuleOwnershipScore = 20m, VivaQaScore = 20m, LogDisciplineScore = 10m }
                // Aarav omitted
            }
        };

        var response = await client.PostAsJsonAsync("/api/faculty/evaluations", payload);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("Every active team member must receive an individual evaluation score", content);
    }

    [Fact]
    public async Task Scenario09_FinalViva_CannotCompleteTeam_WithUnverifiedRequiredDeliverables()
    {
        var teamId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            var team = new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-VIVA-UNVERIF",
                Title = "Unverified Deliverables Team",
                Status = ProjectStatus.ReadyForViva,
                GuideUserId = DbInitializer.FacultyVermaUserId
            };
            db.ProjectTeams.Add(team);

            db.TeamMembers.Add(new TeamMember { Id = Guid.NewGuid(), CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = teamId, UserId = DbInitializer.StudentShivanshUserId, IsActive = true });

            // FinalThesis is Uploaded, not Verified
            db.TeamArtifacts.Add(new TeamArtifact { Id = Guid.NewGuid(), CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = teamId, SlotType = ArtifactSlotType.FinalThesis, Status = ArtifactStatus.Uploaded });
            db.TeamArtifacts.Add(new TeamArtifact { Id = Guid.NewGuid(), CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = teamId, SlotType = ArtifactSlotType.PlagiarismReport, Status = ArtifactStatus.Verified });

            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(DbInitializer.FacultyNairUserId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Faculty);
        var payload = new SubmitVivaEvaluationRequest
        {
            ProjectTeamId = teamId,
            CheckpointType = CheckpointType.FinalViva,
            SharedTotalScore = 55m,
            StudentScores = new List<StudentScoreInput>
            {
                new() { StudentUserId = DbInitializer.StudentShivanshUserId, ModuleOwnershipScore = 20m, VivaQaScore = 20m, LogDisciplineScore = 10m }
            }
        };

        var response = await client.PostAsJsonAsync("/api/faculty/evaluations", payload);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("FinalThesis and PlagiarismReport", content);
    }

    [Fact]
    public async Task Scenario10_FinalViva_DoesNotBypassRequiredHodSignOff_RetainsReadyForViva()
    {
        var teamId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            var team = new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-VIVA-SIGN-OFF",
                Title = "SignOff Retention Team",
                Status = ProjectStatus.ReadyForViva,
                GuideUserId = DbInitializer.FacultyVermaUserId
            };
            db.ProjectTeams.Add(team);

            db.TeamMembers.Add(new TeamMember { Id = Guid.NewGuid(), CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = teamId, UserId = DbInitializer.StudentShivanshUserId, IsActive = true });

            db.TeamArtifacts.Add(new TeamArtifact { Id = Guid.NewGuid(), CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = teamId, SlotType = ArtifactSlotType.FinalThesis, Status = ArtifactStatus.Verified });
            db.TeamArtifacts.Add(new TeamArtifact { Id = Guid.NewGuid(), CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = teamId, SlotType = ArtifactSlotType.PlagiarismReport, Status = ArtifactStatus.Verified });

            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(DbInitializer.FacultyNairUserId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Faculty);
        var payload = new SubmitVivaEvaluationRequest
        {
            ProjectTeamId = teamId,
            CheckpointType = CheckpointType.FinalViva,
            SharedTotalScore = 55m,
            GeneralRemarks = "Final thesis defense presented successfully.",
            StudentScores = new List<StudentScoreInput>
            {
                new() { StudentUserId = DbInitializer.StudentShivanshUserId, ModuleOwnershipScore = 20m, VivaQaScore = 20m, LogDisciplineScore = 10m }
            }
        };

        var response = await client.PostAsJsonAsync("/api/faculty/evaluations", payload);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var (verifyDb, _, verifyScope) = CreateTestDbContext();
        using (verifyScope)
        {
            var team = await verifyDb.ProjectTeams.FindAsync(teamId);
            Assert.NotNull(team);
            // Must retain ReadyForViva awaiting institutional/HOD completion sign-off, NOT unilaterally Completed
            Assert.Equal(ProjectStatus.ReadyForViva, team.Status);

            var eval = await verifyDb.VivaEvaluations.FirstOrDefaultAsync(e => e.ProjectTeamId == teamId && e.CheckpointType == CheckpointType.FinalViva);
            Assert.NotNull(eval);
            Assert.True(eval.IsLocked);
        }
    }

    [Fact]
    public async Task Scenario11_UnassignedFaculty_CannotAccessTeamArtifactMetadata()
    {
        var otherFacultyId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.Users.Add(new UserAccount
            {
                Id = otherFacultyId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.MeDepartmentId,
                Email = $"mech_fac_{Guid.NewGuid():N}@sistec.ac.in",
                FullName = "Prof. Mech Faculty",
                Role = UserRole.Faculty
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(otherFacultyId, DbInitializer.SistecTenantId, DbInitializer.MeDepartmentId, UserRole.Faculty);
        var response = await client.GetAsync($"/api/faculty/teams/{DbInitializer.Team01Id}/artifacts");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Scenario12_CrossDepartmentHod_CannotPerformOverrides()
    {
        var mechHodId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.Users.Add(new UserAccount
            {
                Id = mechHodId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.MeDepartmentId,
                Email = $"mech_hod_{Guid.NewGuid():N}@sistec.ac.in",
                FullName = "Dr. Mech HOD",
                Role = UserRole.HOD
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(mechHodId, DbInitializer.SistecTenantId, DbInitializer.MeDepartmentId, UserRole.HOD);

        // 1. Endorse CSE proposal
        var endorseRes = await client.PostAsJsonAsync($"/api/faculty/proposals/{DbInitializer.Team01Id}/endorse", new { });
        Assert.Equal(HttpStatusCode.Forbidden, endorseRes.StatusCode);

        // 2. Return CSE proposal
        var returnRes = await client.PostAsJsonAsync($"/api/faculty/proposals/{DbInitializer.Team01Id}/return", new ReturnProposalRequest { Remarks = "Invalid override" });
        Assert.Equal(HttpStatusCode.Forbidden, returnRes.StatusCode);

        // 3. Reject CSE proposal
        var rejectRes = await client.PostAsJsonAsync($"/api/faculty/proposals/{DbInitializer.Team01Id}/reject", new ReturnProposalRequest { Remarks = "Invalid override" });
        Assert.Equal(HttpStatusCode.Forbidden, rejectRes.StatusCode);
    }

    [Fact]
    public async Task Scenario13_SameDepartmentHod_CanPerformPermittedOverrides()
    {
        var teamId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.ProjectTeams.Add(new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-HOD-OVR",
                Title = "HOD Override Team",
                Status = ProjectStatus.PendingGuide,
                GuideUserId = DbInitializer.FacultyVermaUserId
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(DbInitializer.HodSharmaUserId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.HOD);
        var endorseRes = await client.PostAsJsonAsync($"/api/faculty/proposals/{teamId}/endorse", new { });
        Assert.Equal(HttpStatusCode.OK, endorseRes.StatusCode);

        var (verifyDb, _, verifyScope) = CreateTestDbContext();
        using (verifyScope)
        {
            var team = await verifyDb.ProjectTeams.FindAsync(teamId);
            Assert.NotNull(team);
            Assert.Equal(ProjectStatus.PendingCoordinator, team.Status);
        }
    }

    [Fact]
    public async Task Scenario14_CrossTenantUsers_CannotAccessOrModifyAnotherCollegeEntities()
    {
        var bmsceFacultyId = Guid.NewGuid();
        var (db, _, scope) = CreateTestDbContext();
        using (scope)
        {
            db.Users.Add(new UserAccount
            {
                Id = bmsceFacultyId,
                CollegeId = DbInitializer.BmsceTenantId,
                DepartmentId = Guid.NewGuid(),
                Email = $"bmsce_fac_{Guid.NewGuid():N}@bmsce.ac.in",
                FullName = "Prof. BMSCE Faculty",
                Role = UserRole.Faculty
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(bmsceFacultyId, DbInitializer.BmsceTenantId, null, UserRole.Faculty);
        // Attempting to access SISTec's Team01 artifacts
        var response = await client.GetAsync($"/api/faculty/teams/{DbInitializer.Team01Id}/artifacts");
        // Must be NotFound (query filter hidden) or Forbidden
        Assert.True(response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Scenario15_ClientSuppliedDepartmentId_CannotCreateCrossDepartmentRecords()
    {
        var client = CreateAuthenticatedClient(DbInitializer.FacultyNairUserId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.Faculty);
        var payload = new CreateProblemStatementRequest
        {
            DepartmentId = DbInitializer.MeDepartmentId, // Attacker sends Mechanical Dept
            AcademicTrackId = DbInitializer.MinorTrackId,
            Title = "Manipulated Cross-Department Problem Statement",
            Abstract = "Attempting to create statement under another department.",
            SdgCode = "SDG-09",
            MaxTeamCapacity = 4
        };

        var response = await client.PostAsJsonAsync("/api/faculty/problem-bank", payload);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("affiliated academic department", content);
    }
}
