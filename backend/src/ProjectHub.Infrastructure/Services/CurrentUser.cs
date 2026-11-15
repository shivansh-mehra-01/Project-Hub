using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using ProjectHub.Application.Interfaces;

namespace ProjectHub.Infrastructure.Services;

/// <summary>
/// Resolves authenticated user identity from the ambient HttpContext claims.
/// </summary>
public class CurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUser(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? Principal => _httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated == true;

    public Guid? UserId
    {
        get
        {
            var raw = Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                      ?? Principal?.FindFirst("sub")?.Value;
            return Guid.TryParse(raw, out var id) ? id : null;
        }
    }

    public string? Email => Principal?.FindFirst(ClaimTypes.Email)?.Value 
                            ?? Principal?.FindFirst("email")?.Value;

    public string? Role => Principal?.FindFirst(ClaimTypes.Role)?.Value 
                           ?? Principal?.FindFirst("role")?.Value;

    public bool IsSuperAdmin
    {
        get
        {
            var claim = Principal?.FindFirst("is_super_admin")?.Value;
            return bool.TryParse(claim, out var isSuper) && isSuper;
        }
    }

    public bool IsProjectCoordinator
    {
        get
        {
            var claim = Principal?.FindFirst("is_coordinator")?.Value;
            return bool.TryParse(claim, out var isCoord) && isCoord;
        }
    }
}

