using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

/// <summary>
/// Academic faculty designations aligned with AICTE Approval Process Handbook (APH) cadre norms.
/// Standard Cadre Ratio for UG Engineering: 1 Professor : 2 Associate Professors : 6 Assistant Professors.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum FacultyDesignation
{
    Professor = 1,
    AssociateProfessor = 2,
    AssistantProfessor = 3,
    AdjunctFaculty = 4,
    Lecturer = 5
}
