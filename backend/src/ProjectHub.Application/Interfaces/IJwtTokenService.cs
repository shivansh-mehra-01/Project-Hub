using ProjectHub.Domain.Entities;

namespace ProjectHub.Application.Interfaces;

/// <summary>
/// Service responsible for generating signed JWT Bearer access tokens.
/// </summary>
public interface IJwtTokenService
{
    string GenerateToken(UserAccount user, out DateTime expiresAtUtc);
    string GenerateToken(UserAccount user, string sessionId, out DateTime expiresAtUtc);
}
