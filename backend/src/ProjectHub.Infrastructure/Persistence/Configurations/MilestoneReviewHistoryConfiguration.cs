using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class MilestoneReviewHistoryConfiguration : IEntityTypeConfiguration<MilestoneReviewHistory>
{
    public void Configure(EntityTypeBuilder<MilestoneReviewHistory> builder)
    {
        builder.ToTable("MilestoneReviewHistories");

        builder.HasKey(h => h.Id);

        builder.Property(h => h.ResultStatus)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(h => h.Feedback)
            .IsRequired()
            .HasMaxLength(2000);

        builder.HasIndex(h => new { h.CollegeId, h.ProjectMilestoneId });

        builder.HasOne(h => h.ProjectMilestone)
            .WithMany(m => m.ReviewHistories)
            .HasForeignKey(h => h.ProjectMilestoneId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(h => h.ReviewerUser)
            .WithMany()
            .HasForeignKey(h => h.ReviewerUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
