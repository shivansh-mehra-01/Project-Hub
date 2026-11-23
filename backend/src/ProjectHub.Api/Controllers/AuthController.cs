using System.Security.Cryptography;
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
    private readonly IEmailSender _emailSender;
    private readonly IWebHostEnvironment _environment;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        ProjectHubDbContext context,
        IJwtTokenService jwtTokenService,
        IEmailSender emailSender,
        IWebHostEnvironment environment,
        ITenantContext tenantContext,
        ILogger<AuthController> logger)
    {
        _context = context;
        _jwtTokenService = jwtTokenService;
        _emailSender = emailSender;
        _environment = environment;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// Resolves college tenant by user institutional email domain (e.g. sistec.ac.in -> SISTec Bhopal).
    /// </summary>
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

        if (!user.IsActivated || string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            return BadRequest(new { message = "Account password not set yet. Click 'Forgot password?' to set your password." });
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
        user.PasswordResetOtpHashed = null;
        user.PasswordResetOtpExpiresAtUtc = null;
        await _context.SaveChangesAsync();

        return Ok(new AuthResponse
        {
            Token = token,
            ExpiresAtUtc = expiresAtUtc,
            User = MapUserProfile(user)
        });
    }

    /// <summary>
    /// Generates a 6-digit verification OTP valid for 10 minutes to set or reset institutional password.
    /// </summary>
    [HttpPost("request-password-otp")]
    [AllowAnonymous]
    [ProducesResponseType<RequestPasswordOtpResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RequestPasswordOtp([FromBody] RequestPasswordOtpRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
        {
            return BadRequest(new { message = "A valid college email address is required." });
        }

        var email = request.Email.Trim().ToLowerInvariant();

        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.College)
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted);

        if (user == null)
        {
            return NotFound(new { message = "No registered user account found for this institutional email address." });
        }

        if (user.College != null && !user.College.IsActive)
        {
            return BadRequest(new { message = "Campus workspace subscription is inactive or suspended. Contact your college administration." });
        }

        // Throttle rapid duplicate requests within 30-second cooldown window
        if (user.PasswordResetOtpExpiresAtUtc.HasValue && user.PasswordResetOtpExpiresAtUtc.Value > DateTime.UtcNow)
        {
            var issuedAtUtc = user.PasswordResetOtpExpiresAtUtc.Value.AddMinutes(-10);
            var elapsed = DateTime.UtcNow - issuedAtUtc;
            if (elapsed < TimeSpan.FromSeconds(30))
            {
                var remainingSeconds = Math.Max(1, (int)Math.Ceiling((TimeSpan.FromSeconds(30) - elapsed).TotalSeconds));
                return BadRequest(new { message = $"Please wait {remainingSeconds} seconds before requesting another verification code." });
            }
        }

        // Generate cryptographically secure 6-digit OTP
        var otpNumber = RandomNumberGenerator.GetInt32(100000, 1000000);
        var otp = otpNumber.ToString("D6");

        _tenantContext.CollegeId = user.CollegeId;
        user.PasswordResetOtpHashed = PasswordHelper.HashPassword(otp);
        user.PasswordResetOtpExpiresAtUtc = DateTime.UtcNow.AddMinutes(10);

        await _context.SaveChangesAsync();

        _logger.LogInformation("======================================================================");
        _logger.LogInformation("[CAMPUS NOTIFICATION] Dispatched 6-digit Password Reset OTP for {Email}: {Otp}", email, otp);
        _logger.LogInformation("======================================================================");

        await _emailSender.SendPasswordResetOtpAsync(user.Email, user.FullName, otp);

        string? devOtp = _environment.IsDevelopment() ? otp : null;

        return Ok(new RequestPasswordOtpResponse
        {
            Success = true,
            Message = "A 6-digit verification code has been dispatched to your institutional email. Code expires in 10 minutes.",
            DevOtp = devOtp
        });
    }

    /// <summary>
    /// Verifies the 6-digit OTP, updates the user's password, activates the account, and returns signed JWT Bearer Token.
    /// </summary>
    [HttpPost("reset-password")]
    [AllowAnonymous]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Otp) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new { message = "Email, OTP, and new password are required." });
        }

        if (request.NewPassword.Length < 8)
        {
            return BadRequest(new { message = "Password must be at least 8 characters in length." });
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var otp = request.Otp.Trim();

        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.College)
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted);

        if (user == null)
        {
            return NotFound(new { message = "No registered user account found for this institutional email address." });
        }

        if (user.College != null && !user.College.IsActive)
        {
            return BadRequest(new { message = "Campus workspace subscription is inactive or suspended. Contact your college administration." });
        }

        if (!user.PasswordResetOtpExpiresAtUtc.HasValue || user.PasswordResetOtpExpiresAtUtc.Value < DateTime.UtcNow)
        {
            user.PasswordResetOtpHashed = null;
            user.PasswordResetOtpExpiresAtUtc = null;
            await _context.SaveChangesAsync();
            return BadRequest(new { message = "Verification code has expired or is invalid. Please request a new code." });
        }

        if (!PasswordHelper.VerifyPassword(otp, user.PasswordResetOtpHashed))
        {
            return BadRequest(new { message = "Invalid verification code. Please check the 6-digit code sent to your email." });
        }

        _tenantContext.CollegeId = user.CollegeId;
        user.PasswordHash = PasswordHelper.HashPassword(request.NewPassword);
        user.IsActivated = true;
        user.IsActive = true;
        user.PasswordResetOtpHashed = null;
        user.PasswordResetOtpExpiresAtUtc = null;
        user.PasswordChangedAtUtc = DateTime.UtcNow;
        user.LastLoginAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var token = _jwtTokenService.GenerateToken(user, out var expiresAtUtc);

        _tenantContext.UserId = user.Id;
        _tenantContext.Role = user.Role;
        if (user.Role == UserRole.SuperAdmin)
        {
            _tenantContext.IsSuperAdmin = true;
        }

        _logger.LogInformation("Password established and account activated for {Email} ({Role})", user.Email, user.Role);

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
            JiraKey = user.JiraKey,
            MustChangePassword = user.PasswordChangedAtUtc == null
        };
    }
}
