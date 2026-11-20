using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectHub.Application.Interfaces;
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

    [HttpGet("{artifactId}/download")]
    public async Task<IActionResult> DownloadArtifact(Guid artifactId, CancellationToken cancellationToken)
    {
        var collegeId = _tenantContext.CollegeId;
        if (collegeId == null) return Unauthorized(new { message = "College tenant identity required." });

        var artifact = await _context.TeamArtifacts
            .Include(a => a.ProjectTeam)
            .FirstOrDefaultAsync(a => a.Id == artifactId && a.CollegeId == collegeId.Value && !a.IsDeleted, cancellationToken);

        if (artifact == null)
        {
            return NotFound(new { message = "Artifact deliverable not found." });
        }

        var (stream, contentType) = await _fileStorageService.OpenReadAsync(artifact.StorageKey, cancellationToken);
        var downloadName = !string.IsNullOrWhiteSpace(artifact.FileName) ? artifact.FileName : $"{artifact.SlotType}.pdf";

        Response.Headers.Append("Content-Disposition", $"attachment; filename=\"{downloadName}\"");
        return File(stream, contentType, downloadName);
    }

    [HttpGet("team/{teamId}/slot/{slot}/download")]
    public async Task<IActionResult> DownloadArtifactBySlot(Guid teamId, string slot, CancellationToken cancellationToken)
    {
        var collegeId = _tenantContext.CollegeId;
        if (collegeId == null) return Unauthorized(new { message = "College tenant identity required." });

        if (!Enum.TryParse<ArtifactSlotType>(slot, true, out var slotType))
        {
            return BadRequest(new { message = $"Invalid slot type '{slot}'." });
        }

        var artifact = await _context.TeamArtifacts
            .FirstOrDefaultAsync(a => a.ProjectTeamId == teamId && a.SlotType == slotType && a.CollegeId == collegeId.Value && !a.IsDeleted, cancellationToken);

        if (artifact == null)
        {
            return NotFound(new { message = $"Artifact for slot '{slot}' not found." });
        }

        var (stream, contentType) = await _fileStorageService.OpenReadAsync(artifact.StorageKey, cancellationToken);
        var downloadName = !string.IsNullOrWhiteSpace(artifact.FileName) ? artifact.FileName : $"{artifact.SlotType}.pdf";

        Response.Headers.Append("Content-Disposition", $"attachment; filename=\"{downloadName}\"");
        return File(stream, contentType, downloadName);
    }

    [HttpPost("{artifactId}/review")]
    public async Task<IActionResult> ReviewArtifact(Guid artifactId, [FromBody] ReviewArtifactRequest request, CancellationToken cancellationToken)
    {
        var reviewerId = _tenantContext.UserId!.Value;
        var collegeId = _tenantContext.CollegeId!.Value;

        var artifact = await _context.TeamArtifacts
            .FirstOrDefaultAsync(a => a.Id == artifactId && a.CollegeId == collegeId && !a.IsDeleted, cancellationToken);

        if (artifact == null)
        {
            return NotFound(new { message = "Artifact not found." });
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
