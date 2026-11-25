using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class StudentAcademicRecordConfiguration : IEntityTypeConfiguration<StudentAcademicRecord>
{
    public void Configure(EntityTypeBuilder<StudentAcademicRecord> builder)
    {
        builder.ToTable("StudentAcademicRecords");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.ProjectTitle)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(r => r.ProjectAbstract)
            .HasMaxLength(2000);

        builder.Property(r => r.TeamCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(r => r.AcademicYear)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(r => r.TrackName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(r => r.DepartmentName)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(r => r.CollegeName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(r => r.StudentName)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(r => r.EnrollmentNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(r => r.RoleDescription)
            .HasMaxLength(150);

        builder.Property(r => r.GuideName)
            .HasMaxLength(150);

        builder.Property(r => r.FinalOutcome)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.Property(r => r.SharedTotalScore)
            .HasPrecision(5, 2);

        builder.Property(r => r.SharedMaxScore)
            .HasPrecision(5, 2);

        builder.Property(r => r.IndividualContributionScore)
            .HasPrecision(5, 2);

        builder.Property(r => r.FinalComputedMark)
            .HasPrecision(5, 2);

        builder.Property(r => r.RubricCriteriaBreakdownJson)
            .IsRequired();

        builder.Property(r => r.VerifiedRepositoryUrl)
            .HasMaxLength(500);

        builder.Property(r => r.VerifiedDemoUrl)
            .HasMaxLength(500);

        builder.Property(r => r.FinalReportFileName)
            .HasMaxLength(250);

        builder.Property(r => r.FinalReportChecksum)
            .HasMaxLength(128);

        builder.Property(r => r.VerificationHash)
            .IsRequired()
            .HasMaxLength(128);

        builder.HasIndex(r => new { r.CollegeId, r.StudentUserId });
        builder.HasIndex(r => new { r.CollegeId, r.EnrollmentNumber });
        builder.HasIndex(r => new { r.CollegeId, r.ProjectTeamId, r.StudentUserId }).IsUnique();
        builder.HasIndex(r => r.VerificationHash).IsUnique();

        builder.HasOne(r => r.ProjectTeam)
            .WithMany(t => t.AcademicRecords)
            .HasForeignKey(r => r.ProjectTeamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.StudentUser)
            .WithMany()
            .HasForeignKey(r => r.StudentUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.GuideUser)
            .WithMany()
            .HasForeignKey(r => r.GuideUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.ProjectClosureRecord)
            .WithMany(c => c.AcademicRecords)
            .HasForeignKey(r => r.ProjectClosureRecordId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
