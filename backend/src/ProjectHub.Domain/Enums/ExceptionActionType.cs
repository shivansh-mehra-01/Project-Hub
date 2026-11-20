using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ExceptionActionType
{
    ReassignGuide = 1,
    RemoveDroppedMember = 2,
    AmendLockedRoster = 3,
    IndividualReVivaUnlock = 4,
    SingleStudentProvisioned = 5
}
