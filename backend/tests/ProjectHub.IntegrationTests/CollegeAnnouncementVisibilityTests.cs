using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using ProjectHub.Application.Common.Models;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class CollegeAnnouncementVisibilityTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public CollegeAnnouncementVisibilityTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<AuthResponse> LoginAsync(string email)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = "Pass@1234"
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
    }

    private static string GenerateCollegeAdminToken(Guid userId, Guid collegeId, string email)
    {
        var secret = "ProjectHubSuperSecretDevKeyMinLength32CharactersRequired!";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new("sub", userId.ToString()),
            new("user_id", userId.ToString()),
            new(ClaimTypes.Email, email),
            new(ClaimTypes.Role, UserRole.CollegeAdmin.ToString()),
            new("role", UserRole.CollegeAdmin.ToString()),
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

    private async Task<(Guid CollegeId, string TenantCode, string Token)> CreateCollegeAndAdminTokenAsync(
        string superAdminToken,
        string prefix,
        bool isActive)
    {
        var suffix = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
        var tenantCode = $"{prefix}{suffix}";
        var principalEmail = $"admin.{tenantCode.ToLowerInvariant()}@test.edu.in";

        var createResp = await _client.SendAsync(Authorized(HttpMethod.Post, "/api/platform/tenants", superAdminToken, new CreateTenantRequest
        {
            Name = $"{prefix} Institute {suffix}",
            TenantCode = tenantCode,
            SsoDomain = $"{tenantCode.ToLowerInvariant()}.edu.in",
            PrincipalName = $"Principal {tenantCode}",
            PrincipalEmail = principalEmail
        }));
        createResp.EnsureSuccessStatusCode();
        var created = (await createResp.Content.ReadFromJsonAsync<CreateTenantResponse>())!;

        if (!isActive)
        {
            var updateResp = await _client.SendAsync(Authorized(
                HttpMethod.Put,
                $"/api/platform/tenants/{created.Tenant.Id}",
                superAdminToken,
                new UpdateTenantRequest { IsActive = false }));
            updateResp.EnsureSuccessStatusCode();
        }

        return (created.Tenant.Id, created.Tenant.TenantCode, GenerateCollegeAdminToken(Guid.NewGuid(), created.Tenant.Id, principalEmail));
    }

    [Fact]
    public async Task EndToEnd_AudienceFiltering_And_LifecycleVisibility_AreEnforced()
    {
        var superAuth = await LoginAsync("admin@projecthub.in");
        var sistecAuth = await LoginAsync("collegeadmin@sistec.ac.in");
        var sistecCollegeId = sistecAuth.User.CollegeId;

        var otherActive = await CreateCollegeAndAdminTokenAsync(superAuth.Token, "ACT", isActive: true);
        var inactiveCollege = await CreateCollegeAndAdminTokenAsync(superAuth.Token, "INA", isActive: false);

        var tag = Guid.NewGuid().ToString("N")[..6];

        // 1. All Colleges (Published)
        var allResp = await _client.SendAsync(Authorized(HttpMethod.Post, "/api/platform/announcements", superAuth.Token, new SavePlatformAnnouncementRequest
        {
            Title = $"All Colleges Notice {tag}",
            Category = "Maintenance",
            Priority = "High",
            FullMessage = "Scheduled maintenance for all colleges.",
            TargetAudience = "All Colleges",
            Status = "Published"
        }));
        Assert.Equal(HttpStatusCode.Created, allResp.StatusCode);
        var allAnn = (await allResp.Content.ReadFromJsonAsync<PlatformAnnouncementDto>())!;

        // 2. Active Colleges (Published)
        var activeResp = await _client.SendAsync(Authorized(HttpMethod.Post, "/api/platform/announcements", superAuth.Token, new SavePlatformAnnouncementRequest
        {
            Title = $"Active Colleges Notice {tag}",
            Category = "Feature Update",
            Priority = "Normal",
            FullMessage = "New feature enabled for active colleges.",
            TargetAudience = "Active Colleges",
            Status = "Published"
        }));
        Assert.Equal(HttpStatusCode.Created, activeResp.StatusCode);
        var activeAnn = (await activeResp.Content.ReadFromJsonAsync<PlatformAnnouncementDto>())!;

        // 3. Selected Colleges (SISTEC only)
        var selectedResp = await _client.SendAsync(Authorized(HttpMethod.Post, "/api/platform/announcements", superAuth.Token, new SavePlatformAnnouncementRequest
        {
            Title = $"Selected SISTEC Notice {tag}",
            Category = "Security Advisory",
            Priority = "Critical",
            FullMessage = "Targeted notice only for SISTEC.",
            TargetAudience = "Selected Colleges",
            TargetCollegeIds = new List<string> { sistecCollegeId.ToString() },
            Status = "Published"
        }));
        Assert.Equal(HttpStatusCode.Created, selectedResp.StatusCode);
        var selectedAnn = (await selectedResp.Content.ReadFromJsonAsync<PlatformAnnouncementDto>())!;

        // 4. Draft announcement (must never appear)
        var draftResp = await _client.SendAsync(Authorized(HttpMethod.Post, "/api/platform/announcements", superAuth.Token, new SavePlatformAnnouncementRequest
        {
            Title = $"Draft Notice {tag}",
            Category = "General Notice",
            Priority = "Normal",
            FullMessage = "Draft content.",
            TargetAudience = "All Colleges",
            Status = "Draft"
        }));
        Assert.Equal(HttpStatusCode.Created, draftResp.StatusCode);
        var draftAnn = (await draftResp.Content.ReadFromJsonAsync<PlatformAnnouncementDto>())!;

        // Verify SISTEC College Admin sees All + Active + Selected, but NOT Draft
        var sistecFeedResp = await _client.SendAsync(Authorized(HttpMethod.Get, "/api/college/announcements", sistecAuth.Token));
        Assert.Equal(HttpStatusCode.OK, sistecFeedResp.StatusCode);
        var sistecFeed = (await sistecFeedResp.Content.ReadFromJsonAsync<List<CollegeAnnouncementDto>>())!;
        Assert.Contains(sistecFeed, a => a.Id == allAnn.Id && a.FullMessage == "Scheduled maintenance for all colleges.");
        Assert.Contains(sistecFeed, a => a.Id == activeAnn.Id);
        Assert.Contains(sistecFeed, a => a.Id == selectedAnn.Id);
        Assert.DoesNotContain(sistecFeed, a => a.Id == draftAnn.Id);

        // Verify Other Active College Admin sees All + Active, but NOT Selected (SISTEC-only) or Draft
        var otherFeedResp = await _client.SendAsync(Authorized(HttpMethod.Get, "/api/college/announcements", otherActive.Token));
        Assert.Equal(HttpStatusCode.OK, otherFeedResp.StatusCode);
        var otherFeed = (await otherFeedResp.Content.ReadFromJsonAsync<List<CollegeAnnouncementDto>>())!;
        Assert.Contains(otherFeed, a => a.Id == allAnn.Id);
        Assert.Contains(otherFeed, a => a.Id == activeAnn.Id);
        Assert.DoesNotContain(otherFeed, a => a.Id == selectedAnn.Id);
        Assert.DoesNotContain(otherFeed, a => a.Id == draftAnn.Id);

        // Verify Inactive College Admin sees All, but NOT Active, Selected, or Draft
        var inactiveFeedResp = await _client.SendAsync(Authorized(HttpMethod.Get, "/api/college/announcements", inactiveCollege.Token));
        Assert.Equal(HttpStatusCode.OK, inactiveFeedResp.StatusCode);
        var inactiveFeed = (await inactiveFeedResp.Content.ReadFromJsonAsync<List<CollegeAnnouncementDto>>())!;
        Assert.Contains(inactiveFeed, a => a.Id == allAnn.Id);
        Assert.DoesNotContain(inactiveFeed, a => a.Id == activeAnn.Id);
        Assert.DoesNotContain(inactiveFeed, a => a.Id == selectedAnn.Id);

        // Verify Tenant identity cannot be overridden by client query parameters
        var spoofedResp = await _client.SendAsync(Authorized(
            HttpMethod.Get,
            $"/api/college/announcements?collegeId={sistecCollegeId}&collegeCode=SISTEC",
            otherActive.Token));
        Assert.Equal(HttpStatusCode.OK, spoofedResp.StatusCode);
        var spoofedFeed = (await spoofedResp.Content.ReadFromJsonAsync<List<CollegeAnnouncementDto>>())!;
        Assert.DoesNotContain(spoofedFeed, a => a.Id == selectedAnn.Id);

        // Withdraw Selected announcement -> excluded
        var withdrawResp = await _client.SendAsync(Authorized(HttpMethod.Post, $"/api/platform/announcements/{selectedAnn.Id}/withdraw", superAuth.Token));
        Assert.Equal(HttpStatusCode.OK, withdrawResp.StatusCode);

        // Archive Active announcement -> excluded
        var archiveResp = await _client.SendAsync(Authorized(HttpMethod.Post, $"/api/platform/announcements/{activeAnn.Id}/archive", superAuth.Token, new ArchiveAnnouncementRequest { Reason = "Superseded" }));
        Assert.Equal(HttpStatusCode.OK, archiveResp.StatusCode);

        // Soft-delete All announcement -> excluded
        var deleteResp = await _client.SendAsync(Authorized(HttpMethod.Delete, $"/api/platform/announcements/{allAnn.Id}", superAuth.Token));
        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);

        var sistecAfterResp = await _client.SendAsync(Authorized(HttpMethod.Get, "/api/college/announcements", sistecAuth.Token));
        Assert.Equal(HttpStatusCode.OK, sistecAfterResp.StatusCode);
        var sistecAfter = (await sistecAfterResp.Content.ReadFromJsonAsync<List<CollegeAnnouncementDto>>())!;
        Assert.DoesNotContain(sistecAfter, a => a.Id == selectedAnn.Id);
        Assert.DoesNotContain(sistecAfter, a => a.Id == activeAnn.Id);
        Assert.DoesNotContain(sistecAfter, a => a.Id == allAnn.Id);
    }

    [Fact]
    public async Task Security_And_Validation_Checks()
    {
        var superAuth = await LoginAsync("admin@projecthub.in");
        var sistecAuth = await LoginAsync("collegeadmin@sistec.ac.in");

        // Invalid selected-college reference is rejected
        var invalidCreate = await _client.SendAsync(Authorized(HttpMethod.Post, "/api/platform/announcements", superAuth.Token, new SavePlatformAnnouncementRequest
        {
            Title = "Invalid Target Test",
            Category = "Maintenance",
            Priority = "Normal",
            FullMessage = "Should fail validation.",
            TargetAudience = "Selected Colleges",
            TargetCollegeIds = new List<string> { "non-existent-college-ref" },
            Status = "Published"
        }));
        Assert.Equal(HttpStatusCode.BadRequest, invalidCreate.StatusCode);

        // Empty Selected Colleges list is rejected
        var emptySelectedCreate = await _client.SendAsync(Authorized(HttpMethod.Post, "/api/platform/announcements", superAuth.Token, new SavePlatformAnnouncementRequest
        {
            Title = "Empty Target Test",
            Category = "Maintenance",
            Priority = "Normal",
            FullMessage = "Should fail validation.",
            TargetAudience = "Selected Colleges",
            TargetCollegeIds = new List<string>(),
            Status = "Published"
        }));
        Assert.Equal(HttpStatusCode.BadRequest, emptySelectedCreate.StatusCode);

        // College Admin cannot access Super Admin announcement management endpoints
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(Authorized(HttpMethod.Get, "/api/platform/announcements", sistecAuth.Token))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(Authorized(HttpMethod.Post, "/api/platform/announcements", sistecAuth.Token, new SavePlatformAnnouncementRequest
        {
            Title = "Unauthorized",
            FullMessage = "Unauthorized",
            TargetAudience = "All Colleges",
            Status = "Published"
        }))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(Authorized(HttpMethod.Delete, $"/api/platform/announcements/{Guid.NewGuid()}", sistecAuth.Token))).StatusCode);
    }
}
