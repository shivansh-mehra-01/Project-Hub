using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using ProjectHub.Application.Common.Models;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class StudentPhase4Tests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public StudentPhase4Tests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private IServiceScope CreateTenantScope()
    {
        var scope = _factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        tenantContext.IsSuperAdmin = true;
        tenantContext.CollegeId = DbInitializer.SistecTenantId;
        return scope;
    }

    private static string GenerateToken(
        Guid userId,
        Guid collegeId,
        Guid? departmentId,
        UserRole role,
        bool isCoordinator = false)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("ProjectHubSuperSecretDevKeyMinLength32CharactersRequired!"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new("sub", userId.ToString()),
            new("user_id", userId.ToString()),
            new(ClaimTypes.Email, $"student.{userId:N}@sistec.ac.in"),
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

    private async Task<(Guid StudentId, string Token)> CreateStudentAsync(
        string emailSuffix,
        Guid? collegeId = null,
        Guid? departmentId = null,
        bool isEnrolled = true)
    {
        var cid = collegeId ?? DbInitializer.SistecTenantId;
        var did = departmentId ?? DbInitializer.CseDepartmentId;
        var studentId = Guid.NewGuid();

        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var student = new UserAccount
            {
                Id = studentId,
                CollegeId = cid,
                DepartmentId = did,
                FullName = $"Phase4 Student {emailSuffix}",
                Email = $"p4.{emailSuffix}.{studentId:N}@sistec.ac.in",
                EnrollmentOrEmployeeCode = $"0176CS22{Random.Shared.Next(1000, 9999)}",
                Role = UserRole.Student,
                IsActive = true,
                IsActivated = true
            };
            db.Users.Add(student);

            if (isEnrolled)
            {
                var enrollment = new StudentAcademicEnrollment
                {
                    CollegeId = cid,
                    StudentUserId = studentId,
                    CourseProgramId = DbInitializer.SistecBTechCourseProgramId,
                    DepartmentId = did,
                    CurrentSemesterTermId = DbInitializer.SistecCseSem6TermId,
                    AdmissionBatch = "2023-2027",
                    AcademicStatus = AcademicStatus.Active
                };
                db.StudentAcademicEnrollments.Add(enrollment);
            }

            await db.SaveChangesAsync();
        }

        var token = GenerateToken(studentId, cid, did, UserRole.Student);
        return (studentId, token);
    }

    private async Task<(Guid TeamId, string TeamCode)> CreateTeamAsync(
        Guid leadStudentId,
        string title = "Phase 4 Automated Team",
        bool isRosterLocked = false,
        ProjectStatus status = ProjectStatus.Draft)
    {
        var teamId = Guid.NewGuid();
        var teamCode = $"2026-CS-P4-{Random.Shared.Next(100, 999)}";

        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var team = new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = teamCode,
                Title = title,
                Abstract = "Phase 4 Team Abstract for Integration Testing.",
                Status = status,
                IsRosterLocked = isRosterLocked,
                CreatedAtUtc = DateTime.UtcNow
            };
            team.Members.Add(new TeamMember
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = teamId,
                UserId = leadStudentId,
                IsTeamLead = true,
                ModuleResponsibility = "Architecture & Lead"
            });

            db.ProjectTeams.Add(team);
            await db.SaveChangesAsync();
        }

        return (teamId, teamCode);
    }

    // -------------------------------------------------------------------------
    // TEAM-001: Create project team roster & initial lead
    // -------------------------------------------------------------------------
    [Fact]
    public async Task TEAM001_CreateTeam_UnallocatedStudent_CreatesDraftTeamWithLeaderRole()
    {
        // Arrange
        var (studentId, token) = await CreateStudentAsync("lead_creator");
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams")
        {
            Content = JsonContent.Create(new CreateStudentTeamRequest
            {
                Title = "Autonomous Solar Microgrid Telemetry",
                Abstract = "Edge telemetric node monitoring solar battery dissipation."
            })
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var res = await _client.SendAsync(req);

        // Assert
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        // Verify in DB that student is team lead and status is Draft
        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var membership = await db.TeamMembers
            .Include(m => m.ProjectTeam)
            .FirstOrDefaultAsync(m => m.UserId == studentId);

        Assert.NotNull(membership);
        Assert.True(membership.IsTeamLead);
        Assert.Equal(ProjectStatus.Draft, membership.ProjectTeam.Status);
        Assert.False(membership.ProjectTeam.IsRosterLocked);
    }

    [Fact]
    public async Task TEAM001_CreateTeam_AlreadyAllocatedStudent_ReturnsBadRequest()
    {
        // Arrange
        var (studentId, token) = await CreateStudentAsync("already_allocated");
        await CreateTeamAsync(studentId, "Existing Team");

        var req = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams")
        {
            Content = JsonContent.Create(new CreateStudentTeamRequest
            {
                Title = "Second Team Attempt",
                Abstract = "Should fail because student already belongs to an active team."
            })
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var res = await _client.SendAsync(req);

        // Assert (Already assigned to team returns Conflict 409)
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
    }

    // -------------------------------------------------------------------------
    // TEAM-002: Search eligible classmates for team formation
    // -------------------------------------------------------------------------
    [Fact]
    public async Task TEAM002_GetEligiblePeers_ReturnsUnallocatedClassmatesInSameDepartment()
    {
        // Arrange
        var (_, callerToken) = await CreateStudentAsync("caller_searcher");
        var (unallocatedPeerId, _) = await CreateStudentAsync("unallocated_peer");

        // Seed an allocated student who should NOT appear in eligible peers
        var (allocatedStudentId, _) = await CreateStudentAsync("allocated_student");
        await CreateTeamAsync(allocatedStudentId, "Allocated Member Team");

        var req = new HttpRequestMessage(HttpMethod.Get, "/api/student/eligible-peers");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", callerToken);

        // Act
        var res = await _client.SendAsync(req);

        // Assert
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var peers = await res.Content.ReadFromJsonAsync<List<EligiblePeerDto>>();
        Assert.NotNull(peers);
        Assert.Contains(peers, p => p.StudentId == unallocatedPeerId);
        Assert.DoesNotContain(peers, p => p.StudentId == allocatedStudentId);
    }

    // -------------------------------------------------------------------------
    // TEAM-003: Peer privacy data minimization
    // -------------------------------------------------------------------------
    [Fact]
    public async Task TEAM003_GetEligiblePeers_DataMinimization_ConcealsPhoneAddressMarksAndCgpa()
    {
        // Arrange
        var (_, callerToken) = await CreateStudentAsync("privacy_caller");
        var (peerId, _) = await CreateStudentAsync("privacy_peer");

        var req = new HttpRequestMessage(HttpMethod.Get, "/api/student/eligible-peers");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", callerToken);

        // Act
        var res = await _client.SendAsync(req);
        var json = await res.Content.ReadAsStringAsync();

        // Assert
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        // The DTO must not contain fields for CGPA, PhoneNumber, Address, Marks
        Assert.False(json.Contains("cgpa", StringComparison.OrdinalIgnoreCase));
        Assert.False(json.Contains("marks", StringComparison.OrdinalIgnoreCase));
        Assert.False(json.Contains("phonenumber", StringComparison.OrdinalIgnoreCase));
        Assert.False(json.Contains("residentialaddress", StringComparison.OrdinalIgnoreCase));
    }

    // -------------------------------------------------------------------------
    // TEAM-004: Dispatch team invitation to peer
    // -------------------------------------------------------------------------
    [Fact]
    public async Task TEAM004_SendTeamInvitation_TeamLead_CreatesPendingInvitation()
    {
        // Arrange
        var (leadId, leadToken) = await CreateStudentAsync("team_lead_inviter");
        await CreateTeamAsync(leadId, "Invitation Dispatch Team");

        var (inviteeId, _) = await CreateStudentAsync("invitee_target");

        var req = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/invitations")
        {
            Content = JsonContent.Create(new SendTeamInvitationRequest
            {
                InviteeStudentId = inviteeId,
                Message = "Join our IoT energy team!"
            })
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);

        // Act
        var res = await _client.SendAsync(req);

        // Assert
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var dto = await res.Content.ReadFromJsonAsync<TeamInvitationDto>();
        Assert.NotNull(dto);
        Assert.Equal(inviteeId, dto.InviteeStudentId);
        Assert.Equal("Pending", dto.StatusText);
    }

    [Fact]
    public async Task TEAM004_SendTeamInvitation_NonLeader_ReturnsForbidden403()
    {
        // Arrange
        var (leadId, _) = await CreateStudentAsync("actual_team_lead");
        var (teamId, _) = await CreateTeamAsync(leadId, "NonLead Invite Test");

        // Add a non-lead member
        var (memberId, memberToken) = await CreateStudentAsync("nonlead_member");
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.TeamMembers.Add(new TeamMember
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = teamId,
                UserId = memberId,
                IsTeamLead = false
            });
            await db.SaveChangesAsync();
        }

        var (targetId, _) = await CreateStudentAsync("target_peer");

        var req = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/invitations")
        {
            Content = JsonContent.Create(new SendTeamInvitationRequest
            {
                InviteeStudentId = targetId
            })
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", memberToken);

        // Act
        var res = await _client.SendAsync(req);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task TEAM004_SendTeamInvitation_DuplicatePending_ReturnsConflictOrBadRequest()
    {
        // Arrange
        var (leadId, leadToken) = await CreateStudentAsync("dup_invite_lead");
        await CreateTeamAsync(leadId, "Duplicate Invite Team");
        var (targetId, _) = await CreateStudentAsync("dup_invite_target");

        // Send first invite
        var req1 = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/invitations")
        {
            Content = JsonContent.Create(new SendTeamInvitationRequest { InviteeStudentId = targetId })
        };
        req1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var res1 = await _client.SendAsync(req1);
        Assert.Equal(HttpStatusCode.OK, res1.StatusCode);

        // Send duplicate invite
        var req2 = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/invitations")
        {
            Content = JsonContent.Create(new SendTeamInvitationRequest { InviteeStudentId = targetId })
        };
        req2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var res2 = await _client.SendAsync(req2);

        // Assert
        Assert.True(res2.StatusCode == HttpStatusCode.BadRequest || res2.StatusCode == HttpStatusCode.Conflict);
    }

    // -------------------------------------------------------------------------
    // TEAM-005: View received & sent invitations
    // -------------------------------------------------------------------------
    [Fact]
    public async Task TEAM005_GetInvitations_ReceivedAndSent_ReturnsExpectedItems()
    {
        // Arrange
        var (leadId, leadToken) = await CreateStudentAsync("list_inv_lead");
        await CreateTeamAsync(leadId, "List Inv Team");
        var (inviteeId, inviteeToken) = await CreateStudentAsync("list_inv_target");

        // Send invite
        var sendReq = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/invitations")
        {
            Content = JsonContent.Create(new SendTeamInvitationRequest { InviteeStudentId = inviteeId })
        };
        sendReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var sendRes = await _client.SendAsync(sendReq);
        Assert.Equal(HttpStatusCode.OK, sendRes.StatusCode);

        // Check Sent list for Lead
        var sentReq = new HttpRequestMessage(HttpMethod.Get, "/api/student/teams/invitations");
        sentReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var sentRes = await _client.SendAsync(sentReq);
        Assert.Equal(HttpStatusCode.OK, sentRes.StatusCode);
        var sentList = await sentRes.Content.ReadFromJsonAsync<List<TeamInvitationDto>>();
        Assert.NotNull(sentList);
        Assert.Contains(sentList, i => i.InviteeStudentId == inviteeId);

        // Check Received list for Invitee
        var recReq = new HttpRequestMessage(HttpMethod.Get, "/api/student/invitations");
        recReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", inviteeToken);
        var recRes = await _client.SendAsync(recReq);
        Assert.Equal(HttpStatusCode.OK, recRes.StatusCode);
        var recList = await recRes.Content.ReadFromJsonAsync<List<TeamInvitationDto>>();
        Assert.NotNull(recList);
        Assert.Contains(recList, i => i.InviteeStudentId == inviteeId);
    }

    // -------------------------------------------------------------------------
    // TEAM-006: Accept team invitation
    // -------------------------------------------------------------------------
    [Fact]
    public async Task TEAM006_AcceptInvitation_ValidInvitee_AddsMemberAndCancelsOtherPending()
    {
        // Arrange: Lead 1 invites student
        var (lead1Id, lead1Token) = await CreateStudentAsync("lead1_accept_test");
        var (team1Id, _) = await CreateTeamAsync(lead1Id, "Team 1 Primary");

        // Lead 2 also invites student
        var (lead2Id, lead2Token) = await CreateStudentAsync("lead2_accept_test");
        await CreateTeamAsync(lead2Id, "Team 2 Competing");

        var (inviteeId, inviteeToken) = await CreateStudentAsync("accepting_invitee");

        // Send invite 1
        var inv1Req = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/invitations")
        {
            Content = JsonContent.Create(new SendTeamInvitationRequest { InviteeStudentId = inviteeId })
        };
        inv1Req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead1Token);
        var inv1Res = await _client.SendAsync(inv1Req);
        Assert.Equal(HttpStatusCode.OK, inv1Res.StatusCode);
        var inv1 = await inv1Res.Content.ReadFromJsonAsync<TeamInvitationDto>();

        // Send invite 2
        var inv2Req = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/invitations")
        {
            Content = JsonContent.Create(new SendTeamInvitationRequest { InviteeStudentId = inviteeId })
        };
        inv2Req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", lead2Token);
        var inv2Res = await _client.SendAsync(inv2Req);
        Assert.Equal(HttpStatusCode.OK, inv2Res.StatusCode);
        var inv2 = await inv2Res.Content.ReadFromJsonAsync<TeamInvitationDto>();

        // Invitee accepts invite 1
        var acceptReq = new HttpRequestMessage(HttpMethod.Post, $"/api/student/invitations/{inv1!.Id}/accept");
        acceptReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", inviteeToken);

        // Act
        var acceptRes = await _client.SendAsync(acceptReq);

        // Assert
        Assert.Equal(HttpStatusCode.OK, acceptRes.StatusCode);

        // Verify invitee is now a member of Team 1
        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var membership = await db.TeamMembers.FirstOrDefaultAsync(m => m.UserId == inviteeId && m.ProjectTeamId == team1Id);
        Assert.NotNull(membership);
        Assert.False(membership.IsTeamLead);

        // Verify other invite is now Cancelled
        var competingInv = await db.TeamInvitations.FirstOrDefaultAsync(i => i.Id == inv2!.Id);
        Assert.NotNull(competingInv);
        Assert.Equal(InvitationStatus.Cancelled, competingInv.Status);
    }

    [Fact]
    public async Task TEAM006_AcceptInvitation_NonInvitee_ReturnsForbidden403()
    {
        // Arrange
        var (leadId, leadToken) = await CreateStudentAsync("forbid_lead");
        await CreateTeamAsync(leadId, "Forbid Team");
        var (legitInviteeId, _) = await CreateStudentAsync("legit_target");
        var (_, impostorToken) = await CreateStudentAsync("impostor_student");

        var invReq = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/invitations")
        {
            Content = JsonContent.Create(new SendTeamInvitationRequest { InviteeStudentId = legitInviteeId })
        };
        invReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var invRes = await _client.SendAsync(invReq);
        Assert.Equal(HttpStatusCode.OK, invRes.StatusCode);
        var inv = await invRes.Content.ReadFromJsonAsync<TeamInvitationDto>();

        // Impostor tries to accept
        var acceptReq = new HttpRequestMessage(HttpMethod.Post, $"/api/student/invitations/{inv!.Id}/accept");
        acceptReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", impostorToken);

        // Act
        var res = await _client.SendAsync(acceptReq);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    // -------------------------------------------------------------------------
    // TEAM-007: Reject/decline team invitation
    // -------------------------------------------------------------------------
    [Fact]
    public async Task TEAM007_RejectInvitation_ValidInvitee_MarksInvitationDeclined()
    {
        // Arrange
        var (leadId, leadToken) = await CreateStudentAsync("reject_lead");
        await CreateTeamAsync(leadId, "Reject Test Team");
        var (inviteeId, inviteeToken) = await CreateStudentAsync("reject_invitee");

        var invReq = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/invitations")
        {
            Content = JsonContent.Create(new SendTeamInvitationRequest { InviteeStudentId = inviteeId })
        };
        invReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var invRes = await _client.SendAsync(invReq);
        Assert.Equal(HttpStatusCode.OK, invRes.StatusCode);
        var inv = await invRes.Content.ReadFromJsonAsync<TeamInvitationDto>();

        // Act
        var rejReq = new HttpRequestMessage(HttpMethod.Post, $"/api/student/invitations/{inv!.Id}/reject");
        rejReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", inviteeToken);
        var rejRes = await _client.SendAsync(rejReq);

        // Assert
        Assert.Equal(HttpStatusCode.OK, rejRes.StatusCode);

        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var dbInv = await db.TeamInvitations.FirstOrDefaultAsync(i => i.Id == inv!.Id);
        Assert.NotNull(dbInv);
        Assert.Equal(InvitationStatus.Declined, dbInv.Status);
    }

    // -------------------------------------------------------------------------
    // TEAM-008: Team capacity limit enforcement (Max 4 students)
    // -------------------------------------------------------------------------
    [Fact]
    public async Task TEAM008_TeamCapacity_MaxFourMembers_RejectsInvitationWhenFull()
    {
        // Arrange: Create team with 4 members already
        var (leadId, leadToken) = await CreateStudentAsync("cap_lead");
        var (teamId, _) = await CreateTeamAsync(leadId, "Capacity Full Team");

        var (m2, _) = await CreateStudentAsync("cap_m2");
        var (m3, _) = await CreateStudentAsync("cap_m3");
        var (m4, _) = await CreateStudentAsync("cap_m4");

        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.TeamMembers.AddRange(
                new TeamMember { CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = teamId, UserId = m2, IsTeamLead = false },
                new TeamMember { CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = teamId, UserId = m3, IsTeamLead = false },
                new TeamMember { CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = teamId, UserId = m4, IsTeamLead = false }
            );
            await db.SaveChangesAsync();
        }

        var (m5, _) = await CreateStudentAsync("cap_m5_overflow");

        // Act: Try to invite 5th member
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/invitations")
        {
            Content = JsonContent.Create(new SendTeamInvitationRequest { InviteeStudentId = m5 })
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var res = await _client.SendAsync(req);

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
    }

    // -------------------------------------------------------------------------
    // TEAM-010: Team leader transfer workflow
    // -------------------------------------------------------------------------
    [Fact]
    public async Task TEAM010_TransferTeamLead_ValidLead_TransfersLeadershipToMember()
    {
        // Arrange
        var (leadId, leadToken) = await CreateStudentAsync("orig_lead");
        var (teamId, _) = await CreateTeamAsync(leadId, "Lead Transfer Team");

        var (targetMemberId, _) = await CreateStudentAsync("target_new_lead");
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.TeamMembers.Add(new TeamMember
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = teamId,
                UserId = targetMemberId,
                IsTeamLead = false
            });
            await db.SaveChangesAsync();
        }

        // Act
        var req = new HttpRequestMessage(HttpMethod.Put, "/api/student/teams/leader")
        {
            Content = JsonContent.Create(new TransferTeamLeadRequest { TargetStudentId = targetMemberId })
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var res = await _client.SendAsync(req);

        // Assert
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        using var verifyScope = CreateTenantScope();
        var vdb = verifyScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var oldLead = await vdb.TeamMembers.FirstAsync(m => m.UserId == leadId && m.ProjectTeamId == teamId);
        var newLead = await vdb.TeamMembers.FirstAsync(m => m.UserId == targetMemberId && m.ProjectTeamId == teamId);

        Assert.False(oldLead.IsTeamLead);
        Assert.True(newLead.IsTeamLead);
    }

    [Fact]
    public async Task TEAM010_TransferTeamLead_NonLeader_ReturnsForbidden403()
    {
        // Arrange
        var (leadId, _) = await CreateStudentAsync("leader_for_transfer_check");
        var (teamId, _) = await CreateTeamAsync(leadId, "Transfer 403 Team");

        var (memberId, memberToken) = await CreateStudentAsync("member_cannot_transfer");
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.TeamMembers.Add(new TeamMember
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = teamId,
                UserId = memberId,
                IsTeamLead = false
            });
            await db.SaveChangesAsync();
        }

        // Member tries to transfer leadership
        var req = new HttpRequestMessage(HttpMethod.Put, "/api/student/teams/leader")
        {
            Content = JsonContent.Create(new TransferTeamLeadRequest { TargetStudentId = memberId })
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", memberToken);
        var res = await _client.SendAsync(req);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    // -------------------------------------------------------------------------
    // TEAM-011: Voluntary member exit & leader member removal before lock
    // -------------------------------------------------------------------------
    [Fact]
    public async Task TEAM011_LeaveTeam_NonLeader_RemovesSelfFromRoster()
    {
        // Arrange
        var (leadId, _) = await CreateStudentAsync("leave_lead");
        var (teamId, _) = await CreateTeamAsync(leadId, "Voluntary Leave Team");

        var (memberId, memberToken) = await CreateStudentAsync("leaving_member");
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.TeamMembers.Add(new TeamMember
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = teamId,
                UserId = memberId,
                IsTeamLead = false
            });
            await db.SaveChangesAsync();
        }

        // Act
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/leave");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", memberToken);
        var res = await _client.SendAsync(req);

        // Assert
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        using var verifyScope = CreateTenantScope();
        var vdb = verifyScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var membership = await vdb.TeamMembers.FirstOrDefaultAsync(m => m.UserId == memberId && m.ProjectTeamId == teamId);
        Assert.Null(membership);
    }

    [Fact]
    public async Task TEAM011_RemoveMember_TeamLead_RemovesMemberFromRoster()
    {
        // Arrange
        var (leadId, leadToken) = await CreateStudentAsync("remover_lead");
        var (teamId, _) = await CreateTeamAsync(leadId, "Removal Team");

        var (memberId, _) = await CreateStudentAsync("removed_member");
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            db.TeamMembers.Add(new TeamMember
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = teamId,
                UserId = memberId,
                IsTeamLead = false
            });
            await db.SaveChangesAsync();
        }

        // Act
        var req = new HttpRequestMessage(HttpMethod.Delete, $"/api/student/teams/members/{memberId}");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var res = await _client.SendAsync(req);

        // Assert
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        using var verifyScope = CreateTenantScope();
        var vdb = verifyScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var membership = await vdb.TeamMembers.FirstOrDefaultAsync(m => m.UserId == memberId && m.ProjectTeamId == teamId);
        Assert.Null(membership);
    }

    // -------------------------------------------------------------------------
    // TEAM-012: Team roster locking upon proposal submission
    // -------------------------------------------------------------------------
    [Fact]
    public async Task TEAM012_RosterLocked_BlocksInvitationsRemovalsAndExits()
    {
        // Arrange: Seed a team with IsRosterLocked = true
        var (leadId, leadToken) = await CreateStudentAsync("locked_lead");
        var (memberId, memberToken) = await CreateStudentAsync("locked_member");
        var (outsideId, _) = await CreateStudentAsync("outside_student");

        var teamId = Guid.NewGuid();
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var team = new ProjectTeam
            {
                Id = teamId,
                CollegeId = DbInitializer.SistecTenantId,
                AcademicTrackId = DbInitializer.MinorTrackId,
                TeamCode = "2026-CS-LOCKED-01",
                Title = "Locked Roster Project",
                Abstract = "Roster locked for institutional review.",
                Status = ProjectStatus.PendingGuide,
                IsRosterLocked = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            team.Members.Add(new TeamMember { CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = teamId, UserId = leadId, IsTeamLead = true });
            team.Members.Add(new TeamMember { CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = teamId, UserId = memberId, IsTeamLead = false });
            db.ProjectTeams.Add(team);
            await db.SaveChangesAsync();
        }

        // 1. Sending invite when locked -> 400
        var inviteReq = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/invitations")
        {
            Content = JsonContent.Create(new SendTeamInvitationRequest { InviteeStudentId = outsideId })
        };
        inviteReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var inviteRes = await _client.SendAsync(inviteReq);
        Assert.Equal(HttpStatusCode.BadRequest, inviteRes.StatusCode);

        // 2. Member leaving when locked -> 400
        var leaveReq = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/leave");
        leaveReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", memberToken);
        var leaveRes = await _client.SendAsync(leaveReq);
        Assert.Equal(HttpStatusCode.BadRequest, leaveRes.StatusCode);

        // 3. Lead removing member when locked -> 400
        var removeReq = new HttpRequestMessage(HttpMethod.Delete, $"/api/student/teams/members/{memberId}");
        removeReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var removeRes = await _client.SendAsync(removeReq);
        Assert.Equal(HttpStatusCode.BadRequest, removeRes.StatusCode);

        // 4. Lead transferring leadership when locked -> 400
        var xferReq = new HttpRequestMessage(HttpMethod.Put, "/api/student/teams/leader")
        {
            Content = JsonContent.Create(new TransferTeamLeadRequest { TargetStudentId = memberId })
        };
        xferReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var xferRes = await _client.SendAsync(xferReq);
        Assert.Equal(HttpStatusCode.BadRequest, xferRes.StatusCode);
    }
}
