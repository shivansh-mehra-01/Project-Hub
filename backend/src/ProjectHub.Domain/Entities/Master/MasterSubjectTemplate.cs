using ProjectHub.Domain.Common;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Domain.Entities.Master;

/// <summary>
/// Platform-level master subject template for academic tracks (Project, Minor, Major, Dissertation, Internship, Seminar).
/// </summary>
public class MasterSubjectTemplate : BaseEntity
{
    public Guid MasterBranchId { get; set; }
    public Guid? SchemeId { get; set; }
    public int SemesterNumber { get; set; } = 6;
    public string SubjectCode { get; set; } = string.Empty; // e.g. "CS-606", "CS-705"
    public string SubjectName { get; set; } = string.Empty; // e.g. "Minor Project", "Major Project Phase-I"
    public SubjectType SubjectType { get; set; } = SubjectType.MinorProject;
    public ParticipationMode DefaultParticipationMode { get; set; } = ParticipationMode.Team;
    public int DefaultMinTeamSize { get; set; } = 2;
    public int DefaultMaxTeamSize { get; set; } = 4;
    public int MaxInternalMarks { get; set; } = 60;
    public int MaxExternalMarks { get; set; } = 40;
    public bool IsActive { get; set; } = true;

    // Navigations
    public MasterBranch? MasterBranch { get; set; }
    public MasterCurriculumScheme? Scheme { get; set; }
}
