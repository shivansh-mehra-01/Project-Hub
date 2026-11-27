using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class TeamJoinRequestConfiguration : IEntityTypeConfiguration<TeamJoinRequest>
{
    public void Configure(EntityTypeBuilder<TeamJoinRequest> builder)
    {
        builder.ToTable("TeamJoinRequests");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.DesiredRole)
            .IsRequired()
            .HasMaxLength(120);

        builder.Property(r => r.Message)
            .HasMaxLength(500);

        builder.Property(r => r.ResponseNotes)
            .HasMaxLength(500);

        builder.Property(r => r.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.HasIndex(r => new { r.ProjectTeamId, r.StudentUserId })
            .IsUnique()
            .HasFilter("\"Status\" = 'Pending' AND \"IsDeleted\" = false");

        builder.HasIndex(r => new { r.CollegeId, r.StudentUserId, r.Status });

        builder.HasOne(r => r.College)
            .WithMany()
            .HasForeignKey(r => r.CollegeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.ProjectTeam)
            .WithMany(t => t.JoinRequests)
            .HasForeignKey(r => r.ProjectTeamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.StudentUser)
            .WithMany()
            .HasForeignKey(r => r.StudentUserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.RespondedByUser)
            .WithMany()
            .HasForeignKey(r => r.RespondedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
