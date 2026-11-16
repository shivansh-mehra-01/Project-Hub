using System.Net;
using System.Net.Http.Json;
using ProjectHub.Application.Common.Models;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;
using ProjectHub.Application.Interfaces;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class AuthEndpointTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public AuthEndpointTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ResolveTenant_ValidInstitutionalDomain_ReturnsTenantInfo()
    {
        // Act: Query sistec.ac.in domain
        var response = await _client.GetAsync("/api/auth/resolve-tenant?email=test.student@sistec.ac.in");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ResolveTenantResponse>();
        Assert.NotNull(result);
        Assert.True(result.Resolved);
        Assert.Equal("SISTEC", result.TenantCode);
        Assert.Equal("sistec.ac.in", result.SsoDomain);
        Assert.Equal(DbInitializer.SistecTenantId, result.CollegeId);
    }

    [Fact]
    public async Task ResolveTenant_UnregisteredDomain_ReturnsResolvedFalse()
    {
        // Act: Query unregistered domain
        var response = await _client.GetAsync("/api/auth/resolve-tenant?email=external@unregistered-univ.org");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ResolveTenantResponse>();
        Assert.NotNull(result);
        Assert.False(result.Resolved);
        Assert.Null(result.CollegeId);
    }

    [Fact]
    public async Task Login_StudentRole_ValidCredentials_ReturnsValidJwtAndProfile()
    {
        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "0176cs221045@sistec.ac.in",
            Password = "ProjectHub@2026"
        });

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        Assert.False(string.IsNullOrWhiteSpace(auth.Token));
        Assert.Equal(UserRole.Student, auth.User.Role);
        Assert.Equal(DbInitializer.SistecTenantId, auth.User.CollegeId);
        Assert.EndsWith("@sistec.ac.in", auth.User.Email);
        Assert.NotEmpty(auth.User.FullName);
    }

    [Fact]
    public async Task Login_FacultyRole_ValidCredentials_ReturnsValidJwtAndProfile()
    {
        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "priya.nair@sistec.ac.in",
            Password = "ProjectHub@2026"
        });

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        Assert.False(string.IsNullOrWhiteSpace(auth.Token));
        Assert.Equal(UserRole.Faculty, auth.User.Role);
        Assert.Equal(DbInitializer.SistecTenantId, auth.User.CollegeId);
    }

    [Fact]
    public async Task Login_ValidSeededCredentials_ReturnsAuthResponse()
    {
        // Act: Login with seeded HOD credentials
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "hod.cse@sistec.ac.in",
            Password = "ProjectHub@2026"
        });

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        Assert.False(string.IsNullOrWhiteSpace(auth.Token));
        Assert.Equal(UserRole.HOD, auth.User.Role);
    }

    [Fact]
    public async Task Login_InvalidPassword_ReturnsUnauthorized()
    {
        // Act: Login with wrong password
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "hod.cse@sistec.ac.in",
            Password = "WrongPassword123!"
        });

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Activate_PreprovisionedUser_ActivatesAccountSuccessfully()
    {
        // 1. Arrange: Seed a pre-provisioned inactive user
        var unactivatedEmail = "new.student@sistec.ac.in";
        var registrationCode = "0187CS231999";

        using (var scope = _factory.Services.CreateScope())
        {
            var seedTenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            seedTenantContext.IsSuperAdmin = true;

            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.Users.Add(new UserAccount
            {
                Id = Guid.NewGuid(),
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                FullName = "Preprovisioned Candidate",
                Email = unactivatedEmail,
                EnrollmentOrEmployeeCode = registrationCode,
                Role = UserRole.Student,
                IsActive = true,
                IsActivated = false
            });
            await db.SaveChangesAsync();
        }

        // 2. Act: Activate account
        var response = await _client.PostAsJsonAsync("/api/auth/activate", new ActivateRequest
        {
            Email = unactivatedEmail,
            EnrollmentOrEmployeeCode = registrationCode,
            NewPassword = "BrandNewSecurePassword@2026"
        });

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        Assert.False(string.IsNullOrWhiteSpace(auth.Token));
        Assert.Equal(unactivatedEmail, auth.User.Email);

        // Verify user can now log in with the new password
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = unactivatedEmail,
            Password = "BrandNewSecurePassword@2026"
        });
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
    }
}
