using System.Security.Claims;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Api.Middleware;

/// <summary>
/// Resolves tenant and execution context per request.
/// Strictly enforces verified JWT claims for authenticated requests:
/// college_id, department_id, sub/user_id, role, is_super_admin, and is_coordinator.
/// Unauthenticated pre-login endpoints fall back to X-College-Id header solely for institutional discovery.
/// </summary>
public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantResolutionMiddleware> _logger;

    public TenantResolutionMiddleware(RequestDelegate next, ILogger<TenantResolutionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext)
    {
        if (context.User?.Identity?.IsAuthenticated == true)
        {
            var user = context.User;

            // 1. CollegeId (Tenant Partition)
            var collegeIdClaim = user.FindFirst("college_id")?.Value;
            if (!string.IsNullOrWhiteSpace(collegeIdClaim) && Guid.TryParse(collegeIdClaim, out var collegeId))
            {
                tenantContext.CollegeId = collegeId;
            }
            else
            {
                tenantContext.CollegeId = null;
            }

            // 2. DepartmentId
            var deptIdClaim = user.FindFirst("department_id")?.Value ?? user.FindFirst("dept_id")?.Value;
            if (!string.IsNullOrWhiteSpace(deptIdClaim) && Guid.TryParse(deptIdClaim, out var deptId))
            {
                tenantContext.DepartmentId = deptId;
            }
            else
            {
                tenantContext.DepartmentId = null;
            }

            // 3. UserId
            var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                              ?? user.FindFirst("sub")?.Value 
                              ?? user.FindFirst("user_id")?.Value;
            if (!string.IsNullOrWhiteSpace(userIdClaim) && Guid.TryParse(userIdClaim, out var userId))
            {
                tenantContext.UserId = userId;
            }

            // 4. Role
            var roleClaim = user.FindFirst(ClaimTypes.Role)?.Value ?? user.FindFirst("role")?.Value;
            if (!string.IsNullOrWhiteSpace(roleClaim) && Enum.TryParse<UserRole>(roleClaim, ignoreCase: true, out var role))
            {
                tenantContext.Role = role;
            }

            // 5. IsSuperAdmin
            var isSuperAdminClaim = user.FindFirst("is_super_admin")?.Value;
            if (bool.TryParse(isSuperAdminClaim, out var isSuper) && isSuper)
            {
                tenantContext.IsSuperAdmin = true;
            }
            else if (tenantContext.Role == UserRole.SuperAdmin)
            {
                tenantContext.IsSuperAdmin = true;
            }

            // 6. IsProjectCoordinator
            var isCoordClaim = user.FindFirst("is_coordinator")?.Value;
            if (bool.TryParse(isCoordClaim, out var isCoord) && isCoord)
            {
                tenantContext.IsProjectCoordinator = true;
            }
        }
        else
        {
            // Fail closed for unauthenticated requests: never trust client-supplied X-College-Id headers
            tenantContext.CollegeId = null;
            tenantContext.DepartmentId = null;
            tenantContext.UserId = null;
            tenantContext.IsSuperAdmin = false;
            tenantContext.IsProjectCoordinator = false;
        }

        await _next(context);
    }
}

public static class TenantResolutionMiddlewareExtensions
{
    public static IApplicationBuilder UseTenantResolution(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<TenantResolutionMiddleware>();
    }
}
