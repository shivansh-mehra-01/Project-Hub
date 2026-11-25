using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using ProjectHub.Application.Common.Models;
using ProjectHub.Infrastructure.Persistence;
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
    public async Task GetHealth_ReturnsMinimalPublicLiveness_WithoutInfrastructureDetails()
    {
        var response = await _client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Healthy", json.GetProperty("status").GetString());
        Assert.False(json.TryGetProperty("environment", out _));
        Assert.False(json.TryGetProperty("database", out _));
        Assert.False(json.TryGetProperty("tenant", out _));
    }

    [Fact]
    public async Task GetHealthDetails_Unauthenticated_ReturnsUnauthorized()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/health/details");
        request.Headers.Add("X-College-Id", Guid.NewGuid().ToString());

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetHealthDetails_WhenSuperAdminAuthenticated_IgnoresSpoofedHeader()
    {
        var loginResp = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "admin@projecthub.in",
            Password = "Pass@1234"
        });
        loginResp.EnsureSuccessStatusCode();
        var auth = await loginResp.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);

        var spoofedHeaderCollegeId = Guid.NewGuid();
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/health/details");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        request.Headers.Add("X-College-Id", spoofedHeaderCollegeId.ToString());

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<HealthCheckDto>();
        Assert.NotNull(body);
        Assert.Equal(DbInitializer.SistecTenantId, body.Tenant.CollegeId);
        Assert.NotEqual(spoofedHeaderCollegeId, body.Tenant.CollegeId);
    }
}
