using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class SubmissionReviewHistoryConfiguration : IEntityTypeConfiguration<SubmissionReviewHistory>
{
    public void Configure(EntityTypeBuilder<SubmissionReviewHistory> builder)
    {
        builder.ToTable("SubmissionReviewHistories");

        builder.HasKey(h => h.Id);

        builder.Property(h => h.ResultStatus)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(h => h.Feedback)
            .IsRequired()
            .HasMaxLength(2000);

        builder.HasIndex(h => new { h.CollegeId, h.ProjectReportSubmissionId });

        builder.HasOne(h => h.ProjectReportSubmission)
            .WithMany(s => s.ReviewHistories)
            .HasForeignKey(h => h.ProjectReportSubmissionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(h => h.ReviewerUser)
            .WithMany()
            .HasForeignKey(h => h.ReviewerUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
