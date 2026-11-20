using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class StudentAcademicEnrollmentConfiguration : IEntityTypeConfiguration<StudentAcademicEnrollment>
{
    public void Configure(EntityTypeBuilder<StudentAcademicEnrollment> builder)
    {
        builder.ToTable("StudentAcademicEnrollments");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.AdmissionBatch)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(e => e.AcademicStatus)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.HasIndex(e => new { e.CollegeId, e.StudentUserId, e.CurrentSemesterTermId })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(e => e.College)
            .WithMany(c => c.StudentEnrollments)
            .HasForeignKey(e => e.CollegeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.StudentUser)
            .WithMany(u => u.AcademicEnrollments)
            .HasForeignKey(e => e.StudentUserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.CourseProgram)
            .WithMany()
            .HasForeignKey(e => e.CourseProgramId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Department)
            .WithMany(d => d.StudentEnrollments)
            .HasForeignKey(e => e.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.CurrentSemesterTerm)
            .WithMany()
            .HasForeignKey(e => e.CurrentSemesterTermId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
