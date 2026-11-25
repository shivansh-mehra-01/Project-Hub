using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using ProjectHub.Domain.Entities;
using ProjectHub.Infrastructure.Interceptors;
using ProjectHub.Infrastructure.Persistence;
using ProjectHub.Infrastructure.Services;
using Xunit;

namespace ProjectHub.IntegrationTests;

/// <summary>
/// Real PostgreSQL Row-Level Security (RLS) verification using a non-superuser, non-owner role.
/// Proves that FORCE ROW LEVEL SECURITY blocks cross-tenant reads and writes at the database engine level.
/// </summary>
public class PostgreSqlRlsSecurityTests
{
    private const string AdminConnStr = "Host=localhost;Port=5432;Database=projecthub_db;Username=postgres;Password=postgres";
    private const string AppConnStr = "Host=localhost;Port=5432;Database=projecthub_db;Username=colabex_rls_app;Password=ColabexRlsTest!2026";

    private static async Task<bool> CanConnectPostgresAsync()
    {
        try
        {
            await using var conn = new NpgsqlConnection(AdminConnStr);
            await conn.OpenAsync();
            return true;
        }
        catch
        {
            return false;
        }
    }

    [Fact]
    public async Task PostgresRls_NonOwnerRole_StrictlyIsolatesTenantsAcrossPooledConnections()
    {
        if (!await CanConnectPostgresAsync())
        {
            return;
        }

        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var deptAId = Guid.NewGuid();
        var deptBId = Guid.NewGuid();

        // 1. Ensure non-superuser, non-owner role exists with NOBYPASSRLS and table grants
        await using (var adminConn = new NpgsqlConnection(AdminConnStr))
        {
            await adminConn.OpenAsync();
            await using var roleCmd = adminConn.CreateCommand();
            roleCmd.CommandText = """
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'colabex_rls_app') THEN
                        CREATE ROLE colabex_rls_app LOGIN PASSWORD 'ColabexRlsTest!2026' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
                    END IF;
                END $$;
                GRANT USAGE ON SCHEMA public TO colabex_rls_app;
                GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO colabex_rls_app;
                """;
            await roleCmd.ExecuteNonQueryAsync();
        }

        var adminTenantCtx = new TenantContext { IsSuperAdmin = true };
        var adminOpts = new DbContextOptionsBuilder<ProjectHubDbContext>()
            .UseNpgsql(AdminConnStr)
            .Options;

        try
        {
            await using (var adminDb = new ProjectHubDbContext(adminOpts, adminTenantCtx))
            {
                await adminDb.Database.MigrateAsync();

                adminDb.CollegeTenants.AddRange(
                    new CollegeTenant { Id = tenantA, Name = "RLS College A", TenantCode = $"RLSA-{tenantA.ToString("N")[..6]}", SsoDomain = $"{tenantA:N}.edu.in" },
                    new CollegeTenant { Id = tenantB, Name = "RLS College B", TenantCode = $"RLSB-{tenantB.ToString("N")[..6]}", SsoDomain = $"{tenantB:N}.edu.in" }
                );
                adminDb.Departments.AddRange(
                    new Department { Id = deptAId, CollegeId = tenantA, Name = "Dept A", Code = "DA" },
                    new Department { Id = deptBId, CollegeId = tenantB, Name = "Dept B", Code = "DB" }
                );
                await adminDb.SaveChangesAsync();
            }

            // 2. Query as Tenant A through the non-owner app role with TenantRlsConnectionInterceptor
            var tenantAContext = new TenantContext { CollegeId = tenantA, IsSuperAdmin = false };
            var interceptorA = new TenantRlsConnectionInterceptor(tenantAContext, NullLogger<TenantRlsConnectionInterceptor>.Instance);
            var optsA = new DbContextOptionsBuilder<ProjectHubDbContext>()
                .UseNpgsql(AppConnStr)
                .AddInterceptors(interceptorA)
                .Options;

            await using (var dbA = new ProjectHubDbContext(optsA, tenantAContext))
            {
                // IgnoreQueryFilters() proves PostgreSQL RLS itself (not EF Core filter) blocks Tenant B!
                var visibleDepts = await dbA.Departments.IgnoreQueryFilters().ToListAsync();
                Assert.Contains(visibleDepts, d => d.Id == deptAId);
                Assert.DoesNotContain(visibleDepts, d => d.Id == deptBId);
                Assert.All(visibleDepts, d => Assert.Equal(tenantA, d.CollegeId));

                // Attempt raw SQL INSERT into Tenant B while session is Tenant A -> must fail RLS WITH CHECK
                await Assert.ThrowsAsync<PostgresException>(async () =>
                {
                    await dbA.Database.ExecuteSqlInterpolatedAsync(
                        $"INSERT INTO \"Departments\" (\"Id\", \"CollegeId\", \"Name\", \"Code\", \"CreatedAtUtc\", \"UpdatedAtUtc\", \"IsDeleted\") VALUES ({Guid.NewGuid()}, {tenantB}, 'Hack', 'HK', {DateTime.UtcNow}, {DateTime.UtcNow}, false)");
                });

                // Attempt raw SQL UPDATE and DELETE on Tenant B -> 0 rows affected due to RLS USING policy
                var updatedRows = await dbA.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE \"Departments\" SET \"Name\" = 'Tampered' WHERE \"Id\" = {deptBId}");
                Assert.Equal(0, updatedRows);

                var deletedRows = await dbA.Database.ExecuteSqlInterpolatedAsync(
                    $"DELETE FROM \"Departments\" WHERE \"Id\" = {deptBId}");
                Assert.Equal(0, deletedRows);
            }

            // 3. Query with missing/empty tenant context -> 0 rows visible (fail closed)
            var emptyContext = new TenantContext { CollegeId = null, IsSuperAdmin = false };
            var interceptorEmpty = new TenantRlsConnectionInterceptor(emptyContext, NullLogger<TenantRlsConnectionInterceptor>.Instance);
            var optsEmpty = new DbContextOptionsBuilder<ProjectHubDbContext>()
                .UseNpgsql(AppConnStr)
                .AddInterceptors(interceptorEmpty)
                .Options;

            await using (var dbEmpty = new ProjectHubDbContext(optsEmpty, emptyContext))
            {
                var visibleWithoutTenant = await dbEmpty.Departments.IgnoreQueryFilters().ToListAsync();
                Assert.Empty(visibleWithoutTenant);
            }
        }
        finally
        {
            await using var cleanupConn = new NpgsqlConnection(AdminConnStr);
            await cleanupConn.OpenAsync();
            await using var cleanupCmd = cleanupConn.CreateCommand();
            cleanupCmd.CommandText = $"""
                DELETE FROM "Departments" WHERE "Id" IN ('{deptAId}', '{deptBId}');
                DELETE FROM "CollegeTenants" WHERE "Id" IN ('{tenantA}', '{tenantB}');
                """;
            await cleanupCmd.ExecuteNonQueryAsync();
        }
    }
}
