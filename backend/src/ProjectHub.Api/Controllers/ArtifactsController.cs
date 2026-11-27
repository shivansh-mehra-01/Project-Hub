using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectHub.Api.Authorization;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;

namespace ProjectHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ArtifactsController : ControllerBase
{
    private readonly ProjectHubDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly IFileStorageService _fileStorageService;

    public ArtifactsController(
        ProjectHubDbContext context,
        ITenantContext tenantContext,
        IFileStorageService fileStorageService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _fileStorageService = fileStorageService;
    }

    private static string SanitizeDownloadFileName(string? rawName, string fallback)
    {
        var name = Path.GetFileName(rawName ?? string.Empty);
        if (string.IsNullOrWhiteSpace(name)) return fallback;

        var invalid = Path.GetInvalidFileNameChars();
        var cleaned = new string(name
            .Where(c => !char.IsControl(c) && c != '"' && c != ';' && !invalid.Contains(c))
            .ToArray())
            .Trim();

        return string.IsNullOrWhiteSpace(cleaned) ? fallback : cleaned;
    }

    private async Task<bool> IsUserAuthorizedToDownloadAsync(Guid userId, ProjectTeam team, CancellationToken cancellationToken)
    {
        if (_tenantContext.IsSuperAdmin || _tenantContext.Role == UserRole.SuperAdmin || _tenantContext.Role == UserRole.CollegeAdmin)
        {
            return true;
        }

        if (_tenantContext.Role == UserRole.HOD && _tenantContext.DepartmentId == team.DepartmentId)
        {
            return true;
        }

        // Assigned guide
        if (team.GuideUserId == userId)
        {
            return true;
        }

        // Team member
        var isMember = await _context.TeamMembers
            .AnyAsync(m => m.ProjectTeamId == team.Id && m.UserId == userId && m.IsActive && !m.IsDeleted, cancellationToken);
        if (isMember)
        {
            return true;
        }

        // Panel evaluator: check if userId is an evaluator for a VivaPanel in this team's department and track
        var isEvaluator = await _context.VivaPanelEvaluators
            .Include(e => e.VivaPanel)
            .AnyAsync(e => e.EvaluatorUserId == userId &&
                           e.VivaPanel != null &&
                           e.VivaPanel.DepartmentId == team.DepartmentId &&
                           e.VivaPanel.AcademicTrackId == team.AcademicTrackId &&
                           !e.IsDeleted, cancellationToken);
        if (isEvaluator)
        {
            return true;
        }

        return false;
    }

    [HttpGet("{artifactId}/download")]
    public async Task<IActionResult> DownloadArtifact(Guid artifactId, CancellationToken cancellationToken)
    {
        var collegeId = _tenantContext.CollegeId;
        var userId = _tenantContext.UserId;
        if (collegeId == null || userId == null) return Unauthorized(new { message = "Authenticated college tenant identity required." });

        var artifact = await _context.TeamArtifacts
            .Include(a => a.ProjectTeam)
            .FirstOrDefaultAsync(a => a.Id == artifactId && a.CollegeId == collegeId.Value && !a.IsDeleted, cancellationToken);

        if (artifact == null)
        {
            return NotFound(new { message = "Artifact deliverable not found." });
        }

        if (artifact.ProjectTeam != null)
        {
            var isAuthorized = await IsUserAuthorizedToDownloadAsync(userId.Value, artifact.ProjectTeam, cancellationToken);
            if (!isAuthorized)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You are not authorized to download deliverables for this project team." });
            }
        }

        try
        {
            var (stream, contentType) = await _fileStorageService.OpenReadAsync(artifact.StorageKey, cancellationToken);
            var downloadName = SanitizeDownloadFileName(artifact.FileName, $"{artifact.SlotType}.pdf");

            return File(stream, contentType, downloadName);
        }
        catch (FileNotFoundException)
        {
            return NotFound(new { message = "Artifact file not found in storage." });
        }
    }

    [HttpGet("team/{teamId}/slot/{slot}/download")]
    public async Task<IActionResult> DownloadArtifactBySlot(Guid teamId, string slot, CancellationToken cancellationToken)
    {
        var collegeId = _tenantContext.CollegeId;
        var userId = _tenantContext.UserId;
        if (collegeId == null || userId == null) return Unauthorized(new { message = "Authenticated college tenant identity required." });

        if (!Enum.TryParse<ArtifactSlotType>(slot, true, out var slotType))
        {
            return BadRequest(new { message = $"Invalid slot type '{slot}'." });
        }

        var artifact = await _context.TeamArtifacts
            .Include(a => a.ProjectTeam)
            .FirstOrDefaultAsync(a => a.ProjectTeamId == teamId && a.SlotType == slotType && a.CollegeId == collegeId.Value && !a.IsDeleted, cancellationToken);

        if (artifact == null)
        {
            return NotFound(new { message = $"Artifact for slot '{slot}' not found." });
        }

        if (artifact.ProjectTeam != null)
        {
            var isAuthorized = await IsUserAuthorizedToDownloadAsync(userId.Value, artifact.ProjectTeam, cancellationToken);
            if (!isAuthorized)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You are not authorized to download deliverables for this project team." });
            }
        }

        try
        {
            var (stream, contentType) = await _fileStorageService.OpenReadAsync(artifact.StorageKey, cancellationToken);
            var downloadName = SanitizeDownloadFileName(artifact.FileName, $"{artifact.SlotType}.pdf");

            return File(stream, contentType, downloadName);
        }
        catch (FileNotFoundException)
        {
            return NotFound(new { message = "Artifact file not found in storage." });
        }
    }

    [HttpPost("{artifactId}/review")]
    [Authorize(Policy = ProjectHubPolicies.FacultyOrAbove)]
    public async Task<IActionResult> ReviewArtifact(Guid artifactId, [FromBody] ReviewArtifactRequest request, CancellationToken cancellationToken)
    {
        var reviewerId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var artifact = await _context.TeamArtifacts
            .Include(a => a.ProjectTeam)
            .FirstOrDefaultAsync(a => a.Id == artifactId && a.CollegeId == collegeId && !a.IsDeleted, cancellationToken);

        if (artifact == null)
        {
            return NotFound(new { message = "Artifact deliverable not found." });
        }

        if (artifact.Status == ArtifactStatus.Missing)
        {
            return BadRequest(new { message = "Cannot review an artifact deliverable that has not been submitted." });
        }

        var isGuide = artifact.ProjectTeam?.GuideUserId == reviewerId;
        var isDeptHod = _tenantContext.Role == UserRole.HOD && _tenantContext.DepartmentId == artifact.ProjectTeam?.DepartmentId;
        var isCollegeAdmin = _tenantContext.Role == UserRole.CollegeAdmin;
        if (!isGuide && !isDeptHod && !isCollegeAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the assigned faculty guide or authorized department authority can review project deliverables." });
        }

        artifact.Status = request.IsApproved ? ArtifactStatus.Verified : ArtifactStatus.RevisionRequested;
        artifact.VerifiedByUserId = reviewerId;
        artifact.ReviewerNote = request.ReviewerNote?.Trim();
        artifact.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            artifactId = artifact.Id,
            status = artifact.Status.ToString(),
            reviewerNote = artifact.ReviewerNote
        });
    }
}

public record ReviewArtifactRequest
{
    public bool IsApproved { get; init; }
    public string? ReviewerNote { get; init; }
}
