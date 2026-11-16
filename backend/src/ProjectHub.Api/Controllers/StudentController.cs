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
[Authorize(Policy = ProjectHubPolicies.StudentOrLead)]
public class StudentController : ControllerBase
{
    private readonly ProjectHubDbContext _context;
    private readonly ITenantContext _tenantContext;

    public StudentController(ProjectHubDbContext context, ITenantContext tenantContext)
    {
        _context = context;
        _tenantContext = tenantContext;
    }

    private async Task<ProjectTeam?> GetCurrentStudentTeamAsync(Guid studentId)
    {
        var membership = await _context.TeamMembers
            .Include(m => m.ProjectTeam)
                .ThenInclude(t => t!.GuideUser)
            .Include(m => m.ProjectTeam)
                .ThenInclude(t => t!.Members)
                    .ThenInclude(mem => mem.User)
            .Include(m => m.ProjectTeam)
                .ThenInclude(t => t!.Tasks)
                    .ThenInclude(tsk => tsk.AssignedToUser)
            .Include(m => m.ProjectTeam)
                .ThenInclude(t => t!.Artifacts)
            .Include(m => m.ProjectTeam)
                .ThenInclude(t => t!.WeeklyLogs)
                    .ThenInclude(log => log.AuthorUser)
            .FirstOrDefaultAsync(m => m.UserId == studentId && m.IsActive && !m.IsDeleted);

        return membership?.ProjectTeam;
    }

    [HttpGet("workspace")]
    public async Task<ActionResult<StudentWorkspaceDto>> GetWorkspace()
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);

        if (team == null)
        {
            return NotFound(new { message = "You are not currently enrolled in an active project team." });
        }

        var members = team.Members
            .Where(m => m.IsActive && !m.IsDeleted)
            .Select(m => new TeamMemberDto
            {
                UserId = m.UserId,
                FullName = m.User?.FullName ?? string.Empty,
                EnrollmentCode = m.User?.EnrollmentOrEmployeeCode ?? string.Empty,
                IsTeamLead = m.IsTeamLead,
                ModuleResponsibility = m.ModuleResponsibility
            })
            .ToList();

        var tasks = team.Tasks
            .Where(t => !t.IsDeleted)
            .OrderBy(t => t.DueDateUtc)
            .Select(t => new SprintTaskDto
            {
                Id = t.Id,
                Title = t.Title,
                CategoryTag = t.CategoryTag,
                AssignedToUserId = t.AssignedToUserId,
                AssigneeName = t.AssignedToUser?.FullName,
                Status = t.Status,
                DueDateUtc = t.DueDateUtc
            })
            .ToList();

        // 4-Slot Vault guarantee
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

        var logs = team.WeeklyLogs
            .Where(l => !l.IsDeleted)
            .OrderByDescending(l => l.WeekNumber)
            .Select(l => new WeeklyLogDto
            {
                Id = l.Id,
                AuthorUserId = l.AuthorUserId,
                AuthorName = l.AuthorUser?.FullName ?? string.Empty,
                WeekNumber = l.WeekNumber,
                AccomplishmentsSummary = l.AccomplishmentsSummary,
                BlockersSummary = l.BlockersSummary,
                HoursLogged = l.HoursLogged,
                GitCommitCount = l.GitCommitCount,
                IsVerified = l.IsVerified,
                MentorRemarks = l.MentorRemarks,
                CreatedAtUtc = l.CreatedAtUtc
            })
            .ToList();

        return Ok(new StudentWorkspaceDto
        {
            TeamId = team.Id,
            TeamCode = team.TeamCode,
            Title = team.Title,
            Abstract = team.Abstract,
            DomainTag = team.DomainTag,
            SdgCode = team.SdgCode,
            Status = team.Status,
            GuideUserId = team.GuideUserId,
            GuideName = team.GuideUser?.FullName,
            RepoUrl = team.RepoUrl,
            JiraBoardKey = team.JiraBoardKey,
            IsRosterLocked = team.IsRosterLocked,
            MissedLogStreak = team.MissedLogStreak,
            ProjectLineageId = team.ProjectLineageId,
            Members = members,
            Tasks = tasks,
            Artifacts = artifacts,
            WeeklyLogs = logs
        });
    }

    [HttpPost("tasks")]
    public async Task<ActionResult<SprintTaskDto>> CreateTask([FromBody] CreateTaskRequest request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "Active project team not found." });

        var task = new SprintTask
        {
            CollegeId = team.CollegeId,
            ProjectTeamId = team.Id,
            Title = request.Title.Trim(),
            CategoryTag = request.CategoryTag.Trim(),
            AssignedToUserId = request.AssignedToUserId ?? studentId,
            Status = request.Status,
            DueDateUtc = request.DueDateUtc
        };

        await _context.SprintTasks.AddAsync(task);
        await _context.SaveChangesAsync();

        return Ok(new SprintTaskDto
        {
            Id = task.Id,
            Title = task.Title,
            CategoryTag = task.CategoryTag,
            AssignedToUserId = task.AssignedToUserId,
            Status = task.Status,
            DueDateUtc = task.DueDateUtc
        });
    }

    [HttpPut("tasks/{taskId}")]
    public async Task<IActionResult> UpdateTask(Guid taskId, [FromBody] UpdateTaskRequest request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound();

        var task = await _context.SprintTasks.FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectTeamId == team.Id && !t.IsDeleted);
        if (task == null) return NotFound();

        if (request.Title != null) task.Title = request.Title.Trim();
        if (request.CategoryTag != null) task.CategoryTag = request.CategoryTag.Trim();
        if (request.AssignedToUserId.HasValue) task.AssignedToUserId = request.AssignedToUserId.Value;
        if (request.Status.HasValue) task.Status = request.Status.Value;
        if (request.DueDateUtc.HasValue) task.DueDateUtc = request.DueDateUtc.Value;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("logs")]
    public async Task<IActionResult> SubmitLogbook([FromBody] SubmitLogbookRequest request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "Active project team not found." });

        var existing = await _context.WeeklyLogbooks
            .FirstOrDefaultAsync(l => l.ProjectTeamId == team.Id && l.AuthorUserId == studentId && l.WeekNumber == request.WeekNumber && !l.IsDeleted);

        if (existing != null)
        {
            existing.AccomplishmentsSummary = request.AccomplishmentsSummary.Trim();
            existing.BlockersSummary = request.BlockersSummary?.Trim();
            existing.HoursLogged = request.HoursLogged;
            existing.GitCommitCount = request.GitCommitCount;
            existing.IsVerified = false; // Reset on update
        }
        else
        {
            var log = new WeeklyLogbook
            {
                CollegeId = team.CollegeId,
                ProjectTeamId = team.Id,
                AuthorUserId = studentId,
                WeekNumber = request.WeekNumber,
                AccomplishmentsSummary = request.AccomplishmentsSummary.Trim(),
                BlockersSummary = request.BlockersSummary?.Trim(),
                HoursLogged = request.HoursLogged,
                GitCommitCount = request.GitCommitCount,
                IsVerified = false
            };
            await _context.WeeklyLogbooks.AddAsync(log);
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, weekNumber = request.WeekNumber, status = "SubmittedPendingVerification" });
    }

    [HttpPost("artifacts")]
    public async Task<IActionResult> UploadArtifact([FromBody] UploadArtifactRequest request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "Active project team not found." });

        var artifact = await _context.TeamArtifacts
            .FirstOrDefaultAsync(a => a.ProjectTeamId == team.Id && a.SlotType == request.SlotType && !a.IsDeleted);

        if (artifact == null)
        {
            artifact = new TeamArtifact
            {
                CollegeId = team.CollegeId,
                ProjectTeamId = team.Id,
                SlotType = request.SlotType,
                FileName = request.FileName.Trim(),
                StorageKey = request.StorageKey.Trim(),
                Sha256Checksum = request.Sha256Checksum.Trim(),
                FileSizeBytes = request.FileSizeBytes,
                Status = ArtifactStatus.Uploaded,
                UploadedByUserId = studentId
            };
            await _context.TeamArtifacts.AddAsync(artifact);
        }
        else
        {
            artifact.FileName = request.FileName.Trim();
            artifact.StorageKey = request.StorageKey.Trim();
            artifact.Sha256Checksum = request.Sha256Checksum.Trim();
            artifact.FileSizeBytes = request.FileSizeBytes;
            artifact.Status = ArtifactStatus.Uploaded;
            artifact.UploadedByUserId = studentId;
            artifact.ReviewerNote = null;
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, slot = request.SlotType, status = artifact.Status });
    }

    [HttpGet("problem-bank")]
    public async Task<ActionResult<List<ProblemBankStatement>>> GetProblemBank()
    {
        var statements = await _context.ProblemBankStatements
            .Where(p => !p.IsAllocated && !p.IsDeleted)
            .OrderByDescending(p => p.CreatedAtUtc)
            .ToListAsync();

        return Ok(statements);
    }

    [HttpPost("continue-lineage")]
    public async Task<IActionResult> ContinueLineage([FromBody] ContinueLineageRequest request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var previousTeam = await GetCurrentStudentTeamAsync(studentId);
        if (previousTeam == null) return NotFound(new { message = "Previous phase project team could not be found." });

        var targetTrack = await _context.AcademicTracks.FirstOrDefaultAsync(t => t.Id == request.TargetAcademicTrackId && !t.IsDeleted);
        if (targetTrack == null) return BadRequest(new { message = "Target academic track does not exist." });

        // Carry over ProjectLineageId and link ParentProjectTeamId
        var nextPhaseTeam = new ProjectTeam
        {
            CollegeId = previousTeam.CollegeId,
            DepartmentId = previousTeam.DepartmentId,
            AcademicTrackId = targetTrack.Id,
            ProjectLineageId = previousTeam.ProjectLineageId,
            ParentProjectTeamId = previousTeam.Id,
            TeamCode = $"{previousTeam.TeamCode}-CONT",
            Title = string.IsNullOrWhiteSpace(request.NewTitle) ? $"{previousTeam.Title} (Phase-II)" : request.NewTitle.Trim(),
            Abstract = string.IsNullOrWhiteSpace(request.NewAbstract) ? previousTeam.Abstract : request.NewAbstract.Trim(),
            DomainTag = previousTeam.DomainTag,
            SdgCode = previousTeam.SdgCode,
            Status = ProjectStatus.Draft,
            GuideUserId = previousTeam.GuideUserId,
            RepoUrl = previousTeam.RepoUrl,
            JiraBoardKey = previousTeam.JiraBoardKey
        };

        await _context.ProjectTeams.AddAsync(nextPhaseTeam);

        // Copy active members
        foreach (var member in previousTeam.Members.Where(m => m.IsActive && !m.IsDeleted))
        {
            nextPhaseTeam.Members.Add(new TeamMember
            {
                CollegeId = previousTeam.CollegeId,
                UserId = member.UserId,
                IsTeamLead = member.IsTeamLead,
                ModuleResponsibility = member.ModuleResponsibility,
                IsActive = true
            });
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            newTeamId = nextPhaseTeam.Id,
            lineageId = nextPhaseTeam.ProjectLineageId,
            parentTeamId = previousTeam.Id,
            title = nextPhaseTeam.Title
        });
    }

    [HttpPost("exit-survey")]
    public async Task<IActionResult> SubmitExitSurvey([FromBody] SubmitExitSurveyRequest request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "Active project team not found." });

        var existing = await _context.CourseExitSurveys
            .FirstOrDefaultAsync(s => s.ProjectTeamId == team.Id && s.StudentUserId == studentId && !s.IsDeleted);

        var json = JsonSerializer.Serialize(request.PoRatings);

        if (existing != null)
        {
            existing.PoRatingsJson = json;
            existing.SubmittedAtUtc = DateTime.UtcNow;
        }
        else
        {
            var survey = new CourseExitSurvey
            {
                CollegeId = team.CollegeId,
                ProjectTeamId = team.Id,
                StudentUserId = studentId,
                PoRatingsJson = json,
                SubmittedAtUtc = DateTime.UtcNow
            };
            await _context.CourseExitSurveys.AddAsync(survey);
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, submittedAtUtc = DateTime.UtcNow });
    }

    [HttpGet("portfolio")]
    public async Task<ActionResult<StudentPortfolioDto>> GetPortfolio()
    {
        var studentId = _tenantContext.UserId!.Value;

        var user = await _context.Users
            .Include(u => u.College)
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == studentId && !u.IsDeleted);

        if (user == null) return NotFound();

        var team = await GetCurrentStudentTeamAsync(studentId);
        var member = team?.Members.FirstOrDefault(m => m.UserId == studentId);

        var verifiedArtifacts = team?.Artifacts
            .Where(a => a.Status == ArtifactStatus.Verified && !a.IsDeleted)
            .Select(a => new ArtifactSlotDto
            {
                Id = a.Id,
                SlotType = a.SlotType,
                FileName = a.FileName,
                StorageKey = a.StorageKey,
                Sha256Checksum = a.Sha256Checksum,
                FileSizeBytes = a.FileSizeBytes,
                Status = a.Status
            })
            .ToList() ?? new List<ArtifactSlotDto>();

        var totalHours = team?.WeeklyLogs
            .Where(l => l.AuthorUserId == studentId && !l.IsDeleted)
            .Sum(l => l.HoursLogged) ?? 0m;

        var totalCommits = team?.WeeklyLogs
            .Where(l => l.AuthorUserId == studentId && !l.IsDeleted)
            .Sum(l => l.GitCommitCount) ?? 0;

        return Ok(new StudentPortfolioDto
        {
            StudentId = user.Id,
            FullName = user.FullName,
            EnrollmentCode = user.EnrollmentOrEmployeeCode,
            CollegeName = user.College?.Name ?? "ProjectHub Institution",
            DepartmentName = user.Department?.Name ?? "Computer Science & Engineering",
            ProjectTitle = team?.Title ?? "Smart IoT Energy Monitoring & Anomaly Detection",
            TeamCode = team?.TeamCode ?? "2026-CS-MIN-01",
            ModuleResponsibility = member?.ModuleResponsibility ?? "Edge Firmware & Telemetry Pipeline",
            DomainTag = team?.DomainTag ?? "IoT & Cloud Infrastructure",
            SdgCode = team?.SdgCode ?? "SDG-7",
            RepoUrl = team?.RepoUrl,
            TotalHoursLogged = totalHours,
            TotalCommits = totalCommits,
            VerifiedArtifacts = verifiedArtifacts
        });
    }
}
