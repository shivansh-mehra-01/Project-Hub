using ProjectHub.Core.Common;
using ProjectHub.Core.Enums;

namespace ProjectHub.Core.Entities;

/// <summary>
/// Scoped user profile within a specific college tenant.
/// Enforces exact role assignment and coordinator flag.
/// </summary>
public class CollegeMembership : BaseEntity, ITenantEntity
{
    public Guid CollegeId { get; set; }
    public Guid UserId { get; set; }
    public Guid? DepartmentId { get; set; }
    public UserRole Role { get; set; }
    public bool IsProjectCoordinator { get; set; }
    public string? EnrollmentNumber { get; set; } // USN / PRN / Roll No
    public string? EmployeeId { get; set; }

    // Navigations
    public College? College { get; set; }
    public User? User { get; set; }
    public Department? Department { get; set; }
}

