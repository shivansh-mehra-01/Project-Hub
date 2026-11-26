using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
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
[Authorize(Policy = ProjectHubPolicies.CoordinatorOrHod)]
public class CoordinatorController : ControllerBase
{
    private readonly ProjectHubDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly IEmailOutboxService _emailOutbox;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<CoordinatorController> _logger;

    public CoordinatorController(
        ProjectHubDbContext context,
        ITenantContext tenantContext,
        IEmailOutboxService emailOutbox,
        IWebHostEnvironment environment,
        ILogger<CoordinatorController> logger)
    {
        _context = context;
        _tenantContext = tenantContext;
        _emailOutbox = emailOutbox;
        _environment = environment;
        _logger = logger;
    }

    private async Task<(Guid? DepartmentId, string? ErrorMessage)> ResolveCoordinatorDepartmentAsync()
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue || collegeId.Value == Guid.Empty)
        {
            return (null, "Active institutional tenant context required.");
        }

        var userId = _tenantContext.UserId;
        if (!userId.HasValue || userId.Value == Guid.Empty)
        {
            return (null, "Authenticated user identity required.");
        }

        if (_tenantContext.IsSuperAdmin)
        {
            var firstDeptId = _tenantContext.DepartmentId ?? await _context.Departments
                .Where(d => d.CollegeId == collegeId.Value && !d.IsDeleted)
                .Select(d => (Guid?)d.Id)
                .FirstOrDefaultAsync();
            return (firstDeptId, null);
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId.Value && u.CollegeId == collegeId.Value && !u.IsDeleted);

        if (user == null || !user.IsActive)
        {
            return (null, "User account is inactive or not found.");
        }

        // Must hold active coordinator capability or be HOD
        if (user.Role != UserRole.HOD && !user.IsProjectCoordinator)
        {
            return (null, "User does not hold active Project Coordinator authority.");
        }

        var deptId = _tenantContext.DepartmentId ?? user.DepartmentId;
        if (deptId.HasValue && deptId.Value != Guid.Empty)
        {
            var exists = await _context.Departments
                .AnyAsync(d => d.Id == deptId.Value && d.CollegeId == collegeId.Value && !d.IsDeleted);
            if (exists)
            {
                return (deptId.Value, null);
            }
        }

        if (user.Role == UserRole.HOD)
        {
            var hodDept = await _context.Departments
                .FirstOrDefaultAsync(d => d.CollegeId == collegeId.Value && d.HodUserId == userId.Value && !d.IsDeleted);
            if (hodDept != null)
            {
                return (hodDept.Id, null);
            }
        }

        return (null, "No authorized department assignment found for this Project Coordinator.");
    }

    [HttpPost("roster/student")]
    [HttpPost("students")]
    public async Task<ActionResult<SingleStudentProvisionedResponse>> AddSingleStudent([FromBody] AddSingleStudentRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var (coordDeptId, deptError) = await ResolveCoordinatorDepartmentAsync();
        if (deptError != null) return StatusCode(StatusCodes.Status403Forbidden, new { message = deptError });

        if (string.IsNullOrWhiteSpace(request.FullName) ||
            string.IsNullOrWhiteSpace(request.EnrollmentNumber) ||
            string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { message = "Full name, enrollment number (USN), and institutional email are required." });
        }

        if (request.DepartmentId != Guid.Empty && coordDeptId.HasValue && request.DepartmentId != coordDeptId.Value && !_tenantContext.IsSuperAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Project Coordinators are strictly restricted to provisioning students within their appointed department." });
        }

        var effectiveDeptId = coordDeptId ?? request.DepartmentId;
        if (effectiveDeptId == Guid.Empty)
        {
            return BadRequest(new { message = "Valid Department ID is required." });
        }

        var email = request.Email.Trim().ToLowerInvariant();
        if (email.Any(char.IsWhiteSpace) ||
            !System.Net.Mail.MailAddress.TryCreate(email, out var parsedMail) ||
            !parsedMail.Host.Contains('.') ||
            parsedMail.Host.EndsWith('.'))
        {
            return BadRequest(new { message = "A valid email address is required." });
        }

        var enrollmentNumber = request.EnrollmentNumber.Trim().ToUpperInvariant();

        // 1. Reject duplicate EnrollmentNumber or Email within the same CollegeId with 409 Conflict
        var isDuplicate = await _context.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.CollegeId == collegeId &&
                           (u.Email == email || u.EnrollmentOrEmployeeCode == enrollmentNumber) &&
                           !u.IsDeleted);

        if (isDuplicate)
        {
            return Conflict(new { message = "A student with this Email address or University Enrollment Number (USN) is already registered in this institution." });
        }

        // 3. Resolve Department & CourseProgram
        var department = await _context.Departments
            .Include(d => d.CourseProgram)
            .FirstOrDefaultAsync(d => d.Id == effectiveDeptId && d.CollegeId == collegeId && !d.IsDeleted);

        if (department == null)
        {
            return BadRequest(new { message = "Department not found in this institution." });
        }

        var courseProgramId = department.CourseProgramId ??
            await _context.CoursePrograms
                .Where(cp => cp.CollegeId == collegeId && !cp.IsDeleted)
                .Select(cp => cp.Id)
                .FirstOrDefaultAsync();

        if (courseProgramId == Guid.Empty)
        {
            var defaultProgram = new CourseProgram
            {
                CollegeId = collegeId,
                Name = "Bachelor of Technology",
                Code = "BTECH",
                TotalSemesters = 8,
                Level = AcademicProgramLevel.UG,
                IsActive = true
            };
            await _context.CoursePrograms.AddAsync(defaultProgram);
            await _context.SaveChangesAsync();
            courseProgramId = defaultProgram.Id;
        }

        // 4. Resolve Active Academic Session and SemesterTerm
        var activeSession = await _context.AcademicSessions
            .FirstOrDefaultAsync(s => s.CollegeId == collegeId && s.IsActive && !s.IsDeleted);
        var sessionId = activeSession?.Id;

        var semNumber = request.SemesterNumber is >= 1 and <= 12 ? request.SemesterNumber : 6;

        var semesterTerm = await _context.SemesterTerms.FirstOrDefaultAsync(t =>
            t.CollegeId == collegeId &&
            t.DepartmentId == effectiveDeptId &&
            (!sessionId.HasValue || t.AcademicSessionId == sessionId.Value) &&
            t.SemesterNumber == semNumber &&
            !t.IsDeleted);

        if (semesterTerm == null)
        {
            semesterTerm = new SemesterTerm
            {
                CollegeId = collegeId,
                DepartmentId = effectiveDeptId,
                AcademicSessionId = sessionId,
                SemesterNumber = semNumber,
                SemesterName = $"Semester {semNumber}",
                Parity = (semNumber % 2 == 1) ? SemesterParity.Odd : SemesterParity.Even,
                IsActive = true
            };
            await _context.SemesterTerms.AddAsync(semesterTerm);
            await _context.SaveChangesAsync();
        }

        // 5. Create Pre-activated Student UserAccount (no default password; activation via email/OTP)
        var rawActivationToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-").Replace("/", "_").TrimEnd('=');
        var activationTokenHash = Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawActivationToken)));

        var newUser = new UserAccount
        {
            CollegeId = collegeId,
            DepartmentId = effectiveDeptId,
            FullName = request.FullName.Trim(),
            Email = email,
            EnrollmentOrEmployeeCode = enrollmentNumber,
            Role = UserRole.Student,
            PasswordHash = null,
            IsActivated = false,
            IsActive = true,
            ActivationTokenHashed = activationTokenHash,
            ActivationTokenExpiresAtUtc = DateTime.UtcNow.AddHours(24)
        };

        await _context.Users.AddAsync(newUser);
        _emailOutbox.QueueAccountActivation(newUser.Email, newUser.FullName, rawActivationToken, newUser.ActivationTokenExpiresAtUtc ?? DateTime.UtcNow.AddHours(24), collegeId);
        await _context.SaveChangesAsync();

        // 6. Create StudentAcademicEnrollment Record
        var admissionBatch = string.IsNullOrWhiteSpace(request.AdmissionBatch) ? "2023-2027" : request.AdmissionBatch.Trim();

        var enrollment = new StudentAcademicEnrollment
        {
            CollegeId = collegeId,
            StudentUserId = newUser.Id,
            CourseProgramId = courseProgramId,
            DepartmentId = effectiveDeptId,
            CurrentSemesterTermId = semesterTerm.Id,
            AdmissionBatch = admissionBatch,
            AcademicStatus = AcademicStatus.Active
        };

        await _context.StudentAcademicEnrollments.AddAsync(enrollment);

        _logger.LogInformation("[STUDENT ONBOARDING] Dispatched activation link for newly provisioned student {Email} ({Usn}).",
            newUser.Email, newUser.EnrollmentOrEmployeeCode);

        // 8. Record ExceptionAuditLog
        var defaultTeam = await _context.ProjectTeams.FirstOrDefaultAsync(t => t.CollegeId == collegeId && t.DepartmentId == effectiveDeptId && !t.IsDeleted);
        var requesterId = _tenantContext.UserId ?? newUser.Id;

        var auditLog = new ExceptionAuditLog
        {
            CollegeId = collegeId,
            DepartmentId = effectiveDeptId,
            ProjectTeamId = defaultTeam?.Id,
            ActionType = ExceptionActionType.SingleStudentProvisioned,
            TargetUserId = newUser.Id,
            Reason = $"Single student onboarded and provisioned by Coordinator ({requesterId}) with 24-hr OTP dispatch.",
            PreviousValueJson = "{}",
            NewValueJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                studentUserId = newUser.Id,
                fullName = newUser.FullName,
                enrollmentNumber = newUser.EnrollmentOrEmployeeCode,
                email = newUser.Email,
                semesterNumber = semNumber,
                admissionBatch = admissionBatch
            }),
            RequestedByUserId = requesterId,
            ApprovedByUserId = requesterId,
            ApprovedAtUtc = DateTime.UtcNow
        };

        await _context.ExceptionAuditLogs.AddAsync(auditLog);
        await _context.SaveChangesAsync();

        string? devOtp = null;

        return StatusCode(StatusCodes.Status201Created, new SingleStudentProvisionedResponse
        {
            StudentUserId = newUser.Id,
            FullName = newUser.FullName,
            EnrollmentNumber = newUser.EnrollmentOrEmployeeCode,
            Email = newUser.Email,
            Message = "Student account provisioned successfully. An activation link has been dispatched to their institutional email.",
            DevOtp = devOtp
        });
    }

    [HttpPost("roster/import")]
    [HttpPost("import-roster")]
    public async Task<ActionResult<RosterImportResultDto>> ImportRoster([FromBody] RosterImportRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var (coordDeptId, deptError) = await ResolveCoordinatorDepartmentAsync();
        if (deptError != null) return StatusCode(StatusCodes.Status403Forbidden, new { message = deptError });

        if (request.DepartmentId != Guid.Empty && coordDeptId.HasValue && request.DepartmentId != coordDeptId.Value && !_tenantContext.IsSuperAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Project Coordinators are strictly restricted to importing rosters into their appointed department." });
        }

        var targetDeptId = coordDeptId ?? request.DepartmentId;
        if (targetDeptId == Guid.Empty)
        {
            return BadRequest(new { message = "Valid Department ID is required." });
        }

        var department = await _context.Departments
            .FirstOrDefaultAsync(d => d.Id == targetDeptId && d.CollegeId == collegeId && !d.IsDeleted);

        if (department == null)
        {
            return BadRequest(new { message = "Department not found in this institution." });
        }

        var inserted = 0;
        var updated = 0;
        var warnings = new List<string>();
        var activationDispatches = new List<(string Email, string FullName, string RawToken)>();

        foreach (var row in request.Rows)
        {
            if (string.IsNullOrWhiteSpace(row.Email) || string.IsNullOrWhiteSpace(row.EnrollmentOrEmployeeCode))
            {
                warnings.Add($"Skipping invalid row with missing Email or Code: {row.FullName}");
                continue;
            }

            var email = row.Email.Trim().ToLowerInvariant();
            var code = row.EnrollmentOrEmployeeCode.Trim().ToUpperInvariant();

            // Role Security Rule: Roster import can only provision or update Student accounts.
            if (row.Role != UserRole.Student && (int)row.Role != 0)
            {
                warnings.Add($"Row '{row.FullName}' ({email}): Role override to '{row.Role}' rejected. Coordinator roster import only provisions Student accounts.");
            }

            var existing = await _context.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => (u.Email == email || u.EnrollmentOrEmployeeCode == code) &&
                                          u.CollegeId == collegeId &&
                                          !u.IsDeleted);

            if (existing != null)
            {
                // CRITICAL PRIVILEGE PROTECTION:
                // An existing non-student account (HOD, CollegeAdmin, SuperAdmin, Faculty) MUST NEVER be modified by roster import!
                if (existing.Role != UserRole.Student)
                {
                    warnings.Add($"Skipping existing account '{existing.Email}' (Role: {existing.Role}). Coordinator roster import is strictly prohibited from modifying institutional staff or administrator accounts.");
                    continue;
                }

                // Department boundary protection:
                if (existing.DepartmentId.HasValue && existing.DepartmentId.Value != targetDeptId && !_tenantContext.IsSuperAdmin)
                {
                    warnings.Add($"Skipping existing student '{existing.Email}': Student is currently registered in another department.");
                    continue;
                }

                // Update permitted student profile attributes only (NEVER touch Role, PasswordHash, DelegatedResponsibility, or IsProjectCoordinator)
                existing.FullName = row.FullName.Trim();
                existing.EnrollmentOrEmployeeCode = code;
                existing.DepartmentId = targetDeptId;
                existing.SkillsCsv = row.SkillsCsv;
                existing.GitHubHandle = row.GitHubHandle;
                updated++;
            }
            else
            {
                var rawActivationToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
                    .Replace("+", "-").Replace("/", "_").TrimEnd('=');
                var activationTokenHash = Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawActivationToken)));

                var newUser = new UserAccount
                {
                    CollegeId = collegeId,
                    DepartmentId = targetDeptId,
                    FullName = row.FullName.Trim(),
                    Email = email,
                    EnrollmentOrEmployeeCode = code,
                    Role = UserRole.Student, // STRICT: ALWAYS UserRole.Student
                    PasswordHash = null,
                    IsActivated = false,
                    IsActive = true,
                    ActivationTokenHashed = activationTokenHash,
                    ActivationTokenExpiresAtUtc = DateTime.UtcNow.AddHours(24),
                    SkillsCsv = row.SkillsCsv,
                    GitHubHandle = row.GitHubHandle
                };
                await _context.Users.AddAsync(newUser);
                activationDispatches.Add((newUser.Email, newUser.FullName, rawActivationToken));
                inserted++;
            }
        }

        var expiresAtUtc = DateTime.UtcNow.AddHours(24);
        foreach (var dispatch in activationDispatches)
        {
            _emailOutbox.QueueAccountActivation(dispatch.Email, dispatch.FullName, dispatch.RawToken, expiresAtUtc, collegeId);
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
        var collegeId = _tenantContext.CollegeId!.Value;
        var (coordDeptId, deptError) = await ResolveCoordinatorDepartmentAsync();
        if (deptError != null) return StatusCode(StatusCodes.Status403Forbidden, new { message = deptError });

        var query = _context.ProjectTeams
            .Include(t => t.GuideUser)
            .Include(t => t.Members)
            .Where(t => t.CollegeId == collegeId && !t.IsDeleted);

        if (!_tenantContext.IsSuperAdmin && coordDeptId.HasValue)
        {
            query = query.Where(t => t.DepartmentId == coordDeptId.Value);
        }

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
        var collegeId = _tenantContext.CollegeId!.Value;
        var (coordDeptId, deptError) = await ResolveCoordinatorDepartmentAsync();
        if (deptError != null) return StatusCode(StatusCodes.Status403Forbidden, new { message = deptError });

        if (request.GuideUserId == Guid.Empty)
        {
            return BadRequest(new { message = "Selected user is not an eligible faculty mentor." });
        }

        // Phase 5.2 Concurrency Hardening: Wrap allocation in explicit transaction and acquire pessimistic row lock
        await using var tx = await _context.Database.BeginTransactionAsync();

        if (_context.Database.IsNpgsql())
        {
            await _context.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT \"Id\" FROM \"UserAccounts\" WHERE \"Id\" = {request.GuideUserId} FOR UPDATE;");
        }

        var team = await _context.ProjectTeams
            .Include(t => t.GuideUser)
            .FirstOrDefaultAsync(t => t.Id == teamId && t.CollegeId == collegeId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Team not found." });

        if (!_tenantContext.IsSuperAdmin && coordDeptId.HasValue && team.DepartmentId != coordDeptId.Value)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Coordinators can only assign guides to teams within their appointed department." });
        }

        var guide = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.GuideUserId && u.CollegeId == collegeId && !u.IsDeleted);

        if (guide == null || (guide.Role != UserRole.Faculty && guide.Role != UserRole.HOD))
        {
            return BadRequest(new { message = "Selected user is not an eligible faculty mentor." });
        }

        if (!_tenantContext.IsSuperAdmin && coordDeptId.HasValue && guide.DepartmentId != coordDeptId.Value)
        {
            return BadRequest(new { message = "Selected faculty mentor belongs to another department." });
        }

        var currentLoad = await _context.ProjectTeams
            .CountAsync(t => t.GuideUserId == guide.Id && t.CollegeId == collegeId && !t.IsDeleted && t.Status != ProjectStatus.Archived && t.Id != team.Id);

        if (currentLoad >= guide.MaxMentorTeams)
        {
            return BadRequest(new { message = $"Faculty member '{guide.FullName}' has reached their maximum mentorship capacity of {guide.MaxMentorTeams} teams." });
        }

        if (request.Reason != null && request.Reason.Trim().Length > 500)
        {
            return BadRequest(new { message = "Allocation reason cannot exceed 500 characters." });
        }

        var previousGuideId = team.GuideUserId;
        var previousGuideName = team.GuideUser?.FullName;
        var reason = !string.IsNullOrWhiteSpace(request.Reason)
            ? request.Reason.Trim()
            : (previousGuideId.HasValue ? "Guide reassigned by Coordinator" : "Guide allocated by Coordinator");

        team.GuideUserId = guide.Id;
        team.GuidePreferenceStatus = GuidePreferenceStatus.Allocated;
        team.GuideAllocatedAtUtc = DateTime.UtcNow;
        team.GuideAllocatedByUserId = _tenantContext.UserId;
        team.GuideAllocationRemarks = reason;
        if (team.Status == ProjectStatus.Draft)
        {
            team.Status = ProjectStatus.PendingGuide;
        }

        var excLog = new ExceptionAuditLog
        {
            CollegeId = collegeId,
            DepartmentId = team.DepartmentId,
            ProjectTeamId = team.Id,
            ActionType = ExceptionActionType.ReassignGuide,
            TargetUserId = guide.Id,
            Reason = reason,
            PreviousValueJson = System.Text.Json.JsonSerializer.Serialize(new { guideUserId = previousGuideId, guideName = previousGuideName }),
            NewValueJson = System.Text.Json.JsonSerializer.Serialize(new { guideUserId = guide.Id, guideName = guide.FullName }),
            RequestedByUserId = _tenantContext.UserId ?? guide.Id,
            ApprovedByUserId = _tenantContext.UserId ?? guide.Id,
            ApprovedAtUtc = DateTime.UtcNow
        };
        await _context.ExceptionAuditLogs.AddAsync(excLog);

        var audit = new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            Action = previousGuideId.HasValue ? "COORDINATOR_GUIDE_REASSIGNED" : "COORDINATOR_GUIDE_ALLOCATED",
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
        await tx.CommitAsync();

        return Ok(new { success = true, teamId = team.Id, guideId = guide.Id, guideName = guide.FullName });
    }

    [HttpPost("teams/{teamId}/reject-guide-request")]
    public async Task<IActionResult> RejectGuideRequest(Guid teamId, [FromBody] RejectGuidePreferenceRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var (coordDeptId, deptError) = await ResolveCoordinatorDepartmentAsync();
        if (deptError != null) return StatusCode(StatusCodes.Status403Forbidden, new { message = deptError });

        var team = await _context.ProjectTeams
            .Include(t => t.PreferredGuideUser)
            .FirstOrDefaultAsync(t => t.Id == teamId && t.CollegeId == collegeId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Team not found." });

        if (!_tenantContext.IsSuperAdmin && coordDeptId.HasValue && team.DepartmentId != coordDeptId.Value)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Coordinators can only manage teams within their appointed department." });
        }

        if (team.GuideUserId.HasValue)
        {
            return BadRequest(new { message = "An official faculty guide has already been allocated to this team. Guide changes must be processed via official guide reassignment." });
        }

        if (string.IsNullOrWhiteSpace(request?.Reason) || request.Reason.Trim().Length < 5)
        {
            return BadRequest(new { message = "A mandatory rejection or return reason (minimum 5 characters) is required." });
        }

        if (request.Reason.Trim().Length > 500)
        {
            return BadRequest(new { message = "Rejection reason cannot exceed 500 characters." });
        }

        if (team.GuidePreferenceStatus != GuidePreferenceStatus.Requested && !team.PreferredGuideUserId.HasValue)
        {
            return BadRequest(new { message = "This team does not currently have a pending guide preference request." });
        }

        var reason = request.Reason.Trim();
        team.GuidePreferenceStatus = GuidePreferenceStatus.Rejected;
        team.GuideAllocationRemarks = reason;
        team.GuideUserId = null; // Explicitly ensure no official allocation

        var caller = await _context.Users.FindAsync(_tenantContext.UserId);
        var excLog = new ExceptionAuditLog
        {
            CollegeId = collegeId,
            DepartmentId = team.DepartmentId,
            ProjectTeamId = team.Id,
            ActionType = ExceptionActionType.RejectProposal,
            TargetUserId = team.PreferredGuideUserId,
            Reason = $"[GUIDE_REQUEST_REJECTED] {reason}",
            PreviousValueJson = System.Text.Json.JsonSerializer.Serialize(new { preferredGuideId = team.PreferredGuideUserId, preferredGuideName = team.PreferredGuideUser?.FullName }),
            NewValueJson = System.Text.Json.JsonSerializer.Serialize(new { guidePreferenceStatus = GuidePreferenceStatus.Rejected.ToString(), remarks = reason }),
            RequestedByUserId = _tenantContext.UserId ?? Guid.Empty,
            ApprovedByUserId = _tenantContext.UserId ?? Guid.Empty,
            ApprovedAtUtc = DateTime.UtcNow
        };
        await _context.ExceptionAuditLogs.AddAsync(excLog);

        var audit = new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            ActorEmail = caller?.Email ?? string.Empty,
            Action = "COORDINATOR_GUIDE_REQUEST_REJECTED",
            TargetTenantId = collegeId,
            TargetEntity = "ProjectTeam",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                teamId = team.Id,
                teamCode = team.TeamCode,
                preferredGuideId = team.PreferredGuideUserId,
                reason
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(audit);

        await _context.SaveChangesAsync();
        return Ok(new { success = true, teamId = team.Id, status = GuidePreferenceStatus.Rejected.ToString(), reason });
    }

    [HttpPost("proposals/{teamId}/verify")]
    [HttpPost("proposals/{teamId}/endorse")]
    public async Task<IActionResult> VerifyProposal(Guid teamId, [FromBody] SubmitProposalRequest? request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var (coordDeptId, deptError) = await ResolveCoordinatorDepartmentAsync();
        if (deptError != null) return StatusCode(StatusCodes.Status403Forbidden, new { message = deptError });

        var team = await _context.ProjectTeams
            .FirstOrDefaultAsync(t => t.Id == teamId && t.CollegeId == collegeId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Team proposal not found." });

        if (!_tenantContext.IsSuperAdmin && coordDeptId.HasValue && team.DepartmentId != coordDeptId.Value)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Project Coordinators are restricted to verifying proposals within their appointed department." });
        }

        if (team.Status != ProjectStatus.PendingCoordinator)
        {
            return BadRequest(new { message = $"Only proposals in PendingCoordinator status can be verified by the Coordinator. Current status is {team.Status}." });
        }

        var prevStatus = team.Status;
        team.Status = ProjectStatus.PendingHOD;

        var remarks = request?.Remarks ?? "Verified by Department Project Coordinator";
        var audit = new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            Action = "COORDINATOR_PROPOSAL_VERIFIED",
            TargetTenantId = collegeId,
            TargetEntity = "ProjectTeam",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                teamId = team.Id,
                teamCode = team.TeamCode,
                previousStatus = prevStatus.ToString(),
                newStatus = team.Status.ToString(),
                remarks
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(audit);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, teamId = team.Id, status = team.Status.ToString(), message = "Proposal verified and forwarded to HOD for final sanction." });
    }

    [HttpPost("proposals/{teamId}/return")]
    public async Task<IActionResult> ReturnProposal(Guid teamId, [FromBody] ReturnProposalRequest? request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var (coordDeptId, deptError) = await ResolveCoordinatorDepartmentAsync();
        if (deptError != null) return StatusCode(StatusCodes.Status403Forbidden, new { message = deptError });

        var team = await _context.ProjectTeams
            .FirstOrDefaultAsync(t => t.Id == teamId && t.CollegeId == collegeId && !t.IsDeleted);

        if (team == null) return NotFound(new { message = "Team proposal not found." });

        if (!_tenantContext.IsSuperAdmin && coordDeptId.HasValue && team.DepartmentId != coordDeptId.Value)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Project Coordinators are restricted to returning proposals within their appointed department." });
        }

        if (team.Status != ProjectStatus.PendingCoordinator)
        {
            return BadRequest(new { message = $"Only proposals in PendingCoordinator status can be returned. Current status is {team.Status}." });
        }

        var remarks = request?.Remarks ?? request?.Reason ?? "Returned for revision by Project Coordinator";
        var prevStatus = team.Status;
        team.Status = ProjectStatus.Draft;
        team.IsRosterLocked = false;

        var excLog = new ExceptionAuditLog
        {
            CollegeId = collegeId,
            DepartmentId = team.DepartmentId,
            ProjectTeamId = team.Id,
            ActionType = ExceptionActionType.ReturnProposal,
            Reason = remarks.Trim(),
            PreviousValueJson = System.Text.Json.JsonSerializer.Serialize(new { status = prevStatus.ToString() }),
            NewValueJson = System.Text.Json.JsonSerializer.Serialize(new { status = ProjectStatus.Draft.ToString(), isRosterLocked = false }),
            RequestedByUserId = _tenantContext.UserId ?? team.GuideUserId ?? Guid.Empty,
            ApprovedByUserId = _tenantContext.UserId,
            ApprovedAtUtc = DateTime.UtcNow
        };
        await _context.ExceptionAuditLogs.AddAsync(excLog);

        var audit = new PlatformAuditLog
        {
            ActorUserId = _tenantContext.UserId,
            Action = "COORDINATOR_PROPOSAL_RETURNED",
            TargetTenantId = collegeId,
            TargetEntity = "ProjectTeam",
            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                teamId = team.Id,
                teamCode = team.TeamCode,
                previousStatus = prevStatus.ToString(),
                newStatus = team.Status.ToString(),
                remarks = remarks.Trim()
            }),
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.PlatformAuditLogs.AddAsync(audit);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, teamId = team.Id, status = team.Status.ToString(), message = "Proposal returned to student for technical revision." });
    }

    [HttpGet("panels")]
    public async Task<ActionResult<List<VivaPanelDto>>> GetPanels()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var (coordDeptId, deptError) = await ResolveCoordinatorDepartmentAsync();
        if (deptError != null) return StatusCode(StatusCodes.Status403Forbidden, new { message = deptError });

        var query = _context.VivaPanels
            .Include(p => p.Evaluators)
                .ThenInclude(e => e.EvaluatorUser)
            .Where(p => p.CollegeId == collegeId && !p.IsDeleted);

        if (!_tenantContext.IsSuperAdmin && coordDeptId.HasValue)
        {
            query = query.Where(p => p.DepartmentId == coordDeptId.Value);
        }

        var panels = await query
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
        var (coordDeptId, deptError) = await ResolveCoordinatorDepartmentAsync();
        if (deptError != null) return StatusCode(StatusCodes.Status403Forbidden, new { message = deptError });

        if (!_tenantContext.IsSuperAdmin && coordDeptId.HasValue && request.DepartmentId != coordDeptId.Value)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Coordinators can only schedule viva panels for their appointed department." });
        }

        if (string.IsNullOrWhiteSpace(request.PanelName))
        {
            return BadRequest(new { message = "Panel name is required." });
        }

        var evaluators = await _context.Users
            .Where(u => request.EvaluatorUserIds.Contains(u.Id) && u.CollegeId == collegeId && !u.IsDeleted)
            .ToListAsync();

        if (evaluators.Count != request.EvaluatorUserIds.Distinct().Count())
        {
            return BadRequest(new { message = "One or more specified evaluators are invalid or belong to another institution." });
        }

        var nonFaculty = evaluators.FirstOrDefault(u => u.Role != UserRole.Faculty && u.Role != UserRole.HOD);
        if (nonFaculty != null)
        {
            return BadRequest(new { message = $"User '{nonFaculty.FullName}' has role '{nonFaculty.Role}' and cannot serve as an academic viva evaluator." });
        }

        var panel = new VivaPanel
        {
            CollegeId = collegeId,
            DepartmentId = request.DepartmentId,
            AcademicTrackId = request.AcademicTrackId,
            PanelName = request.PanelName.Trim(),
            ScheduledAtUtc = request.ScheduledAtUtc,
            RoomOrLink = request.RoomOrLink.Trim()
        };

        foreach (var evaluator in evaluators)
        {
            panel.Evaluators.Add(new VivaPanelEvaluator
            {
                CollegeId = collegeId,
                EvaluatorUserId = evaluator.Id
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
            EvaluatorNames = evaluators.Select(e => e.FullName).ToList()
        });
    }

    [HttpPost("exceptions")]
    public async Task<IActionResult> RequestException([FromBody] CreateExceptionRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var (coordDeptId, deptError) = await ResolveCoordinatorDepartmentAsync();
        if (deptError != null) return StatusCode(StatusCodes.Status403Forbidden, new { message = deptError });

        var requestedBy = _tenantContext.UserId!.Value;

        if (!_tenantContext.IsSuperAdmin && coordDeptId.HasValue && request.DepartmentId != coordDeptId.Value)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Coordinators can only submit exception requests for their appointed department." });
        }

        var team = await _context.ProjectTeams
            .FirstOrDefaultAsync(t => t.Id == request.ProjectTeamId && t.CollegeId == collegeId && !t.IsDeleted);

        if (team == null)
        {
            return NotFound(new { message = "Project team not found." });
        }

        if (!_tenantContext.IsSuperAdmin && coordDeptId.HasValue && team.DepartmentId != coordDeptId.Value)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Cannot request exceptions for a project team in another department." });
        }

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

    [HttpGet("export-marksheet")]
    public async Task<IActionResult> ExportMarksheet([FromQuery] Guid? trackId, CancellationToken cancellationToken)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var (coordDeptId, deptError) = await ResolveCoordinatorDepartmentAsync();
        if (deptError != null) return StatusCode(StatusCodes.Status403Forbidden, new { message = deptError });

        var targetDeptId = coordDeptId;

        var dept = await _context.Departments
            .Include(d => d.College)
            .FirstOrDefaultAsync(d => (targetDeptId == null || d.Id == targetDeptId.Value) && d.CollegeId == collegeId && !d.IsDeleted, cancellationToken);

        var collegeName = dept?.College?.Name ?? "Sagar Institute of Science and Technology (SISTec Bhopal)";
        var deptName = dept?.Name ?? "Computer Science & Engineering";
        var deptCode = dept?.Code ?? "CSE";

        var query = _context.ProjectTeams
            .Include(t => t.GuideUser)
            .Include(t => t.AcademicTrack)
            .Include(t => t.Members)
                .ThenInclude(m => m.User)
            .Include(t => t.Evaluations)
                .ThenInclude(e => e.IndividualScores)
            .Where(t => t.CollegeId == collegeId && !t.IsDeleted);

        if (!_tenantContext.IsSuperAdmin && targetDeptId.HasValue)
        {
            query = query.Where(t => t.DepartmentId == targetDeptId.Value);
        }

        if (trackId.HasValue) query = query.Where(t => t.AcademicTrackId == trackId.Value);

        var teams = await query.OrderBy(t => t.TeamCode).ToListAsync(cancellationToken);

        var csv = new System.Text.StringBuilder();
        csv.AppendLine("RAJIV GANDHI PROUDYOGIKI VISHWAVIDYALAYA (RGPV) - TABULATION REGISTER");
        csv.AppendLine($"Institution: {collegeName} (Code: INST-MP-0176)");
        csv.AppendLine($"Department: {deptName} | Scheme: RGPV-AICTE-FLEX / CBCS");
        csv.AppendLine("Course: Bachelor of Technology (B.Tech) - Semester 6 | Academic Year: 2025-2026");
        csv.AppendLine("Subject: CS-606 Minor Project [Credits: 4 | 60% Continuous Assessment / 40% External Viva]");
        csv.AppendLine();
        csv.AppendLine("Enrollment_USN,Student_Name,Branch,Semester,Subject_Code,Team_Code,Project_Title,Guide_Name,Shared_Rubric_60,Individual_Score_40,Total_Marks_100,Attainment_Status");

        if (teams.Count > 0 && teams.Any(t => t.Members.Any(m => !m.IsDeleted && m.User != null)))
        {
            foreach (var team in teams)
            {
                var eval = team.Evaluations.OrderByDescending(e => e.LockedAtUtc).FirstOrDefault();
                var shared60 = eval != null ? (int)Math.Round(eval.SharedTotalScore * 0.60m) : 0;
                var guideName = team.GuideUser?.FullName ?? "Unassigned";

                foreach (var member in team.Members.Where(m => !m.IsDeleted && m.User != null))
                {
                    var user = member.User!;
                    var ind = eval?.IndividualScores.FirstOrDefault(s => s.StudentUserId == user.Id);
                    var ind40 = ind != null ? (int)Math.Round(ind.IndividualTotalScore * 0.40m) : 0;
                    var total = eval != null && ind != null ? (int)Math.Round(ind.FinalComputedStudentMark) : (shared60 + ind40);
                    var status = total >= 70 ? "Target Met" : total >= 50 ? "Pass" : (eval != null ? "Remedial" : "Pending Evaluation");

                    csv.AppendLine($"{user.EnrollmentOrEmployeeCode},{user.FullName},{deptCode},6,CS-606,{team.TeamCode},\"{team.Title}\",{guideName},{shared60},{ind40},{total},{status}");
                }
            }
        }

        var csvBytes = System.Text.Encoding.UTF8.GetBytes(csv.ToString());
        return File(csvBytes, "text/csv", $"RGPV_Project_Marks_{deptCode}.csv");
    }
}
