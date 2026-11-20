using ProjectHub.Domain.Enums;

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
    public Guid? CourseProgramId { get; init; }
    public string? CourseProgramCode { get; init; }
    public string? CourseProgramName { get; init; }
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
    public Guid? CourseProgramId { get; init; }
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
    public Guid? AcademicSessionId { get; init; }
    public Guid? CourseProgramId { get; init; }
    public Guid? SemesterTermId { get; init; }
    public Guid? SubjectOfferingId { get; init; }
    public Guid? CurriculumSchemeId { get; init; }
    public ParticipationMode ParticipationMode { get; init; } = ParticipationMode.Team;
    public EnrolmentMode EnrolmentMode { get; init; } = EnrolmentMode.SelfJoin;
    public bool AllowCrossBranchTeams { get; init; }
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
    public Guid? AcademicSessionId { get; init; }
    public Guid? CourseProgramId { get; init; }
    public Guid? SemesterTermId { get; init; }
    public Guid? SubjectOfferingId { get; init; }
    public Guid? CurriculumSchemeId { get; init; }
    public ParticipationMode ParticipationMode { get; init; } = ParticipationMode.Team;
    public EnrolmentMode EnrolmentMode { get; init; } = EnrolmentMode.SelfJoin;
    public bool AllowCrossBranchTeams { get; init; } = false;
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

// --- RGPV Catalog & Dynamic Academic Hierarchy DTOs ---

public record ImportUniversityCatalogRequest
{
    public string UniversityCode { get; init; } = "RGPV";
    public List<string>? ProgramCodes { get; init; } // e.g. ["BTECH", "MTECH", "MBA", "MCA"]
}

public record ImportCatalogResultDto
{
    public string UniversityCode { get; init; } = "RGPV";
    public string UniversityName { get; init; } = string.Empty;
    public int ProgramsImported { get; init; }
    public int DepartmentsCreated { get; init; }
    public int SemesterTermsCreated { get; init; }
    public int SubjectOfferingsCreated { get; init; }
    public string Message { get; init; } = string.Empty;
}

public record CourseProgramDto
{
    public Guid Id { get; init; }
    public Guid CollegeId { get; init; }
    public Guid? MasterProgramId { get; init; }
    public AcademicProgramLevel Level { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public int TotalSemesters { get; init; }
    public bool IsActive { get; init; }
    public int DepartmentCount { get; init; }
}

public record CreateCourseProgramRequest
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public AcademicProgramLevel Level { get; init; } = AcademicProgramLevel.UG;
    public int TotalSemesters { get; init; } = 8;
    public Guid? MasterProgramId { get; init; }
}

public record AcademicSessionDto
{
    public Guid Id { get; init; }
    public Guid CollegeId { get; init; }
    public string Label { get; init; } = string.Empty;
    public DateTime StartDate { get; init; }
    public DateTime EndDate { get; init; }
    public bool IsActive { get; init; }
}

public record CreateAcademicSessionRequest
{
    public string Label { get; init; } = string.Empty;
    public DateTime StartDate { get; init; }
    public DateTime EndDate { get; init; }
    public bool IsActive { get; init; } = true;
}

public record SemesterTermDto
{
    public Guid Id { get; init; }
    public Guid CollegeId { get; init; }
    public Guid DepartmentId { get; init; }
    public string? DepartmentCode { get; init; }
    public string? DepartmentName { get; init; }
    public Guid? AcademicSessionId { get; init; }
    public string? AcademicSessionLabel { get; init; }
    public int SemesterNumber { get; init; }
    public string SemesterName { get; init; } = string.Empty;
    public SemesterParity Parity { get; init; }
    public bool IsActive { get; init; }
    public int SubjectOfferingCount { get; init; }
}

public record CreateSemesterTermRequest
{
    public Guid DepartmentId { get; init; }
    public Guid? AcademicSessionId { get; init; }
    public int SemesterNumber { get; init; }
    public string SemesterName { get; init; } = string.Empty;
    public SemesterParity Parity { get; init; } = SemesterParity.Even;
}

public record SubjectOfferingDto
{
    public Guid Id { get; init; }
    public Guid CollegeId { get; init; }
    public Guid SemesterTermId { get; init; }
    public string? SemesterTermName { get; init; }
    public Guid? CurriculumSchemeId { get; init; }
    public string? CurriculumSchemeCode { get; init; }
    public string SubjectCode { get; init; } = string.Empty;
    public string SubjectName { get; init; } = string.Empty;
    public SubjectType SubjectType { get; init; }
    public int Credits { get; init; }
    public int InternalMaxMarks { get; init; }
    public int ExternalMaxMarks { get; init; }
    public bool IsActive { get; init; }
}

public record CreateSubjectOfferingRequest
{
    public Guid SemesterTermId { get; init; }
    public Guid? CurriculumSchemeId { get; init; }
    public string SubjectCode { get; init; } = string.Empty;
    public string SubjectName { get; init; } = string.Empty;
    public SubjectType SubjectType { get; init; } = SubjectType.MinorProject;
    public int Credits { get; init; } = 4;
    public int InternalMaxMarks { get; init; } = 60;
    public int ExternalMaxMarks { get; init; } = 40;
}

public record AcademicHierarchyTreeDto
{
    public List<HierarchyProgramNodeDto> Programs { get; init; } = new();
}

public record HierarchyProgramNodeDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public AcademicProgramLevel Level { get; init; }
    public int TotalSemesters { get; init; }
    public List<HierarchyDepartmentNodeDto> Departments { get; init; } = new();
}

public record HierarchyDepartmentNodeDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? HodName { get; init; }
    public int StudentCount { get; init; }
    public List<HierarchySemesterNodeDto> Semesters { get; init; } = new();
}

public record HierarchySemesterNodeDto
{
    public Guid Id { get; init; }
    public int SemesterNumber { get; init; }
    public string SemesterName { get; init; } = string.Empty;
    public SemesterParity Parity { get; init; }
    public List<HierarchyOfferingNodeDto> Offerings { get; init; } = new();
}

public record HierarchyOfferingNodeDto
{
    public Guid Id { get; init; }
    public string SubjectCode { get; init; } = string.Empty;
    public string SubjectName { get; init; } = string.Empty;
    public SubjectType SubjectType { get; init; }
    public int Credits { get; init; }
    public int InternalMaxMarks { get; init; }
    public int ExternalMaxMarks { get; init; }
}

public record MasterCatalogOverviewDto
{
    public Guid UniversityId { get; init; }
    public string UniversityCode { get; init; } = string.Empty;
    public string UniversityName { get; init; } = string.Empty;
    public string State { get; init; } = string.Empty;
    public List<MasterProgramSummaryDto> Programs { get; init; } = new();
    public List<string> Schemes { get; init; } = new();
}

public record MasterProgramSummaryDto
{
    public Guid Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public AcademicProgramLevel Level { get; init; }
    public int DurationYears { get; init; }
    public int TotalSemesters { get; init; }
    public int BranchCount { get; init; }
    public List<string> Branches { get; init; } = new();
}
