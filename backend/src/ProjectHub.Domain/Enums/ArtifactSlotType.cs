using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ArtifactSlotType
{
    Synopsis = 1,
    MidTermPPT = 2,
    PlagiarismReport = 3,
    FinalThesis = 4
}
