using System.Security.Cryptography;
using System.Text;
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
[Route("api/closure")]
[Authorize]
public class ClosureController : ControllerBase
{
    private readonly ProjectHubDbContext _context;
    private readonly ITenantContext _tenantContext;

    public ClosureController(ProjectHubDbContext context, ITenantContext tenantContext)
    {
        _context = context;
        _tenantContext = tenantContext;
    }

    [HttpGet("teams/{teamId}/readiness")]
    public async Task<ActionResult<ClosureReadinessDto>> GetClosureReadiness(Guid teamId)
    {
        if (_tenantContext.Role == UserRole.SuperAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "SuperAdmin cannot inspect private departmental closure readiness." });
        }

        var collegeId = _tenantContext.CollegeId!.Value;
        var callerId = _tenantContext.UserId!.Value;
        var role = _tenantContext.Role;

        var team = await _context.ProjectTeams
            .Include(t => t.Department)
            .Include(t => t.AcademicTrack)
            .Include(t => t.Members)
                .ThenInclude(m => m.User)
            .Include(t => t.ReportSubmissions)
            .Include(t => t.Evaluations)
                .ThenInclude(e => e.IndividualScores)
            .Include(t => t.ClosureRecord)
                .ThenInclude(c => c!.ClosedByUser)
            .Include(t => t.ClosureRecord)
                .ThenInclude(c => c!.AcademicRecords)
            .FirstOrDefaultAsync(t => t.Id == teamId && t.CollegeId == collegeId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Project team not found." });

        // Authorization check: HOD/Faculty must be matching department, or student must be enrolled
        if (role == UserRole.Student)
        {
            var isMember = team.Members.Any(m => m.UserId == callerId && m.IsActive && !m.IsDeleted);
            if (!isMember)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You are not an active member of this project team." });
            }
        }
        else if (role == UserRole.HOD)
        {
            var caller = await _context.Users.FirstOrDefaultAsync(u => u.Id == callerId);
            if (caller?.DepartmentId != team.DepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "HOD can only check closure readiness within their academic department." });
            }
        }
        else if (role == UserRole.Faculty)
        {
            var isGuide = team.GuideUserId == callerId;
            var isCoord = await _context.Users.AnyAsync(u => u.Id == callerId && u.DepartmentId == team.DepartmentId && (_tenantContext.IsProjectCoordinator || u.IsProjectCoordinator) && !u.IsDeleted);
            if (!isGuide && !isCoord)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You are not authorized to inspect this project's closure readiness." });
            }
        }

        var eval = team.Evaluations.FirstOrDefault(e => e.CheckpointType == CheckpointType.FinalViva && !e.IsDeleted);
        var sub = team.ReportSubmissions.OrderByDescending(s => s.VersionNumber).FirstOrDefault(s => !s.IsDeleted);

        var blockingReasons = new List<string>();

        var evalPublished = eval != null && eval.IsPublished;
        if (!evalPublished)
        {
            blockingReasons.Add("Final defense viva evaluation is not yet formally published by Department Authority.");
        }
        else if (eval?.Outcome != VivaOutcome.Pass)
        {
            blockingReasons.Add($"Evaluation outcome is '{eval?.Outcome}'. Only teams with 'Pass' outcome are eligible for formal closure.");
        }

        var reportAccepted = sub != null && sub.Status == FinalSubmissionStatus.Accepted;
        if (!reportAccepted)
        {
            blockingReasons.Add("Final project report submission is not accepted by the designated faculty guide.");
        }

        var activeMembers = team.Members.Where(m => m.IsActive && !m.IsDeleted).ToList();
        var indScores = eval?.IndividualScores.Where(s => !s.IsDeleted).ToList() ?? new List<IndividualStudentScore>();
        var scoredCount = activeMembers.Count(m => indScores.Any(s => s.StudentUserId == m.UserId));
        var indFinalized = activeMembers.Count > 0 && scoredCount == activeMembers.Count;

        if (!indFinalized)
        {
            blockingReasons.Add($"Individual student contribution marks are finalized for {scoredCount}/{activeMembers.Count} enrolled members.");
        }

        var isAlreadyClosed = team.ClosureRecord != null && !team.ClosureRecord.IsReopened;

        ProjectClosureResultDto? existingClosureDto = null;
        if (team.ClosureRecord != null)
        {
            existingClosureDto = new ProjectClosureResultDto
            {
                ClosureRecordId = team.ClosureRecord.Id,
                ProjectTeamId = team.Id,
                TeamCode = team.TeamCode,
                Status = team.ClosureRecord.Status,
                ClosureCertificateHash = team.ClosureRecord.ClosureCertificateHash,
                ClosedAtUtc = team.ClosureRecord.ClosedAtUtc,
                ClosedByName = team.ClosureRecord.ClosedByUser?.FullName ?? "Academic Authority",
                ClosureRemarks = team.ClosureRecord.ClosureRemarks,
                IsArchived = team.ClosureRecord.IsArchived,
                AcademicRecordsGenerated = team.ClosureRecord.AcademicRecords.Count,
                GeneratedStudentRecords = team.ClosureRecord.AcademicRecords.Select(r => new StudentAcademicRecordSummaryDto
                {
                    RecordId = r.Id,
                    StudentUserId = r.StudentUserId,
                    StudentName = r.StudentName,
                    EnrollmentNumber = r.EnrollmentNumber,
                    RoleDescription = r.RoleDescription,
                    FinalComputedMark = r.FinalComputedMark,
                    VerificationHash = r.VerificationHash
                }).ToList()
            };
        }

        return Ok(new ClosureReadinessDto
        {
            ProjectTeamId = team.Id,
            TeamCode = team.TeamCode,
            Title = team.Title,
            Status = team.Status,
            CanClose = blockingReasons.Count == 0 && !isAlreadyClosed,
            BlockingReasons = blockingReasons,
            EvaluationPublished = evalPublished,
            EvaluationOutcome = eval?.Outcome,
            FinalReportAccepted = reportAccepted,
            ReportFileName = sub?.ReportFileName,
            IndividualScoresFinalized = indFinalized,
            TotalMembersCount = activeMembers.Count,
            ScoredMembersCount = scoredCount,
            IsClosed = isAlreadyClosed,
            ExistingClosure = existingClosureDto
        });
    }

    [HttpPost("teams/{teamId}/close")]
    [Authorize(Policy = ProjectHubPolicies.FacultyOrAbove)]
    public async Task<ActionResult<ProjectClosureResultDto>> FormallyCloseProject(Guid teamId, [FromBody] CloseProjectRequest request)
    {
        if (_tenantContext.Role == UserRole.SuperAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "SuperAdmin cannot conduct departmental project closures." });
        }

        var collegeId = _tenantContext.CollegeId!.Value;
        var callerId = _tenantContext.UserId!.Value;
        var role = _tenantContext.Role;

        var team = await _context.ProjectTeams
            .Include(t => t.College)
            .Include(t => t.Department)
            .Include(t => t.AcademicTrack)
            .Include(t => t.GuideUser)
            .Include(t => t.Members)
                .ThenInclude(m => m.User)
            .Include(t => t.ReportSubmissions)
            .Include(t => t.Evaluations)
                .ThenInclude(e => e.IndividualScores)
            .Include(t => t.ClosureRecord)
                .ThenInclude(c => c!.AcademicRecords)
            .FirstOrDefaultAsync(t => t.Id == teamId && t.CollegeId == collegeId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Project team not found." });

        // Authorization check: Only Department HOD, Coordinator, or CollegeAdmin can formally close projects
        if (role == UserRole.HOD)
        {
            var caller = await _context.Users.FirstOrDefaultAsync(u => u.Id == callerId);
            if (caller?.DepartmentId != team.DepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "HOD cannot approve closure for projects outside their academic department." });
            }
        }
        else if (role != UserRole.CollegeAdmin)
        {
            var isCoord = await _context.Users.AnyAsync(u => u.Id == callerId && u.DepartmentId == team.DepartmentId && (_tenantContext.IsProjectCoordinator || u.IsProjectCoordinator) && !u.IsDeleted);
            if (!isCoord)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the Department HOD or appointed Academic Coordinator can authorize formal project closure." });
            }
        }

        // Idempotency check: If already closed and not reopened, return existing record safely
        if (team.ClosureRecord != null && !team.ClosureRecord.IsReopened)
        {
            var callerUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == team.ClosureRecord.ClosedByUserId);
            return Ok(new ProjectClosureResultDto
            {
                ClosureRecordId = team.ClosureRecord.Id,
                ProjectTeamId = team.Id,
                TeamCode = team.TeamCode,
                Status = team.ClosureRecord.Status,
                ClosureCertificateHash = team.ClosureRecord.ClosureCertificateHash,
                ClosedAtUtc = team.ClosureRecord.ClosedAtUtc,
                ClosedByName = callerUser?.FullName ?? "Academic Authority",
                ClosureRemarks = team.ClosureRecord.ClosureRemarks,
                IsArchived = team.ClosureRecord.IsArchived,
                AcademicRecordsGenerated = team.ClosureRecord.AcademicRecords.Count,
                GeneratedStudentRecords = team.ClosureRecord.AcademicRecords.Select(r => new StudentAcademicRecordSummaryDto
                {
                    RecordId = r.Id,
                    StudentUserId = r.StudentUserId,
                    StudentName = r.StudentName,
                    EnrollmentNumber = r.EnrollmentNumber,
                    RoleDescription = r.RoleDescription,
                    FinalComputedMark = r.FinalComputedMark,
                    VerificationHash = r.VerificationHash
                }).ToList()
            });
        }

        // Gate 1: Evaluation published with Pass outcome
        var eval = team.Evaluations.FirstOrDefault(e => e.CheckpointType == CheckpointType.FinalViva && !e.IsDeleted);
        if (eval == null || !eval.IsPublished || eval.Outcome != VivaOutcome.Pass)
        {
            return BadRequest(new { message = "Closure Gate Failed: Project viva defense evaluation must be published with 'Pass' outcome prior to closure." });
        }

        // Gate 2: Final Report Submission accepted
        var sub = team.ReportSubmissions.OrderByDescending(s => s.VersionNumber).FirstOrDefault(s => !s.IsDeleted);
        if (sub == null || sub.Status != FinalSubmissionStatus.Accepted)
        {
            return BadRequest(new { message = "Closure Gate Failed: Final project report submission must be formally accepted by faculty guide prior to closure." });
        }

        // Gate 3: Individual scores finalized for all active members
        var activeMembers = team.Members.Where(m => m.IsActive && !m.IsDeleted).ToList();
        var indScores = eval.IndividualScores.Where(s => !s.IsDeleted).ToList();
        if (activeMembers.Any(m => !indScores.Any(s => s.StudentUserId == m.UserId)))
        {
            return BadRequest(new { message = "Closure Gate Failed: Individual contribution marks must be finalized for every enrolled team member." });
        }

        var closer = await _context.Users.FirstOrDefaultAsync(u => u.Id == callerId);

        // Generate cryptographic SHA-256 closure hash snapshot
        var rawHashPayload = $"{collegeId}:{team.DepartmentId}:{team.AcademicTrackId}:{team.Id}:{team.TeamCode}:{eval.SharedTotalScore}:{sub.ReportSha256Checksum}:{DateTime.UtcNow.Ticks}";
        var closureHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawHashPayload)));

        // Create or update ProjectClosureRecord
        var closure = team.ClosureRecord ?? new ProjectClosureRecord
        {
            CollegeId = collegeId,
            DepartmentId = team.DepartmentId,
            AcademicTrackId = team.AcademicTrackId,
            ProjectTeamId = team.Id
        };

        closure.ClosedByUserId = callerId;
        closure.ClosedAtUtc = DateTime.UtcNow;
        closure.Status = ProjectClosureStatus.Closed;
        closure.ClosureCertificateHash = closureHash;
        closure.ClosureRemarks = request.ClosureRemarks.Trim();
        closure.IsArchived = true;
        closure.ArchivedAtUtc = DateTime.UtcNow;
        closure.IsReopened = false;
        closure.ReopeningReason = null;

        if (team.ClosureRecord == null)
        {
            await _context.ProjectClosureRecords.AddAsync(closure);
        }

        // Transition team status to Archived
        team.Status = ProjectStatus.Archived;

        // Generate authoritative, immutable StudentAcademicRecord for each active team member
        var generatedRecords = new List<StudentAcademicRecordSummaryDto>();

        foreach (var member in activeMembers)
        {
            var studentScore = indScores.FirstOrDefault(s => s.StudentUserId == member.UserId);
            var memberUser = member.User;

            // Generate unique verification hash for certificate QR and external verification
            var verifyHashPayload = $"{team.Id}:{member.UserId}:{closure.Id}:{memberUser?.EnrollmentOrEmployeeCode}:{DateTime.UtcNow.Ticks}";
            var verificationHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(verifyHashPayload)));

            var existingRecord = await _context.StudentAcademicRecords
                .FirstOrDefaultAsync(r => r.ProjectTeamId == team.Id && r.StudentUserId == member.UserId && r.CollegeId == collegeId && !r.IsDeleted);

            if (existingRecord == null)
            {
                var academicRecord = new StudentAcademicRecord
                {
                    CollegeId = collegeId,
                    DepartmentId = team.DepartmentId,
                    AcademicTrackId = team.AcademicTrackId,
                    StudentUserId = member.UserId,
                    ProjectTeamId = team.Id,
                    ProjectClosureRecordId = closure.Id,
                    ProjectTitle = team.Title,
                    ProjectAbstract = team.Abstract,
                    TeamCode = team.TeamCode,
                    AcademicYear = team.AcademicTrack?.AcademicYear ?? "2026-2027",
                    TrackName = team.AcademicTrack?.Name ?? "Minor Project",
                    DepartmentName = team.Department?.Name ?? "Computer Science & Engineering",
                    CollegeName = team.College?.Name ?? "SISTec",
                    StudentName = memberUser?.FullName ?? "Student",
                    EnrollmentNumber = memberUser?.EnrollmentOrEmployeeCode ?? string.Empty,
                    RoleDescription = string.IsNullOrWhiteSpace(member.ModuleResponsibility) ? (member.IsTeamLead ? "Team Lead" : "Engineering Member") : member.ModuleResponsibility,
                    IsTeamLead = member.IsTeamLead,
                    GuideUserId = team.GuideUserId,
                    GuideName = team.GuideUser?.FullName ?? "Faculty Guide",
                    FinalOutcome = eval.Outcome,
                    SharedTotalScore = eval.SharedTotalScore,
                    SharedMaxScore = 50.0m,
                    IndividualContributionScore = studentScore?.IndividualTotalScore ?? 0m,
                    FinalComputedMark = studentScore?.FinalComputedStudentMark ?? 0m,
                    RubricCriteriaBreakdownJson = eval.SharedRubricScoresJson ?? "[]",
                    VerifiedRepositoryUrl = sub.RepositoryUrl ?? team.RepoUrl,
                    VerifiedDemoUrl = sub.DemoUrl,
                    FinalReportFileName = sub.ReportFileName,
                    FinalReportChecksum = sub.ReportSha256Checksum,
                    VerificationHash = verificationHash,
                    IsVerified = true,
                    VerifiedAtUtc = DateTime.UtcNow,
                    AllowPublicPortfolio = false
                };

                await _context.StudentAcademicRecords.AddAsync(academicRecord);

                generatedRecords.Add(new StudentAcademicRecordSummaryDto
                {
                    RecordId = academicRecord.Id,
                    StudentUserId = academicRecord.StudentUserId,
                    StudentName = academicRecord.StudentName,
                    EnrollmentNumber = academicRecord.EnrollmentNumber,
                    RoleDescription = academicRecord.RoleDescription,
                    FinalComputedMark = academicRecord.FinalComputedMark,
                    VerificationHash = academicRecord.VerificationHash
                });
            }
            else
            {
                existingRecord.ProjectTitle = team.Title;
                existingRecord.FinalOutcome = eval.Outcome;
                existingRecord.SharedTotalScore = eval.SharedTotalScore;
                existingRecord.IndividualContributionScore = studentScore?.IndividualTotalScore ?? existingRecord.IndividualContributionScore;
                existingRecord.FinalComputedMark = studentScore?.FinalComputedStudentMark ?? existingRecord.FinalComputedMark;
                existingRecord.IsVerified = true;
                existingRecord.VerifiedAtUtc = DateTime.UtcNow;

                generatedRecords.Add(new StudentAcademicRecordSummaryDto
                {
                    RecordId = existingRecord.Id,
                    StudentUserId = existingRecord.StudentUserId,
                    StudentName = existingRecord.StudentName,
                    EnrollmentNumber = existingRecord.EnrollmentNumber,
                    RoleDescription = existingRecord.RoleDescription,
                    FinalComputedMark = existingRecord.FinalComputedMark,
                    VerificationHash = existingRecord.VerificationHash
                });
            }
        }

        var auditLog = new PlatformAuditLog
        {
            ActorUserId = callerId,
            Action = "PROJECT_FORMALLY_CLOSED",
            TargetTenantId = collegeId,
            TargetEntity = "ProjectTeam",
            MetadataJson = JsonSerializer.Serialize(new
            {
                teamId = team.Id,
                teamCode = team.TeamCode,
                certificateHash = closureHash,
                academicRecordsCount = generatedRecords.Count
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();

        return Ok(new ProjectClosureResultDto
        {
            ClosureRecordId = closure.Id,
            ProjectTeamId = team.Id,
            TeamCode = team.TeamCode,
            Status = closure.Status,
            ClosureCertificateHash = closure.ClosureCertificateHash,
            ClosedAtUtc = closure.ClosedAtUtc,
            ClosedByName = closer?.FullName ?? "Academic Authority",
            ClosureRemarks = closure.ClosureRemarks,
            IsArchived = closure.IsArchived,
            AcademicRecordsGenerated = generatedRecords.Count,
            GeneratedStudentRecords = generatedRecords
        });
    }

    [HttpPost("teams/{teamId}/reopen")]
    [Authorize(Policy = ProjectHubPolicies.FacultyOrAbove)]
    public async Task<ActionResult<ProjectClosureResultDto>> ReopenClosedProject(Guid teamId, [FromBody] ReopenProjectRequest request)
    {
        if (_tenantContext.Role == UserRole.SuperAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "SuperAdmin cannot reopen closed departmental projects." });
        }

        var collegeId = _tenantContext.CollegeId!.Value;
        var callerId = _tenantContext.UserId!.Value;
        var role = _tenantContext.Role;

        var team = await _context.ProjectTeams
            .Include(t => t.ClosureRecord)
                .ThenInclude(c => c!.AcademicRecords)
            .FirstOrDefaultAsync(t => t.Id == teamId && t.CollegeId == collegeId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Project team not found." });

        if (role == UserRole.HOD)
        {
            var caller = await _context.Users.FirstOrDefaultAsync(u => u.Id == callerId);
            if (caller?.DepartmentId != team.DepartmentId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "HOD cannot reopen projects outside their academic department." });
            }
        }
        else if (role != UserRole.CollegeAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the Department HOD or College Admin can authorize reopening of a closed project." });
        }

        if (team.ClosureRecord == null || team.ClosureRecord.IsReopened)
        {
            return BadRequest(new { message = "Project is not currently closed." });
        }

        team.ClosureRecord.IsReopened = true;
        team.ClosureRecord.ReopenedAtUtc = DateTime.UtcNow;
        team.ClosureRecord.ReopenedByUserId = callerId;
        team.ClosureRecord.ReopeningReason = request.Reason.Trim();
        team.ClosureRecord.Status = ProjectClosureStatus.Reopened;
        team.ClosureRecord.IsArchived = false;

        // Reset team status to Completed for revision/re-defense
        team.Status = ProjectStatus.Completed;

        // Temporarily invalidate verified flag during active reopening
        foreach (var rec in team.ClosureRecord.AcademicRecords)
        {
            rec.IsVerified = false;
        }

        var exceptionLog = new ExceptionAuditLog
        {
            CollegeId = collegeId,
            DepartmentId = team.DepartmentId,
            ProjectTeamId = team.Id,
            RequestedByUserId = callerId,
            ApprovedByUserId = callerId,
            ApprovedAtUtc = DateTime.UtcNow,
            ActionType = ExceptionActionType.ReopenProject,
            Reason = $"Project Closure Reopened: {request.Reason.Trim()}"
        };
        await _context.ExceptionAuditLogs.AddAsync(exceptionLog);

        var auditLog = new PlatformAuditLog
        {
            ActorUserId = callerId,
            Action = "PROJECT_CLOSURE_REOPENED",
            TargetTenantId = collegeId,
            TargetEntity = "ProjectTeam",
            MetadataJson = JsonSerializer.Serialize(new
            {
                teamId = team.Id,
                teamCode = team.TeamCode,
                reason = request.Reason.Trim()
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(auditLog);

        await _context.SaveChangesAsync();

        var callerUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == callerId);

        return Ok(new ProjectClosureResultDto
        {
            ClosureRecordId = team.ClosureRecord.Id,
            ProjectTeamId = team.Id,
            TeamCode = team.TeamCode,
            Status = team.ClosureRecord.Status,
            ClosureCertificateHash = team.ClosureRecord.ClosureCertificateHash,
            ClosedAtUtc = team.ClosureRecord.ClosedAtUtc,
            ClosedByName = callerUser?.FullName ?? "Academic Authority",
            ClosureRemarks = team.ClosureRecord.ClosureRemarks,
            IsArchived = team.ClosureRecord.IsArchived,
            AcademicRecordsGenerated = team.ClosureRecord.AcademicRecords.Count
        });
    }
}
