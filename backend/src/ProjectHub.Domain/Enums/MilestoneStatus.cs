using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

/// <summary>
/// Execution and review status of a team's project milestone.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum MilestoneStatus
{
    Pending = 1,
    SubmittedForReview = 2,
    Approved = 3,
    RevisionRequested = 4
}
