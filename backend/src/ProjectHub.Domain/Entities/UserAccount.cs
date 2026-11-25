using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Tenant-partitioned institutional user account encompassing all 5 campus personas.
/// </summary>
public class UserAccount : BaseEntity, ITenantEntity
{
    private string _email = string.Empty;
    private string _code = string.Empty;

    public Guid CollegeId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string FullName { get; set; } = string.Empty;

    public string Email
    {
        get => _email;
        set => _email = value?.Trim().ToLowerInvariant() ?? string.Empty;
    }

    /// <summary>
    /// Student USN/PRN/Roll number or Faculty Institutional Employee ID.
    /// </summary>
    public string EnrollmentOrEmployeeCode
    {
        get => _code;
        set => _code = value?.Trim().ToUpperInvariant() ?? string.Empty;
    }

    public UserRole Role { get; set; } = UserRole.Student;
    public FacultyDesignation? Designation { get; set; }
    public InstitutionalResponsibility DelegatedResponsibility { get; set; } = InstitutionalResponsibility.None;
    public string? PasswordHash { get; set; }
    public bool IsActivated { get; set; } = true;
    public string? PasswordResetOtpHashed { get; set; }
    public DateTime? PasswordResetOtpExpiresAtUtc { get; set; }
    public int PasswordResetOtpAttempts { get; set; } = 0;
    public bool IsProjectCoordinator { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public int MaxMentorTeams { get; set; } = 4;
    public string? GitHubHandle { get; set; }
    public string? JiraKey { get; set; }
    public string? SkillsCsv { get; set; }
    public string? DigitalSignatureUrl { get; set; }
    public DateTime? LastLoginAtUtc { get; set; }
    public string? PhoneNumber { get; set; }
    public bool IsPhoneVerified { get; set; } = false;
    public bool IsEmailVerified { get; set; } = true;
    public DateTime? PasswordChangedAtUtc { get; set; }
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString("N");
    public int AccessFailedCount { get; set; } = 0;
    public DateTime? LockoutEndUtc { get; set; }
    public string? PendingEmail { get; set; }
    public string? EmailChangeOtpHashed { get; set; }
    public DateTime? EmailChangeOtpExpiresAtUtc { get; set; }
    public int EmailChangeOtpAttempts { get; set; } = 0;
    public string? ActivationTokenHashed { get; set; }
    public DateTime? ActivationTokenExpiresAtUtc { get; set; }
    public bool MfaEnabled { get; set; } = false;
    public string? MfaSecret { get; set; }
    public string? MfaRecoveryCodesJson { get; set; }
    public string? NotificationPreferencesJson { get; set; }
    public string? ConsolePreferencesJson { get; set; }

    // Navigations
    public CollegeTenant? College { get; set; }
    public Department? Department { get; set; }
    public ICollection<TeamMember> TeamMemberships { get; set; } = new List<TeamMember>();
    public ICollection<ProjectTeam> GuidedTeams { get; set; } = new List<ProjectTeam>();
    public ICollection<StudentAcademicEnrollment> AcademicEnrollments { get; set; } = new List<StudentAcademicEnrollment>();
    public ICollection<TeamInvitation> SentInvitations { get; set; } = new List<TeamInvitation>();
    public ICollection<TeamInvitation> ReceivedInvitations { get; set; } = new List<TeamInvitation>();
}
