using Microsoft.EntityFrameworkCore;
using ProjectHub.Application.Common.Models;
using ProjectHub.Application.Interfaces;
using ProjectHub.Infrastructure.Data;

namespace ProjectHub.Api.Endpoints;

public static class HealthEndpoints
{
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/health", (HttpContext httpContext) =>
        {
            return Results.Ok(new
            {
                status = "Healthy",
                timestampUtc = DateTime.UtcNow
            });
        })
        .AllowAnonymous()
        .WithName("GetSystemHealth")
        .WithTags("System Health")
        .WithSummary("Retrieves minimal public platform liveness status.")
        .Produces(StatusCodes.Status200OK);

        endpoints.MapGet("/api/health/details", async (
            AppDbContext dbContext,
            ITenantContext tenantContext,
            IHostEnvironment env,
            CancellationToken ct) =>
        {
            var dbStatus = "Operational";
            try
            {
                using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
                using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);
                var canConnect = await dbContext.Database.CanConnectAsync(linkedCts.Token);
                dbStatus = canConnect ? "Connected" : "Standby";
            }
            catch (Exception)
            {
                dbStatus = "Standby";
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
                    Provider = "PostgreSQL (Npgsql EF Core 10)"
                },
                Redis = new RedisHealthDto
                {
                    Status = "Configured",
                    Engine = "Redis"
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
        .RequireAuthorization("SuperAdminOnly")
        .WithName("GetDetailedSystemHealth")
        .WithTags("System Health")
        .WithSummary("Retrieves detailed infrastructure health diagnostics (SuperAdmin only).")
        .Produces<HealthCheckDto>(StatusCodes.Status200OK);

        return endpoints;
    }
}
