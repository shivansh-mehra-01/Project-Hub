using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectHub.Api.Authorization;
using ProjectHub.Application.Common.Models;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;

namespace ProjectHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = ProjectHubPolicies.HodOnly)]
public class HodController : ControllerBase
{
    private readonly ProjectHubDbContext _context;
    private readonly ITenantContext _tenantContext;

    public HodController(ProjectHubDbContext context, ITenantContext tenantContext)
    {
        _context = context;
        _tenantContext = tenantContext;
    }

    private Guid GetDepartmentId()
    {
        return _tenantContext.DepartmentId 
               ?? throw new InvalidOperationException("Active HOD session must possess an appointed department binding.");
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<HodDashboardDto>> GetDashboard()
    {
        var deptId = GetDepartmentId();
        var dept = await _context.Departments.FirstOrDefaultAsync(d => d.Id == deptId && !d.IsDeleted);
        if (dept == null) return NotFound(new { message = "Department not found." });

        var teams = await _context.ProjectTeams.Where(t => t.DepartmentId == deptId && !t.IsDeleted).ToListAsync();
        var students = await _context.Users.CountAsync(u => u.DepartmentId == deptId && u.Role == UserRole.Student && !u.IsDeleted);
        var mentors = await _context.Users.CountAsync(u => u.DepartmentId == deptId && u.Role == UserRole.Faculty && !u.IsDeleted);

        return Ok(new HodDashboardDto
        {
            DepartmentId = dept.Id,
            DepartmentName = dept.Name,
            DepartmentCode = dept.Code,
            TotalTeams = teams.Count,
            ActiveBuildTeams = teams.Count(t => t.Status == ProjectStatus.ActiveBuild),
            AtRiskTeams = teams.Count(t => t.Status == ProjectStatus.AtRisk),
            ReadyForVivaTeams = teams.Count(t => t.Status == ProjectStatus.ReadyForViva),
            TotalStudentsEnrolled = students,
            AvailableMentors = mentors,
            NbaDirectAttainmentPct = 82.4m,
            NbaIndirectAttainmentPct = 78.6m,
            NbaBlendedCriterion3Pct = Math.Round((82.4m * 0.8m) + (78.6m * 0.2m), 2),
            IsSarAttested = dept.IsSarAttested
        });
    }

    [HttpGet("tracks")]
    public async Task<ActionResult<List<CollegeTrackDto>>> GetTracks()
    {
        var deptId = GetDepartmentId();
        var tracks = await _context.AcademicTracks
            .Where(t => (t.DepartmentId == deptId || t.DepartmentId == null) && !t.IsDeleted)
            .OrderByDescending(t => t.AcademicYear)
            .Select(t => new CollegeTrackDto
            {
                Id = t.Id,
                CollegeId = t.CollegeId,
                DepartmentId = t.DepartmentId,
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
        var deptId = GetDepartmentId();

        var track = new AcademicTrack
        {
            CollegeId = collegeId,
            DepartmentId = deptId,
            AllowInterdisciplinaryTeams = false,
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
            Name = track.Name,
            AcademicYear = track.AcademicYear,
            AllowInterdisciplinaryTeams = track.AllowInterdisciplinaryTeams,
            IsActive = track.IsActive
        });
    }

    [HttpGet("proposals")]
    public async Task<ActionResult<List<ProjectProposalDto>>> GetProposals()
    {
        var deptId = GetDepartmentId();
        var proposals = await _context.ProjectTeams
            .Include(t => t.GuideUser)
            .Include(t => t.Members)
            .Where(t => t.DepartmentId == deptId && t.Status == ProjectStatus.PendingHOD && !t.IsDeleted)
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
    public async Task<IActionResult> ApproveProposal(Guid teamId)
    {
        var deptId = GetDepartmentId();
        var team = await _context.ProjectTeams.FirstOrDefaultAsync(t => t.Id == teamId && t.DepartmentId == deptId && !t.IsDeleted);
        if (team == null) return NotFound(new { message = "Proposal not found." });

        team.Status = ProjectStatus.ActiveBuild;
        team.IsRosterLocked = true;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, teamId = team.Id, status = team.Status });
    }

    [HttpPost("proposals/{teamId}/reject")]
    public async Task<IActionResult> RejectProposal(Guid teamId, [FromBody] string? reason)
    {
        var deptId = GetDepartmentId();
        var team = await _context.ProjectTeams.FirstOrDefaultAsync(t => t.Id == teamId && t.DepartmentId == deptId && !t.IsDeleted);
        if (team == null) return NotFound(new { message = "Proposal not found." });

        team.Status = ProjectStatus.Draft;
        team.IsRosterLocked = false;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, teamId = team.Id, status = team.Status, remarks = reason });
    }

    [HttpGet("faculty")]
    public async Task<ActionResult<List<FacultyWorkloadDto>>> GetFacultyWorkload()
    {
        var deptId = GetDepartmentId();
        var facultyList = await _context.Users
            .Where(u => u.DepartmentId == deptId && (u.Role == UserRole.Faculty || u.Role == UserRole.HOD) && !u.IsDeleted)
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

    [HttpPut("faculty/{facultyId}/coordinator")]
    public async Task<IActionResult> ToggleCoordinator(Guid facultyId, [FromBody] ToggleCoordinatorRequest request)
    {
        var deptId = GetDepartmentId();
        var faculty = await _context.Users.FirstOrDefaultAsync(u => u.Id == facultyId && u.DepartmentId == deptId && !u.IsDeleted);
        if (faculty == null) return NotFound(new { message = "Faculty not found." });

        faculty.IsProjectCoordinator = request.IsProjectCoordinator;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPut("faculty/{facultyId}/mentor-cap")]
    public async Task<IActionResult> UpdateMentorCap(Guid facultyId, [FromBody] UpdateMentorCapRequest request)
    {
        var deptId = GetDepartmentId();
        var faculty = await _context.Users.FirstOrDefaultAsync(u => u.Id == facultyId && u.DepartmentId == deptId && !u.IsDeleted);
        if (faculty == null) return NotFound(new { message = "Faculty not found." });

        faculty.MaxMentorTeams = Math.Max(1, request.MaxMentorTeams);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("nba-attainment")]
    public ActionResult<NbaAttainmentReportDto> GetNbaAttainmentReport()
    {
        var deptId = GetDepartmentId();

        // 80/20 Blended Criterion 3 NBA Model
        var outcomes = new List<PoAttainmentScoreDto>
        {
            new() { PoCode = "PO1", Title = "Engineering Knowledge", DirectAttainmentPct = 84.0m, IndirectAttainmentPct = 80.0m, BlendedAttainmentPct = 83.2m, TargetMet = true },
            new() { PoCode = "PO2", Title = "Problem Analysis", DirectAttainmentPct = 82.5m, IndirectAttainmentPct = 78.0m, BlendedAttainmentPct = 81.6m, TargetMet = true },
            new() { PoCode = "PO3", Title = "Design/Development of Solutions", DirectAttainmentPct = 80.0m, IndirectAttainmentPct = 75.0m, BlendedAttainmentPct = 79.0m, TargetMet = true },
            new() { PoCode = "PO4", Title = "Conduct Investigations", DirectAttainmentPct = 78.0m, IndirectAttainmentPct = 76.0m, BlendedAttainmentPct = 77.6m, TargetMet = true },
            new() { PoCode = "PO5", Title = "Modern Tool Usage", DirectAttainmentPct = 88.0m, IndirectAttainmentPct = 85.0m, BlendedAttainmentPct = 87.4m, TargetMet = true },
            new() { PoCode = "PO9", Title = "Individual and Team Work", DirectAttainmentPct = 90.0m, IndirectAttainmentPct = 88.0m, BlendedAttainmentPct = 89.6m, TargetMet = true },
            new() { PoCode = "PO10", Title = "Communication", DirectAttainmentPct = 85.0m, IndirectAttainmentPct = 82.0m, BlendedAttainmentPct = 84.4m, TargetMet = true },
            new() { PoCode = "PO12", Title = "Life-long Learning", DirectAttainmentPct = 81.0m, IndirectAttainmentPct = 79.0m, BlendedAttainmentPct = 80.6m, TargetMet = true }
        };

        var avgDirect = outcomes.Average(o => o.DirectAttainmentPct);
        var avgIndirect = outcomes.Average(o => o.IndirectAttainmentPct);
        var avgBlended = Math.Round((avgDirect * 0.8m) + (avgIndirect * 0.2m), 2);

        return Ok(new NbaAttainmentReportDto
        {
            DepartmentId = deptId,
            AcademicYear = "2025-2026",
            OverallDirectPct = Math.Round(avgDirect, 2),
            OverallIndirectPct = Math.Round(avgIndirect, 2),
            OverallBlendedPct = avgBlended,
            PoBreakdown = outcomes
        });
    }

    [HttpGet("exceptions")]
    public async Task<ActionResult<List<ExceptionAuditLogDto>>> GetExceptions()
    {
        var deptId = GetDepartmentId();
        var exceptions = await _context.ExceptionAuditLogs
            .Include(e => e.ProjectTeam)
            .Include(e => e.RequestedByUser)
            .Where(e => e.DepartmentId == deptId && !e.IsDeleted)
            .OrderByDescending(e => e.CreatedAtUtc)
            .Select(e => new ExceptionAuditLogDto
            {
                Id = e.Id,
                ProjectTeamId = e.ProjectTeamId,
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
        var deptId = GetDepartmentId();
        var record = await _context.ExceptionAuditLogs.FirstOrDefaultAsync(e => e.Id == exceptionId && e.DepartmentId == deptId && !e.IsDeleted);
        if (record == null) return NotFound(new { message = "Exception audit record not found." });

        record.ApprovedByUserId = _tenantContext.UserId;
        record.ApprovedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, exceptionId = record.Id, approvedAtUtc = record.ApprovedAtUtc });
    }
}
