namespace ProjectHub.Core.Enums;

/// <summary>
/// Strict 6-role hierarchy:
/// SuperAdmin, CollegeAdmin, HOD, Faculty, Student.
/// (TeamLead is a contextual project badge on a Student).
/// </summary>
public enum UserRole
{
    SuperAdmin = 1,
    CollegeAdmin = 2,
    HOD = 3,
    Faculty = 4,
    Student = 5
}

