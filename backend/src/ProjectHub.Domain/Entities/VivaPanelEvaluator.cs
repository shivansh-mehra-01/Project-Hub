using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Faculty member appointed to a viva review panel.
/// Includes domain guard preventing a project guide from evaluating their own team during panel/external defenses.
/// </summary>
public class VivaPanelEvaluator : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid VivaPanelId { get; set; }
    public Guid EvaluatorUserId { get; set; }

    /// <summary>
    /// Domain guard enforcing that an assigned project guide cannot serve as external/panel evaluator
    /// for their own guided team.
    /// </summary>
    public static void ValidateEvaluatorNotTeamGuide(Guid evaluatorUserId, Guid? teamGuideUserId)
    {
        if (teamGuideUserId.HasValue && evaluatorUserId == teamGuideUserId.Value)
        {
            throw new InvalidOperationException(
                "Domain Rule Violation: The assigned project guide is strictly prohibited from serving as panel evaluator for their own mentored team.");
        }
    }

    // Navigations
    public VivaPanel? VivaPanel { get; set; }
    public UserAccount? EvaluatorUser { get; set; }
}
