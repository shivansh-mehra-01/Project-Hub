using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class AcademicTrackConfiguration : IEntityTypeConfiguration<AcademicTrack>
{
    public void Configure(EntityTypeBuilder<AcademicTrack> builder)
    {
        builder.ToTable("AcademicTracks");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(t => t.AcademicYear)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(t => t.ParticipationMode)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.Property(t => t.EnrolmentMode)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.Property(t => t.MinTeamSize)
            .HasDefaultValue(2);

        builder.Property(t => t.MaxTeamSize)
            .HasDefaultValue(4);

        builder.HasIndex(t => new { t.CollegeId, t.DepartmentId, t.AcademicYear, t.Name })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(t => t.College)
            .WithMany(c => c.AcademicTracks)
            .HasForeignKey(t => t.CollegeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.Department)
            .WithMany()
            .HasForeignKey(t => t.DepartmentId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(t => t.AcademicSession)
            .WithMany(s => s.AcademicTracks)
            .HasForeignKey(t => t.AcademicSessionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(t => t.CourseProgram)
            .WithMany(p => p.AcademicTracks)
            .HasForeignKey(t => t.CourseProgramId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(t => t.SemesterTerm)
            .WithMany(s => s.AcademicTracks)
            .HasForeignKey(t => t.SemesterTermId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(t => t.SubjectOffering)
            .WithMany(o => o.AcademicTracks)
            .HasForeignKey(t => t.SubjectOfferingId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(t => t.CurriculumScheme)
            .WithMany()
            .HasForeignKey(t => t.CurriculumSchemeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
