using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ProjectHub.Application.Interfaces;
using ProjectHub.Core.Entities;
using ProjectHub.Core.Enums;
using ProjectHub.Infrastructure.Data;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class TenantIsolationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public TenantIsolationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GlobalQueryFilter_StrictlyIsolates_TenantData()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        // 1. Seed data for Tenant A and Tenant B under an unrestricted scope
        using (var seedScope = _factory.Services.CreateScope())
        {
            var db = seedScope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Add departments for both tenants
            db.Departments.Add(new Department
            {
                Id = Guid.NewGuid(),
                CollegeId = tenantA,
                Name = "Computer Science A",
                Code = "CS-A"
            });

            db.Departments.Add(new Department
            {
                Id = Guid.NewGuid(),
                CollegeId = tenantB,
                Name = "Computer Science B",
                Code = "CS-B"
            });

            await db.SaveChangesAsync();
        }

        // 2. Query under Tenant A context
        using (var tenantAScope = _factory.Services.CreateScope())
        {
            var tenantContext = tenantAScope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.CollegeId = tenantA;

            var db = tenantAScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var departments = await db.Departments.ToListAsync();

            Assert.All(departments, d => Assert.Equal(tenantA, d.CollegeId));
            Assert.Contains(departments, d => d.Code == "CS-A");
            Assert.DoesNotContain(departments, d => d.Code == "CS-B");
        }

        // 3. Query under Tenant B context
        using (var tenantBScope = _factory.Services.CreateScope())
        {
            var tenantContext = tenantBScope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.CollegeId = tenantB;

            var db = tenantBScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var departments = await db.Departments.ToListAsync();

            Assert.All(departments, d => Assert.Equal(tenantB, d.CollegeId));
            Assert.Contains(departments, d => d.Code == "CS-B");
            Assert.DoesNotContain(departments, d => d.Code == "CS-A");
        }
    }
}

