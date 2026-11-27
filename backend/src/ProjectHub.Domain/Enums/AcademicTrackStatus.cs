using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

/// <summary>
/// Lifecycle status of a department-owned Academic Project Track.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AcademicTrackStatus
{
    Draft = 1,
    Open = 2,
    Paused = 3,
    Closed = 4
}
