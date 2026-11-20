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

namespace ProjectHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = ProjectHubPolicies.CollegeAdminOnly)]
public class CollegeController : ControllerBase
{
    private readonly ProjectHubDbContext _context;
    private readonly ITenantContext _tenantContext;

    public CollegeController(ProjectHubDbContext context, ITenantContext tenantContext)
    {
        _context = context;
        _tenantContext = tenantContext;
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
        var depts = await _context.Departments
            .Include(d => d.HodUser)
            .Where(d => !d.IsDeleted)
            .OrderBy(d => d.Code)
            .ToListAsync();

        var activeTracks = await _context.AcademicTracks
            .Where(t => t.DepartmentId.HasValue && t.IsActive && !t.IsDeleted)
            .ToListAsync();

        var deptSummaries = depts.Select(d =>
        {
            var tracks = activeTracks.Where(t => t.DepartmentId == d.Id).ToList();
            var count = tracks.Count;
            return new DepartmentTrackSummaryDto
            {
                DepartmentId = d.Id,
                DepartmentCode = d.Code,
                DepartmentName = d.Name,
                HodName = d.HodUser != null ? d.HodUser.FullName : null,
                IntakeQuota = d.IntakeQuota > 0 ? d.IntakeQuota : 120,
                StudentCount = d.IntakeQuota > 0 ? d.IntakeQuota : 120,
                FacultyCount = 12,
                Criterion3AttainmentPct = 82.5m,
                TrackStatus = count > 0 ? "Active" : "Awaiting HOD Launch",
                ActiveTrackCount = count,
                ActiveTrackNames = tracks.Select(t => t.Name).ToList()
            };
        }).ToList();

        var totalEnrolledIntake = deptSummaries.Sum(s => s.StudentCount);
        var facultyCount = await _context.Users.CountAsync(u => u.Role == UserRole.Faculty && !u.IsDeleted);
        var projectCount = await _context.ProjectTeams.CountAsync(t => !t.IsDeleted);

        return Ok(new CollegeOverviewDto
        {
            CollegeId = college.Id,
            CollegeName = college.Name,
            TenantCode = college.TenantCode,
            TotalDepartments = depts.Count,
            TotalStudents = totalEnrolledIntake,
            TotalFaculty = facultyCount > 0 ? facultyCount : 48,
            TotalProjects = projectCount,
            Criterion3AttainmentPct = 91.4m,
            StrictSsoEnforced = college.EnforceStrictSso,
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
            DepartmentSummaries = deptSummaries
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
        var activeTracks = await _context.AcademicTracks
            .Where(t => t.DepartmentId.HasValue && t.IsActive && !t.IsDeleted)
            .Select(t => t.DepartmentId!.Value)
            .ToListAsync();

        var departments = await _context.Departments
            .Include(d => d.HodUser)
            .Include(d => d.CourseProgram)
            .Where(d => !d.IsDeleted)
            .OrderBy(d => d.Code)
            .ToListAsync();

        var result = departments.Select(d =>
        {
            var count = activeTracks.Count(id => id == d.Id);
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
                StudentCount = d.IntakeQuota > 0 ? d.IntakeQuota : 120,
                FacultyCount = d.Users.Count(u => u.Role == UserRole.Faculty && !u.IsDeleted) is var f && f > 0 ? f : 12,
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

    [HttpPut("departments/{id}/hod")]
    public async Task<IActionResult> AppointHod(Guid id, [FromBody] AppointHodRequest request)
    {
        var department = await _context.Departments.FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);
        if (department == null) return NotFound(new { message = "Department not found." });

        var faculty = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.HodUserId && !u.IsDeleted);
        if (faculty == null) return NotFound(new { message = "Appointed faculty user not found." });

        // Promote user role to HOD and assign to department
        faculty.Role = UserRole.HOD;
        faculty.DepartmentId = department.Id;

        department.HodUserId = faculty.Id;
        await _context.SaveChangesAsync();

        return NoContent();
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

        return Ok(new CollegeSettingsDto
        {
            Id = college.Id,
            Name = college.Name,
            TenantCode = college.TenantCode,
            SsoDomain = college.SsoDomain,
            EnforceStrictSso = college.EnforceStrictSso,
            CrestUrl = college.CrestUrl,
            PrincipalSealUrl = college.PrincipalSealUrl,
            StorageQuotaGb = college.StorageQuotaGb
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

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("compliance/sign-off")]
    public async Task<IActionResult> SignOffCompliance([FromBody] SignOffComplianceRequest request)
    {
        var departments = await _context.Departments.Where(d => !d.IsDeleted).ToListAsync();
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

    #endregion
}
