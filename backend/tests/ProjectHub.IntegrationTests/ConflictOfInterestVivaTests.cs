using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using ProjectHub.Api.Authorization;
using ProjectHub.Application.Common.Models;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class ConflictOfInterestVivaTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public ConflictOfInterestVivaTests(CustomWebApplicationFactory factory)
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
            new(ClaimTypes.Email, "faculty@sistec.ac.in"),
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

    [Fact]
    public void DomainGuard_ConflictOfInterest_EnforcesGuideExclusion()
    {
        var guideUserId = Guid.NewGuid();
        var evaluatorUserId = Guid.NewGuid();

        // 1. Independent Evaluator should pass without error
        ConflictOfInterestGuard.EnsureNoVivaGradingConflict(evaluatorUserId, guideUserId);
        VivaPanelEvaluator.ValidateEvaluatorNotTeamGuide(evaluatorUserId, guideUserId);

        // 2. Guide attempting to grade own team must throw InvalidOperationException
        var ex1 = Assert.Throws<InvalidOperationException>(() =>
            ConflictOfInterestGuard.EnsureNoVivaGradingConflict(guideUserId, guideUserId));
        Assert.Contains("Conflict-of-Interest", ex1.Message);

        var ex2 = Assert.Throws<InvalidOperationException>(() =>
            VivaPanelEvaluator.ValidateEvaluatorNotTeamGuide(guideUserId, guideUserId));
        Assert.Contains("strictly prohibited", ex2.Message);
    }

    [Fact]
    public async Task SubmitVivaEvaluation_GuideGradingOwnMentoredTeam_IsBlockedWithBadRequest()
    {
        // Arrange: Mint token for Prof. Verma (assigned guide of Team01 in DbInitializer)
        var guideToken = GenerateToken(
            userId: DbInitializer.FacultyVermaUserId,
            collegeId: DbInitializer.SistecTenantId,
            departmentId: DbInitializer.CseDepartmentId,
            role: UserRole.Faculty
        );

        var payload = new SubmitVivaEvaluationRequest
        {
            ProjectTeamId = DbInitializer.Team01Id,
            CheckpointType = CheckpointType.MidTermReview,
            SharedRubricScoresJson = "{\"scope\": 25, \"design\": 25, \"progress\": 30}",
            SharedTotalScore = 80,
            GeneralRemarks = "Attempting to evaluate own team.",
            StudentScores = new List<StudentScoreInput>
            {
                new()
                {
                    StudentUserId = DbInitializer.StudentShivanshUserId,
                    ModuleOwnershipScore = 30,
                    VivaQaScore = 30,
                    LogDisciplineScore = 20
                }
            }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/faculty/evaluations")
        {
            Content = JsonContent.Create(payload)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", guideToken);

        // Act
        var response = await _client.SendAsync(request);

        // Assert: Conflict of Interest must reject the evaluation request
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("Conflict-of-Interest Violation", content);
    }

    [Fact]
    public async Task SubmitVivaEvaluation_IndependentEvaluator_Computes60_40RubricMarksSuccessfully()
    {
        // Arrange: Mint token for Dr. Nair (independent evaluator, not the guide of Team01)
        var independentEvaluatorToken = GenerateToken(
            userId: DbInitializer.FacultyNairUserId,
            collegeId: DbInitializer.SistecTenantId,
            departmentId: DbInitializer.CseDepartmentId,
            role: UserRole.Faculty
        );

        var payload = new SubmitVivaEvaluationRequest
        {
            ProjectTeamId = DbInitializer.Team01Id,
            CheckpointType = CheckpointType.MidTermReview,
            SharedRubricScoresJson = "{\"demo\": 30, \"presentation\": 25, \"qa\": 25}",
            SharedTotalScore = 80.0m, // 60% of 80 = 48
            GeneralRemarks = "Outstanding hardware demonstration and responsive MQTT telemetry.",
            StudentScores = new List<StudentScoreInput>
            {
                new()
                {
                    StudentUserId = DbInitializer.StudentShivanshUserId,
                    ModuleOwnershipScore = 35.0m,
                    VivaQaScore = 35.0m,
                    LogDisciplineScore = 20.0m // Individual sum = 90. 40% of 90 = 36. Total = 84.
                }
            }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/faculty/evaluations")
        {
            Content = JsonContent.Create(payload)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", independentEvaluatorToken);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verify in DB that the evaluation and computed student marks are recorded accurately
        using var scope = _factory.Services.CreateScope();
        var seedTenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        seedTenantContext.IsSuperAdmin = true;

        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var eval = await db.VivaEvaluations
            .Include(e => e.IndividualScores)
            .FirstOrDefaultAsync(e => e.ProjectTeamId == DbInitializer.Team01Id &&
                                      e.EvaluatorUserId == DbInitializer.FacultyNairUserId);

        Assert.NotNull(eval);
        Assert.True(eval.IsLocked);
        Assert.Equal(80.0m, eval.SharedTotalScore);

        var shivanshScore = eval.IndividualScores.FirstOrDefault(s => s.StudentUserId == DbInitializer.StudentShivanshUserId);
        Assert.NotNull(shivanshScore);
        Assert.Equal(90.0m, shivanshScore.IndividualTotalScore);
        // (80 * 0.6) + (90 * 0.4) = 48 + 36 = 84
        Assert.Equal(84.0m, shivanshScore.FinalComputedStudentMark);
    }
}
