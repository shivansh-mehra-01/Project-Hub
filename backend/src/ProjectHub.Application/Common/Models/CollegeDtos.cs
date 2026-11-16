namespace ProjectHub.Application.Common.Models;

public record CollegeOverviewDto
{
    public Guid CollegeId { get; init; }
    public string CollegeName { get; init; } = string.Empty;
    public string TenantCode { get; init; } = string.Empty;
    public int TotalDepartments { get; init; }
    public int TotalStudents { get; init; }
    public int TotalFaculty { get; init; }
    public int TotalProjects { get; init; }
    public decimal Criterion3AttainmentPct { get; init; }
    public bool StrictSsoEnforced { get; init; }
}

public record DepartmentDto
{
    public Guid Id { get; init; }
    public Guid CollegeId { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public Guid? HodUserId { get; init; }
    public string? HodName { get; init; }
    public int IntakeQuota { get; init; }
    public int StudentCount { get; init; }
    public int FacultyCount { get; init; }
    public bool IsSarAttested { get; init; }
    public DateTime? SarAttestedAtUtc { get; init; }
}

public record CreateDepartmentRequest
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public int IntakeQuota { get; init; } = 120;
}

public record AppointHodRequest
{
    public Guid HodUserId { get; init; }
}

public record CollegeTrackDto
{
    public Guid Id { get; init; }
    public Guid CollegeId { get; init; }
    public Guid? DepartmentId { get; init; }
    public string? DepartmentCode { get; init; }
    public string Name { get; init; } = string.Empty;
    public string AcademicYear { get; init; } = string.Empty;
    public bool AllowInterdisciplinaryTeams { get; init; }
    public bool IsActive { get; init; }
    public DateTime? ProposalDeadlineUtc { get; init; }
    public DateTime? FinalSubmissionDeadlineUtc { get; init; }
    public int GuideWeightPct { get; init; }
    public int MidTermWeightPct { get; init; }
    public int FinalVivaWeightPct { get; init; }
    public int SharedProjectRubricPct { get; init; }
    public int IndividualStudentRubricPct { get; init; }
}

public record CreateCollegeTrackRequest
{
    public string Name { get; init; } = string.Empty;
    public string AcademicYear { get; init; } = "2026-2027";
    public bool AllowInterdisciplinaryTeams { get; init; } = true;
    public DateTime? ProposalDeadlineUtc { get; init; }
    public DateTime? FinalSubmissionDeadlineUtc { get; init; }
    public int GuideWeightPct { get; init; } = 30;
    public int MidTermWeightPct { get; init; } = 30;
    public int FinalVivaWeightPct { get; init; } = 40;
    public int SharedProjectRubricPct { get; init; } = 60;
    public int IndividualStudentRubricPct { get; init; } = 40;
}

public record CollegeSettingsDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string TenantCode { get; init; } = string.Empty;
    public string SsoDomain { get; init; } = string.Empty;
    public bool EnforceStrictSso { get; init; }
    public string? CrestUrl { get; init; }
    public string? PrincipalSealUrl { get; init; }
    public int StorageQuotaGb { get; init; }
}

public record UpdateCollegeSettingsRequest
{
    public string? Name { get; init; }
    public bool? EnforceStrictSso { get; init; }
    public string? CrestUrl { get; init; }
    public string? PrincipalSealUrl { get; init; }
}

public record SignOffComplianceRequest
{
    public string Remarks { get; init; } = string.Empty;
}
