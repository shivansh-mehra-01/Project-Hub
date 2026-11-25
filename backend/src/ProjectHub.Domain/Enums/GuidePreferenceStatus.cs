using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum GuidePreferenceStatus
{
    None = 0,
    Requested = 1,
    Allocated = 2,
    Rejected = 3
}
