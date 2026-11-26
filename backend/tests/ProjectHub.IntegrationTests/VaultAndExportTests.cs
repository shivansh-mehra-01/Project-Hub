using System.IdentityModel.Tokens.Jwt;
using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ProjectHub.Application.Common.Models;
using ProjectHub.Domain.Enums;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class VaultAndExportTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public VaultAndExportTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private static string GenerateToken(Guid userId, Guid collegeId, Guid? departmentId, UserRole role, bool isCoordinator = false)
    {
        var secret = "ProjectHubSuperSecretDevKeyMinLength32CharactersRequired!";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new("sub", userId.ToString()),
            new("user_id", userId.ToString()),
            new(ClaimTypes.Email, "testuser@college.edu"),
            new(ClaimTypes.Role, role.ToString()),
            new("role", role.ToString()),
            new("college_id", collegeId.ToString()),
            new("is_coordinator", isCoordinator.ToString().ToLowerInvariant())
        };

        if (departmentId.HasValue)
        {
            claims.Add(new Claim("department_id", departmentId.Value.ToString()));
            claims.Add(new Claim("dept_id", departmentId.Value.ToString()));
        }

        var token = new JwtSecurityToken(
            issuer: "https://api.projecthub.local",
            audience: "https://app.projecthub.local",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<string> GetTokenForPersonaAsync(string role)
    {
        var email = role switch
        {
            "HOD" => "hod@sistec.ac.in",
            "Faculty" => "faculty@sistec.ac.in",
            "Coordinator" => "coordinator@sistec.ac.in",
            "Student" => "student@sistec.ac.in",
            _ => throw new ArgumentException($"Unknown persona role: {role}")
        };

        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = "Pass@1234"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        return auth!.Token;
    }

    [Fact]
    public async Task StudentArtifactUpload_ValidPdf_SavesAndComputesChecksum()
    {
        var studentToken = await GetTokenForPersonaAsync("Student");
        var content = new MultipartFormDataContent();
        var dummyPdfBytes = Encoding.UTF8.GetBytes("%PDF-1.4\n1 0 obj\n<< /Title (Test Synopsis) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");
        var byteContent = new ByteArrayContent(dummyPdfBytes);
        byteContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        content.Add(byteContent, "file", "2026-CS-MIN-01-Synopsis.pdf");

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/student/artifacts/Synopsis/upload")
        {
            Content = content
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var dto = await response.Content.ReadFromJsonAsync<ArtifactSlotDto>();
        Assert.NotNull(dto);
        Assert.Equal(ArtifactSlotType.Synopsis, dto.SlotType);
        Assert.Equal("2026-CS-MIN-01-Synopsis.pdf", dto.FileName);
        Assert.Equal(ArtifactStatus.Uploaded, dto.Status);
        Assert.False(string.IsNullOrWhiteSpace(dto.Sha256Checksum));
        Assert.Contains("vault/", dto.StorageKey);
    }

    [Fact]
    public async Task StudentArtifactUpload_DisallowedExtension_RejectsWithBadRequest()
    {
        var studentToken = await GetTokenForPersonaAsync("Student");
        var content = new MultipartFormDataContent();
        var scriptBytes = Encoding.UTF8.GetBytes("malicious executable content");
        var byteContent = new ByteArrayContent(scriptBytes);
        byteContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        content.Add(byteContent, "file", "exploit.exe");

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/student/artifacts/Synopsis/upload")
        {
            Content = content
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ArtifactDownload_AuthorizedTenant_StreamsFileSuccessfully()
    {
        // 1. Upload an artifact first
        var studentToken = await GetTokenForPersonaAsync("Student");
        var content = new MultipartFormDataContent();
        var samplePdf = Encoding.UTF8.GetBytes("%PDF-1.4\nTest Capstone Thesis Stream\n%%EOF");
        var byteContent = new ByteArrayContent(samplePdf);
        byteContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        content.Add(byteContent, "file", "Thesis-Deliverable.pdf");

        var uploadReq = new HttpRequestMessage(HttpMethod.Post, "/api/student/artifacts/FinalThesis/upload")
        {
            Content = content
        };
        uploadReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);

        var uploadRes = await _client.SendAsync(uploadReq);
        Assert.Equal(HttpStatusCode.OK, uploadRes.StatusCode);
        var uploadedDto = await uploadRes.Content.ReadFromJsonAsync<ArtifactSlotDto>();
        Assert.NotNull(uploadedDto);
        var artifactId = uploadedDto.Id!.Value;

        // 2. Download as authorized student in the same college
        var downloadReq = new HttpRequestMessage(HttpMethod.Get, $"/api/artifacts/{artifactId}/download");
        downloadReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);

        var downloadRes = await _client.SendAsync(downloadReq);
        Assert.Equal(HttpStatusCode.OK, downloadRes.StatusCode);
        Assert.Equal("application/pdf", downloadRes.Content.Headers.ContentType?.MediaType);
        var downloadedBytes = await downloadRes.Content.ReadAsByteArrayAsync();
        Assert.True(downloadedBytes.Length > 0);

        // 3. Faculty Guide Reviews the deliverable
        var facultyToken = await GetTokenForPersonaAsync("Faculty");
        var reviewReq = new HttpRequestMessage(HttpMethod.Post, $"/api/artifacts/{artifactId}/review")
        {
            Content = JsonContent.Create(new { isApproved = true, reviewerNote = "Methodology and test results verified." })
        };
        reviewReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", facultyToken);

        var reviewRes = await _client.SendAsync(reviewReq);
        Assert.Equal(HttpStatusCode.OK, reviewRes.StatusCode);

        // 4. Download attempt with an unauthorized cross-tenant user should be 404
        var crossTenantToken = GenerateToken(Guid.NewGuid(), Guid.NewGuid(), null, UserRole.Student);
        var crossTenantReq = new HttpRequestMessage(HttpMethod.Get, $"/api/artifacts/{artifactId}/download");
        crossTenantReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", crossTenantToken);

        var crossTenantRes = await _client.SendAsync(crossTenantReq);
        Assert.Equal(HttpStatusCode.NotFound, crossTenantRes.StatusCode);
    }

    [Fact]
    public async Task CoordinatorExportMarksheet_ReturnsValidCsvWithStandardHeaders()
    {
        var coordinatorToken = await GetTokenForPersonaAsync("Coordinator");
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/coordinator/export-marksheet");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", coordinatorToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);

        var csvContent = await response.Content.ReadAsStringAsync();
        Assert.Contains("Enrollment_USN,Student_Name,Branch,Semester,Subject_Code,Team_Code", csvContent);
        Assert.Contains("Shared_Rubric_60,Individual_Score_40,Total_Marks_100,Attainment_Status", csvContent);
    }
}
