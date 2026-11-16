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
/// Issues signed JWT Bearer tokens carrying tenant context and role claims.
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
        var secret = _configuration["Jwt:Secret"] ?? "ProjectHubSuperSecretDevKeyMinLength32CharactersRequired!";
        var issuer = _configuration["Jwt:Issuer"] ?? "https://api.projecthub.local";
        var audience = _configuration["Jwt:Audience"] ?? "https://app.projecthub.local";

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        expiresAtUtc = DateTime.UtcNow.AddDays(7);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
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
