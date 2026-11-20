using ProjectHub.Domain.Enums;

namespace ProjectHub.Application.Common.Models;

public record CollegeTenantDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string TenantCode { get; init; } = string.Empty;
    public string SsoDomain { get; init; } = string.Empty;
    public LicenseTier LicenseTier { get; init; }
    public int MaxStudentSeats { get; init; }
    public int StorageQuotaGb { get; init; }
    public bool IsActive { get; init; }
    public bool EnforceStrictSso { get; init; }
    public string? CrestUrl { get; init; }
    public DateTime? SubscriptionExpiresAtUtc { get; init; }
    public int DepartmentCount { get; init; }
    public int StudentCount { get; init; }
    public string? PrincipalEmail { get; init; }
    public List<string> AdminEmails { get; init; } = new();
}

public record CreateTenantRequest
{
    public string Name { get; init; } = string.Empty;
    public string TenantCode { get; init; } = string.Empty;
    public string SsoDomain { get; init; } = string.Empty;
    public LicenseTier LicenseTier { get; init; } = LicenseTier.Pilot;
    public int MaxStudentSeats { get; init; } = 500;
    public int StorageQuotaGb { get; init; } = 50;
    public bool EnforceStrictSso { get; init; } = true;
    public string? CrestUrl { get; init; }
    public DateTime? SubscriptionExpiresAtUtc { get; init; }
    public string? PrincipalName { get; init; }
    public string? PrincipalEmail { get; init; }
}

public record CreateTenantResponse
{
    public CollegeTenantDto Tenant { get; init; } = null!;
    public string AdminEmail { get; init; } = string.Empty;
}

public record ProvisionAdminRequest
{
    public string? FullName { get; init; }
    public string? Email { get; init; }
}

public record ProvisionAdminResponse
{
    public bool Success { get; init; }
    public string AdminEmail { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
}

public record UpdateTenantRequest
{
    public string? Name { get; init; }
    public LicenseTier? LicenseTier { get; init; }
    public int? MaxStudentSeats { get; init; }
    public int? StorageQuotaGb { get; init; }
    public bool? IsActive { get; init; }
    public bool? EnforceStrictSso { get; init; }
    public string? CrestUrl { get; init; }
    public DateTime? SubscriptionExpiresAtUtc { get; init; }
}

public record MasterOutcomeDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
    public bool IsActive { get; init; }
}

public record MasterSdgDto
{
    public Guid Id { get; init; }
    public int SdgNumber { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public bool IsActive { get; init; }
}

public record PlatformAuditLogDto
{
    public Guid Id { get; init; }
    public Guid? ActorUserId { get; init; }
    public string ActorEmail { get; init; } = string.Empty;
    public string Action { get; init; } = string.Empty;
    public Guid? TargetTenantId { get; init; }
    public string TargetEntity { get; init; } = string.Empty;
    public string MetadataJson { get; init; } = "{}";
    public string? IpAddress { get; init; }
    public DateTime OccurredAtUtc { get; init; }
}
