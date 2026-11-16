using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class CourseOutcomeDefinitionConfiguration : IEntityTypeConfiguration<CourseOutcomeDefinition>
{
    public void Configure(EntityTypeBuilder<CourseOutcomeDefinition> builder)
    {
        builder.ToTable("CourseOutcomeDefinitions");

        builder.HasKey(co => co.Id);

        builder.Property(co => co.CoCode)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(co => co.Description)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(co => co.MappedPoCodesCsv)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(co => co.TargetThresholdPct)
            .HasPrecision(5, 2);

        builder.HasIndex(co => new { co.CollegeId, co.DepartmentId, co.AcademicTrackId, co.CoCode })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(co => co.College)
            .WithMany()
            .HasForeignKey(co => co.CollegeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(co => co.Department)
            .WithMany(d => d.CourseOutcomes)
            .HasForeignKey(co => co.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(co => co.AcademicTrack)
            .WithMany(a => a.CourseOutcomes)
            .HasForeignKey(co => co.AcademicTrackId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
