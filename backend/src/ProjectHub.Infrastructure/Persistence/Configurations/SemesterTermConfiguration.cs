using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class SemesterTermConfiguration : IEntityTypeConfiguration<SemesterTerm>
{
    public void Configure(EntityTypeBuilder<SemesterTerm> builder)
    {
        builder.ToTable("SemesterTerms");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.SemesterName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(t => t.Parity)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.HasIndex(t => new { t.CollegeId, t.DepartmentId, t.AcademicSessionId, t.SemesterNumber })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(t => t.College)
            .WithMany(c => c.SemesterTerms)
            .HasForeignKey(t => t.CollegeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.Department)
            .WithMany(d => d.SemesterTerms)
            .HasForeignKey(t => t.DepartmentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(t => t.AcademicSession)
            .WithMany(s => s.SemesterTerms)
            .HasForeignKey(t => t.AcademicSessionId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
