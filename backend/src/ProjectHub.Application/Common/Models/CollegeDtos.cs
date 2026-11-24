using ProjectHub.Domain.Enums;

namespace ProjectHub.Application.Common.Models;

public record CollegeOverviewDto
{
    public Guid CollegeId { get; init; }
    public string CollegeName { get; init; } = string.Empty;
    public string TenantCode { get; init; } = string.Empty;
    public string AdminName { get; init; } = string.Empty;
    public int TotalCourses { get; init; }
    public int TotalBranches { get; init; }
    public int TotalDepartments { get; init; }
    public int TotalStudents { get; init; }
    public int TotalFaculty { get; init; }
    public int TotalProjects { get; init; }
    public decimal Criterion3AttainmentPct { get; init; }
    public bool StrictSsoEnforced { get; init; }
    public string AffiliatedUniversity { get; init; } = string.Empty;
    public string CollegeType { get; init; } = "Engineering";
    public string EstablishedYear { get; init; } = "1952";
    public string CampusesSummary { get; init; } = "1 Campus";
    public string? CrestUrl { get; init; }
    public string CurrentSemesterLabel { get; init; } = "Odd Semester";
    public DateTime LastUpdatedUtc { get; init; } = DateTime.UtcNow;
    public AcademicSessionDto? ActiveSession { get; init; }
    public CohortEnrollmentCapacityDto? CohortCapacity { get; init; }
    public List<AicteCadreComplianceDto> ProgramAicteCompliance { get; init; } = new();
    public decimal SarDepartmentAttestationPct { get; init; }
    public int AttestedDepartmentsCount { get; init; }
    public int TotalDepartmentsForSar { get; init; }
    public List<DepartmentTrackSummaryDto> DepartmentSummaries { get; init; } = new();
    public List<OverviewCourseHierarchyDto> AcademicStructure { get; init; } = new();
    public List<CollegeActivityItemDto> RecentActivities { get; init; } = new();
    public List<CollegeNotificationItemDto> Notifications { get; init; } = new();
}

public record OverviewCourseHierarchyDto
{
    public Guid CourseId { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public int BranchCount { get; init; }
    public List<string> Branches { get; init; } = new();
}

public record CollegeActivityItemDto
{
    public string Title { get; init; } = string.Empty;
    public string TimeAgo { get; init; } = string.Empty;
    public DateTime OccurredAtUtc { get; init; }
}

public record CollegeNotificationItemDto
{
    public string Type { get; init; } = "info"; // success, info, warning
    public string Message { get; init; } = string.Empty;
    public string TimeAgo { get; init; } = string.Empty;
    public DateTime CreatedAtUtc { get; init; }
}

public record DepartmentTrackSummaryDto
{
    public Guid DepartmentId { get; init; }
    public string DepartmentCode { get; init; } = string.Empty;
    public string DepartmentName { get; init; } = string.Empty;
    public string? HodName { get; init; }
    public int IntakeQuota { get; init; }
    public int StudentCount { get; init; }
    public int FacultyCount { get; init; }
    public decimal Criterion3AttainmentPct { get; init; }
    public string TrackStatus { get; init; } = "Awaiting HOD Launch"; // "Active" vs "Awaiting HOD Launch"
    public int ActiveTrackCount { get; init; }
    public List<string> ActiveTrackNames { get; init; } = new();
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
    public string TrackStatus { get; init; } = "Awaiting HOD Launch"; // "Active" vs "Awaiting HOD Launch"
    public int ActiveTrackCount { get; init; }
}

public record CreateDepartmentRequest
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public int IntakeQuota { get; init; } = 120;
    public Guid? CourseProgramId { get; init; }
}

public record UpdateDepartmentRequest
{
    public string Name { get; init; } = string.Empty;
    public string Code { get; init; } = string.Empty;
    public int IntakeQuota { get; init; } = 120;
    public Guid? CourseProgramId { get; init; }
    public bool IsActive { get; init; } = true;
}

public record AppointHodRequest
{
    public Guid HodUserId { get; init; }
}

public record CreateHodRequest
{
    public string FullName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string EmployeeCode { get; init; } = string.Empty;
    public Guid DepartmentId { get; init; }
    public string? TemporaryPassword { get; init; }
}

public record HodManagementDto
{
    public Guid DepartmentId { get; init; }
    public string DepartmentCode { get; init; } = string.Empty;
    public string DepartmentName { get; init; } = string.Empty;
    public Guid? CourseProgramId { get; init; }
    public string? CourseProgramCode { get; init; }
    public string? CourseProgramName { get; init; }
    public Guid? HodUserId { get; init; }
    public string? HodName { get; init; }
    public string? HodEmail { get; init; }
    public string? EmployeeCode { get; init; }
    public bool IsActive { get; init; }
    public DateTime? AppointedAtUtc { get; init; }
}

public record HodAssignmentHistoryDto
{
    public Guid Id { get; init; }
    public Guid DepartmentId { get; init; }
    public string DepartmentCode { get; init; } = string.Empty;
    public string DepartmentName { get; init; } = string.Empty;
    public Guid HodUserId { get; init; }
    public string HodName { get; init; } = string.Empty;
    public string HodEmail { get; init; } = string.Empty;
    public string EmployeeCode { get; init; } = string.Empty;
    public DateTime AppointedAtUtc { get; init; }
    public string AppointedBy { get; init; } = "College Administrator";
    public bool IsCurrent { get; init; }
}

public record CollegeStaffDto
{
    public Guid Id { get; init; }
    public string FullName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public UserRole Role { get; init; }
    public FacultyDesignation? Designation { get; init; }
    public InstitutionalResponsibility DelegatedResponsibility { get; init; } = InstitutionalResponsibility.None;
    public Guid? DepartmentId { get; init; }
    public string? DepartmentCode { get; init; }
    public string? DepartmentName { get; init; }
    public string? EmployeeCode { get; init; }
    public bool IsActive { get; init; }
    public bool IsActivated { get; init; }
    public string? TemporaryPassword { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    public DateTime? LastLoginAtUtc { get; init; }
}

public record CreateCollegeStaffRequest
{
    public string FullName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public UserRole Role { get; init; } = UserRole.Faculty;
    public FacultyDesignation? Designation { get; init; }
    public InstitutionalResponsibility DelegatedResponsibility { get; init; } = InstitutionalResponsibility.None;
    public Guid? DepartmentId { get; init; }
    public string? EmployeeCode { get; init; }
}

public record UpdateCollegeStaffRequest
{
    public string? FullName { get; init; }
    public UserRole? Role { get; init; }
    public FacultyDesignation? Designation { get; init; }
    public InstitutionalResponsibility? DelegatedResponsibility { get; init; }
    public Guid? DepartmentId { get; init; }
    public string? EmployeeCode { get; init; }
}

public record UpdateUserStatusRequest
{
    public bool IsActive { get; init; }
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
    public string? AffiliatedUniversity { get; init; }
    public string? CampusAddress { get; init; }
    public string? CampusesCsv { get; init; }
    public bool NbaModuleEnabled { get; init; } = true;
    public bool GithubIntegrationEnabled { get; init; } = true;
    public bool JiraIntegrationEnabled { get; init; } = true;
    public LicenseTier LicenseTier { get; init; } = LicenseTier.Pilot;
    public int MaxStudentSeats { get; init; }
    public int EnrolledStudentCount { get; init; }
    public int StorageQuotaGb { get; init; }
    public double UsedStorageGb { get; init; }
}

public record UpdateCollegeSettingsRequest
{
    public string? Name { get; init; }
    public bool? EnforceStrictSso { get; init; }
    public string? CrestUrl { get; init; }
    public string? PrincipalSealUrl { get; init; }
    public string? AffiliatedUniversity { get; init; }
    public string? CampusAddress { get; init; }
    public string? CampusesCsv { get; init; }
    public bool? NbaModuleEnabled { get; init; }
    public bool? GithubIntegrationEnabled { get; init; }
    public bool? JiraIntegrationEnabled { get; init; }
}

public record SignOffComplianceRequest
{
    public string Remarks { get; init; } = string.Empty;
}

public record InstitutionalDossierDto
{
    public string CollegeName { get; init; } = string.Empty;
    public string TenantCode { get; init; } = string.Empty;
    public string SsoDomain { get; init; } = string.Empty;
    public string AffiliatedUniversity { get; init; } = string.Empty;
    public string AcademicYear { get; init; } = "2026–2027";
    public int TotalDepartments { get; init; }
    public int TotalStudents { get; init; }
    public int TotalFaculty { get; init; }
    public decimal OverallAttainmentPct { get; init; }
    public bool IsAttested { get; init; }
    public DateTime? AttestedAtUtc { get; init; }
    public string? AttestedBy { get; init; }
    public List<DepartmentAttainmentSummaryDto> Departments { get; init; } = new();
}

public record DepartmentAttainmentSummaryDto
{
    public string DepartmentCode { get; init; } = string.Empty;
    public string DepartmentName { get; init; } = string.Empty;
    public string? HodName { get; init; }
    public int StudentCount { get; init; }
    public decimal AttainmentPct { get; init; }
    public bool IsSarAttested { get; init; }
    public DateTime? SarAttestedAtUtc { get; init; }
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

public record UpdateCourseProgramRequest
{
    public string Name { get; init; } = string.Empty;
    public AcademicProgramLevel Level { get; init; } = AcademicProgramLevel.UG;
    public int TotalSemesters { get; init; } = 8;
    public bool IsActive { get; init; } = true;
}

public record AcademicSessionDto
{
    public Guid Id { get; init; }
    public Guid CollegeId { get; init; }
    public string Label { get; init; } = string.Empty;
    public DateTime StartDate { get; init; }
    public DateTime EndDate { get; init; }
    public bool IsActive { get; init; }
    public DateTime? ExamCutoffDateUtc { get; init; }
    public bool AllowInterdisciplinaryTeams { get; init; } = true;
}

public record ConfigureAcademicSessionRequest
{
    public string AcademicYear { get; init; } = string.Empty; // e.g. "2026–2027"
    public DateTime? ExamCutoffDateUtc { get; init; }
    public bool AllowInterdisciplinaryTeams { get; init; } = true;
    public DateTime? StartDate { get; init; }
    public DateTime? EndDate { get; init; }
    public bool IsActive { get; init; } = true;
}

public record CreateAcademicSessionRequest
{
    public string Label { get; init; } = string.Empty;
    public DateTime StartDate { get; init; }
    public DateTime EndDate { get; init; }
    public bool IsActive { get; init; } = true;
    public DateTime? ExamCutoffDateUtc { get; init; }
    public bool AllowInterdisciplinaryTeams { get; init; } = true;
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
    public int SemesterNumber { get; init; }
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

// --- Statutory AICTE Compliance & Cadre Ratio Models ---

public record AicteCadreComplianceDto
{
    public string ProgramLevel { get; init; } = string.Empty; // "UG Engineering", "PG Engineering", "MBA", "MCA"
    public string ProgramCode { get; init; } = string.Empty;
    public int SanctionedIntake { get; init; }
    public int ProgramDurationYears { get; init; }
    public int TotalSanctionedStrength { get; init; }
    public int RequiredFaculty { get; init; }
    public int AvailableFaculty { get; init; }
    public string RequiredRatio { get; init; } = "1:20";
    public string ActualRatio { get; init; } = string.Empty;
    public bool IsCompliant { get; init; }
    public string CadreStatus { get; init; } = "Insufficient Data"; // "Compliant", "NonCompliant", "Insufficient Data"
    public int RequiredProfessors { get; init; }
    public int ActualProfessors { get; init; }
    public int RequiredAssociateProfessors { get; init; }
    public int ActualAssociateProfessors { get; init; }
    public int RequiredAssistantProfessors { get; init; }
    public int ActualAssistantProfessors { get; init; }
    public string StatusMessage { get; init; } = string.Empty;
    public bool IsSubstituted { get; init; } = false;
    public int SubstitutedProfessorsCount { get; init; } = 0;
    public string? QualificationVerificationNotice { get; init; }
}

public record CohortEnrollmentCapacityDto
{
    public int TotalSanctionedMultiCohortCapacity { get; init; }
    public int TotalEnrolledStudents { get; init; }
    public decimal UtilizationPercentage { get; init; }
    public bool HasReliableEnrollmentRecords { get; init; }
    public string StatusMessage { get; init; } = string.Empty;
}

// --- University Examination Tabulation Register Models ---

public record ExaminationTabulationRowDto
{
    public Guid StudentId { get; init; }
    public string EnrollmentNumber { get; init; } = string.Empty;
    public string StudentName { get; init; } = string.Empty;
    public string DepartmentCode { get; init; } = string.Empty;
    public string TeamNumber { get; init; } = string.Empty;
    public string ProjectTitle { get; init; } = string.Empty;
    public decimal GuideScore { get; init; } // e.g. out of 30
    public decimal MidTermScore { get; init; } // e.g. out of 30
    public decimal FinalVivaScore { get; init; } // e.g. out of 40
    public decimal TotalScore { get; init; } // out of 100
    public string Grade { get; init; } = "F"; // "A+", "A", "B+", "B", "C+", "C", "F"
    public int GradePoints { get; init; } // 10, 9, 8, 7, 6, 5, 0
    public string ResultStatus { get; init; } = "Pass"; // "Pass", "Fail", "Pending"
    public bool MeetsNbaAttainmentThreshold { get; init; }
}

public record ExaminationTabulationRegisterDto
{
    public string AcademicYear { get; init; } = "2026–2027";
    public string TrackName { get; init; } = "Major Project Capstone";
    public int GuideWeightPct { get; init; } = 30;
    public int MidTermWeightPct { get; init; } = 30;
    public int FinalVivaWeightPct { get; init; } = 40;
    public bool IsCertified { get; init; }
    public DateTime? CertifiedAtUtc { get; init; }
    public string? CertifiedBy { get; init; }
    public string? CertificationChecksum { get; init; }
    public int TotalStudentsTabulated { get; init; }
    public int TotalPassed { get; init; }
    public int TotalFailed { get; init; }
    public decimal AverageTotalScore { get; init; }
    public List<ExaminationTabulationRowDto> Rows { get; init; } = new();
}

public record CertifyExaminationRegisterRequest
{
    public string Remarks { get; init; } = string.Empty;
}

public record ResetPasswordResponseDto
{
    public string Message { get; init; } = string.Empty;
    public bool EmailDispatched { get; init; }
    public DateTime ExpiresAtUtc { get; init; }
}

public record BulkStaffUploadRowDto
{
    public string FullName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string DepartmentCode { get; init; } = string.Empty;
    public string EmployeeCode { get; init; } = string.Empty;
    public UserRole Role { get; init; } = UserRole.Faculty;
    public FacultyDesignation? Designation { get; init; }
}

public record BulkStaffUploadRequest
{
    public List<BulkStaffUploadRowDto> StaffRows { get; init; } = new();
}

public record BulkStaffUploadResultDto
{
    public int TotalSubmitted { get; init; }
    public int SuccessfullyCreated { get; init; }
    public int FailedCount { get; init; }
    public List<string> Errors { get; init; } = new();
}
