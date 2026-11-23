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

namespace ProjectHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = ProjectHubPolicies.SuperAdminOnly)]
public class PlatformController : ControllerBase
{
    private readonly ProjectHubDbContext _context;
    private readonly IEmailSender _emailSender;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<PlatformController> _logger;

    public PlatformController(
        ProjectHubDbContext context,
        IEmailSender emailSender,
        IWebHostEnvironment environment,
        ILogger<PlatformController> logger)
    {
        _context = context;
        _emailSender = emailSender;
        _environment = environment;
        _logger = logger;
    }

    [HttpGet("tenants")]
    public async Task<ActionResult<List<CollegeTenantDto>>> GetTenants()
    {
        var tenants = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .Where(t => !t.IsDeleted)
            .OrderBy(t => t.Name)
            .Select(t => new CollegeTenantDto
            {
                Id = t.Id,
                Name = t.Name,
                TenantCode = t.TenantCode,
                SsoDomain = t.SsoDomain,
                LicenseTier = t.LicenseTier,
                MaxStudentSeats = t.MaxStudentSeats,
                StorageQuotaGb = t.StorageQuotaGb,
                IsActive = t.IsActive,
                EnforceStrictSso = t.EnforceStrictSso,
                CrestUrl = t.CrestUrl,
                SubscriptionExpiresAtUtc = t.SubscriptionExpiresAtUtc,
                DepartmentCount = t.Departments.Count(d => !d.IsDeleted),
                StudentCount = t.Users.Count(u => u.Role == Domain.Enums.UserRole.Student && !u.IsDeleted),
                PrincipalEmail = t.Users.Where(u => u.Role == Domain.Enums.UserRole.CollegeAdmin && !u.IsDeleted).Select(u => u.Email).FirstOrDefault(),
                AdminEmails = t.Users.Where(u => u.Role == Domain.Enums.UserRole.CollegeAdmin && !u.IsDeleted).Select(u => u.Email).ToList(),
                AffiliatingUniversity = t.AffiliatingUniversity ?? "RGPV"
            })
            .ToListAsync();

        return Ok(tenants);
    }

    [HttpPost("tenants")]
    public async Task<ActionResult<CreateTenantResponse>> CreateTenant([FromBody] CreateTenantRequest request)
    {
        // 1. Auto-uppercase Institutional Code and sanitize SSO Domain
        var code = request.TenantCode.Trim().ToUpperInvariant();
        var rawDomain = request.SsoDomain.Trim().ToLowerInvariant();
        var domain = rawDomain
            .Replace("https://", "")
            .Replace("http://", "")
            .Replace("www.", "")
            .Replace("@", "")
            .Trim('/')
            .Split('/')[0];

        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(domain))
        {
            return BadRequest(new { message = "Valid Institutional Code and SSO Email Domain are required." });
        }

        var exists = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .AnyAsync(t => (t.TenantCode == code || t.SsoDomain == domain) && !t.IsDeleted);

        if (exists)
        {
            return Conflict(new { message = "A college tenant with the same code or SSO domain already exists." });
        }

        // 2. Resolve Principal Full Name and Email
        var principalName = !string.IsNullOrWhiteSpace(request.PrincipalName)
            ? request.PrincipalName.Trim()
            : "College Principal";

        var principalEmail = !string.IsNullOrWhiteSpace(request.PrincipalEmail)
            ? request.PrincipalEmail.Trim().ToLowerInvariant()
            : $"principal@{domain}";

        var emailExists = await _context.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Email == principalEmail && !u.IsDeleted);

        if (emailExists)
        {
            return Conflict(new { message = $"A user account with email '{principalEmail}' already exists in the system." });
        }

        // 3. Resolve Affiliating University Catalog
        var affiliatingUniversity = !string.IsNullOrWhiteSpace(request.AffiliatingUniversity)
            ? request.AffiliatingUniversity.Trim()
            : "RGPV";

        var tenant = new CollegeTenant
        {
            Name = request.Name.Trim(),
            TenantCode = code,
            SsoDomain = domain,
            LicenseTier = request.LicenseTier,
            MaxStudentSeats = request.MaxStudentSeats,
            StorageQuotaGb = request.StorageQuotaGb,
            EnforceStrictSso = request.EnforceStrictSso,
            CrestUrl = request.CrestUrl,
            SubscriptionExpiresAtUtc = request.SubscriptionExpiresAtUtc,
            AffiliatingUniversity = affiliatingUniversity,
            IsActive = true
        };

        await _context.CollegeTenants.AddAsync(tenant);

        // 4. Link Syllabus Catalog & Academic Architecture for the new tenant
        var isRgpv = affiliatingUniversity.Contains("RGPV", StringComparison.OrdinalIgnoreCase);
        var schemeCode = isRgpv ? "RGPV-AICTE-FLEX" : "AUTONOMOUS-CBCS";

        var courseProgram = new CourseProgram
        {
            CollegeId = tenant.Id,
            Name = "Bachelor of Technology",
            Code = "BTECH",
            Level = AcademicProgramLevel.UG,
            TotalSemesters = 8,
            IsActive = true
        };
        await _context.CoursePrograms.AddAsync(courseProgram);

        var curriculumScheme = new CurriculumScheme
        {
            CollegeId = tenant.Id,
            CourseProgramId = courseProgram.Id,
            SchemeCode = schemeCode,
            SchemeVersion = DateTime.UtcNow.Year.ToString(),
            EffectiveAdmissionYear = DateTime.UtcNow.Year,
            IsActive = true
        };
        await _context.CurriculumSchemes.AddAsync(curriculumScheme);

        var currentYear = DateTime.UtcNow.Year;
        var academicSession = new AcademicSession
        {
            CollegeId = tenant.Id,
            Label = $"{currentYear}–{currentYear + 1}",
            StartDate = new DateTime(currentYear, 7, 1, 0, 0, 0, DateTimeKind.Utc),
            EndDate = new DateTime(currentYear + 1, 6, 30, 23, 59, 59, DateTimeKind.Utc),
            ExamCutoffDateUtc = new DateTime(currentYear + 1, 5, 31, 23, 59, 59, DateTimeKind.Utc),
            AllowInterdisciplinaryTeams = true,
            IsActive = true
        };
        await _context.AcademicSessions.AddAsync(academicSession);

        // 5. Provision Principal Account with 24-hr Activation OTP
        var defaultPasswordHash = Infrastructure.Security.PasswordHelper.HashPassword("Pass@1234");
        var otpNumber = RandomNumberGenerator.GetInt32(100000, 1000000);
        var otp = otpNumber.ToString("D6");

        var principalUser = new UserAccount
        {
            CollegeId = tenant.Id,
            FullName = principalName,
            Email = principalEmail,
            EnrollmentOrEmployeeCode = $"EMP-{code}-001",
            Role = Domain.Enums.UserRole.CollegeAdmin,
            PasswordHash = defaultPasswordHash,
            PasswordResetOtpHashed = Infrastructure.Security.PasswordHelper.HashPassword(otp),
            PasswordResetOtpExpiresAtUtc = DateTime.UtcNow.AddHours(24),
            IsActivated = true,
            IsActive = true
        };

        await _context.Users.AddAsync(principalUser);

        await _context.SaveChangesAsync();

        // 6. Dispatch Activation OTP via IEmailSender
        await _emailSender.SendPasswordResetOtpAsync(principalUser.Email, principalUser.FullName, otp);

        _logger.LogInformation("[TENANT ONBOARDING] Provisioned College Tenant '{Name}' ({Code}) with Principal '{PrincipalName}' <{PrincipalEmail}>, linked to '{University}' catalog. Dispatched OTP: {Otp}",
            tenant.Name, code, principalName, principalEmail, affiliatingUniversity, otp);

        var tenantDto = new CollegeTenantDto
        {
            Id = tenant.Id,
            Name = tenant.Name,
            TenantCode = tenant.TenantCode,
            SsoDomain = tenant.SsoDomain,
            LicenseTier = tenant.LicenseTier,
            MaxStudentSeats = tenant.MaxStudentSeats,
            StorageQuotaGb = tenant.StorageQuotaGb,
            IsActive = tenant.IsActive,
            EnforceStrictSso = tenant.EnforceStrictSso,
            CrestUrl = tenant.CrestUrl,
            SubscriptionExpiresAtUtc = tenant.SubscriptionExpiresAtUtc,
            DepartmentCount = 0,
            StudentCount = 0,
            PrincipalEmail = principalEmail,
            AdminEmails = new List<string> { principalEmail },
            AffiliatingUniversity = affiliatingUniversity
        };

        string? devOtp = _environment.IsDevelopment() ? otp : null;

        return StatusCode(StatusCodes.Status201Created, new CreateTenantResponse
        {
            Tenant = tenantDto,
            AdminEmail = principalEmail,
            DevOtp = devOtp,
            Message = $"College tenant '{tenant.Name}' provisioned successfully linked to {affiliatingUniversity} catalog. Temporary credentials and 24-hr activation OTP dispatched to {principalEmail}."
        });
    }

    [HttpPost("tenants/{tenantId}/provision-admin")]
    public async Task<ActionResult<ProvisionAdminResponse>> ProvisionAdmin(Guid tenantId, [FromBody] ProvisionAdminRequest? request)
    {
        var tenant = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .Include(t => t.Users)
            .FirstOrDefaultAsync(t => t.Id == tenantId && !t.IsDeleted);

        if (tenant == null)
        {
            return NotFound(new { message = "College tenant not found." });
        }

        var principalEmail = !string.IsNullOrWhiteSpace(request?.Email)
            ? request.Email.Trim().ToLowerInvariant()
            : $"principal@{tenant.SsoDomain.Trim().ToLowerInvariant()}";

        var principalName = !string.IsNullOrWhiteSpace(request?.FullName)
            ? request.FullName.Trim()
            : "College Principal";

        var defaultPasswordHash = Infrastructure.Security.PasswordHelper.HashPassword("Pass@1234");

        var existingUser = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == principalEmail && !u.IsDeleted);

        if (existingUser != null)
        {
            existingUser.Role = Domain.Enums.UserRole.CollegeAdmin;
            existingUser.PasswordHash = defaultPasswordHash;
            existingUser.IsActivated = true;
            existingUser.IsActive = true;
            await _context.SaveChangesAsync();

            return Ok(new ProvisionAdminResponse
            {
                Success = true,
                AdminEmail = existingUser.Email,
                Message = $"Principal account '{existingUser.Email}' updated with CollegeAdmin role and active status."
            });
        }

        var newAdmin = new UserAccount
        {
            CollegeId = tenant.Id,
            FullName = principalName,
            Email = principalEmail,
            EnrollmentOrEmployeeCode = $"EMP-{tenant.TenantCode}-001",
            Role = Domain.Enums.UserRole.CollegeAdmin,
            PasswordHash = defaultPasswordHash,
            IsActivated = true,
            IsActive = true
        };

        await _context.Users.AddAsync(newAdmin);
        await _context.SaveChangesAsync();

        return Ok(new ProvisionAdminResponse
        {
            Success = true,
            AdminEmail = newAdmin.Email,
            Message = $"Principal account '{newAdmin.Email}' provisioned successfully."
        });
    }

    [HttpPut("tenants/{id}")]
    public async Task<IActionResult> UpdateTenant(Guid id, [FromBody] UpdateTenantRequest request)
    {
        var tenant = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (tenant == null) return NotFound(new { message = "Tenant not found." });

        if (request.Name != null) tenant.Name = request.Name.Trim();
        if (request.LicenseTier.HasValue) tenant.LicenseTier = request.LicenseTier.Value;
        if (request.MaxStudentSeats.HasValue) tenant.MaxStudentSeats = request.MaxStudentSeats.Value;
        if (request.StorageQuotaGb.HasValue) tenant.StorageQuotaGb = request.StorageQuotaGb.Value;
        if (request.IsActive.HasValue) tenant.IsActive = request.IsActive.Value;
        if (request.EnforceStrictSso.HasValue) tenant.EnforceStrictSso = request.EnforceStrictSso.Value;
        if (request.CrestUrl != null) tenant.CrestUrl = request.CrestUrl;
        if (request.SubscriptionExpiresAtUtc.HasValue) tenant.SubscriptionExpiresAtUtc = request.SubscriptionExpiresAtUtc.Value;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("outcomes")]
    public async Task<ActionResult<List<MasterOutcomeDto>>> GetMasterOutcomes()
    {
        var outcomes = await _context.MasterNbaOutcomes
            .IgnoreQueryFilters()
            .Where(o => !o.IsDeleted)
            .OrderBy(o => o.Code)
            .Select(o => new MasterOutcomeDto
            {
                Id = o.Id,
                Code = o.Code,
                Title = o.Title,
                Description = o.Description,
                Category = o.Category,
                IsActive = o.IsActive
            })
            .ToListAsync();

        return Ok(outcomes);
    }

    [HttpPost("outcomes")]
    public async Task<ActionResult<MasterOutcomeDto>> CreateOutcome([FromBody] MasterOutcomeDto request)
    {
        var code = request.Code.Trim().ToUpperInvariant();
        var outcome = await _context.MasterNbaOutcomes
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(o => o.Code == code && !o.IsDeleted);

        if (outcome != null)
        {
            outcome.Title = request.Title;
            outcome.Description = request.Description;
            outcome.Category = request.Category;
            outcome.IsActive = request.IsActive;
        }
        else
        {
            outcome = new MasterNbaOutcome
            {
                Code = code,
                Title = request.Title,
                Description = request.Description,
                Category = request.Category,
                IsActive = request.IsActive
            };
            await _context.MasterNbaOutcomes.AddAsync(outcome);
        }

        await _context.SaveChangesAsync();
        return Ok(request);
    }

    [HttpGet("sdgs")]
    public async Task<ActionResult<List<MasterSdgDto>>> GetMasterSdgs()
    {
        var sdgs = await _context.MasterSdgCatalogs
            .IgnoreQueryFilters()
            .Where(s => !s.IsDeleted)
            .OrderBy(s => s.SdgNumber)
            .Select(s => new MasterSdgDto
            {
                Id = s.Id,
                SdgNumber = s.SdgNumber,
                Code = s.Code,
                Title = s.Title,
                Description = s.Description,
                IsActive = s.IsActive
            })
            .ToListAsync();

        return Ok(sdgs);
    }

    [HttpGet("audit-logs")]
    public async Task<ActionResult<List<PlatformAuditLogDto>>> GetAuditLogs([FromQuery] int take = 100)
    {
        var logs = await _context.PlatformAuditLogs
            .IgnoreQueryFilters()
            .OrderByDescending(l => l.OccurredAtUtc)
            .Take(take)
            .Select(l => new PlatformAuditLogDto
            {
                Id = l.Id,
                ActorUserId = l.ActorUserId,
                ActorEmail = l.ActorEmail,
                Action = l.Action,
                TargetTenantId = l.TargetTenantId,
                TargetEntity = l.TargetEntity,
                MetadataJson = l.MetadataJson,
                IpAddress = l.IpAddress,
                OccurredAtUtc = l.OccurredAtUtc
            })
            .ToListAsync();

        return Ok(logs);
    }

    [HttpPost("audit-logs")]
    public async Task<ActionResult<PlatformAuditLogDto>> CreateAuditLog([FromBody] CreatePlatformAuditLogRequest request)
    {
        var actorEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value 
            ?? User.FindFirst("email")?.Value 
            ?? "admin@collabex.in";

        var log = new PlatformAuditLog
        {
            Id = Guid.NewGuid(),
            ActorEmail = actorEmail,
            Action = request.Action,
            TargetEntity = request.TargetEntity,
            TargetTenantId = request.TargetTenantId,
            MetadataJson = request.MetadataJson ?? "{}",
            IpAddress = request.IpAddress ?? HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
            OccurredAtUtc = DateTime.UtcNow
        };

        _context.PlatformAuditLogs.Add(log);
        await _context.SaveChangesAsync();

        return Ok(new PlatformAuditLogDto
        {
            Id = log.Id,
            ActorUserId = log.ActorUserId,
            ActorEmail = log.ActorEmail,
            Action = log.Action,
            TargetTenantId = log.TargetTenantId,
            TargetEntity = log.TargetEntity,
            MetadataJson = log.MetadataJson,
            IpAddress = log.IpAddress,
            OccurredAtUtc = log.OccurredAtUtc
        });
    }

    [HttpGet("sessions")]
    public async Task<ActionResult<List<PlatformSessionDto>>> GetSessions()
    {
        var sessions = await _context.UserSessions
            .Where(s => !s.IsRevoked)
            .OrderByDescending(s => s.LastActiveTimeUtc)
            .Select(s => new PlatformSessionDto
            {
                Id = s.Id,
                AccountEmail = s.AccountEmail,
                AccountName = s.AccountName,
                Role = s.Role,
                Device = s.Device,
                Browser = s.Browser,
                IpAddress = s.IpAddress,
                LoginTimeUtc = s.LoginTimeUtc,
                LastActiveTimeUtc = s.LastActiveTimeUtc,
                IsCurrentSession = s.Id == "sess-cur-01"
            })
            .ToListAsync();

        return Ok(sessions);
    }

    [HttpPost("sessions/{id}/revoke")]
    public async Task<IActionResult> RevokeSession(string id)
    {
        var currentEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value 
            ?? User.FindFirst("email")?.Value 
            ?? "admin@collabex.in";

        var session = await _context.UserSessions.FirstOrDefaultAsync(s => s.Id == id);
        if (session != null)
        {
            session.IsRevoked = true;
            session.RevokedAtUtc = DateTime.UtcNow;
        }

        var log = new PlatformAuditLog
        {
            Id = Guid.NewGuid(),
            ActorEmail = currentEmail,
            Action = "Admin Session Revoked",
            TargetEntity = $"Session: {id}",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
            OccurredAtUtc = DateTime.UtcNow,
            MetadataJson = $"{{\"revokedSessionId\":\"{id}\",\"revokedBy\":\"{currentEmail}\",\"category\":\"Authentication\",\"result\":\"Success\",\"details\":\"Active platform administrative session invalidated immediately.\"}}"
        };

        _context.PlatformAuditLogs.Add(log);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Administrative session {SessionId} revoked by {ActorEmail}", id, currentEmail);
        return Ok(new { success = true, revokedSessionId = id });
    }
}
