using ProjectHub.Domain.Enums;

namespace ProjectHub.Application.Common.Models;

public record ResolveTenantResponse
{
    public bool Resolved { get; init; }
    public Guid? CollegeId { get; init; }
    public string? Name { get; init; }
    public string? TenantCode { get; init; }
    public string? SsoDomain { get; init; }
    public string? CrestUrl { get; init; }
    public string? Message { get; init; }
}

public record LoginRequest
{
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
}

public record ActivateRequest
{
    public string Email { get; init; } = string.Empty;
    public string EnrollmentOrEmployeeCode { get; init; } = string.Empty;
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
}

public record AuthResponse
{
    public string Token { get; init; } = string.Empty;
    public DateTime ExpiresAtUtc { get; init; }
    public UserProfileDto User { get; init; } = null!;
}
