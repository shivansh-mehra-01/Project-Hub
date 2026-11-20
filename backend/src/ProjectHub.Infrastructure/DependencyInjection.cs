using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ProjectHub.Application.Interfaces;
using ProjectHub.Infrastructure.Data;
using ProjectHub.Infrastructure.Interceptors;
using ProjectHub.Infrastructure.Persistence;
using ProjectHub.Infrastructure.Security;
using ProjectHub.Infrastructure.Services;

namespace ProjectHub.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();

        // Register Scoped Tenant and User Contexts
        services.AddScoped<ITenantContext, TenantContext>();
        services.AddScoped<ICurrentUser, CurrentUser>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IEmailSender, LoggingEmailSender>();
        services.AddScoped<IFileStorageService, LocalDiskStorageService>();

        // Register EF Core Interceptors
        services.AddScoped<AuditSaveChangesInterceptor>();
        services.AddScoped<TenantRlsConnectionInterceptor>();

        // Connection string
        var connectionString = configuration.GetConnectionString("DefaultConnection")
                               ?? "Host=localhost;Port=5432;Database=projecthub_db;Username=postgres;Password=postgres;";

        // Register DbContext if not already configured (e.g. in integration test harness)
        if (!services.Any(d => d.ServiceType == typeof(DbContextOptions<ProjectHubDbContext>)))
        {
            services.AddDbContext<ProjectHubDbContext>((serviceProvider, options) =>
            {
                var auditInterceptor = serviceProvider.GetRequiredService<AuditSaveChangesInterceptor>();
                var rlsInterceptor = serviceProvider.GetRequiredService<TenantRlsConnectionInterceptor>();

                options.UseNpgsql(connectionString, npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsAssembly(typeof(ProjectHubDbContext).Assembly.FullName);
                    npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3);
                })
                .AddInterceptors(auditInterceptor, rlsInterceptor);
            });

            // Alias registration for AppDbContext
            services.AddDbContext<AppDbContext>((serviceProvider, options) =>
            {
                var auditInterceptor = serviceProvider.GetRequiredService<AuditSaveChangesInterceptor>();
                var rlsInterceptor = serviceProvider.GetRequiredService<TenantRlsConnectionInterceptor>();

                options.UseNpgsql(connectionString, npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsAssembly(typeof(ProjectHubDbContext).Assembly.FullName);
                    npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3);
                })
                .AddInterceptors(auditInterceptor, rlsInterceptor);
            });
        }

        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<ProjectHubDbContext>());

        return services;
    }
}
