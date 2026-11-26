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

/// <summary>
/// Additive Faculty Supervision Controller for officially allocated guides.
/// Strictly enforces the institutional boundary between Preferred Guide and Officially Allocated Guide.
/// Preserves frozen FacultyController.cs and HodController.cs.
/// </summary>
[ApiController]
[Route("api/faculty/supervision")]
[Authorize(Policy = ProjectHubPolicies.FacultyOrAbove)]
public class SupervisionController : ControllerBase
{
    private readonly ProjectHubDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly IFileStorageService _fileStorageService;

    public SupervisionController(
        ProjectHubDbContext context,
        ITenantContext tenantContext,
        IFileStorageService fileStorageService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _fileStorageService = fileStorageService;
    }

    /// <summary>
    /// Supervision dashboard: returns overview metrics and assigned teams for the authenticated faculty guide.
    /// Strictly filters on official allocation (team.GuideUserId == facultyId), ignoring preferred guide requests.
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<ActionResult<SupervisionDashboardDto>> GetDashboard()
    {
        var facultyId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId;
        var role = _tenantContext.Role;

        // Base query: Teams where caller is the officially allocated guide within tenant
        var teamsQuery = _context.ProjectTeams
            .Include(t => t.AcademicTrack)
            .Include(t => t.Department)
            .Include(t => t.Members)
                .ThenInclude(m => m.User)
            .Include(t => t.Tasks)
            .Include(t => t.Milestones)
            .Include(t => t.Artifacts)
            .Include(t => t.WeeklyLogs)
            .Where(t => !t.IsDeleted);

        List<ProjectTeam> supervisedTeams;

        if (role == UserRole.HOD)
        {
            var caller = await _context.Users.FirstOrDefaultAsync(u => u.Id == facultyId);
            var callerDeptId = caller?.DepartmentId;
            // HOD sees either teams where they are the official guide OR teams in their department
            supervisedTeams = await teamsQuery
                .Where(t => t.GuideUserId == facultyId || (callerDeptId.HasValue && t.DepartmentId == callerDeptId.Value))
                .ToListAsync();
        }
        else if (role == UserRole.Faculty)
        {
            // Standard Faculty: STRICTLY teams where caller is the officially allocated guide
            supervisedTeams = await teamsQuery
                .Where(t => t.GuideUserId == facultyId)
                .ToListAsync();
        }
        else
        {
            // SuperAdmin or non-academic roles: platform authority does NOT grant private academic data access
            supervisedTeams = new List<ProjectTeam>();
        }

        var now = DateTime.UtcNow;

        var allMembers = supervisedTeams.SelectMany(t => t.Members.Where(m => m.IsActive && !m.IsDeleted)).ToList();
        var allTasks = supervisedTeams.SelectMany(t => t.Tasks.Where(task => !task.IsDeleted)).ToList();
        var allMilestones = supervisedTeams.SelectMany(t => t.Milestones.Where(m => !m.IsDeleted)).ToList();
        var allArtifacts = supervisedTeams.SelectMany(t => t.Artifacts.Where(a => !a.IsDeleted)).ToList();
        var allLogs = supervisedTeams.SelectMany(t => t.WeeklyLogs.Where(l => !l.IsDeleted)).ToList();

        var teamSummaries = supervisedTeams.Select(t =>
        {
            var activeMembers = t.Members.Where(m => m.IsActive && !m.IsDeleted).ToList();
            var lead = activeMembers.FirstOrDefault(m => m.IsTeamLead);
            var tasks = t.Tasks.Where(task => !task.IsDeleted).ToList();
            var milestones = t.Milestones.Where(m => !m.IsDeleted).ToList();
            var pendingReviews = milestones.Count(m => m.Status == MilestoneStatus.SubmittedForReview)
                               + t.Artifacts.Count(a => !a.IsDeleted && a.Status == ArtifactStatus.Uploaded)
                               + t.WeeklyLogs.Count(l => !l.IsDeleted && !l.IsVerified);

            return new SupervisedTeamSummaryDto
            {
                TeamId = t.Id,
                TeamCode = t.TeamCode,
                Title = t.Title,
                TrackName = t.AcademicTrack?.Name ?? string.Empty,
                DepartmentName = t.Department?.Name ?? string.Empty,
                Status = t.Status,
                MemberCount = activeMembers.Count,
                TeamLeadName = lead?.User?.FullName,
                GuideAllocatedAtUtc = t.GuideAllocatedAtUtc,
                CompletedTasksCount = tasks.Count(tsk => tsk.Status == SprintTaskStatus.Done),
                TotalTasksCount = tasks.Count,
                CompletedMilestonesCount = milestones.Count(m => m.Status == MilestoneStatus.Approved),
                TotalMilestonesCount = milestones.Count,
                PendingReviewsCount = pendingReviews
            };
        }).ToList();

        var dashboard = new SupervisionDashboardDto
        {
            SupervisedTeamsCount = supervisedTeams.Count,
            ActiveStudentsCount = allMembers.Select(m => m.UserId).Distinct().Count(),
            PendingMilestoneReviewsCount = allMilestones.Count(m => m.Status == MilestoneStatus.SubmittedForReview),
            PendingArtifactReviewsCount = allArtifacts.Count(a => a.Status == ArtifactStatus.Uploaded),
            PendingWeeklyLogsCount = allLogs.Count(l => !l.IsVerified),
            OverdueTasksCount = allTasks.Count(task => task.DueDateUtc.HasValue && task.DueDateUtc.Value < now && task.Status != SprintTaskStatus.Done),
            Teams = teamSummaries
        };

        return Ok(dashboard);
    }

    /// <summary>
    /// Retrieve full team execution details for official supervision.
    /// Requires caller to be the officially allocated guide (or HOD/SuperAdmin).
    /// </summary>
    [HttpGet("teams/{teamId}")]
    public async Task<ActionResult<SupervisedTeamDetailDto>> GetSupervisedTeamDetail(Guid teamId)
    {
        var facultyId = _tenantContext.UserId!.Value;
        var role = _tenantContext.Role;

        var team = await _context.ProjectTeams
            .Include(t => t.Members)
                .ThenInclude(m => m.User)
            .Include(t => t.Tasks)
                .ThenInclude(task => task.AssignedToUser)
            .Include(t => t.Milestones)
                .ThenInclude(m => m.SubmittedByUser)
            .Include(t => t.Milestones)
                .ThenInclude(m => m.ReviewedByUser)
            .Include(t => t.Milestones)
                .ThenInclude(m => m.ReviewHistories)
                    .ThenInclude(h => h.ReviewerUser)
            .Include(t => t.Artifacts)
            .Include(t => t.WeeklyLogs)
                .ThenInclude(l => l.AuthorUser)
            .FirstOrDefaultAsync(t => t.Id == teamId && !t.IsDeleted);

        if (team == null)
        {
            return NotFound(new { message = "Project team not found." });
        }

        // Authority gate: Only the officially allocated guide or department HOD can access private academic details
        var isAllocatedGuide = team.GuideUserId == facultyId;
        var isHod = role == UserRole.HOD;

        if (isHod && !isAllocatedGuide)
        {
            var caller = await _context.Users.FirstOrDefaultAsync(u => u.Id == facultyId);
            if (caller == null || caller.DepartmentId != team.DepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You are not authorized to supervise teams outside your academic department." });
            }
        }
        else if (!isAllocatedGuide)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "You are not authorized to access private academic details for this project team." });
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

        return Ok(new SupervisedTeamDetailDto
        {
            TeamId = team.Id,
            TeamCode = team.TeamCode,
            Title = team.Title,
            Abstract = team.Abstract,
            DomainTag = team.DomainTag,
            SdgCode = team.SdgCode,
            Status = team.Status,
            RepoUrl = team.RepoUrl,
            JiraBoardKey = team.JiraBoardKey,
            MissedLogStreak = team.MissedLogStreak,
            GuideAllocatedAtUtc = team.GuideAllocatedAtUtc,
            GuideAllocationRemarks = team.GuideAllocationRemarks,
            Members = members,
            Tasks = tasks,
            Milestones = milestones,
            Artifacts = artifacts,
            WeeklyLogs = logs
        });
    }

    /// <summary>
    /// Review a submitted project milestone.
    /// Formally transitions status to Approved or RevisionRequested, logs audit trail and review history.
    /// Strictly requires officially allocated guide access.
    /// </summary>
    [HttpPost("milestones/{milestoneId}/review")]
    public async Task<ActionResult<ProjectMilestoneDto>> ReviewMilestone(Guid milestoneId, [FromBody] ReviewMilestoneRequest request)
    {
        var facultyId = _tenantContext.UserId!.Value;
        var role = _tenantContext.Role;

        var milestone = await _context.ProjectMilestones
            .Include(m => m.ProjectTeam)
            .Include(m => m.SubmittedByUser)
            .Include(m => m.ReviewHistories)
                .ThenInclude(h => h.ReviewerUser)
            .FirstOrDefaultAsync(m => m.Id == milestoneId && !m.IsDeleted);

        if (milestone == null)
        {
            return NotFound(new { message = "Milestone not found." });
        }

        var team = milestone.ProjectTeam;
        if (team == null)
        {
            return NotFound(new { message = "Associated project team not found." });
        }

        // Authority gate: Only official guide or department HOD can evaluate milestones
        var isAllocatedGuide = team.GuideUserId == facultyId;
        var isHod = role == UserRole.HOD;

        if (isHod && !isAllocatedGuide)
        {
            var caller = await _context.Users.FirstOrDefaultAsync(u => u.Id == facultyId);
            if (caller == null || caller.DepartmentId != team.DepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You are not authorized to evaluate milestones outside your department." });
            }
        }
        else if (!isAllocatedGuide)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the officially allocated faculty guide or department HOD can evaluate project milestones for this team." });
        }

        if (milestone.Status != MilestoneStatus.SubmittedForReview)
        {
            return BadRequest(new { message = $"Milestone cannot be reviewed in its current status ({milestone.Status}). Only milestones submitted for review can be evaluated." });
        }

        if (string.IsNullOrWhiteSpace(request.Feedback) || request.Feedback.Trim().Length < 5)
        {
            return BadRequest(new { message = "Faculty review feedback must be at least 5 characters." });
        }

        var newStatus = request.IsApproved ? MilestoneStatus.Approved : MilestoneStatus.RevisionRequested;
        var feedback = request.Feedback.Trim();
        var reviewedAt = DateTime.UtcNow;

        milestone.Status = newStatus;
        milestone.ReviewedAtUtc = reviewedAt;
        milestone.ReviewedByUserId = facultyId;
        milestone.ReviewFeedback = feedback;

        // Persist historical review iteration
        var reviewHistory = new MilestoneReviewHistory
        {
            CollegeId = milestone.CollegeId,
            ProjectMilestoneId = milestone.Id,
            ReviewerUserId = facultyId,
            ResultStatus = newStatus,
            Feedback = feedback,
            ReviewedAtUtc = reviewedAt
        };
        await _context.MilestoneReviewHistories.AddAsync(reviewHistory);

        var reviewer = await _context.Users.FirstOrDefaultAsync(u => u.Id == facultyId);

        var auditLog = new PlatformAuditLog
        {
            ActorUserId = facultyId,
            ActorEmail = reviewer?.Email ?? string.Empty,
            Action = "FACULTY_MILESTONE_REVIEWED",
            TargetTenantId = milestone.CollegeId,
            TargetEntity = "ProjectMilestone",
            MetadataJson = JsonSerializer.Serialize(new
            {
                milestoneId = milestone.Id,
                teamId = team.Id,
                resultStatus = newStatus.ToString(),
                feedbackLength = feedback.Length,
                reviewerRole = role.ToString()
            }),
            OccurredAtUtc = reviewedAt
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();

        var historyDtos = await _context.MilestoneReviewHistories
            .Include(h => h.ReviewerUser)
            .Where(h => h.ProjectMilestoneId == milestone.Id && !h.IsDeleted)
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

        var dto = new ProjectMilestoneDto
        {
            Id = milestone.Id,
            ProjectTeamId = milestone.ProjectTeamId,
            Title = milestone.Title,
            Description = milestone.Description,
            TargetDateUtc = milestone.TargetDateUtc,
            Status = milestone.Status,
            RequiredTaskCompletionPercentage = milestone.RequiredTaskCompletionPercentage,
            SubmittedAtUtc = milestone.SubmittedAtUtc,
            SubmittedByUserId = milestone.SubmittedByUserId,
            SubmittedByName = milestone.SubmittedByUser?.FullName,
            SubmissionEvidenceUrl = milestone.SubmissionEvidenceUrl,
            ReviewedAtUtc = milestone.ReviewedAtUtc,
            ReviewedByUserId = milestone.ReviewedByUserId,
            ReviewedByName = reviewer?.FullName,
            ReviewFeedback = milestone.ReviewFeedback,
            IsOverdue = milestone.TargetDateUtc < DateTime.UtcNow && milestone.Status != MilestoneStatus.Approved,
            ReviewHistories = historyDtos
        };

        return Ok(dto);
    }

    /// <summary>
    /// Officially allocated guide reviews a vault deliverable artifact.
    /// </summary>
    [HttpPost("artifacts/{artifactId}/review")]
    public async Task<IActionResult> ReviewArtifact(Guid artifactId, [FromBody] ReviewArtifactRequest request)
    {
        var facultyId = _tenantContext.UserId!.Value;
        var role = _tenantContext.Role;

        var artifact = await _context.TeamArtifacts
            .Include(a => a.ProjectTeam)
            .FirstOrDefaultAsync(a => a.Id == artifactId && !a.IsDeleted);

        if (artifact == null)
        {
            return NotFound(new { message = "Artifact not found." });
        }

        var team = artifact.ProjectTeam;
        if (team == null) return NotFound(new { message = "Associated project team not found." });

        var isAllocatedGuide = team.GuideUserId == facultyId;
        var isHod = role == UserRole.HOD;

        if (isHod && !isAllocatedGuide)
        {
            var caller = await _context.Users.FirstOrDefaultAsync(u => u.Id == facultyId);
            if (caller == null || caller.DepartmentId != team.DepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You are not authorized to review artifacts outside your academic department." });
            }
        }
        else if (!isAllocatedGuide)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the officially allocated faculty guide or department HOD can review artifacts for this team." });
        }

        if (string.IsNullOrWhiteSpace(request.ReviewerNote) || request.ReviewerNote.Trim().Length < 5)
        {
            return BadRequest(new { message = "Reviewer note must be at least 5 characters." });
        }

        artifact.Status = request.IsApproved ? ArtifactStatus.Verified : ArtifactStatus.RevisionRequested;
        artifact.ReviewerNote = request.ReviewerNote.Trim();
        artifact.VerifiedByUserId = facultyId;

        var reviewer = await _context.Users.FirstOrDefaultAsync(u => u.Id == facultyId);
        var auditLog = new PlatformAuditLog
        {
            ActorUserId = facultyId,
            ActorEmail = reviewer?.Email ?? string.Empty,
            Action = "FACULTY_ARTIFACT_REVIEWED",
            TargetTenantId = artifact.CollegeId,
            TargetEntity = "TeamArtifact",
            MetadataJson = JsonSerializer.Serialize(new
            {
                artifactId = artifact.Id,
                teamId = team.Id,
                slot = artifact.SlotType.ToString(),
                status = artifact.Status.ToString()
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();
        return Ok(new { success = true, artifactId = artifact.Id, status = artifact.Status });
    }

    /// <summary>
    /// Officially allocated guide verifies a student weekly logbook entry.
    /// </summary>
    [HttpPost("logs/{logId}/verify")]
    public async Task<IActionResult> VerifyLog(Guid logId, [FromBody] SupervisionVerifyLogRequest request)
    {
        var facultyId = _tenantContext.UserId!.Value;
        var role = _tenantContext.Role;

        var log = await _context.WeeklyLogbooks
            .Include(l => l.ProjectTeam)
            .FirstOrDefaultAsync(l => l.Id == logId && !l.IsDeleted);

        if (log == null)
        {
            return NotFound(new { message = "Logbook entry not found." });
        }

        var team = log.ProjectTeam;
        if (team == null) return NotFound(new { message = "Associated project team not found." });

        var isAllocatedGuide = team.GuideUserId == facultyId;
        var isHod = role == UserRole.HOD;

        if (isHod && !isAllocatedGuide)
        {
            var caller = await _context.Users.FirstOrDefaultAsync(u => u.Id == facultyId);
            if (caller == null || caller.DepartmentId != team.DepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You are not authorized to verify logs outside your academic department." });
            }
        }
        else if (!isAllocatedGuide)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the officially allocated faculty guide or department HOD can verify logs for this team." });
        }

        log.IsVerified = request.IsVerified;
        log.MentorRemarks = request.MentorRemarks?.Trim();

        var reviewer = await _context.Users.FirstOrDefaultAsync(u => u.Id == facultyId);
        var auditLog = new PlatformAuditLog
        {
            ActorUserId = facultyId,
            ActorEmail = reviewer?.Email ?? string.Empty,
            Action = "FACULTY_LOG_VERIFIED",
            TargetTenantId = log.CollegeId,
            TargetEntity = "WeeklyLogbook",
            MetadataJson = JsonSerializer.Serialize(new
            {
                logId = log.Id,
                teamId = team.Id,
                isVerified = log.IsVerified
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();
        return Ok(new { success = true, logId = log.Id, isVerified = log.IsVerified });
    }

    // =========================================================================
    // PHASE 8: PROJECT FINAL SUBMISSION & DELIVERABLES SUPERVISION
    // =========================================================================

    /// <summary>
    /// Officially allocated guide or department HOD retrieves the project final report submission.
    /// Strictly blocks SuperAdmin and unassigned faculty members.
    /// </summary>
    [HttpGet("teams/{teamId}/submission")]
    public async Task<ActionResult<ProjectReportSubmissionDto>> GetTeamSubmission(Guid teamId)
    {
        var facultyId = _tenantContext.UserId!.Value;
        var role = _tenantContext.Role;

        if (role == UserRole.SuperAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "SuperAdmin cannot access departmental academic project submissions." });
        }

        var team = await _context.ProjectTeams
            .Include(t => t.GuideUser)
            .FirstOrDefaultAsync(t => t.Id == teamId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Project team not found." });

        var isAllocatedGuide = team.GuideUserId == facultyId;
        var isHod = role == UserRole.HOD;

        if (isHod && !isAllocatedGuide)
        {
            var caller = await _context.Users.FirstOrDefaultAsync(u => u.Id == facultyId);
            if (caller == null || caller.DepartmentId != team.DepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You are not authorized to view submissions outside your academic department." });
            }
        }
        else if (!isAllocatedGuide)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the officially allocated faculty guide or department HOD can view final submissions for this team." });
        }

        var submission = await _context.ProjectReportSubmissions
            .Include(s => s.SubmittedByUser)
            .Include(s => s.ReviewedByUser)
            .Include(s => s.ReviewHistories)
                .ThenInclude(h => h.ReviewerUser)
            .FirstOrDefaultAsync(s => s.ProjectTeamId == team.Id && !s.IsDeleted);

        if (submission == null)
        {
            return NotFound(new { message = "No final report submission found for this team." });
        }

        var milestones = await _context.ProjectMilestones
            .Where(m => m.ProjectTeamId == team.Id && !m.IsDeleted)
            .ToListAsync();

        var readiness = BuildSubmissionReadiness(team, submission, milestones);
        return Ok(MapSubmissionToDto(submission, readiness));
    }

    /// <summary>
    /// Officially allocated guide or department HOD reviews a final project submission.
    /// On Acceptance: transitions team status to ReadyForViva and records audit history.
    /// On Revision Requested: records revision feedback for student team resubmission.
    /// </summary>
    [HttpPost("submissions/{submissionId}/review")]
    public async Task<ActionResult<ProjectReportSubmissionDto>> ReviewFinalSubmission(Guid submissionId, [FromBody] ReviewFinalSubmissionRequest request)
    {
        var facultyId = _tenantContext.UserId!.Value;
        var role = _tenantContext.Role;

        if (role == UserRole.SuperAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "SuperAdmin cannot review academic project submissions." });
        }

        var submission = await _context.ProjectReportSubmissions
            .Include(s => s.ProjectTeam)
            .Include(s => s.SubmittedByUser)
            .Include(s => s.ReviewHistories)
                .ThenInclude(h => h.ReviewerUser)
            .FirstOrDefaultAsync(s => s.Id == submissionId && !s.IsDeleted);

        if (submission == null)
        {
            return NotFound(new { message = "Project report submission not found." });
        }

        var team = submission.ProjectTeam;
        if (team == null) return NotFound(new { message = "Associated project team not found." });

        var isAllocatedGuide = team.GuideUserId == facultyId;
        var isHod = role == UserRole.HOD;

        if (isHod && !isAllocatedGuide)
        {
            var caller = await _context.Users.FirstOrDefaultAsync(u => u.Id == facultyId);
            if (caller == null || caller.DepartmentId != team.DepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You are not authorized to review submissions outside your academic department." });
            }
        }
        else if (!isAllocatedGuide)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the officially allocated faculty guide or department HOD can review final submissions for this team." });
        }

        if (submission.Status != FinalSubmissionStatus.Submitted &&
            submission.Status != FinalSubmissionStatus.Resubmitted &&
            submission.Status != FinalSubmissionStatus.UnderReview)
        {
            return BadRequest(new { message = $"Submission cannot be reviewed while in status: {submission.Status}. It must be Submitted or Resubmitted." });
        }

        var reviewedAt = DateTime.UtcNow;
        var resultStatus = request.IsApproved ? FinalSubmissionStatus.Accepted : FinalSubmissionStatus.RevisionRequested;

        submission.Status = resultStatus;
        submission.ReviewedAtUtc = reviewedAt;
        submission.ReviewedByUserId = facultyId;
        submission.ReviewFeedback = request.Feedback.Trim();

        if (request.IsApproved)
        {
            team.Status = ProjectStatus.ReadyForViva;
        }

        var history = new SubmissionReviewHistory
        {
            CollegeId = submission.CollegeId,
            ProjectReportSubmissionId = submission.Id,
            SubmissionVersion = submission.VersionNumber,
            ReviewerUserId = facultyId,
            ResultStatus = resultStatus,
            Feedback = request.Feedback.Trim(),
            ReviewedAtUtc = reviewedAt
        };
        await _context.SubmissionReviewHistories.AddAsync(history);

        var reviewer = await _context.Users.FirstOrDefaultAsync(u => u.Id == facultyId);
        var auditLog = new PlatformAuditLog
        {
            ActorUserId = facultyId,
            ActorEmail = reviewer?.Email ?? string.Empty,
            Action = "FACULTY_FINAL_SUBMISSION_REVIEWED",
            TargetTenantId = submission.CollegeId,
            TargetEntity = "ProjectReportSubmission",
            MetadataJson = JsonSerializer.Serialize(new
            {
                submissionId = submission.Id,
                teamId = team.Id,
                resultStatus = resultStatus.ToString(),
                version = submission.VersionNumber,
                feedbackLength = request.Feedback.Length,
                teamStatusTransition = request.IsApproved ? ProjectStatus.ReadyForViva.ToString() : null
            }),
            OccurredAtUtc = reviewedAt
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();

        var milestones = await _context.ProjectMilestones
            .Where(m => m.ProjectTeamId == team.Id && !m.IsDeleted)
            .ToListAsync();

        var readiness = BuildSubmissionReadiness(team, submission, milestones);
        return Ok(MapSubmissionToDto(submission, readiness));
    }

    /// <summary>
    /// Stream the attached final report deliverable for an authorized faculty reviewer.
    /// Strictly blocked for SuperAdmin and unassigned faculty members.
    /// </summary>
    [HttpGet("submissions/{submissionId}/download")]
    public async Task<IActionResult> DownloadSubmissionReport(Guid submissionId, CancellationToken cancellationToken)
    {
        var facultyId = _tenantContext.UserId!.Value;
        var role = _tenantContext.Role;

        if (role == UserRole.SuperAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "SuperAdmin cannot download departmental academic project deliverables." });
        }

        var submission = await _context.ProjectReportSubmissions
            .Include(s => s.ProjectTeam)
            .Include(s => s.ReportArtifact)
            .FirstOrDefaultAsync(s => s.Id == submissionId && !s.IsDeleted, cancellationToken);

        if (submission == null) return NotFound(new { message = "Submission not found." });

        var team = submission.ProjectTeam;
        if (team == null) return NotFound(new { message = "Associated project team not found." });

        var isAllocatedGuide = team.GuideUserId == facultyId;
        var isHod = role == UserRole.HOD;

        if (isHod && !isAllocatedGuide)
        {
            var caller = await _context.Users.FirstOrDefaultAsync(u => u.Id == facultyId, cancellationToken);
            if (caller == null || caller.DepartmentId != team.DepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You are not authorized to download deliverables outside your academic department." });
            }
        }
        else if (!isAllocatedGuide)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the officially allocated faculty guide or department HOD can download deliverables for this team." });
        }

        string storageKey = string.Empty;
        string fileName = !string.IsNullOrWhiteSpace(submission.ReportFileName) ? submission.ReportFileName : "FinalReport.pdf";

        if (submission.ReportArtifact != null && !string.IsNullOrWhiteSpace(submission.ReportArtifact.StorageKey))
        {
            storageKey = submission.ReportArtifact.StorageKey;
            if (!string.IsNullOrWhiteSpace(submission.ReportArtifact.FileName))
            {
                fileName = submission.ReportArtifact.FileName;
            }
        }
        else if (!string.IsNullOrWhiteSpace(submission.ReportStorageKey))
        {
            storageKey = submission.ReportStorageKey;
        }
        else
        {
            return NotFound(new { message = "No attached report deliverable file found for this submission." });
        }

        try
        {
            var (stream, contentType) = await _fileStorageService.OpenReadAsync(storageKey, cancellationToken);
            Response.Headers.Append("Content-Disposition", $"attachment; filename=\"{fileName}\"");
            return File(stream, contentType, fileName);
        }
        catch (FileNotFoundException)
        {
            return NotFound(new { message = "Report deliverable file not found in storage." });
        }
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
}
