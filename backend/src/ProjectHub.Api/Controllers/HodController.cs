using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectHub.Api.Authorization;
using ProjectHub.Application.Common.Models;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
using ProjectHub.Infrastructure.Security;

namespace ProjectHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = ProjectHubPolicies.HodOnly)]
public class HodController : ControllerBase
{
    private readonly ProjectHubDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly IFileStorageService _fileStorageService;

    public HodController(
        ProjectHubDbContext context,
        ITenantContext tenantContext,
        IFileStorageService fileStorageService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _fileStorageService = fileStorageService;
    }

    private async Task<UserAccount?> ResolveCurrentUserAsync()
    {
        var collegeId = _tenantContext.CollegeId;
        var userId = _tenantContext.UserId;
        if (!collegeId.HasValue || !userId.HasValue) return null;
        return await _context.Users.FirstOrDefaultAsync(u => u.Id == userId.Value && u.CollegeId == collegeId.Value && !u.IsDeleted);
    }

    private async Task<Guid> ResolveDepartmentIdAsync()
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue || collegeId.Value == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Active institutional tenant context required.");
        }

        var userId = _tenantContext.UserId;
        if (!userId.HasValue || userId.Value == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Authenticated user identity required.");
        }

        // 1. Locate department in current college tenant where caller is appointed as HOD
        var dept = await _context.Departments
            .FirstOrDefaultAsync(d => d.CollegeId == collegeId.Value && 
                (d.HodUserId == userId.Value || d.Users.Any(u => u.Id == userId.Value && u.Role == UserRole.HOD && !u.IsDeleted)) && 
                !d.IsDeleted);

        if (dept == null)
        {
            throw new UnauthorizedAccessException("Current user does not have an active department appointment as Head of Department (HOD).");
        }

        // 2. Validate tenure history: verify appointment is active and not relieved
        var appointmentHistory = await _context.HodAppointmentHistories
            .Where(h => h.CollegeId == collegeId.Value && h.DepartmentId == dept.Id && h.HodUserId == userId.Value && !h.IsDeleted)
            .OrderByDescending(h => h.AppointedAtUtc)
            .FirstOrDefaultAsync();

        if (appointmentHistory != null)
        {
            if (!appointmentHistory.IsCurrent || appointmentHistory.RelievedAtUtc.HasValue)
            {
                throw new UnauthorizedAccessException("User's HOD appointment for this department has been relieved or is no longer active.");
            }
        }
        else if (dept.HodUserId.HasValue && dept.HodUserId.Value != userId.Value)
        {
            throw new UnauthorizedAccessException("Current user is not the designated Head of Department for this department.");
        }

        // 3. Prevent Forged DepartmentId: If token or request provided a DepartmentId, it MUST match the user's appointed department
        if (_tenantContext.DepartmentId.HasValue && _tenantContext.DepartmentId.Value != Guid.Empty)
        {
            if (_tenantContext.DepartmentId.Value != dept.Id)
            {
                throw new UnauthorizedAccessException("Cross-department access denied: Request DepartmentId does not match the authenticated HOD's appointed department.");
            }
        }

        _tenantContext.DepartmentId = dept.Id;
        return dept.Id;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<HodDashboardDto>> GetDashboard()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();
        var dept = await _context.Departments.FirstOrDefaultAsync(d => d.Id == deptId && d.CollegeId == collegeId && !d.IsDeleted);
        if (dept == null) return NotFound(new { message = "Department not found." });

        var teams = await _context.ProjectTeams.Where(t => t.CollegeId == collegeId && t.DepartmentId == deptId && !t.IsDeleted).ToListAsync();
        var students = await _context.Users.CountAsync(u => u.CollegeId == collegeId && u.DepartmentId == deptId && u.Role == UserRole.Student && !u.IsDeleted);
        var mentors = await _context.Users.CountAsync(u => u.CollegeId == collegeId && u.DepartmentId == deptId && (u.Role == UserRole.Faculty || u.Role == UserRole.HOD) && !u.IsDeleted);

        var pendingGradeUnlocks = await _context.ExceptionAuditLogs
            .CountAsync(e => e.CollegeId == collegeId && e.DepartmentId == deptId && e.ActionType == ExceptionActionType.IndividualReVivaUnlock && !e.ApprovedByUserId.HasValue && !e.IsDeleted);

        var pendingExceptions = await _context.ExceptionAuditLogs
            .CountAsync(e => e.CollegeId == collegeId && e.DepartmentId == deptId && e.ActionType != ExceptionActionType.IndividualReVivaUnlock && !e.ApprovedByUserId.HasValue && !e.IsDeleted);

        return Ok(new HodDashboardDto
        {
            DepartmentId = dept.Id,
            DepartmentName = dept.Name,
            DepartmentCode = dept.Code,
            TotalTeams = teams.Count,
            ActiveBuildTeams = teams.Count(t => t.Status == ProjectStatus.ActiveBuild),
            AtRiskTeams = teams.Count(t => t.Status == ProjectStatus.AtRisk || t.MissedLogStreak >= 2),
            ReadyForVivaTeams = teams.Count(t => t.Status == ProjectStatus.ReadyForViva),
            CompletedTeams = teams.Count(t => t.Status == ProjectStatus.Completed),
            DraftTeams = teams.Count(t => t.Status == ProjectStatus.Draft),
            ProjectsWithoutGuide = teams.Count(t => t.GuideUserId == null),
            PendingProposals = teams.Count(t => t.Status == ProjectStatus.PendingHOD),
            PendingGradeUnlocks = pendingGradeUnlocks,
            PendingExceptions = pendingExceptions,
            TotalStudentsEnrolled = students,
            AvailableMentors = mentors,
            EvaluationCutoffDateUtc = dept.EvaluationCutoffDateUtc
        });
    }

    [HttpPut("department-settings/evaluation-cutoff")]
    public async Task<ActionResult<HodDashboardDto>> UpdateEvaluationCutoff([FromBody] UpdateDepartmentEvaluationCutoffRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();
        var dept = await _context.Departments.FirstOrDefaultAsync(d => d.Id == deptId && d.CollegeId == collegeId && !d.IsDeleted);
        if (dept == null) return NotFound(new { message = "Department not found." });

        if (request.EvaluationCutoffDateUtc.HasValue)
        {
            var activeSession = await _context.AcademicSessions
                .AsNoTracking()
                .Where(s => s.CollegeId == collegeId && s.IsActive && !s.IsDeleted)
                .OrderByDescending(s => s.StartDate)
                .FirstOrDefaultAsync();

            if (activeSession != null &&
                (request.EvaluationCutoffDateUtc.Value < activeSession.StartDate ||
                 request.EvaluationCutoffDateUtc.Value > activeSession.EndDate))
            {
                return BadRequest(new
                {
                    message = $"Department evaluation cutoff date must fall within the active academic session ({activeSession.StartDate:yyyy-MM-dd} to {activeSession.EndDate:yyyy-MM-dd})."
                });
            }
        }

        dept.EvaluationCutoffDateUtc = request.EvaluationCutoffDateUtc.HasValue
            ? DateTime.SpecifyKind(request.EvaluationCutoffDateUtc.Value, DateTimeKind.Utc)
            : null;

        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            ActorEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? "hod",
            Action = "UPDATE_DEPARTMENT_EVALUATION_CUTOFF",
            TargetTenantId = collegeId,
            TargetEntity = dept.Code,
            OccurredAtUtc = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return await GetDashboard();
    }

    [HttpGet("academic-context")]
    public async Task<ActionResult<HodAcademicContextDto>> GetAcademicContext()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();

        var dept = await _context.Departments
            .Include(d => d.CourseProgram)
            .FirstOrDefaultAsync(d => d.Id == deptId && d.CollegeId == collegeId && !d.IsDeleted);

        if (dept == null) return NotFound(new { message = "Department not found." });

        var sessions = await _context.AcademicSessions
            .Where(s => s.CollegeId == collegeId && !s.IsDeleted && s.IsActive)
            .OrderByDescending(s => s.StartDate)
            .Select(s => new AcademicSessionDto
            {
                Id = s.Id,
                CollegeId = s.CollegeId,
                Label = s.Label,
                StartDate = s.StartDate,
                EndDate = s.EndDate,
                IsActive = s.IsActive
            })
            .ToListAsync();

        var activeSession = sessions.FirstOrDefault(s => s.IsActive) ?? sessions.FirstOrDefault();

        var existingSemesters = await _context.SemesterTerms
            .Include(t => t.AcademicSession)
            .Include(t => t.SubjectOfferings)
            .Where(t => t.CollegeId == collegeId && t.DepartmentId == deptId && !t.IsDeleted && t.IsActive)
            .OrderBy(t => t.SemesterNumber)
            .ToListAsync();

        var totalSemesters = dept.CourseProgram?.TotalSemesters ?? 8;
        if (totalSemesters <= 0) totalSemesters = 8;

        var availableSemesters = new List<SemesterTermDto>();

        for (int semNum = 1; semNum <= totalSemesters; semNum++)
        {
            var existing = existingSemesters.FirstOrDefault(t => t.SemesterNumber == semNum);
            if (existing != null)
            {
                availableSemesters.Add(new SemesterTermDto
                {
                    Id = existing.Id,
                    CollegeId = existing.CollegeId,
                    DepartmentId = existing.DepartmentId,
                    DepartmentCode = dept.Code,
                    DepartmentName = dept.Name,
                    AcademicSessionId = existing.AcademicSessionId ?? activeSession?.Id,
                    AcademicSessionLabel = existing.AcademicSession?.Label ?? activeSession?.Label,
                    SemesterNumber = existing.SemesterNumber,
                    SemesterName = string.IsNullOrWhiteSpace(existing.SemesterName) ? $"Semester {existing.SemesterNumber}" : existing.SemesterName,
                    Parity = existing.Parity,
                    IsActive = existing.IsActive,
                    SubjectOfferingCount = existing.SubjectOfferings.Count(o => !o.IsDeleted && o.IsActive)
                });
            }
            else
            {
                availableSemesters.Add(new SemesterTermDto
                {
                    Id = Guid.Empty,
                    CollegeId = collegeId,
                    DepartmentId = dept.Id,
                    DepartmentCode = dept.Code,
                    DepartmentName = dept.Name,
                    AcademicSessionId = activeSession?.Id,
                    AcademicSessionLabel = activeSession?.Label,
                    SemesterNumber = semNum,
                    SemesterName = $"Semester {semNum}",
                    Parity = (semNum % 2 == 1) ? SemesterParity.Odd : SemesterParity.Even,
                    IsActive = true,
                    SubjectOfferingCount = 0
                });
            }
        }

        foreach (var extra in existingSemesters.Where(t => t.SemesterNumber > totalSemesters))
        {
            availableSemesters.Add(new SemesterTermDto
            {
                Id = extra.Id,
                CollegeId = extra.CollegeId,
                DepartmentId = extra.DepartmentId,
                DepartmentCode = dept.Code,
                DepartmentName = dept.Name,
                AcademicSessionId = extra.AcademicSessionId ?? activeSession?.Id,
                AcademicSessionLabel = extra.AcademicSession?.Label ?? activeSession?.Label,
                SemesterNumber = extra.SemesterNumber,
                SemesterName = extra.SemesterName,
                Parity = extra.Parity,
                IsActive = extra.IsActive,
                SubjectOfferingCount = extra.SubjectOfferings.Count(o => !o.IsDeleted && o.IsActive)
            });
        }

        availableSemesters = availableSemesters.OrderBy(s => s.SemesterNumber).ToList();

        var existingSemesterIds = existingSemesters.Select(s => s.Id).ToList();

        var offerings = await _context.SubjectOfferings
            .Include(o => o.SemesterTerm)
            .Include(o => o.CurriculumScheme)
            .Where(o => o.CollegeId == collegeId && existingSemesterIds.Contains(o.SemesterTermId) && !o.IsDeleted && o.IsActive)
            .OrderBy(o => o.SemesterTerm != null ? o.SemesterTerm.SemesterNumber : 0)
            .ThenBy(o => o.SubjectCode)
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

        return Ok(new HodAcademicContextDto
        {
            DepartmentId = dept.Id,
            DepartmentName = dept.Name,
            DepartmentCode = dept.Code,
            CourseProgramId = dept.CourseProgramId,
            CourseProgramName = dept.CourseProgram?.Name,
            AvailableSessions = sessions,
            AvailableSemesters = availableSemesters,
            AvailableOfferings = offerings
        });
    }

    [HttpGet("tracks")]
    public async Task<ActionResult<List<CollegeTrackDto>>> GetTracks()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();

        var tracks = await _context.AcademicTracks
            .Include(t => t.Department)
            .Include(t => t.SemesterTerm)
            .Include(t => t.SubjectOffering)
            .Where(t => t.CollegeId == collegeId && t.DepartmentId == deptId && !t.IsDeleted)
            .OrderByDescending(t => t.AcademicYear)
            .ThenByDescending(t => t.CreatedAtUtc)
            .ToListAsync();

        var trackIds = tracks.Select(t => t.Id).ToList();
        var teamStats = await _context.ProjectTeams
            .Where(pt => pt.CollegeId == collegeId && pt.DepartmentId == deptId && trackIds.Contains(pt.AcademicTrackId) && !pt.IsDeleted)
            .GroupBy(pt => pt.AcademicTrackId)
            .Select(g => new
            {
                TrackId = g.Key,
                Total = g.Count(),
                Active = g.Count(pt => pt.Status == ProjectStatus.ActiveBuild || pt.Status == ProjectStatus.AtRisk || pt.Status == ProjectStatus.ReadyForViva || pt.Status == ProjectStatus.PendingHOD || pt.Status == ProjectStatus.PendingGuide || pt.Status == ProjectStatus.PendingCoordinator)
            })
            .ToDictionaryAsync(x => x.TrackId);

        return Ok(tracks.Select(t =>
        {
            var stats = teamStats.GetValueOrDefault(t.Id);
            return MapTrackDto(t, stats?.Total ?? 0, stats?.Active ?? 0);
        }).ToList());
    }

    [HttpPost("tracks")]
    public async Task<ActionResult<CollegeTrackDto>> CreateDepartmentTrack([FromBody] CreateDepartmentTrackRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();

        var dept = await _context.Departments
            .Include(d => d.CourseProgram)
            .FirstOrDefaultAsync(d => d.Id == deptId && d.CollegeId == collegeId && !d.IsDeleted);

        if (dept == null) return NotFound(new { message = "Department not found in current college tenant." });

        var activeSession = await _context.AcademicSessions
            .Where(s => s.CollegeId == collegeId && !s.IsDeleted && s.IsActive)
            .OrderByDescending(s => s.StartDate)
            .FirstOrDefaultAsync();

        var sessionId = request.AcademicSessionId ?? activeSession?.Id;
        int semNumber = request.SemesterNumber ?? 6;
        Guid? semesterTermId = null;

        if (request.SemesterTermId.HasValue && request.SemesterTermId.Value != Guid.Empty)
        {
            var existingTerm = await _context.SemesterTerms
                .FirstOrDefaultAsync(t => t.Id == request.SemesterTermId.Value && t.CollegeId == collegeId && !t.IsDeleted);
            if (existingTerm != null)
            {
                semesterTermId = existingTerm.Id;
                semNumber = existingTerm.SemesterNumber;
            }
        }

        if (!semesterTermId.HasValue)
        {
            var existingTerm = await _context.SemesterTerms.FirstOrDefaultAsync(t =>
                t.CollegeId == collegeId &&
                t.DepartmentId == deptId &&
                (!sessionId.HasValue || t.AcademicSessionId == sessionId.Value) &&
                t.SemesterNumber == semNumber &&
                !t.IsDeleted);

            if (existingTerm != null)
            {
                semesterTermId = existingTerm.Id;
            }
            else
            {
                var newTerm = new SemesterTerm
                {
                    CollegeId = collegeId,
                    DepartmentId = deptId,
                    AcademicSessionId = sessionId,
                    SemesterNumber = semNumber,
                    SemesterName = $"Semester {semNumber}",
                    Parity = (semNumber % 2 == 1) ? SemesterParity.Odd : SemesterParity.Even,
                    IsActive = true
                };
                await _context.SemesterTerms.AddAsync(newTerm);
                await _context.SaveChangesAsync();
                semesterTermId = newTerm.Id;
            }
        }

        Guid? subjectOfferingId = null;

        if (!string.IsNullOrWhiteSpace(request.CustomSubjectCode) || !string.IsNullOrWhiteSpace(request.CustomSubjectName))
        {
            var subjectCode = (request.CustomSubjectCode ?? $"{dept?.Code ?? "CS"}-{semNumber}01").Trim().ToUpperInvariant();
            var existingOffering = await _context.SubjectOfferings.FirstOrDefaultAsync(o =>
                o.CollegeId == collegeId &&
                o.SemesterTermId == semesterTermId.Value &&
                o.SubjectCode == subjectCode &&
                !o.IsDeleted);

            if (existingOffering != null)
            {
                subjectOfferingId = existingOffering.Id;
            }
            else
            {
                var customName = !string.IsNullOrWhiteSpace(request.CustomSubjectName)
                    ? request.CustomSubjectName.Trim()
                    : request.Name.Trim();

                var subjectType = semNumber >= 7 ? SubjectType.MajorProject : (semNumber >= 5 ? SubjectType.MinorProject : SubjectType.Project);
                var credits = request.Credits.GetValueOrDefault(semNumber >= 7 ? 4 : (semNumber >= 5 ? 3 : 2));

                var newOffering = new SubjectOffering
                {
                    CollegeId = collegeId,
                    SemesterTermId = semesterTermId.Value,
                    CurriculumSchemeId = request.CurriculumSchemeId,
                    SubjectCode = subjectCode,
                    SubjectName = customName,
                    SubjectType = subjectType,
                    Credits = credits,
                    InternalMaxMarks = 60,
                    ExternalMaxMarks = 40,
                    IsActive = true
                };
                await _context.SubjectOfferings.AddAsync(newOffering);
                await _context.SaveChangesAsync();
                subjectOfferingId = newOffering.Id;
            }
        }
        else if (request.SubjectOfferingId.HasValue && request.SubjectOfferingId.Value != Guid.Empty)
        {
            subjectOfferingId = request.SubjectOfferingId.Value;
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Track name is required." });
        }

        if (request.ProposalDeadlineUtc.HasValue && request.FinalSubmissionDeadlineUtc.HasValue &&
            request.ProposalDeadlineUtc.Value >= request.FinalSubmissionDeadlineUtc.Value)
        {
            return BadRequest(new { message = "Proposal deadline must be earlier than the final submission deadline." });
        }

        var normalizedName = request.Name.Trim();
        var normalizedYear = request.AcademicYear.Trim();
        var duplicateExists = await _context.AcademicTracks
            .AnyAsync(t => t.CollegeId == collegeId &&
                           t.DepartmentId == deptId &&
                           t.AcademicYear == normalizedYear &&
                           t.Name.ToLower() == normalizedName.ToLower() &&
                           !t.IsDeleted);
        if (duplicateExists)
        {
            return Conflict(new { message = $"A track named '{normalizedName}' already exists for academic year {normalizedYear} in your department." });
        }

        var minSize = request.ParticipationMode == ParticipationMode.Individual ? 1 : request.MinTeamSize;
        var maxSize = request.ParticipationMode == ParticipationMode.Individual ? 1 : request.MaxTeamSize;
        if (minSize < 1 || maxSize < minSize || maxSize > 10)
        {
            return BadRequest(new { message = "Team size bounds must satisfy 1 <= MinTeamSize <= MaxTeamSize <= 10." });
        }

        var status = request.LaunchImmediately ? AcademicTrackStatus.Open : AcademicTrackStatus.Draft;

        var track = new AcademicTrack
        {
            CollegeId = collegeId,
            DepartmentId = deptId,
            AcademicSessionId = sessionId,
            CourseProgramId = request.CourseProgramId ?? dept?.CourseProgramId,
            SemesterTermId = semesterTermId,
            SubjectOfferingId = subjectOfferingId,
            CurriculumSchemeId = request.CurriculumSchemeId,
            ParticipationMode = request.ParticipationMode,
            EnrolmentMode = request.EnrolmentMode,
            MinTeamSize = minSize,
            MaxTeamSize = maxSize,
            AllowCrossBranchTeams = request.AllowCrossBranchTeams,
            AllowInterdisciplinaryTeams = request.AllowInterdisciplinaryTeams,
            Name = normalizedName,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            AcademicYear = normalizedYear,
            Status = status,
            IsActive = status == AcademicTrackStatus.Open,
            ProposalDeadlineUtc = request.ProposalDeadlineUtc,
            FinalSubmissionDeadlineUtc = request.FinalSubmissionDeadlineUtc,
            GuideWeightPct = request.GuideWeightPct,
            MidTermWeightPct = request.MidTermWeightPct,
            FinalVivaWeightPct = request.FinalVivaWeightPct,
            SharedProjectRubricPct = request.SharedProjectRubricPct,
            IndividualStudentRubricPct = request.IndividualStudentRubricPct
        };

        try
        {
            track.ValidateWeights();
        }
        catch (Exception ex) when (ex is InvalidOperationException or ArgumentException)
        {
            return BadRequest(new { message = ex.Message });
        }

        await _context.AcademicTracks.AddAsync(track);
        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            Action = "HOD_CREATE_TRACK",
            TargetTenantId = collegeId,
            TargetEntity = "AcademicTrack",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new { trackId = track.Id, departmentId = deptId, name = track.Name, status = track.Status.ToString() }),
            OccurredAtUtc = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var createdTrack = await _context.AcademicTracks
            .Include(t => t.Department)
            .Include(t => t.SemesterTerm)
            .Include(t => t.SubjectOffering)
            .FirstAsync(t => t.Id == track.Id);

        return Ok(MapTrackDto(createdTrack, 0, 0));
    }

    [HttpPut("tracks/{trackId:guid}")]
    public async Task<ActionResult<CollegeTrackDto>> UpdateDepartmentTrack(Guid trackId, [FromBody] UpdateDepartmentTrackRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();

        var track = await _context.AcademicTracks
            .Include(t => t.Department)
            .Include(t => t.SemesterTerm)
            .Include(t => t.SubjectOffering)
            .FirstOrDefaultAsync(t => t.Id == trackId && t.CollegeId == collegeId && t.DepartmentId == deptId && !t.IsDeleted);

        if (track == null) return NotFound(new { message = "Department project track not found." });

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            var normalizedName = request.Name.Trim();
            var duplicate = await _context.AcademicTracks
                .AnyAsync(t => t.Id != trackId && t.CollegeId == collegeId && t.DepartmentId == deptId &&
                               t.AcademicYear == track.AcademicYear && t.Name.ToLower() == normalizedName.ToLower() && !t.IsDeleted);
            if (duplicate)
            {
                return Conflict(new { message = $"A track named '{normalizedName}' already exists for academic year {track.AcademicYear}." });
            }
            track.Name = normalizedName;
        }

        if (request.Description != null)
        {
            track.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        }

        track.ParticipationMode = request.ParticipationMode;
        track.EnrolmentMode = request.EnrolmentMode;

        if (track.ParticipationMode == ParticipationMode.Individual)
        {
            track.MinTeamSize = 1;
            track.MaxTeamSize = 1;
        }
        else
        {
            track.MinTeamSize = request.MinTeamSize;
            track.MaxTeamSize = request.MaxTeamSize;
            if (track.MinTeamSize < 1 || track.MaxTeamSize < track.MinTeamSize || track.MaxTeamSize > 10)
            {
                return BadRequest(new { message = "Team size bounds must satisfy 1 <= MinTeamSize <= MaxTeamSize <= 10." });
            }
        }

        track.AllowCrossBranchTeams = request.AllowCrossBranchTeams;
        track.AllowInterdisciplinaryTeams = request.AllowInterdisciplinaryTeams;
        if (request.ProposalDeadlineUtc.HasValue) track.ProposalDeadlineUtc = request.ProposalDeadlineUtc;
        if (request.FinalSubmissionDeadlineUtc.HasValue) track.FinalSubmissionDeadlineUtc = request.FinalSubmissionDeadlineUtc;

        if (track.ProposalDeadlineUtc.HasValue && track.FinalSubmissionDeadlineUtc.HasValue &&
            track.ProposalDeadlineUtc.Value >= track.FinalSubmissionDeadlineUtc.Value)
        {
            return BadRequest(new { message = "Proposal deadline must be earlier than the final submission deadline." });
        }

        track.GuideWeightPct = request.GuideWeightPct;
        track.MidTermWeightPct = request.MidTermWeightPct;
        track.FinalVivaWeightPct = request.FinalVivaWeightPct;
        track.SharedProjectRubricPct = request.SharedProjectRubricPct;
        track.IndividualStudentRubricPct = request.IndividualStudentRubricPct;

        try
        {
            track.ValidateWeights();
        }
        catch (Exception ex) when (ex is InvalidOperationException or ArgumentException)
        {
            return BadRequest(new { message = ex.Message });
        }

        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            Action = "HOD_UPDATE_TRACK",
            TargetTenantId = collegeId,
            TargetEntity = "AcademicTrack",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new { trackId = track.Id, departmentId = deptId, name = track.Name }),
            OccurredAtUtc = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var totalTeams = await _context.ProjectTeams.CountAsync(pt => pt.AcademicTrackId == track.Id && !pt.IsDeleted);
        return Ok(MapTrackDto(track, totalTeams, totalTeams));
    }

    [HttpPost("tracks/{trackId:guid}/launch")]
    public Task<ActionResult<CollegeTrackDto>> LaunchDepartmentTrack(Guid trackId)
        => TransitionTrackStatusAsync(trackId, AcademicTrackStatus.Open, "HOD_LAUNCH_TRACK",
            allowedFrom: new[] { AcademicTrackStatus.Draft, AcademicTrackStatus.Paused });

    [HttpPost("tracks/{trackId:guid}/pause")]
    public Task<ActionResult<CollegeTrackDto>> PauseDepartmentTrack(Guid trackId)
        => TransitionTrackStatusAsync(trackId, AcademicTrackStatus.Paused, "HOD_PAUSE_TRACK",
            allowedFrom: new[] { AcademicTrackStatus.Open });

    [HttpPost("tracks/{trackId:guid}/resume")]
    public Task<ActionResult<CollegeTrackDto>> ResumeDepartmentTrack(Guid trackId)
        => TransitionTrackStatusAsync(trackId, AcademicTrackStatus.Open, "HOD_RESUME_TRACK",
            allowedFrom: new[] { AcademicTrackStatus.Paused });

    [HttpPost("tracks/{trackId:guid}/close")]
    public Task<ActionResult<CollegeTrackDto>> CloseDepartmentTrack(Guid trackId)
        => TransitionTrackStatusAsync(trackId, AcademicTrackStatus.Closed, "HOD_CLOSE_TRACK",
            allowedFrom: new[] { AcademicTrackStatus.Draft, AcademicTrackStatus.Open, AcademicTrackStatus.Paused });

    private async Task<ActionResult<CollegeTrackDto>> TransitionTrackStatusAsync(
        Guid trackId,
        AcademicTrackStatus targetStatus,
        string auditAction,
        AcademicTrackStatus[] allowedFrom)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();

        var track = await _context.AcademicTracks
            .Include(t => t.Department)
            .Include(t => t.SemesterTerm)
            .Include(t => t.SubjectOffering)
            .FirstOrDefaultAsync(t => t.Id == trackId && t.CollegeId == collegeId && t.DepartmentId == deptId && !t.IsDeleted);

        if (track == null) return NotFound(new { message = "Department project track not found." });

        if (!allowedFrom.Contains(track.Status))
        {
            return BadRequest(new { message = $"Cannot transition track from {track.Status} to {targetStatus}." });
        }

        track.Status = targetStatus;
        track.IsActive = targetStatus == AcademicTrackStatus.Open;

        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            Action = auditAction,
            TargetTenantId = collegeId,
            TargetEntity = "AcademicTrack",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new { trackId = track.Id, departmentId = deptId, status = targetStatus.ToString() }),
            OccurredAtUtc = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var totalTeams = await _context.ProjectTeams.CountAsync(pt => pt.AcademicTrackId == track.Id && !pt.IsDeleted);
        return Ok(MapTrackDto(track, totalTeams, totalTeams));
    }

    private static CollegeTrackDto MapTrackDto(AcademicTrack t, int teamCount, int activeTeamCount)
    {
        return new CollegeTrackDto
        {
            Id = t.Id,
            CollegeId = t.CollegeId,
            DepartmentId = t.DepartmentId,
            DepartmentCode = t.Department?.Code,
            AcademicSessionId = t.AcademicSessionId,
            CourseProgramId = t.CourseProgramId,
            SemesterTermId = t.SemesterTermId,
            SemesterNumber = t.SemesterTerm?.SemesterNumber,
            SemesterName = t.SemesterTerm?.SemesterName,
            SubjectOfferingId = t.SubjectOfferingId,
            SubjectCode = t.SubjectOffering?.SubjectCode,
            SubjectName = t.SubjectOffering?.SubjectName,
            CurriculumSchemeId = t.CurriculumSchemeId,
            ParticipationMode = t.ParticipationMode,
            EnrolmentMode = t.EnrolmentMode,
            MinTeamSize = t.ParticipationMode == ParticipationMode.Individual ? 1 : t.MinTeamSize,
            MaxTeamSize = t.ParticipationMode == ParticipationMode.Individual ? 1 : t.MaxTeamSize,
            AllowCrossBranchTeams = t.AllowCrossBranchTeams,
            Name = t.Name,
            Description = t.Description,
            AcademicYear = t.AcademicYear,
            AllowInterdisciplinaryTeams = t.AllowInterdisciplinaryTeams,
            IsActive = t.IsActive,
            Status = t.Status,
            TeamCount = teamCount,
            ActiveTeamCount = activeTeamCount,
            ProposalDeadlineUtc = t.ProposalDeadlineUtc,
            FinalSubmissionDeadlineUtc = t.FinalSubmissionDeadlineUtc,
            GuideWeightPct = t.GuideWeightPct,
            MidTermWeightPct = t.MidTermWeightPct,
            FinalVivaWeightPct = t.FinalVivaWeightPct,
            SharedProjectRubricPct = t.SharedProjectRubricPct,
            IndividualStudentRubricPct = t.IndividualStudentRubricPct
        };
    }

    [HttpGet("projects")]
    public async Task<ActionResult<List<HodProjectDto>>> GetProjects(
        [FromQuery] string? status,
        [FromQuery] Guid? trackId,
        [FromQuery] string? search,
        [FromQuery] bool? hasGuide,
        [FromQuery] bool? isAtRisk)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();

        var query = _context.ProjectTeams
            .Include(t => t.GuideUser)
            .Include(t => t.AcademicTrack)
            .Include(t => t.Members)
                .ThenInclude(m => m.User)
            .Include(t => t.Evaluations)
            .Where(t => t.CollegeId == collegeId && t.DepartmentId == deptId && !t.IsDeleted);

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ProjectStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(t => t.Status == parsedStatus);
        }

        if (trackId.HasValue && trackId.Value != Guid.Empty)
        {
            query = query.Where(t => t.AcademicTrackId == trackId.Value);
        }

        if (hasGuide.HasValue)
        {
            query = hasGuide.Value ? query.Where(t => t.GuideUserId != null) : query.Where(t => t.GuideUserId == null);
        }

        if (isAtRisk.HasValue && isAtRisk.Value)
        {
            query = query.Where(t => t.Status == ProjectStatus.AtRisk || t.MissedLogStreak >= 2);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(t => t.TeamCode.ToLower().Contains(term) ||
                                     t.Title.ToLower().Contains(term) ||
                                     t.DomainTag.ToLower().Contains(term) ||
                                     t.Abstract.ToLower().Contains(term));
        }

        var teams = await query.OrderByDescending(t => t.CreatedAtUtc).ToListAsync();

        var dtos = teams.Select(t =>
        {
            var latestEval = t.Evaluations.OrderByDescending(e => e.CreatedAtUtc).FirstOrDefault();
            return new HodProjectDto
            {
                Id = t.Id,
                TeamCode = t.TeamCode,
                Title = t.Title,
                Abstract = t.Abstract,
                DomainTag = t.DomainTag,
                SdgCode = t.SdgCode,
                Status = t.Status,
                AcademicTrackId = t.AcademicTrackId,
                AcademicTrackName = t.AcademicTrack?.Name,
                GuideUserId = t.GuideUserId,
                GuideName = t.GuideUser != null ? t.GuideUser.FullName : null,
                MemberCount = t.Members.Count(m => !m.IsDeleted),
                IsRosterLocked = t.IsRosterLocked,
                MissedLogStreak = t.MissedLogStreak,
                SimilarityScorePct = t.SimilarityScorePct,
                RepoUrl = t.RepoUrl,
                CreatedAtUtc = t.CreatedAtUtc,
                LatestEvaluationScore = latestEval?.SharedTotalScore,
                LatestEvaluationCheckpoint = latestEval?.CheckpointType.ToString(),
                Members = t.Members.Where(m => !m.IsDeleted && m.User != null).Select(m => new HodProjectMemberDto
                {
                    UserId = m.UserId,
                    FullName = m.User!.FullName,
                    EnrollmentNumber = m.User.EnrollmentOrEmployeeCode,
                    IsTeamLead = m.IsTeamLead,
                    ModuleResponsibility = m.ModuleResponsibility
                }).ToList()
            };
        }).ToList();

        return Ok(dtos);
    }

    [HttpPost("projects/{teamId}/assign-guide")]
    public async Task<IActionResult> AssignGuide(Guid teamId, [FromBody] HodAssignGuideRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();

        var team = await _context.ProjectTeams
            .Include(t => t.GuideUser)
            .FirstOrDefaultAsync(t => t.Id == teamId && t.CollegeId == collegeId && t.DepartmentId == deptId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Project team not found in department." });

        var guide = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.GuideUserId && u.CollegeId == collegeId && u.DepartmentId == deptId && (u.Role == UserRole.Faculty || u.Role == UserRole.HOD) && !u.IsDeleted);

        if (guide == null)
        {
            return BadRequest(new { message = "Selected user is not an eligible department faculty mentor." });
        }

        var currentLoad = await _context.ProjectTeams
            .CountAsync(t => t.GuideUserId == guide.Id && t.CollegeId == collegeId && !t.IsDeleted && t.Status != ProjectStatus.Archived && t.Id != team.Id);

        if (currentLoad >= guide.MaxMentorTeams)
        {
            return BadRequest(new { message = $"Faculty member '{guide.FullName}' has reached their maximum mentorship capacity of {guide.MaxMentorTeams} teams." });
        }

        var previousGuideId = team.GuideUserId;
        var previousGuideName = team.GuideUser?.FullName;

        team.GuideUserId = guide.Id;
        if (team.Status == ProjectStatus.Draft)
        {
            team.Status = ProjectStatus.PendingGuide;
        }

        var reason = request.Reason ?? (previousGuideId.HasValue ? "Guide reassigned by HOD" : "Guide allocated by HOD");

        var exceptionLog = new ExceptionAuditLog
        {
            CollegeId = collegeId,
            DepartmentId = deptId,
            ProjectTeamId = team.Id,
            ActionType = ExceptionActionType.ReassignGuide,
            TargetUserId = guide.Id,
            PreviousValueJson = System.Text.Json.JsonSerializer.Serialize(new { guideUserId = previousGuideId, guideName = previousGuideName }),
            NewValueJson = System.Text.Json.JsonSerializer.Serialize(new { guideUserId = guide.Id, guideName = guide.FullName }),
            Reason = reason,
            RequestedByUserId = _tenantContext.UserId!.Value,
            ApprovedByUserId = _tenantContext.UserId,
            ApprovedAtUtc = DateTime.UtcNow
        };
        await _context.ExceptionAuditLogs.AddAsync(exceptionLog);

        var caller = await ResolveCurrentUserAsync();
        var audit = new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            ActorEmail = caller?.Email ?? "hod@collabex.edu",
            Action = previousGuideId.HasValue ? "HOD_GUIDE_REASSIGNED" : "HOD_GUIDE_ALLOCATED",
            TargetTenantId = collegeId,
            TargetEntity = "ProjectTeam",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                teamId = team.Id,
                teamCode = team.TeamCode,
                previousGuideId,
                newGuideId = guide.Id,
                reason
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(audit);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            teamId = team.Id,
            teamCode = team.TeamCode,
            guideUserId = guide.Id,
            guideName = guide.FullName,
            previousGuideName,
            status = team.Status.ToString()
        });
    }

    [HttpGet("proposals")]
    public async Task<ActionResult<List<ProjectProposalDto>>> GetProposals()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();
        var proposals = await _context.ProjectTeams
            .Include(t => t.GuideUser)
            .Include(t => t.Members)
            .Where(t => t.CollegeId == collegeId && t.DepartmentId == deptId && t.Status == ProjectStatus.PendingHOD && !t.IsDeleted)
            .Select(t => new ProjectProposalDto
            {
                TeamId = t.Id,
                TeamCode = t.TeamCode,
                Title = t.Title,
                Abstract = t.Abstract,
                DomainTag = t.DomainTag,
                SdgCode = t.SdgCode,
                Status = t.Status,
                GuideUserId = t.GuideUserId,
                GuideName = t.GuideUser != null ? t.GuideUser.FullName : null,
                MemberCount = t.Members.Count(m => !m.IsDeleted),
                SimilarityScorePct = t.SimilarityScorePct,
                SimilarProjectCode = t.SimilarProjectCode
            })
            .ToListAsync();

        return Ok(proposals);
    }

    [HttpPost("proposals/{teamId}/approve")]
    [HttpPost("proposals/{teamId}/endorse")]
    public async Task<IActionResult> ApproveProposal(Guid teamId)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();
        var team = await _context.ProjectTeams.FirstOrDefaultAsync(t => t.Id == teamId && t.CollegeId == collegeId && t.DepartmentId == deptId && !t.IsDeleted);
        if (team == null) return NotFound(new { message = "Proposal not found in department." });

        if (team.Status != ProjectStatus.PendingHOD)
        {
            return BadRequest(new { message = $"Only proposals in PendingHOD status can be approved. Current status is {team.Status}." });
        }

        team.Status = ProjectStatus.ActiveBuild;
        team.IsRosterLocked = true;

        var caller = await ResolveCurrentUserAsync();
        var audit = new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            ActorEmail = caller?.Email ?? "hod@collabex.edu",
            Action = "HOD_PROPOSAL_APPROVED",
            TargetTenantId = collegeId,
            TargetEntity = "ProjectTeam",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                teamId = team.Id,
                teamCode = team.TeamCode,
                previousStatus = ProjectStatus.PendingHOD.ToString(),
                newStatus = ProjectStatus.ActiveBuild.ToString(),
                departmentId = deptId
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(audit);

        await _context.SaveChangesAsync();

        return Ok(new { success = true, teamId = team.Id, status = team.Status });
    }

    [HttpPost("proposals/{teamId}/reject")]
    [HttpPost("proposals/{teamId}/return")]
    public async Task<IActionResult> RejectProposal(Guid teamId, [FromBody] ReturnProposalRequest? request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();
        var team = await _context.ProjectTeams.FirstOrDefaultAsync(t => t.Id == teamId && t.CollegeId == collegeId && t.DepartmentId == deptId && !t.IsDeleted);
        if (team == null) return NotFound(new { message = "Proposal not found in department." });

        if (team.Status != ProjectStatus.PendingHOD)
        {
            return BadRequest(new { message = $"Only proposals in PendingHOD status can be returned. Current status is {team.Status}." });
        }

        var remarks = request?.Remarks ?? request?.Reason ?? "Returned for technical revision by HOD";
        team.Status = ProjectStatus.Draft;
        team.IsRosterLocked = false;

        var caller = await ResolveCurrentUserAsync();
        var audit = new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            ActorEmail = caller?.Email ?? "hod@collabex.edu",
            Action = "HOD_PROPOSAL_RETURNED",
            TargetTenantId = collegeId,
            TargetEntity = "ProjectTeam",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                teamId = team.Id,
                teamCode = team.TeamCode,
                previousStatus = ProjectStatus.PendingHOD.ToString(),
                newStatus = ProjectStatus.Draft.ToString(),
                remarks,
                departmentId = deptId
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(audit);

        await _context.SaveChangesAsync();

        return Ok(new { success = true, teamId = team.Id, status = team.Status, remarks });
    }

    [HttpPost("proposals/bulk-approve")]
    public async Task<ActionResult<BulkApproveProposalsResponse>> BulkApproveProposals([FromBody] BulkApproveProposalsRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();

        if (request == null || request.TeamIds == null || !request.TeamIds.Any())
        {
            return BadRequest(new { message = "At least one proposal team ID must be provided." });
        }

        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? transaction = null;
        if (_context.Database.IsRelational() && !string.Equals(_context.Database.ProviderName, "Microsoft.EntityFrameworkCore.InMemory", StringComparison.OrdinalIgnoreCase))
        {
            transaction = await _context.Database.BeginTransactionAsync();
        }

        var teams = await _context.ProjectTeams
            .Where(t => request.TeamIds.Contains(t.Id) &&
                        t.CollegeId == collegeId &&
                        t.DepartmentId == deptId &&
                        t.Status == ProjectStatus.PendingHOD &&
                        !t.IsDeleted)
            .ToListAsync();

        if (!teams.Any())
        {
            return BadRequest(new { message = "No matching proposals in PendingHOD status found for approval." });
        }

        foreach (var team in teams)
        {
            team.Status = ProjectStatus.ActiveBuild;
            team.IsRosterLocked = true;
        }

        var caller = await ResolveCurrentUserAsync();
        var audit = new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            ActorEmail = caller?.Email ?? "hod@collabex.edu",
            Action = "HOD_BULK_PROPOSAL_APPROVAL",
            TargetTenantId = collegeId,
            TargetEntity = "ProjectTeam",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                departmentId = deptId,
                approvedCount = teams.Count,
                approvedTeamIds = teams.Select(t => t.Id).ToList()
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(audit);

        await _context.SaveChangesAsync();

        if (transaction != null)
        {
            await transaction.CommitAsync();
            await transaction.DisposeAsync();
        }

        return Ok(new BulkApproveProposalsResponse
        {
            Success = true,
            ApprovedCount = teams.Count,
            TeamIds = teams.Select(t => t.Id).ToList(),
            Message = $"Successfully approved and roster-locked {teams.Count} project proposal(s)."
        });
    }

    [HttpGet("faculty")]
    public async Task<ActionResult<List<FacultyWorkloadDto>>> GetFacultyWorkload()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();
        var facultyList = await _context.Users
            .Where(u => u.CollegeId == collegeId && u.DepartmentId == deptId && (u.Role == UserRole.Faculty || u.Role == UserRole.HOD) && !u.IsDeleted)
            .OrderBy(u => u.FullName)
            .Select(u => new FacultyWorkloadDto
            {
                FacultyId = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                EmployeeCode = u.EnrollmentOrEmployeeCode,
                IsProjectCoordinator = u.IsProjectCoordinator,
                CurrentMentoredTeams = u.GuidedTeams.Count(t => !t.IsDeleted && t.Status != ProjectStatus.Archived),
                MaxMentorTeams = u.MaxMentorTeams,
                SkillsCsv = u.SkillsCsv
            })
            .ToListAsync();

        return Ok(facultyList);
    }

    [HttpPost("faculty")]
    [Authorize(Policy = ProjectHubPolicies.CollegeAdminOnly)]
    public Task<IActionResult> CreateFaculty([FromBody] CreateDepartmentFacultyRequest request)
    {
        return Task.FromResult<IActionResult>(StatusCode(StatusCodes.Status403Forbidden, new
        {
            message = "Role boundary violation: Institutional faculty onboarding is strictly restricted to College Admin in Institutional Staff Directory."
        }));
    }

    [HttpPut("faculty/{facultyId}/coordinator")]
    public async Task<IActionResult> ToggleCoordinator(Guid facultyId, [FromBody] ToggleCoordinatorRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();
        var faculty = await _context.Users.FirstOrDefaultAsync(u =>
            u.Id == facultyId &&
            u.CollegeId == collegeId &&
            u.DepartmentId == deptId &&
            !u.IsDeleted);
        if (faculty == null) return NotFound(new { message = "Faculty not found in department." });

        if (faculty.Role != UserRole.Faculty && faculty.Role != UserRole.HOD)
        {
            return BadRequest(new { message = "Only eligible faculty members in this department can be appointed as Project Coordinator." });
        }

        if (!faculty.IsActive)
        {
            return BadRequest(new { message = "Inactive faculty accounts cannot be appointed as Project Coordinator." });
        }

        faculty.IsProjectCoordinator = request.IsProjectCoordinator;
        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            Action = "TOGGLE_PROJECT_COORDINATOR",
            TargetTenantId = collegeId,
            TargetEntity = "UserAccount",
            MetadataJson = $"{{\"FacultyId\":\"{faculty.Id}\",\"DepartmentId\":\"{deptId}\",\"IsProjectCoordinator\":{(request.IsProjectCoordinator ? "true" : "false")}}}",
            OccurredAtUtc = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPut("faculty/{facultyId}/mentor-cap")]
    public async Task<IActionResult> UpdateMentorCap(Guid facultyId, [FromBody] UpdateMentorCapRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();
        var faculty = await _context.Users.FirstOrDefaultAsync(u => u.Id == facultyId && u.CollegeId == collegeId && u.DepartmentId == deptId && !u.IsDeleted);
        if (faculty == null) return NotFound(new { message = "Faculty not found in department." });

        faculty.MaxMentorTeams = Math.Max(1, request.MaxMentorTeams);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("exceptions")]
    public async Task<ActionResult<List<ExceptionAuditLogDto>>> GetExceptions()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();
        var exceptions = await _context.ExceptionAuditLogs
            .Include(e => e.ProjectTeam)
            .Include(e => e.RequestedByUser)
            .Where(e => e.CollegeId == collegeId && e.DepartmentId == deptId && !e.IsDeleted)
            .OrderByDescending(e => e.CreatedAtUtc)
            .Select(e => new ExceptionAuditLogDto
            {
                Id = e.Id,
                ProjectTeamId = e.ProjectTeamId ?? Guid.Empty,
                TeamCode = e.ProjectTeam != null ? e.ProjectTeam.TeamCode : string.Empty,
                ActionType = e.ActionType,
                Reason = e.Reason,
                PreviousValueJson = e.PreviousValueJson,
                NewValueJson = e.NewValueJson,
                RequestedByUserId = e.RequestedByUserId,
                RequestedByName = e.RequestedByUser != null ? e.RequestedByUser.FullName : null,
                CreatedAtUtc = e.CreatedAtUtc,
                IsApproved = e.ApprovedByUserId.HasValue,
                ApprovedAtUtc = e.ApprovedAtUtc
            })
            .ToListAsync();

        return Ok(exceptions);
    }

    [HttpPost("exceptions/{exceptionId}/approve")]
    public async Task<IActionResult> ApproveException(Guid exceptionId)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();
        var record = await _context.ExceptionAuditLogs.FirstOrDefaultAsync(e => e.Id == exceptionId && e.CollegeId == collegeId && e.DepartmentId == deptId && !e.IsDeleted);
        if (record == null) return NotFound(new { message = "Exception audit record not found in department." });

        record.ApprovedByUserId = _tenantContext.UserId;
        record.ApprovedAtUtc = DateTime.UtcNow;

        if (record.ActionType == ExceptionActionType.ReassignGuide && record.ProjectTeamId.HasValue)
        {
            var team = await _context.ProjectTeams.FirstOrDefaultAsync(t => t.Id == record.ProjectTeamId.Value && t.CollegeId == collegeId && !t.IsDeleted);
            if (team != null)
            {
                Guid? newGuideId = record.TargetUserId;
                if (!newGuideId.HasValue && !string.IsNullOrWhiteSpace(record.NewValueJson))
                {
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(record.NewValueJson);
                        if (doc.RootElement.TryGetProperty("guideUserId", out var prop) && prop.TryGetGuid(out var gId))
                        {
                            newGuideId = gId;
                        }
                    }
                    catch { }
                }

                if (newGuideId.HasValue)
                {
                    var guide = await _context.Users.FirstOrDefaultAsync(u => u.Id == newGuideId.Value && u.CollegeId == collegeId && !u.IsDeleted);
                    if (guide != null)
                    {
                        team.GuideUserId = guide.Id;
                    }
                }
            }
        }
        else if (record.ActionType == ExceptionActionType.AmendLockedRoster && record.ProjectTeamId.HasValue)
        {
            var team = await _context.ProjectTeams.FirstOrDefaultAsync(t => t.Id == record.ProjectTeamId.Value && t.CollegeId == collegeId && !t.IsDeleted);
            if (team != null)
            {
                team.IsRosterLocked = false;
            }
        }

        var caller = await ResolveCurrentUserAsync();
        var audit = new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            ActorEmail = caller?.Email ?? "hod@collabex.edu",
            Action = "HOD_EXCEPTION_APPROVED",
            TargetTenantId = collegeId,
            TargetEntity = "ExceptionAuditLog",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                exceptionId = record.Id,
                actionType = record.ActionType.ToString(),
                teamId = record.ProjectTeamId,
                approvedAtUtc = record.ApprovedAtUtc
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(audit);

        await _context.SaveChangesAsync();
        return Ok(new { success = true, exceptionId = record.Id, approvedAtUtc = record.ApprovedAtUtc });
    }

    [HttpPost("exceptions/{exceptionId}/reject")]
    public async Task<IActionResult> RejectException(Guid exceptionId, [FromBody] RejectExceptionRequest? request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();
        var record = await _context.ExceptionAuditLogs.FirstOrDefaultAsync(e => e.Id == exceptionId && e.CollegeId == collegeId && e.DepartmentId == deptId && !e.IsDeleted);
        if (record == null) return NotFound(new { message = "Exception audit record not found in department." });

        var remarks = request?.Remarks ?? request?.Reason ?? "Rejected by HOD";
        record.ApprovedByUserId = null;
        record.ApprovedAtUtc = null;
        record.Reason = string.IsNullOrWhiteSpace(record.Reason) ? $"[REJECTED] {remarks}" : $"{record.Reason} | [REJECTED: {remarks}]";

        var caller = await ResolveCurrentUserAsync();
        var audit = new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            ActorEmail = caller?.Email ?? "hod@collabex.edu",
            Action = "HOD_EXCEPTION_REJECTED",
            TargetTenantId = collegeId,
            TargetEntity = "ExceptionAuditLog",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                exceptionId = record.Id,
                actionType = record.ActionType.ToString(),
                teamId = record.ProjectTeamId,
                remarks
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(audit);

        await _context.SaveChangesAsync();
        return Ok(new { success = true, exceptionId = record.Id, isApproved = false, remarks });
    }

    [HttpGet("grade-unlocks")]
    public async Task<ActionResult<List<GradeUnlockRequestDto>>> GetGradeUnlockRequests()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();

        var requests = await _context.ExceptionAuditLogs
            .Include(e => e.ProjectTeam)
            .Include(e => e.RequestedByUser)
            .Where(e => e.CollegeId == collegeId &&
                        e.DepartmentId == deptId &&
                        e.ActionType == ExceptionActionType.IndividualReVivaUnlock &&
                        !e.ApprovedByUserId.HasValue &&
                        !e.IsDeleted)
            .OrderByDescending(e => e.CreatedAtUtc)
            .ToListAsync();

        var dtoList = new List<GradeUnlockRequestDto>();
        foreach (var r in requests)
        {
            Guid evalId = Guid.Empty;
            string checkpoint = "FinalViva";

            if (!string.IsNullOrWhiteSpace(r.PreviousValueJson))
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(r.PreviousValueJson);
                    if (doc.RootElement.TryGetProperty("evaluationId", out var evalProp))
                    {
                        Guid.TryParse(evalProp.GetString(), out evalId);
                    }
                    if (doc.RootElement.TryGetProperty("checkpointType", out var cpProp))
                    {
                        checkpoint = cpProp.GetString() ?? "FinalViva";
                    }
                }
                catch { }
            }

            if (evalId == Guid.Empty && r.ProjectTeamId.HasValue)
            {
                var latestLockedEval = await _context.VivaEvaluations
                    .Where(v => v.ProjectTeamId == r.ProjectTeamId.Value && v.CollegeId == collegeId && v.IsLocked && !v.IsDeleted)
                    .OrderByDescending(v => v.CreatedAtUtc)
                    .FirstOrDefaultAsync();
                if (latestLockedEval != null)
                {
                    evalId = latestLockedEval.Id;
                    checkpoint = latestLockedEval.CheckpointType.ToString();
                }
            }

            dtoList.Add(new GradeUnlockRequestDto
            {
                Id = r.Id,
                EvaluationId = evalId,
                TeamId = r.ProjectTeamId ?? Guid.Empty,
                TeamCode = r.ProjectTeam?.TeamCode ?? string.Empty,
                TeamTitle = r.ProjectTeam?.Title ?? string.Empty,
                RequestedByFacultyName = r.RequestedByUser?.FullName ?? "Faculty",
                Reason = r.Reason,
                CheckpointType = checkpoint,
                RequestedAtUtc = r.CreatedAtUtc
            });
        }

        return Ok(dtoList);
    }

    [HttpPost("grade-unlocks/{id}/approve")]
    public async Task<IActionResult> ApproveGradeUnlock(Guid id, [FromBody] ApproveGradeUnlockRequest? request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();

        var exceptionLog = await _context.ExceptionAuditLogs
            .Include(e => e.ProjectTeam)
            .FirstOrDefaultAsync(e => e.Id == id && e.CollegeId == collegeId && e.DepartmentId == deptId && !e.IsDeleted);

        if (exceptionLog == null)
        {
            return NotFound(new { message = "Grade unlock request not found in department." });
        }

        Guid evalId = Guid.Empty;
        if (!string.IsNullOrWhiteSpace(exceptionLog.PreviousValueJson))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(exceptionLog.PreviousValueJson);
                if (doc.RootElement.TryGetProperty("evaluationId", out var evalProp))
                {
                    Guid.TryParse(evalProp.GetString(), out evalId);
                }
            }
            catch { }
        }

        VivaEvaluation? evaluation = null;
        if (evalId != Guid.Empty)
        {
            evaluation = await _context.VivaEvaluations.FirstOrDefaultAsync(v => v.Id == evalId && v.CollegeId == collegeId && !v.IsDeleted);
        }
        if (evaluation == null && exceptionLog.ProjectTeamId.HasValue)
        {
            evaluation = await _context.VivaEvaluations
                .Where(v => v.ProjectTeamId == exceptionLog.ProjectTeamId.Value && v.CollegeId == collegeId && v.IsLocked && !v.IsDeleted)
                .OrderByDescending(v => v.CreatedAtUtc)
                .FirstOrDefaultAsync();
        }

        if (evaluation != null)
        {
            evaluation.IsLocked = false;
            evaluation.LockedAtUtc = null;
        }

        exceptionLog.ApprovedByUserId = _tenantContext.UserId;
        exceptionLog.ApprovedAtUtc = DateTime.UtcNow;
        exceptionLog.NewValueJson = System.Text.Json.JsonSerializer.Serialize(new
        {
            isLocked = false,
            evaluationId = evaluation?.Id,
            approvedBy = _tenantContext.UserId,
            approvedAt = exceptionLog.ApprovedAtUtc,
            remarks = request?.Remarks ?? "Grade modification unlocked by HOD"
        });

        var caller = await ResolveCurrentUserAsync();
        var auditEntry = new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            ActorEmail = caller?.Email ?? "hod@collabex.edu",
            Action = "HOD_GRADE_UNLOCK_APPROVED",
            TargetTenantId = collegeId,
            TargetEntity = "VivaEvaluation",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                departmentId = deptId,
                exceptionLogId = exceptionLog.Id,
                teamId = exceptionLog.ProjectTeamId,
                evaluationId = evaluation?.Id,
                remarks = request?.Remarks
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditEntry);

        await _context.SaveChangesAsync();
        return Ok(new { success = true, id = exceptionLog.Id, evaluationId = evaluation?.Id, isLocked = false, approvedAtUtc = exceptionLog.ApprovedAtUtc });
    }

    [HttpPost("grade-unlocks/{id}/reject")]
    public async Task<IActionResult> RejectGradeUnlock(Guid id, [FromBody] RejectGradeUnlockRequest? request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();

        var exceptionLog = await _context.ExceptionAuditLogs
            .FirstOrDefaultAsync(e => e.Id == id && e.CollegeId == collegeId && e.DepartmentId == deptId && !e.IsDeleted);

        if (exceptionLog == null)
        {
            return NotFound(new { message = "Grade unlock request not found in department." });
        }

        var remarks = request?.Remarks ?? request?.Reason ?? "Rejected by HOD";
        exceptionLog.ApprovedByUserId = null;
        exceptionLog.ApprovedAtUtc = null;
        exceptionLog.Reason = string.IsNullOrWhiteSpace(exceptionLog.Reason)
            ? $"[REJECTED] {remarks}"
            : $"{exceptionLog.Reason} | [REJECTED: {remarks}]";

        var caller = await ResolveCurrentUserAsync();
        var auditEntry = new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            ActorEmail = caller?.Email ?? "hod@collabex.edu",
            Action = "HOD_GRADE_UNLOCK_REJECTED",
            TargetTenantId = collegeId,
            TargetEntity = "VivaEvaluation",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                departmentId = deptId,
                exceptionLogId = exceptionLog.Id,
                teamId = exceptionLog.ProjectTeamId,
                remarks
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditEntry);

        await _context.SaveChangesAsync();
        return Ok(new { success = true, id = exceptionLog.Id, isApproved = false, remarks });
    }

    [HttpGet("results")]
    public async Task<ActionResult<List<DepartmentStudentResultDto>>> GetDepartmentResults()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();

        var teams = await _context.ProjectTeams
            .Include(t => t.Members)
                .ThenInclude(m => m.User)
            .Include(t => t.Evaluations)
                .ThenInclude(e => e.IndividualScores)
            .Where(t => t.CollegeId == collegeId && t.DepartmentId == deptId && !t.IsDeleted)
            .OrderBy(t => t.TeamCode)
            .ToListAsync();

        var results = new List<DepartmentStudentResultDto>();

        foreach (var team in teams)
        {
            var guideEval = team.Evaluations.FirstOrDefault(e => e.CheckpointType == CheckpointType.GuideContinuous && !e.IsDeleted);
            var midTermEval = team.Evaluations.FirstOrDefault(e => e.CheckpointType == CheckpointType.MidTermReview && !e.IsDeleted);
            var finalVivaEval = team.Evaluations.FirstOrDefault(e => e.CheckpointType == CheckpointType.FinalViva && !e.IsDeleted);

            foreach (var member in team.Members.Where(m => !m.IsDeleted && m.User != null))
            {
                var student = member.User!;

                decimal guideScore = 0m;
                decimal midTermScore = 0m;
                decimal externalVivaScore = 0m;

                if (guideEval != null)
                {
                    var ind = guideEval.IndividualScores.FirstOrDefault(s => s.StudentUserId == student.Id);
                    guideScore = ind != null && ind.FinalComputedStudentMark > 0
                        ? Math.Min(30m, Math.Round(ind.FinalComputedStudentMark * 0.60m, 1))
                        : Math.Min(30m, Math.Round(guideEval.SharedTotalScore * 0.60m, 1));
                }

                if (midTermEval != null)
                {
                    var ind = midTermEval.IndividualScores.FirstOrDefault(s => s.StudentUserId == student.Id);
                    midTermScore = ind != null && ind.FinalComputedStudentMark > 0
                        ? Math.Min(30m, Math.Round(ind.FinalComputedStudentMark * 0.60m, 1))
                        : Math.Min(30m, Math.Round(midTermEval.SharedTotalScore * 0.60m, 1));
                }

                if (finalVivaEval != null)
                {
                    var ind = finalVivaEval.IndividualScores.FirstOrDefault(s => s.StudentUserId == student.Id);
                    externalVivaScore = ind != null && ind.FinalComputedStudentMark > 0
                        ? Math.Min(40m, Math.Round(ind.FinalComputedStudentMark * 0.80m, 1))
                        : Math.Min(40m, Math.Round(finalVivaEval.SharedTotalScore * 0.80m, 1));
                }

                if (guideScore == 0m && midTermScore == 0m && externalVivaScore == 0m && team.Evaluations.Any())
                {
                    var anyEval = team.Evaluations.First();
                    var ind = anyEval.IndividualScores.FirstOrDefault(s => s.StudentUserId == student.Id);
                    var baseScore = ind != null && ind.FinalComputedStudentMark > 0 ? ind.FinalComputedStudentMark : anyEval.SharedTotalScore;
                    var normScore = anyEval.SharedTotalScore <= 50 ? baseScore * 2m : baseScore;
                    guideScore = Math.Round(normScore * 0.30m, 1);
                    midTermScore = Math.Round(normScore * 0.30m, 1);
                    externalVivaScore = Math.Round(normScore * 0.40m, 1);
                }

                decimal totalMarks = Math.Round(guideScore + midTermScore + externalVivaScore, 1);

                string letterGrade = totalMarks >= 85 ? "A+"
                    : totalMarks >= 75 ? "A"
                    : totalMarks >= 65 ? "B"
                    : totalMarks >= 50 ? "C"
                    : "F";

                results.Add(new DepartmentStudentResultDto
                {
                    Usn = string.IsNullOrWhiteSpace(student.EnrollmentOrEmployeeCode) ? "N/A" : student.EnrollmentOrEmployeeCode,
                    StudentName = student.FullName,
                    TeamCode = team.TeamCode,
                    ProjectTitle = team.Title,
                    GuideScore = guideScore,
                    MidTermScore = midTermScore,
                    ExternalVivaScore = externalVivaScore,
                    TotalMarks = totalMarks,
                    LetterGrade = letterGrade
                });
            }
        }

        return Ok(results.OrderBy(r => r.Usn).ToList());
    }

    [HttpGet("reports/summary")]
    public async Task<ActionResult<HodReportsSummaryDto>> GetReportsSummary()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();
        var dept = await _context.Departments.FirstOrDefaultAsync(d => d.Id == deptId && d.CollegeId == collegeId && !d.IsDeleted);
        if (dept == null) return NotFound(new { message = "Department not found." });

        var teams = await _context.ProjectTeams
            .Include(t => t.AcademicTrack)
            .Where(t => t.CollegeId == collegeId && t.DepartmentId == deptId && !t.IsDeleted)
            .ToListAsync();

        var studentsCount = await _context.Users
            .CountAsync(u => u.CollegeId == collegeId && u.DepartmentId == deptId && u.Role == UserRole.Student && !u.IsDeleted);

        var faculty = await _context.Users
            .Include(u => u.GuidedTeams)
            .Where(u => u.CollegeId == collegeId && u.DepartmentId == deptId && (u.Role == UserRole.Faculty || u.Role == UserRole.HOD) && !u.IsDeleted)
            .ToListAsync();

        var trackStats = teams
            .GroupBy(t => new { Id = t.AcademicTrackId, Name = t.AcademicTrack?.Name ?? "General Track" })
            .Select(g => new TrackReportStatDto
            {
                TrackId = g.Key.Id,
                TrackName = g.Key.Name,
                ProjectCount = g.Count(),
                StudentCount = g.Sum(t => t.Members?.Count ?? 0),
                CompletedCount = g.Count(t => t.Status == ProjectStatus.Completed)
            })
            .ToList();

        var domainStats = teams
            .Where(t => !string.IsNullOrWhiteSpace(t.DomainTag))
            .GroupBy(t => t.DomainTag)
            .Select(g => new DomainDistributionDto
            {
                Domain = g.Key,
                Count = g.Count()
            })
            .OrderByDescending(d => d.Count)
            .ToList();

        decimal avgLoad = faculty.Any()
            ? Math.Round((decimal)teams.Count(t => t.GuideUserId.HasValue) / faculty.Count, 1)
            : 0m;

        return Ok(new HodReportsSummaryDto
        {
            DepartmentId = dept.Id,
            DepartmentName = dept.Name,
            DepartmentCode = dept.Code,
            TotalProjects = teams.Count,
            CompletedProjects = teams.Count(t => t.Status == ProjectStatus.Completed),
            ActiveProjects = teams.Count(t => t.Status == ProjectStatus.ActiveBuild),
            AtRiskProjects = teams.Count(t => t.Status == ProjectStatus.AtRisk || t.MissedLogStreak >= 2),
            ProjectsWithoutGuide = teams.Count(t => t.GuideUserId == null),
            TotalStudents = studentsCount,
            TotalFaculty = faculty.Count,
            AverageFacultyLoad = avgLoad,
            TrackStats = trackStats,
            DomainDistribution = domainStats
        });
    }

    [HttpGet("students")]
    public async Task<ActionResult<List<HodDepartmentStudentDto>>> GetDepartmentStudents(
        [FromQuery] string? search,
        [FromQuery] int? semesterNumber,
        [FromQuery] string? status)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();

        var studentsQuery = _context.Users
            .AsNoTracking()
            .Where(u => u.CollegeId == collegeId &&
                        u.DepartmentId == deptId &&
                        u.Role == UserRole.Student &&
                        !u.IsDeleted);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            studentsQuery = studentsQuery.Where(u =>
                u.FullName.ToLower().Contains(term) ||
                u.Email.ToLower().Contains(term) ||
                (u.EnrollmentOrEmployeeCode != null && u.EnrollmentOrEmployeeCode.ToLower().Contains(term)));
        }

        var students = await studentsQuery
            .OrderBy(u => u.FullName)
            .ToListAsync();

        var studentIds = students.Select(s => s.Id).ToList();

        var enrollments = await _context.StudentAcademicEnrollments
            .AsNoTracking()
            .Include(e => e.CourseProgram)
            .Include(e => e.CurrentSemesterTerm)
            .Where(e => e.CollegeId == collegeId && studentIds.Contains(e.StudentUserId) && !e.IsDeleted)
            .ToListAsync();

        var memberships = await _context.TeamMembers
            .AsNoTracking()
            .Include(m => m.ProjectTeam)
            .Where(m => m.CollegeId == collegeId && studentIds.Contains(m.UserId) && !m.IsDeleted && m.ProjectTeam != null && !m.ProjectTeam.IsDeleted)
            .ToListAsync();

        var enrollmentByStudent = enrollments
            .GroupBy(e => e.StudentUserId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderBy(e => e.AcademicStatus == AcademicStatus.Active ? 0 : 1)
                      .ThenByDescending(e => e.UpdatedAtUtc)
                      .First());

        var teamByStudent = memberships
            .GroupBy(m => m.UserId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(m => m.CreatedAtUtc).First().ProjectTeam!);

        var result = students.Select(s =>
        {
            enrollmentByStudent.TryGetValue(s.Id, out var enr);
            teamByStudent.TryGetValue(s.Id, out var team);
            return new HodDepartmentStudentDto
            {
                Id = s.Id,
                FullName = s.FullName,
                Email = s.Email,
                StudentNumber = s.EnrollmentOrEmployeeCode ?? string.Empty,
                IsActive = s.IsActive,
                IsActivated = s.IsActivated,
                ProgramName = enr?.CourseProgram?.Name,
                CurrentSemesterNumber = enr?.CurrentSemesterTerm?.SemesterNumber,
                CurrentSemesterName = enr?.CurrentSemesterTerm?.SemesterName,
                AcademicStatus = enr?.AcademicStatus.ToString() ?? "Not Enrolled",
                AdmissionBatch = enr?.AdmissionBatch,
                ActiveTeamCode = team?.TeamCode,
                ActiveTeamTitle = team?.Title
            };
        });

        if (semesterNumber.HasValue)
        {
            result = result.Where(r => r.CurrentSemesterNumber == semesterNumber.Value);
        }

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "ALL", StringComparison.OrdinalIgnoreCase))
        {
            result = result.Where(r => string.Equals(r.AcademicStatus, status, StringComparison.OrdinalIgnoreCase));
        }

        return Ok(result.ToList());
    }

    [HttpPut("students/{studentId:guid}/enrollment")]
    public async Task<ActionResult<HodDepartmentStudentDto>> UpdateStudentEnrollment(
        Guid studentId,
        [FromBody] UpdateStudentSemesterRequest request)
    {
        if (request.SemesterNumber < 1 || request.SemesterNumber > 12)
        {
            return BadRequest(new { message = "SemesterNumber must be between 1 and 12." });
        }

        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();

        var student = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == studentId &&
                                      u.CollegeId == collegeId &&
                                      u.DepartmentId == deptId &&
                                      u.Role == UserRole.Student &&
                                      !u.IsDeleted);

        if (student == null)
        {
            return NotFound(new { message = "Student not found in your department." });
        }

        var term = await ResolveOrCreateSemesterTermAsync(collegeId, deptId, request.SemesterNumber);
        var programId = await ResolveDepartmentCourseProgramIdAsync(collegeId, deptId);
        if (programId == Guid.Empty)
        {
            return BadRequest(new { message = "No Course Program is configured for this college/department." });
        }

        var enrollment = await _context.StudentAcademicEnrollments
            .FirstOrDefaultAsync(e => e.CollegeId == collegeId && e.StudentUserId == studentId && !e.IsDeleted);

        if (enrollment == null)
        {
            var currentYear = DateTime.UtcNow.Year;
            enrollment = new StudentAcademicEnrollment
            {
                CollegeId = collegeId,
                StudentUserId = studentId,
                CourseProgramId = programId,
                DepartmentId = deptId,
                CurrentSemesterTermId = term.Id,
                AdmissionBatch = string.IsNullOrWhiteSpace(request.AdmissionBatch) ? $"{currentYear}-{currentYear + 4}" : request.AdmissionBatch.Trim(),
                AcademicStatus = request.AcademicStatus
            };
            await _context.StudentAcademicEnrollments.AddAsync(enrollment);
        }
        else
        {
            enrollment.DepartmentId = deptId;
            enrollment.CourseProgramId = programId;
            enrollment.CurrentSemesterTermId = term.Id;
            enrollment.AcademicStatus = request.AcademicStatus;
            if (!string.IsNullOrWhiteSpace(request.AdmissionBatch))
            {
                enrollment.AdmissionBatch = request.AdmissionBatch.Trim();
            }
        }

        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            ActorEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? "hod",
            Action = "HOD_UPDATE_STUDENT_ENROLLMENT",
            TargetEntity = $"Student:{student.EnrollmentOrEmployeeCode ?? student.Email}",
            TargetTenantId = collegeId,
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                studentId = student.Id,
                departmentId = deptId,
                semesterNumber = request.SemesterNumber,
                academicStatus = request.AcademicStatus.ToString()
            }),
            OccurredAtUtc = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        var program = await _context.CoursePrograms.AsNoTracking().FirstOrDefaultAsync(p => p.Id == programId);
        return Ok(new HodDepartmentStudentDto
        {
            Id = student.Id,
            FullName = student.FullName,
            Email = student.Email,
            StudentNumber = student.EnrollmentOrEmployeeCode ?? string.Empty,
            IsActive = student.IsActive,
            IsActivated = student.IsActivated,
            ProgramName = program?.Name,
            CurrentSemesterNumber = term.SemesterNumber,
            CurrentSemesterName = term.SemesterName,
            AcademicStatus = enrollment.AcademicStatus.ToString(),
            AdmissionBatch = enrollment.AdmissionBatch
        });
    }

    [HttpPost("students/bulk-enroll")]
    public async Task<IActionResult> BulkEnrollStudents([FromBody] BulkEnrollStudentsRequest request)
    {
        if (request.StudentIds == null || request.StudentIds.Count == 0)
        {
            return BadRequest(new { message = "Select at least one student to enroll." });
        }
        if (request.SemesterNumber < 1 || request.SemesterNumber > 12)
        {
            return BadRequest(new { message = "SemesterNumber must be between 1 and 12." });
        }

        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();

        var students = await _context.Users
            .Where(u => u.CollegeId == collegeId &&
                        u.DepartmentId == deptId &&
                        u.Role == UserRole.Student &&
                        request.StudentIds.Contains(u.Id) &&
                        !u.IsDeleted)
            .ToListAsync();

        if (students.Count == 0)
        {
            return NotFound(new { message = "No matching students found in your department." });
        }

        var term = await ResolveOrCreateSemesterTermAsync(collegeId, deptId, request.SemesterNumber);
        var programId = await ResolveDepartmentCourseProgramIdAsync(collegeId, deptId);
        if (programId == Guid.Empty)
        {
            return BadRequest(new { message = "No Course Program is configured for this college/department." });
        }

        var foundIds = students.Select(s => s.Id).ToList();
        var existingEnrollments = await _context.StudentAcademicEnrollments
            .Where(e => e.CollegeId == collegeId && foundIds.Contains(e.StudentUserId) && !e.IsDeleted)
            .ToDictionaryAsync(e => e.StudentUserId);

        var currentYear = DateTime.UtcNow.Year;
        foreach (var student in students)
        {
            if (existingEnrollments.TryGetValue(student.Id, out var existing))
            {
                existing.DepartmentId = deptId;
                existing.CourseProgramId = programId;
                existing.CurrentSemesterTermId = term.Id;
                existing.AcademicStatus = request.AcademicStatus;
            }
            else
            {
                await _context.StudentAcademicEnrollments.AddAsync(new StudentAcademicEnrollment
                {
                    CollegeId = collegeId,
                    StudentUserId = student.Id,
                    CourseProgramId = programId,
                    DepartmentId = deptId,
                    CurrentSemesterTermId = term.Id,
                    AdmissionBatch = $"{currentYear}-{currentYear + 4}",
                    AcademicStatus = request.AcademicStatus
                });
            }
        }

        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            ActorEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? "hod",
            Action = "HOD_BULK_ENROLL_STUDENTS",
            TargetEntity = $"Department:{deptId}",
            TargetTenantId = collegeId,
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                count = students.Count,
                semesterNumber = request.SemesterNumber,
                academicStatus = request.AcademicStatus.ToString()
            }),
            OccurredAtUtc = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return Ok(new { updatedCount = students.Count, semesterNumber = term.SemesterNumber, semesterName = term.SemesterName });
    }

    private async Task<SemesterTerm> ResolveOrCreateSemesterTermAsync(Guid collegeId, Guid deptId, int semesterNumber)
    {
        var activeSession = await _context.AcademicSessions
            .Where(s => s.CollegeId == collegeId && !s.IsDeleted && s.IsActive)
            .OrderByDescending(s => s.StartDate)
            .FirstOrDefaultAsync();

        var term = await _context.SemesterTerms.FirstOrDefaultAsync(t =>
            t.CollegeId == collegeId &&
            t.DepartmentId == deptId &&
            (activeSession == null || t.AcademicSessionId == activeSession.Id) &&
            t.SemesterNumber == semesterNumber &&
            !t.IsDeleted);

        if (term != null) return term;

        term = new SemesterTerm
        {
            CollegeId = collegeId,
            DepartmentId = deptId,
            AcademicSessionId = activeSession?.Id,
            SemesterNumber = semesterNumber,
            SemesterName = $"Semester {semesterNumber}",
            Parity = (semesterNumber % 2 == 1) ? SemesterParity.Odd : SemesterParity.Even,
            IsActive = true
        };
        await _context.SemesterTerms.AddAsync(term);
        await _context.SaveChangesAsync();
        return term;
    }

    private async Task<Guid> ResolveDepartmentCourseProgramIdAsync(Guid collegeId, Guid deptId)
    {
        var dept = await _context.Departments.AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == deptId && d.CollegeId == collegeId && !d.IsDeleted);
        if (dept?.CourseProgramId.HasValue == true)
        {
            return dept.CourseProgramId.Value;
        }
        return await _context.CoursePrograms.AsNoTracking()
            .Where(p => p.CollegeId == collegeId && p.IsActive && !p.IsDeleted)
            .OrderBy(p => p.Code == "BTECH" ? 0 : 1)
            .Select(p => p.Id)
            .FirstOrDefaultAsync();
    }
}
