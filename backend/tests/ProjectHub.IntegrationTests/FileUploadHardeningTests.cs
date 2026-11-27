using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using ProjectHub.Infrastructure.Services;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class FileUploadHardeningTests : IDisposable
{
    private readonly string _tempRoot;
    private readonly LocalDiskStorageService _storage;

    public FileUploadHardeningTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"colabex-vault-test-{Guid.NewGuid():N}");
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Vault:StoragePath"] = _tempRoot
        }).Build();
        _storage = new LocalDiskStorageService(config, NullLogger<LocalDiskStorageService>.Instance);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempRoot))
        {
            Directory.Delete(_tempRoot, recursive: true);
        }
    }

    [Fact]
    public async Task SaveAsync_MismatchedMagicBytes_ThrowsArgumentException_AndLeavesNoFile()
    {
        using var fakePdf = new MemoryStream(System.Text.Encoding.ASCII.GetBytes("MZ\x90\x00ThisIsNotAPdf"));
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _storage.SaveAsync(Guid.NewGuid(), Guid.NewGuid(), "Synopsis", "report.pdf", fakePdf));

        Assert.Empty(Directory.GetFiles(_tempRoot, "*", SearchOption.AllDirectories));
    }

    [Fact]
    public async Task SaveAsync_ValidPdf_GeneratesUniqueServerFilename_WithoutOverwriting()
    {
        var collegeId = Guid.NewGuid();
        var teamId = Guid.NewGuid();
        var pdfBytes = System.Text.Encoding.ASCII.GetBytes("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");

        using var s1 = new MemoryStream(pdfBytes);
        using var s2 = new MemoryStream(pdfBytes);

        var r1 = await _storage.SaveAsync(collegeId, teamId, "Synopsis", "same.pdf", s1);
        var r2 = await _storage.SaveAsync(collegeId, teamId, "Synopsis", "same.pdf", s2);

        Assert.NotEqual(r1.StorageKey, r2.StorageKey);
        Assert.True(await _storage.FileExistsAsync(r1.StorageKey));
        Assert.True(await _storage.FileExistsAsync(r2.StorageKey));
    }

    [Fact]
    public async Task SaveAsync_InvalidSlotType_ThrowsArgumentException()
    {
        var pdfBytes = System.Text.Encoding.ASCII.GetBytes("%PDF-1.4\n%%EOF");
        using var s = new MemoryStream(pdfBytes);
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _storage.SaveAsync(Guid.NewGuid(), Guid.NewGuid(), "../evil", "doc.pdf", s));
    }

    [Fact]
    public void GetPhysicalPath_PathTraversal_ThrowsUnauthorizedAccessException()
    {
        Assert.Throws<UnauthorizedAccessException>(() =>
            _storage.GetPhysicalPath("vault/../../etc/passwd"));
    }
}
