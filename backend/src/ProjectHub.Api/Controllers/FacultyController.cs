using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using ProjectHub.Api.Authorization;
using ProjectHub.Application.Common.Models;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;

namespace ProjectHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = ProjectHubPolicies.FacultyOrAbove)]
public class FacultyController : ControllerBase
{
    private readonly ProjectHubDbContext _context;
    private readonly ITenantContext _tenantContext;

    public FacultyController(ProjectHubDbContext context, ITenantContext tenantContext)
    {
        _context = context;
        _tenantContext = tenantContext;
    }

    private async Task<UserAccount?> ResolveCurrentUserAsync()
    {
        var collegeId = _tenantContext.CollegeId;
        var userId = _tenantContext.UserId;
        if (!collegeId.HasValue || !userId.HasValue) return null;
        return await _context.Users.FirstOrDefaultAsync(u => u.Id == userId.Value && u.CollegeId == collegeId.Value && !u.IsDeleted);
    }

    private bool CanFacultyOrAuthorityManageTeam(UserAccount? caller, ProjectTeam team, Guid facultyId)
    {
        if (caller == null) return false;

        // 1. Assigned project guide
        if (team.GuideUserId == facultyId) return true;

        // 2. Department HOD strictly within their own department
        if (caller.Role == UserRole.HOD && caller.DepartmentId.HasValue && caller.DepartmentId.Value == team.DepartmentId) return true;

        // 3. College Admin per institutional policy
        if (caller.Role == UserRole.CollegeAdmin) return true;

        // SuperAdmin is strictly prohibited from automatic college academic data overrides
        return false;
    }

    [HttpGet("action-queue")]
    public async Task<ActionResult<ActionQueueDto>> GetActionQueue()
    {
        var facultyId = _tenantContext.UserId!.Value;

        // 1. Pending Friday weekly logs from guided teams
        var pendingLogs = await _context.WeeklyLogbooks
            .Include(w => w.ProjectTeam)
            .Where(w => w.ProjectTeam != null &&
                        w.ProjectTeam.GuideUserId == facultyId &&
                        !w.IsVerified &&
                        !w.IsDeleted)
            .OrderBy(w => w.CreatedAtUtc)
            .Select(w => new ActionQueueItemDto
            {
                ItemId = w.Id,
                Type = "LogVerification",
                ProjectTeamId = w.ProjectTeamId,
                TeamCode = w.ProjectTeam!.TeamCode,
                TeamTitle = w.ProjectTeam.Title,
                Description = $"Week {w.WeekNumber} Friday discipline log: {w.AccomplishmentsSummary}",
                SubmittedAtUtc = w.CreatedAtUtc
            })
            .ToListAsync();

        // 2. Pending team proposals awaiting guide endorsement
        var pendingProposals = await _context.ProjectTeams
            .Where(t => t.GuideUserId == facultyId &&
                        t.Status == ProjectStatus.PendingGuide &&
                        !t.IsDeleted)
            .OrderBy(t => t.CreatedAtUtc)
            .Select(t => new ActionQueueItemDto
            {
                ItemId = t.Id,
                Type = "ProposalEndorsement",
                ProjectTeamId = t.Id,
                TeamCode = t.TeamCode,
                TeamTitle = t.Title,
                Description = $"Initial proposal review & guide endorsement: {t.Title}",
                SubmittedAtUtc = t.CreatedAtUtc
            })
            .ToListAsync();

        var allItems = pendingLogs.Concat(pendingProposals).OrderBy(i => i.SubmittedAtUtc).ToList();

        return Ok(new ActionQueueDto
        {
            PendingLogsCount = pendingLogs.Count,
            PendingProposalsCount = pendingProposals.Count,
            Items = allItems
        });
    }

    [HttpGet("mentored-teams")]
    public async Task<ActionResult<List<ProjectProposalDto>>> GetMentoredTeams()
    {
        var facultyId = _tenantContext.UserId!.Value;

        var teams = await _context.ProjectTeams
            .Include(t => t.Members)
            .Where(t => t.GuideUserId == facultyId && !t.IsDeleted)
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
                GuideName = null,
                MemberCount = t.Members.Count(m => !m.IsDeleted),
                SimilarityScorePct = t.SimilarityScorePct,
                SimilarProjectCode = t.SimilarProjectCode
            })
            .ToListAsync();

        return Ok(teams);
    }

    [HttpPost("logs/{logId}/verify")]
    public async Task<IActionResult> VerifyLog(Guid logId, [FromBody] VerifyLogRequest request)
    {
        var facultyId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var log = await _context.WeeklyLogbooks
            .Include(l => l.ProjectTeam)
            .FirstOrDefaultAsync(l => l.Id == logId && l.CollegeId == collegeId && !l.IsDeleted);

        if (log == null) return NotFound(new { message = "Weekly log not found." });

        var caller = await ResolveCurrentUserAsync();
        if (log.ProjectTeam == null || !CanFacultyOrAuthorityManageTeam(caller, log.ProjectTeam, facultyId))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the assigned faculty mentor or authorized department authority can verify student progress logs." });
        }

        var isRevision = string.Equals(request.Decision, "NeedsRevision", StringComparison.OrdinalIgnoreCase) || request.IsApproved == false;

        if (isRevision)
        {
            if (string.IsNullOrWhiteSpace(request.Remarks) || request.Remarks.Trim().Length < 5)
            {
                return BadRequest(new { message = "Detailed remarks explaining the required revision are mandatory." });
            }

            log.IsVerified = false;
            log.VerifiedByUserId = facultyId;
            log.VerifiedAtUtc = DateTime.UtcNow;
            log.MentorRemarks = request.Remarks.Trim();

            await _context.SaveChangesAsync();
            return Ok(new
            {
                success = true,
                logId = log.Id,
                isVerified = false,
                status = "NeedsRevision",
                mentorRemarks = log.MentorRemarks
            });
        }

        log.IsVerified = true;
        log.VerifiedByUserId = facultyId;
        log.VerifiedAtUtc = DateTime.UtcNow;
        log.MentorRemarks = request.Remarks?.Trim();

        await _context.SaveChangesAsync();
        return Ok(new
        {
            success = true,
            logId = log.Id,
            isVerified = true,
            status = "Approved",
            mentorRemarks = log.MentorRemarks
        });
    }

    [HttpPost("proposals/{teamId}/endorse")]
    public async Task<IActionResult> EndorseProposal(Guid teamId)
    {
        var facultyId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var team = await _context.ProjectTeams.FirstOrDefaultAsync(t => t.Id == teamId && t.CollegeId == collegeId && !t.IsDeleted);
        if (team == null) return NotFound(new { message = "Team proposal not found." });

        var caller = await ResolveCurrentUserAsync();
        if (!CanFacultyOrAuthorityManageTeam(caller, team, facultyId))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the appointed guide or authorized department authority can endorse the proposal." });
        }

        if (team.Status != ProjectStatus.PendingGuide)
        {
            return BadRequest(new { message = $"Only proposals in PendingGuide status can be endorsed. Current status is {team.Status}." });
        }

        var previousStatus = team.Status;
        team.Status = ProjectStatus.PendingCoordinator;

        var audit = new PlatformAuditLog
        {
            ActorUserId = facultyId,
            ActorEmail = caller?.Email ?? "faculty@colabex.edu",
            Action = "FACULTY_PROPOSAL_ENDORSED",
            TargetTenantId = collegeId,
            TargetEntity = "ProjectTeam",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                teamId = team.Id,
                teamCode = team.TeamCode,
                previousStatus = previousStatus.ToString(),
                newStatus = team.Status.ToString()
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(audit);

        await _context.SaveChangesAsync();

        return Ok(new { success = true, teamId = team.Id, status = team.Status });
    }

    [HttpPost("proposals/{teamId}/return")]
    public async Task<IActionResult> ReturnProposal(Guid teamId, [FromBody] ReturnProposalRequest? request)
    {
        var facultyId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var team = await _context.ProjectTeams.FirstOrDefaultAsync(t => t.Id == teamId && t.CollegeId == collegeId && !t.IsDeleted);
        if (team == null) return NotFound(new { message = "Team proposal not found." });

        var caller = await ResolveCurrentUserAsync();
        if (!CanFacultyOrAuthorityManageTeam(caller, team, facultyId))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the assigned guide or authorized department authority can return the proposal for revision." });
        }

        if (team.Status != ProjectStatus.PendingGuide)
        {
            return BadRequest(new { message = $"Only proposals in PendingGuide status can be returned. Current status is {team.Status}." });
        }

        var remarks = request?.Remarks ?? request?.Reason;
        if (string.IsNullOrWhiteSpace(remarks) || remarks.Trim().Length < 5)
        {
            return BadRequest(new { message = "Mandatory remarks of at least 5 characters required when returning a proposal for revision." });
        }

        var previousStatus = team.Status;
        team.Status = ProjectStatus.Draft;
        team.IsRosterLocked = false;
        // GuideUserId is preserved for revision resubmission to the same mentor

        var audit = new PlatformAuditLog
        {
            ActorUserId = facultyId,
            ActorEmail = caller?.Email ?? "faculty@colabex.edu",
            Action = "FACULTY_PROPOSAL_RETURNED",
            TargetTenantId = collegeId,
            TargetEntity = "ProjectTeam",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                teamId = team.Id,
                teamCode = team.TeamCode,
                previousStatus = previousStatus.ToString(),
                newStatus = ProjectStatus.Draft.ToString(),
                remarks = remarks.Trim()
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(audit);

        var excAudit = new ExceptionAuditLog
        {
            CollegeId = collegeId,
            DepartmentId = team.DepartmentId,
            ProjectTeamId = team.Id,
            RequestedByUserId = facultyId,
            ApprovedByUserId = facultyId,
            ApprovedAtUtc = DateTime.UtcNow,
            ActionType = ExceptionActionType.ReturnProposal,
            Reason = remarks.Trim(),
            PreviousValueJson = System.Text.Json.JsonSerializer.Serialize(new { status = previousStatus.ToString() }),
            NewValueJson = System.Text.Json.JsonSerializer.Serialize(new { status = ProjectStatus.Draft.ToString(), isRosterLocked = false })
        };
        await _context.ExceptionAuditLogs.AddAsync(excAudit);

        await _context.SaveChangesAsync();

        return Ok(new { success = true, teamId = team.Id, status = team.Status, isReturned = true, remarks = remarks.Trim() });
    }

    [HttpPost("proposals/{teamId}/reject")]
    public async Task<IActionResult> RejectProposal(Guid teamId, [FromBody] ReturnProposalRequest? request)
    {
        var facultyId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var team = await _context.ProjectTeams.FirstOrDefaultAsync(t => t.Id == teamId && t.CollegeId == collegeId && !t.IsDeleted);
        if (team == null) return NotFound(new { message = "Team proposal not found." });

        var caller = await ResolveCurrentUserAsync();
        if (!CanFacultyOrAuthorityManageTeam(caller, team, facultyId))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the assigned guide or authorized department authority can reject the proposal." });
        }

        if (team.Status != ProjectStatus.PendingGuide)
        {
            return BadRequest(new { message = $"Only proposals in PendingGuide status can be rejected. Current status is {team.Status}." });
        }

        var remarks = request?.Remarks ?? request?.Reason;
        if (string.IsNullOrWhiteSpace(remarks) || remarks.Trim().Length < 5)
        {
            return BadRequest(new { message = "Mandatory rejection remarks of at least 5 characters required when rejecting a proposal." });
        }

        var previousStatus = team.Status;
        var previousGuideId = team.GuideUserId;
        team.Status = ProjectStatus.Draft;
        team.IsRosterLocked = false;
        team.GuideUserId = null; // Rejection marker: guide explicitly rejected supervising this proposal

        var audit = new PlatformAuditLog
        {
            ActorUserId = facultyId,
            ActorEmail = caller?.Email ?? "faculty@colabex.edu",
            Action = "FACULTY_PROPOSAL_REJECTED",
            TargetTenantId = collegeId,
            TargetEntity = "ProjectTeam",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                teamId = team.Id,
                teamCode = team.TeamCode,
                previousStatus = previousStatus.ToString(),
                newStatus = ProjectStatus.Draft.ToString(),
                previousGuideId,
                remarks = remarks.Trim(),
                rejectionMarker = "GuideUnassigned"
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(audit);

        var excAudit = new ExceptionAuditLog
        {
            CollegeId = collegeId,
            DepartmentId = team.DepartmentId,
            ProjectTeamId = team.Id,
            RequestedByUserId = facultyId,
            ApprovedByUserId = facultyId,
            ApprovedAtUtc = DateTime.UtcNow,
            ActionType = ExceptionActionType.RejectProposal,
            Reason = $"[REJECTED] {remarks.Trim()}",
            PreviousValueJson = System.Text.Json.JsonSerializer.Serialize(new { status = previousStatus.ToString(), guideUserId = previousGuideId }),
            NewValueJson = System.Text.Json.JsonSerializer.Serialize(new { status = ProjectStatus.Draft.ToString(), isRosterLocked = false, guideUserId = (Guid?)null })
        };
        await _context.ExceptionAuditLogs.AddAsync(excAudit);

        await _context.SaveChangesAsync();

        return Ok(new { success = true, teamId = team.Id, status = team.Status, isRejected = true, remarks = remarks.Trim() });
    }

    [HttpGet("problem-bank")]
    public async Task<ActionResult<List<ProblemBankStatement>>> GetProblemBank()
    {
        var facultyId = _tenantContext.UserId!.Value;

        var statements = await _context.ProblemBankStatements
            .Where(p => p.ProposedByFacultyId == facultyId && !p.IsDeleted)
            .OrderByDescending(p => p.CreatedAtUtc)
            .ToListAsync();

        return Ok(statements);
    }

    [HttpPost("problem-bank")]
    public async Task<ActionResult<ProblemBankStatement>> CreateProblemBankStatement([FromBody] CreateProblemStatementRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var facultyId = _tenantContext.UserId!.Value;

        var caller = await ResolveCurrentUserAsync();
        if (caller == null || !caller.DepartmentId.HasValue)
        {
            return BadRequest(new { message = "Faculty member must be affiliated with an academic department." });
        }

        // Server-side department enforcement: never trust client-supplied department ID
        if (request.DepartmentId != Guid.Empty && request.DepartmentId != caller.DepartmentId.Value)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "You can only propose problem bank statements for your affiliated academic department." });
        }

        var statement = new ProblemBankStatement
        {
            CollegeId = collegeId,
            DepartmentId = caller.DepartmentId.Value,
            AcademicTrackId = request.AcademicTrackId,
            ProposedByFacultyId = facultyId,
            Title = request.Title.Trim(),
            Abstract = request.Abstract.Trim(),
            SdgCode = request.SdgCode.Trim(),
            PrerequisitesCsv = request.PrerequisitesCsv,
            MaxTeamCapacity = request.MaxTeamCapacity
        };

        await _context.ProblemBankStatements.AddAsync(statement);
        await _context.SaveChangesAsync();

        return Ok(statement);
    }

    [HttpGet("defense-teams")]
    [HttpGet("evaluations/assigned")]
    public async Task<ActionResult<List<AssignedDefenseTeamDto>>> GetAssignedDefenseTeams()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var facultyId = _tenantContext.UserId!.Value;

        // Find panels where faculty is appointed as evaluator
        var panelEvaluations = await _context.VivaPanelEvaluators
            .Include(pe => pe.VivaPanel)
            .Where(pe => pe.CollegeId == collegeId && pe.EvaluatorUserId == facultyId && !pe.IsDeleted)
            .ToListAsync();

        var panels = panelEvaluations
            .Where(pe => pe.VivaPanel != null && !pe.VivaPanel.IsDeleted)
            .Select(pe => pe.VivaPanel!)
            .ToList();

        var result = new List<AssignedDefenseTeamDto>();

        foreach (var panel in panels)
        {
            var teams = await _context.ProjectTeams
                .Include(t => t.Members)
                    .ThenInclude(m => m.User)
                .Include(t => t.GuideUser)
                .Where(t => t.CollegeId == collegeId &&
                            t.DepartmentId == panel.DepartmentId &&
                            t.AcademicTrackId == panel.AcademicTrackId &&
                            !t.IsDeleted)
                .OrderBy(t => t.TeamCode)
                .ToListAsync();

            foreach (var team in teams)
            {
                var eval = await _context.VivaEvaluations
                    .FirstOrDefaultAsync(e => e.ProjectTeamId == team.Id &&
                                              e.CollegeId == collegeId &&
                                              !e.IsDeleted);

                var isConflict = team.GuideUserId == facultyId;

                result.Add(new AssignedDefenseTeamDto
                {
                    TeamId = team.Id,
                    TeamCode = team.TeamCode,
                    Title = team.Title,
                    Abstract = team.Abstract,
                    DomainTag = team.DomainTag,
                    GuideUserId = team.GuideUserId,
                    GuideName = team.GuideUser?.FullName,
                    IsGuideConflict = isConflict,
                    CheckpointType = eval?.CheckpointType ?? CheckpointType.MidTermReview,
                    IsEvaluationLocked = eval != null && eval.IsLocked,
                    ScheduledAtUtc = panel.ScheduledAtUtc,
                    RoomOrLink = panel.RoomOrLink,
                    Members = team.Members
                        .Where(m => !m.IsDeleted)
                        .Select(m => new AssignedDefenseTeamMemberDto
                        {
                            UserId = m.UserId,
                            FullName = m.User?.FullName ?? string.Empty,
                            EnrollmentCode = m.User?.EnrollmentOrEmployeeCode ?? string.Empty,
                            IsTeamLead = m.IsTeamLead,
                            ModuleResponsibility = m.ModuleResponsibility
                        })
                        .ToList()
                });
            }
        }

        return Ok(result);
    }

    [HttpPost("evaluations")]
    public async Task<IActionResult> SubmitVivaEvaluation([FromBody] SubmitVivaEvaluationRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var evaluatorId = _tenantContext.UserId!.Value;

        var team = await _context.ProjectTeams
            .Include(t => t.AcademicTrack)
            .Include(t => t.Members)
            .Include(t => t.Artifacts)
            .FirstOrDefaultAsync(t => t.Id == request.ProjectTeamId && t.CollegeId == collegeId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Project team not found." });

        var callerUser = await ResolveCurrentUserAsync();
        var isDeptHod = callerUser != null && callerUser.Role == UserRole.HOD && callerUser.DepartmentId.HasValue && callerUser.DepartmentId.Value == team.DepartmentId;
        var isCollegeAdmin = callerUser != null && callerUser.Role == UserRole.CollegeAdmin;

        // Checkpoint-specific authorization and conflict-of-interest checks
        if (request.CheckpointType != CheckpointType.GuideContinuous)
        {
            try
            {
                ConflictOfInterestGuard.EnsureNoVivaGradingConflict(evaluatorId, team.GuideUserId);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }

            var isAppointedEvaluator = await _context.VivaPanelEvaluators
                .Include(pe => pe.VivaPanel)
                .AnyAsync(pe => pe.CollegeId == collegeId &&
                               pe.EvaluatorUserId == evaluatorId &&
                               !pe.IsDeleted &&
                               pe.VivaPanel != null &&
                               !pe.VivaPanel.IsDeleted &&
                               pe.VivaPanel.DepartmentId == team.DepartmentId &&
                               pe.VivaPanel.AcademicTrackId == team.AcademicTrackId);

            if (!isAppointedEvaluator && !isDeptHod && !isCollegeAdmin)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Only appointed viva panel evaluators for this team's academic track, or authorized department authorities, can submit defense evaluation marks."
                });
            }
        }
        else
        {
            if (team.GuideUserId != evaluatorId && !isDeptHod && !isCollegeAdmin)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the appointed project guide or authorized department authority can submit continuous evaluation marks." });
            }
        }

        // P1-2: Completion gate checks for FinalViva checkpoint
        if (request.CheckpointType == CheckpointType.FinalViva)
        {
            var activeMembers = team.Members.Where(m => m.IsActive && !m.IsDeleted).ToList();
            if (activeMembers.Count > 0)
            {
                var evaluatedStudentIds = request.StudentScores.Select(s => s.StudentUserId).ToHashSet();
                if (activeMembers.Any(m => !evaluatedStudentIds.Contains(m.UserId)))
                {
                    return BadRequest(new
                    {
                        message = "Every active team member must receive an individual evaluation score for Final Viva defense."
                    });
                }
            }

            var thesisVerified = team.Artifacts.Any(a => a.SlotType == ArtifactSlotType.FinalThesis && a.Status == ArtifactStatus.Verified && !a.IsDeleted);
            var plagiarismVerified = team.Artifacts.Any(a => a.SlotType == ArtifactSlotType.PlagiarismReport && a.Status == ArtifactStatus.Verified && !a.IsDeleted);
            if (!thesisVerified || !plagiarismVerified)
            {
                return BadRequest(new
                {
                    message = "Final Viva defense evaluation requires verified FinalThesis and PlagiarismReport deliverables."
                });
            }
        }

        // Check if an evaluation already exists for this team and checkpoint
        var existingEval = await _context.VivaEvaluations
            .Include(e => e.IndividualScores)
            .FirstOrDefaultAsync(e => e.ProjectTeamId == team.Id &&
                                      e.CheckpointType == request.CheckpointType &&
                                      e.CollegeId == collegeId &&
                                      !e.IsDeleted);

        if (existingEval != null)
        {
            if (existingEval.IsLocked)
            {
                return StatusCode(StatusCodes.Status409Conflict, new
                {
                    message = "This evaluation checkpoint is locked and finalized. Modifying locked marks requires an approved Grade Unlock Exception from the Head of Department (HOD)."
                });
            }

            // Unlocked evaluation: update existing evaluation atomically
            var trackInfo = team.AcademicTrack;
            var sharedPct = trackInfo?.SharedProjectRubricPct ?? 60m;
            var indivPct = trackInfo?.IndividualStudentRubricPct ?? 40m;

            try
            {
                existingEval.EvaluatorUserId = evaluatorId;
                existingEval.SharedRubricScoresJson = request.SharedRubricScoresJson;
                existingEval.SharedTotalScore = request.SharedTotalScore;
                existingEval.GeneralRemarks = request.GeneralRemarks;
                existingEval.IsLocked = true;
                existingEval.LockedAtUtc = DateTime.UtcNow;

                _context.IndividualStudentScores.RemoveRange(existingEval.IndividualScores);

                foreach (var scoreInput in request.StudentScores)
                {
                    var indScore = new IndividualStudentScore
                    {
                        CollegeId = collegeId,
                        VivaEvaluationId = existingEval.Id,
                        StudentUserId = scoreInput.StudentUserId,
                        ModuleOwnershipScore = scoreInput.ModuleOwnershipScore,
                        VivaQaScore = scoreInput.VivaQaScore,
                        LogDisciplineScore = scoreInput.LogDisciplineScore
                    };
                    indScore.ComputeFinalMark(request.SharedTotalScore, sharedPct, indivPct);
                    await _context.IndividualStudentScores.AddAsync(indScore);
                }

                // Final viva grades recorded; team status is retained in ReadyForViva awaiting institutional sign-off

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    evaluationId = existingEval.Id,
                    isLocked = existingEval.IsLocked,
                    individualScoresCount = request.StudentScores.Count,
                    isUpdated = true
                });
            }
            catch (DbUpdateException)
            {
                return StatusCode(StatusCodes.Status409Conflict, new
                {
                    message = "An evaluation for this checkpoint has already been submitted and finalized."
                });
            }
        }

        var track = team.AcademicTrack;
        var sharedWeight = track?.SharedProjectRubricPct ?? 60m;
        var individualWeight = track?.IndividualStudentRubricPct ?? 40m;

        var evaluation = new VivaEvaluation
        {
            CollegeId = collegeId,
            ProjectTeamId = team.Id,
            EvaluatorUserId = evaluatorId,
            CheckpointType = request.CheckpointType,
            SharedRubricScoresJson = request.SharedRubricScoresJson,
            SharedTotalScore = request.SharedTotalScore,
            GeneralRemarks = request.GeneralRemarks,
            IsLocked = true,
            LockedAtUtc = DateTime.UtcNow
        };

        foreach (var scoreInput in request.StudentScores)
        {
            var indScore = new IndividualStudentScore
            {
                CollegeId = collegeId,
                StudentUserId = scoreInput.StudentUserId,
                ModuleOwnershipScore = scoreInput.ModuleOwnershipScore,
                VivaQaScore = scoreInput.VivaQaScore,
                LogDisciplineScore = scoreInput.LogDisciplineScore
            };

            indScore.ComputeFinalMark(request.SharedTotalScore, sharedWeight, individualWeight);
            evaluation.IndividualScores.Add(indScore);
        }

        try
        {
            await _context.VivaEvaluations.AddAsync(evaluation);

            // Final viva grades recorded; team status is retained in ReadyForViva awaiting institutional sign-off

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                evaluationId = evaluation.Id,
                isLocked = evaluation.IsLocked,
                individualScoresCount = evaluation.IndividualScores.Count,
                isUpdated = false
            });
        }
        catch (DbUpdateException)
        {
            return StatusCode(StatusCodes.Status409Conflict, new
            {
                message = "An evaluation for this checkpoint has already been submitted and finalized."
            });
        }
    }

    [HttpGet("teams/{teamId}/artifacts")]
    public async Task<ActionResult<List<ArtifactSlotDto>>> GetTeamArtifacts(Guid teamId)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var team = await _context.ProjectTeams
            .Include(t => t.Artifacts)
            .FirstOrDefaultAsync(t => t.Id == teamId && t.CollegeId == collegeId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Team not found." });

        var caller = await ResolveCurrentUserAsync();
        if (caller == null) return Unauthorized(new { message = "User account not resolved." });

        var isGuide = team.GuideUserId == caller.Id;
        var isDeptHod = caller.Role == UserRole.HOD && caller.DepartmentId.HasValue && caller.DepartmentId.Value == team.DepartmentId;
        var isCollegeAdmin = caller.Role == UserRole.CollegeAdmin;

        var isAppointedEvaluator = await _context.VivaPanelEvaluators
            .Include(pe => pe.VivaPanel)
            .AnyAsync(pe => pe.CollegeId == collegeId &&
                           pe.EvaluatorUserId == caller.Id &&
                           !pe.IsDeleted &&
                           pe.VivaPanel != null &&
                           !pe.VivaPanel.IsDeleted &&
                           pe.VivaPanel.DepartmentId == team.DepartmentId &&
                           pe.VivaPanel.AcademicTrackId == team.AcademicTrackId);

        if (!isGuide && !isDeptHod && !isCollegeAdmin && !isAppointedEvaluator)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "You are not authorized to view deliverable artifacts for this project team."
            });
        }

        var allSlots = new[] { ArtifactSlotType.Synopsis, ArtifactSlotType.MidTermPPT, ArtifactSlotType.PlagiarismReport, ArtifactSlotType.FinalThesis };
        var artifacts = allSlots.Select(slot =>
        {
            var match = team.Artifacts.FirstOrDefault(a => a.SlotType == slot && !a.IsDeleted);
            return new ArtifactSlotDto
            {
                Id = match?.Id,
                SlotType = slot,
                FileName = match?.FileName,
                StorageKey = match?.StorageKey,
                Sha256Checksum = match?.Sha256Checksum,
                FileSizeBytes = match?.FileSizeBytes ?? 0,
                Status = match?.Status ?? ArtifactStatus.Missing,
                ReviewerNote = match?.ReviewerNote
            };
        }).ToList();

        return Ok(artifacts);
    }

    [HttpPost("artifacts/{artifactId}/review")]
    public async Task<IActionResult> ReviewArtifact(Guid artifactId, [FromBody] ReviewArtifactRequest request)
    {
        var facultyId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var artifact = await _context.TeamArtifacts
            .Include(a => a.ProjectTeam)
            .FirstOrDefaultAsync(a => a.Id == artifactId && a.CollegeId == collegeId && !a.IsDeleted);

        if (artifact == null) return NotFound(new { message = "Artifact deliverable not found." });

        if (artifact.Status == ArtifactStatus.Missing)
        {
            return BadRequest(new { message = "Cannot review an artifact deliverable that has not been submitted by the student team." });
        }

        var caller = await ResolveCurrentUserAsync();
        if (artifact.ProjectTeam == null || !CanFacultyOrAuthorityManageTeam(caller, artifact.ProjectTeam, facultyId))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the assigned faculty mentor or authorized department authority can review student artifacts." });
        }

        var previousStatus = artifact.Status;
        artifact.Status = request.IsApproved ? ArtifactStatus.Verified : ArtifactStatus.RevisionRequested;
        artifact.VerifiedByUserId = facultyId;
        artifact.ReviewerNote = request.ReviewerNote?.Trim();

        var audit = new PlatformAuditLog
        {
            ActorUserId = facultyId,
            ActorEmail = caller?.Email ?? "faculty@colabex.edu",
            Action = "FACULTY_ARTIFACT_REVIEWED",
            TargetTenantId = collegeId,
            TargetEntity = "TeamArtifact",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                artifactId = artifact.Id,
                projectTeamId = artifact.ProjectTeamId,
                slotType = artifact.SlotType.ToString(),
                previousStatus = previousStatus.ToString(),
                newStatus = artifact.Status.ToString(),
                reviewerNote = artifact.ReviewerNote
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(audit);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            artifactId = artifact.Id,
            status = artifact.Status.ToString(),
            reviewerNote = artifact.ReviewerNote
        });
    }
}
