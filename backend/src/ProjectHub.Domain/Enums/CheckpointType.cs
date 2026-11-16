using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CheckpointType
{
    GuideContinuous = 1,
    MidTermReview = 2,
    FinalViva = 3
}
