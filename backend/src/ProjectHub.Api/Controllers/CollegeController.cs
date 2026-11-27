using System.Text.Json;
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
    private readonly ISessionSecurityService? _sessionSecurity;
    private readonly IEmailOutboxService? _emailOutbox;

    public CollegeController(
        ProjectHubDbContext context,
        ITenantContext tenantContext,
        IEmailSender emailSender,
        IWebHostEnvironment environment,
        ILogger<CollegeController> logger,
        ISessionSecurityService? sessionSecurity = null,
        IEmailOutboxService? emailOutbox = null)
    {
        _context = context;
        _tenantContext = tenantContext;
        _emailSender = emailSender;
        _environment = environment;
        _logger = logger;
        _sessionSecurity = sessionSecurity;
        _emailOutbox = emailOutbox;
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

    [HttpGet("announcements")]
    public async Task<ActionResult<List<CollegeAnnouncementDto>>> GetAnnouncements()
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var college = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == collegeId.Value && !c.IsDeleted);

        if (college == null) return NotFound(new { message = "College tenant record not found." });

        var published = await _context.PlatformAnnouncements
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(a => !a.IsDeleted && a.Status == "Published")
            .OrderByDescending(a => a.PublishDateUtc ?? a.CreatedAtUtc)
            .ToListAsync();

        var collegeIdStr = college.Id.ToString();
        var result = new List<CollegeAnnouncementDto>();

        foreach (var a in published)
        {
            var isEligible = IsAnnouncementEligibleForCollege(a, collegeIdStr, college.TenantCode, college.IsActive);
            if (!isEligible) continue;

            result.Add(new CollegeAnnouncementDto
            {
                Id = a.Id,
                Title = a.Title,
                Category = a.Category,
                Priority = a.Priority,
                ShortDescription = a.ShortDescription,
                FullMessage = a.FullMessage,
                TargetAudience = a.TargetAudience,
                PublishDateUtc = a.PublishDateUtc ?? a.CreatedAtUtc,
                CreatedByName = string.IsNullOrWhiteSpace(a.CreatedByName) ? "Super Admin" : a.CreatedByName
            });
        }

        return Ok(result);
    }

    private static bool IsAnnouncementEligibleForCollege(
        PlatformAnnouncement announcement,
        string collegeIdStr,
        string tenantCode,
        bool isCollegeActive)
    {
        if (string.Equals(announcement.TargetAudience, "All Colleges", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(announcement.TargetAudience, "All Institutions", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (string.Equals(announcement.TargetAudience, "Active Colleges", StringComparison.OrdinalIgnoreCase))
        {
            return isCollegeActive;
        }

        if (string.Equals(announcement.TargetAudience, "Selected Colleges", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(announcement.TargetAudience, "Selected Institutions", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(announcement.TargetCollegeIdsJson)) return false;
            try
            {
                var targets = JsonSerializer.Deserialize<List<string>>(announcement.TargetCollegeIdsJson);
                if (targets == null || targets.Count == 0) return false;
                return targets.Any(t =>
                    string.Equals(t, collegeIdStr, StringComparison.OrdinalIgnoreCase) ||
                    (!string.IsNullOrWhiteSpace(tenantCode) && string.Equals(t, tenantCode, StringComparison.OrdinalIgnoreCase)));
            }
            catch
            {
                return false;
            }
        }

        return false;
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

        // 1. Resolve Active Institutional Academic Session (read-only; never auto-fabricate)
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

        string? currentSemesterLabel = await _context.SemesterTerms
            .Where(t => t.CollegeId == collegeId.Value && t.IsActive && !t.IsDeleted &&
                        (activeSession == null || t.AcademicSessionId == null || t.AcademicSessionId == activeSession.Id))
            .OrderByDescending(t => t.SemesterNumber)
            .Select(t => t.SemesterName)
            .FirstOrDefaultAsync();

        // 2. Resolve Tenant-Scoped Programs, Departments, Tracks, and Active Users
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
            .Where(t => t.CollegeId == collegeId.Value && t.DepartmentId.HasValue && t.IsActive && !t.IsDeleted)
            .ToListAsync();

        var activeCollegeUsers = await _context.Users
            .Where(u => u.CollegeId == collegeId.Value && u.IsActive && !u.IsDeleted)
            .ToListAsync();

        var deptSummaries = depts.Select(d =>
        {
            var tracks = activeTracks.Where(t => t.DepartmentId == d.Id).ToList();
            var count = tracks.Count;
            var deptFaculty = activeCollegeUsers.Count(u => u.DepartmentId == d.Id && (u.Role == UserRole.Faculty || u.Role == UserRole.HOD));
            var deptStudents = activeCollegeUsers.Count(u => u.DepartmentId == d.Id && u.Role == UserRole.Student);
            var hasActiveHod = d.HodUserId.HasValue && d.HodUser != null && d.HodUser.CollegeId == collegeId.Value && d.HodUser.IsActive && !d.HodUser.IsDeleted;

            return new DepartmentTrackSummaryDto
            {
                DepartmentId = d.Id,
                DepartmentCode = d.Code,
                DepartmentName = d.Name,
                HodName = hasActiveHod ? d.HodUser!.FullName : null,
                IntakeQuota = d.IntakeQuota,
                StudentCount = deptStudents,
                FacultyCount = deptFaculty,
                TrackStatus = count > 0 ? "Active" : "Awaiting HOD Launch",
                ActiveTrackCount = count,
                ActiveTrackNames = tracks.Select(t => t.Name).ToList()
            };
        }).ToList();

        var (_, _, adminName) = await ResolveCallerIdentityAsync();

        var activeStudentCount = activeCollegeUsers.Count(u => u.Role == UserRole.Student);
        var activeFacultyCount = activeCollegeUsers.Count(u => u.Role == UserRole.Faculty || u.Role == UserRole.HOD);
        var appointedHodsCount = depts.Count(d => d.HodUserId.HasValue && d.HodUser != null && d.HodUser.CollegeId == collegeId.Value && d.HodUser.IsActive && !d.HodUser.IsDeleted);
        var vacantDepartmentsCount = Math.Max(0, depts.Count - appointedHodsCount);

        var projectCount = await _context.ProjectTeams
            .CountAsync(t => t.CollegeId == collegeId.Value && !t.IsDeleted);

        // 3. Academic Structure Tree
        var academicStructure = courses.Select(c =>
        {
            var childBranches = depts.Where(d => d.CourseProgramId == c.Id).ToList();
            return new OverviewCourseHierarchyDto
            {
                CourseId = c.Id,
                Code = c.Code,
                Name = c.Name,
                BranchCount = childBranches.Count,
                Branches = childBranches.Select(b => b.Code).ToList()
            };
        }).OrderByDescending(s => s.BranchCount).ToList();

        var campuses = !string.IsNullOrWhiteSpace(college.CampusesCsv)
            ? college.CampusesCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            : Array.Empty<string>();
        string? campusesSummary = campuses.Length > 0
            ? (campuses.Length == 1 ? "1 Campus" : $"{campuses.Length} Campuses")
            : null;

        // 4. Operational Action Items (derived strictly from live institutional state)
        var actionItems = new List<CollegeActionItemDto>();
        if (vacantDepartmentsCount > 0)
        {
            actionItems.Add(new CollegeActionItemDto
            {
                Key = "hod-vacancies",
                Title = "HOD Vacancies Requiring Appointment",
                Description = vacantDepartmentsCount == 1
                    ? "1 department is operating without an appointed Head of Department."
                    : $"{vacantDepartmentsCount} departments are operating without an appointed Head of Department.",
                Severity = "warning",
                ActionLabel = "Appoint HOD",
                ActionHref = "/college/hods",
                Count = vacantDepartmentsCount
            });
        }

        if (activeSession == null)
        {
            actionItems.Add(new CollegeActionItemDto
            {
                Key = "missing-academic-session",
                Title = "Academic Session Not Configured",
                Description = "Configure an active academic session to align project cycles and terms.",
                Severity = "warning",
                ActionLabel = "Configure Session",
                ActionHref = "/college/settings"
            });
        }

        if (courses.Count == 0 || depts.Count == 0)
        {
            actionItems.Add(new CollegeActionItemDto
            {
                Key = "incomplete-academic-structure",
                Title = "Academic Programs or Departments Missing",
                Description = "Configure degree programs and departments so faculty and students can be onboarded.",
                Severity = "info",
                ActionLabel = "Configure Programs",
                ActionHref = "/college/courses"
            });
        }

        if (string.IsNullOrWhiteSpace(college.AffiliatingUniversity) ||
            string.IsNullOrWhiteSpace(college.CampusAddress) ||
            string.IsNullOrWhiteSpace(college.SsoDomain))
        {
            actionItems.Add(new CollegeActionItemDto
            {
                Key = "incomplete-institution-profile",
                Title = "Institution Profile Incomplete",
                Description = "Complete affiliating university, campus address, and institutional domain in Settings.",
                Severity = "info",
                ActionLabel = "Update Settings",
                ActionHref = "/college/settings"
            });
        }

        // 5. Recent Activities from Tenant-Scoped Institutional Audit Logs
        var relevantActions = new[]
        {
            "CREATE_COURSE", "UPDATE_COURSE", "CREATE_DEPARTMENT", "UPDATE_DEPARTMENT",
            "APPOINT_HOD", "REVOKE_HOD", "UPDATE_SETTINGS", "CREATE_STAFF",
            "BULK_ROSTER_IMPORT", "ACTIVATE_SESSION"
        };

        var auditLogs = await _context.PlatformAuditLogs
            .Where(l => l.TargetTenantId == collegeId.Value && relevantActions.Contains(l.Action))
            .OrderByDescending(l => l.OccurredAtUtc)
            .Take(6)
            .ToListAsync();

        var recentActivities = auditLogs.Select(log =>
        {
            var title = log.Action switch
            {
                "CREATE_COURSE" => "Degree program added",
                "UPDATE_COURSE" => "Degree program updated",
                "CREATE_DEPARTMENT" => "Department added",
                "UPDATE_DEPARTMENT" => "Department updated",
                "APPOINT_HOD" => $"HOD appointed ({log.TargetEntity})",
                "REVOKE_HOD" => $"HOD appointment revoked ({log.TargetEntity})",
                "UPDATE_SETTINGS" => "Institutional settings updated",
                "CREATE_STAFF" => "Staff account created",
                "BULK_ROSTER_IMPORT" => "Faculty roster imported",
                "ACTIVATE_SESSION" => "Academic session activated",
                _ => log.Action.Replace('_', ' ')
            };

            return new CollegeActivityItemDto
            {
                Title = title,
                Actor = !string.IsNullOrWhiteSpace(log.ActorEmail) ? log.ActorEmail : "System",
                TargetEntity = !string.IsNullOrWhiteSpace(log.TargetEntity) ? log.TargetEntity : null,
                TimeAgo = GetRelativeTime(log.OccurredAtUtc),
                OccurredAtUtc = log.OccurredAtUtc
            };
        }).ToList();

        return Ok(new CollegeOverviewDto
        {
            CollegeId = college.Id,
            CollegeName = college.Name,
            TenantCode = college.TenantCode,
            AdminName = adminName,
            TotalCourses = courses.Count,
            TotalBranches = depts.Count,
            TotalDepartments = depts.Count,
            AppointedHodsCount = appointedHodsCount,
            VacantDepartmentsCount = vacantDepartmentsCount,
            TotalStudents = activeStudentCount,
            TotalFaculty = activeFacultyCount,
            TotalProjects = projectCount,
            StrictSsoEnforced = college.EnforceStrictSso,
            SsoDomain = college.SsoDomain,
            AffiliatedUniversity = !string.IsNullOrWhiteSpace(college.AffiliatingUniversity)
                ? college.AffiliatingUniversity.Trim()
                : null,
            CampusAddress = !string.IsNullOrWhiteSpace(college.CampusAddress)
                ? college.CampusAddress.Trim()
                : null,
            CampusesSummary = campusesSummary,
            CrestUrl = college.CrestUrl,
            HasPrincipalSeal = !string.IsNullOrWhiteSpace(college.PrincipalSealUrl),
            CurrentSemesterLabel = currentSemesterLabel,
            ActiveSession = activeSession == null
                ? null
                : new AcademicSessionDto
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
            OperationalActionItems = actionItems,
            RecentActivities = recentActivities
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
                            IntakeQuota = 120
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
            .AsNoTracking()
            .Where(s => s.CollegeId == collegeId && s.IsActive && !s.IsDeleted)
            .OrderByDescending(s => s.StartDate)
            .FirstOrDefaultAsync();

        if (session == null)
        {
            session = await _context.AcademicSessions
                .AsNoTracking()
                .Where(s => s.CollegeId == collegeId && !s.IsDeleted)
                .OrderByDescending(s => s.StartDate)
                .FirstOrDefaultAsync();
        }

        if (session == null)
        {
            return NotFound(new { message = "No academic session is configured for this institution." });
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
        var label = request.AcademicYear?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(label) || label.Length > 40)
        {
            return BadRequest(new { message = "Academic session label is required and must be 40 characters or fewer." });
        }

        var existingSession = await _context.AcademicSessions
            .FirstOrDefaultAsync(s => s.CollegeId == collegeId && (s.Label == label || s.Label == label.Replace("–", "-")) && !s.IsDeleted);

        var startDate = request.StartDate ?? existingSession?.StartDate ?? new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc);
        var defaultEndDate = new DateTime(2027, 6, 30, 23, 59, 59, DateTimeKind.Utc);
        var endDate = request.EndDate
            ?? existingSession?.EndDate
            ?? (request.ExamCutoffDateUtc.HasValue && request.ExamCutoffDateUtc.Value > defaultEndDate
                ? request.ExamCutoffDateUtc.Value
                : defaultEndDate);
        if (startDate >= endDate)
        {
            return BadRequest(new { message = "Session start date must be earlier than session end date." });
        }

        var examCutoff = request.ExamCutoffDateUtc ?? existingSession?.ExamCutoffDateUtc;
        if (examCutoff.HasValue && (examCutoff.Value < startDate || examCutoff.Value > endDate))
        {
            return BadRequest(new { message = "Exam cutoff date must fall within the academic session start and end dates." });
        }

        if (request.IsActive)
        {
            var otherActive = await _context.AcademicSessions
                .Where(s => s.CollegeId == collegeId && s.IsActive && !s.IsDeleted)
                .ToListAsync();
            foreach (var s in otherActive) s.IsActive = false;
        }

        var session = existingSession;
        if (session == null)
        {
            session = new AcademicSession
            {
                CollegeId = collegeId,
                Label = label,
                StartDate = startDate,
                EndDate = endDate,
                ExamCutoffDateUtc = examCutoff ?? endDate,
                AllowInterdisciplinaryTeams = request.AllowInterdisciplinaryTeams,
                IsActive = request.IsActive
            };
            await _context.AcademicSessions.AddAsync(session);
        }
        else
        {
            session.Label = label;
            session.StartDate = startDate;
            session.EndDate = endDate;
            if (examCutoff.HasValue) session.ExamCutoffDateUtc = examCutoff.Value;
            session.AllowInterdisciplinaryTeams = request.AllowInterdisciplinaryTeams;
            session.IsActive = request.IsActive;
        }

        var (actorUserId, actorEmail, _) = await ResolveCallerIdentityAsync();
        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = actorUserId,
            ActorEmail = actorEmail,
            Action = "ACTIVATE_SESSION",
            TargetTenantId = collegeId,
            TargetEntity = session.Label,
            OccurredAtUtc = DateTime.UtcNow
        });

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
                StudentCount = sCount,
                FacultyCount = fCount,
                TrackStatus = count > 0 ? "Active" : "Awaiting HOD Launch",
                ActiveTrackCount = count
            };
        }).ToList();

        return Ok(result);
    }

    [HttpPost("departments")]
    public async Task<ActionResult<DepartmentDto>> CreateDepartment([FromBody] CreateDepartmentRequest request)
    {
        if (request.IntakeQuota < 1 || request.IntakeQuota > 10000)
        {
            return BadRequest(new { message = "Sanctioned intake quota must be between 1 and 10,000 seats." });
        }

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

        if (request.IntakeQuota < 0 || request.IntakeQuota > 10000)
        {
            return BadRequest(new { message = "Sanctioned intake quota must be between 1 and 10,000 seats." });
        }

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
            StudentCount = studentCount,
            FacultyCount = facultyCount
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
        if (!_tenantContext.CollegeId.HasValue)
        {
            return Forbid();
        }

        if (request.HodUserId == Guid.Empty)
        {
            return BadRequest(new { message = "A valid faculty candidate must be selected." });
        }

        var collegeId = _tenantContext.CollegeId.Value;
        var department = await _context.Departments
            .Include(d => d.HodUser)
            .FirstOrDefaultAsync(d => d.Id == id && d.CollegeId == collegeId && !d.IsDeleted);
        if (department == null) return NotFound(new { message = "Department not found." });

        var faculty = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.HodUserId && u.CollegeId == collegeId && !u.IsDeleted);
        if (faculty == null) return NotFound(new { message = "Appointed faculty user not found in this institution." });

        if (faculty.Role == UserRole.SuperAdmin)
        {
            return BadRequest(new { message = "Platform SuperAdmin accounts cannot be assigned as department HOD." });
        }

        if (faculty.Role != UserRole.Faculty && faculty.Role != UserRole.HOD)
        {
            return BadRequest(new { message = "Only eligible faculty members can be appointed as department HOD." });
        }

        if (!faculty.IsActive)
        {
            return BadRequest(new { message = "Inactive faculty accounts cannot be appointed as department HOD." });
        }

        if (faculty.DepartmentId != department.Id)
        {
            return BadRequest(new { message = "Selected faculty member is not assigned to this department." });
        }

        var otherHodDepartment = await _context.Departments
            .FirstOrDefaultAsync(d => d.CollegeId == collegeId && !d.IsDeleted && d.Id != department.Id && d.HodUserId == faculty.Id);
        if (otherHodDepartment != null)
        {
            return Conflict(new { message = $"Selected faculty member is already the active HOD of {otherHodDepartment.Name}." });
        }

        if (department.HodUserId.HasValue)
        {
            if (department.HodUserId.Value == faculty.Id)
            {
                return Conflict(new { message = $"{faculty.FullName} is already the current HOD of {department.Name}." });
            }

            if (!request.ConfirmReplacement)
            {
                var currentHodName = department.HodUser?.FullName ?? "an existing HOD";
                return Conflict(new
                {
                    message = $"{department.Name} already has an active HOD ({currentHodName}). Explicit replacement confirmation is required.",
                    requiresReplacementConfirmation = true,
                    currentHodUserId = department.HodUserId,
                    currentHodName
                });
            }

            if (department.HodUser != null && department.HodUser.Role == UserRole.HOD)
            {
                var isHodElsewhere = await _context.Departments
                    .AnyAsync(d => d.CollegeId == collegeId && !d.IsDeleted && d.Id != department.Id && d.HodUserId == department.HodUser.Id);
                if (!isHodElsewhere)
                {
                    department.HodUser.Role = UserRole.Faculty;
                    department.HodUser.SecurityStamp = Guid.NewGuid().ToString("N");
                    var sessionSec = HttpContext.RequestServices.GetRequiredService<ISessionSecurityService>();
                    await sessionSec.RevokeAllUserSessionsAsync(department.HodUser.Id, null, "HodAppointmentReplaced");
                }
            }
        }

        // Promote user role to HOD and assign to department
        var roleChanged = faculty.Role != UserRole.HOD;
        faculty.Role = UserRole.HOD;
        faculty.DepartmentId = department.Id;
        if (roleChanged)
        {
            faculty.SecurityStamp = Guid.NewGuid().ToString("N");
            var sessionSec = HttpContext.RequestServices.GetRequiredService<ISessionSecurityService>();
            await sessionSec.RevokeAllUserSessionsAsync(faculty.Id, null, "HodAppointed");
        }

        department.HodUserId = faculty.Id;

        var (callerId, callerEmail, callerName) = await ResolveCallerIdentityAsync();

        try
        {
            if (_context.Database.IsRelational())
            {
                var strategy = _context.Database.CreateExecutionStrategy();
                await strategy.ExecuteAsync(async () =>
                {
                    await using var tx = await _context.Database.BeginTransactionAsync();
                    try
                    {
                        await PersistHodAppointmentAsync(collegeId, department, faculty, callerId, callerEmail, callerName);
                        await tx.CommitAsync();
                    }
                    catch
                    {
                        try { await tx.RollbackAsync(); } catch (InvalidOperationException) { }
                        throw;
                    }
                });
            }
            else
            {
                await PersistHodAppointmentAsync(collegeId, department, faculty, callerId, callerEmail, callerName);
            }
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { message = "Department leadership was modified concurrently by another request. Please refresh and try again." });
        }

        return Ok(new { success = true, departmentId = department.Id, hodId = faculty.Id, hodName = faculty.FullName });
    }

    [HttpDelete("departments/{id}/hod")]
    [HttpPost("departments/{id}/relieve-hod")]
    public async Task<IActionResult> RelieveHod(Guid id)
    {
        if (!_tenantContext.CollegeId.HasValue)
        {
            return Forbid();
        }

        var collegeId = _tenantContext.CollegeId.Value;
        var department = await _context.Departments
            .Include(d => d.HodUser)
            .FirstOrDefaultAsync(d => d.Id == id && d.CollegeId == collegeId && !d.IsDeleted);
        if (department == null) return NotFound(new { message = "Department not found." });

        if (!department.HodUserId.HasValue)
        {
            return BadRequest(new { message = $"{department.Name} does not currently have an active HOD appointment." });
        }

        var previousHod = department.HodUser;
        department.HodUserId = null;

        var usersToRevoke = new List<Guid>();
        if (previousHod != null && previousHod.Role == UserRole.HOD)
        {
            var isHodElsewhere = await _context.Departments
                .AnyAsync(d => d.CollegeId == collegeId && !d.IsDeleted && d.Id != department.Id && d.HodUserId == previousHod.Id);
            if (!isHodElsewhere)
            {
                previousHod.Role = UserRole.Faculty;
                previousHod.SecurityStamp = Guid.NewGuid().ToString("N");
                usersToRevoke.Add(previousHod.Id);
            }
        }

        var (callerId, callerEmail, callerName) = await ResolveCallerIdentityAsync();

        var activeAppts = await _context.HodAppointmentHistories
            .Where(h => h.DepartmentId == department.Id && h.CollegeId == collegeId && h.IsCurrent && !h.IsDeleted)
            .ToListAsync();
        foreach (var appt in activeAppts)
        {
            appt.IsCurrent = false;
            appt.RelievedAtUtc = DateTime.UtcNow;
            appt.Remarks = string.IsNullOrWhiteSpace(appt.Remarks)
                ? $"Relieved by {callerName}"
                : $"{appt.Remarks}; Relieved by {callerName}";
        }

        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = callerId,
            ActorEmail = callerEmail,
            Action = "RELIEVE_HOD",
            TargetTenantId = collegeId,
            TargetEntity = "Department",
            MetadataJson = $"{{\"DepartmentCode\":\"{department.Code}\",\"PreviousHodName\":\"{previousHod?.FullName ?? ""}\",\"PreviousHodEmail\":\"{previousHod?.Email ?? ""}\"}}",
            OccurredAtUtc = DateTime.UtcNow
        });

        try
        {
            if (_context.Database.IsRelational())
            {
                var strategy = _context.Database.CreateExecutionStrategy();
                await strategy.ExecuteAsync(async () =>
                {
                    await using var tx = await _context.Database.BeginTransactionAsync();
                    try
                    {
                        await _context.SaveChangesAsync();
                        await tx.CommitAsync();
                    }
                    catch
                    {
                        try { await tx.RollbackAsync(); } catch (InvalidOperationException) { }
                        throw;
                    }
                });
            }
            else
            {
                await _context.SaveChangesAsync();
            }
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { message = "Department leadership was modified concurrently by another request. Please refresh and try again." });
        }

        if (usersToRevoke.Count > 0)
        {
            var sessionSec = HttpContext.RequestServices.GetRequiredService<ISessionSecurityService>();
            foreach (var userId in usersToRevoke)
            {
                await sessionSec.RevokeAllUserSessionsAsync(userId, null, "HodAppointmentEnded");
            }
        }

        return Ok(new
        {
            success = true,
            departmentId = department.Id,
            relievedUserId = previousHod?.Id,
            relievedUserName = previousHod?.FullName
        });
    }

    private async Task PersistHodAppointmentAsync(
        Guid collegeId,
        Department department,
        UserAccount faculty,
        Guid? callerId,
        string callerEmail,
        string callerName)
    {
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

        var activeAppointments = await _context.HodAppointmentHistories
            .AsNoTracking()
            .Where(h => h.CollegeId == collegeId && h.IsCurrent && !h.IsDeleted)
            .ToListAsync();
        var apptByDept = activeAppointments
            .GroupBy(h => h.DepartmentId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.AppointedAtUtc).First());

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
            AppointedAtUtc = apptByDept.TryGetValue(d.Id, out var activeAppt)
                ? activeAppt.AppointedAtUtc
                : d.HodUser?.CreatedAtUtc
        }).ToList();

        return Ok(result);
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
            RelievedAtUtc = h.RelievedAtUtc,
            AppointedBy = h.AppointedByName,
            IsCurrent = h.IsCurrent,
            Remarks = h.Remarks
        }).ToList();

        return Ok(history);
    }

    [HttpPut("hods/{userId}/status")]
    public async Task<IActionResult> UpdateHodStatus(Guid userId, [FromBody] UpdateUserStatusRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.CollegeId == collegeId && !u.IsDeleted);
        if (user == null) return NotFound(new { message = "User not found." });

        var requiresAnotherActiveAdmin = user.Role == UserRole.CollegeAdmin && user.IsActive && !request.IsActive;
        var blocked = await ExecuteCollegeAdminMutationAsync(collegeId, user.Id, requiresAnotherActiveAdmin, async () =>
        {
            user.IsActive = request.IsActive;
            if (!request.IsActive)
            {
                user.SecurityStamp = Guid.NewGuid().ToString("N");
                var sessionSecurity = HttpContext.RequestServices.GetRequiredService<ISessionSecurityService>();
                await sessionSecurity.RevokeAllUserSessionsAsync(user.Id, null, "AccountDeactivated");
            }
        });
        if (blocked != null) return blocked;

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

    [HttpGet("students")]
    public async Task<ActionResult<List<CollegeStaffDto>>> GetStudents([FromQuery] string? search)
    {
        var collegeId = _tenantContext.CollegeId!.Value;

        var query = _context.Users
            .Include(u => u.Department)
            .Where(u => u.CollegeId == collegeId && !u.IsDeleted && u.Role == UserRole.Student);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(u =>
                u.FullName.ToLower().Contains(term) ||
                u.Email.ToLower().Contains(term) ||
                (u.EnrollmentOrEmployeeCode != null && u.EnrollmentOrEmployeeCode.ToLower().Contains(term)));
        }

        var students = await query
            .OrderBy(u => u.FullName)
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

        return Ok(students);
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
        if (_emailOutbox != null)
        {
            _emailOutbox.QueueAccountActivation(user.Email, user.FullName, rawActivationToken, user.ActivationTokenExpiresAtUtc ?? DateTime.UtcNow.AddHours(24), collegeId);
            await _context.SaveChangesAsync();
        }
        else
        {
            await _context.SaveChangesAsync();
            var emailSender = HttpContext.RequestServices.GetRequiredService<IEmailSender>();
            await emailSender.SendAccountActivationAsync(user.Email, user.FullName, rawActivationToken);
        }

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

        var requiresAnotherActiveAdmin = user.Role == UserRole.CollegeAdmin && user.IsActive && !request.IsActive;
        var blocked = await ExecuteCollegeAdminMutationAsync(collegeId, user.Id, requiresAnotherActiveAdmin, async () =>
        {
            user.IsActive = request.IsActive;
            if (!request.IsActive)
            {
                user.SecurityStamp = Guid.NewGuid().ToString("N");
                var sessionSecurity = HttpContext.RequestServices.GetRequiredService<ISessionSecurityService>();
                await sessionSecurity.RevokeAllUserSessionsAsync(user.Id, null, "AccountDeactivated");
            }
        });
        if (blocked != null) return blocked;

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
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(15);

        user.PasswordResetOtpHashed = PasswordHelper.HashPassword(otp);
        user.PasswordResetOtpExpiresAtUtc = expiresAtUtc;
        user.PasswordResetOtpAttempts = 0;

        if (_emailOutbox != null)
        {
            user.SecurityStamp = Guid.NewGuid().ToString("N");
            if (_sessionSecurity != null)
            {
                await _sessionSecurity.RevokeAllUserSessionsAsync(user.Id, null, "AdminInitiatedPasswordReset");
            }
            _emailOutbox.QueuePasswordResetOtp(user.Email, user.FullName, otp, expiresAtUtc, collegeId);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Password reset OTP queued for staff member {Email} for tenant {CollegeId}", user.Email, collegeId);
            string? devOtp = _environment.IsDevelopment() ? otp : null;

            return Ok(new
            {
                success = true,
                message = "A 6-digit password reset verification code has been queued for delivery to the user's official email address (valid for 15 minutes).",
                emailQueued = true,
                emailDispatched = true,
                expiresAtUtc = user.PasswordResetOtpExpiresAtUtc,
                devOtp = devOtp
            });
        }

        await _context.SaveChangesAsync();

        try
        {
            await _emailSender.SendPasswordResetOtpAsync(user.Email, user.FullName, otp);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to dispatch password reset OTP email to {Email} for tenant {CollegeId}", user.Email, collegeId);
            user.PasswordResetOtpHashed = null;
            user.PasswordResetOtpExpiresAtUtc = null;
            user.PasswordResetOtpAttempts = 0;
            await _context.SaveChangesAsync();

            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                success = false,
                emailDispatched = false,
                code = "EMAIL_DELIVERY_FAILED",
                message = "Unable to dispatch the password reset verification code email. Please check the institutional mail configuration and try again."
            });
        }

        // Rotate security stamp and revoke active sessions so the user must complete OTP reset
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        if (_sessionSecurity != null)
        {
            await _sessionSecurity.RevokeAllUserSessionsAsync(user.Id, null, "AdminInitiatedPasswordReset");
        }
        await _context.SaveChangesAsync();

        _logger.LogInformation("Password reset OTP dispatched to staff member {Email} for tenant {CollegeId}", user.Email, collegeId);

        // In development only, supply devOtp for test harnesses. In production, never expose credentials.
        string? devOtpFallback = _environment.IsDevelopment() ? otp : null;

        return Ok(new
        {
            success = true,
            message = "A 6-digit password reset verification code has been dispatched to the user's official email address (valid for 15 minutes).",
            emailDispatched = true,
            expiresAtUtc = user.PasswordResetOtpExpiresAtUtc,
            devOtp = devOtpFallback
        });
    }

    [HttpPut("users/{id}")]
    public async Task<ActionResult<CollegeStaffDto>> UpdateStaffUser(Guid id, [FromBody] UpdateCollegeStaffRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var user = await _context.Users.Include(u => u.Department).FirstOrDefaultAsync(u => u.Id == id && u.CollegeId == collegeId && !u.IsDeleted);
        if (user == null) return NotFound(new { message = "User not found." });

        if (request.Role == UserRole.SuperAdmin)
        {
            return BadRequest(new { message = "College administrators cannot assign the SuperAdmin platform role." });
        }

        var previousRole = user.Role;
        var requiresAnotherActiveAdmin =
            previousRole == UserRole.CollegeAdmin &&
            user.IsActive &&
            request.Role.HasValue &&
            request.Role.Value != UserRole.CollegeAdmin;

        var blocked = await ExecuteCollegeAdminMutationAsync(collegeId, user.Id, requiresAnotherActiveAdmin, async () =>
        {
            if (!string.IsNullOrWhiteSpace(request.FullName)) user.FullName = request.FullName.Trim();
            if (request.Role.HasValue) user.Role = request.Role.Value;
            if (request.Designation.HasValue) user.Designation = request.Designation.Value;
            if (request.DelegatedResponsibility.HasValue) user.DelegatedResponsibility = request.DelegatedResponsibility.Value;
            if (request.EmployeeCode != null) user.EnrollmentOrEmployeeCode = request.EmployeeCode.Trim();
            user.DepartmentId = request.DepartmentId;

            // If updated to HOD and departmentId is specified, also set as department's HodUserId
            if (user.Role == UserRole.HOD && user.DepartmentId.HasValue)
            {
                var dept = await _context.Departments.FirstOrDefaultAsync(d => d.Id == user.DepartmentId.Value && d.CollegeId == collegeId && !d.IsDeleted);
                if (dept != null) dept.HodUserId = user.Id;
            }
        });
        if (blocked != null) return blocked;
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

    private static readonly string[] PlaceholderExactDomains =
    {
        "localhost",
        "example.com",
        "example.org",
        "example.net",
        "example.edu",
    };

    private static readonly string[] PlaceholderDomainSuffixes =
    {
        ".example",
        ".example.com",
        ".example.org",
        ".example.net",
        ".example.edu",
        ".test",
        ".invalid",
        ".localhost",
        ".local",
    };

    private static bool TryValidateInstitutionalEmail(
        string rawEmail,
        int maxEmailLength,
        CollegeTenant? tenant,
        out string normalizedEmail,
        out string errorMessage)
    {
        normalizedEmail = string.Empty;
        errorMessage = string.Empty;

        if (string.IsNullOrWhiteSpace(rawEmail) ||
            rawEmail.Length > maxEmailLength ||
            rawEmail.Any(char.IsWhiteSpace) ||
            !System.Net.Mail.MailAddress.TryCreate(rawEmail, out var parsedMail))
        {
            errorMessage = "Valid institutional email is required.";
            return false;
        }

        var host = parsedMail.Host.Trim().ToLowerInvariant();
        if (!host.Contains('.') || host.StartsWith('.') || host.EndsWith('.') || host.Contains(".."))
        {
            errorMessage = "Valid institutional email is required.";
            return false;
        }

        if (PlaceholderExactDomains.Contains(host, StringComparer.OrdinalIgnoreCase) ||
            PlaceholderDomainSuffixes.Any(suffix => host.EndsWith(suffix, StringComparison.OrdinalIgnoreCase)))
        {
            errorMessage = $"Valid institutional email is required. Placeholder domain '{host}' is not allowed.";
            return false;
        }

        normalizedEmail = rawEmail.ToLowerInvariant();
        return true;
    }

    private static readonly HashSet<string> DisallowedSecurityCsvHeaders = new(StringComparer.OrdinalIgnoreCase)
    {
        "Role", "IsHOD", "IsCollegeAdmin", "Password", "PasswordHash",
        "UserId", "TenantId", "CollegeId", "IsActivated", "IsEmailVerified",
        "IsActive", "CreatedAt", "CreatedAtUtc"
    };

    /// <summary>
    /// Normalizes a program string for matching: trim, uppercase, remove dots/spaces,
    /// and collapse internal runs of whitespace.  E.g. "B.Tech", "Btech", "B TECH", "B-TECH"
    /// all normalize to "BTECH".
    /// </summary>
    private static string NormalizeProgramString(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return raw!;
        var s = raw.Trim();
        // Uppercase
        s = s.ToUpperInvariant();
        // Remove dots/periods
        s = s.Replace(".", string.Empty);
        // Remove dashes/hyphens
        s = s.Replace("-", string.Empty);
        // Collapse internal whitespace
        s = string.Join(" ", s.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries));
        return s;
    }

    private static bool TryParseFacultyDesignation(string? raw, out FacultyDesignation designation)
    {
        designation = default;
        var trimmed = (raw ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(trimmed) || int.TryParse(trimmed, out _))
        {
            return false;
        }

        var normalized = trimmed.Replace(" ", string.Empty, StringComparison.Ordinal);
        return Enum.TryParse<FacultyDesignation>(normalized, ignoreCase: true, out designation)
               && Enum.IsDefined(designation);
    }

    private sealed record StaffImportUpdatePlan(
        Guid UserId,
        string FullName,
        Guid DepartmentId,
        FacultyDesignation Designation);

    private sealed record StudentImportUpdatePlan(
        Guid UserId,
        string FullName,
        Guid DepartmentId,
        int? CurrentSemesterTermId,
        Guid? CourseProgramId);

    private sealed class StaffImportValidationResult
    {
        public List<string> HeaderErrors { get; init; } = new();
        public List<RosterImportPreviewRowDto> PreviewRows { get; init; } = new();
        public List<UserAccount> UsersToAdd { get; init; } = new();
        public List<StaffImportUpdatePlan> UsersToUpdate { get; init; } = new();
        public List<(string Email, string FullName, string RawToken)> ActivationDispatches { get; init; } = new();
        public List<string> FlatErrors { get; init; } = new();
        public int DuplicateCount { get; init; }
    }

    private async Task<StaffImportValidationResult> ValidateAndPrepareStaffImportAsync(Guid collegeId, BulkStaffUploadRequest request)
    {
        const int maxRosterRows = 500;
        const int maxFullNameLength = 150;
        const int maxEmailLength = 254;
        const int maxDepartmentCodeLength = 32;

        if (request.CsvHeaders != null)
        {
            var normalizedHeaders = request.CsvHeaders
                .Select(h => (h ?? string.Empty).Trim())
                .ToList();

            var forbidden = normalizedHeaders.Where(h => DisallowedSecurityCsvHeaders.Contains(h)).ToList();
            if (forbidden.Count > 0)
            {
                var msg = forbidden.Any(h => string.Equals(h, "Role", StringComparison.OrdinalIgnoreCase))
                    ? "Legacy header 'Role' is not supported in the roster contract. HOD appointments must be performed via Department Leadership."
                    : $"Security-sensitive column(s) ({string.Join(", ", forbidden)}) are not permitted in Faculty.csv. Roles and tenant scope are managed by the platform.";
                return new StaffImportValidationResult { HeaderErrors = new List<string> { msg }, FlatErrors = new List<string> { msg } };
            }

            if (normalizedHeaders.Distinct(StringComparer.OrdinalIgnoreCase).Count() != normalizedHeaders.Count)
            {
                const string msg = "Invalid CSV headers. Duplicate columns detected.";
                return new StaffImportValidationResult { HeaderErrors = new List<string> { msg }, FlatErrors = new List<string> { msg } };
            }

            var hasFullName = normalizedHeaders.Any(h => string.Equals(h, "FullName", StringComparison.OrdinalIgnoreCase));
            var hasEmail = normalizedHeaders.Any(h => string.Equals(h, "Email", StringComparison.OrdinalIgnoreCase));
            var hasDept = normalizedHeaders.Any(h => string.Equals(h, "DepartmentCode", StringComparison.OrdinalIgnoreCase));
            var hasDesig = normalizedHeaders.Any(h => string.Equals(h, "Designation", StringComparison.OrdinalIgnoreCase));
            var allowedHeaders = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "FullName", "Email", "DepartmentCode", "Designation"
            };
            var unexpected = normalizedHeaders.Where(h => !allowedHeaders.Contains(h)).ToList();

            if (!hasFullName || !hasEmail || !hasDept || !hasDesig || unexpected.Count > 0)
            {
                const string msg = "Invalid CSV headers. Expected columns: FullName, Email, DepartmentCode, Designation.";
                return new StaffImportValidationResult { HeaderErrors = new List<string> { msg }, FlatErrors = new List<string> { msg } };
            }
        }

        if (request.StaffRows == null || request.StaffRows.Count == 0)
        {
            const string msg = "No staff records provided in request.";
            return new StaffImportValidationResult { HeaderErrors = new List<string> { msg }, FlatErrors = new List<string> { msg } };
        }

        if (request.StaffRows.Count > maxRosterRows)
        {
            var msg = $"Roster import is limited to {maxRosterRows} rows per upload.";
            return new StaffImportValidationResult { HeaderErrors = new List<string> { msg }, FlatErrors = new List<string> { msg } };
        }

        var errors = new List<string>();
        var previewRows = new List<RosterImportPreviewRowDto>();
        var emailsInFile = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        int duplicateCount = 0;

        var tenant = await _context.CollegeTenants
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == collegeId && !c.IsDeleted);
        var depts = await _context.Departments
            .Where(d => d.CollegeId == collegeId && !d.IsDeleted)
            .ToListAsync();

        var existingUsers = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => !u.IsDeleted)
            .ToListAsync();
        var existingUsersByEmail = existingUsers
            .GroupBy(u => u.Email.Trim().ToLowerInvariant())
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var usersToAdd = new List<UserAccount>();
        var staffUpdates = new List<StaffImportUpdatePlan>();
        var activationDispatches = new List<(string Email, string FullName, string RawToken)>();

        for (int i = 0; i < request.StaffRows.Count; i++)
        {
            var row = request.StaffRows[i];
            int rowNum = i + 1;
            var rowErrors = new List<string>();

            var fullName = (row.FullName ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(fullName))
            {
                rowErrors.Add("FullName is required.");
            }
            else if (fullName.Length > maxFullNameLength)
            {
                rowErrors.Add($"FullName exceeds {maxFullNameLength} characters.");
            }

            var rawEmail = (row.Email ?? string.Empty).Trim();

            if (!TryValidateInstitutionalEmail(rawEmail, maxEmailLength, tenant, out var normalizedEmail, out var emailError))
            {
                rowErrors.Add(emailError);
            }
            else if (!emailsInFile.Add(normalizedEmail))
            {
                duplicateCount++;
                rowErrors.Add($"Duplicate Email '{normalizedEmail}' in upload file.");
            }

            var deptCode = (row.DepartmentCode ?? string.Empty).Trim();
            Department? dept = null;
            if (string.IsNullOrWhiteSpace(deptCode) || deptCode.Length > maxDepartmentCodeLength)
            {
                rowErrors.Add("DepartmentCode is required.");
            }
            else
            {
                dept = depts.FirstOrDefault(d => string.Equals(d.Code, deptCode, StringComparison.OrdinalIgnoreCase));
                if (dept == null)
                {
                    rowErrors.Add($"DepartmentCode '{deptCode}' not found in this institution.");
                }
            }

            if (!TryParseFacultyDesignation(row.Designation, out var designation))
            {
                rowErrors.Add($"Unsupported Designation '{row.Designation}'. Allowed: Professor, Associate Professor, Assistant Professor, Adjunct Faculty, Lecturer.");
            }

            if (rowErrors.Count == 0 && existingUsersByEmail.TryGetValue(normalizedEmail, out var existingUser))
            {
                if (existingUser.CollegeId != collegeId)
                {
                    rowErrors.Add($"Email '{normalizedEmail}' conflicts with an existing platform account and cannot be imported.");
                }
                else if (existingUser.Role != UserRole.Faculty)
                {
                    rowErrors.Add($"Email '{normalizedEmail}' belongs to an existing account with a protected or incompatible role ('{existingUser.Role}') and cannot be overwritten via roster import.");
                }
                else
                {
                    staffUpdates.Add(new StaffImportUpdatePlan(existingUser.Id, fullName, dept!.Id, designation));
                    previewRows.Add(new RosterImportPreviewRowDto
                    {
                        RowNumber = rowNum,
                        FullName = fullName,
                        Email = normalizedEmail,
                        DepartmentCode = dept.Code,
                        SecondaryValue = designation.ToString(),
                        Action = "update",
                        Errors = new List<string>()
                    });
                    continue;
                }
            }

            if (rowErrors.Count > 0)
            {
                foreach (var err in rowErrors)
                {
                    errors.Add($"Row {rowNum}: {err}");
                }
                previewRows.Add(new RosterImportPreviewRowDto
                {
                    RowNumber = rowNum,
                    FullName = fullName,
                    Email = string.IsNullOrEmpty(normalizedEmail) ? rawEmail : normalizedEmail,
                    DepartmentCode = deptCode,
                    SecondaryValue = row.Designation,
                    Action = "invalid",
                    Errors = rowErrors
                });
                continue;
            }

            var rawActivationToken = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32))
                .Replace("+", "-").Replace("/", "_").TrimEnd('=');
            var activationTokenHash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawActivationToken)));

            var employeeCode = $"STAFF-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";

            var user = new UserAccount
            {
                CollegeId = collegeId,
                DepartmentId = dept!.Id,
                FullName = fullName,
                Email = normalizedEmail,
                Role = UserRole.Faculty,
                Designation = designation,
                EnrollmentOrEmployeeCode = employeeCode,
                PasswordHash = null,
                PasswordChangedAtUtc = null,
                ActivationTokenHashed = activationTokenHash,
                ActivationTokenExpiresAtUtc = DateTime.UtcNow.AddHours(24),
                IsActive = true,
                IsActivated = false
            };

            usersToAdd.Add(user);
            activationDispatches.Add((user.Email, user.FullName, rawActivationToken));
            previewRows.Add(new RosterImportPreviewRowDto
            {
                RowNumber = rowNum,
                FullName = fullName,
                Email = normalizedEmail,
                DepartmentCode = dept.Code,
                SecondaryValue = designation.ToString(),
                Action = "create",
                Errors = new List<string>()
            });
        }

        return new StaffImportValidationResult
        {
            PreviewRows = previewRows,
            UsersToAdd = usersToAdd,
            UsersToUpdate = staffUpdates,
            ActivationDispatches = activationDispatches,
            FlatErrors = errors,
            DuplicateCount = duplicateCount
        };
    }

    [HttpPost("users/bulk/preview")]
    public async Task<ActionResult<RosterImportPreviewDto>> PreviewBulkUploadStaff([FromBody] BulkStaffUploadRequest request)
    {
        if (!_tenantContext.CollegeId.HasValue)
        {
            return Forbid();
        }

        var result = await ValidateAndPrepareStaffImportAsync(_tenantContext.CollegeId.Value, request);
        return Ok(new RosterImportPreviewDto
        {
            ImportType = "Faculty",
            TotalRows = result.HeaderErrors.Count > 0 ? (request.StaffRows?.Count ?? 0) : result.PreviewRows.Count,
            ValidCount = result.PreviewRows.Count(r => r.Action != "invalid"),
            InvalidCount = result.PreviewRows.Count(r => r.Action == "invalid"),
            CreateCount = result.PreviewRows.Count(r => r.Action == "create"),
            UpdateCount = result.PreviewRows.Count(r => r.Action == "update"),
            UnchangedCount = result.PreviewRows.Count(r => r.Action == "unchanged"),
            DuplicateCount = result.DuplicateCount,
            HeaderErrors = result.HeaderErrors,
            Rows = result.PreviewRows
        });
    }

    [HttpPost("users/bulk")]
    public async Task<ActionResult<BulkStaffUploadResultDto>> BulkUploadStaff([FromBody] BulkStaffUploadRequest request)
    {
        if (!_tenantContext.CollegeId.HasValue)
        {
            return Forbid();
        }

        var collegeId = _tenantContext.CollegeId.Value;
        var validation = await ValidateAndPrepareStaffImportAsync(collegeId, request);

        if (validation.HeaderErrors.Count > 0 || validation.FlatErrors.Count > 0)
        {
            return BadRequest(new BulkStaffUploadResultDto
            {
                TotalSubmitted = request.StaffRows?.Count ?? 0,
                SuccessfullyCreated = 0,
                SuccessfullyUpdated = 0,
                FailedCount = validation.FlatErrors.Count > 0 ? validation.FlatErrors.Count : validation.HeaderErrors.Count,
                Errors = validation.FlatErrors.Count > 0 ? validation.FlatErrors : validation.HeaderErrors
            });
        }

        var (callerId, callerEmail, _) = await ResolveCallerIdentityAsync();

        if (_emailOutbox != null)
        {
            var activationExpiry = DateTime.UtcNow.AddHours(24);
            foreach (var dispatch in validation.ActivationDispatches)
            {
                _emailOutbox.QueueAccountActivation(dispatch.Email, dispatch.FullName, dispatch.RawToken, activationExpiry, collegeId);
            }
        }

        try
        {
            if (_context.Database.IsRelational())
            {
                var strategy = _context.Database.CreateExecutionStrategy();
                await strategy.ExecuteAsync(async () =>
                {
                    await using var tx = await _context.Database.BeginTransactionAsync();
                    try
                    {
                        await PersistBulkRosterImportAsync(collegeId, callerId, callerEmail, request.StaffRows.Count, validation.UsersToAdd, validation.UsersToUpdate);
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
            else
            {
                await PersistBulkRosterImportAsync(collegeId, callerId, callerEmail, request.StaffRows.Count, validation.UsersToAdd, validation.UsersToUpdate);
            }
        }
        catch (DbUpdateException ex) when (IsDatabaseConflict(ex))
        {
            return Conflict(new BulkStaffUploadResultDto
            {
                TotalSubmitted = request.StaffRows.Count,
                SuccessfullyCreated = 0,
                SuccessfullyUpdated = 0,
                FailedCount = 1,
                Errors = new List<string> { "Roster import conflicted with a concurrent database update or uniqueness constraint. Please refresh and try again." }
            });
        }

        if (_emailOutbox == null)
        {
            var emailSender = HttpContext.RequestServices.GetRequiredService<IEmailSender>();
            foreach (var dispatch in validation.ActivationDispatches)
            {
                await emailSender.SendAccountActivationAsync(dispatch.Email, dispatch.FullName, dispatch.RawToken);
            }
        }

        return Ok(new BulkStaffUploadResultDto
        {
            TotalSubmitted = request.StaffRows.Count,
            SuccessfullyCreated = validation.UsersToAdd.Count,
            SuccessfullyUpdated = validation.UsersToUpdate.Count,
            FailedCount = 0,
            Errors = new List<string>()
        });
    }

    private sealed class StudentImportValidationResult
    {
        public List<string> HeaderErrors { get; init; } = new();
        public List<RosterImportPreviewRowDto> PreviewRows { get; init; } = new();
        public List<UserAccount> UsersToAdd { get; init; } = new();
        public List<StudentImportUpdatePlan> UsersToUpdate { get; init; } = new();
        public List<StudentAcademicEnrollment> EnrollmentsToAdd { get; init; } = new();
        public List<(string Email, string FullName, string RawToken)> ActivationDispatches { get; init; } = new();
        public List<string> FlatErrors { get; init; } = new();
        public int DuplicateCount { get; init; }
    }

    private async Task<StudentImportValidationResult> ValidateAndPrepareStudentImportAsync(Guid collegeId, BulkStudentUploadRequest request)
    {
        const int maxRows = 500;
        const int maxNameLen = 150;
        const int maxEmailLen = 254;
        const int maxCodeLen = 40;

        if (request.CsvHeaders != null)
        {
            var normalizedHeaders = request.CsvHeaders.Select(h => (h ?? string.Empty).Trim()).ToList();
            var forbidden = normalizedHeaders.Where(h => DisallowedSecurityCsvHeaders.Contains(h)).ToList();
            if (forbidden.Count > 0)
            {
                var msg = $"Security-sensitive column(s) ({string.Join(", ", forbidden)}) are not permitted in Students.csv. Imported records are always assigned the Student role within your college.";
                return new StudentImportValidationResult { HeaderErrors = new List<string> { msg }, FlatErrors = new List<string> { msg } };
            }

            if (normalizedHeaders.Distinct(StringComparer.OrdinalIgnoreCase).Count() != normalizedHeaders.Count)
            {
                const string msg = "Invalid CSV headers. Duplicate columns detected.";
                return new StudentImportValidationResult { HeaderErrors = new List<string> { msg }, FlatErrors = new List<string> { msg } };
            }

            var hasName = normalizedHeaders.Any(h => string.Equals(h, "StudentName", StringComparison.OrdinalIgnoreCase));
            var hasEmail = normalizedHeaders.Any(h => string.Equals(h, "Email", StringComparison.OrdinalIgnoreCase));
            var hasNum = normalizedHeaders.Any(h => string.Equals(h, "StudentNumber", StringComparison.OrdinalIgnoreCase));
            var hasDept = normalizedHeaders.Any(h => string.Equals(h, "DepartmentCode", StringComparison.OrdinalIgnoreCase));
            var allowedHeaders = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "StudentName", "Email", "StudentNumber", "DepartmentCode", "Program", "AdmissionYear", "CurrentSemester"
            };

            if (!hasName || !hasEmail || !hasNum || !hasDept || normalizedHeaders.Any(h => !allowedHeaders.Contains(h)))
            {
                const string msg = "Invalid CSV headers. Required: StudentName, Email, StudentNumber, DepartmentCode. Optional: Program, AdmissionYear, CurrentSemester.";
                return new StudentImportValidationResult { HeaderErrors = new List<string> { msg }, FlatErrors = new List<string> { msg } };
            }
        }

        if (request.StudentRows == null || request.StudentRows.Count == 0)
        {
            const string msg = "No student records provided in request.";
            return new StudentImportValidationResult { HeaderErrors = new List<string> { msg }, FlatErrors = new List<string> { msg } };
        }

        if (request.StudentRows.Count > maxRows)
        {
            var msg = $"Student roster import is limited to {maxRows} rows per upload.";
            return new StudentImportValidationResult { HeaderErrors = new List<string> { msg }, FlatErrors = new List<string> { msg } };
        }

        var depts = await _context.Departments
            .AsNoTracking()
            .Include(d => d.CourseProgram)
            .Where(d => d.CollegeId == collegeId && !d.IsDeleted)
            .ToListAsync();

        var programs = await _context.CoursePrograms
            .AsNoTracking()
            .Where(p => p.CollegeId == collegeId && !p.IsDeleted)
            .ToListAsync();

        // Build a normalized program lookup: trim + uppercase + strip dots + collapse spaces.
        // This allows "B.Tech", "Btech", "B TECH", "B-TECH" etc. to all resolve to the same canonical program.
        var normalizedProgramLookup = programs
            .ToDictionary(
                p => NormalizeProgramString(p.Code),
                p => p,
                StringComparer.OrdinalIgnoreCase);
        // If multiple DB programs normalize to the same key, keep the first (or could reject as ambiguous).
        // Also index by normalized name for fallback lookups.
        var normalizedNameLookup = programs
            .ToDictionary(
                p => NormalizeProgramString(p.Name),
                p => p,
                StringComparer.OrdinalIgnoreCase);

        var activeSession = await _context.AcademicSessions
            .AsNoTracking()
            .Where(s => s.CollegeId == collegeId && s.IsActive && !s.IsDeleted)
            .OrderByDescending(s => s.StartDate)
            .FirstOrDefaultAsync();

        var semesterTerms = await _context.SemesterTerms
            .AsNoTracking()
            .Where(t => t.CollegeId == collegeId && t.IsActive && !t.IsDeleted)
            .ToListAsync();

        var existingUsers = await _context.Users
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Include(u => u.Department)
            .Include(u => u.AcademicEnrollments)
            .Where(u => !u.IsDeleted)
            .ToListAsync();

        var existingByEmail = existingUsers
            .GroupBy(u => u.Email.Trim().ToLowerInvariant())
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var existingCollegeByStudentNumber = existingUsers
            .Where(u => u.CollegeId == collegeId && !string.IsNullOrWhiteSpace(u.EnrollmentOrEmployeeCode))
            .GroupBy(u => u.EnrollmentOrEmployeeCode.Trim().ToUpperInvariant())
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var errors = new List<string>();
        var previewRows = new List<RosterImportPreviewRowDto>();
        var seenEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var seenNumbers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        int duplicateCount = 0;

        var currentStudentCountsByDept = existingUsers
            .Where(u => u.CollegeId == collegeId && u.Role == UserRole.Student && u.DepartmentId.HasValue)
            .GroupBy(u => u.DepartmentId!.Value)
            .ToDictionary(g => g.Key, g => g.Count());
        var projectedAdditionsByDept = new Dictionary<Guid, int>();

        var usersToAdd = new List<UserAccount>();
        var studentUpdates = new List<StudentImportUpdatePlan>();
        var enrollmentsToAdd = new List<StudentAcademicEnrollment>();
        var activationDispatches = new List<(string Email, string FullName, string RawToken)>();

        for (int i = 0; i < request.StudentRows.Count; i++)
        {
            var row = request.StudentRows[i];
            int rowNum = i + 1;
            var rowErrors = new List<string>();

            var fullName = (row.StudentName ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(fullName) || fullName.Length > maxNameLen)
            {
                rowErrors.Add($"Valid StudentName (1–{maxNameLen} chars) is required.");
            }

            var rawEmail = (row.Email ?? string.Empty).Trim();
            if (!TryValidateInstitutionalEmail(rawEmail, maxEmailLen, null, out var normalizedEmail, out var emailErr))
            {
                rowErrors.Add(emailErr);
            }
            else if (!seenEmails.Add(normalizedEmail))
            {
                duplicateCount++;
                rowErrors.Add($"Duplicate Email '{normalizedEmail}' in file.");
            }

            var studentNumber = (row.StudentNumber ?? string.Empty).Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(studentNumber) || studentNumber.Length > maxCodeLen)
            {
                rowErrors.Add("Valid StudentNumber is required.");
            }
            else if (!seenNumbers.Add(studentNumber))
            {
                duplicateCount++;
                rowErrors.Add($"Duplicate StudentNumber '{studentNumber}' in file.");
            }

            var deptCode = (row.DepartmentCode ?? string.Empty).Trim();
            var dept = depts.FirstOrDefault(d => string.Equals(d.Code, deptCode, StringComparison.OrdinalIgnoreCase));
            if (dept == null)
            {
                rowErrors.Add($"DepartmentCode '{deptCode}' not found in this institution.");
            }

            CourseProgram? matchedProg = null;
            if (!string.IsNullOrWhiteSpace(row.Program))
            {
                var progKey = row.Program.Trim();
                var normalized = NormalizeProgramString(progKey);

                // Try lookup by normalized code first, then by normalized name.
                if (normalizedProgramLookup.TryGetValue(normalized, out var progByCode))
                {
                    matchedProg = progByCode;
                }
                else if (normalizedNameLookup.TryGetValue(normalized, out var progByName))
                {
                    matchedProg = progByName;
                }
                else
                {
                    rowErrors.Add($"Program '{row.Program}' not found in this institution.");
                }

                // If matchedProg is found but its normalized code/name differs from the normalized input,
                // that indicates ambiguity (multiple programs normalizing to the same key); reject.
                // This is a safety net; the dictionary pick-first approach already handles most cases.
                if (matchedProg != null)
                {
                    var matchedCodeNorm = NormalizeProgramString(matchedProg.Code);
                    var matchedNameNorm = NormalizeProgramString(matchedProg.Name);
                    if (matchedCodeNorm != normalized && matchedNameNorm != normalized)
                    {
                        // The match fell through to the fallback name lookup; ensure it's a true match,
                        // not an ambiguous overlap. Re-validate strictly.
                        if (!string.Equals(matchedProg.Code, progKey, StringComparison.OrdinalIgnoreCase) &&
                            !string.Equals(matchedProg.Name, progKey, StringComparison.OrdinalIgnoreCase))
                        {
                            rowErrors.Add($"Program '{row.Program}' is ambiguous; it resolves to '{matchedProg.Name}' but the input does not match the configured code or name exactly. Please use the exact program code or name.");
                            matchedProg = null;
                        }
                    }
                }
            }
            else if (dept?.CourseProgramId.HasValue == true)
            {
                matchedProg = dept.CourseProgram;
            }

            if (!string.IsNullOrWhiteSpace(row.AdmissionYear))
            {
                var yrStr = row.AdmissionYear.Trim();
                if (!int.TryParse(yrStr, out var yr) || yr < 1990 || yr > 2100)
                {
                    rowErrors.Add("AdmissionYear must be a valid 4-digit year (1990–2100).");
                }
            }

            if (row.CurrentSemester.HasValue && (row.CurrentSemester.Value < 1 || row.CurrentSemester.Value > 12))
            {
                rowErrors.Add("CurrentSemester must be between 1 and 12.");
            }

            if (rowErrors.Count == 0 && existingByEmail.TryGetValue(normalizedEmail, out var existingByMail))
            {
                if (existingByMail.CollegeId != collegeId)
                {
                    rowErrors.Add($"Email '{normalizedEmail}' conflicts with an existing platform account.");
                }
                else if (existingByMail.Role != UserRole.Student)
                {
                    rowErrors.Add($"Email '{normalizedEmail}' belongs to a non-student account and cannot be overwritten.");
                }
                else if (!string.Equals(existingByMail.EnrollmentOrEmployeeCode, studentNumber, StringComparison.OrdinalIgnoreCase))
                {
                    rowErrors.Add($"Email '{normalizedEmail}' is already linked to StudentNumber '{existingByMail.EnrollmentOrEmployeeCode}'.");
                }
                else
                {
                    // Student exists with matching email and StudentNumber.
                    // Determine if any profile or academic data has changed.
                    bool nameChanged = !string.Equals(existingByMail.FullName, fullName, StringComparison.Ordinal);
                    bool deptChanged = existingByMail.DepartmentId != dept!.Id;
                    var existingDeptCourseProgramId = existingByMail.Department?.CourseProgramId;
                    var resolvedProgId = matchedProg?.Id ?? existingDeptCourseProgramId;

                    SemesterTerm? resolvedTerm = null;
                    if (row.CurrentSemester.HasValue)
                    {
                        var termMatches = semesterTerms
                            .Where(t => t.DepartmentId == dept.Id &&
                                        t.SemesterNumber == row.CurrentSemester.Value &&
                                        (activeSession == null || t.AcademicSessionId == activeSession.Id))
                            .ToList();
                        if (termMatches.Count > 1)
                        {
                            rowErrors.Add($"Ambiguous SemesterTerm: multiple active terms match Semester {row.CurrentSemester.Value} in department '{dept.Code}'.");
                        }
                        else
                        {
                            resolvedTerm = termMatches.FirstOrDefault();
                        }
                    }

                    bool programChanged = deptChanged
                        || (resolvedProgId.HasValue && existingDeptCourseProgramId.HasValue
                            && existingDeptCourseProgramId.Value != resolvedProgId.Value);

                    var existingDeptEnrollment = existingByMail.AcademicEnrollments
                        .FirstOrDefault(e => e.DepartmentId == dept.Id && !e.IsDeleted);
                    bool semesterChanged = row.CurrentSemester.HasValue
                        && existingDeptEnrollment != null
                        && resolvedTerm != null
                        && resolvedTerm.Id != existingDeptEnrollment.CurrentSemesterTermId;

                    if (rowErrors.Count == 0 && !nameChanged && !deptChanged && !programChanged && !semesterChanged)
                    {
                        // Data is unchanged — report as unchanged; no profile or enrollment modifications needed.
                        previewRows.Add(new RosterImportPreviewRowDto
                        {
                            RowNumber = rowNum,
                            FullName = fullName,
                            Email = normalizedEmail,
                            DepartmentCode = dept.Code,
                            SecondaryValue = studentNumber,
                            Action = "unchanged",
                            Errors = new List<string>()
                        });
                        continue;
                    }

                    // Data has changed — treat as an update.
                    if (rowErrors.Count == 0 && deptChanged && dept.IntakeQuota > 0)
                    {
                        var currentCount = currentStudentCountsByDept.GetValueOrDefault(dept.Id, 0);
                        var pendingAdd = projectedAdditionsByDept.GetValueOrDefault(dept.Id, 0);
                        if (currentCount + pendingAdd + 1 > dept.IntakeQuota)
                        {
                            rowErrors.Add($"Department '{dept.Code}' has reached its sanctioned intake quota ({dept.IntakeQuota} seats).");
                        }
                        else
                        {
                            projectedAdditionsByDept[dept.Id] = pendingAdd + 1;
                        }
                    }

                    if (rowErrors.Count == 0)
                    {
                        studentUpdates.Add(new StudentImportUpdatePlan(existingByMail.Id, fullName, dept.Id,
                            row.CurrentSemester,
                            resolvedProgId));

                        previewRows.Add(new RosterImportPreviewRowDto
                        {
                            RowNumber = rowNum,
                            FullName = fullName,
                            Email = normalizedEmail,
                            DepartmentCode = dept.Code,
                            SecondaryValue = studentNumber,
                            Action = "update",
                            Errors = new List<string>()
                        });
                        continue;
                    }
                }
            }
            else if (rowErrors.Count == 0 && existingCollegeByStudentNumber.TryGetValue(studentNumber, out var existingByNum))
            {
                rowErrors.Add($"StudentNumber '{studentNumber}' is already registered to '{existingByNum.Email}'.");
            }

            if (rowErrors.Count == 0 && dept!.IntakeQuota > 0)
            {
                var currentCount = currentStudentCountsByDept.GetValueOrDefault(dept.Id, 0);
                var pendingAdd = projectedAdditionsByDept.GetValueOrDefault(dept.Id, 0);
                if (currentCount + pendingAdd + 1 > dept.IntakeQuota)
                {
                    rowErrors.Add($"Department '{dept.Code}' has reached its sanctioned intake quota ({dept.IntakeQuota} seats).");
                }
                else
                {
                    projectedAdditionsByDept[dept.Id] = pendingAdd + 1;
                }
            }

            if (rowErrors.Count > 0)
            {
                foreach (var err in rowErrors)
                {
                    errors.Add($"Row {rowNum}: {err}");
                }
                previewRows.Add(new RosterImportPreviewRowDto
                {
                    RowNumber = rowNum,
                    FullName = fullName,
                    Email = string.IsNullOrEmpty(normalizedEmail) ? rawEmail : normalizedEmail,
                    DepartmentCode = deptCode,
                    SecondaryValue = studentNumber,
                    Action = "invalid",
                    Errors = rowErrors
                });
                continue;
            }

            var rawToken = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32))
                .Replace("+", "-").Replace("/", "_").TrimEnd('=');
            var tokenHash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawToken)));

            var newStudent = new UserAccount
            {
                CollegeId = collegeId,
                DepartmentId = dept!.Id,
                FullName = fullName,
                Email = normalizedEmail,
                EnrollmentOrEmployeeCode = studentNumber,
                Role = UserRole.Student,
                PasswordHash = null,
                PasswordChangedAtUtc = null,
                ActivationTokenHashed = tokenHash,
                ActivationTokenExpiresAtUtc = DateTime.UtcNow.AddHours(24),
                IsActive = true,
                IsActivated = false,
                IsEmailVerified = false
            };

            usersToAdd.Add(newStudent);
            activationDispatches.Add((newStudent.Email, newStudent.FullName, rawToken));

            SemesterTerm? matchedTerm = null;
            if (rowErrors.Count == 0 && dept != null)
            {
                var termCandidates = row.CurrentSemester.HasValue
                    ? semesterTerms.Where(t =>
                        t.DepartmentId == dept.Id &&
                        t.SemesterNumber == row.CurrentSemester.Value &&
                        (activeSession == null || t.AcademicSessionId == activeSession.Id)).ToList()
                    : semesterTerms.Where(t =>
                        t.DepartmentId == dept.Id &&
                        (activeSession == null || t.AcademicSessionId == activeSession.Id)).ToList();

                if (termCandidates.Count > 1)
                {
                    rowErrors.Add($"Ambiguous SemesterTerm: multiple active terms match department '{dept.Code}'{(row.CurrentSemester.HasValue ? $" Semester {row.CurrentSemester.Value}" : "")}.");
                }
                else
                {
                    matchedTerm = termCandidates.FirstOrDefault();
                }
            }

            var resolvedProgramId = matchedProg?.Id ?? dept.CourseProgramId ?? programs.FirstOrDefault()?.Id;
            if (resolvedProgramId.HasValue && matchedTerm != null)
            {
                enrollmentsToAdd.Add(new StudentAcademicEnrollment
                {
                    CollegeId = collegeId,
                    StudentUserId = newStudent.Id,
                    CourseProgramId = resolvedProgramId.Value,
                    DepartmentId = dept.Id,
                    CurrentSemesterTermId = matchedTerm.Id,
                    AdmissionBatch = string.IsNullOrWhiteSpace(row.AdmissionYear) ? DateTime.UtcNow.Year.ToString() : row.AdmissionYear.Trim(),
                    AcademicStatus = AcademicStatus.Active
                });
            }

            previewRows.Add(new RosterImportPreviewRowDto
            {
                RowNumber = rowNum,
                FullName = fullName,
                Email = normalizedEmail,
                DepartmentCode = dept.Code,
                SecondaryValue = studentNumber,
                Action = "create",
                Errors = new List<string>()
            });
        }

        return new StudentImportValidationResult
        {
            PreviewRows = previewRows,
            UsersToAdd = usersToAdd,
            UsersToUpdate = studentUpdates,
            EnrollmentsToAdd = enrollmentsToAdd,
            ActivationDispatches = activationDispatches,
            FlatErrors = errors,
            DuplicateCount = duplicateCount
        };
    }

    [HttpPost("students/bulk/preview")]
    public async Task<ActionResult<RosterImportPreviewDto>> PreviewBulkUploadStudents([FromBody] BulkStudentUploadRequest request)
    {
        if (!_tenantContext.CollegeId.HasValue)
        {
            return Forbid();
        }

        var result = await ValidateAndPrepareStudentImportAsync(_tenantContext.CollegeId.Value, request);
        return Ok(new RosterImportPreviewDto
        {
            ImportType = "Students",
            TotalRows = result.HeaderErrors.Count > 0 ? (request.StudentRows?.Count ?? 0) : result.PreviewRows.Count,
            ValidCount = result.PreviewRows.Count(r => r.Action != "invalid"),
            InvalidCount = result.PreviewRows.Count(r => r.Action == "invalid"),
            CreateCount = result.PreviewRows.Count(r => r.Action == "create"),
            UpdateCount = result.PreviewRows.Count(r => r.Action == "update"),
            UnchangedCount = result.PreviewRows.Count(r => r.Action == "unchanged"),
            DuplicateCount = result.DuplicateCount,
            HeaderErrors = result.HeaderErrors,
            Rows = result.PreviewRows
        });
    }

    [HttpPost("students/bulk")]
    public async Task<ActionResult<BulkStudentUploadResultDto>> BulkUploadStudents([FromBody] BulkStudentUploadRequest request)
    {
        if (!_tenantContext.CollegeId.HasValue)
        {
            return Forbid();
        }

        var collegeId = _tenantContext.CollegeId.Value;
        var validation = await ValidateAndPrepareStudentImportAsync(collegeId, request);

        if (validation.HeaderErrors.Count > 0 || validation.FlatErrors.Count > 0)
        {
            return BadRequest(new BulkStudentUploadResultDto
            {
                TotalSubmitted = request.StudentRows?.Count ?? 0,
                FailedCount = validation.FlatErrors.Count > 0 ? validation.FlatErrors.Count : validation.HeaderErrors.Count,
                Errors = validation.FlatErrors.Count > 0 ? validation.FlatErrors : validation.HeaderErrors
            });
        }

        var (actorId, actorEmail, _) = await ResolveCallerIdentityAsync();

        if (_emailOutbox != null)
        {
            var activationExpiry = DateTime.UtcNow.AddHours(24);
            foreach (var dispatch in validation.ActivationDispatches)
            {
                _emailOutbox.QueueAccountActivation(dispatch.Email, dispatch.FullName, dispatch.RawToken, activationExpiry, collegeId);
            }
        }

        try
        {
            if (_context.Database.IsRelational())
            {
                var strategy = _context.Database.CreateExecutionStrategy();
                await strategy.ExecuteAsync(async () =>
                {
                    await using var tx = await _context.Database.BeginTransactionAsync();
                    try
                    {
                        await PersistBulkStudentImportAsync(collegeId, actorId, actorEmail, request.StudentRows.Count, validation);
                        await tx.CommitAsync();
                    }
                    catch (Exception ex)
                    {
                        await tx.RollbackAsync();
                        _logger.LogError(ex, "Transaction rolled back during bulk student import for college {CollegeId}", collegeId);
                        throw;
                    }
                });
            }
            else
            {
                await PersistBulkStudentImportAsync(collegeId, actorId, actorEmail, request.StudentRows.Count, validation);
            }
        }
        catch (DbUpdateException ex) when (IsDatabaseConflict(ex))
        {
            return Conflict(new BulkStudentUploadResultDto
            {
                TotalSubmitted = request.StudentRows.Count,
                SuccessfullyCreated = 0,
                SuccessfullyUpdated = 0,
                FailedCount = 1,
                Errors = new List<string> { "Student roster import conflicted with a concurrent database update or uniqueness constraint. Please refresh and try again." }
            });
        }

        if (_emailOutbox == null)
        {
            var emailSender = HttpContext.RequestServices.GetRequiredService<IEmailSender>();
            foreach (var dispatch in validation.ActivationDispatches)
            {
                await emailSender.SendAccountActivationAsync(dispatch.Email, dispatch.FullName, dispatch.RawToken);
            }
        }

        return Ok(new BulkStudentUploadResultDto
        {
            TotalSubmitted = request.StudentRows.Count,
            SuccessfullyCreated = validation.UsersToAdd.Count,
            SuccessfullyUpdated = validation.UsersToUpdate.Count,
            FailedCount = 0,
            Errors = new List<string>()
        });
    }

    [HttpGet("roster-imports/history")]
    public async Task<ActionResult<List<RosterImportHistoryDto>>> GetRosterImportHistory()
    {
        if (!_tenantContext.CollegeId.HasValue)
        {
            return Forbid();
        }

        var collegeId = _tenantContext.CollegeId.Value;
        var logs = await _context.PlatformAuditLogs
            .AsNoTracking()
            .Where(l => l.TargetTenantId == collegeId &&
                        (l.Action == "BULK_ROSTER_IMPORT" || l.Action == "BULK_STUDENT_ROSTER_IMPORT"))
            .OrderByDescending(l => l.OccurredAtUtc)
            .Take(50)
            .ToListAsync();

        var history = new List<RosterImportHistoryDto>(logs.Count);
        foreach (var log in logs)
        {
            int totalSubmitted = 0;
            int createdCount = 0;
            int updatedCount = 0;

            if (!string.IsNullOrWhiteSpace(log.MetadataJson))
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(log.MetadataJson);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("TotalSubmitted", out var ts) || root.TryGetProperty("totalSubmitted", out ts))
                        totalSubmitted = ts.GetInt32();
                    if (root.TryGetProperty("CreatedCount", out var cc) || root.TryGetProperty("createdCount", out cc))
                        createdCount = cc.GetInt32();
                    if (root.TryGetProperty("UpdatedCount", out var uc) || root.TryGetProperty("updatedCount", out uc))
                        updatedCount = uc.GetInt32();
                }
                catch (System.Text.Json.JsonException)
                {
                    // Ignore malformed metadata
                }
            }

            history.Add(new RosterImportHistoryDto
            {
                Id = log.Id,
                ImportType = log.Action == "BULK_STUDENT_ROSTER_IMPORT" ? "Students" : "Faculty",
                ActorEmail = log.ActorEmail,
                TotalSubmitted = totalSubmitted,
                CreatedCount = createdCount,
                UpdatedCount = updatedCount,
                OccurredAtUtc = log.OccurredAtUtc
            });
        }

        return Ok(history);
    }

    private static bool IsDatabaseConflict(DbUpdateException ex)
    {
        if (ex is DbUpdateConcurrencyException) return true;

        for (Exception? current = ex; current != null; current = current.InnerException)
        {
            var message = current.Message ?? string.Empty;
            if (message.Contains("duplicate key", StringComparison.OrdinalIgnoreCase) ||
                message.Contains("unique constraint", StringComparison.OrdinalIgnoreCase) ||
                message.Contains("serialization failure", StringComparison.OrdinalIgnoreCase) ||
                message.Contains("deadlock", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private async Task ApplyStaffImportUpdatesAsync(Guid collegeId, IReadOnlyList<StaffImportUpdatePlan> updates)
    {
        if (updates.Count == 0) return;

        var ids = updates.Select(u => u.UserId).ToHashSet();
        var tracked = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => ids.Contains(u.Id) && u.CollegeId == collegeId && !u.IsDeleted)
            .ToListAsync();
        var byId = tracked.ToDictionary(u => u.Id);

        foreach (var plan in updates)
        {
            if (!byId.TryGetValue(plan.UserId, out var user))
            {
                throw new DbUpdateConcurrencyException($"Faculty account {plan.UserId} changed during roster import.");
            }

            user.FullName = plan.FullName;
            user.DepartmentId = plan.DepartmentId;
            user.Designation = plan.Designation;
        }
    }

    private async Task ApplyStudentImportUpdatesAsync(Guid collegeId, IReadOnlyList<StudentImportUpdatePlan> updates)
    {
        if (updates.Count == 0) return;

        var ids = updates.Select(u => u.UserId).ToHashSet();
        var tracked = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => ids.Contains(u.Id) && u.CollegeId == collegeId && !u.IsDeleted)
            .ToListAsync();
        var byId = tracked.ToDictionary(u => u.Id);

        foreach (var plan in updates)
        {
            if (!byId.TryGetValue(plan.UserId, out var user))
            {
                throw new DbUpdateConcurrencyException($"Student account {plan.UserId} changed during roster import.");
            }

            // Never overwrite role, credentials, activation state, enrollment, or semester progression.
            user.FullName = plan.FullName;
            user.DepartmentId = plan.DepartmentId;
        }
    }

    private async Task PersistBulkRosterImportAsync(
        Guid collegeId,
        Guid? callerId,
        string callerEmail,
        int totalSubmitted,
        List<UserAccount> usersToAdd,
        IReadOnlyList<StaffImportUpdatePlan> updates)
    {
        await ApplyStaffImportUpdatesAsync(collegeId, updates);

        if (usersToAdd.Count > 0)
        {
            await _context.Users.AddRangeAsync(usersToAdd);
        }

        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = callerId,
            ActorEmail = callerEmail,
            Action = "BULK_ROSTER_IMPORT",
            TargetTenantId = collegeId,
            TargetEntity = "UserAccount",
            MetadataJson = $"{{\"TotalSubmitted\":{totalSubmitted},\"CreatedCount\":{usersToAdd.Count},\"UpdatedCount\":{updates.Count}}}",
            OccurredAtUtc = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
    }

    private async Task PersistBulkStudentImportAsync(
        Guid collegeId,
        Guid? callerId,
        string callerEmail,
        int totalSubmitted,
        StudentImportValidationResult validation)
    {
        await ApplyStudentImportUpdatesAsync(collegeId, validation.UsersToUpdate);

        if (validation.UsersToAdd.Count > 0)
        {
            await _context.Users.AddRangeAsync(validation.UsersToAdd);
        }

        if (validation.EnrollmentsToAdd.Count > 0)
        {
            await _context.StudentAcademicEnrollments.AddRangeAsync(validation.EnrollmentsToAdd);
        }

        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = callerId,
            ActorEmail = callerEmail,
            Action = "BULK_STUDENT_ROSTER_IMPORT",
            TargetTenantId = collegeId,
            TargetEntity = "StudentRoster",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                createdCount = validation.UsersToAdd.Count,
                updatedCount = validation.UsersToUpdate.Count,
                totalSubmitted
            }),
            OccurredAtUtc = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
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

        var requiresAnotherActiveAdmin = user.Role == UserRole.CollegeAdmin && user.IsActive;
        var blocked = await ExecuteCollegeAdminMutationAsync(collegeId, user.Id, requiresAnotherActiveAdmin, async () =>
        {
            user.IsDeleted = true;
            user.DeletedAtUtc = DateTime.UtcNow;
            user.IsActive = false;

            // If this user was HOD of any department, unassign them
            var hodDepts = await _context.Departments.Where(d => d.HodUserId == id && d.CollegeId == collegeId).ToListAsync();
            foreach (var d in hodDepts)
            {
                d.HodUserId = null;
            }
        });
        if (blocked != null) return blocked;

        return NoContent();
    }

    private async Task<ActionResult?> ExecuteCollegeAdminMutationAsync(
        Guid collegeId,
        Guid targetUserId,
        bool requiresAnotherActiveAdmin,
        Func<Task> applyChangesAsync)
    {
        try
        {
            if (_context.Database.IsRelational())
            {
                var strategy = _context.Database.CreateExecutionStrategy();
                ActionResult? blockedResult = null;
                await strategy.ExecuteAsync(async () =>
                {
                    await using var tx = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
                    try
                    {
                        if (requiresAnotherActiveAdmin &&
                            !await _context.Users.AnyAsync(u =>
                                u.CollegeId == collegeId &&
                                !u.IsDeleted &&
                                u.IsActive &&
                                u.Role == UserRole.CollegeAdmin &&
                                u.Id != targetUserId))
                        {
                            blockedResult = BadRequest(new { message = "Cannot deactivate, demote, or delete the last active College Admin for this institution." });
                            await tx.RollbackAsync();
                            return;
                        }

                        await applyChangesAsync();
                        await _context.SaveChangesAsync();
                        await tx.CommitAsync();
                    }
                    catch
                    {
                        try { await tx.RollbackAsync(); } catch (InvalidOperationException) { }
                        throw;
                    }
                });

                return blockedResult;
            }

            if (requiresAnotherActiveAdmin &&
                !await _context.Users.AnyAsync(u =>
                    u.CollegeId == collegeId &&
                    !u.IsDeleted &&
                    u.IsActive &&
                    u.Role == UserRole.CollegeAdmin &&
                    u.Id != targetUserId))
            {
                return BadRequest(new { message = "Cannot deactivate, demote, or delete the last active College Admin for this institution." });
            }

            await applyChangesAsync();
            await _context.SaveChangesAsync();
            return null;
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { message = "Staff account was modified concurrently. Please refresh and try again." });
        }
        catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException pgEx && pgEx.SqlState == "40001")
        {
            return Conflict(new { message = "Concurrent modification detected while updating College Admin status. Please refresh and try again." });
        }
        catch (Npgsql.PostgresException pgEx) when (pgEx.SqlState == "40001")
        {
            return Conflict(new { message = "Concurrent modification detected while updating College Admin status. Please refresh and try again." });
        }
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
                ResultStatus = resultStatus
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
    public ActionResult<CollegeTrackDto> CreateCollegeTrackSession([FromBody] CreateCollegeTrackRequest request)
    {
        return StatusCode(StatusCodes.Status403Forbidden, new
        {
            message = "Department project tracks are initialized and owned by the Department HOD via /api/hod/tracks."
        });
    }

    [HttpGet("settings")]
    public async Task<ActionResult<CollegeSettingsDto>> GetSettings()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var college = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == collegeId && !c.IsDeleted);

        if (college == null) return NotFound();

        return Ok(await BuildCollegeSettingsDtoAsync(college));
    }

    [HttpPut("settings")]
    public async Task<ActionResult<CollegeSettingsDto>> UpdateSettings([FromBody] UpdateCollegeSettingsRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var college = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == collegeId && !c.IsDeleted);

        if (college == null) return NotFound();

        if (request.Name != null)
        {
            var trimmedName = request.Name.Trim();
            if (trimmedName.Length < 2 || trimmedName.Length > 150)
            {
                return BadRequest(new { message = "Official college name must be between 2 and 150 characters." });
            }
            college.Name = trimmedName;
        }

        if (request.AffiliatedUniversity != null)
        {
            var trimmedUni = request.AffiliatedUniversity.Trim();
            if (trimmedUni.Length > 200)
            {
                return BadRequest(new { message = "Affiliated university must be 200 characters or fewer." });
            }
            college.AffiliatingUniversity = string.IsNullOrWhiteSpace(trimmedUni) ? null : trimmedUni;
        }

        if (request.CampusAddress != null)
        {
            var trimmedAddr = request.CampusAddress.Trim();
            if (trimmedAddr.Length > 300)
            {
                return BadRequest(new { message = "Main campus address must be 300 characters or fewer." });
            }
            college.CampusAddress = string.IsNullOrWhiteSpace(trimmedAddr) ? null : trimmedAddr;
        }

        var (actorUserId, actorEmail, _) = await ResolveCallerIdentityAsync();
        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = actorUserId,
            ActorEmail = actorEmail,
            Action = "UPDATE_SETTINGS",
            TargetTenantId = collegeId,
            TargetEntity = college.Name,
            OccurredAtUtc = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return Ok(await BuildCollegeSettingsDtoAsync(college));
    }

    [HttpPost("settings/logo")]
    [RequestSizeLimit(2 * 1024 * 1024)]
    public async Task<ActionResult<CollegeSettingsDto>> UploadCollegeLogo(IFormFile file)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var college = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == collegeId && !c.IsDeleted);

        if (college == null) return NotFound();

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Please select a PNG, JPEG, or WEBP logo image." });
        }

        const long maxLogoBytes = 2 * 1024 * 1024;
        if (file.Length > maxLogoBytes)
        {
            return BadRequest(new { message = "College logo must be 2 MB or smaller." });
        }

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var bytes = ms.ToArray();

        var detectedExt = DetectSafeImageExtension(bytes);
        if (detectedExt == null)
        {
            return BadRequest(new { message = "Unsupported image format. Only valid PNG, JPEG, and WEBP images are allowed." });
        }

        var logoDir = Path.Combine(_environment.ContentRootPath, "App_Data", "college-logos", collegeId.ToString("N"));
        Directory.CreateDirectory(logoDir);

        foreach (var existingFile in Directory.GetFiles(logoDir, "logo.*"))
        {
            System.IO.File.Delete(existingFile);
        }

        var targetPath = Path.Combine(logoDir, $"logo{detectedExt}");
        await System.IO.File.WriteAllBytesAsync(targetPath, bytes);

        college.CrestUrl = $"/api/proxy/api/college/logo?v={DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";

        var (actorUserId, actorEmail, _) = await ResolveCallerIdentityAsync();
        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = actorUserId,
            ActorEmail = actorEmail,
            Action = "UPDATE_SETTINGS",
            TargetTenantId = collegeId,
            TargetEntity = "College Logo",
            OccurredAtUtc = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return Ok(await BuildCollegeSettingsDtoAsync(college));
    }

    [HttpDelete("settings/logo")]
    public async Task<ActionResult<CollegeSettingsDto>> DeleteCollegeLogo()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var college = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == collegeId && !c.IsDeleted);

        if (college == null) return NotFound();

        var logoDir = Path.Combine(_environment.ContentRootPath, "App_Data", "college-logos", collegeId.ToString("N"));
        if (Directory.Exists(logoDir))
        {
            foreach (var existingFile in Directory.GetFiles(logoDir, "logo.*"))
            {
                System.IO.File.Delete(existingFile);
            }
        }

        college.CrestUrl = null;

        var (actorUserId, actorEmail, _) = await ResolveCallerIdentityAsync();
        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = actorUserId,
            ActorEmail = actorEmail,
            Action = "UPDATE_SETTINGS",
            TargetTenantId = collegeId,
            TargetEntity = "College Logo Removed",
            OccurredAtUtc = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return Ok(await BuildCollegeSettingsDtoAsync(college));
    }

    private async Task<CollegeSettingsDto> BuildCollegeSettingsDtoAsync(CollegeTenant college)
    {
        var studentCount = await _context.Users.CountAsync(u =>
            u.CollegeId == college.Id &&
            u.Role == UserRole.Student &&
            u.IsActive &&
            !u.IsDeleted);

        var artifactBytes = await _context.TeamArtifacts
            .Where(a => a.CollegeId == college.Id && !a.IsDeleted)
            .SumAsync(a => (long?)a.FileSizeBytes) ?? 0L;
        var usedStorageGb = Math.Round((double)artifactBytes / (1024.0 * 1024.0 * 1024.0), 3);

        return new CollegeSettingsDto
        {
            Id = college.Id,
            Name = college.Name,
            TenantCode = college.TenantCode,
            CrestUrl = college.CrestUrl,
            AffiliatedUniversity = !string.IsNullOrWhiteSpace(college.AffiliatingUniversity)
                ? college.AffiliatingUniversity.Trim()
                : null,
            CampusAddress = !string.IsNullOrWhiteSpace(college.CampusAddress)
                ? college.CampusAddress.Trim()
                : null,
            LicenseTier = college.LicenseTier,
            MaxStudentSeats = college.MaxStudentSeats,
            EnrolledStudentCount = studentCount,
            StorageQuotaGb = college.StorageQuotaGb,
            UsedStorageGb = usedStorageGb
        };
    }

    private static string? DetectSafeImageExtension(byte[] bytes)
    {
        if (bytes.Length >= 8 &&
            bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47 &&
            bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A)
        {
            return ".png";
        }

        if (bytes.Length >= 3 &&
            bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
        {
            return ".jpg";
        }

        if (bytes.Length >= 12 &&
            bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F' &&
            bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P')
        {
            return ".webp";
        }

        return null;
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
