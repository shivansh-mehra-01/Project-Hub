using Microsoft.Extensions.DependencyInjection;

namespace ProjectHub.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // Application layer service registrations
        return services;
    }
}

