using Microsoft.EntityFrameworkCore;
using ProjectHub.Application.Interfaces;
using ProjectHub.Infrastructure.Persistence;

namespace ProjectHub.Infrastructure.Data;

/// <summary>
/// Alias for ProjectHubDbContext ensuring full backwards compatibility across application services and tests.
/// </summary>
public class AppDbContext : ProjectHubDbContext
{
    public AppDbContext(
        DbContextOptions<AppDbContext> options,
        ITenantContext tenantContext) : base(options, tenantContext)
    {
    }
}
