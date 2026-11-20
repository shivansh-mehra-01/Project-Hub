using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ProjectHub.Application.Common.Models;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class CrossTenantAndAuthorizationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public CrossTenantAndAuthorizationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> GetTokenForPersonaAsync(string role)
    {
        var email = role switch
        {
            "SuperAdmin" => "admin@projecthub.in",
            "CollegeAdmin" => "principal@sistec.ac.in",
            "HOD" => "hod.cse@sistec.ac.in",
            "Faculty" => "sk.verma@sistec.ac.in",
            "Coordinator" => "priya.nair@sistec.ac.in",
            "Student" => "0176cs221045@sistec.ac.in",
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
    public async Task PlatformEndpoints_AllowSuperAdmin_BlocksFaculty()
    {
        // 1. SuperAdmin Token
        var superAdminToken = await GetTokenForPersonaAsync("SuperAdmin");
        var authorizedRequest = new HttpRequestMessage(HttpMethod.Get, "/api/platform/tenants");
        authorizedRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", superAdminToken);

        var superAdminResponse = await _client.SendAsync(authorizedRequest);
        Assert.Equal(HttpStatusCode.OK, superAdminResponse.StatusCode);
        var tenants = await superAdminResponse.Content.ReadFromJsonAsync<List<CollegeTenantDto>>();
        Assert.NotNull(tenants);
        Assert.True(tenants.Count >= 3);
        Assert.Contains(tenants, t => t.TenantCode == "SISTEC");
        Assert.Contains(tenants, t => t.TenantCode == "BMSCE");
        Assert.Contains(tenants, t => t.TenantCode == "RVCE");

        // 2. Faculty Token attempting to access SuperAdmin Platform endpoint
        var facultyToken = await GetTokenForPersonaAsync("Faculty");
        var forbiddenRequest = new HttpRequestMessage(HttpMethod.Get, "/api/platform/tenants");
        forbiddenRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", facultyToken);

        var facultyResponse = await _client.SendAsync(forbiddenRequest);
        Assert.Equal(HttpStatusCode.Forbidden, facultyResponse.StatusCode);
    }

    [Fact]
    public async Task CollegeAdminEndpoints_AllowCollegeAdmin_BlocksStudent()
    {
        // 1. CollegeAdmin Token
        var adminToken = await GetTokenForPersonaAsync("CollegeAdmin");
        var adminRequest = new HttpRequestMessage(HttpMethod.Get, "/api/college/overview");
        adminRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var adminResponse = await _client.SendAsync(adminRequest);
        Assert.Equal(HttpStatusCode.OK, adminResponse.StatusCode);
        var overview = await adminResponse.Content.ReadFromJsonAsync<CollegeOverviewDto>();
        Assert.NotNull(overview);
        Assert.Equal(DbInitializer.SistecTenantId, overview.CollegeId);

        // 2. Student Token attempting to access CollegeAdmin overview
        var studentToken = await GetTokenForPersonaAsync("Student");
        var studentRequest = new HttpRequestMessage(HttpMethod.Get, "/api/college/overview");
        studentRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);

        var studentResponse = await _client.SendAsync(studentRequest);
        Assert.Equal(HttpStatusCode.Forbidden, studentResponse.StatusCode);
    }

    [Fact]
    public async Task HodEndpoints_AllowHod_BlocksFaculty()
    {
        // 1. HOD Token
        var hodToken = await GetTokenForPersonaAsync("HOD");
        var hodRequest = new HttpRequestMessage(HttpMethod.Get, "/api/hod/dashboard");
        hodRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", hodToken);

        var hodResponse = await _client.SendAsync(hodRequest);
        Assert.Equal(HttpStatusCode.OK, hodResponse.StatusCode);
        var dashboard = await hodResponse.Content.ReadFromJsonAsync<HodDashboardDto>();
        Assert.NotNull(dashboard);
        Assert.Equal("CSE", dashboard.DepartmentCode);

        // 2. Faculty Token attempting to access HOD dashboard
        var facultyToken = await GetTokenForPersonaAsync("Faculty");
        var facultyRequest = new HttpRequestMessage(HttpMethod.Get, "/api/hod/dashboard");
        facultyRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", facultyToken);

        var facultyResponse = await _client.SendAsync(facultyRequest);
        Assert.Equal(HttpStatusCode.Forbidden, facultyResponse.StatusCode);
    }

    [Fact]
    public async Task CrossTenantIsolation_JwtClaimsEnforced_HeaderSpoofingIgnored()
    {
        // Student Shivansh belongs to SISTec.
        var studentToken = await GetTokenForPersonaAsync("Student");

        // Send request spoofing X-College-Id with BMSCE's Tenant ID
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/student/workspace");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);
        request.Headers.Add("X-College-Id", DbInitializer.BmsceTenantId.ToString());

        var response = await _client.SendAsync(request);

        // Assert: Must return 200 OK for SISTec workspace (ignoring the spoofed BMSCE header)
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var workspace = await response.Content.ReadFromJsonAsync<StudentWorkspaceDto>();
        Assert.NotNull(workspace);
        Assert.Equal("2026-CS-MIN-01", workspace.TeamCode);
        Assert.Equal(DbInitializer.Team01Id, workspace.TeamId);
        Assert.Equal(4, workspace.Artifacts.Count);
    }

    [Fact]
    public async Task CreateTenant_AutoCreatesCollegeAdminUser_AndReturnsAdminEmail()
    {
        var superAdminToken = await GetTokenForPersonaAsync("SuperAdmin");

        var uniqueCode = "LNCT";
        var uniqueDomain = "lnct.ac.in";

        var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/platform/tenants")
        {
            Content = JsonContent.Create(new CreateTenantRequest
            {
                Name = "Lakshmi Narain College of Technology",
                TenantCode = uniqueCode,
                SsoDomain = uniqueDomain,
                LicenseTier = LicenseTier.Standard,
                MaxStudentSeats = 1500,
                StorageQuotaGb = 50,
                EnforceStrictSso = true,
                PrincipalName = "Dr. Anupam Shukla",
                PrincipalEmail = "principal@lnct.ac.in"
            })
        };
        createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", superAdminToken);

        var response = await _client.SendAsync(createReq);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var result = await response.Content.ReadFromJsonAsync<CreateTenantResponse>();
        Assert.NotNull(result);
        Assert.Equal("principal@lnct.ac.in", result.AdminEmail);
        Assert.NotNull(result.Tenant);
        Assert.Equal(uniqueCode, result.Tenant.TenantCode);
        Assert.Equal("principal@lnct.ac.in", result.Tenant.PrincipalEmail);

        // Verify the newly created CollegeAdmin can authenticate immediately
        var loginRes = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "principal@lnct.ac.in",
            Password = "Pass@1234"
        });
        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);
        var auth = await loginRes.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        Assert.NotNull(auth.User);
        Assert.Equal(UserRole.CollegeAdmin, auth.User.Role);
        Assert.Equal("principal@lnct.ac.in", auth.User.Email);
    }

    [Fact]
    public async Task ProvisionAdmin_ForTenant_CreatesOrUpdatesPrincipalAccount()
    {
        var superAdminToken = await GetTokenForPersonaAsync("SuperAdmin");

        // Use BMSCE tenant ID from seed
        var bmsceId = DbInitializer.BmsceTenantId;

        var provisionReq = new HttpRequestMessage(HttpMethod.Post, $"/api/platform/tenants/{bmsceId}/provision-admin")
        {
            Content = JsonContent.Create(new ProvisionAdminRequest
            {
                FullName = "Dr. B.M.S. Principal",
                Email = "principal@bmsce.ac.in"
            })
        };
        provisionReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", superAdminToken);

        var response = await _client.SendAsync(provisionReq);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadFromJsonAsync<ProvisionAdminResponse>();
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Equal("principal@bmsce.ac.in", result.AdminEmail);

        // Verify authentication works
        var loginRes = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "principal@bmsce.ac.in",
            Password = "Pass@1234"
        });
        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);
        var auth = await loginRes.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        Assert.NotNull(auth.User);
        Assert.Equal(UserRole.CollegeAdmin, auth.User.Role);
    }

    [Fact]
    public async Task CollegeOverview_Returns_ActiveInstitutionalSession_AndDepartmentSummariesWithTrackStatus()
    {
        // Login as CollegeAdmin (Principal)
        var loginRes = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "principal@sistec.ac.in",
            Password = "Pass@1234"
        });
        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);
        var auth = await loginRes.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);

        var req = new HttpRequestMessage(HttpMethod.Get, "/api/college/overview");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var overview = await res.Content.ReadFromJsonAsync<CollegeOverviewDto>();
        Assert.NotNull(overview);
        Assert.NotNull(overview.ActiveSession);
        Assert.Contains("2026", overview.ActiveSession.Label);
        Assert.NotNull(overview.ActiveSession.ExamCutoffDateUtc);
        Assert.True(overview.ActiveSession.AllowInterdisciplinaryTeams);

        Assert.NotEmpty(overview.DepartmentSummaries);
        var cseDept = overview.DepartmentSummaries.FirstOrDefault(d => d.DepartmentCode == "CSE");
        Assert.NotNull(cseDept);
        Assert.Equal("Active", cseDept.TrackStatus);
        Assert.True(cseDept.ActiveTrackCount >= 1);

        var eceDept = overview.DepartmentSummaries.FirstOrDefault(d => d.DepartmentCode == "ECE");
        if (eceDept != null)
        {
            Assert.Equal("Awaiting HOD Launch", eceDept.TrackStatus);
        }
    }

    [Fact]
    public async Task ConfigureAcademicSession_AllowsCollegeAdmin_ToOpenAndConfigureOverarchingSession()
    {
        // Login as CollegeAdmin
        var loginRes = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "principal@sistec.ac.in",
            Password = "Pass@1234"
        });
        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);
        var auth = await loginRes.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);

        var cutoff = new DateTime(2028, 5, 31, 23, 59, 59, DateTimeKind.Utc);
        var configReq = new HttpRequestMessage(HttpMethod.Post, "/api/college/sessions")
        {
            Content = JsonContent.Create(new ConfigureAcademicSessionRequest
            {
                AcademicYear = "2027–2028",
                ExamCutoffDateUtc = cutoff,
                AllowInterdisciplinaryTeams = true,
                IsActive = true
            })
        };
        configReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);

        var postRes = await _client.SendAsync(configReq);
        Assert.Equal(HttpStatusCode.OK, postRes.StatusCode);

        var sessionDto = await postRes.Content.ReadFromJsonAsync<AcademicSessionDto>();
        Assert.NotNull(sessionDto);
        Assert.Equal("2027–2028", sessionDto.Label);
        Assert.True(sessionDto.AllowInterdisciplinaryTeams);
        Assert.True(sessionDto.IsActive);

        // Verify GET /api/college/sessions/active returns this configured session
        var getReq = new HttpRequestMessage(HttpMethod.Get, "/api/college/sessions/active");
        getReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);

        var getRes = await _client.SendAsync(getReq);
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);
        var activeSession = await getRes.Content.ReadFromJsonAsync<AcademicSessionDto>();
        Assert.NotNull(activeSession);
        Assert.Equal("2027–2028", activeSession.Label);
    }

    [Fact]
    public async Task Coordinator_AddSingleStudent_EnforcesValidation_DispatchesOtp_AndRejectsDuplicates()
    {
        // 1. Get Coordinator token
        var coordinatorToken = await GetTokenForPersonaAsync("Coordinator");

        // 2. Reject non-institutional email domain
        var badDomainReq = new HttpRequestMessage(HttpMethod.Post, "/api/coordinator/roster/student")
        {
            Content = JsonContent.Create(new AddSingleStudentRequest
            {
                FullName = "Rohan Sharma",
                EnrollmentNumber = "0176CS221098",
                Email = "rohan.sharma@gmail.com",
                DepartmentId = DbInitializer.CseDepartmentId,
                SemesterNumber = 6,
                AdmissionBatch = "2023-2027"
            })
        };
        badDomainReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", coordinatorToken);

        var badDomainRes = await _client.SendAsync(badDomainReq);
        Assert.Equal(HttpStatusCode.BadRequest, badDomainRes.StatusCode);

        // 3. Provision new student with valid institutional domain
        var validReq = new HttpRequestMessage(HttpMethod.Post, "/api/coordinator/roster/student")
        {
            Content = JsonContent.Create(new AddSingleStudentRequest
            {
                FullName = "Aditya Verma",
                EnrollmentNumber = "0176CS221099",
                Email = "0176cs221099@sistec.ac.in",
                DepartmentId = DbInitializer.CseDepartmentId,
                SemesterNumber = 6,
                AdmissionBatch = "2023-2027"
            })
        };
        validReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", coordinatorToken);

        var validRes = await _client.SendAsync(validReq);
        Assert.Equal(HttpStatusCode.Created, validRes.StatusCode);

        var provisioned = await validRes.Content.ReadFromJsonAsync<SingleStudentProvisionedResponse>();
        Assert.NotNull(provisioned);
        Assert.Equal("Aditya Verma", provisioned.FullName);
        Assert.Equal("0176CS221099", provisioned.EnrollmentNumber);
        Assert.Equal("0176cs221099@sistec.ac.in", provisioned.Email);
        Assert.NotNull(provisioned.DevOtp);
        Assert.Equal(6, provisioned.DevOtp.Length);

        // 4. Duplicate request must return 409 Conflict
        var dupReq = new HttpRequestMessage(HttpMethod.Post, "/api/coordinator/roster/student")
        {
            Content = JsonContent.Create(new AddSingleStudentRequest
            {
                FullName = "Aditya Verma",
                EnrollmentNumber = "0176CS221099",
                Email = "0176cs221099@sistec.ac.in",
                DepartmentId = DbInitializer.CseDepartmentId,
                SemesterNumber = 6,
                AdmissionBatch = "2023-2027"
            })
        };
        dupReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", coordinatorToken);

        var dupRes = await _client.SendAsync(dupReq);
        Assert.Equal(HttpStatusCode.Conflict, dupRes.StatusCode);

        // 5. Newly provisioned student can activate password via OTP on /api/auth/reset-password
        var resetRes = await _client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest
        {
            Email = "0176cs221099@sistec.ac.in",
            Otp = provisioned.DevOtp,
            NewPassword = "NewStudentPass@123"
        });
        Assert.Equal(HttpStatusCode.OK, resetRes.StatusCode);

        // 6. Verify student can login with newly activated password
        var loginRes = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "0176cs221099@sistec.ac.in",
            Password = "NewStudentPass@123"
        });
        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);

        // 7. Student persona attempting to call coordinator roster provisioning must be Forbidden (403)
        var studentAuth = await loginRes.Content.ReadFromJsonAsync<AuthResponse>();
        var forbiddenReq = new HttpRequestMessage(HttpMethod.Post, "/api/coordinator/roster/student")
        {
            Content = JsonContent.Create(new AddSingleStudentRequest
            {
                FullName = "Hacker Student",
                EnrollmentNumber = "0176CS221111",
                Email = "0176cs221111@sistec.ac.in",
                DepartmentId = DbInitializer.CseDepartmentId,
                SemesterNumber = 6
            })
        };
        forbiddenReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentAuth!.Token);

        var forbiddenRes = await _client.SendAsync(forbiddenReq);
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenRes.StatusCode);
    }
}
