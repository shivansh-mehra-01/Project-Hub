using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class RateLimitingForwardedHeadersTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public RateLimitingForwardedHeadersTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private sealed class LoopbackRemoteIpStartupFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
        {
            return app =>
            {
                app.Use(async (ctx, nxt) =>
                {
                    ctx.Connection.RemoteIpAddress ??= IPAddress.Loopback;
                    await nxt();
                });
                next(app);
            };
        }
    }

    [Fact]
    public async Task LoginLimit_DifferentForwardedIps_HaveIndependentRateLimitBuckets()
    {
        using var customFactory = _factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("RateLimiting:LoginIpPermitLimit", "2");
            builder.UseSetting("RateLimiting:LoginAccountPermitLimit", "50");
            builder.ConfigureServices(services =>
            {
                services.AddSingleton<IStartupFilter, LoopbackRemoteIpStartupFilter>();
            });
        });

        using var client = customFactory.CreateClient();

        // Exhaust IP1's limit (2 requests allowed, 3rd -> 429)
        for (int i = 0; i < 2; i++)
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
            {
                Content = JsonContent.Create(new { email = $"user{i}@example.edu", password = "WrongPassword!123" })
            };
            req.Headers.Add("X-Forwarded-For", "203.0.113.10");
            var res = await client.SendAsync(req);
            Assert.NotEqual(HttpStatusCode.TooManyRequests, res.StatusCode);
        }

        using (var blockedReq = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new { email = "user2@example.edu", password = "WrongPassword!123" })
        })
        {
            blockedReq.Headers.Add("X-Forwarded-For", "203.0.113.10");
            var blockedRes = await client.SendAsync(blockedReq);
            Assert.Equal(HttpStatusCode.TooManyRequests, blockedRes.StatusCode);
        }

        // Different forwarded IP2 must NOT be rate-limited
        using var ip2Req = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new { email = "other@example.edu", password = "WrongPassword!123" })
        };
        ip2Req.Headers.Add("X-Forwarded-For", "203.0.113.20");
        var ip2Res = await client.SendAsync(ip2Req);
        Assert.NotEqual(HttpStatusCode.TooManyRequests, ip2Res.StatusCode);
    }

    [Fact]
    public async Task LoginLimit_PerAccountLimit_BlocksHammeredEmailAcrossDifferentIps()
    {
        using var customFactory = _factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("RateLimiting:LoginIpPermitLimit", "50");
            builder.UseSetting("RateLimiting:LoginAccountPermitLimit", "2");
            builder.ConfigureServices(services =>
            {
                services.AddSingleton<IStartupFilter, LoopbackRemoteIpStartupFilter>();
            });
        });

        using var client = customFactory.CreateClient();

        // 2 attempts from different IPs targeting the same email
        for (int i = 0; i < 2; i++)
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
            {
                Content = JsonContent.Create(new { email = "Target.User@Example.Edu", password = "WrongPassword!123" })
            };
            req.Headers.Add("X-Forwarded-For", $"198.51.100.{i + 1}");
            var res = await client.SendAsync(req);
            Assert.NotEqual(HttpStatusCode.TooManyRequests, res.StatusCode);
        }

        // 3rd attempt from a 3rd IP targeting the same normalized email must be blocked (429)
        using var blockedReq = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new { email = "target.user@example.edu", password = "WrongPassword!123" })
        };
        blockedReq.Headers.Add("X-Forwarded-For", "198.51.100.99");
        var blockedRes = await client.SendAsync(blockedReq);
        Assert.Equal(HttpStatusCode.TooManyRequests, blockedRes.StatusCode);
    }
}
