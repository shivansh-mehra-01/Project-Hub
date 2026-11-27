using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ProjectHub.Application.Interfaces;
using ProjectHub.Infrastructure.Persistence;
using ProjectHub.Infrastructure.Security;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class MfaHardeningTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public MfaHardeningTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private static string ComputeTotpCode(string base32Secret)
    {
        const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var cleaned = base32Secret.Trim().ToUpperInvariant().Replace("=", "");
        var bytes = new List<byte>();
        int buffer = 0, bitsLeft = 0;
        foreach (char c in cleaned)
        {
            int val = alphabet.IndexOf(c);
            if (val < 0) continue;
            buffer = (buffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8)
            {
                bytes.Add((byte)((buffer >> (bitsLeft - 8)) & 0xFF));
                bitsLeft -= 8;
            }
        }

        long timestep = DateTimeOffset.UtcNow.ToUnixTimeSeconds() / 30;
        byte[] counter = BitConverter.GetBytes(timestep);
        if (BitConverter.IsLittleEndian) Array.Reverse(counter);

        using var hmac = new HMACSHA1(bytes.ToArray());
        byte[] hash = hmac.ComputeHash(counter);
        int offset = hash[^1] & 0x0F;
        int binary = ((hash[offset] & 0x7F) << 24)
                   | ((hash[offset + 1] & 0xFF) << 16)
                   | ((hash[offset + 2] & 0xFF) << 8)
                   | (hash[offset + 3] & 0xFF);
        return (binary % 1_000_000).ToString("D6");
    }

    [Fact]
    public async Task EnrollMfa_StoresProtectedDpSecret_NotPlaintext()
    {
        using var client = _factory.CreateClient();
        var loginRes = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "faculty@sistec.ac.in",
            password = "Pass@1234"
        });
        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);
        var loginJson = await loginRes.Content.ReadFromJsonAsync<JsonElement>();
        var token = loginJson.GetProperty("token").GetString()!;

        using var enrollReq = new HttpRequestMessage(HttpMethod.Post, "/api/auth/mfa/enroll");
        enrollReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var enrollRes = await client.SendAsync(enrollReq);
        Assert.Equal(HttpStatusCode.OK, enrollRes.StatusCode);
        var enrollJson = await enrollRes.Content.ReadFromJsonAsync<JsonElement>();
        var rawSecret = enrollJson.GetProperty("secret").GetString()!;

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var user = await db.Users.IgnoreQueryFilters().AsNoTracking()
            .FirstAsync(u => u.Email == "faculty@sistec.ac.in");
        Assert.StartsWith("dp:", user.MfaSecret, StringComparison.Ordinal);
        Assert.NotEqual(rawSecret, user.MfaSecret);
    }

    [Fact]
    public async Task VerifyMfa_LegacyPlaintextSecret_VerifiesAndLazilyReencrypts_AndLockoutAppliesOn5Failures()
    {
        var legacySecret = TotpHelper.GenerateSecret();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var student = await db.Users.IgnoreQueryFilters()
                .FirstAsync(u => u.Email == "coordinator@sistec.ac.in");
            scope.ServiceProvider.GetRequiredService<ITenantContext>().CollegeId = student.CollegeId;
            student.MfaEnabled = true;
            student.MfaSecret = legacySecret; // Legacy plaintext
            student.AccessFailedCount = 0;
            student.LockoutEndUtc = null;
            await db.SaveChangesAsync();
        }

        using var client = _factory.CreateClient();
        var loginRes = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "coordinator@sistec.ac.in",
            password = "Pass@1234"
        });
        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);
        var challengeToken = (await loginRes.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("mfaChallengeToken").GetString()!;

        // Verify with legacy plaintext secret -> succeeds and lazily re-encrypts to dp:
        var validCode = ComputeTotpCode(legacySecret);
        var verifyRes = await client.PostAsJsonAsync("/api/auth/mfa/verify", new
        {
            mfaChallengeToken = challengeToken,
            code = validCode
        });
        Assert.Equal(HttpStatusCode.OK, verifyRes.StatusCode);

        using (var checkScope = _factory.Services.CreateScope())
        {
            var db = checkScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var user = await db.Users.IgnoreQueryFilters().AsNoTracking()
                .FirstAsync(u => u.Email == "coordinator@sistec.ac.in");
            Assert.StartsWith("dp:", user.MfaSecret, StringComparison.Ordinal);
        }

        // 5 failed MFA attempts trigger 429 lockout
        for (int i = 0; i < 5; i++)
        {
            var badRes = await client.PostAsJsonAsync("/api/auth/mfa/verify", new
            {
                mfaChallengeToken = challengeToken,
                code = "000000"
            });
            Assert.Equal(HttpStatusCode.Unauthorized, badRes.StatusCode);
        }

        var lockedRes = await client.PostAsJsonAsync("/api/auth/mfa/verify", new
        {
            mfaChallengeToken = challengeToken,
            code = validCode
        });
        Assert.Equal(HttpStatusCode.TooManyRequests, lockedRes.StatusCode);
    }
}
