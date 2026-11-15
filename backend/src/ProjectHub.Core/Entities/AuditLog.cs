namespace ProjectHub.Core.Entities;

/// <summary>
/// Immutable audit log capturing all insert, update, and delete mutations.
/// Intercepted automatically via EF Core SaveChangesInterceptor.
/// </summary>
public class AuditLog
{
    public long Id { get; set; }
    public Guid? CollegeId { get; set; }
    public Guid? UserId { get; set; }
    public string? UserEmail { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // Insert, Update, Delete
    public string ChangesJson { get; set; } = "{}";
    public string? IpAddress { get; set; }
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
}

