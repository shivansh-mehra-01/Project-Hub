using System.Security.Cryptography;

namespace ProjectHub.Infrastructure.Security;

/// <summary>
/// Cryptographic PBKDF2-SHA256 password hashing helper with versioned iterations and backward-compatible verification.
/// </summary>
public static class PasswordHelper
{
    private const int SaltSize = 16;
    private const int KeySize = 32;
    public const int LegacyIterations = 100_000;
    public const int CurrentIterations = 600_000;
    private const string CurrentVersion = "v2";
    private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;

    public static string HashPassword(string password)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, CurrentIterations, Algorithm, KeySize);
        return $"{CurrentVersion}${CurrentIterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }

    public static bool NeedsRehash(string? passwordHash)
    {
        if (string.IsNullOrWhiteSpace(passwordHash)) return false;
        var parts = passwordHash.Split('$');
        if (parts.Length != 4 || parts[0] != CurrentVersion) return true;
        return !int.TryParse(parts[1], out var iterations) || iterations < CurrentIterations;
    }

    public static bool VerifyPassword(string password, string? passwordHash)
    {
        if (string.IsNullOrWhiteSpace(passwordHash)) return false;

        // Versioned format: v2$iterations$salt$hash
        if (passwordHash.StartsWith("v2$", StringComparison.Ordinal))
        {
            var v2Parts = passwordHash.Split('$');
            if (v2Parts.Length != 4 || !int.TryParse(v2Parts[1], out var iterations) || iterations < 10_000)
                return false;

            try
            {
                byte[] salt = Convert.FromBase64String(v2Parts[2]);
                byte[] expectedHash = Convert.FromBase64String(v2Parts[3]);
                byte[] actualHash = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, Algorithm, expectedHash.Length);
                return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
            }
            catch
            {
                return false;
            }
        }

        // Legacy format: salt:hash (100,000 iterations)
        var parts = passwordHash.Split(':');
        if (parts.Length != 2) return false;

        try
        {
            byte[] salt = Convert.FromBase64String(parts[0]);
            byte[] expectedHash = Convert.FromBase64String(parts[1]);

            byte[] actualHash = Rfc2898DeriveBytes.Pbkdf2(password, salt, LegacyIterations, Algorithm, KeySize);
            return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
        }
        catch
        {
            return false;
        }
    }
}
