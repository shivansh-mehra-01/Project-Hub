using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

/// <summary>
/// Execution and review status of a team's final academic project submission.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum FinalSubmissionStatus
{
    Draft = 1,
    Submitted = 2,
    UnderReview = 3,
    RevisionRequested = 4,
    Resubmitted = 5,
    Accepted = 6,
    Locked = 7
}
