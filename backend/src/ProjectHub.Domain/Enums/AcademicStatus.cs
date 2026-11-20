using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AcademicStatus
{
    Active = 1,
    Detained = 2,
    Graduated = 3
}
