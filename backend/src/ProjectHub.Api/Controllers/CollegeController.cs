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
[Authorize(Policy = ProjectHubPolicies.CollegeAdminOnly)]
public class CollegeController : ControllerBase
{
    private readonly ProjectHubDbContext _context;
    private readonly ITenantContext _tenantContext;

    public CollegeController(ProjectHubDbContext context, ITenantContext tenantContext)
    {
        _context = context;
        _tenantContext = tenantContext;
    }

    [HttpGet("overview")]
    public async Task<ActionResult<CollegeOverviewDto>> GetOverview()
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var college = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == collegeId.Value && !c.IsDeleted);

        if (college == null) return NotFound(new { message = "College tenant record not found." });

        var deptCount = await _context.Departments.CountAsync(d => !d.IsDeleted);
        var studentCount = await _context.Users.CountAsync(u => u.Role == UserRole.Student && !u.IsDeleted);
        var facultyCount = await _context.Users.CountAsync(u => u.Role == UserRole.Faculty && !u.IsDeleted);
        var projectCount = await _context.ProjectTeams.CountAsync(t => !t.IsDeleted);

        return Ok(new CollegeOverviewDto
        {
            CollegeId = college.Id,
            CollegeName = college.Name,
            TenantCode = college.TenantCode,
            TotalDepartments = deptCount,
            TotalStudents = studentCount,
            TotalFaculty = facultyCount,
            TotalProjects = projectCount,
            Criterion3AttainmentPct = 81.5m,
            StrictSsoEnforced = college.EnforceStrictSso
        });
    }

    [HttpGet("departments")]
    public async Task<ActionResult<List<DepartmentDto>>> GetDepartments()
    {
        var departments = await _context.Departments
            .Include(d => d.HodUser)
            .Where(d => !d.IsDeleted)
            .OrderBy(d => d.Code)
            .Select(d => new DepartmentDto
            {
                Id = d.Id,
                CollegeId = d.CollegeId,
                Code = d.Code,
                Name = d.Name,
                HodUserId = d.HodUserId,
                HodName = d.HodUser != null ? d.HodUser.FullName : null,
                IntakeQuota = d.IntakeQuota,
                StudentCount = d.Users.Count(u => u.Role == UserRole.Student && !u.IsDeleted),
                FacultyCount = d.Users.Count(u => u.Role == UserRole.Faculty && !u.IsDeleted),
                IsSarAttested = d.IsSarAttested,
                SarAttestedAtUtc = d.SarAttestedAtUtc
            })
            .ToListAsync();

        return Ok(departments);
    }

    [HttpPost("departments")]
    public async Task<ActionResult<DepartmentDto>> CreateDepartment([FromBody] CreateDepartmentRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var code = request.Code.Trim().ToUpperInvariant();

        var exists = await _context.Departments.AnyAsync(d => d.Code == code && !d.IsDeleted);
        if (exists) return Conflict(new { message = $"Department with code '{code}' already exists." });

        var department = new Department
        {
            CollegeId = collegeId,
            Code = code,
            Name = request.Name.Trim(),
            IntakeQuota = request.IntakeQuota
        };

        await _context.Departments.AddAsync(department);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetDepartments), new { id = department.Id }, new DepartmentDto
        {
            Id = department.Id,
            CollegeId = department.CollegeId,
            Code = department.Code,
            Name = department.Name,
            IntakeQuota = department.IntakeQuota
        });
    }

    [HttpPut("departments/{id}/hod")]
    public async Task<IActionResult> AppointHod(Guid id, [FromBody] AppointHodRequest request)
    {
        var department = await _context.Departments.FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);
        if (department == null) return NotFound(new { message = "Department not found." });

        var faculty = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.HodUserId && !u.IsDeleted);
        if (faculty == null) return NotFound(new { message = "Appointed faculty user not found." });

        // Promote user role to HOD and assign to department
        faculty.Role = UserRole.HOD;
        faculty.DepartmentId = department.Id;

        department.HodUserId = faculty.Id;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("tracks")]
    public async Task<ActionResult<List<CollegeTrackDto>>> GetTracks()
    {
        var tracks = await _context.AcademicTracks
            .Include(t => t.Department)
            .Where(t => !t.IsDeleted)
            .OrderByDescending(t => t.AcademicYear)
            .ThenBy(t => t.Name)
            .Select(t => new CollegeTrackDto
            {
                Id = t.Id,
                CollegeId = t.CollegeId,
                DepartmentId = t.DepartmentId,
                DepartmentCode = t.Department != null ? t.Department.Code : null,
                Name = t.Name,
                AcademicYear = t.AcademicYear,
                AllowInterdisciplinaryTeams = t.AllowInterdisciplinaryTeams,
                IsActive = t.IsActive,
                ProposalDeadlineUtc = t.ProposalDeadlineUtc,
                FinalSubmissionDeadlineUtc = t.FinalSubmissionDeadlineUtc,
                GuideWeightPct = t.GuideWeightPct,
                MidTermWeightPct = t.MidTermWeightPct,
                FinalVivaWeightPct = t.FinalVivaWeightPct,
                SharedProjectRubricPct = t.SharedProjectRubricPct,
                IndividualStudentRubricPct = t.IndividualStudentRubricPct
            })
            .ToListAsync();

        return Ok(tracks);
    }

    [HttpPost("tracks")]
    public async Task<ActionResult<CollegeTrackDto>> CreateCollegeTrackSession([FromBody] CreateCollegeTrackRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;

        var track = new AcademicTrack
        {
            CollegeId = collegeId,
            DepartmentId = null, // Overarching college session
            Name = request.Name.Trim(),
            AcademicYear = request.AcademicYear.Trim(),
            AllowInterdisciplinaryTeams = request.AllowInterdisciplinaryTeams,
            ProposalDeadlineUtc = request.ProposalDeadlineUtc,
            FinalSubmissionDeadlineUtc = request.FinalSubmissionDeadlineUtc,
            GuideWeightPct = request.GuideWeightPct,
            MidTermWeightPct = request.MidTermWeightPct,
            FinalVivaWeightPct = request.FinalVivaWeightPct,
            SharedProjectRubricPct = request.SharedProjectRubricPct,
            IndividualStudentRubricPct = request.IndividualStudentRubricPct
        };

        track.ValidateWeights();
        await _context.AcademicTracks.AddAsync(track);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTracks), new { id = track.Id }, new CollegeTrackDto
        {
            Id = track.Id,
            CollegeId = track.CollegeId,
            DepartmentId = track.DepartmentId,
            Name = track.Name,
            AcademicYear = track.AcademicYear,
            AllowInterdisciplinaryTeams = track.AllowInterdisciplinaryTeams,
            IsActive = track.IsActive
        });
    }

    [HttpGet("settings")]
    public async Task<ActionResult<CollegeSettingsDto>> GetSettings()
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var college = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == collegeId && !c.IsDeleted);

        if (college == null) return NotFound();

        return Ok(new CollegeSettingsDto
        {
            Id = college.Id,
            Name = college.Name,
            TenantCode = college.TenantCode,
            SsoDomain = college.SsoDomain,
            EnforceStrictSso = college.EnforceStrictSso,
            CrestUrl = college.CrestUrl,
            PrincipalSealUrl = college.PrincipalSealUrl,
            StorageQuotaGb = college.StorageQuotaGb
        });
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateCollegeSettingsRequest request)
    {
        var collegeId = _tenantContext.CollegeId!.Value;
        var college = await _context.CollegeTenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == collegeId && !c.IsDeleted);

        if (college == null) return NotFound();

        if (request.Name != null) college.Name = request.Name.Trim();
        if (request.EnforceStrictSso.HasValue) college.EnforceStrictSso = request.EnforceStrictSso.Value;
        if (request.CrestUrl != null) college.CrestUrl = request.CrestUrl;
        if (request.PrincipalSealUrl != null) college.PrincipalSealUrl = request.PrincipalSealUrl;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("compliance/sign-off")]
    public async Task<IActionResult> SignOffCompliance([FromBody] SignOffComplianceRequest request)
    {
        var departments = await _context.Departments.Where(d => !d.IsDeleted).ToListAsync();
        var utcNow = DateTime.UtcNow;
        var userId = _tenantContext.UserId;

        foreach (var dept in departments)
        {
            dept.IsSarAttested = true;
            dept.SarAttestedAtUtc = utcNow;
            dept.SarAttestedByUserId = userId;
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, attestedDepartmentsCount = departments.Count, signedAtUtc = utcNow });
    }
}
