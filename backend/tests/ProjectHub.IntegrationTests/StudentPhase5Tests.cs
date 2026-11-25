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
using ProjectHub.Infrastructure.Services;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class StudentPhase5Tests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public StudentPhase5Tests(CustomWebApplicationFactory factory)
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

    private async Task<(Guid StudentId, string Token)> CreateStudentAsync(
        string emailSuffix,
        Guid? collegeId = null,
        Guid? departmentId = null)
    {
        var cid = collegeId ?? DbInitializer.SistecTenantId;
        var did = departmentId ?? DbInitializer.CseDepartmentId;
        var studentId = Guid.NewGuid();

        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

        var user = new UserAccount
        {
            Id = studentId,
            CollegeId = cid,
            DepartmentId = did,
            FullName = $"Student {emailSuffix}",
            Email = $"student.{emailSuffix.ToLowerInvariant()}.{Guid.NewGuid():N}@sistec.ac.in",
            EnrollmentOrEmployeeCode = $"0176CS{Random.Shared.Next(100000, 999999)}",
            Role = UserRole.Student,
            IsActivated = true,
            IsActive = true
        };
        db.Users.Add(user);

        var enrollment = new StudentAcademicEnrollment
        {
            CollegeId = cid,
            StudentUserId = studentId,
            DepartmentId = did,
            AcademicStatus = AcademicStatus.Active,
            AdmissionBatch = "2023-2027"
        };
        db.StudentAcademicEnrollments.Add(enrollment);

        await db.SaveChangesAsync();

        var token = GenerateToken(studentId, cid, did, UserRole.Student);
        return (studentId, token);
    }

    private async Task<(Guid FacultyId, string Token)> CreateFacultyAsync(
        string emailSuffix,
        Guid? collegeId = null,
        Guid? departmentId = null,
        int maxMentorTeams = 4,
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
            FullName = $"Dr. Faculty {emailSuffix}",
            Email = $"faculty.{emailSuffix.ToLowerInvariant()}.{Guid.NewGuid():N}@sistec.ac.in",
            EnrollmentOrEmployeeCode = $"EMP-{Random.Shared.Next(10000, 99999)}",
            Role = UserRole.Faculty,
            Designation = FacultyDesignation.AssociateProfessor,
            IsActivated = true,
            IsActive = true,
            IsProjectCoordinator = isCoordinator,
            MaxMentorTeams = maxMentorTeams,
            SkillsCsv = "AI/ML, Edge IoT, Distributed Systems"
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var token = GenerateToken(facultyId, cid, did, UserRole.Faculty, isCoordinator);
        return (facultyId, token);
    }

    private async Task<(Guid TeamId, Guid LeadId, string LeadToken)> CreateDraftTeamAsync(
        Guid? trackId = null,
        Guid? departmentId = null)
    {
        var (leadId, leadToken) = await CreateStudentAsync("Lead");
        var did = departmentId ?? DbInitializer.CseDepartmentId;

        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

        var trkId = trackId ?? DbInitializer.MinorTrackId;
        var team = new ProjectTeam
        {
            CollegeId = DbInitializer.SistecTenantId,
            DepartmentId = did,
            AcademicTrackId = trkId,
            TeamCode = $"PRJ-{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
            Title = "Official Guide Allocation Test Team",
            Abstract = "Evaluating student guide preferences vs official institutional allocations",
            Status = ProjectStatus.Draft,
            IsRosterLocked = false
        };
        db.ProjectTeams.Add(team);

        var member = new TeamMember
        {
            CollegeId = DbInitializer.SistecTenantId,
            ProjectTeamId = team.Id,
            UserId = leadId,
            IsTeamLead = true,
            IsActive = true
        };
        db.TeamMembers.Add(member);
        await db.SaveChangesAsync();

        return (team.Id, leadId, leadToken);
    }

    // =========================================================================
    // PART 1: GUIDE PREFERENCE WORKFLOW TESTS
    // =========================================================================

    [Fact]
    public async Task SubmitGuidePreference_WhenEligibleFaculty_SucceedsAndDoesNotSetOfficialGuide()
    {
        var (teamId, _, leadToken) = await CreateDraftTeamAsync();
        var (facultyId, _) = await CreateFacultyAsync("MentorA");

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/guide-preference")
        {
            Content = JsonContent.Create(new SubmitGuidePreferenceRequest
            {
                GuideUserId = facultyId,
                Remarks = "Strong research alignment with edge machine learning"
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);

        var res = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var dto = await res.Content.ReadFromJsonAsync<StudentGuidePreferenceDto>();
        Assert.NotNull(dto);
        Assert.Equal(facultyId, dto.PreferredGuideUserId);
        Assert.Equal(GuidePreferenceStatus.Requested, dto.GuidePreferenceStatus);
        Assert.False(dto.IsOfficialGuideAssigned);
        Assert.Null(dto.OfficiallyAllocatedGuideUserId); // CRITICAL: GuideUserId must NOT be set by student!

        // Verify direct database persistence
        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var dbTeam = await db.ProjectTeams.FindAsync(teamId);
        Assert.NotNull(dbTeam);
        Assert.Equal(facultyId, dbTeam.PreferredGuideUserId);
        Assert.Equal(GuidePreferenceStatus.Requested, dbTeam.GuidePreferenceStatus);
        Assert.Null(dbTeam.GuideUserId); // CRITICAL: Database GuideUserId must remain null!
    }

    [Fact]
    public async Task SubmitGuidePreference_WhenIneligibleUser_RejectsWithBadRequest()
    {
        var (_, _, leadToken) = await CreateDraftTeamAsync();
        var (peerStudentId, _) = await CreateStudentAsync("Peer"); // Student cannot be a guide!

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/guide-preference")
        {
            Content = JsonContent.Create(new SubmitGuidePreferenceRequest
            {
                GuideUserId = peerStudentId,
                Remarks = "Selecting classmate as guide"
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);

        var res = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task SubmitGuidePreference_WhenCrossDepartmentFaculty_RejectsWithBadRequest()
    {
        var (_, _, leadToken) = await CreateDraftTeamAsync();
        // Faculty in Mechanical Engineering (cross-department)
        var (crossDeptFacultyId, _) = await CreateFacultyAsync("MechFaculty", departmentId: DbInitializer.MeDepartmentId);

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/guide-preference")
        {
            Content = JsonContent.Create(new SubmitGuidePreferenceRequest
            {
                GuideUserId = crossDeptFacultyId,
                Remarks = "Cross-department mentor request"
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);

        var res = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var body = await res.Content.ReadAsStringAsync();
        Assert.Contains("another department", body);
    }

    [Fact]
    public async Task SubmitGuidePreference_WhenNonTeamLead_RejectsWithForbidden()
    {
        var (teamId, _, _) = await CreateDraftTeamAsync();
        var (memberId, memberToken) = await CreateStudentAsync("Contributor");
        var (facultyId, _) = await CreateFacultyAsync("MentorB");

        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.TeamMembers.Add(new TeamMember
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = teamId,
                UserId = memberId,
                IsTeamLead = false,
                IsActive = true
            });
            await db.SaveChangesAsync();
        }

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/guide-preference")
        {
            Content = JsonContent.Create(new SubmitGuidePreferenceRequest
            {
                GuideUserId = facultyId
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", memberToken);

        var res = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task SubmitGuidePreference_WhenOfficialGuideAlreadyAllocated_RejectsWithBadRequest()
    {
        var (teamId, _, leadToken) = await CreateDraftTeamAsync();
        var (allocatedGuideId, _) = await CreateFacultyAsync("AllocatedGuide");
        var (newPreferenceId, _) = await CreateFacultyAsync("NewPreference");

        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var team = await db.ProjectTeams.FindAsync(teamId);
            team!.GuideUserId = allocatedGuideId; // Official guide already assigned!
            team.GuidePreferenceStatus = GuidePreferenceStatus.Allocated;
            await db.SaveChangesAsync();
        }

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/guide-preference")
        {
            Content = JsonContent.Create(new SubmitGuidePreferenceRequest
            {
                GuideUserId = newPreferenceId,
                Remarks = "Attempting to overwrite official guide allocation"
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);

        var res = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var body = await res.Content.ReadAsStringAsync();
        Assert.Contains("official faculty guide has already been allocated", body);
    }

    // =========================================================================
    // PART 2: OFFICIAL INSTITUTIONAL ALLOCATION TESTS
    // =========================================================================

    [Fact]
    public async Task CoordinatorAssignGuide_OfficiallyAllocatesGuide_AndSetsAllocatedStatus()
    {
        var (teamId, _, _) = await CreateDraftTeamAsync();
        var (officialGuideId, _) = await CreateFacultyAsync("OfficialMentor");
        var (_, coordToken) = await CreateFacultyAsync("Coordinator", isCoordinator: true);

        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/coordinator/teams/{teamId}/assign-guide")
        {
            Content = JsonContent.Create(new AssignGuideRequest
            {
                GuideUserId = officialGuideId
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", coordToken);

        var res = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var dbTeam = await db.ProjectTeams.FindAsync(teamId);
        Assert.NotNull(dbTeam);
        Assert.Equal(officialGuideId, dbTeam.GuideUserId);
        Assert.Equal(GuidePreferenceStatus.Allocated, dbTeam.GuidePreferenceStatus);
        Assert.NotNull(dbTeam.GuideAllocatedAtUtc);

        // Verify ExceptionAuditLog was written
        var excLog = await db.ExceptionAuditLogs
            .FirstOrDefaultAsync(l => l.ProjectTeamId == teamId && l.ActionType == ExceptionActionType.ReassignGuide);
        Assert.NotNull(excLog);
        Assert.Equal(officialGuideId, excLog.TargetUserId);
    }

    [Fact]
    public async Task PreferredGuideDiffersFromOfficiallyAllocatedGuide_RetainsBothDistinctIdentities()
    {
        var (teamId, _, leadToken) = await CreateDraftTeamAsync();
        var (preferredGuideId, _) = await CreateFacultyAsync("PreferredMentor");
        var (officialGuideId, _) = await CreateFacultyAsync("InstitutionalMentor");
        var (_, coordToken) = await CreateFacultyAsync("Coordinator2", isCoordinator: true);

        // 1. Student selects Preferred Guide A
        var prefReq = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/guide-preference")
        {
            Content = JsonContent.Create(new SubmitGuidePreferenceRequest
            {
                GuideUserId = preferredGuideId,
                Remarks = "Student team preferred choice"
            })
        };
        prefReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var prefRes = await _client.SendAsync(prefReq);
        Assert.Equal(HttpStatusCode.OK, prefRes.StatusCode);

        // 2. Coordinator officially assigns Guide B (Institutional decision)
        var allocReq = new HttpRequestMessage(HttpMethod.Post, $"/api/coordinator/teams/{teamId}/assign-guide")
        {
            Content = JsonContent.Create(new AssignGuideRequest
            {
                GuideUserId = officialGuideId
            })
        };
        allocReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", coordToken);
        var allocRes = await _client.SendAsync(allocReq);
        Assert.Equal(HttpStatusCode.OK, allocRes.StatusCode);

        // 3. Verify Student Workspace DTO reflects BOTH distinctly
        var getReq = new HttpRequestMessage(HttpMethod.Get, "/api/student/teams/guide-preference");
        getReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var getRes = await _client.SendAsync(getReq);
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);

        var dto = await getRes.Content.ReadFromJsonAsync<StudentGuidePreferenceDto>();
        Assert.NotNull(dto);
        Assert.Equal(preferredGuideId, dto.PreferredGuideUserId); // Preference retained
        Assert.Equal(officialGuideId, dto.OfficiallyAllocatedGuideUserId); // Official allocation distinct
        Assert.NotEqual(dto.PreferredGuideUserId, dto.OfficiallyAllocatedGuideUserId);
        Assert.True(dto.IsOfficialGuideAssigned);
        Assert.Equal(GuidePreferenceStatus.Allocated, dto.GuidePreferenceStatus);
    }

    [Fact]
    public async Task CoordinatorRejectGuideRequest_MarksPreferenceRejected_AndLeavesOfficialGuideNull()
    {
        var (teamId, _, leadToken) = await CreateDraftTeamAsync();
        var (preferredGuideId, _) = await CreateFacultyAsync("CandidateMentor");
        var (_, coordToken) = await CreateFacultyAsync("Coordinator3", isCoordinator: true);

        // 1. Submit preference
        var prefReq = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/guide-preference")
        {
            Content = JsonContent.Create(new SubmitGuidePreferenceRequest
            {
                GuideUserId = preferredGuideId,
                Remarks = "Applying for Dr. Candidate"
            })
        };
        prefReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        await _client.SendAsync(prefReq);

        // 2. Coordinator rejects guide request with remarks
        var rejectReq = new HttpRequestMessage(HttpMethod.Post, $"/api/coordinator/teams/{teamId}/reject-guide-request")
        {
            Content = JsonContent.Create(new RejectGuidePreferenceRequest
            {
                Reason = "Faculty research workload fully subscribed; please select alternative faculty mentor."
            })
        };
        rejectReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", coordToken);
        var rejectRes = await _client.SendAsync(rejectReq);
        Assert.Equal(HttpStatusCode.OK, rejectRes.StatusCode);

        // 3. Inspect student view
        var getReq = new HttpRequestMessage(HttpMethod.Get, "/api/student/teams/guide-preference");
        getReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var getRes = await _client.SendAsync(getReq);
        var dto = await getRes.Content.ReadFromJsonAsync<StudentGuidePreferenceDto>();

        Assert.NotNull(dto);
        Assert.Equal(GuidePreferenceStatus.Rejected, dto.GuidePreferenceStatus);
        Assert.False(dto.IsOfficialGuideAssigned);
        Assert.Null(dto.OfficiallyAllocatedGuideUserId);
        Assert.Contains("research workload fully subscribed", dto.GuideAllocationRemarks);
        Assert.True(dto.CanModifyPreference); // Student team is allowed to resubmit!
    }

    [Fact]
    public async Task CoordinatorAssignGuide_WhenFacultyAtMaxCapacity_RejectsWithBadRequest()
    {
        var (teamId, _, _) = await CreateDraftTeamAsync();
        var (cappedFacultyId, _) = await CreateFacultyAsync("CappedMentor", maxMentorTeams: 1);
        var (_, coordToken) = await CreateFacultyAsync("Coordinator4", isCoordinator: true);

        // Give faculty 1 active project team
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.ProjectTeams.Add(new ProjectTeam
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = $"OCC-{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
                Title = "Pre-existing Project Occupying Faculty",
                Abstract = "Consuming mentor capacity",
                Status = ProjectStatus.ActiveBuild,
                GuideUserId = cappedFacultyId
            });
            await db.SaveChangesAsync();
        }

        // Attempting to assign capped faculty must fail
        var allocReq = new HttpRequestMessage(HttpMethod.Post, $"/api/coordinator/teams/{teamId}/assign-guide")
        {
            Content = JsonContent.Create(new AssignGuideRequest
            {
                GuideUserId = cappedFacultyId
            })
        };
        allocReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", coordToken);
        var allocRes = await _client.SendAsync(allocReq);

        Assert.Equal(HttpStatusCode.BadRequest, allocRes.StatusCode);
        var body = await allocRes.Content.ReadAsStringAsync();
        Assert.Contains("maximum mentorship capacity", body);
    }

    // =========================================================================
    // PART 3: REASSIGNMENT & AUDIT TRACEABILITY TESTS
    // =========================================================================

    [Fact]
    public async Task ReassignmentHistory_IsTraceableAndSurvivesQuery()
    {
        var (teamId, _, leadToken) = await CreateDraftTeamAsync();
        var (guideAId, _) = await CreateFacultyAsync("InitialGuide");
        var (guideBId, _) = await CreateFacultyAsync("ReplacementGuide");
        var (_, coordToken) = await CreateFacultyAsync("Coordinator5", isCoordinator: true);

        // 1. Initial allocation to Guide A
        var alloc1 = new HttpRequestMessage(HttpMethod.Post, $"/api/coordinator/teams/{teamId}/assign-guide")
        {
            Content = JsonContent.Create(new AssignGuideRequest { GuideUserId = guideAId })
        };
        alloc1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", coordToken);
        await _client.SendAsync(alloc1);

        // 2. Reassignment to Guide B
        var alloc2 = new HttpRequestMessage(HttpMethod.Post, $"/api/coordinator/teams/{teamId}/assign-guide")
        {
            Content = JsonContent.Create(new AssignGuideRequest { GuideUserId = guideBId })
        };
        alloc2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", coordToken);
        await _client.SendAsync(alloc2);

        // 3. Query guide preference and verify audit history
        var getReq = new HttpRequestMessage(HttpMethod.Get, "/api/student/teams/guide-preference");
        getReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var getRes = await _client.SendAsync(getReq);
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);

        var dto = await getRes.Content.ReadFromJsonAsync<StudentGuidePreferenceDto>();
        Assert.NotNull(dto);
        Assert.Equal(guideBId, dto.OfficiallyAllocatedGuideUserId);
        Assert.NotEmpty(dto.ReassignmentHistory);

        var latestLog = dto.ReassignmentHistory.First();
        Assert.Equal(guideAId, latestLog.PreviousGuideId);
        Assert.Equal(guideBId, latestLog.NewGuideId);
        Assert.Contains("Guide reassigned by Coordinator", latestLog.Reason);
    }

    // =========================================================================
    // PART 4: FACULTY DIRECTORY & WORKLOAD TESTS
    // =========================================================================

    [Fact]
    public async Task GetFacultyGuides_ReturnsDepartmentFacultyWithLiveWorkloadAndSkills()
    {
        var (_, leadToken) = await CreateStudentAsync("DirStudent");
        var (facId, _) = await CreateFacultyAsync("ExpertFaculty", maxMentorTeams: 5);

        var req = new HttpRequestMessage(HttpMethod.Get, "/api/student/faculty-guides");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var list = await res.Content.ReadFromJsonAsync<List<FacultyGuideSummaryDto>>();
        Assert.NotNull(list);
        Assert.NotEmpty(list);

        var target = list.FirstOrDefault(f => f.Id == facId);
        Assert.NotNull(target);
        Assert.Equal("AI/ML, Edge IoT, Distributed Systems", target.SkillsCsv);
        Assert.Equal(5, target.MaxMentorTeams);
        Assert.True(target.IsAvailable);
        Assert.Null(target.EmployeeCode); // Confirms internal HR code is concealed
    }

    // =========================================================================
    // PART 5: PHASE 5.1 INTEGRITY & DEFECT CLOSURE TESTS
    // =========================================================================

    [Fact]
    public async Task Hod_AssignGuide_AutomaticallySynchronizes_GuidePreferenceStatusAndAllocationMetadata()
    {
        // 1. Arrange: Team in Draft with student nominated preferred guide
        var (teamId, _, leadToken) = await CreateDraftTeamAsync();
        var (facultyAId, _) = await CreateFacultyAsync("HodPref");
        var (facultyBId, _) = await CreateFacultyAsync("HodOff");

        var prefMsg = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/guide-preference")
        {
            Content = JsonContent.Create(new SubmitGuidePreferenceRequest { GuideUserId = facultyAId, Remarks = "Student team nomination" })
        };
        prefMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var prefRes = await _client.SendAsync(prefMsg);
        Assert.Equal(HttpStatusCode.OK, prefRes.StatusCode);

        // 2. Act: Existing HOD endpoint allocates official guide without modifying HodController
        var hodToken = GenerateToken(DbInitializer.HodSharmaUserId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.HOD);
        var assignMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/hod/projects/{teamId}/assign-guide")
        {
            Content = JsonContent.Create(new HodAssignGuideRequest
            {
                GuideUserId = facultyBId,
                Reason = "HOD departmental allocation committee decision"
            })
        };
        assignMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);
        var assignRes = await _client.SendAsync(assignMsg);
        Assert.Equal(HttpStatusCode.OK, assignRes.StatusCode);

        // 3. Assert in Database: ProjectHubDbContext automatically synchronized Phase 5 lifecycle fields
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var team = await db.ProjectTeams.IgnoreQueryFilters().FirstAsync(t => t.Id == teamId);

            Assert.Equal(facultyBId, team.GuideUserId); // Official guide assigned
            Assert.Equal(facultyAId, team.PreferredGuideUserId); // Preferred guide preserved
            Assert.Equal(GuidePreferenceStatus.Allocated, team.GuidePreferenceStatus); // Synchronized!
            Assert.NotNull(team.GuideAllocatedAtUtc);
            Assert.Equal(DbInitializer.HodSharmaUserId, team.GuideAllocatedByUserId);
            Assert.Contains("HOD departmental allocation", team.GuideAllocationRemarks);
        }

        // 4. Assert in Student API: Student query reflects synchronized status and HOD audit record
        var getMsg = new HttpRequestMessage(HttpMethod.Get, "/api/student/teams/guide-preference");
        getMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var getRes = await _client.SendAsync(getMsg);
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);

        var dto = await getRes.Content.ReadFromJsonAsync<StudentGuidePreferenceDto>();
        Assert.NotNull(dto);
        Assert.Equal(GuidePreferenceStatus.Allocated, dto.GuidePreferenceStatus);
        Assert.Equal(facultyBId, dto.OfficiallyAllocatedGuideUserId);
        Assert.Equal(facultyAId, dto.PreferredGuideUserId);
        Assert.NotNull(dto.GuideAllocatedAtUtc);
        Assert.NotEmpty(dto.ReassignmentHistory);
        Assert.Contains(dto.ReassignmentHistory, h => h.NewGuideId == facultyBId && h.Reason.Contains("HOD"));
    }

    [Fact]
    public async Task SubmitGuidePreference_WhenRemarksExceed500Chars_RejectsWithBadRequest()
    {
        var (_, _, leadToken) = await CreateDraftTeamAsync();
        var (facId, _) = await CreateFacultyAsync("Over500");

        var longRemarks = new string('A', 501);
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/guide-preference")
        {
            Content = JsonContent.Create(new SubmitGuidePreferenceRequest
            {
                GuideUserId = facId,
                Remarks = longRemarks
            })
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task CoordinatorAssignGuide_WhenReasonExceeds500Chars_RejectsWithBadRequest()
    {
        var (teamId, _, _) = await CreateDraftTeamAsync();
        var (facId, _) = await CreateFacultyAsync("OverReason");
        var (_, coordToken) = await CreateFacultyAsync("CoordOver", isCoordinator: true);

        var longReason = new string('B', 501);
        var req = new HttpRequestMessage(HttpMethod.Post, $"/api/coordinator/teams/{teamId}/assign-guide")
        {
            Content = JsonContent.Create(new AssignGuideRequest
            {
                GuideUserId = facId,
                Reason = longReason
            })
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", coordToken);

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task CoordinatorRejectGuideRequest_WhenReasonExceeds500Chars_RejectsWithBadRequest()
    {
        var (teamId, _, leadToken) = await CreateDraftTeamAsync();
        var (facId, _) = await CreateFacultyAsync("RejectOver");
        var (_, coordToken) = await CreateFacultyAsync("CoordRej", isCoordinator: true);

        // Submit preference first
        var prefMsg = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/guide-preference")
        {
            Content = JsonContent.Create(new SubmitGuidePreferenceRequest { GuideUserId = facId })
        };
        prefMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        await _client.SendAsync(prefMsg);

        // Coordinator rejects with > 500 chars
        var longReason = new string('R', 501);
        var rejMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/coordinator/teams/{teamId}/reject-guide-request")
        {
            Content = JsonContent.Create(new RejectGuidePreferenceRequest { Reason = longReason })
        };
        rejMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", coordToken);

        var res = await _client.SendAsync(rejMsg);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task CoordinatorRejectGuideRequest_WhenOfficialGuideAlreadyAllocated_RejectsWithBadRequest()
    {
        var (teamId, _, _) = await CreateDraftTeamAsync();
        var (facId, _) = await CreateFacultyAsync("AlreadyAlloc");
        var (_, coordToken) = await CreateFacultyAsync("CoordGuard", isCoordinator: true);

        // Officially allocate guide
        var assignMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/coordinator/teams/{teamId}/assign-guide")
        {
            Content = JsonContent.Create(new AssignGuideRequest { GuideUserId = facId })
        };
        assignMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", coordToken);
        var assignRes = await _client.SendAsync(assignMsg);
        Assert.Equal(HttpStatusCode.OK, assignRes.StatusCode);

        // Attempting to reject an official allocation must fail (requires official reassignment instead)
        var rejMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/coordinator/teams/{teamId}/reject-guide-request")
        {
            Content = JsonContent.Create(new RejectGuidePreferenceRequest { Reason = "Attempt invalid rejection" })
        };
        rejMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", coordToken);

        var res = await _client.SendAsync(rejMsg);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task ExceptionAuditLog_Deletion_IsBlockedByImmutabilityGuard()
    {
        Guid logId = Guid.NewGuid();
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var log = new ExceptionAuditLog
            {
                Id = logId,
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                ActionType = ExceptionActionType.ReassignGuide,
                Reason = "Original immutable entry",
                RequestedByUserId = DbInitializer.HodSharmaUserId,
                ApprovedByUserId = DbInitializer.HodSharmaUserId,
                ApprovedAtUtc = DateTime.UtcNow
            };
            db.ExceptionAuditLogs.Add(log);
            await db.SaveChangesAsync();
        }

        // Test: Deletion must throw InvalidOperationException
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var log = await db.ExceptionAuditLogs.IgnoreQueryFilters().FirstAsync(l => l.Id == logId);
            db.ExceptionAuditLogs.Remove(log);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());
            Assert.Contains("Audit Log Immutability Violation", ex.Message);
        }
    }

    [Fact]
    public async Task Hod_And_Coordinator_Enforce_Identical_Mentorship_Capacity_Hard_Block()
    {
        var (facId, _) = await CreateFacultyAsync("CappedFaculty", maxMentorTeams: 1);
        var (_, coordToken) = await CreateFacultyAsync("CoordCapTester", isCoordinator: true);
        var hodToken = GenerateToken(DbInitializer.HodSharmaUserId, DbInitializer.SistecTenantId, DbInitializer.CseDepartmentId, UserRole.HOD);

        // Fill faculty to capacity (1/1)
        var (t1, _, _) = await CreateDraftTeamAsync();
        var assignT1 = new HttpRequestMessage(HttpMethod.Post, $"/api/coordinator/teams/{t1}/assign-guide")
        {
            Content = JsonContent.Create(new AssignGuideRequest { GuideUserId = facId })
        };
        assignT1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", coordToken);
        var res1 = await _client.SendAsync(assignT1);
        Assert.Equal(HttpStatusCode.OK, res1.StatusCode);

        // Attempt second assignment via Coordinator -> must return 400 with capacity message
        var (t2, _, _) = await CreateDraftTeamAsync();
        var coordOverReq = new HttpRequestMessage(HttpMethod.Post, $"/api/coordinator/teams/{t2}/assign-guide")
        {
            Content = JsonContent.Create(new AssignGuideRequest { GuideUserId = facId })
        };
        coordOverReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", coordToken);
        var coordOverRes = await _client.SendAsync(coordOverReq);
        Assert.Equal(HttpStatusCode.BadRequest, coordOverRes.StatusCode);

        // Attempt second assignment via HOD -> must return 400 with identical capacity message
        var (t3, _, _) = await CreateDraftTeamAsync();
        var hodOverReq = new HttpRequestMessage(HttpMethod.Post, $"/api/hod/projects/{t3}/assign-guide")
        {
            Content = JsonContent.Create(new HodAssignGuideRequest { GuideUserId = facId, Reason = "HOD override attempt" })
        };
        hodOverReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);
        var hodOverRes = await _client.SendAsync(hodOverReq);
        Assert.Equal(HttpStatusCode.BadRequest, hodOverRes.StatusCode);
    }

    // =========================================================================
    // PHASE 5.2: LEGACY STUDENT ALLOCATION BYPASS SECURITY REGRESSION TESTS
    // =========================================================================

    [Fact]
    public async Task CreateIdea_WithGuideUserId_PersistsPreferredGuideOnly_AndLeavesOfficialGuideNull()
    {
        var (studentId, studentToken) = await CreateStudentAsync("IdeaCreator");
        var (facultyId, _) = await CreateFacultyAsync("NominatedMentor");

        var createReq = new CreateProjectIdeaRequest
        {
            Title = "Decentralized Grid Telemetry Using Edge AI",
            Abstract = "Investigation of low-latency fault detection telemetry across distributed nodes.",
            DomainTag = "IoT & Embedded Systems",
            SdgCode = "SDG-9",
            GuideUserId = facultyId
        };

        var postMsg = new HttpRequestMessage(HttpMethod.Post, "/api/student/ideas")
        {
            Content = JsonContent.Create(createReq)
        };
        postMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);

        var res = await _client.SendAsync(postMsg);
        Assert.True(res.StatusCode == HttpStatusCode.OK || res.StatusCode == HttpStatusCode.Created);

        var dto = await res.Content.ReadFromJsonAsync<ProjectIdeaDto>();
        Assert.NotNull(dto);
        Assert.Equal(facultyId, dto.GuideUserId); // DTO backward compatibility

        // Direct DB Verification: ProjectTeam.GuideUserId MUST be strictly null!
        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var dbTeam = await db.ProjectTeams.FindAsync(dto.Id);

        Assert.NotNull(dbTeam);
        Assert.Null(dbTeam.GuideUserId); // CRITICAL: Database GuideUserId must remain null!
        Assert.Equal(facultyId, dbTeam.PreferredGuideUserId);
        Assert.Equal(GuidePreferenceStatus.Requested, dbTeam.GuidePreferenceStatus);
        Assert.Null(dbTeam.GuideAllocatedAtUtc);
        Assert.Null(dbTeam.GuideAllocatedByUserId);
        Assert.Null(dbTeam.GuideAllocationRemarks);
    }

    [Fact]
    public async Task UpdateIdea_WithGuideUserId_UpdatesPreferredGuideOnly_AndNeverMutatesOfficialGuide()
    {
        var (studentId, studentToken) = await CreateStudentAsync("IdeaUpdater");
        var (initialFacultyId, _) = await CreateFacultyAsync("InitialMentor");
        var (newFacultyId, _) = await CreateFacultyAsync("UpdatedMentor");

        // Create idea
        var createReq = new CreateProjectIdeaRequest
        {
            Title = "Autonomous Obstacle Detection For Precision Farming",
            Abstract = "Real-time stereo camera obstacle mapping and path planning in agricultural robotics.",
            DomainTag = "Robotics & Autonomous Systems",
            SdgCode = "SDG-2",
            GuideUserId = initialFacultyId
        };
        var postMsg = new HttpRequestMessage(HttpMethod.Post, "/api/student/ideas")
        {
            Content = JsonContent.Create(createReq)
        };
        postMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);
        var createRes = await _client.SendAsync(postMsg);
        var created = await createRes.Content.ReadFromJsonAsync<ProjectIdeaDto>();
        Assert.NotNull(created);

        // Update idea with a different guide ID
        var updateReq = new UpdateProjectIdeaRequest
        {
            Title = "Autonomous Obstacle Detection For Precision Farming (Rev 2)",
            GuideUserId = newFacultyId
        };
        var putMsg = new HttpRequestMessage(HttpMethod.Put, $"/api/student/ideas/{created.Id}")
        {
            Content = JsonContent.Create(updateReq)
        };
        putMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);
        var updateRes = await _client.SendAsync(putMsg);
        Assert.Equal(HttpStatusCode.OK, updateRes.StatusCode);

        // Direct DB Verification: GuideUserId MUST still be null, PreferredGuideUserId updated
        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var dbTeam = await db.ProjectTeams.FindAsync(created.Id);

        Assert.NotNull(dbTeam);
        Assert.Null(dbTeam.GuideUserId); // MUST NOT be assigned by student update!
        Assert.Equal(newFacultyId, dbTeam.PreferredGuideUserId);
        Assert.Equal(GuidePreferenceStatus.Requested, dbTeam.GuidePreferenceStatus);
    }

    [Fact]
    public async Task UpdateIdea_WhenOfficialGuideAlreadyAllocated_RejectsModificationWithBadRequest()
    {
        var (studentId, studentToken) = await CreateStudentAsync("AllocatedIdeaLead");
        var (officialFacultyId, _) = await CreateFacultyAsync("OfficialMentor");
        var (otherFacultyId, _) = await CreateFacultyAsync("OtherMentor");
        var (_, coordToken) = await CreateFacultyAsync("CoordForAlloc", isCoordinator: true);

        // 1. Create team
        var createReq = new CreateProjectIdeaRequest
        {
            Title = "Energy Harvesting Embedded Nodes For Smart Buildings",
            Abstract = "Piezoelectric ambient energy harvesting and wireless transmission using BLE mesh.",
            DomainTag = "Renewable Energy & Smart Grid",
            SdgCode = "SDG-7"
        };
        var postMsg = new HttpRequestMessage(HttpMethod.Post, "/api/student/ideas")
        {
            Content = JsonContent.Create(createReq)
        };
        postMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);
        var createRes = await _client.SendAsync(postMsg);
        var created = await createRes.Content.ReadFromJsonAsync<ProjectIdeaDto>();
        Assert.NotNull(created);

        // 2. Coordinator officially allocates guide
        var assignMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/coordinator/teams/{created.Id}/assign-guide")
        {
            Content = JsonContent.Create(new AssignGuideRequest { GuideUserId = officialFacultyId })
        };
        assignMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", coordToken);
        var assignRes = await _client.SendAsync(assignMsg);
        Assert.Equal(HttpStatusCode.OK, assignRes.StatusCode);

        // 3. Student attempts to unilaterally change guide via UpdateIdea -> MUST return 400 Bad Request
        var updateReq = new UpdateProjectIdeaRequest
        {
            GuideUserId = otherFacultyId
        };
        var putMsg = new HttpRequestMessage(HttpMethod.Put, $"/api/student/ideas/{created.Id}")
        {
            Content = JsonContent.Create(updateReq)
        };
        putMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);
        var updateRes = await _client.SendAsync(putMsg);

        Assert.Equal(HttpStatusCode.BadRequest, updateRes.StatusCode);
    }

    [Fact]
    public async Task DbContextParityHook_StudentRole_CannotTriggerOfficialAllocation()
    {
        var studentId = Guid.NewGuid();
        var facultyId = Guid.NewGuid();

        // Simulate a DbContext scoped to Student role
        var optionsBuilder = new DbContextOptionsBuilder<ProjectHubDbContext>();
        optionsBuilder.UseInMemoryDatabase($"TestDb_{Guid.NewGuid():N}");
        var studentTenant = new TenantContext
        {
            CollegeId = DbInitializer.SistecTenantId,
            UserId = studentId,
            Role = UserRole.Student,
            IsSuperAdmin = false
        };

        using var studentDb = new ProjectHubDbContext(optionsBuilder.Options, studentTenant);

        var team = new ProjectTeam
        {
            Id = Guid.NewGuid(),
            CollegeId = DbInitializer.SistecTenantId,
            DepartmentId = DbInitializer.CseDepartmentId,
            AcademicTrackId = DbInitializer.MinorTrackId,
            TeamCode = "PRJ-SEC-TEST",
            Title = "Security Isolation Test Team",
            Abstract = "Verifying DbContext parity hook blocks unauthorized allocation stamping",
            Status = ProjectStatus.Draft,
            GuideUserId = facultyId, // Suppose an unauthorized writer sets GuideUserId
            PreferredGuideUserId = facultyId,
            GuidePreferenceStatus = GuidePreferenceStatus.Allocated // Unauthorized attempt to mark Allocated
        };

        studentDb.ProjectTeams.Add(team);
        await studentDb.SaveChangesAsync();

        // Parity hook must NOT have marked Allocated or stamped the student as the allocating authority
        Assert.NotEqual(GuidePreferenceStatus.Allocated, team.GuidePreferenceStatus);
        Assert.Equal(GuidePreferenceStatus.Requested, team.GuidePreferenceStatus);
        Assert.Null(team.GuideAllocatedAtUtc);
        Assert.Null(team.GuideAllocatedByUserId);
        Assert.Null(team.GuideAllocationRemarks);
    }
}
