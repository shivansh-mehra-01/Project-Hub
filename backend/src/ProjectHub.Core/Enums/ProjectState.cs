namespace ProjectHub.Core.Enums;

/// <summary>
/// Project lifecycle state machine stages.
/// </summary>
public enum ProjectState
{
    Draft = 1,
    PendingGuide = 2,
    PendingCoordinator = 3,
    PendingHOD = 4,
    Active = 5,
    Completed = 6
}

