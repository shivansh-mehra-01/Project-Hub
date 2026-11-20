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

        var log = await _context.WeeklyLogbooks
            .Include(l => l.ProjectTeam)
            .FirstOrDefaultAsync(l => l.Id == logId && !l.IsDeleted);

        if (log == null) return NotFound(new { message = "Weekly log not found." });

        if (log.ProjectTeam?.GuideUserId != facultyId)
        {
            return Forbid("Only the assigned faculty mentor can verify student progress logs.");
        }

        log.IsVerified = true;
        log.VerifiedByUserId = facultyId;
        log.VerifiedAtUtc = DateTime.UtcNow;
        log.MentorRemarks = request.Remarks?.Trim();

        await _context.SaveChangesAsync();
        return Ok(new { success = true, logId = log.Id, isVerified = true });
    }

    [HttpPost("proposals/{teamId}/endorse")]
    public async Task<IActionResult> EndorseProposal(Guid teamId)
    {
        var facultyId = _tenantContext.UserId!.Value;

        var team = await _context.ProjectTeams.FirstOrDefaultAsync(t => t.Id == teamId && !t.IsDeleted);
        if (team == null) return NotFound(new { message = "Team proposal not found." });

        if (team.GuideUserId != facultyId)
        {
            return Forbid("Only the appointed guide can endorse the proposal.");
        }

        team.Status = ProjectStatus.PendingCoordinator;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, teamId = team.Id, status = team.Status });
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

        var statement = new ProblemBankStatement
        {
            CollegeId = collegeId,
            DepartmentId = request.DepartmentId,
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

    [HttpPost("evaluations")]
    public async Task<IActionResult> SubmitVivaEvaluation([FromBody] SubmitVivaEvaluationRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var evaluatorId = _tenantContext.UserId!.Value;

        var team = await _context.ProjectTeams
            .Include(t => t.AcademicTrack)
            .FirstOrDefaultAsync(t => t.Id == request.ProjectTeamId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Project team not found." });

        // Conflict-of-Interest Guard: Assigned project guide cannot evaluate defense panel
        try
        {
            ConflictOfInterestGuard.EnsureNoVivaGradingConflict(evaluatorId, team.GuideUserId);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
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

        await _context.VivaEvaluations.AddAsync(evaluation);

        if (request.CheckpointType == CheckpointType.FinalViva)
        {
            team.Status = ProjectStatus.Completed;
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            evaluationId = evaluation.Id,
            isLocked = evaluation.IsLocked,
            individualScoresCount = evaluation.IndividualScores.Count
        });
    }

    [HttpGet("teams/{teamId}/artifacts")]
    public async Task<ActionResult<List<ArtifactSlotDto>>> GetTeamArtifacts(Guid teamId)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var team = await _context.ProjectTeams
            .Include(t => t.Artifacts)
            .FirstOrDefaultAsync(t => t.Id == teamId && t.CollegeId == collegeId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Team not found." });

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
            .FirstOrDefaultAsync(a => a.Id == artifactId && a.CollegeId == collegeId && !a.IsDeleted);

        if (artifact == null) return NotFound(new { message = "Artifact deliverable not found." });

        artifact.Status = request.IsApproved ? ArtifactStatus.Verified : ArtifactStatus.RevisionRequested;
        artifact.VerifiedByUserId = facultyId;
        artifact.ReviewerNote = request.ReviewerNote?.Trim();

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
