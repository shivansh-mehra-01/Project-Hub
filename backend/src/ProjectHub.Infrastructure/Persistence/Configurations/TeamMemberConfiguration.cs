using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class TeamMemberConfiguration : IEntityTypeConfiguration<TeamMember>
{
    public void Configure(EntityTypeBuilder<TeamMember> builder)
    {
        builder.ToTable("TeamMembers");

        builder.HasKey(tm => tm.Id);

        builder.Property(tm => tm.ModuleResponsibility)
            .IsRequired()
            .HasMaxLength(250);

        // Composite Unique Filtered Index: (CollegeId, ProjectTeamId, UserId)
        builder.HasIndex(tm => new { tm.CollegeId, tm.ProjectTeamId, tm.UserId })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(tm => tm.ProjectTeam)
            .WithMany(t => t.Members)
            .HasForeignKey(tm => tm.ProjectTeamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(tm => tm.User)
            .WithMany(u => u.TeamMemberships)
            .HasForeignKey(tm => tm.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
