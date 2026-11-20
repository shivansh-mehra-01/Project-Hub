using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum SemesterParity
{
    Odd = 1,
    Even = 2,
    Combined = 3
}
