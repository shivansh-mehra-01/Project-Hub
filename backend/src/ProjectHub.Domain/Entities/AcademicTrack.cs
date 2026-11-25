using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Academic track defining delivery timeline, continuous evaluation weights, and rubric distributions.
/// Dynamic tracks: Minor Project, Major Phase-I, Major Phase-II, Capstone.
/// </summary>
public class AcademicTrack : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }

    /// <summary>
    /// Department scope: null = overarching institutional session opened by CollegeAdmin;
    /// non-null = branch-level academic project track launched by an HOD.
    /// </summary>
    public Guid? DepartmentId { get; set; }

    // Dynamic Academic Hierarchy Linkages
    public Guid? AcademicSessionId { get; set; }
    public Guid? CourseProgramId { get; set; }
    public Guid? SemesterTermId { get; set; }
    public Guid? SubjectOfferingId { get; set; }
    public Guid? CurriculumSchemeId { get; set; }

    // Runtime Rule Toggles
    public ParticipationMode ParticipationMode { get; set; } = ParticipationMode.Team;
    public EnrolmentMode EnrolmentMode { get; set; } = EnrolmentMode.SelfJoin;
    public bool AllowInterdisciplinaryTeams { get; set; } = false;
    public bool AllowCrossBranchTeams { get; set; } = false;

    public string Name { get; set; } = string.Empty; // "Minor Project", "Major Phase-I", "Major Phase-II", "Capstone"
    public string AcademicYear { get; set; } = "2025-2026";
    public bool IsActive { get; set; } = true;
    public DateTime? ProposalDeadlineUtc { get; set; }
    public DateTime? FinalSubmissionDeadlineUtc { get; set; }

    public int MinTeamSize { get; set; } = 2;
    public int MaxTeamSize { get; set; } = 4;

    // Continuous Evaluation Weights (must sum to 100)
    public int GuideWeightPct { get; set; } = 30;
    public int MidTermWeightPct { get; set; } = 30;
    public int FinalVivaWeightPct { get; set; } = 40;

    // Project vs Individual Rubric Split (must sum to 100)
    public int SharedProjectRubricPct { get; set; } = 60;
    public int IndividualStudentRubricPct { get; set; } = 40;

    /// <summary>
    /// Enforces domain invariant that continuous weights and rubric splits equal 100%.
    /// </summary>
    public void ValidateWeights()
    {
        if (GuideWeightPct + MidTermWeightPct + FinalVivaWeightPct != 100)
        {
            throw new InvalidOperationException(
                $"Continuous evaluation weights must sum to exactly 100%. Current sum: {GuideWeightPct + MidTermWeightPct + FinalVivaWeightPct}%");
        }

        if (SharedProjectRubricPct + IndividualStudentRubricPct != 100)
        {
            throw new InvalidOperationException(
                $"Rubric weight distribution must sum to exactly 100%. Current sum: {SharedProjectRubricPct + IndividualStudentRubricPct}%");
        }
    }

    // Navigations
    public CollegeTenant? College { get; set; }
    public Department? Department { get; set; }
    public AcademicSession? AcademicSession { get; set; }
    public CourseProgram? CourseProgram { get; set; }
    public SemesterTerm? SemesterTerm { get; set; }
    public SubjectOffering? SubjectOffering { get; set; }
    public CurriculumScheme? CurriculumScheme { get; set; }

    public ICollection<ProjectTeam> Teams { get; set; } = new List<ProjectTeam>();
    public ICollection<CourseOutcomeDefinition> CourseOutcomes { get; set; } = new List<CourseOutcomeDefinition>();
    public ICollection<ProblemBankStatement> ProblemStatements { get; set; } = new List<ProblemBankStatement>();
}
