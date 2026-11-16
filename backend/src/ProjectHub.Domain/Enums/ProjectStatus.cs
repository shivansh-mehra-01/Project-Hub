using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ProjectStatus
{
    Draft = 1,
    PendingGuide = 2,
    PendingCoordinator = 3,
    PendingHOD = 4,
    ActiveBuild = 5,
    AtRisk = 6,
    ReadyForViva = 7,
    Completed = 8,
    Archived = 9
}
