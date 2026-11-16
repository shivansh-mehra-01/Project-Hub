using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum LicenseTier
{
    Pilot = 1,
    Standard = 2,
    Enterprise = 3
}
