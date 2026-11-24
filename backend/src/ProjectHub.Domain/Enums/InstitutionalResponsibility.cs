using System.Text.Json.Serialization;

namespace ProjectHub.Domain.Enums;

/// <summary>
/// Delegated institutional leadership responsibilities and permission scopes within a campus tenant.
/// These represent administrative assignments under CollegeAdmin or Faculty identities without duplicating user roles.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum InstitutionalResponsibility
{
    None = 0,
    Principal = 1,
    CampusDirector = 2,
    DeanAcademics = 3,
    ControllerOfExaminations = 4,
    IqacCoordinator = 5,
    Registrar = 6
}
