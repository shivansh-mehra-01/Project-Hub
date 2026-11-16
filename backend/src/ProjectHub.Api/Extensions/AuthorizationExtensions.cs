using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Api.Extensions;

public static class AuthorizationExtensions
{
    public const string PolicySuperAdminOnly = "SuperAdminOnly";
    public const string PolicyCollegeAdminOnly = "CollegeAdminOnly";
    public const string PolicyHODOnly = "HODOnly";
    public const string PolicyCoordinatorOnly = "CoordinatorOnly";
    public const string PolicyFacultyOnly = "FacultyOnly";
    public const string PolicyStudentOnly = "StudentOnly";

    public static IServiceCollection AddProjectHubAuthorization(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            options.AddPolicy(PolicySuperAdminOnly, policy =>
                policy.RequireAssertion(ctx =>
                    ctx.User.IsInRole(UserRole.SuperAdmin.ToString()) ||
                    ctx.User.HasClaim("is_super_admin", "true")));

            options.AddPolicy(PolicyCollegeAdminOnly, policy =>
                policy.RequireRole(UserRole.CollegeAdmin.ToString()));

            options.AddPolicy(PolicyHODOnly, policy =>
                policy.RequireRole(UserRole.HOD.ToString()));

            options.AddPolicy(PolicyCoordinatorOnly, policy =>
                policy.RequireAssertion(ctx =>
                    ctx.User.IsInRole(UserRole.HOD.ToString()) ||
                    (ctx.User.IsInRole(UserRole.Faculty.ToString()) && ctx.User.HasClaim("is_coordinator", "true"))));

            options.AddPolicy(PolicyFacultyOnly, policy =>
                policy.RequireRole(UserRole.Faculty.ToString(), UserRole.HOD.ToString()));

            options.AddPolicy(PolicyStudentOnly, policy =>
                policy.RequireRole(UserRole.Student.ToString()));
        });

        return services;
    }
}

