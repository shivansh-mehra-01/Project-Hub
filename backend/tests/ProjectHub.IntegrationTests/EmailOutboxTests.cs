using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Text;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using ProjectHub.Application.Common.Models;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
using ProjectHub.Infrastructure.Services;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class EmailOutboxTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public EmailOutboxTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private sealed class StubHostEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;
        public string ApplicationName { get; set; } = "ProjectHub.Api";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private sealed class SelectiveEmailSender : IEmailSender
    {
        public List<(string Type, string Email, string Secret)> Delivered { get; } = new();
        public HashSet<string> FailRecipients { get; } = new(StringComparer.OrdinalIgnoreCase);

        public Task SendPasswordResetOtpAsync(string recipientEmail, string recipientName, string otp, CancellationToken cancellationToken = default)
        {
            if (FailRecipients.Contains(recipientEmail))
                throw new InvalidOperationException($"Simulated transient SMTP error for {recipientEmail} otp={otp}");
            Delivered.Add(("PasswordResetOtp", recipientEmail, otp));
            return Task.CompletedTask;
        }

        public Task SendAccountActivationAsync(string recipientEmail, string recipientName, string activationToken, CancellationToken cancellationToken = default)
        {
            if (FailRecipients.Contains(recipientEmail))
                throw new InvalidOperationException($"Simulated transient SMTP error for token={activationToken}");
            Delivered.Add(("AccountActivation", recipientEmail, activationToken));
            return Task.CompletedTask;
        }

        public Task SendEmailChangeVerificationAsync(string recipientEmail, string recipientName, string otp, CancellationToken cancellationToken = default)
        {
            if (FailRecipients.Contains(recipientEmail))
                throw new InvalidOperationException($"Simulated transient SMTP error for {recipientEmail}");
            Delivered.Add(("EmailChangeVerification", recipientEmail, otp));
            return Task.CompletedTask;
        }
    }

    private async Task<string> LoginTokenAsync(HttpClient client, string email)
    {
        var resp = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = "Pass@1234"
        });
        resp.EnsureSuccessStatusCode();
        return (await resp.Content.ReadFromJsonAsync<AuthResponse>())!.Token;
    }

    [Fact]
    public void PayloadEncryption_And_ErrorSanitization_NeverExposeSecrets()
    {
        var dp = DataProtectionProvider.Create("Colabex.Test");
        var protector = dp.CreateProtector("Colabex.EmailOutbox.SensitivePayload.v1");
        var raw = "{\"Secret\":\"987654\"}";
        var encrypted = protector.Protect(raw);

        Assert.DoesNotContain("987654", encrypted);
        Assert.Equal(raw, protector.Unprotect(encrypted));

        var ex = new InvalidOperationException("SMTP failed at https://app.colabex.in/activate?email=a@b.com&token=secret_tok_123 with code 654321");
        var sanitized = EmailOutboxService.SanitizeError(ex);
        Assert.DoesNotContain("secret_tok_123", sanitized);
        Assert.DoesNotContain("654321", sanitized);
        Assert.Contains("[REDACTED]", sanitized);
        Assert.Contains("[OTP_REDACTED]", sanitized);
    }

    [Fact]
    public async Task Worker_DeliversPending_ScrubsPayload_SkipsExpired_AndRecoversStaleLease()
    {
        var sender = new SelectiveEmailSender();
        var factory = _factory.WithWebHostBuilder(b => b.ConfigureTestServices(s =>
        {
            s.RemoveAll<IEmailSender>();
            s.AddSingleton<IEmailSender>(sender);
        }));

        Guid validId, expiredId, staleId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var outbox = scope.ServiceProvider.GetRequiredService<IEmailOutboxService>();

            outbox.QueuePasswordResetOtp("valid@sistec.ac.in", "Valid User", "112233", DateTime.UtcNow.AddMinutes(15), null, $"valid-{Guid.NewGuid():N}");
            outbox.QueuePasswordResetOtp("expired@sistec.ac.in", "Expired User", "445566", DateTime.UtcNow.AddMinutes(-1), null, $"exp-{Guid.NewGuid():N}");
            outbox.QueueAccountActivation("stale@sistec.ac.in", "Stale User", "tok_stale_abc", DateTime.UtcNow.AddHours(24), null, $"stale-{Guid.NewGuid():N}");
            await db.SaveChangesAsync();

            var rows = await db.EmailOutboxMessages.OrderBy(m => m.RecipientEmail).ToListAsync();
            validId = rows.First(r => r.RecipientEmail == "valid@sistec.ac.in").Id;
            expiredId = rows.First(r => r.RecipientEmail == "expired@sistec.ac.in").Id;
            var staleRow = rows.First(r => r.RecipientEmail == "stale@sistec.ac.in");
            staleId = staleRow.Id;
            staleRow.Status = EmailOutboxStatus.Processing;
            staleRow.LockedBy = "crashed-worker";
            staleRow.LockedUntilUtc = DateTime.UtcNow.AddMinutes(-5);
            await db.SaveChangesAsync();
        }

        using (var scope = factory.Services.CreateScope())
        {
            var worker = new EmailOutboxWorker(
                scope.ServiceProvider.GetRequiredService<IServiceScopeFactory>(),
                scope.ServiceProvider.GetRequiredService<IConfiguration>(),
                scope.ServiceProvider.GetRequiredService<EmailOutboxMetrics>(),
                NullLogger<EmailOutboxWorker>.Instance);

            var processed = await worker.ProcessPendingBatchAsync(CancellationToken.None);
            Assert.Equal(2, processed);
        }

        Assert.Contains(sender.Delivered, d => d.Email == "valid@sistec.ac.in" && d.Secret == "112233");
        Assert.Contains(sender.Delivered, d => d.Email == "stale@sistec.ac.in" && d.Secret == "tok_stale_abc");
        Assert.DoesNotContain(sender.Delivered, d => d.Email == "expired@sistec.ac.in");

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var valid = await db.EmailOutboxMessages.FindAsync(validId);
            var expired = await db.EmailOutboxMessages.FindAsync(expiredId);
            var stale = await db.EmailOutboxMessages.FindAsync(staleId);

            Assert.Equal(EmailOutboxStatus.Sent, valid!.Status);
            Assert.Null(valid.EncryptedPayload);
            Assert.NotNull(valid.SentAtUtc);

            Assert.Equal(EmailOutboxStatus.Expired, expired!.Status);
            Assert.Null(expired.EncryptedPayload);

            Assert.Equal(EmailOutboxStatus.Sent, stale!.Status);
            Assert.Null(stale.EncryptedPayload);
        }
    }

    [Fact]
    public async Task Worker_RetriesWithBackoff_MovesToFailed_AndSuperAdminCanRecover()
    {
        var sender = new SelectiveEmailSender();
        sender.FailRecipients.Add("flaky@sistec.ac.in");

        var factory = _factory.WithWebHostBuilder(b => b.ConfigureTestServices(s =>
        {
            s.RemoveAll<IEmailSender>();
            s.AddSingleton<IEmailSender>(sender);
        }));

        Guid flakyId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var outbox = scope.ServiceProvider.GetRequiredService<IEmailOutboxService>();
            outbox.QueuePasswordResetOtp("flaky@sistec.ac.in", "Flaky User", "778899", DateTime.UtcNow.AddMinutes(15), null, $"flaky-{Guid.NewGuid():N}");
            await db.SaveChangesAsync();

            var row = await db.EmailOutboxMessages.FirstAsync(m => m.RecipientEmail == "flaky@sistec.ac.in");
            row.MaxAttempts = 2;
            flakyId = row.Id;
            await db.SaveChangesAsync();
        }

        using (var scope = factory.Services.CreateScope())
        {
            var worker = new EmailOutboxWorker(
                scope.ServiceProvider.GetRequiredService<IServiceScopeFactory>(),
                scope.ServiceProvider.GetRequiredService<IConfiguration>(),
                scope.ServiceProvider.GetRequiredService<EmailOutboxMetrics>(),
                NullLogger<EmailOutboxWorker>.Instance);

            // Attempt 1 -> Retry scheduled (Pending)
            await worker.ProcessPendingBatchAsync(CancellationToken.None);
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var after1 = await db.EmailOutboxMessages.AsNoTracking().FirstAsync(m => m.Id == flakyId);
            Assert.Equal(EmailOutboxStatus.Pending, after1.Status);
            Assert.Equal(1, after1.AttemptCount);
            Assert.True(after1.NextAttemptAtUtc > DateTime.UtcNow.AddSeconds(-1));
            Assert.DoesNotContain("778899", after1.LastError ?? string.Empty);

            // Fast-forward NextAttemptAtUtc for Attempt 2 -> Terminal Failed
            var tracked = await db.EmailOutboxMessages.FirstAsync(m => m.Id == flakyId);
            tracked.NextAttemptAtUtc = DateTime.UtcNow.AddSeconds(-1);
            await db.SaveChangesAsync();

            await worker.ProcessPendingBatchAsync(CancellationToken.None);
            var after2 = await db.EmailOutboxMessages.AsNoTracking().FirstAsync(m => m.Id == flakyId);
            Assert.Equal(EmailOutboxStatus.Failed, after2.Status);
            Assert.Equal(2, after2.AttemptCount);
        }

        // Verify SuperAdmin-only Outbox endpoints & tenant isolation
        using var client = factory.CreateClient();
        var superToken = await LoginTokenAsync(client, "admin@projecthub.in");
        var collegeToken = await LoginTokenAsync(client, "collegeadmin@sistec.ac.in");

        var forbiddenReq = new HttpRequestMessage(HttpMethod.Get, "/api/platform/email-outbox");
        forbiddenReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", collegeToken);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(forbiddenReq)).StatusCode);

        var statusReq = new HttpRequestMessage(HttpMethod.Get, "/api/platform/email-outbox?status=Failed");
        statusReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", superToken);
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(statusReq)).StatusCode);

        // Recover SMTP and retry via SuperAdmin API
        sender.FailRecipients.Remove("flaky@sistec.ac.in");
        var retryReq = new HttpRequestMessage(HttpMethod.Post, $"/api/platform/email-outbox/{flakyId}/retry");
        retryReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", superToken);
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(retryReq)).StatusCode);

        using (var scope = factory.Services.CreateScope())
        {
            var worker = new EmailOutboxWorker(
                scope.ServiceProvider.GetRequiredService<IServiceScopeFactory>(),
                scope.ServiceProvider.GetRequiredService<IConfiguration>(),
                scope.ServiceProvider.GetRequiredService<EmailOutboxMetrics>(),
                NullLogger<EmailOutboxWorker>.Instance);
            await worker.ProcessPendingBatchAsync(CancellationToken.None);

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var recovered = await db.EmailOutboxMessages.AsNoTracking().FirstAsync(m => m.Id == flakyId);
            Assert.Equal(EmailOutboxStatus.Sent, recovered.Status);
            Assert.Null(recovered.EncryptedPayload);
        }
    }

    [Fact]
    public async Task BulkImport_OutboxIsolation_OneFailureDoesNotBlockOtherDeliveries()
    {
        var sender = new SelectiveEmailSender();
        sender.FailRecipients.Add("bad.bulk@sistec.ac.in");

        var factory = _factory.WithWebHostBuilder(b => b.ConfigureTestServices(s =>
        {
            s.RemoveAll<IEmailSender>();
            s.AddSingleton<IEmailSender>(sender);
        }));

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var outbox = scope.ServiceProvider.GetRequiredService<IEmailOutboxService>();
            outbox.QueueAccountActivation("bad.bulk@sistec.ac.in", "Bad Bulk", "tok_bad", DateTime.UtcNow.AddHours(24), null, $"b1-{Guid.NewGuid():N}");
            outbox.QueueAccountActivation("good1.bulk@sistec.ac.in", "Good 1", "tok_g1", DateTime.UtcNow.AddHours(24), null, $"b2-{Guid.NewGuid():N}");
            outbox.QueueAccountActivation("good2.bulk@sistec.ac.in", "Good 2", "tok_g2", DateTime.UtcNow.AddHours(24), null, $"b3-{Guid.NewGuid():N}");
            await db.SaveChangesAsync();

            var worker = new EmailOutboxWorker(
                scope.ServiceProvider.GetRequiredService<IServiceScopeFactory>(),
                scope.ServiceProvider.GetRequiredService<IConfiguration>(),
                scope.ServiceProvider.GetRequiredService<EmailOutboxMetrics>(),
                NullLogger<EmailOutboxWorker>.Instance);

            var claimed = await worker.ProcessPendingBatchAsync(CancellationToken.None);
            Assert.Equal(3, claimed);
        }

        Assert.Contains(sender.Delivered, d => d.Email == "good1.bulk@sistec.ac.in" && d.Secret == "tok_g1");
        Assert.Contains(sender.Delivered, d => d.Email == "good2.bulk@sistec.ac.in" && d.Secret == "tok_g2");
        Assert.DoesNotContain(sender.Delivered, d => d.Email == "bad.bulk@sistec.ac.in");
    }

    [Fact]
    public async Task Worker_WithLocalSmtpSink_TransmitsAllThreeEmailTypes()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;

        var received = new List<string>();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));

        var serverTask = Task.Run(async () =>
        {
            for (int i = 0; i < 3; i++)
            {
                using var tcp = await listener.AcceptTcpClientAsync(cts.Token);
                using var stream = tcp.GetStream();
                using var reader = new StreamReader(stream, Encoding.ASCII);
                using var writer = new StreamWriter(stream, Encoding.ASCII) { AutoFlush = true, NewLine = "\r\n" };

                await writer.WriteLineAsync("220 localhost ESMTP Sink");
                var body = new StringBuilder();
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
                            received.Add(body.ToString().Replace("=\r\n", "").Replace("=3D", "="));
                            await writer.WriteLineAsync("250 OK");
                        }
                        else body.AppendLine(line);
                        continue;
                    }
                    if (line.StartsWith("EHLO", StringComparison.OrdinalIgnoreCase) || line.StartsWith("HELO", StringComparison.OrdinalIgnoreCase))
                        await writer.WriteLineAsync("250 localhost");
                    else if (line.Equals("DATA", StringComparison.OrdinalIgnoreCase))
                    {
                        inData = true;
                        await writer.WriteLineAsync("354 End data");
                    }
                    else if (line.Equals("QUIT", StringComparison.OrdinalIgnoreCase))
                    {
                        await writer.WriteLineAsync("221 Bye");
                        break;
                    }
                    else
                        await writer.WriteLineAsync("250 OK");
                }
            }
        }, cts.Token);

        var smtpConfig = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Email:Provider"] = "Smtp",
                ["Email:SmtpHost"] = "127.0.0.1",
                ["Email:SmtpPort"] = port.ToString(),
                ["Email:FromAddress"] = "noreply@colabex.in",
                ["Email:FromName"] = "Colabex Security",
                ["Email:EnableSsl"] = "false",
                ["Email:TimeoutSeconds"] = "10",
                ["Frontend:BaseUrl"] = "https://app.colabex.in"
            })
            .Build();

        var smtpFactory = _factory.WithWebHostBuilder(b => b.ConfigureTestServices(s =>
        {
            s.RemoveAll<IEmailSender>();
            s.AddScoped<IEmailSender>(sp => new SmtpEmailSender(
                smtpConfig,
                new StubHostEnvironment(Environments.Production),
                NullLogger<SmtpEmailSender>.Instance));
        }));

        using (var scope = smtpFactory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var outbox = scope.ServiceProvider.GetRequiredService<IEmailOutboxService>();

            outbox.QueuePasswordResetOtp("otp@sistec.ac.in", "OTP User", "135790", DateTime.UtcNow.AddMinutes(15), null, $"smtp-otp-{Guid.NewGuid():N}");
            outbox.QueueAccountActivation("act@sistec.ac.in", "Act User", "tok_smtp_01", DateTime.UtcNow.AddHours(24), null, $"smtp-act-{Guid.NewGuid():N}");
            outbox.QueueEmailChangeVerification("chg@sistec.ac.in", "Chg User", "246810", DateTime.UtcNow.AddMinutes(10), null, $"smtp-chg-{Guid.NewGuid():N}");
            await db.SaveChangesAsync();

            var worker = new EmailOutboxWorker(
                scope.ServiceProvider.GetRequiredService<IServiceScopeFactory>(),
                smtpConfig,
                scope.ServiceProvider.GetRequiredService<EmailOutboxMetrics>(),
                NullLogger<EmailOutboxWorker>.Instance);

            var count = await worker.ProcessPendingBatchAsync(cts.Token);
            Assert.Equal(3, count);
        }

        await serverTask;
        Assert.Equal(3, received.Count);
        Assert.Contains(received, m => m.Contains("135790") && m.Contains("15 minutes"));
        Assert.Contains(received, m => m.Contains("https://app.colabex.in/activate?email=act%40sistec.ac.in&token=tok_smtp_01") && m.Contains("24 hours"));
        Assert.Contains(received, m => m.Contains("246810") && m.Contains("10 minutes"));
    }

    [Fact]
    public async Task RequestEmailChange_EnforcesCooldown_And_RateLimit()
    {
        var superToken = await LoginTokenAsync(_client, "admin@projecthub.in");

        var firstReq = new HttpRequestMessage(HttpMethod.Post, "/api/account/request-email-change")
        {
            Content = JsonContent.Create(new { newEmail = $"new1.{Guid.NewGuid():N}@colabex.in" })
        };
        firstReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", superToken);
        var firstResp = await _client.SendAsync(firstReq);
        Assert.Equal(HttpStatusCode.OK, firstResp.StatusCode);

        // Immediate repeat triggers 30s cooldown (400)
        var secondReq = new HttpRequestMessage(HttpMethod.Post, "/api/account/request-email-change")
        {
            Content = JsonContent.Create(new { newEmail = $"new2.{Guid.NewGuid():N}@colabex.in" })
        };
        secondReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", superToken);
        var secondResp = await _client.SendAsync(secondReq);
        Assert.Equal(HttpStatusCode.BadRequest, secondResp.StatusCode);

        // Exhaust EmailChangeLimit (5 reqs/min -> 6th returns 429)
        HttpStatusCode lastStatus = HttpStatusCode.OK;
        for (int i = 0; i < 6; i++)
        {
            var req = new HttpRequestMessage(HttpMethod.Post, "/api/account/request-email-change")
            {
                Content = JsonContent.Create(new { newEmail = $"new{i}.{Guid.NewGuid():N}@colabex.in" })
            };
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", superToken);
            lastStatus = (await _client.SendAsync(req)).StatusCode;
            if (lastStatus == HttpStatusCode.TooManyRequests) break;
        }
        Assert.Equal(HttpStatusCode.TooManyRequests, lastStatus);
    }
}
