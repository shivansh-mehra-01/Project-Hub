using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ProjectHub.Application.Common.Models;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class HealthEndpointTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public HealthEndpointTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetHealth_ReturnsOk_WithHealthyStatus()
    {
        // Act
        var response = await _client.GetAsync("/api/health");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<HealthCheckDto>();
        Assert.NotNull(body);
        Assert.Equal("Healthy", body.Status);
        Assert.Equal("1.0.0", body.Version);
    }

    [Fact]
    public async Task GetHealth_WithUnauthenticatedHeader_ResolvesTenantContext()
    {
        // Arrange
        var testCollegeId = Guid.NewGuid();
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        request.Headers.Add("X-College-Id", testCollegeId.ToString());

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<HealthCheckDto>();
        Assert.NotNull(body);
        Assert.True(body.Tenant.Resolved);
        Assert.Equal(testCollegeId, body.Tenant.CollegeId);
        Assert.Equal("TenantScoped", body.Tenant.Mode);
    }

    [Fact]
    public async Task GetHealth_WhenAuthenticated_EnforcesJwtClaim_IgnoringHeaderSpoofing()
    {
        // Arrange
        var tokenCollegeId = Guid.NewGuid();
        var spoofedHeaderCollegeId = Guid.NewGuid();

        var token = GenerateTestJwt(tokenCollegeId, "Faculty");

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Add("X-College-Id", spoofedHeaderCollegeId.ToString());

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<HealthCheckDto>();
        Assert.NotNull(body);
        Assert.True(body.Tenant.Resolved);
        // Must match token claim, strictly rejecting the spoofed header
        Assert.Equal(tokenCollegeId, body.Tenant.CollegeId);
        Assert.NotEqual(spoofedHeaderCollegeId, body.Tenant.CollegeId);
    }

    private static string GenerateTestJwt(Guid collegeId, string role)
    {
        var secret = "ProjectHubSuperSecretDevKeyMinLength32CharactersRequired!";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Email, "teacher@college.edu"),
            new Claim(ClaimTypes.Role, role),
            new Claim("college_id", collegeId.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: "https://api.projecthub.local",
            audience: "https://app.projecthub.local",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
