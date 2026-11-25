using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum EvaluationStage
{
    ReadyForViva = 1,
    Scheduled = 2,
    EvaluationInProgress = 3,
    Evaluated = 4,
    Published = 5
}
