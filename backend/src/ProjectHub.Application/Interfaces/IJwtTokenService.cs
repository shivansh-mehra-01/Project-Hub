using ProjectHub.Domain.Entities;

namespace ProjectHub.Application.Interfaces;

public interface IJwtTokenService
{
    string GenerateToken(UserAccount user, out DateTime expiresAtUtc);
}
