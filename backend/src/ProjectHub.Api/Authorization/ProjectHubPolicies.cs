using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Api.Authorization;

/// <summary>
/// Centralized authorization policy definitions for Project Hub.
/// Strictly enforces the 6-role hierarchy and permission boundaries.
/// </summary>
public static class ProjectHubPolicies
{
    public const string SuperAdminOnly = "SuperAdminOnly";
    public const string CollegeAdminOnly = "CollegeAdminOnly";
    public const string HodOnly = "HodOnly";
    public const string CoordinatorOrHod = "CoordinatorOrHod";
    public const string FacultyOrAbove = "FacultyOrAbove";
    public const string StudentOrLead = "StudentOrLead";

    public static IServiceCollection AddProjectHubAuthorizationPolicies(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            // SuperAdmin Platform Authority
            options.AddPolicy(SuperAdminOnly, policy =>
                policy.RequireAssertion(ctx =>
                    ctx.User.IsInRole(UserRole.SuperAdmin.ToString()) ||
                    ctx.User.HasClaim("is_super_admin", "true") ||
                    ctx.User.HasClaim("role", UserRole.SuperAdmin.ToString())));

            // CollegeAdmin Institutional Authority
            options.AddPolicy(CollegeAdminOnly, policy =>
                policy.RequireAssertion(ctx =>
                    ctx.User.IsInRole(UserRole.CollegeAdmin.ToString()) ||
                    ctx.User.HasClaim("role", UserRole.CollegeAdmin.ToString())));

            // HOD Department Authority
            options.AddPolicy(HodOnly, policy =>
                policy.RequireAssertion(ctx =>
                    ctx.User.IsInRole(UserRole.HOD.ToString()) ||
                    ctx.User.HasClaim("role", UserRole.HOD.ToString())));

            // Coordinator or HOD Batch Ops Authority
            options.AddPolicy(CoordinatorOrHod, policy =>
                policy.RequireAssertion(ctx =>
                    ctx.User.IsInRole(UserRole.SuperAdmin.ToString()) ||
                    ctx.User.IsInRole(UserRole.CollegeAdmin.ToString()) ||
                    ctx.User.IsInRole(UserRole.HOD.ToString()) ||
                    ctx.User.HasClaim("role", UserRole.SuperAdmin.ToString()) ||
                    ctx.User.HasClaim("role", UserRole.CollegeAdmin.ToString()) ||
                    ctx.User.HasClaim("role", UserRole.HOD.ToString()) ||
                    ((ctx.User.IsInRole(UserRole.Faculty.ToString()) || ctx.User.HasClaim("role", UserRole.Faculty.ToString())) &&
                     ctx.User.HasClaim("is_coordinator", "true"))));

            // Faculty or Above (Faculty, HOD, CollegeAdmin)
            options.AddPolicy(FacultyOrAbove, policy =>
                policy.RequireAssertion(ctx =>
                    ctx.User.IsInRole(UserRole.Faculty.ToString()) ||
                    ctx.User.IsInRole(UserRole.HOD.ToString()) ||
                    ctx.User.IsInRole(UserRole.CollegeAdmin.ToString()) ||
                    ctx.User.HasClaim("role", UserRole.Faculty.ToString()) ||
                    ctx.User.HasClaim("role", UserRole.HOD.ToString()) ||
                    ctx.User.HasClaim("role", UserRole.CollegeAdmin.ToString())));

            // Student or TeamLead
            options.AddPolicy(StudentOrLead, policy =>
                policy.RequireAssertion(ctx =>
                    ctx.User.IsInRole(UserRole.Student.ToString()) ||
                    ctx.User.HasClaim("role", UserRole.Student.ToString())));
        });

        return services;
    }
}
