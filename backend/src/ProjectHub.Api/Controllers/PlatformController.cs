using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectHub.Api.Authorization;
using ProjectHub.Application.Common.Models;
using ProjectHub.Domain.Entities;
using ProjectHub.Infrastructure.Persistence;

namespace ProjectHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = ProjectHubPolicies.SuperAdminOnly)]
public class PlatformController : ControllerBase
{
    private readonly ProjectHubDbContext _context;

    public PlatformController(ProjectHubDbContext context)
    {
        _context = context;
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
                AdminEmails = t.Users.Where(u => u.Role == Domain.Enums.UserRole.CollegeAdmin && !u.IsDeleted).Select(u => u.Email).ToList()
            })
            .ToListAsync();

        return Ok(tenants);
    }

    [HttpPost("tenants")]
    public async Task<ActionResult<CreateTenantResponse>> CreateTenant([FromBody] CreateTenantRequest request)
    {
        var code = request.TenantCode.Trim().ToUpperInvariant();
        var domain = request.SsoDomain.Trim().ToLowerInvariant();

        var exists = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .AnyAsync(t => (t.TenantCode == code || t.SsoDomain == domain) && !t.IsDeleted);

        if (exists)
        {
            return Conflict(new { message = "A college tenant with the same code or SSO domain already exists." });
        }

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
            IsActive = true
        };

        await _context.CollegeTenants.AddAsync(tenant);

        var defaultPasswordHash = Infrastructure.Security.PasswordHelper.HashPassword("Pass@1234");
        var principalUser = new UserAccount
        {
            CollegeId = tenant.Id,
            FullName = principalName,
            Email = principalEmail,
            EnrollmentOrEmployeeCode = $"EMP-{code}-001",
            Role = Domain.Enums.UserRole.CollegeAdmin,
            PasswordHash = defaultPasswordHash,
            IsActivated = true,
            IsActive = true
        };

        await _context.Users.AddAsync(principalUser);

        await _context.SaveChangesAsync();

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
            AdminEmails = new List<string> { principalEmail }
        };

        return StatusCode(StatusCodes.Status201Created, new CreateTenantResponse
        {
            Tenant = tenantDto,
            AdminEmail = principalEmail
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
    public async Task<ActionResult<List<PlatformAuditLogDto>>> GetAuditLogs([FromQuery] int take = 50)
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
}
