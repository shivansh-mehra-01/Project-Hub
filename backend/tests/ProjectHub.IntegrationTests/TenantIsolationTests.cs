using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
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

        // 1. Seed data for Tenant A and Tenant B under an authorized SuperAdmin scope
        using (var seedScope = _factory.Services.CreateScope())
        {
            var seedTenantContext = seedScope.ServiceProvider.GetRequiredService<ITenantContext>();
            seedTenantContext.IsSuperAdmin = true;

            var db = seedScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

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

        // 2. Query under Tenant A context (non-SuperAdmin)
        using (var tenantAScope = _factory.Services.CreateScope())
        {
            var tenantContext = tenantAScope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.CollegeId = tenantA;
            tenantContext.IsSuperAdmin = false;

            var db = tenantAScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var departments = await db.Departments.ToListAsync();

            Assert.All(departments, d => Assert.Equal(tenantA, d.CollegeId));
            Assert.Contains(departments, d => d.Code == "CS-A");
            Assert.DoesNotContain(departments, d => d.Code == "CS-B");
        }

        // 3. Query under Tenant B context (non-SuperAdmin)
        using (var tenantBScope = _factory.Services.CreateScope())
        {
            var tenantContext = tenantBScope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.CollegeId = tenantB;
            tenantContext.IsSuperAdmin = false;

            var db = tenantBScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var departments = await db.Departments.ToListAsync();

            Assert.All(departments, d => Assert.Equal(tenantB, d.CollegeId));
            Assert.Contains(departments, d => d.Code == "CS-B");
            Assert.DoesNotContain(departments, d => d.Code == "CS-A");
        }
    }

    [Fact]
    public async Task CrossTenantWrite_ByNonSuperAdmin_ThrowsUnauthorizedAccessException()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        using var scope = _factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        tenantContext.CollegeId = tenantA;
        tenantContext.IsSuperAdmin = false;

        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

        // Attempt to insert an entity explicitly stamped with tenant B
        db.Departments.Add(new Department
        {
            Id = Guid.NewGuid(),
            CollegeId = tenantB,
            Name = "Illegal Cross-Tenant Dept",
            Code = "ILL-01"
        });

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public void AcademicTrack_ValidateWeights_EnforcesSumOf100()
    {
        var validTrack = new AcademicTrack
        {
            GuideWeightPct = 30,
            MidTermWeightPct = 30,
            FinalVivaWeightPct = 40,
            SharedProjectRubricPct = 60,
            IndividualStudentRubricPct = 40
        };

        // Should not throw
        validTrack.ValidateWeights();

        var invalidWeightsTrack = new AcademicTrack
        {
            GuideWeightPct = 30,
            MidTermWeightPct = 30,
            FinalVivaWeightPct = 50 // Sum 110 != 100
        };

        Assert.Throws<InvalidOperationException>(() => invalidWeightsTrack.ValidateWeights());
    }

    [Fact]
    public void VivaPanelEvaluator_EnsureEvaluatorNotGuide_EnforcesDomainGuard()
    {
        var guideUserId = Guid.NewGuid();
        var externalUserId = Guid.NewGuid();

        // Different user should pass
        VivaPanelEvaluator.ValidateEvaluatorNotTeamGuide(externalUserId, guideUserId);

        // Same user as guide should throw domain violation
        Assert.Throws<InvalidOperationException>(() =>
            VivaPanelEvaluator.ValidateEvaluatorNotTeamGuide(guideUserId, guideUserId));
    }
}
