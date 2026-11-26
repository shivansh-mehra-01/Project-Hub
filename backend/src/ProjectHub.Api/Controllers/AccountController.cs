using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ProjectHub.Api.Authorization;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
using ProjectHub.Infrastructure.Security;

namespace ProjectHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = ProjectHubPolicies.SuperAdminOnly)]
public class AccountController : ControllerBase
{
    private readonly ProjectHubDbContext _context;
    private readonly IEmailOutboxService _emailOutbox;
    private readonly ISessionSecurityService _sessionSecurity;
    private readonly IMemoryCache _cache;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<AccountController> _logger;

    public AccountController(
        ProjectHubDbContext context,
        IEmailOutboxService emailOutbox,
        ISessionSecurityService sessionSecurity,
        IMemoryCache cache,
        IWebHostEnvironment environment,
        ILogger<AccountController> logger)
    {
        _context = context;
        _emailOutbox = emailOutbox;
        _sessionSecurity = sessionSecurity;
        _cache = cache;
        _environment = environment;
        _logger = logger;
    }

    private string? GetCurrentEmail()
    {
        return User.FindFirst(ClaimTypes.Email)?.Value
            ?? User.FindFirst("email")?.Value;
    }

    private string? GetCurrentSessionId()
    {
        return User.FindFirst("sid")?.Value;
    }

    private Guid? GetCurrentUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var guid) ? guid : null;
    }

    private string GetClientIpAddress()
    {
        return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
    }

    // =========================================================================
    // 1. PERSONAL PROFILE
    // =========================================================================

    [HttpGet("profile")]
    public async Task<ActionResult<AdminProfileDto>> GetProfile()
    {
        var email = GetCurrentEmail();
        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted);

        if (user == null)
        {
            return NotFound(new { message = "User profile not found." });
        }

        var notificationPrefs = ParseNotificationPreferences(user.NotificationPreferencesJson);
        var consolePrefs = ParseConsolePreferences(user.ConsolePreferencesJson);

        var dto = new AdminProfileDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            IsEmailVerified = user.IsEmailVerified,
            PhoneNumber = user.PhoneNumber ?? string.Empty,
            IsPhoneVerified = user.IsPhoneVerified,
            AdminId = user.EnrollmentOrEmployeeCode,
            Role = "Super Admin",
            PasswordChangedAtUtc = user.PasswordChangedAtUtc ?? user.CreatedAtUtc,
            MfaEnabled = user.MfaEnabled,
            NotificationPreferences = notificationPrefs,
            ConsolePreferences = consolePrefs
        };

        return Ok(dto);
    }

    [HttpPut("profile")]
    public async Task<ActionResult<AdminProfileDto>> UpdateProfile([FromBody] UpdateAdminProfileRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest(new { message = "Full name cannot be empty." });
        }

        var email = GetCurrentEmail();
        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted);

        if (user == null)
        {
            return NotFound(new { message = "User profile not found." });
        }

        var prevName = user.FullName;
        var prevPhone = user.PhoneNumber;

        user.FullName = request.FullName.Trim();
        if (request.PhoneNumber != null)
        {
            var cleanPhone = request.PhoneNumber.Trim();
            if (cleanPhone != user.PhoneNumber)
            {
                user.PhoneNumber = cleanPhone;
                // If phone changed, set verification to pending unless re-verified
                user.IsPhoneVerified = false;
            }
        }

        user.UpdatedAtUtc = DateTime.UtcNow;

        // Record Audit Log
        _context.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = user.Id,
            ActorEmail = user.Email,
            Action = "Super Admin Profile Updated",
            TargetEntity = "UserAccount: Profile",
            IpAddress = GetClientIpAddress(),
            OccurredAtUtc = DateTime.UtcNow,
            MetadataJson = JsonSerializer.Serialize(new
            {
                nameChanged = prevName != user.FullName,
                previousName = prevName,
                newName = user.FullName,
                phoneChanged = prevPhone != user.PhoneNumber
            })
        });

        await _context.SaveChangesAsync();
        return await GetProfile();
    }

    // =========================================================================
    // 2. EMAIL VERIFICATION & CHANGE WORKFLOW
    // =========================================================================

    [HttpPost("request-email-change")]
    [EnableRateLimiting("EmailChangeLimit")]
    public async Task<IActionResult> RequestEmailChange([FromBody] RequestEmailChangeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NewEmail) || !request.NewEmail.Contains('@'))
        {
            return BadRequest(new { message = "A valid new email address is required." });
        }

        var newEmail = request.NewEmail.Trim().ToLowerInvariant();
        var currentEmail = GetCurrentEmail();

        if (newEmail.Equals(currentEmail, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "The new email address cannot be identical to your current email address." });
        }

        var emailInUse = await _context.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Email == newEmail && !u.IsDeleted);

        if (emailInUse)
        {
            return Conflict(new { message = "The specified email address is already registered to another account." });
        }

        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == currentEmail && !u.IsDeleted);

        if (user == null) return NotFound(new { message = "User not found." });

        if (user.EmailChangeOtpExpiresAtUtc.HasValue && user.EmailChangeOtpExpiresAtUtc.Value > DateTime.UtcNow)
        {
            var issuedAtUtc = user.EmailChangeOtpExpiresAtUtc.Value.AddMinutes(-10);
            var elapsed = DateTime.UtcNow - issuedAtUtc;
            if (elapsed < TimeSpan.FromSeconds(30))
            {
                var remainingSeconds = Math.Max(1, (int)Math.Ceiling((TimeSpan.FromSeconds(30) - elapsed).TotalSeconds));
                return BadRequest(new { message = $"Please wait {remainingSeconds} seconds before requesting another email verification code." });
            }
        }

        var otpNumber = RandomNumberGenerator.GetInt32(100000, 1000000);
        var otp = otpNumber.ToString("D6");
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(10);

        user.PendingEmail = newEmail;
        user.EmailChangeOtpHashed = PasswordHelper.HashPassword(otp);
        user.EmailChangeOtpExpiresAtUtc = expiresAtUtc;
        user.EmailChangeOtpAttempts = 0;

        _emailOutbox.QueueEmailChangeVerification(newEmail, user.FullName, otp, expiresAtUtc, user.CollegeId);
        await _context.SaveChangesAsync();

        string? devOtp = _environment.IsDevelopment() ? otp : null;

        return Ok(new
        {
            success = true,
            message = $"Verification code queued for delivery to '{newEmail}'. Code expires in 10 minutes.",
            devOtp = devOtp
        });
    }

    [HttpPost("verify-email-change")]
    [EnableRateLimiting("EmailChangeLimit")]
    public async Task<IActionResult> VerifyEmailChange([FromBody] VerifyEmailChangeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NewEmail) || string.IsNullOrWhiteSpace(request.Otp))
        {
            return BadRequest(new { message = "New email and 6-digit verification code are required." });
        }

        var currentEmail = GetCurrentEmail();
        var newEmail = request.NewEmail.Trim().ToLowerInvariant();
        var otp = request.Otp.Trim();

        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == currentEmail && !u.IsDeleted);

        if (user == null) return NotFound(new { message = "User not found." });

        if (!string.Equals(user.PendingEmail, newEmail, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Verification code was not issued for this target email address." });
        }

        if (user.EmailChangeOtpAttempts >= 5)
        {
            user.PendingEmail = null;
            user.EmailChangeOtpHashed = null;
            user.EmailChangeOtpExpiresAtUtc = null;
            user.EmailChangeOtpAttempts = 0;
            await _context.SaveChangesAsync();
            return BadRequest(new { message = "Maximum verification attempts exceeded. Please request a new code." });
        }

        if (!user.EmailChangeOtpExpiresAtUtc.HasValue || user.EmailChangeOtpExpiresAtUtc.Value < DateTime.UtcNow || string.IsNullOrEmpty(user.EmailChangeOtpHashed))
        {
            return BadRequest(new { message = "Verification code has expired. Please request a new code." });
        }

        if (!PasswordHelper.VerifyPassword(otp, user.EmailChangeOtpHashed))
        {
            user.EmailChangeOtpAttempts++;
            if (user.EmailChangeOtpAttempts >= 5)
            {
                user.PendingEmail = null;
                user.EmailChangeOtpHashed = null;
                user.EmailChangeOtpExpiresAtUtc = null;
                user.EmailChangeOtpAttempts = 0;
            }
            await _context.SaveChangesAsync();
            return BadRequest(new { message = "Invalid verification code. Please check and try again." });
        }

        var oldEmail = user.Email;
        user.Email = newEmail;
        user.IsEmailVerified = true;
        user.PendingEmail = null;
        user.EmailChangeOtpHashed = null;
        user.EmailChangeOtpExpiresAtUtc = null;
        user.EmailChangeOtpAttempts = 0;
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        user.UpdatedAtUtc = DateTime.UtcNow;

        _context.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = user.Id,
            ActorEmail = newEmail,
            Action = "Super Admin Email Address Changed",
            TargetEntity = "UserAccount: Email",
            IpAddress = GetClientIpAddress(),
            OccurredAtUtc = DateTime.UtcNow,
            MetadataJson = JsonSerializer.Serialize(new
            {
                oldEmail = oldEmail,
                newEmail = newEmail,
                verified = true
            })
        });

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            email = newEmail,
            message = "Email address verified and updated successfully. Please use your new email for future logins."
        });
    }

    [HttpPost("request-phone-verification")]
    public async Task<IActionResult> RequestPhoneVerification()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId.Value && !u.IsDeleted);

        if (user == null) return NotFound(new { message = "User not found." });
        if (string.IsNullOrWhiteSpace(user.PhoneNumber))
        {
            return BadRequest(new { message = "Please save a contact number before requesting verification." });
        }

        var otp = RandomNumberGenerator.GetInt32(100000, 1000000).ToString("D6");
        var cacheKey = $"phone-verify:{user.Id}";
        _cache.Set(cacheKey, new PhoneVerificationChallenge(
            PasswordHelper.HashPassword(otp),
            user.PhoneNumber.Trim(),
            DateTime.UtcNow.AddMinutes(10),
            0), TimeSpan.FromMinutes(10));

        _logger.LogInformation("[PHONE VERIFICATION] OTP dispatched for SuperAdmin {UserId}", user.Id);
        string? devOtp = _environment.IsDevelopment() ? otp : null;

        return Ok(new
        {
            success = true,
            message = "Verification code generated for your contact number. Code expires in 10 minutes.",
            devOtp
        });
    }

    [HttpPost("verify-phone")]
    public async Task<IActionResult> VerifyPhone([FromBody] VerifyPhoneRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Otp))
        {
            return BadRequest(new { message = "6-digit verification code is required." });
        }

        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId.Value && !u.IsDeleted);

        if (user == null) return NotFound(new { message = "User not found." });

        var cacheKey = $"phone-verify:{user.Id}";
        if (!_cache.TryGetValue<PhoneVerificationChallenge>(cacheKey, out var challenge) || challenge == null)
        {
            return BadRequest(new { message = "No active phone verification challenge found. Please request a new code." });
        }

        if (challenge.ExpiresAtUtc < DateTime.UtcNow)
        {
            _cache.Remove(cacheKey);
            return BadRequest(new { message = "Verification code has expired. Please request a new code." });
        }

        if (!string.Equals(user.PhoneNumber?.Trim(), challenge.PhoneNumber, StringComparison.Ordinal))
        {
            _cache.Remove(cacheKey);
            return BadRequest(new { message = "Contact number changed after code was issued. Please request a new code." });
        }

        if (!PasswordHelper.VerifyPassword(request.Otp.Trim(), challenge.OtpHash))
        {
            var nextAttempts = challenge.Attempts + 1;
            if (nextAttempts >= 5)
            {
                _cache.Remove(cacheKey);
                return BadRequest(new { message = "Maximum verification attempts exceeded. Please request a new code." });
            }
            _cache.Set(cacheKey, challenge with { Attempts = nextAttempts }, challenge.ExpiresAtUtc - DateTime.UtcNow);
            return BadRequest(new { message = "Invalid verification code. Please check and try again." });
        }

        _cache.Remove(cacheKey);
        user.IsPhoneVerified = true;
        user.UpdatedAtUtc = DateTime.UtcNow;

        _context.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = user.Id,
            ActorEmail = user.Email,
            Action = "Super Admin Phone Verified",
            TargetEntity = "UserAccount: PhoneNumber",
            IpAddress = GetClientIpAddress(),
            OccurredAtUtc = DateTime.UtcNow,
            MetadataJson = JsonSerializer.Serialize(new { verified = true })
        });

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            phoneNumber = user.PhoneNumber ?? string.Empty,
            isPhoneVerified = true,
            message = "Contact number verified successfully."
        });
    }

    // =========================================================================
    // 3. PASSWORD MANAGEMENT
    // =========================================================================

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
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

        // Strict Enterprise Password Complexity Verification
        var passwordPolicyError = ValidatePasswordComplexity(request.NewPassword);
        if (passwordPolicyError != null)
        {
            return BadRequest(new { message = passwordPolicyError });
        }

        var email = GetCurrentEmail();
        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted);

        if (user == null) return NotFound(new { message = "User not found." });

        if (string.IsNullOrWhiteSpace(user.PasswordHash) ||
            !PasswordHelper.VerifyPassword(request.CurrentPassword, user.PasswordHash))
        {
            return BadRequest(new { message = "Current password entered is incorrect." });
        }

        user.PasswordHash = PasswordHelper.HashPassword(request.NewPassword);
        user.PasswordChangedAtUtc = DateTime.UtcNow;
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        user.UpdatedAtUtc = DateTime.UtcNow;

        int revokedSessionsCount = 0;
        var currentSid = GetCurrentSessionId();
        if (request.RevokeOtherSessions)
        {
            var otherSessions = await _context.UserSessions
                .Where(s => s.UserId == user.Id && !s.IsRevoked && (currentSid == null || s.Id != currentSid))
                .ToListAsync();

            revokedSessionsCount = otherSessions.Count;
            await _sessionSecurity.RevokeAllUserSessionsAsync(user.Id, currentSid, "AdminPasswordChanged");
        }

        _context.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = user.Id,
            ActorEmail = user.Email,
            Action = "Super Admin Password Updated",
            TargetEntity = "UserAccount: Credentials",
            IpAddress = GetClientIpAddress(),
            OccurredAtUtc = DateTime.UtcNow,
            MetadataJson = JsonSerializer.Serialize(new
            {
                revokedOtherSessions = request.RevokeOtherSessions,
                revokedSessionsCount = revokedSessionsCount,
                result = "Success"
            })
        });

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            passwordChangedAtUtc = user.PasswordChangedAtUtc,
            revokedOtherSessions = request.RevokeOtherSessions,
            message = "Password updated successfully. All credentials re-authenticated."
        });
    }

    // =========================================================================
    // 4. MULTI-FACTOR AUTHENTICATION & RECOVERY CODES
    // =========================================================================

    [HttpGet("mfa/status")]
    public async Task<ActionResult<MfaStatusDto>> GetMfaStatus()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();
        var user = await _context.Users.IgnoreQueryFilters().AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value && !u.IsDeleted);
        if (user == null) return NotFound();

        var isTotpConfigured = !string.IsNullOrWhiteSpace(user.MfaSecret) && user.MfaEnabled;
        var hasRecoveryCodes = !string.IsNullOrWhiteSpace(user.MfaRecoveryCodesJson);

        return Ok(new MfaStatusDto
        {
            MfaStatus = isTotpConfigured ? "Enabled" : "EnrollmentRequired",
            IsMandatory = true,
            Explanation = "Multi-Factor Authentication (MFA) is strictly required for Super Admin accounts to safeguard platform infrastructure and multi-tenant security.",
            Methods = new List<MfaMethodDto>
            {
                new()
                {
                    Id = "mfa-totp",
                    Name = "Authenticator App (TOTP)",
                    Type = "TOTP",
                    IsConfigured = isTotpConfigured,
                    IsPrimary = true,
                    Description = "Compatible with Google Authenticator, Microsoft Authenticator, 1Password, and Bitwarden."
                },
                new()
                {
                    Id = "mfa-fido2",
                    Name = "Passkey / Hardware Security Key (FIDO2)",
                    Type = "FIDO2",
                    IsConfigured = false,
                    IsPrimary = false,
                    Description = "Hardware-backed WebAuthn passkey or physical USB/NFC security key."
                }
            },
            RecoveryCodesConfigured = hasRecoveryCodes
        });
    }

    [HttpPost("mfa/regenerate-recovery-codes")]
    public async Task<IActionResult> RegenerateRecoveryCodes([FromBody] ReauthenticateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
        {
            return BadRequest(new { message = "Current password is required to reveal or regenerate recovery codes." });
        }

        var email = GetCurrentEmail();
        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted);

        if (user == null) return NotFound(new { message = "User not found." });

        if (string.IsNullOrWhiteSpace(user.PasswordHash) ||
            !PasswordHelper.VerifyPassword(request.CurrentPassword, user.PasswordHash))
        {
            return Unauthorized(new { message = "Re-authentication failed. Incorrect password." });
        }

        // Generate 10 cryptographically random 8-character single-use recovery codes and store only their hashes
        var codes = new List<string>();
        var hashedCodes = new List<string>();
        for (int i = 0; i < 10; i++)
        {
            var randomBytes = RandomNumberGenerator.GetBytes(6);
            var code = Convert.ToHexString(randomBytes).Substring(0, 8);
            var formatted = $"{code.Substring(0, 4)}-{code.Substring(4, 4)}";
            codes.Add(formatted);
            hashedCodes.Add(PasswordHelper.HashPassword(formatted));
        }

        user.MfaRecoveryCodesJson = JsonSerializer.Serialize(hashedCodes);
        user.UpdatedAtUtc = DateTime.UtcNow;

        _context.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = user.Id,
            ActorEmail = user.Email,
            Action = "MFA Recovery Codes Regenerated",
            TargetEntity = "UserAccount: MFA Security",
            IpAddress = GetClientIpAddress(),
            OccurredAtUtc = DateTime.UtcNow,
            MetadataJson = JsonSerializer.Serialize(new
            {
                codeCount = codes.Count,
                action = "RegeneratedAfterReauthentication",
                result = "Success"
            })
        });

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            codes = codes,
            generatedAtUtc = DateTime.UtcNow,
            message = "New recovery codes generated. Store them in a secure password manager. Each code can only be used once."
        });
    }

    // =========================================================================
    // 5. ACTIVE SESSIONS
    // =========================================================================

    [HttpGet("sessions")]
    public async Task<ActionResult<List<AccountSessionDto>>> GetMySessions()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();
        var currentSid = GetCurrentSessionId();

        var sessions = await _context.UserSessions
            .Where(s => s.UserId == userId.Value && !s.IsRevoked && s.ExpiresAtUtc > DateTime.UtcNow)
            .OrderByDescending(s => s.LastActiveTimeUtc)
            .Select(s => new AccountSessionDto
            {
                Id = s.Id,
                Device = s.Device,
                Browser = s.Browser,
                IpAddress = s.IpAddress,
                Location = s.Location,
                LoginTimeUtc = s.LoginTimeUtc,
                LastActiveTimeUtc = s.LastActiveTimeUtc,
                IsCurrentSession = s.Id == currentSid
            })
            .ToListAsync();

        return Ok(sessions);
    }

    [HttpPost("sessions/{id}/revoke")]
    public async Task<IActionResult> RevokeSession(string id)
    {
        var userId = GetCurrentUserId();
        var email = GetCurrentEmail();
        if (userId == null || string.IsNullOrWhiteSpace(email)) return Unauthorized();

        var currentSid = GetCurrentSessionId();
        if (id == currentSid)
        {
            return BadRequest(new { message = "Cannot revoke your current active session. Use the Sign Out button instead." });
        }

        var session = await _context.UserSessions
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId.Value);

        if (session == null)
        {
            return NotFound(new { message = "Session not found." });
        }

        await _sessionSecurity.RevokeSessionAsync(id, "AdminRevokedSession");

        _context.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = userId.Value,
            ActorEmail = email,
            Action = "Admin Session Revoked",
            TargetEntity = $"Session: {id}",
            IpAddress = GetClientIpAddress(),
            OccurredAtUtc = DateTime.UtcNow,
            MetadataJson = JsonSerializer.Serialize(new
            {
                revokedSessionId = id,
                revokedBy = email,
                category = "SessionGovernance",
                result = "Success"
            })
        });

        await _context.SaveChangesAsync();
        return Ok(new { success = true, revokedSessionId = id, message = "Session revoked successfully." });
    }

    [HttpPost("sessions/revoke-others")]
    public async Task<IActionResult> RevokeOtherSessions()
    {
        var userId = GetCurrentUserId();
        var email = GetCurrentEmail();
        if (userId == null || string.IsNullOrWhiteSpace(email)) return Unauthorized();

        var currentSid = GetCurrentSessionId();
        var otherSessions = await _context.UserSessions
            .Where(s => s.UserId == userId.Value && !s.IsRevoked && (currentSid == null || s.Id != currentSid))
            .ToListAsync();

        await _sessionSecurity.RevokeAllUserSessionsAsync(userId.Value, currentSid, "AdminRevokedOtherSessions");

        _context.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = userId.Value,
            ActorEmail = email,
            Action = "All Other Admin Sessions Revoked",
            TargetEntity = "UserAccount: ActiveSessions",
            IpAddress = GetClientIpAddress(),
            OccurredAtUtc = DateTime.UtcNow,
            MetadataJson = JsonSerializer.Serialize(new
            {
                revokedCount = otherSessions.Count,
                revokedBy = email,
                result = "Success"
            })
        });

        await _context.SaveChangesAsync();
        return Ok(new { success = true, revokedCount = otherSessions.Count, message = $"Signed out of {otherSessions.Count} other active device(s)." });
    }

    // =========================================================================
    // 6. NOTIFICATION PREFERENCES
    // =========================================================================

    [HttpPut("notification-preferences")]
    public async Task<ActionResult<NotificationPreferencesDto>> UpdateNotificationPreferences([FromBody] NotificationPreferencesDto request)
    {
        // Enforce mandatory security and outage notifications
        request.CriticalOutages = true;
        request.SecurityIncidents = true;

        var email = GetCurrentEmail();
        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted);

        if (user == null) return NotFound(new { message = "User not found." });

        user.NotificationPreferencesJson = JsonSerializer.Serialize(request);
        user.UpdatedAtUtc = DateTime.UtcNow;

        _context.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = user.Id,
            ActorEmail = user.Email,
            Action = "Notification Preferences Updated",
            TargetEntity = "UserAccount: Notifications",
            IpAddress = GetClientIpAddress(),
            OccurredAtUtc = DateTime.UtcNow,
            MetadataJson = user.NotificationPreferencesJson
        });

        await _context.SaveChangesAsync();
        return Ok(request);
    }

    // =========================================================================
    // 7. CONSOLE PREFERENCES
    // =========================================================================

    [HttpPut("console-preferences")]
    public async Task<ActionResult<ConsolePreferencesDto>> UpdateConsolePreferences([FromBody] ConsolePreferencesDto request)
    {
        if (request.DateFormat != "DD/MM/YYYY" && request.DateFormat != "YYYY-MM-DD")
        {
            request.DateFormat = "DD/MM/YYYY";
        }

        if (request.Density != "compact" && request.Density != "comfortable")
        {
            request.Density = "compact";
        }

        if (string.IsNullOrWhiteSpace(request.Timezone))
        {
            request.Timezone = "Asia/Kolkata";
        }

        var email = GetCurrentEmail();
        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted);

        if (user == null) return NotFound(new { message = "User not found." });

        user.ConsolePreferencesJson = JsonSerializer.Serialize(request);
        user.UpdatedAtUtc = DateTime.UtcNow;

        _context.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = user.Id,
            ActorEmail = user.Email,
            Action = "Console Preferences Updated",
            TargetEntity = "UserAccount: ConsolePreferences",
            IpAddress = GetClientIpAddress(),
            OccurredAtUtc = DateTime.UtcNow,
            MetadataJson = user.ConsolePreferencesJson
        });

        await _context.SaveChangesAsync();
        return Ok(request);
    }

    // =========================================================================
    // 8. LOGOUT
    // =========================================================================

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var email = GetCurrentEmail() ?? string.Empty;
        var currentSid = GetCurrentSessionId();
        if (!string.IsNullOrWhiteSpace(currentSid))
        {
            await _sessionSecurity.RevokeSessionAsync(currentSid, "AdminLogout");
        }

        _context.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = GetCurrentUserId(),
            ActorEmail = email,
            Action = "Super Admin Logged Out",
            TargetEntity = "UserAccount: Session",
            IpAddress = GetClientIpAddress(),
            OccurredAtUtc = DateTime.UtcNow,
            MetadataJson = JsonSerializer.Serialize(new
            {
                result = "SessionRevokedOnServer",
                timestampUtc = DateTime.UtcNow
            })
        });

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Session cleanly terminated." });
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private static string? ValidatePasswordComplexity(string password)
    {
        if (password.Length < 12)
            return "Password must be at least 12 characters in length.";
        if (!Regex.IsMatch(password, @"[A-Z]"))
            return "Password must include at least one uppercase letter (A-Z).";
        if (!Regex.IsMatch(password, @"[a-z]"))
            return "Password must include at least one lowercase letter (a-z).";
        if (!Regex.IsMatch(password, @"[0-9]"))
            return "Password must include at least one number (0-9).";
        if (!Regex.IsMatch(password, @"[!@#$%^&*()_+\-=\[\]{};':"",.<>?/\\|]"))
            return "Password must include at least one special symbol (!@#$%^&*...).";
        return null;
    }

    private static NotificationPreferencesDto ParseNotificationPreferences(string? json)
    {
        if (!string.IsNullOrWhiteSpace(json))
        {
            try
            {
                var dto = JsonSerializer.Deserialize<NotificationPreferencesDto>(json);
                if (dto != null)
                {
                    dto.CriticalOutages = true;
                    dto.SecurityIncidents = true;
                    return dto;
                }
            }
            catch { }
        }

        return new NotificationPreferencesDto
        {
            CriticalOutages = true,
            SecurityIncidents = true,
            CollegeApplications = true,
            SupportTickets = true,
            SubscriptionExpiry = true,
            DailyDigest = false,
            EmailChannel = true,
            SmsChannel = true
        };
    }

    private static ConsolePreferencesDto ParseConsolePreferences(string? json)
    {
        if (!string.IsNullOrWhiteSpace(json))
        {
            try
            {
                var dto = JsonSerializer.Deserialize<ConsolePreferencesDto>(json);
                if (dto != null) return dto;
            }
            catch { }
        }

        return new ConsolePreferencesDto
        {
            DateFormat = "DD/MM/YYYY",
            Timezone = "Asia/Kolkata",
            Density = "compact"
        };
    }
}

// =============================================================================
// DTOs
// =============================================================================

public class AdminProfileDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsEmailVerified { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public bool IsPhoneVerified { get; set; }
    public string AdminId { get; set; } = string.Empty;
    public string Role { get; set; } = "Super Admin";
    public DateTime PasswordChangedAtUtc { get; set; }
    public bool MfaEnabled { get; set; }
    public NotificationPreferencesDto NotificationPreferences { get; set; } = new();
    public ConsolePreferencesDto ConsolePreferences { get; set; } = new();
}

public class UpdateAdminProfileRequest
{
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
}

public class RequestEmailChangeRequest
{
    public string NewEmail { get; set; } = string.Empty;
}

public class VerifyEmailChangeRequest
{
    public string NewEmail { get; set; } = string.Empty;
    public string Otp { get; set; } = string.Empty;
}

public class VerifyPhoneRequest
{
    public string Otp { get; set; } = string.Empty;
}

internal record PhoneVerificationChallenge(string OtpHash, string PhoneNumber, DateTime ExpiresAtUtc, int Attempts);

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
    public bool RevokeOtherSessions { get; set; } = true;
}

public class ReauthenticateRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
}

public class MfaStatusDto
{
    public string MfaStatus { get; set; } = "Enabled";
    public bool IsMandatory { get; set; } = true;
    public string Explanation { get; set; } = string.Empty;
    public List<MfaMethodDto> Methods { get; set; } = new();
    public bool RecoveryCodesConfigured { get; set; } = true;
}

public class MfaMethodDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public bool IsConfigured { get; set; }
    public bool IsPrimary { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class AccountSessionDto
{
    public string Id { get; set; } = string.Empty;
    public string Device { get; set; } = string.Empty;
    public string Browser { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public DateTime LoginTimeUtc { get; set; }
    public DateTime LastActiveTimeUtc { get; set; }
    public bool IsCurrentSession { get; set; }
}

public class NotificationPreferencesDto
{
    public bool CriticalOutages { get; set; } = true;
    public bool SecurityIncidents { get; set; } = true;
    public bool CollegeApplications { get; set; } = true;
    public bool SupportTickets { get; set; } = true;
    public bool SubscriptionExpiry { get; set; } = true;
    public bool DailyDigest { get; set; } = false;
    public bool EmailChannel { get; set; } = true;
    public bool SmsChannel { get; set; } = true;
}

public class ConsolePreferencesDto
{
    public string DateFormat { get; set; } = "DD/MM/YYYY";
    public string Timezone { get; set; } = "Asia/Kolkata";
    public string Density { get; set; } = "compact";
}
