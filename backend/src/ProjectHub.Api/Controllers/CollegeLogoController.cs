using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectHub.Application.Interfaces;

namespace ProjectHub.Api.Controllers;

[ApiController]
[Route("api/college/logo")]
[Authorize]
public class CollegeLogoController : ControllerBase
{
    private readonly ITenantContext _tenantContext;
    private readonly IWebHostEnvironment _environment;

    public CollegeLogoController(ITenantContext tenantContext, IWebHostEnvironment environment)
    {
        _tenantContext = tenantContext;
        _environment = environment;
    }

    [HttpGet]
    public async Task<IActionResult> GetLogo()
    {
        if (!_tenantContext.CollegeId.HasValue)
        {
            return NotFound();
        }

        var logoDir = Path.Combine(_environment.ContentRootPath, "App_Data", "college-logos", _tenantContext.CollegeId.Value.ToString("N"));
        if (!Directory.Exists(logoDir))
        {
            return NotFound();
        }

        var filePath = Directory.GetFiles(logoDir, "logo.*").FirstOrDefault();
        if (filePath == null)
        {
            return NotFound();
        }

        var ext = Path.GetExtension(filePath).ToLowerInvariant();
        var contentType = ext switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };

        var bytes = await System.IO.File.ReadAllBytesAsync(filePath);
        return File(bytes, contentType);
    }
}
