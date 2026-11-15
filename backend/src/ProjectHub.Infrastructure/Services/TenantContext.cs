using ProjectHub.Application.Interfaces;

namespace ProjectHub.Infrastructure.Services;

/// <summary>
/// Scoped container holding the tenant CollegeId for the current request context.
/// Populated by TenantResolutionMiddleware.
/// </summary>
public class TenantContext : ITenantContext
{
    public Guid? CollegeId { get; set; }
}

