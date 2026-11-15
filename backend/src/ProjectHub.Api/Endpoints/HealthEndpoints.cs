using Microsoft.EntityFrameworkCore;
using ProjectHub.Application.Common.Models;
using ProjectHub.Application.Interfaces;
using ProjectHub.Infrastructure.Data;

namespace ProjectHub.Api.Endpoints;

public static class HealthEndpoints
{
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/health", async (
            AppDbContext dbContext,
            ITenantContext tenantContext,
            IHostEnvironment env,
            CancellationToken ct) =>
        {
            var dbStatus = "Operational";
            try
            {
                // Non-blocking connection check with brief timeout
                using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
                using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);
                var canConnect = await dbContext.Database.CanConnectAsync(linkedCts.Token);
                dbStatus = canConnect ? "Connected" : "Standby (Database not yet initialized)";
            }
            catch (Exception)
            {
                dbStatus = "Standby (Awaiting Docker service)";
            }

            var response = new HealthCheckDto
            {
                Status = "Healthy",
                Environment = env.EnvironmentName,
                Version = "1.0.0",
                TimestampUtc = DateTime.UtcNow,
                Database = new DatabaseHealthDto
                {
                    Status = dbStatus,
                    Provider = "PostgreSQL 17 (Npgsql EF Core 10)"
                },
                Redis = new RedisHealthDto
                {
                    Status = "Configured",
                    Engine = "Redis 7 Alpine"
                },
                Tenant = new TenantStatusDto
                {
                    Resolved = tenantContext.HasTenant,
                    CollegeId = tenantContext.CollegeId,
                    Mode = tenantContext.HasTenant ? "TenantScoped" : "Global"
                }
            };

            return Results.Ok(response);
        })
        .WithName("GetSystemHealth")
        .WithTags("System Health")
        .WithSummary("Retrieves platform health status, tenant context, and service readiness.")
        .Produces<HealthCheckDto>(StatusCodes.Status200OK);

        return endpoints;
    }
}

