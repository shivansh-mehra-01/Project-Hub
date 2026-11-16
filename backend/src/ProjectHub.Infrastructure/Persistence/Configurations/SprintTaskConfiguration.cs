using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class SprintTaskConfiguration : IEntityTypeConfiguration<SprintTask>
{
    public void Configure(EntityTypeBuilder<SprintTask> builder)
    {
        builder.ToTable("SprintTasks");

        builder.HasKey(st => st.Id);

        builder.Property(st => st.Title)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(st => st.CategoryTag)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(st => st.Status)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.HasIndex(st => new { st.CollegeId, st.ProjectTeamId, st.Status });

        builder.HasOne(st => st.ProjectTeam)
            .WithMany(t => t.Tasks)
            .HasForeignKey(st => st.ProjectTeamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(st => st.AssignedToUser)
            .WithMany()
            .HasForeignKey(st => st.AssignedToUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
