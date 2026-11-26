using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Institutional support ticket managed by SuperAdmin operators.
/// </summary>
public class SupportTicket : BaseEntity
{
    public string TicketNumber { get; set; } = string.Empty;
    public Guid? CollegeId { get; set; }
    public string InstitutionName { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = "General Support";
    public string Priority { get; set; } = "Medium";
    public string Status { get; set; } = "Open";
    public string ReportedByName { get; set; } = string.Empty;
    public string ReportedByEmail { get; set; } = string.Empty;
    public string? AssignedToName { get; set; }
    public string? AssignedToEmail { get; set; }
    public string? ResolutionNotes { get; set; }
    public DateTime? ResolvedAtUtc { get; set; }
    public DateTime? ClosedAtUtc { get; set; }

    public ICollection<SupportTicketMessage> Messages { get; set; } = new List<SupportTicketMessage>();
}
