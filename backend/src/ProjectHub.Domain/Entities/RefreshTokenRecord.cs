namespace ProjectHub.Domain.Entities;

/// <summary>
/// Persisted refresh token record supporting cryptographic rotation and reuse detection.
/// Only the SHA-256 hash of the opaque refresh token is stored.
/// </summary>
public class RefreshTokenRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string SessionId { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public Guid CollegeId { get; set; }
    public string TokenFamilyId { get; set; } = string.Empty;
    public string TokenHash { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? UsedAtUtc { get; set; }
    public string? ReplacedByTokenHash { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public string? RevocationReason { get; set; }
}
