using System.Text.Json;
using System.Text.RegularExpressions;
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
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<Guid, SemaphoreSlim> _teamLocks = new();
    private readonly ProjectHubDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly IFileStorageService _fileStorageService;

    public static (int MinTeamSize, int MaxTeamSize) ResolveTrackCapacity(AcademicTrack? track)
    {
        if (track == null)
        {
            return (MinTeamSize: 2, MaxTeamSize: 4);
        }

        if (track.ParticipationMode == ParticipationMode.Individual)
        {
            return (MinTeamSize: 1, MaxTeamSize: 1);
        }

        var min = track.MinTeamSize > 0 ? track.MinTeamSize : 2;
        var max = track.MaxTeamSize > 0 ? track.MaxTeamSize : 4;

        if (min > max)
        {
            min = max;
        }

        return (MinTeamSize: min, MaxTeamSize: max);
    }

    public StudentController(
        ProjectHubDbContext context,
        ITenantContext tenantContext,
        IFileStorageService fileStorageService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _fileStorageService = fileStorageService;
    }

    private async Task<ProjectTeam?> GetCurrentStudentTeamAsync(Guid studentId)
    {
        var membership = await _context.TeamMembers
            .Include(m => m.ProjectTeam)
                .ThenInclude(t => t!.GuideUser)
            .Include(m => m.ProjectTeam)
                .ThenInclude(t => t!.PreferredGuideUser)
            .Include(m => m.ProjectTeam)
                .ThenInclude(t => t!.GuideAllocatedByUser)
            .Include(m => m.ProjectTeam)
                .ThenInclude(t => t!.AcademicTrack)
            .Include(m => m.ProjectTeam)
                .ThenInclude(t => t!.Members)
                    .ThenInclude(mem => mem.User)
            .Include(m => m.ProjectTeam)
                .ThenInclude(t => t!.Tasks)
                    .ThenInclude(tsk => tsk.AssignedToUser)
            .Include(m => m.ProjectTeam)
                .ThenInclude(t => t!.Milestones)
                    .ThenInclude(ms => ms.ReviewHistories)
                        .ThenInclude(h => h.ReviewerUser)
            .Include(m => m.ProjectTeam)
                .ThenInclude(t => t!.Milestones)
                    .ThenInclude(ms => ms.SubmittedByUser)
            .Include(m => m.ProjectTeam)
                .ThenInclude(t => t!.Milestones)
                    .ThenInclude(ms => ms.ReviewedByUser)
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
            .OrderBy(t => t.DueDateUtc.HasValue ? 0 : 1)
            .ThenBy(t => t.DueDateUtc)
            .ThenByDescending(t => t.CreatedAtUtc)
            .Select(t => new SprintTaskDto
            {
                Id = t.Id,
                ProjectTeamId = t.ProjectTeamId,
                Title = t.Title,
                CategoryTag = t.CategoryTag,
                AssignedToUserId = t.AssignedToUserId,
                AssigneeName = t.AssignedToUser?.FullName,
                Status = t.Status,
                DueDateUtc = t.DueDateUtc,
                CreatedAtUtc = t.CreatedAtUtc,
                IsOverdue = t.DueDateUtc.HasValue && t.DueDateUtc.Value < DateTime.UtcNow && t.Status != SprintTaskStatus.Done
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

        var milestones = team.Milestones
            .Where(m => !m.IsDeleted)
            .OrderBy(m => m.TargetDateUtc)
            .Select(m => new ProjectMilestoneDto
            {
                Id = m.Id,
                ProjectTeamId = m.ProjectTeamId,
                Title = m.Title,
                Description = m.Description,
                TargetDateUtc = m.TargetDateUtc,
                Status = m.Status,
                RequiredTaskCompletionPercentage = m.RequiredTaskCompletionPercentage,
                SubmittedAtUtc = m.SubmittedAtUtc,
                SubmittedByUserId = m.SubmittedByUserId,
                SubmittedByName = m.SubmittedByUser?.FullName,
                SubmissionEvidenceUrl = m.SubmissionEvidenceUrl,
                ReviewedAtUtc = m.ReviewedAtUtc,
                ReviewedByUserId = m.ReviewedByUserId,
                ReviewedByName = m.ReviewedByUser?.FullName,
                ReviewFeedback = m.ReviewFeedback,
                IsOverdue = m.TargetDateUtc < DateTime.UtcNow && m.Status != MilestoneStatus.Approved,
                ReviewHistories = m.ReviewHistories
                    .Where(h => !h.IsDeleted)
                    .OrderByDescending(h => h.ReviewedAtUtc)
                    .Select(h => new MilestoneReviewHistoryDto
                    {
                        Id = h.Id,
                        ProjectMilestoneId = h.ProjectMilestoneId,
                        ReviewerUserId = h.ReviewerUserId,
                        ReviewerName = h.ReviewerUser?.FullName ?? string.Empty,
                        ResultStatus = h.ResultStatus,
                        Feedback = h.Feedback,
                        ReviewedAtUtc = h.ReviewedAtUtc
                    }).ToList()
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
            PreferredGuideUserId = team.PreferredGuideUserId,
            PreferredGuideName = team.PreferredGuideUser?.FullName,
            GuidePreferenceStatus = team.GuidePreferenceStatus,
            GuidePreferenceRemarks = team.GuidePreferenceRemarks,
            GuideAllocationRemarks = team.GuideAllocationRemarks,
            GuideAllocatedAtUtc = team.GuideAllocatedAtUtc,
            RepoUrl = team.RepoUrl,
            JiraBoardKey = team.JiraBoardKey,
            IsRosterLocked = team.IsRosterLocked,
            MissedLogStreak = team.MissedLogStreak,
            ProjectLineageId = team.ProjectLineageId,
            ParticipationMode = team.AcademicTrack?.ParticipationMode ?? ParticipationMode.Team,
            EnrolmentMode = team.AcademicTrack?.EnrolmentMode ?? EnrolmentMode.SelfJoin,
            AllowCrossBranchTeams = team.AcademicTrack?.AllowCrossBranchTeams ?? false,
            Members = members,
            Tasks = tasks,
            Milestones = milestones,
            Artifacts = artifacts,
            WeeklyLogs = logs
        });
    }

    // =========================================================================
    // PHASE 6: PROJECT EXECUTION & SPRINT TASK MANAGEMENT
    // =========================================================================

    [HttpGet("workspace/tasks")]
    public async Task<ActionResult<List<SprintTaskDto>>> GetWorkspaceTasks()
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "Active project team not found." });

        var tasks = await _context.SprintTasks
            .Include(t => t.AssignedToUser)
            .Where(t => t.ProjectTeamId == team.Id && !t.IsDeleted)
            .OrderBy(t => t.DueDateUtc.HasValue ? 0 : 1)
            .ThenBy(t => t.DueDateUtc)
            .ThenByDescending(t => t.CreatedAtUtc)
            .Select(t => new SprintTaskDto
            {
                Id = t.Id,
                ProjectTeamId = t.ProjectTeamId,
                Title = t.Title,
                CategoryTag = t.CategoryTag,
                AssignedToUserId = t.AssignedToUserId,
                AssigneeName = t.AssignedToUser != null ? t.AssignedToUser.FullName : null,
                Status = t.Status,
                DueDateUtc = t.DueDateUtc,
                CreatedAtUtc = t.CreatedAtUtc,
                IsOverdue = t.DueDateUtc.HasValue && t.DueDateUtc.Value < DateTime.UtcNow && t.Status != SprintTaskStatus.Done
            })
            .ToListAsync();

        return Ok(tasks);
    }

    [HttpGet("workspace/progress")]
    public async Task<ActionResult<ProjectProgressDto>> GetWorkspaceProgress()
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "Active project team not found." });

        var tasks = await _context.SprintTasks
            .Where(t => t.ProjectTeamId == team.Id && !t.IsDeleted)
            .ToListAsync();

        var total = tasks.Count;
        var completed = tasks.Count(t => t.Status == SprintTaskStatus.Done);
        var inProgress = tasks.Count(t => t.Status == SprintTaskStatus.InProgress);
        var todo = tasks.Count(t => t.Status == SprintTaskStatus.Todo);
        var inReview = tasks.Count(t => t.Status == SprintTaskStatus.InReview);
        var blocked = tasks.Count(t => t.Status == SprintTaskStatus.Blocked);
        var completionPercentage = total > 0 ? Math.Round((decimal)completed / total * 100m, 1) : 0m;

        return Ok(new ProjectProgressDto
        {
            TotalTasks = total,
            CompletedTasks = completed,
            InProgressTasks = inProgress,
            TodoTasks = todo,
            InReviewTasks = inReview,
            BlockedTasks = blocked,
            CompletionPercentage = completionPercentage
        });
    }

    [HttpPost("workspace/tasks")]
    [HttpPost("tasks")]
    public async Task<ActionResult<SprintTaskDto>> CreateTask([FromBody] CreateTaskRequest request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "Active project team not found." });

        if (team.Status == ProjectStatus.Archived)
        {
            return BadRequest(new { message = "Cannot create tasks for an archived project." });
        }

        var membership = team.Members.FirstOrDefault(m => m.UserId == studentId && m.IsActive && !m.IsDeleted);
        if (membership == null || !membership.IsTeamLead)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the Team Leader is authorized to create project tasks." });
        }

        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length < 3 || request.Title.Trim().Length > 250)
        {
            return BadRequest(new { message = "Task title must be between 3 and 250 characters." });
        }

        Guid? assignedUserId = request.AssignedToUserId;
        if (assignedUserId.HasValue)
        {
            var isMember = team.Members.Any(m => m.UserId == assignedUserId.Value && m.IsActive && !m.IsDeleted);
            if (!isMember)
            {
                return BadRequest(new { message = "Task can only be assigned to an active member of the project team." });
            }
        }
        else
        {
            assignedUserId = studentId;
        }

        var task = new SprintTask
        {
            CollegeId = team.CollegeId,
            ProjectTeamId = team.Id,
            Title = request.Title.Trim(),
            CategoryTag = string.IsNullOrWhiteSpace(request.CategoryTag) ? "General" : request.CategoryTag.Trim(),
            AssignedToUserId = assignedUserId,
            Status = request.Status,
            DueDateUtc = request.DueDateUtc
        };

        await _context.SprintTasks.AddAsync(task);

        var auditLog = new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = membership?.User?.Email ?? string.Empty,
            Action = "STUDENT_TASK_CREATED",
            TargetTenantId = team.CollegeId,
            TargetEntity = "SprintTask",
            MetadataJson = JsonSerializer.Serialize(new
            {
                taskId = task.Id,
                teamId = team.Id,
                title = task.Title,
                assignedToUserId = task.AssignedToUserId,
                dueDateUtc = task.DueDateUtc
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();

        var assignee = task.AssignedToUserId.HasValue
            ? await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == task.AssignedToUserId.Value)
            : null;

        return Ok(new SprintTaskDto
        {
            Id = task.Id,
            ProjectTeamId = task.ProjectTeamId,
            Title = task.Title,
            CategoryTag = task.CategoryTag,
            AssignedToUserId = task.AssignedToUserId,
            AssigneeName = assignee?.FullName,
            Status = task.Status,
            DueDateUtc = task.DueDateUtc,
            CreatedAtUtc = task.CreatedAtUtc,
            IsOverdue = task.DueDateUtc.HasValue && task.DueDateUtc.Value < DateTime.UtcNow && task.Status != SprintTaskStatus.Done
        });
    }

    [HttpPut("workspace/tasks/{taskId}")]
    [HttpPut("tasks/{taskId}")]
    public async Task<IActionResult> UpdateTask(Guid taskId, [FromBody] UpdateTaskRequest request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "Active project team not found." });

        var membership = team.Members.FirstOrDefault(m => m.UserId == studentId && m.IsActive && !m.IsDeleted);
        if (membership == null || !membership.IsTeamLead)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the Team Leader is authorized to update task details." });
        }

        var task = await _context.SprintTasks.FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectTeamId == team.Id && !t.IsDeleted);
        if (task == null) return NotFound(new { message = "Task not found." });

        if (request.Title != null)
        {
            if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length < 3 || request.Title.Trim().Length > 250)
            {
                return BadRequest(new { message = "Task title must be between 3 and 250 characters." });
            }
            task.Title = request.Title.Trim();
        }

        if (request.CategoryTag != null)
        {
            task.CategoryTag = string.IsNullOrWhiteSpace(request.CategoryTag) ? "General" : request.CategoryTag.Trim();
        }

        if (request.AssignedToUserId.HasValue)
        {
            var isMember = team.Members.Any(m => m.UserId == request.AssignedToUserId.Value && m.IsActive && !m.IsDeleted);
            if (!isMember)
            {
                return BadRequest(new { message = "Task can only be assigned to an active member of the project team." });
            }
            task.AssignedToUserId = request.AssignedToUserId.Value;
        }

        if (request.Status.HasValue)
        {
            task.Status = request.Status.Value;
        }

        if (request.DueDateUtc.HasValue)
        {
            task.DueDateUtc = request.DueDateUtc.Value;
        }

        var auditLog = new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = membership?.User?.Email ?? string.Empty,
            Action = "STUDENT_TASK_UPDATED",
            TargetTenantId = team.CollegeId,
            TargetEntity = "SprintTask",
            MetadataJson = JsonSerializer.Serialize(new
            {
                taskId = task.Id,
                teamId = team.Id,
                title = task.Title,
                assignedToUserId = task.AssignedToUserId,
                status = task.Status.ToString(),
                dueDateUtc = task.DueDateUtc
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("workspace/tasks/{taskId}/status")]
    public async Task<IActionResult> UpdateTaskStatus(Guid taskId, [FromBody] UpdateTaskStatusRequest request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "Active project team not found." });

        var task = await _context.SprintTasks.FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectTeamId == team.Id && !t.IsDeleted);
        if (task == null) return NotFound(new { message = "Task not found." });

        var membership = team.Members.FirstOrDefault(m => m.UserId == studentId && m.IsActive && !m.IsDeleted);
        var isLead = membership?.IsTeamLead ?? false;
        var isAssigned = task.AssignedToUserId == studentId;

        if (!isLead && !isAssigned)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the Team Leader or the assigned member can update the task status." });
        }

        var previousStatus = task.Status;
        task.Status = request.Status;

        var auditLog = new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = membership?.User?.Email ?? string.Empty,
            Action = "STUDENT_TASK_STATUS_CHANGED",
            TargetTenantId = team.CollegeId,
            TargetEntity = "SprintTask",
            MetadataJson = JsonSerializer.Serialize(new
            {
                taskId = task.Id,
                teamId = team.Id,
                previousStatus = previousStatus.ToString(),
                newStatus = task.Status.ToString()
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();
        return Ok(new { success = true, taskId = task.Id, previousStatus, newStatus = task.Status });
    }

    [HttpDelete("workspace/tasks/{taskId}")]
    public async Task<IActionResult> DeleteTask(Guid taskId)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "Active project team not found." });

        var membership = team.Members.FirstOrDefault(m => m.UserId == studentId && m.IsActive && !m.IsDeleted);
        if (membership == null || !membership.IsTeamLead)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the Team Leader is authorized to delete tasks." });
        }

        var task = await _context.SprintTasks.FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectTeamId == team.Id && !t.IsDeleted);
        if (task == null) return NotFound(new { message = "Task not found." });

        if (task.Status == SprintTaskStatus.Done)
        {
            return BadRequest(new { message = "Completed tasks cannot be deleted to preserve milestone audit integrity." });
        }

        task.IsDeleted = true;

        var auditLog = new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = membership?.User?.Email ?? string.Empty,
            Action = "STUDENT_TASK_DELETED",
            TargetTenantId = team.CollegeId,
            TargetEntity = "SprintTask",
            MetadataJson = JsonSerializer.Serialize(new
            {
                taskId = task.Id,
                teamId = team.Id,
                title = task.Title
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // =========================================================================
    // PHASE 7: PROJECT MILESTONE LIFECYCLE & SUBMISSIONS (STUDENT)
    // =========================================================================

    [HttpGet("workspace/milestones")]
    public async Task<ActionResult<List<ProjectMilestoneDto>>> GetWorkspaceMilestones()
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "Active project team not found." });

        var milestones = await _context.ProjectMilestones
            .Include(m => m.SubmittedByUser)
            .Include(m => m.ReviewedByUser)
            .Include(m => m.ReviewHistories)
                .ThenInclude(h => h.ReviewerUser)
            .Where(m => m.ProjectTeamId == team.Id && !m.IsDeleted)
            .OrderBy(m => m.TargetDateUtc)
            .Select(m => new ProjectMilestoneDto
            {
                Id = m.Id,
                ProjectTeamId = m.ProjectTeamId,
                Title = m.Title,
                Description = m.Description,
                TargetDateUtc = m.TargetDateUtc,
                Status = m.Status,
                RequiredTaskCompletionPercentage = m.RequiredTaskCompletionPercentage,
                SubmittedAtUtc = m.SubmittedAtUtc,
                SubmittedByUserId = m.SubmittedByUserId,
                SubmittedByName = m.SubmittedByUser != null ? m.SubmittedByUser.FullName : null,
                SubmissionEvidenceUrl = m.SubmissionEvidenceUrl,
                ReviewedAtUtc = m.ReviewedAtUtc,
                ReviewedByUserId = m.ReviewedByUserId,
                ReviewedByName = m.ReviewedByUser != null ? m.ReviewedByUser.FullName : null,
                ReviewFeedback = m.ReviewFeedback,
                IsOverdue = m.TargetDateUtc < DateTime.UtcNow && m.Status != MilestoneStatus.Approved,
                ReviewHistories = m.ReviewHistories
                    .Where(h => !h.IsDeleted)
                    .OrderByDescending(h => h.ReviewedAtUtc)
                    .Select(h => new MilestoneReviewHistoryDto
                    {
                        Id = h.Id,
                        ProjectMilestoneId = h.ProjectMilestoneId,
                        ReviewerUserId = h.ReviewerUserId,
                        ReviewerName = h.ReviewerUser != null ? h.ReviewerUser.FullName : string.Empty,
                        ResultStatus = h.ResultStatus,
                        Feedback = h.Feedback,
                        ReviewedAtUtc = h.ReviewedAtUtc
                    }).ToList()
            })
            .ToListAsync();

        return Ok(milestones);
    }

    [HttpPost("workspace/milestones")]
    public async Task<ActionResult<ProjectMilestoneDto>> CreateMilestone([FromBody] CreateMilestoneRequest request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "Active project team not found." });

        var membership = team.Members.FirstOrDefault(m => m.UserId == studentId && m.IsActive && !m.IsDeleted);
        if (membership == null || !membership.IsTeamLead)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the Team Leader is authorized to create project milestones." });
        }

        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length < 3 || request.Title.Trim().Length > 250)
        {
            return BadRequest(new { message = "Milestone title must be between 3 and 250 characters." });
        }

        if (string.IsNullOrWhiteSpace(request.Description) || request.Description.Trim().Length < 5 || request.Description.Trim().Length > 2000)
        {
            return BadRequest(new { message = "Milestone description must be between 5 and 2000 characters." });
        }

        var milestone = new ProjectMilestone
        {
            CollegeId = team.CollegeId,
            ProjectTeamId = team.Id,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            TargetDateUtc = request.TargetDateUtc,
            RequiredTaskCompletionPercentage = Math.Clamp(request.RequiredTaskCompletionPercentage, 0, 100),
            Status = MilestoneStatus.Pending
        };

        await _context.ProjectMilestones.AddAsync(milestone);

        var auditLog = new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = membership.User?.Email ?? string.Empty,
            Action = "STUDENT_MILESTONE_CREATED",
            TargetTenantId = team.CollegeId,
            TargetEntity = "ProjectMilestone",
            MetadataJson = JsonSerializer.Serialize(new
            {
                milestoneId = milestone.Id,
                teamId = team.Id,
                title = milestone.Title,
                targetDateUtc = milestone.TargetDateUtc
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();

        var dto = new ProjectMilestoneDto
        {
            Id = milestone.Id,
            ProjectTeamId = milestone.ProjectTeamId,
            Title = milestone.Title,
            Description = milestone.Description,
            TargetDateUtc = milestone.TargetDateUtc,
            Status = milestone.Status,
            RequiredTaskCompletionPercentage = milestone.RequiredTaskCompletionPercentage,
            IsOverdue = milestone.TargetDateUtc < DateTime.UtcNow && milestone.Status != MilestoneStatus.Approved,
            ReviewHistories = new()
        };

        return CreatedAtAction(nameof(GetWorkspaceMilestones), new { id = milestone.Id }, dto);
    }

    [HttpPut("workspace/milestones/{milestoneId}")]
    public async Task<IActionResult> UpdateMilestone(Guid milestoneId, [FromBody] UpdateMilestoneRequest request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "Active project team not found." });

        var membership = team.Members.FirstOrDefault(m => m.UserId == studentId && m.IsActive && !m.IsDeleted);
        if (membership == null || !membership.IsTeamLead)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the Team Leader is authorized to edit project milestones." });
        }

        var milestone = await _context.ProjectMilestones.FirstOrDefaultAsync(m => m.Id == milestoneId && m.ProjectTeamId == team.Id && !m.IsDeleted);
        if (milestone == null) return NotFound(new { message = "Milestone not found." });

        if (milestone.Status == MilestoneStatus.Approved)
        {
            return BadRequest(new { message = "Approved milestones cannot be modified." });
        }

        if (milestone.Status == MilestoneStatus.SubmittedForReview)
        {
            return BadRequest(new { message = "Milestones currently submitted for review cannot be modified until the faculty review is completed." });
        }

        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length < 3 || request.Title.Trim().Length > 250)
        {
            return BadRequest(new { message = "Milestone title must be between 3 and 250 characters." });
        }

        if (string.IsNullOrWhiteSpace(request.Description) || request.Description.Trim().Length < 5 || request.Description.Trim().Length > 2000)
        {
            return BadRequest(new { message = "Milestone description must be between 5 and 2000 characters." });
        }

        milestone.Title = request.Title.Trim();
        milestone.Description = request.Description.Trim();
        milestone.TargetDateUtc = request.TargetDateUtc;
        milestone.RequiredTaskCompletionPercentage = Math.Clamp(request.RequiredTaskCompletionPercentage, 0, 100);

        var auditLog = new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = membership.User?.Email ?? string.Empty,
            Action = "STUDENT_MILESTONE_UPDATED",
            TargetTenantId = team.CollegeId,
            TargetEntity = "ProjectMilestone",
            MetadataJson = JsonSerializer.Serialize(new
            {
                milestoneId = milestone.Id,
                teamId = team.Id,
                title = milestone.Title
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();
        return Ok(new { success = true, milestoneId = milestone.Id });
    }

    [HttpPost("workspace/milestones/{milestoneId}/submit")]
    public async Task<IActionResult> SubmitMilestoneForReview(Guid milestoneId, [FromBody] SubmitMilestoneRequest request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "Active project team not found." });

        var membership = team.Members.FirstOrDefault(m => m.UserId == studentId && m.IsActive && !m.IsDeleted);
        if (membership == null || !membership.IsTeamLead)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the Team Leader is authorized to submit milestones for faculty review." });
        }

        if (team.GuideUserId == null)
        {
            return BadRequest(new { message = "Cannot submit milestone for review before an official faculty guide has been allocated to the project." });
        }

        var milestone = await _context.ProjectMilestones.FirstOrDefaultAsync(m => m.Id == milestoneId && m.ProjectTeamId == team.Id && !m.IsDeleted);
        if (milestone == null) return NotFound(new { message = "Milestone not found." });

        if (milestone.Status == MilestoneStatus.Approved)
        {
            return BadRequest(new { message = "This milestone has already been approved." });
        }

        if (milestone.Status == MilestoneStatus.SubmittedForReview)
        {
            return BadRequest(new { message = "This milestone is already currently pending faculty review." });
        }

        if (string.IsNullOrWhiteSpace(request.SubmissionEvidenceUrl) || request.SubmissionEvidenceUrl.Trim().Length < 5)
        {
            return BadRequest(new { message = "Submission evidence URL or note must be at least 5 characters." });
        }

        // Validate sprint task completion threshold if specified
        if (milestone.RequiredTaskCompletionPercentage > 0)
        {
            var tasks = await _context.SprintTasks.Where(t => t.ProjectTeamId == team.Id && !t.IsDeleted).ToListAsync();
            var totalTasks = tasks.Count;
            var completedTasks = tasks.Count(t => t.Status == SprintTaskStatus.Done);
            var actualPct = totalTasks > 0 ? (int)Math.Round((double)completedTasks / totalTasks * 100.0) : 0;
            if (actualPct < milestone.RequiredTaskCompletionPercentage)
            {
                return BadRequest(new { message = $"Milestone requires at least {milestone.RequiredTaskCompletionPercentage}% sprint task completion. Current completion is {actualPct}%." });
            }
        }

        milestone.Status = MilestoneStatus.SubmittedForReview;
        milestone.SubmittedAtUtc = DateTime.UtcNow;
        milestone.SubmittedByUserId = studentId;
        milestone.SubmissionEvidenceUrl = request.SubmissionEvidenceUrl.Trim();

        var auditLog = new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = membership.User?.Email ?? string.Empty,
            Action = "STUDENT_MILESTONE_SUBMITTED",
            TargetTenantId = team.CollegeId,
            TargetEntity = "ProjectMilestone",
            MetadataJson = JsonSerializer.Serialize(new
            {
                milestoneId = milestone.Id,
                teamId = team.Id,
                guideUserId = team.GuideUserId,
                evidence = milestone.SubmissionEvidenceUrl
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();
        return Ok(new { success = true, milestoneId = milestone.Id, status = milestone.Status });
    }

    [HttpGet("workspace/milestones/{milestoneId}/history")]
    public async Task<ActionResult<List<MilestoneReviewHistoryDto>>> GetMilestoneHistory(Guid milestoneId)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "Active project team not found." });

        var milestone = await _context.ProjectMilestones.FirstOrDefaultAsync(m => m.Id == milestoneId && m.ProjectTeamId == team.Id && !m.IsDeleted);
        if (milestone == null) return NotFound(new { message = "Milestone not found." });

        var histories = await _context.MilestoneReviewHistories
            .Include(h => h.ReviewerUser)
            .Where(h => h.ProjectMilestoneId == milestoneId && !h.IsDeleted)
            .OrderByDescending(h => h.ReviewedAtUtc)
            .Select(h => new MilestoneReviewHistoryDto
            {
                Id = h.Id,
                ProjectMilestoneId = h.ProjectMilestoneId,
                ReviewerUserId = h.ReviewerUserId,
                ReviewerName = h.ReviewerUser != null ? h.ReviewerUser.FullName : string.Empty,
                ResultStatus = h.ResultStatus,
                Feedback = h.Feedback,
                ReviewedAtUtc = h.ReviewedAtUtc
            })
            .ToListAsync();

        return Ok(histories);
    }

    // =========================================================================
    // PHASE 8: PROJECT FINAL SUBMISSION & ACADEMIC DELIVERABLES
    // =========================================================================

    [HttpGet("workspace/submission")]
    public async Task<ActionResult<ProjectReportSubmissionDto>> GetFinalSubmission()
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await _context.ProjectTeams
            .Include(t => t.GuideUser)
            .Include(t => t.Members)
            .FirstOrDefaultAsync(t => t.CollegeId == _tenantContext.CollegeId &&
                                      t.Members.Any(m => m.UserId == studentId && m.IsActive && !m.IsDeleted) &&
                                      !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Active project team not found." });

        var submission = await _context.ProjectReportSubmissions
            .Include(s => s.SubmittedByUser)
            .Include(s => s.ReviewedByUser)
            .Include(s => s.ReviewHistories)
                .ThenInclude(h => h.ReviewerUser)
            .FirstOrDefaultAsync(s => s.ProjectTeamId == team.Id && !s.IsDeleted);

        var milestones = await _context.ProjectMilestones
            .Where(m => m.ProjectTeamId == team.Id && !m.IsDeleted)
            .ToListAsync();

        var readiness = BuildSubmissionReadiness(team, submission, milestones);

        if (submission == null)
        {
            return Ok(new ProjectReportSubmissionDto
            {
                Id = Guid.Empty,
                ProjectTeamId = team.Id,
                VersionNumber = 1,
                Status = FinalSubmissionStatus.Draft,
                ProjectTitle = team.Title ?? string.Empty,
                Abstract = team.Abstract ?? string.Empty,
                ProblemStatement = string.Empty,
                Methodology = string.Empty,
                ImplementationSummary = string.Empty,
                ResultsAndConclusion = string.Empty,
                References = string.Empty,
                RepositoryUrl = team.RepoUrl,
                DemoUrl = null,
                Readiness = readiness,
                ReviewHistories = new List<SubmissionReviewHistoryDto>()
            });
        }

        return Ok(MapSubmissionToDto(submission, readiness));
    }

    [HttpPut("workspace/submission/draft")]
    public async Task<ActionResult<ProjectReportSubmissionDto>> SaveSubmissionDraft([FromBody] SaveSubmissionDraftRequest request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await _context.ProjectTeams
            .Include(t => t.GuideUser)
            .Include(t => t.Members)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(t => t.CollegeId == _tenantContext.CollegeId &&
                                      t.Members.Any(m => m.UserId == studentId && m.IsActive && !m.IsDeleted) &&
                                      !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Active project team not found." });

        var membership = team.Members.FirstOrDefault(m => m.UserId == studentId && m.IsActive && !m.IsDeleted);
        if (membership == null || !membership.IsTeamLead)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the Team Leader is authorized to modify the final project submission draft." });
        }

        var submission = await _context.ProjectReportSubmissions
            .Include(s => s.SubmittedByUser)
            .Include(s => s.ReviewedByUser)
            .Include(s => s.ReviewHistories)
                .ThenInclude(h => h.ReviewerUser)
            .FirstOrDefaultAsync(s => s.ProjectTeamId == team.Id && !s.IsDeleted);

        if (submission != null &&
            submission.Status != FinalSubmissionStatus.Draft &&
            submission.Status != FinalSubmissionStatus.RevisionRequested)
        {
            return BadRequest(new { message = $"Submission cannot be modified while in status: {submission.Status}." });
        }

        if (submission == null)
        {
            submission = new ProjectReportSubmission
            {
                CollegeId = team.CollegeId,
                ProjectTeamId = team.Id,
                VersionNumber = 1,
                Status = FinalSubmissionStatus.Draft,
                ProjectTitle = request.ProjectTitle.Trim(),
                Abstract = request.Abstract.Trim(),
                ProblemStatement = request.ProblemStatement?.Trim() ?? string.Empty,
                Methodology = request.Methodology?.Trim() ?? string.Empty,
                ImplementationSummary = request.ImplementationSummary?.Trim() ?? string.Empty,
                ResultsAndConclusion = request.ResultsAndConclusion?.Trim() ?? string.Empty,
                References = request.References?.Trim() ?? string.Empty,
                RepositoryUrl = request.RepositoryUrl?.Trim(),
                DemoUrl = request.DemoUrl?.Trim()
            };
            await _context.ProjectReportSubmissions.AddAsync(submission);
        }
        else
        {
            submission.ProjectTitle = request.ProjectTitle.Trim();
            submission.Abstract = request.Abstract.Trim();
            submission.ProblemStatement = request.ProblemStatement?.Trim() ?? string.Empty;
            submission.Methodology = request.Methodology?.Trim() ?? string.Empty;
            submission.ImplementationSummary = request.ImplementationSummary?.Trim() ?? string.Empty;
            submission.ResultsAndConclusion = request.ResultsAndConclusion?.Trim() ?? string.Empty;
            submission.References = request.References?.Trim() ?? string.Empty;
            submission.RepositoryUrl = request.RepositoryUrl?.Trim();
            submission.DemoUrl = request.DemoUrl?.Trim();
        }

        var auditLog = new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = membership.User?.Email ?? string.Empty,
            Action = "STUDENT_SUBMISSION_DRAFT_SAVED",
            TargetTenantId = team.CollegeId,
            TargetEntity = "ProjectReportSubmission",
            MetadataJson = JsonSerializer.Serialize(new
            {
                teamId = team.Id,
                version = submission.VersionNumber,
                status = submission.Status.ToString(),
                title = submission.ProjectTitle
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();

        var milestones = await _context.ProjectMilestones
            .Where(m => m.ProjectTeamId == team.Id && !m.IsDeleted)
            .ToListAsync();

        var readiness = BuildSubmissionReadiness(team, submission, milestones);
        return Ok(MapSubmissionToDto(submission, readiness));
    }

    [HttpPost("workspace/submission/attach-report")]
    public async Task<ActionResult<ProjectReportSubmissionDto>> AttachReportDeliverable([FromBody] AttachReportDeliverableRequest request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await _context.ProjectTeams
            .Include(t => t.GuideUser)
            .Include(t => t.Members)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(t => t.CollegeId == _tenantContext.CollegeId &&
                                      t.Members.Any(m => m.UserId == studentId && m.IsActive && !m.IsDeleted) &&
                                      !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Active project team not found." });

        var membership = team.Members.FirstOrDefault(m => m.UserId == studentId && m.IsActive && !m.IsDeleted);
        if (membership == null || !membership.IsTeamLead)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the Team Leader is authorized to attach deliverables to the project submission." });
        }

        var submission = await _context.ProjectReportSubmissions
            .Include(s => s.SubmittedByUser)
            .Include(s => s.ReviewedByUser)
            .Include(s => s.ReviewHistories)
                .ThenInclude(h => h.ReviewerUser)
            .FirstOrDefaultAsync(s => s.ProjectTeamId == team.Id && !s.IsDeleted);

        if (submission == null)
        {
            submission = new ProjectReportSubmission
            {
                CollegeId = team.CollegeId,
                ProjectTeamId = team.Id,
                VersionNumber = 1,
                Status = FinalSubmissionStatus.Draft,
                ProjectTitle = team.Title ?? "Final Project Report",
                Abstract = team.Abstract ?? string.Empty
            };
            await _context.ProjectReportSubmissions.AddAsync(submission);
        }

        if (submission.Status != FinalSubmissionStatus.Draft &&
            submission.Status != FinalSubmissionStatus.RevisionRequested)
        {
            return BadRequest(new { message = $"Cannot attach deliverables while submission is in status: {submission.Status}." });
        }

        if (request.ReportArtifactId.HasValue)
        {
            var artifact = await _context.TeamArtifacts
                .FirstOrDefaultAsync(a => a.Id == request.ReportArtifactId.Value && a.ProjectTeamId == team.Id && !a.IsDeleted);

            if (artifact == null)
            {
                return NotFound(new { message = "Referenced artifact deliverable was not found for this team." });
            }

            submission.ReportArtifactId = artifact.Id;
            submission.ReportStorageKey = artifact.StorageKey;
            submission.ReportFileName = artifact.FileName;
            submission.ReportFileSizeBytes = artifact.FileSizeBytes;
            submission.ReportSha256Checksum = artifact.Sha256Checksum;
        }
        else if (!string.IsNullOrWhiteSpace(request.ReportFileName))
        {
            submission.ReportFileName = request.ReportFileName.Trim();
            submission.ReportFileSizeBytes = request.ReportFileSizeBytes;
            submission.ReportSha256Checksum = request.ReportSha256Checksum?.Trim();
        }

        var auditLog = new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = membership.User?.Email ?? string.Empty,
            Action = "STUDENT_SUBMISSION_REPORT_ATTACHED",
            TargetTenantId = team.CollegeId,
            TargetEntity = "ProjectReportSubmission",
            MetadataJson = JsonSerializer.Serialize(new
            {
                teamId = team.Id,
                artifactId = submission.ReportArtifactId,
                fileName = submission.ReportFileName,
                fileSizeBytes = submission.ReportFileSizeBytes
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();

        var milestones = await _context.ProjectMilestones
            .Where(m => m.ProjectTeamId == team.Id && !m.IsDeleted)
            .ToListAsync();

        var readiness = BuildSubmissionReadiness(team, submission, milestones);
        return Ok(MapSubmissionToDto(submission, readiness));
    }

    [HttpPost("workspace/submission/submit")]
    public async Task<ActionResult<ProjectReportSubmissionDto>> SubmitFinalReport([FromBody] SubmitFinalReportRequest request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await _context.ProjectTeams
            .Include(t => t.GuideUser)
            .Include(t => t.Members)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(t => t.CollegeId == _tenantContext.CollegeId &&
                                      t.Members.Any(m => m.UserId == studentId && m.IsActive && !m.IsDeleted) &&
                                      !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Active project team not found." });

        var membership = team.Members.FirstOrDefault(m => m.UserId == studentId && m.IsActive && !m.IsDeleted);
        if (membership == null || !membership.IsTeamLead)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the Team Leader is authorized to submit the final project report." });
        }

        var submission = await _context.ProjectReportSubmissions
            .Include(s => s.SubmittedByUser)
            .Include(s => s.ReviewedByUser)
            .Include(s => s.ReviewHistories)
                .ThenInclude(h => h.ReviewerUser)
            .FirstOrDefaultAsync(s => s.ProjectTeamId == team.Id && !s.IsDeleted);

        if (submission == null)
        {
            return BadRequest(new { message = "Please complete and save your submission draft before submitting." });
        }

        if (submission.Status != FinalSubmissionStatus.Draft &&
            submission.Status != FinalSubmissionStatus.RevisionRequested)
        {
            return BadRequest(new { message = $"Submission cannot be submitted while in status: {submission.Status}." });
        }

        var milestones = await _context.ProjectMilestones
            .Where(m => m.ProjectTeamId == team.Id && !m.IsDeleted)
            .ToListAsync();

        var readiness = BuildSubmissionReadiness(team, submission, milestones);
        if (!readiness.IsEligibleForSubmission)
        {
            return BadRequest(new
            {
                message = $"Submission eligibility check failed: {string.Join(" ", readiness.BlockingReasons)}",
                readiness
            });
        }

        var submittedAt = DateTime.UtcNow;
        if (submission.Status == FinalSubmissionStatus.RevisionRequested)
        {
            submission.VersionNumber += 1;
            submission.Status = FinalSubmissionStatus.Resubmitted;
        }
        else
        {
            submission.Status = FinalSubmissionStatus.Submitted;
        }

        submission.SubmittedAtUtc = submittedAt;
        submission.SubmittedByUserId = studentId;

        var auditLog = new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = membership.User?.Email ?? string.Empty,
            Action = "STUDENT_FINAL_SUBMISSION_SUBMITTED",
            TargetTenantId = team.CollegeId,
            TargetEntity = "ProjectReportSubmission",
            MetadataJson = JsonSerializer.Serialize(new
            {
                submissionId = submission.Id,
                teamId = team.Id,
                version = submission.VersionNumber,
                status = submission.Status.ToString(),
                guideUserId = team.GuideUserId,
                submittedAt = submittedAt
            }),
            OccurredAtUtc = submittedAt
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();

        return Ok(MapSubmissionToDto(submission, readiness));
    }

    [HttpGet("workspace/submission/history")]
    public async Task<ActionResult<List<SubmissionReviewHistoryDto>>> GetSubmissionHistory()
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await _context.ProjectTeams
            .Include(t => t.Members)
            .FirstOrDefaultAsync(t => t.CollegeId == _tenantContext.CollegeId &&
                                      t.Members.Any(m => m.UserId == studentId && m.IsActive && !m.IsDeleted) &&
                                      !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Active project team not found." });

        var submission = await _context.ProjectReportSubmissions
            .FirstOrDefaultAsync(s => s.ProjectTeamId == team.Id && !s.IsDeleted);

        if (submission == null)
        {
            return Ok(new List<SubmissionReviewHistoryDto>());
        }

        var histories = await _context.SubmissionReviewHistories
            .Include(h => h.ReviewerUser)
            .Where(h => h.ProjectReportSubmissionId == submission.Id && !h.IsDeleted)
            .OrderByDescending(h => h.ReviewedAtUtc)
            .Select(h => new SubmissionReviewHistoryDto
            {
                Id = h.Id,
                ProjectReportSubmissionId = h.ProjectReportSubmissionId,
                SubmissionVersion = h.SubmissionVersion,
                ReviewerUserId = h.ReviewerUserId,
                ReviewerName = h.ReviewerUser != null ? h.ReviewerUser.FullName : string.Empty,
                ResultStatus = h.ResultStatus,
                Feedback = h.Feedback,
                ReviewedAtUtc = h.ReviewedAtUtc
            })
            .ToListAsync();

        return Ok(histories);
    }

    [HttpPost("workspace/submission/review")]
    public IActionResult RejectStudentSelfReview()
    {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Students are strictly prohibited from conducting academic reviews or self-approving submissions." });
    }

    private static SubmissionReadinessDto BuildSubmissionReadiness(ProjectTeam team, ProjectReportSubmission? submission, List<ProjectMilestone> milestones)
    {
        var hasAllocatedGuide = team.GuideUserId != null;
        var approvedMilestonesCount = milestones.Count(m => m.Status == MilestoneStatus.Approved && !m.IsDeleted);
        var pendingMilestonesCount = milestones.Count(m => m.Status == MilestoneStatus.SubmittedForReview && !m.IsDeleted);
        var hasApprovedMilestones = approvedMilestonesCount > 0;
        var hasPendingMilestonesInReview = pendingMilestonesCount > 0;

        var hasRequiredFields = submission != null &&
            !string.IsNullOrWhiteSpace(submission.ProjectTitle) &&
            !string.IsNullOrWhiteSpace(submission.Abstract) &&
            !string.IsNullOrWhiteSpace(submission.ProblemStatement) &&
            !string.IsNullOrWhiteSpace(submission.Methodology) &&
            !string.IsNullOrWhiteSpace(submission.ImplementationSummary) &&
            !string.IsNullOrWhiteSpace(submission.ResultsAndConclusion);

        var hasAttachedReport = submission != null &&
            (submission.ReportArtifactId != null || !string.IsNullOrWhiteSpace(submission.ReportStorageKey) || !string.IsNullOrWhiteSpace(submission.ReportFileName));

        var blockingReasons = new List<string>();
        if (!hasAllocatedGuide)
        {
            blockingReasons.Add("An official faculty guide must be formally allocated before submitting the final project report.");
        }
        if (!hasApprovedMilestones)
        {
            blockingReasons.Add("At least one project milestone must be reviewed and approved by your faculty guide.");
        }
        if (hasPendingMilestonesInReview)
        {
            blockingReasons.Add($"{pendingMilestonesCount} project milestone(s) are currently under faculty review. Resolve all reviews before final submission.");
        }
        if (!hasRequiredFields)
        {
            blockingReasons.Add("All required academic deliverables (Title, Abstract, Problem Statement, Methodology, Implementation Summary, and Results/Conclusion) must be completed.");
        }
        if (!hasAttachedReport)
        {
            blockingReasons.Add("A final thesis/project report deliverable must be attached prior to formal submission.");
        }

        var isEligible = blockingReasons.Count == 0 &&
            (submission == null || submission.Status == FinalSubmissionStatus.Draft || submission.Status == FinalSubmissionStatus.RevisionRequested);

        return new SubmissionReadinessDto
        {
            HasAllocatedGuide = hasAllocatedGuide,
            AllocatedGuideName = team.GuideUser?.FullName,
            HasApprovedMilestones = hasApprovedMilestones,
            ApprovedMilestonesCount = approvedMilestonesCount,
            HasPendingMilestonesInReview = hasPendingMilestonesInReview,
            PendingMilestonesCount = pendingMilestonesCount,
            HasRequiredAcademicFields = hasRequiredFields,
            HasAttachedReport = hasAttachedReport,
            IsEligibleForSubmission = isEligible,
            BlockingReasons = blockingReasons
        };
    }

    private static ProjectReportSubmissionDto MapSubmissionToDto(ProjectReportSubmission submission, SubmissionReadinessDto readiness)
    {
        return new ProjectReportSubmissionDto
        {
            Id = submission.Id,
            ProjectTeamId = submission.ProjectTeamId,
            VersionNumber = submission.VersionNumber,
            Status = submission.Status,
            ProjectTitle = submission.ProjectTitle,
            Abstract = submission.Abstract,
            ProblemStatement = submission.ProblemStatement,
            Methodology = submission.Methodology,
            ImplementationSummary = submission.ImplementationSummary,
            ResultsAndConclusion = submission.ResultsAndConclusion,
            References = submission.References,
            RepositoryUrl = submission.RepositoryUrl,
            DemoUrl = submission.DemoUrl,
            ReportArtifactId = submission.ReportArtifactId,
            ReportFileName = submission.ReportFileName,
            ReportFileSizeBytes = submission.ReportFileSizeBytes,
            ReportSha256Checksum = submission.ReportSha256Checksum,
            SubmittedAtUtc = submission.SubmittedAtUtc,
            SubmittedByUserId = submission.SubmittedByUserId,
            SubmittedByName = submission.SubmittedByUser?.FullName,
            ReviewedAtUtc = submission.ReviewedAtUtc,
            ReviewedByUserId = submission.ReviewedByUserId,
            ReviewedByName = submission.ReviewedByUser?.FullName,
            ReviewFeedback = submission.ReviewFeedback,
            Readiness = readiness,
            ReviewHistories = submission.ReviewHistories
                .OrderByDescending(h => h.ReviewedAtUtc)
                .Select(h => new SubmissionReviewHistoryDto
                {
                    Id = h.Id,
                    ProjectReportSubmissionId = h.ProjectReportSubmissionId,
                    SubmissionVersion = h.SubmissionVersion,
                    ReviewerUserId = h.ReviewerUserId,
                    ReviewerName = h.ReviewerUser?.FullName ?? string.Empty,
                    ResultStatus = h.ResultStatus,
                    Feedback = h.Feedback,
                    ReviewedAtUtc = h.ReviewedAtUtc
                })
                .ToList()
        };
    }

    // =========================================================================
    // PHASE 9: EVALUATION, VIVA DEFENSE & ACADEMIC GRADING
    // =========================================================================

    [HttpGet("workspace/evaluation")]
    public async Task<ActionResult<StudentVivaResultDto>> GetStudentVivaResult()
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await _context.ProjectTeams
            .Include(t => t.Members)
                .ThenInclude(m => m.User)
            .Include(t => t.Department)
            .Include(t => t.AcademicTrack)
            .FirstOrDefaultAsync(t => t.CollegeId == _tenantContext.CollegeId &&
                                      t.Members.Any(m => m.UserId == studentId && m.IsActive && !m.IsDeleted) &&
                                      !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Active project team not found." });

        var schedule = await _context.TeamVivaDefenseSchedules
            .Include(s => s.VivaPanel)
                .ThenInclude(p => p!.Evaluators)
                    .ThenInclude(e => e.EvaluatorUser)
            .Where(s => s.ProjectTeamId == team.Id && !s.IsDeleted)
            .OrderByDescending(s => s.ScheduledDateUtc)
            .FirstOrDefaultAsync();

        var eval = await _context.VivaEvaluations
            .Include(e => e.IndividualScores)
                .ThenInclude(s => s.StudentUser)
            .FirstOrDefaultAsync(e => e.ProjectTeamId == team.Id &&
                                      e.CheckpointType == CheckpointType.FinalViva &&
                                      !e.IsDeleted);

        var stage = EvaluationStage.ReadyForViva;
        if (eval?.IsPublished == true) stage = EvaluationStage.Published;
        else if (eval?.IsLocked == true) stage = EvaluationStage.Evaluated;
        else if (eval != null) stage = EvaluationStage.EvaluationInProgress;
        else if (schedule != null && schedule.Status == VivaScheduleStatus.Scheduled) stage = EvaluationStage.Scheduled;

        VivaScheduleDto? scheduleDto = null;
        if (schedule != null)
        {
            scheduleDto = new VivaScheduleDto
            {
                Id = schedule.Id,
                CollegeId = schedule.CollegeId,
                DepartmentId = schedule.DepartmentId,
                DepartmentName = team.Department?.Name ?? string.Empty,
                AcademicTrackId = schedule.AcademicTrackId,
                TrackName = team.AcademicTrack?.Name ?? string.Empty,
                ProjectTeamId = schedule.ProjectTeamId,
                TeamCode = team.TeamCode,
                TeamTitle = team.Title,
                VivaPanelId = schedule.VivaPanelId,
                PanelName = schedule.VivaPanel?.PanelName,
                ScheduledDateUtc = schedule.ScheduledDateUtc,
                DurationMinutes = schedule.DurationMinutes,
                VenueOrLink = schedule.VenueOrLink,
                Status = schedule.Status,
                CandidateInstructions = schedule.CandidateInstructions,
                EvaluatorNames = schedule.VivaPanel?.Evaluators
                    .Where(e => !e.IsDeleted && e.EvaluatorUser != null)
                    .Select(e => e.EvaluatorUser!.FullName)
                    .ToList() ?? new List<string>(),
                ScheduledAtUtc = schedule.ScheduledAtUtc,
                RescheduledAtUtc = schedule.RescheduledAtUtc
            };
        }

        var result = new StudentVivaResultDto
        {
            TeamId = team.Id,
            TeamCode = team.TeamCode,
            Title = team.Title,
            Status = team.Status,
            EvaluationStage = stage,
            Schedule = scheduleDto,
            Outcome = eval?.Outcome ?? VivaOutcome.Pending,
            IsPublished = eval?.IsPublished ?? false,
            PublishedAtUtc = eval?.PublishedAtUtc,
            GeneralRemarks = eval?.IsPublished == true ? eval.GeneralRemarks : null,
            ModerationRemarks = eval?.IsPublished == true ? eval.ModerationRemarks : null
        };

        if (eval != null && eval.IsPublished)
        {
            var calculatedMax = 50.0m;
            List<EvaluatorAssessmentCriterionScoreDto>? criteria = null;

            if (!string.IsNullOrWhiteSpace(eval.SharedRubricScoresJson))
            {
                try
                {
                    criteria = JsonSerializer.Deserialize<List<EvaluatorAssessmentCriterionScoreDto>>(eval.SharedRubricScoresJson);
                    if (criteria != null && criteria.Count > 0)
                    {
                        var sum = criteria.Sum(c => c.MaxMarks);
                        if (sum > 0) calculatedMax = sum;
                    }
                }
                catch { }
            }

            result = result with
            {
                SharedTotalScore = eval.SharedTotalScore,
                SharedMaxScore = calculatedMax,
                CriteriaScores = criteria ?? new List<EvaluatorAssessmentCriterionScoreDto>()
            };

            var myScore = eval.IndividualScores.FirstOrDefault(s => s.StudentUserId == studentId);
            if (myScore != null)
            {
                result = result with
                {
                    MyIndividualScore = new StudentIndividualScoreDto
                    {
                        StudentUserId = myScore.StudentUserId,
                        StudentName = myScore.StudentUser?.FullName ?? string.Empty,
                        EnrollmentCode = myScore.StudentUser?.EnrollmentOrEmployeeCode ?? string.Empty,
                        ModuleOwnershipScore = myScore.ModuleOwnershipScore,
                        VivaQaScore = myScore.VivaQaScore,
                        LogDisciplineScore = myScore.LogDisciplineScore,
                        IndividualTotalScore = myScore.IndividualTotalScore,
                        FinalComputedStudentMark = myScore.FinalComputedStudentMark
                    }
                };
            }

            result = result with
            {
                TeamMembersScores = eval.IndividualScores
                    .Select(s => new StudentIndividualScoreDto
                    {
                        StudentUserId = s.StudentUserId,
                        StudentName = s.StudentUser?.FullName ?? string.Empty,
                        EnrollmentCode = s.StudentUser?.EnrollmentOrEmployeeCode ?? string.Empty,
                        ModuleOwnershipScore = s.ModuleOwnershipScore,
                        VivaQaScore = s.VivaQaScore,
                        LogDisciplineScore = s.LogDisciplineScore,
                        IndividualTotalScore = s.IndividualTotalScore,
                        FinalComputedStudentMark = s.FinalComputedStudentMark
                    })
                    .ToList()
            };
        }

        return Ok(result);
    }

    [HttpPost("workspace/evaluation/submit")]
    public IActionResult RejectStudentEvaluationSubmit()
    {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Students are strictly prohibited from evaluating projects or awarding marks." });
    }

    [HttpPost("workspace/evaluation/publish")]
    public IActionResult RejectStudentEvaluationPublish()
    {
        return StatusCode(StatusCodes.Status403Forbidden, new { message = "Students are strictly prohibited from publishing academic evaluation marks." });
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

    [HttpPost("artifacts/{slot}/upload")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(26_214_400)]
    public async Task<ActionResult<ArtifactSlotDto>> UploadArtifactBinary(
        [FromRoute] string slot,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No deliverable file was uploaded." });
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".pdf" && ext != ".ppt" && ext != ".pptx")
        {
            return BadRequest(new { message = "Invalid file type. Only PDF (.pdf) and PowerPoint (.ppt, .pptx) files are permitted in the Capstone Vault." });
        }

        if (file.Length > 26_214_400)
        {
            return BadRequest(new { message = "File size exceeds maximum allowed upload size of 25 MB." });
        }

        if (!Enum.TryParse<ArtifactSlotType>(slot, true, out var slotType))
        {
            return BadRequest(new { message = $"Invalid deliverable slot '{slot}'. Permitted slots: Synopsis, MidTermPPT, PlagiarismReport, FinalThesis." });
        }

        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "Active project team not found." });

        await using var stream = file.OpenReadStream();
        var (storageKey, checksum, fileSizeBytes) = await _fileStorageService.SaveAsync(
            team.CollegeId,
            team.Id,
            slotType.ToString(),
            file.FileName,
            stream,
            cancellationToken);

        var artifact = await _context.TeamArtifacts
            .FirstOrDefaultAsync(a => a.ProjectTeamId == team.Id && a.SlotType == slotType && !a.IsDeleted, cancellationToken);

        if (artifact == null)
        {
            artifact = new TeamArtifact
            {
                CollegeId = team.CollegeId,
                ProjectTeamId = team.Id,
                SlotType = slotType,
                FileName = Path.GetFileName(file.FileName),
                StorageKey = storageKey,
                Sha256Checksum = checksum,
                FileSizeBytes = fileSizeBytes,
                Status = ArtifactStatus.Uploaded,
                UploadedByUserId = studentId,
                UpdatedAtUtc = DateTime.UtcNow
            };
            await _context.TeamArtifacts.AddAsync(artifact, cancellationToken);
        }
        else
        {
            artifact.FileName = Path.GetFileName(file.FileName);
            artifact.StorageKey = storageKey;
            artifact.Sha256Checksum = checksum;
            artifact.FileSizeBytes = fileSizeBytes;
            artifact.Status = ArtifactStatus.Uploaded;
            artifact.UploadedByUserId = studentId;
            artifact.ReviewerNote = null;
            artifact.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new ArtifactSlotDto
        {
            Id = artifact.Id,
            SlotType = artifact.SlotType,
            FileName = artifact.FileName,
            StorageKey = artifact.StorageKey,
            Sha256Checksum = artifact.Sha256Checksum,
            FileSizeBytes = artifact.FileSizeBytes,
            Status = artifact.Status,
            ReviewerNote = artifact.ReviewerNote
        });
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

    // =========================================================================
    // PHASE 3: PROJECT DISCOVERY, PROBLEM BANK & IDEA REGISTRATION
    // =========================================================================

    [HttpGet("problem-bank")]
    public async Task<ActionResult<List<ProblemBankStatementDto>>> GetProblemBank(
        [FromQuery] string? domain,
        [FromQuery] string? sdg,
        [FromQuery] string? search)
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var student = await _context.Users.FirstOrDefaultAsync(u => u.Id == studentId && u.CollegeId == collegeId && !u.IsDeleted);
        if (student == null) return Unauthorized();

        var query = _context.ProblemBankStatements
            .Include(p => p.ProposedByFaculty)
            .Include(p => p.Department)
            .Include(p => p.AcademicTrack)
            .Where(p => p.CollegeId == collegeId && !p.IsAllocated && !p.IsDeleted);

        if (student.DepartmentId.HasValue)
        {
            query = query.Where(p => p.DepartmentId == student.DepartmentId.Value);
        }

        if (!string.IsNullOrWhiteSpace(sdg))
        {
            var sdgTrim = sdg.Trim().ToUpperInvariant();
            query = query.Where(p => p.SdgCode.ToUpper().Contains(sdgTrim));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(p => p.Title.ToLower().Contains(s) || p.Abstract.ToLower().Contains(s));
        }

        var statements = await query
            .OrderByDescending(p => p.CreatedAtUtc)
            .Select(p => new ProblemBankStatementDto
            {
                Id = p.Id,
                Title = p.Title,
                Abstract = p.Abstract,
                SdgCode = p.SdgCode,
                Prerequisites = string.IsNullOrWhiteSpace(p.PrerequisitesCsv)
                    ? new List<string>()
                    : p.PrerequisitesCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(),
                MaxTeamCapacity = p.MaxTeamCapacity,
                IsAllocated = p.IsAllocated,
                ProposedByFacultyId = p.ProposedByFacultyId,
                FacultyName = p.ProposedByFaculty != null ? p.ProposedByFaculty.FullName : "Faculty Mentor",
                DepartmentName = p.Department != null ? p.Department.Name : "Engineering",
                DepartmentCode = p.Department != null ? p.Department.Code : "ENG",
                AcademicTrackName = p.AcademicTrack != null ? p.AcademicTrack.Name : "Project Track",
                CreatedAtUtc = p.CreatedAtUtc
            })
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(domain))
        {
            var d = domain.Trim().ToLower();
            statements = statements.Where(s =>
                s.Title.ToLower().Contains(d) ||
                s.Abstract.ToLower().Contains(d) ||
                s.Prerequisites.Any(p => p.ToLower().Contains(d))).ToList();
        }

        return Ok(statements);
    }

    [HttpGet("problem-bank/{id}")]
    public async Task<ActionResult<ProblemBankStatementDto>> GetProblemBankStatement(Guid id)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var p = await _context.ProblemBankStatements
            .Include(x => x.ProposedByFaculty)
            .Include(x => x.Department)
            .Include(x => x.AcademicTrack)
            .FirstOrDefaultAsync(x => x.Id == id && x.CollegeId == collegeId && !x.IsDeleted);

        if (p == null) return NotFound(new { message = "Problem statement not found." });

        return Ok(new ProblemBankStatementDto
        {
            Id = p.Id,
            Title = p.Title,
            Abstract = p.Abstract,
            SdgCode = p.SdgCode,
            Prerequisites = string.IsNullOrWhiteSpace(p.PrerequisitesCsv)
                ? new List<string>()
                : p.PrerequisitesCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(),
            MaxTeamCapacity = p.MaxTeamCapacity,
            IsAllocated = p.IsAllocated,
            ProposedByFacultyId = p.ProposedByFacultyId,
            FacultyName = p.ProposedByFaculty != null ? p.ProposedByFaculty.FullName : "Faculty Mentor",
            DepartmentName = p.Department != null ? p.Department.Name : "Engineering",
            DepartmentCode = p.Department != null ? p.Department.Code : "ENG",
            AcademicTrackName = p.AcademicTrack != null ? p.AcademicTrack.Name : "Project Track",
            CreatedAtUtc = p.CreatedAtUtc
        });
    }

    [HttpGet("faculty-guides")]
    public async Task<ActionResult<List<FacultyGuideSummaryDto>>> GetFacultyGuides()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var studentId = _tenantContext.UserId;

        var enrollment = await _context.StudentAcademicEnrollments
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.StudentUserId == studentId && e.AcademicStatus == AcademicStatus.Active);

        var student = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == studentId && u.CollegeId == collegeId);

        var deptId = enrollment?.DepartmentId ?? student?.DepartmentId;

        var query = _context.Users
            .AsNoTracking()
            .Include(u => u.Department)
            .Include(u => u.GuidedTeams)
            .Where(u => u.CollegeId == collegeId && (u.Role == UserRole.Faculty || u.Role == UserRole.HOD) && u.IsActive && !u.IsDeleted);

        if (deptId.HasValue && deptId.Value != Guid.Empty)
        {
            query = query.Where(u => u.DepartmentId == deptId.Value);
        }

        var guides = await query
            .OrderBy(u => u.FullName)
            .Select(u => new FacultyGuideSummaryDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                EmployeeCode = null, // Data minimization: internal HR employee code concealed from student directory
                Designation = u.Designation != null ? u.Designation.ToString() : null,
                DepartmentCode = u.Department != null ? u.Department.Code : null,
                SkillsCsv = u.SkillsCsv,
                CurrentMentoredTeams = u.GuidedTeams.Count(t => !t.IsDeleted && t.Status != ProjectStatus.Archived && t.Status != ProjectStatus.Completed),
                MaxMentorTeams = u.MaxMentorTeams
            })
            .ToListAsync();

        return Ok(guides);
    }

    [HttpGet("projects/archive")]
    public async Task<ActionResult<List<ArchivedProjectSummaryDto>>> GetArchivedProjects(
        [FromQuery] string? search,
        [FromQuery] string? domain,
        [FromQuery] string? sdg)
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var student = await _context.Users.FirstOrDefaultAsync(u => u.Id == studentId && u.CollegeId == collegeId && !u.IsDeleted);
        if (student == null) return Unauthorized();

        var query = _context.ProjectTeams
            .Include(t => t.GuideUser)
            .Include(t => t.AcademicTrack)
            .Include(t => t.Members)
            .Where(t => t.CollegeId == collegeId &&
                        (t.Status == ProjectStatus.Completed || t.Status == ProjectStatus.Archived) &&
                        !t.IsDeleted);

        if (student.DepartmentId.HasValue)
        {
            query = query.Where(t => t.DepartmentId == student.DepartmentId.Value);
        }

        if (!string.IsNullOrWhiteSpace(domain))
        {
            var d = domain.Trim().ToLower();
            query = query.Where(t => t.DomainTag.ToLower().Contains(d));
        }

        if (!string.IsNullOrWhiteSpace(sdg))
        {
            var s = sdg.Trim().ToUpperInvariant();
            query = query.Where(t => t.SdgCode.ToUpper().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLower();
            query = query.Where(t => t.Title.ToLower().Contains(q) || t.Abstract.ToLower().Contains(q) || t.TeamCode.ToLower().Contains(q));
        }

        var list = await query
            .OrderByDescending(t => t.CreatedAtUtc)
            .Select(t => new ArchivedProjectSummaryDto
            {
                TeamId = t.Id,
                TeamCode = t.TeamCode,
                Title = t.Title,
                Abstract = t.Abstract,
                DomainTag = t.DomainTag,
                SdgCode = t.SdgCode,
                AcademicYear = t.AcademicTrack != null ? t.AcademicTrack.AcademicYear : "Previous Session",
                TrackName = t.AcademicTrack != null ? t.AcademicTrack.Name : "Capstone Project",
                GuideName = t.GuideUser != null ? t.GuideUser.FullName : "Department Faculty",
                RepoUrl = t.RepoUrl,
                Status = t.Status.ToString(),
                MemberCount = t.Members.Count(m => !m.IsDeleted),
                SimilarityScorePct = t.SimilarityScorePct
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("projects/archive/{id}")]
    public async Task<ActionResult<ArchivedProjectSummaryDto>> GetArchivedProject(Guid id)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var t = await _context.ProjectTeams
            .Include(x => x.GuideUser)
            .Include(x => x.AcademicTrack)
            .Include(x => x.Members)
            .FirstOrDefaultAsync(x => x.Id == id && x.CollegeId == collegeId &&
                                      (x.Status == ProjectStatus.Completed || x.Status == ProjectStatus.Archived) &&
                                      !x.IsDeleted);

        if (t == null) return NotFound(new { message = "Archived project not found." });

        return Ok(new ArchivedProjectSummaryDto
        {
            TeamId = t.Id,
            TeamCode = t.TeamCode,
            Title = t.Title,
            Abstract = t.Abstract,
            DomainTag = t.DomainTag,
            SdgCode = t.SdgCode,
            AcademicYear = t.AcademicTrack != null ? t.AcademicTrack.AcademicYear : "Previous Session",
            TrackName = t.AcademicTrack != null ? t.AcademicTrack.Name : "Capstone Project",
            GuideName = t.GuideUser != null ? t.GuideUser.FullName : "Department Faculty",
            RepoUrl = t.RepoUrl,
            Status = t.Status.ToString(),
            MemberCount = t.Members.Count(m => !m.IsDeleted),
            SimilarityScorePct = t.SimilarityScorePct
        });
    }

    [HttpGet("ideas")]
    public async Task<ActionResult<List<ProjectIdeaDto>>> GetIdeas()
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var teams = await _context.ProjectTeams
            .Include(t => t.GuideUser)
            .Include(t => t.Members)
                .ThenInclude(m => m.User)
            .Where(t => t.CollegeId == collegeId &&
                        t.Members.Any(m => m.UserId == studentId && m.IsActive && !m.IsDeleted) &&
                        !t.IsDeleted)
            .OrderByDescending(t => t.CreatedAtUtc)
            .ToListAsync();

        var dtoList = new List<ProjectIdeaDto>();
        foreach (var team in teams)
        {
            dtoList.Add(await MapToIdeaDtoAsync(team, studentId));
        }

        return Ok(dtoList);
    }

    [HttpGet("ideas/{id}")]
    public async Task<ActionResult<ProjectIdeaDto>> GetIdea(Guid id)
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var team = await _context.ProjectTeams
            .Include(t => t.GuideUser)
            .Include(t => t.Members)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(t => t.Id == id && t.CollegeId == collegeId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Project idea not found." });

        // Object ownership check: student must be an active member
        if (!team.Members.Any(m => m.UserId == studentId && m.IsActive && !m.IsDeleted))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "You do not have access to view this proposal." });
        }

        return Ok(await MapToIdeaDtoAsync(team, studentId));
    }

    [HttpPost("ideas")]
    public async Task<ActionResult<ProjectIdeaDto>> CreateIdea([FromBody] CreateProjectIdeaRequest request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var student = await _context.Users
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == studentId && u.CollegeId == collegeId && !u.IsDeleted);
        if (student == null) return Unauthorized();

        // 1. Verify active enrollment
        var enrollment = await _context.StudentAcademicEnrollments
            .FirstOrDefaultAsync(e => e.StudentUserId == studentId && e.CollegeId == collegeId && e.AcademicStatus == AcademicStatus.Active && !e.IsDeleted);
        if (enrollment == null)
        {
            return BadRequest(new { message = "You must have an active academic enrollment to register an idea." });
        }

        // 2. Prevent duplicate active registration (REG-002)
        var existingActiveTeam = await _context.TeamMembers
            .Include(m => m.ProjectTeam)
            .FirstOrDefaultAsync(m => m.UserId == studentId && m.IsActive && !m.IsDeleted &&
                                      m.ProjectTeam != null && !m.ProjectTeam.IsDeleted &&
                                      m.ProjectTeam.Status != ProjectStatus.Archived &&
                                      m.ProjectTeam.Status != ProjectStatus.Completed);
        if (existingActiveTeam != null)
        {
            return Conflict(new { message = $"You already belong to an active project team ({existingActiveTeam.ProjectTeam!.TeamCode}). Students cannot register multiple active projects." });
        }

        // 3. Field validations
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length < 5)
        {
            return BadRequest(new { message = "Project title is mandatory and must be at least 5 characters long." });
        }
        if (request.Title.Trim().Length > 200)
        {
            return BadRequest(new { message = "Project title cannot exceed 200 characters." });
        }
        if (string.IsNullOrWhiteSpace(request.Abstract) || request.Abstract.Trim().Length < 20)
        {
            return BadRequest(new { message = "Project abstract is mandatory and must be at least 20 characters long." });
        }
        if (request.Abstract.Trim().Length > 2000)
        {
            return BadRequest(new { message = "Project abstract cannot exceed 2000 characters." });
        }

        var domain = string.IsNullOrWhiteSpace(request.DomainTag) ? "Engineering & Technology" : request.DomainTag.Trim();
        var sdg = string.IsNullOrWhiteSpace(request.SdgCode)
            ? "SDG-9"
            : (request.SdgCode.Trim().Length > 20 ? request.SdgCode.Trim()[..20] : request.SdgCode.Trim());

        // 4. Resolve academic track
        Guid trackId = request.AcademicTrackId ?? Guid.Empty;
        if (trackId == Guid.Empty && student.DepartmentId.HasValue)
        {
            var defaultTrack = await _context.AcademicTracks
                .FirstOrDefaultAsync(t => t.CollegeId == collegeId && t.DepartmentId == student.DepartmentId.Value && t.IsActive && !t.IsDeleted);
            if (defaultTrack != null) trackId = defaultTrack.Id;
        }

        // 5. Generate unique team code
        var deptCode = student.Department?.Code ?? "CSE";
        var year = DateTime.UtcNow.Year;
        var count = await _context.ProjectTeams.CountAsync(t => t.CollegeId == collegeId && t.DepartmentId == student.DepartmentId);
        var teamCode = $"{year}-{deptCode}-PRJ-{(count + 1):D2}";

        // 6. Compute similarity
        var simResult = await ComputeSimilarityAsync(request.Title, request.Abstract, student.DepartmentId, collegeId, null);

        // 7. Persist team in Draft state
        var newTeam = new ProjectTeam
        {
            CollegeId = collegeId,
            DepartmentId = student.DepartmentId ?? Guid.Empty,
            AcademicTrackId = trackId,
            TeamCode = teamCode,
            Title = request.Title.Trim(),
            Abstract = request.Abstract.Trim(),
            DomainTag = domain,
            SdgCode = sdg,
            Status = ProjectStatus.Draft,
            GuideUserId = null, // Phase 5.2: Student-supplied guide nomination MUST NOT directly assign official GuideUserId
            PreferredGuideUserId = request.GuideUserId,
            GuidePreferenceStatus = request.GuideUserId.HasValue ? GuidePreferenceStatus.Requested : GuidePreferenceStatus.None,
            GuidePreferenceSubmittedAtUtc = request.GuideUserId.HasValue ? DateTime.UtcNow : null,
            GuidePreferenceRemarks = request.GuideUserId.HasValue ? "Nominated during project idea creation" : null,
            GuideAllocatedAtUtc = null,
            GuideAllocatedByUserId = null,
            GuideAllocationRemarks = null,
            IsRosterLocked = false,
            SimilarityScorePct = simResult.SimilarityScorePct,
            SimilarProjectCode = simResult.SimilarProjectCode
        };
        await _context.ProjectTeams.AddAsync(newTeam);

        // 8. Add student as initial Team Lead
        var leadMember = new TeamMember
        {
            CollegeId = collegeId,
            UserId = studentId,
            ProjectTeamId = newTeam.Id,
            IsTeamLead = true,
            ModuleResponsibility = "Project Architecture & Team Lead",
            IsActive = true
        };
        await _context.TeamMembers.AddAsync(leadMember);

        // 9. If problem bank statement adopted, link it
        if (request.AdoptedProblemBankId.HasValue)
        {
            var statement = await _context.ProblemBankStatements
                .FirstOrDefaultAsync(p => p.Id == request.AdoptedProblemBankId.Value && p.CollegeId == collegeId && !p.IsDeleted);
            if (statement != null && !statement.IsAllocated)
            {
                statement.IsAllocated = true;
                statement.AllocatedTeamId = newTeam.Id;
            }
        }

        // 10. Audit log
        var audit = new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = student.Email,
            Action = "STUDENT_IDEA_CREATED",
            TargetTenantId = collegeId,
            TargetEntity = "ProjectTeam",
            MetadataJson = JsonSerializer.Serialize(new
            {
                teamId = newTeam.Id,
                teamCode = newTeam.TeamCode,
                title = newTeam.Title,
                similarityScore = simResult.SimilarityScorePct
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(audit);

        await _context.SaveChangesAsync();

        var createdDto = await MapToIdeaDtoAsync(newTeam, studentId);
        return CreatedAtAction(nameof(GetIdea), new { id = newTeam.Id }, createdDto);
    }

    [HttpPut("ideas/{id}")]
    public async Task<ActionResult<ProjectIdeaDto>> UpdateIdea(Guid id, [FromBody] UpdateProjectIdeaRequest request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var team = await _context.ProjectTeams
            .Include(t => t.GuideUser)
            .Include(t => t.Members)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(t => t.Id == id && t.CollegeId == collegeId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Project idea not found." });

        // 1. Verify student is team leader
        var member = team.Members.FirstOrDefault(m => m.UserId == studentId && m.IsActive && !m.IsDeleted);
        if (member == null || !member.IsTeamLead)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the team leader can modify the proposal draft." });
        }

        // 2. Enforce Draft status
        if (team.Status != ProjectStatus.Draft)
        {
            return BadRequest(new { message = $"Only proposals in Draft status can be edited. Current status is {team.Status}." });
        }

        // 3. Update permitted fields
        if (request.Title != null)
        {
            if (request.Title.Trim().Length < 5) return BadRequest(new { message = "Project title must be at least 5 characters long." });
            if (request.Title.Trim().Length > 200) return BadRequest(new { message = "Project title cannot exceed 200 characters." });
            team.Title = request.Title.Trim();
        }

        if (request.Abstract != null)
        {
            if (request.Abstract.Trim().Length < 20) return BadRequest(new { message = "Project abstract must be at least 20 characters long." });
            if (request.Abstract.Trim().Length > 2000) return BadRequest(new { message = "Project abstract cannot exceed 2000 characters." });
            team.Abstract = request.Abstract.Trim();
        }

        if (request.DomainTag != null) team.DomainTag = request.DomainTag.Trim();
        if (request.SdgCode != null) team.SdgCode = request.SdgCode.Trim();
        if (request.GuideUserId.HasValue)
        {
            if (team.GuideUserId.HasValue)
            {
                return BadRequest(new { message = "An official faculty guide has already been allocated to this project. Guide changes require institutional coordinator or HOD reassignment." });
            }
            team.PreferredGuideUserId = request.GuideUserId.Value;
            team.GuidePreferenceStatus = GuidePreferenceStatus.Requested;
            team.GuidePreferenceSubmittedAtUtc = DateTime.UtcNow;
            team.GuidePreferenceRemarks = "Updated during proposal edit";
        }

        // Recompute similarity
        var simResult = await ComputeSimilarityAsync(team.Title, team.Abstract, team.DepartmentId, collegeId, team.Id);
        team.SimilarityScorePct = simResult.SimilarityScorePct;
        team.SimilarProjectCode = simResult.SimilarProjectCode;

        await _context.SaveChangesAsync();

        return Ok(await MapToIdeaDtoAsync(team, studentId));
    }

    [HttpPost("ideas/{id}/submit")]
    public async Task<IActionResult> SubmitProposal(Guid id, [FromBody] SubmitProposalRequest? request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var team = await _context.ProjectTeams
            .Include(t => t.Members)
            .FirstOrDefaultAsync(t => t.Id == id && t.CollegeId == collegeId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Project idea not found." });

        // 1. Verify student is team leader
        var member = team.Members.FirstOrDefault(m => m.UserId == studentId && m.IsActive && !m.IsDeleted);
        if (member == null || !member.IsTeamLead)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the team leader can submit the proposal for review." });
        }

        // 2. Enforce Draft status
        if (team.Status != ProjectStatus.Draft)
        {
            return BadRequest(new { message = $"Only proposals in Draft status can be submitted. Current status is {team.Status}." });
        }

        // 3. Completeness validation
        if (string.IsNullOrWhiteSpace(team.Title) || team.Title.Length < 5)
        {
            return BadRequest(new { message = "Proposal title must be at least 5 characters long." });
        }
        if (string.IsNullOrWhiteSpace(team.Abstract) || team.Abstract.Length < 20)
        {
            return BadRequest(new { message = "Proposal abstract must be at least 20 characters long." });
        }

        // 4. Guide review assignment check (attaches designated reviewer for proposal evaluation pipeline)
        if (!team.GuideUserId.HasValue)
        {
            if (team.PreferredGuideUserId.HasValue)
            {
                team.GuideUserId = team.PreferredGuideUserId.Value;
            }
            else
            {
                // Assign first eligible faculty mentor in department if not explicitly set
                var defaultFaculty = await _context.Users
                    .FirstOrDefaultAsync(u => u.CollegeId == collegeId && u.DepartmentId == team.DepartmentId && u.Role == UserRole.Faculty && u.IsActive && !u.IsDeleted);
                if (defaultFaculty != null)
                {
                    team.GuideUserId = defaultFaculty.Id;
                }
                else
                {
                    return BadRequest(new { message = "Please select an assigned faculty guide before submitting your proposal." });
                }
            }
        }

        // 5. State transition: Draft -> PendingGuide
        var prevStatus = team.Status;
        team.Status = ProjectStatus.PendingGuide;
        team.IsRosterLocked = true;

        var studentEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? "student@colabex.edu";
        var audit = new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = studentEmail,
            Action = "STUDENT_PROPOSAL_SUBMITTED",
            TargetTenantId = collegeId,
            TargetEntity = "ProjectTeam",
            MetadataJson = JsonSerializer.Serialize(new
            {
                teamId = team.Id,
                teamCode = team.TeamCode,
                title = team.Title,
                previousStatus = prevStatus.ToString(),
                newStatus = team.Status.ToString(),
                guideUserId = team.GuideUserId,
                remarks = request?.Remarks
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
            status = team.Status.ToString(),
            message = "Proposal submitted successfully. Awaiting faculty guide review."
        });
    }

    [HttpPost("ideas/{id}/resubmit")]
    public async Task<IActionResult> ResubmitProposal(Guid id, [FromBody] SubmitProposalRequest? request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var team = await _context.ProjectTeams
            .Include(t => t.Members)
            .FirstOrDefaultAsync(t => t.Id == id && t.CollegeId == collegeId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Project idea not found." });

        // 1. Verify student is team leader
        var member = team.Members.FirstOrDefault(m => m.UserId == studentId && m.IsActive && !m.IsDeleted);
        if (member == null || !member.IsTeamLead)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the team leader can resubmit the proposal." });
        }

        // 2. Enforce Draft status
        if (team.Status != ProjectStatus.Draft)
        {
            return BadRequest(new { message = $"Only returned proposals in Draft status can be resubmitted. Current status is {team.Status}." });
        }

        // 3. Completeness validation
        if (string.IsNullOrWhiteSpace(team.Title) || team.Title.Length < 5)
        {
            return BadRequest(new { message = "Proposal title must be at least 5 characters long." });
        }
        if (string.IsNullOrWhiteSpace(team.Abstract) || team.Abstract.Length < 20)
        {
            return BadRequest(new { message = "Proposal abstract must be at least 20 characters long." });
        }

        // 4. Guide review assignment check
        if (!team.GuideUserId.HasValue)
        {
            if (team.PreferredGuideUserId.HasValue)
            {
                team.GuideUserId = team.PreferredGuideUserId.Value;
            }
            else
            {
                var defaultFaculty = await _context.Users
                    .FirstOrDefaultAsync(u => u.CollegeId == collegeId && u.DepartmentId == team.DepartmentId && u.Role == UserRole.Faculty && u.IsActive && !u.IsDeleted);
                if (defaultFaculty != null) team.GuideUserId = defaultFaculty.Id;
                else return BadRequest(new { message = "Please select an assigned faculty guide before resubmitting your proposal." });
            }
        }

        // 5. State transition: Draft -> PendingGuide
        var prevStatus = team.Status;
        team.Status = ProjectStatus.PendingGuide;
        team.IsRosterLocked = true;

        var studentEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? "student@colabex.edu";
        var audit = new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = studentEmail,
            Action = "STUDENT_PROPOSAL_RESUBMITTED",
            TargetTenantId = collegeId,
            TargetEntity = "ProjectTeam",
            MetadataJson = JsonSerializer.Serialize(new
            {
                teamId = team.Id,
                teamCode = team.TeamCode,
                title = team.Title,
                previousStatus = prevStatus.ToString(),
                newStatus = team.Status.ToString(),
                guideUserId = team.GuideUserId,
                revisionRemarks = request?.Remarks
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
            status = team.Status.ToString(),
            message = "Revised proposal resubmitted successfully. Awaiting faculty guide review."
        });
    }

    [HttpPost("ideas/check-similarity")]
    public async Task<ActionResult<SimilarityCheckResultDto>> CheckIdeaSimilarity([FromBody] CheckSimilarityRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length < 3)
        {
            return Ok(new SimilarityCheckResultDto
            {
                SimilarityScorePct = 0,
                IsWarning = false,
                Message = "Title too short for similarity detection."
            });
        }

        var collegeId = _tenantContext.CollegeId!.Value;
        var studentId = _tenantContext.UserId!.Value;
        var student = await _context.Users.FirstOrDefaultAsync(u => u.Id == studentId && u.CollegeId == collegeId && !u.IsDeleted);
        if (student == null) return Unauthorized();

        var result = await ComputeSimilarityAsync(request.Title, request.Abstract, student.DepartmentId, collegeId, request.ExcludeTeamId);
        return Ok(result);
    }

    // --- Similarity & Mapping Helpers ---

    private async Task<SimilarityCheckResultDto> ComputeSimilarityAsync(
        string title,
        string? abstractText,
        Guid? departmentId,
        Guid collegeId,
        Guid? excludeTeamId)
    {
        var inputWords = TokenizeText(title + " " + (abstractText ?? ""));
        if (inputWords.Count == 0)
        {
            return new SimilarityCheckResultDto { SimilarityScorePct = 0, IsWarning = false, Message = "No significant keywords detected." };
        }

        var candidates = await _context.ProjectTeams
            .Where(t => t.CollegeId == collegeId &&
                        (!departmentId.HasValue || t.DepartmentId == departmentId.Value) &&
                        (!excludeTeamId.HasValue || t.Id != excludeTeamId.Value) &&
                        !t.IsDeleted)
            .Select(t => new { t.Id, t.TeamCode, t.Title, t.Abstract })
            .ToListAsync();

        decimal bestScore = 0;
        string? bestCode = null;
        string? bestTitle = null;

        foreach (var candidate in candidates)
        {
            var candidateWords = TokenizeText(candidate.Title + " " + candidate.Abstract);
            if (candidateWords.Count == 0) continue;

            var intersectionCount = inputWords.Intersect(candidateWords).Count();
            var unionCount = inputWords.Union(candidateWords).Count();
            if (unionCount == 0) continue;

            var score = Math.Round(((decimal)intersectionCount / unionCount) * 100, 1);
            if (score > bestScore)
            {
                bestScore = score;
                bestCode = candidate.TeamCode;
                bestTitle = candidate.Title;
            }
        }

        bool isWarning = bestScore >= 65m;
        string message = isWarning
            ? $"High content similarity ({bestScore}%) detected with existing project {bestCode}: '{bestTitle}'. Ensure your proposal incorporates distinct technical innovation."
            : $"Similarity check passed ({bestScore}% max overlap).";

        return new SimilarityCheckResultDto
        {
            SimilarityScorePct = bestScore,
            SimilarProjectCode = bestScore >= 50m ? bestCode : null,
            SimilarProjectTitle = bestScore >= 50m ? bestTitle : null,
            IsWarning = isWarning,
            Message = message
        };
    }

    private static HashSet<string> TokenizeText(string text)
    {
        var stopwords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "and", "the", "for", "with", "system", "project", "based", "using", "automated",
            "implementation", "design", "development", "smart", "iot", "web", "app", "application",
            "platform", "campus", "college", "student", "faculty", "online", "framework", "real", "time"
        };

        var words = System.Text.RegularExpressions.Regex.Replace(text.ToLowerInvariant(), @"[^a-z0-9\s]", " ")
            .Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 2 && !stopwords.Contains(w));

        return new HashSet<string>(words, StringComparer.OrdinalIgnoreCase);
    }

    private async Task<ProjectIdeaDto> MapToIdeaDtoAsync(ProjectTeam team, Guid studentId)
    {
        var members = team.Members
            .Where(m => m.IsActive && !m.IsDeleted)
            .Select(m => new TeamMemberDto
            {
                UserId = m.UserId,
                FullName = m.User != null ? m.User.FullName : "Team Member",
                EnrollmentCode = m.User != null ? m.User.EnrollmentOrEmployeeCode : "",
                IsTeamLead = m.IsTeamLead,
                ModuleResponsibility = m.ModuleResponsibility
            })
            .ToList();

        // Query exception logs for review feedback
        var exceptionLogs = await _context.ExceptionAuditLogs
            .Include(e => e.ApprovedByUser)
            .Where(e => e.ProjectTeamId == team.Id && !e.IsDeleted)
            .OrderByDescending(e => e.ApprovedAtUtc ?? e.CreatedAtUtc)
            .ToListAsync();

        var latestException = exceptionLogs.FirstOrDefault();

        var history = exceptionLogs.Select(e => new ProjectReviewTimelineItemDto
        {
            Stage = e.ActionType == ExceptionActionType.ReturnProposal ? "FacultyGuideReview" : "HodReview",
            Action = e.ActionType.ToString(),
            Remarks = e.Reason,
            ReviewerName = e.ApprovedByUser != null ? e.ApprovedByUser.FullName : "Faculty Reviewer",
            OccurredAtUtc = e.ApprovedAtUtc ?? e.CreatedAtUtc
        }).ToList();

        var effectiveGuide = team.GuideUser ?? team.PreferredGuideUser;
        if (effectiveGuide == null && (team.GuideUserId.HasValue || team.PreferredGuideUserId.HasValue))
        {
            var guideId = team.GuideUserId ?? team.PreferredGuideUserId;
            if (guideId.HasValue)
            {
                effectiveGuide = await _context.Users.FirstOrDefaultAsync(u => u.Id == guideId.Value && !u.IsDeleted);
            }
        }

        return new ProjectIdeaDto
        {
            Id = team.Id,
            TeamCode = team.TeamCode,
            Title = team.Title,
            Abstract = team.Abstract,
            DomainTag = team.DomainTag,
            SdgCode = team.SdgCode,
            Status = team.Status.ToString(),
            GuideUserId = team.GuideUserId ?? team.PreferredGuideUserId,
            GuideName = effectiveGuide?.FullName,
            GuideEmail = effectiveGuide?.Email,
            IsLeader = team.Members.Any(m => m.UserId == studentId && m.IsTeamLead && m.IsActive && !m.IsDeleted),
            IsRosterLocked = team.IsRosterLocked,
            SimilarityScorePct = team.SimilarityScorePct,
            SimilarProjectCode = team.SimilarProjectCode,
            LatestReviewRemarks = latestException?.Reason,
            LatestReviewerName = latestException?.ApprovedByUser != null ? latestException.ApprovedByUser.FullName : null,
            LatestReviewedAtUtc = latestException?.ApprovedAtUtc ?? latestException?.CreatedAtUtc,
            CreatedAtUtc = team.CreatedAtUtc,
            Members = members,
            ReviewHistory = history
        };
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
            GuideUserId = null,
            PreferredGuideUserId = previousTeam.PreferredGuideUserId ?? previousTeam.GuideUserId,
            GuidePreferenceStatus = (previousTeam.PreferredGuideUserId.HasValue || previousTeam.GuideUserId.HasValue) ? GuidePreferenceStatus.Requested : GuidePreferenceStatus.None,
            GuidePreferenceRemarks = "Carried over from project lineage",
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

    [HttpGet("dashboard")]
    public async Task<ActionResult<StudentDashboardDto>> GetDashboard(CancellationToken cancellationToken)
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var user = await _context.Users
            .Include(u => u.College)
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == studentId && !u.IsDeleted, cancellationToken);

        if (user == null || !user.IsActive)
        {
            return Unauthorized(new { message = "Student account not found or is inactive." });
        }

        // 1. Resolve student active academic enrollment
        var enrollment = await _context.StudentAcademicEnrollments
            .Include(e => e.CourseProgram)
            .Include(e => e.Department)
            .Include(e => e.CurrentSemesterTerm)
                .ThenInclude(t => t!.AcademicSession)
            .FirstOrDefaultAsync(e => e.StudentUserId == studentId && e.AcademicStatus == AcademicStatus.Active && !e.IsDeleted, cancellationToken);

        // 2. Resolve academic session
        AcademicSession? session = enrollment?.CurrentSemesterTerm?.AcademicSession;
        if (session == null)
        {
            session = await _context.AcademicSessions
                .FirstOrDefaultAsync(s => s.CollegeId == collegeId && s.IsActive && !s.IsDeleted, cancellationToken);
        }

        var utcNow = DateTime.UtcNow;
        bool isOffseason = session == null || !session.IsActive || utcNow < session.StartDate || utcNow > session.EndDate;

        // 3. Resolve active project team
        var team = await GetCurrentStudentTeamAsync(studentId);
        bool isLeader = team != null && team.Members.Any(m => m.UserId == studentId && m.IsTeamLead && m.IsActive && !m.IsDeleted);

        // 4. Determine state
        string allocationState;
        if (enrollment == null)
        {
            allocationState = "NoActiveEnrollment";
        }
        else if (isOffseason)
        {
            allocationState = "Offseason";
        }
        else if (team == null)
        {
            allocationState = "Unallocated";
        }
        else if (team.Status == ProjectStatus.Completed)
        {
            allocationState = "Archived";
        }
        else
        {
            allocationState = team.Status.ToString();
        }

        // 5. Historical project teams
        var pastTeams = await _context.TeamMembers
            .Include(m => m.ProjectTeam)
                .ThenInclude(t => t!.GuideUser)
            .Where(m => m.UserId == studentId && m.IsActive && !m.IsDeleted && m.ProjectTeam != null && (team == null || m.ProjectTeam.Id != team.Id))
            .Select(m => m.ProjectTeam!)
            .ToListAsync(cancellationToken);

        DashboardProjectSummaryDto? activeProjectSummary = null;
        if (team != null)
        {
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

            var pendingTasks = team.Tasks.Count(t => !t.IsDeleted && t.Status != SprintTaskStatus.Done);
            var completedTasks = team.Tasks.Count(t => !t.IsDeleted && t.Status == SprintTaskStatus.Done);

            var nextTask = team.Tasks
                .Where(t => !t.IsDeleted && t.Status != SprintTaskStatus.Done && t.DueDateUtc.HasValue)
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
                .FirstOrDefault();

            var recentLog = team.WeeklyLogs
                .Where(l => !l.IsDeleted)
                .OrderByDescending(l => l.WeekNumber)
                .FirstOrDefault();
            string logStatus = recentLog == null ? "Missing" : recentLog.IsVerified ? "Verified" : "PendingVerification";

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

            activeProjectSummary = new DashboardProjectSummaryDto
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
                GuideEmail = team.GuideUser?.Email,
                PreferredGuideUserId = team.PreferredGuideUserId,
                PreferredGuideName = team.PreferredGuideUser?.FullName,
                GuidePreferenceStatus = team.GuidePreferenceStatus,
                GuidePreferenceRemarks = team.GuidePreferenceRemarks,
                GuideAllocationRemarks = team.GuideAllocationRemarks,
                IsTeamLead = isLeader,
                IsRosterLocked = team.IsRosterLocked,
                RepoUrl = team.RepoUrl,
                JiraBoardKey = team.JiraBoardKey,
                Members = members,
                PendingTasksCount = pendingTasks,
                CompletedTasksCount = completedTasks,
                NextUpcomingTask = nextTask,
                RecentLogbookStatus = logStatus,
                MissedLogStreak = team.MissedLogStreak,
                Artifacts = artifacts,
                ProposalRemarks = null
            };
        }

        var historicalSummaries = pastTeams.Select(pt => new DashboardProjectSummaryDto
        {
            TeamId = pt.Id,
            TeamCode = pt.TeamCode,
            Title = pt.Title,
            Abstract = pt.Abstract,
            DomainTag = pt.DomainTag,
            SdgCode = pt.SdgCode,
            Status = pt.Status,
            GuideUserId = pt.GuideUserId,
            GuideName = pt.GuideUser?.FullName,
            GuideEmail = pt.GuideUser?.Email,
            IsTeamLead = false,
            IsRosterLocked = pt.IsRosterLocked,
            RepoUrl = pt.RepoUrl,
            JiraBoardKey = pt.JiraBoardKey
        }).ToList();

        var dashboard = new StudentDashboardDto
        {
            Student = new StudentIdentitySummaryDto
            {
                StudentId = user.Id,
                FullName = user.FullName,
                EnrollmentCode = user.EnrollmentOrEmployeeCode,
                Email = user.Email,
                CollegeName = user.College?.Name ?? "Institutional Campus",
                DepartmentName = user.Department?.Name ?? (enrollment?.Department?.Name ?? "Engineering Department")
            },
            AcademicSession = session == null ? null : new AcademicSessionSummaryDto
            {
                SessionId = session.Id,
                SessionLabel = session.Label,
                IsActive = session.IsActive,
                IsOffseason = isOffseason,
                StartDate = session.StartDate,
                EndDate = session.EndDate,
                ExamCutoffDateUtc = session.ExamCutoffDateUtc
            },
            Enrollment = enrollment == null ? null : new AcademicEnrollmentSummaryDto
            {
                EnrollmentId = enrollment.Id,
                ProgramName = enrollment.CourseProgram?.Name ?? "Bachelor of Technology",
                DepartmentName = enrollment.Department?.Name ?? "Computer Science & Engineering",
                CurrentSemester = enrollment.CurrentSemesterTerm?.SemesterNumber ?? 6,
                SemesterName = enrollment.CurrentSemesterTerm?.SemesterName ?? "Semester 6",
                AdmissionBatch = enrollment.AdmissionBatch,
                AcademicStatus = enrollment.AcademicStatus.ToString()
            },
            AllocationState = allocationState,
            HasActiveProject = team != null,
            ActiveProject = activeProjectSummary,
            HistoricalProjects = historicalSummaries,
            Capabilities = new DashboardActionCapabilitiesDto
            {
                CanProposeProject = team == null && !isOffseason && enrollment != null,
                CanFormTeam = team == null && !isOffseason && enrollment != null,
                CanSubmitTasks = team != null && (team.Status == ProjectStatus.ActiveBuild || team.Status == ProjectStatus.ReadyForViva || team.Status == ProjectStatus.AtRisk),
                CanSubmitLogs = team != null && (team.Status == ProjectStatus.ActiveBuild || team.Status == ProjectStatus.AtRisk),
                CanUploadArtifacts = team != null && (team.Status == ProjectStatus.ActiveBuild || team.Status == ProjectStatus.ReadyForViva || team.Status == ProjectStatus.AtRisk),
                CanViewEvaluations = team != null && (team.Status == ProjectStatus.Completed || team.Status == ProjectStatus.ReadyForViva)
            }
        };

        return Ok(dashboard);
    }

    [HttpGet("profile")]
    public async Task<ActionResult<StudentProfileDto>> GetProfile(CancellationToken cancellationToken)
    {
        var studentId = _tenantContext.UserId!.Value;

        var user = await _context.Users
            .Include(u => u.College)
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == studentId && !u.IsDeleted, cancellationToken);

        if (user == null || !user.IsActive)
        {
            return Unauthorized(new { message = "Student account not found or is inactive." });
        }

        var enrollment = await _context.StudentAcademicEnrollments
            .Include(e => e.CourseProgram)
            .Include(e => e.Department)
            .Include(e => e.CurrentSemesterTerm)
            .FirstOrDefaultAsync(e => e.StudentUserId == studentId && e.AcademicStatus == AcademicStatus.Active && !e.IsDeleted, cancellationToken);

        var skillsList = string.IsNullOrWhiteSpace(user.SkillsCsv)
            ? new List<string>()
            : user.SkillsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

        string? bio = null;
        if (!string.IsNullOrWhiteSpace(user.ConsolePreferencesJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(user.ConsolePreferencesJson);
                if (doc.RootElement.TryGetProperty("bio", out var bioProp))
                {
                    bio = bioProp.GetString();
                }
            }
            catch { }
        }

        int completion = 20; // FullName & USN verified
        if (!string.IsNullOrWhiteSpace(user.PhoneNumber)) completion += 20;
        if (skillsList.Count > 0) completion += 20;
        if (!string.IsNullOrWhiteSpace(user.GitHubHandle)) completion += 20;
        if (!string.IsNullOrWhiteSpace(bio) || !string.IsNullOrWhiteSpace(user.JiraKey)) completion += 20;

        var profile = new StudentProfileDto
        {
            StudentId = user.Id,
            FullName = user.FullName,
            EnrollmentCode = user.EnrollmentOrEmployeeCode,
            Email = user.Email,
            CollegeName = user.College?.Name ?? "Institutional Campus",
            DepartmentName = user.Department?.Name ?? (enrollment?.Department?.Name ?? "Engineering Department"),
            ProgramName = enrollment?.CourseProgram?.Name ?? "Bachelor of Technology",
            AdmissionBatch = enrollment?.AdmissionBatch ?? "2023-2027",
            CurrentSemester = enrollment?.CurrentSemesterTerm?.SemesterNumber ?? 6,
            SemesterName = enrollment?.CurrentSemesterTerm?.SemesterName ?? "Semester 6",
            AcademicStatus = enrollment?.AcademicStatus.ToString() ?? "Active",
            Skills = skillsList,
            GitHubHandle = user.GitHubHandle,
            JiraKey = user.JiraKey,
            PhoneNumber = user.PhoneNumber,
            Bio = bio,
            ProfileCompletionPercentage = completion
        };

        return Ok(profile);
    }

    [HttpPut("profile")]
    public async Task<ActionResult<StudentProfileDto>> UpdateProfile([FromBody] UpdateStudentProfileRequest request, CancellationToken cancellationToken)
    {
        var studentId = _tenantContext.UserId!.Value;

        var user = await _context.Users
            .Include(u => u.College)
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == studentId && !u.IsDeleted, cancellationToken);

        if (user == null || !user.IsActive)
        {
            return Unauthorized(new { message = "Student account not found or is inactive." });
        }

        if (request.GitHubHandle != null)
        {
            var cleanGit = request.GitHubHandle.Trim();
            if (cleanGit.Length > 50)
            {
                return BadRequest(new { message = "GitHub handle cannot exceed 50 characters." });
            }
            if (!string.IsNullOrEmpty(cleanGit) && !Regex.IsMatch(cleanGit, @"^[a-zA-Z0-9\-_]+$"))
            {
                return BadRequest(new { message = "GitHub handle can only contain alphanumeric characters, underscores, and hyphens." });
            }
            user.GitHubHandle = cleanGit;
        }

        if (request.JiraKey != null)
        {
            var cleanJira = request.JiraKey.Trim().ToUpperInvariant();
            if (cleanJira.Length > 50)
            {
                return BadRequest(new { message = "Jira key cannot exceed 50 characters." });
            }
            if (!string.IsNullOrEmpty(cleanJira) && !Regex.IsMatch(cleanJira, @"^[A-Z0-9\-_]+$"))
            {
                return BadRequest(new { message = "Jira key can only contain uppercase letters, numbers, and hyphens." });
            }
            user.JiraKey = cleanJira;
        }

        if (request.PhoneNumber != null)
        {
            var cleanPhone = request.PhoneNumber.Trim();
            if (cleanPhone.Length > 25)
            {
                return BadRequest(new { message = "Phone number cannot exceed 25 characters." });
            }
            if (!string.IsNullOrEmpty(cleanPhone) && !Regex.IsMatch(cleanPhone, @"^[\+0-9\s\-()]{7,25}$"))
            {
                return BadRequest(new { message = "Invalid phone number format." });
            }
            if (cleanPhone != user.PhoneNumber)
            {
                user.PhoneNumber = cleanPhone;
                user.IsPhoneVerified = false;
            }
        }

        if (request.Skills != null)
        {
            var cleanSkills = request.Skills
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(25)
                .ToList();

            foreach (var s in cleanSkills)
            {
                if (s.Length > 50)
                {
                    return BadRequest(new { message = $"Skill tag '{s}' exceeds maximum length of 50 characters." });
                }
            }
            user.SkillsCsv = string.Join(",", cleanSkills);
        }

        if (request.Bio != null)
        {
            var cleanBio = request.Bio.Trim();
            if (cleanBio.Length > 500)
            {
                return BadRequest(new { message = "Bio cannot exceed 500 characters." });
            }

            Dictionary<string, object> prefs = new();
            if (!string.IsNullOrWhiteSpace(user.ConsolePreferencesJson))
            {
                try
                {
                    prefs = JsonSerializer.Deserialize<Dictionary<string, object>>(user.ConsolePreferencesJson) ?? new();
                }
                catch { }
            }
            prefs["bio"] = cleanBio;
            user.ConsolePreferencesJson = JsonSerializer.Serialize(prefs);
        }

        user.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return await GetProfile(cancellationToken);
    }

    // =========================================================================
    // PHASE 4: TEAM FORMATION, MEMBERSHIP & INVITATION ENDPOINTS (TEAM-001 TO TEAM-012)
    // =========================================================================

    /// <summary>
    /// TEAM-002 & TEAM-003: Search eligible classmates for team formation with strict data minimization.
    /// Excludes students already enrolled in an active project team and conceals private metrics (marks, phone, address).
    /// </summary>
    [HttpGet("eligible-peers")]
    [HttpGet("peers")]
    public async Task<ActionResult<List<EligiblePeerDto>>> GetEligiblePeers([FromQuery] string? search, CancellationToken cancellationToken)
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var caller = await _context.Users
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == studentId && u.CollegeId == collegeId && !u.IsDeleted, cancellationToken);
        if (caller == null) return Unauthorized();

        var callerEnrollment = await _context.StudentAcademicEnrollments
            .Include(e => e.Department)
            .Include(e => e.CourseProgram)
            .Include(e => e.CurrentSemesterTerm)
            .FirstOrDefaultAsync(e => e.StudentUserId == studentId && e.CollegeId == collegeId && e.AcademicStatus == AcademicStatus.Active && !e.IsDeleted, cancellationToken);

        if (callerEnrollment == null)
        {
            return Ok(new List<EligiblePeerDto>());
        }

        var departmentId = caller.DepartmentId ?? callerEnrollment.DepartmentId;

        // Query eligible students in same college and department
        var peerQuery = _context.Users
            .Where(u => u.CollegeId == collegeId &&
                        u.DepartmentId == departmentId &&
                        u.Role == UserRole.Student &&
                        u.IsActive &&
                        !u.IsDeleted &&
                        u.Id != studentId);

        // Filter out students who already have an active project team
        var activeMemberUserIds = await _context.TeamMembers
            .Where(m => m.CollegeId == collegeId &&
                        m.IsActive &&
                        !m.IsDeleted &&
                        m.ProjectTeam != null &&
                        !m.ProjectTeam.IsDeleted &&
                        m.ProjectTeam.Status != ProjectStatus.Archived &&
                        m.ProjectTeam.Status != ProjectStatus.Completed)
            .Select(m => m.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        peerQuery = peerQuery.Where(u => !activeMemberUserIds.Contains(u.Id));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            peerQuery = peerQuery.Where(u =>
                u.FullName.ToLower().Contains(term) ||
                u.EnrollmentOrEmployeeCode.ToLower().Contains(term) ||
                (u.SkillsCsv != null && u.SkillsCsv.ToLower().Contains(term)));
        }

        var peers = await peerQuery
            .OrderBy(u => u.FullName)
            .Take(50)
            .ToListAsync(cancellationToken);

        // Check if caller's active team has already invited any of these peers
        var callerTeam = await GetCurrentStudentTeamAsync(studentId);
        List<Guid> pendingInvitedUserIds = new();
        if (callerTeam != null)
        {
            pendingInvitedUserIds = await _context.TeamInvitations
                .Where(i => i.ProjectTeamId == callerTeam.Id && i.Status == InvitationStatus.Pending && !i.IsDeleted)
                .Select(i => i.InviteeStudentId)
                .ToListAsync(cancellationToken);
        }

        var result = peers.Select(p =>
        {
            var skills = string.IsNullOrWhiteSpace(p.SkillsCsv)
                ? new List<string>()
                : p.SkillsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

            string? bio = null;
            if (!string.IsNullOrWhiteSpace(p.ConsolePreferencesJson))
            {
                try
                {
                    var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(p.ConsolePreferencesJson);
                    if (dict != null && dict.TryGetValue("bio", out var bioObj))
                    {
                        bio = bioObj?.ToString();
                    }
                }
                catch { }
            }

            return new EligiblePeerDto
            {
                StudentId = p.Id,
                FullName = p.FullName,
                EnrollmentCode = p.EnrollmentOrEmployeeCode,
                DepartmentCode = caller.Department?.Code ?? "CSE",
                DepartmentName = caller.Department?.Name ?? "Computer Science & Engineering",
                ProgramName = callerEnrollment.CourseProgram?.Name ?? "Bachelor of Technology",
                CurrentSemester = callerEnrollment.CurrentSemesterTerm?.SemesterNumber ?? 6,
                Skills = skills,
                Bio = bio,
                GitHubHandle = p.GitHubHandle,
                IsInvited = pendingInvitedUserIds.Contains(p.Id)
            };
        }).ToList();

        return Ok(result);
    }

    /// <summary>
    /// TEAM-001: Explicitly create a new project team in Draft state with the authenticated caller as initial Team Lead.
    /// </summary>
    [HttpPost("teams")]
    public async Task<ActionResult<StudentTeamRosterDto>> CreateTeam([FromBody] CreateStudentTeamRequest request, CancellationToken cancellationToken)
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var student = await _context.Users
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == studentId && u.CollegeId == collegeId && !u.IsDeleted, cancellationToken);
        if (student == null) return Unauthorized();

        // 1. Verify active enrollment
        var enrollment = await _context.StudentAcademicEnrollments
            .FirstOrDefaultAsync(e => e.StudentUserId == studentId && e.CollegeId == collegeId && e.AcademicStatus == AcademicStatus.Active && !e.IsDeleted, cancellationToken);
        if (enrollment == null)
        {
            return BadRequest(new { message = "You must have an active academic enrollment to create a project team." });
        }

        // 2. Prevent duplicate active team registration
        var existingActiveTeam = await _context.TeamMembers
            .Include(m => m.ProjectTeam)
            .FirstOrDefaultAsync(m => m.UserId == studentId && m.IsActive && !m.IsDeleted &&
                                      m.ProjectTeam != null && !m.ProjectTeam.IsDeleted &&
                                      m.ProjectTeam.Status != ProjectStatus.Archived &&
                                      m.ProjectTeam.Status != ProjectStatus.Completed, cancellationToken);
        if (existingActiveTeam != null)
        {
            return Conflict(new { message = $"You already belong to an active project team ({existingActiveTeam.ProjectTeam!.TeamCode}). Students cannot register multiple active projects." });
        }

        // 3. Field validation
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length < 5)
        {
            return BadRequest(new { message = "Project title is mandatory and must be at least 5 characters long." });
        }
        if (request.Title.Trim().Length > 200)
        {
            return BadRequest(new { message = "Project title cannot exceed 200 characters." });
        }
        if (string.IsNullOrWhiteSpace(request.Abstract) || request.Abstract.Trim().Length < 20)
        {
            return BadRequest(new { message = "Project abstract is mandatory and must be at least 20 characters long." });
        }

        var domain = string.IsNullOrWhiteSpace(request.DomainTag) ? "Engineering & Technology" : request.DomainTag.Trim();
        var sdg = string.IsNullOrWhiteSpace(request.SdgCode)
            ? "SDG-9"
            : (request.SdgCode.Trim().Length > 20 ? request.SdgCode.Trim()[..20] : request.SdgCode.Trim());

        // 4. Resolve track
        Guid trackId = request.AcademicTrackId ?? Guid.Empty;
        if (trackId == Guid.Empty && student.DepartmentId.HasValue)
        {
            var defaultTrack = await _context.AcademicTracks
                .FirstOrDefaultAsync(t => t.CollegeId == collegeId && t.DepartmentId == student.DepartmentId.Value && t.IsActive && !t.IsDeleted, cancellationToken);
            if (defaultTrack != null) trackId = defaultTrack.Id;
        }

        if (trackId == Guid.Empty)
        {
            var fallbackTrack = await _context.AcademicTracks
                .FirstOrDefaultAsync(t => t.CollegeId == collegeId && t.IsActive && !t.IsDeleted, cancellationToken);
            if (fallbackTrack != null) trackId = fallbackTrack.Id;
        }

        // 5. Generate team code
        var deptCode = student.Department?.Code ?? "CSE";
        var year = DateTime.UtcNow.Year;
        var count = await _context.ProjectTeams.CountAsync(t => t.CollegeId == collegeId && t.DepartmentId == student.DepartmentId, cancellationToken);
        var teamCode = $"{year}-{deptCode}-PRJ-{(count + 1):D2}";

        // 6. Persist team
        var newTeam = new ProjectTeam
        {
            CollegeId = collegeId,
            DepartmentId = student.DepartmentId ?? Guid.Empty,
            AcademicTrackId = trackId,
            TeamCode = teamCode,
            Title = request.Title.Trim(),
            Abstract = request.Abstract.Trim(),
            DomainTag = domain,
            SdgCode = sdg,
            Status = ProjectStatus.Draft,
            IsRosterLocked = false
        };
        await _context.ProjectTeams.AddAsync(newTeam, cancellationToken);

        // 7. Add student as initial Team Lead
        var leadMember = new TeamMember
        {
            CollegeId = collegeId,
            UserId = studentId,
            ProjectTeamId = newTeam.Id,
            IsTeamLead = true,
            ModuleResponsibility = "Team Lead & Project Architect",
            IsActive = true,
            JoinedAtUtc = DateTime.UtcNow
        };
        await _context.TeamMembers.AddAsync(leadMember, cancellationToken);

        // 8. Audit log
        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = student.Email,
            Action = "TEAM_CREATED",
            TargetTenantId = collegeId,
            TargetEntity = "ProjectTeam",
            MetadataJson = JsonSerializer.Serialize(new { teamId = newTeam.Id, teamCode = newTeam.TeamCode, title = newTeam.Title }),
            OccurredAtUtc = DateTime.UtcNow
        }, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        var track = await _context.AcademicTracks.FirstOrDefaultAsync(t => t.Id == trackId && !t.IsDeleted, cancellationToken);
        var (minSize, maxSize) = ResolveTrackCapacity(track);

        return Ok(new StudentTeamRosterDto
        {
            TeamId = newTeam.Id,
            TeamCode = newTeam.TeamCode,
            Title = newTeam.Title,
            Abstract = newTeam.Abstract,
            Status = newTeam.Status,
            IsRosterLocked = newTeam.IsRosterLocked,
            IsCallerLead = true,
            MinTeamSize = minSize,
            MaxTeamSize = maxSize,
            Members = new List<TeamMemberDto>
            {
                new()
                {
                    UserId = student.Id,
                    FullName = student.FullName,
                    EnrollmentCode = student.EnrollmentOrEmployeeCode,
                    IsTeamLead = true,
                    ModuleResponsibility = leadMember.ModuleResponsibility
                }
            },
            PendingInvitations = new()
        });
    }

    /// <summary>
    /// TEAM-008 & TEAM-012: Get the authenticated student's current team roster, capacity, and active pending invitations.
    /// </summary>
    [HttpGet("teams/current")]
    [HttpGet("teams/roster")]
    public async Task<ActionResult<StudentTeamRosterDto>> GetCurrentTeamRoster(CancellationToken cancellationToken)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null)
        {
            return NotFound(new { message = "You are not currently enrolled in an active project team." });
        }

        var isLead = team.Members.Any(m => m.UserId == studentId && m.IsTeamLead && m.IsActive && !m.IsDeleted);
        var (minSize, maxSize) = ResolveTrackCapacity(team.AcademicTrack);

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

        var pendingInvites = await _context.TeamInvitations
            .Include(i => i.InviteeStudent)
            .Include(i => i.InviterStudent)
            .Where(i => i.ProjectTeamId == team.Id && i.Status == InvitationStatus.Pending && !i.IsDeleted)
            .OrderByDescending(i => i.InvitedAtUtc)
            .Select(i => new TeamInvitationDto
            {
                Id = i.Id,
                ProjectTeamId = i.ProjectTeamId,
                TeamCode = team.TeamCode,
                ProjectTitle = team.Title,
                InviterStudentId = i.InviterStudentId,
                InviterName = i.InviterStudent != null ? i.InviterStudent.FullName : string.Empty,
                InviteeStudentId = i.InviteeStudentId,
                InviteeName = i.InviteeStudent != null ? i.InviteeStudent.FullName : string.Empty,
                InviteeEnrollmentCode = i.InviteeStudent != null ? i.InviteeStudent.EnrollmentOrEmployeeCode : string.Empty,
                Status = i.Status,
                Message = i.Message,
                InvitedAtUtc = i.InvitedAtUtc,
                ExpiresAtUtc = i.ExpiresAtUtc,
                RespondedAtUtc = i.RespondedAtUtc,
                CurrentTeamSize = members.Count,
                MaxTeamCapacity = maxSize,
                IsRosterLocked = team.IsRosterLocked
            })
            .ToListAsync(cancellationToken);

        return Ok(new StudentTeamRosterDto
        {
            TeamId = team.Id,
            TeamCode = team.TeamCode,
            Title = team.Title,
            Abstract = team.Abstract,
            Status = team.Status,
            IsRosterLocked = team.IsRosterLocked,
            IsCallerLead = isLead,
            MinTeamSize = minSize,
            MaxTeamSize = maxSize,
            Members = members,
            PendingInvitations = pendingInvites,
            GuideUserId = team.GuideUserId,
            GuideName = team.GuideUser?.FullName,
            PreferredGuideUserId = team.PreferredGuideUserId,
            PreferredGuideName = team.PreferredGuideUser?.FullName,
            GuidePreferenceStatus = team.GuidePreferenceStatus,
            GuidePreferenceRemarks = team.GuidePreferenceRemarks,
            GuideAllocationRemarks = team.GuideAllocationRemarks,
            GuideAllocatedAtUtc = team.GuideAllocatedAtUtc
        });
    }

    /// <summary>
    /// TEAM-004, TEAM-008, TEAM-012: Dispatch a team invitation to an eligible student peer.
    /// Strictly requires caller to be active Team Lead, team to be in Draft, and roster to be unlocked.
    /// </summary>
    [HttpPost("teams/invitations")]
    public async Task<ActionResult<TeamInvitationDto>> SendInvitation([FromBody] SendTeamInvitationRequest request, CancellationToken cancellationToken)
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null)
        {
            return NotFound(new { message = "You do not belong to an active project team." });
        }

        // 1. Authorize: only Team Lead can dispatch invitations
        var isLead = team.Members.Any(m => m.UserId == studentId && m.IsTeamLead && m.IsActive && !m.IsDeleted);
        if (!isLead)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the designated Team Lead can dispatch invitations to prospective teammates." });
        }

        // 2. Validate team state
        if (team.Status != ProjectStatus.Draft)
        {
            return BadRequest(new { message = $"Team invitations are only permitted during the Draft proposal stage. Current status is {team.Status}." });
        }

        // 3. Validate roster lock
        if (team.IsRosterLocked)
        {
            return BadRequest(new { message = "Team roster is locked for academic review. New invitations cannot be dispatched." });
        }

        // 4. Resolve invitee student
        UserAccount? invitee = null;
        if (request.InviteeStudentId.HasValue && request.InviteeStudentId.Value != Guid.Empty)
        {
            invitee = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == request.InviteeStudentId.Value && u.CollegeId == collegeId && !u.IsDeleted, cancellationToken);
        }
        else if (!string.IsNullOrWhiteSpace(request.EnrollmentCode))
        {
            var code = request.EnrollmentCode.Trim().ToUpperInvariant();
            invitee = await _context.Users
                .FirstOrDefaultAsync(u => u.CollegeId == collegeId && u.EnrollmentOrEmployeeCode.ToUpper() == code && !u.IsDeleted, cancellationToken);
        }

        if (invitee == null || invitee.Role != UserRole.Student || !invitee.IsActive)
        {
            return NotFound(new { message = "Eligible student peer not found for the specified credentials." });
        }

        // 5. Rule validation: cannot invite self
        if (invitee.Id == studentId)
        {
            return BadRequest(new { message = "You cannot send a team invitation to yourself." });
        }

        // 6. Rule validation: cannot invite student already on team
        if (team.Members.Any(m => m.UserId == invitee.Id && m.IsActive && !m.IsDeleted))
        {
            return BadRequest(new { message = $"{invitee.FullName} ({invitee.EnrollmentOrEmployeeCode}) is already an active member of this team." });
        }

        // 7. Rule validation: cannot invite student who belongs to another active team
        var alreadyOnTeam = await _context.TeamMembers
            .AnyAsync(m => m.UserId == invitee.Id && m.IsActive && !m.IsDeleted &&
                           m.ProjectTeam != null && !m.ProjectTeam.IsDeleted &&
                           m.ProjectTeam.Status != ProjectStatus.Archived &&
                           m.ProjectTeam.Status != ProjectStatus.Completed, cancellationToken);
        if (alreadyOnTeam)
        {
            return Conflict(new { message = $"{invitee.FullName} already belongs to an active project team and is ineligible for new invitations." });
        }

        // 8. Rule validation: team capacity limit (dynamic track capacity)
        var activeMemberCount = team.Members.Count(m => m.IsActive && !m.IsDeleted);
        var pendingInviteCount = await _context.TeamInvitations
            .CountAsync(i => i.ProjectTeamId == team.Id && i.Status == InvitationStatus.Pending && !i.IsDeleted, cancellationToken);
        var (_, maxCapacity) = ResolveTrackCapacity(team.AcademicTrack);

        if (activeMemberCount + pendingInviteCount >= maxCapacity)
        {
            return Conflict(new { message = $"Team capacity limit reached. Maximum team size is {maxCapacity} members including pending invitations (current: {activeMemberCount} members, {pendingInviteCount} pending)." });
        }

        // 9. Rule validation: duplicate pending invitation check
        var hasPending = await _context.TeamInvitations
            .AnyAsync(i => i.ProjectTeamId == team.Id && i.InviteeStudentId == invitee.Id && i.Status == InvitationStatus.Pending && !i.IsDeleted, cancellationToken);
        if (hasPending)
        {
            return Conflict(new { message = $"An active team invitation is already pending for {invitee.FullName}." });
        }

        // 10. Persist invitation
        var caller = await _context.Users.FindAsync(new object[] { studentId }, cancellationToken);
        var invitation = new TeamInvitation
        {
            CollegeId = collegeId,
            ProjectTeamId = team.Id,
            InviterStudentId = studentId,
            InviteeStudentId = invitee.Id,
            Status = InvitationStatus.Pending,
            Message = string.IsNullOrWhiteSpace(request.Message) ? null : request.Message.Trim(),
            InvitedAtUtc = DateTime.UtcNow,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
        };
        await _context.TeamInvitations.AddAsync(invitation, cancellationToken);

        // 11. Audit log
        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = caller?.Email ?? string.Empty,
            Action = "TEAM_INVITATION_SENT",
            TargetTenantId = collegeId,
            TargetEntity = "TeamInvitation",
            MetadataJson = JsonSerializer.Serialize(new { teamId = team.Id, inviteeId = invitee.Id, inviteeCode = invitee.EnrollmentOrEmployeeCode }),
            OccurredAtUtc = DateTime.UtcNow
        }, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new TeamInvitationDto
        {
            Id = invitation.Id,
            ProjectTeamId = team.Id,
            TeamCode = team.TeamCode,
            ProjectTitle = team.Title,
            InviterStudentId = studentId,
            InviterName = caller?.FullName ?? string.Empty,
            InviteeStudentId = invitee.Id,
            InviteeName = invitee.FullName,
            InviteeEnrollmentCode = invitee.EnrollmentOrEmployeeCode,
            Status = invitation.Status,
            Message = invitation.Message,
            InvitedAtUtc = invitation.InvitedAtUtc,
            ExpiresAtUtc = invitation.ExpiresAtUtc,
            CurrentTeamSize = activeMemberCount,
            MaxTeamCapacity = maxCapacity,
            IsRosterLocked = team.IsRosterLocked
        });
    }

    /// <summary>
    /// TEAM-005: View invitations received by the authenticated student.
    /// Auto-marks expired invitations prior to returning.
    /// </summary>
    [HttpGet("invitations")]
    public async Task<ActionResult<List<TeamInvitationDto>>> GetReceivedInvitations(CancellationToken cancellationToken)
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var invites = await _context.TeamInvitations
            .Include(i => i.ProjectTeam)
                .ThenInclude(t => t!.AcademicTrack)
            .Include(i => i.ProjectTeam)
                .ThenInclude(t => t!.Members)
            .Include(i => i.InviterStudent)
            .Include(i => i.InviteeStudent)
            .Where(i => i.CollegeId == collegeId && i.InviteeStudentId == studentId && !i.IsDeleted)
            .OrderByDescending(i => i.InvitedAtUtc)
            .ToListAsync(cancellationToken);

        var utcNow = DateTime.UtcNow;
        bool hasChanges = false;
        foreach (var inv in invites)
        {
            if (inv.Status == InvitationStatus.Pending && inv.ExpiresAtUtc.HasValue && inv.ExpiresAtUtc.Value < utcNow)
            {
                inv.Status = InvitationStatus.Expired;
                inv.UpdatedAtUtc = utcNow;
                hasChanges = true;
            }
        }
        if (hasChanges)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }

        var result = invites.Select(i => new TeamInvitationDto
        {
            Id = i.Id,
            ProjectTeamId = i.ProjectTeamId,
            TeamCode = i.ProjectTeam?.TeamCode ?? string.Empty,
            ProjectTitle = i.ProjectTeam?.Title ?? "Academic Project",
            InviterStudentId = i.InviterStudentId,
            InviterName = i.InviterStudent?.FullName ?? "Team Lead",
            InviteeStudentId = i.InviteeStudentId,
            InviteeName = i.InviteeStudent?.FullName ?? string.Empty,
            InviteeEnrollmentCode = i.InviteeStudent?.EnrollmentOrEmployeeCode ?? string.Empty,
            Status = i.Status,
            Message = i.Message,
            InvitedAtUtc = i.InvitedAtUtc,
            ExpiresAtUtc = i.ExpiresAtUtc,
            RespondedAtUtc = i.RespondedAtUtc,
            ResponseNotes = i.ResponseNotes,
            CurrentTeamSize = i.ProjectTeam?.Members.Count(m => m.IsActive && !m.IsDeleted) ?? 1,
            MaxTeamCapacity = ResolveTrackCapacity(i.ProjectTeam?.AcademicTrack).MaxTeamSize,
            IsRosterLocked = i.ProjectTeam?.IsRosterLocked ?? false
        }).ToList();

        return Ok(result);
    }

    /// <summary>
    /// TEAM-005: View invitations dispatched by the authenticated student's team.
    /// </summary>
    [HttpGet("teams/invitations")]
    public async Task<ActionResult<List<TeamInvitationDto>>> GetSentInvitations(CancellationToken cancellationToken)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null)
        {
            return Ok(new List<TeamInvitationDto>());
        }

        var invites = await _context.TeamInvitations
            .Include(i => i.InviteeStudent)
            .Include(i => i.InviterStudent)
            .Where(i => i.ProjectTeamId == team.Id && !i.IsDeleted)
            .OrderByDescending(i => i.InvitedAtUtc)
            .ToListAsync(cancellationToken);

        var utcNow = DateTime.UtcNow;
        bool hasChanges = false;
        foreach (var inv in invites)
        {
            if (inv.Status == InvitationStatus.Pending && inv.ExpiresAtUtc.HasValue && inv.ExpiresAtUtc.Value < utcNow)
            {
                inv.Status = InvitationStatus.Expired;
                inv.UpdatedAtUtc = utcNow;
                hasChanges = true;
            }
        }
        if (hasChanges)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }

        var activeCount = team.Members.Count(m => m.IsActive && !m.IsDeleted);
        var result = invites.Select(i => new TeamInvitationDto
        {
            Id = i.Id,
            ProjectTeamId = i.ProjectTeamId,
            TeamCode = team.TeamCode,
            ProjectTitle = team.Title,
            InviterStudentId = i.InviterStudentId,
            InviterName = i.InviterStudent?.FullName ?? "Team Lead",
            InviteeStudentId = i.InviteeStudentId,
            InviteeName = i.InviteeStudent?.FullName ?? string.Empty,
            InviteeEnrollmentCode = i.InviteeStudent?.EnrollmentOrEmployeeCode ?? string.Empty,
            Status = i.Status,
            Message = i.Message,
            InvitedAtUtc = i.InvitedAtUtc,
            ExpiresAtUtc = i.ExpiresAtUtc,
            RespondedAtUtc = i.RespondedAtUtc,
            ResponseNotes = i.ResponseNotes,
            CurrentTeamSize = activeCount,
            MaxTeamCapacity = ResolveTrackCapacity(team.AcademicTrack).MaxTeamSize,
            IsRosterLocked = team.IsRosterLocked
        }).ToList();

        return Ok(result);
    }

    /// <summary>
    /// TEAM-006, TEAM-008, TEAM-009, TEAM-012: Accept team invitation.
    /// Atomically enrols invitee as TeamMember, updates invitation status, and automatically cancels conflicting pending invites.
    /// </summary>
    [HttpPost("invitations/{id}/accept")]
    public async Task<IActionResult> AcceptInvitation([FromRoute] Guid id, [FromBody] RespondInvitationRequest? request, CancellationToken cancellationToken)
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var invitation = await _context.TeamInvitations
            .Include(i => i.ProjectTeam)
                .ThenInclude(t => t!.AcademicTrack)
            .Include(i => i.ProjectTeam)
                .ThenInclude(t => t!.Members)
            .Include(i => i.InviteeStudent)
            .FirstOrDefaultAsync(i => i.Id == id && i.CollegeId == collegeId && !i.IsDeleted, cancellationToken);

        if (invitation == null)
        {
            return NotFound(new { message = "Team invitation not found." });
        }

        // 1. Authorization: only intended invitee can accept
        if (invitation.InviteeStudentId != studentId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "You are not the designated recipient of this invitation." });
        }

        // 2. Validate invitation status
        if (invitation.Status != InvitationStatus.Pending)
        {
            return BadRequest(new { message = $"Invitation cannot be accepted because it is currently {invitation.Status}." });
        }

        // 3. Expiry check
        if (invitation.ExpiresAtUtc.HasValue && invitation.ExpiresAtUtc.Value < DateTime.UtcNow)
        {
            invitation.Status = InvitationStatus.Expired;
            invitation.UpdatedAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
            return BadRequest(new { message = "This invitation has expired and can no longer be accepted." });
        }

        var team = invitation.ProjectTeam;
        if (team == null || team.IsDeleted)
        {
            return NotFound(new { message = "Target project team no longer exists." });
        }

        // 4. Validate team state & roster lock
        if (team.Status != ProjectStatus.Draft)
        {
            return BadRequest(new { message = $"Team membership changes are only permitted during the Draft proposal stage. Current status is {team.Status}." });
        }
        if (team.IsRosterLocked)
        {
            return BadRequest(new { message = "Team roster is locked for academic review. New members cannot join." });
        }

        // 5. Concurrency protection: in-process semaphore lock + PostgreSQL row-level exclusive lock
        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? transaction = null;
        var teamLock = _teamLocks.GetOrAdd(team.Id, _ => new SemaphoreSlim(1, 1));
        await teamLock.WaitAsync(cancellationToken);
        try
        {
            if (_context.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true)
            {
                transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, cancellationToken);
                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT \"Id\" FROM \"ProjectTeams\" WHERE \"Id\" = {0} FOR UPDATE",
                    new object[] { team.Id },
                    cancellationToken);
            }

            // Recount active members directly from database under the exclusive lock
            var activeMemberCount = await _context.TeamMembers
                .CountAsync(m => m.ProjectTeamId == team.Id && m.IsActive && !m.IsDeleted, cancellationToken);
            var (_, maxCapacity) = ResolveTrackCapacity(team.AcademicTrack);
            if (activeMemberCount >= maxCapacity)
            {
                if (transaction != null)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    await transaction.DisposeAsync();
                }
                return Conflict(new { message = $"Team capacity limit reached. This team already has the maximum permitted {maxCapacity} members." });
            }

            // 6. Validate student does not already belong to an active project team
            var alreadyActive = await _context.TeamMembers
                .AnyAsync(m => m.UserId == studentId && m.IsActive && !m.IsDeleted &&
                               m.ProjectTeam != null && !m.ProjectTeam.IsDeleted &&
                               m.ProjectTeam.Status != ProjectStatus.Archived &&
                               m.ProjectTeam.Status != ProjectStatus.Completed, cancellationToken);
            if (alreadyActive)
            {
                if (transaction != null)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    await transaction.DisposeAsync();
                }
                return Conflict(new { message = "You already belong to an active project team and cannot join another team." });
            }

            // 7. Atomic transaction for membership creation and state updates
            var newMember = new TeamMember
            {
                CollegeId = collegeId,
                ProjectTeamId = team.Id,
                UserId = studentId,
                IsTeamLead = false,
                ModuleResponsibility = "Core Module Contributor",
                IsActive = true,
                JoinedAtUtc = DateTime.UtcNow
            };
            await _context.TeamMembers.AddAsync(newMember, cancellationToken);

            invitation.Status = InvitationStatus.Accepted;
            invitation.RespondedAtUtc = DateTime.UtcNow;
            invitation.ResponseNotes = request?.ResponseNotes;
            invitation.UpdatedAtUtc = DateTime.UtcNow;

            // Auto-cancel any other pending invitations for this student
            var otherPendingInvites = await _context.TeamInvitations
                .Where(i => i.InviteeStudentId == studentId && i.Id != invitation.Id && i.Status == InvitationStatus.Pending && !i.IsDeleted)
                .ToListAsync(cancellationToken);

            foreach (var other in otherPendingInvites)
            {
                other.Status = InvitationStatus.Cancelled;
                other.RespondedAtUtc = DateTime.UtcNow;
                other.ResponseNotes = "Automatically cancelled due to acceptance of another team invitation.";
                other.UpdatedAtUtc = DateTime.UtcNow;
            }

            // Audit log
            await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
            {
                ActorUserId = studentId,
                ActorEmail = invitation.InviteeStudent?.Email ?? string.Empty,
                Action = "TEAM_MEMBER_JOINED",
                TargetTenantId = collegeId,
                TargetEntity = "TeamMember",
                MetadataJson = JsonSerializer.Serialize(new { teamId = team.Id, teamCode = team.TeamCode, studentId }),
                OccurredAtUtc = DateTime.UtcNow
            }, cancellationToken);

            await _context.SaveChangesAsync(cancellationToken);
            if (transaction != null)
            {
                await transaction.CommitAsync(cancellationToken);
                await transaction.DisposeAsync();
            }

            return Ok(new
            {
                message = "Team invitation accepted successfully. You are now an enrolled team member.",
                teamId = team.Id,
                teamCode = team.TeamCode
            });
        }
        catch (Exception ex)
        {
            if (transaction != null)
            {
                await transaction.RollbackAsync(cancellationToken);
                await transaction.DisposeAsync();
            }
            return StatusCode(500, new { message = "An unexpected error occurred while accepting the team invitation." });
        }
        finally
        {
            teamLock.Release();
        }
    }

    /// <summary>
    /// TEAM-007: Decline/Reject team invitation.
    /// </summary>
    [HttpPost("invitations/{id}/reject")]
    [HttpPost("invitations/{id}/decline")]
    public async Task<IActionResult> RejectInvitation([FromRoute] Guid id, [FromBody] RespondInvitationRequest? request, CancellationToken cancellationToken)
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var invitation = await _context.TeamInvitations
            .Include(i => i.ProjectTeam)
            .Include(i => i.InviteeStudent)
            .FirstOrDefaultAsync(i => i.Id == id && i.CollegeId == collegeId && !i.IsDeleted, cancellationToken);

        if (invitation == null)
        {
            return NotFound(new { message = "Team invitation not found." });
        }

        if (invitation.InviteeStudentId != studentId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "You are not the designated recipient of this invitation." });
        }

        if (invitation.Status != InvitationStatus.Pending)
        {
            return BadRequest(new { message = $"Invitation cannot be declined because it is currently {invitation.Status}." });
        }

        invitation.Status = InvitationStatus.Declined;
        invitation.RespondedAtUtc = DateTime.UtcNow;
        invitation.ResponseNotes = request?.ResponseNotes;
        invitation.UpdatedAtUtc = DateTime.UtcNow;

        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = invitation.InviteeStudent?.Email ?? string.Empty,
            Action = "TEAM_INVITATION_DECLINED",
            TargetTenantId = collegeId,
            TargetEntity = "TeamInvitation",
            MetadataJson = JsonSerializer.Serialize(new { teamId = invitation.ProjectTeamId, invitationId = invitation.Id }),
            OccurredAtUtc = DateTime.UtcNow
        }, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Team invitation declined." });
    }

    /// <summary>
    /// Cancel a sent pending team invitation (Team Lead only).
    /// </summary>
    [HttpDelete("teams/invitations/{id}")]
    [HttpPost("teams/invitations/{id}/cancel")]
    public async Task<IActionResult> CancelInvitation([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "You do not belong to an active project team." });

        var isLead = team.Members.Any(m => m.UserId == studentId && m.IsTeamLead && m.IsActive && !m.IsDeleted);
        if (!isLead)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the designated Team Lead can cancel pending team invitations." });
        }

        if (team.IsRosterLocked)
        {
            return BadRequest(new { message = "Team roster is locked for academic review. Invitations cannot be cancelled." });
        }

        var invitation = await _context.TeamInvitations
            .FirstOrDefaultAsync(i => i.Id == id && i.ProjectTeamId == team.Id && i.CollegeId == collegeId && !i.IsDeleted, cancellationToken);

        if (invitation == null)
        {
            return NotFound(new { message = "Invitation record not found on your active project team." });
        }

        if (invitation.Status != InvitationStatus.Pending)
        {
            return BadRequest(new { message = $"Only pending invitations can be cancelled. Current status is {invitation.Status}." });
        }

        invitation.Status = InvitationStatus.Cancelled;
        invitation.RespondedAtUtc = DateTime.UtcNow;
        invitation.ResponseNotes = "Cancelled by Team Lead.";
        invitation.UpdatedAtUtc = DateTime.UtcNow;

        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = _tenantContext.UserId.ToString() ?? string.Empty,
            Action = "TEAM_INVITATION_CANCELLED",
            TargetTenantId = collegeId,
            TargetEntity = "TeamInvitation",
            MetadataJson = JsonSerializer.Serialize(new { teamId = team.Id, invitationId = invitation.Id }),
            OccurredAtUtc = DateTime.UtcNow
        }, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Team invitation cancelled successfully." });
    }

    /// <summary>
    /// TEAM-010: Transfer team leadership to another active team member.
    /// Only the current active Team Lead may transfer leadership. Prohibited once roster is locked.
    /// </summary>
    [HttpPut("teams/leader")]
    [HttpPost("teams/transfer-lead")]
    public async Task<IActionResult> TransferLeadership([FromBody] TransferTeamLeadRequest request, CancellationToken cancellationToken)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "You do not belong to an active project team." });

        var callerMember = team.Members.FirstOrDefault(m => m.UserId == studentId && m.IsActive && !m.IsDeleted);
        if (callerMember == null || !callerMember.IsTeamLead)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the current Team Lead can transfer leadership to another member." });
        }

        if (team.Status != ProjectStatus.Draft)
        {
            return BadRequest(new { message = "Leadership transfer is only permitted during the Draft proposal stage." });
        }

        if (team.IsRosterLocked)
        {
            return BadRequest(new { message = "Team roster is locked for academic review. Leadership cannot be transferred." });
        }

        if (request.TargetStudentId == studentId)
        {
            return BadRequest(new { message = "You are already the designated Team Lead." });
        }

        var targetMember = team.Members.FirstOrDefault(m => m.UserId == request.TargetStudentId && m.IsActive && !m.IsDeleted);
        if (targetMember == null)
        {
            return NotFound(new { message = "Specified target student is not an active member of this project team." });
        }

        callerMember.IsTeamLead = false;
        callerMember.UpdatedAtUtc = DateTime.UtcNow;

        targetMember.IsTeamLead = true;
        targetMember.UpdatedAtUtc = DateTime.UtcNow;

        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = callerMember.User?.Email ?? string.Empty,
            Action = "TEAM_LEADER_TRANSFERRED",
            TargetTenantId = team.CollegeId,
            TargetEntity = "ProjectTeam",
            MetadataJson = JsonSerializer.Serialize(new { teamId = team.Id, oldLeadId = callerMember.UserId, newLeadId = targetMember.UserId }),
            OccurredAtUtc = DateTime.UtcNow
        }, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            message = "Team leadership successfully transferred.",
            newLeaderId = targetMember.UserId,
            newLeaderName = targetMember.User?.FullName
        });
    }

    /// <summary>
    /// TEAM-011: Voluntary member exit from project team before roster locking.
    /// Prohibited if roster is locked or if Team Lead attempts to leave without transferring leadership.
    /// </summary>
    [HttpPost("teams/leave")]
    public async Task<IActionResult> LeaveTeam(CancellationToken cancellationToken)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "You do not belong to an active project team." });

        if (team.Status != ProjectStatus.Draft)
        {
            return BadRequest(new { message = "Voluntary team exit is only permitted during the Draft proposal stage." });
        }

        if (team.IsRosterLocked)
        {
            return BadRequest(new { message = "Team roster is locked for academic review. Members cannot leave the team." });
        }

        var callerMember = team.Members.FirstOrDefault(m => m.UserId == studentId && m.IsActive && !m.IsDeleted);
        if (callerMember == null) return NotFound(new { message = "Active membership not found." });

        var otherActiveMembers = team.Members.Where(m => m.UserId != studentId && m.IsActive && !m.IsDeleted).ToList();

        if (callerMember.IsTeamLead && otherActiveMembers.Any())
        {
            return BadRequest(new { message = "As Team Lead, you must transfer leadership to another member before leaving the team." });
        }

        // If sole member, archive/soft-delete the team as well
        if (!otherActiveMembers.Any())
        {
            team.Status = ProjectStatus.Archived;
            team.IsDeleted = true;
            team.DeletedAtUtc = DateTime.UtcNow;
            team.UpdatedAtUtc = DateTime.UtcNow;
        }

        callerMember.IsActive = false;
        callerMember.RemovedAtUtc = DateTime.UtcNow;
        callerMember.IsDeleted = true;
        callerMember.DeletedAtUtc = DateTime.UtcNow;
        callerMember.UpdatedAtUtc = DateTime.UtcNow;

        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = callerMember.User?.Email ?? string.Empty,
            Action = "TEAM_MEMBER_LEFT",
            TargetTenantId = team.CollegeId,
            TargetEntity = "TeamMember",
            MetadataJson = JsonSerializer.Serialize(new { teamId = team.Id, studentId }),
            OccurredAtUtc = DateTime.UtcNow
        }, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "You have voluntarily left the project team." });
    }

    /// <summary>
    /// TEAM-011: Team Lead removes a member before roster lock.
    /// </summary>
    [HttpDelete("teams/members/{memberId}")]
    public async Task<IActionResult> RemoveMember([FromRoute] Guid memberId, CancellationToken cancellationToken)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null) return NotFound(new { message = "You do not belong to an active project team." });

        var isLead = team.Members.Any(m => m.UserId == studentId && m.IsTeamLead && m.IsActive && !m.IsDeleted);
        if (!isLead)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the designated Team Lead can remove members from the team." });
        }

        if (team.Status != ProjectStatus.Draft)
        {
            return BadRequest(new { message = "Member removal is only permitted during the Draft proposal stage." });
        }

        if (team.IsRosterLocked)
        {
            return BadRequest(new { message = "Team roster is locked for academic review. Members cannot be removed." });
        }

        var targetMember = team.Members.FirstOrDefault(m => (m.Id == memberId || m.UserId == memberId) && m.IsActive && !m.IsDeleted);
        if (targetMember == null)
        {
            return NotFound(new { message = "Target member not found on this team." });
        }

        if (targetMember.UserId == studentId)
        {
            return BadRequest(new { message = "Team Lead cannot remove themselves using this endpoint. Use the leave endpoint or transfer leadership first." });
        }

        targetMember.IsActive = false;
        targetMember.RemovedAtUtc = DateTime.UtcNow;
        targetMember.IsDeleted = true;
        targetMember.DeletedAtUtc = DateTime.UtcNow;
        targetMember.UpdatedAtUtc = DateTime.UtcNow;

        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = _tenantContext.UserId.ToString() ?? string.Empty,
            Action = "TEAM_MEMBER_REMOVED",
            TargetTenantId = team.CollegeId,
            TargetEntity = "TeamMember",
            MetadataJson = JsonSerializer.Serialize(new { teamId = team.Id, memberId = targetMember.UserId }),
            OccurredAtUtc = DateTime.UtcNow
        }, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Member successfully removed from the team." });
    }

    // =========================================================================
    // PHASE 5: OFFICIAL GUIDE ALLOCATION & PREFERENCE WORKFLOW
    // =========================================================================

    private async Task<StudentGuidePreferenceDto> BuildGuidePreferenceDtoAsync(ProjectTeam team, Guid studentId, CancellationToken cancellationToken)
    {
        var isLead = team.Members.Any(m => m.UserId == studentId && m.IsTeamLead && m.IsActive && !m.IsDeleted);

        var preferredGuide = team.PreferredGuideUser;
        if (preferredGuide == null && team.PreferredGuideUserId.HasValue)
        {
            preferredGuide = await _context.Users.Include(u => u.Department).FirstOrDefaultAsync(u => u.Id == team.PreferredGuideUserId.Value, cancellationToken);
        }

        var officialGuide = team.GuideUser;
        if (officialGuide == null && team.GuideUserId.HasValue)
        {
            officialGuide = await _context.Users.Include(u => u.Department).FirstOrDefaultAsync(u => u.Id == team.GuideUserId.Value, cancellationToken);
        }

        var allocatedBy = team.GuideAllocatedByUser;
        if (allocatedBy == null && team.GuideAllocatedByUserId.HasValue)
        {
            allocatedBy = await _context.Users.FirstOrDefaultAsync(u => u.Id == team.GuideAllocatedByUserId.Value, cancellationToken);
        }

        var exceptionLogs = await _context.ExceptionAuditLogs
            .Include(l => l.ApprovedByUser)
            .Where(l => l.ProjectTeamId == team.Id && l.ActionType == ExceptionActionType.ReassignGuide)
            .OrderByDescending(l => l.ApprovedAtUtc ?? l.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var history = new List<GuideReassignmentHistoryItemDto>();
        foreach (var log in exceptionLogs)
        {
            Guid? prevId = null;
            string? prevName = null;
            Guid newId = log.TargetUserId ?? Guid.Empty;
            string newName = "Faculty Mentor";

            try
            {
                if (!string.IsNullOrWhiteSpace(log.PreviousValueJson))
                {
                    using var doc = JsonDocument.Parse(log.PreviousValueJson);
                    if (doc.RootElement.TryGetProperty("guideUserId", out var pId) && pId.TryGetGuid(out var parsedGuid)) prevId = parsedGuid;
                    if (doc.RootElement.TryGetProperty("guideName", out var pName)) prevName = pName.GetString();
                }
                if (!string.IsNullOrWhiteSpace(log.NewValueJson))
                {
                    using var doc = JsonDocument.Parse(log.NewValueJson);
                    if (doc.RootElement.TryGetProperty("guideUserId", out var nId) && nId.TryGetGuid(out var parsedGuid)) newId = parsedGuid;
                    if (doc.RootElement.TryGetProperty("guideName", out var nName)) newName = nName.GetString() ?? "Faculty Mentor";
                }
            }
            catch {}

            history.Add(new GuideReassignmentHistoryItemDto
            {
                Id = log.Id,
                PreviousGuideId = prevId,
                PreviousGuideName = prevName,
                NewGuideId = newId,
                NewGuideName = newName,
                Reason = log.Reason,
                ApprovedByName = log.ApprovedByUser?.FullName ?? "Institutional Authority",
                ApprovedAtUtc = log.ApprovedAtUtc ?? log.CreatedAtUtc
            });
        }

        var canModify = isLead && team.Status == ProjectStatus.Draft && !team.IsRosterLocked && !team.GuideUserId.HasValue;

        return new StudentGuidePreferenceDto
        {
            TeamId = team.Id,
            TeamCode = team.TeamCode,
            ProjectTitle = team.Title,
            Status = team.Status,
            IsRosterLocked = team.IsRosterLocked,
            IsCallerLead = isLead,
            PreferredGuideUserId = team.PreferredGuideUserId,
            PreferredGuideName = preferredGuide?.FullName,
            PreferredGuideEmail = preferredGuide?.Email,
            PreferredGuideDesignation = preferredGuide?.Designation?.ToString(),
            PreferredGuideDepartmentCode = preferredGuide?.Department?.Code,
            PreferredGuideSkills = preferredGuide?.SkillsCsv,
            GuidePreferenceStatus = team.GuidePreferenceStatus,
            GuidePreferenceSubmittedAtUtc = team.GuidePreferenceSubmittedAtUtc,
            GuidePreferenceRemarks = team.GuidePreferenceRemarks,
            OfficiallyAllocatedGuideUserId = team.GuideUserId,
            OfficiallyAllocatedGuideName = officialGuide?.FullName,
            OfficiallyAllocatedGuideEmail = officialGuide?.Email,
            OfficiallyAllocatedGuideDesignation = officialGuide?.Designation?.ToString(),
            OfficiallyAllocatedGuideDepartmentCode = officialGuide?.Department?.Code,
            GuideAllocatedAtUtc = team.GuideAllocatedAtUtc,
            GuideAllocatedByName = allocatedBy?.FullName,
            GuideAllocationRemarks = team.GuideAllocationRemarks,
            CanModifyPreference = canModify,
            ReassignmentHistory = history
        };
    }

    /// <summary>
    /// PHASE 5: Submit or update preferred faculty guide for the student's active project team.
    /// Strictly authorized for Team Lead only, while project is in Draft stage and before official allocation.
    /// Selection DOES NOT create an official guide assignment (team.GuideUserId remains null).
    /// </summary>
    [HttpPost("teams/guide-preference")]
    public async Task<ActionResult<StudentGuidePreferenceDto>> SubmitGuidePreference([FromBody] SubmitGuidePreferenceRequest request, CancellationToken cancellationToken)
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null)
        {
            return NotFound(new { message = "You do not belong to an active project team." });
        }

        // 1. Authorize: Only active Team Lead can submit guide preference
        var isLead = team.Members.Any(m => m.UserId == studentId && m.IsTeamLead && m.IsActive && !m.IsDeleted);
        if (!isLead)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the designated Team Lead can submit or update the team's faculty guide preference." });
        }

        // 2. Validate project state: Only allowed during Draft proposal stage
        if (team.Status != ProjectStatus.Draft)
        {
            return BadRequest(new { message = $"Guide preference can only be submitted or modified during the Draft stage. Current status is {team.Status}." });
        }

        // 3. Validate roster lock
        if (team.IsRosterLocked)
        {
            return BadRequest(new { message = "Team roster is locked for academic review. Guide preference cannot be modified." });
        }

        // 4. Validate official allocation: if official guide already allocated, team cannot unilaterally change preference
        if (team.GuideUserId.HasValue)
        {
            return BadRequest(new { message = "An official faculty guide has already been allocated to this project. Guide changes require institutional coordinator or HOD reassignment." });
        }

        // 5. Validate target faculty guide
        if (request.GuideUserId == Guid.Empty)
        {
            return BadRequest(new { message = "Please select a valid faculty guide." });
        }

        var guide = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.GuideUserId && u.CollegeId == collegeId && !u.IsDeleted, cancellationToken);

        if (guide == null || !guide.IsActive || (guide.Role != UserRole.Faculty && guide.Role != UserRole.HOD))
        {
            return BadRequest(new { message = "Selected user is not an active eligible faculty mentor." });
        }

        // 6. Cross-department validation
        if (guide.DepartmentId != team.DepartmentId)
        {
            return BadRequest(new { message = "Selected faculty mentor belongs to another department. Guide preference must be within your project's academic department." });
        }

        // 7. Validate remarks length (Max 500 characters per architecture specification)
        if (request.Remarks != null && request.Remarks.Trim().Length > 500)
        {
            return BadRequest(new { message = "Guide preference remarks cannot exceed 500 characters." });
        }

        // 8. Persist preference (NOTE: team.GuideUserId is NOT set; official allocation requires institutional action)
        team.PreferredGuideUserId = guide.Id;
        team.GuidePreferenceStatus = GuidePreferenceStatus.Requested;
        team.GuidePreferenceSubmittedAtUtc = DateTime.UtcNow;
        team.GuidePreferenceRemarks = string.IsNullOrWhiteSpace(request.Remarks) ? null : request.Remarks.Trim();
        team.GuideAllocationRemarks = null; // Clear previous rejection remarks on resubmission

        // 8. Audit log
        var caller = await _context.Users.FindAsync(new object[] { studentId }, cancellationToken);
        await _context.PlatformAuditLogs.AddAsync(new PlatformAuditLog
        {
            ActorUserId = studentId,
            ActorEmail = caller?.Email ?? string.Empty,
            Action = "STUDENT_GUIDE_PREFERENCE_SUBMITTED",
            TargetTenantId = collegeId,
            TargetEntity = "ProjectTeam",
            MetadataJson = JsonSerializer.Serialize(new
            {
                teamId = team.Id,
                teamCode = team.TeamCode,
                preferredGuideUserId = guide.Id,
                preferredGuideName = guide.FullName,
                remarks = team.GuidePreferenceRemarks
            }),
            OccurredAtUtc = DateTime.UtcNow
        }, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(await BuildGuidePreferenceDtoAsync(team, studentId, cancellationToken));
    }

    /// <summary>
    /// PHASE 5: Retrieve the authenticated student's team guide preference, official allocation, and reassignment history.
    /// </summary>
    [HttpGet("teams/guide-preference")]
    public async Task<ActionResult<StudentGuidePreferenceDto>> GetGuidePreference(CancellationToken cancellationToken)
    {
        var studentId = _tenantContext.UserId!.Value;
        var team = await GetCurrentStudentTeamAsync(studentId);
        if (team == null)
        {
            return NotFound(new { message = "You do not belong to an active project team." });
        }

        return Ok(await BuildGuidePreferenceDtoAsync(team, studentId, cancellationToken));
    }

    // =========================================================================
    // PHASE 10: VERIFIED STUDENT PORTFOLIO & ACADEMIC RECORDS
    // =========================================================================

    [HttpGet("portfolio/verified")]
    public async Task<ActionResult<VerifiedStudentPortfolioDto>> GetStudentPortfolio()
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var student = await _context.Users
            .Include(u => u.Department)
            .Include(u => u.College)
            .FirstOrDefaultAsync(u => u.Id == studentId && u.CollegeId == collegeId && !u.IsDeleted);

        if (student == null) return NotFound(new { message = "Student profile not found." });

        var records = await _context.StudentAcademicRecords
            .Where(r => r.StudentUserId == studentId && r.CollegeId == collegeId && !r.IsDeleted)
            .OrderByDescending(r => r.VerifiedAtUtc)
            .ToListAsync();

        var allowPublic = records.Any(r => r.AllowPublicPortfolio);

        var projectDtos = records.Select(r =>
        {
            List<EvaluatorAssessmentCriterionScoreDto> criteria = new();
            if (!string.IsNullOrWhiteSpace(r.RubricCriteriaBreakdownJson))
            {
                try
                {
                    criteria = JsonSerializer.Deserialize<List<EvaluatorAssessmentCriterionScoreDto>>(r.RubricCriteriaBreakdownJson) ?? new();
                }
                catch { }
            }

            return new StudentAcademicRecordDto
            {
                Id = r.Id,
                ProjectTeamId = r.ProjectTeamId,
                ProjectTitle = r.ProjectTitle,
                ProjectAbstract = r.ProjectAbstract,
                TeamCode = r.TeamCode,
                AcademicYear = r.AcademicYear,
                TrackName = r.TrackName,
                DepartmentName = r.DepartmentName,
                CollegeName = r.CollegeName,
                StudentName = r.StudentName,
                EnrollmentNumber = r.EnrollmentNumber,
                RoleDescription = r.RoleDescription,
                IsTeamLead = r.IsTeamLead,
                GuideUserId = r.GuideUserId,
                GuideName = r.GuideName,
                FinalOutcome = r.FinalOutcome,
                SharedTotalScore = r.SharedTotalScore,
                SharedMaxScore = r.SharedMaxScore,
                IndividualContributionScore = r.IndividualContributionScore,
                FinalComputedMark = r.FinalComputedMark,
                RubricCriteriaBreakdown = criteria,
                VerifiedRepositoryUrl = r.VerifiedRepositoryUrl,
                VerifiedDemoUrl = r.VerifiedDemoUrl,
                FinalReportFileName = r.FinalReportFileName,
                FinalReportChecksum = r.FinalReportChecksum,
                VerificationHash = r.VerificationHash,
                IsVerified = r.IsVerified,
                VerifiedAtUtc = r.VerifiedAtUtc,
                AllowPublicPortfolio = r.AllowPublicPortfolio
            };
        }).ToList();

        var shareUrl = $"https://collabex.io/verify/{student.EnrollmentOrEmployeeCode}";

        return Ok(new VerifiedStudentPortfolioDto
        {
            StudentUserId = student.Id,
            StudentName = student.FullName,
            EnrollmentNumber = student.EnrollmentOrEmployeeCode ?? string.Empty,
            DepartmentName = student.Department?.Name ?? "Computer Science & Engineering",
            CollegeName = student.College?.Name ?? "SISTec",
            AllowPublicPortfolio = allowPublic,
            PublicPortfolioShareUrl = shareUrl,
            Projects = projectDtos
        });
    }

    [HttpPut("portfolio/visibility")]
    public async Task<ActionResult> UpdatePortfolioVisibility([FromBody] UpdatePortfolioVisibilityRequest request)
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var records = await _context.StudentAcademicRecords
            .Where(r => r.StudentUserId == studentId && r.CollegeId == collegeId && !r.IsDeleted)
            .ToListAsync();

        foreach (var r in records)
        {
            r.AllowPublicPortfolio = request.AllowPublicPortfolio;
        }

        await _context.SaveChangesAsync();

        return Ok(new { allowPublicPortfolio = request.AllowPublicPortfolio, message = "Portfolio visibility preference updated successfully." });
    }

    [HttpGet("portfolio/{enrollmentNumber}/public")]
    [AllowAnonymous]
    public async Task<ActionResult<PublicStudentPortfolioDto>> GetPublicStudentPortfolio(string enrollmentNumber, [FromQuery] string? collegeCode = null)
    {
        var code = enrollmentNumber?.Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(code)) return BadRequest(new { message = "Enrollment number is required." });

        var query = _context.StudentAcademicRecords
            .IgnoreQueryFilters()
            .Where(r => r.EnrollmentNumber.ToUpper() == code && r.IsVerified && !r.IsDeleted);

        if (!string.IsNullOrWhiteSpace(collegeCode))
        {
            var normalizedCollegeCode = collegeCode.Trim().ToUpperInvariant();
            query = query.Where(r => r.College != null && r.College.TenantCode.ToUpper() == normalizedCollegeCode);
        }

        var records = await query
            .OrderByDescending(r => r.VerifiedAtUtc)
            .ToListAsync();

        if (records.Count == 0)
        {
            return NotFound(new { message = $"No verified academic project records found for enrollment code '{code}'." });
        }

        // Prevent cross-college data merging if multiple institutions share the same enrollment code
        var distinctColleges = records.Select(r => r.CollegeId).Distinct().Count();
        if (distinctColleges > 1)
        {
            return BadRequest(new { message = "Multiple institutions match this enrollment number. Please specify the 'collegeCode' query parameter." });
        }

        // Check if student has granted public visibility
        var isPublic = records.Any(r => r.AllowPublicPortfolio);
        if (!isPublic)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "This student's academic project portfolio is set to private visibility in accordance with institutional data protection policies." });
        }

        var sample = records[0];

        var verifiedProjects = records.Select(r => new PublicPortfolioProjectDto
        {
            ProjectTitle = r.ProjectTitle,
            ProjectAbstract = r.ProjectAbstract,
            TrackName = r.TrackName,
            AcademicYear = r.AcademicYear,
            RoleDescription = r.RoleDescription,
            GuideName = r.GuideName,
            FinalOutcome = r.FinalOutcome,
            FinalScorePercentage = r.SharedMaxScore > 0 ? Math.Round((r.FinalComputedMark / r.SharedMaxScore) * 100, 1) : null,
            VerifiedRepositoryUrl = r.VerifiedRepositoryUrl,
            VerifiedDemoUrl = r.VerifiedDemoUrl,
            VerificationHash = r.VerificationHash,
            VerifiedAtUtc = r.VerifiedAtUtc
        }).ToList();

        return Ok(new PublicStudentPortfolioDto
        {
            StudentName = sample.StudentName,
            EnrollmentNumber = sample.EnrollmentNumber,
            DepartmentName = sample.DepartmentName,
            CollegeName = sample.CollegeName,
            InstitutionalAttestation = $"Attested & Cryptographically Verified by {sample.CollegeName} Examination Committee.",
            VerifiedProjects = verifiedProjects
        });
    }

    [HttpGet("records/{recordId}/transcript")]
    public async Task<ActionResult<StudentAcademicRecordDto>> GetAcademicRecordTranscript(Guid recordId)
    {
        var studentId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var r = await _context.StudentAcademicRecords
            .FirstOrDefaultAsync(r => r.Id == recordId && r.CollegeId == collegeId && !r.IsDeleted);

        if (r == null) return NotFound(new { message = "Academic record not found." });

        if (r.StudentUserId != studentId && _tenantContext.Role == UserRole.Student)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "You are not authorized to view another student's academic transcript record." });
        }

        List<EvaluatorAssessmentCriterionScoreDto> criteria = new();
        if (!string.IsNullOrWhiteSpace(r.RubricCriteriaBreakdownJson))
        {
            try
            {
                criteria = JsonSerializer.Deserialize<List<EvaluatorAssessmentCriterionScoreDto>>(r.RubricCriteriaBreakdownJson) ?? new();
            }
            catch { }
        }

        return Ok(new StudentAcademicRecordDto
        {
            Id = r.Id,
            ProjectTeamId = r.ProjectTeamId,
            ProjectTitle = r.ProjectTitle,
            ProjectAbstract = r.ProjectAbstract,
            TeamCode = r.TeamCode,
            AcademicYear = r.AcademicYear,
            TrackName = r.TrackName,
            DepartmentName = r.DepartmentName,
            CollegeName = r.CollegeName,
            StudentName = r.StudentName,
            EnrollmentNumber = r.EnrollmentNumber,
            RoleDescription = r.RoleDescription,
            IsTeamLead = r.IsTeamLead,
            GuideUserId = r.GuideUserId,
            GuideName = r.GuideName,
            FinalOutcome = r.FinalOutcome,
            SharedTotalScore = r.SharedTotalScore,
            SharedMaxScore = r.SharedMaxScore,
            IndividualContributionScore = r.IndividualContributionScore,
            FinalComputedMark = r.FinalComputedMark,
            RubricCriteriaBreakdown = criteria,
            VerifiedRepositoryUrl = r.VerifiedRepositoryUrl,
            VerifiedDemoUrl = r.VerifiedDemoUrl,
            FinalReportFileName = r.FinalReportFileName,
            FinalReportChecksum = r.FinalReportChecksum,
            VerificationHash = r.VerificationHash,
            IsVerified = r.IsVerified,
            VerifiedAtUtc = r.VerifiedAtUtc,
            AllowPublicPortfolio = r.AllowPublicPortfolio
        });
    }
}
