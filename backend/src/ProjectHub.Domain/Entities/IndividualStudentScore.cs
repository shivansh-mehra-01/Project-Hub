using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Fine-grained assessment for an individual student within a viva evaluation session.
/// Automatically blends shared team performance with individual contribution.
/// </summary>
public class IndividualStudentScore : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid VivaEvaluationId { get; set; }
    public Guid StudentUserId { get; set; }

    public decimal ModuleOwnershipScore { get; set; } = 0m;
    public decimal VivaQaScore { get; set; } = 0m;
    public decimal LogDisciplineScore { get; set; } = 0m;
    public decimal IndividualTotalScore { get; set; } = 0m;

    /// <summary>
    /// Blended final mark combining 60% shared team score + 40% individual score (or configured track ratio).
    /// </summary>
    public decimal FinalComputedStudentMark { get; set; } = 0m;

    /// <summary>
    /// Computes individual total and blended final mark based on shared and individual weight percentages.
    /// </summary>
    public void ComputeFinalMark(decimal sharedTotalScore, decimal sharedWeightPct = 60m, decimal individualWeightPct = 40m)
    {
        IndividualTotalScore = ModuleOwnershipScore + VivaQaScore + LogDisciplineScore;
        FinalComputedStudentMark = Math.Round(
            (sharedTotalScore * (sharedWeightPct / 100m)) +
            (IndividualTotalScore * (individualWeightPct / 100m)),
            2, MidpointRounding.AwayFromZero);
    }

    // Navigations
    public VivaEvaluation? VivaEvaluation { get; set; }
    public UserAccount? StudentUser { get; set; }
}
