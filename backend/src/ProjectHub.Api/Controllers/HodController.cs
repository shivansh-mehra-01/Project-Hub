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

        // Dynamically compute NBA Attainment from actual department evaluations and exit surveys
        var deptEvals = await _context.VivaEvaluations
            .Include(v => v.IndividualScores)
            .Where(v => v.CollegeId == collegeId && v.ProjectTeam != null && v.ProjectTeam.DepartmentId == deptId && !v.IsDeleted)
            .ToListAsync();

        var exitSurveys = await _context.CourseExitSurveys
            .Where(s => s.CollegeId == collegeId && s.ProjectTeam != null && s.ProjectTeam.DepartmentId == deptId && !s.IsDeleted)
            .ToListAsync();

        decimal? directPct = null;
        if (deptEvals.Any())
        {
            var allScores = deptEvals.SelectMany(e => e.IndividualScores).ToList();
            if (allScores.Any())
            {
                var met = allScores.Count(s => s.FinalComputedStudentMark >= 35m);
                directPct = Math.Round((decimal)met / allScores.Count * 100m, 1);
            }
            else
            {
                var met = deptEvals.Count(e => e.SharedTotalScore >= 35m);
                directPct = Math.Round((decimal)met / deptEvals.Count * 100m, 1);
            }
        }

        decimal? indirectPct = null;
        if (exitSurveys.Any())
        {
            var ratings = new List<int>();
            foreach (var survey in exitSurveys)
            {
                if (!string.IsNullOrWhiteSpace(survey.PoRatingsJson))
                {
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(survey.PoRatingsJson);
                        foreach (var prop in doc.RootElement.EnumerateObject())
                        {
                            if (prop.Value.TryGetInt32(out var r))
                            {
                                ratings.Add(r);
                            }
                        }
                    }
                    catch { }
                }
            }
            if (ratings.Any())
            {
                indirectPct = Math.Round((decimal)ratings.Average() / 3m * 100m, 1);
            }
        }

        decimal? blendedPct = (directPct.HasValue && indirectPct.HasValue)
            ? Math.Round((directPct.Value * 0.8m) + (indirectPct.Value * 0.2m), 2)
            : directPct ?? indirectPct;

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
            NbaDirectAttainmentPct = directPct,
            NbaIndirectAttainmentPct = indirectPct,
            NbaBlendedCriterion3Pct = blendedPct,
            IsSarAttested = dept.IsSarAttested,
            SarAttestedAtUtc = dept.SarAttestedAtUtc
        });
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
            .Where(t => t.CollegeId == collegeId && (t.DepartmentId == deptId || t.DepartmentId == null) && !t.IsDeleted)
            .OrderByDescending(t => t.AcademicYear)
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
            AllowCrossBranchTeams = request.AllowCrossBranchTeams,
            AllowInterdisciplinaryTeams = request.AllowInterdisciplinaryTeams,
            Name = request.Name.Trim(),
            AcademicYear = request.AcademicYear.Trim(),
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

        return Ok(new CollegeTrackDto
        {
            Id = track.Id,
            CollegeId = track.CollegeId,
            DepartmentId = track.DepartmentId,
            DepartmentCode = dept?.Code,
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
        var faculty = await _context.Users.FirstOrDefaultAsync(u => u.Id == facultyId && u.CollegeId == collegeId && u.DepartmentId == deptId && !u.IsDeleted);
        if (faculty == null) return NotFound(new { message = "Faculty not found in department." });

        faculty.IsProjectCoordinator = request.IsProjectCoordinator;
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

    [HttpGet("nba-attainment")]
    public async Task<ActionResult<NbaAttainmentReportDto>> GetNbaAttainmentReport()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();

        var deptEvals = await _context.VivaEvaluations
            .Include(v => v.IndividualScores)
            .Where(v => v.CollegeId == collegeId && v.ProjectTeam != null && v.ProjectTeam.DepartmentId == deptId && !v.IsDeleted)
            .ToListAsync();

        var exitSurveys = await _context.CourseExitSurveys
            .Where(s => s.CollegeId == collegeId && s.ProjectTeam != null && s.ProjectTeam.DepartmentId == deptId && !s.IsDeleted)
            .ToListAsync();

        decimal? baseDirect = null;
        if (deptEvals.Any())
        {
            var allScores = deptEvals.SelectMany(e => e.IndividualScores).ToList();
            if (allScores.Any())
            {
                var met = allScores.Count(s => s.FinalComputedStudentMark >= 35m);
                baseDirect = Math.Round((decimal)met / allScores.Count * 100m, 1);
            }
            else
            {
                var met = deptEvals.Count(e => e.SharedTotalScore >= 35m);
                baseDirect = Math.Round((decimal)met / deptEvals.Count * 100m, 1);
            }
        }

        decimal? baseIndirect = null;
        if (exitSurveys.Any())
        {
            var ratings = new List<int>();
            foreach (var survey in exitSurveys)
            {
                if (!string.IsNullOrWhiteSpace(survey.PoRatingsJson))
                {
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(survey.PoRatingsJson);
                        foreach (var prop in doc.RootElement.EnumerateObject())
                        {
                            if (prop.Value.TryGetInt32(out var r))
                            {
                                ratings.Add(r);
                            }
                        }
                    }
                    catch { }
                }
            }
            if (ratings.Any())
            {
                baseIndirect = Math.Round((decimal)ratings.Average() / 3m * 100m, 1);
            }
        }

        var masterOutcomes = await _context.MasterNbaOutcomes
            .Where(o => o.Category == "ProgramOutcome")
            .OrderBy(o => o.Code)
            .ToListAsync();

        var outcomes = new List<PoAttainmentScoreDto>();

        if (masterOutcomes.Any())
        {
            foreach (var mo in masterOutcomes.Take(8))
            {
                outcomes.Add(CreatePoScore(mo.Code, mo.Title, baseDirect, baseIndirect));
            }
        }
        else
        {
            outcomes.Add(CreatePoScore("PO1", "Engineering Knowledge", baseDirect, baseIndirect));
            outcomes.Add(CreatePoScore("PO2", "Problem Analysis", baseDirect, baseIndirect));
            outcomes.Add(CreatePoScore("PO3", "Design/Development of Solutions", baseDirect, baseIndirect));
            outcomes.Add(CreatePoScore("PO4", "Conduct Investigations", baseDirect, baseIndirect));
            outcomes.Add(CreatePoScore("PO5", "Modern Tool Usage", baseDirect, baseIndirect));
            outcomes.Add(CreatePoScore("PO9", "Individual and Team Work", baseDirect, baseIndirect));
            outcomes.Add(CreatePoScore("PO10", "Communication", baseDirect, baseIndirect));
            outcomes.Add(CreatePoScore("PO12", "Life-long Learning", baseDirect, baseIndirect));
        }

        var directValues = outcomes.Where(o => o.DirectAttainmentPct.HasValue).Select(o => o.DirectAttainmentPct!.Value).ToList();
        var avgDirect = directValues.Any() ? Math.Round(directValues.Average(), 2) : (decimal?)null;

        var indirectValues = outcomes.Where(o => o.IndirectAttainmentPct.HasValue).Select(o => o.IndirectAttainmentPct!.Value).ToList();
        var avgIndirect = indirectValues.Any() ? Math.Round(indirectValues.Average(), 2) : (decimal?)null;

        var blendedValues = outcomes.Where(o => o.BlendedAttainmentPct.HasValue).Select(o => o.BlendedAttainmentPct!.Value).ToList();
        var avgBlended = blendedValues.Any() ? Math.Round(blendedValues.Average(), 2) : (decimal?)null;

        return Ok(new NbaAttainmentReportDto
        {
            DepartmentId = deptId,
            AcademicYear = "2025-2026",
            OverallDirectPct = avgDirect,
            OverallIndirectPct = avgIndirect,
            OverallBlendedPct = avgBlended,
            PoBreakdown = outcomes
        });
    }

    private static PoAttainmentScoreDto CreatePoScore(string code, string title, decimal? direct, decimal? indirect)
    {
        var clampedDirect = direct.HasValue ? Math.Clamp(Math.Round(direct.Value, 1), 0m, 100m) : (decimal?)null;
        var clampedIndirect = indirect.HasValue ? Math.Clamp(Math.Round(indirect.Value, 1), 0m, 100m) : (decimal?)null;
        decimal? blended = (clampedDirect.HasValue && clampedIndirect.HasValue)
            ? Math.Round((clampedDirect.Value * 0.8m) + (clampedIndirect.Value * 0.2m), 2)
            : clampedDirect ?? clampedIndirect;
        bool targetMet = blended.HasValue && blended.Value >= 70.0m;

        return new PoAttainmentScoreDto
        {
            PoCode = code,
            Title = title,
            DirectAttainmentPct = clampedDirect,
            IndirectAttainmentPct = clampedIndirect,
            BlendedAttainmentPct = blended,
            TargetMet = targetMet
        };
    }

    [HttpGet("nba/export-zip")]
    public async Task<IActionResult> ExportNbaDossierZip(CancellationToken cancellationToken)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();

        var dept = await _context.Departments
            .Include(d => d.College)
            .FirstOrDefaultAsync(d => d.Id == deptId && d.CollegeId == collegeId && !d.IsDeleted, cancellationToken);

        var collegeName = dept?.College?.Name ?? "Institutional College Tenant";
        var deptName = dept?.Name ?? "Academic Department";
        var deptCode = dept?.Code ?? "DEPT";

        var dbTeams = await _context.ProjectTeams
            .Include(t => t.Members)
                .ThenInclude(m => m.User)
            .Include(t => t.GuideUser)
            .Include(t => t.Evaluations)
                .ThenInclude(e => e.IndividualScores)
            .Include(t => t.Artifacts)
            .Where(t => t.CollegeId == collegeId && t.DepartmentId == deptId && !t.IsDeleted)
            .OrderByDescending(t => t.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var deptEvals = await _context.VivaEvaluations
            .Include(v => v.IndividualScores)
            .Where(v => v.CollegeId == collegeId && v.ProjectTeam != null && v.ProjectTeam.DepartmentId == deptId && !v.IsDeleted)
            .ToListAsync(cancellationToken);

        var exitSurveys = await _context.CourseExitSurveys
            .Where(s => s.CollegeId == collegeId && s.ProjectTeam != null && s.ProjectTeam.DepartmentId == deptId && !s.IsDeleted)
            .ToListAsync(cancellationToken);

        decimal? exportDirectPct = null;
        if (deptEvals.Any())
        {
            var allScores = deptEvals.SelectMany(e => e.IndividualScores).ToList();
            if (allScores.Any())
            {
                var met = allScores.Count(s => s.FinalComputedStudentMark >= 35m);
                exportDirectPct = Math.Round((decimal)met / allScores.Count * 100m, 1);
            }
            else
            {
                var met = deptEvals.Count(e => e.SharedTotalScore >= 35m);
                exportDirectPct = Math.Round((decimal)met / deptEvals.Count * 100m, 1);
            }
        }

        decimal? exportIndirectPct = null;
        if (exitSurveys.Any())
        {
            var ratings = new List<int>();
            foreach (var survey in exitSurveys)
            {
                if (!string.IsNullOrWhiteSpace(survey.PoRatingsJson))
                {
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(survey.PoRatingsJson);
                        foreach (var prop in doc.RootElement.EnumerateObject())
                        {
                            if (prop.Value.TryGetInt32(out var r))
                            {
                                ratings.Add(r);
                            }
                        }
                    }
                    catch { }
                }
            }
            if (ratings.Any())
            {
                exportIndirectPct = Math.Round((decimal)ratings.Average() / 3m * 100m, 1);
            }
        }

        decimal? exportBlendedPct = (exportDirectPct.HasValue && exportIndirectPct.HasValue)
            ? Math.Round((exportDirectPct.Value * 0.8m) + (exportIndirectPct.Value * 0.2m), 2)
            : exportDirectPct ?? exportIndirectPct;

        using var zipMemoryStream = new MemoryStream();
        using (var archive = new ZipArchive(zipMemoryStream, ZipArchiveMode.Create, true))
        {
            // 1. 00_NBA_CO_PO_Attainment_Matrix.csv
            var attainmentCsv = new StringBuilder();
            attainmentCsv.AppendLine("Course Outcome,Outcome Statement,Direct Attainment (80%),Indirect Exit Survey (20%),Blended Criterion 3 Attainment (%),Target Benchmark (%),Attainment Status,Mapped POs & PSOs");

            if (exportDirectPct.HasValue || exportIndirectPct.HasValue)
            {
                var dirStr = exportDirectPct.HasValue ? $"{exportDirectPct.Value:F1}%" : "N/A";
                var indStr = exportIndirectPct.HasValue ? $"{exportIndirectPct.Value:F1}%" : "N/A";
                var blnStr = exportBlendedPct.HasValue ? $"{exportBlendedPct.Value:F2}%" : "N/A";
                var status = (exportBlendedPct.HasValue && exportBlendedPct.Value >= 70m) ? "Target Exceeded" : "Remedial / In Progress";

                attainmentCsv.AppendLine($"CO1,Problem Identification & Feasibility Analysis,{dirStr},{indStr},{blnStr},70.0%,{status},\"PO1, PO2, PO3, PSO1\"");
                attainmentCsv.AppendLine($"CO2,Architecture Design & Requirement Engineering,{dirStr},{indStr},{blnStr},70.0%,{status},\"PO2, PO3, PO5, PSO2\"");
                attainmentCsv.AppendLine($"CO3,Prototype Implementation & Code Verification,{dirStr},{indStr},{blnStr},70.0%,{status},\"PO3, PO4, PO5, PO9\"");
                attainmentCsv.AppendLine($"CO4,Report Writing & Technical Viva Defense,{dirStr},{indStr},{blnStr},70.0%,{status},\"PO7, PO9, PO10, PSO1\"");
                attainmentCsv.AppendLine();
                attainmentCsv.AppendLine("--- NBA CRITERION 2 & 3 ATTAINMENT SUMMARY ---");
                attainmentCsv.AppendLine($"Institution,{collegeName}");
                attainmentCsv.AppendLine($"Department,{deptName} ({deptCode})");
                attainmentCsv.AppendLine("Academic Batch,AY 2025-2026");
                attainmentCsv.AppendLine("Accreditation Cycle,NBA Tier-II Criterion 2 & 3 Evaluation");
                attainmentCsv.AppendLine("Direct Continuous Assessment Weight,80%");
                attainmentCsv.AppendLine("Indirect Course Exit Survey Weight,20%");
                attainmentCsv.AppendLine($"Evaluation Data Status,Measured from {deptEvals.Count} evaluation record(s) and {exitSurveys.Count} exit survey(s)");
                attainmentCsv.AppendLine($"Institutional Criterion 3 Attainment,{blnStr} (Threshold >= 70% {(exportBlendedPct.HasValue && exportBlendedPct.Value >= 70m ? "SATISFIED" : "NOT SATISFIED")})");
            }
            else
            {
                attainmentCsv.AppendLine("CO1,Problem Identification & Feasibility Analysis,N/A,N/A,N/A,70.0%,No Evaluation Data,\"PO1, PO2, PO3, PSO1\"");
                attainmentCsv.AppendLine("CO2,Architecture Design & Requirement Engineering,N/A,N/A,N/A,70.0%,No Evaluation Data,\"PO2, PO3, PO5, PSO2\"");
                attainmentCsv.AppendLine("CO3,Prototype Implementation & Code Verification,N/A,N/A,N/A,70.0%,No Evaluation Data,\"PO3, PO4, PO5, PO9\"");
                attainmentCsv.AppendLine("CO4,Report Writing & Technical Viva Defense,N/A,N/A,N/A,70.0%,No Evaluation Data,\"PO7, PO9, PO10, PSO1\"");
                attainmentCsv.AppendLine();
                attainmentCsv.AppendLine("--- NBA CRITERION 2 & 3 ATTAINMENT SUMMARY ---");
                attainmentCsv.AppendLine($"Institution,{collegeName}");
                attainmentCsv.AppendLine($"Department,{deptName} ({deptCode})");
                attainmentCsv.AppendLine("Academic Batch,AY 2025-2026");
                attainmentCsv.AppendLine("Accreditation Cycle,NBA Tier-II Criterion 2 & 3 Evaluation");
                attainmentCsv.AppendLine("Direct Continuous Assessment Weight,80%");
                attainmentCsv.AppendLine("Indirect Course Exit Survey Weight,20%");
                attainmentCsv.AppendLine("Evaluation Data Status,No evaluation records or exit surveys submitted for this department");
                attainmentCsv.AppendLine("Institutional Criterion 3 Attainment,N/A (Pending Evaluation Records)");
            }

            var attainmentEntry = archive.CreateEntry("00_NBA_CO_PO_Attainment_Matrix.csv", CompressionLevel.Optimal);
            await using (var entryStream = attainmentEntry.Open())
            await using (var writer = new StreamWriter(entryStream, Encoding.UTF8))
            {
                await writer.WriteAsync(attainmentCsv.ToString());
            }

            // 2. 01_Department_Consolidated_Marksheet.csv
            var marksheetCsv = new StringBuilder();
            marksheetCsv.AppendLine($"CONSOLIDATED DEPARTMENT TABULATION REGISTER - {collegeName}");
            marksheetCsv.AppendLine($"Department: {deptName} ({deptCode}) | Academic Year: 2025-2026");
            marksheetCsv.AppendLine("S.No,Roll No / USN,Student Name,Department,Team Code,Project Title,Guide Score,Mid-Term Score,External Viva Score,Total Score (/100),Grade,Result");

            int serialNo = 1;
            if (!dbTeams.Any())
            {
                marksheetCsv.AppendLine("N/A,N/A,No registered project teams found for this department,N/A,N/A,N/A,0,0,0,0,N/A,NO DATA");
            }
            else
            {
                foreach (var team in dbTeams)
                {
                    var guideEval = team.Evaluations.FirstOrDefault(e => e.CheckpointType == CheckpointType.GuideContinuous && !e.IsDeleted);
                    var midTermEval = team.Evaluations.FirstOrDefault(e => e.CheckpointType == CheckpointType.MidTermReview && !e.IsDeleted);
                    var finalVivaEval = team.Evaluations.FirstOrDefault(e => e.CheckpointType == CheckpointType.FinalViva && !e.IsDeleted);

                    foreach (var member in team.Members.Where(m => !m.IsDeleted && m.User != null))
                    {
                        var student = member.User!;
                        decimal guideScore = guideEval?.SharedTotalScore ?? 0m;
                        decimal midTermScore = midTermEval?.SharedTotalScore ?? 0m;
                        decimal vivaScore = finalVivaEval?.SharedTotalScore ?? 0m;

                        var indScore = finalVivaEval?.IndividualScores.FirstOrDefault(s => s.StudentUserId == student.Id);
                        decimal total = indScore != null && indScore.FinalComputedStudentMark > 0
                            ? indScore.FinalComputedStudentMark
                            : Math.Round(guideScore * 0.30m + midTermScore * 0.30m + vivaScore * 0.40m, 1);

                        string grade = total >= 85 ? "A+" : total >= 75 ? "A" : total >= 65 ? "B" : total >= 50 ? "C" : "F";
                        string result = total >= 50 ? "PASS" : "REMEDIAL";

                        marksheetCsv.AppendLine($"{serialNo++},{student.EnrollmentOrEmployeeCode},{student.FullName},{deptCode},{team.TeamCode},\"{team.Title}\",{guideScore},{midTermScore},{vivaScore},{total},{grade},{result}");
                    }
                }
            }

            var marksheetEntry = archive.CreateEntry("01_RGPV_Consolidated_Marksheet.csv", CompressionLevel.Optimal);
            await using (var entryStream = marksheetEntry.Open())
            await using (var writer = new StreamWriter(entryStream, Encoding.UTF8))
            {
                await writer.WriteAsync(marksheetCsv.ToString());
            }

            // 3. Dossiers for Department Teams under 02_Audit_Sample_Dossiers
            var teamsToExport = dbTeams.Take(12).ToList();

            foreach (var team in teamsToExport)
            {
                string safeTitle = new string(team.Title.Where(c => char.IsLetterOrDigit(c) || c == '_' || c == '-').ToArray());
                if (safeTitle.Length > 25) safeTitle = safeTitle[..25];
                string projectFolderPath = $"02_Audit_Sample_Dossiers/01_Sample_Projects/{team.TeamCode}_{safeTitle}";

                var scorecardCsv = new StringBuilder();
                scorecardCsv.AppendLine("CAPSTONE PROJECT EVALUATION SCORECARD - AUDIT RECORD");
                scorecardCsv.AppendLine($"Institution,{collegeName}");
                scorecardCsv.AppendLine($"Department,{deptName}");
                scorecardCsv.AppendLine($"Team Code,{team.TeamCode}");
                scorecardCsv.AppendLine($"Project Title,\"{team.Title}\"");
                scorecardCsv.AppendLine($"Faculty Guide,{team.GuideUser?.FullName ?? "Unassigned"}");
                scorecardCsv.AppendLine($"Status,{team.Status}");
                scorecardCsv.AppendLine();
                scorecardCsv.AppendLine("Team Members:");
                foreach (var m in team.Members.Where(m => !m.IsDeleted && m.User != null))
                {
                    scorecardCsv.AppendLine($"- {m.User!.FullName} ({m.User.EnrollmentOrEmployeeCode}) [{(m.IsTeamLead ? "Team Lead" : "Member")}]");
                }

                var scEntry = archive.CreateEntry($"{projectFolderPath}/{team.TeamCode}_Evaluation_Scorecard.csv", CompressionLevel.Optimal);
                await using (var es = scEntry.Open())
                await using (var w = new StreamWriter(es, Encoding.UTF8))
                {
                    await w.WriteAsync(scorecardCsv.ToString());
                }

                // Attach real vault deliverables from storage or fallback mock stream
                var vaultSlots = new (ArtifactSlotType Slot, string Extension)[]
                {
                    (ArtifactSlotType.Synopsis, ".pdf"),
                    (ArtifactSlotType.MidTermPPT, ".pptx"),
                    (ArtifactSlotType.PlagiarismReport, ".pdf"),
                    (ArtifactSlotType.FinalThesis, ".pdf")
                };

                foreach (var (slot, ext) in vaultSlots)
                {
                    var art = team.Artifacts?.FirstOrDefault(a => a.SlotType == slot && !a.IsDeleted);
                    var entryFileName = $"{team.TeamCode}_{slot}{ext}";
                    var entry = archive.CreateEntry($"{projectFolderPath}/{entryFileName}", CompressionLevel.Optimal);
                    try
                    {
                        await using var destStream = entry.Open();
                        if (art != null && !string.IsNullOrWhiteSpace(art.StorageKey))
                        {
                            var (fileStream, _) = await _fileStorageService.OpenReadAsync(art.StorageKey, cancellationToken);
                            await using (fileStream)
                            {
                                await fileStream.CopyToAsync(destStream, cancellationToken);
                            }
                        }
                        else
                        {
                            var (fallbackStream, _) = await _fileStorageService.OpenReadAsync($"vault/{collegeId}/{team?.Id ?? Guid.NewGuid()}/{slot}/{entryFileName}", cancellationToken);
                            await using (fallbackStream)
                            {
                                await fallbackStream.CopyToAsync(destStream, cancellationToken);
                            }
                        }
                    }
                    catch { }
                }
            }
        }

        var zipBytes = zipMemoryStream.ToArray();
        var downloadZipName = $"Collabex_NBA_SAR_{deptCode}_2025-2026.zip";
        return File(zipBytes, "application/zip", downloadZipName);
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

    [HttpPost("sar/attest")]
    public async Task<ActionResult<AttestSarResponse>> AttestDepartmentSar()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var deptId = await ResolveDepartmentIdAsync();

        var dept = await _context.Departments
            .FirstOrDefaultAsync(d => d.Id == deptId && d.CollegeId == collegeId && !d.IsDeleted);

        if (dept == null)
        {
            return NotFound(new { message = "Department not found in current institutional tenant." });
        }

        var hasActiveTrack = await _context.AcademicTracks
            .AnyAsync(t => t.CollegeId == collegeId && (t.DepartmentId == deptId || t.DepartmentId == null) && t.IsActive && !t.IsDeleted);

        if (!hasActiveTrack)
        {
            return BadRequest(new { message = "Completeness validation failed: Department has no active academic project tracks configured." });
        }

        var pendingProposalsCount = await _context.ProjectTeams
            .CountAsync(t => t.CollegeId == collegeId && t.DepartmentId == deptId && t.Status == ProjectStatus.PendingHOD && !t.IsDeleted);

        if (pendingProposalsCount > 0)
        {
            return BadRequest(new { message = $"Completeness validation failed: {pendingProposalsCount} project proposal(s) are currently pending HOD review and approval." });
        }

        var teamCount = await _context.ProjectTeams
            .CountAsync(t => t.CollegeId == collegeId && t.DepartmentId == deptId && !t.IsDeleted);

        if (teamCount == 0)
        {
            return BadRequest(new { message = "Completeness validation failed: Department has no registered project teams." });
        }

        var caller = await ResolveCurrentUserAsync();

        dept.IsSarAttested = true;
        dept.SarAttestedAtUtc = DateTime.UtcNow;
        dept.SarAttestedByUserId = _tenantContext.UserId;

        var audit = new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            ActorEmail = caller?.Email ?? "hod@collabex.edu",
            Action = "HOD_SAR_ATTESTED",
            TargetTenantId = collegeId,
            TargetEntity = "Department",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                departmentId = dept.Id,
                departmentCode = dept.Code,
                attestedAtUtc = dept.SarAttestedAtUtc,
                totalTeams = teamCount
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(audit);

        await _context.SaveChangesAsync();

        return Ok(new AttestSarResponse
        {
            Success = true,
            AttestedAtUtc = dept.SarAttestedAtUtc.Value,
            AttestedByName = caller?.FullName ?? "Head of Department",
            Status = "Attested",
            Message = $"NBA SAR Departmental Self-Appraisal for {dept.Name} ({dept.Code}) successfully attested and digitally sealed."
        });
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

                string attainment = totalMarks >= 70 ? "Target Exceeded" : "Remedial";

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
                    LetterGrade = letterGrade,
                    NbaAttainmentStatus = attainment
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
}
