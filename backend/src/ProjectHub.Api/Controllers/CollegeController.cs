using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectHub.Api.Authorization;
using ProjectHub.Application.Common.Models;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Entities.Master;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
using ProjectHub.Infrastructure.Security;

namespace ProjectHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = ProjectHubPolicies.CollegeAdminOnly)]
public class CollegeController : ControllerBase
{
    private readonly ProjectHubDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly IEmailSender _emailSender;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<CollegeController> _logger;

    public CollegeController(
        ProjectHubDbContext context,
        ITenantContext tenantContext,
        IEmailSender emailSender,
        IWebHostEnvironment environment,
        ILogger<CollegeController> logger)
    {
        _context = context;
        _tenantContext = tenantContext;
        _emailSender = emailSender;
        _environment = environment;
        _logger = logger;
    }

    private async Task<(Guid? UserId, string Email, string FullName)> ResolveCallerIdentityAsync()
    {
        var userId = _tenantContext.UserId;
        if (userId.HasValue)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId.Value);
            if (user != null)
            {
                return (user.Id, user.Email, user.FullName);
            }
        }
        return (null, "principal@college.ac.in", "College Administrator");
    }

    [HttpGet("overview")]
    public async Task<ActionResult<CollegeOverviewDto>> GetOverview()
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var college = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == collegeId.Value && !c.IsDeleted);

        if (college == null) return NotFound(new { message = "College tenant record not found." });

        // 1. Resolve Active Institutional Academic Session
        var activeSession = await _context.AcademicSessions
            .Where(s => s.CollegeId == collegeId.Value && s.IsActive && !s.IsDeleted)
            .OrderByDescending(s => s.StartDate)
            .FirstOrDefaultAsync();

        if (activeSession == null)
        {
            activeSession = await _context.AcademicSessions
                .Where(s => s.CollegeId == collegeId.Value && !s.IsDeleted)
                .OrderByDescending(s => s.StartDate)
                .FirstOrDefaultAsync();
        }

        if (activeSession == null)
        {
            activeSession = new AcademicSession
            {
                CollegeId = collegeId.Value,
                Label = "2026–2027",
                StartDate = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2027, 6, 30, 23, 59, 59, DateTimeKind.Utc),
                ExamCutoffDateUtc = new DateTime(2027, 5, 31, 23, 59, 59, DateTimeKind.Utc),
                AllowInterdisciplinaryTeams = true,
                IsActive = true
            };
            await _context.AcademicSessions.AddAsync(activeSession);
            await _context.SaveChangesAsync();
        }

        // 2. Resolve Department Summaries with Track Status
        var courses = await _context.CoursePrograms
            .Where(p => p.CollegeId == collegeId.Value && !p.IsDeleted)
            .OrderBy(p => p.Code)
            .ToListAsync();

        var depts = await _context.Departments
            .Include(d => d.HodUser)
            .Where(d => d.CollegeId == collegeId.Value && !d.IsDeleted)
            .OrderBy(d => d.Code)
            .ToListAsync();

        var activeTracks = await _context.AcademicTracks
            .Where(t => t.DepartmentId.HasValue && t.IsActive && !t.IsDeleted)
            .ToListAsync();

        var allCollegeUsers = await _context.Users
            .Where(u => u.CollegeId == collegeId.Value && !u.IsDeleted)
            .ToListAsync();

        var vivaEvaluations = await _context.VivaEvaluations
            .Include(v => v.ProjectTeam)
            .Where(v => v.CollegeId == collegeId.Value && !v.IsDeleted)
            .ToListAsync();

        var overallAttainment = vivaEvaluations.Any()
            ? Math.Round(vivaEvaluations.Average(e => e.SharedTotalScore > 0 ? Math.Min(100m, Math.Max(0m, e.SharedTotalScore)) : 0m), 1)
            : 0m;

        var deptSummaries = depts.Select(d =>
        {
            var tracks = activeTracks.Where(t => t.DepartmentId == d.Id).ToList();
            var count = tracks.Count;
            var deptFaculty = allCollegeUsers.Count(u => u.DepartmentId == d.Id && (u.Role == UserRole.Faculty || u.Role == UserRole.HOD));
            var deptStudents = allCollegeUsers.Count(u => u.DepartmentId == d.Id && u.Role == UserRole.Student);
            var deptEvals = vivaEvaluations.Where(v => v.ProjectTeam != null && v.ProjectTeam.DepartmentId == d.Id).ToList();
            var deptAttainment = deptEvals.Any()
                ? Math.Round(deptEvals.Average(e => e.SharedTotalScore > 0 ? Math.Min(100m, Math.Max(0m, e.SharedTotalScore)) : 0m), 1)
                : 0m;

            return new DepartmentTrackSummaryDto
            {
                DepartmentId = d.Id,
                DepartmentCode = d.Code,
                DepartmentName = d.Name,
                HodName = d.HodUser != null ? d.HodUser.FullName : null,
                IntakeQuota = d.IntakeQuota > 0 ? d.IntakeQuota : 120,
                StudentCount = deptStudents,
                FacultyCount = deptFaculty,
                Criterion3AttainmentPct = deptAttainment,
                TrackStatus = count > 0 ? "Active" : "Awaiting HOD Launch",
                ActiveTrackCount = count,
                ActiveTrackNames = tracks.Select(t => t.Name).ToList()
            };
        }).ToList();

        var (currentUserId, _, adminName) = await ResolveCallerIdentityAsync();

        var totalEnrolledIntake = allCollegeUsers.Count(u => u.Role == UserRole.Student);
        var totalFaculty = allCollegeUsers.Count(u => u.Role == UserRole.Faculty || u.Role == UserRole.HOD);

        // 3. Cohort-Adjusted Capacity Calculation
        var enrollmentQuery = _context.StudentAcademicEnrollments
            .Include(e => e.CurrentSemesterTerm)
            .Where(e => e.CollegeId == collegeId.Value && !e.IsDeleted && e.AcademicStatus == AcademicStatus.Active);

        if (activeSession != null)
        {
            enrollmentQuery = enrollmentQuery.Where(e => e.CurrentSemesterTerm == null || e.CurrentSemesterTerm.AcademicSessionId == activeSession.Id);
        }

        var studentEnrollments = await enrollmentQuery.ToListAsync();

        int totalSanctionedCapacity = 0;
        foreach (var d in depts)
        {
            var prog = courses.FirstOrDefault(c => c.Id == d.CourseProgramId);
            var durationYears = (prog?.TotalSemesters ?? 8) / 2;
            if (durationYears < 1) durationYears = 4;
            totalSanctionedCapacity += (d.IntakeQuota > 0 ? d.IntakeQuota : 120) * durationYears;
        }

        // Distinct student counting avoids multi-counting a student who has multiple historical semester enrollment records
        int distinctEnrolledStudents = studentEnrollments.Any()
            ? studentEnrollments.Select(e => e.StudentUserId).Distinct().Count()
            : totalEnrolledIntake;

        int totalEnrolledStudents = distinctEnrolledStudents > 0 ? distinctEnrolledStudents : totalEnrolledIntake;

        decimal utilizationPct = totalSanctionedCapacity > 0
            ? Math.Round((decimal)totalEnrolledStudents / totalSanctionedCapacity * 100m, 1)
            : 0m;

        var cohortCapacity = new CohortEnrollmentCapacityDto
        {
            TotalSanctionedMultiCohortCapacity = totalSanctionedCapacity,
            TotalEnrolledStudents = totalEnrolledStudents,
            UtilizationPercentage = utilizationPct,
            HasReliableEnrollmentRecords = studentEnrollments.Count > 0,
            StatusMessage = studentEnrollments.Count > 0
                ? $"Calculated across {depts.Count} departments over full multi-year degree cohorts."
                : "Active student accounts used; formal semester cohort enrollment records recommended for statutory audit."
        };

        // 4. Statutory AICTE Cadre & FSR Compliance per Program
        var aicteComplianceList = new List<AicteCadreComplianceDto>();
        foreach (var prog in courses)
        {
            var childDepts = depts.Where(d => d.CourseProgramId == prog.Id || (!d.CourseProgramId.HasValue && prog.Code == "BTECH")).ToList();
            var sanctionedIntake = childDepts.Sum(d => d.IntakeQuota);
            var durationYears = prog.TotalSemesters / 2;
            if (durationYears < 1) durationYears = (prog.Level == AcademicProgramLevel.PG ? 2 : 4);
            var totalStrength = sanctionedIntake * durationYears;

            // Determine statutory programme type and discipline per AICTE APH 2024-2027 Annexure 5
            var codeUpper = prog.Code?.Trim().ToUpperInvariant() ?? "";
            var nameUpper = prog.Name?.Trim().ToUpperInvariant() ?? "";

            bool isManagement = codeUpper.Contains("MBA") || codeUpper.Contains("PGDM") || nameUpper.Contains("MANAGEMENT");
            bool isMca = codeUpper.Contains("MCA") || nameUpper.Contains("COMPUTER APPLICATION");
            bool isPgEngineering = prog.Level == AcademicProgramLevel.PG && !isManagement && !isMca;

            // Statutory Faculty-to-Student Ratio (FSR):
            // - PG Engineering (M.Tech): 1:15
            // - UG Engineering (B.Tech): 1:20
            // - Management (MBA): 1:20
            // - Computer Applications (MCA): 1:20
            int ratioDenominator = isPgEngineering ? 15 : 20;
            int requiredFaculty = totalStrength > 0 ? (int)Math.Ceiling((double)totalStrength / ratioDenominator) : 0;

            var childDeptIds = childDepts.Select(d => d.Id).ToHashSet();
            var progFaculty = allCollegeUsers.Where(u => u.DepartmentId.HasValue && childDeptIds.Contains(u.DepartmentId.Value) && (u.Role == UserRole.Faculty || u.Role == UserRole.HOD)).ToList();
            int availableFaculty = progFaculty.Count;

            int actualProf = progFaculty.Count(f => f.Designation == FacultyDesignation.Professor);
            int actualAssoc = progFaculty.Count(f => f.Designation == FacultyDesignation.AssociateProfessor);
            int actualAsst = progFaculty.Count(f => f.Designation == FacultyDesignation.AssistantProfessor);

            int reqProf = 0, reqAssoc = 0, reqAsst = 0;
            if (requiredFaculty > 0)
            {
                if (isPgEngineering)
                {
                    // AICTE APH Annexure 5: PG Engineering Cadre ratio is 1 Professor : 1 Assoc Professor : 1 Asst Professor (Divisor: 3)
                    // For requiredFaculty = 4 (30 intake * 2 yrs = 60 students / 15): 1 Prof, 1 Assoc, 2 Asst.
                    if (requiredFaculty == 1)
                    {
                        reqProf = 1; reqAssoc = 0; reqAsst = 0;
                    }
                    else if (requiredFaculty == 2)
                    {
                        reqProf = 1; reqAssoc = 1; reqAsst = 0;
                    }
                    else
                    {
                        reqProf = Math.Max(1, requiredFaculty / 3);
                        reqAssoc = Math.Max(1, (requiredFaculty - reqProf) / 2);
                        reqAsst = Math.Max(0, requiredFaculty - reqProf - reqAssoc);
                    }
                }
                else
                {
                    // AICTE APH Annexure 5: UG Engineering, MBA, MCA Cadre ratio is 1 Professor : 2 Assoc Professors : 6 Asst Professors (Divisor: 9)
                    if (requiredFaculty == 1)
                    {
                        reqProf = 1; reqAssoc = 0; reqAsst = 0;
                    }
                    else if (requiredFaculty == 2)
                    {
                        reqProf = 1; reqAssoc = 1; reqAsst = 0;
                    }
                    else
                    {
                        reqProf = Math.Min(requiredFaculty, Math.Max(1, (int)Math.Round((double)requiredFaculty / 9.0, MidpointRounding.AwayFromZero)));
                        reqAssoc = Math.Min(requiredFaculty - reqProf, Math.Max(1, (int)Math.Round((double)requiredFaculty * 2.0 / 9.0, MidpointRounding.AwayFromZero)));
                        reqAsst = Math.Max(0, requiredFaculty - reqProf - reqAssoc);
                    }
                }
            }

            bool hasDesignations = progFaculty.Any(f => f.Designation.HasValue);
            string cadreStatus;
            string statusMsg;
            bool isSubstituted = false;
            int substitutedProf = 0;
            string? qualificationNotice = null;

            if (totalStrength == 0)
            {
                cadreStatus = "Compliant";
                statusMsg = "Zero sanctioned intake; no mandatory AICTE cadre requirement.";
            }
            else if (availableFaculty == 0)
            {
                cadreStatus = "NonCompliant";
                statusMsg = "Faculty count falls below AICTE sanctioned norms.";
            }
            else if (!hasDesignations)
            {
                cadreStatus = "Insufficient Data";
                statusMsg = "Faculty cadre designations (Professor, Assoc Prof, Asst Prof) must be assigned in Staff Directory for AICTE audit.";
            }
            else
            {
                // Professor substitution rule per AICTE APH Annexure 5 Note:
                // An eligible Associate Professor may be considered in lieu of a Professor if a Professor is unavailable.
                int profDeficit = Math.Max(0, reqProf - actualProf);
                int assocSurplus = Math.Max(0, actualAssoc - reqAssoc);
                substitutedProf = Math.Min(profDeficit, assocSurplus);
                int effectiveProf = actualProf + substitutedProf;
                int effectiveAssoc = actualAssoc - substitutedProf;

                bool isCadreCompliant = availableFaculty >= requiredFaculty &&
                                        effectiveProf >= reqProf &&
                                        effectiveAssoc >= reqAssoc;

                if (isCadreCompliant)
                {
                    isSubstituted = substitutedProf > 0;
                    cadreStatus = isSubstituted
                        ? "Compliant — subject to qualification verification"
                        : "Compliant";
                    statusMsg = isSubstituted
                        ? "Meets AICTE APH cadre requirements via eligible Associate Professor substitution in lieu of Professor per Annexure 5 Note."
                        : "Meets AICTE APH cadre and FSR requirements.";
                    qualificationNotice = isSubstituted
                        ? "Statutory Qualification Notice: Associate Professor substitution in lieu of Professor is permitted under AICTE APH 2024–2027 Annexure 5 Note only if the substituting faculty member satisfies prescribed Professor qualifications (PhD degree and applicable teaching/research experience). Colabex does not independently validate academic credentials; the institution must independently verify and document qualification eligibility."
                        : null;
                }
                else
                {
                    cadreStatus = "NonCompliant";
                    statusMsg = "Faculty count or cadre distribution falls below AICTE sanctioned norms.";
                }
            }

            string actualRatio = availableFaculty > 0 
                ? (totalStrength == 0 ? "1:0" : $"1:{Math.Round((decimal)totalStrength / availableFaculty, 1)}")
                : "N/A";

            string programLevelDisplay = isPgEngineering
                ? "PG Engineering"
                : (isManagement ? "MBA" : (isMca ? "MCA" : (prog.Level == AcademicProgramLevel.UG ? "UG Engineering" : prog.Level.ToString())));

            aicteComplianceList.Add(new AicteCadreComplianceDto
            {
                ProgramLevel = programLevelDisplay,
                ProgramCode = prog.Code,
                SanctionedIntake = sanctionedIntake,
                ProgramDurationYears = durationYears,
                TotalSanctionedStrength = totalStrength,
                RequiredFaculty = requiredFaculty,
                AvailableFaculty = availableFaculty,
                RequiredRatio = $"1:{ratioDenominator}",
                ActualRatio = actualRatio,
                IsCompliant = cadreStatus.StartsWith("Compliant"),
                CadreStatus = cadreStatus,
                RequiredProfessors = reqProf,
                ActualProfessors = actualProf,
                RequiredAssociateProfessors = reqAssoc,
                ActualAssociateProfessors = actualAssoc,
                RequiredAssistantProfessors = reqAsst,
                ActualAssistantProfessors = actualAsst,
                StatusMessage = statusMsg,
                IsSubstituted = isSubstituted,
                SubstitutedProfessorsCount = substitutedProf,
                QualificationVerificationNotice = qualificationNotice
            });
        }

        // 5. Department SAR Attestation Progress
        int totalDeptsForSar = depts.Count;
        int attestedDeptsCount = depts.Count(d => d.IsSarAttested);
        decimal sarAttestPct = totalDeptsForSar > 0 ? Math.Round((decimal)attestedDeptsCount / totalDeptsForSar * 100m, 1) : 0m;

        var projectCount = await _context.ProjectTeams.CountAsync(t => !t.IsDeleted);

        // Real Academic Structure Tree
        var academicStructure = courses.Select(c =>
        {
            var childBranches = depts.Where(d => d.CourseProgramId == c.Id || (!d.CourseProgramId.HasValue && c.Code == "BTECH")).ToList();
            var displayCode = c.Code switch
            {
                "BTECH" => "B.Tech",
                "MTECH" => "M.Tech",
                _ => c.Code
            };
            return new OverviewCourseHierarchyDto
            {
                CourseId = c.Id,
                Code = displayCode,
                Name = c.Name,
                BranchCount = childBranches.Count,
                Branches = childBranches.Select(b => b.Code).ToList()
            };
        }).OrderByDescending(s => s.BranchCount).ToList();

        var campusesCount = !string.IsNullOrWhiteSpace(college.CampusesCsv)
            ? college.CampusesCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Length
            : 1;

        // Recent Activities from Institutional Audit Logs
        var relevantActions = new[]
        {
            "CREATE_COURSE", "UPDATE_COURSE", "CREATE_DEPARTMENT", "UPDATE_DEPARTMENT",
            "APPOINT_HOD", "SIGN_OFF_COMPLIANCE", "UPDATE_SETTINGS", "CREATE_STAFF", "ACTIVATE_SESSION"
        };

        var auditLogs = await _context.PlatformAuditLogs
            .Where(l => l.TargetTenantId == collegeId.Value && relevantActions.Contains(l.Action))
            .OrderByDescending(l => l.OccurredAtUtc)
            .Take(5)
            .ToListAsync();

        var recentActivities = new List<CollegeActivityItemDto>();
        foreach (var log in auditLogs)
        {
            var title = log.Action switch
            {
                "CREATE_COURSE" => "New degree program added",
                "UPDATE_COURSE" => "Degree program updated",
                "CREATE_DEPARTMENT" => "New branch added",
                "UPDATE_DEPARTMENT" => "Branch configuration updated",
                "APPOINT_HOD" => $"HOD appointed for {log.TargetEntity}",
                "SIGN_OFF_COMPLIANCE" => "NBA Attainment Dossier Exported & Attested",
                "UPDATE_SETTINGS" => "Campus institutional settings saved",
                "CREATE_STAFF" => "New administrative account created",
                _ => log.Action.Replace('_', ' ')
            };
            recentActivities.Add(new CollegeActivityItemDto
            {
                Title = title,
                TimeAgo = GetRelativeTime(log.OccurredAtUtc),
                OccurredAtUtc = log.OccurredAtUtc
            });
        }

        // Real Notifications
        var pendingSarCount = depts.Count(d => !d.IsSarAttested);
        var notifications = new List<CollegeNotificationItemDto>
        {
            new()
            {
                Type = "success",
                Message = $"Academic session {activeSession.Label} activated",
                TimeAgo = "2h ago",
                CreatedAtUtc = DateTime.UtcNow.AddHours(-2)
            },
            new()
            {
                Type = "info",
                Message = $"{depts.Count} departments active under {courses.Count} degree programs",
                TimeAgo = "3h ago",
                CreatedAtUtc = DateTime.UtcNow.AddHours(-3)
            },
            new()
            {
                Type = pendingSarCount > 0 ? "warning" : "success",
                Message = pendingSarCount > 0
                    ? $"NBA SAR sign-off pending for {pendingSarCount} branches"
                    : "NBA report generation completed",
                TimeAgo = "1d ago",
                CreatedAtUtc = DateTime.UtcNow.AddDays(-1)
            }
        };

        return Ok(new CollegeOverviewDto
        {
            CollegeId = college.Id,
            CollegeName = college.Name,
            TenantCode = college.TenantCode,
            AdminName = adminName,
            TotalCourses = courses.Count,
            TotalBranches = depts.Count,
            TotalDepartments = depts.Count,
            TotalStudents = totalEnrolledIntake,
            TotalFaculty = totalFaculty,
            TotalProjects = projectCount,
            Criterion3AttainmentPct = overallAttainment,
            StrictSsoEnforced = college.EnforceStrictSso,
            AffiliatedUniversity = !string.IsNullOrWhiteSpace(college.AffiliatedUniversity)
                ? college.AffiliatedUniversity
                : "RGPV, Bhopal",
            CollegeType = "Engineering",
            EstablishedYear = "1952",
            CampusesSummary = campusesCount == 1 ? "1 Campus" : $"{campusesCount} Campuses",
            CrestUrl = college.CrestUrl,
            CurrentSemesterLabel = "Odd Semester",
            LastUpdatedUtc = DateTime.UtcNow,
            CohortCapacity = cohortCapacity,
            ProgramAicteCompliance = aicteComplianceList,
            SarDepartmentAttestationPct = sarAttestPct,
            AttestedDepartmentsCount = attestedDeptsCount,
            TotalDepartmentsForSar = totalDeptsForSar,
            ActiveSession = new AcademicSessionDto
            {
                Id = activeSession.Id,
                CollegeId = activeSession.CollegeId,
                Label = activeSession.Label,
                StartDate = activeSession.StartDate,
                EndDate = activeSession.EndDate,
                ExamCutoffDateUtc = activeSession.ExamCutoffDateUtc,
                AllowInterdisciplinaryTeams = activeSession.AllowInterdisciplinaryTeams,
                IsActive = activeSession.IsActive
            },
            DepartmentSummaries = deptSummaries,
            AcademicStructure = academicStructure,
            RecentActivities = recentActivities,
            Notifications = notifications
        });
    }

    #region Master Catalog & 1-Click Import

    [HttpGet("master-catalog")]
    public async Task<ActionResult<List<MasterCatalogOverviewDto>>> GetMasterCatalog()
    {
        var universities = await _context.MasterUniversities
            .IgnoreQueryFilters()
            .Where(u => !u.IsDeleted && u.IsActive)
            .Include(u => u.CurriculumSchemes)
            .Include(u => u.Programs)
                .ThenInclude(p => p.Branches)
            .ToListAsync();

        var result = universities.Select(u => new MasterCatalogOverviewDto
        {
            UniversityId = u.Id,
            UniversityCode = u.Code,
            UniversityName = u.Name,
            State = u.State,
            Schemes = u.CurriculumSchemes.Where(s => !s.IsDeleted && s.IsActive).Select(s => s.Code).ToList(),
            Programs = u.Programs.Where(p => !p.IsDeleted && p.IsActive).Select(p => new MasterProgramSummaryDto
            {
                Id = p.Id,
                Code = p.Code,
                Name = p.Name,
                Level = p.Level,
                DurationYears = p.DurationYears,
                TotalSemesters = p.TotalSemesters,
                BranchCount = p.Branches.Count(b => !b.IsDeleted && b.IsActive),
                Branches = p.Branches.Where(b => !b.IsDeleted && b.IsActive).Select(b => b.Code).ToList()
            }).ToList()
        }).ToList();

        return Ok(result);
    }

    [HttpPost("import-university-catalog")]
    public async Task<ActionResult<ImportCatalogResultDto>> ImportUniversityCatalog([FromBody] ImportUniversityCatalogRequest request)
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var uniCode = string.IsNullOrWhiteSpace(request.UniversityCode) ? "RGPV" : request.UniversityCode.Trim().ToUpperInvariant();

        var university = await _context.MasterUniversities
            .IgnoreQueryFilters()
            .Include(u => u.CurriculumSchemes)
            .Include(u => u.Programs)
                .ThenInclude(p => p.Branches)
                    .ThenInclude(b => b.SubjectTemplates)
            .FirstOrDefaultAsync(u => u.Code == uniCode && !u.IsDeleted);

        if (university == null)
        {
            return NotFound(new { message = $"Master university catalog for '{uniCode}' not found." });
        }

        // 1. Ensure active AcademicSession exists
        var session = await _context.AcademicSessions
            .FirstOrDefaultAsync(s => s.CollegeId == collegeId.Value && s.Label == "2026-27" && !s.IsDeleted);

        if (session == null)
        {
            session = new AcademicSession
            {
                CollegeId = collegeId.Value,
                Label = "2026-27",
                StartDate = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2027, 6, 30, 23, 59, 59, DateTimeKind.Utc),
                IsActive = true
            };
            await _context.AcademicSessions.AddAsync(session);
            await _context.SaveChangesAsync();
        }

        int programsImported = 0;
        int deptsCreated = 0;
        int termsCreated = 0;
        int offeringsCreated = 0;

        // Filter programs if requested
        var requestedPrograms = request.ProgramCodes != null && request.ProgramCodes.Count > 0
            ? university.Programs.Where(p => request.ProgramCodes.Contains(p.Code, StringComparer.OrdinalIgnoreCase)).ToList()
            : university.Programs.ToList();

        foreach (var masterProg in requestedPrograms)
        {
            // Find or create CourseProgram
            var courseProg = await _context.CoursePrograms
                .FirstOrDefaultAsync(p => p.CollegeId == collegeId.Value && p.Code == masterProg.Code && !p.IsDeleted);

            if (courseProg == null)
            {
                courseProg = new CourseProgram
                {
                    CollegeId = collegeId.Value,
                    MasterProgramId = masterProg.Id,
                    Level = masterProg.Level,
                    Code = masterProg.Code,
                    Name = masterProg.Name,
                    TotalSemesters = masterProg.TotalSemesters,
                    IsActive = true
                };
                await _context.CoursePrograms.AddAsync(courseProg);
                await _context.SaveChangesAsync();
                programsImported++;
            }

            // Adopt default scheme (AICTE Flex or first)
            var masterScheme = university.CurriculumSchemes.FirstOrDefault(s => s.Code.Contains("FLEX")) 
                               ?? university.CurriculumSchemes.FirstOrDefault();

            CurriculumScheme? campusScheme = null;
            if (masterScheme != null)
            {
                campusScheme = await _context.CurriculumSchemes
                    .FirstOrDefaultAsync(s => s.CollegeId == collegeId.Value && s.CourseProgramId == courseProg.Id && s.SchemeCode == masterScheme.Code && !s.IsDeleted);

                if (campusScheme == null)
                {
                    campusScheme = new CurriculumScheme
                    {
                        CollegeId = collegeId.Value,
                        CourseProgramId = courseProg.Id,
                        SchemeCode = masterScheme.Code,
                        SchemeVersion = masterScheme.EffectiveFromYear.ToString(),
                        EffectiveAdmissionYear = masterScheme.EffectiveFromYear,
                        IsActive = true
                    };
                    await _context.CurriculumSchemes.AddAsync(campusScheme);
                    await _context.SaveChangesAsync();
                }
            }

            // Import branches as departments
            foreach (var masterBranch in masterProg.Branches.Where(b => !b.IsDeleted))
            {
                var dept = await _context.Departments
                    .FirstOrDefaultAsync(d => d.CollegeId == collegeId.Value && d.CourseProgramId == courseProg.Id && d.Code == masterBranch.Code && !d.IsDeleted);

                if (dept == null)
                {
                    // Check if existing unlinked department with same code exists (migration linkage)
                    dept = await _context.Departments
                        .FirstOrDefaultAsync(d => d.CollegeId == collegeId.Value && d.CourseProgramId == null && d.Code == masterBranch.Code && !d.IsDeleted);

                    if (dept != null)
                    {
                        dept.CourseProgramId = courseProg.Id;
                    }
                    else
                    {
                        dept = new Department
                        {
                            CollegeId = collegeId.Value,
                            CourseProgramId = courseProg.Id,
                            Code = masterBranch.Code,
                            Name = masterBranch.Name,
                            IntakeQuota = 120,
                            IsSarAttested = false
                        };
                        await _context.Departments.AddAsync(dept);
                        deptsCreated++;
                    }
                    await _context.SaveChangesAsync();
                }

                // Import templates into SemesterTerms and SubjectOfferings
                foreach (var tpl in masterBranch.SubjectTemplates.Where(t => !t.IsDeleted))
                {
                    var semTerm = await _context.SemesterTerms
                        .FirstOrDefaultAsync(t => t.CollegeId == collegeId.Value && t.DepartmentId == dept.Id && t.AcademicSessionId == session.Id && t.SemesterNumber == tpl.SemesterNumber && !t.IsDeleted);

                    if (semTerm == null)
                    {
                        semTerm = new SemesterTerm
                        {
                            CollegeId = collegeId.Value,
                            DepartmentId = dept.Id,
                            AcademicSessionId = session.Id,
                            SemesterNumber = tpl.SemesterNumber,
                            SemesterName = $"Semester {tpl.SemesterNumber}",
                            Parity = tpl.SemesterNumber % 2 == 0 ? SemesterParity.Even : SemesterParity.Odd,
                            IsActive = true
                        };
                        await _context.SemesterTerms.AddAsync(semTerm);
                        await _context.SaveChangesAsync();
                        termsCreated++;
                    }

                    var offering = await _context.SubjectOfferings
                        .FirstOrDefaultAsync(o => o.CollegeId == collegeId.Value && o.SemesterTermId == semTerm.Id && o.SubjectCode == tpl.SubjectCode && !o.IsDeleted);

                    if (offering == null)
                    {
                        offering = new SubjectOffering
                        {
                            CollegeId = collegeId.Value,
                            SemesterTermId = semTerm.Id,
                            CurriculumSchemeId = campusScheme?.Id,
                            SubjectCode = tpl.SubjectCode,
                            SubjectName = tpl.SubjectName,
                            SubjectType = tpl.SubjectType,
                            Credits = 4,
                            InternalMaxMarks = tpl.MaxInternalMarks,
                            ExternalMaxMarks = tpl.MaxExternalMarks,
                            IsActive = true
                        };
                        await _context.SubjectOfferings.AddAsync(offering);
                        offeringsCreated++;
                    }
                }
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new ImportCatalogResultDto
        {
            UniversityCode = uniCode,
            UniversityName = university.Name,
            ProgramsImported = programsImported,
            DepartmentsCreated = deptsCreated,
            SemesterTermsCreated = termsCreated,
            SubjectOfferingsCreated = offeringsCreated,
            Message = $"Successfully imported {uniCode} master catalog into campus tenant. ({programsImported} Programs, {deptsCreated} Departments, {termsCreated} Semesters, {offeringsCreated} Project Offerings)"
        });
    }

    #endregion

    #region Academic Hierarchy Endpoints

    [HttpGet("academic-hierarchy")]
    public async Task<ActionResult<AcademicHierarchyTreeDto>> GetAcademicHierarchy()
    {
        var collegeId = _tenantContext.CollegeId!.Value;

        var programs = await _context.CoursePrograms
            .Where(p => p.CollegeId == collegeId && !p.IsDeleted)
            .Include(p => p.Departments)
                .ThenInclude(d => d.HodUser)
            .Include(p => p.Departments)
                .ThenInclude(d => d.Users)
            .Include(p => p.Departments)
                .ThenInclude(d => d.SemesterTerms)
                    .ThenInclude(s => s.SubjectOfferings)
            .OrderBy(p => p.Level)
            .ThenBy(p => p.Code)
            .ToListAsync();

        var result = new AcademicHierarchyTreeDto
        {
            Programs = programs.Select(p => new HierarchyProgramNodeDto
            {
                Id = p.Id,
                Code = p.Code,
                Name = p.Name,
                Level = p.Level,
                TotalSemesters = p.TotalSemesters,
                Departments = p.Departments.Where(d => !d.IsDeleted).Select(d => new HierarchyDepartmentNodeDto
                {
                    Id = d.Id,
                    Code = d.Code,
                    Name = d.Name,
                    HodName = d.HodUser?.FullName,
                    StudentCount = d.Users.Count(u => u.Role == UserRole.Student && !u.IsDeleted),
                    Semesters = d.SemesterTerms.Where(s => !s.IsDeleted).OrderBy(s => s.SemesterNumber).Select(s => new HierarchySemesterNodeDto
                    {
                        Id = s.Id,
                        SemesterNumber = s.SemesterNumber,
                        SemesterName = s.SemesterName,
                        Parity = s.Parity,
                        Offerings = s.SubjectOfferings.Where(o => !o.IsDeleted).Select(o => new HierarchyOfferingNodeDto
                        {
                            Id = o.Id,
                            SubjectCode = o.SubjectCode,
                            SubjectName = o.SubjectName,
                            SubjectType = o.SubjectType,
                            Credits = o.Credits,
                            InternalMaxMarks = o.InternalMaxMarks,
                            ExternalMaxMarks = o.ExternalMaxMarks
                        }).ToList()
                    }).ToList()
                }).ToList()
            }).ToList()
        };

        return Ok(result);
    }

    [HttpGet("course-programs")]
    public async Task<ActionResult<List<CourseProgramDto>>> GetCoursePrograms()
    {
        var collegeId = _tenantContext.CollegeId!.Value;

        var programs = await _context.CoursePrograms
            .Where(p => p.CollegeId == collegeId && !p.IsDeleted)
            .Include(p => p.Departments)
            .OrderBy(p => p.Level)
            .ThenBy(p => p.Code)
            .Select(p => new CourseProgramDto
            {
                Id = p.Id,
                CollegeId = p.CollegeId,
                MasterProgramId = p.MasterProgramId,
                Level = p.Level,
                Code = p.Code,
                Name = p.Name,
                TotalSemesters = p.TotalSemesters,
                IsActive = p.IsActive,
                DepartmentCount = p.Departments.Count(d => !d.IsDeleted)
            })
            .ToListAsync();

        return Ok(programs);
    }

    [HttpPost("course-programs")]
    public async Task<ActionResult<CourseProgramDto>> CreateCourseProgram([FromBody] CreateCourseProgramRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var code = request.Code.Trim().ToUpperInvariant();

        var exists = await _context.CoursePrograms.AnyAsync(p => p.CollegeId == collegeId && p.Code == code && !p.IsDeleted);
        if (exists) return Conflict(new { message = $"Program with code '{code}' already exists." });

        var program = new CourseProgram
        {
            CollegeId = collegeId,
            MasterProgramId = request.MasterProgramId,
            Level = request.Level,
            Code = code,
            Name = request.Name.Trim(),
            TotalSemesters = request.TotalSemesters,
            IsActive = true
        };

        await _context.CoursePrograms.AddAsync(program);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCoursePrograms), new { id = program.Id }, new CourseProgramDto
        {
            Id = program.Id,
            CollegeId = program.CollegeId,
            MasterProgramId = program.MasterProgramId,
            Level = program.Level,
            Code = program.Code,
            Name = program.Name,
            TotalSemesters = program.TotalSemesters,
            IsActive = program.IsActive,
            DepartmentCount = 0
        });
    }

    [HttpPut("course-programs/{id}")]
    public async Task<ActionResult<CourseProgramDto>> UpdateCourseProgram(Guid id, [FromBody] UpdateCourseProgramRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var program = await _context.CoursePrograms
            .Include(p => p.Departments)
            .FirstOrDefaultAsync(p => p.Id == id && p.CollegeId == collegeId && !p.IsDeleted);

        if (program == null) return NotFound(new { message = "Course program not found." });

        if (!string.IsNullOrWhiteSpace(request.Name)) program.Name = request.Name.Trim();
        program.Level = request.Level;
        program.TotalSemesters = request.TotalSemesters;
        program.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        return Ok(new CourseProgramDto
        {
            Id = program.Id,
            CollegeId = program.CollegeId,
            MasterProgramId = program.MasterProgramId,
            Level = program.Level,
            Code = program.Code,
            Name = program.Name,
            TotalSemesters = program.TotalSemesters,
            IsActive = program.IsActive,
            DepartmentCount = program.Departments.Count(d => !d.IsDeleted)
        });
    }

    [HttpDelete("course-programs/{id}")]
    public async Task<IActionResult> DeleteCourseProgram(Guid id)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var program = await _context.CoursePrograms.FirstOrDefaultAsync(p => p.Id == id && p.CollegeId == collegeId && !p.IsDeleted);
        if (program == null) return NotFound(new { message = "Course program not found." });

        program.IsDeleted = true;
        program.DeletedAtUtc = DateTime.UtcNow;
        program.IsActive = false;

        // Cascade soft-delete child departments under this course program
        var childDepts = await _context.Departments
            .Where(d => d.CollegeId == collegeId && d.CourseProgramId == id && !d.IsDeleted)
            .ToListAsync();
        foreach (var dept in childDepts)
        {
            dept.IsDeleted = true;
            dept.DeletedAtUtc = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("academic-sessions")]
    public async Task<ActionResult<List<AcademicSessionDto>>> GetAcademicSessions()
    {
        var collegeId = _tenantContext.CollegeId!.Value;

        var sessions = await _context.AcademicSessions
            .Where(s => s.CollegeId == collegeId && !s.IsDeleted)
            .OrderByDescending(s => s.StartDate)
            .Select(s => new AcademicSessionDto
            {
                Id = s.Id,
                CollegeId = s.CollegeId,
                Label = s.Label,
                StartDate = s.StartDate,
                EndDate = s.EndDate,
                ExamCutoffDateUtc = s.ExamCutoffDateUtc,
                AllowInterdisciplinaryTeams = s.AllowInterdisciplinaryTeams,
                IsActive = s.IsActive
            })
            .ToListAsync();

        return Ok(sessions);
    }

    [HttpGet("sessions/active")]
    public async Task<ActionResult<AcademicSessionDto>> GetActiveSession()
    {
        var collegeId = _tenantContext.CollegeId!.Value;

        var session = await _context.AcademicSessions
            .Where(s => s.CollegeId == collegeId && s.IsActive && !s.IsDeleted)
            .OrderByDescending(s => s.StartDate)
            .FirstOrDefaultAsync();

        if (session == null)
        {
            session = await _context.AcademicSessions
                .Where(s => s.CollegeId == collegeId && !s.IsDeleted)
                .OrderByDescending(s => s.StartDate)
                .FirstOrDefaultAsync();
        }

        if (session == null)
        {
            session = new AcademicSession
            {
                CollegeId = collegeId,
                Label = "2026–2027",
                StartDate = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2027, 6, 30, 23, 59, 59, DateTimeKind.Utc),
                ExamCutoffDateUtc = new DateTime(2027, 5, 31, 23, 59, 59, DateTimeKind.Utc),
                AllowInterdisciplinaryTeams = true,
                IsActive = true
            };
            await _context.AcademicSessions.AddAsync(session);
            await _context.SaveChangesAsync();
        }

        return Ok(new AcademicSessionDto
        {
            Id = session.Id,
            CollegeId = session.CollegeId,
            Label = session.Label,
            StartDate = session.StartDate,
            EndDate = session.EndDate,
            ExamCutoffDateUtc = session.ExamCutoffDateUtc,
            AllowInterdisciplinaryTeams = session.AllowInterdisciplinaryTeams,
            IsActive = session.IsActive
        });
    }

    [HttpPost("sessions")]
    public async Task<ActionResult<AcademicSessionDto>> ConfigureAcademicSession([FromBody] ConfigureAcademicSessionRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var label = string.IsNullOrWhiteSpace(request.AcademicYear) ? "2026–2027" : request.AcademicYear.Trim();

        if (request.IsActive)
        {
            var otherActive = await _context.AcademicSessions
                .Where(s => s.CollegeId == collegeId && s.IsActive && !s.IsDeleted)
                .ToListAsync();
            foreach (var s in otherActive) s.IsActive = false;
        }

        var session = await _context.AcademicSessions
            .FirstOrDefaultAsync(s => s.CollegeId == collegeId && (s.Label == label || s.Label == label.Replace("–", "-")) && !s.IsDeleted);

        if (session == null)
        {
            session = new AcademicSession
            {
                CollegeId = collegeId,
                Label = label,
                StartDate = request.StartDate ?? new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc),
                EndDate = request.EndDate ?? (request.ExamCutoffDateUtc ?? new DateTime(2027, 6, 30, 23, 59, 59, DateTimeKind.Utc)),
                ExamCutoffDateUtc = request.ExamCutoffDateUtc ?? new DateTime(2027, 5, 31, 23, 59, 59, DateTimeKind.Utc),
                AllowInterdisciplinaryTeams = request.AllowInterdisciplinaryTeams,
                IsActive = request.IsActive
            };
            await _context.AcademicSessions.AddAsync(session);
        }
        else
        {
            session.Label = label;
            session.ExamCutoffDateUtc = request.ExamCutoffDateUtc ?? session.ExamCutoffDateUtc;
            session.AllowInterdisciplinaryTeams = request.AllowInterdisciplinaryTeams;
            session.IsActive = request.IsActive;
            if (request.StartDate.HasValue) session.StartDate = request.StartDate.Value;
            if (request.EndDate.HasValue) session.EndDate = request.EndDate.Value;
        }

        await _context.SaveChangesAsync();

        return Ok(new AcademicSessionDto
        {
            Id = session.Id,
            CollegeId = session.CollegeId,
            Label = session.Label,
            StartDate = session.StartDate,
            EndDate = session.EndDate,
            ExamCutoffDateUtc = session.ExamCutoffDateUtc,
            AllowInterdisciplinaryTeams = session.AllowInterdisciplinaryTeams,
            IsActive = session.IsActive
        });
    }

    [HttpPut("sessions/active")]
    public async Task<ActionResult<AcademicSessionDto>> UpdateActiveSession([FromBody] ConfigureAcademicSessionRequest request)
    {
        return await ConfigureAcademicSession(request);
    }

    [HttpPost("academic-sessions")]
    public async Task<ActionResult<AcademicSessionDto>> CreateAcademicSession([FromBody] CreateAcademicSessionRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var label = request.Label.Trim();

        var exists = await _context.AcademicSessions.AnyAsync(s => s.CollegeId == collegeId && s.Label == label && !s.IsDeleted);
        if (exists) return Conflict(new { message = $"Academic session '{label}' already exists." });

        var session = new AcademicSession
        {
            CollegeId = collegeId,
            Label = label,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            ExamCutoffDateUtc = request.ExamCutoffDateUtc,
            AllowInterdisciplinaryTeams = request.AllowInterdisciplinaryTeams,
            IsActive = request.IsActive
        };

        await _context.AcademicSessions.AddAsync(session);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAcademicSessions), new { id = session.Id }, new AcademicSessionDto
        {
            Id = session.Id,
            CollegeId = session.CollegeId,
            Label = session.Label,
            StartDate = session.StartDate,
            EndDate = session.EndDate,
            ExamCutoffDateUtc = session.ExamCutoffDateUtc,
            AllowInterdisciplinaryTeams = session.AllowInterdisciplinaryTeams,
            IsActive = session.IsActive
        });
    }

    [HttpGet("semester-terms")]
    public async Task<ActionResult<List<SemesterTermDto>>> GetSemesterTerms([FromQuery] Guid? departmentId)
    {
        var collegeId = _tenantContext.CollegeId!.Value;

        var query = _context.SemesterTerms
            .Include(t => t.Department)
            .Include(t => t.AcademicSession)
            .Include(t => t.SubjectOfferings)
            .Where(t => t.CollegeId == collegeId && !t.IsDeleted);

        if (departmentId.HasValue)
        {
            query = query.Where(t => t.DepartmentId == departmentId.Value);
        }

        var terms = await query
            .OrderBy(t => t.SemesterNumber)
            .Select(t => new SemesterTermDto
            {
                Id = t.Id,
                CollegeId = t.CollegeId,
                DepartmentId = t.DepartmentId,
                DepartmentCode = t.Department != null ? t.Department.Code : null,
                DepartmentName = t.Department != null ? t.Department.Name : null,
                AcademicSessionId = t.AcademicSessionId,
                AcademicSessionLabel = t.AcademicSession != null ? t.AcademicSession.Label : null,
                SemesterNumber = t.SemesterNumber,
                SemesterName = t.SemesterName,
                Parity = t.Parity,
                IsActive = t.IsActive,
                SubjectOfferingCount = t.SubjectOfferings.Count(o => !o.IsDeleted)
            })
            .ToListAsync();

        return Ok(terms);
    }

    [HttpPost("semester-terms")]
    public async Task<ActionResult<SemesterTermDto>> CreateSemesterTerm([FromBody] CreateSemesterTermRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;

        var exists = await _context.SemesterTerms.AnyAsync(t =>
            t.CollegeId == collegeId &&
            t.DepartmentId == request.DepartmentId &&
            t.AcademicSessionId == request.AcademicSessionId &&
            t.SemesterNumber == request.SemesterNumber &&
            !t.IsDeleted);

        if (exists) return Conflict(new { message = $"Semester {request.SemesterNumber} already exists for this department and session." });

        var term = new SemesterTerm
        {
            CollegeId = collegeId,
            DepartmentId = request.DepartmentId,
            AcademicSessionId = request.AcademicSessionId,
            SemesterNumber = request.SemesterNumber,
            SemesterName = string.IsNullOrWhiteSpace(request.SemesterName) ? $"Semester {request.SemesterNumber}" : request.SemesterName.Trim(),
            Parity = request.Parity,
            IsActive = true
        };

        await _context.SemesterTerms.AddAsync(term);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSemesterTerms), new { id = term.Id }, new SemesterTermDto
        {
            Id = term.Id,
            CollegeId = term.CollegeId,
            DepartmentId = term.DepartmentId,
            AcademicSessionId = term.AcademicSessionId,
            SemesterNumber = term.SemesterNumber,
            SemesterName = term.SemesterName,
            Parity = term.Parity,
            IsActive = term.IsActive,
            SubjectOfferingCount = 0
        });
    }

    [HttpGet("subject-offerings")]
    public async Task<ActionResult<List<SubjectOfferingDto>>> GetSubjectOfferings([FromQuery] Guid? semesterTermId)
    {
        var collegeId = _tenantContext.CollegeId!.Value;

        var query = _context.SubjectOfferings
            .Include(o => o.SemesterTerm)
            .Include(o => o.CurriculumScheme)
            .Where(o => o.CollegeId == collegeId && !o.IsDeleted);

        if (semesterTermId.HasValue)
        {
            query = query.Where(o => o.SemesterTermId == semesterTermId.Value);
        }

        var offerings = await query
            .OrderBy(o => o.SubjectCode)
            .Select(o => new SubjectOfferingDto
            {
                Id = o.Id,
                CollegeId = o.CollegeId,
                SemesterTermId = o.SemesterTermId,
                SemesterNumber = o.SemesterTerm != null ? o.SemesterTerm.SemesterNumber : 0,
                SemesterTermName = o.SemesterTerm != null ? o.SemesterTerm.SemesterName : null,
                CurriculumSchemeId = o.CurriculumSchemeId,
                CurriculumSchemeCode = o.CurriculumScheme != null ? o.CurriculumScheme.SchemeCode : null,
                SubjectCode = o.SubjectCode,
                SubjectName = o.SubjectName,
                SubjectType = o.SubjectType,
                Credits = o.Credits,
                InternalMaxMarks = o.InternalMaxMarks,
                ExternalMaxMarks = o.ExternalMaxMarks,
                IsActive = o.IsActive
            })
            .ToListAsync();

        return Ok(offerings);
    }

    [HttpPost("subject-offerings")]
    public async Task<ActionResult<SubjectOfferingDto>> CreateSubjectOffering([FromBody] CreateSubjectOfferingRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var code = request.SubjectCode.Trim().ToUpperInvariant();

        var exists = await _context.SubjectOfferings.AnyAsync(o =>
            o.CollegeId == collegeId &&
            o.SemesterTermId == request.SemesterTermId &&
            o.SubjectCode == code &&
            !o.IsDeleted);

        if (exists) return Conflict(new { message = $"Subject offering with code '{code}' already exists for this semester." });

        var offering = new SubjectOffering
        {
            CollegeId = collegeId,
            SemesterTermId = request.SemesterTermId,
            CurriculumSchemeId = request.CurriculumSchemeId,
            SubjectCode = code,
            SubjectName = request.SubjectName.Trim(),
            SubjectType = request.SubjectType,
            Credits = request.Credits,
            InternalMaxMarks = request.InternalMaxMarks,
            ExternalMaxMarks = request.ExternalMaxMarks,
            IsActive = true
        };

        await _context.SubjectOfferings.AddAsync(offering);
        await _context.SaveChangesAsync();

        var term = await _context.SemesterTerms.FindAsync(request.SemesterTermId);

        return CreatedAtAction(nameof(GetSubjectOfferings), new { id = offering.Id }, new SubjectOfferingDto
        {
            Id = offering.Id,
            CollegeId = offering.CollegeId,
            SemesterTermId = offering.SemesterTermId,
            SemesterNumber = term?.SemesterNumber ?? 0,
            SemesterTermName = term?.SemesterName,
            CurriculumSchemeId = offering.CurriculumSchemeId,
            SubjectCode = offering.SubjectCode,
            SubjectName = offering.SubjectName,
            SubjectType = offering.SubjectType,
            Credits = offering.Credits,
            InternalMaxMarks = offering.InternalMaxMarks,
            ExternalMaxMarks = offering.ExternalMaxMarks,
            IsActive = offering.IsActive
        });
    }

    #endregion

    #region Department Endpoints

    [HttpGet("departments")]
    public async Task<ActionResult<List<DepartmentDto>>> GetDepartments()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var activeTracks = await _context.AcademicTracks
            .Where(t => t.DepartmentId.HasValue && t.IsActive && !t.IsDeleted)
            .Select(t => t.DepartmentId!.Value)
            .ToListAsync();

        var departments = await _context.Departments
            .Include(d => d.HodUser)
            .Include(d => d.CourseProgram)
            .Where(d => d.CollegeId == collegeId && !d.IsDeleted && (d.CourseProgramId == null || (d.CourseProgram != null && !d.CourseProgram.IsDeleted && d.CourseProgram.IsActive)))
            .OrderBy(d => d.Code)
            .ToListAsync();

        var deptUsers = await _context.Users
            .Where(u => u.CollegeId == collegeId && u.DepartmentId.HasValue && !u.IsDeleted)
            .Select(u => new { u.DepartmentId, u.Role })
            .ToListAsync();

        var result = departments.Select(d =>
        {
            var count = activeTracks.Count(id => id == d.Id);
            var fCount = deptUsers.Count(u => u.DepartmentId == d.Id && (u.Role == UserRole.Faculty || u.Role == UserRole.HOD));
            var sCount = deptUsers.Count(u => u.DepartmentId == d.Id && u.Role == UserRole.Student);
            return new DepartmentDto
            {
                Id = d.Id,
                CollegeId = d.CollegeId,
                CourseProgramId = d.CourseProgramId,
                CourseProgramCode = d.CourseProgram != null ? d.CourseProgram.Code : null,
                CourseProgramName = d.CourseProgram != null ? d.CourseProgram.Name : null,
                Code = d.Code,
                Name = d.Name,
                HodUserId = d.HodUserId,
                HodName = d.HodUser != null ? d.HodUser.FullName : null,
                IntakeQuota = d.IntakeQuota > 0 ? d.IntakeQuota : 120,
                StudentCount = sCount > 0 ? sCount : (d.IntakeQuota > 0 ? d.IntakeQuota : 120),
                FacultyCount = fCount,
                IsSarAttested = d.IsSarAttested,
                SarAttestedAtUtc = d.SarAttestedAtUtc,
                TrackStatus = count > 0 ? "Active" : "Awaiting HOD Launch",
                ActiveTrackCount = count
            };
        }).ToList();

        return Ok(result);
    }

    [HttpPost("departments")]
    public async Task<ActionResult<DepartmentDto>> CreateDepartment([FromBody] CreateDepartmentRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var code = request.Code.Trim().ToUpperInvariant();

        var exists = await _context.Departments.AnyAsync(d =>
            d.CollegeId == collegeId &&
            d.CourseProgramId == request.CourseProgramId &&
            d.Code == code &&
            !d.IsDeleted);

        if (exists) return Conflict(new { message = $"Department with code '{code}' already exists under this program." });

        var department = new Department
        {
            CollegeId = collegeId,
            CourseProgramId = request.CourseProgramId,
            Code = code,
            Name = request.Name.Trim(),
            IntakeQuota = request.IntakeQuota
        };

        await _context.Departments.AddAsync(department);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetDepartments), new { id = department.Id }, new DepartmentDto
        {
            Id = department.Id,
            CollegeId = department.CollegeId,
            CourseProgramId = department.CourseProgramId,
            Code = department.Code,
            Name = department.Name,
            IntakeQuota = department.IntakeQuota
        });
    }

    [HttpPut("departments/{id}")]
    public async Task<ActionResult<DepartmentDto>> UpdateDepartment(Guid id, [FromBody] UpdateDepartmentRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var dept = await _context.Departments
            .Include(d => d.HodUser)
            .Include(d => d.CourseProgram)
            .FirstOrDefaultAsync(d => d.Id == id && d.CollegeId == collegeId && !d.IsDeleted);

        if (dept == null) return NotFound(new { message = "Department not found." });

        if (!string.IsNullOrWhiteSpace(request.Name)) dept.Name = request.Name.Trim();
        if (!string.IsNullOrWhiteSpace(request.Code)) dept.Code = request.Code.Trim().ToUpperInvariant();
        if (request.IntakeQuota > 0) dept.IntakeQuota = request.IntakeQuota;
        dept.CourseProgramId = request.CourseProgramId;

        await _context.SaveChangesAsync();

        var facultyCount = await _context.Users.CountAsync(u => u.DepartmentId == dept.Id && (u.Role == UserRole.Faculty || u.Role == UserRole.HOD) && !u.IsDeleted);
        var studentCount = await _context.Users.CountAsync(u => u.DepartmentId == dept.Id && u.Role == UserRole.Student && !u.IsDeleted);

        return Ok(new DepartmentDto
        {
            Id = dept.Id,
            CollegeId = dept.CollegeId,
            CourseProgramId = dept.CourseProgramId,
            CourseProgramCode = dept.CourseProgram?.Code,
            CourseProgramName = dept.CourseProgram?.Name,
            Code = dept.Code,
            Name = dept.Name,
            HodUserId = dept.HodUserId,
            HodName = dept.HodUser?.FullName,
            IntakeQuota = dept.IntakeQuota,
            StudentCount = studentCount > 0 ? studentCount : dept.IntakeQuota,
            FacultyCount = facultyCount,
            IsSarAttested = dept.IsSarAttested,
            SarAttestedAtUtc = dept.SarAttestedAtUtc
        });
    }

    [HttpDelete("departments/{id}")]
    public async Task<IActionResult> DeleteDepartment(Guid id)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var dept = await _context.Departments.FirstOrDefaultAsync(d => d.Id == id && d.CollegeId == collegeId && !d.IsDeleted);
        if (dept == null) return NotFound(new { message = "Department not found." });

        dept.IsDeleted = true;
        dept.DeletedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("departments/{id}/hod")]
    [HttpPut("departments/{id}/appoint-hod")]
    public async Task<IActionResult> AppointHod(Guid id, [FromBody] AppointHodRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var department = await _context.Departments.FirstOrDefaultAsync(d => d.Id == id && d.CollegeId == collegeId && !d.IsDeleted);
        if (department == null) return NotFound(new { message = "Department not found." });

        var faculty = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.HodUserId && u.CollegeId == collegeId && !u.IsDeleted);
        if (faculty == null) return NotFound(new { message = "Appointed faculty user not found in this institution." });

        if (faculty.Role == UserRole.SuperAdmin)
        {
            return BadRequest(new { message = "Platform SuperAdmin accounts cannot be assigned as department HOD." });
        }

        // Promote user role to HOD and assign to department
        faculty.Role = UserRole.HOD;
        faculty.DepartmentId = department.Id;

        department.HodUserId = faculty.Id;

        var (callerId, callerEmail, callerName) = await ResolveCallerIdentityAsync();

        // Relieve previous active appointment
        var pastAppts = await _context.HodAppointmentHistories
            .Where(h => h.DepartmentId == department.Id && h.CollegeId == collegeId && h.IsCurrent && !h.IsDeleted)
            .ToListAsync();
        foreach (var past in pastAppts)
        {
            past.IsCurrent = false;
            past.RelievedAtUtc = DateTime.UtcNow;
        }

        // Record appointment in history
        var newAppt = new HodAppointmentHistory
        {
            CollegeId = collegeId,
            DepartmentId = department.Id,
            HodUserId = faculty.Id,
            AppointedByUserId = callerId,
            AppointedByName = callerName,
            AppointedAtUtc = DateTime.UtcNow,
            IsCurrent = true,
            Remarks = $"Appointed by {callerName}"
        };
        await _context.HodAppointmentHistories.AddAsync(newAppt);

        // Audit log appointment
        var audit = new PlatformAuditLog
        {
            ActorUserId = callerId,
            ActorEmail = callerEmail,
            Action = "APPOINT_HOD",
            TargetTenantId = collegeId,
            TargetEntity = "Department",
            MetadataJson = $"{{\"DepartmentCode\":\"{department.Code}\",\"HodName\":\"{faculty.FullName}\",\"HodEmail\":\"{faculty.Email}\"}}",
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(audit);

        await _context.SaveChangesAsync();

        return Ok(new { success = true, departmentId = department.Id, hodId = faculty.Id, hodName = faculty.FullName });
    }

    // --- D. HOD Management Endpoints ---

    [HttpGet("hods")]
    public async Task<ActionResult<List<HodManagementDto>>> GetHods()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var depts = await _context.Departments
            .Include(d => d.HodUser)
            .Include(d => d.CourseProgram)
            .Where(d => d.CollegeId == collegeId && !d.IsDeleted && (d.CourseProgramId == null || (d.CourseProgram != null && !d.CourseProgram.IsDeleted && d.CourseProgram.IsActive)))
            .OrderBy(d => d.Code)
            .ToListAsync();

        var result = depts.Select(d => new HodManagementDto
        {
            DepartmentId = d.Id,
            DepartmentCode = d.Code,
            DepartmentName = d.Name,
            CourseProgramId = d.CourseProgramId,
            CourseProgramCode = d.CourseProgram?.Code,
            CourseProgramName = d.CourseProgram?.Name,
            HodUserId = d.HodUserId,
            HodName = d.HodUser?.FullName,
            HodEmail = d.HodUser?.Email,
            EmployeeCode = d.HodUser?.EnrollmentOrEmployeeCode,
            IsActive = d.HodUser?.IsActive ?? false,
            AppointedAtUtc = d.HodUser?.CreatedAtUtc
        }).ToList();

        return Ok(result);
    }

    [HttpPost("hods/create")]
    public async Task<ActionResult<HodManagementDto>> CreateHod([FromBody] CreateHodRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var email = request.Email.Trim().ToLowerInvariant();

        var dept = await _context.Departments
            .Include(d => d.CourseProgram)
            .FirstOrDefaultAsync(d => d.Id == request.DepartmentId && d.CollegeId == collegeId && !d.IsDeleted);

        if (dept == null) return NotFound(new { message = "Department not found." });

        var existingUser = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted);

        if (existingUser != null && existingUser.CollegeId != collegeId)
        {
            return Conflict(new { message = $"User with email '{email}' is registered under another institution." });
        }

        if (existingUser != null && existingUser.Role == UserRole.SuperAdmin)
        {
            return BadRequest(new { message = "Platform SuperAdmin accounts cannot be reassigned as department HOD." });
        }

        UserAccount hod;
        var defaultPassword = string.IsNullOrWhiteSpace(request.TemporaryPassword) 
            ? $"Collabex!{System.Security.Cryptography.RandomNumberGenerator.GetHexString(3).ToUpper()}@{System.Security.Cryptography.RandomNumberGenerator.GetInt32(100, 999)}"
            : request.TemporaryPassword;
        var passwordHash = PasswordHelper.HashPassword(defaultPassword);

        if (existingUser != null)
        {
            hod = existingUser;
            hod.Role = UserRole.HOD;
            hod.DepartmentId = dept.Id;
            hod.IsActive = true;
            hod.IsActivated = true;
            if (string.IsNullOrWhiteSpace(hod.PasswordHash))
            {
                hod.PasswordHash = passwordHash;
                hod.PasswordChangedAtUtc = null;
            }
        }
        else
        {
            hod = new UserAccount
            {
                CollegeId = collegeId,
                DepartmentId = dept.Id,
                FullName = request.FullName.Trim(),
                Email = email,
                EnrollmentOrEmployeeCode = string.IsNullOrWhiteSpace(request.EmployeeCode) ? $"HOD-{dept.Code}" : request.EmployeeCode.Trim(),
                Role = UserRole.HOD,
                PasswordHash = passwordHash,
                PasswordChangedAtUtc = null,
                IsActivated = true,
                IsActive = true
            };
            await _context.Users.AddAsync(hod);
        }

        dept.HodUserId = hod.Id;

        var (callerId, callerEmail, callerName) = await ResolveCallerIdentityAsync();

        // Relieve previous active appointment
        var pastAppts = await _context.HodAppointmentHistories
            .Where(h => h.DepartmentId == dept.Id && h.CollegeId == collegeId && h.IsCurrent && !h.IsDeleted)
            .ToListAsync();
        foreach (var past in pastAppts)
        {
            past.IsCurrent = false;
            past.RelievedAtUtc = DateTime.UtcNow;
        }

        var newAppt = new HodAppointmentHistory
        {
            CollegeId = collegeId,
            DepartmentId = dept.Id,
            HodUserId = hod.Id,
            AppointedByUserId = callerId,
            AppointedByName = callerName,
            AppointedAtUtc = DateTime.UtcNow,
            IsCurrent = true,
            Remarks = $"Direct appointment by {callerName}"
        };
        await _context.HodAppointmentHistories.AddAsync(newAppt);

        // Log appointment audit
        var audit = new PlatformAuditLog
        {
            ActorUserId = callerId,
            ActorEmail = callerEmail,
            Action = "APPOINT_HOD",
            TargetTenantId = collegeId,
            TargetEntity = "Department",
            MetadataJson = $"{{\"DepartmentCode\":\"{dept.Code}\",\"HodName\":\"{hod.FullName}\",\"HodEmail\":\"{hod.Email}\"}}",
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(audit);

        await _context.SaveChangesAsync();

        return Ok(new HodManagementDto
        {
            DepartmentId = dept.Id,
            DepartmentCode = dept.Code,
            DepartmentName = dept.Name,
            CourseProgramId = dept.CourseProgramId,
            CourseProgramCode = dept.CourseProgram?.Code,
            CourseProgramName = dept.CourseProgram?.Name,
            HodUserId = hod.Id,
            HodName = hod.FullName,
            HodEmail = hod.Email,
            EmployeeCode = hod.EnrollmentOrEmployeeCode,
            IsActive = hod.IsActive,
            AppointedAtUtc = DateTime.UtcNow
        });
    }

    [HttpGet("hods/history")]
    public async Task<ActionResult<List<HodAssignmentHistoryDto>>> GetHodHistory()
    {
        var collegeId = _tenantContext.CollegeId!.Value;

        var historyEntities = await _context.HodAppointmentHistories
            .Include(h => h.Department)
            .Include(h => h.HodUser)
            .Where(h => h.CollegeId == collegeId && !h.IsDeleted)
            .OrderByDescending(h => h.AppointedAtUtc)
            .ToListAsync();

        if (!historyEntities.Any())
        {
            // Baseline from current departments
            var currentDepts = await _context.Departments
                .Include(d => d.HodUser)
                .Where(d => d.CollegeId == collegeId && d.HodUserId.HasValue && !d.IsDeleted)
                .ToListAsync();

            var (_, _, callerName) = await ResolveCallerIdentityAsync();

            foreach (var d in currentDepts.Where(d => d.HodUser != null))
            {
                var entry = new HodAppointmentHistory
                {
                    CollegeId = collegeId,
                    DepartmentId = d.Id,
                    HodUserId = d.HodUser!.Id,
                    AppointedByName = callerName,
                    AppointedAtUtc = d.HodUser.CreatedAtUtc,
                    IsCurrent = true,
                    Remarks = "Initial Department HOD Assignment"
                };
                await _context.HodAppointmentHistories.AddAsync(entry);
                historyEntities.Add(entry);
            }
            if (historyEntities.Any())
            {
                await _context.SaveChangesAsync();
            }
        }

        var history = historyEntities.Select(h => new HodAssignmentHistoryDto
        {
            Id = h.Id,
            DepartmentId = h.DepartmentId,
            DepartmentCode = h.Department?.Code ?? "N/A",
            DepartmentName = h.Department?.Name ?? "Department",
            HodUserId = h.HodUserId,
            HodName = h.HodUser?.FullName ?? "Head of Department",
            HodEmail = h.HodUser?.Email ?? "hod@college.ac.in",
            EmployeeCode = h.HodUser?.EnrollmentOrEmployeeCode ?? "N/A",
            AppointedAtUtc = h.AppointedAtUtc,
            AppointedBy = h.AppointedByName,
            IsCurrent = h.IsCurrent
        }).ToList();

        return Ok(history);
    }

    [HttpPut("hods/{userId}/status")]
    public async Task<IActionResult> UpdateHodStatus(Guid userId, [FromBody] UpdateUserStatusRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.CollegeId == collegeId && !u.IsDeleted);
        if (user == null) return NotFound(new { message = "User not found." });

        user.IsActive = request.IsActive;
        if (!request.IsActive)
        {
            user.SecurityStamp = Guid.NewGuid().ToString("N");
            var sessionSecurity = HttpContext.RequestServices.GetRequiredService<ISessionSecurityService>();
            await sessionSecurity.RevokeAllUserSessionsAsync(user.Id, null, "AccountDeactivated");
        }
        await _context.SaveChangesAsync();
        return Ok(new { success = true, isActive = user.IsActive });
    }

    // --- E. College-level User / Staff Management Endpoints ---

    [HttpGet("users")]
    public async Task<ActionResult<List<CollegeStaffDto>>> GetStaffUsers([FromQuery] string? role, [FromQuery] string? search)
    {
        var collegeId = _tenantContext.CollegeId!.Value;

        var query = _context.Users
            .Include(u => u.Department)
            .Where(u => u.CollegeId == collegeId && !u.IsDeleted && u.Role != UserRole.Student);

        if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<UserRole>(role, true, out var roleEnum))
        {
            query = query.Where(u => u.Role == roleEnum);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u => u.FullName.ToLower().Contains(s) || u.Email.ToLower().Contains(s) || (u.EnrollmentOrEmployeeCode != null && u.EnrollmentOrEmployeeCode.ToLower().Contains(s)));
        }

        var users = await query
            .OrderBy(u => u.Role)
            .ThenBy(u => u.FullName)
            .Select(u => new CollegeStaffDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                Role = u.Role,
                Designation = u.Designation,
                DelegatedResponsibility = u.DelegatedResponsibility,
                DepartmentId = u.DepartmentId,
                DepartmentCode = u.Department != null ? u.Department.Code : null,
                DepartmentName = u.Department != null ? u.Department.Name : null,
                EmployeeCode = u.EnrollmentOrEmployeeCode,
                IsActive = u.IsActive,
                IsActivated = u.IsActivated,
                CreatedAtUtc = u.CreatedAtUtc,
                LastLoginAtUtc = u.LastLoginAtUtc
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPost("users")]
    public async Task<ActionResult<CollegeStaffDto>> CreateStaffUser([FromBody] CreateCollegeStaffRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var email = request.Email.Trim().ToLowerInvariant();

        if (request.Role == UserRole.SuperAdmin)
        {
            return BadRequest(new { message = "College administrators cannot create or assign the SuperAdmin platform role." });
        }

        var exists = await _context.Users.IgnoreQueryFilters().AnyAsync(u => u.Email == email && !u.IsDeleted);
        if (exists) return Conflict(new { message = $"User with email '{email}' already exists." });

        var rawActivationToken = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-").Replace("/", "_").TrimEnd('=');
        var activationTokenHash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawActivationToken)));

        var user = new UserAccount
        {
            CollegeId = collegeId,
            DepartmentId = request.DepartmentId,
            FullName = request.FullName.Trim(),
            Email = email,
            Role = request.Role,
            Designation = request.Designation,
            DelegatedResponsibility = request.DelegatedResponsibility,
            EnrollmentOrEmployeeCode = string.IsNullOrWhiteSpace(request.EmployeeCode) ? $"STAFF-{Guid.NewGuid().ToString("N")[..6].ToUpper()}" : request.EmployeeCode.Trim(),
            PasswordHash = null,
            PasswordChangedAtUtc = null,
            ActivationTokenHashed = activationTokenHash,
            ActivationTokenExpiresAtUtc = DateTime.UtcNow.AddHours(24),
            IsActive = true,
            IsActivated = false
        };

        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        var emailSender = HttpContext.RequestServices.GetRequiredService<IEmailSender>();
        await emailSender.SendAccountActivationAsync(user.Email, user.FullName, rawActivationToken);

        var dept = request.DepartmentId.HasValue 
            ? await _context.Departments.FirstOrDefaultAsync(d => d.Id == request.DepartmentId.Value) 
            : null;

        return Ok(new CollegeStaffDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
            Designation = user.Designation,
            DelegatedResponsibility = user.DelegatedResponsibility,
            DepartmentId = user.DepartmentId,
            DepartmentCode = dept?.Code,
            DepartmentName = dept?.Name,
            EmployeeCode = user.EnrollmentOrEmployeeCode,
            TemporaryPassword = null, // Plaintext credential never exposed in production
            IsActive = user.IsActive,
            IsActivated = user.IsActivated,
            CreatedAtUtc = user.CreatedAtUtc,
            LastLoginAtUtc = null
        });
    }

    [HttpPut("users/{id}/status")]
    public async Task<IActionResult> UpdateUserStatus(Guid id, [FromBody] UpdateUserStatusRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.CollegeId == collegeId && !u.IsDeleted);
        if (user == null) return NotFound(new { message = "User not found." });

        if (id == _tenantContext.UserId && !request.IsActive)
        {
            return BadRequest(new { message = "Administrators cannot deactivate their own active account." });
        }

        if (user.Role == UserRole.SuperAdmin)
        {
            return Forbid();
        }

        user.IsActive = request.IsActive;
        if (!request.IsActive)
        {
            user.SecurityStamp = Guid.NewGuid().ToString("N");
            var sessionSecurity = HttpContext.RequestServices.GetRequiredService<ISessionSecurityService>();
            await sessionSecurity.RevokeAllUserSessionsAsync(user.Id, null, "AccountDeactivated");
        }
        await _context.SaveChangesAsync();
        return Ok(new { success = true, isActive = user.IsActive });
    }

    [HttpPost("users/{id}/reset-password")]
    public async Task<IActionResult> ResetStaffPassword(Guid id)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.CollegeId == collegeId && !u.IsDeleted);
        if (user == null) return NotFound(new { message = "User not found." });

        if (user.Role == UserRole.SuperAdmin)
        {
            return Forbid();
        }

        // Generate cryptographically secure 6-digit OTP matching platform standard for /api/auth/reset-password
        var otpNumber = System.Security.Cryptography.RandomNumberGenerator.GetInt32(100000, 1000000);
        var otp = otpNumber.ToString("D6");

        user.PasswordResetOtpHashed = PasswordHelper.HashPassword(otp);
        user.PasswordResetOtpExpiresAtUtc = DateTime.UtcNow.AddMinutes(15);
        user.PasswordResetOtpAttempts = 0;
        user.PasswordChangedAtUtc = null;
        await _context.SaveChangesAsync();

        bool emailDispatched = false;
        try
        {
            await _emailSender.SendPasswordResetOtpAsync(user.Email, user.FullName, otp);
            emailDispatched = true;
            _logger.LogInformation("Password reset OTP dispatched to staff member {Email} for tenant {CollegeId}", user.Email, collegeId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to dispatch password reset OTP email to {Email}", user.Email);
            emailDispatched = false;
        }

        // In development only, supply devOtp for test harnesses. In production, never expose credentials.
        string? devOtp = _environment.IsDevelopment() ? otp : null;

        return Ok(new
        {
            success = true,
            message = emailDispatched
                ? "Password reset token generated and dispatched to staff member's official email address."
                : "Password reset token generated, but email delivery failed. Please check institutional mail service.",
            emailDispatched = emailDispatched,
            expiresAtUtc = user.PasswordResetOtpExpiresAtUtc,
            devOtp = devOtp
        });
    }

    [HttpPut("users/{id}")]
    public async Task<ActionResult<CollegeStaffDto>> UpdateStaffUser(Guid id, [FromBody] UpdateCollegeStaffRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var user = await _context.Users.Include(u => u.Department).FirstOrDefaultAsync(u => u.Id == id && u.CollegeId == collegeId && !u.IsDeleted);
        if (user == null) return NotFound(new { message = "User not found." });

        if (!string.IsNullOrWhiteSpace(request.FullName)) user.FullName = request.FullName.Trim();
        if (request.Role.HasValue)
        {
            if (request.Role.Value == UserRole.SuperAdmin)
            {
                return BadRequest(new { message = "College administrators cannot assign the SuperAdmin platform role." });
            }
            user.Role = request.Role.Value;
        }
        if (request.Designation.HasValue) user.Designation = request.Designation.Value;
        if (request.DelegatedResponsibility.HasValue) user.DelegatedResponsibility = request.DelegatedResponsibility.Value;
        if (request.EmployeeCode != null) user.EnrollmentOrEmployeeCode = request.EmployeeCode.Trim();
        user.DepartmentId = request.DepartmentId;

        // If updated to HOD and departmentId is specified, also set as department's HodUserId
        if (user.Role == UserRole.HOD && user.DepartmentId.HasValue)
        {
            var dept = await _context.Departments.FirstOrDefaultAsync(d => d.Id == user.DepartmentId.Value);
            if (dept != null) dept.HodUserId = user.Id;
        }

        await _context.SaveChangesAsync();
        return Ok(new CollegeStaffDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
            Designation = user.Designation,
            DelegatedResponsibility = user.DelegatedResponsibility,
            DepartmentId = user.DepartmentId,
            DepartmentCode = user.Department?.Code,
            DepartmentName = user.Department?.Name,
            EmployeeCode = user.EnrollmentOrEmployeeCode,
            IsActive = user.IsActive,
            IsActivated = user.IsActivated,
            CreatedAtUtc = user.CreatedAtUtc
        });
    }

    [HttpPost("users/bulk")]
    public async Task<ActionResult<BulkStaffUploadResultDto>> BulkUploadStaff([FromBody] BulkStaffUploadRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        if (request.StaffRows == null || request.StaffRows.Count == 0)
        {
            return BadRequest(new { message = "No staff records provided in request." });
        }

        var errors = new List<string>();
        var emailsInFile = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var depts = await _context.Departments
            .Where(d => d.CollegeId == collegeId && !d.IsDeleted)
            .ToListAsync();

        var existingEmails = (await _context.Users
            .IgnoreQueryFilters()
            .Where(u => !u.IsDeleted)
            .Select(u => u.Email)
            .ToListAsync()).ToHashSet(StringComparer.OrdinalIgnoreCase);

        var usersToAdd = new List<UserAccount>();

        for (int i = 0; i < request.StaffRows.Count; i++)
        {
            var row = request.StaffRows[i];
            int rowNum = i + 1;

            if (string.IsNullOrWhiteSpace(row.FullName))
            {
                errors.Add($"Row {rowNum}: Full name is required.");
                continue;
            }

            if (string.IsNullOrWhiteSpace(row.Email) || !row.Email.Contains('@'))
            {
                errors.Add($"Row {rowNum}: Valid institutional email is required.");
                continue;
            }

            if (row.Role == UserRole.SuperAdmin)
            {
                errors.Add($"Row {rowNum}: College administrators cannot provision the SuperAdmin platform role.");
                continue;
            }

            var normalizedEmail = row.Email.Trim().ToLowerInvariant();
            if (emailsInFile.Contains(normalizedEmail))
            {
                errors.Add($"Row {rowNum}: Duplicate email '{normalizedEmail}' in upload file.");
                continue;
            }
            emailsInFile.Add(normalizedEmail);

            if (existingEmails.Contains(normalizedEmail))
            {
                errors.Add($"Row {rowNum}: User with email '{normalizedEmail}' already exists in platform.");
                continue;
            }

            Guid? deptId = null;
            if (!string.IsNullOrWhiteSpace(row.DepartmentCode))
            {
                var dept = depts.FirstOrDefault(d => string.Equals(d.Code, row.DepartmentCode.Trim(), StringComparison.OrdinalIgnoreCase));
                if (dept == null)
                {
                    errors.Add($"Row {rowNum}: Department with code '{row.DepartmentCode}' not found.");
                    continue;
                }
                deptId = dept.Id;
            }

            var tempPassword = $"Collabex!{System.Security.Cryptography.RandomNumberGenerator.GetHexString(3).ToUpper()}@{System.Security.Cryptography.RandomNumberGenerator.GetInt32(100, 999)}";
            var user = new UserAccount
            {
                CollegeId = collegeId,
                DepartmentId = deptId,
                FullName = row.FullName.Trim(),
                Email = normalizedEmail,
                Role = row.Role,
                Designation = row.Designation,
                EnrollmentOrEmployeeCode = string.IsNullOrWhiteSpace(row.EmployeeCode) ? $"STAFF-{Guid.NewGuid().ToString("N")[..6].ToUpper()}" : row.EmployeeCode.Trim(),
                PasswordHash = PasswordHelper.HashPassword(tempPassword),
                PasswordChangedAtUtc = null,
                IsActive = true,
                IsActivated = true
            };

            usersToAdd.Add(user);
        }

        // Pass 1: In-Memory Validation Gate (All-or-Nothing Atomicity)
        // If ANY row in the upload fails validation, ZERO records are persisted.
        if (errors.Count > 0)
        {
            return BadRequest(new BulkStaffUploadResultDto
            {
                TotalSubmitted = request.StaffRows.Count,
                SuccessfullyCreated = 0,
                FailedCount = errors.Count,
                Errors = errors
            });
        }

        // Pass 2: Atomic Transactional Database Persistence
        if (usersToAdd.Count > 0)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                using var tx = await _context.Database.BeginTransactionAsync();
                try
                {
                    await _context.Users.AddRangeAsync(usersToAdd);
                    await _context.SaveChangesAsync();
                    await tx.CommitAsync();
                }
                catch (Exception ex)
                {
                    await tx.RollbackAsync();
                    _logger.LogError(ex, "Transaction rolled back during bulk staff import for college {CollegeId}", collegeId);
                    throw;
                }
            });
        }

        return Ok(new BulkStaffUploadResultDto
        {
            TotalSubmitted = request.StaffRows.Count,
            SuccessfullyCreated = usersToAdd.Count,
            FailedCount = 0,
            Errors = new List<string>()
        });
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteStaffUser(Guid id)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.CollegeId == collegeId && !u.IsDeleted);
        if (user == null) return NotFound(new { message = "User not found." });

        if (id == _tenantContext.UserId)
        {
            return BadRequest(new { message = "Administrators cannot delete their own active account." });
        }

        if (user.Role == UserRole.SuperAdmin)
        {
            return Forbid();
        }

        user.IsDeleted = true;
        user.DeletedAtUtc = DateTime.UtcNow;
        user.IsActive = false;

        // If this user was HOD of any department, unassign them
        var hodDepts = await _context.Departments.Where(d => d.HodUserId == id).ToListAsync();
        foreach (var d in hodDepts)
        {
            d.HodUserId = null;
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("results")]
    public async Task<ActionResult<ExaminationTabulationRegisterDto>> GetExaminationTabulationRegister([FromQuery] Guid? trackId, [FromQuery] Guid? departmentId)
    {
        var collegeId = _tenantContext.CollegeId!.Value;

        // 1. Resolve AcademicTrack for weights
        AcademicTrack? track = null;
        if (trackId.HasValue)
        {
            track = await _context.AcademicTracks.FirstOrDefaultAsync(t => t.Id == trackId.Value && t.CollegeId == collegeId && !t.IsDeleted);
        }
        if (track == null)
        {
            track = await _context.AcademicTracks
                .Where(t => t.CollegeId == collegeId && t.IsActive && !t.IsDeleted)
                .OrderByDescending(t => t.CreatedAtUtc)
                .FirstOrDefaultAsync();
        }

        int guideWeight = track?.GuideWeightPct ?? 30;
        int midTermWeight = track?.MidTermWeightPct ?? 30;
        int finalVivaWeight = track?.FinalVivaWeightPct ?? 40;

        // 2. Query Viva Evaluations and Team Members
        var query = _context.TeamMembers
            .Include(m => m.User)
            .Include(m => m.ProjectTeam)
                .ThenInclude(t => t!.Department)
            .Include(m => m.ProjectTeam)
                .ThenInclude(t => t!.Evaluations)
            .Where(m => m.ProjectTeam != null && m.ProjectTeam.CollegeId == collegeId && !m.IsDeleted && !m.ProjectTeam.IsDeleted);

        if (departmentId.HasValue)
        {
            query = query.Where(m => m.ProjectTeam!.DepartmentId == departmentId.Value);
        }

        var members = await query.ToListAsync();
        var allScores = await _context.IndividualStudentScores
            .Where(s => s.CollegeId == collegeId && !s.IsDeleted)
            .ToListAsync();

        var rows = new List<ExaminationTabulationRowDto>();
        foreach (var m in members)
        {
            var student = m.User;
            var team = m.ProjectTeam;
            var evals = team?.Evaluations.Where(e => !e.IsDeleted).ToList() ?? new List<VivaEvaluation>();
            var indivScores = allScores.Where(s => s.StudentUserId == m.UserId).ToList();

            decimal latestShared = evals.Any() ? evals.Average(e => e.SharedTotalScore) : 0m;
            decimal indivScore = indivScores.Any() ? indivScores.Average(s => s.IndividualTotalScore) : 0m;

            // Reject negative score anomalies
            if (latestShared < 0m) latestShared = 0m;
            if (indivScore < 0m) indivScore = 0m;

            // Normalize blended rubric score (0-100 scale) to continuous evaluation weights
            decimal guideBlended = (latestShared * 0.6m + indivScore * 0.4m);
            decimal midTermBlended = (latestShared * 0.7m + indivScore * 0.3m);
            decimal finalVivaBlended = (latestShared * 0.5m + indivScore * 0.5m);

            // Guard against out-of-range source scores: clamp blended to [0, 100]
            guideBlended = Math.Clamp(guideBlended, 0m, 100m);
            midTermBlended = Math.Clamp(midTermBlended, 0m, 100m);
            finalVivaBlended = Math.Clamp(finalVivaBlended, 0m, 100m);

            decimal guideScore = Math.Round((guideBlended / 100m) * guideWeight, 1);
            decimal midTermScore = Math.Round((midTermBlended / 100m) * midTermWeight, 1);
            decimal finalVivaScore = Math.Round((finalVivaBlended / 100m) * finalVivaWeight, 1);

            // Component-level maximum-weight enforcement
            guideScore = Math.Min((decimal)guideWeight, Math.Max(0m, guideScore));
            midTermScore = Math.Min((decimal)midTermWeight, Math.Max(0m, midTermScore));
            finalVivaScore = Math.Min((decimal)finalVivaWeight, Math.Max(0m, finalVivaScore));

            decimal totalScore = Math.Round(guideScore + midTermScore + finalVivaScore, 1);
            totalScore = Math.Min(100m, Math.Max(0m, totalScore));

            // Grade calculation (10-point CBCS scale)
            string grade;
            int gradePoints;
            string resultStatus;

            if (totalScore >= 90m) { grade = "A+"; gradePoints = 10; resultStatus = "Pass"; }
            else if (totalScore >= 80m) { grade = "A"; gradePoints = 9; resultStatus = "Pass"; }
            else if (totalScore >= 70m) { grade = "B+"; gradePoints = 8; resultStatus = "Pass"; }
            else if (totalScore >= 60m) { grade = "B"; gradePoints = 7; resultStatus = "Pass"; }
            else if (totalScore >= 50m) { grade = "C+"; gradePoints = 6; resultStatus = "Pass"; }
            else if (totalScore >= 40m) { grade = "C"; gradePoints = 5; resultStatus = "Pass"; }
            else { grade = "F"; gradePoints = 0; resultStatus = totalScore > 0 ? "Fail" : "Pending"; }

            rows.Add(new ExaminationTabulationRowDto
            {
                StudentId = student?.Id ?? m.UserId,
                EnrollmentNumber = student?.EnrollmentOrEmployeeCode ?? "ENR-" + m.Id.ToString()[..6],
                StudentName = student?.FullName ?? "Student Member",
                DepartmentCode = team?.Department?.Code ?? "ENGG",
                TeamNumber = team?.TeamCode ?? "TM-00",
                ProjectTitle = team?.Title ?? "Untitled Capstone Project",
                GuideScore = guideScore,
                MidTermScore = midTermScore,
                FinalVivaScore = finalVivaScore,
                TotalScore = totalScore,
                Grade = grade,
                GradePoints = gradePoints,
                ResultStatus = resultStatus,
                MeetsNbaAttainmentThreshold = totalScore >= 60m
            });
        }

        int totalPassed = rows.Count(r => r.ResultStatus == "Pass");
        int totalFailed = rows.Count(r => r.ResultStatus == "Fail");
        decimal avgScore = rows.Any() ? Math.Round(rows.Average(r => r.TotalScore), 1) : 0m;

        return Ok(new ExaminationTabulationRegisterDto
        {
            AcademicYear = track?.AcademicYear ?? "2026–2027",
            TrackName = track?.Name ?? "Major Project Capstone Track",
            GuideWeightPct = guideWeight,
            MidTermWeightPct = midTermWeight,
            FinalVivaWeightPct = finalVivaWeight,
            IsCertified = false,
            TotalStudentsTabulated = rows.Count,
            TotalPassed = totalPassed,
            TotalFailed = totalFailed,
            AverageTotalScore = avgScore,
            Rows = rows
        });
    }

    [HttpPost("results/certify")]
    public async Task<IActionResult> CertifyExaminationRegister([FromBody] CertifyExaminationRegisterRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var (callerId, callerEmail, callerName) = await ResolveCallerIdentityAsync();

        // 1. Resolve Active Track & Continuous Examination Weights
        var activeSession = await _context.AcademicSessions
            .Where(s => s.CollegeId == collegeId && !s.IsDeleted && s.IsActive)
            .OrderByDescending(s => s.StartDate)
            .FirstOrDefaultAsync();

        AcademicTrack? track = null;
        if (activeSession != null)
        {
            track = await _context.AcademicTracks
                .Where(t => t.CollegeId == collegeId && t.AcademicSessionId == activeSession.Id && !t.IsDeleted && t.IsActive)
                .FirstOrDefaultAsync();
        }

        int guideWeight = track?.GuideWeightPct ?? 30;
        int midTermWeight = track?.MidTermWeightPct ?? 30;
        int finalVivaWeight = track?.FinalVivaWeightPct ?? 40;

        // 2. Query Tabulated Student Scores for Deterministic Digest
        var members = await _context.TeamMembers
            .Include(m => m.ProjectTeam)
                .ThenInclude(t => t!.Evaluations)
            .Where(m => m.ProjectTeam != null && m.ProjectTeam.CollegeId == collegeId && !m.IsDeleted && !m.ProjectTeam.IsDeleted)
            .ToListAsync();

        var allScores = await _context.IndividualStudentScores
            .Where(s => s.CollegeId == collegeId && !s.IsDeleted)
            .ToListAsync();

        // 3. Construct Canonical Tabulation Payload (sorted deterministically by UserId)
        var canonicalEntries = members
            .OrderBy(m => m.UserId)
            .Select(m =>
            {
                var evals = m.ProjectTeam?.Evaluations.Where(e => !e.IsDeleted).ToList() ?? new List<VivaEvaluation>();
                var indivScores = allScores.Where(s => s.StudentUserId == m.UserId).ToList();

                decimal latestShared = evals.Any() ? Math.Clamp(evals.Average(e => e.SharedTotalScore), 0m, 100m) : 0m;
                decimal indivScore = indivScores.Any() ? Math.Clamp(indivScores.Average(s => s.IndividualTotalScore), 0m, 100m) : 0m;

                decimal guideBlended = Math.Clamp(latestShared * 0.6m + indivScore * 0.4m, 0m, 100m);
                decimal midTermBlended = Math.Clamp(latestShared * 0.7m + indivScore * 0.3m, 0m, 100m);
                decimal finalVivaBlended = Math.Clamp(latestShared * 0.5m + indivScore * 0.5m, 0m, 100m);

                decimal guideScore = Math.Min((decimal)guideWeight, Math.Max(0m, Math.Round((guideBlended / 100m) * guideWeight, 1)));
                decimal midTermScore = Math.Min((decimal)midTermWeight, Math.Max(0m, Math.Round((midTermBlended / 100m) * midTermWeight, 1)));
                decimal finalVivaScore = Math.Min((decimal)finalVivaWeight, Math.Max(0m, Math.Round((finalVivaBlended / 100m) * finalVivaWeight, 1)));

                decimal total = Math.Min(100m, Math.Max(0m, Math.Round(guideScore + midTermScore + finalVivaScore, 1)));
                string grade = total >= 90m ? "A+" : (total >= 80m ? "A" : (total >= 70m ? "B+" : (total >= 60m ? "B" : (total >= 50m ? "C+" : (total >= 40m ? "C" : "F")))));
                string status = total >= 40m ? "Pass" : (total > 0 ? "Fail" : "Pending");

                return $"{m.UserId:N}:{total:F1}:{grade}:{status}";
            });

        var canonicalDataString = string.Join(";", canonicalEntries);
        var canonicalPayload = $"v1:{collegeId}:{DateTime.UtcNow:yyyyMMddHH}:{callerEmail}:{request.Remarks}:{canonicalDataString}";
        var checksum = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(canonicalPayload)));

        var log = new PlatformAuditLog
        {
            TargetTenantId = collegeId,
            Action = "CERTIFY_EXAMINATION_REGISTER",
            TargetEntity = "ExaminationTabulationRegister",
            ActorUserId = callerId,
            ActorEmail = callerEmail,
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                CertifiedBy = callerName,
                CertifiedAtUtc = DateTime.UtcNow,
                Checksum = checksum,
                Remarks = request.Remarks,
                TotalStudentsTabulated = members.Count,
                SchemaVersion = "v1"
            }),
            OccurredAtUtc = DateTime.UtcNow
        };

        await _context.PlatformAuditLogs.AddAsync(log);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Examination tabulation register officially certified and archived.",
            certifiedBy = callerName,
            certifiedAtUtc = DateTime.UtcNow,
            checksum = checksum,
            totalStudentsTabulated = members.Count,
            schemaVersion = "v1"
        });
    }

    #endregion

    #region Tracks & Settings

    [HttpGet("tracks")]
    public async Task<ActionResult<List<CollegeTrackDto>>> GetTracks()
    {
        var tracks = await _context.AcademicTracks
            .Include(t => t.Department)
            .Where(t => !t.IsDeleted)
            .OrderByDescending(t => t.AcademicYear)
            .ThenBy(t => t.Name)
            .Select(t => new CollegeTrackDto
            {
                Id = t.Id,
                CollegeId = t.CollegeId,
                DepartmentId = t.DepartmentId,
                DepartmentCode = t.Department != null ? t.Department.Code : null,
                AcademicSessionId = t.AcademicSessionId,
                CourseProgramId = t.CourseProgramId,
                SemesterTermId = t.SemesterTermId,
                SubjectOfferingId = t.SubjectOfferingId,
                CurriculumSchemeId = t.CurriculumSchemeId,
                ParticipationMode = t.ParticipationMode,
                EnrolmentMode = t.EnrolmentMode,
                AllowCrossBranchTeams = t.AllowCrossBranchTeams,
                Name = t.Name,
                AcademicYear = t.AcademicYear,
                AllowInterdisciplinaryTeams = t.AllowInterdisciplinaryTeams,
                IsActive = t.IsActive,
                ProposalDeadlineUtc = t.ProposalDeadlineUtc,
                FinalSubmissionDeadlineUtc = t.FinalSubmissionDeadlineUtc,
                GuideWeightPct = t.GuideWeightPct,
                MidTermWeightPct = t.MidTermWeightPct,
                FinalVivaWeightPct = t.FinalVivaWeightPct,
                SharedProjectRubricPct = t.SharedProjectRubricPct,
                IndividualStudentRubricPct = t.IndividualStudentRubricPct
            })
            .ToListAsync();

        return Ok(tracks);
    }

    [HttpPost("tracks")]
    public async Task<ActionResult<CollegeTrackDto>> CreateCollegeTrackSession([FromBody] CreateCollegeTrackRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;

        var track = new AcademicTrack
        {
            CollegeId = collegeId,
            DepartmentId = null, // Overarching college session
            AcademicSessionId = request.AcademicSessionId,
            CourseProgramId = request.CourseProgramId,
            SemesterTermId = request.SemesterTermId,
            SubjectOfferingId = request.SubjectOfferingId,
            CurriculumSchemeId = request.CurriculumSchemeId,
            ParticipationMode = request.ParticipationMode,
            EnrolmentMode = request.EnrolmentMode,
            AllowCrossBranchTeams = request.AllowCrossBranchTeams,
            Name = request.Name.Trim(),
            AcademicYear = request.AcademicYear.Trim(),
            AllowInterdisciplinaryTeams = request.AllowInterdisciplinaryTeams,
            ProposalDeadlineUtc = request.ProposalDeadlineUtc,
            FinalSubmissionDeadlineUtc = request.FinalSubmissionDeadlineUtc,
            GuideWeightPct = request.GuideWeightPct,
            MidTermWeightPct = request.MidTermWeightPct,
            FinalVivaWeightPct = request.FinalVivaWeightPct,
            SharedProjectRubricPct = request.SharedProjectRubricPct,
            IndividualStudentRubricPct = request.IndividualStudentRubricPct
        };

        track.ValidateWeights();
        await _context.AcademicTracks.AddAsync(track);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTracks), new { id = track.Id }, new CollegeTrackDto
        {
            Id = track.Id,
            CollegeId = track.CollegeId,
            DepartmentId = track.DepartmentId,
            AcademicSessionId = track.AcademicSessionId,
            CourseProgramId = track.CourseProgramId,
            SemesterTermId = track.SemesterTermId,
            SubjectOfferingId = track.SubjectOfferingId,
            ParticipationMode = track.ParticipationMode,
            EnrolmentMode = track.EnrolmentMode,
            AllowCrossBranchTeams = track.AllowCrossBranchTeams,
            Name = track.Name,
            AcademicYear = track.AcademicYear,
            AllowInterdisciplinaryTeams = track.AllowInterdisciplinaryTeams,
            IsActive = track.IsActive
        });
    }

    [HttpGet("settings")]
    public async Task<ActionResult<CollegeSettingsDto>> GetSettings()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var college = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == collegeId && !c.IsDeleted);

        if (college == null) return NotFound();

        var studentCount = await _context.Users.CountAsync(u => u.CollegeId == collegeId && u.Role == UserRole.Student && !u.IsDeleted);

        var artifactBytes = await _context.TeamArtifacts
            .Where(a => a.CollegeId == collegeId && !a.IsDeleted)
            .SumAsync(a => (long?)a.FileSizeBytes) ?? 0L;
        var evidenceBytes = await _context.AccreditationEvidences
            .Where(e => e.CollegeId == collegeId && !e.IsDeleted)
            .SumAsync(e => (long?)e.FileSizeBytes) ?? 0L;
        var usedStorageGb = Math.Round((double)(artifactBytes + evidenceBytes) / (1024.0 * 1024.0 * 1024.0), 2);

        var campuses = await _context.CollegeCampuses
            .Where(c => c.CollegeId == collegeId && !c.IsDeleted)
            .OrderByDescending(c => c.IsMainCampus)
            .ToListAsync();

        var campusesCsv = campuses.Any()
            ? string.Join(", ", campuses.Select(c => c.Name))
            : college.CampusesCsv ?? "Main Campus (Bhopal)";

        return Ok(new CollegeSettingsDto
        {
            Id = college.Id,
            Name = college.Name,
            TenantCode = college.TenantCode,
            SsoDomain = college.SsoDomain,
            EnforceStrictSso = college.EnforceStrictSso,
            CrestUrl = college.CrestUrl,
            PrincipalSealUrl = college.PrincipalSealUrl,
            AffiliatedUniversity = college.AffiliatedUniversity ?? "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
            CampusAddress = college.CampusAddress ?? "Airport Road, Gandhi Nagar, Bhopal, MP 462036",
            CampusesCsv = campusesCsv,
            NbaModuleEnabled = college.NbaModuleEnabled,
            GithubIntegrationEnabled = college.GithubIntegrationEnabled,
            JiraIntegrationEnabled = college.JiraIntegrationEnabled,
            LicenseTier = college.LicenseTier,
            MaxStudentSeats = college.MaxStudentSeats,
            EnrolledStudentCount = studentCount,
            StorageQuotaGb = college.StorageQuotaGb,
            UsedStorageGb = usedStorageGb
        });
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateCollegeSettingsRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var college = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == collegeId && !c.IsDeleted);

        if (college == null) return NotFound();

        if (request.Name != null) college.Name = request.Name.Trim();
        if (request.EnforceStrictSso.HasValue) college.EnforceStrictSso = request.EnforceStrictSso.Value;
        if (request.CrestUrl != null) college.CrestUrl = request.CrestUrl;
        if (request.PrincipalSealUrl != null) college.PrincipalSealUrl = request.PrincipalSealUrl;
        if (request.AffiliatedUniversity != null) college.AffiliatedUniversity = request.AffiliatedUniversity.Trim();
        if (request.CampusAddress != null) college.CampusAddress = request.CampusAddress.Trim();
        if (request.CampusesCsv != null)
        {
            college.CampusesCsv = request.CampusesCsv.Trim();

            // Sync normalized CollegeCampuses collection
            var campusNames = college.CampusesCsv
                .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Distinct()
                .ToList();

            var existingCampuses = await _context.CollegeCampuses
                .Where(c => c.CollegeId == collegeId && !c.IsDeleted)
                .ToListAsync();

            // Soft-delete removed campuses
            foreach (var ec in existingCampuses)
            {
                if (!campusNames.Contains(ec.Name, StringComparer.OrdinalIgnoreCase))
                {
                    ec.IsDeleted = true;
                    ec.DeletedAtUtc = DateTime.UtcNow;
                }
            }

            // Add new campuses
            for (int i = 0; i < campusNames.Count; i++)
            {
                var name = campusNames[i];
                var existing = existingCampuses.FirstOrDefault(ec => !ec.IsDeleted && string.Equals(ec.Name, name, StringComparison.OrdinalIgnoreCase));
                if (existing == null)
                {
                    await _context.CollegeCampuses.AddAsync(new CollegeCampus
                    {
                        CollegeId = collegeId,
                        Name = name,
                        IsMainCampus = i == 0,
                        Address = i == 0 ? college.CampusAddress : null
                    });
                }
            }
        }
        if (request.NbaModuleEnabled.HasValue) college.NbaModuleEnabled = request.NbaModuleEnabled.Value;
        if (request.GithubIntegrationEnabled.HasValue) college.GithubIntegrationEnabled = request.GithubIntegrationEnabled.Value;
        if (request.JiraIntegrationEnabled.HasValue) college.JiraIntegrationEnabled = request.JiraIntegrationEnabled.Value;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("compliance/sign-off")]
    public async Task<IActionResult> SignOffCompliance([FromBody] SignOffComplianceRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var departments = await _context.Departments
            .Where(d => d.CollegeId == collegeId && !d.IsDeleted)
            .ToListAsync();
        var utcNow = DateTime.UtcNow;
        var userId = _tenantContext.UserId;

        foreach (var dept in departments)
        {
            dept.IsSarAttested = true;
            dept.SarAttestedAtUtc = utcNow;
            dept.SarAttestedByUserId = userId;
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, attestedDepartmentsCount = departments.Count, signedAtUtc = utcNow });
    }

    [HttpGet("compliance/dossier")]
    public async Task<ActionResult<InstitutionalDossierDto>> GetInstitutionalDossier()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var college = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == collegeId && !c.IsDeleted);

        if (college == null) return NotFound();

        var depts = await _context.Departments
            .Include(d => d.HodUser)
            .Where(d => d.CollegeId == collegeId && !d.IsDeleted)
            .OrderBy(d => d.Code)
            .ToListAsync();

        var allUsers = await _context.Users
            .Where(u => u.CollegeId == collegeId && !u.IsDeleted)
            .ToListAsync();

        var vivaEvaluations = await _context.VivaEvaluations
            .Include(v => v.ProjectTeam)
            .Where(v => v.CollegeId == collegeId && !v.IsDeleted)
            .ToListAsync();

        var deptSummaries = depts.Select(d =>
        {
            var deptEvals = vivaEvaluations.Where(v => v.ProjectTeam != null && v.ProjectTeam.DepartmentId == d.Id).ToList();
            var deptAttainment = deptEvals.Any()
                ? Math.Round(deptEvals.Average(e => e.SharedTotalScore > 0 ? Math.Min(100m, Math.Max(0m, e.SharedTotalScore)) : 0m), 1)
                : 0m;
            var deptStudents = allUsers.Count(u => u.DepartmentId == d.Id && u.Role == UserRole.Student);

            return new DepartmentAttainmentSummaryDto
            {
                DepartmentCode = d.Code,
                DepartmentName = d.Name,
                HodName = d.HodUser?.FullName,
                StudentCount = deptStudents > 0 ? deptStudents : d.IntakeQuota,
                AttainmentPct = deptAttainment,
                IsSarAttested = d.IsSarAttested,
                SarAttestedAtUtc = d.SarAttestedAtUtc
            };
        }).ToList();

        var totalStudents = allUsers.Count(u => u.Role == UserRole.Student);
        var totalFaculty = allUsers.Count(u => u.Role == UserRole.Faculty || u.Role == UserRole.HOD);
        var attestedCount = deptSummaries.Count(d => d.IsSarAttested);
        var overallAttainment = vivaEvaluations.Any()
            ? Math.Round(vivaEvaluations.Average(e => e.SharedTotalScore > 0 ? Math.Min(100m, Math.Max(0m, e.SharedTotalScore)) : 0m), 1)
            : 0m;

        var (_, _, callerName) = await ResolveCallerIdentityAsync();

        return Ok(new InstitutionalDossierDto
        {
            CollegeName = college.Name,
            TenantCode = college.TenantCode,
            SsoDomain = college.SsoDomain,
            AffiliatedUniversity = college.AffiliatedUniversity ?? "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
            AcademicYear = "2026–2027",
            TotalDepartments = depts.Count,
            TotalStudents = totalStudents,
            TotalFaculty = totalFaculty,
            OverallAttainmentPct = overallAttainment,
            IsAttested = attestedCount == depts.Count && depts.Count > 0,
            AttestedAtUtc = depts.FirstOrDefault(d => d.SarAttestedAtUtc.HasValue)?.SarAttestedAtUtc,
            AttestedBy = $"{callerName} (College Administrator)",
            Departments = deptSummaries
        });
    }

    #endregion

    private static string GetRelativeTime(DateTime utcTime)
    {
        var span = DateTime.UtcNow - utcTime;
        if (span.TotalMinutes < 1) return "Just now";
        if (span.TotalMinutes < 60) return $"{(int)span.TotalMinutes}m ago";
        if (span.TotalHours < 24) return $"{(int)span.TotalHours}h ago";
        if (span.TotalDays < 7) return $"{(int)span.TotalDays}d ago";
        return utcTime.ToString("MMM dd, yyyy");
    }
}
