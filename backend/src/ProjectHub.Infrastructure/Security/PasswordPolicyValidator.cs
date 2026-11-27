using System.Text.RegularExpressions;

namespace ProjectHub.Infrastructure.Security;

/// <summary>
/// Unified enterprise password policy enforced across registration, activation, reset, and password change.
/// </summary>
public static partial class PasswordPolicyValidator
{
    public const int MinimumLength = 12;
    public const int MaximumLength = 128;

    public static string? Validate(string? password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < MinimumLength)
        {
            return $"Password must be at least {MinimumLength} characters in length.";
        }

        if (password.Length > MaximumLength)
        {
            return $"Password must not exceed {MaximumLength} characters.";
        }

        if (!UppercaseRegex().IsMatch(password))
        {
            return "Password must include at least one uppercase letter (A-Z).";
        }

        if (!LowercaseRegex().IsMatch(password))
        {
            return "Password must include at least one lowercase letter (a-z).";
        }

        if (!DigitRegex().IsMatch(password))
        {
            return "Password must include at least one number (0-9).";
        }

        if (!SpecialCharRegex().IsMatch(password))
        {
            return "Password must include at least one special symbol (!@#$%^&*...).";
        }

        return null;
    }

    [GeneratedRegex(@"[A-Z]")]
    private static partial Regex UppercaseRegex();

    [GeneratedRegex(@"[a-z]")]
    private static partial Regex LowercaseRegex();

    [GeneratedRegex(@"[0-9]")]
    private static partial Regex DigitRegex();

    [GeneratedRegex(@"[!@#$%^&*()_+\-=\[\]{};':"",.<>?/\\|]")]
    private static partial Regex SpecialCharRegex();
}
