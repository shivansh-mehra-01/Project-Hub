using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ProjectHub.Application.Interfaces;

namespace ProjectHub.Infrastructure.Services;

public class LocalDiskStorageService : IFileStorageService
{
    private readonly string _baseStoragePath;
    private readonly ILogger<LocalDiskStorageService> _logger;
    private readonly IConfiguration _configuration;
    private const long MaxFileSizeBytes = 25 * 1024 * 1024; // 25 MB (26,214,400 bytes)

    private static readonly HashSet<string> PermittedVaultExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf",
        ".pptx",
        ".ppt"
    };

    private static readonly Dictionary<string, string> MimeTypeMap = new(StringComparer.OrdinalIgnoreCase)
    {
        { ".pdf", "application/pdf" },
        { ".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
        { ".ppt", "application/vnd.ms-powerpoint" },
        { ".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
        { ".doc", "application/msword" },
        { ".zip", "application/zip" },
        { ".txt", "text/plain" },
        { ".csv", "text/csv" }
    };

    public LocalDiskStorageService(IConfiguration configuration, ILogger<LocalDiskStorageService> logger)
    {
        _logger = logger;
        _configuration = configuration;

        // Cloud Provider Hook:
        // When configuration key "Vault:Provider" is set to "S3" or "CloudflareR2",
        // the application can instantiate an AmazonS3Client or AWSS3CompatibleClient
        // with credentials from "Vault:S3:AccessKey", "Vault:S3:SecretKey", "Vault:S3:ServiceUrl".
        var configuredPath = configuration["Vault:StoragePath"];
        _baseStoragePath = !string.IsNullOrWhiteSpace(configuredPath)
            ? Path.GetFullPath(configuredPath)
            : Path.Combine(Directory.GetCurrentDirectory(), "App_Data", "vault");

        if (!Directory.Exists(_baseStoragePath))
        {
            Directory.CreateDirectory(_baseStoragePath);
        }
    }

    public async Task<(string StorageKey, string Sha256Checksum, long FileSizeBytes)> SaveAsync(
        Guid collegeId,
        Guid teamId,
        string slotType,
        string originalFileName,
        Stream content,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(content);

        // Sanitize file name
        var sanitizedFileName = Path.GetFileName(originalFileName);
        if (string.IsNullOrWhiteSpace(sanitizedFileName))
        {
            sanitizedFileName = $"{slotType}.pdf";
        }

        var ext = Path.GetExtension(sanitizedFileName).ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(ext))
        {
            ext = ".pdf";
            sanitizedFileName += ext;
        }

        // Enforce strict MIME & extension validation (.pdf, .ppt, .pptx only)
        if (!PermittedVaultExtensions.Contains(ext))
        {
            throw new ArgumentException(
                $"Invalid deliverable extension '{ext}'. Only .pdf, .ppt, and .pptx files are permitted in the capstone document vault.");
        }

        var sanitizedSlot = slotType.Trim().Replace("..", "").Replace("/", "").Replace("\\", "");
        var relativeDir = Path.Combine(collegeId.ToString("D"), teamId.ToString("D"), sanitizedSlot);
        var targetDir = Path.Combine(_baseStoragePath, relativeDir);

        if (!Directory.Exists(targetDir))
        {
            Directory.CreateDirectory(targetDir);
        }

        var targetFilePath = Path.Combine(targetDir, sanitizedFileName);

        using var sha256 = SHA256.Create();
        long totalBytes = 0;

        await using (var outputStream = new FileStream(targetFilePath, FileMode.Create, FileAccess.Write, FileShare.None, 81920, true))
        {
            var buffer = new byte[81920];
            int bytesRead;

            while ((bytesRead = await content.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken)) > 0)
            {
                totalBytes += bytesRead;
                if (totalBytes > MaxFileSizeBytes)
                {
                    outputStream.Close();
                    File.Delete(targetFilePath);
                    throw new InvalidOperationException($"File exceeds maximum allowed upload size of 25 MB (attempted: {totalBytes / (1024 * 1024)} MB).");
                }

                sha256.TransformBlock(buffer, 0, bytesRead, null, 0);
                await outputStream.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken);
            }

            sha256.TransformFinalBlock(Array.Empty<byte>(), 0, 0);
        }

        var hashBytes = sha256.Hash ?? Array.Empty<byte>();
        var checksumHex = Convert.ToHexString(hashBytes).ToLowerInvariant();
        var storageKey = $"vault/{relativeDir.Replace('\\', '/')}/{sanitizedFileName}";

        _logger.LogInformation(
            "Stored vault artifact {FileName} ({Bytes} bytes, SHA-256: {Checksum}) under key {StorageKey}",
            sanitizedFileName, totalBytes, checksumHex, storageKey);

        return (storageKey, checksumHex, totalBytes);
    }

    public async Task<(Stream FileStream, string ContentType)> OpenReadAsync(
        string storageKey,
        CancellationToken cancellationToken = default)
    {
        var physicalPath = GetPhysicalPath(storageKey);
        var fileName = Path.GetFileName(physicalPath);
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var contentType = MimeTypeMap.TryGetValue(ext, out var mime) ? mime : "application/octet-stream";

        if (File.Exists(physicalPath))
        {
            var fileStream = new FileStream(physicalPath, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, true);
            return await Task.FromResult<(Stream, string)>((fileStream, contentType));
        }

        _logger.LogWarning("Vault deliverable not found on disk at {PhysicalPath} for key {StorageKey}.", physicalPath, storageKey);
        throw new FileNotFoundException($"Stored artifact file not found for key '{storageKey}'.", physicalPath);
    }

    public async Task<StoredFileResult> SaveFileAsync(
        Guid collegeId,
        Guid teamId,
        string slot,
        string fileName,
        Stream fileStream,
        CancellationToken cancellationToken = default)
    {
        var (storageKey, checksum, fileSizeBytes) = await SaveAsync(
            collegeId,
            teamId,
            slot,
            fileName,
            fileStream,
            cancellationToken);

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var contentType = MimeTypeMap.TryGetValue(ext, out var mime) ? mime : "application/octet-stream";

        return new StoredFileResult
        {
            StorageKey = storageKey,
            FileName = Path.GetFileName(fileName),
            Sha256Checksum = checksum,
            FileSizeBytes = fileSizeBytes,
            ContentType = contentType
        };
    }

    public async Task<(Stream Stream, string ContentType, string FileName)> GetFileAsync(
        string storageKey,
        CancellationToken cancellationToken = default)
    {
        var physicalPath = GetPhysicalPath(storageKey);
        var fileName = Path.GetFileName(physicalPath);
        var (stream, contentType) = await OpenReadAsync(storageKey, cancellationToken);
        return (stream, contentType, fileName);
    }

    public Task<bool> FileExistsAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        var physicalPath = GetPhysicalPath(storageKey);
        return Task.FromResult(File.Exists(physicalPath));
    }

    public Task DeleteFileAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        var physicalPath = GetPhysicalPath(storageKey);
        if (File.Exists(physicalPath))
        {
            File.Delete(physicalPath);
            _logger.LogInformation("Deleted vault file from disk: {PhysicalPath}", physicalPath);
        }
        return Task.CompletedTask;
    }

    public string GetPhysicalPath(string storageKey)
    {
        var sanitizedKey = storageKey.TrimStart('/');
        if (sanitizedKey.StartsWith("vault/", StringComparison.OrdinalIgnoreCase))
        {
            sanitizedKey = sanitizedKey[6..];
        }

        sanitizedKey = sanitizedKey.Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar);
        return Path.Combine(_baseStoragePath, sanitizedKey);
    }
}
