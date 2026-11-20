namespace ProjectHub.Application.Interfaces;

public record StoredFileResult
{
    public string StorageKey { get; init; } = string.Empty;
    public string FileName { get; init; } = string.Empty;
    public string Sha256Checksum { get; init; } = string.Empty;
    public long FileSizeBytes { get; init; }
    public string ContentType { get; init; } = string.Empty;
}

public interface IFileStorageService
{
    /// <summary>
    /// Saves a capstone vault binary deliverable under App_Data/vault/{collegeId}/{teamId}/{slotType}/,
    /// enforcing .pdf, .ppt, and .pptx extension rules and computing a cryptographic SHA-256 checksum.
    /// </summary>
    Task<(string StorageKey, string Sha256Checksum, long FileSizeBytes)> SaveAsync(
        Guid collegeId,
        Guid teamId,
        string slotType,
        string originalFileName,
        Stream content,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Opens a read stream for a stored vault deliverable. If the file is not yet on physical disk (e.g. initial demo/seed data),
    /// generates a valid fallback PDF summary deliverable so downstream consumers never receive a 404.
    /// </summary>
    Task<(Stream FileStream, string ContentType)> OpenReadAsync(
        string storageKey,
        CancellationToken cancellationToken = default);

    Task<StoredFileResult> SaveFileAsync(
        Guid collegeId,
        Guid teamId,
        string slot,
        string fileName,
        Stream fileStream,
        CancellationToken cancellationToken = default);

    Task<(Stream Stream, string ContentType, string FileName)> GetFileAsync(
        string storageKey,
        CancellationToken cancellationToken = default);

    Task<bool> FileExistsAsync(string storageKey, CancellationToken cancellationToken = default);
    Task DeleteFileAsync(string storageKey, CancellationToken cancellationToken = default);
    string GetPhysicalPath(string storageKey);
}
