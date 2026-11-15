namespace ProjectHub.Application.Interfaces;

/// <summary>
/// Scoped service providing identity context of the authenticated user.
/// </summary>
public interface ICurrentUser
{
    Guid? UserId { get; }
    string? Email { get; }
    string? Role { get; }
    bool IsAuthenticated { get; }
    bool IsSuperAdmin { get; }
    bool IsProjectCoordinator { get; }
}

