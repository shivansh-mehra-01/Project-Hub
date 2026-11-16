using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ArtifactStatus
{
    Missing = 1,
    Uploaded = 2,
    Verified = 3,
    RevisionRequested = 4
}
