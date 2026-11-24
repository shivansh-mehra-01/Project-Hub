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
    public async Task Login_StudentRole_ValidCredentials_ReturnsValidJwtAndProfile()
    {
        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "0176cs221045@sistec.ac.in",
            Password = "Pass@1234"
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
            Password = "Pass@1234"
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
            Password = "Pass@1234"
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
    public async Task Login_UnactivatedAccount_ReturnsBadRequestWithActivationPrompt()
    {
        // Act: Attempt to login before setting initial password
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "rohan.verma@sistec.ac.in",
            Password = "AnyPassword123!"
        });

        // Assert: 400 Bad Request with guidance to use Set/Forgot Password OTP
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("Account password not set yet", content);
    }

    [Fact]
    public async Task RequestPasswordOtp_ValidEmail_DispatchesOtpAndReturnsDevOtpInDevelopment()
    {
        // Act: Request OTP for pre-provisioned candidate
        var response = await _client.PostAsJsonAsync("/api/auth/request-password-otp", new RequestPasswordOtpRequest
        {
            Email = "rohan.verma@sistec.ac.in"
        });

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RequestPasswordOtpResponse>();
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.NotNull(result.DevOtp);
        Assert.Equal(6, result.DevOtp.Length);
    }

    [Fact]
    public async Task RequestPasswordOtp_UnknownEmail_ReturnsGenericSuccess_PreventingEnumeration()
    {
        // Act: Request OTP for unknown user (anti-enumeration security standard)
        var response = await _client.PostAsJsonAsync("/api/auth/request-password-otp", new RequestPasswordOtpRequest
        {
            Email = "unknown.student@sistec.ac.in"
        });

        // Assert: Must return 200 OK without disclosing user non-existence or leaking devOtp
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<RequestPasswordOtpResponse>();
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Null(result.DevOtp);
    }

    [Fact]
    public async Task RequestPasswordOtp_DuplicateRequestWithinCooldown_ReturnsThrottledBadRequest()
    {
        // 1. Initial request for student Aarav
        var firstResponse = await _client.PostAsJsonAsync("/api/auth/request-password-otp", new RequestPasswordOtpRequest
        {
            Email = "0176cs221002@sistec.ac.in"
        });
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

        // 2. Rapid duplicate request immediately afterwards
        var secondResponse = await _client.PostAsJsonAsync("/api/auth/request-password-otp", new RequestPasswordOtpRequest
        {
            Email = "0176cs221002@sistec.ac.in"
        });

        // Assert: Throttled with 400 Bad Request
        Assert.Equal(HttpStatusCode.BadRequest, secondResponse.StatusCode);
        var content = await secondResponse.Content.ReadAsStringAsync();
        Assert.Contains("Please wait", content);
    }

    [Fact]
    public async Task ResetPassword_ValidOtp_ActivatesAccountAndEnablesLogin()
    {
        // 1. Request OTP for candidate Diya
        var otpResponse = await _client.PostAsJsonAsync("/api/auth/request-password-otp", new RequestPasswordOtpRequest
        {
            Email = "student3@sistec.ac.in"
        });
        otpResponse.EnsureSuccessStatusCode();
        var otpResult = await otpResponse.Content.ReadFromJsonAsync<RequestPasswordOtpResponse>();
        Assert.NotNull(otpResult?.DevOtp);

        // 2. Reset / Set password
        var resetResponse = await _client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest
        {
            Email = "student3@sistec.ac.in",
            Otp = otpResult.DevOtp,
            NewPassword = "DiyaSecurePassword@2026"
        });

        // Assert: Returns signed JWT and activated profile
        Assert.Equal(HttpStatusCode.OK, resetResponse.StatusCode);
        var auth = await resetResponse.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        Assert.False(string.IsNullOrWhiteSpace(auth.Token));
        Assert.Equal("student3@sistec.ac.in", auth.User.Email);

        // 3. Verify OTP single-use: Replaying the same OTP returns 400 Bad Request
        var replayResponse = await _client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest
        {
            Email = "student3@sistec.ac.in",
            Otp = otpResult.DevOtp,
            NewPassword = "AnotherPassword@2026"
        });
        Assert.Equal(HttpStatusCode.BadRequest, replayResponse.StatusCode);

        // 4. Verify user can now log in directly with their new password
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "student3@sistec.ac.in",
            Password = "DiyaSecurePassword@2026"
        });
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        var loginAuth = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(loginAuth);
        Assert.Equal(auth.User.Id, loginAuth.User.Id);
    }

    [Fact]
    public async Task ResetPassword_InvalidOtp_ReturnsBadRequest()
    {
        // Act: Attempt password reset with invalid OTP
        var response = await _client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest
        {
            Email = "rohan.verma@sistec.ac.in",
            Otp = "999999",
            NewPassword = "ValidPassword@2026"
        });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
