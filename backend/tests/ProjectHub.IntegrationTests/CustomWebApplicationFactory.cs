using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ProjectHub.Application.Interfaces;
using ProjectHub.Infrastructure.Data;
using ProjectHub.Infrastructure.Persistence;

namespace ProjectHub.IntegrationTests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _inMemoryDbName = Guid.NewGuid().ToString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureServices(services =>
        {
            var descriptorsToRemove = services.Where(d =>
                d.ServiceType == typeof(DbContextOptions<AppDbContext>) ||
                d.ServiceType == typeof(DbContextOptions<ProjectHubDbContext>) ||
                d.ServiceType == typeof(DbContextOptions)
            ).ToList();

            foreach (var descriptor in descriptorsToRemove)
            {
                services.Remove(descriptor);
            }

            // Dedicated service provider for InMemory EF Core
            var inMemoryServiceProvider = new ServiceCollection()
                .AddEntityFrameworkInMemoryDatabase()
                .BuildServiceProvider();

            services.AddDbContext<ProjectHubDbContext>((sp, options) =>
            {
                options.UseInMemoryDatabase(_inMemoryDbName)
                       .UseInternalServiceProvider(inMemoryServiceProvider);
            });

            services.AddDbContext<AppDbContext>((sp, options) =>
            {
                options.UseInMemoryDatabase(_inMemoryDbName)
                       .UseInternalServiceProvider(inMemoryServiceProvider);
            });
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);

        using (var scope = host.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            db.Database.EnsureCreated();
            DbInitializer.SeedAsync(db, tenantContext).GetAwaiter().GetResult();
        }

        return host;
    }
}
