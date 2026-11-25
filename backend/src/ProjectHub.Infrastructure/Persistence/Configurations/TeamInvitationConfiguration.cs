using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class TeamInvitationConfiguration : IEntityTypeConfiguration<TeamInvitation>
{
    public void Configure(EntityTypeBuilder<TeamInvitation> builder)
    {
        builder.ToTable("TeamInvitations");

        builder.HasKey(i => i.Id);

        builder.Property(i => i.Status)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(i => i.Message)
            .HasMaxLength(500);

        builder.Property(i => i.ResponseNotes)
            .HasMaxLength(500);

        // Filtered unique index: a student can have at most one Pending invitation per team
        builder.HasIndex(i => new { i.CollegeId, i.ProjectTeamId, i.InviteeStudentId })
            .IsUnique()
            .HasFilter("\"Status\" = 'Pending' AND \"IsDeleted\" = false");

        // General query performance index
        builder.HasIndex(i => new { i.CollegeId, i.InviteeStudentId, i.Status });
        builder.HasIndex(i => new { i.CollegeId, i.ProjectTeamId, i.Status });

        builder.HasOne(i => i.ProjectTeam)
            .WithMany(t => t.Invitations)
            .HasForeignKey(i => i.ProjectTeamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(i => i.InviterStudent)
            .WithMany(u => u.SentInvitations)
            .HasForeignKey(i => i.InviterStudentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.InviteeStudent)
            .WithMany(u => u.ReceivedInvitations)
            .HasForeignKey(i => i.InviteeStudentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.College)
            .WithMany()
            .HasForeignKey(i => i.CollegeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
