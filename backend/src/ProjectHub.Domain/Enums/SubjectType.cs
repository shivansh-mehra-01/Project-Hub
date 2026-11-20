using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum SubjectType
{
    Project = 1,
    MinorProject = 2,
    MajorProject = 3,
    Dissertation = 4,
    Internship = 5,
    Seminar = 6
}
