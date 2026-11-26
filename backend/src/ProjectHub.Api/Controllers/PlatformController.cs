using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
[Authorize(Policy = ProjectHubPolicies.SuperAdminOnly)]
public class PlatformController : ControllerBase
{
    private readonly ProjectHubDbContext _context;
    private readonly IEmailOutboxService _emailOutbox;
    private readonly ISessionSecurityService _sessionSecurity;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<PlatformController> _logger;

    public PlatformController(
        ProjectHubDbContext context,
        IEmailOutboxService emailOutbox,
        ISessionSecurityService sessionSecurity,
        IWebHostEnvironment environment,
        ILogger<PlatformController> logger)
    {
        _context = context;
        _emailOutbox = emailOutbox;
        _sessionSecurity = sessionSecurity;
        _environment = environment;
        _logger = logger;
    }

    private Guid? GetActorUserId()
    {
        var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    private string GetActorEmail() =>
        User.FindFirst(ClaimTypes.Email)?.Value
        ?? User.FindFirst("email")?.Value
        ?? string.Empty;

    private string GetActorName() =>
        User.FindFirst(ClaimTypes.Name)?.Value
        ?? User.FindFirst("name")?.Value
        ?? GetActorEmail();

    private string GetClientIp() =>
        HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

    private void RecordAudit(
        string action,
        string targetEntity,
        string category,
        string result,
        string details,
        Guid? targetTenantId = null,
        object? extra = null)
    {
        var actorEmail = GetActorEmail();
        var metadata = new Dictionary<string, object?>
        {
            ["actorName"] = GetActorName(),
            ["category"] = category,
            ["result"] = result,
            ["details"] = details
        };
        if (extra != null)
        {
            metadata["context"] = extra;
        }

        _context.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = GetActorUserId(),
            ActorEmail = actorEmail,
            Action = action,
            TargetTenantId = targetTenantId,
            TargetEntity = targetEntity,
            IpAddress = GetClientIp(),
            OccurredAtUtc = DateTime.UtcNow,
            MetadataJson = JsonSerializer.Serialize(metadata)
        });
    }

    // =========================================================================
    // 1. ANALYTICS & ADOPTION
    // =========================================================================

    [HttpGet("analytics")]
    public async Task<ActionResult<PlatformAnalyticsOverviewDto>> GetAnalytics([FromQuery] string range = "30d")
    {
        var normalizedRange = (range ?? "30d").Trim().ToLowerInvariant();
        DateTime? rangeStartUtc = normalizedRange switch
        {
            "7d" => DateTime.UtcNow.AddDays(-7),
            "30d" => DateTime.UtcNow.AddDays(-30),
            "90d" => DateTime.UtcNow.AddDays(-90),
            "all" => null,
            _ => DateTime.UtcNow.AddDays(-30)
        };
        if (normalizedRange is not ("7d" or "30d" or "90d" or "all"))
        {
            normalizedRange = "30d";
        }

        var colleges = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(t => !t.IsDeleted && t.TenantCode != SuperAdminBootstrapper.PlatformTenantCode)
            .OrderBy(t => t.Name)
            .Select(t => new PlatformAnalyticsCollegeDto
            {
                Id = t.Id,
                Name = t.Name,
                TenantCode = t.TenantCode,
                LicenseTier = t.LicenseTier,
                StorageQuotaGb = t.StorageQuotaGb,
                IsActive = t.IsActive,
                DepartmentCount = _context.Departments.IgnoreQueryFilters().Count(d => d.CollegeId == t.Id && !d.IsDeleted),
                FacultyCount = _context.Users.IgnoreQueryFilters().Count(u => u.CollegeId == t.Id && (u.Role == UserRole.Faculty || u.Role == UserRole.HOD) && u.IsActive && !u.IsDeleted),
                ActiveStudents = _context.Users.IgnoreQueryFilters().Count(u => u.CollegeId == t.Id && u.Role == UserRole.Student && u.IsActive && !u.IsDeleted),
                ActiveProjects = _context.ProjectTeams.IgnoreQueryFilters().Count(p => p.CollegeId == t.Id && !p.IsDeleted && p.Status != ProjectStatus.Archived && p.Status != ProjectStatus.Completed),
                CompletedProjects = _context.ProjectTeams.IgnoreQueryFilters().Count(p => p.CollegeId == t.Id && !p.IsDeleted && p.Status == ProjectStatus.Completed),
                LogbooksInRange = rangeStartUtc == null
                    ? _context.WeeklyLogbooks.IgnoreQueryFilters().Count(l => l.CollegeId == t.Id && !l.IsDeleted)
                    : _context.WeeklyLogbooks.IgnoreQueryFilters().Count(l => l.CollegeId == t.Id && !l.IsDeleted && l.CreatedAtUtc >= rangeStartUtc),
                LastActivityAtUtc = _context.Users.IgnoreQueryFilters().Where(u => u.CollegeId == t.Id && !u.IsDeleted).Max(u => u.LastLoginAtUtc)
            })
            .ToListAsync();

        var totalRegisteredStudents = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync(u => u.Role == UserRole.Student && !u.IsDeleted);

        var activeFaculty = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync(u => (u.Role == UserRole.Faculty || u.Role == UserRole.HOD) && u.IsActive && !u.IsDeleted);

        var totalDepartments = await _context.Departments
            .IgnoreQueryFilters()
            .CountAsync(d => !d.IsDeleted);

        var activeUsersInRange = rangeStartUtc == null
            ? await _context.Users.IgnoreQueryFilters().CountAsync(u => u.IsActive && !u.IsDeleted && u.LastLoginAtUtc != null)
            : await _context.Users.IgnoreQueryFilters().CountAsync(u => u.IsActive && !u.IsDeleted && u.LastLoginAtUtc >= rangeStartUtc);

        var weeklyLogbooksInRange = rangeStartUtc == null
            ? await _context.WeeklyLogbooks.IgnoreQueryFilters().CountAsync(l => !l.IsDeleted)
            : await _context.WeeklyLogbooks.IgnoreQueryFilters().CountAsync(l => !l.IsDeleted && l.CreatedAtUtc >= rangeStartUtc);

        var evaluationsInRange = rangeStartUtc == null
            ? await _context.VivaEvaluations.IgnoreQueryFilters().CountAsync(e => !e.IsDeleted)
            : await _context.VivaEvaluations.IgnoreQueryFilters().CountAsync(e => !e.IsDeleted && e.CreatedAtUtc >= rangeStartUtc);

        return Ok(new PlatformAnalyticsOverviewDto
        {
            Range = normalizedRange,
            RangeStartUtc = rangeStartUtc,
            TotalColleges = colleges.Count,
            ActiveColleges = colleges.Count(c => c.IsActive),
            SuspendedColleges = colleges.Count(c => !c.IsActive),
            TotalDepartments = totalDepartments,
            ActiveFaculty = activeFaculty,
            RegisteredStudents = totalRegisteredStudents,
            ActiveUsersInRange = activeUsersInRange,
            ActiveProjects = colleges.Sum(c => c.ActiveProjects),
            CompletedProjects = colleges.Sum(c => c.CompletedProjects),
            WeeklyLogbooksInRange = weeklyLogbooksInRange,
            EvaluationsInRange = evaluationsInRange,
            Colleges = colleges
        });
    }

    // =========================================================================
    // 2. COLLEGE TENANTS
    // =========================================================================

    [HttpGet("tenants")]
    public async Task<ActionResult<List<CollegeTenantDto>>> GetTenants()
    {
        var tenants = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(t => !t.IsDeleted && t.TenantCode != SuperAdminBootstrapper.PlatformTenantCode)
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
                StudentCount = t.Users.Count(u => u.Role == UserRole.Student && !u.IsDeleted),
                FacultyCount = t.Users.Count(u => (u.Role == UserRole.Faculty || u.Role == UserRole.HOD) && !u.IsDeleted),
                ActiveProjectsCount = _context.ProjectTeams.IgnoreQueryFilters().Count(p => p.CollegeId == t.Id && !p.IsDeleted && p.Status != ProjectStatus.Archived),
                LastActivityAtUtc = t.Users.Where(u => !u.IsDeleted).Max(u => u.LastLoginAtUtc),
                PrincipalEmail = t.Users.Where(u => u.Role == UserRole.CollegeAdmin && !u.IsDeleted).OrderByDescending(u => u.IsActive).ThenByDescending(u => u.CreatedAtUtc).Select(u => u.Email).FirstOrDefault(),
                PrincipalName = t.Users.Where(u => u.Role == UserRole.CollegeAdmin && !u.IsDeleted).OrderByDescending(u => u.IsActive).ThenByDescending(u => u.CreatedAtUtc).Select(u => u.FullName).FirstOrDefault(),
                PrincipalIsActive = t.Users.Where(u => u.Role == UserRole.CollegeAdmin && !u.IsDeleted).OrderByDescending(u => u.IsActive).ThenByDescending(u => u.CreatedAtUtc).Select(u => (bool?)u.IsActive).FirstOrDefault(),
                PrincipalIsActivated = t.Users.Where(u => u.Role == UserRole.CollegeAdmin && !u.IsDeleted).OrderByDescending(u => u.IsActive).ThenByDescending(u => u.CreatedAtUtc).Select(u => (bool?)u.IsActivated).FirstOrDefault(),
                PrincipalIsEmailVerified = t.Users.Where(u => u.Role == UserRole.CollegeAdmin && !u.IsDeleted).OrderByDescending(u => u.IsActive).ThenByDescending(u => u.CreatedAtUtc).Select(u => (bool?)u.IsEmailVerified).FirstOrDefault(),
                PrincipalHasPendingInvitation = t.Users.Where(u => u.Role == UserRole.CollegeAdmin && !u.IsDeleted).OrderByDescending(u => u.IsActive).ThenByDescending(u => u.CreatedAtUtc).Select(u => (bool?)(!u.IsActivated && u.ActivationTokenHashed != null && u.ActivationTokenExpiresAtUtc > DateTime.UtcNow)).FirstOrDefault(),
                PrincipalLastLoginAtUtc = t.Users.Where(u => u.Role == UserRole.CollegeAdmin && !u.IsDeleted).OrderByDescending(u => u.IsActive).ThenByDescending(u => u.CreatedAtUtc).Select(u => u.LastLoginAtUtc).FirstOrDefault(),
                AdminEmails = t.Users.Where(u => u.Role == UserRole.CollegeAdmin && !u.IsDeleted && u.IsActive).Select(u => u.Email).ToList(),
                CollegeType = t.CollegeType,
                AffiliatingUniversity = t.AffiliatingUniversity ?? "RGPV",
                Country = t.Country,
                State = t.State,
                City = t.City,
                CampusAddress = t.CampusAddress,
                CreatedAtUtc = t.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(tenants);
    }

    private async Task<string> GenerateUniqueTenantCodeAsync(string institutionName)
    {
        var letters = Regex.Replace(institutionName.ToUpperInvariant(), "[^A-Z0-9]", "");
        var prefix = letters.Length >= 4 ? letters[..4] : (letters.Length > 0 ? letters : "COLL");

        for (var attempt = 0; attempt < 10; attempt++)
        {
            var suffix = Convert.ToHexString(RandomNumberGenerator.GetBytes(2));
            var candidate = $"{prefix}-{suffix}";
            var exists = await _context.CollegeTenants
                .IgnoreQueryFilters()
                .AnyAsync(t => t.TenantCode == candidate && !t.IsDeleted);
            if (!exists) return candidate;
        }

        return $"TEN-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
    }

    [HttpPost("tenants")]
    public async Task<ActionResult<CreateTenantResponse>> CreateTenant([FromBody] CreateTenantRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "College Name is required." });
        }

        if (string.IsNullOrWhiteSpace(request.PrincipalName) || string.IsNullOrWhiteSpace(request.PrincipalEmail) || !request.PrincipalEmail.Contains('@'))
        {
            return BadRequest(new { message = "Administrator Name and a valid Official Email are required." });
        }

        var principalName = request.PrincipalName.Trim();
        var principalEmail = request.PrincipalEmail.Trim().ToLowerInvariant();
        var emailDomain = principalEmail.Split('@')[1];

        var rawDomain = !string.IsNullOrWhiteSpace(request.SsoDomain) ? request.SsoDomain.Trim().ToLowerInvariant() : emailDomain;
        var domain = rawDomain
            .Replace("https://", "")
            .Replace("http://", "")
            .Replace("www.", "")
            .Replace("@", "")
            .Trim('/')
            .Split('/')[0];

        if (string.IsNullOrWhiteSpace(domain))
        {
            domain = emailDomain;
        }

        // TenantCode is optional; auto-generated when omitted so College Code is never required
        var code = string.IsNullOrWhiteSpace(request.TenantCode)
            ? await GenerateUniqueTenantCodeAsync(request.Name)
            : request.TenantCode.Trim().ToUpperInvariant();

        var cleanName = request.Name.Trim();
        var exists = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .AnyAsync(t => (t.Name.ToLower() == cleanName.ToLower() || t.TenantCode == code || t.SsoDomain == domain) && !t.IsDeleted);

        if (exists)
        {
            return Conflict(new { message = "A college tenant with the same name, code, or email domain already exists." });
        }

        var emailExists = await _context.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Email == principalEmail && !u.IsDeleted);

        if (emailExists)
        {
            return Conflict(new { message = $"A user account with email '{principalEmail}' already exists in the system." });
        }

        var collegeType = !string.IsNullOrWhiteSpace(request.CollegeType) ? request.CollegeType.Trim() : null;
        var affiliatingUniversity = !string.IsNullOrWhiteSpace(request.AffiliatingUniversity)
            ? request.AffiliatingUniversity.Trim()
            : null;
        var country = !string.IsNullOrWhiteSpace(request.Country) ? request.Country.Trim() : null;
        var state = !string.IsNullOrWhiteSpace(request.State) ? request.State.Trim() : null;
        var city = !string.IsNullOrWhiteSpace(request.City) ? request.City.Trim() : null;

        var locationParts = new[] { city, state, country }.Where(p => !string.IsNullOrWhiteSpace(p)).ToArray();
        var campusAddress = !string.IsNullOrWhiteSpace(request.CampusAddress)
            ? request.CampusAddress.Trim()
            : (locationParts.Length > 0 ? string.Join(", ", locationParts) : null);

        var tenant = new CollegeTenant
        {
            Id = Guid.NewGuid(),
            Name = cleanName,
            TenantCode = code,
            SsoDomain = domain,
            LicenseTier = request.LicenseTier,
            MaxStudentSeats = request.MaxStudentSeats,
            StorageQuotaGb = request.StorageQuotaGb,
            EnforceStrictSso = request.EnforceStrictSso,
            CrestUrl = request.CrestUrl,
            SubscriptionExpiresAtUtc = request.SubscriptionExpiresAtUtc,
            CollegeType = collegeType,
            AffiliatingUniversity = affiliatingUniversity,
            Country = country,
            State = state,
            City = city,
            CampusAddress = campusAddress,
            IsActive = true
        };

        await _context.CollegeTenants.AddAsync(tenant);

        var isRgpv = !string.IsNullOrWhiteSpace(affiliatingUniversity) &&
                     affiliatingUniversity.Contains("RGPV", StringComparison.OrdinalIgnoreCase);
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

        var rawActivationToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-").Replace("/", "_").TrimEnd('=');
        var activationTokenHash = Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawActivationToken)));

        var principalUser = new UserAccount
        {
            CollegeId = tenant.Id,
            FullName = principalName,
            Email = principalEmail,
            EnrollmentOrEmployeeCode = $"EMP-{code}-001",
            Role = UserRole.CollegeAdmin,
            PasswordHash = null,
            ActivationTokenHashed = activationTokenHash,
            ActivationTokenExpiresAtUtc = DateTime.UtcNow.AddHours(24),
            IsActivated = false,
            IsEmailVerified = false,
            IsActive = true
        };

        await _context.Users.AddAsync(principalUser);

        RecordAudit(
            action: "College Tenant Provisioned",
            targetEntity: $"{tenant.Name} ({tenant.Id})",
            category: "College Management",
            result: "Success",
            details: $"Provisioned tenant '{tenant.Name}' with UUID {tenant.Id} and dispatched CollegeAdmin activation link to {principalEmail}.",
            targetTenantId: tenant.Id,
            extra: new { tenantId = tenant.Id, tenantCode = tenant.TenantCode, domain = tenant.SsoDomain, collegeType, country, state, city });

        _emailOutbox.QueueAccountActivation(principalEmail, principalName, rawActivationToken, principalUser.ActivationTokenExpiresAtUtc ?? DateTime.UtcNow.AddHours(24), tenant.Id);
        await _context.SaveChangesAsync();

        _logger.LogInformation("[TENANT ONBOARDING] Provisioned College Tenant '{Name}' ({TenantId}) with Principal '{PrincipalName}' <{PrincipalEmail}>.",
            tenant.Name, tenant.Id, principalName, principalEmail);

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
            FacultyCount = 0,
            ActiveProjectsCount = 0,
            PrincipalEmail = principalEmail,
            AdminEmails = new List<string> { principalEmail },
            CollegeType = collegeType,
            AffiliatingUniversity = affiliatingUniversity,
            Country = country,
            State = state,
            City = city,
            CampusAddress = campusAddress,
            CreatedAtUtc = tenant.CreatedAtUtc
        };

        return StatusCode(StatusCodes.Status201Created, new CreateTenantResponse
        {
            Tenant = tenantDto,
            AdminEmail = principalEmail,
            DevOtp = null,
            Message = $"College tenant '{tenant.Name}' provisioned successfully. Activation link dispatched to {principalEmail}."
        });
    }

    [HttpGet("tenants/{id}")]
    public async Task<ActionResult<CollegeTenantDto>> GetTenant(Guid id)
    {
        var tenant = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(t => t.Id == id && !t.IsDeleted && t.TenantCode != SuperAdminBootstrapper.PlatformTenantCode)
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
                StudentCount = t.Users.Count(u => u.Role == UserRole.Student && !u.IsDeleted),
                FacultyCount = t.Users.Count(u => (u.Role == UserRole.Faculty || u.Role == UserRole.HOD) && !u.IsDeleted),
                ActiveProjectsCount = _context.ProjectTeams.IgnoreQueryFilters().Count(p => p.CollegeId == t.Id && !p.IsDeleted && p.Status != ProjectStatus.Archived),
                LastActivityAtUtc = t.Users.Where(u => !u.IsDeleted).Max(u => u.LastLoginAtUtc),
                PrincipalEmail = t.Users.Where(u => u.Role == UserRole.CollegeAdmin && !u.IsDeleted).OrderByDescending(u => u.IsActive).ThenByDescending(u => u.CreatedAtUtc).Select(u => u.Email).FirstOrDefault(),
                PrincipalName = t.Users.Where(u => u.Role == UserRole.CollegeAdmin && !u.IsDeleted).OrderByDescending(u => u.IsActive).ThenByDescending(u => u.CreatedAtUtc).Select(u => u.FullName).FirstOrDefault(),
                PrincipalIsActive = t.Users.Where(u => u.Role == UserRole.CollegeAdmin && !u.IsDeleted).OrderByDescending(u => u.IsActive).ThenByDescending(u => u.CreatedAtUtc).Select(u => (bool?)u.IsActive).FirstOrDefault(),
                PrincipalIsActivated = t.Users.Where(u => u.Role == UserRole.CollegeAdmin && !u.IsDeleted).OrderByDescending(u => u.IsActive).ThenByDescending(u => u.CreatedAtUtc).Select(u => (bool?)u.IsActivated).FirstOrDefault(),
                PrincipalIsEmailVerified = t.Users.Where(u => u.Role == UserRole.CollegeAdmin && !u.IsDeleted).OrderByDescending(u => u.IsActive).ThenByDescending(u => u.CreatedAtUtc).Select(u => (bool?)u.IsEmailVerified).FirstOrDefault(),
                PrincipalHasPendingInvitation = t.Users.Where(u => u.Role == UserRole.CollegeAdmin && !u.IsDeleted).OrderByDescending(u => u.IsActive).ThenByDescending(u => u.CreatedAtUtc).Select(u => (bool?)(!u.IsActivated && u.ActivationTokenHashed != null && u.ActivationTokenExpiresAtUtc > DateTime.UtcNow)).FirstOrDefault(),
                PrincipalLastLoginAtUtc = t.Users.Where(u => u.Role == UserRole.CollegeAdmin && !u.IsDeleted).OrderByDescending(u => u.IsActive).ThenByDescending(u => u.CreatedAtUtc).Select(u => u.LastLoginAtUtc).FirstOrDefault(),
                AdminEmails = t.Users.Where(u => u.Role == UserRole.CollegeAdmin && !u.IsDeleted && u.IsActive).Select(u => u.Email).ToList(),
                CollegeType = t.CollegeType,
                AffiliatingUniversity = t.AffiliatingUniversity ?? "RGPV",
                Country = t.Country,
                State = t.State,
                City = t.City,
                CampusAddress = t.CampusAddress,
                CreatedAtUtc = t.CreatedAtUtc
            })
            .FirstOrDefaultAsync();

        if (tenant == null) return NotFound(new { message = "College tenant not found." });
        return Ok(tenant);
    }

    [HttpGet("tenants/{id}/audit-logs")]
    public async Task<ActionResult<List<PlatformAuditLogDto>>> GetTenantAuditLogs(Guid id, [FromQuery] int take = 100)
    {
        var exists = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .AnyAsync(t => t.Id == id && !t.IsDeleted && t.TenantCode != SuperAdminBootstrapper.PlatformTenantCode);
        if (!exists) return NotFound(new { message = "College tenant not found." });

        var clampedTake = Math.Clamp(take, 1, 200);
        var logs = await _context.PlatformAuditLogs
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(l => !l.IsDeleted && l.TargetTenantId == id)
            .OrderByDescending(l => l.OccurredAtUtc)
            .Take(clampedTake)
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

        var rawActivationToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-").Replace("/", "_").TrimEnd('=');
        var activationTokenHash = Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawActivationToken)));

        var existingUser = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == principalEmail && !u.IsDeleted);

        if (existingUser != null && existingUser.CollegeId != tenant.Id)
        {
            return Conflict(new { message = $"Email '{principalEmail}' belongs to a different tenant." });
        }

        if (request?.ReplaceExisting == true)
        {
            var previousAdmins = await _context.Users
                .IgnoreQueryFilters()
                .Where(u => u.CollegeId == tenant.Id && u.Role == UserRole.CollegeAdmin && !u.IsDeleted && u.Email != principalEmail)
                .ToListAsync();

            foreach (var prev in previousAdmins)
            {
                prev.IsActive = false;
                prev.SecurityStamp = Guid.NewGuid().ToString("N");
                prev.UpdatedAtUtc = DateTime.UtcNow;
                await _sessionSecurity.RevokeAllUserSessionsAsync(prev.Id, null, "CollegeAdminReplaced");
            }
        }

        if (existingUser != null)
        {
            existingUser.Role = UserRole.CollegeAdmin;
            existingUser.FullName = principalName;
            existingUser.PasswordHash = null;
            existingUser.IsActivated = false;
            existingUser.IsEmailVerified = false;
            existingUser.ActivationTokenHashed = activationTokenHash;
            existingUser.ActivationTokenExpiresAtUtc = DateTime.UtcNow.AddHours(24);
            existingUser.IsActive = true;
            existingUser.SecurityStamp = Guid.NewGuid().ToString("N");

            RecordAudit(
                action: request?.ReplaceExisting == true ? "College Admin Replaced" : "College Admin Invitation Resent",
                targetEntity: $"{tenant.Name} ({principalEmail})",
                category: "College Management",
                result: "Success",
                details: request?.ReplaceExisting == true
                    ? $"Replaced primary CollegeAdmin with {principalEmail}. Reason: {request?.Reason ?? "Administrative reassignment"}."
                    : $"Dispatched fresh CollegeAdmin activation link to {principalEmail}.",
                targetTenantId: tenant.Id,
                extra: new { adminEmail = existingUser.Email, replaceExisting = request?.ReplaceExisting ?? false, reason = request?.Reason });

            _emailOutbox.QueueAccountActivation(existingUser.Email, existingUser.FullName, rawActivationToken, existingUser.ActivationTokenExpiresAtUtc ?? DateTime.UtcNow.AddHours(24), tenant.Id);
            await _context.SaveChangesAsync();

            return Ok(new ProvisionAdminResponse
            {
                Success = true,
                AdminEmail = existingUser.Email,
                Message = $"Principal account '{existingUser.Email}' updated with CollegeAdmin role and activation link queued for delivery."
            });
        }

        var newAdmin = new UserAccount
        {
            CollegeId = tenant.Id,
            FullName = principalName,
            Email = principalEmail,
            EnrollmentOrEmployeeCode = $"EMP-{tenant.TenantCode}-001",
            Role = UserRole.CollegeAdmin,
            PasswordHash = null,
            ActivationTokenHashed = activationTokenHash,
            ActivationTokenExpiresAtUtc = DateTime.UtcNow.AddHours(24),
            IsActivated = false,
            IsEmailVerified = false,
            IsActive = true
        };

        await _context.Users.AddAsync(newAdmin);

        RecordAudit(
            action: request?.ReplaceExisting == true ? "College Admin Replaced" : "College Admin Provisioned",
            targetEntity: $"{tenant.Name} ({principalEmail})",
            category: "College Management",
            result: "Success",
            details: request?.ReplaceExisting == true
                ? $"Replaced primary CollegeAdmin with {principalEmail}. Reason: {request?.Reason ?? "Administrative reassignment"}."
                : $"Provisioned new CollegeAdmin account '{principalEmail}' for {tenant.Name}.",
            targetTenantId: tenant.Id,
            extra: new { adminEmail = newAdmin.Email, replaceExisting = request?.ReplaceExisting ?? false, reason = request?.Reason });

        _emailOutbox.QueueAccountActivation(newAdmin.Email, newAdmin.FullName, rawActivationToken, newAdmin.ActivationTokenExpiresAtUtc ?? DateTime.UtcNow.AddHours(24), tenant.Id);
        await _context.SaveChangesAsync();

        return Ok(new ProvisionAdminResponse
        {
            Success = true,
            AdminEmail = newAdmin.Email,
            Message = $"Principal account '{newAdmin.Email}' provisioned and activation link queued for delivery."
        });
    }

    [HttpPut("tenants/{id}")]
    public async Task<ActionResult<CollegeTenantDto>> UpdateTenant(Guid id, [FromBody] UpdateTenantRequest request)
    {
        var tenant = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (tenant == null) return NotFound(new { message = "Tenant not found." });

        var wasActive = tenant.IsActive;

        if (request.Name != null) tenant.Name = request.Name.Trim();
        if (request.LicenseTier.HasValue) tenant.LicenseTier = request.LicenseTier.Value;
        if (request.MaxStudentSeats.HasValue) tenant.MaxStudentSeats = request.MaxStudentSeats.Value;
        if (request.StorageQuotaGb.HasValue) tenant.StorageQuotaGb = request.StorageQuotaGb.Value;
        if (request.IsActive.HasValue) tenant.IsActive = request.IsActive.Value;
        if (request.EnforceStrictSso.HasValue) tenant.EnforceStrictSso = request.EnforceStrictSso.Value;
        if (request.CrestUrl != null) tenant.CrestUrl = request.CrestUrl;
        if (request.SubscriptionExpiresAtUtc.HasValue) tenant.SubscriptionExpiresAtUtc = request.SubscriptionExpiresAtUtc.Value;
        if (request.CollegeType != null) tenant.CollegeType = request.CollegeType.Trim();
        if (request.AffiliatingUniversity != null) tenant.AffiliatingUniversity = request.AffiliatingUniversity.Trim();
        if (request.Country != null) tenant.Country = request.Country.Trim();
        if (request.State != null) tenant.State = request.State.Trim();
        if (request.City != null) tenant.City = request.City.Trim();
        if (request.CampusAddress != null) tenant.CampusAddress = request.CampusAddress.Trim();

        var action = "College Tenant Updated";
        if (request.IsActive.HasValue && wasActive != request.IsActive.Value)
        {
            action = request.IsActive.Value ? "College Tenant Reactivated" : "College Tenant Suspended";
            if (!request.IsActive.Value)
            {
                var tenantUsers = await _context.Users
                    .IgnoreQueryFilters()
                    .Where(u => u.CollegeId == tenant.Id && !u.IsDeleted)
                    .Select(u => u.Id)
                    .ToListAsync();
                foreach (var uid in tenantUsers)
                {
                    await _sessionSecurity.RevokeAllUserSessionsAsync(uid, null, "CollegeTenantSuspended");
                }
            }
        }

        RecordAudit(
            action: action,
            targetEntity: $"{tenant.Name} ({tenant.Id})",
            category: "College Management",
            result: "Success",
            details: $"{action}: {tenant.Name}.",
            targetTenantId: tenant.Id,
            extra: new { isActive = tenant.IsActive, licenseTier = tenant.LicenseTier.ToString(), maxStudentSeats = tenant.MaxStudentSeats, storageQuotaGb = tenant.StorageQuotaGb });

        await _context.SaveChangesAsync();

        return Ok(new CollegeTenantDto
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
            CollegeType = tenant.CollegeType,
            AffiliatingUniversity = tenant.AffiliatingUniversity ?? "RGPV",
            Country = tenant.Country,
            State = tenant.State,
            City = tenant.City,
            CampusAddress = tenant.CampusAddress,
            CreatedAtUtc = tenant.CreatedAtUtc
        });
    }

    // =========================================================================
    // 3. MASTER SDG CATALOG
    // =========================================================================

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

    // =========================================================================
    // 4. AUDIT LOGS & SECURITY SUMMARY (IMMUTABLE, APPEND-ONLY)
    // =========================================================================

    [HttpGet("audit-logs")]
    public async Task<ActionResult<List<PlatformAuditLogDto>>> GetAuditLogs(
        [FromQuery] int take = 200,
        [FromQuery] string? search = null,
        [FromQuery] string? category = null,
        [FromQuery] string? result = null,
        [FromQuery] DateTime? fromUtc = null,
        [FromQuery] DateTime? toUtc = null)
    {
        var clampedTake = Math.Clamp(take, 1, 500);
        var query = _context.PlatformAuditLogs
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(l => !l.IsDeleted);

        if (fromUtc.HasValue)
        {
            query = query.Where(l => l.OccurredAtUtc >= fromUtc.Value);
        }
        if (toUtc.HasValue)
        {
            query = query.Where(l => l.OccurredAtUtc <= toUtc.Value);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLower();
            query = query.Where(l =>
                l.Action.ToLower().Contains(q) ||
                l.ActorEmail.ToLower().Contains(q) ||
                l.TargetEntity.ToLower().Contains(q) ||
                (l.IpAddress != null && l.IpAddress.Contains(q)));
        }
        if (!string.IsNullOrWhiteSpace(category) && !string.Equals(category, "All", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(l => l.MetadataJson.Contains($"\"category\":\"{category}\""));
        }
        if (!string.IsNullOrWhiteSpace(result) && !string.Equals(result, "All", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(l => l.MetadataJson.Contains($"\"result\":\"{result}\""));
        }

        var logs = await query
            .OrderByDescending(l => l.OccurredAtUtc)
            .Take(clampedTake)
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
        if (string.IsNullOrWhiteSpace(request.Action) || string.IsNullOrWhiteSpace(request.TargetEntity))
        {
            return BadRequest(new { message = "Action and TargetEntity are required." });
        }

        var actorEmail = GetActorEmail();
        var log = new PlatformAuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = GetActorUserId(),
            ActorEmail = string.IsNullOrWhiteSpace(actorEmail) ? "system@collabex.in" : actorEmail,
            Action = request.Action.Trim(),
            TargetEntity = request.TargetEntity.Trim(),
            TargetTenantId = request.TargetTenantId,
            MetadataJson = string.IsNullOrWhiteSpace(request.MetadataJson) ? "{}" : request.MetadataJson,
            IpAddress = GetClientIp(),
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

    [HttpGet("security-summary")]
    public async Task<ActionResult<PlatformSecuritySummaryDto>> GetSecuritySummary()
    {
        var now = DateTime.UtcNow;
        var cutoff24h = now.AddHours(-24);
        var cutoff7d = now.AddDays(-7);

        var activeSessionsCount = await _context.UserSessions
            .CountAsync(s => !s.IsRevoked && s.ExpiresAtUtc > now);

        var totalSuperAdmins = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync(u => u.Role == UserRole.SuperAdmin && u.IsActive && !u.IsDeleted);

        var mfaEnrolledSuperAdmins = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync(u => u.Role == UserRole.SuperAdmin && u.IsActive && !u.IsDeleted && u.MfaEnabled);

        var failedLogins24h = await _context.PlatformAuditLogs
            .IgnoreQueryFilters()
            .CountAsync(l => !l.IsDeleted && l.OccurredAtUtc >= cutoff24h &&
                (l.Action.Contains("Failed") || l.Action.Contains("Locked") || l.Action.Contains("Rate-Limited")));

        var failedLogins7d = await _context.PlatformAuditLogs
            .IgnoreQueryFilters()
            .CountAsync(l => !l.IsDeleted && l.OccurredAtUtc >= cutoff7d &&
                (l.Action.Contains("Failed") || l.Action.Contains("Locked") || l.Action.Contains("Rate-Limited")));

        var revokedSessions7d = await _context.UserSessions
            .CountAsync(s => s.IsRevoked && s.RevokedAtUtc != null && s.RevokedAtUtc >= cutoff7d);

        var recentEvents = await _context.PlatformAuditLogs
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(l => !l.IsDeleted && (
                l.Action.Contains("Failed") ||
                l.Action.Contains("Revoked") ||
                l.Action.Contains("Suspended") ||
                l.Action.Contains("Locked") ||
                l.Action.Contains("Password") ||
                l.Action.Contains("MFA") ||
                l.MetadataJson.Contains("\"category\":\"Authentication\"") ||
                l.MetadataJson.Contains("\"category\":\"Security\"")))
            .OrderByDescending(l => l.OccurredAtUtc)
            .Take(20)
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

        return Ok(new PlatformSecuritySummaryDto
        {
            ActiveSessionsCount = activeSessionsCount,
            TotalSuperAdmins = totalSuperAdmins,
            MfaEnrolledSuperAdmins = mfaEnrolledSuperAdmins,
            FailedLoginsLast24h = failedLogins24h,
            FailedLoginsLast7d = failedLogins7d,
            RevokedSessionsLast7d = revokedSessions7d,
            RecentSecurityEvents = recentEvents
        });
    }

    // =========================================================================
    // 5. PLATFORM ADMINISTRATORS
    // =========================================================================

    [HttpGet("administrators")]
    public async Task<ActionResult<List<PlatformAdministratorDto>>> GetAdministrators()
    {
        var now = DateTime.UtcNow;
        var admins = await _context.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(u => u.Role == UserRole.SuperAdmin && !u.IsDeleted)
            .OrderBy(u => u.CreatedAtUtc)
            .Select(u => new
            {
                u.Id,
                u.EnrollmentOrEmployeeCode,
                u.FullName,
                u.Email,
                u.IsActive,
                u.IsActivated,
                u.MfaEnabled,
                u.CreatedAtUtc,
                u.LastLoginAtUtc,
                ActiveSessionsCount = _context.UserSessions.Count(s => s.UserId == u.Id && !s.IsRevoked && s.ExpiresAtUtc > now)
            })
            .ToListAsync();

        var result = admins.Select(u => new PlatformAdministratorDto
        {
            Id = u.Id,
            AdminId = u.EnrollmentOrEmployeeCode,
            FullName = u.FullName,
            Email = u.Email,
            PlatformRole = "Super Admin",
            Status = !u.IsActivated ? "Pending Invitation" : (u.IsActive ? "Active" : "Suspended"),
            IsActive = u.IsActive,
            IsActivated = u.IsActivated,
            MfaEnabled = u.MfaEnabled,
            MfaStatus = u.MfaEnabled ? "Active (TOTP)" : "Enrollment Required",
            CreatedAtUtc = u.CreatedAtUtc,
            LastLoginAtUtc = u.LastLoginAtUtc,
            ActiveSessionsCount = u.ActiveSessionsCount
        }).ToList();

        return Ok(result);
    }

    [HttpPost("administrators")]
    public async Task<ActionResult<PlatformAdministratorDto>> InviteAdministrator([FromBody] InvitePlatformAdminRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
        {
            return BadRequest(new { message = "Valid full name and email address are required." });
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var exists = await _context.Users.IgnoreQueryFilters().AnyAsync(u => u.Email == email && !u.IsDeleted);
        if (exists)
        {
            return Conflict(new { message = $"An account with email '{email}' already exists." });
        }

        var platformTenant = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.TenantCode == SuperAdminBootstrapper.PlatformTenantCode && !t.IsDeleted);

        if (platformTenant == null)
        {
            platformTenant = await _context.CollegeTenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => !t.IsDeleted);
            if (platformTenant == null)
            {
                return BadRequest(new { message = "Platform root tenant is not initialized." });
            }
        }

        var rawActivationToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-").Replace("/", "_").TrimEnd('=');
        var activationTokenHash = Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawActivationToken)));

        var count = await _context.Users.IgnoreQueryFilters().CountAsync(u => u.Role == UserRole.SuperAdmin && !u.IsDeleted);
        var adminUser = new UserAccount
        {
            CollegeId = platformTenant.Id,
            FullName = request.FullName.Trim(),
            Email = email,
            EnrollmentOrEmployeeCode = $"PLATFORM-ADM-{(count + 1):D3}",
            Role = UserRole.SuperAdmin,
            PasswordHash = null,
            IsActivated = false,
            IsActive = true,
            ActivationTokenHashed = activationTokenHash,
            ActivationTokenExpiresAtUtc = DateTime.UtcNow.AddHours(24),
            SecurityStamp = Guid.NewGuid().ToString("N")
        };

        await _context.Users.AddAsync(adminUser);

        RecordAudit(
            action: "Platform Administrator Invited",
            targetEntity: $"Operator: {adminUser.Email}",
            category: "Security",
            result: "Success",
            details: $"Invited {adminUser.FullName} ({adminUser.Email}) as SuperAdmin.",
            extra: new { invitedEmail = adminUser.Email, role = "SuperAdmin" });

        _emailOutbox.QueueAccountActivation(adminUser.Email, adminUser.FullName, rawActivationToken, adminUser.ActivationTokenExpiresAtUtc ?? DateTime.UtcNow.AddHours(24), adminUser.CollegeId);
        await _context.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, new PlatformAdministratorDto
        {
            Id = adminUser.Id,
            AdminId = adminUser.EnrollmentOrEmployeeCode,
            FullName = adminUser.FullName,
            Email = adminUser.Email,
            PlatformRole = "Super Admin",
            Status = "Pending Invitation",
            IsActive = adminUser.IsActive,
            IsActivated = adminUser.IsActivated,
            MfaEnabled = adminUser.MfaEnabled,
            MfaStatus = "Enrollment Required",
            CreatedAtUtc = adminUser.CreatedAtUtc,
            LastLoginAtUtc = null,
            ActiveSessionsCount = 0
        });
    }

    [HttpPut("administrators/{id}/status")]
    public async Task<IActionResult> UpdateAdministratorStatus(Guid id, [FromBody] UpdatePlatformAdminStatusRequest request)
    {
        var currentUserId = GetActorUserId();
        if (currentUserId.HasValue && currentUserId.Value == id && !request.IsActive)
        {
            return BadRequest(new { message = "Administrators cannot suspend their own active account." });
        }

        var admin = await _context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.SuperAdmin && !u.IsDeleted);
        if (admin == null) return NotFound(new { message = "Platform administrator not found." });

        if (!request.IsActive)
        {
            var activeAdmins = await _context.Users.IgnoreQueryFilters().CountAsync(u => u.Role == UserRole.SuperAdmin && u.IsActive && !u.IsDeleted);
            if (activeAdmins <= 1)
            {
                return BadRequest(new { message = "Cannot suspend the sole active SuperAdmin account." });
            }
            admin.SecurityStamp = Guid.NewGuid().ToString("N");
            await _sessionSecurity.RevokeAllUserSessionsAsync(admin.Id, null, "PlatformAdminSuspended");
        }

        admin.IsActive = request.IsActive;
        admin.UpdatedAtUtc = DateTime.UtcNow;

        RecordAudit(
            action: request.IsActive ? "Platform Administrator Reactivated" : "Platform Administrator Suspended",
            targetEntity: $"Operator: {admin.Email}",
            category: "Security",
            result: "Success",
            details: request.IsActive ? $"Reactivated SuperAdmin {admin.Email}." : $"Suspended SuperAdmin {admin.Email} and revoked active sessions.",
            extra: new { targetId = admin.Id, isActive = request.IsActive });

        await _context.SaveChangesAsync();
        return Ok(new { success = true, isActive = admin.IsActive });
    }

    [HttpPost("administrators/{id}/revoke-sessions")]
    public async Task<IActionResult> RevokeAdministratorSessions(Guid id)
    {
        var admin = await _context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.SuperAdmin && !u.IsDeleted);
        if (admin == null) return NotFound(new { message = "Platform administrator not found." });

        var currentSid = User.FindFirst("sid")?.Value;
        var currentUserId = GetActorUserId();
        var exceptSid = currentUserId.HasValue && currentUserId.Value == id ? currentSid : null;

        await _sessionSecurity.RevokeAllUserSessionsAsync(admin.Id, exceptSid, "SuperAdminRevokedOperatorSessions");

        RecordAudit(
            action: "Platform Administrator Sessions Revoked",
            targetEntity: $"Operator: {admin.Email}",
            category: "Authentication",
            result: "Success",
            details: $"Revoked active sessions for SuperAdmin {admin.Email}.",
            extra: new { targetId = admin.Id });

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = $"Active sessions revoked for {admin.Email}." });
    }

    // =========================================================================
    // 6. ACTIVE SESSIONS
    // =========================================================================

    [HttpGet("sessions")]
    public async Task<ActionResult<List<PlatformSessionDto>>> GetSessions()
    {
        var currentSid = User.FindFirst("sid")?.Value;
        var now = DateTime.UtcNow;
        var sessions = await _context.UserSessions
            .AsNoTracking()
            .Where(s => !s.IsRevoked && s.ExpiresAtUtc > now)
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
                IsCurrentSession = s.Id == currentSid
            })
            .ToListAsync();

        return Ok(sessions);
    }

    [HttpPost("sessions/{id}/revoke")]
    public async Task<IActionResult> RevokeSession(string id)
    {
        var session = await _context.UserSessions.FirstOrDefaultAsync(s => s.Id == id);
        if (session == null)
        {
            return NotFound(new { message = "Session not found." });
        }

        await _sessionSecurity.RevokeSessionAsync(id, "PlatformAdminRevokedSession");

        RecordAudit(
            action: "Admin Session Revoked",
            targetEntity: $"Session: {session.AccountEmail}",
            category: "Authentication",
            result: "Success",
            details: $"Active session for {session.AccountEmail} ({session.IpAddress}) invalidated immediately.",
            extra: new { revokedSessionId = id, targetAccount = session.AccountEmail });

        await _context.SaveChangesAsync();

        _logger.LogInformation("Administrative session {SessionId} revoked by {ActorEmail}", id, GetActorEmail());
        return Ok(new { success = true, revokedSessionId = id });
    }

    // =========================================================================
    // 7. PLATFORM ANNOUNCEMENTS
    // =========================================================================

    private static PlatformAnnouncementDto MapAnnouncement(PlatformAnnouncement a)
    {
        var targets = new List<string>();
        if (!string.IsNullOrWhiteSpace(a.TargetCollegeIdsJson))
        {
            try
            {
                targets = JsonSerializer.Deserialize<List<string>>(a.TargetCollegeIdsJson) ?? new List<string>();
            }
            catch
            {
                targets = new List<string>();
            }
        }

        return new PlatformAnnouncementDto
        {
            Id = a.Id,
            Title = a.Title,
            Category = a.Category,
            Priority = a.Priority,
            ShortDescription = a.ShortDescription,
            FullMessage = a.FullMessage,
            TargetAudience = a.TargetAudience,
            TargetCollegeIds = targets,
            Status = a.Status,
            PublishDateUtc = a.PublishDateUtc,
            WithdrawnAtUtc = a.WithdrawnAtUtc,
            ArchivedAtUtc = a.ArchivedAtUtc,
            ArchiveReason = a.ArchiveReason,
            CreatedByEmail = a.CreatedByEmail,
            CreatedByName = a.CreatedByName,
            CreatedAtUtc = a.CreatedAtUtc,
            UpdatedAtUtc = a.UpdatedAtUtc
        };
    }

    private async Task<(bool IsValid, string Audience, List<string> CanonicalCollegeIds, string? ErrorMessage)> ResolveAndValidateAnnouncementAudienceAsync(
        string? requestedAudience,
        List<string>? requestedCollegeIds)
    {
        var audience = string.IsNullOrWhiteSpace(requestedAudience)
            ? "All Colleges"
            : requestedAudience.Trim();

        if (string.Equals(audience, "All Institutions", StringComparison.OrdinalIgnoreCase))
        {
            audience = "All Colleges";
        }
        else if (string.Equals(audience, "Selected Institutions", StringComparison.OrdinalIgnoreCase))
        {
            audience = "Selected Colleges";
        }

        if (audience != "All Colleges" && audience != "Active Colleges" && audience != "Selected Colleges")
        {
            return (false, audience, new List<string>(), "Unsupported target audience. Allowed values: All Colleges, Active Colleges, Selected Colleges.");
        }

        if (audience != "Selected Colleges")
        {
            return (true, audience, new List<string>(), null);
        }

        var rawTargets = (requestedCollegeIds ?? new List<string>())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (rawTargets.Count == 0)
        {
            return (false, audience, new List<string>(), "At least one valid college must be selected for Selected Colleges audience.");
        }

        var tenants = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(c => !c.IsDeleted)
            .Select(c => new { c.Id, c.TenantCode })
            .ToListAsync();

        var canonicalIds = new List<string>();
        var invalidTargets = new List<string>();

        foreach (var target in rawTargets)
        {
            var matched = Guid.TryParse(target, out var parsedGuid)
                ? tenants.FirstOrDefault(t => t.Id == parsedGuid)
                : tenants.FirstOrDefault(t => string.Equals(t.TenantCode, target, StringComparison.OrdinalIgnoreCase));

            if (matched == null)
            {
                invalidTargets.Add(target);
            }
            else
            {
                var idStr = matched.Id.ToString();
                if (!canonicalIds.Contains(idStr, StringComparer.OrdinalIgnoreCase))
                {
                    canonicalIds.Add(idStr);
                }
            }
        }

        if (invalidTargets.Count > 0)
        {
            return (false, audience, new List<string>(), $"Invalid or unknown college reference(s): {string.Join(", ", invalidTargets)}.");
        }

        return (true, audience, canonicalIds, null);
    }

    [HttpGet("announcements")]
    public async Task<ActionResult<List<PlatformAnnouncementDto>>> GetAnnouncements()
    {
        var items = await _context.PlatformAnnouncements
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(a => !a.IsDeleted)
            .OrderByDescending(a => a.CreatedAtUtc)
            .ToListAsync();

        return Ok(items.Select(MapAnnouncement).ToList());
    }

    [HttpPost("announcements")]
    public async Task<ActionResult<PlatformAnnouncementDto>> CreateAnnouncement([FromBody] SavePlatformAnnouncementRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.FullMessage))
        {
            return BadRequest(new { message = "Announcement title and message are required." });
        }

        var audienceResult = await ResolveAndValidateAnnouncementAudienceAsync(request.TargetAudience, request.TargetCollegeIds);
        if (!audienceResult.IsValid)
        {
            return BadRequest(new { message = audienceResult.ErrorMessage });
        }

        var isPublished = string.Equals(request.Status, "Published", StringComparison.OrdinalIgnoreCase);
        var fullMsg = request.FullMessage.Trim();
        var shortDesc = string.IsNullOrWhiteSpace(request.ShortDescription)
            ? (fullMsg.Length > 120 ? fullMsg[..120] + "..." : fullMsg)
            : request.ShortDescription.Trim();

        var item = new PlatformAnnouncement
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Category = string.IsNullOrWhiteSpace(request.Category) ? "Maintenance" : request.Category.Trim(),
            Priority = string.IsNullOrWhiteSpace(request.Priority) ? "Normal" : request.Priority.Trim(),
            ShortDescription = shortDesc,
            FullMessage = fullMsg,
            TargetAudience = audienceResult.Audience,
            TargetCollegeIdsJson = JsonSerializer.Serialize(audienceResult.CanonicalCollegeIds),
            Status = isPublished ? "Published" : "Draft",
            PublishDateUtc = isPublished ? DateTime.UtcNow : null,
            CreatedByEmail = GetActorEmail(),
            CreatedByName = GetActorName()
        };

        await _context.PlatformAnnouncements.AddAsync(item);

        RecordAudit(
            action: isPublished ? "Platform Announcement Published" : "Platform Announcement Drafted",
            targetEntity: $"Announcement: {item.Title}",
            category: "Platform Management",
            result: "Success",
            details: $"{(isPublished ? "Published" : "Saved draft")} announcement '{item.Title}' for {item.TargetAudience}.");

        await _context.SaveChangesAsync();
        return StatusCode(StatusCodes.Status201Created, MapAnnouncement(item));
    }

    [HttpPut("announcements/{id}")]
    public async Task<ActionResult<PlatformAnnouncementDto>> UpdateAnnouncement(Guid id, [FromBody] SavePlatformAnnouncementRequest request)
    {
        var item = await _context.PlatformAnnouncements
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);

        if (item == null) return NotFound(new { message = "Announcement not found." });
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.FullMessage))
        {
            return BadRequest(new { message = "Announcement title and message are required." });
        }

        var audienceResult = await ResolveAndValidateAnnouncementAudienceAsync(
            string.IsNullOrWhiteSpace(request.TargetAudience) ? item.TargetAudience : request.TargetAudience,
            request.TargetCollegeIds);
        if (!audienceResult.IsValid)
        {
            return BadRequest(new { message = audienceResult.ErrorMessage });
        }

        var fullMsg = request.FullMessage.Trim();
        item.Title = request.Title.Trim();
        item.Category = string.IsNullOrWhiteSpace(request.Category) ? item.Category : request.Category.Trim();
        item.Priority = string.IsNullOrWhiteSpace(request.Priority) ? item.Priority : request.Priority.Trim();
        item.FullMessage = fullMsg;
        item.ShortDescription = string.IsNullOrWhiteSpace(request.ShortDescription)
            ? (fullMsg.Length > 120 ? fullMsg[..120] + "..." : fullMsg)
            : request.ShortDescription.Trim();
        item.TargetAudience = audienceResult.Audience;
        item.TargetCollegeIdsJson = JsonSerializer.Serialize(audienceResult.CanonicalCollegeIds);

        if (string.Equals(request.Status, "Published", StringComparison.OrdinalIgnoreCase) && item.Status != "Published")
        {
            item.Status = "Published";
            item.PublishDateUtc ??= DateTime.UtcNow;
            item.WithdrawnAtUtc = null;
        }
        else if (string.Equals(request.Status, "Draft", StringComparison.OrdinalIgnoreCase))
        {
            item.Status = "Draft";
        }

        RecordAudit(
            action: "Platform Announcement Updated",
            targetEntity: $"Announcement: {item.Title}",
            category: "Platform Management",
            result: "Success",
            details: $"Updated announcement '{item.Title}'.");

        await _context.SaveChangesAsync();
        return Ok(MapAnnouncement(item));
    }

    [HttpPost("announcements/{id}/publish")]
    public async Task<ActionResult<PlatformAnnouncementDto>> PublishAnnouncement(Guid id)
    {
        var item = await _context.PlatformAnnouncements.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
        if (item == null) return NotFound(new { message = "Announcement not found." });

        item.Status = "Published";
        item.PublishDateUtc = DateTime.UtcNow;
        item.WithdrawnAtUtc = null;

        RecordAudit(
            action: "Platform Announcement Published",
            targetEntity: $"Announcement: {item.Title}",
            category: "Platform Management",
            result: "Success",
            details: $"Published announcement '{item.Title}'.");

        await _context.SaveChangesAsync();
        return Ok(MapAnnouncement(item));
    }

    [HttpPost("announcements/{id}/withdraw")]
    public async Task<ActionResult<PlatformAnnouncementDto>> WithdrawAnnouncement(Guid id)
    {
        var item = await _context.PlatformAnnouncements.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
        if (item == null) return NotFound(new { message = "Announcement not found." });

        item.Status = "Withdrawn";
        item.WithdrawnAtUtc = DateTime.UtcNow;

        RecordAudit(
            action: "Platform Announcement Withdrawn",
            targetEntity: $"Announcement: {item.Title}",
            category: "Platform Management",
            result: "Success",
            details: $"Withdrew announcement '{item.Title}' from active college view.");

        await _context.SaveChangesAsync();
        return Ok(MapAnnouncement(item));
    }

    [HttpPost("announcements/{id}/archive")]
    public async Task<ActionResult<PlatformAnnouncementDto>> ArchiveAnnouncement(Guid id, [FromBody] ArchiveAnnouncementRequest? request)
    {
        var item = await _context.PlatformAnnouncements.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
        if (item == null) return NotFound(new { message = "Announcement not found." });

        item.Status = "Archived";
        item.ArchivedAtUtc = DateTime.UtcNow;
        item.ArchiveReason = request?.Reason?.Trim();

        RecordAudit(
            action: "Platform Announcement Archived",
            targetEntity: $"Announcement: {item.Title}",
            category: "Platform Management",
            result: "Success",
            details: $"Archived announcement '{item.Title}'.");

        await _context.SaveChangesAsync();
        return Ok(MapAnnouncement(item));
    }

    [HttpDelete("announcements/{id}")]
    public async Task<IActionResult> DeleteAnnouncement(Guid id)
    {
        var item = await _context.PlatformAnnouncements.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);
        if (item == null) return NotFound(new { message = "Announcement not found." });

        item.IsDeleted = true;
        item.DeletedAtUtc = DateTime.UtcNow;

        RecordAudit(
            action: "Platform Announcement Deleted",
            targetEntity: $"Announcement: {item.Title}",
            category: "Platform Management",
            result: "Success",
            details: $"Soft-deleted announcement '{item.Title}'.");

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // =========================================================================
    // 8. SUPPORT DESK TICKETS
    // =========================================================================

    private static SupportTicketDto MapTicket(SupportTicket t) => new()
    {
        Id = t.Id,
        TicketNumber = t.TicketNumber,
        CollegeId = t.CollegeId,
        InstitutionName = t.InstitutionName,
        Subject = t.Subject,
        Description = t.Description,
        Category = t.Category,
        Priority = t.Priority,
        Status = t.Status,
        ReportedByName = t.ReportedByName,
        ReportedByEmail = t.ReportedByEmail,
        AssignedToName = t.AssignedToName,
        AssignedToEmail = t.AssignedToEmail,
        ResolutionNotes = t.ResolutionNotes,
        CreatedAtUtc = t.CreatedAtUtc,
        UpdatedAtUtc = t.UpdatedAtUtc,
        ResolvedAtUtc = t.ResolvedAtUtc,
        ClosedAtUtc = t.ClosedAtUtc,
        Messages = t.Messages
            .Where(m => !m.IsDeleted)
            .OrderBy(m => m.SentAtUtc)
            .Select(m => new SupportTicketMessageDto
            {
                Id = m.Id,
                TicketId = m.TicketId,
                SenderName = m.SenderName,
                SenderEmail = m.SenderEmail,
                SenderRole = m.SenderRole,
                Message = m.Message,
                IsInternalNote = m.IsInternalNote,
                SentAtUtc = m.SentAtUtc
            })
            .ToList()
    };

    [HttpGet("tickets")]
    public async Task<ActionResult<List<SupportTicketDto>>> GetSupportTickets()
    {
        var tickets = await _context.SupportTickets
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(t => t.Messages)
            .Where(t => !t.IsDeleted)
            .OrderByDescending(t => t.CreatedAtUtc)
            .ToListAsync();

        return Ok(tickets.Select(MapTicket).ToList());
    }

    [HttpPost("tickets")]
    public async Task<ActionResult<SupportTicketDto>> CreateSupportTicket([FromBody] CreateSupportTicketRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Subject) || string.IsNullOrWhiteSpace(request.Description))
        {
            return BadRequest(new { message = "Ticket subject and description are required." });
        }

        string institutionName = request.InstitutionName?.Trim() ?? string.Empty;
        if (request.CollegeId.HasValue && string.IsNullOrWhiteSpace(institutionName))
        {
            var tenant = await _context.CollegeTenants
                .IgnoreQueryFilters()
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == request.CollegeId.Value && !t.IsDeleted);
            institutionName = tenant?.Name ?? "Platform";
        }
        if (string.IsNullOrWhiteSpace(institutionName))
        {
            institutionName = "Platform Support";
        }

        var count = await _context.SupportTickets.IgnoreQueryFilters().CountAsync();
        var ticket = new SupportTicket
        {
            Id = Guid.NewGuid(),
            TicketNumber = $"TKT-{(1001 + count):D4}",
            CollegeId = request.CollegeId,
            InstitutionName = institutionName,
            Subject = request.Subject.Trim(),
            Description = request.Description.Trim(),
            Category = string.IsNullOrWhiteSpace(request.Category) ? "General Support" : request.Category.Trim(),
            Priority = string.IsNullOrWhiteSpace(request.Priority) ? "Medium" : request.Priority.Trim(),
            Status = "Open",
            ReportedByName = string.IsNullOrWhiteSpace(request.ReportedByName) ? GetActorName() : request.ReportedByName.Trim(),
            ReportedByEmail = string.IsNullOrWhiteSpace(request.ReportedByEmail) ? GetActorEmail() : request.ReportedByEmail.Trim()
        };

        await _context.SupportTickets.AddAsync(ticket);

        RecordAudit(
            action: "Support Ticket Created",
            targetEntity: $"{ticket.TicketNumber}: {ticket.Subject}",
            category: "Support Operations",
            result: "Success",
            details: $"Created support ticket {ticket.TicketNumber} for {ticket.InstitutionName}.",
            targetTenantId: ticket.CollegeId);

        await _context.SaveChangesAsync();
        return StatusCode(StatusCodes.Status201Created, MapTicket(ticket));
    }

    [HttpPost("tickets/{id}/reply")]
    public async Task<ActionResult<SupportTicketDto>> ReplySupportTicket(Guid id, [FromBody] ReplySupportTicketRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { message = "Message content is required." });
        }

        var ticket = await _context.SupportTickets
            .IgnoreQueryFilters()
            .Include(t => t.Messages)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (ticket == null) return NotFound(new { message = "Support ticket not found." });

        var msg = new SupportTicketMessage
        {
            Id = Guid.NewGuid(),
            TicketId = ticket.Id,
            SenderName = GetActorName(),
            SenderEmail = GetActorEmail(),
            SenderRole = "SuperAdmin",
            Message = request.Message.Trim(),
            IsInternalNote = request.IsInternalNote,
            SentAtUtc = DateTime.UtcNow
        };

        await _context.SupportTicketMessages.AddAsync(msg);
        if (!request.IsInternalNote && ticket.Status == "Open")
        {
            ticket.Status = "In Progress";
        }

        RecordAudit(
            action: request.IsInternalNote ? "Support Ticket Internal Note Added" : "Support Ticket Reply Sent",
            targetEntity: $"{ticket.TicketNumber}: {ticket.Subject}",
            category: "Support Operations",
            result: "Success",
            details: request.IsInternalNote
                ? $"Added internal operator note on ticket {ticket.TicketNumber}."
                : $"Sent reply on ticket {ticket.TicketNumber}.",
            targetTenantId: ticket.CollegeId);

        await _context.SaveChangesAsync();
        return Ok(MapTicket(ticket));
    }

    [HttpPut("tickets/{id}/status")]
    public async Task<ActionResult<SupportTicketDto>> UpdateSupportTicketStatus(Guid id, [FromBody] UpdateSupportTicketStatusRequest request)
    {
        var ticket = await _context.SupportTickets
            .IgnoreQueryFilters()
            .Include(t => t.Messages)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (ticket == null) return NotFound(new { message = "Support ticket not found." });
        if (string.IsNullOrWhiteSpace(request.Status)) return BadRequest(new { message = "Status is required." });

        ticket.Status = request.Status.Trim();
        if (ticket.Status == "Resolved") ticket.ResolvedAtUtc = DateTime.UtcNow;
        if (ticket.Status == "Closed") ticket.ClosedAtUtc = DateTime.UtcNow;

        RecordAudit(
            action: "Support Ticket Status Updated",
            targetEntity: $"{ticket.TicketNumber}: {ticket.Subject}",
            category: "Support Operations",
            result: "Success",
            details: $"Updated ticket {ticket.TicketNumber} status to {ticket.Status}.",
            targetTenantId: ticket.CollegeId);

        await _context.SaveChangesAsync();
        return Ok(MapTicket(ticket));
    }

    [HttpPut("tickets/{id}/priority")]
    public async Task<ActionResult<SupportTicketDto>> UpdateSupportTicketPriority(Guid id, [FromBody] UpdateSupportTicketPriorityRequest request)
    {
        var ticket = await _context.SupportTickets
            .IgnoreQueryFilters()
            .Include(t => t.Messages)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (ticket == null) return NotFound(new { message = "Support ticket not found." });
        if (string.IsNullOrWhiteSpace(request.Priority)) return BadRequest(new { message = "Priority is required." });

        ticket.Priority = request.Priority.Trim();

        RecordAudit(
            action: "Support Ticket Priority Updated",
            targetEntity: $"{ticket.TicketNumber}: {ticket.Subject}",
            category: "Support Operations",
            result: "Success",
            details: $"Updated ticket {ticket.TicketNumber} priority to {ticket.Priority}.",
            targetTenantId: ticket.CollegeId);

        await _context.SaveChangesAsync();
        return Ok(MapTicket(ticket));
    }

    [HttpPut("tickets/{id}/assign")]
    public async Task<ActionResult<SupportTicketDto>> AssignSupportTicket(Guid id, [FromBody] AssignSupportTicketRequest request)
    {
        var ticket = await _context.SupportTickets
            .IgnoreQueryFilters()
            .Include(t => t.Messages)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (ticket == null) return NotFound(new { message = "Support ticket not found." });

        ticket.AssignedToName = string.IsNullOrWhiteSpace(request.AssignedToName) ? null : request.AssignedToName.Trim();
        ticket.AssignedToEmail = string.IsNullOrWhiteSpace(request.AssignedToEmail) ? null : request.AssignedToEmail.Trim();

        RecordAudit(
            action: "Support Ticket Assigned",
            targetEntity: $"{ticket.TicketNumber}: {ticket.Subject}",
            category: "Support Operations",
            result: "Success",
            details: $"Assigned ticket {ticket.TicketNumber} to {ticket.AssignedToName ?? "Unassigned"}.",
            targetTenantId: ticket.CollegeId);

        await _context.SaveChangesAsync();
        return Ok(MapTicket(ticket));
    }

    [HttpPost("tickets/{id}/resolve")]
    public async Task<ActionResult<SupportTicketDto>> ResolveSupportTicket(Guid id, [FromBody] ResolveSupportTicketRequest? request)
    {
        var ticket = await _context.SupportTickets
            .IgnoreQueryFilters()
            .Include(t => t.Messages)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (ticket == null) return NotFound(new { message = "Support ticket not found." });

        ticket.Status = "Resolved";
        ticket.ResolvedAtUtc = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(request?.ResolutionNotes))
        {
            ticket.ResolutionNotes = request.ResolutionNotes.Trim();
        }

        RecordAudit(
            action: "Support Ticket Resolved",
            targetEntity: $"{ticket.TicketNumber}: {ticket.Subject}",
            category: "Support Operations",
            result: "Success",
            details: $"Resolved ticket {ticket.TicketNumber}.",
            targetTenantId: ticket.CollegeId);

        await _context.SaveChangesAsync();
        return Ok(MapTicket(ticket));
    }

    [HttpPost("tickets/{id}/close")]
    public async Task<ActionResult<SupportTicketDto>> CloseSupportTicket(Guid id)
    {
        var ticket = await _context.SupportTickets
            .IgnoreQueryFilters()
            .Include(t => t.Messages)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (ticket == null) return NotFound(new { message = "Support ticket not found." });

        ticket.Status = "Closed";
        ticket.ClosedAtUtc = DateTime.UtcNow;

        RecordAudit(
            action: "Support Ticket Closed",
            targetEntity: $"{ticket.TicketNumber}: {ticket.Subject}",
            category: "Support Operations",
            result: "Success",
            details: $"Closed ticket {ticket.TicketNumber}.",
            targetTenantId: ticket.CollegeId);

        await _context.SaveChangesAsync();
        return Ok(MapTicket(ticket));
    }

    // =========================================================================
    // 9. EMAIL OUTBOX OBSERVABILITY & RECOVERY (SUPER ADMIN ONLY)
    // =========================================================================

    [HttpGet("email-outbox")]
    public async Task<IActionResult> GetEmailOutboxStatus(
        [FromQuery] string? status = null,
        [FromQuery] int limit = 50)
    {
        var metrics = HttpContext.RequestServices.GetRequiredService<ProjectHub.Infrastructure.Services.EmailOutboxMetrics>();
        var take = Math.Clamp(limit, 1, 200);
        var now = DateTime.UtcNow;

        var baseQuery = _context.EmailOutboxMessages
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(m => !m.IsDeleted);

        var pendingCount = await baseQuery.CountAsync(m => m.Status == EmailOutboxStatus.Pending);
        var processingCount = await baseQuery.CountAsync(m => m.Status == EmailOutboxStatus.Processing);
        var sentCount = await baseQuery.CountAsync(m => m.Status == EmailOutboxStatus.Sent);
        var failedCount = await baseQuery.CountAsync(m => m.Status == EmailOutboxStatus.Failed);
        var expiredCount = await baseQuery.CountAsync(m => m.Status == EmailOutboxStatus.Expired);

        var oldestPending = await baseQuery
            .Where(m => m.Status == EmailOutboxStatus.Pending)
            .OrderBy(m => m.CreatedAtUtc)
            .Select(m => (DateTime?)m.CreatedAtUtc)
            .FirstOrDefaultAsync();

        var filteredQuery = baseQuery;
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<EmailOutboxStatus>(status.Trim(), true, out var parsedStatus))
        {
            filteredQuery = filteredQuery.Where(m => m.Status == parsedStatus);
        }

        // Never project EncryptedPayload or sensitive tokens
        var items = await filteredQuery
            .OrderByDescending(m => m.CreatedAtUtc)
            .Take(take)
            .Select(m => new
            {
                m.Id,
                m.EmailType,
                m.RecipientEmail,
                m.CollegeId,
                Status = m.Status.ToString(),
                m.AttemptCount,
                m.MaxAttempts,
                m.NextAttemptAtUtc,
                m.LastAttemptAtUtc,
                m.SentAtUtc,
                m.ExpiresAtUtc,
                m.LastError,
                m.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(new
        {
            worker = new
            {
                metrics.IsRunning,
                metrics.LastPollAtUtc,
                metrics.LastSuccessAtUtc,
                metrics.QueuedCount,
                metrics.SentCount,
                metrics.RetryCount,
                metrics.FailedCount,
                metrics.ExpiredCount,
                metrics.WorkerErrorCount
            },
            queue = new
            {
                pendingCount,
                processingCount,
                sentCount,
                failedCount,
                expiredCount,
                oldestPendingAgeSeconds = oldestPending.HasValue ? Math.Max(0, (int)(now - oldestPending.Value).TotalSeconds) : 0
            },
            items
        });
    }

    [HttpPost("email-outbox/{id}/retry")]
    public async Task<IActionResult> RetryEmailOutboxMessage(Guid id)
    {
        var item = await _context.EmailOutboxMessages
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted);

        if (item == null)
        {
            return NotFound(new { message = "Email outbox record not found." });
        }

        if (item.ExpiresAtUtc <= DateTime.UtcNow || item.Status == EmailOutboxStatus.Expired)
        {
            return BadRequest(new { message = "Cannot retry an expired security email. Ask the user or admin to issue a new request." });
        }

        if (item.Status == EmailOutboxStatus.Sent)
        {
            return BadRequest(new { message = "This email has already been sent." });
        }

        if (string.IsNullOrWhiteSpace(item.EncryptedPayload))
        {
            return BadRequest(new { message = "Email payload is no longer available for retry." });
        }

        item.Status = EmailOutboxStatus.Pending;
        item.NextAttemptAtUtc = DateTime.UtcNow;
        item.LockedBy = null;
        item.LockedUntilUtc = null;
        item.MaxAttempts = Math.Max(item.MaxAttempts, item.AttemptCount + 3);
        item.LastError = null;

        RecordAudit(
            action: "Email Outbox Message Retried",
            targetEntity: $"Outbox: {item.Id} ({item.EmailType})",
            category: "System Operations",
            result: "Success",
            details: $"Manually re-queued {item.EmailType} email for {item.RecipientEmail}.",
            targetTenantId: item.CollegeId);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            id = item.Id,
            status = item.Status.ToString(),
            nextAttemptAtUtc = item.NextAttemptAtUtc
        });
    }
}
