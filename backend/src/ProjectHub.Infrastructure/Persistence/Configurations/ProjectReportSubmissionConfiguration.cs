using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class ProjectReportSubmissionConfiguration : IEntityTypeConfiguration<ProjectReportSubmission>
{
    public void Configure(EntityTypeBuilder<ProjectReportSubmission> builder)
    {
        builder.ToTable("ProjectReportSubmissions");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.ProjectTitle)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(s => s.Abstract)
            .IsRequired()
            .HasMaxLength(3000);

        builder.Property(s => s.ProblemStatement)
            .HasMaxLength(2000);

        builder.Property(s => s.Methodology)
            .HasMaxLength(2000);

        builder.Property(s => s.ImplementationSummary)
            .HasMaxLength(2000);

        builder.Property(s => s.ResultsAndConclusion)
            .HasMaxLength(2000);

        builder.Property(s => s.References)
            .HasMaxLength(2000);

        builder.Property(s => s.RepositoryUrl)
            .HasMaxLength(500);

        builder.Property(s => s.DemoUrl)
            .HasMaxLength(500);

        builder.Property(s => s.ReportStorageKey)
            .HasMaxLength(500);

        builder.Property(s => s.ReportFileName)
            .HasMaxLength(255);

        builder.Property(s => s.ReportSha256Checksum)
            .HasMaxLength(64);

        builder.Property(s => s.ReviewFeedback)
            .HasMaxLength(2000);

        builder.Property(s => s.Status)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.HasIndex(s => new { s.CollegeId, s.ProjectTeamId, s.Status });

        builder.HasOne(s => s.ProjectTeam)
            .WithMany(t => t.ReportSubmissions)
            .HasForeignKey(s => s.ProjectTeamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.ReportArtifact)
            .WithMany()
            .HasForeignKey(s => s.ReportArtifactId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(s => s.SubmittedByUser)
            .WithMany()
            .HasForeignKey(s => s.SubmittedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(s => s.ReviewedByUser)
            .WithMany()
            .HasForeignKey(s => s.ReviewedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
