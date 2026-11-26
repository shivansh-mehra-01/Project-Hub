using ProjectHub.Domain.Enums;

namespace ProjectHub.Application.Common.Models;

public record LoginRequest
{
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
}

public record RequestPasswordOtpRequest
{
    public string Email { get; init; } = string.Empty;
}

public record RequestPasswordOtpResponse
{
    public bool Success { get; init; }
    public string Message { get; init; } = string.Empty;
    public string? DevOtp { get; init; }
}

public record ResetPasswordRequest
{
    public string Email { get; init; } = string.Empty;
    public string Otp { get; init; } = string.Empty;
    public string NewPassword { get; init; } = string.Empty;
}

public record UserProfileDto
{
    public Guid Id { get; init; }
    public string Email { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public UserRole Role { get; init; }
    public bool IsProjectCoordinator { get; init; }
    public Guid CollegeId { get; init; }
    public string? CollegeName { get; init; }
    public Guid? DepartmentId { get; init; }
    public string? DepartmentName { get; init; }
    public string EnrollmentOrEmployeeCode { get; init; } = string.Empty;
    public string? GitHubHandle { get; init; }
    public string? JiraKey { get; init; }
    public string? PhoneNumber { get; init; }
    public bool MustChangePassword { get; init; }
}

public record AuthResponse
{
    public string Token { get; init; } = string.Empty;
    public string RefreshToken { get; init; } = string.Empty;
    public string SessionId { get; init; } = string.Empty;
    public DateTime ExpiresAtUtc { get; init; }
    public bool MfaRequired { get; init; }
    public string? MfaChallengeToken { get; init; }
    public UserProfileDto User { get; init; } = null!;
}

public record RefreshTokenRequest
{
    public string RefreshToken { get; init; } = string.Empty;
}

public record AuthChangePasswordRequest
{
    public string CurrentPassword { get; init; } = string.Empty;
    public string NewPassword { get; init; } = string.Empty;
    public string ConfirmPassword { get; init; } = string.Empty;
    public bool RevokeOtherSessions { get; init; } = true;
}

public record ActivateAccountRequest
{
    public string Email { get; init; } = string.Empty;
    public string Token { get; init; } = string.Empty;
    public string NewPassword { get; init; } = string.Empty;
}

public record PublicCollegeOptionDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string TenantCode { get; init; } = string.Empty;
}

public record RosterSignupRequest
{
    public Guid? CollegeId { get; init; }
    public string? CollegeCode { get; init; }
    public string CollegeUserId { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
}

public record RosterSignupResponse
{
    public string Message { get; init; } = string.Empty;
    public string Status { get; init; } = "VERIFICATION_SENT";
}

public record UpdateCurrentProfileRequest
{
    public string FullName { get; init; } = string.Empty;
    public string? PhoneNumber { get; init; }
}

public record MfaConfirmRequest
{
    public string Code { get; init; } = string.Empty;
}

public record MfaVerifyChallengeRequest
{
    public string MfaChallengeToken { get; init; } = string.Empty;
    public string Code { get; init; } = string.Empty;
}
