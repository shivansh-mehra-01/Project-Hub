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
[Authorize(Policy = ProjectHubPolicies.CoordinatorOrHod)]
public class CoordinatorController : ControllerBase
{
    private readonly ProjectHubDbContext _context;
    private readonly ITenantContext _tenantContext;

    public CoordinatorController(ProjectHubDbContext context, ITenantContext tenantContext)
    {
        _context = context;
        _tenantContext = tenantContext;
    }

    [HttpPost("roster/import")]
    public async Task<ActionResult<RosterImportResultDto>> ImportRoster([FromBody] RosterImportRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var inserted = 0;
        var updated = 0;
        var warnings = new List<string>();

        var defaultHash = Infrastructure.Security.PasswordHelper.HashPassword("ProjectHub@2026");

        foreach (var row in request.Rows)
        {
            if (string.IsNullOrWhiteSpace(row.Email) || string.IsNullOrWhiteSpace(row.EnrollmentOrEmployeeCode))
            {
                warnings.Add($"Skipping invalid row with missing Email or Code: {row.FullName}");
                continue;
            }

            var email = row.Email.Trim().ToLowerInvariant();
            var code = row.EnrollmentOrEmployeeCode.Trim().ToUpperInvariant();

            var existing = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted);

            if (existing != null)
            {
                existing.FullName = row.FullName.Trim();
                existing.EnrollmentOrEmployeeCode = code;
                existing.Role = row.Role;
                existing.DepartmentId = request.DepartmentId;
                existing.SkillsCsv = row.SkillsCsv;
                existing.GitHubHandle = row.GitHubHandle;
                updated++;
            }
            else
            {
                var newUser = new UserAccount
                {
                    CollegeId = collegeId,
                    DepartmentId = request.DepartmentId,
                    FullName = row.FullName.Trim(),
                    Email = email,
                    EnrollmentOrEmployeeCode = code,
                    Role = row.Role,
                    PasswordHash = defaultHash,
                    IsActivated = false,
                    IsActive = true,
                    SkillsCsv = row.SkillsCsv,
                    GitHubHandle = row.GitHubHandle
                };
                await _context.Users.AddAsync(newUser);
                inserted++;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new RosterImportResultDto
        {
            TotalProcessed = request.Rows.Count,
            InsertedCount = inserted,
            UpdatedCount = updated,
            Warnings = warnings
        });
    }

    [HttpGet("teams")]
    public async Task<ActionResult<List<ProjectProposalDto>>> GetTeams([FromQuery] Guid? trackId)
    {
        var deptId = _tenantContext.DepartmentId;
        var query = _context.ProjectTeams
            .Include(t => t.GuideUser)
            .Include(t => t.Members)
            .Where(t => !t.IsDeleted);

        if (deptId.HasValue) query = query.Where(t => t.DepartmentId == deptId.Value);
        if (trackId.HasValue) query = query.Where(t => t.AcademicTrackId == trackId.Value);

        var teams = await query
            .OrderBy(t => t.TeamCode)
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

        return Ok(teams);
    }

    [HttpPost("teams/{teamId}/assign-guide")]
    public async Task<IActionResult> AssignGuide(Guid teamId, [FromBody] AssignGuideRequest request)
    {
        var team = await _context.ProjectTeams.FirstOrDefaultAsync(t => t.Id == teamId && !t.IsDeleted);
        if (team == null) return NotFound(new { message = "Team not found." });

        var guide = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.GuideUserId && !u.IsDeleted);
        if (guide == null || (guide.Role != UserRole.Faculty && guide.Role != UserRole.HOD))
        {
            return BadRequest(new { message = "Selected user is not an eligible faculty mentor." });
        }

        // Validate mentor capacity
        var currentLoad = await _context.ProjectTeams.CountAsync(t => t.GuideUserId == guide.Id && !t.IsDeleted && t.Status != ProjectStatus.Archived);
        if (currentLoad >= guide.MaxMentorTeams)
        {
            return BadRequest(new { message = $"Faculty member '{guide.FullName}' has reached their maximum mentorship capacity of {guide.MaxMentorTeams} teams." });
        }

        team.GuideUserId = guide.Id;
        if (team.Status == ProjectStatus.Draft)
        {
            team.Status = ProjectStatus.PendingGuide;
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, teamId = team.Id, guideId = guide.Id, guideName = guide.FullName });
    }

    [HttpGet("panels")]
    public async Task<ActionResult<List<VivaPanelDto>>> GetPanels()
    {
        var panels = await _context.VivaPanels
            .Include(p => p.Evaluators)
                .ThenInclude(e => e.EvaluatorUser)
            .Where(p => !p.IsDeleted)
            .OrderBy(p => p.ScheduledAtUtc)
            .Select(p => new VivaPanelDto
            {
                Id = p.Id,
                PanelName = p.PanelName,
                ScheduledAtUtc = p.ScheduledAtUtc,
                RoomOrLink = p.RoomOrLink,
                EvaluatorNames = p.Evaluators
                    .Where(e => !e.IsDeleted && e.EvaluatorUser != null)
                    .Select(e => e.EvaluatorUser!.FullName)
                    .ToList()
            })
            .ToListAsync();

        return Ok(panels);
    }

    [HttpPost("panels")]
    public async Task<ActionResult<VivaPanelDto>> SchedulePanel([FromBody] ScheduleVivaPanelRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;

        var panel = new VivaPanel
        {
            CollegeId = collegeId,
            DepartmentId = request.DepartmentId,
            AcademicTrackId = request.AcademicTrackId,
            PanelName = request.PanelName.Trim(),
            ScheduledAtUtc = request.ScheduledAtUtc,
            RoomOrLink = request.RoomOrLink.Trim()
        };

        foreach (var evaluatorId in request.EvaluatorUserIds.Distinct())
        {
            panel.Evaluators.Add(new VivaPanelEvaluator
            {
                CollegeId = collegeId,
                EvaluatorUserId = evaluatorId
            });
        }

        await _context.VivaPanels.AddAsync(panel);
        await _context.SaveChangesAsync();

        return Ok(new VivaPanelDto
        {
            Id = panel.Id,
            PanelName = panel.PanelName,
            ScheduledAtUtc = panel.ScheduledAtUtc,
            RoomOrLink = panel.RoomOrLink,
            EvaluatorNames = new List<string>()
        });
    }

    [HttpPost("exceptions")]
    public async Task<IActionResult> RequestException([FromBody] CreateExceptionRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var requestedBy = _tenantContext.UserId!.Value;

        var exceptionLog = new ExceptionAuditLog
        {
            CollegeId = collegeId,
            DepartmentId = request.DepartmentId,
            ProjectTeamId = request.ProjectTeamId,
            ActionType = request.ActionType,
            TargetUserId = request.TargetUserId,
            Reason = request.Reason.Trim(),
            PreviousValueJson = request.PreviousValueJson,
            NewValueJson = request.NewValueJson,
            RequestedByUserId = requestedBy
        };

        await _context.ExceptionAuditLogs.AddAsync(exceptionLog);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, exceptionId = exceptionLog.Id, status = "PendingHODApproval" });
    }
}
