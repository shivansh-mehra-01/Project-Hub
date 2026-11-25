using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

/// <summary>
/// Lifecycle state of a student team membership invitation.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum InvitationStatus
{
    Pending = 1,
    Accepted = 2,
    Declined = 3,
    Cancelled = 4,
    Expired = 5
}
