using ProjectHub.Domain.Enums;

namespace ProjectHub.Application.Interfaces;

/// <summary>
/// Scoped container providing tenant and execution context for the current request.
/// Populated exclusively by server-side JWT middleware.
/// </summary>
public interface ITenantContext
{
    Guid? CollegeId { get; set; }
    Guid? DepartmentId { get; set; }
    Guid? UserId { get; set; }
    UserRole Role { get; set; }
    bool IsSuperAdmin { get; set; }
    bool IsProjectCoordinator { get; set; }
    bool IsTrustedSystemSeeder { get; set; }
    bool IsAuthLookup { get; set; }
    bool HasTenant => CollegeId.HasValue && CollegeId.Value != Guid.Empty;
}
