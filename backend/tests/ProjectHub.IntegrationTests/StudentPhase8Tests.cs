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

public class StudentPhase8Tests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public StudentPhase8Tests(CustomWebApplicationFactory factory)
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
            CreatedAtUtc = DateTime.UtcNow
        };

        await db.Users.AddAsync(user);
        await db.SaveChangesAsync();

        var token = GenerateToken(studentId, cid, did, UserRole.Student);
        return (studentId, token);
    }

    private async Task<(Guid FacultyId, string Token)> CreateFacultyAsync(
        string name,
        Guid? collegeId = null,
        Guid? departmentId = null,
        UserRole role = UserRole.Faculty)
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

        var token = GenerateToken(facultyId, cid, did, role);
        return (facultyId, token);
    }

    private async Task<(ProjectTeam Team, UserAccount Lead, UserAccount Member, UserAccount Guide)> SeedTeamWithGuideAndMilestoneAsync(
        bool approveMilestone = true)
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
            FullName = "Lead Student Phase 8",
            Email = $"lead.p8.{leadId:N}@sistec.ac.in",
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
            FullName = "Member Student Phase 8",
            Email = $"member.p8.{memberId:N}@sistec.ac.in",
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
            FullName = "Prof. Phase 8 Guide",
            Email = $"guide.p8.{guideId:N}@sistec.ac.in",
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
            TeamCode = $"2026-CS-P8-{Random.Shared.Next(10, 99)}",
            Title = "Autonomous Edge Computing with Deep Neural Acceleration",
            Abstract = "Comprehensive investigation and implementation of energy-efficient deep learning architectures.",
            DomainTag = "Edge AI & IoT",
            SdgCode = "SDG 9",
            Status = ProjectStatus.ActiveBuild,
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
            IsActive = true,
            JoinedAtUtc = DateTime.UtcNow
        };

        var teamRegularMember = new TeamMember
        {
            CollegeId = collegeId,
            ProjectTeamId = team.Id,
            UserId = memberId,
            IsTeamLead = false,
            IsActive = true,
            JoinedAtUtc = DateTime.UtcNow
        };

        await db.TeamMembers.AddRangeAsync(teamLeadMember, teamRegularMember);

        // Milestone
        var milestone = new ProjectMilestone
        {
            CollegeId = collegeId,
            ProjectTeamId = team.Id,
            Title = "System Architecture & Prototype Validation",
            Description = "Comprehensive verification of low-latency inference pipelines on hardware edge testbed.",
            TargetDateUtc = DateTime.UtcNow.AddDays(14),
            Status = approveMilestone ? MilestoneStatus.Approved : MilestoneStatus.SubmittedForReview,
            RequiredTaskCompletionPercentage = 50,
            SubmittedAtUtc = DateTime.UtcNow.AddDays(-2),
            SubmittedByUserId = leadId,
            SubmissionEvidenceUrl = "https://github.com/projecthub-p8/evidence-prototype",
            ReviewedAtUtc = approveMilestone ? DateTime.UtcNow.AddDays(-1) : null,
            ReviewedByUserId = approveMilestone ? guideId : null,
            ReviewFeedback = approveMilestone ? "Architecture validated and approved for final thesis compilation." : null
        };
        await db.ProjectMilestones.AddAsync(milestone);

        await db.SaveChangesAsync();

        return (team, lead, member, guide);
    }

    [Fact]
    public async Task StudentCannotConductAcademicReview_ReturnsForbidden()
    {
        var (team, lead, _, _) = await SeedTeamWithGuideAndMilestoneAsync();
        var token = GenerateToken(lead.Id, team.CollegeId, team.DepartmentId, UserRole.Student);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.PostAsJsonAsync("/api/student/workspace/submission/review", new { });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task NonTeamLeadCannotSaveDraftOrSubmit_ReturnsForbidden()
    {
        var (team, _, member, _) = await SeedTeamWithGuideAndMilestoneAsync();
        var token = GenerateToken(member.Id, team.CollegeId, team.DepartmentId, UserRole.Student);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var draftReq = new SaveSubmissionDraftRequest
        {
            ProjectTitle = "Updated Title by Non-Lead",
            Abstract = "This abstract is sufficiently long to pass model validation but should be rejected because caller is not lead.",
            ProblemStatement = "Problem",
            Methodology = "Methodology",
            ImplementationSummary = "Implementation",
            ResultsAndConclusion = "Results"
        };

        var draftRes = await _client.PutAsJsonAsync("/api/student/workspace/submission/draft", draftReq);
        Assert.Equal(HttpStatusCode.Forbidden, draftRes.StatusCode);

        var submitRes = await _client.PostAsJsonAsync("/api/student/workspace/submission/submit", new SubmitFinalReportRequest());
        Assert.Equal(HttpStatusCode.Forbidden, submitRes.StatusCode);
    }

    [Fact]
    public async Task SubmissionReadinessGates_EnforcePrerequisites()
    {
        // Case A: Team without approved milestone (milestone is SubmittedForReview)
        var (team, lead, _, _) = await SeedTeamWithGuideAndMilestoneAsync(approveMilestone: false);
        var token = GenerateToken(lead.Id, team.CollegeId, team.DepartmentId, UserRole.Student);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Get submission and verify readiness gates
        var getRes = await _client.GetAsync("/api/student/workspace/submission");
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);
        var subDto = await getRes.Content.ReadFromJsonAsync<ProjectReportSubmissionDto>();
        Assert.NotNull(subDto);
        Assert.NotNull(subDto.Readiness);
        Assert.False(subDto.Readiness.IsEligibleForSubmission);
        Assert.Contains(subDto.Readiness.BlockingReasons, r => r.Contains("milestone"));

        // Save a draft
        var draftReq = new SaveSubmissionDraftRequest
        {
            ProjectTitle = "Autonomous Edge Computing with Deep Neural Acceleration",
            Abstract = "A rigorous academic evaluation of edge AI acceleration frameworks with quantized kernels.",
            ProblemStatement = "Standard deep learning networks exhibit severe latency bottlenecks on embedded platforms.",
            Methodology = "We implement mixed-precision 4-bit integer quantization with dedicated systolic array acceleration.",
            ImplementationSummary = "Complete end-to-end deployment on Xilinx Kria KV260 FPGA with custom DMA streaming drivers.",
            ResultsAndConclusion = "Achieved 3.8x throughput speedup with negligible accuracy degradation (<0.4% mAP).",
            References = "IEEE Transactions on Edge Computing, Vol. 12, 2025."
        };

        var saveRes = await _client.PutAsJsonAsync("/api/student/workspace/submission/draft", draftReq);
        Assert.Equal(HttpStatusCode.OK, saveRes.StatusCode);

        // Attempting to submit without approved milestone and without report attachment must fail
        var submitRes = await _client.PostAsJsonAsync("/api/student/workspace/submission/submit", new SubmitFinalReportRequest());
        Assert.Equal(HttpStatusCode.BadRequest, submitRes.StatusCode);
    }

    [Fact]
    public async Task FullSubmissionLifecycle_Draft_Submit_Revision_Resubmit_Accepted()
    {
        var (team, lead, _, guide) = await SeedTeamWithGuideAndMilestoneAsync(approveMilestone: true);
        var studentToken = GenerateToken(lead.Id, team.CollegeId, team.DepartmentId, UserRole.Student);
        var guideToken = GenerateToken(guide.Id, team.CollegeId, team.DepartmentId, UserRole.Faculty);

        // 1. Student Lead saves draft
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);

        var draftReq = new SaveSubmissionDraftRequest
        {
            ProjectTitle = "Autonomous Edge Computing with Deep Neural Acceleration",
            Abstract = "A rigorous academic evaluation of edge AI acceleration frameworks with quantized kernels.",
            ProblemStatement = "Standard deep learning networks exhibit severe latency bottlenecks on embedded platforms.",
            Methodology = "We implement mixed-precision 4-bit integer quantization with dedicated systolic array acceleration.",
            ImplementationSummary = "Complete end-to-end deployment on Xilinx Kria KV260 FPGA with custom DMA streaming drivers.",
            ResultsAndConclusion = "Achieved 3.8x throughput speedup with negligible accuracy degradation (<0.4% mAP).",
            References = "IEEE Transactions on Edge Computing, Vol. 12, 2025.",
            RepositoryUrl = "https://github.com/projecthub-p8/edge-quantization",
            DemoUrl = "https://edge-demo.projecthub.ac.in"
        };

        var saveRes = await _client.PutAsJsonAsync("/api/student/workspace/submission/draft", draftReq);
        Assert.Equal(HttpStatusCode.OK, saveRes.StatusCode);
        var savedDto = await saveRes.Content.ReadFromJsonAsync<ProjectReportSubmissionDto>();
        Assert.NotNull(savedDto);
        Assert.Equal(FinalSubmissionStatus.Draft, savedDto.Status);

        // 2. Attach Report Deliverable
        var attachReq = new AttachReportDeliverableRequest
        {
            ReportFileName = "Final_Capstone_Thesis_Report_v1.pdf",
            ReportFileSizeBytes = 2048576,
            ReportSha256Checksum = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        };
        var attachRes = await _client.PostAsJsonAsync("/api/student/workspace/submission/attach-report", attachReq);
        Assert.Equal(HttpStatusCode.OK, attachRes.StatusCode);
        var attachedDto = await attachRes.Content.ReadFromJsonAsync<ProjectReportSubmissionDto>();
        Assert.NotNull(attachedDto);
        Assert.True(attachedDto.Readiness?.IsEligibleForSubmission);

        // 3. Lead Submits Final Report
        var submitRes = await _client.PostAsJsonAsync("/api/student/workspace/submission/submit", new SubmitFinalReportRequest());
        Assert.Equal(HttpStatusCode.OK, submitRes.StatusCode);
        var submittedDto = await submitRes.Content.ReadFromJsonAsync<ProjectReportSubmissionDto>();
        Assert.NotNull(submittedDto);
        Assert.Equal(FinalSubmissionStatus.Submitted, submittedDto.Status);
        Assert.Equal(1, submittedDto.VersionNumber);

        // 4. Guide reviews submission and requests revision
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", guideToken);

        var getGuideRes = await _client.GetAsync($"/api/faculty/supervision/teams/{team.Id}/submission");
        Assert.Equal(HttpStatusCode.OK, getGuideRes.StatusCode);

        var revRequest = new ReviewFinalSubmissionRequest
        {
            IsApproved = false,
            Feedback = "Please elaborate on memory bus saturation metrics and include comparative power consumption curves in Section 4."
        };

        var revRes = await _client.PostAsJsonAsync($"/api/faculty/supervision/submissions/{submittedDto.Id}/review", revRequest);
        Assert.Equal(HttpStatusCode.OK, revRes.StatusCode);
        var revDto = await revRes.Content.ReadFromJsonAsync<ProjectReportSubmissionDto>();
        Assert.NotNull(revDto);
        Assert.Equal(FinalSubmissionStatus.RevisionRequested, revDto.Status);
        Assert.Single(revDto.ReviewHistories);
        Assert.Equal(FinalSubmissionStatus.RevisionRequested, revDto.ReviewHistories[0].ResultStatus);

        // 5. Student lead updates draft and resubmits (v2)
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);

        var updateReq = draftReq with
        {
            ResultsAndConclusion = "Achieved 3.8x throughput speedup with power consumption reduced by 42% compared to baseline float32 execution."
        };
        var updateRes = await _client.PutAsJsonAsync("/api/student/workspace/submission/draft", updateReq);
        Assert.Equal(HttpStatusCode.OK, updateRes.StatusCode);

        var resubmitRes = await _client.PostAsJsonAsync("/api/student/workspace/submission/submit", new SubmitFinalReportRequest());
        Assert.Equal(HttpStatusCode.OK, resubmitRes.StatusCode);
        var resubmittedDto = await resubmitRes.Content.ReadFromJsonAsync<ProjectReportSubmissionDto>();
        Assert.NotNull(resubmittedDto);
        Assert.Equal(FinalSubmissionStatus.Resubmitted, resubmittedDto.Status);
        Assert.Equal(2, resubmittedDto.VersionNumber);

        // 6. Guide accepts resubmission
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", guideToken);

        var acceptRequest = new ReviewFinalSubmissionRequest
        {
            IsApproved = true,
            Feedback = "Revisions are thoroughly incorporated. Excellent empirical results. Approved for final viva defense."
        };

        var acceptRes = await _client.PostAsJsonAsync($"/api/faculty/supervision/submissions/{submittedDto.Id}/review", acceptRequest);
        Assert.Equal(HttpStatusCode.OK, acceptRes.StatusCode);
        var acceptedDto = await acceptRes.Content.ReadFromJsonAsync<ProjectReportSubmissionDto>();
        Assert.NotNull(acceptedDto);
        Assert.Equal(FinalSubmissionStatus.Accepted, acceptedDto.Status);
        Assert.Equal(2, acceptedDto.ReviewHistories.Count);

        // Verify Team status transitioned to ReadyForViva
        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var dbTeam = await db.ProjectTeams.FirstAsync(t => t.Id == team.Id);
        Assert.Equal(ProjectStatus.ReadyForViva, dbTeam.Status);
    }

    [Fact]
    public async Task PreferredOnlyGuideCannotReview_ReturnsForbidden()
    {
        var (team, lead, _, _) = await SeedTeamWithGuideAndMilestoneAsync(approveMilestone: true);

        // Create an unassigned faculty
        var (unassignedFacultyId, unassignedToken) = await CreateFacultyAsync("Unassigned Faculty Phase 8");

        // Submit report as student
        var studentToken = GenerateToken(lead.Id, team.CollegeId, team.DepartmentId, UserRole.Student);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);

        await _client.PutAsJsonAsync("/api/student/workspace/submission/draft", new SaveSubmissionDraftRequest
        {
            ProjectTitle = "Title",
            Abstract = "This is a sufficiently long abstract for validation purposes.",
            ProblemStatement = "Problem",
            Methodology = "Methodology",
            ImplementationSummary = "Implementation",
            ResultsAndConclusion = "Results"
        });
        await _client.PostAsJsonAsync("/api/student/workspace/submission/attach-report", new AttachReportDeliverableRequest
        {
            ReportFileName = "Report.pdf",
            ReportFileSizeBytes = 1024
        });
        var submitRes = await _client.PostAsJsonAsync("/api/student/workspace/submission/submit", new SubmitFinalReportRequest());
        var subDto = await submitRes.Content.ReadFromJsonAsync<ProjectReportSubmissionDto>();
        Assert.NotNull(subDto);

        // Unassigned faculty attempts to review
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", unassignedToken);

        var reviewRes = await _client.PostAsJsonAsync($"/api/faculty/supervision/submissions/{subDto.Id}/review", new ReviewFinalSubmissionRequest
        {
            IsApproved = true,
            Feedback = "Attempted unauthorized review."
        });
        Assert.Equal(HttpStatusCode.Forbidden, reviewRes.StatusCode);
    }

    [Fact]
    public async Task CrossDepartmentHodCannotReview_ReturnsForbidden()
    {
        var (team, lead, _, _) = await SeedTeamWithGuideAndMilestoneAsync(approveMilestone: true);

        // Create Mechanical Engineering Department HOD
        var mechDeptId = Guid.NewGuid();
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var mechDept = new Department
            {
                Id = mechDeptId,
                CollegeId = team.CollegeId,
                Code = "ME",
                Name = "Mechanical Engineering"
            };
            await db.Departments.AddAsync(mechDept);
            await db.SaveChangesAsync();
        }

        var (mechHodId, mechHodToken) = await CreateFacultyAsync("ME HOD", departmentId: mechDeptId, role: UserRole.HOD);

        // Submit report
        var studentToken = GenerateToken(lead.Id, team.CollegeId, team.DepartmentId, UserRole.Student);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);

        await _client.PutAsJsonAsync("/api/student/workspace/submission/draft", new SaveSubmissionDraftRequest
        {
            ProjectTitle = "Title",
            Abstract = "This is a sufficiently long abstract for validation purposes.",
            ProblemStatement = "Problem",
            Methodology = "Methodology",
            ImplementationSummary = "Implementation",
            ResultsAndConclusion = "Results"
        });
        await _client.PostAsJsonAsync("/api/student/workspace/submission/attach-report", new AttachReportDeliverableRequest
        {
            ReportFileName = "Report.pdf",
            ReportFileSizeBytes = 1024
        });
        var submitRes = await _client.PostAsJsonAsync("/api/student/workspace/submission/submit", new SubmitFinalReportRequest());
        var subDto = await submitRes.Content.ReadFromJsonAsync<ProjectReportSubmissionDto>();
        Assert.NotNull(subDto);

        // ME HOD attempts to review CSE submission
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", mechHodToken);

        var reviewRes = await _client.PostAsJsonAsync($"/api/faculty/supervision/submissions/{subDto.Id}/review", new ReviewFinalSubmissionRequest
        {
            IsApproved = true,
            Feedback = "Cross-department review attempt."
        });
        Assert.Equal(HttpStatusCode.Forbidden, reviewRes.StatusCode);
    }

    [Fact]
    public async Task SuperAdminCannotReviewOrDownloadFinalSubmission_ReturnsForbidden()
    {
        var (team, lead, _, _) = await SeedTeamWithGuideAndMilestoneAsync(approveMilestone: true);

        var studentToken = GenerateToken(lead.Id, team.CollegeId, team.DepartmentId, UserRole.Student);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);

        await _client.PutAsJsonAsync("/api/student/workspace/submission/draft", new SaveSubmissionDraftRequest
        {
            ProjectTitle = "Title",
            Abstract = "This is a sufficiently long abstract for validation purposes.",
            ProblemStatement = "Problem",
            Methodology = "Methodology",
            ImplementationSummary = "Implementation",
            ResultsAndConclusion = "Results"
        });
        await _client.PostAsJsonAsync("/api/student/workspace/submission/attach-report", new AttachReportDeliverableRequest
        {
            ReportFileName = "Report.pdf",
            ReportFileSizeBytes = 1024
        });
        var submitRes = await _client.PostAsJsonAsync("/api/student/workspace/submission/submit", new SubmitFinalReportRequest());
        var subDto = await submitRes.Content.ReadFromJsonAsync<ProjectReportSubmissionDto>();
        Assert.NotNull(subDto);

        // SuperAdmin token
        var superAdminId = Guid.NewGuid();
        var superAdminToken = GenerateToken(superAdminId, team.CollegeId, null, UserRole.SuperAdmin);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", superAdminToken);

        var viewRes = await _client.GetAsync($"/api/faculty/supervision/teams/{team.Id}/submission");
        Assert.Equal(HttpStatusCode.Forbidden, viewRes.StatusCode);

        var reviewRes = await _client.PostAsJsonAsync($"/api/faculty/supervision/submissions/{subDto.Id}/review", new ReviewFinalSubmissionRequest
        {
            IsApproved = true,
            Feedback = "SuperAdmin review attempt"
        });
        Assert.Equal(HttpStatusCode.Forbidden, reviewRes.StatusCode);

        var downloadRes = await _client.GetAsync($"/api/faculty/supervision/submissions/{subDto.Id}/download");
        Assert.Equal(HttpStatusCode.Forbidden, downloadRes.StatusCode);
    }
}
