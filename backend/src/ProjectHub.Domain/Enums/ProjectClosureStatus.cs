using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

/// <summary>
/// Status of formal academic project closure and archival.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ProjectClosureStatus
{
    PendingClosure = 1,
    Closed = 2,
    Archived = 3,
    Reopened = 4
}
