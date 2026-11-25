using System.Security.Claims;

namespace ProjectHub.Application.Interfaces;

/// <summary>
/// Validates active JWT sessions, security stamps, and handles cryptographic session revocation.
/// </summary>
public interface ISessionSecurityService
{
    Task<(bool IsValid, string? FailureReason)> ValidateAccessTokenAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default);
    Task MarkSessionActiveAsync(string sessionId, Guid userId, DateTime expiresAtUtc, CancellationToken cancellationToken = default);
    Task RevokeSessionAsync(string sessionId, string reason, CancellationToken cancellationToken = default);
    Task RevokeAllUserSessionsAsync(Guid userId, string? exceptSessionId, string reason, CancellationToken cancellationToken = default);
    Task RevokeTokenFamilyAsync(string tokenFamilyId, string reason, CancellationToken cancellationToken = default);
}
