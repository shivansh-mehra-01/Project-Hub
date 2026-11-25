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

public class StudentPhase9Tests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public StudentPhase9Tests(CustomWebApplicationFactory factory)
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

    private async Task<(ProjectTeam Team, UserAccount Lead, UserAccount Member, UserAccount Guide)> SeedTeamReadyForVivaAsync()
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
            FullName = "Lead Student Phase 9",
            Email = $"lead.p9.{leadId:N}@sistec.ac.in",
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
            FullName = "Member Student Phase 9",
            Email = $"member.p9.{memberId:N}@sistec.ac.in",
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
            FullName = "Prof. Phase 9 Guide",
            Email = $"guide.p9.{guideId:N}@sistec.ac.in",
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
            TeamCode = $"2026-CS-P9-{Random.Shared.Next(10, 99)}",
            Title = "Real-Time Embedded Perception for Automated Micro-Mobility",
            Abstract = "Comprehensive investigation and implementation of low-latency computer vision on edge devices.",
            DomainTag = "Computer Vision & Robotics",
            SdgCode = "SDG 11",
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
            ModuleResponsibility = "Architecture Lead",
            JoinedAtUtc = DateTime.UtcNow
        };

        var teammate = new TeamMember
        {
            CollegeId = collegeId,
            ProjectTeamId = team.Id,
            UserId = memberId,
            IsTeamLead = false,
            ModuleResponsibility = "Embedded Algorithms Engineer",
            JoinedAtUtc = DateTime.UtcNow
        };

        await db.TeamMembers.AddRangeAsync(teamLeadMember, teammate);
        await db.SaveChangesAsync();

        return (team, lead, member, guide);
    }

    [Fact]
    public async Task Student_Cannot_SubmitMarks_Or_PublishEvaluation_Returns403Forbidden()
    {
        var (team, lead, _, _) = await SeedTeamReadyForVivaAsync();
        var studentToken = GenerateToken(lead.Id, team.CollegeId, team.DepartmentId, UserRole.Student);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);

        // Student tries to submit marks via EvaluationController
        var submitAssessmentPayload = new SubmitEvaluatorAssessmentRequest
        {
            ProjectTeamId = team.Id,
            CheckpointType = CheckpointType.FinalViva,
            GeneralRemarks = "Student self-grading attempt",
            CriterionScores = new List<EvaluatorAssessmentCriterionScoreDto>
            {
                new() { CriterionCode = "TECH", Title = "Tech", AwardedMarks = 50, MaxMarks = 50 }
            },
            StudentScores = new List<StudentIndividualScoreInputDto>
            {
                new() { StudentUserId = lead.Id, ModuleOwnershipScore = 10, VivaQaScore = 10, LogDisciplineScore = 10 }
            }
        };

        var submitResp = await _client.PostAsJsonAsync("/api/evaluation/assessments/submit", submitAssessmentPayload);
        Assert.Equal(HttpStatusCode.Forbidden, submitResp.StatusCode);

        // Student tries to publish evaluation via EvaluationController
        var publishResp = await _client.PostAsJsonAsync($"/api/evaluation/teams/{team.Id}/publish", new PublishEvaluationRequest
        {
            Outcome = VivaOutcome.Pass,
            Remarks = "Unauthorized student attempt to publish"
        });
        Assert.Equal(HttpStatusCode.Forbidden, publishResp.StatusCode);

        // Student workspace endpoints reject submission / publishing
        var wsSubmitResp = await _client.PostAsJsonAsync("/api/student/workspace/evaluation/submit", new { });
        Assert.Equal(HttpStatusCode.Forbidden, wsSubmitResp.StatusCode);

        var wsPublishResp = await _client.PostAsJsonAsync("/api/student/workspace/evaluation/publish", new { });
        Assert.Equal(HttpStatusCode.Forbidden, wsPublishResp.StatusCode);
    }

    [Fact]
    public async Task SuperAdmin_Cannot_AccessPrivateEvaluations_Or_Publish_Returns403Forbidden()
    {
        var (team, _, _, _) = await SeedTeamReadyForVivaAsync();
        var superAdminId = Guid.NewGuid();
        var superAdminToken = GenerateToken(superAdminId, team.CollegeId, null, UserRole.SuperAdmin);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", superAdminToken);

        var submitPayload = new SubmitEvaluatorAssessmentRequest
        {
            ProjectTeamId = team.Id,
            GeneralRemarks = "SuperAdmin intrusion",
            CriterionScores = new List<EvaluatorAssessmentCriterionScoreDto>
            {
                new() { CriterionCode = "TEST", Title = "Test", AwardedMarks = 10, MaxMarks = 10 }
            }
        };

        var submitResp = await _client.PostAsJsonAsync("/api/evaluation/assessments/submit", submitPayload);
        Assert.Equal(HttpStatusCode.Forbidden, submitResp.StatusCode);

        var publishResp = await _client.PostAsJsonAsync($"/api/evaluation/teams/{team.Id}/publish", new PublishEvaluationRequest
        {
            Outcome = VivaOutcome.Pass,
            Remarks = "SuperAdmin publication bypass"
        });
        Assert.Equal(HttpStatusCode.Forbidden, publishResp.StatusCode);
    }

    [Fact]
    public async Task Guide_ConflictOfInterest_PreventedFrom_PanelEvaluationOfOwnTeam()
    {
        var (team, lead, _, guide) = await SeedTeamReadyForVivaAsync();
        var guideToken = GenerateToken(guide.Id, team.CollegeId, team.DepartmentId, UserRole.Faculty);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", guideToken);

        var payload = new SubmitEvaluatorAssessmentRequest
        {
            ProjectTeamId = team.Id,
            CheckpointType = CheckpointType.FinalViva,
            GeneralRemarks = "Guide grading own mentored project team",
            CriterionScores = new List<EvaluatorAssessmentCriterionScoreDto>
            {
                new() { CriterionCode = "ARCH", Title = "Architecture", AwardedMarks = 40, MaxMarks = 50 }
            },
            StudentScores = new List<StudentIndividualScoreInputDto>
            {
                new() { StudentUserId = lead.Id, ModuleOwnershipScore = 8, VivaQaScore = 8, LogDisciplineScore = 8 }
            }
        };

        var response = await _client.PostAsJsonAsync("/api/evaluation/assessments/submit", payload);
        // Guide cannot be the evaluator for their own mentored team
        Assert.True(response.StatusCode == HttpStatusCode.BadRequest || response.StatusCode == HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CrossDepartment_HOD_CannotSchedule_Or_PublishEvaluation()
    {
        var (team, _, _, _) = await SeedTeamReadyForVivaAsync();
        var otherDeptId = Guid.NewGuid();
        var (otherHodId, otherHodToken) = await CreateFacultyAsync("Other Dept HOD", team.CollegeId, otherDeptId, UserRole.HOD);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", otherHodToken);

        var schedulePayload = new ScheduleVivaRequest
        {
            ProjectTeamId = team.Id,
            ScheduledDateUtc = DateTime.UtcNow.AddDays(3),
            DurationMinutes = 45,
            VenueOrLink = "Room 302"
        };

        var schedResp = await _client.PostAsJsonAsync("/api/evaluation/schedule", schedulePayload);
        Assert.Equal(HttpStatusCode.Forbidden, schedResp.StatusCode);

        var pubResp = await _client.PostAsJsonAsync($"/api/evaluation/teams/{team.Id}/publish", new PublishEvaluationRequest
        {
            Outcome = VivaOutcome.Pass,
            Remarks = "Cross-department publication attempt"
        });
        Assert.Equal(HttpStatusCode.Forbidden, pubResp.StatusCode);
    }

    [Fact]
    public async Task Complete_Evaluation_And_VivaDefense_Lifecycle_Verified()
    {
        var (team, lead, member, guide) = await SeedTeamReadyForVivaAsync();

        // 1. Create HOD, Coordinator, and two External/Panel Evaluators in CSE
        var (hodId, hodToken) = await CreateFacultyAsync("Prof. HOD CSE", team.CollegeId, team.DepartmentId, UserRole.HOD);
        var (coordinatorId, coordinatorToken) = await CreateFacultyAsync("Prof. Coordinator CSE", team.CollegeId, team.DepartmentId, UserRole.Faculty, isCoordinator: true);
        var (evaluator1Id, evaluator1Token) = await CreateFacultyAsync("Prof. Evaluator One", team.CollegeId, team.DepartmentId, UserRole.Faculty);
        var (evaluator2Id, evaluator2Token) = await CreateFacultyAsync("Prof. Evaluator Two", team.CollegeId, team.DepartmentId, UserRole.Faculty);

        // 2. Define Rubric
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);
        var rubricPayload = new SaveRubricRequest
        {
            DepartmentId = team.DepartmentId,
            AcademicTrackId = team.AcademicTrackId,
            Title = "NBA OBE Mid/Final Viva Rubric",
            CheckpointType = CheckpointType.FinalViva,
            TotalMaxMarks = 100,
            Criteria = new List<SaveRubricCriterionRequest>
            {
                new() { CriterionCode = "CO1_PROB", Title = "Problem Formulation & Literature", Description = "NBA PO2 Bloom L2", MaxMarks = 20, WeightPercentage = 25, DisplayOrder = 1 },
                new() { CriterionCode = "CO2_ARCH", Title = "System Architecture & Design", Description = "NBA PO3 Bloom L3", MaxMarks = 30, WeightPercentage = 35, DisplayOrder = 2 },
                new() { CriterionCode = "CO3_IMPL", Title = "Engineering Implementation & Testing", Description = "NBA PO5 Bloom L5", MaxMarks = 30, WeightPercentage = 25, DisplayOrder = 3 },
                new() { CriterionCode = "CO4_VIVA", Title = "Viva Defense & Defense Q&A", Description = "NBA PO10 Bloom L4", MaxMarks = 20, WeightPercentage = 15, DisplayOrder = 4 }
            }
        };

        var rubricResp = await _client.PostAsJsonAsync("/api/evaluation/rubrics", rubricPayload);
        Assert.True(rubricResp.IsSuccessStatusCode);
        var savedRubric = await rubricResp.Content.ReadFromJsonAsync<EvaluationRubricDto>();
        Assert.NotNull(savedRubric);
        Assert.Equal(100, savedRubric.TotalMaxMarks);

        // 3. Create VivaPanel and seed evaluators
        var scheduledDate = DateTime.UtcNow.AddDays(2);
        var panel = new VivaPanel
        {
            CollegeId = team.CollegeId,
            DepartmentId = team.DepartmentId,
            AcademicTrackId = team.AcademicTrackId,
            PanelName = "CSE Senior Defense Panel A",
            RoomOrLink = "https://meet.google.com/colabex-viva-room1",
            ScheduledAtUtc = scheduledDate,
            Evaluators = new List<VivaPanelEvaluator>
            {
                new() { CollegeId = team.CollegeId, EvaluatorUserId = evaluator1Id },
                new() { CollegeId = team.CollegeId, EvaluatorUserId = evaluator2Id }
            }
        };

        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            await db.VivaPanels.AddAsync(panel);
            await db.SaveChangesAsync();
        }

        // 4. Coordinator schedules Viva Defense
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", coordinatorToken);
        var schedulePayload = new ScheduleVivaRequest
        {
            ProjectTeamId = team.Id,
            VivaPanelId = panel.Id,
            ScheduledDateUtc = scheduledDate,
            DurationMinutes = 45,
            VenueOrLink = "https://meet.google.com/colabex-viva-room1",
            CandidateInstructions = "Prepare 15 slides and 5-minute live working demonstration."
        };

        var schedResp = await _client.PostAsJsonAsync("/api/evaluation/schedule", schedulePayload);
        Assert.True(schedResp.IsSuccessStatusCode);
        var createdSchedule = await schedResp.Content.ReadFromJsonAsync<VivaScheduleDto>();
        Assert.NotNull(createdSchedule);
        Assert.Equal(VivaScheduleStatus.Scheduled, createdSchedule.Status);
        Assert.Contains("Prof. Evaluator One", createdSchedule.EvaluatorNames);

        // 5. Student checks workspace: marks must be sealed, schedule must be visible
        var leadToken = GenerateToken(lead.Id, team.CollegeId, team.DepartmentId, UserRole.Student);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);

        var studentEvalResp = await _client.GetAsync("/api/student/workspace/evaluation");
        Assert.True(studentEvalResp.IsSuccessStatusCode);
        var studentEval = await studentEvalResp.Content.ReadFromJsonAsync<StudentVivaResultDto>();
        Assert.NotNull(studentEval);
        Assert.Equal(EvaluationStage.Scheduled, studentEval.EvaluationStage);
        Assert.False(studentEval.IsPublished);
        Assert.NotNull(studentEval.Schedule);
        Assert.Equal("https://meet.google.com/colabex-viva-room1", studentEval.Schedule.VenueOrLink);
        // Scores are concealed before publication
        Assert.Empty(studentEval.CriteriaScores);
        Assert.Null(studentEval.MyIndividualScore);

        // 6. Evaluator 1 checks assigned defense sessions
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", evaluator1Token);
        var assignedResp = await _client.GetAsync("/api/evaluation/assigned");
        Assert.True(assignedResp.IsSuccessStatusCode);
        var assignedSessions = await assignedResp.Content.ReadFromJsonAsync<List<AssignedDefenseSessionDto>>();
        Assert.NotNull(assignedSessions);
        Assert.Contains(assignedSessions, s => s.TeamId == team.Id);

        // 7. Evaluator 1 submits draft assessment
        var draftPayload = new SubmitEvaluatorAssessmentRequest
        {
            ProjectTeamId = team.Id,
            CheckpointType = CheckpointType.FinalViva,
            IsDraft = true,
            GeneralRemarks = "Draft assessment: Solid presentation, reviewing prototype.",
            CriterionScores = new List<EvaluatorAssessmentCriterionScoreDto>
            {
                new() { CriterionCode = "CO1_PROB", Title = "Problem Formulation & Literature", AwardedMarks = 18, MaxMarks = 20 },
                new() { CriterionCode = "CO2_ARCH", Title = "System Architecture & Design", AwardedMarks = 27, MaxMarks = 30 },
                new() { CriterionCode = "CO3_IMPL", Title = "Engineering Implementation & Testing", AwardedMarks = 26, MaxMarks = 30 },
                new() { CriterionCode = "CO4_VIVA", Title = "Viva Defense & Defense Q&A", AwardedMarks = 17, MaxMarks = 20 }
            },
            StudentScores = new List<StudentIndividualScoreInputDto>
            {
                new() { StudentUserId = lead.Id, ModuleOwnershipScore = 9, VivaQaScore = 9, LogDisciplineScore = 9 },
                new() { StudentUserId = member.Id, ModuleOwnershipScore = 8, VivaQaScore = 8, LogDisciplineScore = 9 }
            }
        };

        var draftResp = await _client.PostAsJsonAsync("/api/evaluation/assessments/submit", draftPayload);
        Assert.True(draftResp.IsSuccessStatusCode);

        // 8. Evaluator 1 submits final locked assessment
        var finalPayload = draftPayload with
        {
            IsDraft = false,
            GeneralRemarks = "Final Evaluation: Excellent system architecture, thorough literature review, live demo verified."
        };

        var submitResp = await _client.PostAsJsonAsync("/api/evaluation/assessments/submit", finalPayload);
        Assert.True(submitResp.IsSuccessStatusCode);

        // Verify stage is now Evaluated
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var studentEval2 = await _client.GetFromJsonAsync<StudentVivaResultDto>("/api/student/workspace/evaluation");
        Assert.NotNull(studentEval2);
        Assert.Equal(EvaluationStage.Evaluated, studentEval2.EvaluationStage);
        Assert.False(studentEval2.IsPublished); // Still concealed prior to publication

        // 9. HOD moderates and publishes final evaluation (Outcome: Pass)
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);
        var publishPayload = new PublishEvaluationRequest
        {
            Outcome = VivaOutcome.Pass,
            Remarks = "Reviewed and approved by HOD Evaluation Committee. Attainment targets met."
        };

        var publishResp = await _client.PostAsJsonAsync($"/api/evaluation/teams/{team.Id}/publish", publishPayload);
        Assert.True(publishResp.IsSuccessStatusCode);

        // 10. Verify Student now receives full released scorecard and team is marked Completed
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var studentEvalFinal = await _client.GetFromJsonAsync<StudentVivaResultDto>("/api/student/workspace/evaluation");
        Assert.NotNull(studentEvalFinal);
        Assert.Equal(EvaluationStage.Published, studentEvalFinal.EvaluationStage);
        Assert.True(studentEvalFinal.IsPublished);
        Assert.Equal(VivaOutcome.Pass, studentEvalFinal.Outcome);
        Assert.Equal(ProjectStatus.Completed, studentEvalFinal.Status);
        Assert.NotNull(studentEvalFinal.SharedTotalScore);
        Assert.Equal(88m, studentEvalFinal.SharedTotalScore.Value); // 18 + 27 + 26 + 17 = 88
        Assert.Equal(100m, studentEvalFinal.SharedMaxScore);
        Assert.Equal(4, studentEvalFinal.CriteriaScores.Count);

        // Check individual student breakdown
        Assert.NotNull(studentEvalFinal.MyIndividualScore);
        Assert.Equal(lead.Id, studentEvalFinal.MyIndividualScore.StudentUserId);
        Assert.Equal(27m, studentEvalFinal.MyIndividualScore.IndividualTotalScore); // 9 + 9 + 9 = 27
        // Blended mark check: 60% shared (88 * 0.6 = 52.8) + 40% individual (27 * 0.4 = 10.8) => 63.6
        Assert.Equal(63.6m, studentEvalFinal.MyIndividualScore.FinalComputedStudentMark);

        Assert.Equal(2, studentEvalFinal.TeamMembersScores.Count);
        Assert.Contains("Reviewed and approved by HOD Evaluation Committee", studentEvalFinal.ModerationRemarks);

        // 11. Audit exception / Grade correction workflow (performed by HOD)
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);
        var correctPayload = new CorrectEvaluationRequest
        {
            Reason = "Typographical moderation adjustment in criteria score verified with external examiner.",
            NewSharedTotalScore = 90m,
            NewOutcome = VivaOutcome.Pass
        };

        var correctResp = await _client.PostAsJsonAsync($"/api/evaluation/teams/{team.Id}/correct", correctPayload);
        Assert.True(correctResp.IsSuccessStatusCode);

        // Check corrected score reflected for student
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var studentEvalCorrected = await _client.GetFromJsonAsync<StudentVivaResultDto>("/api/student/workspace/evaluation");
        Assert.NotNull(studentEvalCorrected);
        Assert.Equal(90m, studentEvalCorrected.SharedTotalScore);
    }
}
