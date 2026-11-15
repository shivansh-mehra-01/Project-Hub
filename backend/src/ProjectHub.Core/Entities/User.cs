using ProjectHub.Core.Common;

namespace ProjectHub.Core.Entities;

/// <summary>
/// Institutional user identity. Can belong to multiple roles through CollegeMemberships.
/// </summary>
public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string? PasswordHash { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public bool IsSuperAdmin { get; set; }
    public bool IsActive { get; set; } = true;
    public bool EmailConfirmed { get; set; }
    public DateTime? LastLoginAtUtc { get; set; }

    // Navigations
    public ICollection<CollegeMembership> Memberships { get; set; } = new List<CollegeMembership>();
    public ICollection<TeamMember> TeamMemberships { get; set; } = new List<TeamMember>();
    public ICollection<Team> GuidedTeams { get; set; } = new List<Team>();
}

