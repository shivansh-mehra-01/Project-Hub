using System.Text.Json;
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
[Authorize]
public class EvaluationController : ControllerBase
{
    private readonly ProjectHubDbContext _context;
    private readonly ITenantContext _tenantContext;

    public EvaluationController(
        ProjectHubDbContext context,
        ITenantContext tenantContext)
    {
        _context = context;
        _tenantContext = tenantContext;
    }

    private void RejectSuperAdmin()
    {
        if (_tenantContext.Role == UserRole.SuperAdmin)
        {
            throw new UnauthorizedAccessException("SuperAdmin is strictly prohibited from accessing private academic evaluation records, assessing projects, or publishing marks.");
        }
    }

    // =========================================================================
    // 1. RUBRICS MANAGEMENT (HOD / COORDINATOR)
    // =========================================================================

    [HttpGet("rubrics")]
    public async Task<ActionResult<List<EvaluationRubricDto>>> GetRubrics([FromQuery] Guid? departmentId, [FromQuery] Guid? trackId)
    {
        if (_tenantContext.Role == UserRole.SuperAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "SuperAdmin cannot access academic evaluation rubrics." });
        }

        var collegeId = _tenantContext.CollegeId!.Value;
        var query = _context.EvaluationRubrics
            .Include(r => r.Criteria)
            .Where(r => r.CollegeId == collegeId && !r.IsDeleted);

        if (departmentId.HasValue) query = query.Where(r => r.DepartmentId == departmentId.Value);
        if (trackId.HasValue) query = query.Where(r => r.AcademicTrackId == trackId.Value);

        var list = await query
            .OrderBy(r => r.Title)
            .Select(r => new EvaluationRubricDto
            {
                Id = r.Id,
                DepartmentId = r.DepartmentId,
                AcademicTrackId = r.AcademicTrackId,
                Title = r.Title,
                CheckpointType = r.CheckpointType,
                TotalMaxMarks = r.TotalMaxMarks,
                IsActive = r.IsActive,
                Criteria = r.Criteria
                    .Where(c => !c.IsDeleted)
                    .OrderBy(c => c.DisplayOrder)
                    .Select(c => new RubricCriterionDto
                    {
                        Id = c.Id,
                        CriterionCode = c.CriterionCode,
                        Title = c.Title,
                        Description = c.Description,
                        MaxMarks = c.MaxMarks,
                        WeightPercentage = c.WeightPercentage,
                        DisplayOrder = c.DisplayOrder,
                        NbaPoMapping = c.NbaPoMapping,
                        BloomTaxonomyLevel = c.BloomTaxonomyLevel
                    })
                    .ToList()
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost("rubrics")]
    [Authorize(Policy = ProjectHubPolicies.FacultyOrAbove)]
    public async Task<ActionResult<EvaluationRubricDto>> CreateOrUpdateRubric([FromBody] SaveRubricRequest request)
    {
        if (_tenantContext.Role == UserRole.SuperAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "SuperAdmin cannot configure academic rubrics." });
        }

        var collegeId = _tenantContext.CollegeId!.Value;
        var callerId = _tenantContext.UserId!.Value;
        var role = _tenantContext.Role;

        if (role != UserRole.HOD && role != UserRole.CollegeAdmin)
        {
            var isCoordinator = await _context.Users.AnyAsync(u => u.Id == callerId && u.IsActive && u.DepartmentId == request.DepartmentId && (_tenantContext.IsProjectCoordinator || u.IsProjectCoordinator) && !u.IsDeleted);
            if (!isCoordinator)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the Department HOD or appointed Coordinator can author evaluation rubrics." });
            }
        }

        var totalCriteriaMarks = request.Criteria.Sum(c => c.MaxMarks);
        if (totalCriteriaMarks != request.TotalMaxMarks)
        {
            return BadRequest(new { message = $"Sum of criterion maximum marks ({totalCriteriaMarks}) must equal total rubric maximum marks ({request.TotalMaxMarks})." });
        }

        var totalWeight = request.Criteria.Sum(c => c.WeightPercentage);
        if (Math.Round(totalWeight, 1) != 100.0m)
        {
            return BadRequest(new { message = $"Total criteria weight percentage must equal 100%. Current sum: {totalWeight}%." });
        }

        var rubric = await _context.EvaluationRubrics
            .Include(r => r.Criteria)
            .FirstOrDefaultAsync(r => r.CollegeId == collegeId &&
                                      r.DepartmentId == request.DepartmentId &&
                                      r.AcademicTrackId == request.AcademicTrackId &&
                                      r.CheckpointType == request.CheckpointType &&
                                      !r.IsDeleted);

        if (rubric == null)
        {
            rubric = new EvaluationRubric
            {
                CollegeId = collegeId,
                DepartmentId = request.DepartmentId,
                AcademicTrackId = request.AcademicTrackId,
                Title = request.Title.Trim(),
                CheckpointType = request.CheckpointType,
                TotalMaxMarks = request.TotalMaxMarks,
                IsActive = true
            };
            await _context.EvaluationRubrics.AddAsync(rubric);
        }
        else
        {
            rubric.Title = request.Title.Trim();
            rubric.TotalMaxMarks = request.TotalMaxMarks;
            _context.EvaluationRubricCriteria.RemoveRange(rubric.Criteria);
        }

        int order = 1;
        foreach (var c in request.Criteria)
        {
            rubric.Criteria.Add(new EvaluationRubricCriterion
            {
                CollegeId = collegeId,
                CriterionCode = c.CriterionCode.Trim(),
                Title = c.Title.Trim(),
                Description = c.Description.Trim(),
                MaxMarks = c.MaxMarks,
                WeightPercentage = c.WeightPercentage,
                DisplayOrder = c.DisplayOrder > 0 ? c.DisplayOrder : order++,
                NbaPoMapping = c.NbaPoMapping?.Trim(),
                BloomTaxonomyLevel = c.BloomTaxonomyLevel?.Trim()
            });
        }

        await _context.SaveChangesAsync();

        return Ok(new EvaluationRubricDto
        {
            Id = rubric.Id,
            DepartmentId = rubric.DepartmentId,
            AcademicTrackId = rubric.AcademicTrackId,
            Title = rubric.Title,
            CheckpointType = rubric.CheckpointType,
            TotalMaxMarks = rubric.TotalMaxMarks,
            IsActive = rubric.IsActive,
            Criteria = rubric.Criteria.OrderBy(c => c.DisplayOrder).Select(c => new RubricCriterionDto
            {
                Id = c.Id,
                CriterionCode = c.CriterionCode,
                Title = c.Title,
                Description = c.Description,
                MaxMarks = c.MaxMarks,
                WeightPercentage = c.WeightPercentage,
                DisplayOrder = c.DisplayOrder,
                NbaPoMapping = c.NbaPoMapping,
                BloomTaxonomyLevel = c.BloomTaxonomyLevel
            }).ToList()
        });
    }

    // =========================================================================
    // 2. VIVA DEFENSE SCHEDULING (COORDINATOR / HOD)
    // =========================================================================

    [HttpPost("schedule")]
    [Authorize(Policy = ProjectHubPolicies.FacultyOrAbove)]
    public async Task<ActionResult<VivaScheduleDto>> ScheduleVivaSession([FromBody] ScheduleVivaRequest request)
    {
        if (_tenantContext.Role == UserRole.SuperAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "SuperAdmin cannot schedule departmental viva defenses." });
        }

        var collegeId = _tenantContext.CollegeId!.Value;
        var callerId = _tenantContext.UserId!.Value;
        var role = _tenantContext.Role;

        var team = await _context.ProjectTeams
            .Include(t => t.Department)
            .Include(t => t.AcademicTrack)
            .FirstOrDefaultAsync(t => t.Id == request.ProjectTeamId && t.CollegeId == collegeId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Project team not found." });

        if (role == UserRole.HOD)
        {
            var caller = await _context.Users.FirstOrDefaultAsync(u => u.Id == callerId);
            if (caller?.DepartmentId != team.DepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "HOD cannot schedule viva defense for teams outside their department." });
            }
        }
        else if (role != UserRole.CollegeAdmin)
        {
            var isCoord = await _context.Users.AnyAsync(u => u.Id == callerId && u.DepartmentId == team.DepartmentId && (_tenantContext.IsProjectCoordinator || u.IsProjectCoordinator) && !u.IsDeleted);
            if (!isCoord)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the Department HOD or appointed Coordinator can schedule viva sessions." });
            }
        }

        if (team.Status != ProjectStatus.ReadyForViva && team.Status != ProjectStatus.ActiveBuild)
        {
            return BadRequest(new { message = $"Team status is '{team.Status}'. Team must be in 'ReadyForViva' status (or approved build) to schedule defense." });
        }

        // Conflict Detection: check if team already has an active conflicting schedule at the same time
        var existingActive = await _context.TeamVivaDefenseSchedules
            .FirstOrDefaultAsync(s => s.ProjectTeamId == team.Id &&
                                      s.Status == VivaScheduleStatus.Scheduled &&
                                      !s.IsDeleted);

        if (existingActive != null)
        {
            return BadRequest(new { message = $"Team is already scheduled for viva defense on {existingActive.ScheduledDateUtc:u} at venue '{existingActive.VenueOrLink}'. Please reschedule instead of creating a duplicate." });
        }

        // Panel conflict detection
        VivaPanel? panel = null;
        if (request.VivaPanelId.HasValue)
        {
            panel = await _context.VivaPanels
                .Include(p => p.Evaluators)
                    .ThenInclude(e => e.EvaluatorUser)
                .FirstOrDefaultAsync(p => p.Id == request.VivaPanelId.Value && p.CollegeId == collegeId && !p.IsDeleted);

            if (panel == null)
            {
                return BadRequest(new { message = "Specified viva defense panel was not found." });
            }

            if (panel.DepartmentId != team.DepartmentId)
            {
                return BadRequest(new { message = "Specified viva panel belongs to a different department." });
            }

            if (team.GuideUserId.HasValue && panel.Evaluators.Any(e => e.EvaluatorUserId == team.GuideUserId.Value))
            {
                return BadRequest(new { message = "Domain Rule Violation: The assigned project guide cannot serve as panel evaluator for their own mentored team." });
            }
        }

        var session = new TeamVivaDefenseSchedule
        {
            CollegeId = collegeId,
            DepartmentId = team.DepartmentId,
            AcademicTrackId = team.AcademicTrackId,
            ProjectTeamId = team.Id,
            VivaPanelId = panel?.Id,
            ScheduledDateUtc = request.ScheduledDateUtc,
            DurationMinutes = request.DurationMinutes,
            VenueOrLink = request.VenueOrLink.Trim(),
            Status = VivaScheduleStatus.Scheduled,
            CandidateInstructions = request.CandidateInstructions?.Trim(),
            ScheduledByUserId = callerId,
            ScheduledAtUtc = DateTime.UtcNow
        };

        await _context.TeamVivaDefenseSchedules.AddAsync(session);

        var auditLog = new PlatformAuditLog
        {
            ActorUserId = callerId,
            Action = "VIVA_DEFENSE_SCHEDULED",
            TargetTenantId = collegeId,
            TargetEntity = "TeamVivaDefenseSchedule",
            MetadataJson = JsonSerializer.Serialize(new
            {
                sessionId = session.Id,
                teamId = team.Id,
                panelId = panel?.Id,
                date = session.ScheduledDateUtc,
                venue = session.VenueOrLink
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();

        return Ok(new VivaScheduleDto
        {
            Id = session.Id,
            CollegeId = session.CollegeId,
            DepartmentId = session.DepartmentId,
            DepartmentName = team.Department?.Name ?? string.Empty,
            AcademicTrackId = session.AcademicTrackId,
            TrackName = team.AcademicTrack?.Name ?? string.Empty,
            ProjectTeamId = session.ProjectTeamId,
            TeamCode = team.TeamCode,
            TeamTitle = team.Title,
            VivaPanelId = session.VivaPanelId,
            PanelName = panel?.PanelName,
            ScheduledDateUtc = session.ScheduledDateUtc,
            DurationMinutes = session.DurationMinutes,
            VenueOrLink = session.VenueOrLink,
            Status = session.Status,
            CandidateInstructions = session.CandidateInstructions,
            EvaluatorNames = panel?.Evaluators.Select(e => e.EvaluatorUser?.FullName ?? "Evaluator").ToList() ?? new List<string>(),
            ScheduledAtUtc = session.ScheduledAtUtc
        });
    }

    [HttpPut("schedule/{sessionId}/reschedule")]
    [Authorize(Policy = ProjectHubPolicies.FacultyOrAbove)]
    public async Task<ActionResult<VivaScheduleDto>> RescheduleVivaSession(Guid sessionId, [FromBody] RescheduleVivaRequest request)
    {
        if (_tenantContext.Role == UserRole.SuperAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "SuperAdmin cannot reschedule departmental viva defenses." });
        }

        var collegeId = _tenantContext.CollegeId!.Value;
        var callerId = _tenantContext.UserId!.Value;
        var role = _tenantContext.Role;

        var session = await _context.TeamVivaDefenseSchedules
            .Include(s => s.ProjectTeam)
                .ThenInclude(t => t!.Department)
            .Include(s => s.ProjectTeam)
                .ThenInclude(t => t!.AcademicTrack)
            .Include(s => s.VivaPanel)
                .ThenInclude(p => p!.Evaluators)
                    .ThenInclude(e => e.EvaluatorUser)
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.CollegeId == collegeId && !s.IsDeleted);

        if (session == null) return NotFound(new { message = "Scheduled viva defense session not found." });

        if (role == UserRole.HOD)
        {
            var caller = await _context.Users.FirstOrDefaultAsync(u => u.Id == callerId);
            if (caller?.DepartmentId != session.DepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "HOD cannot reschedule defense sessions outside their department." });
            }
        }
        else if (role != UserRole.CollegeAdmin)
        {
            var isCoord = await _context.Users.AnyAsync(u => u.Id == callerId && u.DepartmentId == session.DepartmentId && (_tenantContext.IsProjectCoordinator || u.IsProjectCoordinator) && !u.IsDeleted);
            if (!isCoord)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the Department HOD or appointed Coordinator can reschedule viva sessions." });
            }
        }

        if (session.Status != VivaScheduleStatus.Scheduled && session.Status != VivaScheduleStatus.Rescheduled)
        {
            return BadRequest(new { message = $"Cannot reschedule session in status '{session.Status}'." });
        }

        var previousDate = session.ScheduledDateUtc;
        session.ScheduledDateUtc = request.NewScheduledDateUtc;
        if (request.NewDurationMinutes.HasValue) session.DurationMinutes = request.NewDurationMinutes.Value;
        if (!string.IsNullOrWhiteSpace(request.NewVenueOrLink)) session.VenueOrLink = request.NewVenueOrLink.Trim();
        session.Status = VivaScheduleStatus.Rescheduled;
        session.RescheduledAtUtc = DateTime.UtcNow;

        var auditLog = new PlatformAuditLog
        {
            ActorUserId = callerId,
            Action = "VIVA_DEFENSE_RESCHEDULED",
            TargetTenantId = collegeId,
            TargetEntity = "TeamVivaDefenseSchedule",
            MetadataJson = JsonSerializer.Serialize(new
            {
                sessionId = session.Id,
                teamId = session.ProjectTeamId,
                previousDate,
                newDate = session.ScheduledDateUtc,
                reason = request.Reason
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();

        return Ok(new VivaScheduleDto
        {
            Id = session.Id,
            CollegeId = session.CollegeId,
            DepartmentId = session.DepartmentId,
            DepartmentName = session.ProjectTeam?.Department?.Name ?? string.Empty,
            AcademicTrackId = session.AcademicTrackId,
            TrackName = session.ProjectTeam?.AcademicTrack?.Name ?? string.Empty,
            ProjectTeamId = session.ProjectTeamId,
            TeamCode = session.ProjectTeam?.TeamCode ?? string.Empty,
            TeamTitle = session.ProjectTeam?.Title ?? string.Empty,
            VivaPanelId = session.VivaPanelId,
            PanelName = session.VivaPanel?.PanelName,
            ScheduledDateUtc = session.ScheduledDateUtc,
            DurationMinutes = session.DurationMinutes,
            VenueOrLink = session.VenueOrLink,
            Status = session.Status,
            CandidateInstructions = session.CandidateInstructions,
            EvaluatorNames = session.VivaPanel?.Evaluators.Select(e => e.EvaluatorUser?.FullName ?? "Evaluator").ToList() ?? new List<string>(),
            ScheduledAtUtc = session.ScheduledAtUtc,
            RescheduledAtUtc = session.RescheduledAtUtc
        });
    }

    [HttpDelete("schedule/{sessionId}/cancel")]
    [Authorize(Policy = ProjectHubPolicies.FacultyOrAbove)]
    public async Task<IActionResult> CancelVivaSession(Guid sessionId, [FromBody] CancelVivaRequest request)
    {
        if (_tenantContext.Role == UserRole.SuperAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "SuperAdmin cannot cancel departmental viva defenses." });
        }

        var collegeId = _tenantContext.CollegeId!.Value;
        var callerId = _tenantContext.UserId!.Value;
        var role = _tenantContext.Role;

        var session = await _context.TeamVivaDefenseSchedules
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.CollegeId == collegeId && !s.IsDeleted);

        if (session == null) return NotFound(new { message = "Scheduled viva defense session not found." });

        if (role == UserRole.HOD)
        {
            var caller = await _context.Users.FirstOrDefaultAsync(u => u.Id == callerId);
            if (caller?.DepartmentId != session.DepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "HOD cannot cancel defense sessions outside their department." });
            }
        }
        else if (role != UserRole.CollegeAdmin)
        {
            var isCoord = await _context.Users.AnyAsync(u => u.Id == callerId && u.DepartmentId == session.DepartmentId && (_tenantContext.IsProjectCoordinator || u.IsProjectCoordinator) && !u.IsDeleted);
            if (!isCoord)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the Department HOD or appointed Coordinator can cancel viva sessions." });
            }
        }

        session.Status = VivaScheduleStatus.Cancelled;
        session.CancellationReason = request.CancellationReason.Trim();

        var auditLog = new PlatformAuditLog
        {
            ActorUserId = callerId,
            Action = "VIVA_DEFENSE_CANCELLED",
            TargetTenantId = collegeId,
            TargetEntity = "TeamVivaDefenseSchedule",
            MetadataJson = JsonSerializer.Serialize(new
            {
                sessionId = session.Id,
                teamId = session.ProjectTeamId,
                reason = request.CancellationReason
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();
        return Ok(new { success = true, sessionId = session.Id, status = session.Status });
    }

    [HttpGet("schedules")]
    public async Task<ActionResult<List<VivaScheduleDto>>> GetSchedules([FromQuery] Guid? departmentId, [FromQuery] Guid? trackId)
    {
        if (_tenantContext.Role == UserRole.SuperAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "SuperAdmin cannot view academic defense schedules." });
        }

        var collegeId = _tenantContext.CollegeId!.Value;
        var query = _context.TeamVivaDefenseSchedules
            .Include(s => s.ProjectTeam)
                .ThenInclude(t => t!.Department)
            .Include(s => s.ProjectTeam)
                .ThenInclude(t => t!.AcademicTrack)
            .Include(s => s.VivaPanel)
                .ThenInclude(p => p!.Evaluators)
                    .ThenInclude(e => e.EvaluatorUser)
            .Where(s => s.CollegeId == collegeId && !s.IsDeleted);

        if (departmentId.HasValue) query = query.Where(s => s.DepartmentId == departmentId.Value);
        if (trackId.HasValue) query = query.Where(s => s.AcademicTrackId == trackId.Value);

        var list = await query
            .OrderBy(s => s.ScheduledDateUtc)
            .Select(s => new VivaScheduleDto
            {
                Id = s.Id,
                CollegeId = s.CollegeId,
                DepartmentId = s.DepartmentId,
                DepartmentName = s.ProjectTeam != null && s.ProjectTeam.Department != null ? s.ProjectTeam.Department.Name : string.Empty,
                AcademicTrackId = s.AcademicTrackId,
                TrackName = s.ProjectTeam != null && s.ProjectTeam.AcademicTrack != null ? s.ProjectTeam.AcademicTrack.Name : string.Empty,
                ProjectTeamId = s.ProjectTeamId,
                TeamCode = s.ProjectTeam != null ? s.ProjectTeam.TeamCode : string.Empty,
                TeamTitle = s.ProjectTeam != null ? s.ProjectTeam.Title : string.Empty,
                VivaPanelId = s.VivaPanelId,
                PanelName = s.VivaPanel != null ? s.VivaPanel.PanelName : null,
                ScheduledDateUtc = s.ScheduledDateUtc,
                DurationMinutes = s.DurationMinutes,
                VenueOrLink = s.VenueOrLink,
                Status = s.Status,
                CandidateInstructions = s.CandidateInstructions,
                CancellationReason = s.CancellationReason,
                EvaluatorNames = s.VivaPanel != null ? s.VivaPanel.Evaluators.Where(e => !e.IsDeleted && e.EvaluatorUser != null).Select(e => e.EvaluatorUser!.FullName).ToList() : new List<string>(),
                ScheduledAtUtc = s.ScheduledAtUtc,
                RescheduledAtUtc = s.RescheduledAtUtc
            })
            .ToListAsync();

        return Ok(list);
    }

    // =========================================================================
    // 3. EVALUATOR ASSESSMENTS & ASSIGNED TEAMS
    // =========================================================================

    [HttpGet("assigned")]
    [Authorize(Policy = ProjectHubPolicies.FacultyOrAbove)]
    public async Task<ActionResult<List<AssignedDefenseSessionDto>>> GetAssignedTeams()
    {
        if (_tenantContext.Role == UserRole.SuperAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "SuperAdmin cannot access defense evaluations." });
        }

        var collegeId = _tenantContext.CollegeId!.Value;
        var facultyId = _tenantContext.UserId!.Value;
        var role = _tenantContext.Role;

        // Find panels where caller is appointed evaluator
        var panelIds = await _context.VivaPanelEvaluators
            .Where(pe => pe.CollegeId == collegeId && pe.EvaluatorUserId == facultyId && !pe.IsDeleted)
            .Select(pe => pe.VivaPanelId)
            .ToListAsync();

        var query = _context.ProjectTeams
            .Include(t => t.GuideUser)
            .Include(t => t.Members)
                .ThenInclude(m => m.User)
            .Where(t => t.CollegeId == collegeId && !t.IsDeleted);

        if (role == UserRole.HOD)
        {
            var caller = await _context.Users.FirstOrDefaultAsync(u => u.Id == facultyId);
            if (caller?.DepartmentId != null)
            {
                query = query.Where(t => t.DepartmentId == caller.DepartmentId.Value);
            }
        }
        else
        {
            // Must be appointed to a panel for the team, or explicitly scheduled with panel
            query = query.Where(t => _context.TeamVivaDefenseSchedules.Any(s => s.ProjectTeamId == t.Id && s.VivaPanelId.HasValue && panelIds.Contains(s.VivaPanelId.Value) && !s.IsDeleted)
                                  || _context.VivaPanels.Any(p => p.DepartmentId == t.DepartmentId && p.AcademicTrackId == t.AcademicTrackId && panelIds.Contains(p.Id) && !p.IsDeleted));
        }

        var teams = await query.OrderBy(t => t.TeamCode).ToListAsync();
        var result = new List<AssignedDefenseSessionDto>();

        foreach (var t in teams)
        {
            var schedule = await _context.TeamVivaDefenseSchedules
                .Where(s => s.ProjectTeamId == t.Id && !s.IsDeleted)
                .OrderByDescending(s => s.ScheduledDateUtc)
                .FirstOrDefaultAsync();

            var eval = await _context.VivaEvaluations
                .FirstOrDefaultAsync(e => e.ProjectTeamId == t.Id && e.CheckpointType == CheckpointType.FinalViva && !e.IsDeleted);

            var isConflict = t.GuideUserId == facultyId;

            var stage = EvaluationStage.ReadyForViva;
            if (eval?.IsPublished == true) stage = EvaluationStage.Published;
            else if (eval?.IsLocked == true) stage = EvaluationStage.Evaluated;
            else if (eval != null) stage = EvaluationStage.EvaluationInProgress;
            else if (schedule != null && schedule.Status == VivaScheduleStatus.Scheduled) stage = EvaluationStage.Scheduled;

            result.Add(new AssignedDefenseSessionDto
            {
                TeamId = t.Id,
                TeamCode = t.TeamCode,
                Title = t.Title,
                Abstract = t.Abstract,
                DomainTag = t.DomainTag,
                GuideUserId = t.GuideUserId,
                GuideName = t.GuideUser?.FullName,
                IsGuideConflict = isConflict,
                Status = t.Status,
                EvaluationStage = stage,
                ScheduledDateUtc = schedule?.ScheduledDateUtc,
                DurationMinutes = schedule?.DurationMinutes,
                VenueOrLink = schedule?.VenueOrLink,
                HasEvaluation = eval != null,
                IsEvaluationLocked = eval?.IsLocked ?? false,
                SharedTotalScore = eval?.SharedTotalScore,
                Outcome = eval?.Outcome ?? VivaOutcome.Pending,
                IsPublished = eval?.IsPublished ?? false,
                Members = t.Members.Where(m => !m.IsDeleted).Select(m => new TeamMemberDto
                {
                    UserId = m.UserId,
                    FullName = m.User?.FullName ?? string.Empty,
                    EnrollmentCode = m.User?.EnrollmentOrEmployeeCode ?? string.Empty,
                    IsTeamLead = m.IsTeamLead,
                    ModuleResponsibility = m.ModuleResponsibility
                }).ToList()
            });
        }

        return Ok(result);
    }

    [HttpPost("assessments/submit")]
    [Authorize(Policy = ProjectHubPolicies.FacultyOrAbove)]
    public async Task<IActionResult> SubmitAssessment([FromBody] SubmitEvaluatorAssessmentRequest request)
    {
        if (_tenantContext.Role == UserRole.SuperAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "SuperAdmin cannot evaluate projects or award marks." });
        }

        var collegeId = _tenantContext.CollegeId!.Value;
        var evaluatorId = _tenantContext.UserId!.Value;
        var role = _tenantContext.Role;

        var team = await _context.ProjectTeams
            .Include(t => t.AcademicTrack)
            .Include(t => t.Members)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(t => t.Id == request.ProjectTeamId && t.CollegeId == collegeId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Project team not found." });

        // Conflict-of-interest check: guide cannot be panel evaluator for own team
        if (team.GuideUserId == evaluatorId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Conflict of Interest: The assigned project guide is strictly prohibited from awarding external panel viva marks for their own mentored team."
            });
        }

        // Authorization check: must be appointed panel evaluator or HOD of department
        var isHod = role == UserRole.HOD;
        if (isHod)
        {
            var caller = await _context.Users.FirstOrDefaultAsync(u => u.Id == evaluatorId);
            if (caller?.DepartmentId != team.DepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "HOD cannot evaluate teams outside their academic department." });
            }
        }
        else
        {
            var isAppointed = await _context.VivaPanelEvaluators
                .Include(pe => pe.VivaPanel)
                .AnyAsync(pe => pe.CollegeId == collegeId &&
                               pe.EvaluatorUserId == evaluatorId &&
                               !pe.IsDeleted &&
                               pe.VivaPanel != null &&
                               !pe.VivaPanel.IsDeleted &&
                               pe.VivaPanel.DepartmentId == team.DepartmentId &&
                               pe.VivaPanel.AcademicTrackId == team.AcademicTrackId);

            if (!isAppointed)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "You are not appointed as a panel evaluator for this team's academic track."
                });
            }
        }

        // Check if evaluation already exists
        var existingEval = await _context.VivaEvaluations
            .Include(e => e.IndividualScores)
            .FirstOrDefaultAsync(e => e.ProjectTeamId == team.Id &&
                                      e.CheckpointType == request.CheckpointType &&
                                      e.CollegeId == collegeId &&
                                      !e.IsDeleted);

        if (existingEval != null && existingEval.IsLocked)
        {
            return BadRequest(new { message = "This evaluation is formally locked. To modify submitted marks, an authorized HOD grade unlock exception must be approved." });
        }

        if (existingEval != null && existingEval.IsPublished)
        {
            return BadRequest(new { message = "Evaluation marks are already published. Modifications require an audited post-publication correction." });
        }

        // Marks validation
        foreach (var cs in request.CriterionScores)
        {
            if (cs.AwardedMarks < 0 || cs.AwardedMarks > cs.MaxMarks)
            {
                return BadRequest(new { message = $"Marks for '{cs.Title}' ({cs.AwardedMarks}) must be between 0 and {cs.MaxMarks}." });
            }
        }

        var sharedTotal = request.CriterionScores.Sum(c => c.AwardedMarks);
        var activeMembers = team.Members.Where(m => m.IsActive && !m.IsDeleted).ToList();

        if (!request.IsDraft)
        {
            if (request.CriterionScores.Count == 0)
            {
                return BadRequest(new { message = "All required rubric criteria must be evaluated for final submission." });
            }

            var evaluatedUserIds = request.StudentScores.Select(s => s.StudentUserId).ToHashSet();
            if (activeMembers.Any(m => !evaluatedUserIds.Contains(m.UserId)))
            {
                return BadRequest(new { message = "Every active team member must receive an individual contribution score for final viva evaluation." });
            }
        }

        var sharedWeight = team.AcademicTrack?.SharedProjectRubricPct ?? 60m;
        var individualWeight = team.AcademicTrack?.IndividualStudentRubricPct ?? 40m;

        if (existingEval == null)
        {
            existingEval = new VivaEvaluation
            {
                CollegeId = collegeId,
                ProjectTeamId = team.Id,
                EvaluatorUserId = evaluatorId,
                CheckpointType = request.CheckpointType,
                SharedRubricScoresJson = JsonSerializer.Serialize(request.CriterionScores),
                SharedTotalScore = sharedTotal,
                GeneralRemarks = request.GeneralRemarks.Trim(),
                IsLocked = !request.IsDraft,
                LockedAtUtc = !request.IsDraft ? DateTime.UtcNow : null,
                RubricSnapshotJson = JsonSerializer.Serialize(request.CriterionScores)
            };

            foreach (var studentScore in request.StudentScores)
            {
                var indScore = new IndividualStudentScore
                {
                    CollegeId = collegeId,
                    StudentUserId = studentScore.StudentUserId,
                    ModuleOwnershipScore = studentScore.ModuleOwnershipScore,
                    VivaQaScore = studentScore.VivaQaScore,
                    LogDisciplineScore = studentScore.LogDisciplineScore
                };
                indScore.ComputeFinalMark(sharedTotal, sharedWeight, individualWeight);
                existingEval.IndividualScores.Add(indScore);
            }

            await _context.VivaEvaluations.AddAsync(existingEval);
        }
        else
        {
            existingEval.EvaluatorUserId = evaluatorId;
            existingEval.SharedRubricScoresJson = JsonSerializer.Serialize(request.CriterionScores);
            existingEval.SharedTotalScore = sharedTotal;
            existingEval.GeneralRemarks = request.GeneralRemarks.Trim();
            existingEval.IsLocked = !request.IsDraft;
            existingEval.LockedAtUtc = !request.IsDraft ? DateTime.UtcNow : null;
            if (string.IsNullOrWhiteSpace(existingEval.RubricSnapshotJson))
            {
                existingEval.RubricSnapshotJson = JsonSerializer.Serialize(request.CriterionScores);
            }

            foreach (var studentScore in request.StudentScores)
            {
                var existingStudent = existingEval.IndividualScores.FirstOrDefault(s => s.StudentUserId == studentScore.StudentUserId);
                if (existingStudent != null)
                {
                    existingStudent.ModuleOwnershipScore = studentScore.ModuleOwnershipScore;
                    existingStudent.VivaQaScore = studentScore.VivaQaScore;
                    existingStudent.LogDisciplineScore = studentScore.LogDisciplineScore;
                    existingStudent.ComputeFinalMark(sharedTotal, sharedWeight, individualWeight);
                }
                else
                {
                    var indScore = new IndividualStudentScore
                    {
                        CollegeId = collegeId,
                        StudentUserId = studentScore.StudentUserId,
                        ModuleOwnershipScore = studentScore.ModuleOwnershipScore,
                        VivaQaScore = studentScore.VivaQaScore,
                        LogDisciplineScore = studentScore.LogDisciplineScore
                    };
                    indScore.ComputeFinalMark(sharedTotal, sharedWeight, individualWeight);
                    existingEval.IndividualScores.Add(indScore);
                }
            }
        }

        var auditLog = new PlatformAuditLog
        {
            ActorUserId = evaluatorId,
            Action = request.IsDraft ? "EVALUATOR_ASSESSMENT_DRAFT_SAVED" : "EVALUATOR_ASSESSMENT_SUBMITTED",
            TargetTenantId = collegeId,
            TargetEntity = "VivaEvaluation",
            MetadataJson = JsonSerializer.Serialize(new
            {
                teamId = team.Id,
                checkpoint = request.CheckpointType.ToString(),
                sharedScore = sharedTotal,
                isDraft = request.IsDraft,
                isLocked = existingEval.IsLocked
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            evaluationId = existingEval.Id,
            sharedTotalScore = existingEval.SharedTotalScore,
            isLocked = existingEval.IsLocked,
            isDraft = request.IsDraft
        });
    }

    // =========================================================================
    // 4. MODERATION & PUBLICATION (HOD / DEPARTMENT AUTHORITY)
    // =========================================================================

    [HttpPost("teams/{teamId}/publish")]
    [Authorize(Policy = ProjectHubPolicies.FacultyOrAbove)]
    public async Task<IActionResult> PublishEvaluation(Guid teamId, [FromBody] PublishEvaluationRequest request)
    {
        if (_tenantContext.Role == UserRole.SuperAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "SuperAdmin cannot finalize or publish academic grades." });
        }

        var collegeId = _tenantContext.CollegeId!.Value;
        var callerId = _tenantContext.UserId!.Value;
        var role = _tenantContext.Role;

        var team = await _context.ProjectTeams
            .Include(t => t.Evaluations)
                .ThenInclude(e => e.IndividualScores)
            .FirstOrDefaultAsync(t => t.Id == teamId && t.CollegeId == collegeId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Project team not found." });

        if (role == UserRole.HOD)
        {
            var caller = await _context.Users.FirstOrDefaultAsync(u => u.Id == callerId);
            if (caller?.DepartmentId != team.DepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "HOD cannot publish evaluations outside their academic department." });
            }
        }
        else if (role != UserRole.CollegeAdmin)
        {
            var isCoord = await _context.Users.AnyAsync(u => u.Id == callerId && u.DepartmentId == team.DepartmentId && (_tenantContext.IsProjectCoordinator || u.IsProjectCoordinator) && !u.IsDeleted);
            if (!isCoord)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the Department HOD or appointed Coordinator can publish final grades." });
            }
        }

        var eval = team.Evaluations.FirstOrDefault(e => e.CheckpointType == CheckpointType.FinalViva && !e.IsDeleted);
        if (eval == null)
        {
            return BadRequest(new { message = "No final viva evaluation exists for this team. An assessment must be completed before publication." });
        }

        if (!eval.IsLocked)
        {
            return BadRequest(new { message = "The evaluator has not submitted a final assessment (evaluation is still in draft). Finalization requires a submitted assessment." });
        }

        if (request.Outcome == VivaOutcome.Pending)
        {
            return BadRequest(new { message = "Published evaluation outcome must be Pass, Fail, or Re-Viva." });
        }

        var publishedAt = DateTime.UtcNow;
        eval.IsPublished = true;
        eval.PublishedAtUtc = publishedAt;
        eval.PublishedByUserId = callerId;
        eval.Outcome = request.Outcome;
        eval.ModerationRemarks = request.Remarks.Trim();
        eval.ModeratedByUserId = callerId;
        eval.ModeratedAtUtc = publishedAt;

        if (request.Outcome == VivaOutcome.Pass)
        {
            team.Status = ProjectStatus.Completed;
        }

        var auditLog = new PlatformAuditLog
        {
            ActorUserId = callerId,
            Action = "EVALUATION_PUBLISHED",
            TargetTenantId = collegeId,
            TargetEntity = "VivaEvaluation",
            MetadataJson = JsonSerializer.Serialize(new
            {
                teamId = team.Id,
                evaluationId = eval.Id,
                outcome = request.Outcome.ToString(),
                sharedTotalScore = eval.SharedTotalScore,
                remarks = request.Remarks,
                teamStatusTransition = team.Status.ToString()
            }),
            OccurredAtUtc = publishedAt
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            teamId = team.Id,
            evaluationId = eval.Id,
            outcome = eval.Outcome,
            isPublished = eval.IsPublished,
            publishedAtUtc = eval.PublishedAtUtc,
            teamStatus = team.Status
        });
    }

    [HttpPost("teams/{teamId}/correct")]
    [Authorize(Policy = ProjectHubPolicies.FacultyOrAbove)]
    public async Task<IActionResult> CorrectPublishedEvaluation(Guid teamId, [FromBody] CorrectEvaluationRequest request)
    {
        if (_tenantContext.Role == UserRole.SuperAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "SuperAdmin cannot perform academic grade corrections." });
        }

        var collegeId = _tenantContext.CollegeId!.Value;
        var callerId = _tenantContext.UserId!.Value;
        var role = _tenantContext.Role;

        var team = await _context.ProjectTeams
            .Include(t => t.AcademicTrack)
            .Include(t => t.Evaluations)
                .ThenInclude(e => e.IndividualScores)
            .FirstOrDefaultAsync(t => t.Id == teamId && t.CollegeId == collegeId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Project team not found." });

        if (role != UserRole.HOD && role != UserRole.CollegeAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the Department HOD or College Admin can execute post-publication grade corrections." });
        }

        if (role == UserRole.HOD)
        {
            var caller = await _context.Users.FirstOrDefaultAsync(u => u.Id == callerId);
            if (caller?.DepartmentId != team.DepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "HOD cannot correct evaluations outside their academic department." });
            }
        }

        var eval = team.Evaluations.FirstOrDefault(e => e.CheckpointType == CheckpointType.FinalViva && !e.IsDeleted);
        if (eval == null) return NotFound(new { message = "Evaluation record not found for this team." });

        var previousShared = eval.SharedTotalScore;
        var previousOutcome = eval.Outcome;

        if (request.NewSharedTotalScore.HasValue) eval.SharedTotalScore = request.NewSharedTotalScore.Value;
        if (request.NewOutcome.HasValue) eval.Outcome = request.NewOutcome.Value;
        if (!string.IsNullOrWhiteSpace(request.NewRemarks)) eval.ModerationRemarks = request.NewRemarks.Trim();

        var sharedWeight = team.AcademicTrack?.SharedProjectRubricPct ?? 60m;
        var individualWeight = team.AcademicTrack?.IndividualStudentRubricPct ?? 40m;

        if (request.StudentCorrections != null)
        {
            foreach (var sc in request.StudentCorrections)
            {
                var ind = eval.IndividualScores.FirstOrDefault(s => s.StudentUserId == sc.StudentUserId);
                if (ind != null)
                {
                    ind.ModuleOwnershipScore = sc.ModuleOwnershipScore;
                    ind.VivaQaScore = sc.VivaQaScore;
                    ind.LogDisciplineScore = sc.LogDisciplineScore;
                    ind.ComputeFinalMark(eval.SharedTotalScore, sharedWeight, individualWeight);
                }
            }
        }

        if (eval.Outcome == VivaOutcome.Pass)
        {
            team.Status = ProjectStatus.Completed;
        }

        var exceptionLog = new ExceptionAuditLog
        {
            CollegeId = collegeId,
            DepartmentId = team.DepartmentId,
            ProjectTeamId = team.Id,
            RequestedByUserId = callerId,
            ApprovedByUserId = callerId,
            ApprovedAtUtc = DateTime.UtcNow,
            ActionType = ExceptionActionType.IndividualReVivaUnlock,
            Reason = $"[POST-PUBLICATION CORRECTION] {request.Reason.Trim()}",
            PreviousValueJson = JsonSerializer.Serialize(new { sharedScore = previousShared, outcome = previousOutcome.ToString() }),
            NewValueJson = JsonSerializer.Serialize(new { sharedScore = eval.SharedTotalScore, outcome = eval.Outcome.ToString() })
        };
        await _context.ExceptionAuditLogs.AddAsync(exceptionLog);

        var auditLog = new PlatformAuditLog
        {
            ActorUserId = callerId,
            Action = "EVALUATION_CORRECTION_APPLIED",
            TargetTenantId = collegeId,
            TargetEntity = "VivaEvaluation",
            MetadataJson = JsonSerializer.Serialize(new
            {
                teamId = team.Id,
                evaluationId = eval.Id,
                reason = request.Reason,
                previousShared,
                newShared = eval.SharedTotalScore,
                newOutcome = eval.Outcome.ToString()
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            teamId = team.Id,
            newSharedScore = eval.SharedTotalScore,
            newOutcome = eval.Outcome,
            correctedAtUtc = DateTime.UtcNow
        });
    }
}
