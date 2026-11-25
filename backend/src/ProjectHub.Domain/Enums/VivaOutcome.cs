using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum VivaOutcome
{
    Pending = 0,
    Pass = 1,
    Fail = 2,
    ReViva = 3
}
