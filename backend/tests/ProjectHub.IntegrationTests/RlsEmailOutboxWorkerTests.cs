using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Interceptors;
using ProjectHub.Infrastructure.Persistence;
using ProjectHub.Infrastructure.Services;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class RlsEmailOutboxWorkerTests
{
    private const string AdminConnStr = "Host=localhost;Port=5432;Database=projecthub_db;Username=postgres;Password=postgres";
    private const string AppConnStr = "Host=localhost;Port=5432;Database=projecthub_db;Username=colabex_rls_app;Password=ColabexRlsTest!2026";

    private sealed class NoopEmailSender : IEmailSender
    {
        public int SentCount { get; private set; }
        public Task SendPasswordResetOtpAsync(string toEmail, string fullName, string otp, CancellationToken cancellationToken = default)
        {
            SentCount++;
            return Task.CompletedTask;
        }
        public Task SendAccountActivationAsync(string toEmail, string fullName, string activationUrl, CancellationToken cancellationToken = default)
        {
            SentCount++;
            return Task.CompletedTask;
        }
        public Task SendEmailChangeVerificationAsync(string toEmail, string fullName, string verificationUrl, CancellationToken cancellationToken = default)
        {
            SentCount++;
            return Task.CompletedTask;
        }
    }

    private static async Task<bool> CanConnectPostgresAsync()
    {
        try
        {
            await using var conn = new NpgsqlConnection(AdminConnStr);
            await conn.OpenAsync();
            return true;
        }
        catch
        {
            return false;
        }
    }

    [Fact]
    public async Task EmailOutboxWorker_UnderRestrictedRlsRole_ClaimsAndDeliversCrossTenantMessage()
    {
        if (!await CanConnectPostgresAsync())
        {
            return;
        }

        await using (var adminConn = new NpgsqlConnection(AdminConnStr))
        {
            await adminConn.OpenAsync();
            await using var roleCmd = adminConn.CreateCommand();
            roleCmd.CommandText = """
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'colabex_rls_app') THEN
                        CREATE ROLE colabex_rls_app LOGIN PASSWORD 'ColabexRlsTest!2026' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
                        GRANT USAGE ON SCHEMA public TO colabex_rls_app;
                        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO colabex_rls_app;
                        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO colabex_rls_app;
                    END IF;
                END $$;
                """;
            await roleCmd.ExecuteNonQueryAsync();
        }

        var sender = new NoopEmailSender();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDataProtection();
        services.AddSingleton<IConfiguration>(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Email:Worker:BatchSize"] = "10",
            ["Email:Worker:MaxConcurrency"] = "1",
            ["Email:Worker:LeaseSeconds"] = "30"
        }).Build());
        services.AddScoped<ITenantContext, TenantContext>();
        services.AddScoped<TenantRlsConnectionInterceptor>();
        services.AddDbContext<ProjectHubDbContext>((sp, opts) =>
            opts.UseNpgsql(AppConnStr)
                .AddInterceptors(sp.GetRequiredService<TenantRlsConnectionInterceptor>()));
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<ProjectHubDbContext>());
        services.AddScoped<IEmailOutboxService, EmailOutboxService>();
        services.AddSingleton<IEmailSender>(sender);
        services.AddSingleton<EmailOutboxMetrics>();

        using var provider = services.BuildServiceProvider();

        string recipientEmail = $"rls-worker-{Guid.NewGuid():N}@example.edu";
        using (var seedScope = provider.CreateScope())
        {
            var tc = seedScope.ServiceProvider.GetRequiredService<ITenantContext>();
            tc.IsAuthLookup = true;
            var db = seedScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var outbox = seedScope.ServiceProvider.GetRequiredService<IEmailOutboxService>();

            outbox.QueuePasswordResetOtp(
                recipientEmail,
                "RLS Test User",
                "123456",
                DateTime.UtcNow.AddMinutes(10),
                Guid.NewGuid());
            await db.SaveChangesAsync();
        }

        Guid msgId = Guid.Empty;
        using (var lookupScope = provider.CreateScope())
        {
            lookupScope.ServiceProvider.GetRequiredService<ITenantContext>().IsAuthLookup = true;
            var db = lookupScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            msgId = (await db.EmailOutboxMessages.IgnoreQueryFilters().FirstAsync(m => m.RecipientEmail == recipientEmail)).Id;
        }

        try
        {
            var worker = new EmailOutboxWorker(
                provider.GetRequiredService<IServiceScopeFactory>(),
                provider.GetRequiredService<IConfiguration>(),
                provider.GetRequiredService<EmailOutboxMetrics>(),
                NullLogger<EmailOutboxWorker>.Instance);

            var processed = await worker.ProcessPendingBatchAsync(CancellationToken.None);
            Assert.True(processed >= 1);
            Assert.True(sender.SentCount >= 1);

            using var verifyScope = provider.CreateScope();
            verifyScope.ServiceProvider.GetRequiredService<ITenantContext>().IsAuthLookup = true;
            var db = verifyScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var updated = await db.EmailOutboxMessages.IgnoreQueryFilters().FirstOrDefaultAsync(m => m.Id == msgId);
            Assert.NotNull(updated);
            Assert.Equal(EmailOutboxStatus.Sent, updated.Status);
        }
        finally
        {
            using var cleanupScope = provider.CreateScope();
            cleanupScope.ServiceProvider.GetRequiredService<ITenantContext>().IsAuthLookup = true;
            var db = cleanupScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var entity = await db.EmailOutboxMessages.IgnoreQueryFilters().FirstOrDefaultAsync(m => m.Id == msgId);
            if (entity != null)
            {
                db.EmailOutboxMessages.Remove(entity);
                await db.SaveChangesAsync();
            }
        }
    }
}
