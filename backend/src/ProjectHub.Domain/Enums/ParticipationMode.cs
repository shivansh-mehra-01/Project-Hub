using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ParticipationMode
{
    Team = 1,
    Individual = 2
}
