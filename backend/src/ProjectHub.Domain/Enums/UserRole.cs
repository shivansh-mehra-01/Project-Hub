using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum UserRole
{
    SuperAdmin = 1,
    CollegeAdmin = 2,
    HOD = 3,
    Faculty = 4,
    Student = 5
}
