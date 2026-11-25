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
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
using ProjectHub.Infrastructure.Security;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class ProductionAuthLifecycleTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public ProductionAuthLifecycleTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<AuthResponse> LoginAsync(string email, string password = "Pass@1234")
    {
        var res = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = password
        });
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>())!;
    }

    [Fact]
    public async Task TamperedOrExpiredJwt_IsRejectedWithUnauthorized()
    {
        var auth = await LoginAsync("student@sistec.ac.in");
        var tampered = auth.Token[..^4] + "XXXX";

        var req = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tampered);
        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);

        // Expired token
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("ProjectHubSuperSecretDevKeyMinLength32CharactersRequired!"));
        var expiredJwt = new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
            issuer: "https://api.projecthub.local",
            audience: "https://app.projecthub.local",
            claims: new[] { new Claim("sub", auth.User.Id.ToString()), new Claim("sid", auth.SessionId) },
            notBefore: DateTime.UtcNow.AddHours(-2),
            expires: DateTime.UtcNow.AddHours(-1),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)));

        var expReq = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        expReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", expiredJwt);
        var expRes = await _client.SendAsync(expReq);
        Assert.Equal(HttpStatusCode.Unauthorized, expRes.StatusCode);
    }

    [Fact]
    public async Task RefreshToken_RotationAndReplayDetection_RevokesTokenFamily()
    {
        var auth = await LoginAsync("faculty@sistec.ac.in");
        Assert.False(string.IsNullOrWhiteSpace(auth.RefreshToken));

        // 1. Valid refresh rotates token
        var refreshRes1 = await _client.PostAsJsonAsync("/api/auth/refresh", new RefreshTokenRequest
        {
            RefreshToken = auth.RefreshToken
        });
        Assert.Equal(HttpStatusCode.OK, refreshRes1.StatusCode);
        var rotated = await refreshRes1.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(rotated);
        Assert.NotEqual(auth.RefreshToken, rotated.RefreshToken);

        // 2. Replay of old refresh token triggers family revocation
        var replayRes = await _client.PostAsJsonAsync("/api/auth/refresh", new RefreshTokenRequest
        {
            RefreshToken = auth.RefreshToken
        });
        Assert.Equal(HttpStatusCode.Unauthorized, replayRes.StatusCode);

        // 3. Even the newer rotated token in that family is now revoked
        var postReplayRes = await _client.PostAsJsonAsync("/api/auth/refresh", new RefreshTokenRequest
        {
            RefreshToken = rotated.RefreshToken
        });
        Assert.Equal(HttpStatusCode.Unauthorized, postReplayRes.StatusCode);
    }

    [Fact]
    public async Task Logout_RevokesActiveSession_RejectsSubsequentAccessToken()
    {
        var auth = await LoginAsync("coordinator@sistec.ac.in");

        var meBefore = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        meBefore.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        Assert.Equal(HttpStatusCode.OK, (await _client.SendAsync(meBefore)).StatusCode);

        var logoutReq = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        logoutReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        Assert.Equal(HttpStatusCode.OK, (await _client.SendAsync(logoutReq)).StatusCode);

        var meAfter = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        meAfter.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.SendAsync(meAfter)).StatusCode);
    }

    [Fact]
    public async Task Login_FiveFailedAttempts_LocksAccount()
    {
        var testEmail = $"lockout.{Guid.NewGuid():N}@sistec.ac.in";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var tc = scope.ServiceProvider.GetRequiredService<Application.Interfaces.ITenantContext>();
            tc.IsSuperAdmin = true;
            db.Users.Add(new UserAccount
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                FullName = "Lockout Test User",
                Email = testEmail,
                EnrollmentOrEmployeeCode = $"LOCK-{Guid.NewGuid():N}"[..12],
                Role = UserRole.Student,
                PasswordHash = PasswordHelper.HashPassword("StrongPass@2026!"),
                IsActivated = true,
                IsActive = true
            });
            await db.SaveChangesAsync();
        }

        for (int i = 0; i < 5; i++)
        {
            var failRes = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
            {
                Email = testEmail,
                Password = "WrongPassword!"
            });
            Assert.Equal(HttpStatusCode.Unauthorized, failRes.StatusCode);
        }

        // 6th attempt even with correct password must be locked (429)
        var lockedRes = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = testEmail,
            Password = "StrongPass@2026!"
        });
        Assert.Equal(HttpStatusCode.TooManyRequests, lockedRes.StatusCode);
    }

    [Fact]
    public async Task DisabledAccount_CannotLogin_AndCannotSelfReactivateViaPasswordReset()
    {
        var disabledEmail = $"disabled.{Guid.NewGuid():N}@sistec.ac.in";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var tc = scope.ServiceProvider.GetRequiredService<Application.Interfaces.ITenantContext>();
            tc.IsSuperAdmin = true;
            db.Users.Add(new UserAccount
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                FullName = "Disabled User",
                Email = disabledEmail,
                EnrollmentOrEmployeeCode = $"DIS-{Guid.NewGuid():N}"[..12],
                Role = UserRole.Student,
                PasswordHash = PasswordHelper.HashPassword("StrongPass@2026!"),
                PasswordResetOtpHashed = PasswordHelper.HashPassword("123456"),
                PasswordResetOtpExpiresAtUtc = DateTime.UtcNow.AddMinutes(10),
                IsActivated = true,
                IsActive = false
            });
            await db.SaveChangesAsync();
        }

        var loginRes = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = disabledEmail,
            Password = "StrongPass@2026!"
        });
        Assert.Equal(HttpStatusCode.Unauthorized, loginRes.StatusCode);

        var resetRes = await _client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest
        {
            Email = disabledEmail,
            Otp = "123456",
            NewPassword = "NewStrongPass@2026!"
        });
        Assert.Equal(HttpStatusCode.BadRequest, resetRes.StatusCode);
    }

    [Fact]
    public async Task AccountDeactivation_ImmediatelyRevokesActiveJwt()
    {
        var targetEmail = $"deact.{Guid.NewGuid():N}@sistec.ac.in";
        Guid targetId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var tc = scope.ServiceProvider.GetRequiredService<Application.Interfaces.ITenantContext>();
            tc.IsSuperAdmin = true;
            var u = new UserAccount
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                FullName = "Deactivate Target",
                Email = targetEmail,
                EnrollmentOrEmployeeCode = $"DEA-{Guid.NewGuid():N}"[..12],
                Role = UserRole.Faculty,
                PasswordHash = PasswordHelper.HashPassword("StrongPass@2026!"),
                IsActivated = true,
                IsActive = true
            };
            db.Users.Add(u);
            await db.SaveChangesAsync();
            targetId = u.Id;
        }

        var userAuth = await LoginAsync(targetEmail, "StrongPass@2026!");
        var adminAuth = await LoginAsync("collegeadmin@sistec.ac.in");

        var deactReq = new HttpRequestMessage(HttpMethod.Put, $"/api/college/users/{targetId}/status")
        {
            Content = JsonContent.Create(new { isActive = false })
        };
        deactReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminAuth.Token);
        Assert.Equal(HttpStatusCode.OK, (await _client.SendAsync(deactReq)).StatusCode);

        var meReq = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        meReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userAuth.Token);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.SendAsync(meReq)).StatusCode);
    }

    [Fact]
    public async Task SuperAdmin_LeastPrivilege_IsBlockedFromCollegeAndAcademicEndpoints()
    {
        var superAuth = await LoginAsync("admin@projecthub.in");

        foreach (var path in new[] { "/api/college/overview", "/api/hod/dashboard", "/api/faculty/action-queue" })
        {
            var req = new HttpRequestMessage(HttpMethod.Get, path);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", superAuth.Token);
            var res = await _client.SendAsync(req);
            Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
        }
    }

    [Fact]
    public async Task MfaEnrollmentAndChallenge_EnforcesTotpAndSingleUseRecoveryCode()
    {
        var mfaEmail = $"mfa.{Guid.NewGuid():N}@sistec.ac.in";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var tc = scope.ServiceProvider.GetRequiredService<Application.Interfaces.ITenantContext>();
            tc.IsSuperAdmin = true;
            db.Users.Add(new UserAccount
            {
                CollegeId = DbInitializer.SistecTenantId,
                FullName = "MFA Test Admin",
                Email = mfaEmail,
                EnrollmentOrEmployeeCode = $"MFA-{Guid.NewGuid():N}"[..12],
                Role = UserRole.CollegeAdmin,
                PasswordHash = PasswordHelper.HashPassword("StrongPass@2026!"),
                IsActivated = true,
                IsActive = true
            });
            await db.SaveChangesAsync();
        }

        var initialAuth = await LoginAsync(mfaEmail, "StrongPass@2026!");

        // 1. Enroll MFA
        var enrollReq = new HttpRequestMessage(HttpMethod.Post, "/api/auth/mfa/enroll");
        enrollReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", initialAuth.Token);
        var enrollRes = await _client.SendAsync(enrollReq);
        enrollRes.EnsureSuccessStatusCode();
        var enrollJson = await enrollRes.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var secret = enrollJson.GetProperty("secret").GetString()!;

        // 2. Confirm MFA with valid TOTP
        var totpCode = TotpHelper.ComputeCodeForTimestamp(secret, DateTimeOffset.UtcNow);
        var confirmReq = new HttpRequestMessage(HttpMethod.Post, "/api/auth/mfa/confirm")
        {
            Content = JsonContent.Create(new MfaConfirmRequest { Code = totpCode })
        };
        confirmReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", initialAuth.Token);
        var confirmRes = await _client.SendAsync(confirmReq);
        confirmRes.EnsureSuccessStatusCode();
        var confirmJson = await confirmRes.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var recoveryCode = confirmJson.GetProperty("recoveryCodes")[0].GetString()!;

        // 3. Subsequent login requires MFA challenge
        var challengeAuth = await LoginAsync(mfaEmail, "StrongPass@2026!");
        Assert.True(challengeAuth.MfaRequired);
        Assert.True(string.IsNullOrEmpty(challengeAuth.Token));
        Assert.False(string.IsNullOrWhiteSpace(challengeAuth.MfaChallengeToken));

        // 4. Verify using single-use recovery code
        var verifyRes = await _client.PostAsJsonAsync("/api/auth/mfa/verify", new MfaVerifyChallengeRequest
        {
            MfaChallengeToken = challengeAuth.MfaChallengeToken!,
            Code = recoveryCode
        });
        Assert.Equal(HttpStatusCode.OK, verifyRes.StatusCode);
        var verifiedAuth = await verifyRes.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(verifiedAuth);
        Assert.False(string.IsNullOrWhiteSpace(verifiedAuth.Token));

        // 5. Reusing the same recovery code must fail
        var challengeAuth2 = await LoginAsync(mfaEmail, "StrongPass@2026!");
        var replayVerifyRes = await _client.PostAsJsonAsync("/api/auth/mfa/verify", new MfaVerifyChallengeRequest
        {
            MfaChallengeToken = challengeAuth2.MfaChallengeToken!,
            Code = recoveryCode
        });
        Assert.Equal(HttpStatusCode.Unauthorized, replayVerifyRes.StatusCode);

        // 6. Password reset on an MFA-enabled account must NOT bypass MFA
        var otpRes = await _client.PostAsJsonAsync("/api/auth/request-password-otp", new RequestPasswordOtpRequest
        {
            Email = mfaEmail
        });
        otpRes.EnsureSuccessStatusCode();
        var otpBody = await otpRes.Content.ReadFromJsonAsync<RequestPasswordOtpResponse>();
        Assert.NotNull(otpBody?.DevOtp);

        var resetRes = await _client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest
        {
            Email = mfaEmail,
            Otp = otpBody.DevOtp,
            NewPassword = "ResetStrongPass@2026!"
        });
        Assert.Equal(HttpStatusCode.OK, resetRes.StatusCode);
        var resetAuth = await resetRes.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(resetAuth);
        Assert.True(resetAuth.MfaRequired);
        Assert.True(string.IsNullOrEmpty(resetAuth.Token));
    }

    [Fact]
    public async Task EmailChangeOtp_BoundToTargetEmail_RejectsSubstitutedEmail()
    {
        var superAuth = await LoginAsync("admin@projecthub.in");

        var reqOtp = new HttpRequestMessage(HttpMethod.Post, "/api/account/request-email-change")
        {
            Content = JsonContent.Create(new { newEmail = "intended.new@collabex.in" })
        };
        reqOtp.Headers.Authorization = new AuthenticationHeaderValue("Bearer", superAuth.Token);
        var resOtp = await _client.SendAsync(reqOtp);
        resOtp.EnsureSuccessStatusCode();
        var otpJson = await resOtp.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var devOtp = otpJson.GetProperty("devOtp").GetString()!;

        var verifySubstituted = new HttpRequestMessage(HttpMethod.Post, "/api/account/verify-email-change")
        {
            Content = JsonContent.Create(new { newEmail = "attacker.other@collabex.in", otp = devOtp })
        };
        verifySubstituted.Headers.Authorization = new AuthenticationHeaderValue("Bearer", superAuth.Token);
        var verifyRes = await _client.SendAsync(verifySubstituted);
        Assert.Equal(HttpStatusCode.BadRequest, verifyRes.StatusCode);
    }

    [Fact]
    public async Task SessionSecurityService_WhenRedisUnavailable_StillRejectsRevokedSessions()
    {
        var auth = await LoginAsync("student2@sistec.ac.in");

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var env = scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Hosting.IHostEnvironment>();
        var noRedisService = new SessionSecurityService(
            db,
            env,
            Microsoft.Extensions.Logging.Abstractions.NullLogger<SessionSecurityService>.Instance,
            redis: null);

        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("sub", auth.User.Id.ToString()),
            new Claim("sid", auth.SessionId),
            new Claim("security_stamp", (await db.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == auth.User.Id)).SecurityStamp),
            new Claim("role", auth.User.Role.ToString()),
            new Claim("is_coordinator", auth.User.IsProjectCoordinator.ToString().ToLowerInvariant())
        }, "Bearer"));

        var (validBefore, _) = await noRedisService.ValidateAccessTokenAsync(principal);
        Assert.True(validBefore);

        await noRedisService.RevokeSessionAsync(auth.SessionId, "RedisOutageTest");
        await db.SaveChangesAsync();

        var (validAfter, _) = await noRedisService.ValidateAccessTokenAsync(principal);
        Assert.False(validAfter);
    }
}
