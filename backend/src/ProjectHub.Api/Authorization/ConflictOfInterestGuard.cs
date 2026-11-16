using ProjectHub.Domain.Entities;

namespace ProjectHub.Api.Authorization;

/// <summary>
/// Domain and API security guard preventing Conflict-of-Interest (COI) in academic grading.
/// Strictly enforces that an appointed Guide cannot evaluate or grade their own guided project team on a Viva Panel.
/// </summary>
public static class ConflictOfInterestGuard
{
    public static void EnsureNoVivaGradingConflict(Guid evaluatorUserId, Guid? teamGuideUserId)
    {
        if (teamGuideUserId.HasValue && evaluatorUserId == teamGuideUserId.Value)
        {
            throw new InvalidOperationException(
                "Conflict-of-Interest Violation: The assigned project guide is strictly prohibited from serving as an independent viva evaluator or submitting panel marks for their own mentored team.");
        }
    }

    public static void EnsureNoVivaPanelConflict(Guid evaluatorUserId, ProjectTeam team)
    {
        EnsureNoVivaGradingConflict(evaluatorUserId, team.GuideUserId);
    }
}
