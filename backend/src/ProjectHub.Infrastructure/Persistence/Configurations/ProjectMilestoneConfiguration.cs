using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class ProjectMilestoneConfiguration : IEntityTypeConfiguration<ProjectMilestone>
{
    public void Configure(EntityTypeBuilder<ProjectMilestone> builder)
    {
        builder.ToTable("ProjectMilestones");

        builder.HasKey(m => m.Id);

        builder.Property(m => m.Title)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(m => m.Description)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(m => m.Status)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(m => m.SubmissionEvidenceUrl)
            .HasMaxLength(1000);

        builder.Property(m => m.ReviewFeedback)
            .HasMaxLength(2000);

        builder.HasIndex(m => new { m.CollegeId, m.ProjectTeamId, m.Status });

        builder.HasOne(m => m.ProjectTeam)
            .WithMany(t => t.Milestones)
            .HasForeignKey(m => m.ProjectTeamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(m => m.SubmittedByUser)
            .WithMany()
            .HasForeignKey(m => m.SubmittedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(m => m.ReviewedByUser)
            .WithMany()
            .HasForeignKey(m => m.ReviewedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
