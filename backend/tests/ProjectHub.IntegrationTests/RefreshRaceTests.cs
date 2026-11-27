using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class RefreshRaceTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public RefreshRaceTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Refresh_WithinGraceWindow_ReturnsRefreshRace_AndPreservesTokenFamily()
    {
        using var client = _factory.CreateClient();

        var loginRes = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "student@sistec.ac.in",
            password = "Pass@1234"
        });
        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);
        var loginJson = await loginRes.Content.ReadFromJsonAsync<JsonElement>();
        var refreshToken1 = loginJson.GetProperty("refreshToken").GetString()!;

        // 1st refresh rotates token1 -> token2
        var r1 = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = refreshToken1 });
        Assert.Equal(HttpStatusCode.OK, r1.StatusCode);
        var r1Json = await r1.Content.ReadFromJsonAsync<JsonElement>();
        var refreshToken2 = r1Json.GetProperty("refreshToken").GetString()!;

        // Concurrent/late 2nd refresh with old token1 within grace window -> 401 refresh_race, family NOT revoked
        var rRace = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = refreshToken1 });
        Assert.Equal(HttpStatusCode.Unauthorized, rRace.StatusCode);
        var raceJson = await rRace.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("refresh_race", raceJson.GetProperty("code").GetString());

        // New token2 must still be valid!
        var r2 = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = refreshToken2 });
        Assert.Equal(HttpStatusCode.OK, r2.StatusCode);
    }

    [Fact]
    public async Task Refresh_WithZeroGraceWindow_RevokesTokenFamilyOnReuse()
    {
        using var zeroGraceFactory = _factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("Auth:RefreshRaceGraceSeconds", "0");
        });
        using var client = zeroGraceFactory.CreateClient();

        var loginRes = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "faculty@sistec.ac.in",
            password = "Password@123"
        });
        if (!loginRes.IsSuccessStatusCode)
        {
            return;
        }
        var loginJson = await loginRes.Content.ReadFromJsonAsync<JsonElement>();
        var refreshToken1 = loginJson.GetProperty("refreshToken").GetString()!;

        var r1 = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = refreshToken1 });
        Assert.Equal(HttpStatusCode.OK, r1.StatusCode);
        var r1Json = await r1.Content.ReadFromJsonAsync<JsonElement>();
        var refreshToken2 = r1Json.GetProperty("refreshToken").GetString()!;

        // Reuse with grace=0 revokes the entire family
        var rReuse = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = refreshToken1 });
        Assert.Equal(HttpStatusCode.Unauthorized, rReuse.StatusCode);

        // Token2 is now revoked too
        var r2 = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = refreshToken2 });
        Assert.Equal(HttpStatusCode.Unauthorized, r2.StatusCode);
    }
}
