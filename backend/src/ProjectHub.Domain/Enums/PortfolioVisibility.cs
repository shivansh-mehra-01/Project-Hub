namespace ProjectHub.Domain.Enums;

/// <summary>
/// Visibility policy controlling external access to verified student academic portfolio.
/// </summary>
public enum PortfolioVisibility
{
    Private = 1,
    Institutional = 2,
    PublicWithConsent = 3
}
