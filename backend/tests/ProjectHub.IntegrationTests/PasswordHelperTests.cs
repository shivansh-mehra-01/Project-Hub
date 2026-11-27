using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ProjectHub.Infrastructure.Persistence;
using ProjectHub.Infrastructure.Security;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class PasswordHelperTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public PasswordHelperTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // Hardcoded legacy salt:hash generated with the old 100,000-iteration PBKDF2-SHA256 algorithm for "Pass@1234"
    // Salt bytes: 16 bytes of 0x01
    private static readonly string HardcodedLegacyHash = BuildLegacySampleHash("Pass@1234");

    private static string BuildLegacySampleHash(string password)
    {
        byte[] salt = new byte[16];
        Array.Fill(salt, (byte)0x01);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, 32);
        return $"{Convert.ToBase64String(salt)}:{Convert.ToBase64String(hash)}";
    }

    [Fact]
    public void LegacySaltHash_VerifiesAndNeedsRehash()
    {
        const string legacySample = "AQEBAQEBAQEBAQEBAQEBAQ==:k6k5r6X2nE6x6p7z2j4l5q6r7s8t9u0v1w2x3y4z5A8=";
        // Verify deterministic legacy sample format
        Assert.True(PasswordHelper.NeedsRehash(HardcodedLegacyHash));
        Assert.True(PasswordHelper.VerifyPassword("Pass@1234", HardcodedLegacyHash));
        Assert.False(PasswordHelper.VerifyPassword("Wrong@1234", HardcodedLegacyHash));
        Assert.True(PasswordHelper.NeedsRehash(legacySample));
    }

    [Fact]
    public void NewV2Hash_Uses600kIterations_VerifiesAndDoesNotNeedRehash()
    {
        var hash = PasswordHelper.HashPassword("StrongPass!2026");
        Assert.StartsWith("v2$600000$", hash, StringComparison.Ordinal);
        Assert.False(PasswordHelper.NeedsRehash(hash));
        Assert.True(PasswordHelper.VerifyPassword("StrongPass!2026", hash));
        Assert.False(PasswordHelper.VerifyPassword("WrongPass!2026", hash));
    }

    [Fact]
    public void PasswordPolicyValidator_RejectsOver128Characters()
    {
        var tooLong = "Ab1!" + new string('x', 125); // 129 chars
        var err = PasswordPolicyValidator.Validate(tooLong);
        Assert.NotNull(err);
        Assert.Contains("128", err);
    }

    [Fact]
    public async Task Login_WithLegacyHash_SucceedsAndRehashesToV2()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var student = await db.Users.IgnoreQueryFilters()
            .FirstAsync(u => u.Email == "student@sistec.ac.in");

        scope.ServiceProvider.GetRequiredService<ProjectHub.Application.Interfaces.ITenantContext>().CollegeId = student.CollegeId;
        student.PasswordHash = HardcodedLegacyHash;
        await db.SaveChangesAsync();

        using var client = _factory.CreateClient();
        var res = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "student@sistec.ac.in",
            password = "Pass@1234"
        });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        // Verify password hash in DB was upgraded to v2$600000$
        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var updated = await verifyDb.Users.IgnoreQueryFilters()
            .AsNoTracking()
            .FirstAsync(u => u.Email == "student@sistec.ac.in");
        Assert.StartsWith("v2$600000$", updated.PasswordHash, StringComparison.Ordinal);
    }
}
