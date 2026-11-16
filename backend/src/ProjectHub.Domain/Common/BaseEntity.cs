namespace ProjectHub.Domain.Common;

/// <summary>
/// Abstract base contract for all domain entities.
/// UUIDv7 primary key ensures chronological monotonicity and high-performance B-Tree index locality.
/// </summary>
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; set; }
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAtUtc { get; set; }
}
