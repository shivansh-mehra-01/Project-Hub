using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Durable transactional email outbox record.
/// Sensitive OTPs and activation tokens are stored only in Data-Protection-encrypted payloads
/// and are scrubbed once delivered or expired.
/// </summary>
public class EmailOutboxMessage : BaseEntity
{
    public string EmailType { get; set; } = string.Empty;
    public string RecipientEmail { get; set; } = string.Empty;
    public string RecipientName { get; set; } = string.Empty;
    public Guid? CollegeId { get; set; }
    public string? EncryptedPayload { get; set; }
    public EmailOutboxStatus Status { get; set; } = EmailOutboxStatus.Pending;
    public int AttemptCount { get; set; } = 0;
    public int MaxAttempts { get; set; } = 5;
    public DateTime NextAttemptAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? LastAttemptAtUtc { get; set; }
    public string? LockedBy { get; set; }
    public DateTime? LockedUntilUtc { get; set; }
    public DateTime? SentAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public string IdempotencyKey { get; set; } = string.Empty;
    public string? LastError { get; set; }
}
