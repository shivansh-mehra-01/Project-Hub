using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using ProjectHub.Api.Controllers;
using ProjectHub.Application.Common.Models;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class SuperAdminMyProfileTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public SuperAdminMyProfileTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    private async Task<string> LoginAsync(string email, string password = "Pass@1234")
    {
        var resp = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = password
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
    public async Task ProfileAndPhoneVerification_PersistAndBlockNonSuperAdmin()
    {
        var facultyToken = await LoginAsync("faculty@sistec.ac.in");
        var forbidden = await _client.SendAsync(AuthReq(HttpMethod.Get, "/api/account/profile", facultyToken));
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        var adminToken = await LoginAsync("admin@projecthub.in");

        // 1. Load profile
        var getResp = await _client.SendAsync(AuthReq(HttpMethod.Get, "/api/account/profile", adminToken));
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
        var profile = await getResp.Content.ReadFromJsonAsync<AdminProfileDto>();
        Assert.NotNull(profile);
        Assert.Equal("Super Admin", profile.Role);

        // 2. Update profile (resets phone verification)
        var updateResp = await _client.SendAsync(AuthReq(HttpMethod.Put, "/api/account/profile", adminToken, new UpdateAdminProfileRequest
        {
            FullName = "Updated Platform Admin",
            PhoneNumber = "+91 98260 55555"
        }));
        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);
        var updated = await updateResp.Content.ReadFromJsonAsync<AdminProfileDto>();
        Assert.Equal("Updated Platform Admin", updated!.FullName);
        Assert.Equal("+91 98260 55555", updated.PhoneNumber);
        Assert.False(updated.IsPhoneVerified);

        // 3. Request phone verification & verify
        var reqOtpResp = await _client.SendAsync(AuthReq(HttpMethod.Post, "/api/account/request-phone-verification", adminToken));
        Assert.Equal(HttpStatusCode.OK, reqOtpResp.StatusCode);
        var otpJson = await reqOtpResp.Content.ReadFromJsonAsync<JsonElement>();
        var devOtp = otpJson.GetProperty("devOtp").GetString();
        Assert.False(string.IsNullOrWhiteSpace(devOtp));

        var verifyResp = await _client.SendAsync(AuthReq(HttpMethod.Post, "/api/account/verify-phone", adminToken, new VerifyPhoneRequest
        {
            Otp = devOtp!
        }));
        Assert.Equal(HttpStatusCode.OK, verifyResp.StatusCode);

        var reloaded = await (await _client.SendAsync(AuthReq(HttpMethod.Get, "/api/account/profile", adminToken)))
            .Content.ReadFromJsonAsync<AdminProfileDto>();
        Assert.True(reloaded!.IsPhoneVerified);
    }

    [Fact]
    public async Task SecurityMfaRecoveryAndSessions_WorkEndToEnd()
    {
        var token1 = await LoginAsync("admin@projecthub.in");
        var token2 = await LoginAsync("admin@projecthub.in");

        // 1. MFA status & real TOTP enrollment start
        var mfaResp = await _client.SendAsync(AuthReq(HttpMethod.Get, "/api/account/mfa/status", token1));
        Assert.Equal(HttpStatusCode.OK, mfaResp.StatusCode);
        var mfaStatus = await mfaResp.Content.ReadFromJsonAsync<MfaStatusDto>();
        Assert.True(mfaStatus!.IsMandatory);
        Assert.Contains(mfaStatus.Methods, m => m.Type == "FIDO2" && !m.IsConfigured);

        var enrollResp = await _client.SendAsync(AuthReq(HttpMethod.Post, "/api/auth/mfa/enroll", token1));
        Assert.Equal(HttpStatusCode.OK, enrollResp.StatusCode);
        var enrollJson = await enrollResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(string.IsNullOrWhiteSpace(enrollJson.GetProperty("secret").GetString()));

        // 2. Recovery codes require valid password
        var badReauth = await _client.SendAsync(AuthReq(HttpMethod.Post, "/api/account/mfa/regenerate-recovery-codes", token1, new ReauthenticateRequest
        {
            CurrentPassword = "WrongPassword!"
        }));
        Assert.Equal(HttpStatusCode.Unauthorized, badReauth.StatusCode);

        var goodReauth = await _client.SendAsync(AuthReq(HttpMethod.Post, "/api/account/mfa/regenerate-recovery-codes", token1, new ReauthenticateRequest
        {
            CurrentPassword = "Pass@1234"
        }));
        Assert.Equal(HttpStatusCode.OK, goodReauth.StatusCode);
        var codesJson = await goodReauth.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(10, codesJson.GetProperty("codes").GetArrayLength());

        // 3. Sessions list & revoke others keeps current session active
        var sessionsResp = await _client.SendAsync(AuthReq(HttpMethod.Get, "/api/account/sessions", token1));
        Assert.Equal(HttpStatusCode.OK, sessionsResp.StatusCode);
        var sessions = await sessionsResp.Content.ReadFromJsonAsync<List<AccountSessionDto>>();
        Assert.NotNull(sessions);
        Assert.True(sessions.Count >= 2);
        Assert.Single(sessions, s => s.IsCurrentSession);

        var revokeOthersResp = await _client.SendAsync(AuthReq(HttpMethod.Post, "/api/account/sessions/revoke-others", token1));
        Assert.Equal(HttpStatusCode.OK, revokeOthersResp.StatusCode);

        // token2 is now invalidated while token1 still works
        var token2Check = await _client.SendAsync(AuthReq(HttpMethod.Get, "/api/account/profile", token2));
        Assert.Equal(HttpStatusCode.Unauthorized, token2Check.StatusCode);

        var token1Check = await _client.SendAsync(AuthReq(HttpMethod.Get, "/api/account/profile", token1));
        Assert.Equal(HttpStatusCode.OK, token1Check.StatusCode);

        // 4. Logout invalidates current session
        var logoutResp = await _client.SendAsync(AuthReq(HttpMethod.Post, "/api/account/logout", token1));
        Assert.Equal(HttpStatusCode.OK, logoutResp.StatusCode);

        var afterLogoutCheck = await _client.SendAsync(AuthReq(HttpMethod.Get, "/api/account/profile", token1));
        Assert.Equal(HttpStatusCode.Unauthorized, afterLogoutCheck.StatusCode);
    }
}
