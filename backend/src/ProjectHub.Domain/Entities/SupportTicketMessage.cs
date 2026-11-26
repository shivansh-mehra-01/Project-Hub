using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Reply or internal operator note attached to a support ticket.
/// </summary>
public class SupportTicketMessage : BaseEntity
{
    public Guid TicketId { get; set; }
    public SupportTicket Ticket { get; set; } = null!;
    public string SenderName { get; set; } = string.Empty;
    public string SenderEmail { get; set; } = string.Empty;
    public string SenderRole { get; set; } = "SuperAdmin";
    public string Message { get; set; } = string.Empty;
    public bool IsInternalNote { get; set; }
    public DateTime SentAtUtc { get; set; } = DateTime.UtcNow;
}
