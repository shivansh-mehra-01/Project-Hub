using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
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
    private readonly ISessionSecurityService _sessionSecurity;
    private readonly IEmailSender _emailSender;
    private readonly IWebHostEnvironment _environment;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        ProjectHubDbContext context,
        IJwtTokenService jwtTokenService,
        ISessionSecurityService sessionSecurity,
        IEmailSender emailSender,
        IWebHostEnvironment environment,
        ITenantContext tenantContext,
        ILogger<AuthController> logger)
    {
        _context = context;
        _jwtTokenService = jwtTokenService;
        _sessionSecurity = sessionSecurity;
        _emailSender = emailSender;
        _environment = environment;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static string HashToken(string rawToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(bytes);
    }

    private static string GenerateOpaqueToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(48))
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');
    }

    private string GetClientIp() => HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

    private string GetUserAgent() => Request.Headers.UserAgent.ToString();

    private async Task<AuthResponse> CreateSessionAndTokensAsync(UserAccount user, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var sessionId = Guid.NewGuid().ToString("N");
        var tokenFamilyId = Guid.NewGuid().ToString("N");
        var rawRefreshToken = GenerateOpaqueToken();
        var refreshHash = HashToken(rawRefreshToken);
        var refreshExpiresAtUtc = now.AddDays(14);

        var ua = GetUserAgent();
        var session = new UserSession
        {
            Id = sessionId,
            UserId = user.Id,
            CollegeId = user.CollegeId,
            AccountEmail = user.Email,
            AccountName = user.FullName,
            Role = user.Role.ToString(),
            Device = ua.Contains("Mobile", StringComparison.OrdinalIgnoreCase) ? "Mobile Device" : "Web Browser",
            Browser = string.IsNullOrWhiteSpace(ua) ? "Unknown Client" : ua[..Math.Min(100, ua.Length)],
            IpAddress = GetClientIp(),
            Location = "Institutional Network",
            LoginTimeUtc = now,
            LastActiveTimeUtc = now,
            ExpiresAtUtc = refreshExpiresAtUtc,
            TokenFamilyId = tokenFamilyId,
            IsRevoked = false,
            TokenHash = refreshHash
        };

        var refreshRecord = new RefreshTokenRecord
        {
            Id = Guid.NewGuid(),
            SessionId = sessionId,
            UserId = user.Id,
            CollegeId = user.CollegeId,
            TokenFamilyId = tokenFamilyId,
            TokenHash = refreshHash,
            CreatedAtUtc = now,
            ExpiresAtUtc = refreshExpiresAtUtc
        };

        _context.UserSessions.Add(session);
        _context.RefreshTokenRecords.Add(refreshRecord);

        var accessToken = _jwtTokenService.GenerateToken(user, sessionId, out var expiresAtUtc);
        await _sessionSecurity.MarkSessionActiveAsync(sessionId, user.Id, expiresAtUtc, cancellationToken);

        return new AuthResponse
        {
            Token = accessToken,
            RefreshToken = rawRefreshToken,
            SessionId = sessionId,
            ExpiresAtUtc = expiresAtUtc,
            User = MapUserProfile(user)
        };
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("LoginLimit")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Unauthorized(new { message = "Email and password are required." });
        }

        var rawEmail = request.Email.Trim().ToLowerInvariant();
        var normalizedEmail = NormalizeEmail(request.Email);
        var reverseAlias = rawEmail == "collegeadmin@sistec.ac.in" ? "principal@sistec.ac.in" : normalizedEmail;
        _tenantContext.IsAuthLookup = true;

        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.College)
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => (u.Email == rawEmail || u.Email == normalizedEmail || u.Email == reverseAlias) && !u.IsDeleted, cancellationToken);

        if (user == null || !user.IsActive)
        {
            return Unauthorized(new { message = "Invalid email credentials or account is inactive." });
        }

        if (user.Role != UserRole.SuperAdmin && user.College != null && !user.College.IsActive)
        {
            return Unauthorized(new { message = "Institutional workspace subscription is inactive or suspended." });
        }

        if (user.LockoutEndUtc.HasValue && user.LockoutEndUtc.Value > DateTime.UtcNow)
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                message = "Account is temporarily locked due to repeated failed sign-in attempts. Please try again later."
            });
        }

        if (!user.IsActivated || string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            return BadRequest(new { message = "Account password not set yet. Click 'Forgot password?' to set your password." });
        }

        if (!PasswordHelper.VerifyPassword(request.Password, user.PasswordHash))
        {
            _tenantContext.CollegeId = user.CollegeId;
            user.AccessFailedCount++;
            if (user.AccessFailedCount >= 5)
            {
                user.LockoutEndUtc = DateTime.UtcNow.AddMinutes(15);
                user.AccessFailedCount = 0;
                _context.PlatformAuditLogs.Add(new PlatformAuditLog
                {
                    Id = Guid.NewGuid(),
                    ActorUserId = user.Id,
                    ActorEmail = user.Email,
                    Action = "Account Lockout Triggered",
                    TargetEntity = $"UserAccount: {user.Id}",
                    IpAddress = GetClientIp(),
                    OccurredAtUtc = DateTime.UtcNow,
                    MetadataJson = JsonSerializer.Serialize(new { reason = "MaxFailedLoginAttempts", lockoutMinutes = 15 })
                });
            }
            await _context.SaveChangesAsync(cancellationToken);
            return Unauthorized(new { message = "Invalid email or password." });
        }

        _tenantContext.CollegeId = user.CollegeId;
        _tenantContext.UserId = user.Id;
        _tenantContext.Role = user.Role;
        if (user.Role == UserRole.SuperAdmin)
        {
            _tenantContext.IsSuperAdmin = true;
        }

        user.AccessFailedCount = 0;
        user.LockoutEndUtc = null;
        user.LastLoginAtUtc = DateTime.UtcNow;
        user.PasswordResetOtpHashed = null;
        user.PasswordResetOtpExpiresAtUtc = null;

        if (user.MfaEnabled && !string.IsNullOrWhiteSpace(user.MfaSecret))
        {
            var challengeToken = GenerateMfaChallengeToken(user.Id);
            await _context.SaveChangesAsync(cancellationToken);
            return Ok(new AuthResponse
            {
                MfaRequired = true,
                MfaChallengeToken = challengeToken,
                User = MapUserProfile(user)
            });
        }

        var authResponse = await CreateSessionAndTokensAsync(user, cancellationToken);

        _context.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = user.Id,
            ActorEmail = user.Email,
            Action = "User Login Success",
            TargetEntity = $"Session: {authResponse.SessionId}",
            IpAddress = GetClientIp(),
            OccurredAtUtc = DateTime.UtcNow,
            MetadataJson = JsonSerializer.Serialize(new { role = user.Role.ToString(), collegeId = user.CollegeId })
        });

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(authResponse);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting("LoginLimit")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return Unauthorized(new { message = "Refresh token is required." });
        }

        var tokenHash = HashToken(request.RefreshToken.Trim());
        _tenantContext.IsAuthLookup = true;
        var existingRecord = await _context.RefreshTokenRecords
            .FirstOrDefaultAsync(r => r.TokenHash == tokenHash, cancellationToken);

        if (existingRecord == null)
        {
            return Unauthorized(new { message = "Invalid refresh token." });
        }

        // Reuse detection: if token was already rotated or revoked, revoke entire token family immediately
        if (existingRecord.UsedAtUtc.HasValue || existingRecord.RevokedAtUtc.HasValue)
        {
            await _sessionSecurity.RevokeTokenFamilyAsync(existingRecord.TokenFamilyId, "RefreshTokenReuseDetected", cancellationToken);
            _context.PlatformAuditLogs.Add(new PlatformAuditLog
            {
                Id = Guid.NewGuid(),
                ActorUserId = existingRecord.UserId,
                ActorEmail = existingRecord.UserId.ToString(),
                Action = "Refresh Token Reuse Detected",
                TargetEntity = $"TokenFamily: {existingRecord.TokenFamilyId}",
                IpAddress = GetClientIp(),
                OccurredAtUtc = DateTime.UtcNow,
                MetadataJson = JsonSerializer.Serialize(new { sessionId = existingRecord.SessionId, result = "FamilyRevoked" })
            });
            await _context.SaveChangesAsync(cancellationToken);
            return Unauthorized(new { message = "Refresh token reuse detected. Session family has been revoked." });
        }

        if (existingRecord.ExpiresAtUtc <= DateTime.UtcNow)
        {
            await _sessionSecurity.RevokeSessionAsync(existingRecord.SessionId, "RefreshTokenExpired", cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            return Unauthorized(new { message = "Refresh token has expired." });
        }

        var session = await _context.UserSessions
            .FirstOrDefaultAsync(s => s.Id == existingRecord.SessionId && s.UserId == existingRecord.UserId, cancellationToken);

        if (session == null || session.IsRevoked || session.ExpiresAtUtc <= DateTime.UtcNow)
        {
            return Unauthorized(new { message = "Session is no longer active." });
        }

        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.College)
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == existingRecord.UserId && !u.IsDeleted, cancellationToken);

        if (user == null || !user.IsActive || !user.IsActivated ||
            (user.Role != UserRole.SuperAdmin && user.College != null && !user.College.IsActive))
        {
            await _sessionSecurity.RevokeSessionAsync(session.Id, "UserInactiveOrSuspended", cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            return Unauthorized(new { message = "Account is inactive or suspended." });
        }

        var now = DateTime.UtcNow;
        var newRawRefresh = GenerateOpaqueToken();
        var newRefreshHash = HashToken(newRawRefresh);
        var newRefreshExpires = now.AddDays(14);

        existingRecord.UsedAtUtc = now;
        existingRecord.ReplacedByTokenHash = newRefreshHash;

        var rotatedRecord = new RefreshTokenRecord
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            UserId = user.Id,
            CollegeId = user.CollegeId,
            TokenFamilyId = existingRecord.TokenFamilyId,
            TokenHash = newRefreshHash,
            CreatedAtUtc = now,
            ExpiresAtUtc = newRefreshExpires
        };

        session.LastActiveTimeUtc = now;
        session.ExpiresAtUtc = newRefreshExpires;
        session.TokenHash = newRefreshHash;
        session.Role = user.Role.ToString();

        _context.RefreshTokenRecords.Add(rotatedRecord);

        var newAccessToken = _jwtTokenService.GenerateToken(user, session.Id, out var accessExpiresAtUtc);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new AuthResponse
        {
            Token = newAccessToken,
            RefreshToken = newRawRefresh,
            SessionId = session.Id,
            ExpiresAtUtc = accessExpiresAtUtc,
            User = MapUserProfile(user)
        });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var sid = User.FindFirst("sid")?.Value;
        var userIdRaw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        var email = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value ?? string.Empty;

        if (!string.IsNullOrWhiteSpace(sid))
        {
            await _sessionSecurity.RevokeSessionAsync(sid, "UserLogout", cancellationToken);
        }

        Guid.TryParse(userIdRaw, out var userId);
        _context.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = userId == Guid.Empty ? null : userId,
            ActorEmail = email,
            Action = "User Logged Out",
            TargetEntity = $"Session: {sid ?? "unknown"}",
            IpAddress = GetClientIp(),
            OccurredAtUtc = DateTime.UtcNow,
            MetadataJson = JsonSerializer.Serialize(new { result = "SessionRevoked" })
        });

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, message = "Session cleanly terminated." });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserProfileDto>> GetCurrentProfile(CancellationToken cancellationToken)
    {
        var userIdRaw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            return Unauthorized();
        }

        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.College)
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted && u.IsActive, cancellationToken);

        if (user == null)
        {
            return Unauthorized();
        }

        return Ok(MapUserProfile(user));
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] AuthChangePasswordRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword) ||
            string.IsNullOrWhiteSpace(request.NewPassword) ||
            string.IsNullOrWhiteSpace(request.ConfirmPassword))
        {
            return BadRequest(new { message = "Current password, new password, and confirmation are required." });
        }

        if (request.NewPassword != request.ConfirmPassword)
        {
            return BadRequest(new { message = "New password and confirmation password do not match." });
        }

        var complexityError = PasswordPolicyValidator.Validate(request.NewPassword);
        if (complexityError != null)
        {
            return BadRequest(new { message = complexityError });
        }

        var userIdRaw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            return Unauthorized();
        }

        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted && u.IsActive, cancellationToken);

        if (user == null)
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(user.PasswordHash) ||
            !PasswordHelper.VerifyPassword(request.CurrentPassword, user.PasswordHash))
        {
            return BadRequest(new { message = "Current password entered is incorrect." });
        }

        _tenantContext.CollegeId = user.CollegeId;
        user.PasswordHash = PasswordHelper.HashPassword(request.NewPassword);
        user.PasswordChangedAtUtc = DateTime.UtcNow;
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        user.UpdatedAtUtc = DateTime.UtcNow;

        var currentSid = User.FindFirst("sid")?.Value;
        if (request.RevokeOtherSessions)
        {
            await _sessionSecurity.RevokeAllUserSessionsAsync(user.Id, currentSid, "PasswordChanged", cancellationToken);
        }

        _context.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = user.Id,
            ActorEmail = user.Email,
            Action = "User Password Changed",
            TargetEntity = $"UserAccount: {user.Id}",
            IpAddress = GetClientIp(),
            OccurredAtUtc = DateTime.UtcNow,
            MetadataJson = JsonSerializer.Serialize(new { revokedOtherSessions = request.RevokeOtherSessions })
        });

        await _context.SaveChangesAsync(cancellationToken);

        // Issue fresh token reflecting new SecurityStamp if current session was kept
        string? newToken = null;
        DateTime? expiresAtUtc = null;
        if (!string.IsNullOrWhiteSpace(currentSid))
        {
            newToken = _jwtTokenService.GenerateToken(user, currentSid, out var exp);
            expiresAtUtc = exp;
        }

        return Ok(new
        {
            success = true,
            token = newToken,
            expiresAtUtc,
            passwordChangedAtUtc = user.PasswordChangedAtUtc,
            message = "Password updated successfully."
        });
    }

    [HttpGet("sessions")]
    [Authorize]
    public async Task<IActionResult> GetActiveSessions(CancellationToken cancellationToken)
    {
        var userIdRaw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            return Unauthorized();
        }

        var currentSid = User.FindFirst("sid")?.Value;
        var sessions = await _context.UserSessions
            .Where(s => s.UserId == userId && !s.IsRevoked && s.ExpiresAtUtc > DateTime.UtcNow)
            .OrderByDescending(s => s.LastActiveTimeUtc)
            .Select(s => new
            {
                s.Id,
                s.Device,
                s.Browser,
                s.IpAddress,
                s.Location,
                s.LoginTimeUtc,
                s.LastActiveTimeUtc,
                IsCurrentSession = s.Id == currentSid
            })
            .ToListAsync(cancellationToken);

        return Ok(sessions);
    }

    [HttpPost("sessions/{id}/revoke")]
    [Authorize]
    public async Task<IActionResult> RevokeSession(string id, CancellationToken cancellationToken)
    {
        var userIdRaw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            return Unauthorized();
        }

        var currentSid = User.FindFirst("sid")?.Value;
        if (id == currentSid)
        {
            return BadRequest(new { message = "Cannot revoke your current active session. Use logout instead." });
        }

        var session = await _context.UserSessions.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, cancellationToken);
        if (session == null)
        {
            return NotFound(new { message = "Session not found." });
        }

        await _sessionSecurity.RevokeSessionAsync(id, "UserRevokedSession", cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, revokedSessionId = id, message = "Session revoked successfully." });
    }

    [HttpPost("sessions/revoke-others")]
    [Authorize]
    public async Task<IActionResult> RevokeOtherSessions(CancellationToken cancellationToken)
    {
        var userIdRaw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            return Unauthorized();
        }

        var currentSid = User.FindFirst("sid")?.Value;
        await _sessionSecurity.RevokeAllUserSessionsAsync(userId, currentSid, "UserRevokedOtherSessions", cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, message = "All other active sessions have been revoked." });
    }

    [HttpPost("request-password-otp")]
    [AllowAnonymous]
    [EnableRateLimiting("PasswordResetLimit")]
    [ProducesResponseType<RequestPasswordOtpResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RequestPasswordOtp([FromBody] RequestPasswordOtpRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
        {
            return BadRequest(new { message = "A valid college email address is required." });
        }

        var email = NormalizeEmail(request.Email);
        _tenantContext.IsAuthLookup = true;

        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.College)
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, cancellationToken);

        // Anti-enumeration protection: return generic success without revealing non-existence or disabled state
        if (user == null || !user.IsActive)
        {
            return Ok(new RequestPasswordOtpResponse
            {
                Success = true,
                Message = "If this institutional email is registered and active, a 6-digit verification code has been dispatched. Code expires in 15 minutes."
            });
        }

        if (user.College != null && !user.College.IsActive)
        {
            return BadRequest(new { message = "Campus workspace subscription is inactive or suspended. Contact your college administration." });
        }

        if (user.PasswordResetOtpExpiresAtUtc.HasValue && user.PasswordResetOtpExpiresAtUtc.Value > DateTime.UtcNow)
        {
            var issuedAtUtc = user.PasswordResetOtpExpiresAtUtc.Value.AddMinutes(-15);
            var elapsed = DateTime.UtcNow - issuedAtUtc;
            if (elapsed < TimeSpan.FromSeconds(30))
            {
                var remainingSeconds = Math.Max(1, (int)Math.Ceiling((TimeSpan.FromSeconds(30) - elapsed).TotalSeconds));
                return BadRequest(new { message = $"Please wait {remainingSeconds} seconds before requesting another verification code." });
            }
        }

        var otpNumber = RandomNumberGenerator.GetInt32(100000, 1000000);
        var otp = otpNumber.ToString("D6");

        _tenantContext.CollegeId = user.CollegeId;
        user.PasswordResetOtpHashed = PasswordHelper.HashPassword(otp);
        user.PasswordResetOtpExpiresAtUtc = DateTime.UtcNow.AddMinutes(15);
        user.PasswordResetOtpAttempts = 0;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Password reset OTP generated and dispatched to {Email}", email);

        await _emailSender.SendPasswordResetOtpAsync(user.Email, user.FullName, otp, cancellationToken);

        string? devOtp = _environment.IsDevelopment() ? otp : null;

        return Ok(new RequestPasswordOtpResponse
        {
            Success = true,
            Message = "A 6-digit verification code has been dispatched to your institutional email. Code expires in 15 minutes.",
            DevOtp = devOtp
        });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    [EnableRateLimiting("PasswordResetLimit")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Otp) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new { message = "Email, OTP, and new password are required." });
        }

        var passwordError = PasswordPolicyValidator.Validate(request.NewPassword);
        if (passwordError != null)
        {
            return BadRequest(new { message = passwordError });
        }

        var email = NormalizeEmail(request.Email);
        var otp = request.Otp.Trim();
        _tenantContext.IsAuthLookup = true;

        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.College)
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return BadRequest(new { message = "Invalid verification code or email address." });
        }

        if (!user.IsActive)
        {
            return BadRequest(new { message = "This account has been deactivated. Please contact your institutional administrator." });
        }

        if (user.College != null && !user.College.IsActive)
        {
            return BadRequest(new { message = "Campus workspace subscription is inactive or suspended. Contact your college administration." });
        }

        if (user.PasswordResetOtpAttempts >= 5)
        {
            _tenantContext.CollegeId = user.CollegeId;
            user.PasswordResetOtpHashed = null;
            user.PasswordResetOtpExpiresAtUtc = null;
            user.PasswordResetOtpAttempts = 0;
            await _context.SaveChangesAsync(cancellationToken);
            return BadRequest(new { message = "Maximum verification attempts exceeded. For security, this verification code has been invalidated. Please request a new code." });
        }

        if (!user.PasswordResetOtpExpiresAtUtc.HasValue || user.PasswordResetOtpExpiresAtUtc.Value < DateTime.UtcNow || string.IsNullOrEmpty(user.PasswordResetOtpHashed))
        {
            _tenantContext.CollegeId = user.CollegeId;
            user.PasswordResetOtpHashed = null;
            user.PasswordResetOtpExpiresAtUtc = null;
            user.PasswordResetOtpAttempts = 0;
            await _context.SaveChangesAsync(cancellationToken);
            return BadRequest(new { message = "Verification code has expired or is invalid. Please request a new code." });
        }

        if (!PasswordHelper.VerifyPassword(otp, user.PasswordResetOtpHashed))
        {
            _tenantContext.CollegeId = user.CollegeId;
            user.PasswordResetOtpAttempts++;
            if (user.PasswordResetOtpAttempts >= 5)
            {
                user.PasswordResetOtpHashed = null;
                user.PasswordResetOtpExpiresAtUtc = null;
                user.PasswordResetOtpAttempts = 0;
                await _context.SaveChangesAsync(cancellationToken);
                return BadRequest(new { message = "Maximum verification attempts exceeded. For security, this verification code has been invalidated. Please request a new code." });
            }

            await _context.SaveChangesAsync(cancellationToken);
            return BadRequest(new { message = $"Invalid verification code. {5 - user.PasswordResetOtpAttempts} attempts remaining." });
        }

        _tenantContext.CollegeId = user.CollegeId;
        user.PasswordHash = PasswordHelper.HashPassword(request.NewPassword);
        user.IsActivated = true;
        user.PasswordResetOtpHashed = null;
        user.PasswordResetOtpExpiresAtUtc = null;
        user.PasswordResetOtpAttempts = 0;
        user.AccessFailedCount = 0;
        user.LockoutEndUtc = null;
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        user.PasswordChangedAtUtc = DateTime.UtcNow;
        user.LastLoginAtUtc = DateTime.UtcNow;

        // Revoke all existing sessions on password reset
        await _sessionSecurity.RevokeAllUserSessionsAsync(user.Id, null, "PasswordReset", cancellationToken);

        _tenantContext.UserId = user.Id;
        _tenantContext.Role = user.Role;
        if (user.Role == UserRole.SuperAdmin)
        {
            _tenantContext.IsSuperAdmin = true;
        }

        if (user.MfaEnabled && !string.IsNullOrWhiteSpace(user.MfaSecret))
        {
            var challengeToken = GenerateMfaChallengeToken(user.Id);
            await _context.SaveChangesAsync(cancellationToken);
            return Ok(new AuthResponse
            {
                MfaRequired = true,
                MfaChallengeToken = challengeToken,
                User = MapUserProfile(user)
            });
        }

        var authResponse = await CreateSessionAndTokensAsync(user, cancellationToken);

        _context.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = user.Id,
            ActorEmail = user.Email,
            Action = "Password Reset Completed",
            TargetEntity = $"UserAccount: {user.Id}",
            IpAddress = GetClientIp(),
            OccurredAtUtc = DateTime.UtcNow,
            MetadataJson = JsonSerializer.Serialize(new { sessionId = authResponse.SessionId })
        });

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Password established and account activated for {Email} ({Role})", user.Email, user.Role);

        return Ok(authResponse);
    }

    [HttpPost("activate")]
    [AllowAnonymous]
    [EnableRateLimiting("PasswordResetLimit")]
    public async Task<IActionResult> ActivateAccount([FromBody] ActivateAccountRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new { message = "Email, activation token, and new password are required." });
        }

        var passwordError = PasswordPolicyValidator.Validate(request.NewPassword);
        if (passwordError != null)
        {
            return BadRequest(new { message = passwordError });
        }

        var email = NormalizeEmail(request.Email);
        var tokenHash = HashToken(request.Token.Trim());
        _tenantContext.IsAuthLookup = true;

        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.College)
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, cancellationToken);

        if (user == null || !user.IsActive || string.IsNullOrEmpty(user.ActivationTokenHashed) ||
            !user.ActivationTokenExpiresAtUtc.HasValue || user.ActivationTokenExpiresAtUtc.Value < DateTime.UtcNow ||
            !CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(user.ActivationTokenHashed), Encoding.ASCII.GetBytes(tokenHash)))
        {
            return BadRequest(new { message = "Activation link is invalid or has expired." });
        }

        _tenantContext.CollegeId = user.CollegeId;
        user.PasswordHash = PasswordHelper.HashPassword(request.NewPassword);
        user.IsActivated = true;
        user.ActivationTokenHashed = null;
        user.ActivationTokenExpiresAtUtc = null;
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        user.PasswordChangedAtUtc = DateTime.UtcNow;
        user.LastLoginAtUtc = DateTime.UtcNow;

        if (user.MfaEnabled && !string.IsNullOrWhiteSpace(user.MfaSecret))
        {
            var challengeToken = GenerateMfaChallengeToken(user.Id);
            await _context.SaveChangesAsync(cancellationToken);
            return Ok(new AuthResponse
            {
                MfaRequired = true,
                MfaChallengeToken = challengeToken,
                User = MapUserProfile(user)
            });
        }

        var authResponse = await CreateSessionAndTokensAsync(user, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(authResponse);
    }

    [HttpPost("mfa/enroll")]
    [Authorize]
    public async Task<IActionResult> EnrollMfa(CancellationToken cancellationToken)
    {
        var userIdRaw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(userIdRaw, out var userId)) return Unauthorized();

        var user = await _context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted && u.IsActive, cancellationToken);
        if (user == null) return Unauthorized();

        var secret = TotpHelper.GenerateSecret();
        user.MfaSecret = secret;
        user.MfaEnabled = false;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            secret,
            otpauthUri = TotpHelper.BuildOtpAuthUri(user.Email, "Colabex", secret)
        });
    }

    [HttpPost("mfa/confirm")]
    [Authorize]
    public async Task<IActionResult> ConfirmMfa([FromBody] MfaConfirmRequest request, CancellationToken cancellationToken)
    {
        var userIdRaw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(userIdRaw, out var userId)) return Unauthorized();

        var user = await _context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted && u.IsActive, cancellationToken);
        if (user == null) return Unauthorized();

        if (!TotpHelper.VerifyCode(user.MfaSecret, request.Code))
        {
            return BadRequest(new { message = "Invalid TOTP verification code." });
        }

        var codes = new List<string>();
        var hashedCodes = new List<string>();
        for (int i = 0; i < 10; i++)
        {
            var raw = Convert.ToHexString(RandomNumberGenerator.GetBytes(6))[..8];
            var formatted = $"{raw[..4]}-{raw[4..8]}";
            codes.Add(formatted);
            hashedCodes.Add(PasswordHelper.HashPassword(formatted));
        }

        user.MfaEnabled = true;
        user.MfaRecoveryCodesJson = JsonSerializer.Serialize(hashedCodes);
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, mfaEnabled = true, recoveryCodes = codes });
    }

    [HttpPost("mfa/verify")]
    [AllowAnonymous]
    [EnableRateLimiting("LoginLimit")]
    public async Task<IActionResult> VerifyMfaChallenge([FromBody] MfaVerifyChallengeRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.MfaChallengeToken) || string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new { message = "MFA challenge token and verification code are required." });
        }

        var userId = ValidateMfaChallengeToken(request.MfaChallengeToken);
        if (userId == null)
        {
            return Unauthorized(new { message = "MFA challenge has expired or is invalid." });
        }

        _tenantContext.IsAuthLookup = true;
        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.College)
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == userId.Value && !u.IsDeleted && u.IsActive, cancellationToken);

        if (user == null || !user.MfaEnabled)
        {
            return Unauthorized(new { message = "Account is not eligible for MFA verification." });
        }

        var verified = TotpHelper.VerifyCode(user.MfaSecret, request.Code);
        if (!verified && !string.IsNullOrWhiteSpace(user.MfaRecoveryCodesJson))
        {
            var storedHashes = JsonSerializer.Deserialize<List<string>>(user.MfaRecoveryCodesJson) ?? new List<string>();
            var matchedIndex = storedHashes.FindIndex(h => PasswordHelper.VerifyPassword(request.Code.Trim().ToUpperInvariant(), h));
            if (matchedIndex >= 0)
            {
                storedHashes.RemoveAt(matchedIndex);
                user.MfaRecoveryCodesJson = JsonSerializer.Serialize(storedHashes);
                verified = true;
            }
        }

        if (!verified)
        {
            return Unauthorized(new { message = "Invalid authenticator or recovery code." });
        }

        _tenantContext.CollegeId = user.CollegeId;
        var authResponse = await CreateSessionAndTokensAsync(user, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(authResponse);
    }

    private string GenerateMfaChallengeToken(Guid userId)
    {
        var config = HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        var secret = config["Jwt:Secret"]!;
        var key = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new Microsoft.IdentityModel.Tokens.SigningCredentials(key, Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256);
        var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var descriptor = new Microsoft.IdentityModel.Tokens.SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("sub", userId.ToString()),
                new Claim("purpose", "mfa_challenge")
            }),
            Expires = DateTime.UtcNow.AddMinutes(5),
            Issuer = config["Jwt:Issuer"],
            Audience = config["Jwt:Audience"],
            SigningCredentials = creds
        };
        return handler.WriteToken(handler.CreateToken(descriptor));
    }

    private Guid? ValidateMfaChallengeToken(string token)
    {
        try
        {
            var config = HttpContext.RequestServices.GetRequiredService<IConfiguration>();
            var secret = config["Jwt:Secret"]!;
            var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
            var principal = handler.ValidateToken(token, new Microsoft.IdentityModel.Tokens.TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
                ValidateIssuer = true,
                ValidIssuer = config["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = config["Jwt:Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(15)
            }, out _);

            if (principal.FindFirst("purpose")?.Value != "mfa_challenge") return null;
            var sub = principal.FindFirst("sub")?.Value ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(sub, out var id) ? id : null;
        }
        catch
        {
            return null;
        }
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
