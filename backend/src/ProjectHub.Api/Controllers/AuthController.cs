using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectHub.Application.Common.Models;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
using ProjectHub.Infrastructure.Security;

namespace ProjectHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ProjectHubDbContext _context;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        ProjectHubDbContext context,
        IJwtTokenService jwtTokenService,
        ITenantContext tenantContext,
        ILogger<AuthController> logger)
    {
        _context = context;
        _jwtTokenService = jwtTokenService;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// Resolves college tenant by user institutional email domain (e.g. sistec.ac.in -> SISTec Bhopal).
    /// </summary>
    [HttpGet("resolve-tenant")]
    [AllowAnonymous]
    [ProducesResponseType<ResolveTenantResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ResolveTenant([FromQuery] string email)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            return Ok(new ResolveTenantResponse
            {
                Resolved = false,
                Message = "Please enter a valid institutional email address."
            });
        }

        var domain = email.Split('@').Last().Trim().ToLowerInvariant();

        var tenant = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.SsoDomain == domain && t.IsActive && !t.IsDeleted);

        if (tenant == null)
        {
            return Ok(new ResolveTenantResponse
            {
                Resolved = false,
                Message = $"No institutional workspace registered for domain '@{domain}'."
            });
        }

        return Ok(new ResolveTenantResponse
        {
            Resolved = true,
            CollegeId = tenant.Id,
            Name = tenant.Name,
            TenantCode = tenant.TenantCode,
            SsoDomain = tenant.SsoDomain,
            CrestUrl = tenant.CrestUrl
        });
    }

    /// <summary>
    /// Standard password login returning signed JWT Bearer Token.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Unauthorized(new { message = "Email and password are required." });
        }

        var email = request.Email.Trim().ToLowerInvariant();

        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.College)
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted);

        if (user == null || !user.IsActive)
        {
            return Unauthorized(new { message = "Invalid email credentials or account is inactive." });
        }

        if (!PasswordHelper.VerifyPassword(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var token = _jwtTokenService.GenerateToken(user, out var expiresAtUtc);

        _tenantContext.CollegeId = user.CollegeId;
        _tenantContext.UserId = user.Id;
        _tenantContext.Role = user.Role;
        if (user.Role == UserRole.SuperAdmin)
        {
            _tenantContext.IsSuperAdmin = true;
        }

        user.LastLoginAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new AuthResponse
        {
            Token = token,
            ExpiresAtUtc = expiresAtUtc,
            User = MapUserProfile(user)
        });
    }

    /// <summary>
    /// Activates a pre-provisioned user account using Email + Enrollment/Employee code and establishes password.
    /// </summary>
    [HttpPost("activate")]
    [AllowAnonymous]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Activate([FromBody] ActivateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.EnrollmentOrEmployeeCode) ||
            string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new { message = "Email, identification code, and new password are required." });
        }

        if (request.NewPassword.Length < 6)
        {
            return BadRequest(new { message = "Password must be at least 6 characters long." });
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var code = request.EnrollmentOrEmployeeCode.Trim().ToUpperInvariant();

        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.College)
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Email == email && u.EnrollmentOrEmployeeCode == code && !u.IsDeleted);

        if (user == null)
        {
            return NotFound(new { message = "No matching account found for the provided email and registration code." });
        }

        _tenantContext.CollegeId = user.CollegeId;
        _tenantContext.UserId = user.Id;
        _tenantContext.Role = user.Role;

        user.PasswordHash = PasswordHelper.HashPassword(request.NewPassword);
        user.IsActivated = true;
        user.IsActive = true;
        user.LastLoginAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var token = _jwtTokenService.GenerateToken(user, out var expiresAtUtc);

        return Ok(new AuthResponse
        {
            Token = token,
            ExpiresAtUtc = expiresAtUtc,
            User = MapUserProfile(user)
        });
    }

    private static UserProfileDto MapUserProfile(UserAccount user)
    {
        return new UserProfileDto
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role,
            IsProjectCoordinator = user.IsProjectCoordinator,
            CollegeId = user.CollegeId,
            CollegeName = user.College?.Name,
            DepartmentId = user.DepartmentId,
            DepartmentName = user.Department?.Name,
            EnrollmentOrEmployeeCode = user.EnrollmentOrEmployeeCode,
            GitHubHandle = user.GitHubHandle,
            JiraKey = user.JiraKey
        };
    }
}
