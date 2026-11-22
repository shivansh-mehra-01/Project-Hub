using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Platform-scoped root tenant entity representing an engineering institution.
/// Managed exclusively by platform SuperAdmins.
/// </summary>
public class CollegeTenant : BaseEntity
{
    private string _tenantCode = string.Empty;
    private string _ssoDomain = string.Empty;

    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Unique institutional code in uppercase (e.g., SISTEC, BMSCE, RVCE).
    /// </summary>
    public string TenantCode
    {
        get => _tenantCode;
        set => _tenantCode = value?.Trim().ToUpperInvariant() ?? string.Empty;
    }

    /// <summary>
    /// Unique institutional SSO email domain in lowercase (e.g., sistec.ac.in).
    /// </summary>
    public string SsoDomain
    {
        get => _ssoDomain;
        set => _ssoDomain = value?.Trim().ToLowerInvariant() ?? string.Empty;
    }

    public LicenseTier LicenseTier { get; set; } = LicenseTier.Pilot;
    public int MaxStudentSeats { get; set; } = 500;
    public int StorageQuotaGb { get; set; } = 50;
    public bool IsActive { get; set; } = true;
    public bool EnforceStrictSso { get; set; } = true;
    public string? CrestUrl { get; set; }
    public string? PrincipalSealUrl { get; set; }
    public string? AffiliatingUniversity { get; set; } = "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)";

    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public string? AffiliatedUniversity
    {
        get => AffiliatingUniversity;
        set => AffiliatingUniversity = value;
    }

    public string? CampusAddress { get; set; } = "Airport Road, Gandhi Nagar, Bhopal, MP 462036";
    public string? CampusesCsv { get; set; } = "Main Campus (Bhopal), Extension Center";
    public bool NbaModuleEnabled { get; set; } = true;
    public bool GithubIntegrationEnabled { get; set; } = true;
    public bool JiraIntegrationEnabled { get; set; } = true;
    public DateTime? SubscriptionExpiresAtUtc { get; set; }

    // Navigations
    public ICollection<Department> Departments { get; set; } = new List<Department>();
    public ICollection<UserAccount> Users { get; set; } = new List<UserAccount>();
    public ICollection<AcademicTrack> AcademicTracks { get; set; } = new List<AcademicTrack>();
    public ICollection<ProjectTeam> Teams { get; set; } = new List<ProjectTeam>();
    public ICollection<CourseProgram> CoursePrograms { get; set; } = new List<CourseProgram>();
    public ICollection<AcademicSession> AcademicSessions { get; set; } = new List<AcademicSession>();
    public ICollection<CurriculumScheme> CurriculumSchemes { get; set; } = new List<CurriculumScheme>();
    public ICollection<SemesterTerm> SemesterTerms { get; set; } = new List<SemesterTerm>();
    public ICollection<SubjectOffering> SubjectOfferings { get; set; } = new List<SubjectOffering>();
    public ICollection<StudentAcademicEnrollment> StudentEnrollments { get; set; } = new List<StudentAcademicEnrollment>();
    public ICollection<CollegeCampus> Campuses { get; set; } = new List<CollegeCampus>();
    public ICollection<HodAppointmentHistory> HodHistories { get; set; } = new List<HodAppointmentHistory>();
    public ICollection<AccreditationCycle> AccreditationCycles { get; set; } = new List<AccreditationCycle>();
}
