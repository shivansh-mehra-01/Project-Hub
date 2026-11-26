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
    public int FacultyCount { get; init; }
    public int ActiveProjectsCount { get; init; }
    public DateTime? LastActivityAtUtc { get; init; }
    public string? PrincipalEmail { get; init; }
    public string? PrincipalName { get; init; }
    public bool? PrincipalIsActive { get; init; }
    public bool? PrincipalIsActivated { get; init; }
    public bool? PrincipalIsEmailVerified { get; init; }
    public bool? PrincipalHasPendingInvitation { get; init; }
    public DateTime? PrincipalLastLoginAtUtc { get; init; }
    public List<string> AdminEmails { get; init; } = new();
    public string? CollegeType { get; init; }
    public string? AffiliatingUniversity { get; init; }
    public string? Country { get; init; }
    public string? State { get; init; }
    public string? City { get; init; }
    public string? CampusAddress { get; init; }
    public DateTime CreatedAtUtc { get; init; }
}

public record CreateTenantRequest
{
    public string Name { get; init; } = string.Empty;
    public string? TenantCode { get; init; }
    public string? SsoDomain { get; init; }
    public LicenseTier LicenseTier { get; init; } = LicenseTier.Pilot;
    public int MaxStudentSeats { get; init; } = 500;
    public int StorageQuotaGb { get; init; } = 50;
    public bool EnforceStrictSso { get; init; } = true;
    public string? CrestUrl { get; init; }
    public DateTime? SubscriptionExpiresAtUtc { get; init; }
    public string? PrincipalName { get; init; }
    public string? PrincipalEmail { get; init; }
    public string? CollegeType { get; init; }
    public string? AffiliatingUniversity { get; init; }
    public string? Country { get; init; }
    public string? State { get; init; }
    public string? City { get; init; }
    public string? CampusAddress { get; init; }
}

public record CreateTenantResponse
{
    public CollegeTenantDto Tenant { get; init; } = null!;
    public string AdminEmail { get; init; } = string.Empty;
    public string? DevOtp { get; init; }
    public string? Message { get; init; }
}

public record ProvisionAdminRequest
{
    public string? FullName { get; init; }
    public string? Email { get; init; }
    public bool ReplaceExisting { get; init; } = false;
    public string? Reason { get; init; }
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
    public string? CollegeType { get; init; }
    public string? AffiliatingUniversity { get; init; }
    public string? Country { get; init; }
    public string? State { get; init; }
    public string? City { get; init; }
    public string? CampusAddress { get; init; }
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

public record CreatePlatformAuditLogRequest
{
    public string Action { get; init; } = string.Empty;
    public string TargetEntity { get; init; } = string.Empty;
    public Guid? TargetTenantId { get; init; }
    public string MetadataJson { get; init; } = "{}";
    public string? IpAddress { get; init; }
}

public record PlatformSessionDto
{
    public string Id { get; init; } = string.Empty;
    public string AccountEmail { get; init; } = string.Empty;
    public string AccountName { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public string Device { get; init; } = string.Empty;
    public string Browser { get; init; } = string.Empty;
    public string IpAddress { get; init; } = string.Empty;
    public DateTime LoginTimeUtc { get; init; }
    public DateTime LastActiveTimeUtc { get; init; }
    public bool IsCurrentSession { get; init; }
}

public record PlatformAdministratorDto
{
    public Guid Id { get; init; }
    public string AdminId { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string PlatformRole { get; init; } = "Super Admin";
    public string Status { get; init; } = "Active";
    public bool IsActive { get; init; }
    public bool IsActivated { get; init; }
    public bool MfaEnabled { get; init; }
    public string MfaStatus { get; init; } = "Enrollment Required";
    public DateTime CreatedAtUtc { get; init; }
    public DateTime? LastLoginAtUtc { get; init; }
    public int ActiveSessionsCount { get; init; }
}

public record InvitePlatformAdminRequest
{
    public string FullName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string? PlatformRole { get; init; }
}

public record UpdatePlatformAdminStatusRequest
{
    public bool IsActive { get; init; }
}

public record PlatformAnalyticsCollegeDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string TenantCode { get; init; } = string.Empty;
    public LicenseTier LicenseTier { get; init; }
    public int StorageQuotaGb { get; init; }
    public bool IsActive { get; init; }
    public int DepartmentCount { get; init; }
    public int FacultyCount { get; init; }
    public int ActiveStudents { get; init; }
    public int ActiveProjects { get; init; }
    public int CompletedProjects { get; init; }
    public int LogbooksInRange { get; init; }
    public DateTime? LastActivityAtUtc { get; init; }
}

public record PlatformAnalyticsOverviewDto
{
    public string Range { get; init; } = "30d";
    public DateTime? RangeStartUtc { get; init; }
    public int TotalColleges { get; init; }
    public int ActiveColleges { get; init; }
    public int SuspendedColleges { get; init; }
    public int TotalDepartments { get; init; }
    public int ActiveFaculty { get; init; }
    public int RegisteredStudents { get; init; }
    public int ActiveUsersInRange { get; init; }
    public int ActiveProjects { get; init; }
    public int CompletedProjects { get; init; }
    public int WeeklyLogbooksInRange { get; init; }
    public int EvaluationsInRange { get; init; }
    public List<PlatformAnalyticsCollegeDto> Colleges { get; init; } = new();
}

public record PlatformSecuritySummaryDto
{
    public int ActiveSessionsCount { get; init; }
    public int TotalSuperAdmins { get; init; }
    public int MfaEnrolledSuperAdmins { get; init; }
    public int FailedLoginsLast24h { get; init; }
    public int FailedLoginsLast7d { get; init; }
    public int RevokedSessionsLast7d { get; init; }
    public List<PlatformAuditLogDto> RecentSecurityEvents { get; init; } = new();
}

public record PlatformAnnouncementDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Category { get; init; } = "Maintenance";
    public string Priority { get; init; } = "Normal";
    public string ShortDescription { get; init; } = string.Empty;
    public string FullMessage { get; init; } = string.Empty;
    public string TargetAudience { get; init; } = "All Colleges";
    public List<string> TargetCollegeIds { get; init; } = new();
    public string Status { get; init; } = "Draft";
    public DateTime? PublishDateUtc { get; init; }
    public DateTime? WithdrawnAtUtc { get; init; }
    public DateTime? ArchivedAtUtc { get; init; }
    public string? ArchiveReason { get; init; }
    public string CreatedByEmail { get; init; } = string.Empty;
    public string CreatedByName { get; init; } = string.Empty;
    public DateTime CreatedAtUtc { get; init; }
    public DateTime? UpdatedAtUtc { get; init; }
}

public record SavePlatformAnnouncementRequest
{
    public string Title { get; init; } = string.Empty;
    public string Category { get; init; } = "Maintenance";
    public string Priority { get; init; } = "Normal";
    public string? ShortDescription { get; init; }
    public string FullMessage { get; init; } = string.Empty;
    public string TargetAudience { get; init; } = "All Colleges";
    public List<string>? TargetCollegeIds { get; init; }
    public string Status { get; init; } = "Draft";
}

public record ArchiveAnnouncementRequest
{
    public string? Reason { get; init; }
}

public record SupportTicketMessageDto
{
    public Guid Id { get; init; }
    public Guid TicketId { get; init; }
    public string SenderName { get; init; } = string.Empty;
    public string SenderEmail { get; init; } = string.Empty;
    public string SenderRole { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public bool IsInternalNote { get; init; }
    public DateTime SentAtUtc { get; init; }
}

public record SupportTicketDto
{
    public Guid Id { get; init; }
    public string TicketNumber { get; init; } = string.Empty;
    public Guid? CollegeId { get; init; }
    public string InstitutionName { get; init; } = string.Empty;
    public string Subject { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Category { get; init; } = "General Support";
    public string Priority { get; init; } = "Medium";
    public string Status { get; init; } = "Open";
    public string ReportedByName { get; init; } = string.Empty;
    public string ReportedByEmail { get; init; } = string.Empty;
    public string? AssignedToName { get; init; }
    public string? AssignedToEmail { get; init; }
    public string? ResolutionNotes { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    public DateTime? UpdatedAtUtc { get; init; }
    public DateTime? ResolvedAtUtc { get; init; }
    public DateTime? ClosedAtUtc { get; init; }
    public List<SupportTicketMessageDto> Messages { get; init; } = new();
}

public record CreateSupportTicketRequest
{
    public Guid? CollegeId { get; init; }
    public string? InstitutionName { get; init; }
    public string Subject { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Category { get; init; } = "General Support";
    public string Priority { get; init; } = "Medium";
    public string? ReportedByName { get; init; }
    public string? ReportedByEmail { get; init; }
}

public record ReplySupportTicketRequest
{
    public string Message { get; init; } = string.Empty;
    public bool IsInternalNote { get; init; }
}

public record UpdateSupportTicketStatusRequest
{
    public string Status { get; init; } = string.Empty;
}

public record UpdateSupportTicketPriorityRequest
{
    public string Priority { get; init; } = string.Empty;
}

public record AssignSupportTicketRequest
{
    public string? AssignedToName { get; init; }
    public string? AssignedToEmail { get; init; }
}

public record ResolveSupportTicketRequest
{
    public string? ResolutionNotes { get; init; }
}
