using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum SprintTaskStatus
{
    Todo = 1,
    InProgress = 2,
    Done = 3,
    InReview = 4,
    Blocked = 5
}
