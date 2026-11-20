using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AcademicProgramLevel
{
    UG = 1,
    PG = 2,
    Diploma = 3,
    Research = 4
}
