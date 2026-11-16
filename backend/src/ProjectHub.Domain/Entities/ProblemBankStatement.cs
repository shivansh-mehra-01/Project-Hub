using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// Pre-approved problem statement offered to student teams during project proposal phase.
/// </summary>
public class ProblemBankStatement : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid AcademicTrackId { get; set; }
    public Guid ProposedByFacultyId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Abstract { get; set; } = string.Empty;
    public string SdgCode { get; set; } = string.Empty;
    public string? PrerequisitesCsv { get; set; }
    public int MaxTeamCapacity { get; set; } = 4;
    public bool IsAllocated { get; set; } = false;
    public Guid? AllocatedTeamId { get; set; }

    // Navigations
    public CollegeTenant? College { get; set; }
    public Department? Department { get; set; }
    public AcademicTrack? AcademicTrack { get; set; }
    public UserAccount? ProposedByFaculty { get; set; }
    public ProjectTeam? AllocatedTeam { get; set; }
}
