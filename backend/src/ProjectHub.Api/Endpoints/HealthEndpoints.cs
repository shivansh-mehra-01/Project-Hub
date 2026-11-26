using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using ProjectHub.Application.Common.Models;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
using ProjectHub.Infrastructure.Security;
using ProjectHub.Infrastructure.Services;
using StackExchange.Redis;

namespace ProjectHub.Api.Endpoints;

public static class HealthEndpoints
{
    private static readonly DateTime ProcessStartUtc = Process.GetCurrentProcess().StartTime.ToUniversalTime();

    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/health", async (ProjectHubDbContext dbContext, CancellationToken ct) =>
        {
            var dbHealthy = false;
            try
            {
                using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
                using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);
                dbHealthy = await dbContext.Database.CanConnectAsync(linkedCts.Token);
            }
            catch
            {
                dbHealthy = false;
            }

            var status = dbHealthy ? "Healthy" : "Degraded";
            return Results.Ok(new
            {
                status,
                timestampUtc = DateTime.UtcNow
            });
        })
        .AllowAnonymous()
        .WithName("GetSystemHealth")
        .WithTags("System Health")
        .WithSummary("Retrieves minimal public platform liveness status.")
        .Produces(StatusCodes.Status200OK);

        endpoints.MapGet("/api/health/details", async (
            ProjectHubDbContext dbContext,
            ITenantContext tenantContext,
            IHostEnvironment env,
            IConfiguration configuration,
            IServiceProvider serviceProvider,
            CancellationToken ct) =>
        {
            // 1. PostgreSQL / Database Probe
            var dbHealth = new DatabaseHealthDto
            {
                Provider = dbContext.Database.IsNpgsql() ? "PostgreSQL (Npgsql EF Core 10)" : (dbContext.Database.ProviderName ?? "Relational")
            };

            var pendingMigrationsCount = 0;
            try
            {
                using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
                using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);
                var sw = Stopwatch.StartNew();
                var canConnect = dbContext.Database.IsRelational()
                    ? await dbContext.Database.CanConnectAsync(linkedCts.Token)
                    : await dbContext.CollegeTenants.IgnoreQueryFilters().AnyAsync(linkedCts.Token) || true;
                sw.Stop();
                dbHealth.LatencyMs = Math.Round(sw.Elapsed.TotalMilliseconds, 2);

                if (!canConnect)
                {
                    dbHealth.Status = "Unavailable";
                    dbHealth.Details = "Database connection check returned false.";
                }
                else
                {
                    if (dbContext.Database.IsNpgsql())
                    {
                        try
                        {
                            var pending = await dbContext.Database.GetPendingMigrationsAsync(linkedCts.Token);
                            pendingMigrationsCount = pending.Count();
                        }
                        catch (InvalidOperationException)
                        {
                            pendingMigrationsCount = 0;
                        }
                    }
                    dbHealth.PendingMigrations = pendingMigrationsCount;
                    if (pendingMigrationsCount > 0)
                    {
                        dbHealth.Status = "Degraded";
                        dbHealth.Details = $"{pendingMigrationsCount} pending database migration(s).";
                    }
                    else if (dbHealth.LatencyMs > 500)
                    {
                        dbHealth.Status = "Degraded";
                        dbHealth.Details = $"Elevated query latency ({dbHealth.LatencyMs} ms).";
                    }
                    else
                    {
                        dbHealth.Status = "Healthy";
                        dbHealth.Details = "Connected and responsive.";
                    }
                }
            }
            catch (Exception ex)
            {
                var logger = serviceProvider.GetService<ILoggerFactory>()?.CreateLogger("HealthEndpoints");
                logger?.LogError(ex, "Database health check failed.");
                dbHealth.Status = "Unavailable";
                dbHealth.Details = env.IsDevelopment() ? $"Database connectivity check failed: {ex.GetType().Name}: {ex.Message}" : "Database connectivity check failed.";
            }

            // 2. Redis Cache Probe
            var redisConn = configuration["Redis:ConnectionString"];
            var redisHealth = new RedisHealthDto { Engine = "Redis" };
            var redisMultiplexer = serviceProvider.GetService<IConnectionMultiplexer>();
            if (string.IsNullOrWhiteSpace(redisConn) || redisMultiplexer == null)
            {
                redisHealth.Status = "Unknown";
                redisHealth.Details = "Redis connection is not configured.";
            }
            else if (!redisMultiplexer.IsConnected)
            {
                redisHealth.Status = "Unavailable";
                redisHealth.Details = "Redis multiplexer is disconnected.";
            }
            else
            {
                try
                {
                    var sw = Stopwatch.StartNew();
                    var ping = await redisMultiplexer.GetDatabase().PingAsync();
                    sw.Stop();
                    redisHealth.LatencyMs = Math.Round(ping.TotalMilliseconds > 0 ? ping.TotalMilliseconds : sw.Elapsed.TotalMilliseconds, 2);
                    redisHealth.Status = redisHealth.LatencyMs > 250 ? "Degraded" : "Healthy";
                    redisHealth.Details = "PING succeeded.";
                }
                catch (Exception)
                {
                    redisHealth.Status = "Unavailable";
                    redisHealth.Details = "Redis PING command failed.";
                }
            }

            // 3. Email Delivery Provider Status (never expose secrets/credentials)
            var emailProvider = configuration["Email:Provider"] ?? string.Empty;
            var smtpHost = configuration["Email:SmtpHost"];
            var fromAddress = configuration["Email:FromAddress"];
            var emailHealth = new ComponentHealthDto { Provider = string.IsNullOrWhiteSpace(emailProvider) ? "Unconfigured" : emailProvider };
            if (string.Equals(emailProvider, "Smtp", StringComparison.OrdinalIgnoreCase))
            {
                if (!string.IsNullOrWhiteSpace(smtpHost) && !string.IsNullOrWhiteSpace(fromAddress))
                {
                    emailHealth.Status = "Healthy";
                    emailHealth.Details = "Transactional SMTP gateway configured.";
                }
                else
                {
                    emailHealth.Status = "Degraded";
                    emailHealth.Details = "SMTP provider selected but host or sender address is missing.";
                }
            }
            else if (string.Equals(emailProvider, "Development", StringComparison.OrdinalIgnoreCase))
            {
                emailHealth.Status = env.IsDevelopment() ? "Healthy" : "Degraded";
                emailHealth.Details = env.IsDevelopment()
                    ? "Development email logger active."
                    : "Development email provider active outside Development environment.";
            }
            else
            {
                emailHealth.Status = "Unknown";
                emailHealth.Details = "Email provider is not configured.";
            }

            if (dbHealth.Status != "Unavailable")
            {
                try
                {
                    var metrics = serviceProvider.GetService<EmailOutboxMetrics>();
                    var pendingCount = await dbContext.EmailOutboxMessages.IgnoreQueryFilters()
                        .CountAsync(m => !m.IsDeleted && m.Status == EmailOutboxStatus.Pending, ct);
                    var failedCount = await dbContext.EmailOutboxMessages.IgnoreQueryFilters()
                        .CountAsync(m => !m.IsDeleted && m.Status == EmailOutboxStatus.Failed, ct);

                    var workerStatus = metrics?.IsRunning == true ? "WorkerActive" : "WorkerStopped";
                    emailHealth.Details = $"{emailHealth.Details} Outbox: {workerStatus}, Pending={pendingCount}, Failed={failedCount}.";
                }
                catch
                {
                    // Outbox telemetry is best-effort
                }
            }

            // 4. Local / Artifact Storage Health
            var storageHealth = new ComponentHealthDto { Provider = "Application Storage" };
            try
            {
                var contentRoot = env.ContentRootPath;
                var rootPath = Path.GetPathRoot(contentRoot);
                if (!string.IsNullOrWhiteSpace(rootPath))
                {
                    var drive = new DriveInfo(rootPath);
                    if (drive.IsReady)
                    {
                        var freeGb = Math.Round(drive.AvailableFreeSpace / (1024.0 * 1024.0 * 1024.0), 2);
                        var totalGb = Math.Round(drive.TotalSize / (1024.0 * 1024.0 * 1024.0), 2);
                        storageHealth.Status = freeGb < 1.0 ? "Degraded" : "Healthy";
                        storageHealth.Details = $"{freeGb} GB free of {totalGb} GB.";
                    }
                    else
                    {
                        storageHealth.Status = "Unavailable";
                        storageHealth.Details = "Storage volume is not ready.";
                    }
                }
                else
                {
                    storageHealth.Status = "Unknown";
                    storageHealth.Details = "Unable to resolve storage volume.";
                }
            }
            catch
            {
                storageHealth.Status = "Unknown";
                storageHealth.Details = "Storage telemetry unavailable.";
            }

            // 5. Runtime Telemetry (safe DB counts when DB is reachable)
            var telemetry = new RuntimeTelemetryDto
            {
                PendingMigrationsCount = pendingMigrationsCount
            };

            if (dbHealth.Status != "Unavailable")
            {
                try
                {
                    var now = DateTime.UtcNow;
                    var cutoff24h = now.AddHours(-24);
                    telemetry.ActiveSessionsCount = await dbContext.UserSessions
                        .CountAsync(s => !s.IsRevoked && s.ExpiresAtUtc > now, ct);
                    telemetry.ActiveTenantsCount = await dbContext.CollegeTenants
                        .IgnoreQueryFilters()
                        .CountAsync(t => !t.IsDeleted && t.IsActive && t.TenantCode != SuperAdminBootstrapper.PlatformTenantCode, ct);
                    telemetry.FailedLoginsLast24h = await dbContext.PlatformAuditLogs
                        .IgnoreQueryFilters()
                        .CountAsync(l => !l.IsDeleted && l.OccurredAtUtc >= cutoff24h &&
                            (l.Action.Contains("Failed") || l.Action.Contains("Locked") || l.Action.Contains("Rate-Limited")), ct);
                }
                catch
                {
                    // Telemetry is best-effort
                }
            }

            // 6. Aggregate Overall Status
            string overallStatus;
            if (dbHealth.Status == "Unavailable")
            {
                overallStatus = "Unavailable";
            }
            else if (dbHealth.Status == "Degraded" ||
                     redisHealth.Status == "Unavailable" ||
                     redisHealth.Status == "Degraded" ||
                     emailHealth.Status == "Degraded" ||
                     storageHealth.Status == "Degraded" ||
                     storageHealth.Status == "Unavailable")
            {
                overallStatus = "Degraded";
            }
            else
            {
                overallStatus = "Healthy";
            }

            var response = new HealthCheckDto
            {
                Status = overallStatus,
                Environment = env.EnvironmentName,
                Version = "1.0.0",
                TimestampUtc = DateTime.UtcNow,
                UptimeSeconds = Math.Max(0, Math.Round((DateTime.UtcNow - ProcessStartUtc).TotalSeconds, 0)),
                Database = dbHealth,
                Redis = redisHealth,
                Email = emailHealth,
                Storage = storageHealth,
                Tenant = new TenantStatusDto
                {
                    Resolved = tenantContext.HasTenant,
                    CollegeId = tenantContext.CollegeId,
                    Mode = tenantContext.HasTenant ? "TenantScoped" : "Global"
                },
                Telemetry = telemetry
            };

            return Results.Ok(response);
        })
        .RequireAuthorization("SuperAdminOnly")
        .WithName("GetDetailedSystemHealth")
        .WithTags("System Health")
        .WithSummary("Retrieves detailed infrastructure health diagnostics (SuperAdmin only).")
        .Produces<HealthCheckDto>(StatusCodes.Status200OK);

        return endpoints;
    }
}
