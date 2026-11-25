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
using ProjectHub.Api.Controllers;
using Xunit;

namespace ProjectHub.IntegrationTests;

public class StudentPhase4_1Tests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public StudentPhase4_1Tests(CustomWebApplicationFactory factory)
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

        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

        var user = new UserAccount
        {
            Id = studentId,
            CollegeId = cid,
            DepartmentId = did,
            FullName = $"Student {emailSuffix}",
            Email = $"student.{emailSuffix.ToLowerInvariant()}.{Guid.NewGuid():N}@sistec.ac.in",
            EnrollmentOrEmployeeCode = $"0176CS{Random.Shared.Next(100000, 999999)}",
            Role = UserRole.Student,
            IsActivated = true,
            IsActive = true
        };
        db.Users.Add(user);

        if (isEnrolled)
        {
            db.StudentAcademicEnrollments.Add(new StudentAcademicEnrollment
            {
                CollegeId = cid,
                StudentUserId = studentId,
                CourseProgramId = DbInitializer.SistecBTechCourseProgramId,
                DepartmentId = did,
                CurrentSemesterTermId = DbInitializer.SistecCseSem6TermId,
                AdmissionBatch = "2023-2027",
                AcademicStatus = AcademicStatus.Active
            });
        }

        await db.SaveChangesAsync();

        var token = GenerateToken(studentId, cid, did, UserRole.Student);
        return (studentId, token);
    }

    // =========================================================================
    // VERIFICATION A: CONCURRENT INVITATION ACCEPTANCE
    // =========================================================================
    [Fact]
    public async Task AcceptInvitation_ConcurrentRequests_EnforcesMaxCapacity_RejectsOverflowWithConflict()
    {
        var (leadId, leadToken) = await CreateStudentAsync("LeadA");
        var (inviteeAId, inviteeAToken) = await CreateStudentAsync("InviteeA");
        var (inviteeBId, inviteeBToken) = await CreateStudentAsync("InviteeB");
        var (member1Id, _) = await CreateStudentAsync("Member1");

        Guid teamId;
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            // Create track with MaxTeamSize = 3
            var track = new AcademicTrack
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                Name = $"Track-Cap3-{Guid.NewGuid():N}"[..20],
                AcademicYear = "2026-2027",
                MinTeamSize = 2,
                MaxTeamSize = 3,
                IsActive = true
            };
            db.AcademicTracks.Add(track);

            var team = new ProjectTeam
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = track.Id,
                TeamCode = $"TEAM-{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
                Title = "Concurrent Test Team Cap 3",
                Abstract = "Testing simultaneous acceptance serialization",
                Status = ProjectStatus.Draft,
                IsRosterLocked = false
            };
            db.ProjectTeams.Add(team);

            // Add 2 active members (Lead + Member1) -> Exactly 1 slot remaining out of 3!
            db.TeamMembers.Add(new TeamMember
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                UserId = leadId,
                IsTeamLead = true,
                IsActive = true
            });
            db.TeamMembers.Add(new TeamMember
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                UserId = member1Id,
                IsTeamLead = false,
                IsActive = true
            });

            // Dispatch 2 valid invitations for inviteeA and inviteeB
            var invA = new TeamInvitation
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                InviterStudentId = leadId,
                InviteeStudentId = inviteeAId,
                Status = InvitationStatus.Pending,
                InvitedAtUtc = DateTime.UtcNow,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
            };
            var invB = new TeamInvitation
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                InviterStudentId = leadId,
                InviteeStudentId = inviteeBId,
                Status = InvitationStatus.Pending,
                InvitedAtUtc = DateTime.UtcNow,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
            };
            db.TeamInvitations.AddRange(invA, invB);

            await db.SaveChangesAsync();
            teamId = team.Id;

            // Execute concurrent HTTP requests
            var reqA = new HttpRequestMessage(HttpMethod.Post, $"/api/student/invitations/{invA.Id}/accept");
            reqA.Headers.Authorization = new AuthenticationHeaderValue("Bearer", inviteeAToken);

            var reqB = new HttpRequestMessage(HttpMethod.Post, $"/api/student/invitations/{invB.Id}/accept");
            reqB.Headers.Authorization = new AuthenticationHeaderValue("Bearer", inviteeBToken);

            var taskA = _client.SendAsync(reqA);
            var taskB = _client.SendAsync(reqB);

            var responses = await Task.WhenAll(taskA, taskB);

            // Exactly one must be 200 OK and exactly one must be 409 Conflict
            var okCount = responses.Count(r => r.StatusCode == HttpStatusCode.OK);
            var conflictCount = responses.Count(r => r.StatusCode == HttpStatusCode.Conflict);

            Assert.Equal(1, okCount);
            Assert.Equal(1, conflictCount);

            // Verify team member count never exceeds configured MaxTeamSize (3)
            var finalCount = await db.TeamMembers.CountAsync(m => m.ProjectTeamId == teamId && m.IsActive && !m.IsDeleted);
            Assert.Equal(3, finalCount);
        }
    }

    // =========================================================================
    // VERIFICATION B: CREATOR IDENTITY VS CURRENT TEAM LEADER
    // =========================================================================
    [Fact]
    public async Task TeamCreation_PreservesCreatedByUserId_AndSetsCreatorAsLead()
    {
        var (creatorId, creatorToken) = await CreateStudentAsync("CreatorX");

        var req = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams")
        {
            Content = JsonContent.Create(new CreateStudentTeamRequest
            {
                Title = "Attribution Verification Project",
                Abstract = "Verifying creator persistence and leadership assignment."
            })
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", creatorToken);

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var roster = await res.Content.ReadFromJsonAsync<StudentTeamRosterDto>();
        Assert.NotNull(roster);
        Assert.True(roster.IsCallerLead);

        using var scope = CreateTenantScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

        var team = await db.ProjectTeams
            .Include(t => t.Members)
            .FirstOrDefaultAsync(t => t.Id == roster.TeamId);

        Assert.NotNull(team);
        // CreatedByUserId tracks original team creator
        Assert.Equal(creatorId, team.CreatedByUserId);

        var leadMember = team.Members.FirstOrDefault(m => m.UserId == creatorId);
        Assert.NotNull(leadMember);
        Assert.True(leadMember.IsTeamLead);
    }

    [Fact]
    public async Task TransferLeadership_TransfersLeadership_WhilePreservingOriginalCreatedByUserId()
    {
        var (creatorId, creatorToken) = await CreateStudentAsync("CreatorOrig");
        var (teammateId, teammateToken) = await CreateStudentAsync("TeammateNewLead");

        Guid teamId;
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var team = new ProjectTeam
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.CollegeSessionTrackId,
                TeamCode = $"ORIG-{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
                Title = "Leadership Transfer Attribution Test",
                Abstract = "Verifying CreatedByUserId is never mutated upon lead transfer",
                CreatedByUserId = creatorId,
                Status = ProjectStatus.Draft,
                IsRosterLocked = false
            };
            db.ProjectTeams.Add(team);

            db.TeamMembers.Add(new TeamMember
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                UserId = creatorId,
                IsTeamLead = true,
                IsActive = true
            });
            db.TeamMembers.Add(new TeamMember
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                UserId = teammateId,
                IsTeamLead = false,
                IsActive = true
            });
            await db.SaveChangesAsync();
            teamId = team.Id;
        }

        // Creator delegates leadership to teammate
        var transferReq = new HttpRequestMessage(HttpMethod.Put, "/api/student/teams/leader")
        {
            Content = JsonContent.Create(new TransferTeamLeadRequest
            {
                TargetStudentId = teammateId
            })
        };
        transferReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", creatorToken);

        var transferRes = await _client.SendAsync(transferReq);
        Assert.Equal(HttpStatusCode.OK, transferRes.StatusCode);

        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var team = await db.ProjectTeams
                .Include(t => t.Members)
                .FirstOrDefaultAsync(t => t.Id == teamId);

            Assert.NotNull(team);
            // 1. Original creator identity is strictly preserved!
            Assert.Equal(creatorId, team.CreatedByUserId);

            // 2. Teammate is now Team Lead
            var newLead = team.Members.FirstOrDefault(m => m.UserId == teammateId);
            Assert.NotNull(newLead);
            Assert.True(newLead.IsTeamLead);

            // 3. Former leader is no longer Team Lead
            var formerLead = team.Members.FirstOrDefault(m => m.UserId == creatorId);
            Assert.NotNull(formerLead);
            Assert.False(formerLead.IsTeamLead);

            // 4. Audit log recorded
            var audit = await db.PlatformAuditLogs
                .FirstOrDefaultAsync(a => a.Action == "TEAM_LEADER_TRANSFERRED" && a.ActorUserId == creatorId);
            Assert.NotNull(audit);
        }

        // Former leader can no longer dispatch invitations or transfer leadership
        var formerLeaderInvite = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/invitations")
        {
            Content = JsonContent.Create(new SendTeamInvitationRequest
            {
                InviteeStudentId = Guid.NewGuid()
            })
        };
        formerLeaderInvite.Headers.Authorization = new AuthenticationHeaderValue("Bearer", creatorToken);

        var formerInviteRes = await _client.SendAsync(formerLeaderInvite);
        Assert.Equal(HttpStatusCode.Forbidden, formerInviteRes.StatusCode);

        // New leader CAN dispatch invitations
        var (newInviteeId, _) = await CreateStudentAsync("NewInvitee");
        var newLeaderInvite = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/invitations")
        {
            Content = JsonContent.Create(new SendTeamInvitationRequest
            {
                InviteeStudentId = newInviteeId
            })
        };
        newLeaderInvite.Headers.Authorization = new AuthenticationHeaderValue("Bearer", teammateToken);

        var newInviteRes = await _client.SendAsync(newLeaderInvite);
        Assert.Equal(HttpStatusCode.OK, newInviteRes.StatusCode);
    }

    // =========================================================================
    // VERIFICATION C: INVITATION EXPIRY
    // =========================================================================
    [Fact]
    public async Task AcceptInvitation_WhenWithinExpiryWindow_Succeeds()
    {
        var (leadId, _) = await CreateStudentAsync("ExpLead1");
        var (inviteeId, inviteeToken) = await CreateStudentAsync("ExpInvitee1");

        Guid inviteId;
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var team = new ProjectTeam
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.CollegeSessionTrackId,
                TeamCode = $"EXP1-{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
                Title = "Active Expiry Test Team",
                Abstract = "Verifying valid window acceptance",
                Status = ProjectStatus.Draft,
                IsRosterLocked = false
            };
            db.ProjectTeams.Add(team);

            db.TeamMembers.Add(new TeamMember
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                UserId = leadId,
                IsTeamLead = true,
                IsActive = true
            });

            var invite = new TeamInvitation
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                InviterStudentId = leadId,
                InviteeStudentId = inviteeId,
                Status = InvitationStatus.Pending,
                InvitedAtUtc = DateTime.UtcNow.AddDays(-2),
                ExpiresAtUtc = DateTime.UtcNow.AddDays(5) // Still valid for 5 days
            };
            db.TeamInvitations.Add(invite);
            await db.SaveChangesAsync();
            inviteId = invite.Id;
        }

        var req = new HttpRequestMessage(HttpMethod.Post, $"/api/student/invitations/{inviteId}/accept");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", inviteeToken);

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var updated = await db.TeamInvitations.FindAsync(inviteId);
            Assert.NotNull(updated);
            Assert.Equal(InvitationStatus.Accepted, updated.Status);
        }
    }

    [Fact]
    public async Task AcceptInvitation_WhenExpired_RejectsWithBadRequest_AndMarksStatusExpired()
    {
        var (leadId, _) = await CreateStudentAsync("ExpLead2");
        var (inviteeId, inviteeToken) = await CreateStudentAsync("ExpInvitee2");

        Guid inviteId;
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var team = new ProjectTeam
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.CollegeSessionTrackId,
                TeamCode = $"EXP2-{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
                Title = "Past Expiry Test Team",
                Abstract = "Verifying expired invite rejection",
                Status = ProjectStatus.Draft,
                IsRosterLocked = false
            };
            db.ProjectTeams.Add(team);

            db.TeamMembers.Add(new TeamMember
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                UserId = leadId,
                IsTeamLead = true,
                IsActive = true
            });

            var invite = new TeamInvitation
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                InviterStudentId = leadId,
                InviteeStudentId = inviteeId,
                Status = InvitationStatus.Pending,
                InvitedAtUtc = DateTime.UtcNow.AddDays(-10),
                ExpiresAtUtc = DateTime.UtcNow.AddDays(-3) // Expired 3 days ago!
            };
            db.TeamInvitations.Add(invite);
            await db.SaveChangesAsync();
            inviteId = invite.Id;
        }

        var req = new HttpRequestMessage(HttpMethod.Post, $"/api/student/invitations/{inviteId}/accept");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", inviteeToken);

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);

        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var updated = await db.TeamInvitations.FindAsync(inviteId);
            Assert.NotNull(updated);
            // Must be updated to Expired
            Assert.Equal(InvitationStatus.Expired, updated.Status);
        }
    }

    [Fact]
    public async Task GetReceivedInvitations_AutoMarksExpiredInvitations_AsExpired()
    {
        var (leadId, _) = await CreateStudentAsync("ExpLead3");
        var (inviteeId, inviteeToken) = await CreateStudentAsync("ExpInvitee3");

        Guid inviteId;
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var team = new ProjectTeam
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = DbInitializer.CollegeSessionTrackId,
                TeamCode = $"EXP3-{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
                Title = "Query Auto Expiry Test Team",
                Abstract = "Verifying lazy expiration on GET /invitations",
                Status = ProjectStatus.Draft,
                IsRosterLocked = false
            };
            db.ProjectTeams.Add(team);

            var invite = new TeamInvitation
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                InviterStudentId = leadId,
                InviteeStudentId = inviteeId,
                Status = InvitationStatus.Pending,
                InvitedAtUtc = DateTime.UtcNow.AddDays(-8),
                ExpiresAtUtc = DateTime.UtcNow.AddDays(-1) // Expired yesterday
            };
            db.TeamInvitations.Add(invite);
            await db.SaveChangesAsync();
            inviteId = invite.Id;
        }

        var req = new HttpRequestMessage(HttpMethod.Get, "/api/student/invitations");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", inviteeToken);

        var res = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var list = await res.Content.ReadFromJsonAsync<List<TeamInvitationDto>>();
        Assert.NotNull(list);
        var item = list.FirstOrDefault(i => i.Id == inviteId);
        Assert.NotNull(item);
        Assert.Equal(InvitationStatus.Expired, item.Status);
    }

    // =========================================================================
    // VERIFICATION D: DYNAMIC TEAM CAPACITY
    // =========================================================================
    [Fact]
    public async Task TeamFormation_WithTrackCapacity3_EnforcesMaxCapacity3()
    {
        var (leadId, leadToken) = await CreateStudentAsync("DynCap3Lead");
        var (m2Id, _) = await CreateStudentAsync("DynCap3M2");
        var (m3Id, _) = await CreateStudentAsync("DynCap3M3");
        var (overflowCandidateId, _) = await CreateStudentAsync("DynCap3Overflow");

        Guid teamId;
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var track = new AcademicTrack
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                Name = $"Track-Cap3-{Guid.NewGuid():N}"[..20],
                AcademicYear = "2026-2027",
                MinTeamSize = 2,
                MaxTeamSize = 3,
                IsActive = true
            };
            db.AcademicTracks.Add(track);

            var team = new ProjectTeam
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = track.Id,
                TeamCode = $"CAP3-{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
                Title = "Track Max 3 Capacity Team",
                Abstract = "Verifying track capacity 3 bounds",
                Status = ProjectStatus.Draft,
                IsRosterLocked = false
            };
            db.ProjectTeams.Add(team);

            // 3 members already in team (full capacity 3)
            db.TeamMembers.Add(new TeamMember { CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = team.Id, UserId = leadId, IsTeamLead = true, IsActive = true });
            db.TeamMembers.Add(new TeamMember { CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = team.Id, UserId = m2Id, IsTeamLead = false, IsActive = true });
            db.TeamMembers.Add(new TeamMember { CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = team.Id, UserId = m3Id, IsTeamLead = false, IsActive = true });

            await db.SaveChangesAsync();
            teamId = team.Id;
        }

        // Leader attempts to send invite when already at 3 members
        var inviteReq = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/invitations")
        {
            Content = JsonContent.Create(new SendTeamInvitationRequest
            {
                InviteeStudentId = overflowCandidateId
            })
        };
        inviteReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);

        var inviteRes = await _client.SendAsync(inviteReq);
        // Must reject with Conflict 409
        Assert.Equal(HttpStatusCode.Conflict, inviteRes.StatusCode);
    }

    [Fact]
    public async Task MemberLeaves_WhenAtMaxCapacity_OpensSlotForInvitationAcceptance()
    {
        var (leadId, _) = await CreateStudentAsync("RecLead");
        var (leavingMemberId, leavingToken) = await CreateStudentAsync("RecLeaving");
        var (inviteeId, inviteeToken) = await CreateStudentAsync("RecInvitee");

        Guid teamId;
        Guid inviteId;
        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var track = new AcademicTrack
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                Name = $"Track-Rec-{Guid.NewGuid():N}"[..20],
                AcademicYear = "2026-2027",
                MinTeamSize = 2,
                MaxTeamSize = 2, // Maximum capacity is 2!
                IsActive = true
            };
            db.AcademicTracks.Add(track);

            var team = new ProjectTeam
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = track.Id,
                TeamCode = $"REC-{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
                Title = "Capacity Slot Recovery Team",
                Abstract = "Verifying slot availability after departure",
                Status = ProjectStatus.Draft,
                IsRosterLocked = false
            };
            db.ProjectTeams.Add(team);

            // 2 active members (Lead + LeavingMember) -> Team is completely full!
            db.TeamMembers.Add(new TeamMember { CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = team.Id, UserId = leadId, IsTeamLead = true, IsActive = true });
            db.TeamMembers.Add(new TeamMember { CollegeId = DbInitializer.SistecTenantId, ProjectTeamId = team.Id, UserId = leavingMemberId, IsTeamLead = false, IsActive = true });

            var invite = new TeamInvitation
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                InviterStudentId = leadId,
                InviteeStudentId = inviteeId,
                Status = InvitationStatus.Pending,
                InvitedAtUtc = DateTime.UtcNow,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
            };
            db.TeamInvitations.Add(invite);
            await db.SaveChangesAsync();

            teamId = team.Id;
            inviteId = invite.Id;
        }

        // 1. Invitee attempts to accept while team is full -> Rejection with Conflict 409
        var prematureAccept = new HttpRequestMessage(HttpMethod.Post, $"/api/student/invitations/{inviteId}/accept");
        prematureAccept.Headers.Authorization = new AuthenticationHeaderValue("Bearer", inviteeToken);
        var prematureRes = await _client.SendAsync(prematureAccept);
        Assert.Equal(HttpStatusCode.Conflict, prematureRes.StatusCode);

        // 2. Member leaves team
        var leaveReq = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/leave");
        leaveReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leavingToken);
        var leaveRes = await _client.SendAsync(leaveReq);
        Assert.Equal(HttpStatusCode.OK, leaveRes.StatusCode);

        // 3. Slot is now open! Invitee accepts invitation -> Succeeds with 200 OK!
        var validAccept = new HttpRequestMessage(HttpMethod.Post, $"/api/student/invitations/{inviteId}/accept");
        validAccept.Headers.Authorization = new AuthenticationHeaderValue("Bearer", inviteeToken);
        var validRes = await _client.SendAsync(validAccept);
        Assert.Equal(HttpStatusCode.OK, validRes.StatusCode);

        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var members = await db.TeamMembers
                .Where(m => m.ProjectTeamId == teamId && m.IsActive && !m.IsDeleted)
                .ToListAsync();
            Assert.Equal(2, members.Count);
            Assert.Contains(members, m => m.UserId == inviteeId);
            Assert.DoesNotContain(members, m => m.UserId == leavingMemberId);
        }
    }

    [Fact]
    public void ResolveTrackCapacity_WhenNullTrack_ReturnsSafeDefaults2And4()
    {
        var (min, max) = StudentController.ResolveTrackCapacity(null);
        Assert.Equal(2, min);
        Assert.Equal(4, max);
    }

    [Fact]
    public void ResolveTrackCapacity_WhenIndividualParticipationMode_Returns1And1()
    {
        var track = new AcademicTrack
        {
            ParticipationMode = ParticipationMode.Individual,
            MinTeamSize = 4,
            MaxTeamSize = 10
        };
        var (min, max) = StudentController.ResolveTrackCapacity(track);
        Assert.Equal(1, min);
        Assert.Equal(1, max);
    }

    [Fact]
    public void ResolveTrackCapacity_WhenZeroOrNegativeValues_ClampsSafely()
    {
        var track = new AcademicTrack
        {
            ParticipationMode = ParticipationMode.Team,
            MinTeamSize = 0,
            MaxTeamSize = -5
        };
        var (min, max) = StudentController.ResolveTrackCapacity(track);
        Assert.Equal(2, min);
        Assert.Equal(4, max);
    }

    [Fact]
    public void ResolveTrackCapacity_WhenMinExceedsMax_ClampsMinToMax()
    {
        var track = new AcademicTrack
        {
            ParticipationMode = ParticipationMode.Team,
            MinTeamSize = 6,
            MaxTeamSize = 3
        };
        var (min, max) = StudentController.ResolveTrackCapacity(track);
        Assert.Equal(3, min);
        Assert.Equal(3, max);
    }

    [Fact]
    public async Task IndividualTrack_RejectsInvitationDispatch_EvenWithDraftRosterUnlocked()
    {
        var (leadId, leadToken) = await CreateStudentAsync("SoloLead");
        var (candidateId, _) = await CreateStudentAsync("SoloCandidate");

        using (var scope = CreateTenantScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();

            var track = new AcademicTrack
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                Name = $"Track-Solo-{Guid.NewGuid():N}"[..20],
                AcademicYear = "2026-2027",
                ParticipationMode = ParticipationMode.Individual,
                MinTeamSize = 1,
                MaxTeamSize = 1,
                IsActive = true
            };
            db.AcademicTracks.Add(track);

            var team = new ProjectTeam
            {
                CollegeId = DbInitializer.SistecTenantId,
                DepartmentId = DbInitializer.CseDepartmentId,
                AcademicTrackId = track.Id,
                TeamCode = $"SOLO-{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
                Title = "Solo Participation Project",
                Abstract = "Validating that individual track strictly caps team size at 1",
                Status = ProjectStatus.Draft,
                IsRosterLocked = false
            };
            db.ProjectTeams.Add(team);

            db.TeamMembers.Add(new TeamMember
            {
                CollegeId = DbInitializer.SistecTenantId,
                ProjectTeamId = team.Id,
                UserId = leadId,
                IsTeamLead = true,
                IsActive = true
            });
            await db.SaveChangesAsync();
        }

        // 1. Verify GET /teams/roster returns 1 and 1
        var rosterReq = new HttpRequestMessage(HttpMethod.Get, "/api/student/teams/roster");
        rosterReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var rosterRes = await _client.SendAsync(rosterReq);
        Assert.Equal(HttpStatusCode.OK, rosterRes.StatusCode);
        var rosterDto = await rosterRes.Content.ReadFromJsonAsync<StudentTeamRosterDto>();
        Assert.NotNull(rosterDto);
        Assert.Equal(1, rosterDto.MinTeamSize);
        Assert.Equal(1, rosterDto.MaxTeamSize);

        // 2. Dispatching an invitation must fail with Conflict 409 because capacity is already 1/1
        var inviteReq = new HttpRequestMessage(HttpMethod.Post, "/api/student/teams/invitations")
        {
            Content = JsonContent.Create(new SendTeamInvitationRequest
            {
                InviteeStudentId = candidateId
            })
        };
        inviteReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", leadToken);
        var inviteRes = await _client.SendAsync(inviteReq);
        Assert.Equal(HttpStatusCode.Conflict, inviteRes.StatusCode);
        var errorBody = await inviteRes.Content.ReadAsStringAsync();
        Assert.Contains("Team capacity limit reached", errorBody);
    }
}
