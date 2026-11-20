using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum EnrolmentMode
{
    SelfJoin = 1,
    CoordinatorAllotted = 2,
    Hybrid = 3
}
