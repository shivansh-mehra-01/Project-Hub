using ProjectHub.Application.Interfaces;

namespace ProjectHub.Api.Middleware;

/// <summary>
/// Resolves tenant context per request.
/// Strictly enforces verified JWT college_id claims for authenticated endpoints,
/// allowing X-College-Id header fallback ONLY on unauthenticated pre-login endpoints.
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
            // Authenticated endpoint: Enforce college_id strictly from verified JWT claim
            var collegeIdClaim = context.User.FindFirst("college_id")?.Value;

            if (!string.IsNullOrWhiteSpace(collegeIdClaim) && Guid.TryParse(collegeIdClaim, out var collegeId))
            {
                tenantContext.CollegeId = collegeId;
            }
            else
            {
                // User may be a SuperAdmin or have no tenant binding
                tenantContext.CollegeId = null;
            }
        }
        else
        {
            // Unauthenticated pre-login endpoint: Allow X-College-Id header fallback
            if (context.Request.Headers.TryGetValue("X-College-Id", out var headerValue) &&
                Guid.TryParse(headerValue.ToString(), out var headerCollegeId))
            {
                tenantContext.CollegeId = headerCollegeId;
            }
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

