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
    public int AppointedHodsCount { get; init; }
    public int VacantDepartmentsCount { get; init; }
    public int TotalStudents { get; init; }
    public int TotalFaculty { get; init; }
    public int TotalProjects { get; init; }
    public bool StrictSsoEnforced { get; init; }
    public string SsoDomain { get; init; } = string.Empty;
    public string? AffiliatedUniversity { get; init; }
    public string? CampusAddress { get; init; }
    public string? CampusesSummary { get; init; }
    public string? CrestUrl { get; init; }
    public bool HasPrincipalSeal { get; init; }
    public string? CurrentSemesterLabel { get; init; }
    public AcademicSessionDto? ActiveSession { get; init; }
    public List<DepartmentTrackSummaryDto> DepartmentSummaries { get; init; } = new();
    public List<OverviewCourseHierarchyDto> AcademicStructure { get; init; } = new();
    public List<CollegeActionItemDto> OperationalActionItems { get; init; } = new();
    public List<CollegeActivityItemDto> RecentActivities { get; init; } = new();
}

public record OverviewCourseHierarchyDto
{
    public Guid CourseId { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public int BranchCount { get; init; }
    public List<string> Branches { get; init; } = new();
}

public record CollegeActionItemDto
{
    public string Key { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Severity { get; init; } = "info";
    public string ActionLabel { get; init; } = string.Empty;
    public string ActionHref { get; init; } = string.Empty;
    public int? Count { get; init; }
}

public record CollegeActivityItemDto
{
    public string Title { get; init; } = string.Empty;
    public string? Actor { get; init; }
    public string? TargetEntity { get; init; }
    public string TimeAgo { get; init; } = string.Empty;
    public DateTime OccurredAtUtc { get; init; }
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
    public bool ConfirmReplacement { get; init; } = false;
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
    public DateTime? RelievedAtUtc { get; init; }
    public string AppointedBy { get; init; } = "College Administrator";
    public bool IsCurrent { get; init; }
    public string? Remarks { get; init; }
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
    public string? Description { get; init; }
    public string AcademicYear { get; init; } = string.Empty;
    public bool AllowInterdisciplinaryTeams { get; init; }
    public AcademicTrackStatus Status { get; init; } = AcademicTrackStatus.Open;
    public bool IsActive { get; init; }
    public int MinTeamSize { get; init; } = 2;
    public int MaxTeamSize { get; init; } = 4;
    public int TeamCount { get; init; }
    public int ActiveTeamCount { get; init; }
    public int? SemesterNumber { get; init; }
    public string? SemesterName { get; init; }
    public string? SubjectCode { get; init; }
    public string? SubjectName { get; init; }
    public DateTime? RegistrationOpensUtc { get; init; }
    public DateTime? ProposalDeadlineUtc { get; init; }
    public DateTime? FinalSubmissionDeadlineUtc { get; init; }
    public Guid? CoordinatorUserId { get; init; }
    public string? CoordinatorName { get; init; }
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
    public string? CrestUrl { get; init; }
    public string? AffiliatedUniversity { get; init; }
    public string? CampusAddress { get; init; }
    public LicenseTier LicenseTier { get; init; } = LicenseTier.Pilot;
    public int MaxStudentSeats { get; init; }
    public int EnrolledStudentCount { get; init; }
    public int StorageQuotaGb { get; init; }
    public double UsedStorageGb { get; init; }
}

public record UpdateCollegeSettingsRequest
{
    public string? Name { get; init; }
    public string? AffiliatedUniversity { get; init; }
    public string? CampusAddress { get; init; }
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
    public string Designation { get; init; } = string.Empty;
}

public record BulkStaffUploadRequest
{
    public List<BulkStaffUploadRowDto> StaffRows { get; init; } = new();
    public List<string>? CsvHeaders { get; init; }
}

public record BulkStaffUploadResultDto
{
    public int TotalSubmitted { get; init; }
    public int SuccessfullyCreated { get; init; }
    public int SuccessfullyUpdated { get; init; }
    public int FailedCount { get; init; }
    public List<string> Errors { get; init; } = new();
}

public record BulkStudentUploadRowDto
{
    public string StudentName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string StudentNumber { get; init; } = string.Empty;
    public string DepartmentCode { get; init; } = string.Empty;
    public string? Program { get; init; }
    public string? AdmissionYear { get; init; }
    public int? CurrentSemester { get; init; }
}

public record BulkStudentUploadRequest
{
    public List<BulkStudentUploadRowDto> StudentRows { get; init; } = new();
    public List<string>? CsvHeaders { get; init; }
}

public record BulkStudentUploadResultDto
{
    public int TotalSubmitted { get; init; }
    public int SuccessfullyCreated { get; init; }
    public int SuccessfullyUpdated { get; init; }
    public int FailedCount { get; init; }
    public List<string> Errors { get; init; } = new();
}

public record RosterImportPreviewRowDto
{
    public int RowNumber { get; init; }
    public string FullName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string DepartmentCode { get; init; } = string.Empty;
    public string? SecondaryValue { get; init; } // StudentNumber or Designation
    public string Action { get; init; } = "invalid"; // "create" | "update" | "unchanged" | "invalid"
    public List<string> Errors { get; init; } = new();
}

public record RosterImportPreviewDto
{
    public string ImportType { get; init; } = string.Empty; // "Faculty" | "Students"
    public int TotalRows { get; init; }
    public int ValidCount { get; init; }
    public int InvalidCount { get; init; }
    public int CreateCount { get; init; }
    public int UpdateCount { get; init; }
    public int UnchangedCount { get; init; }
    public int DuplicateCount { get; init; }
    public List<string> HeaderErrors { get; init; } = new();
    public List<RosterImportPreviewRowDto> Rows { get; init; } = new();
}

public record RosterImportHistoryDto
{
    public Guid Id { get; init; }
    public string ImportType { get; init; } = string.Empty;
    public string ActorEmail { get; init; } = string.Empty;
    public int TotalSubmitted { get; init; }
    public int CreatedCount { get; init; }
    public int UpdatedCount { get; init; }
    public DateTime OccurredAtUtc { get; init; }
}

public record CollegeAnnouncementDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Category { get; init; } = "Maintenance";
    public string Priority { get; init; } = "Normal";
    public string ShortDescription { get; init; } = string.Empty;
    public string FullMessage { get; init; } = string.Empty;
    public string TargetAudience { get; init; } = "All Colleges";
    public DateTime PublishDateUtc { get; init; }
    public string CreatedByName { get; init; } = string.Empty;
}
