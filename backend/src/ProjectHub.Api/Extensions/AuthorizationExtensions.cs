using ProjectHub.Api.Authorization;

namespace ProjectHub.Api.Extensions;

public static class AuthorizationExtensions
{
    public static IServiceCollection AddProjectHubAuthorization(this IServiceCollection services)
    {
        return services.AddProjectHubAuthorizationPolicies();
    }
}
