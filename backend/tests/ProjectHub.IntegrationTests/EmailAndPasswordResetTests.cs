using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.IdentityModel.Tokens;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
using ProjectHub.Infrastructure.Services;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class EmailAndPasswordResetTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public EmailAndPasswordResetTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private static string GenerateToken(Guid userId, Guid collegeId, UserRole role, string email = "college.admin@sistec.ac.in")
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
            new(ClaimTypes.Role, role.ToString()),
            new("role", role.ToString()),
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

    private sealed class FailingEmailSender : IEmailSender
    {
        public Task SendPasswordResetOtpAsync(string recipientEmail, string recipientName, string otp, CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("Simulated SMTP relay failure: secret-internal-detail");

        public Task SendAccountActivationAsync(string recipientEmail, string recipientName, string activationToken, CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("Simulated SMTP relay failure");

        public Task SendEmailChangeVerificationAsync(string recipientEmail, string recipientName, string otp, CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("Simulated SMTP relay failure");
    }

    private sealed class StubHostEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;
        public string ApplicationName { get; set; } = "ProjectHub.Api";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private sealed record ResetApiPayload(bool Success, bool EmailDispatched, bool EmailQueued, string Message, string? Code, DateTime? ExpiresAtUtc);

    [Fact]
    public async Task ResetStaffPassword_Success_RotatesSecurityStamp_AndRevokesActiveSessions()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        var initialStamp = "initial-stamp-001";

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.Users.Add(new UserAccount
            {
                Id = targetUserId,
                CollegeId = collegeId,
                FullName = "Faculty Session Test",
                Email = $"faculty.session.{Guid.NewGuid():N}@sistec.ac.in",
                PasswordHash = "old_hash",
                SecurityStamp = initialStamp,
                Role = UserRole.Faculty,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
            db.UserSessions.Add(new UserSession
            {
                Id = Guid.NewGuid().ToString("N"),
                UserId = targetUserId,
                CollegeId = collegeId,
                TokenHash = "hash-1",
                ExpiresAtUtc = DateTime.UtcNow.AddDays(1),
                IsRevoked = false,
                LastActiveTimeUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var token = GenerateToken(adminId, collegeId, UserRole.CollegeAdmin);
        var req = new HttpRequestMessage(HttpMethod.Post, $"/api/college/users/{targetUserId}/reset-password");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ResetApiPayload>();
        Assert.NotNull(payload);
        Assert.True(payload.Success);
        Assert.True(payload.EmailDispatched);
        Assert.Contains("15 minutes", payload.Message);

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var updatedUser = await db.Users.FindAsync(targetUserId);
            Assert.NotNull(updatedUser);
            Assert.NotNull(updatedUser.PasswordResetOtpHashed);
            Assert.NotEqual(initialStamp, updatedUser.SecurityStamp);

            var activeSessions = await db.UserSessions
                .Where(s => s.UserId == targetUserId && !s.IsRevoked)
                .CountAsync();
            Assert.Equal(0, activeSessions);
        }
    }

    [Fact]
    public async Task ResetStaffPassword_WhenSmtpFails_DurablyQueuesInOutbox_AndWorkerRecordsSanitizedFailure()
    {
        var collegeId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();

        var failingFactory = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IEmailSender>();
                services.AddScoped<IEmailSender, FailingEmailSender>();
            });
        });

        using (var scope = failingFactory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeId;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.Users.Add(new UserAccount
            {
                Id = targetUserId,
                CollegeId = collegeId,
                FullName = "Faculty Fail Test",
                Email = $"faculty.fail.{Guid.NewGuid():N}@sistec.ac.in",
                PasswordHash = "old_hash",
                Role = UserRole.Faculty,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        using var failingClient = failingFactory.CreateClient();
        var token = GenerateToken(adminId, collegeId, UserRole.CollegeAdmin);
        var req = new HttpRequestMessage(HttpMethod.Post, $"/api/college/users/{targetUserId}/reset-password");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await failingClient.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ResetApiPayload>();
        Assert.NotNull(payload);
        Assert.True(payload.Success);
        Assert.True(payload.EmailQueued);

        using (var scope = failingFactory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var queued = await db.EmailOutboxMessages.FirstOrDefaultAsync(m => m.CollegeId == collegeId && m.EmailType == EmailOutboxTypes.PasswordResetOtp);
            Assert.NotNull(queued);
            Assert.Equal(EmailOutboxStatus.Pending, queued.Status);

            var worker = new EmailOutboxWorker(
                scope.ServiceProvider.GetRequiredService<IServiceScopeFactory>(),
                scope.ServiceProvider.GetRequiredService<IConfiguration>(),
                scope.ServiceProvider.GetRequiredService<EmailOutboxMetrics>(),
                NullLogger<EmailOutboxWorker>.Instance);

            await worker.ProcessPendingBatchAsync(CancellationToken.None);

            var afterAttempt = await db.EmailOutboxMessages.AsNoTracking().FirstAsync(m => m.Id == queued.Id);
            Assert.Equal(1, afterAttempt.AttemptCount);
            Assert.Equal(EmailOutboxStatus.Pending, afterAttempt.Status);
            Assert.NotNull(afterAttempt.LastError);
        }
    }

    [Fact]
    public async Task ResetStaffPassword_EnforcesTenantIsolation_And_BlocksSuperAdminTarget()
    {
        var collegeA = Guid.NewGuid();
        var collegeB = Guid.NewGuid();
        var adminA = Guid.NewGuid();
        var userInCollegeB = Guid.NewGuid();
        var superAdminId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.IsSuperAdmin = true;
            tenantContext.CollegeId = collegeB;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.Users.Add(new UserAccount
            {
                Id = userInCollegeB,
                CollegeId = collegeB,
                FullName = "Other College Staff",
                Email = $"other.staff.{Guid.NewGuid():N}@other.ac.in",
                Role = UserRole.Faculty,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });

            tenantContext.CollegeId = collegeA;
            db.Users.Add(new UserAccount
            {
                Id = superAdminId,
                CollegeId = collegeA,
                FullName = "Super Admin Target",
                Email = $"super.{Guid.NewGuid():N}@colabex.in",
                Role = UserRole.SuperAdmin,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var tokenA = GenerateToken(adminA, collegeA, UserRole.CollegeAdmin);

        var crossTenantReq = new HttpRequestMessage(HttpMethod.Post, $"/api/college/users/{userInCollegeB}/reset-password");
        crossTenantReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenA);
        var crossTenantResp = await _client.SendAsync(crossTenantReq);
        Assert.Equal(HttpStatusCode.NotFound, crossTenantResp.StatusCode);

        var superReq = new HttpRequestMessage(HttpMethod.Post, $"/api/college/users/{superAdminId}/reset-password");
        superReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenA);
        var superResp = await _client.SendAsync(superReq);
        Assert.Equal(HttpStatusCode.Forbidden, superResp.StatusCode);
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData("", true)]
    [InlineData("   ", true)]
    [InlineData("/relative-path", true)]
    [InlineData("http://app.colabex.in", true)]
    [InlineData("ftp://app.colabex.in", false)]
    public void SmtpEmailSender_ResolveValidatedFrontendBaseUrl_RejectsInvalidOrNonHttpsInProduction(
        string? baseUrl,
        bool requireHttps)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Frontend:BaseUrl"] = baseUrl })
            .Build();

        Assert.Throws<InvalidOperationException>(() =>
            SmtpEmailSender.ResolveValidatedFrontendBaseUrl(config, requireHttps));
    }

    [Fact]
    public void SmtpEmailSender_ResolveValidatedFrontendBaseUrl_AllowsHttpsInProd_AndHttpInDev()
    {
        var prodConfig = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Frontend:BaseUrl"] = "https://app.colabex.in/" })
            .Build();
        Assert.Equal("https://app.colabex.in", SmtpEmailSender.ResolveValidatedFrontendBaseUrl(prodConfig, requireHttps: true));

        var devConfig = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Frontend:BaseUrl"] = "http://localhost:3000/" })
            .Build();
        Assert.Equal("http://localhost:3000", SmtpEmailSender.ResolveValidatedFrontendBaseUrl(devConfig, requireHttps: false));
    }

    [Fact]
    public async Task SmtpEmailSender_LocalSmtpSink_TransmitsOtpAndHttpsActivationLink()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;

        var receivedMessages = new List<string>();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));

        var serverTask = Task.Run(async () =>
        {
            for (int i = 0; i < 2; i++)
            {
                using var tcp = await listener.AcceptTcpClientAsync(cts.Token);
                using var stream = tcp.GetStream();
                using var reader = new StreamReader(stream, Encoding.ASCII);
                using var writer = new StreamWriter(stream, Encoding.ASCII) { AutoFlush = true, NewLine = "\r\n" };

                await writer.WriteLineAsync("220 localhost ESMTP Sink");
                var dataBuilder = new StringBuilder();
                var inData = false;

                while (true)
                {
                    var line = await reader.ReadLineAsync(cts.Token);
                    if (line == null) break;

                    if (inData)
                    {
                        if (line == ".")
                        {
                            inData = false;
                            receivedMessages.Add(dataBuilder.ToString());
                            await writer.WriteLineAsync("250 OK");
                        }
                        else
                        {
                            dataBuilder.AppendLine(line);
                        }
                        continue;
                    }

                    if (line.StartsWith("EHLO", StringComparison.OrdinalIgnoreCase) ||
                        line.StartsWith("HELO", StringComparison.OrdinalIgnoreCase))
                    {
                        await writer.WriteLineAsync("250 localhost");
                    }
                    else if (line.StartsWith("MAIL FROM", StringComparison.OrdinalIgnoreCase) ||
                             line.StartsWith("RCPT TO", StringComparison.OrdinalIgnoreCase))
                    {
                        await writer.WriteLineAsync("250 OK");
                    }
                    else if (line.Equals("DATA", StringComparison.OrdinalIgnoreCase))
                    {
                        inData = true;
                        await writer.WriteLineAsync("354 End data with <CR><LF>.<CR><LF>");
                    }
                    else if (line.Equals("QUIT", StringComparison.OrdinalIgnoreCase))
                    {
                        await writer.WriteLineAsync("221 Bye");
                        break;
                    }
                    else
                    {
                        await writer.WriteLineAsync("250 OK");
                    }
                }
            }
        }, cts.Token);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Email:Provider"] = "Smtp",
                ["Email:SmtpHost"] = "127.0.0.1",
                ["Email:SmtpPort"] = port.ToString(),
                ["Email:FromAddress"] = "noreply@colabex.in",
                ["Email:FromName"] = "Colabex Security",
                ["Email:EnableSsl"] = "false",
                ["Frontend:BaseUrl"] = "https://app.colabex.in"
            })
            .Build();

        var sender = new SmtpEmailSender(config, new StubHostEnvironment(Environments.Production), NullLogger<SmtpEmailSender>.Instance);

        await sender.SendPasswordResetOtpAsync("sink.test@sistec.ac.in", "Sink Test", "654321", cts.Token);
        await sender.SendAccountActivationAsync("sink.test@sistec.ac.in", "Sink Test", "tok_test_123", cts.Token);

        await serverTask;
        Assert.Equal(2, receivedMessages.Count);
        var normalizedOtpBody = receivedMessages[0].Replace("=\r\n", "").Replace("=3D", "=");
        var normalizedActivationBody = receivedMessages[1].Replace("=\r\n", "").Replace("=3D", "=");
        Assert.Contains("654321", normalizedOtpBody);
        Assert.Contains("https://app.colabex.in/activate?email=sink.test%40sistec.ac.in&token=tok_test_123", normalizedActivationBody);
    }
}
