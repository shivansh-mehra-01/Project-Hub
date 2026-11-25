namespace ProjectHub.Domain.Entities;

/// <summary>
/// Authenticated session tracking for platform users.
/// Captures device, IP, user-agent, activity timestamps, and cryptographic revocation status.
/// </summary>
public class UserSession
{
    public string Id { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public Guid CollegeId { get; set; }
    public string AccountEmail { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Device { get; set; } = string.Empty;
    public string Browser { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public DateTime LoginTimeUtc { get; set; } = DateTime.UtcNow;
    public DateTime LastActiveTimeUtc { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAtUtc { get; set; } = DateTime.UtcNow.AddDays(14);
    public string TokenFamilyId { get; set; } = string.Empty;
    public bool IsRevoked { get; set; } = false;
    public DateTime? RevokedAtUtc { get; set; }
    public string? RevocationReason { get; set; }
    public string? TokenHash { get; set; }
}
