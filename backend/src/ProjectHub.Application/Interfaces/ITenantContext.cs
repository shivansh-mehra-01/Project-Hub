namespace ProjectHub.Application.Interfaces;

/// <summary>
/// Scoped service providing tenant context for the active request.
/// </summary>
public interface ITenantContext
{
    Guid? CollegeId { get; set; }
    bool HasTenant => CollegeId.HasValue && CollegeId.Value != Guid.Empty;
}

