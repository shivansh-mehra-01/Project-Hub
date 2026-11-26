using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ProjectHub.Application.Common.Models;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class CollegeOnboardingTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public CollegeOnboardingTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    private async Task<string> LoginAsync(string email)
    {
        var resp = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = "Pass@1234"
        });
        resp.EnsureSuccessStatusCode();
        var auth = await resp.Content.ReadFromJsonAsync<AuthResponse>();
        return auth!.Token;
    }

    private static HttpRequestMessage AuthReq(HttpMethod method, string url, string token, object? body = null)
    {
        var req = new HttpRequestMessage(method, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (body != null) req.Content = JsonContent.Create(body);
        return req;
    }

    [Fact]
    public async Task CreateCollege_MinimalApprovedPayload_GeneratesUuidAndPersistsAllFields()
    {
        var superToken = await LoginAsync("admin@projecthub.in");
        var suffix = Guid.NewGuid().ToString("N")[..6];
        var collegeName = $"Onboard Engineering Institute {suffix}";
        var adminEmail = $"principal-{suffix}@onboard-{suffix}.edu.in";

        // 1. Validation: missing required fields returns 400
        var invalidResp = await _client.SendAsync(AuthReq(HttpMethod.Post, "/api/platform/tenants", superToken, new CreateTenantRequest
        {
            Name = "",
            PrincipalName = "",
            PrincipalEmail = ""
        }));
        Assert.Equal(HttpStatusCode.BadRequest, invalidResp.StatusCode);

        // 2. Valid minimal onboarding payload (no TenantCode, no SsoDomain)
        var createResp = await _client.SendAsync(AuthReq(HttpMethod.Post, "/api/platform/tenants", superToken, new CreateTenantRequest
        {
            Name = collegeName,
            CollegeType = "Engineering College",
            AffiliatingUniversity = "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
            Country = "India",
            State = "Madhya Pradesh",
            City = "Bhopal",
            PrincipalName = "Dr. Ananya Verma",
            PrincipalEmail = adminEmail
        }));

        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var created = await createResp.Content.ReadFromJsonAsync<CreateTenantResponse>();
        Assert.NotNull(created);
        Assert.NotEqual(Guid.Empty, created.Tenant.Id);
        Assert.Equal(collegeName, created.Tenant.Name);
        Assert.Equal("Engineering College", created.Tenant.CollegeType);
        Assert.Equal("India", created.Tenant.Country);
        Assert.Equal("Madhya Pradesh", created.Tenant.State);
        Assert.Equal("Bhopal", created.Tenant.City);
        Assert.Equal(adminEmail, created.AdminEmail);
        Assert.Null(created.DevOtp);

        // 3. Duplicate college name or email returns 409 Conflict
        var dupResp = await _client.SendAsync(AuthReq(HttpMethod.Post, "/api/platform/tenants", superToken, new CreateTenantRequest
        {
            Name = collegeName,
            CollegeType = "Engineering College",
            AffiliatingUniversity = "RGPV",
            Country = "India",
            State = "Madhya Pradesh",
            City = "Bhopal",
            PrincipalName = "Another Admin",
            PrincipalEmail = $"other-{suffix}@onboard-{suffix}.edu.in"
        }));
        Assert.Equal(HttpStatusCode.Conflict, dupResp.StatusCode);

        // 4. Persisted in GET /api/platform/tenants
        var listResp = await _client.SendAsync(AuthReq(HttpMethod.Get, "/api/platform/tenants", superToken));
        Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);
        var tenants = await listResp.Content.ReadFromJsonAsync<List<CollegeTenantDto>>();
        Assert.Contains(tenants!, t =>
            t.Id == created.Tenant.Id &&
            t.Name == collegeName &&
            t.CollegeType == "Engineering College" &&
            t.Country == "India" &&
            t.State == "Madhya Pradesh" &&
            t.City == "Bhopal");

        // 5. Tenant isolation: another college's CollegeAdmin cannot access platform tenant endpoints
        var sistecAdminToken = await LoginAsync("collegeadmin@sistec.ac.in");
        var crossResp = await _client.SendAsync(AuthReq(HttpMethod.Get, "/api/platform/tenants", sistecAdminToken));
        Assert.Equal(HttpStatusCode.Forbidden, crossResp.StatusCode);
        var crossDetailResp = await _client.SendAsync(AuthReq(HttpMethod.Get, $"/api/platform/tenants/{created.Tenant.Id}", sistecAdminToken));
        Assert.Equal(HttpStatusCode.Forbidden, crossDetailResp.StatusCode);

        // 6. Single-tenant details & tenant-scoped audit logs
        var detailResp = await _client.SendAsync(AuthReq(HttpMethod.Get, $"/api/platform/tenants/{created.Tenant.Id}", superToken));
        Assert.Equal(HttpStatusCode.OK, detailResp.StatusCode);
        var detail = await detailResp.Content.ReadFromJsonAsync<CollegeTenantDto>();
        Assert.NotNull(detail);
        Assert.Equal("Dr. Ananya Verma", detail.PrincipalName);
        Assert.Equal(adminEmail, detail.PrincipalEmail);
        Assert.False(detail.PrincipalIsActivated);
        Assert.True(detail.PrincipalHasPendingInvitation);

        var logsResp = await _client.SendAsync(AuthReq(HttpMethod.Get, $"/api/platform/tenants/{created.Tenant.Id}/audit-logs", superToken));
        Assert.Equal(HttpStatusCode.OK, logsResp.StatusCode);
        var logs = await logsResp.Content.ReadFromJsonAsync<List<PlatformAuditLogDto>>();
        Assert.Contains(logs!, l => l.Action == "College Tenant Provisioned" && l.TargetTenantId == created.Tenant.Id);

        // 7. Replace administrator deactivates previous CollegeAdmin & logs audit
        var replacementEmail = $"newprincipal-{suffix}@onboard-{suffix}.edu.in";
        var replaceResp = await _client.SendAsync(AuthReq(HttpMethod.Post, $"/api/platform/tenants/{created.Tenant.Id}/provision-admin", superToken, new ProvisionAdminRequest
        {
            FullName = "Dr. Vikram Patel",
            Email = replacementEmail,
            ReplaceExisting = true,
            Reason = "Tenure transfer"
        }));
        Assert.Equal(HttpStatusCode.OK, replaceResp.StatusCode);

        var afterReplace = await (await _client.SendAsync(AuthReq(HttpMethod.Get, $"/api/platform/tenants/{created.Tenant.Id}", superToken)))
            .Content.ReadFromJsonAsync<CollegeTenantDto>();
        Assert.Equal("Dr. Vikram Patel", afterReplace!.PrincipalName);
        Assert.Equal(replacementEmail, afterReplace.PrincipalEmail);

        // 8. Suspend & Reactivate persist and log audit
        var suspendResp = await _client.SendAsync(AuthReq(HttpMethod.Put, $"/api/platform/tenants/{created.Tenant.Id}", superToken, new UpdateTenantRequest
        {
            IsActive = false
        }));
        Assert.Equal(HttpStatusCode.OK, suspendResp.StatusCode);
        var suspended = await (await _client.SendAsync(AuthReq(HttpMethod.Get, $"/api/platform/tenants/{created.Tenant.Id}", superToken)))
            .Content.ReadFromJsonAsync<CollegeTenantDto>();
        Assert.False(suspended!.IsActive);

        var reactivateResp = await _client.SendAsync(AuthReq(HttpMethod.Put, $"/api/platform/tenants/{created.Tenant.Id}", superToken, new UpdateTenantRequest
        {
            IsActive = true
        }));
        Assert.Equal(HttpStatusCode.OK, reactivateResp.StatusCode);
    }
}
