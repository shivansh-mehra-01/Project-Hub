using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Infrastructure.Security;

/// <summary>
/// Issues signed short-lived JWT Bearer access tokens carrying tenant context, session ID, and security stamp.
/// </summary>
public class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(UserAccount user, out DateTime expiresAtUtc)
    {
        return GenerateToken(user, Guid.NewGuid().ToString("N"), out expiresAtUtc);
    }

    public string GenerateToken(UserAccount user, string sessionId, out DateTime expiresAtUtc)
    {
        var secret = _configuration["Jwt:Secret"];
        if (string.IsNullOrWhiteSpace(secret) || Encoding.UTF8.GetByteCount(secret) < 32)
        {
            throw new InvalidOperationException("Jwt:Secret is missing or shorter than 32 bytes.");
        }

        var issuer = _configuration["Jwt:Issuer"] ?? throw new InvalidOperationException("Jwt:Issuer is not configured.");
        var audience = _configuration["Jwt:Audience"] ?? throw new InvalidOperationException("Jwt:Audience is not configured.");
        var expiryMinutes = _configuration.GetValue<int?>("Jwt:ExpiryMinutes") ?? 15;
        if (expiryMinutes <= 0 || expiryMinutes > 60)
        {
            expiryMinutes = 15;
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        expiresAtUtc = DateTime.UtcNow.AddMinutes(expiryMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new("sid", sessionId),
            new("security_stamp", user.SecurityStamp ?? string.Empty),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Name, user.FullName),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role.ToString()),
            new("role", user.Role.ToString()),
            new("college_id", user.CollegeId.ToString()),
            new("is_super_admin", (user.Role == UserRole.SuperAdmin).ToString().ToLowerInvariant()),
            new("is_coordinator", user.IsProjectCoordinator.ToString().ToLowerInvariant()),
            new("enrollment_code", user.EnrollmentOrEmployeeCode)
        };

        if (user.DepartmentId.HasValue)
        {
            claims.Add(new Claim("department_id", user.DepartmentId.Value.ToString()));
            claims.Add(new Claim("dept_id", user.DepartmentId.Value.ToString()));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expiresAtUtc,
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = credentials
        };

        var handler = new JwtSecurityTokenHandler();
        var token = handler.CreateToken(tokenDescriptor);
        return handler.WriteToken(token);
    }
}
