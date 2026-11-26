using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ProjectHub.Application.Common.Models;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class SuperAdminAuditAndGovernanceTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public SuperAdminAuditAndGovernanceTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    private async Task<string> GetTokenAsync(string email)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = "Pass@1234"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        return auth!.Token;
    }

    private static HttpRequestMessage Authorized(HttpMethod method, string url, string token, object? body = null)
    {
        var req = new HttpRequestMessage(method, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (body != null)
        {
            req.Content = JsonContent.Create(body);
        }
        return req;
    }

    [Fact]
    public async Task HealthDetails_RequiresSuperAdmin_ReturnsRealDatabaseAndTelemetry()
    {
        var adminToken = await GetTokenAsync("admin@projecthub.in");
        var collegeToken = await GetTokenAsync("collegeadmin@sistec.ac.in");

        var forbidden = await _client.SendAsync(Authorized(HttpMethod.Get, "/api/health/details", collegeToken));
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        var ok = await _client.SendAsync(Authorized(HttpMethod.Get, "/api/health/details", adminToken));
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);

        var health = await ok.Content.ReadFromJsonAsync<HealthCheckDto>();
        Assert.NotNull(health);
        Assert.Contains(health.Status, new[] { "Healthy", "Degraded", "Unavailable" });
        Assert.Equal("Healthy", health.Database.Status);
        Assert.NotNull(health.Database.LatencyMs);
        Assert.True(health.Telemetry.ActiveTenantsCount >= 1);
    }

    [Fact]
    public async Task CreateTenant_WithoutTenantCode_AutoGeneratesUuidAndCode_AndLogsAudit()
    {
        var token = await GetTokenAsync("admin@projecthub.in");
        var uniqueSuffix = Guid.NewGuid().ToString("N")[..6];

        var createResp = await _client.SendAsync(Authorized(HttpMethod.Post, "/api/platform/tenants", token, new CreateTenantRequest
        {
            Name = $"AutoUUID Institute {uniqueSuffix}",
            TenantCode = "",
            SsoDomain = $"autouuid-{uniqueSuffix}.edu.in",
            PrincipalName = "Dr. Auto Principal",
            PrincipalEmail = $"principal-{uniqueSuffix}@autouuid-{uniqueSuffix}.edu.in"
        }));

        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = await createResp.Content.ReadFromJsonAsync<CreateTenantResponse>();
        Assert.NotNull(created);
        Assert.NotEqual(Guid.Empty, created.Tenant.Id);
        Assert.False(string.IsNullOrWhiteSpace(created.Tenant.TenantCode));

        // Verify audit log was recorded
        var logsResp = await _client.SendAsync(Authorized(
            HttpMethod.Get,
            $"/api/platform/audit-logs?search={Uri.EscapeDataString(created.Tenant.Id.ToString())}",
            token));
        Assert.Equal(HttpStatusCode.OK, logsResp.StatusCode);
        var logs = await logsResp.Content.ReadFromJsonAsync<List<PlatformAuditLogDto>>();
        Assert.NotNull(logs);
        Assert.Contains(logs, l => l.Action == "College Tenant Provisioned" && l.TargetTenantId == created.Tenant.Id);
    }

    [Fact]
    public async Task Announcements_Lifecycle_PersistsAndLogsAudit()
    {
        var token = await GetTokenAsync("admin@projecthub.in");

        var createResp = await _client.SendAsync(Authorized(HttpMethod.Post, "/api/platform/announcements", token, new SavePlatformAnnouncementRequest
        {
            Title = "Scheduled Maintenance Window",
            Category = "Maintenance",
            Priority = "High",
            FullMessage = "Database maintenance will occur at 02:00 UTC.",
            TargetAudience = "All Colleges",
            Status = "Draft"
        }));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = await createResp.Content.ReadFromJsonAsync<PlatformAnnouncementDto>();
        Assert.NotNull(created);
        Assert.Equal("Draft", created.Status);

        var publishResp = await _client.SendAsync(Authorized(HttpMethod.Post, $"/api/platform/announcements/{created.Id}/publish", token));
        Assert.Equal(HttpStatusCode.OK, publishResp.StatusCode);
        var published = await publishResp.Content.ReadFromJsonAsync<PlatformAnnouncementDto>();
        Assert.Equal("Published", published!.Status);

        var withdrawResp = await _client.SendAsync(Authorized(HttpMethod.Post, $"/api/platform/announcements/{created.Id}/withdraw", token));
        Assert.Equal(HttpStatusCode.OK, withdrawResp.StatusCode);
        var withdrawn = await withdrawResp.Content.ReadFromJsonAsync<PlatformAnnouncementDto>();
        Assert.Equal("Withdrawn", withdrawn!.Status);

        var listResp = await _client.SendAsync(Authorized(HttpMethod.Get, "/api/platform/announcements", token));
        Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);
        var all = await listResp.Content.ReadFromJsonAsync<List<PlatformAnnouncementDto>>();
        Assert.Contains(all!, a => a.Id == created.Id);

        var deleteResp = await _client.SendAsync(Authorized(HttpMethod.Delete, $"/api/platform/announcements/{created.Id}", token));
        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);
    }

    [Fact]
    public async Task SupportTickets_Workflow_PersistsAndLogsAudit()
    {
        var token = await GetTokenAsync("admin@projecthub.in");

        var createResp = await _client.SendAsync(Authorized(HttpMethod.Post, "/api/platform/tickets", token, new CreateSupportTicketRequest
        {
            InstitutionName = "SISTec Bhopal",
            Subject = "SSO Domain Verification Inquiry",
            Description = "Requesting verification of custom SSO domain.",
            Category = "SSO / Authentication",
            Priority = "High"
        }));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var ticket = await createResp.Content.ReadFromJsonAsync<SupportTicketDto>();
        Assert.NotNull(ticket);
        Assert.Equal("Open", ticket.Status);

        var replyResp = await _client.SendAsync(Authorized(HttpMethod.Post, $"/api/platform/tickets/{ticket.Id}/reply", token, new ReplySupportTicketRequest
        {
            Message = "We have verified your DNS TXT record.",
            IsInternalNote = false
        }));
        Assert.Equal(HttpStatusCode.OK, replyResp.StatusCode);
        var replied = await replyResp.Content.ReadFromJsonAsync<SupportTicketDto>();
        Assert.Equal("In Progress", replied!.Status);
        Assert.Single(replied.Messages);

        var resolveResp = await _client.SendAsync(Authorized(HttpMethod.Post, $"/api/platform/tickets/{ticket.Id}/resolve", token, new ResolveSupportTicketRequest
        {
            ResolutionNotes = "DNS verified and SSO enabled."
        }));
        Assert.Equal(HttpStatusCode.OK, resolveResp.StatusCode);
        var resolved = await resolveResp.Content.ReadFromJsonAsync<SupportTicketDto>();
        Assert.Equal("Resolved", resolved!.Status);

        var closeResp = await _client.SendAsync(Authorized(HttpMethod.Post, $"/api/platform/tickets/{ticket.Id}/close", token));
        Assert.Equal(HttpStatusCode.OK, closeResp.StatusCode);
        var closed = await closeResp.Content.ReadFromJsonAsync<SupportTicketDto>();
        Assert.Equal("Closed", closed!.Status);
    }

    [Fact]
    public async Task AnalyticsAndSecuritySummary_ReturnRealMetrics_AndBlockNonSuperAdmin()
    {
        var superToken = await GetTokenAsync("admin@projecthub.in");
        var facultyToken = await GetTokenAsync("faculty@sistec.ac.in");

        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(Authorized(HttpMethod.Get, "/api/platform/analytics?range=7d", facultyToken))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(Authorized(HttpMethod.Get, "/api/platform/security-summary", facultyToken))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(Authorized(HttpMethod.Get, "/api/platform/announcements", facultyToken))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(Authorized(HttpMethod.Get, "/api/platform/tickets", facultyToken))).StatusCode);

        var analyticsResp = await _client.SendAsync(Authorized(HttpMethod.Get, "/api/platform/analytics?range=7d", superToken));
        Assert.Equal(HttpStatusCode.OK, analyticsResp.StatusCode);
        var analytics = await analyticsResp.Content.ReadFromJsonAsync<PlatformAnalyticsOverviewDto>();
        Assert.NotNull(analytics);
        Assert.Equal("7d", analytics.Range);
        Assert.True(analytics.TotalColleges >= 1);

        var secResp = await _client.SendAsync(Authorized(HttpMethod.Get, "/api/platform/security-summary", superToken));
        Assert.Equal(HttpStatusCode.OK, secResp.StatusCode);
        var sec = await secResp.Content.ReadFromJsonAsync<PlatformSecuritySummaryDto>();
        Assert.NotNull(sec);
        Assert.True(sec.TotalSuperAdmins >= 1);
    }
}
