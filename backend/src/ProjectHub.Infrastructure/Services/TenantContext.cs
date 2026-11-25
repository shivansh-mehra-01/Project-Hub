using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Infrastructure.Services;

/// <summary>
/// Scoped container holding the tenant execution context for the current request.
/// Populated exclusively by server-side JWT middleware.
/// </summary>
public class TenantContext : ITenantContext
{
    public Guid? CollegeId { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? UserId { get; set; }
    public UserRole Role { get; set; } = UserRole.Student;
    public bool IsSuperAdmin { get; set; }
    public bool IsProjectCoordinator { get; set; }
    public bool IsTrustedSystemSeeder { get; set; }
    public bool IsAuthLookup { get; set; }
}
